/*
 * ogrenme_testi.js — Pekiştirmeli öğrenme testi (sürüm 2: ileri/geri/dönüş + hafıza). Çalıştırma: node tests/ogrenme_testi.js
 */
var assert = require('assert');
var O = require('../js/ogrenme.js');
var HB = require('../js/hazir_beyin.js');
var gecen = 0, kalan = 0;
function test(ad, f) { try { f(); gecen++; console.log('  ok  ' + ad); } catch (e) { kalan++; console.log('  HATA ' + ad + ': ' + e.message); } }

test('Aynı tohum aynı sonucu verir (tekrarlanabilir)', function () {
  var b = O.yeniBeyin(O.tohum(5));
  assert.strictEqual(O.degerlendir(b, 6, {}, 11).ortOdul, O.degerlendir(b, 6, {}, 11).ortOdul);
});
test('Farklı tohum farklı bölüm (ezber yok)', function () {
  var b1 = new O.Bolum({ mod: 'git' }, O.tohum(1)), b2 = new O.Bolum({ mod: 'git' }, O.tohum(2));
  assert.ok(b1.x !== b2.x || b1.y !== b2.y || b1.hx !== b2.hx || b1.hy !== b2.hy || b1.yon !== b2.yon);
});
test('Hareketler gerçek robot gibi: dönünce yer değişmez, sadece yön değişir', function () {
  var b = new O.Bolum({ mod: 'tara', rastgeleEngel: 0 }, O.tohum(3)), x = b.x, y = b.y, yon = b.yon;
  b.ilerle(3);
  assert.strictEqual(b.x, x); assert.strictEqual(b.y, y); assert.strictEqual(b.yon, (yon + 1) % 4);
  b.ilerle(2); assert.strictEqual(b.yon, yon);
});
test('Geri gitmek ve ileri-geri gidip gelmek ceza alır', function () {
  var b, i, s = 0;
  for (s = 0; s < 50; s++) {                               // önü ve arkası açık bir başlangıç bul
    b = new O.Bolum({ mod: 'tara', rastgeleEngel: 0 }, O.tohum(100 + s));
    var Y = O.YON[b.yon];
    if (b.durum(b.x + Y[0], b.y + Y[1]) === 1 && b.durum(b.x - Y[0], b.y - Y[1]) === 1) break;
  }
  b.ilerle(0); var od = b.ilerle(1);
  assert.strictEqual(b.salinim, 1); assert.ok(od <= O.ODUL.geri + O.ODUL.salinim + 0.05, 'ödül ' + od);
});
test('Yerinde fırıldak gibi dönmek ceza alır, takılan robot durur', function () {
  var b = new O.Bolum({ mod: 'git' }, O.tohum(12)), od = [];
  while (!b.bitti) od.push(b.ilerle(3));
  assert.ok(od[2] <= O.ODUL.adimGit + O.ODUL.firildak + 1e-9, 'üçüncü dönüş cezası ' + od[2]);
  assert.ok(b.durdu && b.adim <= 30, 'durdu=' + b.durdu + ' adım ' + b.adim);
});
test('Hazır beyin olduğu yerde dönüp durmaz (300 deneme, rastgelelik 0,3)', function () {
  var rng = O.tohum(4321), kotu = 0;
  for (var i = 0; i < 300; i++) {
    var b = new O.Bolum({ mod: i % 2 ? 'tara' : 'git' }, rng), a = new O.Ajan(HB.theta);
    while (!b.bitti) b.ilerle(O.sec(a.karar(b.gozlem()), 0.3, rng));
    if (b.durdu || b.firildakSayisi > 3) kotu++;
  }
  assert.ok(kotu <= 3, 'takılan/dönen deneme: ' + kotu);
});
test('Arkada sensör yok; görmediği yere geri gitmek ek ceza alır', function () {
  var b = new O.Bolum({ mod: 'tara', rastgeleEngel: 0 }, O.tohum(21)), Y = O.YON[(b.yon + 2) % 4];
  var ax = b.x + Y[0], ay = b.y + Y[1];
  if (ax >= 0 && ay >= 0 && ax < b.W && ay < b.H) assert.strictEqual(b.bilinen[ay][ax], false, 'arkadaki kare başta bilinmemeli');
  b.ilerle(1);
  assert.ok(b.geriSayisi === 1 && b.korGeriSayisi === 1, 'geri ' + b.geriSayisi + ', görmeden geri ' + b.korGeriSayisi);
  assert.ok(O.ODUL.geri < 0 && O.ODUL.korGeri < 0);
});
test('Hazır beyin neredeyse hiç geri gitmez (< %2)', function () {
  var d = O.degerlendir(HB.theta, 40, {}, 24680);
  assert.ok(d.geriOrani < 0.02, 'geri oranı ' + d.geriOrani);
});
test('Hafıza çalışır: aynı girdiye önceki adımlara göre farklı iç durum', function () {
  var w = O.yeniBeyin(O.tohum(9)), a = new O.Ajan(w), x = new Array(O.GIRIS).fill(0.3);
  var c1 = a.karar(x), c2 = a.karar(x);
  assert.notDeepStrictEqual(c1, c2);
  a.sifirla(); assert.deepStrictEqual(a.karar(x), c1);
});
test('Boş (eğitimsiz) beyin hedefe nadiren gider', function () {
  var t = O.degerlendir(O.yeniBeyin(O.tohum(3)), 30, {}, 900);
  assert.ok(t.gitBasari < 0.5, 'başarı ' + t.gitBasari);
});
test('Hazır beyin bu sürüme uygun', function () {
  assert.strictEqual(HB.surum, O.SURUM); assert.strictEqual(HB.theta.length, O.PARAM_SAYISI);
});
var hz = O.degerlendir(HB.theta, 40, {}, 55555);            // eğitimde görülmeyen tohumlar
test('Hazır beyin: hedefe gitme ≥ %90, tarama ≥ %90', function () {
  assert.ok(hz.gitBasari >= 0.9 && hz.taraKapsama >= 0.9, JSON.stringify(hz));
});
test('Hazır beyin: ileri-geri az (bölüm başına < 2), eğitimsiz beyinden çok daha az', function () {
  var bos = O.degerlendir(O.yeniBeyin(O.tohum(4)), 20, {}, 55555);
  assert.ok(hz.ortSalinim < 2 && hz.ortSalinim < bos.ortSalinim, hz.ortSalinim + ' / boş ' + bos.ortSalinim);
});
test('Hazır beyin kayma ve gürültüde de çalışır', function () {
  var z = O.degerlendir(HB.theta, 40, { kayma: 0.2, gurultu: 0.2 }, 66666);
  assert.ok(z.gitBasari >= 0.8 && z.taraKapsama >= 0.85, JSON.stringify(z));
});
test('Sıfırdan eğitim gerçekten öğretir (50 nesil)', function () {
  var e = new O.Egitici({ tohum: 7, lr: 0.1, sigma: 0.2, cift: 24, K: 6 });
  var once = O.degerlendir(e.theta, 30, {}, 31337);
  for (var i = 0; i < 50; i++) e.nesilYap();
  var sonra = O.degerlendir(e.theta, 30, {}, 31337);
  assert.ok(sonra.gitBasari >= 0.8 && sonra.gitBasari > once.gitBasari + 0.4, once.gitBasari + ' → ' + sonra.gitBasari);
  assert.ok(sonra.taraKapsama >= 0.85, 'kapsam ' + sonra.taraKapsama);
});
test('Tarama robotun haritasında mobilya yerlerini bulur', function () {
  var b = O.oyna(HB.theta, new O.Bolum({ mod: 'tara' }, O.tohum(8)), 0);
  assert.ok(Object.keys(b.yerler).length >= 3, 'bulunan: ' + Object.keys(b.yerler).length);
});

console.log(gecen + ' geçti, ' + kalan + ' kaldı');
process.exit(kalan ? 1 : 0);
