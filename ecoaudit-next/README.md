# EcoAudit — The AI Greenwashing Whistleblower

A Next.js app powered by Claude that audits product claims, labels, receipts,
and corporate sustainability reports for greenwashing. Built to deploy on
Vercel.

## Features
- **Audit**: paste text or upload a photo of a label/receipt/report page.
  Claude reads the image directly (no OCR step needed) and returns an A–F
  Greenwashing Scorecard with a Risk Level (Low/Medium/High), grounded in
  the FTC Green Guides and TerraChoice's "Seven Sins of Greenwashing."
  Grades render as a rubber-stamp graphic.
- **Debate Mode**: push back on a grade; Claude updates its verdict if you
  bring real evidence, or explains why the grade stands if not.
- **Call-Out Letter Generator**: drafts a professional email or social post
  requesting transparency from the brand, based on the audit finding.

## Local setup

```bash
npm install
cp .env.example .env.local
# edit .env.local and paste your real Anthropic API key
npm run dev
```

Open http://localhost:3000.

Get an API key at https://console.anthropic.com/ (Settings → API Keys).

## Deploying to Vercel

**Option A — via the Vercel dashboard (no CLI needed)**
1. Push this folder to a GitHub repo.
2. Go to https://vercel.com/new and import that repo.
3. Vercel auto-detects Next.js — no build settings to change.
4. Before deploying (or right after, then redeploy), go to
   **Project Settings → Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
5. Deploy. That's it — the API routes run as Vercel serverless functions.

**Option B — via the Vercel CLI**
```bash
npm install -g vercel
vercel
vercel env add ANTHROPIC_API_KEY
vercel --prod
```

## Why this replaces the earlier Streamlit version
Streamlit needs a persistent Python process and doesn't run on Vercel's
serverless model. This is a full rebuild: Next.js App Router frontend +
three API routes (`/api/audit`, `/api/debate`, `/api/letter`) that call the
Anthropic SDK server-side, so your API key never reaches the browser.

## Notes for the hackathon demo
- Strongest demo flow: paste a vague label claim (e.g. "100% Natural,
  Eco-Friendly Packaging") → show the grade + named-framework reasoning →
  go to Debate Mode and push back with a fake certification to show it
  holds its ground → then give a *real* certification detail to show it
  updates the grade → generate the letter.
- Frame grades to judges as Claude's reasoning against a stated framework,
  not a legal/compliance determination.
- No database — all "knowledge" comes from the system prompt
  (`app/lib/claude.ts`) and Claude's own reasoning, keeping this small
  enough for a short build timeline.
