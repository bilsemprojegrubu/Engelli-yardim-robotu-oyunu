/*
 * anlayici.js — KATMAN 1: Türkçe komutu anlama.
 *
 * Girdi : "havluyu getir ve banyonun ışığını kapat"
 * Çıktı : { gorevler: [ {tur:'getir', esya:'havlu', ozet:'havluyu getir'},
 *                       {tur:'isik', oda:'banyo', acik:false, ozet:'...'} ],
 *           dur: false, mesaj: '' }
 *
 * Yöntem: Yapay zekâ modeli yok; kural tabanlı. Metin önce "katlanır"
 * (küçük harf, ç→c ğ→g ı→i ö→o ş→s ü→u), sonra kelimelere ve parçalara
 * bölünür. Her parçadaki fiil + nesne + oda ekine bakılır.
 * Böylece "ışığı", "Işığı", "ISIGI", "isigi" aynı şey olur; sesli
 * tanımanın verdiği yazımlar da (ör. "tv yi", "TV'yi") çalışır.
 */
(function (kok) {
  'use strict';
  var Dunya = kok.Dunya || require('./dunya.js');
  var ODA_ADLARI = Dunya.ODA_ADLARI;

  // ---------- Metin hazırlama ----------
  function katla(metin) {
    return String(metin)
      .replace(/İ/g, 'i').replace(/I/g, 'i')
      .toLowerCase()
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
      .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
      .replace(/[âä]/g, 'a').replace(/[îï]/g, 'i').replace(/û/g, 'u')
      .replace(/[’'`´]/g, ' ')
      .replace(/[,;.!?:]/g, ' , ')
      .replace(/buz\s+dolab/g, 'buzdolab')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ---------- Sözlükler (katlanmış yazımla) ----------
  var ESYALAR = [
    { id: 'su',       re: /^(su|suyu|suyun|suya|sular|sise\w*)$/ },
    { id: 'kumanda',  re: /^kumanda\w*$/ },
    { id: 'ilac',     re: /^ilac\w*$/ },
    { id: 'havlu',    re: /^havlu\w*$/ },
    { id: 'sandalye', re: /^(sandalye\w*|tekerlekli)$/ }
  ];
  var ESYA_AD = {
    su:       { belirtme: 'su şişesini', iyelik: 'su şişesinin' },
    kumanda:  { belirtme: 'kumandayı',   iyelik: 'kumandanın' },
    ilac:     { belirtme: 'ilaç kutusunu', iyelik: 'ilaç kutusunun' },
    havlu:    { belirtme: 'havluyu',     iyelik: 'havlunun' },
    sandalye: { belirtme: 'tekerlekli sandalyeyi', iyelik: 'tekerlekli sandalyenin' }
  };
  var ODA_KALIPLARI = [
    { id: 'salon',  re: /^(salon\w*|oturma)$/ },
    { id: 'mutfak', re: /^mutfa\w*$/ },
    { id: 'yatak',  re: /^(yata[kg]\w*)$/ },
    { id: 'banyo',  re: /^banyo\w*$/ }
  ];

  // ---------- "Yerler": evdeki HER mobilya (küvet, kanepe, masa...) ----------
  // Mobilya listesi dunya.js'ten gelir; yeni mobilya eklenince burası otomatik tanır.
  // Aynı şeye verilen başka adlar (eş anlamlılar) burada:
  var YER_ESANLAMLI = {
    tv: ['televizyon', 'tivi', 'tv'], klozet: ['tuvalet', 'wc'], kuvet: ['dus'],
    kanepe: ['koltuk'], tezgah: ['ocak'], lavabo: ['musluk'], buzdolabi: ['dolap']
  };
  var YER_GORUNEN_AD = { tv: 'televizyon' };       // "TV" yerine okunaklı ad
  var YERLER = Dunya.MOBILYALAR.map(function (m) {
    var kokler = [katla(m.ad)].concat(YER_ESANLAMLI[m.id] || []);
    return { id: m.id, kokler: kokler, ad: YER_GORUNEN_AD[m.id] || m.ad.toLowerCase() };
  });

  // "kuvete", "kuvetin", "yatagi" gibi çekimli yazımı kökle eşleştirir (k→ğ yumuşaması dahil).
  // Dönüş: eşleşirse kökten sonra kalan ek ("kuvete" → "e"), yoksa null.
  function kokEki(w, kok) {
    if (w === kok) return '';
    if (kok.length < 2 || w.length > kok.length + 6) return null;
    if (w.indexOf(kok) === 0) return w.slice(kok.length);
    if (/k$/.test(kok) && w.indexOf(kok.slice(0, -1) + 'g') === 0) return w.slice(kok.length);
    return null;
  }
  // Hâl, sözcüğün tamamına değil kökten sonraki eke bakılarak bulunur:
  // "kuvete" = küvet + e (yönelme); "kuvette" = küvet + te (bulunma).
  function yerBulKelime(w) {
    if (ODA_KALIPLARI.some(function (o) { return o.re.test(w); })) return null;   // oda adı önce gelir
    for (var i = 0; i < YERLER.length; i++)
      for (var k = 0; k < YERLER[i].kokler.length; k++) {
        var ek = kokEki(w, YERLER[i].kokler[k]);
        if (ek !== null) return { id: YERLER[i].id, hal: hal(ek) };
      }
    return null;
  }

  // Türkçe tamlayan eki: küvet → küvetin, masa → masanın, havluluk → havluluğun
  function tamlayan(ad) {
    var k = ad.toLowerCase();
    var son = (k.match(/[aeıioöuüâ](?=[^aeıioöuüâ]*$)/) || ['e'])[0];
    var sesli = /[aeıioöuüâ]$/.test(k);
    var e = { a: 'ı', 'ı': 'ı', 'â': 'ı', o: 'u', u: 'u', e: 'i', i: 'i', 'ö': 'ü', 'ü': 'ü' }[son];
    if (!sesli && /k$/.test(k) && k.length > 3) k = k.slice(0, -1) + 'ğ';
    return k + (sesli ? 'n' : '') + e + 'n';
  }
  function yerYanindaMetni(y) {
    if (y.tip === 'esya') return ESYA_AD[y.id].iyelik + ' yanına';
    var m = YERLER.filter(function (z) { return z.id === y.id; })[0];
    return tamlayan(m.ad) + ' yanına';
  }
  function bilinenYerler() {
    var oda = Object.keys(ODA_ADLARI).map(function (k) { return ODA_ADLARI[k].yalin; });
    var mob = YERLER.map(function (y) { return y.ad; });
    return oda.concat(mob).join(', ');
  }
  function bilinenEsyalar() {
    return 'su şişesi, kumanda, ilaç kutusu, havlu, tekerlekli sandalye';
  }


  // Fiiller: sıra önemli değil, her kelime en fazla bir fiile denk gelir.
  var FIILLER = [
    ['getir',  /^(getir\w*|tasi\w*|uzat\w*|ver|veri\w*|versene|verebil\w*|alsana|alsene|alir\w*|al)$/],
    ['ac',     /^ac(ar\w*|ip|sana|sene|in|abilir\w*|alim)?$/],
    ['kapat',  /^kapa(t\w*|r\w*)?$/],
    ['yak',    /^yak(ar\w*|ip|sana|sene|abilir\w*)?$/],
    ['sondur', /^sondur\w*$/],
    ['git',    /^(git\w*|gid\w*)$/],
    ['gel',    /^gel(sene|ir\w*|ebilir\w*|in)?$/],
    ['gotur',  /^gotur\w*$/],
    ['dur',    /^(dur|durdur\w*|iptal|vazgec\w*)$/]
  ];
  var OLUMSUZ = /^(getir|ac|kapat|yak|sondur|git|gotur|ver|gel)(me|ma)\w*$/;

  var BAGLACLAR = { ',': 1, 've': 1, 'sonra': 1, 'ardindan': 1, 'ayrica': 1, 'sonrasinda': 1, 'ondan': 1 };

  function fiilTuru(kelime) {
    for (var i = 0; i < FIILLER.length; i++)
      if (FIILLER[i][1].test(kelime)) return FIILLER[i][0];
    return null;
  }

  // Hâl eki: oda adından sonra gelen ek ne diyor?
  function hal(kelime) {
    var k = kelime.replace(/ki$/, '');
    if (/(dan|den|tan|ten)$/.test(k)) return 'ayrilma';   // mutfaktan
    if (/(da|de|ta|te)$/.test(k)) return 'bulunma';       // mutfakta
    if (/(a|e)$/.test(k)) return 'yonelme';               // mutfağa, banyoya
    if (/(in|un|nin|nun)$/.test(k)) return 'iyelik';      // banyonun
    return 'yalin';
  }

  // Fiilin yanına gelen yardımcı sözcükler ("getirir MISIN", "kapat LÜTFEN"): bunlar yeni iş başlatmaz
  var YARDIMCI = /^(mi|mu|misin|musun|misiniz|musunuz|lutfen|rica|ederim|sene|sana|bana|bir|robot|zahmet)$/;

  function anlamli(w) {
    return fiilTuru(w) || ESYALAR.some(function (e) { return e.re.test(w); }) ||
      ODA_KALIPLARI.some(function (o) { return o.re.test(w); }) ||
      /^(tv|tivi|televizyon\w*|isik\w*|isig\w*|lamba\w*|kapi\w*|kapa[gk]\w*|buzdolab\w*|beni)$/.test(w);
  }

  // ---------- Parçalara bölme ----------
  // "ve", "sonra", virgül gibi bağlaçlardan ve "-ıp" bağlaçlarından (açıp, gidip) böler.
  function parcala(kelimeler) {
    var parcalar = [], su = [];
    function bitir() { if (su.length) parcalar.push(su); su = []; }
    for (var i = 0; i < kelimeler.length; i++) {
      var w = kelimeler[i];
      if (BAGLACLAR[w]) { bitir(); continue; }
      su.push(w);
      // Bağlaç yoksa da, fiil cümleyi bitirir: "kumandayı getir tv yi aç" -> iki iş
      if (fiilTuru(w) && !/(ip|up)$/.test(w) && fiilTuru(w) !== 'dur') {
        var sonraki = kelimeler.slice(i + 1);
        var ilk = 0;
        while (ilk < sonraki.length && YARDIMCI.test(sonraki[ilk])) ilk++;
        var arkasi = sonraki.slice(ilk);
        var yardimciVar = ilk > 0 && /^(mi|mu|misin|musun|misiniz|musunuz)$/.test(sonraki[0]);
        if (!(yardimciVar && !arkasi.some(anlamli)) && arkasi.some(anlamli) && !BAGLACLAR[sonraki[0]]) {
          // "getirir misin tv yi aç" gibi: yardımcı sözcükleri bu parçaya kat
          for (var y = 0; y < ilk; y++) { su.push(sonraki[y]); i++; }
          bitir();
          continue;
        }
      }
      if (/(ip|up)$/.test(w) && fiilTuru(w)) {
        // "şişeyi açıp getir" tek iştir (şişe + getir). Onu bölme.
        var kalan = kelimeler.slice(i + 1);
        var sisePar = su.concat(kalan).some(function (x) { return ESYALAR[0].re.test(x) || /^kapa[gk]/.test(x); });
        var sonradanGetir = kalan.some(function (x) { return fiilTuru(x) === 'getir'; });
        if (fiilTuru(w) === 'ac' && sisePar && sonradanGetir) continue;
        bitir();
      }
    }
    bitir();
    return parcalar;
  }

  // ---------- Bir parçayı incele ----------
  function incele(kelimeler) {
    var b = { fiiller: [], esyalar: [], odalar: [], tv: false, isik: false, kapi: false,
              kapak: false, buzdolabi: false, beni: false, hepsi: false, olumsuz: false, cogulIsik: false,
              yerler: [], esyaHaller: {},
              metin: kelimeler.join(' ') };
    kelimeler.forEach(function (w, i) {
      if (OLUMSUZ.test(w)) { b.olumsuz = true; return; }
      var f = fiilTuru(w);
      if (f && b.fiiller.indexOf(f) < 0) b.fiiller.push(f);

      ESYALAR.forEach(function (e) {
        if (e.re.test(w) && b.esyalar.indexOf(e.id) < 0) { b.esyalar.push(e.id); b.esyaHaller[e.id] = hal(w); }
      });
      // "yatak odası" gibi oda adından sonra "oda" geliyorsa mobilya sayma
      var yer = yerBulKelime(w);
      if (yer && !b.yerler.some(function (x) { return x.id === yer.id; }))
        b.yerler.push({ tip: 'aygit', id: yer.id, hal: yer.hal });
      ODA_KALIPLARI.forEach(function (o) {
        if (!o.re.test(w)) return;
        // "yatak odasına": hâl eki "oda..." kelimesinde olur
        var ek = kelimeler[i + 1] && /^oda/.test(kelimeler[i + 1]) ? kelimeler[i + 1] : w;
        if (!b.odalar.some(function (x) { return x.id === o.id; })) b.odalar.push({ id: o.id, hal: hal(ek) });
      });
      if (/^(tv|tivi|televizyon\w*|televisyon\w*)$/.test(w)) b.tv = true;
      if (/^(isik\w*|isig\w*|lamba\w*)$/.test(w)) b.isik = true;
      if (/^(isiklar\w*|lambalar\w*)$/.test(w)) b.cogulIsik = true;
      if (/^kapi\w*$/.test(w)) b.kapi = true;
      if (/^kapa[gk]\w*$/.test(w)) b.kapak = true;
      if (/^(buzdolab|dolab)\w*$/.test(w)) b.buzdolabi = true;
      if (/^(beni|bizi)$/.test(w)) b.beni = true;
      if (/^(tum|butun|hepsi\w*|herkes\w*)$/.test(w)) b.hepsi = true;
    });
    return b;
  }

  // ---------- Görev özeti (kullanıcıya ve Supabase'e yazılan temiz cümle) ----------
  function odaIyelik(o) { return ODA_ADLARI[o].iyelik; }

  function ozetle(g) {
    switch (g.tur) {
      case 'getir':
        return ESYA_AD[g.esya].belirtme + (g.kapakAc ? ' açıp' : '') +
          (g.hedefOda ? ' ' + ODA_ADLARI[g.hedefOda].yonelme : '') + ' getir';
      case 'kapakAc': return 'su şişesinin kapağını aç';
      case 'isik':
        if (g.oda === 'hepsi') return 'tüm ışıkları ' + (g.acik ? 'aç' : 'kapat');
        if (g.oda === 'kullanici') return 'bulunduğun odanın ışığını ' + (g.acik ? 'aç' : 'kapat');
        return odaIyelik(g.oda) + ' ışığını ' + (g.acik ? 'aç' : 'kapat');
      case 'tv': return 'televizyonu ' + (g.acik ? 'aç' : 'kapat');
      case 'kapiAc': return (g.oda ? odaIyelik(g.oda) + ' kapısını' : 'kapıyı') + ' aç';
      case 'kapiKapat': return (g.oda ? odaIyelik(g.oda) + ' kapısını' : 'kapıyı') + ' kapat';
      case 'buzdolabiAc': return 'buzdolabını aç';
      case 'git': return g.yer ? yerYanindaMetni(g.yer) + ' git' : ODA_ADLARI[g.oda].yonelme + ' git';
      case 'yanimaGel': return 'yanına gel';
      case 'gotur': return g.hedefYer ? 'seni ' + yerYanindaMetni(g.hedefYer) + ' götür'
                                      : 'seni ' + ODA_ADLARI[g.hedefOda].yonelme + ' götür';
    }
    return g.tur;
  }

  // Cümledeki "-e/-a" hâlli (gidilecek) mobilyayı ya da eşyayı seçer
  function hedefYerSec(b) {
    var y = b.yerler.filter(function (h) { return h.hal === 'yonelme'; })[0];
    if (y) return { tip: y.tip, id: y.id };
    var e = b.esyalar.filter(function (id) { return b.esyaHaller[id] === 'yonelme'; })[0];
    if (e) return { tip: 'esya', id: e };
    return null;
  }

  // ---------- Bir parçayı görev(ler)e çevir ----------
  // Dönüş: { gorevler: [...] } ya da { hata: '...' } ya da { dur: true }
  function parcaAnla(b, fiiller) {
    var f = function (x) { return fiiller.indexOf(x) >= 0; };
    var oda = b.odalar[0] ? b.odalar[0].id : null;

    if (f('dur')) return { dur: true };
    if (b.olumsuz) return { hata: 'Olumsuz komutları (ör. "getirme") yapmıyorum. Ne yapmamı istediğini söyle.' };

    // "beni salona götür", "beni küvete götür", "beni kumandaya götür"
    if (b.beni && (f('gotur') || f('git'))) {
      var yer = hedefYerSec(b);                      // mobilya/eşya varsa en özel hedef odur
      if (yer) return { gorevler: [{ tur: 'gotur', hedefYer: yer }] };
      var hedef = b.odalar.filter(function (o) { return o.hal === 'yonelme'; })[0] || b.odalar[0];
      if (!hedef) return { hata: 'Seni nereye götüreyim? Gidebileceğim yerler: ' + bilinenYerler() + '.' };
      return { gorevler: [{ tur: 'gotur', hedefOda: hedef.id }] };
    }

    // "bana gel", "yanıma gel"
    if (f('gel')) {
      var gelOda = b.odalar.filter(function (o) { return o.hal === 'yonelme'; })[0];
      return { gorevler: [gelOda ? { tur: 'git', oda: gelOda.id } : { tur: 'yanimaGel' }] };
    }

    // Buzdolabı
    if (b.buzdolabi && !(f('getir') && b.esyalar.length)) {
      if (f('ac') || f('yak')) return { gorevler: [{ tur: 'buzdolabiAc' }] };
      if (f('kapat')) return { hata: 'Buzdolabının kapısını kapatmayı henüz bilmiyorum; sadece açabiliyorum.' };
    }

    // Televizyon
    if (b.tv) {
      if (f('ac') || f('yak')) return { gorevler: [{ tur: 'tv', acik: true }] };
      if (f('kapat') || f('sondur')) return { gorevler: [{ tur: 'tv', acik: false }] };
    }

    // Işık
    if (b.isik) {
      var acik = null;
      if (f('ac') || f('yak')) acik = true;
      else if (f('kapat') || f('sondur')) acik = false;
      if (acik !== null)
        return { gorevler: [{ tur: 'isik', oda: (b.hepsi || (b.cogulIsik && !oda)) ? 'hepsi' : (oda || 'kullanici'), acik: acik }] };
    }

    // Kapı (kapak değil)
    if (b.kapi && !b.kapak) {
      if (f('ac')) return { gorevler: [{ tur: 'kapiAc', oda: oda }] };
      if (f('kapat')) return { gorevler: [{ tur: 'kapiKapat', oda: oda }] };
    }

    // Şişenin kapağını aç (getirmeden)
    if (f('ac') && !f('getir') && (b.kapak || b.esyalar.indexOf('su') >= 0))
      return { gorevler: [{ tur: 'kapakAc', esya: 'su' }] };

    // Eşya getir
    if (b.esyalar.length && (f('getir') || f('gotur') || f('ac') || fiiller.length === 0)) {
      var yone = b.odalar.filter(function (o) { return o.hal === 'yonelme'; })[0];
      var kaynak = b.odalar.filter(function (o) { return o.hal !== 'yonelme'; })[0];
      var gorevler = b.esyalar.map(function (e) {
        return {
          tur: 'getir', esya: e,
          kapakAc: e === 'su' && (f('ac') || b.kapak),
          hedefOda: yone ? yone.id : null,
          kaynakOda: kaynak ? kaynak.id : null
        };
      });
      return { gorevler: gorevler };
    }

    // "küvete git", "kumandaya git" (oda değil, belirli bir yer/eşya)
    if (f('git') && !b.beni) {
      var gy = hedefYerSec(b);
      if (gy) return { gorevler: [{ tur: 'git', yer: gy }] };
    }

    // Odaya git
    if (f('git') && oda) return { gorevler: [{ tur: 'git', oda: oda }] };

    return null;
  }

  var ORNEKLER = 'Örnekler: "mutfaktan su getir", "şişeyi açıp getir", "ışığı kapat", ' +
    '"tv yi aç", "kapıyı kapat", "beni salona götür", "buzdolabını aç".';

  // Anlaşılmayan parça için işe yarar bir mesaj: bilinmeyen kelimeyi ve bilinenleri söyler
  function anlasilmadiMesaji(p, fiiller) {
    var bilinmeyen = p.metin.split(' ').filter(function (w) {
      return w && !fiilTuru(w) && !YARDIMCI.test(w) && !/^(beni|bana|bizi|bize|bunu|sunu|onu)$/.test(w) &&
        !ESYALAR.some(function (e) { return e.re.test(w); }) && !yerBulKelime(w) &&
        !ODA_KALIPLARI.some(function (o) { return o.re.test(w); });
    })[0];
    if (bilinmeyen && fiiller.indexOf('getir') >= 0)
      return '"' + bilinmeyen + '" diye bir şey bulamadım. Getirebileceklerim: ' + bilinenEsyalar() + '.';
    if (bilinmeyen && (fiiller.indexOf('git') >= 0 || fiiller.indexOf('gotur') >= 0))
      return '"' + bilinmeyen + '" diye bir yer bilmiyorum. Gidebileceğim yerler: ' + bilinenYerler() + '.';
    return 'Şunu anlayamadım: "' + p.metin + '"';
  }

  // ---------- Ana fonksiyon ----------
  function anla(metin) {
    var temiz = katla(metin || '');
    if (!temiz) return { gorevler: [], dur: false, mesaj: 'Bir komut yaz ya da söyle. ' + ORNEKLER };

    var parcalar = parcala(temiz.split(' ')).map(incele);
    var gorevler = [], mesajlar = [], dur = false;

    // Fiili olmayan parçaya sonraki parçanın fiilini ver ("havlu ve ilaç getir")
    var fiilListeleri = parcalar.map(function (p) { return p.fiiller; });
    for (var i = 0; i < parcalar.length; i++) {
      if (fiilListeleri[i].length) continue;
      for (var j = i + 1; j < parcalar.length; j++)
        if (fiilListeleri[j].length) { fiilListeleri[i] = fiilListeleri[j]; break; }
    }

    parcalar.forEach(function (p, i) {
      var bos = !p.esyalar.length && !p.odalar.length && !p.fiiller.length && !p.tv && !p.isik &&
        !p.kapi && !p.kapak && !p.buzdolabi && !p.beni && !p.yerler.length;
      if (bos) return; // "lütfen", "bana" gibi dolgu
      var s = parcaAnla(p, fiilListeleri[i]);
      // "kapağını aç ve bana getir": eşya adı yok, bir önceki işteki eşya kastedilir
      if (!s && fiilListeleri[i].indexOf('getir') >= 0 && !p.esyalar.length) {
        var onceki = gorevler[gorevler.length - 1];
        if (onceki && onceki.esya) s = { gorevler: [{ tur: 'getir', esya: onceki.esya, kapakAc: false, hedefOda: null, kaynakOda: null }] };
      }
      if (!s) { mesajlar.push(anlasilmadiMesaji(p, fiilListeleri[i])); return; }
      if (s.dur) { dur = true; return; }
      if (s.hata) { mesajlar.push(s.hata); return; }
      s.gorevler.forEach(function (g) { g.ozet = ozetle(g); gorevler.push(g); });
    });

    if (!gorevler.length && !dur && !mesajlar.length) mesajlar.push('Komutu anlayamadım. ' + ORNEKLER);
    return { gorevler: gorevler, dur: dur, mesaj: mesajlar.join(' ') };
  }

  var API = { anla: anla, katla: katla, ozetle: ozetle, ESYA_AD: ESYA_AD };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Anlayici = API;
})(typeof window !== 'undefined' ? window : globalThis);
