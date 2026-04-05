/**
 * migrate-images.mjs
 *
 * Migrates all images from Supabase Storage → Cloudinary.
 * Cloudinary fetches each image directly from the Supabase URL — no manual re-uploading.
 * After a successful upload, the DB record is updated and the file is deleted from Supabase.
 *
 * Setup:
 *   1. npm install cloudinary @supabase/supabase-js   (in this project root)
 *   2. Fill in the four config values below (or pass as env vars)
 *   3. node scripts/migrate-images.mjs
 *
 * Config values needed:
 *   SUPABASE_SERVICE_ROLE_KEY  — found in Supabase Dashboard → Project Settings → API → service_role key
 *   CLOUDINARY_CLOUD_NAME      — found in Cloudinary Dashboard → top-left cloud name
 *   CLOUDINARY_API_KEY         — Cloudinary Dashboard → Settings → API Keys
 *   CLOUDINARY_API_SECRET      — same place as API key
 */

import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load .env.local from project root
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, '../.env.local');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (key && val && !process.env[key]) process.env[key] = val;
  }
} catch { /* .env.local not found — fall back to real env vars */ }

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://jkmailknqmyadldmryhv.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const CLOUDINARY_CLOUD_NAME     = process.env.CLOUDINARY_CLOUD_NAME     ?? '';
const CLOUDINARY_API_KEY        = process.env.CLOUDINARY_API_KEY        ?? '';
const CLOUDINARY_API_SECRET     = process.env.CLOUDINARY_API_SECRET     ?? '';
// ──────────────────────────────────────────────────────────────────────────────

