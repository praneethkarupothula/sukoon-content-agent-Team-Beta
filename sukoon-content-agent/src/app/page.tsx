"use client";

import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, Check, CircleHelp,
  Clipboard, Clock3, Eye, FileText, FlaskConical, FolderOpen, Image as ImageIcon, Languages, LoaderCircle, Menu,
  MoreHorizontal, Pencil, Plus, Search, Settings2, ShieldCheck, Sparkles, Sprout, Undo2, WandSparkles, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { LanguagePicker } from "@/app/language-picker";
import { ThemeToggle } from "@/app/theme-toggle";
import {
  BlogTemplate, GoogleAdsTemplate, ImageConceptTemplate, InstagramTemplate, LinkedInTemplate, MetaAdsTemplate, XThreadTemplate,
} from "@/app/templates";
import { plainText, type TemplateKey } from "@/lib/format";
import {
  channelKeys, channelLabels, defaultChannelLanguages, english, languageLabel,
  type ChannelKey, type ChannelLanguages, type LanguageSetting,
} from "@/lib/languages";
import { campaignSchema, type Campaign, type Deliverables, type Organization } from "@/lib/validation/schema";

type View = "dashboard" | "brand" | "library" | "workspace";
type StateResponse = { organizations: Organization[]; campaigns: Campaign[] };
type DeliverableKey = TemplateKey;
const navItems = [
  { id: "dashboard", label: "Overview", icon: Sprout },
  { id: "library", label: "Campaigns", icon: FolderOpen },
  { id: "brand", label: "Brand profile", icon: Settings2 },
] as const;
const deliverableTabs: { id: DeliverableKey; label: string }[] = [
  { id: "blog", label: "Blog post" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "xThread", label: "X thread" },
  { id: "instagram", label: "Instagram" },
  { id: "metaAds", label: "Meta ads · 3" },
  { id: "googleAds", label: "Google ads · 3" },
  { id: "imageConcept", label: "Image concept" },
];

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function statusClass(status: Campaign["status"]) {
  if (status === "Approved") return "status status-approved";
  if (status === "Failed") return "status status-failed";
  if (status === "Generating" || status === "Researching") return "status status-generating";
  return "status";
}

function isChannel(key: DeliverableKey): key is ChannelKey {
  return (channelKeys as readonly string[]).includes(key);
}

