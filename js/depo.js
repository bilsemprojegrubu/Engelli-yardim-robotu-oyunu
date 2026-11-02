/*
 * depo.js — Tarayıcıda (localStorage) saklanan şeyler: oyuncu kodu, ayarlar, görev kayıtları.
 * localStorage kapalıysa (gizli pencere vb.) oyun yine çalışır, sadece kayıtlar sayfa kapanınca gider.
 */
(function (kok) {
  'use strict';
  var S = kok.Sabitler || require('./sabitler.js');

  var ANAHTAR = { kod: 'robotev_oyuncu_kodu', ayar: 'robotev_ayarlar', kayit: 'robotev_kayitlar' };
  var bellek = {};   // localStorage çalışmazsa yedek

  function oku(anahtar) {
    try { var v = kok.localStorage.getItem(anahtar); return v === null ? (bellek[anahtar] || null) : v; }
    catch (e) { return bellek[anahtar] || null; }
  }
  function yaz(anahtar, deger) {
    bellek[anahtar] = deger;
    try { kok.localStorage.setItem(anahtar, deger); } catch (e) { /* sessizce geç */ }
  }

  // Kişisel bilgi içermeyen rastgele oyuncu kodu: OYN-K7P2QX9M
  function oyuncuKodu() {
    var kod = oku(ANAHTAR.kod);
    if (kod) return kod;
    var harfler = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
    var rnd = new Uint8Array(8);
    if (kok.crypto && kok.crypto.getRandomValues) kok.crypto.getRandomValues(rnd);
    else for (var i = 0; i < 8; i++) rnd[i] = Math.floor(Math.random() * 256);
    for (var j = 0; j < 8; j++) s += harfler[rnd[j] % harfler.length];
    kod = 'OYN-' + s;
    yaz(ANAHTAR.kod, kod);
    return kod;
  }

  function ayarlar() {
    var a = Object.assign({}, S.VARSAYILAN_AYARLAR);
    try {
      var kayitli = JSON.parse(oku(ANAHTAR.ayar) || '{}');
      Object.keys(a).forEach(function (k) {
        var sn = S.AYAR_SINIRLARI[k];
        if (typeof kayitli[k] === 'number' && kayitli[k] >= sn.min && kayitli[k] <= sn.max) a[k] = kayitli[k];
      });
    } catch (e) { /* bozuksa varsayılanlar */ }
    return a;
  }
  function ayarlariKaydet(a) { yaz(ANAHTAR.ayar, JSON.stringify(a)); }

  function kayitlar() {
    try { var l = JSON.parse(oku(ANAHTAR.kayit) || '[]'); return Array.isArray(l) ? l : []; }
    catch (e) { return []; }
  }
  function kayitEkle(k) {
    var l = kayitlar();
    l.push(k);
    if (l.length > S.YEREL_KAYIT_SINIRI) l = l.slice(l.length - S.YEREL_KAYIT_SINIRI);
    yaz(ANAHTAR.kayit, JSON.stringify(l));
    return l;
  }
  function kayitlariSil() { yaz(ANAHTAR.kayit, '[]'); }

  var API = { oyuncuKodu: oyuncuKodu, ayarlar: ayarlar, ayarlariKaydet: ayarlariKaydet,
    kayitlar: kayitlar, kayitEkle: kayitEkle, kayitlariSil: kayitlariSil };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Depo = API;
})(typeof window !== 'undefined' ? window : globalThis);
