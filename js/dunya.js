/*
 * dunya.js — 4 odalı evin modeli (saf veri + küçük yardımcılar, çizim yok).
 *
 * Koordinatlar: ızgara hücresi (x, y); y aşağı doğru artar ("kuzey" = -y).
 * Robot ve kullanıcının konumu hücre MERKEZİ olarak tutulur (ör. 6.5, 5.5).
 * Bir konumun hücresi = Math.floor(x), Math.floor(y).
 */
(function (kok) {
  'use strict';
  var S = kok.Sabitler || require('./sabitler.js');

  var GENISLIK = 17, YUKSEKLIK = 13;

  // Odalar: x0..x1, y0..y1 (dahil). anahtar: ışık anahtarının yanında durulan hücre.
  var ODALAR = {
    salon:  { ad: 'Salon',       x0: 0, y0: 0, x1: 7,  y1: 5,  anahtar: { x: 7, y: 4, yon: 'd' } },
    mutfak: { ad: 'Mutfak',      x0: 9, y0: 0, x1: 16, y1: 5,  anahtar: { x: 9, y: 4, yon: 'b' } },
    yatak:  { ad: 'Yatak odası', x0: 0, y0: 7, x1: 7,  y1: 12, anahtar: { x: 6, y: 7, yon: 'k' } },
    banyo:  { ad: 'Banyo',       x0: 9, y0: 7, x1: 16, y1: 12, anahtar: { x: 9, y: 8, yon: 'b' } }
  };

  // Oda adlarının Türkçe halleri (cümle kurmak için)
  var ODA_ADLARI = {
    salon:  { yalin: 'salon',       yonelme: 'salona',       iyelik: 'salonun',       belirtme: 'salonu' },
    mutfak: { yalin: 'mutfak',      yonelme: 'mutfağa',      iyelik: 'mutfağın',      belirtme: 'mutfağı' },
    yatak:  { yalin: 'yatak odası', yonelme: 'yatak odasına', iyelik: 'yatak odasının', belirtme: 'yatak odasını' },
    banyo:  { yalin: 'banyo',       yonelme: 'banyoya',      iyelik: 'banyonun',      belirtme: 'banyoyu' }
  };

  // Kapılar: duvar yönü 'dikey' ya da 'yatay'.
  var KAPI_TANIMLARI = [
    { id: 'salon_mutfak', x: 8,  y: 3, duvar: 'dikey', odalar: ['salon', 'mutfak'] },
    { id: 'salon_yatak',  x: 3,  y: 6, duvar: 'yatay', odalar: ['salon', 'yatak'] },
    { id: 'mutfak_banyo', x: 12, y: 6, duvar: 'yatay', odalar: ['mutfak', 'banyo'] },
    { id: 'yatak_banyo',  x: 8,  y: 9, duvar: 'dikey', odalar: ['yatak', 'banyo'] }
  ];

  // Mobilyalar (üstünden geçilemez). w/h: hücre cinsinden genişlik/yükseklik.
  var MOBILYALAR = [
    { id: 'kanepe',   ad: 'Kanepe',    x: 1,  y: 2,  w: 4, h: 1, renk: '#9aa7c7' },
    { id: 'sehpa',    ad: 'Sehpa',     x: 2,  y: 4,  w: 2, h: 1, renk: '#b08a63' },
    { id: 'tv',       ad: 'TV',        x: 2,  y: 0,  w: 2, h: 1, renk: '#2b2f3a' },
    { id: 'tezgah',   ad: 'Tezgâh',    x: 10, y: 0,  w: 3, h: 1, renk: '#b9a98f' },
    { id: 'buzdolabi', ad: 'Buzdolabı', x: 13, y: 0,  w: 2, h: 1, renk: '#dfe5ea' },
    { id: 'masa',     ad: 'Masa',      x: 10, y: 3,  w: 2, h: 1, renk: '#b08a63' },
    { id: 'yatak',    ad: 'Yatak',     x: 1,  y: 9,  w: 2, h: 2, renk: '#c9a7c9' },
    { id: 'komodin',  ad: 'Komodin',   x: 3,  y: 9,  w: 1, h: 1, renk: '#b08a63' },
    { id: 'lavabo',   ad: 'Lavabo',    x: 10, y: 12, w: 2, h: 1, renk: '#cfe3ee' },
    { id: 'klozet',   ad: 'Klozet',    x: 9,  y: 12, w: 1, h: 1, renk: '#e8eef2' },
    { id: 'kuvet',    ad: 'Küvet',     x: 14, y: 11, w: 3, h: 2, renk: '#cfe3ee' },
    { id: 'havluluk', ad: 'Havluluk',  x: 16, y: 8,  w: 1, h: 1, renk: '#a8b5bd' }
  ];

  function rastgeleAralik(rastgele, a, b) { return a + (b - a) * rastgele(); }

  // Şişenin kapak torkunu rastgele seçer (2 ondalık)
  function yeniKapakTorku(rastgele) {
    var t = rastgeleAralik(rastgele, S.KAPAK_TORKU_MIN_NM, S.KAPAK_TORKU_MAX_NM);
    return Math.round(t * 100) / 100;
  }

  /*
   * Yeni bir dünya kurar. rastgele: 0..1 arası sayı veren fonksiyon (testte sabitlenebilir).
   */
  function kur(rastgele) {
    rastgele = rastgele || Math.random;
    var d = {
      genislik: GENISLIK, yukseklik: YUKSEKLIK,
      odalar: {}, kapilar: [], mobilyalar: MOBILYALAR.map(function (m) { return Object.assign({}, m); }),
      esyalar: {}, aygitlar: {}, robot: {}, kullanici: {}
    };

    // Odalar (ışıklar açık başlar)
    Object.keys(ODALAR).forEach(function (id) {
      var o = ODALAR[id];
      d.odalar[id] = {
        id: id, ad: o.ad, x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1,
        anahtar: Object.assign({}, o.anahtar), isik: true
      };
    });

    // Kapılar: her biri rastgele açık ya da kapalı
    d.kapilar = KAPI_TANIMLARI.map(function (k) {
      var acik = rastgele() < 0.5;
      return Object.assign({}, k, { odalar: k.odalar.slice(), acik: acik, aci: acik ? 1 : 0 });
    });

    // Engel haritası: duvar + mobilya
    d.engel = [];
    for (var y = 0; y < YUKSEKLIK; y++) {
      d.engel.push([]);
      for (var x = 0; x < GENISLIK; x++) d.engel[y].push(odaBulKoordinat(x, y) === null);
    }
    d.kapilar.forEach(function (k) { d.engel[k.y][k.x] = false; });
    d.mobilyalar.forEach(function (m) {
      for (var yy = m.y; yy < m.y + m.h; yy++)
        for (var xx = m.x; xx < m.x + m.w; xx++) d.engel[yy][xx] = true;
    });

    // Eşyalar
    d.esyalar = {
      su:       { id: 'su',       ad: 'Su şişesi',           kisa: 'Su', tur: 'sise', x: 11, y: 0,  kapakTorku: yeniKapakTorku(rastgele), kapakAcik: false, renk: '#4aa3df' },
      kumanda:  { id: 'kumanda',  ad: 'Kumanda',             kisa: 'Ku', tur: 'esya', x: 3,  y: 4,  renk: '#444' },
      ilac:     { id: 'ilac',     ad: 'İlaç kutusu',         kisa: 'İl', tur: 'esya', x: 3,  y: 9,  renk: '#d9534f' },
      havlu:    { id: 'havlu',    ad: 'Havlu',               kisa: 'Ha', tur: 'esya', x: 16, y: 8,  renk: '#e8a33d' },
      sandalye: { id: 'sandalye', ad: 'Tekerlekli sandalye', kisa: 'Sa', tur: 'buyuk', x: 5, y: 10, renk: '#6c757d' }
    };
    Object.keys(d.esyalar).forEach(function (id) { d.esyalar[id].tasinan = false; });

    // Cihazlar
    d.aygitlar = {
      tv: { id: 'tv', ad: 'Televizyon', acik: false },
      buzdolabi: {
        id: 'buzdolabi', ad: 'Buzdolabı', x: 13, y: 0, w: 2,
        onHucre: { x: 13, y: 1 },      // robotun durup tutacı tuttuğu hücre
        mentese: { x: 15, y: 1 },      // kapının menteşe noktası (hücre koordinatı)
        kapiUzunlugu: 2, tutacMesafesi: 1.5,
        aci: 0, acik: false            // aci: derece
      }
    };

    // Robot ve kullanıcı salonda başlar
    d.robot = { x: 6.5, y: 5.5, yon: 0, tuttugu: null };
    d.kullanici = { x: 5.5, y: 4.5 };
    return d;
  }

  // ---- Yardımcılar ----
  function odaBulKoordinat(x, y) {
    var ids = Object.keys(ODALAR);
    for (var i = 0; i < ids.length; i++) {
      var o = ODALAR[ids[i]];
      if (x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1) return ids[i];
    }
    return null;
  }

  function hucre(p) { return { x: Math.floor(p.x), y: Math.floor(p.y) }; }
  function merkez(h) { return { x: h.x + 0.5, y: h.y + 0.5 }; }

  function icerde(d, x, y) { return x >= 0 && y >= 0 && x < d.genislik && y < d.yukseklik; }
  function yurunebilir(d, x, y) { return icerde(d, x, y) && !d.engel[y][x]; }
  function kapiBul(d, x, y) {
    for (var i = 0; i < d.kapilar.length; i++)
      if (d.kapilar[i].x === x && d.kapilar[i].y === y) return d.kapilar[i];
    return null;
  }

  // Bir hücrenin odası. Kapı hücresindeyse komşu bir odayı verir.
  function odaBul(d, x, y) {
    var o = odaBulKoordinat(x, y);
    if (o) return o;
    var k = kapiBul(d, x, y);
    if (k) return k.odalar[0];
    return null;
  }

  // Odanın ortasına en yakın boş hücre
  function odaMerkezi(d, odaId) {
    var o = d.odalar[odaId];
    var cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2;
    var en = null, enMesafe = Infinity;
    for (var y = o.y0; y <= o.y1; y++)
      for (var x = o.x0; x <= o.x1; x++) {
        if (d.engel[y][x]) continue;
        var m = Math.abs(x - cx) + Math.abs(y - cy);
        if (m < enMesafe) { enMesafe = m; en = { x: x, y: y }; }
      }
    return en;
  }

  // Bir eşyanın şu anki hücresi (robot taşıyorsa robotun hücresi)
  function esyaHucresi(d, id) {
    var e = d.esyalar[id];
    if (e.tasinan) return hucre(d.robot);
    return { x: e.x, y: e.y };
  }

  // Aygıtın (TV, buzdolabı) kapladığı hücreler
  function aygitHucreleri(d, id) {
    var m = d.mobilyalar.filter(function (m) { return m.id === id; })[0];
    var liste = [];
    for (var y = m.y; y < m.y + m.h; y++)
      for (var x = m.x; x < m.x + m.w; x++) liste.push({ x: x, y: y });
    return liste;
  }

  // Beceri katmanına "gözlem" olarak verilen kopya (robot gerçek dünyayı değiştiremesin diye)
  function goruntu(d) { return JSON.parse(JSON.stringify(d)); }

  var API = {
    GENISLIK: GENISLIK, YUKSEKLIK: YUKSEKLIK,
    ODALAR: ODALAR, ODA_ADLARI: ODA_ADLARI, MOBILYALAR: MOBILYALAR,
    kur: kur, yeniKapakTorku: yeniKapakTorku,
    hucre: hucre, merkez: merkez, icerde: icerde, yurunebilir: yurunebilir,
    kapiBul: kapiBul, odaBul: odaBul, odaMerkezi: odaMerkezi,
    esyaHucresi: esyaHucresi, aygitHucreleri: aygitHucreleri, goruntu: goruntu
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Dunya = API;
})(typeof window !== 'undefined' ? window : globalThis);
