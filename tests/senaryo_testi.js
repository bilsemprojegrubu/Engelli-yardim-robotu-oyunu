/*
 * senaryo_testi.js — Uçtan uca testler (komut -> plan -> beceri -> simülasyon sürücüsü).
 * Çalıştırma:  node tests/senaryo_testi.js
 * Tarayıcı yok: animasyon anında biter, rastgelelik sabit tohumla gelir.
 */
var assert = require('assert');
var S = require('../js/sabitler.js');
var Dunya = require('../js/dunya.js');
var Beceriler = require('../js/beceriler.js');
var Yurutucu = require('../js/yurutucu.js');
var Sim = require('../js/surucu_sim.js');

function tohum(a) { // mulberry32: aynı tohum, aynı sayılar
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Test ortamı kurar. ayar: kısmi ayar, kapilar: 'acik' | 'kapali' | undefined (rastgele)
function kur(ayar, tohumNo, kapilar, ozel) {
  var rastgele = tohum(tohumNo || 1);
  var d = Dunya.kur(rastgele);
  if (kapilar) d.kapilar.forEach(function (k) { k.acik = kapilar === 'acik'; k.aci = k.acik ? 1 : 0; });
  var ayarlar = Object.assign({}, S.VARSAYILAN_AYARLAR, ayar || {});
  var o = {
    d: d, gunluk: [], kayitlar: [], ayarlar: ayarlar, iptal: false,
    animSayisi: 0, iptalSonra: null
  };
  var sc = Object.assign({
    ayarlar: function () { return ayarlar; },
    rastgele: rastgele,
    olay: function (m) { o.gunluk.push(m); },
    iptal: function () { return o.iptal; }
  }, ozel || {});
  o.surucu = new Sim.SimSurucu(d, sc);
  o.ortam = {
    surucu: o.surucu, ayarlar: function () { return ayarlar; },
    gunluk: function (m) { o.gunluk.push(m); },
    kayitEt: function (k) { o.kayitlar.push(k); }
  };
  o.calistir = function (metin) { return Yurutucu.komutuCalistir(metin, o.ortam); };
  return o;
}
function metin(o) { return o.gunluk.join('\n'); }

var testler = [];
function test(ad, f) { testler.push([ad, f]); }

// ---------- Temel görevler ----------
test('su şişesi getirilir ve kullanıcının yanına bırakılır', async function () {
  var o = kur({ kavramaTorku: 6, hataYuzdesi: 0 }, 3, 'kapali');
  var s = await o.calistir('mutfaktan su getir');
  assert.strictEqual(o.kayitlar.length, 1);
  assert.strictEqual(o.kayitlar[0].basari, true, metin(o));
  var e = o.d.esyalar.su, u = Dunya.hucre(o.d.kullanici);
  assert.ok(Math.abs(e.x - u.x) + Math.abs(e.y - u.y) <= 2, 'şişe kullanıcıya yakın olmalı');
  assert.strictEqual(o.d.robot.tuttugu, null);
  assert.ok(/Kapı kapalı, açıyorum/.test(metin(o)), 'robot kapalı kapıyı kendisi açmalı');
});

// ---------- Herhangi bir yere götürme / gitme ----------
function yakin(a, hucreler, mesafe) {
  var h = Dunya.hucre(a);
  return hucreler.some(function (c) { return Math.abs(c.x - h.x) + Math.abs(c.y - h.y) <= mesafe; });
}
test('beni küvete götür: robot ve kullanıcı küvetin yanına gelir', async function () {
  var o = kur({ kavramaTorku: 6, hataYuzdesi: 0 }, 3, 'acik');
  await o.calistir('beni küvete götür');
  assert.strictEqual(o.kayitlar.length, 1);
  assert.strictEqual(o.kayitlar[0].basari, true, metin(o));
  var kuvet = Dunya.aygitHucreleri(o.d, 'kuvet');
  assert.ok(yakin(o.d.robot, kuvet, 2), 'robot küvetin yanında olmalı');
  assert.ok(yakin(o.d.kullanici, kuvet, 3), 'kullanıcı küvetin yakınında olmalı');
});
test('kumandaya git: robot kumandanın yanına gider', async function () {
  var o = kur({ kavramaTorku: 6, hataYuzdesi: 0 }, 3, 'acik');
  await o.calistir('mutfağa git');
  await o.calistir('kumandaya git');
  assert.strictEqual(o.kayitlar[1].basari, true, metin(o));
  assert.ok(yakin(o.d.robot, [Dunya.esyaHucresi(o.d, 'kumanda')], 2), 'robot kumandanın yanında olmalı');
});
test('bilinmeyen yer ya da eşya: görev yok, bilinenler söylenir', async function () {
  var o = kur({}, 3, 'acik');
  await o.calistir('beni bahçeye götür');
  await o.calistir('kalem getir');
  assert.strictEqual(o.kayitlar.length, 0);
  assert.ok(/küvet/.test(metin(o)) && /havlu/.test(metin(o)), metin(o));
});

test('havluyu getir ve banyonun ışığını kapat: iki görev, iki kayıt', async function () {
  var o = kur({ kavramaTorku: 6, hataYuzdesi: 0 }, 5, 'kapali');
  await o.calistir('havluyu getir ve banyonun ışığını kapat');
  assert.strictEqual(o.kayitlar.length, 2);
  assert.ok(o.kayitlar.every(function (k) { return k.basari; }), metin(o));
  assert.strictEqual(o.d.odalar.banyo.isik, false);
  assert.strictEqual(o.d.odalar.salon.isik, true);
});

test('tv aç / kapat', async function () {
  var o = kur({ hataYuzdesi: 0 }, 2, 'acik');
  await o.calistir('tv yi aç');
  assert.strictEqual(o.d.aygitlar.tv.acik, true);
  await o.calistir('televizyonu kapat');
  assert.strictEqual(o.d.aygitlar.tv.acik, false);
  await o.calistir('televizyonu kapat'); // zaten kapalı: başarı sayılır
  assert.ok(o.kayitlar.every(function (k) { return k.basari; }));
});

test('ışık komutu bulunduğun odanın ışığını kapatır', async function () {
  var o = kur({ hataYuzdesi: 0 }, 2, 'acik');
  await o.calistir('ışığı kapatır mısın');
  assert.strictEqual(o.d.odalar.salon.isik, false);   // kullanıcı salonda başlar
});

test('tüm ışıkları kapat', async function () {
  var o = kur({ hataYuzdesi: 0 }, 4, 'kapali');
  await o.calistir('tüm ışıkları kapat');
  Object.keys(o.d.odalar).forEach(function (k) { assert.strictEqual(o.d.odalar[k].isik, false, k); });
  assert.strictEqual(o.kayitlar.length, 1);
  assert.ok(o.kayitlar[0].basari, metin(o));
});

// ---------- Kapak torku ----------
test('kapak torku kavrama torkundan büyükse kapak açılmaz ve neden günlükte yazar', async function () {
  var o = kur({ kavramaTorku: 3.0, hataYuzdesi: 0 }, 7, 'acik');
  o.d.esyalar.su.kapakTorku = 4.0;
  await o.calistir('şişeyi açıp getir');
  assert.strictEqual(o.kayitlar[0].basari, false);
  assert.strictEqual(o.d.esyalar.su.kapakAcik, false);
  assert.ok(/kapak torku 4,00 N·m, robotun kavrama torku 3,00 N·m'den büyük/.test(metin(o)), metin(o));
  assert.strictEqual(o.kayitlar[0].kapakTorku, 4.0);
  assert.strictEqual(o.kayitlar[0].kavramaTorku, 3.0);
  // Bu hatada tekrar denemek boşuna: sadece bir kez denemeli
  assert.ok(!/Tekrar deniyorum/.test(metin(o)), 'tork sınırı aşılıyorsa tekrar denememeli');
});

test('kapak torku sınırın altındaysa ve hata yoksa kapak açılır', async function () {
  var o = kur({ kavramaTorku: 3.0, hataYuzdesi: 0 }, 7, 'acik');
  o.d.esyalar.su.kapakTorku = 2.5;
  await o.calistir('şişeyi açıp getir');
  assert.strictEqual(o.kayitlar[0].basari, true, metin(o));
  assert.strictEqual(o.kayitlar[0].kapakTorku, 2.5);
});

test('kapak torku sınıra çok yakınken ölçüm hatası yüzünden tork yetmeyebilir', async function () {
  var gordu = false;
  for (var t = 1; t <= 60 && !gordu; t++) {
    var o = kur({ kavramaTorku: 4.2, hataYuzdesi: 30 }, t, 'acik');
    o.d.esyalar.su.kapakTorku = 4.1;   // sınırın hemen altı: ölçüm düşük çıkarsa yetmez
    await o.calistir('şişeyi açıp getir');
    if (/ölçüm hatası yüzünden tork yetmedi/.test(metin(o))) gordu = true;
  }
  assert.ok(gordu, 'yüksek hata yüzdesinde ölçüm hatası nedeni görülmeli');
});

test('hata yüzdesi 0 ve yeterli tork: 40 denemede hep başarı', async function () {
  for (var t = 1; t <= 40; t++) {
    var o = kur({ kavramaTorku: 5, hataYuzdesi: 0 }, t);
    await o.calistir('şişeyi açıp getir');
    assert.strictEqual(o.kayitlar[0].basari, true, 'tohum ' + t + '\n' + metin(o));
  }
});

test('şişe teslim edilince kapak yeniden sıkılır, kapak torku yeniden gelir', async function () {
  var o = kur({ kavramaTorku: 6, hataYuzdesi: 0 }, 9, 'acik');
  var once = o.d.esyalar.su.kapakTorku;
  await o.calistir('şişeyi açıp getir');
  assert.strictEqual(o.d.esyalar.su.kapakAcik, false);
  assert.notStrictEqual(o.d.esyalar.su.kapakTorku, once);
  assert.ok(o.d.esyalar.su.kapakTorku >= S.KAPAK_TORKU_MIN_NM && o.d.esyalar.su.kapakTorku <= S.KAPAK_TORKU_MAX_NM);
});

// ---------- Yeni görevler ----------
test('kapıyı kapat: açık kapı kapanır', async function () {
  var o = kur({ hataYuzdesi: 0 }, 11, 'acik');
  await o.calistir('kapıyı kapat');
  assert.strictEqual(o.d.kapilar.filter(function (k) { return !k.acik; }).length, 1, metin(o));
  assert.ok(o.kayitlar[0].basari);
});

test('banyo kapısını aç: banyonun bir kapısı açılır (yolda gereken diğer kapılar da açılabilir)', async function () {
  var o = kur({ hataYuzdesi: 0 }, 11, 'kapali');
  await o.calistir('banyo kapısını aç');
  assert.ok(o.kayitlar[0].basari, metin(o));
  var banyoAcik = o.d.kapilar.filter(function (k) { return k.acik && k.odalar.indexOf('banyo') >= 0; });
  assert.ok(banyoAcik.length >= 1, metin(o));
});

test('tekerlekli sandalye getirilir', async function () {
  var o = kur({ kavramaTorku: 6, hataYuzdesi: 0 }, 12, 'kapali');
  await o.calistir('tekerlekli sandalyeyi getir');
  assert.ok(o.kayitlar[0].basari, metin(o));
  var e = o.d.esyalar.sandalye, u = Dunya.hucre(o.d.kullanici);
  assert.ok(Math.abs(e.x - u.x) + Math.abs(e.y - u.y) <= 2);
});

test('beni yatak odasına götür: robot ve kullanıcı odaya varır', async function () {
  var o = kur({ hataYuzdesi: 0 }, 13, 'kapali');
  await o.calistir('beni yatak odasına götür');
  assert.ok(o.kayitlar[0].basari, metin(o));
  var uh = Dunya.hucre(o.d.kullanici), rh = Dunya.hucre(o.d.robot);
  assert.strictEqual(Dunya.odaBul(o.d, uh.x, uh.y), 'yatak');
  assert.strictEqual(Dunya.odaBul(o.d, rh.x, rh.y), 'yatak');
});

test('beni salona götür: zaten salondaysan başarı sayılır, hareket yok', async function () {
  var o = kur({ hataYuzdesi: 0 }, 13, 'kapali');
  var r0 = JSON.stringify(o.d.robot);
  await o.calistir('beni salona götür');
  assert.ok(o.kayitlar[0].basari);
  assert.strictEqual(JSON.stringify(o.d.robot), r0);
});

// ---------- Buzdolabı ----------
test('buzdolabı: robot tutacı tutar, GERİ giderek ve dönerek kapıyı açar', async function () {
  var o = kur({ hataYuzdesi: 0 }, 14, 'acik');
  var f = o.d.aygitlar.buzdolabi;
  var gorulenKonumlar = [];
  var izle = o.surucu.tekerlekleCek;
  o.surucu.tekerlekleCek = async function (n) {
    var once = { y: o.d.robot.y, x: o.d.robot.x, yon: o.d.robot.yon };
    assert.strictEqual(o.d.robot.tuttugu, 'buzdolabi_tutacagi', 'önce tutaç tutulmalı');
    var r = await izle.call(o.surucu, n);
    gorulenKonumlar.push(once, { y: o.d.robot.y, x: o.d.robot.x, yon: o.d.robot.yon });
    return r;
  };
  await o.calistir('buzdolabını aç');
  assert.ok(o.kayitlar[0].basari, metin(o));
  assert.strictEqual(f.acik, true);
  assert.strictEqual(f.aci, S.BUZDOLABI_ACMA_ACISI_DERECE);
  var ilk = gorulenKonumlar[0], son = gorulenKonumlar[1];
  assert.ok(son.y > ilk.y + 0.5, 'robot geri (güneye) gitmeli');
  var donus = Math.abs(son.yon - ilk.yon) * 180 / Math.PI;
  assert.ok(donus > 5 && donus < 45, 'hafif dönmeli, dönüş: ' + donus);
  assert.strictEqual(o.d.robot.tuttugu, null, 'sonunda tutaç bırakılmış olmalı');
  assert.ok(Dunya.yurunebilir(o.d, Dunya.hucre(o.d.robot).x, Dunya.hucre(o.d.robot).y));
});

test('buzdolabı: çekiş kuvveti yetmezse (kütle/sürtünme düşükse) açılmaz ve nedeni yazar', async function () {
  var eski = S.TEKER_SURTUNME_KATSAYISI;
  S.TEKER_SURTUNME_KATSAYISI = 0.1;                    // 0,1 × 20 × 9,81 ≈ 20 N < 30 N
  try {
    var o = kur({ hataYuzdesi: 0 }, 15, 'acik');
    await o.calistir('buzdolabını aç');
    assert.strictEqual(o.kayitlar[0].basari, false);
    assert.strictEqual(o.d.aygitlar.buzdolabi.acik, false);
    assert.ok(/Tekerlekler kayar/.test(metin(o)), metin(o));
  } finally { S.TEKER_SURTUNME_KATSAYISI = eski; }
});

test('buzdolabı: kapının açılacağı yerde engel varsa açılmaz', async function () {
  var o = kur({ hataYuzdesi: 0 }, 16, 'acik');
  o.d.engel[2][14] = true;                              // robotun geri gideceği hücre dolu
  await o.calistir('buzdolabını aç');
  assert.strictEqual(o.kayitlar[0].basari, false);
  assert.ok(/engel/.test(metin(o)));
});

// ---------- Acil durdurma ----------
test('acil durdurma: plan ortasında robot durur, kayıt yazılmaz, sonraki iş çalışmaz', async function () {
  var sayac = 0, o;
  o = kur({ kavramaTorku: 6, hataYuzdesi: 0 }, 17, 'acik', {
    animasyon: async function (ms, fn, kontrol) {       // her animasyon bir tur bekler
      sayac++;
      if (sayac === 12) o.iptal = true;                 // 12. harekette düğmeye basıldı
      await Promise.resolve();
      kontrol(); fn(1);
    }
  });
  var s = await o.calistir('su getir ve havluyu getir ve tv yi aç');
  assert.strictEqual(s.durduruldu, true);
  assert.strictEqual(o.kayitlar.length, 0, 'durdurulan görevin kaydı yazılmamalı');
  assert.ok(/ACİL DURDURMA/.test(metin(o)));
  var h = Dunya.hucre(o.d.robot);
  assert.strictEqual(o.d.robot.x, h.x + 0.5, 'robot hücre ortasına oturmalı');
  assert.strictEqual(o.d.aygitlar.tv.acik, false, 'sonraki görevler çalışmamalı');
  // Bayrak kalkınca robot yeniden komut alabilir
  o.iptal = false;
  await o.calistir('tv yi aç');
  assert.strictEqual(o.d.aygitlar.tv.acik, true);
});

test('acil durdurma buzdolabı açılırken: yarım açık kapı kapanır, tutaç bırakılır', async function () {
  var o, geriCekAnimi = false;
  o = kur({ hataYuzdesi: 0 }, 18, 'acik', {
    animasyon: async function (ms, fn, kontrol) {
      if (ms > 2000) { fn(0.5); o.iptal = true; geriCekAnimi = true; kontrol(); }   // kapı yarıdayken bas
      fn(1);
    }
  });
  var s = await o.calistir('buzdolabını aç');
  assert.ok(geriCekAnimi);
  assert.strictEqual(s.durduruldu, true);
  assert.strictEqual(o.d.aygitlar.buzdolabi.acik, false);
  assert.strictEqual(o.d.aygitlar.buzdolabi.aci, 0);
  assert.strictEqual(o.d.robot.tuttugu, null);
});

// ---------- Beceri arayüzü ----------
test('beceri kataloğu istenen becerileri içerir ve sürücü arayüzü eksiksiz', async function () {
  var adlar = Beceriler.katalog().map(function (b) { return b.ad; });
  ['git', 'tut', 'birak', 'kapakAc', 'isik', 'tv', 'kapiAc', 'kapiKapat', 'tekerlekleCek', 'eslikEt']
    .forEach(function (a) { assert.ok(adlar.indexOf(a) >= 0, a + ' becerisi yok'); });
  var o = kur();
  assert.deepStrictEqual(Beceriler.surucuDogrula(o.surucu), []);
  assert.deepStrictEqual(Beceriler.surucuDogrula({ algi: function () {} }).length, Beceriler.SURUCU_ARAYUZU.length - 1);
});

test('beceri girdisi doğrulanır', async function () {
  var o = kur();
  var r = await Beceriler.calistir('isik', { oda: 'salon' }, { surucu: o.surucu, gunluk: function () {} });
  assert.strictEqual(r.basari, false);
  assert.ok(/acik/.test(r.neden));
  r = await Beceriler.calistir('ucmakBecerisi', {}, { surucu: o.surucu, gunluk: function () {} });
  assert.strictEqual(r.basari, false);
});

// ---------- Dayanıklılık ----------
test('300 rastgele komut: hata fırlatmaz, robot hep geçerli hücrede kalır', async function () {
  var komutlar = ['su getir', 'şişeyi açıp getir', 'kumandayı getir ve tv yi aç', 'ilacı getir', 'havluyu getir',
    'ışığı kapat', 'tüm ışıkları aç', 'kapıyı kapat', 'kapıyı aç', 'banyo kapısını aç', 'tekerlekli sandalyeyi getir',
    'beni mutfağa götür', 'beni banyoya götür', 'beni salona götür', 'buzdolabını aç', 'mutfağa git', 'bana gel',
    'yatak odasının ışığını kapat', 'havlu ve ilaç getir'];
  var o = kur({ kavramaTorku: 3.5, hataYuzdesi: 10 }, 99);
  var r = tohum(7);
  for (var i = 0; i < 300; i++) {
    var k = komutlar[Math.floor(r() * komutlar.length)];
    await o.calistir(k);
    var h = Dunya.hucre(o.d.robot);
    assert.ok(Dunya.yurunebilir(o.d, h.x, h.y), 'robot duvarda: ' + k);
    assert.ok(o.d.robot.x >= 0 && o.d.robot.y >= 0);
    if (i % 25 === 0) o.d.aygitlar.buzdolabi.acik = false, o.d.aygitlar.buzdolabi.aci = 0;
  }
  assert.ok(o.kayitlar.length >= 300);
});

(async function () {
  var basarisiz = 0;
  for (var i = 0; i < testler.length; i++) {
    try { await testler[i][1](); console.log('  ok   ' + testler[i][0]); }
    catch (e) { basarisiz++; console.log('  HATA ' + testler[i][0] + '\n       ' + String(e.message).split('\n').join('\n       ')); }
  }
  console.log('\nSenaryo testi: ' + (testler.length - basarisiz) + '/' + testler.length + ' geçti');
  if (basarisiz) process.exit(1);
})();
