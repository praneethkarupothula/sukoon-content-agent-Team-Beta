import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedOrganization } from "@/lib/data/seed";
import { campaignSchema, organizationSchema, type Campaign, type Organization } from "@/lib/validation/schema";

type StoreData = { organizations: Organization[]; campaigns: Campaign[] };
const storePath = path.join(process.cwd(), "data", "store.json");

async function load(): Promise<StoreData> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    const campaigns = parsed.campaigns
      .filter((item) => item.id !== "demo-five-minute-habit" && String(item.research.status) !== "demo")
      .map((item) => String(item.deliverables.image.status) === "sample"
        ? {
            ...item,
            deliverables: {
              ...item.deliverables,
              image: {
                status: "unavailable" as const,
                message: "Sample image removed. Configure an image provider to generate a campaign-specific image.",
              },
            },
          }
        : item);
    const data = {
      organizations: parsed.organizations.map((item) => organizationSchema.parse(item)),
      campaigns: campaigns.map((item) => campaignSchema.parse(item)),
    };
    if (campaigns.length !== parsed.campaigns.length || parsed.campaigns.some((item) => String(item.deliverables.image.status) === "sample")) {
      await save(data);
    }
    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const initial = { organizations: [seedOrganization], campaigns: [] };
    await save(initial);
    return initial;
  }
}

async function save(data: StoreData) {
  await mkdir(path.dirname(storePath), { recursive: true });
  const tempPath = `${storePath}.tmp`;
  await writeFile(tempPath, JSON.stringify(data, null, 2), "utf8");
  await rename(tempPath, storePath);
}

export async function getState() {
  const state = await load();
  return { organizations: state.organizations, campaigns: state.campaigns };
}

export async function getOrganization(id: string) {
  const state = await load();
  const organization = state.organizations.find((item) => item.id === id);
  if (!organization) throw new Error("Organization not found.");
  return organization;
}

export async function updateOrganization(id: string, input: Omit<Organization, "id" | "version">) {
  const state = await load();
  const index = state.organizations.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("Organization not found.");
  const organization = organizationSchema.parse({ ...input, id, version: state.organizations[index].version + 1 });
  state.organizations[index] = organization;
  await save(state);
  return organization;
}

export async function getCampaign(id: string, organizationId: string) {
  const state = await load();
  const campaign = state.campaigns.find((item) => item.id === id && item.organizationId === organizationId);
  if (!campaign) throw new Error("Campaign not found.");
  return campaign;
}

export async function saveCampaign(campaign: Campaign) {
  const state = await load();
  if (!state.organizations.some((item) => item.id === campaign.organizationId)) throw new Error("Organization not found.");
  const index = state.campaigns.findIndex((item) => item.id === campaign.id && item.organizationId === campaign.organizationId);
  if (index < 0) state.campaigns.unshift(campaign);
  else state.campaigns[index] = campaign;
  await save(state);
  return campaign;
}

export async function listCampaigns(organizationId: string) {
  const state = await load();
  if (!state.organizations.some((item) => item.id === organizationId)) throw new Error("Organization not found.");
  return state.campaigns.filter((campaign) => campaign.organizationId === organizationId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