function deliverableDescription(key: DeliverableKey) {
  switch (key) {
    case "blog": return "Search-friendly article with a gentle call to action.";
    case "linkedin": return "A professional, audience-ready post.";
    case "xThread": return "A thread of posts, each within X's 280-character limit.";
    case "instagram": return "Caption, hashtags, and a gentle invitation.";
    case "metaAds": return "Three distinct ad variations.";
    case "googleAds": return "Three responsive search asset sets.";
    case "imageConcept": return "Creative brief, direction, placement, and alt text.";
  }
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const organizationIdRef = useRef("sukoon-studio");
  const [draftOrganization, setDraftOrganization] = useState<Organization | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DeliverableKey>("blog");
  const [draft, setDraft] = useState<{ campaignId: string; deliverables: Deliverables } | null>(null);
  const [editing, setEditing] = useState(false);
  const [rewrite, setRewrite] = useState<{ key: DeliverableKey; language: LanguageSetting | null; feedback: string; open: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [typeFilter, setTypeFilter] = useState("All content");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const emptyForm = { name: "", topic: "", objective: "Engagement" as Campaign["objective"], audience: "", instructions: "" };
  const [campaignForm, setCampaignForm] = useState(emptyForm);
  const [allLanguage, setAllLanguage] = useState<LanguageSetting>(english);
  const [perChannel, setPerChannel] = useState(false);
  const [channelLanguages, setChannelLanguages] = useState<ChannelLanguages>(defaultChannelLanguages);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedId) ?? null;
  const dirty = Boolean(selectedCampaign && draft?.campaignId === selectedCampaign.id);
  const current: Deliverables | null = selectedCampaign ? (dirty && draft ? draft.deliverables : selectedCampaign.deliverables) : null;
  const rewriteState = rewrite?.key === activeTab ? rewrite : null;
  const rewriteLanguage = rewriteState?.language ?? (selectedCampaign && isChannel(activeTab) ? selectedCampaign.languages[activeTab] : english);

  const flash = useCallback((text: string, error = false) => {
    setNotice({ text, error });
    window.setTimeout(() => setNotice(null), 3600);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const data = await response.json() as StateResponse & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not load workspace.");
      setOrganizations(data.organizations);
      const selected = data.organizations.find((item) => item.id === organizationIdRef.current) ?? data.organizations[0] ?? null;
      if (selected) organizationIdRef.current = selected.id;
      setOrganization(selected);
      setDraftOrganization(selected);
      setCampaigns(data.campaigns.filter((campaign) => campaign.organizationId === selected?.id));
    } catch (error) {
      flash(messageOf(error), true);
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    const data = await response.json() as T & { error?: string };
    if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status}).`);
    return data;
  }

  async function switchOrganization(id: string) {
    const next = organizations.find((item) => item.id === id);
    if (!next) return;
    organizationIdRef.current = id;
    setOrganization(next);
    setDraftOrganization(next);
    setSelectedId(null);
    setView("dashboard");
    try {
      setCampaigns(await requestJson<Campaign[]>(`/api/campaigns?organizationId=${encodeURIComponent(id)}`));
    } catch (error) {
      flash(messageOf(error), true);
    }
  }

  function openCampaign(campaign: Campaign) {
    if (dirty && !window.confirm("Discard unsaved edits?")) return;
    setSelectedId(campaign.id);
    setActiveTab("blog");
    setDraft(null);
    setEditing(false);
    setRewrite(null);
    setView("workspace");
  }

  function updateDeliverable<K extends DeliverableKey>(key: K, value: Deliverables[K]) {
    if (!selectedCampaign || !current) return;
    setDraft({ campaignId: selectedCampaign.id, deliverables: { ...current, [key]: value } });
  }

  async function createCampaign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const campaign = await requestJson<Campaign>("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...campaignForm,
          organizationId: organization?.id ?? "sukoon-studio",
          languages: perChannel ? channelLanguages : Object.fromEntries(channelKeys.map((key) => [key, allLanguage])),
        }),
      });
      const valid = campaignSchema.parse(campaign);
      setCampaigns((previous) => [valid, ...previous.filter((item) => item.id !== valid.id)]);
      setSelectedId(valid.id);
      setNewCampaignOpen(false);
      setView("workspace");
      setCampaignForm(emptyForm);
      setDraft(null);
      setEditing(false);
      flash(valid.status === "Failed" ? valid.warnings.at(-1) ?? "Workflow failed." : "Your campaign pack is ready for review.");
    } catch (error) {
      flash(messageOf(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function saveBrand(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftOrganization) return;
    setBusy(true);
    try {
      const updated = await requestJson<Organization>("/api/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftOrganization),
      });
      setOrganization(updated);
      setDraftOrganization(updated);
      setOrganizations((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      flash("Brand profile saved.");
    } catch (error) {
      flash(messageOf(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function saveDeliverable() {
    if (!selectedCampaign || !current) return;
    setBusy(true);
    try {
      const saved = await requestJson<Campaign>(`/api/campaigns/${selectedCampaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedCampaign.organizationId, deliverables: current }),
      });
      setCampaigns((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      setDraft(null);
      setEditing(false);
      flash("Changes saved.");
    } catch (error) {
      flash(messageOf(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function regenerate(key: DeliverableKey) {
    if (!selectedCampaign) return;
    if (dirty && !window.confirm("You have unsaved edits. Regenerating replaces this deliverable and discards unsaved edits. Continue?")) return;
    setBusy(true);
    try {
      const saved = await requestJson<Campaign>(`/api/campaigns/${selectedCampaign.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedCampaign.organizationId,
          deliverable: key,
          language: isChannel(key) ? rewriteLanguage : undefined,
          feedback: rewriteState?.feedback ?? "",
        }),
      });
      setCampaigns((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      setDraft(null);
      setEditing(false);
      setRewrite(null);
      flash(`${deliverableTabs.find((tab) => tab.id === key)?.label ?? key} regenerated${isChannel(key) ? ` in ${languageLabel(saved.languages[key])}` : ""}.`);
    } catch (error) {
      flash(messageOf(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function retryImage() {
    if (!selectedCampaign) return;
    setBusy(true);
    try {
      const saved = await requestJson<Campaign>(`/api/campaigns/${selectedCampaign.id}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedCampaign.organizationId }),
      });
      setCampaigns((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      flash("Campaign image generated.");
    } catch (error) {
      flash(messageOf(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function retryCampaign(topicOnly: boolean) {
    if (!selectedCampaign) return;
    setBusy(true);
    try {
      const saved = await requestJson<Campaign>(`/api/campaigns/${selectedCampaign.id}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedCampaign.organizationId, topicOnly }),
      });
      setCampaigns((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      setActiveTab("blog");
      setDraft(null);
      flash(saved.status === "Failed" ? saved.warnings.at(-1) ?? "Workflow failed." : "Campaign workflow completed.");
    } catch (error) {
      flash(messageOf(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function approveCampaign() {
    if (!selectedCampaign || !window.confirm("Approve this content pack? This records your review; it will not publish anything.")) return;
    setBusy(true);
    try {
      const saved = await requestJson<Campaign>(`/api/campaigns/${selectedCampaign.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selectedCampaign.organizationId, approved: true }),
      });
      setCampaigns((previous) => previous.map((item) => item.id === saved.id ? saved : item));
      flash("Content pack approved. Nothing was published.");
    } catch (error) {
      flash(messageOf(error), true);
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string, label = "Deliverable") {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label.charAt(0).toUpperCase()}${label.slice(1)} copied.`);
    } catch {
      flash("Clipboard access was denied by your browser.", true);
    }
  }

  const filteredCampaigns = useMemo(() => campaigns.filter((campaign) => {
    const matchesText = `${campaign.name} ${campaign.topic}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All statuses" || campaign.status === statusFilter;
    const matchesType = typeFilter === "All content" || (typeFilter === "Ads" ? campaign.deliverables.metaAds.length + campaign.deliverables.googleAds.length > 0 : typeFilter === "Image" ? campaign.deliverables.imageConcept.title.length > 0 : true);
    return matchesText && matchesStatus && matchesType;
  }), [campaigns, query, statusFilter, typeFilter]);

  function field(key: keyof Organization, label: string, multiline = false, hint?: string) {
    if (!draftOrganization) return null;
    const value = draftOrganization[key];
    return <div className="field">
      <label htmlFor={`brand-${key}`}>{label}</label>
      {multiline
        ? <textarea id={`brand-${key}`} value={String(value)} onChange={(event) => setDraftOrganization({ ...draftOrganization, [key]: event.target.value })} />
        : <input id={`brand-${key}`} value={String(value)} onChange={(event) => setDraftOrganization({ ...draftOrganization, [key]: event.target.value })} />}
      {hint && <span className="field-help">{hint}</span>}
    </div>;
  }

  function renderDashboard() {
    const approved = campaigns.filter((campaign) => campaign.status === "Approved").length;
    const inReview = campaigns.filter((campaign) => campaign.status === "Ready for Review").length;
    return <>
      <div className="page-heading">
        <div><div className="eyebrow">Your workspace</div><h1>A little more room to create.</h1><p className="subheading">Thoughtful, research-aware campaigns for {organization?.name ?? "your organization"}—from first idea to human review.</p></div>
        <button className="button button-primary" onClick={() => setNewCampaignOpen(true)}><Plus size={15} /> New campaign</button>
      </div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-top"><span>Total campaigns</span><span className="stat-icon"><FolderOpen size={15} /></span></div><div className="stat-value">{campaigns.length.toString().padStart(2, "0")}</div></div>
        <div className="stat-card"><div className="stat-top"><span>Ready for review</span><span className="stat-icon"><Clock3 size={15} /></span></div><div className="stat-value">{inReview.toString().padStart(2, "0")}</div></div>
        <div className="stat-card"><div className="stat-top"><span>Approved</span><span className="stat-icon"><BadgeCheck size={15} /></span></div><div className="stat-value">{approved.toString().padStart(2, "0")}</div></div>
        <div className="stat-card"><div className="stat-top"><span>Brand voice</span><span className="stat-icon"><Sprout size={15} /></span></div><div className="stat-value" style={{ fontSize: 21, marginTop: 19 }}>{organization?.voice.split(/[,;.]/)[0] ?? "Calm"}</div></div>
      </div>
      <div className="grid-two">
        <section className="panel">
          <div className="panel-header"><div><h2>Recent campaigns</h2><p>Your latest ideas, in one calm space.</p></div><button className="button button-quiet" onClick={() => setView("library")}>View all <ArrowRight size={14} /></button></div>
          {campaigns.length ? <div className="campaign-list">{campaigns.slice(0, 5).map((campaign) => <div className="campaign-row" role="button" tabIndex={0} key={campaign.id} onClick={() => openCampaign(campaign)} onKeyDown={(event) => event.key === "Enter" && openCampaign(campaign)}><div><div className="campaign-title">{campaign.name}</div><div className="campaign-meta"><span>{campaign.objective}</span><span>·</span><span>{new Date(campaign.updatedAt).toLocaleDateString()}</span></div></div><span className={statusClass(campaign.status)}>{campaign.status}</span></div>)}</div> : <div className="empty-state"><div className="empty-icon"><FileText size={20} /></div><h3>No campaigns yet</h3><p>Create your first campaign to get started.</p></div>}
        </section>
        <section className="panel">
          <div className="panel-header"><div><h2>Your brand, at a glance</h2><p>A starting point for every campaign.</p></div><button className="icon-button" aria-label="Edit brand profile" onClick={() => setView("brand")}><ArrowRight size={15} /></button></div>
          {organization && <><div className="profile-top"><div className="profile-seal">S</div><div><h3 style={{ marginBottom: 4 }}>{organization.name}</h3><div className="campaign-meta">{organization.industry}</div></div></div><div className="brand-summary"><div className="summary-block"><div className="summary-label">Brand essence</div>{organization.description}</div><div className="summary-block"><div className="summary-label">Voice</div>{organization.voice}</div><div className="summary-block"><div className="summary-label">Audience</div>{organization.audience}</div></div></>}
        </section>
      </div>
    </>;
  }

  function renderBrand() {
    return <><div className="page-heading"><div><div className="eyebrow">Organization settings</div><h1>Brand profile</h1><p className="subheading">A living reference for your content. Unknown details stay unknown until your team fills them in.</p></div></div>
      {draftOrganization && <form className="panel" onSubmit={(event) => void saveBrand(event)}>
        <div className="profile-top"><div className="profile-seal">{draftOrganization.name.charAt(0)}</div><div><h2 style={{ marginBottom: 4 }}>{draftOrganization.name}</h2><p className="subheading">Profile version {draftOrganization.version} · Updates apply to future campaigns.</p></div></div>
        <div className="profile-form">
          {field("name", "Organization name")}
          {field("website", "Website URL", false, "Leave blank if unknown.")}
          {field("industry", "Industry")}
          {field("services", "Products or services", true)}
          {field("description", "Brand description", true)}
          {field("audience", "Target audience", true)}
          {field("voice", "Brand voice and tone", true)}
          {field("messages", "Key messages", true)}
          {field("preferences", "Content preferences", true)}
          {field("prohibited", "Prohibited claims and topics", true)}
          {field("callsToAction", "Preferred calls to action", true)}
          {field("colors", "Brand colors", true)}
        </div><div className="profile-actions"><button className="button button-primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />} Save profile</button></div>
      </form>}
    </>;
  }

  function renderLibrary() {
    return <><div className="page-heading"><div><div className="eyebrow">Content library</div><h1>Campaigns</h1><p className="subheading">Search your past work, revisit a draft, or pick up where you left off.</p></div><button className="button button-primary" onClick={() => setNewCampaignOpen(true)}><Plus size={15} /> New campaign</button></div>
      <section className="panel"><div className="panel-header"><div><h2>All campaigns</h2><p>{filteredCampaigns.length} {filteredCampaigns.length === 1 ? "campaign" : "campaigns"}</p></div></div>
        <div className="library-tools"><div className="search-bar"><Search size={14} /><input aria-label="Search campaigns" placeholder="Search campaigns..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="filter-select" aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{["All statuses", "Draft", "Researching", "Generating", "Ready for Review", "Approved", "Failed"].map((item) => <option key={item}>{item}</option>)}</select><select className="filter-select" aria-label="Filter by content type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>{["All content", "Ads", "Image"].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="table-head" style={{ marginTop: 20 }}><span>Campaign</span><span>Updated</span><span style={{ textAlign: "right" }}>Status</span></div>
        {filteredCampaigns.length ? <div className="campaign-list">{filteredCampaigns.map((campaign) => <div className="campaign-row" role="button" tabIndex={0} key={campaign.id} onClick={() => openCampaign(campaign)} onKeyDown={(event) => event.key === "Enter" && openCampaign(campaign)}><div style={{ flex: 1 }}><div className="campaign-title">{campaign.name}</div><div className="campaign-meta"><span>{campaign.topic}</span><span>·</span><span>{campaign.objective}</span></div></div><span className="campaign-meta" style={{ width: 140 }}>{new Date(campaign.updatedAt).toLocaleDateString()}</span><span className={statusClass(campaign.status)}>{campaign.status}</span></div>)}</div> : <div className="empty-state"><div className="empty-icon"><Search size={19} /></div><h3>Nothing found</h3><p>Try a different search or filter.</p></div>}
      </section>
    </>;
  }

  function renderTemplate(campaign: Campaign, deliverables: Deliverables) {
    const brand = campaign.brandSnapshot;
    const image = deliverables.image;
    const common = {
      editing,
      brand,
      imageUrl: image.status === "generated" ? image.url : undefined,
      imageAlt: deliverables.imageConcept.altText,
      onCopy: (text: string, label?: string) => void copyText(text, label),
    };
    const key = `${campaign.id}-${campaign.updatedAt}-${editing}`;
    switch (activeTab) {
      case "blog": return <BlogTemplate key={key} {...common} lang={campaign.languages.blog} value={deliverables.blog} onChange={(value) => updateDeliverable("blog", value)} />;
      case "linkedin": return <LinkedInTemplate key={key} {...common} lang={campaign.languages.linkedin} value={deliverables.linkedin} onChange={(value) => updateDeliverable("linkedin", value)} />;
      case "xThread": return <XThreadTemplate key={key} {...common} lang={campaign.languages.xThread} value={deliverables.xThread} onChange={(value) => updateDeliverable("xThread", value)} />;
      case "instagram": return <InstagramTemplate key={key} {...common} lang={campaign.languages.instagram} value={deliverables.instagram} onChange={(value) => updateDeliverable("instagram", value)} />;
      case "metaAds": return <MetaAdsTemplate key={key} {...common} lang={campaign.languages.metaAds} value={deliverables.metaAds} onChange={(value) => updateDeliverable("metaAds", value)} />;
      case "googleAds": return <GoogleAdsTemplate key={key} {...common} lang={campaign.languages.googleAds} value={deliverables.googleAds} onChange={(value) => updateDeliverable("googleAds", value)} />;
      case "imageConcept": return <ImageConceptTemplate key={key} {...common} value={deliverables.imageConcept} onChange={(value) => updateDeliverable("imageConcept", value)} />;
    }
  }

  function renderWorkspace() {
    if (!selectedCampaign) return <div className="empty-state"><div className="empty-icon"><FolderOpen size={19} /></div><h3>Campaign not found</h3><button className="button button-secondary" onClick={() => setView("library")}>Back to campaigns</button></div>;
    const campaign = selectedCampaign;
    const progress = ["research", "content", "image", "review", "approval"];
    const stageLabel = ["Research", "Content generation", "Image generation", "Quality review", "Human approval"];
    const doneCount = campaign.status === "Approved" ? 5 : campaign.status === "Ready for Review" ? 4 : campaign.stage === "research" ? 0 : campaign.stage === "content" ? 1 : campaign.stage === "image" ? 2 : 3;
    const image = campaign.deliverables.image;
    return <>
      <div className="workspace-head"><div><button className="button button-quiet" onClick={() => setView("library")} style={{ marginLeft: -9, marginBottom: 12 }}><ArrowLeft size={14} /> All campaigns</button><div className="eyebrow">Campaign workspace · {campaign.objective}</div><h1>{campaign.name}</h1><p className="subheading">{campaign.topic}</p></div>
        <div className="workspace-actions"><a className="button button-secondary" href={`/api/campaigns/${campaign.id}/export`}><ArrowDownToLine size={14} /> Export pack (.md)</a>{campaign.status !== "Approved" && <button className="button button-primary" onClick={() => void approveCampaign()} disabled={busy}><ShieldCheck size={14} /> Approve pack</button>}</div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className={statusClass(campaign.status)}>{campaign.status}</span><span className="campaign-meta">Last updated {new Date(campaign.updatedAt).toLocaleString()}</span></div>
      <div className="workflow">{progress.map((stage, index) => <div key={stage} className={`workflow-step ${index < doneCount ? "done" : ""}`}><span className="step-dot">{index < doneCount ? <Check size={13} /> : index + 1}</span><span>{stageLabel[index]}</span></div>)}</div>
      {campaign.status === "Failed" && <div className="warning-box">Workflow paused: {campaign.warnings.at(-1) ?? "An operation failed."} Any completed research and deliverables are preserved. Retry research or continue without sources.<div className="action-group" style={{ marginTop: 10 }}><button className="button button-secondary" onClick={() => void retryCampaign(false)} disabled={busy}><WandSparkles size={13} /> Retry workflow</button><button className="button button-secondary" onClick={() => void retryCampaign(true)} disabled={busy}><ArrowRight size={13} /> Continue topic-only</button></div></div>}
      <div className="workspace-grid" style={{ marginTop: 17 }}>
        <section className="content-card">
          <div className="panel-header"><div><h2>Content pack</h2><p>Each deliverable is shown in its platform template. Edit, rewrite in any language, then save.</p></div>{dirty ? <span className="status status-generating">Unsaved changes</span> : <span className="status">{deliverableTabs.length} deliverables</span>}</div>
          <div className="deliverable-tabs" role="tablist" aria-label="Campaign deliverables">{deliverableTabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={`deliverable-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>{tab.label}{isChannel(tab.id) && <span className="tab-lang">{languageLabel(campaign.languages[tab.id])}</span>}</button>)}</div>
          <div className="editor-header">
            <div><h3>{deliverableTabs.find((tab) => tab.id === activeTab)?.label}</h3><p>{deliverableDescription(activeTab)}{isChannel(activeTab) && <> · <Languages size={11} style={{ verticalAlign: -1 }} /> {languageLabel(campaign.languages[activeTab])}</>}</p></div>
            <div className="action-group">
              <button className={`button ${editing ? "button-primary" : "button-secondary"}`} onClick={() => setEditing((value) => !value)}>{editing ? <><Eye size={14} /> Preview</> : <><Pencil size={14} /> Edit</>}</button>
              <button className="button button-secondary" onClick={() => current && void copyText(plainText(activeTab, current), deliverableTabs.find((tab) => tab.id === activeTab)?.label)}><Clipboard size={14} /> Copy all</button>
              <a className="button button-quiet" href={`/api/campaigns/${campaign.id}/export?deliverable=${activeTab}`}><ArrowDownToLine size={14} /> .txt</a>
            </div>
          </div>
          {current && <div className="template-stage">{renderTemplate(campaign, current)}</div>}
          {dirty && <div className="editor-actions"><div className="action-group"><button className="button button-primary" onClick={() => void saveDeliverable()} disabled={busy}><Check size={14} /> Save changes</button><button className="button button-quiet" onClick={() => { setDraft(null); setEditing(false); }} disabled={busy}><Undo2 size={14} /> Discard</button></div></div>}
          <div className="rewrite-bar">
            <div className="rewrite-head">
              <div><strong>Rewrite this deliverable</strong><div className="field-help">{isChannel(activeTab) ? "Pick any Indian language or a mix (e.g. Hinglish), add feedback, and regenerate just this one." : "Add feedback and regenerate the image brief (English)."}</div></div>
              {isChannel(activeTab) && <button className="button button-quiet" onClick={() => setRewrite({ key: activeTab, language: rewriteLanguage, feedback: rewriteState?.feedback ?? "", open: !rewriteState?.open })}><Languages size={14} /> {rewriteState?.open ? "Hide languages" : `Language: ${languageLabel(rewriteLanguage)}`}</button>}
            </div>
            {isChannel(activeTab) && rewriteState?.open && <LanguagePicker idPrefix={`rewrite-${activeTab}`} value={rewriteLanguage} onChange={(language) => setRewrite({ key: activeTab, language, feedback: rewriteState?.feedback ?? "", open: true })} />}
            <div className="rewrite-row">
              <input className="rewrite-input" placeholder="Optional feedback, e.g. shorter, warmer, mention the free first class…" value={rewriteState?.feedback ?? ""} onChange={(event) => setRewrite({ key: activeTab, language: rewriteState?.language ?? null, feedback: event.target.value, open: rewriteState?.open ?? false })} maxLength={1000} />
              <button className="button button-secondary" onClick={() => void regenerate(activeTab)} disabled={busy}>{busy ? <LoaderCircle size={14} className="spin" /> : <WandSparkles size={14} />} Regenerate</button>
            </div>
          </div>
        </section>
        <aside>
          <section className="content-card"><div className="panel-header"><div><h2>Research brief</h2><p>Evidence and source limitations.</p></div><FlaskConical size={17} color="#738878" /></div>
            <span className="status">{campaign.research.status === "live" ? "LIVE SOURCES" : campaign.research.status.toUpperCase()}</span>
            <div className="research-card"><p>{campaign.research.summary}</p></div>
            {campaign.research.sources.length > 0 ? campaign.research.sources.map((source, index) => <div className="research-item" key={`${source.url}-${index}`}><a href={source.url} target="_blank" rel="noreferrer">{source.title} <ArrowRight size={11} /></a><div className="campaign-meta" style={{ marginTop: 5 }}>{source.kind} · {source.url}</div>{campaign.research.facts.filter((fact) => fact.sourceUrl === source.url).map((fact, factIndex) => <p key={factIndex} style={{ color: "#788178", fontSize: 10, lineHeight: 1.5, marginTop: 8 }}><strong>{fact.finding}</strong><br />{fact.evidence}</p>)}</div>) : <div className="research-card"><p>No sources retrieved. The workflow did not perform a web search.</p></div>}
            {campaign.research.sources.length === 0 && campaign.research.facts.map((fact, index) => <div className="research-item" key={index}><strong style={{ color: "#69766c", fontSize: 11 }}>{fact.sourceTitle}: {fact.finding}</strong><p style={{ color: "#788178", fontSize: 10, lineHeight: 1.5, marginTop: 7 }}>{fact.evidence}</p></div>)}
            {campaign.research.limitations.map((limitation, index) => <div className="warning-box" key={index}>{limitation}</div>)}
          </section>
          <section className="content-card" style={{ marginTop: 14 }}><div className="panel-header"><div><h2>Quality checks</h2><p>Platform limits and research notes.</p></div><ShieldCheck size={17} color="#738878" /></div>
            <div className="validation-list">{campaign.validationResults.map((item, index) => <div className="validation-row" key={index}>{item.valid ? <Check size={14} color="#4d8059" /> : <CircleHelp size={14} color="#a47c36" />}<div><strong>{item.label}</strong><br />{item.detail}</div></div>)}</div>
            {campaign.warnings.map((warning, index) => <div className="warning-box" key={index}>{warning}</div>)}
          </section>
          <section className="content-card" style={{ marginTop: 14 }}><div className="panel-header"><div><h2>Campaign image</h2><p>Concept and generation status.</p></div><ImageIcon size={17} color="#738878" /></div>
            <p className="campaign-meta">{campaign.deliverables.imageConcept.title} · {campaign.deliverables.imageConcept.aspectRatio}</p>
            {image.status === "generated" && image.url && <><Image className="image-preview" src={image.url} alt={campaign.deliverables.imageConcept.altText} width={900} height={1125} unoptimized /><a className="image-link" href={image.url} download>Download generated image</a><p className="field-help">{image.message}</p>{image.prompt && <details className="field-help"><summary>Image prompt</summary>{image.prompt}</details>}</>}
            {image.status !== "generated" && <div className="research-card"><p>{image.message}</p></div>}
            <button className="button button-secondary" style={{ width: "100%", marginTop: 12 }} onClick={() => void retryImage()} disabled={busy}><ImageIcon size={14} /> {busy ? "Working… (up to a minute)" : image.status === "generated" ? "Generate a new variation" : "Generate image"}</button>
          </section>
          <div className="notice"><strong>Human review required.</strong> Approval records your decision only. Nothing is published automatically.</div>
        </aside>
      </div>
    </>;
  }

  if (loading) return <div className="app-shell"><main className="main-area"><div className="empty-state"><div className="empty-icon"><LoaderCircle size={20} /></div><p>Opening your workspace…</p></div></main></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark"><Sprout size={20} /></div><div><div className="brand-name">Content Studio</div><div className="brand-sub">Campaign workspace</div></div></div>
      <div className="org-select"><label className="org-label" htmlFor="organization-selector">Organization</label><select className="org-picker" id="organization-selector" value={organization?.id ?? ""} onChange={(event) => void switchOrganization(event.target.value)}>{organizations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
      <div className="nav-label">Workspace</div><nav className="nav-list" aria-label="Main navigation">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${view === item.id || (view === "workspace" && item.id === "library") ? "active" : ""}`} onClick={() => { setView(item.id); setMobileOpen(false); }}><Icon size={16} />{item.label}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><div style={{ display: "flex", gap: 7, alignItems: "center", color: "#48644d", fontWeight: 700, marginBottom: 5 }}><Sparkles size={13} /> A mindful note</div>Every campaign is a starting point. Your team has the final say.</div><div className="sidebar-user"><div className="avatar">{organization?.name.charAt(0) ?? "O"}</div><div><div style={{ fontWeight: 600, fontSize: 12 }}>{organization?.name ?? "Organization"}</div><div className="campaign-meta">Workspace owner</div></div><MoreHorizontal size={17} style={{ marginLeft: "auto", color: "#929990" }} /></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen((open) => !open)}>{mobileOpen ? <X size={17} /> : <Menu size={17} />}</button><div className="crumbs"><span>Workspace</span><span>/</span><strong>{view === "dashboard" ? "Overview" : view === "brand" ? "Brand profile" : view === "library" ? "Campaigns" : "Campaign workspace"}</strong></div><div className="top-actions"><ThemeToggle /><button className="icon-button" aria-label="Refresh workspace" onClick={() => void refresh()}><LoaderCircle size={15} /></button></div></header>
      <div className="content">{view === "dashboard" ? renderDashboard() : view === "brand" ? renderBrand() : view === "library" ? renderLibrary() : renderWorkspace()}</div>
    </main>
    {newCampaignOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !busy && setNewCampaignOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-campaign-title"><div className="modal-header"><div><div className="eyebrow">A thoughtful beginning</div><h2 id="new-campaign-title" style={{ fontFamily: "Georgia,serif", fontSize: 23 }}>Create a campaign</h2></div><button className="modal-close" aria-label="Close dialog" disabled={busy} onClick={() => setNewCampaignOpen(false)}><X size={16} /></button></div>
      <form onSubmit={(event) => void createCampaign(event)}><div className="profile-form">
        <div className="field full"><label htmlFor="campaign-topic">Topic or article URL <span style={{ color: "#a44d3b" }}>*</span></label><textarea id="campaign-topic" required minLength={4} maxLength={1000} placeholder="e.g. How beginners can build a five-minute daily meditation habit" value={campaignForm.topic} onChange={(event) => setCampaignForm({ ...campaignForm, topic: event.target.value })} /></div>
        <div className="field"><label htmlFor="campaign-name">Campaign name <span style={{ color: "#9aa099", fontWeight: 400 }}>(optional)</span></label><input id="campaign-name" maxLength={120} placeholder="A sensible name will be suggested" value={campaignForm.name} onChange={(event) => setCampaignForm({ ...campaignForm, name: event.target.value })} /></div>
        <div className="field"><label htmlFor="campaign-objective">Objective</label><select id="campaign-objective" value={campaignForm.objective} onChange={(event) => setCampaignForm({ ...campaignForm, objective: event.target.value as Campaign["objective"] })}>{["Brand Awareness", "Engagement", "Lead Generation", "Class Sign-ups"].map((item) => <option key={item}>{item}</option>)}</select></div>
        <div className="field full"><label htmlFor="campaign-audience">Target audience <span style={{ color: "#9aa099", fontWeight: 400 }}>(optional)</span></label><input id="campaign-audience" maxLength={500} placeholder={organization?.audience ?? "Defaults to your brand profile"} value={campaignForm.audience} onChange={(event) => setCampaignForm({ ...campaignForm, audience: event.target.value })} /></div>
        <div className="field full">
          <label>Content languages</label>
          <div className="lang-mode" role="radiogroup" aria-label="Language mode">
            <button type="button" role="radio" aria-checked={!perChannel} className={`lang-chip ${!perChannel ? "active" : ""}`} onClick={() => setPerChannel(false)}>Same for all deliverables</button>
            <button type="button" role="radio" aria-checked={perChannel} className={`lang-chip ${perChannel ? "active" : ""}`} onClick={() => { if (!perChannel) setChannelLanguages(Object.fromEntries(channelKeys.map((key) => [key, allLanguage])) as ChannelLanguages); setPerChannel(true); }}>Choose per deliverable</button>
          </div>
          {!perChannel
            ? <LanguagePicker idPrefix="all" value={allLanguage} onChange={setAllLanguage} />
            : <div className="lang-channels">{channelKeys.map((key) => <details key={key} className="lang-channel"><summary><strong>{channelLabels[key]}</strong><span>{languageLabel(channelLanguages[key])}</span></summary><LanguagePicker idPrefix={`ch-${key}`} compact value={channelLanguages[key]} onChange={(value) => setChannelLanguages({ ...channelLanguages, [key]: value })} /></details>)}</div>}
          <span className="field-help">English + all 22 scheduled Indian languages, in native or Roman script, and code-mixed styles like Hinglish or Tanglish. The image brief stays in English.</span>
        </div>
        <div className="field full"><label htmlFor="campaign-instructions">Additional instructions <span style={{ color: "#9aa099", fontWeight: 400 }}>(optional)</span></label><textarea id="campaign-instructions" maxLength={1000} placeholder="Anything else the content team should know?" value={campaignForm.instructions} onChange={(event) => setCampaignForm({ ...campaignForm, instructions: event.target.value })} /></div>
      </div><p className="notice">We’ll gather source material where possible, create a complete multi-channel content pack, in the languages you picked, and check every platform&apos;s character limits. Review, edit, and approve before using anything. No content is published automatically.</p>
      <div className="modal-footer"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setNewCampaignOpen(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={busy || campaignForm.topic.trim().length < 4}>{busy ? <><LoaderCircle size={14} className="spin" /> Working…</> : <><Sparkles size={14} /> Generate content pack</>}</button></div></form></div></div>}
    {notice && <div role="status" className={`toast ${notice.error ? "error" : ""}`}>{notice.text}</div>}
    <style jsx global>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>;
}
