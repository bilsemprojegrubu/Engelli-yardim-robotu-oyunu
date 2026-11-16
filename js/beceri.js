/*
 * beceri.js — Robotun BECERİLERİNİ simülasyonda deneyerek öğrenmesi (pekiştirmeli öğrenme).
 * Her becerinin kendi küçük, hafızalı beyni vardır; yol bulma beyni (ogrenme.js) ayrıdır.
 *
 *   kapak — bir el şişenin gövdesini tutar, öbür el kayışla kapağı çevirir.
 *           Az sıkarsa şişe elinde döner, çok sıkarsa şişe ezilir; kapak robotun gücünü aşıyorsa "açamıyorum" der.
 *   itme  — sahibi "şunu it" der; robot kuvveti yavaş yavaş artırır, eşya ağırsa ya da devrilme riski varsa reddeder.
 *
 * Robot gizli değerleri (kapak sıkılığı, eşyanın ağırlığı, sürtünme) BİLMEZ; sensörlerinden anlamayı öğrenir.
 * Bütün sayılar VARSAYIMDIR (TASIMA_NOTU: kapak torku 2,2–4,2 N·m, robot 20–30 kg); gerçek ölçümle değişecek.
 */
(function (kok) {
  'use strict';
  var O = (typeof module !== 'undefined' && module.exports) ? require('./ogrenme.js') : kok.Ogrenme;
  var tohum = O.tohum;
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v); }
  function ara(r, a, b) { return a + (b - a) * r(); }
  var G = 9.81;

  // ---------------- Hafızalı küçük ağ (boyutları beceriye göre) ----------------
  function yerlesim(b) {
    var wh = b.GIZLI * b.GIRIS, bb = wh + b.GIZLI * b.GIZLI, wo = bb + b.GIZLI, bo = wo + b.CIKIS * b.GIZLI;
    return { wh: wh, b: bb, wo: wo, bo: bo, n: bo + b.CIKIS };
  }
  function Ajan(b, w) { this.b = b; this.w = w; this.y = yerlesim(b); this.h = new Array(b.GIZLI).fill(0); }
  Ajan.prototype.karar = function (x) {
    var b = this.b, w = this.w, Y = this.y, h0 = this.h, h = new Array(b.GIZLI), c = new Array(b.CIKIS), i, j, s, o;
    for (j = 0; j < b.GIZLI; j++) {
      s = w[Y.b + j]; o = j * b.GIRIS;
      for (i = 0; i < b.GIRIS; i++) s += w[o + i] * x[i];
      o = Y.wh + j * b.GIZLI;
      for (i = 0; i < b.GIZLI; i++) s += w[o + i] * h0[i];
      h[j] = Math.tanh(s);
    }
    for (j = 0; j < b.CIKIS; j++) {
      s = w[Y.bo + j]; o = Y.wo + j * b.GIZLI;
      for (i = 0; i < b.GIZLI; i++) s += w[o + i] * h[i];
      c[j] = s;
    }
    this.h = h;
    return c;
  };
  function yeniBeyin(b, rng) {
    var Y = yerlesim(b), w = new Array(Y.n);
    for (var i = 0; i < Y.n; i++) w[i] = gauss(rng) * (i >= Y.wh && i < Y.b ? 0.1 : 0.3);
    w[Y.bo + b.CIKIS - 1] = -0.5;      // başta "yapamam" demeye isteksiz başlasın (önce denesin)
    return w;
  }
  function birSicak(n, k) { var a = new Array(n).fill(0); if (k >= 0) a[k] = 1; return a; }

  // ================= 1) KAPAK AÇMA =================
  var KAPAK = {
    ad: 'Kapak açma', anahtar: 'kapak',
    EYLEM_AD: ['tutan eli sık', 'tutan eli gevşet', 'kayış torkunu artır', 'kayış torkunu azalt', 'böyle devam', 'açamıyorum de'],
    GIRIS: 17, GIZLI: 12, CIKIS: 6,
    SABIT: { yaricap: 0.035, torkMaks: 5, kuvvetMaks: 200, kuvvetAdim: 15, torkAdim: 0.5, acilma: 720, maksAdim: 50, dusme: 6 },
    ODUL: { adim: -0.01, ilerleme: 0.08, kayisKaydi: -0.02, siseKaydi: -0.05, acti: 1, ezdi: -1, dusurdu: -1, dogruRed: 0.8, yanlisRed: -0.7, denemedenRed: -0.5, kararsiz: -0.6 },
    egitimOrtami: { cokSikiOran: 0.4 },
    yeni: function (secenek, rng) { return new KapakOrtam(secenek || {}, rng); }
  };
  function KapakOrtam(secenek, rng) {
    var S = KAPAK.SABIT;
    this.rng = rng; this.gurultu = secenek.gurultu === undefined ? 0.05 : secenek.gurultu;
    this.cokSiki = secenek.cokSiki !== undefined ? secenek.cokSiki : rng() < (secenek.cokSikiOran || 0.2);
    this.muhurTork = this.cokSiki ? ara(rng, 5.5, 7) : ara(rng, 2.2, 4.2);   // N·m (mühürlü yeni şişe)
    this.donmeTork = this.muhurTork * ara(rng, 0.3, 0.5);                    // mühür kırılınca
    this.kayisMu = ara(rng, 0.55, 1.0);                                        // kayış malzemesi (TPU/silikon/kauçuk)
    this.kayisMaks = this.kayisMu * 7;                                         // kayışın kaymadan aktarabildiği tork
    this.elMu = ara(rng, 0.6, 1.0);                                            // tutan elin sürtünmesi
    this.ezilme = ara(rng, 90, 150);                                           // N, PET şişe (dolu/boş farkı)
    this.F = 0; this.tork = 0; this.muhur = true; this.donus = 0; this.kayan = 0;
    this.adim = 0; this.bitti = false; this.basari = false; this.kaza = false; this.sonuc = ''; this.toplam = 0;
    this.sonEylem = -1; this.kapakDondu = 0; this.siseKaydi = 0; this.kayisKaydi = 0;
    this.maksTork = 0; this.gorduKayisKaydi = false; this.maksBicim = 0; this.zorlanma = 0;
    this.acilabilir = this.muhurTork <= Math.min(S.torkMaks, this.kayisMaks) && this.muhurTork / (2 * this.elMu * S.yaricap) < this.ezilme * 0.95;
  }
  // Öğretmen ipucu (potansiyel): doğru kavrama ve gereken torka yakınlık. Gizli değerleri simülasyon bilir, robot görmez.
  KapakOrtam.prototype.phi = function () {
    var S = KAPAK.SABIT, gerekF = Math.min(this.muhurTork, this.kayisMaks) / (2 * this.elMu * S.yaricap) * 1.1, ust = 0.85 * this.ezilme;
    var kav = this.F < gerekF ? this.F / Math.max(1, gerekF) : this.F <= ust ? 1 : Math.max(0, 1 - (this.F - ust) / (0.15 * this.ezilme));
    var hedefT = Math.min(this.muhurTork, this.kayisMaks, S.torkMaks);
    var tor = Math.min(1, this.tork / hedefT) - Math.max(0, this.tork - this.kayisMaks) / S.torkMaks;
    return 0.3 * kav + 0.3 * kav * tor;
  };
  KapakOrtam.prototype.gozlem = function () {
    var S = KAPAK.SABIT, r = this.rng, g = this.gurultu;
    var bicim = Math.max(0, (this.F - 0.6 * this.ezilme) / (0.4 * this.ezilme));   // şişe gövdesi esniyor (kamera/kuvvet sensörü)
    var o = [this.F / S.kuvvetMaks, this.tork / S.torkMaks, this.kapakDondu, this.siseKaydi, this.kayisKaydi,
      bicim + gauss(r) * g, Math.min(this.tork, this.kayisMaks) / S.torkMaks + gauss(r) * g,
      this.donus / S.acilma, this.adim / S.maksAdim,
      Math.min(1, this.zorlanma / 10),          // kaç adımdır motor zorlanıyor ama kapak dönmüyor (motor akımı + kapak sensörü)
      this.kayan / S.dusme];                           // şişe elde kaç kez kaydı
    return o.concat(birSicak(6, this.sonEylem));
  };
  KapakOrtam.prototype.ilerle = function (e) {
    if (this.bitti) return 0;
    var S = KAPAK.SABIT, A = KAPAK.ODUL, od = A.adim, p0 = this.phi();
    this.adim++; this.sonEylem = e; this.kapakDondu = 0; this.siseKaydi = 0; this.kayisKaydi = 0;
    if (e === 5) {
      this.bitti = true; this.reddetti = true;
      var denedi = this.maksTork >= 0.8 * S.torkMaks || this.gorduKayisKaydi || this.maksBicim >= 0.3;
      if (this.acilabilir) { od += A.yanlisRed; this.sonuc = 'Yanlış vazgeçti: aslında açabilirdi'; }
      else if (!denedi) { od += A.denemedenRed; this.sonuc = 'Denemeden vazgeçti (gerçekten açamaz ama önce denemeliydi)'; }
      else { od += A.dogruRed; this.basari = true; this.sonuc = 'Doğru karar: denedi, sonra "Bu kapak benim gücümü aşıyor, açamıyorum" dedi'; }
      this.toplam += od; return od;
    }
    if (e === 0) this.F = Math.min(S.kuvvetMaks, this.F + S.kuvvetAdim);
    if (e === 1) this.F = Math.max(0, this.F - S.kuvvetAdim);
    if (e === 2) this.tork = Math.min(S.torkMaks, this.tork + S.torkAdim);
    if (e === 3) this.tork = Math.max(0, this.tork - S.torkAdim);
    if (this.F > this.ezilme) { od += A.ezdi - p0; this.bitti = true; this.kaza = true; this.sonuc = 'Şişeyi fazla sıktı, ezildi (su döküldü)'; this.toplam += od; return od; }
    var aktarilan = Math.min(this.tork, this.kayisMaks);
    this.maksTork = Math.max(this.maksTork, this.tork);
    this.maksBicim = Math.max(this.maksBicim, (this.F - 0.6 * this.ezilme) / (0.4 * this.ezilme));
    if (this.tork > this.kayisMaks) { this.kayisKaydi = 1; this.gorduKayisKaydi = true; od += A.kayisKaydi; }
    var tutma = 2 * this.elMu * this.F * S.yaricap, direnc = this.muhur ? this.muhurTork : this.donmeTork;
    if (aktarilan > 0.05 && aktarilan > tutma) {
      this.siseKaydi = 1; this.kayan++; od += A.siseKaydi;
      if (this.kayan >= S.dusme) { od += A.dusurdu; this.bitti = true; this.kaza = true; this.sonuc = 'Şişe elinde döndü döndü, düşürdü'; }
    } else if (aktarilan >= direnc) {
      this.muhur = false; this.donus += 90; this.kapakDondu = 1; od += A.ilerleme;
      if (this.donus >= S.acilma) { od += A.acti; this.bitti = true; this.basari = true; this.sonuc = 'Kapağı açtı'; }
    }
    this.zorlanma = !this.kapakDondu && this.tork >= 0.5 * S.torkMaks ? this.zorlanma + 1 : 0;
    if (!this.bitti && this.adim >= S.maksAdim) { od += A.kararsiz; this.bitti = true; this.sonuc = 'Süre doldu: ne açtı ne vazgeçti'; }
    od += this.phi() - p0;
    this.toplam += od;
    return od;
  };
  KapakOrtam.prototype.olcumler = function () {
    var S = KAPAK.SABIT;
    return [
      ['Tutan elin kuvveti', this.F, S.kuvvetMaks, 'N', this.F > 0.6 * this.ezilme ? 'uyari' : ''],
      ['Kayış torku', this.tork, S.torkMaks, 'N·m', this.kayisKaydi ? 'uyari' : ''],
      ['Kapak dönüşü', this.donus, S.acilma, '°', this.kapakDondu ? 'iyi' : ''],
      ['Şişe elde kaydı', this.kayan, KAPAK.SABIT.dusme, 'kez', this.siseKaydi ? 'uyari' : ''],
      ['Zorlanma (kapak dönmüyor)', this.zorlanma, 10, 'adım', this.zorlanma >= 5 ? 'uyari' : '']
    ];
  };
  KapakOrtam.prototype.gizli = function () {
    return 'Gizli (robot bilmez): kapak ' + this.muhurTork.toFixed(1) + ' N·m, şişe ' + Math.round(this.ezilme) + ' N\'da ezilir, kayış en çok ' + this.kayisMaks.toFixed(1) + ' N·m aktarır' + (this.acilabilir ? '' : ' → açılamaz');
  };

  // ================= 2) EŞYA İTME (güç ve devrilme sınırı) =================
  var ESYALAR = [['sandalye', 4, 8], ['sehpa', 8, 20], ['küçük masa', 15, 30], ['büyük masa', 30, 60], ['kanepe', 40, 90]];
  var ITME = {
    ad: 'Eşya itme (güç ve devrilme sınırı)', anahtar: 'itme',
    EYLEM_AD: ['kuvveti artır', 'kuvveti azalt', 'böyle devam', 'yapamam de'],
    GIRIS: 11, GIZLI: 10, CIKIS: 4,
    SABIT: { motorMaks: 150, kuvvetAdim: 8, taban: 0.2, hedef: 0.5, maksAdim: 50 },
    ODUL: { adim: -0.01, ilerleme: 0.08, patinaj: -0.03, tehlike: -0.05, itti: 1, devrildi: -3, dogruRed: 0.5, yanlisRed: -0.7, denemedenRed: -0.5, kararsiz: -0.3 },
    yeni: function (secenek, rng) { return new ItmeOrtam(secenek || {}, rng); }
  };
  function ItmeOrtam(secenek, rng) {
    var S = ITME.SABIT;
    this.rng = rng; this.gurultu = secenek.gurultu === undefined ? 0.05 : secenek.gurultu;
    var t = ESYALAR[secenek.esya !== undefined ? secenek.esya : Math.floor(rng() * ESYALAR.length)];
    this.esya = t[0]; this.kutle = ara(rng, t[1], t[2]);
    this.zeminMu = ara(rng, 0.25, 0.6);                 // halı/parke
    this.robotKutle = ara(rng, 20, 30);                 // kg (TASIMA_NOTU: 20–30 kg)
    this.yukseklik = ara(rng, 0.35, 0.8);               // m, kolların ittiği yükseklik
    this.tekerMu = ara(rng, 0.45, 0.8);
    this.gerekli = this.zeminMu * this.kutle * G;                              // eşyayı kıpırdatmak için
    this.cekis = this.tekerMu * this.robotKutle * G;                           // tekerlek kaymadan
    this.devrilme = this.robotKutle * G * S.taban / this.yukseklik;            // bu kuvvette robot devrilir
    this.yapilabilir = this.gerekli < Math.min(S.motorMaks, this.cekis) && this.gerekli < 0.9 * this.devrilme;
    this.F = 0; this.yol = 0; this.adim = 0; this.bitti = false; this.basari = false; this.kaza = false; this.sonuc = ''; this.toplam = 0;
    this.sonEylem = -1; this.patinaj = 0; this.hareket = 0; this.maksEgim = 0; this.gorduPatinaj = false; this.maksF = 0;
    this.gorunenBoyut = Math.log(this.kutle) / Math.log(90) * (1 + gauss(rng) * 0.25);   // kamera tahmini (kaba)
  }
  // Öğretmen ipucu (potansiyel): yapılabilirse gereken kuvvete, değilse güvenli sınıra kadar yavaşça yaklaşmak iyi; sınırı aşmak kötü.
  ItmeOrtam.prototype.siniri = function () { return Math.min(this.yapilabilir ? this.gerekli * 1.05 : Infinity, 0.85 * this.devrilme, this.cekis, ITME.SABIT.motorMaks); };
  ItmeOrtam.prototype.phi = function () {
    var l = this.siniri();
    return 0.3 * Math.min(this.F, l) / l - 0.6 * Math.max(0, this.F - l) / l;
  };
  ItmeOrtam.prototype.egim = function () { return this.F * this.yukseklik / (this.robotKutle * G * ITME.SABIT.taban); };
  ItmeOrtam.prototype.gozlem = function () {
    var S = ITME.SABIT, r = this.rng, g = this.gurultu, e = this.egim();
    var o = [this.F / S.motorMaks, Math.min(this.F, this.cekis) / S.motorMaks + gauss(r) * g, e * e + gauss(r) * g * 0.5,
      this.patinaj, this.hareket, this.yol / S.hedef, this.gorunenBoyut];
    return o.concat(birSicak(4, this.sonEylem));
  };
  ItmeOrtam.prototype.ilerle = function (e) {
    if (this.bitti) return 0;
    var S = ITME.SABIT, A = ITME.ODUL, od = A.adim, p0 = this.phi();
    this.adim++; this.sonEylem = e; this.patinaj = 0; this.hareket = 0;
    if (e === 3) {
      this.bitti = true; this.reddetti = true;
      var denedi = this.maksEgim >= 0.6 || this.gorduPatinaj || this.maksF >= 0.9 * S.motorMaks;
      if (this.yapilabilir) { od += A.yanlisRed; this.sonuc = 'Yanlış reddetti: aslında itebilirdi'; }
      else if (!denedi) { od += A.denemedenRed; this.sonuc = 'Denemeden reddetti (gerçekten yapamaz ama önce yavaşça denemeliydi)'; }
      else { od += A.dogruRed; this.basari = true; this.sonuc = 'Doğru karar: yavaşça denedi, sonra "Bu ' + this.esya + ' benim için çok ağır / devrilebilirim" dedi'; }
      this.toplam += od; return od;
    }
    if (e === 0) this.F = Math.min(S.motorMaks, this.F + S.kuvvetAdim);
    if (e === 1) this.F = Math.max(0, this.F - S.kuvvetAdim);
    var eg = this.egim();
    this.maksEgim = Math.max(this.maksEgim, eg); this.maksF = Math.max(this.maksF, this.F);
    if (eg >= 1) { od += A.devrildi - p0; this.bitti = true; this.kaza = true; this.sonuc = 'DEVRİLDİ: gücünü aştı (simülasyonda; gerçekte asla)'; this.toplam += od; return od; }
    if (eg > 0.8) od += A.tehlike;
    if (this.F > this.cekis) { this.patinaj = 1; this.gorduPatinaj = true; od += A.patinaj; }
    else if (this.F >= this.gerekli) {
      this.yol += 0.05; this.hareket = 1; od += A.ilerleme;
      if (this.yol >= S.hedef - 1e-9) { od += A.itti; this.bitti = true; this.basari = true; this.sonuc = this.esya + ' yerinden 50 cm itildi'; }
    }
    if (!this.bitti && this.adim >= S.maksAdim) { od += A.kararsiz; this.bitti = true; this.sonuc = 'Süre doldu: ne itti ne reddetti'; }
    od += this.phi() - p0;
    this.toplam += od;
    return od;
  };
  ItmeOrtam.prototype.olcumler = function () {
    var S = ITME.SABIT, e = this.egim();
    return [
      ['İtme kuvveti', this.F, S.motorMaks, 'N', ''],
      ['Eğim (devrilmeye yakınlık)', e * 100, 100, '%', e > 0.8 ? 'uyari' : ''],
      ['Tekerlek patinajı', this.patinaj, 1, '', this.patinaj ? 'uyari' : ''],
      ['Eşyanın gittiği yol', this.yol * 100, S.hedef * 100, 'cm', this.hareket ? 'iyi' : '']
    ];
  };
  ItmeOrtam.prototype.gizli = function () {
    return 'Gizli (robot bilmez): ' + this.esya + ' ' + Math.round(this.kutle) + ' kg, kıpırdatmak için ' + Math.round(this.gerekli) + ' N; robot ' +
      Math.round(this.devrilme) + ' N\'da devrilir, tekerlek ' + Math.round(this.cekis) + ' N\'da kayar' + (this.yapilabilir ? '' : ' → yapılamaz');
  };

  var BECERILER = { kapak: KAPAK, itme: ITME };

  // ---------------- Oynatma, sınama, eğitim ----------------
  // kesifSiniri: eğitimde her seçeneğin en az biraz denenmesi için kararların uç değerlerini yumuşatır (sınavda kullanılmaz)
  function oyna(b, w, ortam, sicaklik, rng, kesifSiniri) {
    var a = new Ajan(b, w);
    while (!ortam.bitti) {
      var c = a.karar(ortam.gozlem());
      if (kesifSiniri) c = c.map(function (v) { return kesifSiniri * Math.tanh(v / kesifSiniri); });
      ortam.ilerle(O.sec(c, sicaklik || 0, rng || ortam.rng));
    }
    return ortam;
  }
  function degerlendir(b, w, n, tohumDeger, secenek) {
    var rng = tohum(tohumDeger === undefined ? 777 : tohumDeger), s = { ok: 0, okN: 0, red: 0, redN: 0, kaza: 0, odul: 0 };
    for (var i = 0; i < n; i++) {
      var o = oyna(b, w, b.yeni(secenek, rng), 0);
      var yapilir = o.acilabilir !== undefined ? o.acilabilir : o.yapilabilir;
      if (yapilir) { s.okN++; if (o.basari) s.ok++; } else { s.redN++; if (o.basari) s.red++; }
      if (o.kaza) s.kaza++;
      s.odul += o.toplam / n;
    }
    return { basari: s.okN ? s.ok / s.okN : 0, dogruRed: s.redN ? s.red / s.redN : 0, kaza: s.kaza / n, ortOdul: s.odul, yapilabilirOran: s.okN / n };
  }
  function Egitici(b, secenek) {
    secenek = secenek || {};
    this.b = b; this.n = yerlesim(b).n;
    this.rng = tohum(secenek.tohum === undefined ? 1 : secenek.tohum);
    this.theta = secenek.beyin ? secenek.beyin.slice() : yeniBeyin(b, this.rng);
    this.sigma = secenek.sigma || 0.15; this.lr = secenek.lr || 0.06; this.cift = secenek.cift || 20; this.K = secenek.K || 16;
    this.nesil = secenek.nesil || 0; this.gecmis = secenek.gecmis ? secenek.gecmis.slice() : [];
    this.kesif = secenek.kesif === undefined ? 1 : secenek.kesif;     // eğitimde kararlar biraz rastgele: farklı hareketleri dener
    this.kesifSiniri = secenek.kesifSiniri === undefined ? 2.5 : secenek.kesifSiniri;
    this.ortam = secenek.ortam || b.egitimOrtami || {};               // eğitimde zor durumlar biraz daha sık
    this.adamSifirla();
  }
  Egitici.prototype.adamSifirla = function () { this.m = new Array(this.n).fill(0); this.v = new Array(this.n).fill(0); this.t = 0; };
  Egitici.prototype._puan = function (w, tohumlar) {
    var top = 0;
    for (var i = 0; i < tohumlar.length; i++) { var r = tohum(tohumlar[i]); top += oyna(this.b, w, this.b.yeni(this.ortam, r), this.kesif, r, this.kesifSiniri).toplam; }
    return top / tohumlar.length;
  };
  Egitici.prototype.nesilYap = function () {
    var n = this.n, i, j, tohumlar = [], eps = [], p = [], ort = 0;
    for (i = 0; i < this.K; i++) tohumlar.push(Math.floor(this.rng() * 4e9));
    for (i = 0; i < this.cift; i++) {
      var e = new Array(n);
      for (j = 0; j < n; j++) e[j] = gauss(this.rng);
      var a = this.theta.map(function (t, k) { return t + this.sigma * e[k]; }, this);
      var c = this.theta.map(function (t, k) { return t - this.sigma * e[k]; }, this);
      var pa = this._puan(a, tohumlar), pc = this._puan(c, tohumlar);
      eps.push(e); p.push([pa, pc]); ort += (pa + pc) / (2 * this.cift);
    }
    var tum = []; p.forEach(function (x) { tum.push(x[0], x[1]); });
    var sir = tum.slice().sort(function (x, y) { return x - y; });
    function sira(v) { return sir.indexOf(v) / (sir.length - 1) - 0.5; }
    var g = new Array(n).fill(0);
    for (i = 0; i < this.cift; i++) { var f = sira(p[i][0]) - sira(p[i][1]); for (j = 0; j < n; j++) g[j] += f * eps[i][j]; }
    this.nesil++; var t = ++this.t, b1 = 0.9, b2 = 0.999;
    for (j = 0; j < n; j++) {
      var gr = g[j] / (this.cift * this.sigma);
      this.m[j] = b1 * this.m[j] + (1 - b1) * gr; this.v[j] = b2 * this.v[j] + (1 - b2) * gr * gr;
      this.theta[j] += this.lr * (this.m[j] / (1 - Math.pow(b1, t))) / (Math.sqrt(this.v[j] / (1 - Math.pow(b2, t))) + 1e-8);
    }
    var k = { nesil: this.nesil, ortOdul: ort };
    this.gecmis.push(k);
    return k;
  };

  var API = {
    SURUM: 1, BECERILER: BECERILER, ESYALAR: ESYALAR,
    Ajan: Ajan, yeniBeyin: yeniBeyin, paramSayisi: function (b) { return yerlesim(b).n; },
    oyna: oyna, degerlendir: degerlendir, Egitici: Egitici
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Beceri = API;
})(typeof window !== 'undefined' ? window : globalThis);