if (!SUPABASE_SERVICE_ROLE_KEY || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('ERROR: Missing required config. Set the four env vars or edit the CONFIG section at the top of this script.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key:    CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure:     true,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

let totalMigrated = 0;
let totalFailed   = 0;
let totalSkipped  = 0;

/** Extracts { bucket, path } from a Supabase storage URL. Returns null if not a Supabase URL. */
function parseSupabaseUrl(url) {
  if (!url) return null;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

/** Uploads a URL to Cloudinary (Cloudinary fetches the file itself) and returns the new URL. */
async function uploadToCloudinary(sourceUrl, folder) {
  try {
    const result = await cloudinary.uploader.upload(sourceUrl, {
      folder:        `opossum/${folder}`,
      resource_type: 'image',
      // Preserve the original filename as the public_id where possible
      use_filename:       true,
      unique_filename:    true,
      overwrite:          false,
    });
    return result.secure_url;
  } catch (err) {
    console.error(`    ✗ Cloudinary upload failed: ${err.message}`);
    return null;
  }
}

/** Deletes a file from Supabase Storage. */
async function deleteFromSupabase(url) {
  const parsed = parseSupabaseUrl(url);
  if (!parsed) return;
  const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
  if (error) {
    console.error(`    ✗ Failed to delete from Supabase (${parsed.bucket}/${parsed.path}): ${error.message}`);
  }
}

/**
 * Migrates a single image URL.
 * Returns the new Cloudinary URL on success, null on failure, or the original URL if already migrated.
 */
async function migrateOne(url, folder) {
  if (!url) return url;

  // Already on Cloudinary — skip
  if (url.includes('cloudinary.com')) {
    totalSkipped++;
    return url;
  }

  // Not a Supabase URL — skip
  if (!url.includes('supabase.co')) {
    totalSkipped++;
    return url;
  }

  process.stdout.write(`    → ${url.split('/').pop()} ... `);
  const newUrl = await uploadToCloudinary(url, folder);
  if (!newUrl) {
    console.log('FAILED');
    totalFailed++;
    return null;
  }

  console.log('✓');
  await deleteFromSupabase(url);
  totalMigrated++;
  return newUrl;
}

// ─── TABLE MIGRATIONS ─────────────────────────────────────────────────────────

async function migrateProductImages() {
  console.log('\n[product_images]');
  const { data, error } = await supabase.from('product_images').select('id, image_url');
  if (error) { console.error('  Query failed:', error.message); return; }
  if (!data?.length) { console.log('  (empty)'); return; }

  for (const row of data) {
    const newUrl = await migrateOne(row.image_url, 'products');
    if (newUrl && newUrl !== row.image_url) {
      const { error: upErr } = await supabase.from('product_images').update({ image_url: newUrl }).eq('id', row.id);
      if (upErr) console.error(`  DB update failed for id=${row.id}: ${upErr.message}`);
    }
  }
}

async function migrateProductVariants() {
  console.log('\n[product_variants]');
  const { data, error } = await supabase.from('product_variants').select('id, image_url').not('image_url', 'is', null);
  if (error) { console.error('  Query failed:', error.message); return; }
  if (!data?.length) { console.log('  (empty)'); return; }

  for (const row of data) {
    const newUrl = await migrateOne(row.image_url, 'products');
    if (newUrl && newUrl !== row.image_url) {
      const { error: upErr } = await supabase.from('product_variants').update({ image_url: newUrl }).eq('id', row.id);
      if (upErr) console.error(`  DB update failed for id=${row.id}: ${upErr.message}`);
    }
  }
}

async function migrateCategories() {
  console.log('\n[categories]');
  const { data, error } = await supabase.from('categories').select('id, image_url').not('image_url', 'is', null);
  if (error) { console.error('  Query failed:', error.message); return; }
  if (!data?.length) { console.log('  (empty)'); return; }

  for (const row of data) {
    const newUrl = await migrateOne(row.image_url, 'categories');
    if (newUrl && newUrl !== row.image_url) {
      const { error: upErr } = await supabase.from('categories').update({ image_url: newUrl }).eq('id', row.id);
      if (upErr) console.error(`  DB update failed for id=${row.id}: ${upErr.message}`);
    }
  }
}

async function migrateBanners() {
  console.log('\n[banner_slides]');
  const { data, error } = await supabase.from('banner_slides').select('id, image_url').not('image_url', 'is', null);
  if (error) { console.error('  Query failed:', error.message); return; }
  if (!data?.length) { console.log('  (empty)'); return; }

  for (const row of data) {
    const newUrl = await migrateOne(row.image_url, 'banners');
    if (newUrl && newUrl !== row.image_url) {
      const { error: upErr } = await supabase.from('banner_slides').update({ image_url: newUrl }).eq('id', row.id);
      if (upErr) console.error(`  DB update failed for id=${row.id}: ${upErr.message}`);
    }
  }
}

async function migrateStoreSettings() {
  console.log('\n[store_settings]');
  const { data, error } = await supabase.from('store_settings').select('id, logo_url, hero_image_url');
  if (error) { console.error('  Query failed:', error.message); return; }
  if (!data?.length) { console.log('  (empty)'); return; }

  for (const row of data) {
    const updates = {};

    const newLogo = await migrateOne(row.logo_url, 'settings');
    if (newLogo && newLogo !== row.logo_url) updates.logo_url = newLogo;

    const newHero = await migrateOne(row.hero_image_url, 'settings');
    if (newHero && newHero !== row.hero_image_url) updates.hero_image_url = newHero;

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabase.from('store_settings').update(updates).eq('id', row.id);
      if (upErr) console.error(`  DB update failed for id=${row.id}: ${upErr.message}`);
    }
  }
}

async function migrateExampleWorks() {
  console.log('\n[example_works]');
  const { data, error } = await supabase.from('example_works').select('id, image_url').not('image_url', 'is', null);
  if (error) { console.error('  Query failed:', error.message); return; }
  if (!data?.length) { console.log('  (empty)'); return; }

  for (const row of data) {
    const newUrl = await migrateOne(row.image_url, 'examples');
    if (newUrl && newUrl !== row.image_url) {
      const { error: upErr } = await supabase.from('example_works').update({ image_url: newUrl }).eq('id', row.id);
      if (upErr) console.error(`  DB update failed for id=${row.id}: ${upErr.message}`);
    }
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Opossum Image Migration: Supabase Storage → Cloudinary ===');
  console.log('Cloudinary fetches each file directly — no manual re-uploading.\n');

  await migrateProductImages();
  await migrateProductVariants();
  await migrateCategories();
  await migrateBanners();
  await migrateStoreSettings();
  await migrateExampleWorks();

  console.log('\n═══════════════════════════════');
  console.log(` Migrated : ${totalMigrated}`);
  console.log(` Failed   : ${totalFailed}`);
  console.log(` Skipped  : ${totalSkipped} (already on Cloudinary or not a storage URL)`);
  console.log('═══════════════════════════════');

  if (totalFailed > 0) {
    console.log('\nSome images failed. Fix the errors above and re-run — already-migrated images will be skipped automatically.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
