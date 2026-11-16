/*
 * ogrenme_testi.js — Pekiştirmeli öğrenme testi. Çalıştırma: node tests/ogrenme_testi.js
 */
var assert = require('assert');
var O = require('../js/ogrenme.js');
var gecen = 0, kalan = 0;
function test(ad, f) { try { f(); gecen++; console.log('  ok  ' + ad); } catch (e) { kalan++; console.log('  HATA ' + ad + ': ' + e.message); } }

test('Aynı tohum aynı bölümü ve sonucu verir (tekrarlanabilir)', function () {
  var b = O.yeniBeyin(O.tohum(5));
  var a1 = O.degerlendir(b, 6, { mod: 'git' }, 11), a2 = O.degerlendir(b, 6, { mod: 'git' }, 11);
  assert.strictEqual(a1.ortOdul, a2.ortOdul);
});
test('Farklı tohum farklı bölüm (ezber yok)', function () {
  var b1 = new O.Bolum({ mod: 'git' }, O.tohum(1)), b2 = new O.Bolum({ mod: 'git' }, O.tohum(2));
  assert.ok(b1.x !== b2.x || b1.y !== b2.y || b1.hx !== b2.hx || b1.hy !== b2.hy);
});
test('Boş (eğitimsiz) beyin hedefe nadiren gider', function () {
  var t = O.degerlendir(O.yeniBeyin(O.tohum(3)), 30, { mod: 'git' }, 900);
  assert.ok(t.gitBasari < 0.5, 'başarı ' + t.gitBasari);
});

var egitici = new O.Egitici({ tohum: 7, lr: 0.1, sigma: 0.2, cift: 24, K: 6 });
var once = O.degerlendir(egitici.theta, 30, {}, 31337);
for (var i = 0; i < 50; i++) egitici.nesilYap();
var sonra = O.degerlendir(egitici.theta, 30, {}, 31337);   // eğitimde hiç görülmeyen tohumlar

test('Eğitim sonrası hedefe gitme belirgin artar', function () {
  assert.ok(sonra.gitBasari >= 0.8 && sonra.gitBasari > once.gitBasari + 0.4, once.gitBasari + ' → ' + sonra.gitBasari);
});
test('Eğitim sonrası ev tarama kapsamı yüksek', function () {
  assert.ok(sonra.taraKapsama >= 0.85, 'kapsam ' + sonra.taraKapsama);
});
test('Kayma+gürültü altında kısa uyum işe yarar (en az bozulmaz)', function () {
  var kosul = { kayma: 0.3, gurultu: 0.2 };
  var o1 = O.degerlendir(egitici.theta, 40, kosul, 4242);
  var u = new O.Egitici({ beyin: egitici.theta, ortam: kosul, alanRastgele: false, sigma: 0.08, lr: 0.04, cift: 20, K: 6, tohum: 99 });
  for (var j = 0; j < 15; j++) u.nesilYap();
  var o2 = O.degerlendir(u.theta, 40, kosul, 4242);
  assert.ok(o2.gitBasari >= o1.gitBasari - 0.1, o1.gitBasari + ' → ' + o2.gitBasari);
});
test('Tarama robotun haritasında mobilya yerlerini bulur', function () {
  var b = new O.Bolum({ mod: 'tara' }, O.tohum(8)), g = 0;
  while (!b.bitti && g++ < 2000) {
    var c = O.ileri(egitici.theta, b.gozlem()), e = 0;
    for (var k = 1; k < 4; k++) if (c[k] > c[e]) e = k;
    b.ilerle(e);
  }
  assert.ok(Object.keys(b.yerler).length >= 3, 'bulunan: ' + Object.keys(b.yerler).length);
});

console.log(gecen + ' geçti, ' + kalan + ' kaldı');
process.exit(kalan ? 1 : 0);
