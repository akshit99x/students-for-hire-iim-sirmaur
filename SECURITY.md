# Security

This is a static site: no server, no database, no login, no cookies and no third-party requests (fonts are self-hosted).

## What is in place

| Layer | Measure |
|---|---|
| Content Security Policy | `<meta>` CSP on every page: scripts, styles, fonts and images only from this site; no inline scripts or styles; no outgoing `fetch`/XHR; no forms; no plugins; `base-uri 'none'` |
| Clickjacking | `js/guard.js` hides and breaks out of any foreign frame (GitHub Pages cannot send `X-Frame-Options`) |
| XSS | Every value from `data/students.js` is type-checked on load and HTML-escaped on output; the profile data is never evaluated as code |
| Links | Only `https://` links on `linkedin.com` are rendered, always with `rel="noopener noreferrer"`; photos must live under `assets/photos/` |
| Privacy | `Referrer-Policy: no-referrer` via meta; no analytics; the shortlist stays in the visitor's browser and is validated against known profile ids |
| CSV export | Cells starting with `= + - @` are prefixed so spreadsheets cannot run them as formulas |
| Transport | GitHub Pages serves the site over HTTPS (keep "Enforce HTTPS" ticked in Settings → Pages) |
| Data minimisation | Roll numbers, phone numbers and personal e-mails are not published |

## Limits to know about

GitHub Pages cannot set real HTTP response headers, so the CSP is delivered by `<meta>` and `frame-ancestors` is not available. For full header control, serve the same files from Cloudflare Pages or Netlify and add the headers there.

## Keeping the repository safe

- Turn on two-factor authentication for every account with write access.
- Protect `main` (Settings → Branches) so changes need a pull request.
- Only the Placement Committee should have write access.

## Reporting a problem

Write to bmspcom1@iimsirmaur.ac.in. See also `/.well-known/security.txt`.
