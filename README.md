# Students for Hire · IIM Sirmaur

A static website (no build step) where recruiters browse the batch, filter by domain and hard skills, and open each student's LinkedIn profile.

## Run it locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Opening `index.html` directly also works.

## Add real students

1. Fill in each student's row in `data/students.csv` (columns are listed in `scripts/csv_to_data.py`). Put a student photo at `assets/photos/<rollno>.jpg` and set the `photo` column.
2. Run `python3 scripts/csv_to_data.py data/students.csv`. This rewrites `data/students.js`.
3. Commit and push. The sample banner disappears once no profile has `"sample": true`.

## Publish on GitHub Pages

Repository Settings → Pages → Deploy from branch → `main` / root. The site is then served at `https://<user>.github.io/<repo>/`.

## Files

| Path | Purpose |
|---|---|
| `index.html`, `js/app.js` | Talent pool, filters, shortlist, profile pop-up |
| `students.html` | Instructions and LinkedIn post text for students |
| `css/styles.css` | Theme (IIM Sirmaur blue `#0061A0`, sun yellow `#FDC20C`) |
| `data/students.js` | The student data the site reads |

The domain list and the hard-skills list shown in the filters are at the top of `js/app.js`.
