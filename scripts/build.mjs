#!/usr/bin/env node
/**
 * Static site generator for AllMenus.
 * Reads menu JSON files and generates HTML pages into dist/.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MENUS_DIR = join(ROOT, 'src', 'data', 'menus');
const DIST = join(ROOT, 'dist');
const PUBLIC = join(ROOT, 'public');

const countries = [
  { code: 'us', name: 'United States', flag: '🇺🇸' },
  { code: 'fi', name: 'Finland', flag: '🇫🇮' },
];

// Load all menu data
function loadMenus() {
  const menus = [];
  for (const country of countries) {
    const dir = join(MENUS_DIR, country.code);
    let files;
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    } catch {
      continue;
    }
    for (const file of files) {
      const data = JSON.parse(readFileSync(join(dir, file), 'utf-8'));
      menus.push(data);
    }
  }
  return menus;
}

// HTML template helpers
function layout(title, description, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${esc(description)}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <title>${esc(title)} | AllMenus</title>
  <style>${css()}</style>
</head>
<body>
  <nav class="nav">
    <div class="container nav-inner">
      <a href="/" class="logo">AllMenus</a>
      <span class="tagline">Menus without borders</span>
    </div>
  </nav>
  <main class="container">${content}</main>
  <footer class="footer">AllMenus — browse chain restaurant menus from anywhere.</footer>
</body>
</html>`;
}

function css() {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f9fafb;color:#111827;min-height:100vh;line-height:1.5}
.container{max-width:800px;margin:0 auto;padding:0 1rem}
.nav{background:#fff;border-bottom:1px solid #e5e7eb;padding:.75rem 1rem}
.nav-inner{display:flex;align-items:center;justify-content:space-between}
.logo{font-size:1.25rem;font-weight:700;color:#ea580c;text-decoration:none}
.tagline{font-size:.875rem;color:#9ca3af}
.footer{border-top:1px solid #e5e7eb;margin-top:4rem;padding:1.5rem;text-align:center;font-size:.875rem;color:#9ca3af}
main{padding:2rem 1rem}
h1{font-size:2rem;font-weight:700;margin-bottom:.75rem}
h2{font-size:1.25rem;font-weight:600;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:1px solid #e5e7eb}
.hero{text-align:center;margin-bottom:3rem}
.hero p{font-size:1.125rem;color:#6b7280;max-width:36rem;margin:0 auto}
.grid{display:grid;gap:1.5rem}
@media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
.card{background:#fff;border-radius:.75rem;border:1px solid #e5e7eb;padding:1.25rem;text-decoration:none;color:inherit;transition:border-color .15s,box-shadow .15s}
a.card:hover{border-color:#fdba74;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.card h3{font-size:1.125rem;font-weight:600}
.card .meta{font-size:.875rem;color:#9ca3af;margin-top:.25rem}
.breadcrumb{font-size:.875rem;color:#9ca3af;margin-bottom:1.5rem}
.breadcrumb a{color:#9ca3af;text-decoration:none}
.breadcrumb a:hover{color:#ea580c}
.header-row{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.5rem;margin-bottom:2rem}
.header-row .meta{font-size:.875rem;color:#9ca3af}
.pills{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:2rem}
.pill{font-size:.8125rem;background:#fff7ed;color:#c2410c;padding:.25rem .75rem;border-radius:9999px;text-decoration:none;transition:background .15s}
.pill:hover{background:#ffedd5}
.category{margin-bottom:2rem}
.items{display:grid;gap:.5rem}
@media(min-width:640px){.items{grid-template-columns:1fr 1fr}}
.item{background:#fff;border:1px solid #f3f4f6;border-radius:.5rem;padding:.75rem 1rem}
.item .name{font-weight:500}
.item .desc{font-size:.875rem;color:#6b7280;margin-top:.125rem}
.item .price{font-size:.875rem;color:#ea580c;font-weight:500}
.source{margin-top:3rem;padding-top:1rem;border-top:1px solid #f3f4f6;font-size:.75rem;color:#9ca3af}
.source a{color:#9ca3af;text-decoration:underline}
.source a:hover{color:#6b7280}
ul.restaurant-list{list-style:none;padding:0}
ul.restaurant-list li{margin-bottom:.5rem}
ul.restaurant-list a{color:#ea580c;text-decoration:none;font-weight:500}
ul.restaurant-list a:hover{text-decoration:underline}
ul.restaurant-list .count{font-size:.875rem;color:#9ca3af;margin-left:.5rem}
.note{font-size:.875rem;color:#6b7280;background:#f3f4f6;border-radius:.5rem;padding:.75rem 1rem;margin-bottom:1.5rem}
`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Page generators
function buildHomePage(menus) {
  let content = `<div class="hero"><h1>AllMenus</h1><p>Browse chain restaurant menus from anywhere in the world. No geo-blocks, no VPN needed.</p></div>`;
  content += `<div class="grid">`;
  for (const country of countries) {
    const countryMenus = menus.filter((m) => m.country === country.code);
    let list = countryMenus
      .map((r) => {
        const count = r.categories.reduce((s, c) => s + c.items.length, 0);
        return `<li><a href="/${country.code}/${r.slug}">${esc(r.name)}</a><span class="count">${count} items</span></li>`;
      })
      .join('');
    content += `<div class="card"><h3><a href="/${country.code}" style="color:inherit;text-decoration:none">${country.flag} ${esc(country.name)}</a></h3><ul class="restaurant-list">${list}</ul></div>`;
  }
  content += `</div>`;
  return layout('Home', 'Browse chain restaurant menus from anywhere in the world.', content);
}

function buildCountryPage(country, menus) {
  const countryMenus = menus.filter((m) => m.country === country.code);
  let content = `<div class="breadcrumb"><a href="/">Home</a> › ${country.flag} ${esc(country.name)}</div>`;
  content += `<h1>${country.flag} ${esc(country.name)}</h1>`;
  content += `<div class="grid" style="margin-top:1.5rem">`;
  for (const r of countryMenus) {
    const count = r.categories.reduce((s, c) => s + c.items.length, 0);
    content += `<a class="card" href="/${country.code}/${r.slug}"><h3>${esc(r.name)}</h3><p class="meta">${r.categories.length} categories · ${count} items</p><p class="meta">Updated ${esc(r.lastUpdated)}</p></a>`;
  }
  content += `</div>`;
  return layout(country.name, `Restaurant menus in ${country.name}`, content);
}

function buildRestaurantPage(r) {
  const country = countries.find((c) => c.code === r.country);
  const totalItems = r.categories.reduce((s, c) => s + c.items.length, 0);

  let content = `<div class="breadcrumb"><a href="/">Home</a> › <a href="/${r.country}">${country.flag} ${esc(country.name)}</a> › ${esc(r.name)}</div>`;
  content += `<div class="header-row"><h1>${esc(r.name)}</h1><span class="meta">${country.flag} ${esc(country.name)} · Updated ${esc(r.lastUpdated)}</span></div>`;

  if (r.note) {
    content += `<div class="note">${esc(r.note)}</div>`;
  }

  // Category pills
  content += `<div class="pills">`;
  for (const cat of r.categories) {
    content += `<a class="pill" href="#${slugify(cat.name)}">${esc(cat.name)}</a>`;
  }
  content += `</div>`;

  // Categories
  for (const cat of r.categories) {
    content += `<section class="category" id="${slugify(cat.name)}"><h2>${esc(cat.name)}</h2><div class="items">`;
    for (const item of cat.items) {
      content += `<div class="item"><span class="name">${esc(item.name)}</span>`;
      if (item.description) content += `<p class="desc">${esc(item.description)}</p>`;
      if (item.price) content += ` <span class="price">${esc(item.price)}</span>`;
      content += `</div>`;
    }
    content += `</div></section>`;
  }

  content += `<div class="source"><p>Source: <a href="${esc(r.sourceUrl)}" target="_blank" rel="noopener">${esc(r.sourceUrl)}</a></p><p>Menu data last fetched on ${esc(r.lastUpdated)}. Actual menu may vary by location.</p></div>`;

  return layout(
    `${r.name} – ${country.name}`,
    `${r.name} menu in ${country.name}. ${totalItems} items across ${r.categories.length} categories.`,
    content
  );
}

// Main
function build() {
  const menus = loadMenus();
  console.log(`Loaded ${menus.length} restaurant menus`);

  // Clean and create dist
  mkdirSync(DIST, { recursive: true });

  // Copy public files
  cpSync(PUBLIC, DIST, { recursive: true });

  // Home page
  write(join(DIST, 'index.html'), buildHomePage(menus));

  // Country pages
  for (const country of countries) {
    const dir = join(DIST, country.code);
    mkdirSync(dir, { recursive: true });
    write(join(dir, 'index.html'), buildCountryPage(country, menus));
  }

  // Restaurant pages
  for (const r of menus) {
    const dir = join(DIST, r.country, r.slug);
    mkdirSync(dir, { recursive: true });
    write(join(dir, 'index.html'), buildRestaurantPage(r));
  }

  console.log('Build complete! Output in dist/');
}

function write(path, content) {
  writeFileSync(path, content);
  console.log(`  ${path.replace(DIST, 'dist')}`);
}

build();
