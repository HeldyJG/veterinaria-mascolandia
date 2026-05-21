/**
 * modal-ajax-form.js — Mascolandia
 *
 * Convierte formularios dentro de modales a AJAX.
 * Muestra errores dentro del modal sin cerrarlo ni perder los datos.
 *
 * Uso: agregar data-ajax-modal="true" al <form> y
 *      data-modal-id="<id-del-modal>" para saber qué modal cerrar al éxito.
 *
 * El servidor debe responder con JSON:
 *   Éxito:  { success: true, message: '...' }
 *   Error:  { success: false, errors: ['msg1', 'msg2'] }
 */
(function () {
  'use strict';

  /**
   * Muestra el error dentro del modal.
   * Busca o crea un div.modal-ajax-error dentro del form.
   */
  function showModalError(form, msg) {
    let box = form.querySelector('.modal-ajax-error');
    if (!box) {
      box = document.createElement('div');
      box.className = 'modal-ajax-error alert alert-danger';
      box.setAttribute('role', 'alert');
      box.style.cssText = 'padding:0.9rem 1rem;border-radius:0.5rem;border:1px solid rgba(239,68,68,0.4);background:rgba(239,68,68,0.12);color:#991b1b;margin-bottom:1rem;';
      form.insertBefore(box, form.firstChild);
    }
    box.innerHTML = '<strong>Error:</strong> ' + escapeHtml(msg);
    box.style.display = '';
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideModalError(form) {
    const box = form.querySelector('.modal-ajax-error');
    if (box) box.style.display = 'none';
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" style="animation:spin 1s linear infinite;width:16px;height:16px;"></i> Guardando…';
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) {
        btn.innerHTML = btn.dataset.originalHtml;
        delete btn.dataset.originalHtml;
      }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function bindAjaxForm(form) {
    if (form.dataset.ajaxModalBound) return;
    form.dataset.ajaxModalBound = '1';

    const modalId = form.dataset.modalId || form.closest('.modal-overlay')?.id;
    const submitBtn = form.querySelector('[type="submit"]');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      hideModalError(form);

      if (submitBtn) setLoading(submitBtn, true);

      try {
        // Soporta multipart (con archivos) y urlencoded
        const hasFile = form.enctype === 'multipart/form-data';
        const bodyData = hasFile ? new FormData(form) : new URLSearchParams(new FormData(form));

        const res = await fetch(form.action, {
          method: form.method.toUpperCase() || 'POST',
          headers: hasFile
            ? { 'X-Requested-With': 'XMLHttpRequest' }
            : {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
              },
          credentials: 'same-origin',
          body: bodyData,
        });

        const json = await res.json();

        if (json.success) {
          if (modalId && window.MascoModal) MascoModal.close(modalId);

          if (typeof Swal !== 'undefined') {
            Swal.fire({
              icon: 'success',
              title: 'Operación exitosa',
              text: json.message || 'Registro guardado correctamente.',
              timer: 2000,
              showConfirmButton: false,
              background: '#1e293b',
              color: '#f8fafc',
            }).then(() => window.location.reload());
          } else {
            window.location.reload();
          }
        } else {
          const errores = json.errors || ['Error desconocido.'];
          showModalError(form, errores[0]);
          if (submitBtn) setLoading(submitBtn, false);
        }
      } catch (err) {
        showModalError(form, 'Error de conexión. Intente nuevamente.');
        if (submitBtn) setLoading(submitBtn, false);
      }
    });
  }

  /**
   * Inicializa todos los formularios con data-ajax-modal="true".
   * Se puede llamar múltiples veces (es idempotente).
   */
  function initAjaxForms() {
    document.querySelectorAll('form[data-ajax-modal="true"]').forEach(bindAjaxForm);
  }

  // Exponer para uso externo
  window.MascoAjaxForm = { init: initAjaxForms, bind: bindAjaxForm };

  document.addEventListener('DOMContentLoaded', initAjaxForms);
})();
