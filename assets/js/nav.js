/* nav.js — mobile nav sheet behaviour
 *
 * The sheet is a <details>, so it opens and closes with no JS at all. This
 * file only adds the three affordances the element does not give you free:
 * Esc to close, click-outside to close, and a scroll lock while it is open.
 */
(function () {
  var sheet = document.querySelector('[data-navsheet]');
  if (!sheet) return;

  function close() { sheet.open = false; }

  sheet.addEventListener('toggle', function () {
    // Locking the body is what stops the page scrolling behind the panel.
    document.body.style.overflow = sheet.open ? 'hidden' : '';
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && sheet.open) close();
  });

  document.addEventListener('click', function (e) {
    if (!sheet.open) return;
    if (e.target.closest('[data-navsheet-scrim]')) return close();
    // A tap on a link inside the panel should navigate and close.
    if (e.target.closest('[data-navsheet] a')) return close();
  });

  // Once the viewport is wide enough for the real nav, the sheet must not
  // stay open behind it.
  var wide = window.matchMedia('(width >= 900px)');
  wide.addEventListener('change', function (e) { if (e.matches) close(); });
})();

/* Mark the current page in the nav and the sidebar rail. Saves hand-writing
 * aria-current on every link of every page. */
(function () {
  var here = location.pathname.replace(/index\.html$/, '').replace(/\/$/, '') || '/';
  document.querySelectorAll('.head-nav a, .rail__list a, .sheet-row').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    var path = new URL(href, location.href).pathname
      .replace(/index\.html$/, '').replace(/\/$/, '') || '/';
    if (path === here) a.setAttribute('aria-current', 'page');
  });
})();
