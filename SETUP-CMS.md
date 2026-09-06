# Publishing setup

Five steps. Steps 1–4 need your accounts, so they're yours to run; I can't
authenticate as you. Step 5 is the only place I edit files again.

---

## 0. Prerequisite: a github.com login

Your `gh` CLI is authenticated to **github.ibm.com** (IBM Enterprise), not
github.com. A personal portfolio shouldn't live on your employer's instance,
and Enterprise can't serve `100badreasons.github.io`.

```bash
gh auth login --hostname github.com --web
```

That adds a second account; your IBM login is untouched. Verify with
`gh auth status` — you should see both hosts listed.

---

## 1. Create the repo and push

From `Code/personal/portfolio`:

```bash
gh repo create portfolio --public --source=. --remote=origin --push
```

Then enable Pages: **Settings → Pages → Source: GitHub Actions**.

The first deploy runs automatically. Site lands at
`https://100badreasons.github.io/portfolio/`.

> Note the casing: your account is `100BadReasons`, but GitHub Pages serves the
> hostname lowercased, so the live site is `100badreasons.github.io`. `site` in
> `astro.config.mjs` is already set to the lowercase form; the CMS `repo:` field
> uses the exact account casing. Both are correct as written.

---

## 2. Register a GitHub OAuth app

Go to https://github.com/settings/applications/new

| Field | Value |
|---|---|
| Application name | `Portfolio CMS` |
| Homepage URL | `https://100badreasons.github.io/portfolio/` |
| Authorization callback URL | `https://REPLACE_AFTER_STEP_3.workers.dev/callback` |

You won't know the callback URL until step 3, so put a placeholder and come
back to correct it. **Save the Client ID and Client Secret** — the secret is
shown once.

---

## 3. Deploy the OAuth worker

Sveltia CMS runs entirely in your browser, but the GitHub OAuth handshake needs
a client secret, and a secret can't live in a static page. This tiny worker is
the only server-side piece in the whole architecture. Free tier covers it many
times over.

```bash
git clone https://github.com/sveltia/sveltia-cms-auth.git
cd sveltia-cms-auth
npx wrangler deploy
```

Note the deployed URL (`https://sveltia-cms-auth.<subdomain>.workers.dev`), then
in the Cloudflare dashboard under **Settings → Variables** add:

| Variable | Value |
|---|---|
| `GITHUB_CLIENT_ID` | from step 2 |
| `GITHUB_CLIENT_SECRET` | from step 2 — **click Encrypt** |
| `ALLOWED_DOMAINS` | `100badreasons.github.io` |

`ALLOWED_DOMAINS` is what stops anyone else pointing their CMS at your worker.
Don't skip it.

Now go back to step 2 and fix the callback URL to
`<your-worker-url>/callback`.

---

## 4. Point the CMS at both

Edit `public/admin/config.yml`. `repo` is already correct; you only need to
replace the `base_url` placeholder with your worker URL:

```yaml
backend:
  name: github
  repo: 100BadReasons/portfolio
  branch: main
  base_url: https://sveltia-cms-auth.<subdomain>.workers.dev
```

Commit and push. The CMS is then live at
`https://100badreasons.github.io/portfolio/admin/` — works on desktop and
phone, same URL.

---

## 5. How the loop runs

```
phone or desktop -> /admin -> commit to main -> Actions -> Pages
```

Every save commits to `main` and triggers a rebuild (~90s including the
Chromium install for Mermaid).

**Uploads land as drafts.** `published` defaults to off, so a half-finished
entry is visible to you locally but never deploys. Turning it on requires
metrics, a pipeline diagram, an engineering challenge, and a tech stack — the
build fails otherwise. That's deliberate: it's what makes uploading from a
phone safe.

### Video

Heavy video never enters git. Upload to Vimeo or YouTube from their app, then
add a **Deep-dive media** entry in the CMS and paste the ID. Only silent
preview loops under 5 MB belong in the repo.

### The one maintenance cost

`public/admin/config.yml` and `src/content.config.ts` describe the same shape in
two languages. They can drift. The Zod schema wins: if the CMS writes something
Zod rejects, the build fails rather than deploying bad data. Change one, change
the other.
