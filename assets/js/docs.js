/* docs.js — reference-site chrome only
 * Copy buttons on code panels, section anchors, and the demo wiring for
 * modals/toasts on the overlays page. None of this ships in a product.
 */

/* --- Copy buttons --------------------------------------------------------
   Injected rather than authored, so the specimen markup stays clean. */
(function () {
  document.querySelectorAll('.spec__code').forEach(function (box) {
    var pre = box.querySelector('pre');
    if (!pre) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy';
    btn.textContent = 'Copy';
    box.appendChild(btn);

    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(pre.innerText).then(function () {
        btn.textContent = 'Copied';
        btn.dataset.done = '1';
        setTimeout(function () {
          btn.textContent = 'Copy';
          delete btn.dataset.done;
        }, 1600);
      }).catch(function () {
        btn.textContent = 'Press Ctrl+C';
      });
    });
  });
})();

/* --- Heading anchors -----------------------------------------------------  */
(function () {
  document.querySelectorAll('main h2[id], main h3[id]').forEach(function (h) {
    if (h.querySelector('a[href^="#"]')) return;
    h.classList.add('anchor-h');
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = '#';
    a.setAttribute('aria-label', 'Link to ' + h.textContent.trim());
    h.appendChild(a);
  });
})();

/* --- Modal / drawer demos ------------------------------------------------
   Native <dialog>: showModal() gives the focus trap and Esc for free. */
(function () {
  document.querySelectorAll('[data-open]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var d = document.getElementById(btn.dataset.open);
      if (d && typeof d.showModal === 'function') d.showModal();
    });
  });
  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var d = btn.closest('dialog');
      if (d) d.close();
    });
  });
  // Click on the backdrop closes. The check is "was the click outside the
  // dialog's own box", since the backdrop is part of the dialog's hit area.
  document.querySelectorAll('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) {
      if (e.target !== d) return;
      var r = d.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;
      if (!inside) d.close();
    });
  });
})();

/* --- Toast demo ----------------------------------------------------------  */
(function () {
  var host = document.querySelector('[data-toasts]');
  if (!host) return;

  document.querySelectorAll('[data-toast]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var el = document.createElement('div');
      el.className = 'toast' + (btn.dataset.toastVariant ? ' toast--' + btn.dataset.toastVariant : '');
      el.setAttribute('role', 'status');
      el.innerHTML = '<span class="toast__icon" aria-hidden="true">●</span><span></span>';
      el.lastElementChild.textContent = btn.dataset.toast;
      host.appendChild(el);
      setTimeout(function () { el.remove(); }, 3200);
    });
  });
})();
