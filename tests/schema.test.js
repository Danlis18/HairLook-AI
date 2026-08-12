import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql=fs.readFileSync(new URL('../supabase/migrations/001_hairlook.sql',import.meta.url),'utf8');
test('schema enables RLS and creates private storage buckets',()=>{
 for(const table of ['hair_leads','payments','payment_events','generation_jobs','generation_results','analytics_events','admin_audit_logs']) assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
 assert.match(sql,/\('hair-originals','hair-originals',false/);
 assert.match(sql,/\('hair-results','hair-results',false/);
 assert.match(sql,/for update skip locked/i);
});
