/**
 * Elimina <div class="app-wrapper"> duplicados en vistas (el wrapper vive en sidebar.ejs).
 */
const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '../src/views');

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, files);
    else if (name.endsWith('.ejs') && !p.includes('partials')) files.push(p);
  }
  return files;
}

const OPEN = /<div class="app-wrapper">\r?\n/g;
const CLOSE_BEFORE_FOOTER = /\r?\n<\/div>\r?\n(?=\s*<script|<%- include\([^)]*footer)/g;

let changed = 0;
for (const file of walk(viewsDir)) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('app-wrapper')) continue;

  const original = src;
  src = src.replace(OPEN, '');

  // Cierra app-wrapper huérfano antes de footer o script final
  if (src.includes("include('../partials/footer") || src.includes('include("partials/footer') || src.includes("include('partials/footer")) {
    src = src.replace(CLOSE_BEFORE_FOOTER, '\n');
  }

  // </div> suelto después del footer (dashboard, especies, etc.)
  src = src.replace(/<%- include\([^)]*footer[^)]*\) %>\s*\n<\/div>\s*$/m, (m) => m.replace(/\n<\/div>\s*$/, '\n'));

  if (src !== original) {
    fs.writeFileSync(file, src, 'utf8');
    console.log('Fixed:', path.relative(viewsDir, file));
    changed++;
  }
}

console.log(`\n${changed} archivo(s) actualizado(s).`);
