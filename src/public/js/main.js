/**
 * Mascolandia — utilidades UI compartidas (tarea 21)
 */
(function () {
  'use strict';

  const DEBOUNCE_MS = 350;
  const FLASH_DISMISS_MS = 5000;
  const SIDEBAR_SCROLL_KEY = 'mascolandia-sidebar-scroll';

  function debounce(fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function initLucide() {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function initSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    const toggle = document.getElementById('sidebar-toggle');
    if (!sidebar || !toggle) return;

    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    const close = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
      document.body.style.overflow = '';
    };

    const open = () => {
      sidebar.classList.add('open');
      backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) close();
      else open();
    });

    backdrop.addEventListener('click', close);

    sidebar.querySelectorAll('.menu-link').forEach((link) => {
      link.addEventListener('click', () => {
        persistSidebarScroll();
        if (window.innerWidth <= 1024) close();
      });
    });

    initSidebarScrollPersistence();
  }

  function getSidebarMenu() {
    return document.getElementById('sidebar-menu');
  }

  function persistSidebarScroll() {
    const menu = getSidebarMenu();
    if (!menu) return;
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(menu.scrollTop));
  }

  function restoreSidebarScroll() {
    const menu = getSidebarMenu();
    if (!menu) return;

    const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    if (saved !== null && saved !== '') {
      const y = parseInt(saved, 10);
      if (!Number.isNaN(y)) {
        menu.scrollTop = y;
        return;
      }
    }

    const active = menu.querySelector('.menu-link.active');
    if (active) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function initSidebarScrollPersistence() {
    const menu = getSidebarMenu();
    if (!menu) return;

    requestAnimationFrame(() => {
      restoreSidebarScroll();
      requestAnimationFrame(restoreSidebarScroll);
    });

    menu.addEventListener(
      'scroll',
      debounce(persistSidebarScroll, 80),
      { passive: true }
    );

    window.addEventListener('beforeunload', persistSidebarScroll);
  }

  function initFlashToasts() {
    document.querySelectorAll('.flash-toast').forEach((toast) => {
      const closeBtn = toast.querySelector('.flash-toast-close');
      const dismiss = () => {
        toast.classList.add('flash-out');
        setTimeout(() => toast.remove(), 320);
      };
      if (closeBtn) closeBtn.addEventListener('click', dismiss);
      setTimeout(dismiss, FLASH_DISMISS_MS);
    });
  }

  function initLiveSearch() {
    document.querySelectorAll('[data-live-search]').forEach((input) => {
      const targetId = input.getAttribute('data-live-search');
      const table = targetId ? document.getElementById(targetId) : input.closest('.card, .card-premium')?.querySelector('table');
      if (!table) return;

      const rows = () => Array.from(table.querySelectorAll('tbody tr'));

      input.addEventListener(
        'input',
        debounce(() => {
          const q = input.value.trim().toLowerCase();
          rows().forEach((row) => {
            const text = row.textContent.toLowerCase();
            row.style.display = !q || text.includes(q) ? '' : 'none';
          });
        }, DEBOUNCE_MS)
      );
    });
  }

  function initDeleteConfirm() {
    document.querySelectorAll('form[data-confirm-delete]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const msg = form.getAttribute('data-confirm-delete') || '¿Confirma eliminar este registro?';
        const title = form.getAttribute('data-confirm-title') || 'Confirmar eliminación';

        if (typeof Swal !== 'undefined') {
          Swal.fire({
            title,
            text: msg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: '#1e293b',
            color: '#f8fafc',
          }).then((r) => {
            if (r.isConfirmed) form.submit();
          });
        } else if (confirm(msg)) {
          form.submit();
        }
      });
    });
  }

  function initFormValidation() {
    document.querySelectorAll('form[data-validate]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        const invalid = form.querySelectorAll(':invalid');
        if (invalid.length > 0) {
          e.preventDefault();
          invalid[0].focus();
          invalid[0].reportValidity?.();
        }
      });

      form.querySelectorAll('[required]').forEach((el) => {
        el.addEventListener('blur', () => {
          if (!el.checkValidity()) {
            el.classList.add('is-invalid');
          } else {
            el.classList.remove('is-invalid');
          }
        });
      });
    });
  }

  /** Expuesto globalmente para vistas que aún usan onclick */
  window.confirmarEliminar = function confirmarEliminar(event, nombre, entidad) {
    event.preventDefault();
    const form = event.target.closest('form') || event.target;
    const label = entidad || 'registro';
    const msg = nombre
      ? `Se eliminará "${nombre}". Esta acción no se puede deshacer.`
      : `¿Eliminar este ${label}?`;

    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: `¿Eliminar ${label}?`,
        text: msg,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: '#1e293b',
        color: '#f8fafc',
      }).then((r) => {
        if (r.isConfirmed) form.submit();
      });
    } else if (confirm(msg)) {
      form.submit();
    }
    return false;
  };

  function initTableScrollHint() {
    document.querySelectorAll('.table-responsive').forEach((wrap) => {
      const mark = () => {
        wrap.classList.toggle('is-scrollable', wrap.scrollWidth > wrap.clientWidth + 2);
      };
      mark();
      window.addEventListener('resize', debounce(mark, 150));
      wrap.addEventListener('scroll', () => {
        if (wrap.scrollLeft > 8) wrap.classList.add('is-scrollable');
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLucide();
    initSidebar();
    initFlashToasts();
    initLiveSearch();
    initDeleteConfirm();
    initFormValidation();
    initTableScrollHint();
  });

  document.addEventListener('turbo:load', initLucide);
})();
