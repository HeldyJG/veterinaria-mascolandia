function initPuntoVenta(config) {
  const suffix = config.suffix || '';
  const carrito = [];
  let debounceTimer = null;
  let ultimosResultados = [];

  const elBusqueda = document.getElementById('busqueda-producto' + suffix);
  const elResultados = document.getElementById('resultados-productos' + suffix);
  const elTbody = document.getElementById('carrito-body' + suffix);
  const elTotal = document.getElementById('total-venta' + suffix);
  const elProductosJson = document.getElementById('productos-json' + suffix);
  const elTipoComprobante = document.getElementById('tipoComprobante' + suffix);
  const elClienteGroup = document.getElementById('cliente-group' + suffix);
  const elIdCliente = document.getElementById('idCliente' + suffix);
  const elFormVenta = document.getElementById(config.formId);

  if (!elBusqueda || !elFormVenta) return;

  function formatoMoneda(valor) {
    return 'S/. ' + parseFloat(valor).toFixed(2);
  }

  function actualizarClienteRequerido() {
    const esFactura = elTipoComprobante.value === 'FACTURA';
    if (elClienteGroup) elClienteGroup.style.display = 'block';
    if (elIdCliente) elIdCliente.required = esFactura;
  }

  function sincronizarProductosJson() {
    elProductosJson.value = JSON.stringify(
      carrito.map((item) => ({
        idProducto: item.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioVenta,
      }))
    );
  }

  function renderCarrito() {
    elTbody.innerHTML = '';

    if (carrito.length === 0) {
      elTbody.innerHTML =
        '<tr><td colspan="5" class="text-center text-muted">Agregue productos desde la búsqueda</td></tr>';
      elTotal.textContent = formatoMoneda(0);
      sincronizarProductosJson();
      return;
    }

    let total = 0;

    carrito.forEach((item, index) => {
      const subtotal = item.precioVenta * item.cantidad;
      total += subtotal;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="fw-semibold">${item.nombre}</div>
          <small class="text-muted">${item.codigoBarras || 'Sin código'}</small>
        </td>
        <td class="text-end">${formatoMoneda(item.precioVenta)}</td>
        <td class="text-center" style="white-space: nowrap;">
          <button type="button" class="btn btn-sm btn-outline btn-qty" data-action="menos" data-index="${index}">−</button>
          <span style="display:inline-block; min-width: 2rem; text-align:center;">${item.cantidad}</span>
          <button type="button" class="btn btn-sm btn-outline btn-qty" data-action="mas" data-index="${index}">+</button>
        </td>
        <td class="text-end fw-semibold">${formatoMoneda(subtotal)}</td>
        <td class="text-center">
          <button type="button" class="btn btn-sm btn-danger btn-quitar" data-index="${index}">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      `;
      elTbody.appendChild(tr);
    });

    elTotal.textContent = formatoMoneda(total);
    sincronizarProductosJson();

    if (window.lucide) lucide.createIcons();
  }

  function agregarProducto(producto) {
    const existente = carrito.find((p) => p.id === producto.id);

    if (existente) {
      if (existente.cantidad >= producto.stockActual) {
        Swal.fire({
          icon: 'warning',
          title: 'Stock insuficiente',
          text: `Solo hay ${producto.stockActual} unidad(es) de "${producto.nombre}".`,
          background: '#1e293b',
          color: '#f8fafc',
          confirmButtonColor: '#6366f1',
        });
        return;
      }
      existente.cantidad += 1;
    } else {
      if (producto.stockActual < 1) {
        Swal.fire({
          icon: 'warning',
          title: 'Sin stock',
          text: `"${producto.nombre}" no tiene stock.`,
          background: '#1e293b',
          color: '#f8fafc',
          confirmButtonColor: '#6366f1',
        });
        return;
      }
      carrito.push({
        id: producto.id,
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        precioVenta: parseFloat(producto.precioVenta),
        stockActual: parseInt(producto.stockActual, 10),
        cantidad: 1,
      });
    }

    renderCarrito();
    elBusqueda.value = '';
    elResultados.innerHTML = '';
    elBusqueda.focus();
  }

  async function buscarProductos(q) {
    if (!q || q.length < 2) {
      elResultados.innerHTML = '';
      return;
    }

    try {
      const res = await fetch(`/api/productos/buscar?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!data.success || !data.data.length) {
        elResultados.innerHTML = '<div class="pos-result-empty">No se encontraron productos</div>';
        return;
      }

      ultimosResultados = data.data;
      elResultados.innerHTML = ultimosResultados
        .map(
          (p, index) => `
        <button type="button" class="pos-result-item" data-index="${index}">
          <div>
            <strong>${p.nombre}</strong>
            <small>${p.codigoBarras || 'Sin código'} · Stock: ${p.stockActual}</small>
          </div>
          <span>${formatoMoneda(p.precioVenta)}</span>
        </button>
      `
        )
        .join('');
    } catch (err) {
      console.error(err);
      elResultados.innerHTML = '<div class="pos-result-empty text-danger">Error al buscar</div>';
    }
  }

  elBusqueda.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => buscarProductos(elBusqueda.value.trim()), 300);
  });

  elResultados.addEventListener('click', (e) => {
    const btn = e.target.closest('.pos-result-item');
    if (!btn) return;
    const producto = ultimosResultados[parseInt(btn.dataset.index, 10)];
    if (producto) agregarProducto(producto);
  });

  elTbody.addEventListener('click', (e) => {
    const btnQty = e.target.closest('.btn-qty');
    const btnQuitar = e.target.closest('.btn-quitar');

    if (btnQty) {
      const index = parseInt(btnQty.dataset.index, 10);
      const item = carrito[index];
      if (btnQty.dataset.action === 'mas') {
        if (item.cantidad >= item.stockActual) {
          Swal.fire({
            icon: 'warning',
            title: 'Stock insuficiente',
            text: `Máximo: ${item.stockActual}`,
            background: '#1e293b',
            color: '#f8fafc',
            confirmButtonColor: '#6366f1',
          });
          return;
        }
        item.cantidad += 1;
      } else if (item.cantidad > 1) {
        item.cantidad -= 1;
      }
      renderCarrito();
    }

    if (btnQuitar) {
      carrito.splice(parseInt(btnQuitar.dataset.index, 10), 1);
      renderCarrito();
    }
  });

  elTipoComprobante.addEventListener('change', actualizarClienteRequerido);

  elFormVenta.addEventListener('submit', (e) => {
    if (carrito.length === 0) {
      e.preventDefault();
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'Agregue al menos un producto.',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#6366f1',
      });
      return;
    }

    if (elTipoComprobante.value === 'FACTURA' && !elIdCliente.value) {
      e.preventDefault();
      Swal.fire({
        icon: 'warning',
        title: 'Cliente requerido',
        text: 'Seleccione un cliente para FACTURA.',
        background: '#1e293b',
        color: '#f8fafc',
        confirmButtonColor: '#6366f1',
      });
    }
  });

  actualizarClienteRequerido();
  renderCarrito();
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('form-venta')) {
    initPuntoVenta({ formId: 'form-venta', suffix: '' });
  }
  if (document.getElementById('form-venta-modal')) {
    initPuntoVenta({ formId: 'form-venta-modal', suffix: '-modal' });
  }
});
