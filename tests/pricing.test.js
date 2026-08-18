import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyPricingToHtml, cryptoPriceForLead, storefrontPricing } from '../src/lib/pricing.js';

test('United States receives the exclusive 14.99 USD offer with a 72% crossed-out price',()=>{
  assert.deepEqual(storefrontPricing({country:'US',locale:'en'}),{
    country:'US',
    current:'14.99',
    compareAt:'53.54',
    savings:'38.55',
    discountPercent:72,
    currency:'USD',
    prefix:'$'
  });
  assert.equal(cryptoPriceForLead({country:'US'}),14.99);
});

test('Brazil, Portugal and the rest of the world keep their existing offers',()=>{
  const brazil=storefrontPricing({country:'BR',locale:'pt-BR'});
  assert.deepEqual([brazil.current,brazil.compareAt,brazil.currency],['36.49','129.90','BRL']);
  const portugal=storefrontPricing({country:'PT',locale:'pt-BR'});
  assert.deepEqual([portugal.current,portugal.compareAt,portugal.currency],['36.49','129.90','BRL']);
  const japan=storefrontPricing({country:'JP',locale:'en'});
  assert.deepEqual([japan.current,japan.compareAt,japan.currency],['6.99','24.99','USD']);
  assert.equal(cryptoPriceForLead({country:'BR'}),6.99);
});

test('server-rendered US pages replace only the US storefront price strings',()=>{
  const html='<b>$24.99</b><strong>$6.99</strong><span>$<i>6.99</i></span><span>Save $18 · 72% off</span>';
  const us=storefrontPricing({country:'US',locale:'en'});
  assert.equal(applyPricingToHtml(html,us),'<b>$53.54</b><strong>$14.99</strong><span>$<i>14.99</i></span><span>Save $38.55 · 72% off</span>');
  assert.equal(applyPricingToHtml(html,storefrontPricing({country:'JP',locale:'en'})),html);
});

test('crypto checkout uses the lead country for both network quote and payment intent',()=>{
  const route=fs.readFileSync(new URL('../src/routes/crypto.js',import.meta.url),'utf8');
  assert.match(route,/const basePrice=cryptoPriceForLead\(lead\)/);
  assert.match(route,/base_amount:basePrice\.toFixed\(6\)/);
  assert.match(route,/priceUsdt:cryptoPriceForLead\(req\.lead\)/);
  assert.match(route,/value:baseAmount/);
});
