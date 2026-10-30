"use client";

import {
  BadgeCheck, BarChart3, Bookmark, Copy, Globe, Heart, Image as ImageIcon, MessageCircle, MessageSquare,
  MoreHorizontal, Plus, Repeat2, Send, Shuffle, ThumbsUp, Trash2,
} from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";
import { htmlLang, isRtl, type LanguageSetting } from "@/lib/languages";
import {
  charCount, googleDescriptionLimit, googleHeadlineLimit, googlePathLimit, instagramCaptionLimit, linkedinLimit,
  metaRecommended, xLength, xPostLimit, type Deliverables, type Organization,
} from "@/lib/validation/schema";

type Common = {
  editing: boolean;
  brand: Organization;
  lang?: LanguageSetting;
  imageUrl?: string;
  imageAlt?: string;
  onCopy: (text: string, label?: string) => void;
};
type TemplateProps<K extends keyof Deliverables> = Common & { value: Deliverables[K]; onChange: (value: Deliverables[K]) => void };

function handleOf(brand: Organization) {
  return brand.name.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function domainOf(brand: Organization) {
  try { return brand.website ? new URL(brand.website).hostname.replace(/^www\./, "") : "[website]"; } catch { return "[website]"; }
}
function langProps(lang?: LanguageSetting) {
  return lang ? { lang: htmlLang(lang), dir: isRtl(lang) ? "rtl" as const : "auto" as const } : {};
}

/** Highlights hashtags, mentions, links and [placeholders] without using innerHTML. */
function rich(text: string): ReactNode {
  const parts = text.split(/(#[\p{L}\p{M}\p{N}_]+|@[A-Za-z0-9_]+|https?:\/\/\S+|\[[^\]\n]{2,60}\])/u);
  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith("[") && part.endsWith("]")) return <span key={index} className="tpl-placeholder" title="Fill this in before publishing">{part}</span>;
    if (/^(#|@|https?:)/.test(part)) return <span key={index} className="tpl-link">{part}</span>;
    return <Fragment key={index}>{part}</Fragment>;
  });
}

function inlineMarkdown(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{rich(part.slice(2, -2))}</strong>
    : <Fragment key={index}>{rich(part)}</Fragment>);
}

function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r/g, "").split(/\n{2,}/);
  return <>{blocks.map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    if (/^###\s/.test(trimmed)) return <h4 key={index}>{inlineMarkdown(trimmed.replace(/^###\s+/, ""))}</h4>;
    if (/^##?\s/.test(trimmed)) return <h3 key={index}>{inlineMarkdown(trimmed.replace(/^##?\s+/, ""))}</h3>;
    const lines = trimmed.split("\n");
    if (lines.every((line) => /^\s*[-*]\s+/.test(line))) return <ul key={index}>{lines.map((line, i) => <li key={i}>{inlineMarkdown(line.replace(/^\s*[-*]\s+/, ""))}</li>)}</ul>;
    if (lines.every((line) => /^\s*\d+[.)]\s+/.test(line))) return <ol key={index}>{lines.map((line, i) => <li key={i}>{inlineMarkdown(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>)}</ol>;
    if (/^>\s?/.test(trimmed)) return <blockquote key={index}>{inlineMarkdown(trimmed.replace(/^>\s?/gm, ""))}</blockquote>;
    return <p key={index}>{lines.map((line, i) => <Fragment key={i}>{i > 0 && <br />}{inlineMarkdown(line)}</Fragment>)}</p>;
  })}</>;
}

export function Counter({ value, limit, weighted = false, soft = false }: { value: string; limit: number; weighted?: boolean; soft?: boolean }) {
  const length = weighted ? xLength(value) : charCount(value);
  const state = length > limit ? (soft ? "warn" : "over") : length > limit * 0.9 ? "near" : "ok";
  return <span className={`tpl-counter ${state}`} title={soft ? "Recommended length" : "Platform limit"}>{length}/{limit}</span>;
}

function Media({ url, alt, ratio, title }: { url?: string; alt?: string; ratio: string; title?: string }) {
  return <div className="tpl-media" style={{ aspectRatio: ratio }}>
    {url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={url} alt={alt ?? ""} />
      : <div className="tpl-media-empty"><ImageIcon size={22} /><span>{title ? `“${title}”` : "Campaign image"}</span><small>Image appears here once generated</small></div>}
  </div>;
}

