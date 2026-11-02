/*
 * planlayici.js — KATMAN 2: görevi adımlara bölme.
 *
 * Girdi : anlayıcıdan gelen görev  {tur:'getir', esya:'havlu', ...}
 *         + robotun "gözlemi" (dünyanın bir kopyası)
 * Çıktı : { adimlar: [ {beceri:'git', girdi:{...}, aciklama:'...'}, ... ],
 *           notlar: [...], bilgi: '...' , hata: '...' }
 *
 * Plan sadece beceri ADLARINI ve girdilerini üretir (beceriler.js'e bak).
 * Donanım hakkında hiçbir şey bilmez; bu yüzden gerçek robotta aynen kullanılabilir.
 * Görevler sırayla planlanır: ikinci görevin planı birincisi bittikten sonra yapılır.
 */
(function (kok) {
  'use strict';
  var Dunya = kok.Dunya || require('./dunya.js');
  var ODA_ADLARI = Dunya.ODA_ADLARI;

  function adim(beceri, girdi, aciklama) { return { beceri: beceri, girdi: girdi, aciklama: aciklama }; }

  function mesafe(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

  // Anlayıcının "yer" tanımını beceri katmanının hedef biçimine çevirir
  function yerHedefi(y) {
    return y.tip === 'esya' ? { tur: 'esya', esya: y.id } : { tur: 'aygit', aygit: y.id };
  }

  function kullaniciOdasi(g) {
    var h = Dunya.hucre(g.kullanici);
    return Dunya.odaBul(g, h.x, h.y);
  }

  // Robot elinde bir şey tutuyorsa ve bu iş onu kullanmayacaksa önce bıraksın
  function onHazirlik(g, tutulacak) {
    var t = g.robot.tuttugu;
    if (t && t !== tutulacak) return [adim('birak', {}, 'Elindekini bırak')];
    return [];
  }

  // Durumu istenen durumla aynı olan kapıları ele; kalanlar arasından robota en yakını seç
  function kapiSec(g, gorev, acilacak) {
    var rob = Dunya.hucre(g.robot);
    var uygun = g.kapilar.filter(function (k) { return k.acik !== acilacak; });
    var kapsam;
    if (gorev.oda) kapsam = uygun.filter(function (k) { return k.odalar.indexOf(gorev.oda) >= 0; });
    else {
      var ko = kullaniciOdasi(g);
      kapsam = uygun.filter(function (k) { return k.odalar.indexOf(ko) >= 0; });
      if (!kapsam.length) kapsam = uygun;
    }
    kapsam.sort(function (a, b) { return mesafe(a, rob) - mesafe(b, rob); });
    return kapsam[0] || null;
  }

  var PLANLAR = {
    getir: function (g, gorev) {
      var e = g.esyalar[gorev.esya], a = [], notlar = [];
      a = a.concat(onHazirlik(g, e.id));
      if (gorev.kaynakOda) {
        var gercek = Dunya.odaBul(g, Dunya.esyaHucresi(g, e.id).x, Dunya.esyaHucresi(g, e.id).y);
        if (!e.tasinan && gercek && gercek !== gorev.kaynakOda)
          notlar.push(e.ad + ' ' + ODA_ADLARI[gorev.kaynakOda].yalin + 'da değil, ' + ODA_ADLARI[gercek].yalin + 'da gördüm.');
      }
      if (g.robot.tuttugu !== e.id) {
        a.push(adim('git', { hedef: { tur: 'esya', esya: e.id } }, e.ad + ' yanına git'));
        a.push(adim('tut', { esya: e.id }, e.ad + ' tut'));
      }
      if (gorev.kapakAc) {
        if (e.tur !== 'sise') notlar.push(e.ad + ' kapağı yok, açmayı atlıyorum.');
        else if (e.kapakAcik) notlar.push('Kapak zaten açık.');
        else a.push(adim('kapakAc', { esya: e.id }, 'Kapağı aç'));
      }
      if (gorev.hedefOda) {
        a.push(adim('git', { hedef: { tur: 'oda', oda: gorev.hedefOda } }, ODA_ADLARI[gorev.hedefOda].yonelme + ' götür'));
      } else {
        a.push(adim('git', { hedef: { tur: 'kullanici' } }, 'Sana getir'));
      }
      a.push(adim('birak', {}, e.ad + ' bırak'));
      return { adimlar: a, notlar: notlar };
    },

    kapakAc: function (g) {
      var e = g.esyalar.su;
      if (e.kapakAcik) return { adimlar: [], bilgi: 'Şişenin kapağı zaten açık.' };
      var a = onHazirlik(g, e.id);
      if (g.robot.tuttugu !== e.id) {
        a.push(adim('git', { hedef: { tur: 'esya', esya: e.id } }, 'Su şişesinin yanına git'));
        a.push(adim('tut', { esya: e.id }, 'Su şişesini tut'));
      }
      a.push(adim('kapakAc', { esya: e.id }, 'Kapağı aç'));
      a.push(adim('birak', {}, 'Şişeyi bırak'));
      return { adimlar: a };
    },

    isik: function (g, gorev) {
      var odalar;
      if (gorev.oda === 'hepsi') odalar = Object.keys(g.odalar);
      else if (gorev.oda === 'kullanici') odalar = [kullaniciOdasi(g)];
      else odalar = [gorev.oda];
      var a = onHazirlik(g, null), notlar = [];
      // Robota en yakın odadan başla (basit sıralama)
      var rob = Dunya.hucre(g.robot);
      odalar.sort(function (x, y) { return mesafe(g.odalar[x].anahtar, rob) - mesafe(g.odalar[y].anahtar, rob); });
      odalar.forEach(function (o) {
        var oda = g.odalar[o];
        if (oda.isik === gorev.acik) { notlar.push(oda.ad + ' ışığı zaten ' + (gorev.acik ? 'açık' : 'kapalı') + '.'); return; }
        a.push(adim('git', { hedef: { tur: 'anahtar', oda: o } }, oda.ad + ' anahtarına git'));
        a.push(adim('isik', { oda: o, acik: gorev.acik }, oda.ad + ' ışığını ' + (gorev.acik ? 'aç' : 'kapat')));
      });
      if (a.length && a.every(function (s) { return s.beceri === 'birak'; })) a = [];
      return a.length ? { adimlar: a, notlar: notlar } : { adimlar: [], bilgi: notlar.join(' ') };
    },

    tv: function (g, gorev) {
      if (g.aygitlar.tv.acik === gorev.acik) return { adimlar: [], bilgi: 'Televizyon zaten ' + (gorev.acik ? 'açık' : 'kapalı') + '.' };
      var a = onHazirlik(g, null);
      a.push(adim('git', { hedef: { tur: 'aygit', aygit: 'tv' } }, 'Televizyonun yanına git'));
      a.push(adim('tv', { acik: gorev.acik }, 'Televizyonu ' + (gorev.acik ? 'aç' : 'kapat')));
      return { adimlar: a };
    },

    kapiAc: function (g, gorev) { return kapiPlani(g, gorev, true); },
    kapiKapat: function (g, gorev) { return kapiPlani(g, gorev, false); },

    git: function (g, gorev) {
      var a = onHazirlik(g, g.robot.tuttugu);
      if (gorev.yer) a.push(adim('git', { hedef: yerHedefi(gorev.yer) }, 'Hedefin yanına git'));
      else a.push(adim('git', { hedef: { tur: 'oda', oda: gorev.oda } }, ODA_ADLARI[gorev.oda].yonelme + ' git'));
      return { adimlar: a };
    },

    yanimaGel: function (g) {
      return { adimlar: [adim('git', { hedef: { tur: 'kullanici' } }, 'Yanına git')] };
    },

    gotur: function (g, gorev) {
      if (gorev.hedefYer) {                                   // mobilya ya da eşyanın yanına
        var ay = onHazirlik(g, null);
        ay.push(adim('git', { hedef: { tur: 'kullanici' } }, 'Yanına git'));
        ay.push(adim('eslikEt', { hedef: yerHedefi(gorev.hedefYer) }, 'Seni hedefin yanına götür'));
        return { adimlar: ay };
      }
      if (kullaniciOdasi(g) === gorev.hedefOda)
        return { adimlar: [], bilgi: 'Zaten ' + ODA_ADLARI[gorev.hedefOda].yalin + 'dasın.' };
      var a = onHazirlik(g, null);
      a.push(adim('git', { hedef: { tur: 'kullanici' } }, 'Yanına git'));
      a.push(adim('eslikEt', { hedefOda: gorev.hedefOda }, 'Seni ' + ODA_ADLARI[gorev.hedefOda].yonelme + ' götür'));
      return { adimlar: a };
    },

    buzdolabiAc: function (g) {
      var f = g.aygitlar.buzdolabi;
      if (f.acik) return { adimlar: [], bilgi: 'Buzdolabının kapısı zaten açık.' };
      var a = onHazirlik(g, null);
      a.push(adim('git', { hedef: { tur: 'hucre', x: f.onHucre.x, y: f.onHucre.y } }, 'Buzdolabının önüne git'));
      a.push(adim('tut', { esya: 'buzdolabi_tutacagi' }, 'Kapı tutacını tut (sadece tutar)'));
      a.push(adim('tekerlekleCek', { nesne: 'buzdolabi' }, 'Tekerlekle geri giderek kapıyı aç'));
      a.push(adim('birak', {}, 'Tutacı bırak'));
      return { adimlar: a };
    }
  };

  function kapiPlani(g, gorev, ac) {
    var k = kapiSec(g, gorev, ac);
    var yalinOda = gorev.oda ? ODA_ADLARI[gorev.oda].iyelik + ' ' : '';
    if (!k) return { adimlar: [], bilgi: 'Zaten ' + (gorev.oda ? yalinOda : 'hepsi ') + (ac ? 'açık.' : 'kapalı.') };
    var a = onHazirlik(g, null);
    a.push(adim('git', { hedef: { tur: 'kapi', kapi: k.id } }, 'Kapının yanına git'));
    a.push(adim(ac ? 'kapiAc' : 'kapiKapat', { kapi: k.id }, 'Kapıyı ' + (ac ? 'aç' : 'kapat')));
    return { adimlar: a };
  }

  function planla(gorev, gozlem) {
    var f = PLANLAR[gorev.tur];
    if (!f) return { adimlar: [], hata: 'Bu görevi planlayamıyorum: ' + gorev.tur };
    var p = f(gozlem, gorev);
    p.notlar = p.notlar || [];
    return p;
  }

  var API = { planla: planla };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Planlayici = API;
})(typeof window !== 'undefined' ? window : globalThis);
