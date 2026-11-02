/*
 * beceriler.js — KATMAN 3: beceriler (git, tut, bırak, kapak aç, ışık, TV, kapı...).
 *
 * BU DOSYA, "üst beyin" ile "donanım" arasındaki SINIRDIR.
 *   - Her becerinin bir ADI, bir GİRDİ ŞEMASI ve bir açıklaması var.
 *   - Beceriler dünyaya doğrudan dokunmaz; sadece bir SÜRÜCÜ (surucu) nesnesinin
 *     aşağıdaki metotlarını çağırır. Oyunda sürücü = surucu_sim.js.
 *     Gerçek robotta aynı metotları yazan yeni bir sürücü (ör. surucu_gercek.js:
 *     seri port / ROS / mikrodenetleyici) takılır; beceriler, planlayıcı ve
 *     anlayıcı DEĞİŞMEZ.
 *
 * SÜRÜCÜ ARAYÜZÜ (hepsi Promise döndürür; acil durumda 'acilDurdurma' hatası fırlatır):
 *   algi()                         -> dünyanın gözlemi (robot, eşyalar, kapılar, aygıtlar...)
 *   kavramaTorkuSiniri()           -> robotun en çok uygulayabileceği kavrama torku (N·m)
 *   ilerle(x, y, {eslik})          -> yan hücreye bir adım. {basari, neden}
 *   kavra(nesneId)                 -> tutacı kapat. {basari, neden, kaydi?}
 *   birak()                        -> elindekini bırak. {basari, neden}
 *   kapakCevir(esyaId)             -> tutulan şişenin kapağını çevir. {basari, neden, yeniden?}
 *   kapiHareketi(kapiId, acik)     -> kapıyı aç/kapat. {basari, neden}
 *   dugmeBas(hedef, acik)          -> 'tv' ya da 'isik:<oda>' düğmesine bas. {basari, neden}
 *   tekerlekleCek(nesne)           -> tutaçtan tutup tekerlekle geri giderek aç. {basari, neden}
 */
