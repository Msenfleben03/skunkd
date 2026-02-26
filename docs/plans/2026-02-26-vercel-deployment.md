# Vercel Deployment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy SKUNK'D to Vercel so multiplayer, stats, and AI hand analysis can be tested on a live preview URL.

**Architecture:** Vite builds the static SPA, Vercel serves it. Supabase stays as-is (auth, database, Edge Functions including `llm-proxy` for Gemini). Only the frontend hosting moves to Vercel.

**Tech Stack:** Vite 7, React 19, Vercel (static hosting), Supabase (backend), vite-plugin-pwa

---

### Task 1: Create `vercel.json`

**Files:**
- Create: `vercel.json`

**Why:** Three concerns — SPA client-side routing (react-router-dom), PWA cache headers, and correct MIME types.

**Step 1: Create `vercel.json`**

```json
{
  "rewrites": [
    { "source": "/((?!assets/|sw\\.js|workbox-.*\\.js|manifest\\.webmanifest|.*\\.png|.*\\.ico).*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/workbox-(.*).js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/manifest.webmanifest",
      "headers": [
        { "key": "Content-Type", "value": "application/manifest+json" }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

**Step 2: Verify locally**

Run: `npm run build`
Expected: Clean build, `dist/` output with `sw.js`, `manifest.webmanifest`, and `assets/` directory.

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel.json for SPA routing + PWA headers"
```

---

### Task 2: Connect GitHub repo to Vercel

**Manual steps (Vercel Dashboard):**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import GitHub repository: `Msenfleben03/skunkd`
3. Vercel auto-detects Vite — confirm these settings:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)
4. **Set Node.js version** in Project Settings → General → Node.js Version → **22.x**
   - Vite 7 requires Node 20.19+ or 22.12+; pin to 22.x for safety

---

### Task 3: Set environment variables in Vercel

**Manual steps (Vercel Dashboard):**

Go to Project → Settings → Environment Variables. Add:

| Variable | Value | Environments |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | `<your-anon-key>` | Production, Preview |

**Important:** These are baked in at build time (Vite `VITE_` prefix). Any change requires a redeploy.

**Note:** `GEMINI_API_KEY` is NOT needed on Vercel — it lives in Supabase Edge Function secrets. The client calls `llm-proxy` via the Supabase SDK, which uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

---

### Task 4: Configure Supabase for Vercel domain

**Manual steps (Supabase Dashboard):**

1. Go to Authentication → URL Configuration
2. Add the Vercel preview URL pattern to **Redirect URLs**:
   - `https://<project-name>-*.vercel.app/**`
   - `https://<your-custom-domain>.vercel.app/**`
3. Add the same patterns to **Site URL** (or keep your primary domain)

**Why:** Auth redirects (Google/Apple OAuth, magic links) must whitelist the Vercel domain or they'll fail silently.

---

### Task 5: Deploy and test

**Step 1: Push to trigger deployment**

```bash
git push origin master
```

Vercel builds automatically on push. Check the deployment URL in the Vercel dashboard or GitHub PR comment.

**Step 2: Test checklist**

Once deployed, verify on the live preview URL:

**Routing (SPA):**
- [ ] `/` loads start screen (Play vs AI, Play Online, My Stats)
- [ ] `/stats` loads stats page directly (not 404)
- [ ] `/join/test123` loads join page directly (not 404)
- [ ] Refresh on `/stats` stays on stats (no 404)

**Game vs AI:**
- [ ] Start a game vs AI — cards deal, discard works
- [ ] Pegging phase plays correctly
- [ ] Show phase scores hands
- [ ] Game completes to GAME_OVER

**Multiplayer:**
- [ ] Click "Play Online"
- [ ] Auth flow works (guest or Google sign-in)
- [ ] Create game generates invite link
- [ ] Second device/tab can join via invite link
- [ ] Real-time play works between two sessions

**Stats:**
- [ ] Complete a game → stats save
- [ ] Navigate to `/stats` → data loads
- [ ] Win/loss record, hand averages display

**AI Hand Analysis (LLM):**
- [ ] After a hand, ScoreExplanation appears (Sir John Skunkling commentary)
- [ ] HandReview loads at end of hand
- [ ] MatchAnalysis loads at end of game
- [ ] Chat panel (if visible) shows suggestions

**PWA:**
- [ ] Service worker registers (check DevTools → Application → Service Workers)
- [ ] Manifest loads (check DevTools → Application → Manifest)
- [ ] "Install app" prompt available on mobile Chrome

---

### Task 6: Update memory + session state

After successful deployment:

**Step 1: Update MEMORY.md**

Add under "## Stack Details":
```
- Hosted on Vercel (auto-deploy from master, preview on PRs)
- vercel.json: SPA rewrites + PWA cache headers
- Env vars: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (set in Vercel dashboard)
```

**Step 2: Update session-state.md**

Record deployment URL and test results.

---

## Architecture Diagram

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser    │────▶│  Vercel (CDN)    │     │   Supabase      │
│   (PWA)      │     │  Static SPA      │     │                 │
│              │     │  - index.html    │     │  - Auth         │
│              │     │  - assets/*      │     │  - PostgreSQL   │
│              │     │  - sw.js         │     │  - Realtime     │
│              │     │  - manifest      │     │  - Edge Funcs   │
│              │     └──────────────────┘     │    - llm-proxy  │
│              │                               │    - gen-avatar │
│              │───────────────────────────────▶│  - Storage      │
│              │   Supabase JS SDK             │                 │
│              │   (Auth, DB, Functions)        │  GEMINI_API_KEY │
└──────────────┘                               └─────────────────┘
```

## Notes

- **No server-side code on Vercel** — this is a pure static SPA deployment
- **Preview deployments** are automatic on every PR push — great for testing changes
- **Supabase Edge Functions** are already deployed separately and don't move to Vercel
- **Cost:** Vercel Hobby tier is free (sufficient for testing)
