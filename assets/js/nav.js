/* nav.js — navigation and menu behaviour
 *
 * Two things live here: the mobile nav sheet, and the dropdown-menu
 * housekeeping that <details> does not give you on its own.
 */

/* --- Nav sheet -----------------------------------------------------------
 * The sheet is a <dialog class="drawer">, opened with showModal() so it lands
 * in the top layer. That matters: the header sets backdrop-filter, which makes
 * it a containing block for position:fixed descendants — anything nested
 * inside it gets trapped in the header box instead of covering the viewport.
 * The top layer is outside that entirely.
 */
(function () {
  var sheet = document.querySelector('[data-navsheet]');
  var trigger = document.querySelector('[data-navsheet-open]');
  if (!sheet || !trigger) return;

  trigger.addEventListener('click', function () {
    if (typeof sheet.showModal === 'function') sheet.showModal();
    else sheet.setAttribute('open', '');
  });

  // A tap on any link inside the sheet should navigate and close.
  sheet.addEventListener('click', function (e) {
    if (e.target.closest('a[href]') || e.target.closest('[data-close]')) sheet.close();
  });

  // Click on the backdrop. The backdrop is part of the dialog's hit area, so
  // the test is "was the point outside the dialog's own box".
  sheet.addEventListener('click', function (e) {
    if (e.target !== sheet) return;
    var r = sheet.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right &&
                 e.clientY >= r.top  && e.clientY <= r.bottom;
    if (!inside) sheet.close();
  });

  // Once the viewport is wide enough for the real nav, the sheet must not
  // stay open behind it.
  var wide = window.matchMedia('(width >= 900px)');
  wide.addEventListener('change', function (e) {
    if (e.matches && sheet.open) sheet.close();
  });
})();

/* --- Dropdown menus ------------------------------------------------------
 * <details> handles open/close, but it has no concept of siblings — two menus
 * will happily sit open on top of each other. These three listeners add the
 * behaviour every menu is expected to have.
 */
(function () {
  var menus = document.querySelectorAll('details.menu');
  if (!menus.length) return;

  // Opening one closes the others.
  menus.forEach(function (menu) {
    menu.addEventListener('toggle', function () {
      if (!menu.open) return;
      menus.forEach(function (other) { if (other !== menu) other.open = false; });
    });
  });

  // A click anywhere outside closes all of them.
  document.addEventListener('click', function (e) {
    menus.forEach(function (menu) {
      if (menu.open && !menu.contains(e.target)) menu.open = false;
    });
  });

  // Esc closes the open menu and returns focus to its trigger, which is where
  // the user expects to be — not at the top of the document.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    menus.forEach(function (menu) {
      if (!menu.open) return;
      menu.open = false;
      var summary = menu.querySelector('summary');
      if (summary) summary.focus();
    });
  });
})();

/* --- Current page --------------------------------------------------------
 * Marks the active link in the nav, the sheet and the sidebar rail, so the
 * markup does not have to hand-write aria-current on every page.
 */
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
