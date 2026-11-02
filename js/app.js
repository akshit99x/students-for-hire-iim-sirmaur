/* Students for Hire · IIM Sirmaur (BMS batch)
   Plain JS, no build step. Data comes from data/students.js (window.STUDENTS).
   All text is HTML-escaped, links are restricted to https LinkedIn URLs and photos to assets/photos/. */
(function () {
  'use strict';

  // ---- configuration: edit these, not the code below ----
  const CONFIG = {
    cgpaMax: 4.0, // only used to label the optional CGPA badge on a card
    contactEmail: 'bmspcom1@iimsirmaur.ac.in',
    domains: ["Consulting", "Founder's Office", "Marketing", "General Management", "Finance", "Investment Banking", "Operations",
      "Supply Chain", "Sales", "Product Management", "Business Analytics", "HR", "Strategy", "Entrepreneurship", "Others"],
    // Shown in the Hard skills filter even before anyone has them. Skills a student lists that are not here appear under "Other".
    skillGroups: {
      "Data & Analytics": ["Excel", "Advanced Excel", "Google Sheets", "VBA / Macros", "SQL", "Python", "R", "Power BI", "Tableau",
        "Looker Studio", "Data Analysis", "Data Visualisation", "Statistics", "Machine Learning", "Google Analytics"],
      "Finance & Accounting": ["Financial Modelling", "Valuation", "Financial Statement Analysis", "Equity Research", "Investment Analysis",
        "Budgeting & Forecasting", "Risk Management", "Accounting / Tally", "Taxation & GST", "Bloomberg", "Capital IQ", "SAP"],
      "Marketing & Sales": ["Digital Marketing", "SEO", "Google Ads", "Meta Ads", "Social Media Marketing", "Content Writing", "Copywriting",
        "Email Marketing", "Market Research", "Brand Management", "CRM / Salesforce", "Lead Generation"],
      "Design & Media": ["Canva", "Figma", "Photoshop", "Graphic Design", "Presentation Design", "Video Editing", "Premiere Pro", "Photography"],
      "Strategy & Operations": ["PowerPoint", "Strategy Frameworks", "Project Management", "Process Improvement", "Lean / Six Sigma",
        "Supply Chain Planning", "Inventory Management", "Logistics", "Agile / Scrum", "Jira", "Notion"],
      "HR & People": ["Talent Acquisition", "HR Analytics", "HRIS", "Compensation & Benefits", "Performance Management",
        "Learning & Development", "Employee Engagement"],
    },
  };

  // ---- safety helpers ----
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const domClass = (d) => 't' + (Math.max(CONFIG.domains.indexOf(d), 0) % 4);
  const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const strList = (v) => (Array.isArray(v) ? v.map((x) => str(x, 60)).filter(Boolean).slice(0, 30) : []);
  // Only https links on linkedin.com; anything else is dropped.
  function safeUrl(u) {
    try {
      const x = new URL(String(u || ''));
      const host = x.hostname.toLowerCase();
      return x.protocol === 'https:' && (host === 'linkedin.com' || host.endsWith('.linkedin.com')) ? x.href : '';
    } catch (e) { return ''; }
  }
  const safePhoto = (p) => (/^assets\/photos\/[a-z0-9._-]+\.(jpe?g|png|webp)$/i.test(p || '') ? p : '');
  // Stops spreadsheet apps from running a cell that starts with = + - @ as a formula.
  const csvSafe = (v) => { const t = String(v ?? ''); return /^[=+\-@\t\r]/.test(t) ? "'" + t : t; };

  // Normalise whatever is in data/students.js so the rest of the code can trust the shape.
  const STUDENTS = (Array.isArray(window.STUDENTS) ? window.STUDENTS : []).map((r) => ({
    id: str(r.id, 80), name: str(r.name, 80), batch: str(r.batch, 8) || '2025',
    cgpa: typeof r.cgpa === 'number' && isFinite(r.cgpa) ? r.cgpa : null,
    domains: strList(r.domains), hardSkills: strList(r.hardSkills), clubs: strList(r.clubs), locations: strList(r.locations),
    internship: str(r.internship, 200), summary: str(r.summary, 600),
    linkedin: safeUrl(r.linkedin), photo: safePhoto(r.photo), sample: r.sample === true,
  })).filter((s) => s.id && s.name);

  const hasDetails = (s) => s.domains.length > 0 || s.hardSkills.length > 0;
  const confirmed = (s) => hasDetails(s) && !s.sample;
  const LI = '<svg class="li-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>';

  // ---- state ----
  const fresh = () => ({ q: '', domains: new Set(), mode: 'any', primaryOnly: false, skill: new Set(), smode: 'any', loc: new Set(), onlyLinkedin: false, onlyDetails: false, sort: 'complete', view: 'grid' });
  let S = fresh();
  let shortlist = new Set();
  let skillNeedle = '';
  const openGroups = new Set();
  const known = new Set(STUDENTS.map((s) => s.id));
  const shuffleKey = new Map(STUDENTS.map((s) => [s.id, Math.random()]));
  try { shortlist = new Set(JSON.parse(localStorage.getItem('sfh-shortlist') || '[]').filter((id) => known.has(id))); } catch (e) { /* storage blocked */ }
  const saveShort = () => { try { localStorage.setItem('sfh-shortlist', JSON.stringify([...shortlist])); } catch (e) { /* ignore */ } };

  // ---- filtering (skip = facet being counted, so counts show what a click would give) ----
  const pick = (mode, sel, pool) => (mode === 'all' ? sel.every((v) => pool.includes(v)) : sel.some((v) => pool.includes(v)));
  function matches(s, skip) {
    if (skip !== 'q' && S.q) {
      const hay = [s.name, s.summary, s.internship, ...s.hardSkills, ...s.clubs, ...s.domains].join(' ').toLowerCase();
      if (!S.q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
    }
    if (skip !== 'domain' && S.domains.size && !pick(S.mode, [...S.domains], S.primaryOnly ? s.domains.slice(0, 1) : s.domains)) return false;
    if (skip !== 'skill' && S.skill.size && !pick(S.smode, [...S.skill], s.hardSkills)) return false;
    if (skip !== 'loc' && S.loc.size && !s.locations.some((l) => S.loc.has(l))) return false;
    if (S.onlyLinkedin && !s.linkedin) return false;
    if (S.onlyDetails && !confirmed(s)) return false;
    return true;
  }

  const uniq = (fn) => [...new Set(STUDENTS.flatMap(fn).filter(Boolean))].sort();
  const configured = Object.values(CONFIG.skillGroups).flat();
  const extraSkills = uniq((s) => s.hardSkills).filter((k) => !configured.includes(k));
  const SKILL_GROUPS = Object.entries(CONFIG.skillGroups).concat(extraSkills.length ? [['Other', extraSkills]] : []);
  const OPTIONS = { domain: CONFIG.domains, skill: SKILL_GROUPS.flatMap(([, l]) => l), loc: uniq((s) => s.locations) };
  const valuesOf = { domain: (s) => s.domains, skill: (s) => s.hardSkills, loc: (s) => s.locations };
  const setOf = { domain: 'domains', skill: 'skill', loc: 'loc' };

  const chip = (key, o, pool) => {
    const n = pool.filter((s) => valuesOf[key](s).includes(o)).length;
    const on = S[setOf[key]].has(o);
    return `<button type="button" class="chip${n === 0 && !on ? ' zero' : ''}" data-key="${key}" data-v="${esc(o)}" aria-pressed="${on}">${esc(o)} <span class="n">${n}</span></button>`;
  };
  function renderChips(key, el) {
    const group = el.closest('.fgroup');
    if (group) group.hidden = !OPTIONS[key].length;
    const pool = STUDENTS.filter((s) => matches(s, key));
    el.innerHTML = OPTIONS[key].map((o) => chip(key, o, pool)).join('');
  }
  function renderSkills() {
    const pool = STUDENTS.filter((s) => matches(s, 'skill'));
    const needle = skillNeedle.toLowerCase();
    const html = SKILL_GROUPS.map(([g, list]) => {
      const shown = list.filter((k) => !needle || k.toLowerCase().includes(needle));
      if (!shown.length) return '';
      const nSel = list.filter((k) => S.skill.has(k)).length;
      return `<details class="skillgrp" data-g="${esc(g)}"${needle || openGroups.has(g) ? ' open' : ''}><summary>${esc(g)}${nSel ? `<span class="sel">${nSel}</span>` : ''}</summary><div class="chips">${shown.map((k) => chip('skill', k, pool)).join('')}</div></details>`;
    }).join('');
    $('#fSkill').innerHTML = html || '<p class="muted-note flush">No hard skill matches that search.</p>';
  }

  // ---- card rendering ----
  function card(s) {
    const sel = shortlist.has(s.id);
    const full = hasDetails(s);
    const av = s.photo ? `<img src="${esc(s.photo)}" alt="Photo of ${esc(s.name)}" loading="lazy" width="56" height="56">` : esc(initials(s.name));
    const tags = s.domains.map((d, i) => `<span class="tag ${domClass(d)}${i === 0 ? ' primary' : ''}" title="${i === 0 ? 'Primary domain' : 'Also interested in'}">${esc(d)}</span>`).join('');
    const facts = [];
    if (s.internship) facts.push(['Internship', s.internship]);
    if (s.hardSkills.length) facts.push(['Hard skills', s.hardSkills.slice(0, 4).join(', ') + (s.hardSkills.length > 4 ? ` +${s.hardSkills.length - 4}` : '')]);
    if (s.locations.length) facts.push(['Location', s.locations.slice(0, 2).join(', ')]);
    if (s.clubs.length) facts.push(['Clubs', s.clubs.slice(0, 2).join(', ')]);
    return `<article class="card${sel ? ' sel' : ''}${full ? '' : ' slim'}" data-id="${esc(s.id)}">
      <div class="card-top">
        <div class="avatar av${s.name.length % 4}">${av}</div>
        <div><h3><button type="button" data-open="${esc(s.id)}">${esc(s.name)}</button></h3><div class="meta">BMS ${esc(s.batch)}</div></div>
        ${s.sample && full ? '<span class="tag sample" title="Placeholder details until the student confirms their own">Sample</span>' : ''}
        ${s.cgpa != null ? `<div class="cgpa" title="CGPA out of ${CONFIG.cgpaMax}"><b>${s.cgpa.toFixed(2)}</b><span>CGPA</span></div>` : ''}
      </div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
      ${full ? '' : '<p class="pending">Domains and hard skills coming soon.</p>'}
      ${s.sample && full ? '<p class="sample-note">Placeholder details, awaiting the student.</p>' : ''}
      <div class="card-actions">
        ${s.linkedin ? `<a class="btn btn-blue btn-sm" href="${esc(s.linkedin)}" target="_blank" rel="noopener noreferrer">${LI} LinkedIn</a>` : '<span class="btn btn-line btn-sm disabled" aria-disabled="true">LinkedIn pending</span>'}
        ${full ? `<button class="btn btn-line btn-sm" type="button" data-open="${esc(s.id)}">Quick view</button>` : ''}
        <button class="star" type="button" data-star="${esc(s.id)}" aria-pressed="${sel}" aria-label="${sel ? 'Remove from' : 'Add to'} shortlist" title="Shortlist">${sel ? '★' : '☆'}</button>
      </div>
    </article>`;
  }

  // Tiers first (LinkedIn live, then confirmed details, then photo); inside a tier the order is random so nobody is favoured by their name.
  const score = (s) => (s.linkedin ? 2 : 0) + (confirmed(s) ? 1 : 0) + (s.photo ? 0.5 : 0);
  const SORTS = {
    complete: (a, b) => score(b) - score(a) || shuffleKey.get(a.id) - shuffleKey.get(b.id),
    name: (a, b) => a.name.localeCompare(b.name),
    shuffle: (a, b) => shuffleKey.get(a.id) - shuffleKey.get(b.id),
  };

  function render() {
    const rows = STUDENTS.filter((s) => matches(s)).sort(SORTS[S.sort]);
    $('#grid').className = 'grid' + (S.view === 'list' ? ' list' : '');
    $('#grid').innerHTML = rows.length ? rows.map(card).join('') :
      '<div class="empty"><h3>No students match these filters</h3><p>Try removing a filter. <button class="btn btn-blue btn-sm" type="button" id="emptyReset">Reset filters</button></p></div>';
    $('#count').innerHTML = `${rows.length} <span>of ${STUDENTS.length} students</span>`;
    renderChips('domain', $('#fDomain')); renderChips('domain', $('#quickDomain')); renderSkills(); renderChips('loc', $('#fLoc'));
    renderActive(); renderShortbar(); syncUrl();
  }

  function renderActive() {
    const items = [];
    if (S.q) items.push(['q', '', `“${S.q}”`]);
    S.domains.forEach((d) => items.push(['domains', d, d]));
    S.skill.forEach((v) => items.push(['skill', v, v]));
    S.loc.forEach((v) => items.push(['loc', v, v]));
    if (S.onlyLinkedin) items.push(['onlyLinkedin', '', 'LinkedIn available']);
    if (S.onlyDetails) items.push(['onlyDetails', '', 'Student-confirmed details']);
    $('#active').innerHTML = items.map(([k, v, label]) => `<button class="chip" type="button" data-rm="${k}" data-v="${esc(v)}">${esc(label)} ✕</button>`).join('');
  }

  function renderShortbar() {
    $('#shortN').textContent = shortlist.size;
    $('#shortbar').classList.toggle('show', shortlist.size > 0);
  }

  // ---- URL state so a filtered view can be shared ----
  function syncUrl() {
    const p = new URLSearchParams();
    if (S.q) p.set('q', S.q);
    if (S.domains.size) p.set('domain', [...S.domains].join('|'));
    if (S.mode === 'all') p.set('mode', 'all');
    if (S.primaryOnly) p.set('primary', '1');
    ['skill', 'loc'].forEach((k) => S[k].size && p.set(k, [...S[k]].join('|')));
    if (S.smode === 'all') p.set('smode', 'all');
    if (S.onlyLinkedin) p.set('li', '1');
    if (S.onlyDetails) p.set('details', '1');
    if (S.sort !== 'complete') p.set('sort', S.sort);
    if (S.view !== 'grid') p.set('view', S.view);
    const qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch (e) { /* file:// */ }
    return qs;
  }
  function readUrl() {
    const p = new URLSearchParams(location.search);
    const set = (k) => new Set((p.get(k) || '').split('|').map((x) => x.trim().slice(0, 40)).filter(Boolean).slice(0, 30));
    S.q = (p.get('q') || '').slice(0, 80);
    S.domains = set('domain'); S.mode = p.get('mode') === 'all' ? 'all' : 'any'; S.primaryOnly = p.get('primary') === '1';
    S.skill = set('skill'); S.loc = set('loc'); S.smode = p.get('smode') === 'all' ? 'all' : 'any';
    S.onlyLinkedin = p.get('li') === '1'; S.onlyDetails = p.get('details') === '1';
    S.sort = Object.prototype.hasOwnProperty.call(SORTS, p.get('sort')) ? p.get('sort') : 'complete';
    S.view = p.get('view') === 'list' ? 'list' : 'grid';
  }
  function syncControls() {
    $('#q').value = S.q; $('#primaryOnly').checked = S.primaryOnly; $('#sort').value = S.sort;
    $('#onlyLinkedin').checked = S.onlyLinkedin; $('#onlyDetails').checked = S.onlyDetails;
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === S.mode));
    document.querySelectorAll('[data-smode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.smode === S.smode));
    $('#vGrid').setAttribute('aria-pressed', S.view === 'grid'); $('#vList').setAttribute('aria-pressed', S.view === 'list');
  }

  // ---- toast / clipboard ----
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  async function copy(text, ok) {
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) { /* ignore */ } ta.remove();
    }
    toast(ok);
  }

  // ---- modal ----
  function openModal(id) {
    const s = STUDENTS.find((x) => x.id === id); if (!s) return;
    const sel = shortlist.has(s.id);
    const block = (title, html) => (html ? `<div><h4>${title}</h4>${html}</div>` : '');
    const tagList = (arr, cls) => (arr.length ? `<div class="tags">${arr.map((k) => `<span class="tag ${cls}">${esc(k)}</span>`).join('')}</div>` : '');
    const m = $('#modal');
    m.innerHTML = `<div class="m-head"><div class="avatar av${s.name.length % 4}">${s.photo ? `<img src="${esc(s.photo)}" alt="" width="76" height="76">` : esc(initials(s.name))}</div>
        <div><h2 id="mName">${esc(s.name)}</h2><p>BMS ${esc(s.batch)}${s.cgpa != null ? ` · CGPA ${s.cgpa.toFixed(2)} / ${CONFIG.cgpaMax}` : ''}</p></div>
        <button class="m-close" type="button" data-close aria-label="Close">×</button></div>
      <div class="m-body">
        ${s.sample && hasDetails(s) ? '<div class="note mt-0">Sample details. These are placeholders until the student confirms their own domains, skills and locations.</div>' : ''}
        ${s.summary ? `<p class="flush">${esc(s.summary)}</p>` : ''}
        ${block('Domains', s.domains.length ? `<div class="tags">${s.domains.map((d, i) => `<span class="tag ${domClass(d)}${i === 0 ? ' primary' : ''}">${esc(d)}${i === 0 ? ' · primary' : ''}</span>`).join('')}</div>` : '')}
        <div class="m-cols">
          ${block('Internship', s.internship ? `<p class="flush">${esc(s.internship)}</p>` : '')}
          ${block('Preferred locations', s.locations.length ? `<p class="flush">${esc(s.locations.join(', '))}</p>` : '')}
        </div>
        ${block('Hard skills', tagList(s.hardSkills, 't3'))}
        ${block('Clubs and committees', tagList(s.clubs, 't0'))}
        <div class="m-actions">
          ${s.linkedin ? `<a class="btn btn-blue" href="${esc(s.linkedin)}" target="_blank" rel="noopener noreferrer">${LI} Open LinkedIn profile</a>` : '<span class="btn btn-line disabled" aria-disabled="true">LinkedIn pending</span>'}
          <button class="btn btn-line" type="button" data-star="${esc(s.id)}" aria-pressed="${sel}">${sel ? '★ Shortlisted' : '☆ Add to shortlist'}</button>
        </div>
      </div>`;
    if (!m.open) m.showModal();
  }

  // ---- shortlist actions ----
  function toggleStar(id) {
    shortlist.has(id) ? shortlist.delete(id) : shortlist.add(id);
    saveShort(); render();
    const m = $('#modal'); if (m.open) openModal(id);
  }
  const shortRows = () => STUDENTS.filter((s) => shortlist.has(s.id));
  function exportCsv() {
    const q = (v) => `"${csvSafe(v).replace(/"/g, '""')}"`;
    const head = ['Name', 'Primary domain', 'Other domains', 'Hard skills', 'LinkedIn'];
    const lines = [head.map(q).join(',')].concat(shortRows().map((s) => [s.name, s.domains[0] || '', s.domains.slice(1).join('; '), s.hardSkills.join('; '), s.linkedin || ''].map(q).join(',')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'iim-sirmaur-shortlist.csv'; document.body.appendChild(a); a.click(); a.remove();
    toast('Shortlist exported');
  }
  function mailShortlist() {
    const lines = shortRows().map((s) => `- ${s.name}${s.domains[0] ? ' (' + s.domains[0] + ')' : ''}${s.linkedin ? ': ' + s.linkedin : ''}`).join('\n');
    const body = `Hello Placement Committee,\n\nWe would like to connect with the following students from the IIM Sirmaur BMS batch:\n\n${lines}\n\nCompany / role:\nPreferred dates:\n\nThank you.`.slice(0, 1800);
    location.href = `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent('Shortlist from the IIM Sirmaur talent portal')}&body=${encodeURIComponent(body)}`;
  }

  // ---- hero stats ----
  function renderStats() {
    const li = STUDENTS.filter((s) => s.linkedin).length;
    const stats = [[STUDENTS.length, 'Students'], [li, 'LinkedIn profiles live'], [CONFIG.domains.length - 1, 'Domains to filter by'], [OPTIONS.skill.length, 'Hard skills to filter by']];
    $('#stats').innerHTML = stats.map(([b, l]) => `<div class="stat"><b>${b}</b><span>${l}</span></div>`).join('');
  }

  // ---- events ----
  function bind() {
    $('#q').addEventListener('input', (e) => { S.q = e.target.value.trim().slice(0, 80); render(); });
    $('#skillQ').addEventListener('input', (e) => { skillNeedle = e.target.value.trim().slice(0, 40); renderSkills(); });
    $('#fSkill').addEventListener('toggle', (e) => {
      const g = e.target.dataset && e.target.dataset.g; if (!g || skillNeedle) return;
      e.target.open ? openGroups.add(g) : openGroups.delete(g);
    }, true);
    $('#primaryOnly').addEventListener('change', (e) => { S.primaryOnly = e.target.checked; render(); });
    $('#onlyLinkedin').addEventListener('change', (e) => { S.onlyLinkedin = e.target.checked; render(); });
    $('#onlyDetails').addEventListener('change', (e) => { S.onlyDetails = e.target.checked; render(); });
    $('#sort').addEventListener('change', (e) => { S.sort = e.target.value; render(); });
    $('#vGrid').addEventListener('click', () => { S.view = 'grid'; syncControls(); render(); });
    $('#vList').addEventListener('click', () => { S.view = 'list'; syncControls(); render(); });
    $('#copyView').addEventListener('click', () => { const qs = syncUrl(); copy(location.protocol === 'file:' ? location.href.split('?')[0] + (qs ? '?' + qs : '') : location.href, 'Link copied'); });
    $('#exportCsv').addEventListener('click', exportCsv);
    $('#mailShort').addEventListener('click', mailShortlist);
    $('#copyLinks').addEventListener('click', () => copy(shortRows().map((s) => `${s.name}: ${s.linkedin || 'LinkedIn pending'}`).join('\n'), 'LinkedIn links copied'));
    $('#clearShort').addEventListener('click', () => { shortlist.clear(); saveShort(); render(); });
    $('#resetBtn').addEventListener('click', reset);

    document.addEventListener('click', (e) => {
      const t = e.target.closest('button, .scrim'); if (!t) return;
      if (t.dataset.key) {
        const set = S[setOf[t.dataset.key]], v = t.dataset.v;
        if (t.dataset.key === 'skill') { const g = SKILL_GROUPS.find(([, l]) => l.includes(v)); if (g) openGroups.add(g[0]); }
        set.has(v) ? set.delete(v) : set.add(v); render();
      } else if (t.dataset.mode) { S.mode = t.dataset.mode; syncControls(); render(); }
      else if (t.dataset.smode) { S.smode = t.dataset.smode; syncControls(); render(); }
      else if (t.dataset.rm) {
        const k = t.dataset.rm;
        if (k === 'q') S.q = ''; else if (k === 'onlyLinkedin' || k === 'onlyDetails') S[k] = false; else S[k].delete(t.dataset.v);
        syncControls(); render();
      }
      else if (t.dataset.open) openModal(t.dataset.open);
      else if (t.dataset.star) toggleStar(t.dataset.star);
      else if ('close' in t.dataset) $('#modal').close();
      else if (t.id === 'emptyReset') reset();
      else if (t.id === 'openFilters') toggleDrawer(true);
      else if (t.classList.contains('scrim')) toggleDrawer(false);
    });
    $('#scrim').addEventListener('click', () => toggleDrawer(false));
    $('#modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') toggleDrawer(false);
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || ''));
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !$('#modal').open) { e.preventDefault(); toggleDrawer(window.innerWidth <= 980); $('#q').focus(); }
    });
    $('#sampleClose').addEventListener('click', () => { $('#sampleBanner').hidden = true; });
  }
  function toggleDrawer(open) { $('#filters').classList.toggle('open', open); $('#scrim').classList.toggle('show', open); }
  function reset() { const keep = { sort: S.sort, view: S.view }; S = Object.assign(fresh(), keep); skillNeedle = ''; $('#skillQ').value = ''; syncControls(); render(); }

  // ---- init ----
  readUrl();
  if (SKILL_GROUPS.length) openGroups.add(SKILL_GROUPS[0][0]);
  S.skill.forEach((v) => { const g = SKILL_GROUPS.find(([, l]) => l.includes(v)); if (g) openGroups.add(g[0]); });
  syncControls(); bind(); renderStats(); render();
  if (STUDENTS.some((s) => s.sample || !hasDetails(s))) $('#sampleBanner').hidden = false;
})();