function Field({ label, children, counter }: { label: string; children: ReactNode; counter?: ReactNode }) {
  return <label className="tpl-field"><span className="tpl-field-label">{label}{counter}</span>{children}</label>;
}

function CopyButton({ text, label, onCopy }: { text: string; label: string; onCopy: Common["onCopy"] }) {
  return <button type="button" className="tpl-icon" aria-label={`Copy ${label}`} title={`Copy ${label}`} onClick={() => onCopy(text, label)}><Copy size={13} /></button>;
}

function Avatar({ brand, className = "" }: { brand: Organization; className?: string }) {
  return <div className={`tpl-avatar ${className}`}>{brand.name.charAt(0)}</div>;
}

/* ---------------- X thread ---------------- */
export function XThreadTemplate({ value, onChange, editing, brand, lang, onCopy }: TemplateProps<"xThread">) {
  const posts = value.posts;
  const update = (index: number, text: string) => onChange({ posts: posts.map((post, i) => i === index ? text : post) });
  return <div className="tpl-x" {...langProps(lang)}>
    {posts.map((post, index) => <article className="x-post" key={index}>
      <div className="x-rail"><Avatar brand={brand} className="round" />{index < posts.length - 1 && <div className="x-line" />}</div>
      <div className="x-body">
        <div className="x-head"><strong>{brand.name}</strong><BadgeCheck size={14} className="x-verified" /><span>@{handleOf(brand)} · now</span><MoreHorizontal size={15} className="x-more" /></div>
        {editing
          ? <textarea className="tpl-input" rows={4} value={post} onChange={(event) => update(index, event.target.value)} aria-label={`Post ${index + 1}`} />
          : <div className="x-text">{rich(post)}{posts.length > 1 && <span className="x-index"> {index + 1}/{posts.length}</span>}</div>}
        <div className="x-actions">
          <MessageCircle size={15} /><Repeat2 size={15} /><Heart size={15} /><BarChart3 size={15} />
          <span className="x-tools">
            <Counter value={post} limit={xPostLimit} weighted />
            <CopyButton text={post} label={`post ${index + 1}`} onCopy={onCopy} />
            {editing && posts.length > 2 && <button type="button" className="tpl-icon" aria-label="Remove post" onClick={() => onChange({ posts: posts.filter((_, i) => i !== index) })}><Trash2 size={13} /></button>}
          </span>
        </div>
      </div>
    </article>)}
    {editing && posts.length < 10 && <button type="button" className="tpl-add" onClick={() => onChange({ posts: [...posts, ""] })}><Plus size={13} /> Add post</button>}
  </div>;
}

