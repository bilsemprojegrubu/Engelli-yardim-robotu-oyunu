/*
 * surucu_sim.js — Beceri arayüzünün (beceriler.js) SİMÜLASYON sürücüsü.
 *
 * Gerçek robota geçerken bu dosyanın yerine, aynı metotları yazan bir
 * "surucu_gercek.js" gelir (ör. kavra() motor sürücüye komut gönderir).
 * Tork hatası, tutma kayması, çekiş kuvveti gibi "fizik" burada modellenir;
 * gerçek robotta bunlar zaten donanımdan gelir.
 *
 * Seçenekler:
 *   ayarlar()          -> {kavramaTorku, hataYuzdesi, hiz}  (oyuncunun ayarları)
 *   rastgele()         -> 0..1 sayı (testte sabitlenebilir)
 *   animasyon(ms, fn, kontrol) -> Promise. fn(p) p:0..1. Her karede kontrol() çağrılmalı.
 *                          Varsayılan: anında bitir (testler için).
 *   olay(mesaj)        -> anlatım satırı (günlüğe yazılır)
 *   iptal()            -> true ise acil durdurma: sürücü 'acilDurdurma' hatası fırlatır
 */
(function (kok) {
  'use strict';
  var S = kok.Sabitler || require('./sabitler.js');
  var Dunya = kok.Dunya || require('./dunya.js');

  var PI = Math.PI;

  function acilHata() {
    var e = new Error('Acil durdurma');
    e.acilDurdurma = true;
    return e;
  }

  // 3,5 -> "3,5" (arayüz Türkçe)
  function sayi(n, basamak) { return Number(n).toFixed(basamak === undefined ? 1 : basamak).replace('.', ','); }

  function aciFarki(a, b) {            // a'dan b'ye en kısa dönüş (radyan)
    var f = (b - a) % (2 * PI);
    if (f > PI) f -= 2 * PI;
    if (f < -PI) f += 2 * PI;
    return f;
  }

  function SimSurucu(dunya, secenek) {
    var d = dunya;
    var sec = secenek || {};
    var ayarlar = sec.ayarlar || function () { return S.VARSAYILAN_AYARLAR; };
    var rastgele = sec.rastgele || Math.random;
    var olay = sec.olay || function () {};
    var animasyonFn = sec.animasyon || async function (ms, fn) { fn(1); };
    var self = this;
    self.iptal = sec.iptal || function () { return false; };

    function kontrol() { if (self.iptal()) throw acilHata(); }
    async function anim(ms, fn) {
      kontrol();
      await animasyonFn(ms / Math.max(0.1, ayarlar().hiz), fn, kontrol);
      kontrol();
    }
    function mesafe(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
    function hata(neden, ek) { return Object.assign({ basari: false, neden: neden }, ek || {}); }

    // ---- Gözlem ----
    this.algi = function () { return Dunya.goruntu(d); };
    this.kavramaTorkuSiniri = function () { return ayarlar().kavramaTorku; };

    // ---- Konum ve hareket ----
    this.ilerle = async function (x, y, opts) {
      var r = d.robot, bas = Dunya.hucre(r);
      if (!Dunya.yurunebilir(d, x, y)) return hata('Önümde engel var.');
      if (mesafe(bas, { x: x, y: y }) !== 1) return hata('Hedef hücre yan hücre değil.');
      var kapi = Dunya.kapiBul(d, x, y);
      if (kapi && !kapi.acik) return hata('Kapı kapalı.');
      var x0 = r.x, y0 = r.y, yon0 = r.yon;
      var yon1 = Math.atan2(y - bas.y, x - bas.x);
      var dy = aciFarki(yon0, yon1);
      var u = d.kullanici, ux0 = u.x, uy0 = u.y;
      try {
        await anim(230, function (p) {
          r.x = x0 + (x + 0.5 - x0) * p;
          r.y = y0 + (y + 0.5 - y0) * p;
          r.yon = yon0 + dy * Math.min(1, p * 3);
          if (opts && opts.eslik) {                    // kullanıcı robotun eski yerine doğru gelir
            u.x = ux0 + (x0 - ux0) * p; u.y = uy0 + (y0 - uy0) * p;
          }
        });
      } catch (e) { if (e.acilDurdurma) self.hizala(); throw e; }
      r.x = x + 0.5; r.y = y + 0.5;
      return { basari: true };
    };

    // ---- Tutma ----
    this.kavra = async function (id) {
      var r = d.robot, rh = Dunya.hucre(r);
      if (r.tuttugu) return hata('Robotun elinde zaten bir şey var.');
      var hataOrani = ayarlar().hataYuzdesi / 100;
      var kayarMi = rastgele() < hataOrani * S.TUTMA_KAYMA_CARPANI;

      if (id === 'buzdolabi_tutacagi') {
        var f = d.aygitlar.buzdolabi;
        if (rh.x !== f.onHucre.x || rh.y !== f.onHucre.y) return hata('Buzdolabının önünde değilim.');
        var yon0 = r.yon, dy = aciFarki(yon0, -PI / 2);
        await anim(350, function (p) { r.yon = yon0 + dy * p; });
        await anim(300, function () {});
        if (kayarMi) return hata('Tutaç elimden kaydı (hata payı %' + sayi(ayarlar().hataYuzdesi, 0) + ').', { kaydi: true });
        r.tuttugu = id;
        return { basari: true };
      }

      var e = d.esyalar[id];
      if (!e) return hata('Böyle bir eşya yok.');
      if (e.tasinan) return hata('Bu eşya zaten tutuluyor.');
      if (mesafe(rh, { x: e.x, y: e.y }) > 1) return hata(e.ad + ' çok uzakta, tutamadım.');
      await anim(400, function () {});
      if (kayarMi) return hata(e.ad + ' tutarken kaydı (hata payı %' + sayi(ayarlar().hataYuzdesi, 0) + ').', { kaydi: true });
      e.tasinan = true;
      r.tuttugu = id;
      return { basari: true };
    };

    this.birak = async function () {
      var r = d.robot, id = r.tuttugu;
      if (!id) return { basari: true };
      await anim(250, function () {});
      r.tuttugu = null;
      if (id === 'buzdolabi_tutacagi') return { basari: true };
      var e = d.esyalar[id], h = Dunya.hucre(r);
      e.tasinan = false; e.x = h.x; e.y = h.y;
      // Oyun kuralı: şişe sana teslim edilince içilir/kapak yeniden sıkılır, yeni rastgele tork gelir.
      if (e.tur === 'sise' && e.kapakAcik && mesafe(h, Dunya.hucre(d.kullanici)) <= 2) {
        e.kapakAcik = false;
        e.kapakTorku = Dunya.yeniKapakTorku(rastgele);
        olay('Şişe sana teslim edildi. (Oyun kuralı: kapak yeniden sıkıldı, yeni kapak torku ' + sayi(e.kapakTorku, 2) + ' N·m.)');
      }
      return { basari: true };
    };

    // ---- Kapak açma ----
    this.kapakCevir = async function (id) {
      var r = d.robot, e = d.esyalar[id];
      if (!e || e.tur !== 'sise') return hata('Bu eşyanın kapağı yok.');
      if (r.tuttugu !== id) return hata('Önce şişeyi tutmalıyım.');
      if (e.kapakAcik) return { basari: true };
      var a = ayarlar();
      var gercek = e.kapakTorku;
      // Robot kapak torkunu ölçer; ölçümde "hata yüzdesi" kadar sapma olur.
      var sapma = (rastgele() * 2 - 1) * a.hataYuzdesi / 100;
      var olculen = gercek * (1 + sapma);
      var uygulanan = Math.min(a.kavramaTorku, olculen * S.TORK_EMNIYET_PAYI);
      await anim(700, function () {});
      var ozet = 'ölçülen ' + sayi(olculen, 2) + ', uygulanan ' + sayi(uygulanan, 2) + ' N·m';
      if (gercek > a.kavramaTorku) {
        return hata('Kapak açılmadı: kapak torku ' + sayi(gercek, 2) + ' N·m, robotun kavrama torku ' +
          sayi(a.kavramaTorku, 2) + ' N·m\'den büyük.', { yeniden: false, gercek: gercek });
      }
      if (uygulanan < gercek) {
        return hata('Kapak açılmadı: ölçüm hatası yüzünden tork yetmedi (gerçek ' + sayi(gercek, 2) + ' N·m, ' + ozet + ').',
          { yeniden: true, gercek: gercek });
      }
      e.kapakAcik = true;
      olay('Kapak açıldı (gerçek tork ' + sayi(gercek, 2) + ' N·m, ' + ozet + ').');
      return { basari: true, gercek: gercek };
    };

    // ---- Kapı ----
    this.kapiHareketi = async function (kapiId, acik) {
      var k = d.kapilar.filter(function (z) { return z.id === kapiId; })[0];
      if (!k) return hata('Böyle bir kapı yok.');
      if (!acik) {
        var rh = Dunya.hucre(d.robot), uh = Dunya.hucre(d.kullanici);
        if ((rh.x === k.x && rh.y === k.y) || (uh.x === k.x && uh.y === k.y)) return hata('Kapı aralığında biri var, kapatamam.');
      }
      var a0 = k.aci, a1 = acik ? 1 : 0;
      try {
        await anim(500, function (p) { k.aci = a0 + (a1 - a0) * p; });
      } catch (e) { if (e.acilDurdurma) k.aci = k.acik ? 1 : 0; throw e; }
      k.aci = a1; k.acik = acik;
      return { basari: true };
    };

    // ---- Düğmeler ----
    this.dugmeBas = async function (hedef, acik) {
      await anim(300, function () {});
      if (hedef === 'tv') { d.aygitlar.tv.acik = acik; return { basari: true }; }
      if (hedef.indexOf('isik:') === 0) {
        var oda = d.odalar[hedef.slice(5)];
        if (!oda) return hata('Böyle bir oda yok.');
        oda.isik = acik;
        return { basari: true };
      }
      return hata('Bilinmeyen düğme: ' + hedef);
    };

    // ---- Buzdolabı: kol sadece tutar, kapıyı TEKERLEK açar ----
    this.tekerlekleCek = async function (nesne) {
      if (nesne !== 'buzdolabi') return hata('Bunu tekerlekle çekemem: ' + nesne);
      var r = d.robot, f = d.aygitlar.buzdolabi;
      if (r.tuttugu !== 'buzdolabi_tutacagi') return hata('Önce tutacı tutmalıyım.');

      // Çekiş yeter mi? En çok çekebileceği kuvvet = sürtünme × kütle × g (en hafif kütleyle).
      var cekis = S.TEKER_SURTUNME_KATSAYISI * S.ROBOT_KUTLESI_MIN_KG * S.YERCEKIMI;
      if (cekis < S.BUZDOLABI_CEKME_KUVVETI_N)
        return hata('Tekerlekler kayar: çekiş en fazla ' + sayi(cekis, 0) + ' N, kapı için ' +
          sayi(S.BUZDOLABI_CEKME_KUVVETI_N, 0) + ' N gerekiyor.');

      // Tutaç, menteşe etrafında yay çizer. Robot geri gider ve hafif döner.
      var maxAci = S.BUZDOLABI_ACMA_ACISI_DERECE * PI / 180;
      var KOL = 0.5;                                    // robot merkezi ile tutaç arası (hücre)
      function poz(t) {
        var hx = f.mentese.x - f.tutacMesafesi * Math.cos(t);
        var hy = f.mentese.y + f.tutacMesafesi * Math.sin(t);
        var yon = -PI / 2 + S.BUZDOLABI_DONUS_ORANI * t;
        return { x: hx - KOL * Math.cos(yon), y: hy - KOL * Math.sin(yon), yon: yon };
      }
      // Yolda engel var mı?
      for (var i = 0; i <= 20; i++) {
        var q = poz(maxAci * i / 20);
        var hx = Math.floor(q.x), hy = Math.floor(q.y);
        if (!Dunya.yurunebilir(d, hx, hy) || Dunya.kapiBul(d, hx, hy))
          return hata('Kapının açılacağı yerde engel var; geri gidemiyorum.');
      }

      var oncekiAci = f.aci;
      try {
        await anim(2400, function (p) {
          var t = maxAci * p, q = poz(t);
          f.aci = t * 180 / PI;
          r.x = q.x; r.y = q.y; r.yon = q.yon;
        });
      } catch (e) { if (e.acilDurdurma) { self.hizala(); } throw e; }
      f.aci = S.BUZDOLABI_ACMA_ACISI_DERECE; f.acik = true;
      olay('Kapı yay çizerek açıldı: robot geri gitti ve ' + sayi(S.BUZDOLABI_DONUS_ORANI * S.BUZDOLABI_ACMA_ACISI_DERECE, 0) + '° döndü.');
      return { basari: true };
    };

    // Acil durdurmadan sonra: robotu hücre ortasına oturt, yarım kalan işleri toparla.
    this.hizala = function () {
      var r = d.robot, h = Dunya.hucre(r);
      if (Dunya.yurunebilir(d, h.x, h.y)) { r.x = h.x + 0.5; r.y = h.y + 0.5; }
      if (r.tuttugu === 'buzdolabi_tutacagi') r.tuttugu = null;
      var f = d.aygitlar.buzdolabi;
      if (!f.acik) f.aci = 0;                          // yarım açılan kapı tekrar kapanır (varsayım)
    };
  }

  var API = { SimSurucu: SimSurucu, sayi: sayi };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.SurucuSim = API;
})(typeof window !== 'undefined' ? window : globalThis);
