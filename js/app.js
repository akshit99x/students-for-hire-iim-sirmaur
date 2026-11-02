/* Students for Hire · IIM Sirmaur (BMS batch)
   Plain JS, no build step. Data comes from data/students.js (window.STUDENTS). */
(function () {
  'use strict';

  // ---- configuration: edit these, not the code below ----
  const CONFIG = {
    cgpaMax: 4.0, // only used to label the optional CGPA badge on a card
    domains: ["Consulting", "Founder's Office", "Marketing", "General Management", "Finance", "Operations",
      "Supply Chain", "Sales", "Product Management", "Business Analytics", "HR", "Strategy", "Others"],
    // Shown in the Hard skills filter even before anyone has them. Skills a student lists that are not here are added automatically.
    hardSkills: ["Excel", "Advanced Excel", "SQL", "Python", "R", "Power BI", "Tableau", "Financial Modelling", "Valuation",
      "Data Analysis", "Market Research", "Digital Marketing", "SEO", "Content Writing", "Canva", "Figma", "PowerPoint",
      "Accounting / Tally", "Bloomberg", "Video Editing"],
  };

  const STUDENTS = (window.STUDENTS || []).slice();
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const domClass = (d) => 't' + (Math.max(CONFIG.domains.indexOf(d), 0) % 4);
  const safeUrl = (u) => (/^https:\/\//i.test(u || '') ? u : '');
  const hasDetails = (s) => s.domains.length > 0 || s.hardSkills.length > 0;
  const LI = '<svg class="li-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>';

  // ---- state ----
  const fresh = () => ({ q: '', domains: new Set(), mode: 'any', primaryOnly: false, skill: new Set(), loc: new Set(), onlyLinkedin: false, onlyDetails: false, sort: 'complete', view: 'grid' });
  let S = fresh();
  let shortlist = new Set();
  const shuffleKey = new Map(STUDENTS.map((s) => [s.id, Math.random()]));
  try { shortlist = new Set(JSON.parse(localStorage.getItem('sfh-shortlist') || '[]')); } catch (e) { /* storage blocked */ }
  const saveShort = () => { try { localStorage.setItem('sfh-shortlist', JSON.stringify([...shortlist])); } catch (e) { /* ignore */ } };

  // ---- filtering (skip = facet being counted, so counts show what a click would give) ----
  function matches(s, skip) {
    if (skip !== 'q' && S.q) {
      const hay = [s.name, s.summary, s.internship, ...s.hardSkills, ...s.clubs, ...s.domains].join(' ').toLowerCase();
      if (!S.q.toLowerCase().split(/\s+/).every((t) => hay.includes(t))) return false;
    }
    if (skip !== 'domain' && S.domains.size) {
      const pool = S.primaryOnly ? s.domains.slice(0, 1) : s.domains;
      const sel = [...S.domains];
      if (!(S.mode === 'all' ? sel.every((d) => pool.includes(d)) : sel.some((d) => pool.includes(d)))) return false;
    }
    if (skip !== 'skill' && S.skill.size && !s.hardSkills.some((k) => S.skill.has(k))) return false;
    if (skip !== 'loc' && S.loc.size && !s.locations.some((l) => S.loc.has(l))) return false;
    if (S.onlyLinkedin && !safeUrl(s.linkedin)) return false;
    if (S.onlyDetails && !hasDetails(s)) return false;
    return true;
  }

  const uniq = (fn) => [...new Set(STUDENTS.flatMap(fn).filter(Boolean))].sort();
  const OPTIONS = { domain: CONFIG.domains, skill: [...new Set([...CONFIG.hardSkills, ...STUDENTS.flatMap((s) => s.hardSkills)])], loc: uniq((s) => s.locations) };
  const valuesOf = { domain: (s) => s.domains, skill: (s) => s.hardSkills, loc: (s) => s.locations };
  const setOf = { domain: 'domains', skill: 'skill', loc: 'loc' };

  function renderChips(key, el) {
    const group = el.closest('.fgroup');
    if (!OPTIONS[key].length) { group.hidden = true; return; }
    const pool = STUDENTS.filter((s) => matches(s, key));
    el.innerHTML = OPTIONS[key].map((o) => {
      const n = pool.filter((s) => valuesOf[key](s).includes(o)).length;
      const on = S[setOf[key]].has(o);
      return `<button type="button" class="chip${n === 0 && !on ? ' zero' : ''}" data-key="${key}" data-v="${esc(o)}" aria-pressed="${on}">${esc(o)} <span class="n">${n}</span></button>`;
    }).join('');
  }

  // ---- card rendering ----
  function card(s) {
    const sel = shortlist.has(s.id);
    const url = safeUrl(s.linkedin);
    const full = hasDetails(s);
    const av = s.photo ? `<img src="${esc(s.photo)}" alt="Photo of ${esc(s.name)}" loading="lazy">` : esc(initials(s.name));
    const tags = s.domains.map((d, i) => `<span class="tag ${domClass(d)}${i === 0 ? ' primary' : ''}" title="${i === 0 ? 'Primary domain' : 'Also interested in'}">${esc(d)}</span>`).join('');
    const facts = [];
    if (s.internship) facts.push(['Internship', s.internship]);
    if (s.hardSkills.length) facts.push(['Hard skills', s.hardSkills.slice(0, 4).join(', ')]);
    if (s.clubs.length) facts.push(['Clubs', s.clubs.slice(0, 2).join(', ')]);
    return `<article class="card${sel ? ' sel' : ''}${full ? '' : ' slim'}" data-id="${esc(s.id)}">
      <div class="card-top">
        <div class="avatar av${s.name.length % 4}">${av}</div>
        <div><h3><button type="button" data-open="${esc(s.id)}">${esc(s.name)}</button></h3><div class="meta">BMS ${esc(s.batch)}</div></div>
        ${s.cgpa != null ? `<div class="cgpa" title="CGPA out of ${CONFIG.cgpaMax}"><b>${s.cgpa.toFixed(2)}</b><span>CGPA</span></div>` : ''}
      </div>
      ${tags ? `<div class="tags">${tags}</div>` : ''}
      ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
      ${full ? '' : '<p class="pending">Domains and hard skills coming soon.</p>'}
      <div class="card-actions">
        ${url ? `<a class="btn btn-blue btn-sm" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${LI} LinkedIn</a>` : '<span class="btn btn-line btn-sm disabled" aria-disabled="true">LinkedIn pending</span>'}
        ${full ? `<button class="btn btn-line btn-sm" type="button" data-open="${esc(s.id)}">Quick view</button>` : ''}
        <button class="star" type="button" data-star="${esc(s.id)}" aria-pressed="${sel}" aria-label="${sel ? 'Remove from' : 'Add to'} shortlist" title="Shortlist">${sel ? '★' : '☆'}</button>
      </div>
    </article>`;
  }

  const score = (s) => (safeUrl(s.linkedin) ? 2 : 0) + (hasDetails(s) ? 1 : 0) + (s.photo ? 0.5 : 0);
  const SORTS = {
    complete: (a, b) => score(b) - score(a) || a.name.localeCompare(b.name),
    name: (a, b) => a.name.localeCompare(b.name),
    shuffle: (a, b) => shuffleKey.get(a.id) - shuffleKey.get(b.id),
  };

  function render() {
    const rows = STUDENTS.filter((s) => matches(s)).sort(SORTS[S.sort]);
    $('#grid').className = 'grid' + (S.view === 'list' ? ' list' : '');
    $('#grid').innerHTML = rows.length ? rows.map(card).join('') :
      '<div class="empty" style="grid-column:1/-1"><h3>No students match these filters</h3><p>Try removing a filter. <button class="btn btn-blue btn-sm" type="button" id="emptyReset">Reset filters</button></p></div>';
    $('#count').innerHTML = `${rows.length} <span>of ${STUDENTS.length} students</span>`;
    renderChips('domain', $('#fDomain')); renderChips('skill', $('#fSkill')); renderChips('loc', $('#fLoc'));
    renderActive(); renderShortbar(); syncUrl();
  }

  function renderActive() {
    const items = [];
    if (S.q) items.push(['q', '', `“${S.q}”`]);
    S.domains.forEach((d) => items.push(['domains', d, d]));
    S.skill.forEach((v) => items.push(['skill', v, v]));
    S.loc.forEach((v) => items.push(['loc', v, v]));
    if (S.onlyLinkedin) items.push(['onlyLinkedin', '', 'LinkedIn available']);
    if (S.onlyDetails) items.push(['onlyDetails', '', 'Details filled in']);
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
    const set = (k) => new Set((p.get(k) || '').split('|').filter(Boolean));
    S.q = p.get('q') || '';
    S.domains = set('domain'); S.mode = p.get('mode') === 'all' ? 'all' : 'any'; S.primaryOnly = p.get('primary') === '1';
    S.skill = set('skill'); S.loc = set('loc');
    S.onlyLinkedin = p.get('li') === '1'; S.onlyDetails = p.get('details') === '1';
    S.sort = SORTS[p.get('sort')] ? p.get('sort') : 'complete';
    S.view = p.get('view') === 'list' ? 'list' : 'grid';
  }
  function syncControls() {
    $('#q').value = S.q; $('#primaryOnly').checked = S.primaryOnly; $('#sort').value = S.sort;
    $('#onlyLinkedin').checked = S.onlyLinkedin; $('#onlyDetails').checked = S.onlyDetails;
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.mode === S.mode));
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
    const url = safeUrl(s.linkedin); const sel = shortlist.has(s.id);
    const block = (title, html) => (html ? `<div><h4>${title}</h4>${html}</div>` : '');
    const tagList = (arr, cls) => (arr.length ? `<div class="tags">${arr.map((k) => `<span class="tag ${cls}">${esc(k)}</span>`).join('')}</div>` : '');
    const m = $('#modal');
    m.innerHTML = `<div class="m-head"><div class="avatar av${s.name.length % 4}">${s.photo ? `<img src="${esc(s.photo)}" alt="">` : esc(initials(s.name))}</div>
        <div><h2 id="mName">${esc(s.name)}</h2><p>BMS ${esc(s.batch)}${s.cgpa != null ? ` · CGPA ${s.cgpa.toFixed(2)} / ${CONFIG.cgpaMax}` : ''}</p></div>
        <button class="m-close" type="button" data-close aria-label="Close">×</button></div>
      <div class="m-body">
        ${s.summary ? `<p style="margin:0">${esc(s.summary)}</p>` : ''}
        ${block('Domains', s.domains.length ? `<div class="tags">${s.domains.map((d, i) => `<span class="tag ${domClass(d)}${i === 0 ? ' primary' : ''}">${esc(d)}${i === 0 ? ' · primary' : ''}</span>`).join('')}</div>` : '')}
        <div class="m-cols">
          ${block('Internship', s.internship ? `<p style="margin:0">${esc(s.internship)}</p>` : '')}
          ${block('Preferred locations', s.locations.length ? `<p style="margin:0">${esc(s.locations.join(', '))}</p>` : '')}
        </div>
        ${block('Hard skills', tagList(s.hardSkills, 't3'))}
        ${block('Clubs and committees', tagList(s.clubs, 't0'))}
        <div class="m-actions">
          ${url ? `<a class="btn btn-blue" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${LI} Open LinkedIn profile</a>` : '<span class="btn btn-line disabled" aria-disabled="true">LinkedIn pending</span>'}
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
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Name', 'Primary domain', 'Other domains', 'Hard skills', 'LinkedIn'];
    const lines = [head.map(q).join(',')].concat(shortRows().map((s) => [s.name, s.domains[0] || '', s.domains.slice(1).join('; '), s.hardSkills.join('; '), s.linkedin || ''].map(q).join(',')));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'iim-sirmaur-shortlist.csv'; document.body.appendChild(a); a.click(); a.remove();
    toast('Shortlist exported');
  }

  // ---- hero stats ----
  function renderStats() {
    const n = STUDENTS.length;
    const li = STUDENTS.filter((s) => safeUrl(s.linkedin)).length;
    const stats = [[n, 'Students'], [li, 'LinkedIn profiles live']];
    stats.push([CONFIG.domains.length - 1, 'Domains to filter by']);
    $('#stats').innerHTML = stats.map(([b, l]) => `<div class="stat"><b>${b}</b><span>${l}</span></div>`).join('');
  }

  // ---- events ----
  function bind() {
    $('#q').addEventListener('input', (e) => { S.q = e.target.value.trim(); render(); });
    $('#primaryOnly').addEventListener('change', (e) => { S.primaryOnly = e.target.checked; render(); });
    $('#onlyLinkedin').addEventListener('change', (e) => { S.onlyLinkedin = e.target.checked; render(); });
    $('#onlyDetails').addEventListener('change', (e) => { S.onlyDetails = e.target.checked; render(); });
    $('#sort').addEventListener('change', (e) => { S.sort = e.target.value; render(); });
    $('#vGrid').addEventListener('click', () => { S.view = 'grid'; syncControls(); render(); });
    $('#vList').addEventListener('click', () => { S.view = 'list'; syncControls(); render(); });
    $('#copyView').addEventListener('click', () => { const qs = syncUrl(); copy(location.protocol === 'file:' ? location.href.split('?')[0] + (qs ? '?' + qs : '') : location.href, 'Link copied'); });
    $('#exportCsv').addEventListener('click', exportCsv);
    $('#copyLinks').addEventListener('click', () => copy(shortRows().map((s) => `${s.name}: ${s.linkedin || 'LinkedIn pending'}`).join('\n'), 'LinkedIn links copied'));
    $('#clearShort').addEventListener('click', () => { shortlist.clear(); saveShort(); render(); });
    $('#resetBtn').addEventListener('click', reset);

    document.addEventListener('click', (e) => {
      const t = e.target.closest('button, .scrim'); if (!t) return;
      if (t.dataset.key) {
        const set = S[setOf[t.dataset.key]], v = t.dataset.v;
        set.has(v) ? set.delete(v) : set.add(v); render();
      } else if (t.dataset.mode) { S.mode = t.dataset.mode; syncControls(); render(); }
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleDrawer(false); });
    $('#sampleClose').addEventListener('click', () => { $('#sampleBanner').hidden = true; });
  }
  function toggleDrawer(open) { $('#filters').classList.toggle('open', open); $('#scrim').classList.toggle('show', open); }
  function reset() { const keep = { sort: S.sort, view: S.view }; S = Object.assign(fresh(), keep); syncControls(); render(); }

  // ---- init ----
  readUrl(); syncControls(); bind(); renderStats(); render();
  if (STUDENTS.some((s) => !hasDetails(s))) $('#sampleBanner').hidden = false;
})();
