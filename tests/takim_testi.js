/*
 * takim_testi.js — Supabase modülü testi (SAHTE fetch ile; gerçek sunucuya bağlanmaz).
 * Çalıştırma:  node tests/takim_testi.js
 */
var assert = require('assert');
var Takim = require('../js/takim.js');

function b64(o) { return Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function jwt(rol) { return 'eyJhbGciOiJIUzI1NiJ9.' + b64({ role: rol }) + '.imza'; }

var testler = [];
function test(ad, f) { testler.push([ad, f]); }

function sahte(yanit) {
  var cagrilar = [];
  Takim.ayar.fetchFn = async function (url, sec) { cagrilar.push({ url: url, sec: sec }); return yanit(url, sec); };
  return cagrilar;
}

test('ayar boşsa hiçbir istek atılmaz', async function () {
  Takim.ayar.yapilandirma = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };
  var c = sahte(function () { throw new Error('çağrılmamalıydı'); });
  var r = await Takim.gonder({ komut: 'x', basari: true, kavramaTorku: 3, hataYuzdesi: 5, kapakTorku: null }, 'OYN-TEST1234');
  assert.strictEqual(c.length, 0);
  assert.ok(r.atlandi);
  var s = await Takim.sonGorevler(50);
  assert.ok(s.atlandi);
  assert.ok(/kapalı/.test(Takim.satirMetni(s, 50)));
});

test('service_role anahtarı reddedilir', async function () {
  Takim.ayar.yapilandirma = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: jwt('service_role') };
  var c = sahte(function () { throw new Error('çağrılmamalıydı'); });
  var r = await Takim.gonder({ komut: 'x', basari: true, kavramaTorku: 3, hataYuzdesi: 5, kapakTorku: null }, 'OYN-TEST1234');
  assert.strictEqual(c.length, 0);
  assert.ok(/service_role/.test(r.hata));
});

test('http adresi reddedilir', async function () {
  Takim.ayar.yapilandirma = { SUPABASE_URL: 'http://x.supabase.co', SUPABASE_ANON_KEY: jwt('anon') };
  assert.strictEqual(Takim.durum().hazir, false);
});

test('kayıt doğru adrese, doğru başlık ve gövdeyle gönderilir (anon JWT)', async function () {
  var anahtar = jwt('anon');
  Takim.ayar.yapilandirma = { SUPABASE_URL: 'https://x.supabase.co/', SUPABASE_ANON_KEY: anahtar };
  var c = sahte(function () { return { ok: true, status: 201 }; });
  var r = await Takim.gonder({ komut: 'havluyu getir', basari: false, kavramaTorku: 3.5, hataYuzdesi: 5, kapakTorku: null }, 'OYN-ABCD2345');
  assert.ok(r.basari);
  assert.strictEqual(c[0].url, 'https://x.supabase.co/rest/v1/task_logs');
  assert.strictEqual(c[0].sec.method, 'POST');
  assert.strictEqual(c[0].sec.headers.apikey, anahtar);
  assert.strictEqual(c[0].sec.headers.Authorization, 'Bearer ' + anahtar);
  var g = JSON.parse(c[0].sec.body);
  assert.deepStrictEqual(g, { oyuncu_kodu: 'OYN-ABCD2345', komut: 'havluyu getir', basari: false,
    kavrama_torku: 3.5, hata_yuzdesi: 5, kapak_torku: null });
});

test('yeni tip (JWT olmayan) anahtarda Authorization başlığı gönderilmez', async function () {
  Takim.ayar.yapilandirma = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'sb_publishable_abc123' };
  var c = sahte(function () { return { ok: true, status: 201 }; });
  await Takim.gonder({ komut: 'x', basari: true, kavramaTorku: 3, hataYuzdesi: 5, kapakTorku: 3.1 }, 'OYN-ABCD2345');
  assert.strictEqual(c[0].sec.headers.Authorization, undefined);
  assert.strictEqual(c[0].sec.headers.apikey, 'sb_publishable_abc123');
});

test('sunucu hata verirse oyun çökmez, hata döner', async function () {
  Takim.ayar.yapilandirma = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: jwt('anon') };
  sahte(function () { return { ok: false, status: 401 }; });
  var r = await Takim.gonder({ komut: 'x', basari: true, kavramaTorku: 3, hataYuzdesi: 5, kapakTorku: null }, 'OYN-ABCD2345');
  assert.strictEqual(r.basari, false);
  sahte(function () { throw new Error('ağ yok'); });
  r = await Takim.gonder({ komut: 'x', basari: true, kavramaTorku: 3, hataYuzdesi: 5, kapakTorku: null }, 'OYN-ABCD2345');
  assert.strictEqual(r.basari, false);
  var s = await Takim.sonGorevler(50);
  assert.ok(/alınamadı/.test(Takim.satirMetni(s, 50)));
});

test('takım satırı: son N görevde %X başarı', async function () {
  Takim.ayar.yapilandirma = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: jwt('anon') };
  var satirlar = [];
  for (var i = 0; i < 50; i++) satirlar.push({ basari: i % 4 !== 0 });   // 13 başarısız, 37 başarılı
  var c = sahte(function () { return { ok: true, status: 200, json: async function () { return satirlar; } }; });
  var s = await Takim.sonGorevler(50);
  assert.strictEqual(c[0].sec.method, 'GET');
  assert.ok(/select=basari&order=zaman\.desc&limit=50/.test(c[0].url));
  assert.strictEqual(Takim.satirMetni(s, 50), 'Takım kaydı: son 50 görevde %74 başarı');
});

test('config.js içinde gizli anahtar yok', async function () {
  var icerik = require('fs').readFileSync(__dirname + '/../config.js', 'utf8');
  assert.ok(!/eyJ[A-Za-z0-9_-]{20,}/.test(icerik), 'config.js içinde JWT var; boş olmalı');
  assert.ok(/SUPABASE_URL:\s*''/.test(icerik));
});

test('depodaki hiçbir dosyada service_role anahtarı değeri yok', async function () {
  var fs = require('fs'), path = require('path');
  function gez(d) {
    return fs.readdirSync(d, { withFileTypes: true }).flatMap(function (e) {
      if (e.name === '.git' || e.name === 'node_modules') return [];
      var p = path.join(d, e.name);
      return e.isDirectory() ? gez(p) : [p];
    });
  }
  gez(path.join(__dirname, '..')).forEach(function (f) {
    var t = fs.readFileSync(f, 'utf8');
    assert.ok(!/eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}/.test(t) || /takim_testi/.test(f), 'JWT benzeri değer: ' + f);
  });
});

(async function () {
  var basarisiz = 0;
  for (var i = 0; i < testler.length; i++) {
    try { await testler[i][1](); console.log('  ok   ' + testler[i][0]); }
    catch (e) { basarisiz++; console.log('  HATA ' + testler[i][0] + '\n       ' + e.message); }
  }
  console.log('\nTakım testi: ' + (testler.length - basarisiz) + '/' + testler.length + ' geçti');
  if (basarisiz) process.exit(1);
})();
