#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * content-push — sync the LOCAL Supabase content tables into the CLOUD
 * project, atomically.
 *
 *   pnpm content:push        # interactive: shows diff, prompts "PUSH" to confirm
 *   pnpm content:diff        # dry-run: only shows the diff, never writes
 *
 * What it does
 * ============
 * 1. Connects to LOCAL  (default postgresql://postgres:postgres@127.0.0.1:54322)
 * 2. Connects to CLOUD  (CLOUD_DATABASE_URL — see "Setup" below)
 * 3. Shows row counts on both sides + the parcours slugs found locally.
 * 4. Waits for you to type "PUSH" to confirm.
 * 5. In a single CLOUD transaction:
 *      a. TRUNCATE public.parcours CASCADE   (wipes parcours / versions /
 *         variables / chapters / blocks on cloud)
 *      b. Re-inserts every row coming from local, in dependency order
 *         (parcours → version → variable → chapter → block) with a
 *         second pass to wire the self-FKs (next_chapter_id,
 *         cloned_from_*, parent_block_id) and `published_version_id`.
 * 6. ROLLBACK on any failure — cloud stays untouched.
 *
 * Setup
 * =====
 * Export your cloud Postgres connection string ONCE in your shell:
 *
 *   export CLOUD_DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"
 *
 * You find this string in the Supabase dashboard:
 *   Project Settings → Database → Connection string → "URI" tab → "Transaction".
 * The DB password is what you set when creating the project (or
 * resettable in the same screen).
 *
 * Tips
 * ====
 * - It REPLACES, not merges. Anything currently in cloud's parcours/
 *   chapter/block/variable/parcours_version tables is DESTROYED.
 * - Auth users (auth.users) are NOT touched.
 * - Schema (migrations) is NOT touched. Use `supabase db push` for that.
 */

import pg from 'pg';
import readline from 'node:readline/promises';

const LOCAL_DEFAULT = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const LOCAL = process.env.LOCAL_DATABASE_URL || LOCAL_DEFAULT;
const CLOUD = process.env.CLOUD_DATABASE_URL;
const DRY_RUN = process.argv.includes('--dry-run');

function die(msg, code = 1) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(code);
}

if (!CLOUD) {
  die(
    [
      'CLOUD_DATABASE_URL is not set.',
      '',
      'Get it from Supabase dashboard → Project Settings → Database →',
      'Connection string (URI / Transaction pooler), then:',
      '',
      '  export CLOUD_DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres"',
      '',
      'Persist it in ~/.zshrc to avoid retyping each time.',
    ].join('\n'),
  );
}

const TABLES = ['parcours', 'parcours_version', 'variable', 'chapter', 'block'];

async function counts(client) {
  const out = {};
  for (const t of TABLES) {
    const r = await client.query(`select count(*)::int as n from public.${t}`);
    out[t] = r.rows[0].n;
  }
  return out;
}

async function parcoursList(client) {
  const r = await client.query(`
    select p.slug, p.name, p.published_version_id is not null as has_pub
      from public.parcours p
      order by p.slug
  `);
  return r.rows;
}

function fmtCounts(c) {
  return TABLES.map((t) => `${t}=${c[t]}`).join('  ');
}