/* ---------------- Instagram ---------------- */
export function InstagramTemplate({ value, onChange, editing, brand, lang, imageUrl, imageAlt, onCopy }: TemplateProps<"instagram"> & { ratio?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [tagDraft, setTagDraft] = useState(value.hashtags.join(" "));
  const handle = handleOf(brand);
  const full = `${value.caption}\n\n${value.hashtags.join(" ")}`;
  const firstLine = value.caption.split("\n")[0];
  return <div className="tpl-phone ig" {...langProps(lang)}>
    <div className="ig-head"><Avatar brand={brand} className="round ring" /><div><strong>{handle}</strong><div className="tpl-sub">Sponsored</div></div><MoreHorizontal size={16} className="x-more" /></div>
    <Media url={imageUrl} alt={imageAlt} ratio="4 / 5" />
    <div className="ig-actions"><Heart size={21} /><MessageCircle size={21} /><Send size={21} /><span className="tpl-spacer" /><Bookmark size={21} /></div>
    {editing ? <div className="tpl-edit">
      <Field label="Caption" counter={<Counter value={full} limit={instagramCaptionLimit} />}><textarea className="tpl-input" rows={8} value={value.caption} onChange={(event) => onChange({ ...value, caption: event.target.value })} /></Field>
      <Field label={`Hashtags (${value.hashtags.length}/30, separated by spaces)`}><textarea className="tpl-input" rows={3} value={tagDraft} onChange={(event) => {
        setTagDraft(event.target.value);
        onChange({ ...value, hashtags: event.target.value.split(/\s+/).filter(Boolean).map((tag) => tag.startsWith("#") ? tag : `#${tag}`) });
      }} /></Field>
    </div> : <div className="ig-caption">
      <strong>{handle}</strong>{" "}
      {expanded ? <span className="pre">{rich(value.caption)}</span> : <span>{rich(firstLine)}{(value.caption.length > firstLine.length || value.hashtags.length > 0) && <button type="button" className="tpl-more" onClick={() => setExpanded(true)}>… more</button>}</span>}
      {expanded && <div className="ig-tags">{rich(value.hashtags.join(" "))}</div>}
      <div className="tpl-sub" style={{ marginTop: 6 }}>Just now</div>
    </div>}
    <div className="tpl-footer"><Counter value={full} limit={instagramCaptionLimit} /><CopyButton text={full} label="caption" onCopy={onCopy} /></div>
  </div>;
}

/* ---------------- LinkedIn ---------------- */
export function LinkedInTemplate({ value, onChange, editing, brand, lang, imageUrl, imageAlt, onCopy }: TemplateProps<"linkedin">) {
  const [expanded, setExpanded] = useState(false);
  const cut = 210;
  const shown = expanded || value.text.length <= cut ? value.text : value.text.slice(0, cut).trimEnd();
  return <div className="tpl-card li" {...langProps(lang)}>
    <div className="li-head"><Avatar brand={brand} /><div><strong>{brand.name}</strong><div className="tpl-sub">{brand.industry}</div><div className="tpl-sub">Now · <Globe size={11} /></div></div><MoreHorizontal size={16} className="x-more" /></div>
    {editing
      ? <div className="tpl-edit"><Field label="Post" counter={<Counter value={value.text} limit={linkedinLimit} />}><textarea className="tpl-input" rows={14} value={value.text} onChange={(event) => onChange({ text: event.target.value })} /></Field></div>
      : <div className="li-text pre">{rich(shown)}{shown !== value.text && <button type="button" className="tpl-more" onClick={() => setExpanded(true)}>…see more</button>}</div>}
    <Media url={imageUrl} alt={imageAlt} ratio="1.91 / 1" />
    <div className="li-actions"><span><ThumbsUp size={15} /> Like</span><span><MessageSquare size={15} /> Comment</span><span><Repeat2 size={15} /> Repost</span><span><Send size={15} /> Send</span></div>
    <div className="tpl-footer"><Counter value={value.text} limit={linkedinLimit} /><CopyButton text={value.text} label="LinkedIn post" onCopy={onCopy} /></div>
  </div>;
}

/* ---------------- Meta ads ---------------- */
export function MetaAdsTemplate({ value, onChange, editing, brand, lang, imageUrl, imageAlt, onCopy }: TemplateProps<"metaAds">) {
  const update = (index: number, patch: Partial<Deliverables["metaAds"][number]>) => onChange(value.map((ad, i) => i === index ? { ...ad, ...patch } : ad));
  return <div className="tpl-grid" {...langProps(lang)}>
    {value.map((ad, index) => <div className="tpl-card fb" key={index}>
      <div className="tpl-variant">Variation {index + 1}</div>
      <div className="li-head"><Avatar brand={brand} className="round" /><div><strong>{brand.name}</strong><div className="tpl-sub">Sponsored · <Globe size={11} /></div></div><MoreHorizontal size={16} className="x-more" /></div>
      {editing ? <div className="tpl-edit">
        <Field label="Primary text" counter={<Counter value={ad.primaryText} limit={metaRecommended.primaryText} soft />}><textarea className="tpl-input" rows={4} value={ad.primaryText} onChange={(event) => update(index, { primaryText: event.target.value })} /></Field>
        <Field label="Headline" counter={<Counter value={ad.headline} limit={metaRecommended.headline} soft />}><input className="tpl-input" value={ad.headline} onChange={(event) => update(index, { headline: event.target.value })} /></Field>
        <Field label="Description" counter={<Counter value={ad.description} limit={metaRecommended.description} soft />}><input className="tpl-input" value={ad.description} onChange={(event) => update(index, { description: event.target.value })} /></Field>
        <Field label="CTA button"><input className="tpl-input" value={ad.callToAction} onChange={(event) => update(index, { callToAction: event.target.value })} /></Field>
      </div> : <>
        <div className="fb-text pre">{rich(ad.primaryText)}</div>
        <Media url={imageUrl} alt={imageAlt} ratio="1 / 1" />
        <div className="fb-bottom">
          <div className="fb-copy"><div className="fb-domain">{domainOf(brand).toUpperCase()}</div><div className="fb-headline">{rich(ad.headline)}</div><div className="fb-desc">{rich(ad.description)}</div></div>
          <span className="fb-cta">{ad.callToAction}</span>
        </div>
      </>}
      <div className="tpl-footer"><Counter value={ad.primaryText} limit={metaRecommended.primaryText} soft /><CopyButton text={`${ad.primaryText}\n\nHeadline: ${ad.headline}\nDescription: ${ad.description}\nCTA: ${ad.callToAction}`} label={`Meta ad ${index + 1}`} onCopy={onCopy} /></div>
    </div>)}
  </div>;
}

/* ---------------- Google ads ---------------- */
function ListEditor({ items, limit, min, max, label, onChange }: { items: string[]; limit: number; min: number; max: number; label: string; onChange: (items: string[]) => void }) {
  return <div className="g-list">
    <div className="tpl-field-label">{label} ({items.length}/{max})</div>
    {items.map((item, index) => <div className="g-row" key={index}>
      <input className="tpl-input" value={item} onChange={(event) => onChange(items.map((x, i) => i === index ? event.target.value : x))} aria-label={`${label} ${index + 1}`} />
      <Counter value={item} limit={limit} />
      {items.length > min && <button type="button" className="tpl-icon" aria-label="Remove" onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 size={13} /></button>}
    </div>)}
    {items.length < max && <button type="button" className="tpl-add" onClick={() => onChange([...items, ""])}><Plus size={13} /> Add</button>}
  </div>;
}

function GoogleAdCard({ ad, index, brand, editing, onChange, onCopy }: { ad: Deliverables["googleAds"][number]; index: number; brand: Organization; editing: boolean; onChange: (ad: Deliverables["googleAds"][number]) => void; onCopy: Common["onCopy"] }) {
  const [offset, setOffset] = useState(0);
  const pick = (list: string[], count: number) => Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(i + offset) % list.length]);
  const path = ad.displayPath.split("/").filter(Boolean).slice(0, 2);
  return <div className="tpl-card g">
    <div className="tpl-variant">Asset set {index + 1}<span className="tpl-spacer" />{!editing && <button type="button" className="tpl-icon" title="Preview another combination" aria-label="Shuffle preview" onClick={() => setOffset((value) => value + 1)}><Shuffle size={13} /></button>}<CopyButton text={`Headlines:\n${ad.headlines.join("\n")}\n\nDescriptions:\n${ad.descriptions.join("\n")}\n\nPath: ${ad.displayPath}`} label={`Google asset set ${index + 1}`} onCopy={onCopy} /></div>
    <div className="g-ad">
      <div className="g-spons">Sponsored</div>
      <div className="g-site"><span className="g-fav">{brand.name.charAt(0)}</span><div><div className="g-name">{brand.name}</div><div className="g-url">{domainOf(brand)}{path.map((segment) => ` › ${segment}`)}</div></div><MoreHorizontal size={14} className="x-more" /></div>
      <div className="g-title">{pick(ad.headlines, 3).join(" | ")}</div>
      <div className="g-desc">{pick(ad.descriptions, 2).join(" ")}</div>
    </div>
    {editing ? <div className="tpl-edit">
      <ListEditor label="Headlines" items={ad.headlines} limit={googleHeadlineLimit} min={3} max={15} onChange={(headlines) => onChange({ ...ad, headlines })} />
      <ListEditor label="Descriptions" items={ad.descriptions} limit={googleDescriptionLimit} min={2} max={4} onChange={(descriptions) => onChange({ ...ad, descriptions })} />
      <Field label={`Display path (2 × ${googlePathLimit} characters, separated by /)`}><input className="tpl-input" value={ad.displayPath} onChange={(event) => onChange({ ...ad, displayPath: event.target.value })} /></Field>
    </div> : <div className="g-assets">
      <div className="tpl-field-label">All headlines</div>
      {ad.headlines.map((headline, i) => <div className="g-asset" key={i}><span>{headline}</span><Counter value={headline} limit={googleHeadlineLimit} /></div>)}
      <div className="tpl-field-label" style={{ marginTop: 8 }}>All descriptions</div>
      {ad.descriptions.map((description, i) => <div className="g-asset" key={i}><span>{description}</span><Counter value={description} limit={googleDescriptionLimit} /></div>)}
    </div>}
  </div>;
}

