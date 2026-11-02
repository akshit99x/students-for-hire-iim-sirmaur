/* Clickjacking guard. GitHub Pages cannot send X-Frame-Options / frame-ancestors headers,
   so if this page is ever loaded inside someone else's frame, hide it and break out. */
(function () {
  'use strict';
  if (window.top === window.self) return;
  document.documentElement.hidden = true;
  try { window.top.location.replace(window.self.location.href); } catch (e) { /* cross-origin: stays hidden */ }
})();