async function main() {
  const local = new pg.Client({ connectionString: LOCAL });
  const cloud = new pg.Client({ connectionString: CLOUD });

  console.log('Connecting…');
  await local.connect().catch((e) => die(`LOCAL connection failed: ${e.message}\n(Is \`pnpm supabase:start\` running?)`));
  await cloud.connect().catch((e) => die(`CLOUD connection failed: ${e.message}\n(Check CLOUD_DATABASE_URL — DB password may be wrong.)`));

  const [localC, cloudC, localP, cloudP] = await Promise.all([
    counts(local),
    counts(cloud),
    parcoursList(local),
    parcoursList(cloud),
  ]);

  console.log('\n┌── LOCAL  (source)');
  console.log(`│  ${fmtCounts(localC)}`);
  for (const p of localP) console.log(`│  • ${p.slug}  — ${p.name}  ${p.has_pub ? '(published)' : '(no published)'}`);
  console.log('│');
  console.log('└── CLOUD  (target — will be REPLACED)');
  console.log(`   ${fmtCounts(cloudC)}`);
  for (const p of cloudP) console.log(`   • ${p.slug}  — ${p.name}  ${p.has_pub ? '(published)' : '(no published)'}`);

  if (DRY_RUN) {
    console.log('\n[dry-run] No changes made. Use `pnpm content:push` to actually push.');
    await local.end();
    await cloud.end();
    return;
  }

  if (localC.parcours === 0) {
    die('LOCAL has no parcours — refuse to wipe cloud with empty content.');
  }

  console.log('\n⚠️  This will TRUNCATE public.parcours CASCADE on CLOUD, then re-insert from LOCAL.');
  console.log('   Auth users and schema migrations are NOT touched.');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ans = await rl.question('\nType exactly "PUSH" to confirm: ');
  rl.close();
  if (ans.trim() !== 'PUSH') {
    console.log('Cancelled.');
    await local.end();
    await cloud.end();
    return;
  }

  // ---- snapshot local rows -------------------------------------------
  console.log('\nReading local rows…');
  const localRows = {};
  for (const t of TABLES) {
    localRows[t] = (await local.query(`select * from public.${t}`)).rows;
  }
  console.log(`Got ${TABLES.map((t) => `${t}=${localRows[t].length}`).join(' ')}`);

  // ---- push in transaction -------------------------------------------
  console.log('\nPushing to cloud (transaction)…');
  await cloud.query('begin');
  try {
    await cloud.query('truncate public.parcours cascade');

    // 1. parcours (NULL published_version_id, FK fixed at the end)
    for (const p of localRows.parcours) {
      await cloud.query(
        `insert into public.parcours (id, slug, name, published_version_id, created_at, updated_at)
         values ($1,$2,$3,null,$4,$5)`,
        [p.id, p.slug, p.name, p.created_at, p.updated_at],
      );
    }

    // 2. parcours_version
    for (const v of localRows.parcours_version) {
      await cloud.query(
        `insert into public.parcours_version (id, parcours_id, version_number, status, created_at)
         values ($1,$2,$3,$4,$5)`,
        [v.id, v.parcours_id, v.version_number, v.status, v.created_at],
      );
    }

    // 3. variable
    for (const v of localRows.variable) {
      await cloud.query(
        `insert into public.variable (id, parcours_id, key, label, type, options, created_at, hubspot_mapping)
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [v.id, v.parcours_id, v.key, v.label, v.type, v.options == null ? null : JSON.stringify(v.options), v.created_at, v.hubspot_mapping == null ? null : JSON.stringify(v.hubspot_mapping)],
      );
    }

    // 4. chapter — self-FKs (next_chapter_id, cloned_from_chapter_id) deferred
    for (const c of localRows.chapter) {
      await cloud.query(
        `insert into public.chapter
           (id, version_id, slug, title, "order", next_chapter_id, branching_next, wrapper_class, cloned_from_chapter_id, created_at, updated_at)
         values ($1,$2,$3,$4,$5,null,$6,$7,null,$8,$9)`,
        [c.id, c.version_id, c.slug, c.title, c.order, c.branching_next, c.wrapper_class, c.created_at, c.updated_at],
      );
    }
    // Second pass: wire chapter self-FKs.
    for (const c of localRows.chapter) {
      if (c.next_chapter_id || c.cloned_from_chapter_id) {
        await cloud.query(
          `update public.chapter set next_chapter_id = $1, cloned_from_chapter_id = $2 where id = $3`,
          [c.next_chapter_id, c.cloned_from_chapter_id, c.id],
        );
      }
    }

    // 5. block — self-FKs (parent_block_id, cloned_from_block_id) deferred
    for (const b of localRows.block) {
      await cloud.query(
        `insert into public.block
           (id, chapter_id, parent_block_id, "order", type, payload, cloned_from_block_id, created_at, updated_at)
         values ($1,$2,null,$3,$4,$5,null,$6,$7)`,
        [b.id, b.chapter_id, b.order, b.type, b.payload == null ? null : JSON.stringify(b.payload), b.created_at, b.updated_at],
      );
    }
    // Second pass: wire block self-FKs.
    for (const b of localRows.block) {
      if (b.parent_block_id || b.cloned_from_block_id) {
        await cloud.query(
          `update public.block set parent_block_id = $1, cloned_from_block_id = $2 where id = $3`,
          [b.parent_block_id, b.cloned_from_block_id, b.id],
        );
      }
    }

    // 6. Update parcours.published_version_id
    for (const p of localRows.parcours) {
      if (p.published_version_id) {
        await cloud.query(
          `update public.parcours set published_version_id = $1 where id = $2`,
          [p.published_version_id, p.id],
        );
      }
    }

    await cloud.query('commit');

    const after = await counts(cloud);
    console.log(`\n✅ Done. Cloud now:  ${fmtCounts(after)}`);
  } catch (e) {
    await cloud.query('rollback').catch(() => {});
    die(`Transaction failed: ${e.message}\nCloud was rolled back, no changes applied.`);
  } finally {
    await local.end();
    await cloud.end();
  }
}

main().catch((e) => die(e?.stack ?? String(e)));
