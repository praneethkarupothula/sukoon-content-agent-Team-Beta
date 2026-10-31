# Sukoon Studio Content Workspace

A local-first, organization-scoped workspace for researching a campaign topic and preparing an editable multi-channel content pack. It includes a Next.js App Router UI, server-side API routes, Zod schemas, a configurable OpenAI-compatible text provider, optional Brave Search, and a separate image provider.

## Requirements

- Node.js 20.9 or newer (tested here with Node 24)
- npm

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Campaign generation requires `GEMINI_API_KEY`; add your provider credentials to `.env.local` and restart the development server. The workspace starts with no campaigns.

Campaigns and brand edits persist to `data/store.json`; generated image files are stored under `public/generated/`. These runtime files are ignored by git.

## Providers

All keys are server-side environment variables and must not use a `NEXT_PUBLIC_` prefix.

### Text generation (Google Gemini)

Set in `.env.local`:

```dotenv
GEMINI_API_KEY=your-key        # from https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-3.5-flash-lite  # optional override
```

Structured generation uses the Vercel AI SDK (`@ai-sdk/google`) and Zod. A configured provider may incur costs.

### Languages

Every deliverable (blog, LinkedIn, X, Instagram, Meta ads, Google ads) can use its own language: English or any of the 22 scheduled Indian languages, in native or Roman script, and code-mixed styles (Hinglish, Tanglish, Tenglish, Kanglish, Manglish, Banglish, or any custom mix of up to three languages with light/balanced/heavy mixing). Choose once for all deliverables or per deliverable when creating a campaign, and switch any single deliverable to another language later with **Rewrite → Regenerate**. The image brief stays in English.

### Platform templates

Deliverables are reviewed and edited in platform-style templates (X thread cards, Instagram post, LinkedIn post, Meta feed ads, Google search ads, blog article, creative brief) with live character counters. **Copy all** and **.txt** give platform-ready text; **Export pack** downloads a Markdown brief.

### Live search (optional)

Set `BRAVE_SEARCH_API_KEY` to enable Brave Search. Without it, supplied article URLs and the organization's optional official website are the only possible live sources. A plain topic with no retrieved source goes through explicitly labelled topic-only generation. Search snippets and retrieved pages are inputs, not verified evidence; reviewers must check the cited sources. Search has separate provider terms and may incur costs.

### Image generation (Ideogram)

Images use a separate, server-only Ideogram API key. Create one in the [Ideogram API dashboard](https://developer.ideogram.ai/v2/ideogram-api/api-setup.md).

```dotenv
IDEOGRAM_API_KEY=your-key
IMAGE_GENERATION=on
```

For existing local setups, `IMAGE_API_KEY` is also accepted when `IDEOGRAM_API_KEY` is not set. `IMAGE_GENERATION=off` skips images. Restart the development server after changing `.env.local`.

Images are prompted from the generated creative brief plus the campaign topic, objective, audience, and brand context. They use the nearest supported aspect ratio and are saved under `data/generated/`, served from `/api/images/…`. Review the image concept before generating; edit its subject and composition to correct an off-topic brief. Use **Generate a new variation** for another take. If generation fails, the content pack remains available and the image can be retried.

## Workflow

1. Select the seeded Sukoon Studio organization and edit its profile if needed.
2. Create a campaign from a topic or an HTTP(S) article URL and choose an objective.
3. The server retrieves safe source material when available, creates a structured content pack, checks Google ad and X character limits, and optionally generates an image.
4. Edit or regenerate deliverables, save changes, copy them, and export Markdown or JSON.
5. Explicitly approve after human review. Approval records a decision only; there is no social publishing integration.

The pack includes one blog post, one LinkedIn post, one X thread, one Instagram caption, three Meta ads, three Google ad asset sets, one image concept, and image-generation status. A source URL is restricted to HTTP(S), standard ports, public DNS/IP addresses, limited redirects, an eight-second timeout, and a 1 MB response limit. Page text is treated as untrusted evidence, never as instructions.

## Architecture

- `src/app/` — App Router UI, server routes, and campaign actions
- `src/lib/validation/` — Zod schemas and channel limits
- `src/lib/ai/` — centralized structured-generation prompt
- `src/lib/research/` — URL safety and configurable search workflow
- `src/lib/workflow/` — orchestration, provider calls, and progress
- `src/lib/db/` — JSON-file persistence and organization-scoped access
- `src/lib/data/` — initial Sukoon Studio profile
- `tests/` — schema and platform-limit tests

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Current scope
- This is a working model for local, single-user use. It isn’t set up yet as a multi-tenant production service.
- Access: There’s no login or access control yet, so run it on a trusted machine or network only.
- Storage: Data is saved in local JSON files, which suits a single running instance. Multi-instance or high-traffic use needs a transactional database.
- Organizations: It’s set up for Sukoon Studio. The data model already uses organization IDs, but onboarding, login and access controls for other organizations aren’t built yet.
- Fact-checking: Research results and supplied sources aren’t checked independently. A person must review content before it goes out.
- External services: URL research and image generation need network access. Provider availability, content policies and costs depend on Gemini and Ideogram.
- Publishing: Content isn’t posted to social networks or ad platforms. The app produces content that’s ready to review, copy and export.
# sukoon-content-agent-Team-Beta

