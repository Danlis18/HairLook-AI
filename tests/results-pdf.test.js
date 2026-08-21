import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { buildResultsPdf } from '../src/lib/resultsPdf.js';

test('builds a valid personalized PDF collection with a cover and result pages',async()=>{
  const image=await fs.readFile(new URL('../public/media/style-portrait-1.jpg',import.meta.url));
  const results=[
    {id:'one',style_name:'Classic Textured Pixie',category:'Short Transformations',sort_order:1,storage_path:'one.jpg'},
    {id:'two',style_name:'Long Butterfly Layers',category:'Long Collection',sort_order:2,storage_path:'two.jpg'}
  ];
  const pdf=await buildResultsPdf({results,locale:'en',loadImage:async()=>image});
  assert.equal(pdf.subarray(0,8).toString(),'%PDF-1.4');
  assert.match(pdf.subarray(-32).toString(),/%%EOF/);
  assert.ok(pdf.length>100_000);
  assert.equal((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,3);
});
