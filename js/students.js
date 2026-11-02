/* Copy button on the For Students page. */
(function () {
  'use strict';
  const btn = document.getElementById('copyPost');
  if (!btn) return;
  btn.addEventListener('click', async function () {
    const text = document.getElementById('post').firstChild.textContent.trim();
    try { await navigator.clipboard.writeText(text); } catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (_) { /* ignore */ } ta.remove();
    }
    const t = document.getElementById('toast'); t.textContent = 'Post copied'; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  });
})();
