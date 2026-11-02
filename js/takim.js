/*
 * takim.js — Supabase ile "takım kaydı". Kütüphane yok, sadece fetch ile REST.
 *
 * config.js boşsa (URL ya da anahtar yoksa) hiçbir şey göndermez; oyun çalışmaya devam eder.
 * Sadece "anon" (herkese açık) anahtar kullanılır. service_role anahtarı verilirse
 * REDDEDİLİR (yanlışlıkla sayfaya konmuş olabilir) ve uyarı yazılır.
 */
(function (kok) {
  'use strict';
  var S = kok.Sabitler || require('./sabitler.js');
  var TABLO = 'task_logs';

  var ayar = { fetchFn: null, yapilandirma: null };

  function yapilandirma() { return ayar.yapilandirma || kok.YAPILANDIRMA || {}; }
  function fetchFn() { return ayar.fetchFn || (kok.fetch ? kok.fetch.bind(kok) : null); }

  // JWT'nin ortasındaki "role" alanını okur (anon mu, service_role mü?)
  function anahtarRolu(anahtar) {
    try {
      var parca = String(anahtar).split('.')[1];
      if (!parca) return null;
      parca = parca.replace(/-/g, '+').replace(/_/g, '/');
      var json = typeof atob === 'function' ? atob(parca) : Buffer.from(parca, 'base64').toString('utf8');
      return JSON.parse(json).role || null;
    } catch (e) { return null; }
  }

  // {hazir: bool, neden: '...'}
  function durum() {
    var y = yapilandirma();
    var url = (y.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    var anahtar = (y.SUPABASE_ANON_KEY || '').trim();
    if (!url || !anahtar) return { hazir: false, neden: 'ayar yok' };
    if (!/^https:\/\//.test(url)) return { hazir: false, neden: 'adres https ile başlamalı' };
    if (anahtarRolu(anahtar) === 'service_role')
      return { hazir: false, neden: 'service_role anahtarı konmuş! Bunu config.js\'ten sil, sadece anon anahtarı kullan.' };
    return { hazir: true, url: url, anahtar: anahtar };
  }

  function basliklar(anahtar, ek) {
    var h = { apikey: anahtar, 'Content-Type': 'application/json' };
    // Yeni tip "sb_publishable_..." anahtarlar JWT değildir; sadece eski JWT anahtarları Bearer olarak gönderilir.
    if (/^eyJ/.test(anahtar)) h.Authorization = 'Bearer ' + anahtar;
    return Object.assign(h, ek || {});
  }

  async function istek(url, secenek) {
    var f = fetchFn();
    if (!f) throw new Error('fetch yok');
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var zamanAsimi = ctrl ? setTimeout(function () { ctrl.abort(); }, 8000) : null;
    try {
      if (ctrl) secenek.signal = ctrl.signal;
      return await f(url, secenek);
    } finally { if (zamanAsimi) clearTimeout(zamanAsimi); }
  }

  // Bir görev kaydını gönderir. Dönüş: {basari, hata?}
  async function gonder(kayit, oyuncuKodu) {
    var d = durum();
    if (!d.hazir) return { basari: false, atlandi: true, hata: d.neden };
    var govde = {
      oyuncu_kodu: oyuncuKodu,
      komut: String(kayit.komut).slice(0, 200),
      basari: !!kayit.basari,
      kavrama_torku: kayit.kavramaTorku,
      hata_yuzdesi: kayit.hataYuzdesi,
      kapak_torku: kayit.kapakTorku === null || kayit.kapakTorku === undefined ? null : kayit.kapakTorku
    };
    try {
      var r = await istek(d.url + '/rest/v1/' + TABLO, {
        method: 'POST',
        headers: basliklar(d.anahtar, { Prefer: 'return=minimal' }),
        body: JSON.stringify(govde)
      });
      if (!r.ok) return { basari: false, hata: 'Sunucu ' + r.status + ' döndü.' };
      return { basari: true };
    } catch (e) { return { basari: false, hata: 'Bağlanılamadı.' }; }
  }

  // Son N görevin başarı yüzdesi. Dönüş: {adet, yuzde} ya da {hata}
  async function sonGorevler(n) {
    var d = durum();
    if (!d.hazir) return { atlandi: true, hata: d.neden };
    n = n || S.TAKIM_SON_N;
    try {
      var r = await istek(d.url + '/rest/v1/' + TABLO + '?select=basari&order=zaman.desc&limit=' + n, {
        method: 'GET', headers: basliklar(d.anahtar)
      });
      if (!r.ok) return { hata: 'Sunucu ' + r.status + ' döndü.' };
      var satirlar = await r.json();
      var adet = satirlar.length;
      var ok = satirlar.filter(function (s) { return s.basari; }).length;
      return { adet: adet, yuzde: adet ? Math.round(ok * 100 / adet) : 0 };
    } catch (e) { return { hata: 'Bağlanılamadı.' }; }
  }

  // Sayfadaki "Takım kaydı: ..." satırının metni
  function satirMetni(sonuc, n) {
    if (sonuc.atlandi && sonuc.hata && sonuc.hata !== 'ayar yok')
      return 'Takım kaydı: kapalı. ' + sonuc.hata;
    if (sonuc.atlandi) return 'Takım kaydı: kapalı (Supabase ayarı yok, oyun yalnızca bu tarayıcıda kayıt tutuyor).';
    if (sonuc.hata) return 'Takım kaydı: şu an alınamadı (' + sonuc.hata + ')';
    if (!sonuc.adet) return 'Takım kaydı: henüz görev yok.';
    return 'Takım kaydı: son ' + sonuc.adet + ' görevde %' + sonuc.yuzde + ' başarı';
  }

  var API = { durum: durum, gonder: gonder, sonGorevler: sonGorevler, satirMetni: satirMetni,
    ayar: ayar, anahtarRolu: anahtarRolu };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Takim = API;
})(typeof window !== 'undefined' ? window : globalThis);
