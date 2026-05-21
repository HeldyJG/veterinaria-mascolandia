/**
 * Tema claro / oscuro — Mascolandia
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'mascolandia-theme';
  const THEMES = ['dark', 'light'];

  function getStoredTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(saved) ? saved : 'dark';
  }

  function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function applyTheme(theme, persist) {
    const next = THEMES.includes(theme) ? theme : 'dark';
    document.documentElement.classList.add('theme-switching');
    document.documentElement.setAttribute('data-theme', next);
    window.setTimeout(() => document.documentElement.classList.remove('theme-switching'), 280);
    if (persist !== false) {
      localStorage.setItem(STORAGE_KEY, next);
    }
    syncThemeToggleUi();
    patchSwalDefaults();
    document.dispatchEvent(new CustomEvent('mascolandia-theme-change', { detail: { theme: next } }));
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }

  function syncThemeToggleUi() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    const isLight = theme === 'light';

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      const icon = btn.querySelector('[data-theme-icon]');
      const label = btn.querySelector('[data-theme-label]');
      btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
      btn.setAttribute('title', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
      btn.setAttribute('aria-label', isLight ? 'Activar modo oscuro' : 'Activar modo claro');
      if (icon) {
        icon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
      }
      if (label) {
        label.textContent = isLight ? 'Oscuro' : 'Claro';
      }
    });
  }

  function patchSwalDefaults() {
    if (typeof Swal === 'undefined') return;
    const bg = getCssVar('--bg-card') || '#1e293b';
    const color = getCssVar('--text-main') || '#f8fafc';
    const oldFire = Swal.fire;
    if (oldFire._mascoPatched) return;

    Swal.fire = function (options) {
      if (options && typeof options === 'object' && !Array.isArray(options)) {
        if (!options.background) options.background = bg;
        if (!options.color) options.color = color;
      }
      return oldFire.call(this, options);
    };
    Swal.fire._mascoPatched = true;
  }

  function chartPalette() {
    return {
      text: getCssVar('--chart-tick') || '#94a3b8',
      grid: getCssVar('--chart-grid') || 'rgba(255,255,255,0.05)',
      border: getCssVar('--bg-card') || '#1e293b',
    };
  }

  function initThemeToggleButtons() {
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = '1';
      btn.addEventListener('click', toggleTheme);
    });
    syncThemeToggleUi();
  }

  window.MascoTheme = {
    get: getStoredTheme,
    apply: applyTheme,
    toggle: toggleTheme,
    chartPalette,
  };

  applyTheme(getStoredTheme(), false);

  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggleButtons();
    patchSwalDefaults();
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  });
})();
