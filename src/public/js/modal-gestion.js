/**
 * Ver / editar registros en modal — Mascolandia
 */
(function () {
  'use strict';

  const SHELL = 'modal-gestion';

  const RUTAS = {
    cliente: 'clientes',
    mascota: 'mascotas',
    cita: 'citas',
    producto: 'productos',
    venta: 'ventas',
  };

  const META = {
    cliente: {
      ver: { title: 'Detalle del cliente', icon: 'user', size: 'modal-lg' },
      editar: { title: 'Editar cliente', icon: 'pencil', size: 'modal-lg' },
    },
    mascota: {
      ver: { title: 'Detalle de la mascota', icon: 'heart', size: 'modal-lg' },
      editar: { title: 'Editar mascota', icon: 'pencil', size: 'modal-lg' },
    },
    cita: {
      ver: { title: 'Detalle de la cita', icon: 'calendar', size: 'modal-lg' },
      editar: { title: 'Editar cita', icon: 'pencil', size: 'modal-lg' },
    },
    producto: {
      ver: { title: 'Detalle del producto', icon: 'package', size: 'modal-lg' },
      editar: { title: 'Editar producto', icon: 'pencil', size: 'modal-lg' },
    },
    venta: {
      ver: { title: 'Detalle de la venta', icon: 'receipt', size: 'modal-xl' },
    },
  };

  function openGestion(tipo, id, vista) {
    const base = RUTAS[tipo];
    const meta = META[tipo] && META[tipo][vista];
    if (!base || !meta || !window.MascoModal) return;
    const url = `/${base}/${id}/modal?vista=${vista}`;
    MascoModal.openLoaded(SHELL, url, meta);
  }

  window.MascoGestion = {
    ver: (tipo, id) => openGestion(tipo, id, 'ver'),
    editar: (tipo, id) => openGestion(tipo, id, 'editar'),
  };

  window.confirmarCancelarCitaModal = function (event, id) {
    event.preventDefault();
    const form = event.target;
    if (typeof Swal === 'undefined') {
      if (confirm('¿Cancelar esta cita?')) form.submit();
      return false;
    }
    Swal.fire({
      title: '¿Cancelar cita?',
      text: `Se cancelará la cita #${id}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'No, volver',
    }).then((result) => {
      if (result.isConfirmed) form.submit();
    });
    return false;
  };

  window.confirmarAnularVentaModal = function () {
    const form = document.getElementById('form-anular-venta-modal');
    if (!form) return;
    if (typeof Swal === 'undefined') {
      if (confirm('¿Anular esta venta? Se restaurará el stock.')) form.submit();
      return;
    }
    Swal.fire({
      title: '¿Anular venta?',
      text: 'Se restaurará el stock de los productos. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) form.submit();
    });
  };
})();