export function GoogleAdsTemplate({ value, onChange, editing, brand, lang, onCopy }: TemplateProps<"googleAds">) {
  return <div className="tpl-grid" {...langProps(lang)}>
    {value.map((ad, index) => <GoogleAdCard key={index} ad={ad} index={index} brand={brand} editing={editing} onCopy={onCopy} onChange={(next) => onChange(value.map((item, i) => i === index ? next : item))} />)}
  </div>;
}

/* ---------------- Blog ---------------- */
export function BlogTemplate({ value, onChange, editing, brand, lang, imageUrl, imageAlt }: TemplateProps<"blog">) {
  const words = value.article.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  if (editing) return <div className="tpl-card blog-edit tpl-edit" {...langProps(lang)}>
    <Field label="Title" counter={<Counter value={value.title} limit={70} soft />}><input className="tpl-input" value={value.title} onChange={(event) => onChange({ ...value, title: event.target.value })} /></Field>
    <Field label="Excerpt / meta description" counter={<Counter value={value.excerpt} limit={160} soft />}><textarea className="tpl-input" rows={2} value={value.excerpt} onChange={(event) => onChange({ ...value, excerpt: event.target.value })} /></Field>
    <Field label={`Article (Markdown: ## heading, - list, **bold**) · ${words} words`}><textarea className="tpl-input mono" rows={20} value={value.article} onChange={(event) => onChange({ ...value, article: event.target.value })} /></Field>
    <Field label="Call to action"><textarea className="tpl-input" rows={2} value={value.callToAction} onChange={(event) => onChange({ ...value, callToAction: event.target.value })} /></Field>
    <Field label="References (one per line)"><textarea className="tpl-input" rows={3} value={value.references.join("\n")} onChange={(event) => onChange({ ...value, references: event.target.value.split("\n").filter((line) => line.trim()) })} /></Field>
  </div>;
  return <article className="tpl-blog" {...langProps(lang)}>
    <div className="blog-meta">{brand.name} Journal · {minutes} min read</div>
    <h2 className="blog-title">{value.title}</h2>
    <p className="blog-excerpt">{rich(value.excerpt)}</p>
    <div className="blog-byline"><Avatar brand={brand} className="round" /><div><strong>{brand.name}</strong><div className="tpl-sub">Published draft · not live</div></div></div>
    <Media url={imageUrl} alt={imageAlt} ratio="16 / 9" />
    <div className="blog-body"><Markdown source={value.article} /></div>
    <div className="blog-cta">{rich(value.callToAction)}</div>
    {value.references.length > 0 && <div className="blog-refs"><h4>References</h4><ol>{value.references.map((ref, i) => <li key={i}>{rich(ref)}</li>)}</ol></div>}
  </article>;
}

