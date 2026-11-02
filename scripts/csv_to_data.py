#!/usr/bin/env python3
"""Convert data/students.csv into data/students.js (the file the website reads).

Usage:  python3 scripts/csv_to_data.py data/students.csv            real data only
        python3 scripts/csv_to_data.py data/students.csv --sample   also add placeholders for ids in data/sample_ids.txt

Columns (header row required; list columns are separated by ';'):
  name, cgpa, domains, hard_skills, clubs, internship, locations, summary, linkedin, photo

Only name is required (cgpa is optional and only displayed, never filtered). Leave the rest empty until the student submits them.
`domains` is ordered: the first one is the student's primary domain.
LinkedIn tracking parameters (?utm_...) are stripped automatically.

--sample gives the students listed in data/sample_ids.txt (one id per line) a random (but repeatable) set of
placeholder domains, hard skills and locations, flagged "sample": true so the site labels them "Sample".
Anyone who has filled in their own details is never touched; everyone else stays empty until they submit.
Drop the flag once real data arrives.
"""
import csv, json, random, re, sys, pathlib
from urllib.parse import urlsplit, urlunsplit

def slug(n):
    return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")

def lst(v):
    return [x.strip() for x in (v or "").split(";") if x.strip()]

def clean_url(u):
    u = (u or "").strip()
    if not u:
        return ""
    if not u.lower().startswith("https://"):
        print(f"skipping non-https link: {u}", file=sys.stderr)
        return ""
    p = urlsplit(u)
    return urlunsplit((p.scheme, p.netloc, p.path, "", ""))

# Placeholder pools (skill names must match CONFIG.skillGroups in js/app.js).
GENERAL = ["Excel", "PowerPoint", "Advanced Excel", "Data Analysis", "Presentation Design", "Canva"]
POOLS = {
    "Consulting": ["Strategy Frameworks", "Market Research", "Data Analysis", "Advanced Excel", "PowerPoint", "Financial Modelling"],
    "Founder's Office": ["Strategy Frameworks", "Project Management", "Data Analysis", "Notion", "Market Research", "Budgeting & Forecasting"],
    "Marketing": ["Digital Marketing", "SEO", "Social Media Marketing", "Content Writing", "Copywriting", "Canva", "Brand Management", "Google Analytics", "Meta Ads"],
    "General Management": ["Project Management", "Strategy Frameworks", "Process Improvement", "Budgeting & Forecasting", "Notion"],
    "Finance": ["Financial Modelling", "Valuation", "Financial Statement Analysis", "Accounting / Tally", "Bloomberg", "Equity Research", "Budgeting & Forecasting", "Advanced Excel"],
    "Investment Banking": ["Financial Modelling", "Valuation", "Capital IQ", "Bloomberg", "Equity Research", "Investment Analysis", "Advanced Excel"],
    "Operations": ["Process Improvement", "Lean / Six Sigma", "Project Management", "Inventory Management", "Advanced Excel", "SAP"],
    "Supply Chain": ["Supply Chain Planning", "Inventory Management", "Logistics", "SAP", "Advanced Excel", "Lean / Six Sigma"],
    "Sales": ["Lead Generation", "CRM / Salesforce", "Email Marketing", "Market Research", "Presentation Design"],
    "Product Management": ["Figma", "Jira", "Agile / Scrum", "SQL", "Google Analytics", "Market Research"],
    "Business Analytics": ["SQL", "Python", "Power BI", "Tableau", "R", "Statistics", "Data Visualisation", "Machine Learning", "Looker Studio"],
    "HR": ["Talent Acquisition", "HR Analytics", "HRIS", "Compensation & Benefits", "Performance Management", "Learning & Development", "Employee Engagement"],
    "Strategy": ["Strategy Frameworks", "Market Research", "Data Analysis", "Financial Modelling", "PowerPoint"],
    "Entrepreneurship": ["Figma", "Canva", "Digital Marketing", "Budgeting & Forecasting", "Video Editing", "Notion"],
    "Others": ["Photography", "Video Editing", "Photoshop", "Graphic Design", "Premiere Pro", "Google Sheets"],
}
LOCATIONS = ["Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Kolkata", "Remote"]

def sample_profile(key):
    r = random.Random(key)  # seeded by the student's id, so reruns give the same placeholders
    doms = r.sample(list(POOLS), r.choice([1, 2, 2, 3]))
    pool = [k for d in doms for k in POOLS[d]]
    skills = r.sample(sorted(set(pool)), min(len(set(pool)), r.randint(2, 4)))
    if r.random() < .6:
        skills += [g for g in r.sample(GENERAL, 1) if g not in skills]
    return doms, skills, r.sample(LOCATIONS, r.choice([1, 2, 2]))

def main(src, sample=False):
    ids = set()
    if sample:
        ids = {l.strip() for l in (pathlib.Path(src).with_name("sample_ids.txt")).read_text().splitlines() if l.strip()}
    rows = []
    with open(src, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            name = (r.get("name") or "").strip()
            if not name:
                continue
            cg = (r.get("cgpa") or "").strip()
            sid = slug(name)
            doms, skills, locs = lst(r.get("domains")), lst(r.get("hard_skills")), lst(r.get("locations"))
            is_sample = sid in ids and not doms and not skills
            if is_sample:
                doms, skills, locs = sample_profile(sid)
            rows.append({
                "id": sid,
                "name": name,
                "programme": "BMS",
                "batch": "2025",
                "cgpa": float(cg) if cg else None,
                "domains": doms,
                "hardSkills": skills,
                "clubs": lst(r.get("clubs")),
                "internship": (r.get("internship") or "").strip(),
                "locations": locs,
                "summary": (r.get("summary") or "").strip(),
                "linkedin": clean_url(r.get("linkedin")),
                "photo": (r.get("photo") or "").strip(),
                "sample": is_sample,
            })
    rows.sort(key=lambda s: s["name"])
    out = pathlib.Path(src).with_name("students.js")
    out.write_text("// Generated by scripts/csv_to_data.py from data/students.csv. Do not edit by hand.\nwindow.STUDENTS = "
                   + json.dumps(rows, indent=1, ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"wrote {len(rows)} students to {out}")

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--sample"]
    if len(args) != 1:
        sys.exit(__doc__)
    main(args[0], "--sample" in sys.argv)
