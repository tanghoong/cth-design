/* theme.js — three-state theme toggle: auto -> light -> dark -> auto
 *
 * The *initial* theme is set by a tiny inline script in <head> (see any page).
 * That must stay inline and run before the stylesheet, or the page paints the
 * wrong theme for a frame. This file only handles the click cycle.
 */
(function () {
  var KEY = 'th';
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    // A browser with storage blocked must still switch theme for this page.
    try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {}
  }

  function apply(v) {
    if (v === 'light' || v === 'dark') root.dataset.theme = v;
    else delete root.dataset.theme;
  }

  function label(v) {
    return v === 'light' ? 'Light' : v === 'dark' ? 'Dark' : 'Auto';
  }

  function sync(btn, v) {
    var t = btn.querySelector('[data-theme-label]');
    if (t) t.textContent = label(v);
    btn.setAttribute('aria-label', 'Theme: ' + label(v) + '. Click to change.');
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    sync(btn, read());
    btn.addEventListener('click', function () {
      var cur = read();
      var next = cur === 'light' ? 'dark' : cur === 'dark' ? null : 'light';
      write(next);
      apply(next);
      document.querySelectorAll('[data-theme-toggle]').forEach(function (b) { sync(b, next); });
    });
  });
})();
