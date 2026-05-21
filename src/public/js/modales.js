/**
 * Modales reutilizables — Mascolandia
 */
(function () {
  'use strict';

  const OPEN_CLASS = 'active';
  const SIZES = ['modal-lg', 'modal-xl', 'modal-full'];

  function getModal(id) {
    const el = document.getElementById(id);
    return el && el.classList.contains('modal-overlay') ? el : null;
  }

  function refreshIcons() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function bindCloseButtons(root) {
    (root || document).querySelectorAll('[data-modal-close]').forEach((btn) => {
      if (btn.dataset.modalCloseBound) return;
      btn.dataset.modalCloseBound = '1';
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-modal-close');
        if (id) close(id);
        else {
          const overlay = btn.closest('.modal-overlay');
          if (overlay?.id) close(overlay.id);
        }
      });
    });
  }

  function initDynamicModalContent(modal) {
    if (!modal) return;
    bindCloseButtons(modal);

    if (typeof initMascotaRazasForm === 'function') {
      initMascotaRazasForm('modal-edit-mascota-especie', 'modal-edit-mascota-raza');
      initMascotaFotoPreview('modal-edit-mascota-foto', 'modal-edit-mascota-foto-preview', 'modal-edit-mascota-foto-img');
    }
  }

  function setModalMeta(shellId, meta) {
    const modal = getModal(shellId);
    if (!modal) return;
    const dialog = modal.querySelector('.modal-content');
    const titleText = modal.querySelector('[id$="-title-text"], #modal-gestion-title-text');
    const iconEl = modal.querySelector('#modal-gestion-icon');

    if (dialog && meta.size) {
      SIZES.forEach((s) => dialog.classList.remove(s));
      dialog.classList.add(meta.size);
    } else if (dialog && meta.size === null) {
      SIZES.forEach((s) => dialog.classList.remove(s));
      dialog.classList.add('modal-lg');
    }

    if (titleText && meta.title) titleText.textContent = meta.title;
    if (iconEl && meta.icon) {
      iconEl.setAttribute('data-lucide', meta.icon);
    }
  }

  function open(id) {
    const modal = getModal(id);
    if (!modal) return;
    modal.classList.add(OPEN_CLASS);
    document.body.style.overflow = 'hidden';
    refreshIcons();
    const first = modal.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])');
    if (first) setTimeout(() => first.focus(), 80);
  }

  function close(id) {
    const modal = getModal(id);
    if (!modal) return;
    modal.classList.remove(OPEN_CLASS);
    if (!document.querySelector('.modal-overlay.active')) {
      document.body.style.overflow = '';
    }
  }

  function closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach((m) => m.classList.remove(OPEN_CLASS));
    document.body.style.overflow = '';
  }

  async function openLoaded(shellId, url, meta) {
    const modal = getModal(shellId);
    if (!modal) return;

    const body = modal.querySelector('[data-modal-dynamic-body]');
    if (!body) return;

    setModalMeta(shellId, meta || {});
    body.innerHTML = '<div class="modal-loading">Cargando…</div>';
    open(shellId);

    try {
      const res = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('fetch failed');
      body.innerHTML = await res.text();
      initDynamicModalContent(modal);
      refreshIcons();
    } catch (err) {
      body.innerHTML = '<p class="text-danger" style="padding:1rem;">No se pudo cargar el contenido. <a href="' + url.replace(/\/modal.*/, '') + '">Abrir en página completa</a>.</p>';
      refreshIcons();
    }
  }

  function initModalListeners() {
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      if (modal.dataset.overlayBound) return;
      modal.dataset.overlayBound = '1';
      modal.addEventListener('click', (e) => {
        if (e.target === modal) close(modal.id);
      });
    });
    bindCloseButtons();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAll();
    });
  }

  function autoOpenFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const modalId = params.get('modal');
    if (modalId && getModal(modalId)) {
      open(modalId);
      params.delete('modal');
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : '');
      window.history.replaceState({}, '', url);
    }
  }

  window.MascoModal = { open, close, closeAll, openLoaded };

  document.addEventListener('DOMContentLoaded', () => {
    initModalListeners();
    autoOpenFromQuery();
  });
})();
