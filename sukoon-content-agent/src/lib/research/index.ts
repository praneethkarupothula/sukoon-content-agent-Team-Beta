import { extractPage, fetchSafeUrl } from "@/lib/research/safe-fetch";
import type { Research } from "@/lib/validation/schema";

function isUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function researchTopic(topic: string, website: string): Promise<Research> {
  const sources: Research["sources"] = [];
  const facts: Research["facts"] = [];
  const limitations: string[] = [];
  const snippets: string[] = [];

  let providedTitle = "";
  if (isUrl(topic)) {
    const page = extractPage((await fetchSafeUrl(topic)).body);
    providedTitle = page.title;
    sources.push({ title: page.title, url: topic, kind: "provided-url" });
    facts.push({ finding: "The supplied page is the campaign's source material.", evidence: page.text.slice(0, 4000), sourceUrl: topic, sourceTitle: page.title });
    snippets.push(`Provided page (${page.title}): ${page.text.slice(0, 5000)}`);
  }

  if (process.env.BRAVE_SEARCH_API_KEY) {
    const searchTerm = providedTitle || topic;
    try {
    const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchTerm)}&count=5`, {
      headers: { "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Search provider returned HTTP ${response.status}.`);
    const result = await response.json() as { web?: { results?: Array<{ title: string; url: string; description?: string }> } };
    for (const item of (result.web?.results ?? []).slice(0, 5)) {
      try {
        const parsed = new URL(item.url);
        if (!["http:", "https:"].includes(parsed.protocol)) continue;
        sources.push({ title: item.title, url: parsed.toString(), kind: "search" });
        const evidence = item.description ?? "Search result snippet; verify against the source before publication.";
        facts.push({ finding: item.title, evidence, sourceUrl: parsed.toString(), sourceTitle: item.title });
        snippets.push(`${item.title} (${parsed.toString()}): ${evidence}`);
      } catch {
        continue;
      }
    }
    } catch (error) {
      limitations.push(`Live search failed and was skipped: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  } else {
    limitations.push("No search provider is configured; no live web search was performed.");
  }

  if (website) {
    try {
      const page = extractPage((await fetchSafeUrl(website)).body);
      const url = new URL(website).toString();
      sources.push({ title: page.title, url, kind: "official-site" });
      facts.push({ finding: `Information found on the organization's website: ${page.title}`, evidence: page.text.slice(0, 5000), sourceUrl: url, sourceTitle: page.title });
      snippets.push(`Organization website (${page.title}): ${page.text.slice(0, 6000)}`);
    } catch (error) {
      limitations.push(`Organization website could not be retrieved: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  if (!sources.length) {
    return {
      summary: "Topic-only mode: no web sources were retrieved. Generated suggestions must not be treated as verified facts.",
      status: "topic-only",
      facts: [],
      sources: [],
      limitations: [...limitations, "No evidence was available to verify claims. Keep copy general and review it before publishing."],
    };
  }
  return {
    summary: "Retrieved source material for this campaign. Search snippets and page text are evidence inputs, not independently verified conclusions.",
    status: "live",
    facts,
    sources,
    limitations,
  };
}

export function researchText(research: Research) {
  return [
    `Research status: ${research.status}`,
    research.summary,
    ...research.facts.map((fact) => `Finding: ${fact.finding}\nEvidence: ${fact.evidence}\nSource: ${fact.sourceTitle} — ${fact.sourceUrl}`),
    ...research.limitations.map((item) => `Limitation: ${item}`),
  ].join("\n\n");
}
