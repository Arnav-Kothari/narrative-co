# Cloudflare Access - thenarrative.company

## Overview
Client deliverables are gated behind Cloudflare Access (Google SSO). Cloudflare intercepts at the edge before requests reach Vercel.

## Protected Paths (Cloudflare Access Application: "Client portal")
- `/dashboard` - client portal (`app/dashboard/page.tsx`, Server Component)
- `/clients/*` - all client deliverable files (static HTML in `public/clients/`)

## Auth Flow
1. User clicks "Log in" -> `/dashboard`
2. Cloudflare intercepts -> Google SSO at `thenarrativecompany.cloudflareaccess.com`
3. Email domain check -> `CF_Authorization` cookie set
4. Request forwarded to Vercel with `cf-access-jwt-assertion` header
5. Dashboard decodes JWT (base64url, no npm deps) to extract email
6. Logout via `/cdn-cgi/access/logout`

## Access Policy ("Salesforce and Narrative Team")
- Action: Allow
- Include (OR): emails ending in `@salesforce.com`, `@thenarrative.company`

## Defense-in-Depth
`proxy.ts` at project root checks for `cf-access-jwt-assertion` header on `/dashboard/*` and `/clients/*`. Returns 403 if missing - prevents direct `.vercel.app` access bypassing Cloudflare.

## Adding a New Client
1. **Cloudflare Zero Trust dashboard:** Add their email domain to the Access Policy (Access > Applications > "Client portal" > edit policy > add `@newclient.com` to Include rules)
2. **Deliverable files:** Add static HTML to `public/clients/<client-slug>/`
3. **Dashboard card:** Add the client to the `clients` array in `app/dashboard/page.tsx` with name, label, and deliverable links
4. **No code change needed for auth** - Cloudflare handles domain gating
5. **Note:** Currently all authenticated users see all client cards. Per-client filtering (showing only their deliverables based on JWT email domain) is not built yet.

## Key Files
| File | Role |
|---|---|
| `app/dashboard/page.tsx` | Server Component - reads JWT, renders client cards |
| `app/dashboard/dashboard.css` | Dashboard styles + cursor fix (`body:has(.dash-hero)` restores native cursor) |
| `proxy.ts` | Defense-in-depth - blocks unauthenticated `.vercel.app` access |

## Notes
- Cloudflare login page UI is hosted at `thenarrativecompany.cloudflareaccess.com`, not controlled by our code. Customize in Cloudflare Zero Trust > Settings > Authentication > Login page.
- No JWT signature verification - Cloudflare already verified at edge.
