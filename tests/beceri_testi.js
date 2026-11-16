/*
 * beceri_testi.js — Beceri öğrenme testi (kapak açma, eşya itme). Çalıştırma: node tests/beceri_testi.js
 */
var assert = require('assert');
var O = require('../js/ogrenme.js'), B = require('../js/beceri.js'), H = require('../js/hazir_beceri.js');
var K = B.BECERILER.kapak, I = B.BECERILER.itme;
var gecen = 0, kalan = 0;
function test(ad, f) { try { f(); gecen++; console.log('  ok  ' + ad); } catch (e) { kalan++; console.log('  HATA ' + ad + ': ' + e.message); } }
function calistir(o, eylemler) { eylemler.forEach(function (e) { if (!o.bitti) o.ilerle(e); }); return o; }

test('Kapak: şişeyi fazla sıkınca ezilir (kaza)', function () {
  var o = calistir(K.yeni({}, O.tohum(1)), new Array(14).fill(0));
  assert.ok(o.kaza && /ezildi/.test(o.sonuc), o.sonuc);
});
test('Kapak: az sıkıp çevirince şişe elde döner, sonunda düşer', function () {
  var o = calistir(K.yeni({ cokSiki: false }, O.tohum(2)), [2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4]);
  assert.ok(o.kaza && /düşürdü/.test(o.sonuc), o.sonuc);
});
test('Kapak: yeterli sıkıp torku artırınca açılır', function () {
  var o = K.yeni({ cokSiki: false }, O.tohum(3)); o.ezilme = 150; o.elMu = 0.9; o.kayisMaks = 6; o.acilabilir = true;
  calistir(o, [0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
  assert.ok(o.basari && /açtı/.test(o.sonuc), o.sonuc);
});
test('Kapak: denemeden "açamıyorum" cezalı, denedikten sonra doğru', function () {
  var a = calistir(K.yeni({ cokSiki: true }, O.tohum(4)), [5]);
  assert.ok(!a.basari && /Denemeden/.test(a.sonuc), a.sonuc);
  var b = calistir(K.yeni({ cokSiki: true }, O.tohum(4)), [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 5]);
  assert.ok(b.basari && b.reddetti, b.sonuc);
});
test('İtme: kuvvet devrilme sınırını aşarsa robot devrilir (simülasyonda)', function () {
  var o = I.yeni({ esya: 4 }, O.tohum(5)); o.gerekli = 1e9;
  calistir(o, new Array(25).fill(0));
  assert.ok(o.kaza && /DEVRİLDİ/.test(o.sonuc), o.sonuc);
});
test('İtme: hafif eşya yavaş kuvvetle itilir', function () {
  var o = I.yeni({ esya: 0 }, O.tohum(6)), g = 0;
  while (!o.bitti && g++ < 50) o.ilerle(o.F < o.gerekli ? 0 : 2);
  assert.ok(o.basari && /itildi/.test(o.sonuc), o.sonuc);
});
test('Hazır beceri beyinleri bu sürüme uygun', function () {
  assert.strictEqual(H.surum, B.SURUM);
  assert.strictEqual(H.kapak.theta.length, B.paramSayisi(K)); assert.strictEqual(H.itme.theta.length, B.paramSayisi(I));
});
test('Hazır kapak beyni: açılabilirde ≥ %90 açar, açılamazda ≥ %90 doğru "açamıyorum", kaza ≤ %3', function () {
  var d = B.degerlendir(K, H.kapak.theta, 500, 31337);
  assert.ok(d.basari >= 0.9 && d.dogruRed >= 0.9 && d.kaza <= 0.03, JSON.stringify(d));
});
test('Hazır itme beyni: itilebilirde ≥ %90 iter, ağırda ≥ %90 doğru reddeder, devrilme ≤ %2', function () {
  var d = B.degerlendir(I, H.itme.theta, 500, 31337);
  assert.ok(d.basari >= 0.9 && d.dogruRed >= 0.9 && d.kaza <= 0.02, JSON.stringify(d));
});
function genel(d) { var p = d.yapilabilirOran; return d.basari * p + d.dogruRed * (1 - p) - d.kaza; }
test('Boş beyin genel puanı düşük, hazır beyin yüksek (öğrenme gerçekten gerekli)', function () {
  [[K, H.kapak], [I, H.itme]].forEach(function (x) {
    var bos = genel(B.degerlendir(x[0], B.yeniBeyin(x[0], O.tohum(9)), 300, 31337)), hz = genel(B.degerlendir(x[0], x[1].theta, 300, 31337));
    assert.ok(bos < 0.5 && hz >= 0.9, x[0].anahtar + ' boş ' + bos.toFixed(2) + ' / hazır ' + hz.toFixed(2));
  });
});
test('Sıfırdan eğitim itmeyi öğretir (150 nesil)', function () {
  var e = new B.Egitici(I, { tohum: 32 });
  for (var n = 0; n < 150; n++) e.nesilYap();
  var d = B.degerlendir(I, e.theta, 300, 999);
  assert.ok(d.basari >= 0.7 && d.dogruRed >= 0.7, JSON.stringify(d));
});

console.log(gecen + ' geçti, ' + kalan + ' kaldı');
process.exit(kalan ? 1 : 0);
