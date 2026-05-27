(function () {
  'use strict';

  /**
   * Autocomplete — Buscador predictivo para inputs de texto.
   * Reemplaza selects tradicionales por búsqueda en tiempo real.
   *
   * Uso:
   *   new Autocomplete(inputElement, {
   *     fetchUrl: '/api/mascotas/search',
   *     hiddenInput: document.getElementById('idMascota'),
   *     minChars: 2,
   *     renderItem: (item) => `${item.nombre} — ${item.cliente.nombreCompleto}`,
   *     onSelect: (item) => { ... },
   *   });
   */
  class Autocomplete {
    constructor(input, opts) {
      this.input = input;
      this.fetchUrl = opts.fetchUrl;
      this.hiddenInput = opts.hiddenInput;
      this.minChars = opts.minChars || 2;
      this.renderItem = opts.renderItem || ((item) => item.nombre || item.label || '');
      this.onSelect = opts.onSelect || null;
      this.selectedValue = null;
      this._index = -1;

      this._build();
      this._bind();
    }

    _build() {
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'autocomplete-wrapper';
      this.wrapper.style.cssText = 'position:relative; flex:1;';

      this.input.parentNode.insertBefore(this.wrapper, this.input);
      this.wrapper.appendChild(this.input);

      this.dropdown = document.createElement('div');
      this.dropdown.className = 'autocomplete-dropdown';
      this.dropdown.style.cssText =
        'display:none; position:absolute; top:100%; left:0; right:0; z-index:9999; ' +
        'background:#1e293b; border:1px solid #334155; border-radius:0.5rem; ' +
        'margin-top:2px; max-height:240px; overflow-y:auto; box-shadow:0 8px 24px rgba(0,0,0,0.4);';
      this.wrapper.appendChild(this.dropdown);
    }

    _bind() {
      const debounceMs = 300;
      let timer;

      this.input.setAttribute('autocomplete', 'off');

      this.input.addEventListener('input', () => {
        clearTimeout(timer);
        const q = this.input.value.trim();
        if (this.hiddenInput) {
          this.hiddenInput.value = '';
        }
        this.selectedValue = null;

        if (q.length < this.minChars) {
          this._hide();
          return;
        }

        timer = setTimeout(() => this._search(q), debounceMs);
      });

      this.input.addEventListener('focus', () => {
        const q = this.input.value.trim();
        if (q.length >= this.minChars) {
          this._search(q);
        } else {
          // Si hay pocos caracteres, mostrar resultados con lo que haya
          this._search(q);
        }
      });

      this.input.addEventListener('keydown', (e) => {
        const items = this.dropdown.querySelectorAll('.autocomplete-item');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this._index = Math.min(this._index + 1, items.length - 1);
          this._highlight(items);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this._index = Math.max(this._index - 1, 0);
          this._highlight(items);
        } else if (e.key === 'Enter') {
          if (this._index >= 0 && items[this._index]) {
            e.preventDefault();
            items[this._index].click();
          }
        } else if (e.key === 'Escape') {
          this._hide();
        }
      });

      document.addEventListener('click', (e) => {
        if (!this.wrapper.contains(e.target)) {
          this._hide();
        }
      });
    }

    async _search(q) {
      try {
        const res = await fetch(`${this.fetchUrl}?q=${encodeURIComponent(q)}`, {
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          credentials: 'same-origin',
        });
        const json = await res.json();
        if (json.success) {
          this._render(json.data);
        }
      } catch (err) {
        console.error('Autocomplete error:', err);
      }
    }

    _render(items) {
      this.dropdown.innerHTML = '';
      this._index = -1;

      if (items.length === 0) {
        this.dropdown.innerHTML =
          '<div class="autocomplete-empty" style="padding:0.7rem 1rem; color:#94a3b8; font-size:0.875rem;">Sin resultados</div>';
        this._show();
        return;
      }

      items.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'autocomplete-item';
        div.style.cssText =
          'padding:0.6rem 1rem; cursor:pointer; font-size:0.875rem; color:#e2e8f0; ' +
          'border-bottom:1px solid #1e293b; transition:background 0.12s;';
        div.innerHTML = this.renderItem(item);
        div.addEventListener('click', () => {
          if (this.hiddenInput) {
            this.hiddenInput.value = item.id;
          }
          this.input.value = div.textContent.trim();
          this.selectedValue = item.id;
          this._hide();
          if (typeof this.onSelect === 'function') {
            this.onSelect(item);
          }
        });
        div.addEventListener('mouseenter', () => {
          div.style.background = '#1e3a5f';
        });
        div.addEventListener('mouseleave', () => {
          div.style.background = 'transparent';
        });
        this.dropdown.appendChild(div);
      });

      this._show();
    }

    _highlight(items) {
      items.forEach((el, i) => {
        el.style.background = i === this._index ? '#1e3a5f' : 'transparent';
        if (i === this._index) {
          el.scrollIntoView({ block: 'nearest' });
        }
      });
    }

    _show() { this.dropdown.style.display = 'block'; }
    _hide() { this.dropdown.style.display = 'none'; this._index = -1; }

    /** Obtiene el ID seleccionado (o null) */
    getValue() { return this.selectedValue; }

    /** Establece un valor programáticamente */
    setValue(id, label) {
      this.selectedValue = id;
      this.input.value = label;
      if (this.hiddenInput) this.hiddenInput.value = id;
    }

    /** Destruye el componente */
    destroy() {
      this.input.removeAttribute('autocomplete');
      if (this.wrapper.parentNode) {
        this.wrapper.parentNode.insertBefore(this.input, this.wrapper);
        this.wrapper.remove();
      }
    }
  }

  window.MascoAutocomplete = Autocomplete;
})();