(function (kok) {
  'use strict';
  var Dunya = kok.Dunya || require('./dunya.js');
  var YolBul = kok.YolBul || require('./yolbul.js');
  var S = kok.Sabitler || require('./sabitler.js');

  var SURUCU_ARAYUZU = ['algi', 'kavramaTorkuSiniri', 'ilerle', 'kavra', 'birak',
    'kapakCevir', 'kapiHareketi', 'dugmeBas', 'tekerlekleCek'];

  // Sürücüde eksik metot var mı? (gerçek robot sürücüsü yazarken işe yarar)
  function surucuDogrula(surucu) {
    return SURUCU_ARAYUZU.filter(function (m) { return typeof surucu[m] !== 'function'; });
  }

  var BECERILER = {};

  /*
   * girdi şeması: { alan: { tur: 'metin'|'sayi'|'mantik'|'nesne', zorunlu: true, aciklama: '...' } }
   */
  function tanimla(ad, aciklama, girdi, calistir) {
    BECERILER[ad] = { ad: ad, aciklama: aciklama, girdi: girdi, calistir: calistir };
  }

  function girdiDogrula(beceri, girdi) {
    girdi = girdi || {};
    for (var alan in beceri.girdi) {
      var sema = beceri.girdi[alan];
      var v = girdi[alan];
      if (v === undefined || v === null) {
        if (sema.zorunlu) return '"' + beceri.ad + '" becerisi için "' + alan + '" girdisi gerekli.';
        continue;
      }
      var tur = typeof v;
      if (sema.tur === 'metin' && tur !== 'string') return alan + ' metin olmalı.';
      if (sema.tur === 'sayi' && tur !== 'number') return alan + ' sayı olmalı.';
      if (sema.tur === 'mantik' && tur !== 'boolean') return alan + ' doğru/yanlış olmalı.';
      if (sema.tur === 'nesne' && tur !== 'object') return alan + ' nesne olmalı.';
    }
    return null;
  }

  // ---------- Yardımcılar ----------
  function robotHucre(g) { return Dunya.hucre(g.robot); }
  function mesafe(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
  var KOMSULAR = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];

  function yurunebilirFn(g) {
    return function (x, y) { return Dunya.yurunebilir(g, x, y); };
  }

  // Hedefin "yanındaki" yürünebilir hücreler (kendisi de dahil olabilir)
  function yanHucreler(g, hucreler, kendiDahil) {
    var sonuc = [], goruldu = {};
    hucreler.forEach(function (h) {
      KOMSULAR.forEach(function (k) {
        if (k[0] === 0 && k[1] === 0 && !kendiDahil) return;
        var x = h.x + k[0], y = h.y + k[1];
        if (!Dunya.yurunebilir(g, x, y)) return;
        if (Dunya.kapiBul(g, x, y)) return;        // kapı aralığında durma
        var key = y * g.genislik + x;
        if (goruldu[key]) return;
        goruldu[key] = true;
        sonuc.push({ x: x, y: y });
      });
    });
    return sonuc;
  }

  // Hedef tanımını hücre listesine çevirir. Hata varsa {hata} döner.
  function hedefHucreleri(g, hedef) {
    switch (hedef.tur) {
      case 'hucre': return { hucreler: [{ x: hedef.x, y: hedef.y }] };
      case 'oda': {
        var m = Dunya.odaMerkezi(g, hedef.oda);
        return m ? { hucreler: [m] } : { hata: 'Odada boş yer yok.' };
      }
      case 'esya': {
        if (!g.esyalar[hedef.esya]) return { hata: 'Böyle bir eşya yok: ' + hedef.esya };
        return { hucreler: yanHucreler(g, [Dunya.esyaHucresi(g, hedef.esya)], true) };
      }
      case 'kullanici': {
        var u = Dunya.hucre(g.kullanici);
        var yan = yanHucreler(g, [u], false);
        return { hucreler: yan.length ? yan : [u] };
      }
      case 'aygit': return { hucreler: yanHucreler(g, Dunya.aygitHucreleri(g, hedef.aygit), false) };
      case 'anahtar': {
        var o = g.odalar[hedef.oda];
        return o ? { hucreler: [{ x: o.anahtar.x, y: o.anahtar.y }] } : { hata: 'Böyle bir oda yok.' };
      }
      case 'kapi': {
        var k = g.kapilar.filter(function (z) { return z.id === hedef.kapi; })[0];
        return k ? { hucreler: yanHucreler(g, [{ x: k.x, y: k.y }], false) } : { hata: 'Böyle bir kapı yok.' };
      }
    }
    return { hata: 'Bilinmeyen hedef türü: ' + hedef.tur };
  }

  // Yolda yürü; kapalı kapıyı kendisi aç. eslik: kullanıcı da arkadan gelsin.
  async function yuru(o, hedefler, eslik) {
    var sr = o.surucu;
    for (var tur = 0; tur < 8; tur++) {                    // yol sırasında durum değişirse yeniden planla
      var g = sr.algi();
      var bas = robotHucre(g);
      var yol = YolBul.yolBul(yurunebilirFn(g), g.genislik, g.yukseklik, bas, hedefler);
      if (yol === null) return { basari: false, neden: 'Oraya giden yol bulunamadı.' };
      if (yol.length === 0) return { basari: true };
      var tamam = true;
      for (var i = 0; i < yol.length; i++) {
        var h = yol[i];
        var kapi = Dunya.kapiBul(sr.algi(), h.x, h.y);
        if (kapi && !kapi.acik) {
          o.gunluk('Kapı kapalı, açıyorum.');
          var r0 = await sr.kapiHareketi(kapi.id, true);
          if (!r0.basari) return r0;
        }
        var r = await sr.ilerle(h.x, h.y, { eslik: !!eslik });
        if (!r.basari) { tamam = false; o.gunluk('Yol değişti: ' + r.neden); break; }
      }
      if (tamam) return { basari: true };
    }
    return { basari: false, neden: 'Yolda sürekli engel çıktı.' };
  }

  // ---------- Beceriler ----------
  tanimla('git', 'Verilen yere yürür (BFS ile yol bulur, kapalı kapıyı açar).',
    { hedef: { tur: 'nesne', zorunlu: true, aciklama: '{tur:"hucre"|"oda"|"esya"|"kullanici"|"aygit"|"anahtar"|"kapi", ...}' } },
    async function (girdi, o) {
      var g = o.surucu.algi();
      var h = hedefHucreleri(g, girdi.hedef);
      if (h.hata) return { basari: false, neden: h.hata };
      if (!h.hucreler.length) return { basari: false, neden: 'Hedefin yanında durulacak yer yok.' };
      return yuru(o, h.hucreler, false);
    });

  tanimla('eslikEt', 'Kullanıcıyı yanında götürerek odanın ortasına gider.',
    { hedefOda: { tur: 'metin', zorunlu: true, aciklama: 'salon | mutfak | yatak | banyo' } },
    async function (girdi, o) {
      var g = o.surucu.algi();
      var m = Dunya.odaMerkezi(g, girdi.hedefOda);
      if (!m) return { basari: false, neden: 'Odada boş yer yok.' };
      return yuru(o, [m], true);
    });

  tanimla('tut', 'Eşyayı (ya da buzdolabı tutacını) tutar. Kayarsa tekrar dener.',
    { esya: { tur: 'metin', zorunlu: true, aciklama: 'eşya kimliği ya da "buzdolabi_tutacagi"' } },
    async function (girdi, o) {
      var son;
      for (var d = 1; d <= S.DENEME_SAYISI; d++) {
        son = await o.surucu.kavra(girdi.esya);
        if (son.basari) return son;
        if (!son.kaydi) return son;                         // kayma dışındaki hata: tekrar deneme
        o.gunluk('Tutarken kaydı' + (d < S.DENEME_SAYISI ? ', tekrar deniyorum.' : '.'));
      }
      return son;
    });

  tanimla('birak', 'Elindeki eşyayı bulunduğu yere bırakır.', {},
    async function (girdi, o) { return o.surucu.birak(); });

  tanimla('kapakAc', 'Tuttuğu şişenin kapağını çevirerek açar. Tork yetmezse nedenini söyler.',
    { esya: { tur: 'metin', zorunlu: true, aciklama: 'şişe kimliği' } },
    async function (girdi, o) {
      var son;
      for (var d = 1; d <= S.DENEME_SAYISI; d++) {
        son = await o.surucu.kapakCevir(girdi.esya);
        if (son.basari) return son;
        o.gunluk(son.neden);
        if (!son.yeniden) return son;                       // kapak torku sınırı aşıyorsa tekrar denemek boşuna
        if (d < S.DENEME_SAYISI) o.gunluk('Tekrar deniyorum.');
      }
      return son;
    });

  tanimla('isik', 'Odanın ışık anahtarına basar (robot anahtarın yanında olmalı).',
    { oda: { tur: 'metin', zorunlu: true, aciklama: 'oda kimliği' }, acik: { tur: 'mantik', zorunlu: true, aciklama: 'true=aç' } },
    async function (girdi, o) {
      var g = o.surucu.algi(), oda = g.odalar[girdi.oda];
      if (!oda) return { basari: false, neden: 'Böyle bir oda yok.' };
      if (mesafe(robotHucre(g), oda.anahtar) > 1) return { basari: false, neden: 'Anahtara yetişemedi.' };
      return o.surucu.dugmeBas('isik:' + girdi.oda, girdi.acik);
    });

  tanimla('tv', 'Televizyonu açar ya da kapatır (robot televizyonun yanında olmalı).',
    { acik: { tur: 'mantik', zorunlu: true, aciklama: 'true=aç' } },
    async function (girdi, o) {
      var g = o.surucu.algi(), r = robotHucre(g);
      var yakin = Dunya.aygitHucreleri(g, 'tv').some(function (h) { return mesafe(r, h) <= 1; });
      if (!yakin) return { basari: false, neden: 'Televizyona yetişemedi.' };
      return o.surucu.dugmeBas('tv', girdi.acik);
    });

  function kapiBecerisi(ad, acik) {
    tanimla(ad, acik ? 'Yanındaki kapıyı açar.' : 'Yanındaki kapıyı kapatır.',
      { kapi: { tur: 'metin', zorunlu: true, aciklama: 'kapı kimliği' } },
      async function (girdi, o) {
        var g = o.surucu.algi();
        var k = g.kapilar.filter(function (z) { return z.id === girdi.kapi; })[0];
        if (!k) return { basari: false, neden: 'Böyle bir kapı yok.' };
        var r = robotHucre(g);
        if (r.x === k.x && r.y === k.y) return { basari: false, neden: 'Robot kapı aralığında duruyor.' };
        if (mesafe(r, k) > 1) return { basari: false, neden: 'Kapıya yetişemedi.' };
        if (k.acik === acik) return { basari: true };
        return o.surucu.kapiHareketi(k.id, acik);
      });
  }
  kapiBecerisi('kapiAc', true);
  kapiBecerisi('kapiKapat', false);

  tanimla('tekerlekleCek', 'Tutaçtan tutarken tekerlekle geri gidip hafif dönerek kapıyı açar (kol sadece tutar).',
    { nesne: { tur: 'metin', zorunlu: true, aciklama: '"buzdolabi"' } },
    async function (girdi, o) { return o.surucu.tekerlekleCek(girdi.nesne); });

  // ---------- Dışarıya açılan arayüz ----------
  function katalog() {
    return Object.keys(BECERILER).map(function (ad) {
      var b = BECERILER[ad];
      return { ad: b.ad, aciklama: b.aciklama, girdi: b.girdi };
    });
  }

  /*
   * ortam: { surucu, gunluk(mesaj) }
   * Dönüş: { basari, neden? }. Acil durdurma hatası dışarı fırlar.
   */
  async function calistir(ad, girdi, ortam) {
    var b = BECERILER[ad];
    if (!b) return { basari: false, neden: 'Bilinmeyen beceri: ' + ad };
    var hata = girdiDogrula(b, girdi);
    if (hata) return { basari: false, neden: hata };
    var sonuc = await b.calistir(girdi || {}, ortam);
    return sonuc || { basari: true };
  }

  var API = { katalog: katalog, calistir: calistir, SURUCU_ARAYUZU: SURUCU_ARAYUZU, surucuDogrula: surucuDogrula };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Beceriler = API;
})(typeof window !== 'undefined' ? window : globalThis);
