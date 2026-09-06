# Using the CMS

The dashboard is already live at
**https://100badreasons.github.io/portfolio/admin/**

There is nothing to deploy. Two ways in, depending on the device.

---

## Desktop: no setup at all

Open the admin URL and click **Work with Local Repository**, then pick the
`portfolio` folder. The CMS edits your local files directly through the browser's
File System Access API — no token, no network, no commits until you decide.

Chromium-based browsers only (Chrome, Edge, Arc, Brave). Safari and Firefox do
not implement the API.

Changes appear immediately in `npm run dev`. Commit and push when ready.

---

## Phone (and Safari/Firefox): one token, five minutes

Open the admin URL and click **Sign In with Token**. The dialog links straight to
GitHub's token page with the required scopes pre-selected — use that link rather
than navigating there yourself, so the scopes are right.

Prefer a **fine-grained** token if it works for you, since it can be locked to
this one repository:

| Setting | Value |
|---|---|
| Repository access | Only select repositories → `portfolio` |
| Permissions → Contents | Read and write |
| Permissions → Metadata | Read-only (added automatically) |
| Expiration | 90 days is a reasonable default |

Paste the token into the dialog. It is stored in that browser's local storage
and never leaves your device — it is not committed, and it is not in this repo.

**Caveats, stated plainly.** A token in browser storage is only as safe as the
device holding it. Set an expiration rather than "no expiration", don't paste it
into a shared or public machine, and if a phone goes missing, revoke it at
<https://github.com/settings/tokens>. Revoking is instant and costs you nothing
but signing in again.

---

## Why there's no OAuth worker

Sveltia can also authenticate through a self-hosted OAuth broker — the
`sveltia-cms-auth` Cloudflare Worker. That exists so *multiple* or non-technical
users get a plain "Sign in with GitHub" button without touching tokens.

For a single author it is pure overhead: a GitHub OAuth app, a Cloudflare
account, a deployed worker, and two secrets to rotate — to replace one token.
Sveltia's own documentation says most people don't need it. If you ever add
collaborators, that's the moment to set it up, and `base_url` in
`public/admin/config.yml` is the only line that changes.

---

## How publishing works

```
phone or desktop -> /admin -> commit to main -> Actions -> Pages
```

Every save commits to `main` and triggers a rebuild (~90s, including the
Chromium install for build-time Mermaid).

**Uploads land as drafts.** `published` defaults to off, so a half-finished entry
is visible locally but never deploys. Turning it on requires metrics, a pipeline
diagram, an engineering challenge and a tech stack — the build fails otherwise.
That is what makes uploading from a phone safe.

### Video

Heavy video never enters git. Upload to Vimeo or YouTube from their app, then add
a **Deep-dive media** entry and paste the ID. Only silent preview loops under
5 MB belong in the repo.

### The one maintenance cost

`public/admin/config.yml` and `src/content.config.ts` describe the same shape in
two languages and can drift. The Zod schema wins: if the CMS writes something it
rejects, the build fails rather than deploying bad data. Change one, change the
other.