/* ---------------- Image concept ---------------- */
const conceptFields: { key: keyof Deliverables["imageConcept"]; label: string }[] = [
  { key: "title", label: "Title" }, { key: "rationale", label: "Rationale" }, { key: "audience", label: "Audience" },
  { key: "visualDirection", label: "Visual direction" }, { key: "composition", label: "Composition" }, { key: "palette", label: "Palette" },
  { key: "aspectRatio", label: "Aspect ratio" }, { key: "placement", label: "Placement" }, { key: "altText", label: "Alt text" },
];

export function ImageConceptTemplate({ value, onChange, editing, imageUrl, imageAlt }: TemplateProps<"imageConcept">) {
  return <div className="tpl-card brief">
    <div className="brief-head"><div className="eyebrow" style={{ marginBottom: 4 }}>Creative brief</div><h3 style={{ margin: 0 }}>{value.title}</h3></div>
    <div className="brief-grid">
      <div className="brief-fields">{conceptFields.filter((field) => editing || field.key !== "title").map((field) => <div className="brief-row" key={field.key}>
        <div className="tpl-field-label">{field.label}</div>
        {editing ? <textarea className="tpl-input" rows={field.key === "aspectRatio" ? 1 : 2} value={value[field.key]} onChange={(event) => onChange({ ...value, [field.key]: event.target.value })} /> : <div>{value[field.key]}</div>}
      </div>)}</div>
      <Media url={imageUrl} alt={imageAlt ?? value.altText} ratio={value.aspectRatio.replace(":", " / ") || "1 / 1"} title={value.title} />
    </div>
  </div>;
}
