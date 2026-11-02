# Students for Hire · IIM Sirmaur

A static website (no build step) where recruiters browse the batch, filter by domain and hard skills, and open each student's LinkedIn profile.

## Run it locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Opening `index.html` directly also works.

## Add real students

1. Fill in each student's row in `data/students.csv` (columns are listed in `scripts/csv_to_data.py`). Put a student photo at `assets/photos/<name-slug>.jpg` and set the `photo` column.
2. Run `python3 scripts/csv_to_data.py data/students.csv`. This rewrites `data/students.js`.
3. Commit and push.

### Placeholder profiles

While students have not submitted their details, run the converter with `--sample`:

```bash
python3 scripts/csv_to_data.py data/students.csv --sample
```

Only the students listed in `data/sample_ids.txt` (currently the first five) get a repeatable random set, flagged `"sample": true` in the data (the site no longer shows a label, so replace these with the student's real answers as soon as you have them). Everyone else stays empty ("coming soon") until they submit details, and students with real details are never overwritten. Run without `--sample` to publish real data only.

### Card order

The default sort is **Profiles updated first**: students with domains or hard skills filled in come first, then those with LinkedIn, then those with a photo, and A to Z inside each group. As more students submit details they move up automatically.

## Publish on GitHub Pages

Repository Settings → Pages → Deploy from branch → `main` / root. The site is then served at `https://<user>.github.io/<repo>/`.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `js/app.js` | Talent pool, filters, shortlist, profile pop-up |
| `students.html` | Instructions and LinkedIn post text for students |
| `css/styles.css` | Theme (IIM Sirmaur blue `#0061A0`, sun yellow `#FDC20C`) |
| `data/students.js` | The student data the site reads |

| `js/guard.js`, `js/students.js` | Anti-framing guard and the copy button (kept as files so the CSP can forbid inline scripts) |
| `assets/fonts/` | Self-hosted Open Sans and Cinzel (SIL Open Font License) |
| `SECURITY.md`, `.well-known/security.txt` | Security measures and contact |

The domain list and the grouped hard-skills list shown in the filters are at the top of `js/app.js`. Placecom contact: bmspcom1@iimsirmaur.ac.in.
