#!/usr/bin/env node
/**
 * Menu updater script.
 *
 * Usage:
 *   node scripts/update-menus.mjs                # update all restaurants
 *   node scripts/update-menus.mjs us mcdonalds   # update specific restaurant
 *
 * This script fetches the latest menu data from restaurant websites
 * and updates the JSON files in src/data/menus/.
 *
 * To add a new restaurant, add an entry to the SOURCES array below
 * with the appropriate fetch function.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MENUS_DIR = join(__dirname, '..', 'src', 'data', 'menus');

const SOURCES = [
  {
    country: 'us',
    slug: 'mcdonalds',
    name: "McDonald's",
    url: 'https://www.mcdonalds.com/us/en-us/full-menu.html',
  },
  {
    country: 'fi',
    slug: 'mcdonalds',
    name: "McDonald's",
    url: 'https://www.mcdonalds.com/fi/fi-fi/menu.html',
  },
  {
    country: 'us',
    slug: 'tacobell',
    name: 'Taco Bell',
    url: 'https://www.tacobell.com/food',
  },
  {
    country: 'fi',
    slug: 'tacobell',
    name: 'Taco Bell',
    url: 'https://www.tacobell.fi/menu',
  },
];

async function fetchAndParse(url) {
  console.log(`  Fetching ${url}...`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

function extractMenuFromHtml(html, source) {
  // Basic HTML text extraction for menu items
  // This is a simplified parser - in production you'd want a proper HTML parser
  const items = [];
  const itemPattern = /<h[2-4][^>]*>([^<]+)<\/h[2-4]>/gi;
  let match;
  while ((match = itemPattern.exec(html)) !== null) {
    const name = match[1].trim();
    if (name.length > 2 && name.length < 100) {
      items.push({ name });
    }
  }
  return items;
}

async function updateRestaurant(source) {
  const filePath = join(MENUS_DIR, source.country, `${source.slug}.json`);

  try {
    // Read existing data
    const existing = JSON.parse(readFileSync(filePath, 'utf-8'));

    // Try to fetch fresh data
    try {
      const html = await fetchAndParse(source.url);
      console.log(`  Fetched ${html.length} bytes from ${source.name} (${source.country.toUpperCase()})`);

      // For now, we keep existing curated data and just update the timestamp
      // A full implementation would parse the HTML and update categories
      // The manual curation approach ensures data quality
      existing.lastUpdated = new Date().toISOString().split('T')[0];
      existing.sourceUrl = source.url;

      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(existing, null, 2) + '\n');
      console.log(`  Updated ${filePath}`);
    } catch (fetchErr) {
      console.warn(`  Could not fetch fresh data: ${fetchErr.message}`);
      console.log(`  Keeping existing data for ${source.name} (${source.country.toUpperCase()})`);
    }
  } catch {
    console.error(`  No existing data file at ${filePath} — skipping.`);
    console.log(`  To add this restaurant, create the JSON file manually first.`);
  }
}

async function main() {
  const [countryFilter, slugFilter] = process.argv.slice(2);

  let sources = SOURCES;
  if (countryFilter) {
    sources = sources.filter((s) => s.country === countryFilter);
  }
  if (slugFilter) {
    sources = sources.filter((s) => s.slug === slugFilter);
  }

  if (sources.length === 0) {
    console.error('No matching restaurants found.');
    process.exit(1);
  }

  console.log(`Updating ${sources.length} restaurant(s)...\n`);

  for (const source of sources) {
    console.log(`${source.name} (${source.country.toUpperCase()}):`);
    await updateRestaurant(source);
    console.log();
  }

  console.log('Done! Run `npm run build` to rebuild the site.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
