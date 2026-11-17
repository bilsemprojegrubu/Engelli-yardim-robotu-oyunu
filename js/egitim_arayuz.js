/*
 * egitim_arayuz.js — Eğitim Laboratuvarı sayfası: eğitimi koşturur, robotu canlı izletir.
 * Sayfa açılınca önceden eğitilmiş beyinle başlar (js/hazir_beyin.js); bu tarayıcıda eğitim
 * devam ettiyse onu kullanır.
 */
(function () {
  'use strict';
  var O = window.Ogrenme, D = window.Dunya, HB = window.HazirBeyin;
  var CS = 28;
  var $ = function (id) { return document.getElementById(id); };
  var virgul = function (n, k) { return n.toFixed(k).replace('.', ','); };
  var yuzde = function (n) { return '%' + Math.round(n * 100); };
  var KAYIT = 'robotBeyni' + O.SURUM;
  var AYAR = { lr: 0.1, sigma: 0.2, cift: 20, K: 6 };

  function yeniEgitici(v) {
    var s = Object.assign({ tohum: Date.now() % 1e9 }, AYAR);
    if (v) { s.beyin = v.theta; s.nesil = v.nesil || 0; s.gecmis = v.gecmis || []; s.lr = 0.04; s.sigma = 0.1; }
    return new O.Egitici(s);
  }
  function beyinUygun(v) { return v && Array.isArray(v.theta) && v.theta.length === O.PARAM_SAYISI && (v.surum === undefined || v.surum === O.SURUM); }

  var egitici, egitiyor = false, denemeSayisi = 0, sonTest = { gitBasari: null, taraKapsama: null, ortSalinim: null }, kaynak = '';

  // ---------- Günlük ----------
  function gunluk(m) {
    var li = document.createElement('li'); li.textContent = m;
    var ol = $('gunluk'); ol.insertBefore(li, ol.firstChild);
    while (ol.children.length > 60) ol.removeChild(ol.lastChild);
  }

  // ---------- Kayıt (bu cihazdaki tarayıcıya) ----------
  // Beyin her birkaç saniyede, duraklatınca, sekme gizlenince ve sayfa kapanırken kaydedilir.
  var depolamaVar = (function () {
    try { localStorage.setItem('robotDeneme', '1'); localStorage.removeItem('robotDeneme'); return true; } catch (e) { return false; }
  })();
  var sonKayitZamani = 0;
  function kayitYaz(m, hata) { var el = $('kayitDurum'); el.textContent = m; el.className = 'kucuk ' + (hata ? 'uyari' : 'soluk'); }
  function kaydet() {
    if (!egitici) return;
    if (!depolamaVar) { kayitYaz('Bu tarayıcı kayıt tutmuyor (gizli sekme ya da uygulama içi tarayıcı olabilir). Eğittiğin beyni kaybetmemek için "Beyni indir"e bas.', true); return; }
    try {
      localStorage.setItem(KAYIT, JSON.stringify({ surum: O.SURUM, theta: egitici.theta, nesil: egitici.nesil, gecmis: egitici.gecmis.slice(-400), deneme: denemeSayisi, kaynak: kaynak, zaman: Date.now() }));
      sonKayitZamani = Date.now();
      kayitYaz('Bu cihaza kaydedildi: ' + new Date().toLocaleTimeString('tr-TR') + ' (nesil ' + egitici.nesil + '). Sayfayı kapatıp açınca bu beyin gelir.');
    } catch (e) {
      kayitYaz('Kaydedilemedi (tarayıcı yer vermedi). "Beyni indir" ile dosya olarak sakla.', true);
    }
  }
  window.addEventListener('pagehide', kaydet);
  window.addEventListener('beforeunload', kaydet);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') kaydet(); });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* desteklenmiyor */ }
  function benimse(v, ad) {
    egitici = yeniEgitici(v); denemeSayisi = (v && v.deneme) || 0; kaynak = ad;
    $('kaynak').textContent = ad + ' (' + egitici.nesil + ' nesil)';
  }
  function hazirYukle() {
    if (beyinUygun(HB)) { benimse(HB, 'Hazır eğitilmiş beyin'); return true; }
    benimse(null, 'Boş beyin'); return false;
  }
  (function ilkYukleme() {
    try {
      var k = localStorage.getItem(KAYIT);
      if (k) { var v = JSON.parse(k); if (beyinUygun(v)) {
          benimse(v, v.kaynak || 'Senin eğittiğin beyin');
          kayitYaz('Bu cihazda kayıtlı beyin yüklendi' + (v.zaman ? ' (son kayıt: ' + new Date(v.zaman).toLocaleString('tr-TR') + ')' : '') + '.');
          gunluk('Bu cihazda kayıtlı beyin yüklendi: ' + kaynak + ' (nesil ' + v.nesil + ').'); return;
        } }
    } catch (e) { /* yok */ }
    if (hazirYukle()) gunluk('Hazır eğitilmiş beyin yüklendi: robot ilk açılışta da bilgili.');
    else gunluk('Hazır beyin bulunamadı; boş beyinle başlandı.');
  })();

  // ---------- Sayaçlar ve eğri ----------
  function sayaclar() {
    $('sNesil').textContent = egitici.nesil;
    if (kaynak) $('kaynak').textContent = kaynak + ' (' + egitici.nesil + ' nesil)';
    $('sDeneme').textContent = denemeSayisi.toLocaleString('tr-TR');
    $('sGit').textContent = sonTest.gitBasari === null ? '–' : yuzde(sonTest.gitBasari);
    $('sTara').textContent = sonTest.taraKapsama === null ? '–' : yuzde(sonTest.taraKapsama);
    $('sSal').textContent = sonTest.ortSalinim === null ? '–' : virgul(sonTest.ortSalinim, 1);
  }
  function egriCiz() {
    var cv = $('egriCv'), c = cv.getContext('2d'), W = cv.width = 640, H = cv.height = 280;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = '#e3e7ec'; c.lineWidth = 1; c.fillStyle = '#5b6773'; c.font = '12px system-ui, sans-serif';
    for (var i = 0; i <= 4; i++) { var y = 20 + i * (H - 40) / 4; c.beginPath(); c.moveTo(40, y); c.lineTo(W - 10, y); c.stroke(); }
    var g = egitici.gecmis;
    if (g.length < 2) { c.fillText('Eğitim başlayınca eğri çizilir.', 60, H / 2); return; }
    var n = g.length, x = function (j) { return 40 + (W - 50) * j / (n - 1); };
    function cizgi(renk, f) {
      c.strokeStyle = renk; c.lineWidth = 2; c.beginPath();
      for (var j = 0; j < n; j++) { var yy = 20 + (H - 40) * (1 - Math.max(0, Math.min(1, f(g[j], j)))); if (j) c.lineTo(x(j), yy); else c.moveTo(x(j), yy); }
      c.stroke();
    }
    var od = g.map(function (a) { return a.ortOdul; }), mn = Math.min.apply(null, od), mx = Math.max.apply(null, od), ar = Math.max(0.01, mx - mn);
    cizgi('#ff9f1c', function (a) { return (a.ortOdul - mn) / ar; });
    cizgi('#2563eb', function (a, j) {
      var t = 0, say = 0;
      for (var q = Math.max(0, j - 4); q <= j; q++) { t += g[q].gitBasari; say++; }
      return t / say;
    });
    c.fillStyle = '#5b6773'; c.fillText('%100', 4, 24); c.fillText('0', 18, H - 16);
    c.fillText('nesil ' + g[0].nesil, 40, H - 4); c.fillText('nesil ' + g[n - 1].nesil, W - 80, H - 4);
  }

  // ---------- Eğitim döngüsü ----------
  function ortam() {
    var k = +$('kayma').value / 100;
    return { kayma: k, gurultu: k > 0 ? 0.1 : 0, rastgeleEngel: 5 };
  }
  function degerlendirTest() { sonTest = O.degerlendir(egitici.theta, 24, ortam(), 777); }
  // ---------- Arka plan işçisi (Web Worker), ekranı açık tutma, hız ----------
  var isci = null, isciHazir = false;
  try {
    isci = new Worker('js/egitim_isci.js');
    isci.onerror = function (e) { if (e && e.preventDefault) e.preventDefault(); isciKapat('Arka plan işçisi açılamadı; eğitim sayfanın içinde sürecek.'); };
    isci.onmessage = function (m) { isciHazir = true; isciMesaj(m.data); };
  } catch (e) { isci = null; }
  function isciKapat(neden) {
    if (!isci) return;
    try { isci.terminate(); } catch (e) { /* yok */ }
    isci = null; gunluk(neden);
    if (egitiyor) tik();
    if (typeof bEgitiyor !== 'undefined' && bEgitiyor) bTik();
  }
  var hizOlcum = [], gizliBas = 0, gizliNesil = 0, uyanik = null;
  function hizEkle(n) {
    var simdi = Date.now(); hizOlcum.push([simdi, n]);
    while (hizOlcum.length && simdi - hizOlcum[0][0] > 20000) hizOlcum.shift();
    var top = hizOlcum.reduce(function (a, x) { return a + x[1]; }, 0), sure = Math.max(1, (simdi - hizOlcum[0][0]) / 1000);
    var el = $('hizDurum'); if (el) el.textContent = 'Eğitim hızı: dakikada ~' + Math.round(top / sure * 60) + ' nesil' + (isci ? ' (arka plan işçisi)' : ' (sayfa içinde)') + '.';
  }
  function ekraniAcikTut(ac) {
    try {
      if (ac && navigator.wakeLock && !uyanik) navigator.wakeLock.request('screen').then(function (k) { uyanik = k; k.addEventListener('release', function () { uyanik = null; }); }).catch(function () { /* izin yok */ });
      if (!ac && uyanik) { uyanik.release(); uyanik = null; }
    } catch (e) { /* desteklenmiyor */ }
  }
  function egitimSuruyor() { return egitiyor || (typeof bEgitiyor !== 'undefined' && bEgitiyor); }
  function anlikNesil() { return egitiyor ? egitici.nesil : (typeof bEgitici !== 'undefined' && bEgitici ? bEgitici.nesil : 0); }
  document.addEventListener('visibilitychange', function () {
    if (!egitimSuruyor()) return;
    if (document.visibilityState === 'hidden') { gizliBas = Date.now(); gizliNesil = anlikNesil(); }
    else if (gizliBas) {
      var dk = (Date.now() - gizliBas) / 60000, n = anlikNesil() - gizliNesil;
      if (dk > 0.5) gunluk('Sayfa ' + virgul(dk, 1) + ' dakika arka plandaydı ve bu sürede yalnız ' + n + ' nesil eğitildi. Tarayıcılar arka plandaki sayfayı yavaşlatır ya da dondurur; hızlı eğitim için sayfa açık ve ekran açık kalsın.');
      gizliBas = 0; ekraniAcikTut(true);
    }
  });

  function yolIlerleme(son, n0) {
    if (Date.now() - sonKayitZamani > 3000) kaydet();
    if (Math.floor(egitici.nesil / 10) !== Math.floor(n0 / 10)) {
      gunluk('Nesil ' + egitici.nesil + ': ortalama ödül ' + virgul(son.ortOdul, 2) + ', hedefe gitme ' + yuzde(sonTest.gitBasari) +
        ', tarama ' + yuzde(sonTest.taraKapsama) + ', ileri-geri ' + virgul(sonTest.ortSalinim, 1) + '/bölüm');
      var ilk = egitici.gecmis[Math.max(0, egitici.gecmis.length - 30)];
      if (sonTest.gitBasari < 0.1 && ilk && son.ortOdul > ilk.ortOdul + 0.3)
        gunluk('Dikkat: puan artıyor ama hedefe gitme hâlâ %' + Math.round(sonTest.gitBasari * 100) + '. Robot şimdilik "hareket etmezsem çarpmam" diye ceza kaçırmayı öğreniyor (ödül açığı). Eğitime devam edince genelde geçer.');
    }
    sayaclar(); egriCiz();
  }
  function tik() {
    if (!egitiyor || isci) return;
    var t0 = performance.now(), son = null, n0 = egitici.nesil;
    do {
      egitici.ortam = ortam();
      son = egitici.nesilYap();
      denemeSayisi += egitici.cift * 2 * egitici.K;
    } while (performance.now() - t0 < 40);
    if (Math.floor(egitici.nesil / 5) !== Math.floor(n0 / 5)) degerlendirTest();
    hizEkle(egitici.nesil - n0);
    yolIlerleme(son, n0);
    setTimeout(tik, 0);
  }
  function isciMesaj(d) {
    if (d.tip !== 'ilerleme') return;
    if (d.tur === 'yol') {
      if (!egitiyor) return;
      var n0 = egitici.nesil;
      for (var i = 0; i < d.theta.length; i++) egitici.theta[i] = d.theta[i];      // canlı izleme aynı diziyi kullanır
      egitici.nesil = d.nesil; d.kayitlar.forEach(function (k) { egitici.gecmis.push(k); });
      denemeSayisi += d.deneme;
      if (d.test) sonTest = d.test;
      hizEkle(d.nesil - n0);
      yolIlerleme(d.kayitlar[d.kayitlar.length - 1], n0);
    } else if (typeof bIsciMesaj === 'function') bIsciMesaj(d);
  }
  function yolBaslat() {
    ekraniAcikTut(true); hizOlcum = [];
    if (isci) isci.postMessage({ tip: 'basla', tur: 'yol', beyin: egitici.theta.slice(), nesil: egitici.nesil, tohum: Date.now() % 1e9, lr: egitici.lr, sigma: egitici.sigma, cift: egitici.cift, K: egitici.K, ortam: ortam() });
    else tik();
  }
  function yolDurdur() { if (isci) isci.postMessage({ tip: 'dur' }); if (!egitimSuruyor()) ekraniAcikTut(false); }
  $('egitBtn').addEventListener('click', function () {
    egitiyor = !egitiyor;
    this.textContent = egitiyor ? '⏸ Duraklat' : '▶ Eğitime devam et';
    this.setAttribute('aria-pressed', String(egitiyor));
    if (egitiyor) {
      kaynak = 'Senin eğittiğin beyin';
      gunluk('Eğitim başladı.'); yolBaslat();
    } else { yolDurdur(); kaydet(); gunluk('Eğitim duraklatıldı (nesil ' + egitici.nesil + ').'); }
  });
  function durdur() { if (egitiyor) $('egitBtn').click(); }
  $('sifirBtn').addEventListener('click', function () {
    durdur();
    benimse(null, 'Boş beyin (sıfırdan)');
    gunluk('Yeni, boş beyin oluşturuldu: robot hiçbir şey bilmiyor, rastgele davranır. Eğitimi başlatınca öğrenir.');
    kaydet(); degerlendirTest(); sayaclar(); egriCiz(); yeniBolum();
  });
  $('hazirBtn').addEventListener('click', function () {
    durdur();
    if (hazirYukle()) { gunluk('Hazır eğitilmiş beyne dönüldü.'); kaydet(); degerlendirTest(); sayaclar(); egriCiz(); yeniBolum(); }
  });

  // ---------- Gerçeğe uyum ----------
  $('uyumBtn').addEventListener('click', function () {
    var btn = this; if (btn.disabled) return;
    var kosul = { kayma: 0.3, gurultu: 0.2, rastgeleEngel: 5 };
    var once = O.degerlendir(egitici.theta, 40, kosul, 4242);
    $('uyumSonuc').textContent = 'Önce: hedefe gitme ' + yuzde(once.gitBasari) + ', tarama ' + yuzde(once.taraKapsama) + '. Uyum deneniyor…';
    btn.disabled = true;
    var devam = egitiyor; egitiyor = false;
    var uyum = new O.Egitici({ beyin: egitici.theta, ortam: kosul, alanRastgele: false, sigma: 0.08, lr: 0.04, cift: 20, K: 6, tohum: 99 });
    var hedefNesil = 20;
    (function adim() {
      var t0 = performance.now();
      do { uyum.nesilYap(); } while (performance.now() - t0 < 40 && uyum.nesil < hedefNesil);
      $('uyumSonuc').textContent = 'Uyum: ' + uyum.nesil + '/' + hedefNesil + ' nesil…';
      if (uyum.nesil < hedefNesil) return setTimeout(adim, 0);
      var sonra = O.degerlendir(uyum.theta, 40, kosul, 4242);
      var m = 'Yeni koşullarda (kayma %30, gürültü): hedefe gitme ' + yuzde(once.gitBasari) + ' → ' + yuzde(sonra.gitBasari) +
        ', tarama ' + yuzde(once.taraKapsama) + ' → ' + yuzde(sonra.taraKapsama) + '.';
      if (sonra.gitBasari + sonra.taraKapsama >= once.gitBasari + once.taraKapsama) {
        egitici.theta = uyum.theta.slice(); egitici.adamSifirla(); m += ' Uyarlanmış beyin benimsendi.'; kaydet(); yeniBolum();
      } else m += ' İyileşme olmadığı için eski beyin korundu.';
      $('uyumSonuc').textContent = m; gunluk(m);
      btn.disabled = false;
      if (devam) { egitiyor = true; tik(); }
    })();
  });

  // ---------- Beyin dosyası ----------
  $('indirBtn').addEventListener('click', function () {
    var b = new Blob([JSON.stringify({ surum: O.SURUM, theta: egitici.theta, nesil: egitici.nesil, gecmis: egitici.gecmis, deneme: denemeSayisi })], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'robot-beyni-s' + O.SURUM + '.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('yukleGirdi').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var v = JSON.parse(r.result);
        if (beyinUygun(v)) { durdur(); benimse(v, 'Dosyadan yüklenen beyin'); gunluk('Beyin dosyası yüklendi.'); kaydet(); degerlendirTest(); sayaclar(); egriCiz(); yeniBolum(); }
        else gunluk('Bu dosya bu sürümün beyin biçimine uymuyor (eski sürümün beyni olabilir).');
      } catch (e) { gunluk('Dosya okunamadı.'); }
    };
    r.readAsText(f);
  });

  // ---------- Ayarlar ----------
  $('sicaklik').addEventListener('input', function () { $('sicDeger').textContent = virgul(+this.value, 2); });
  $('kayma').addEventListener('input', function () { $('kaymaDeger').textContent = this.value; if (isci && egitiyor) isci.postMessage({ tip: 'ortam', ortam: ortam() }); });
  $('canliHiz').addEventListener('input', function () { $('canliHizDeger').textContent = this.value; });
  $('canliMod').addEventListener('change', function () { yeniBolum(); });
  $('yeniBolum').addEventListener('click', function () { yeniBolum(); });
  $('paramSayi').textContent = O.PARAM_SAYISI;
  $('gizliSayi').textContent = O.GIZLI;

  // ---------- Ödül tablosu (kodla aynı sayılar) ----------
  (function odulTablosu() {
    var A = O.ODUL, satirlar = [
      ['Hedefe vardı', A.varis], ['Hedefe 1 kare yaklaştı (uzaklaşırsa eksi)', A.yaklasma],
      ['Taramada yeni yer gördü', A.yeniYer + ' × (yeni alan ÷ tüm ev)'],
      ['Her adım, hedefe giderken (oyalanmasın)', A.adimGit], ['Her adım, tararken', A.adimTara],
      ['Duvara/engele çarptı', A.carpma], ['Kapalı kapıyı açtı (zaman alır)', A.kapiAcma],
      ['Geri gitti (arkasını göremez)', A.geri], ['Aynı kareye 3. kez ve sonra bastı', A.tekrar],
      ['Az önce çıktığı kareye hemen döndü (ileri-geri)', A.salinim], ['Sola dönüp hemen sağa döndü (boşa dönüş)', A.bosaDonus],
      ['Aynı yöne 3. kez ve sonra üst üste döndü (yerinde fırıldak)', A.firildak],
      ['25 adım aynı 1-2 karede takılı kaldı: durur, sahibine haber verir', A.takildiDur]
    ];
    var tb = $('odulTablo');
    satirlar.forEach(function (s) {
      var tr = document.createElement('tr'), a = document.createElement('td'), b = document.createElement('td');
      a.textContent = s[0];
      b.textContent = typeof s[1] === 'number' ? (s[1] > 0 ? '+' : '') + virgul(s[1], s[1] % 1 && Math.abs(s[1]) < 0.01 ? 3 : 2) : '+' + String(s[1]).replace('.', ',');
      b.className = (typeof s[1] === 'number' ? s[1] : 1) > 0 ? 'arti' : 'eksi';
      tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
    });
  })();

  // ---------- Beceri beyinleri (kapak açma, eşya itme) ----------
  var BC = window.Beceri, HBC = window.HazirBeceri, BKAYIT = 'robotBeceri' + BC.SURUM + '_';
  var beceriBeyin = {};
  function beceriUygun(ad, v) { return v && Array.isArray(v.theta) && v.theta.length === BC.paramSayisi(BC.BECERILER[ad]); }
  function beceriHazir(ad) { var h = HBC && HBC[ad]; return beceriUygun(ad, h) ? { theta: h.theta.slice(), nesil: h.nesil, kaynak: 'Hazır eğitilmiş' } : { theta: BC.yeniBeyin(BC.BECERILER[ad], O.tohum(Date.now() % 1e9)), nesil: 0, kaynak: 'Boş' }; }
  Object.keys(BC.BECERILER).forEach(function (ad) {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(BKAYIT + ad)); } catch (e) { v = null; }
    beceriBeyin[ad] = beceriUygun(ad, v) ? v : beceriHazir(ad);
  });
  function beceriKaydet(ad) { try { localStorage.setItem(BKAYIT + ad, JSON.stringify(beceriBeyin[ad])); } catch (e) { /* kayıt yok */ } }

  // ---------- Canlı izleme ----------
  var bolum = null, ajan = null, bekle = 0, sonKare = 0, birikim = 0, sonOlas = null;
  var gorev = null, bOrtam = null, bAjan = null, bAd = null, bOlas = null;

  function serbestHucreler(b, odalar) {
    var m = b._bfs(b.x, b.y), o = [], x, y;
    for (y = 0; y < b.H; y++) for (x = 0; x < b.W; x++) {
      if (b.engel[y][x] || b.kapi[y][x] || m[y][x] >= 1e9) continue;
      var oda = D.odaBul ? D.odaBul(b.d, x, y) : null;
      if (odalar && odalar.indexOf(oda) < 0) continue;
      o.push({ x: x, y: y, uzak: m[y][x] });
    }
    return o;
  }
  function sec1(l, rng, enAz) { var u = l.filter(function (h) { return h.uzak >= (enAz || 0); }); if (!u.length) u = l; return u[Math.floor(rng() * u.length)]; }

  // Görev zincirleri: yol bulma beyni + beceri beyinleri birlikte
  var ZINCIR = {
    kumanda: function (b, rng) {
      var sahip = sec1(serbestHucreler(b, ['salon']), rng, 3), k = sec1(serbestHucreler(b), rng, 6);
      return { ad: 'Kumandayı getir', sahip: sahip, nesne: { x: k.x, y: k.y, tur: 'kumanda', ad: 'kumanda' }, asamalar: [
        { tip: 'git', x: k.x, y: k.y, ad: 'Kumandaya gidiyor' }, { tip: 'al', ad: 'Kumandayı aldı' },
        { tip: 'git', x: sahip.x, y: sahip.y, ad: 'Kumandayı sahibine götürüyor' }, { tip: 'ver', ad: 'Kumandayı sahibine verdi' }] };
    },
    sise: function (b, rng) {
      var sahip = sec1(serbestHucreler(b, ['salon']), rng, 3), k = sec1(serbestHucreler(b, ['mutfak']), rng, 4);
      return { ad: 'Şişeyi aç ve getir', sahip: sahip, nesne: { x: k.x, y: k.y, tur: 'sise', ad: 'şişe' }, asamalar: [
        { tip: 'git', x: k.x, y: k.y, ad: 'Mutfaktaki şişeye gidiyor' }, { tip: 'al', ad: 'Şişeyi bir eliyle tuttu' },
        { tip: 'beceri', beceri: 'kapak', ad: 'Kapağı açıyor (öbür el kayışla çeviriyor)' },
        { tip: 'git', x: sahip.x, y: sahip.y, ad: 'Şişeyi sahibine götürüyor' }, { tip: 'ver', ad: 'Şişeyi sahibine verdi' }] };
    },
    itme: function (b, rng) {
      var sahip = sec1(serbestHucreler(b, ['salon']), rng, 3), k = sec1(serbestHucreler(b, ['salon', 'yatak']), rng, 4), i = Math.floor(rng() * BC.ESYALAR.length);
      var BELIRTME = { sandalye: 'sandalyeyi', sehpa: 'sehpayı', 'küçük masa': 'küçük masayı', 'büyük masa': 'büyük masayı', kanepe: 'kanepeyi' };
      return { ad: 'Sahibi "şu ' + (BELIRTME[BC.ESYALAR[i][0]] || BC.ESYALAR[i][0]) + ' it" dedi', sahip: sahip, nesne: { x: k.x, y: k.y, tur: 'esya', ad: BC.ESYALAR[i][0] }, asamalar: [
        { tip: 'git', x: k.x, y: k.y, ad: BC.ESYALAR[i][0] + ' yanına gidiyor' },
        { tip: 'beceri', beceri: 'itme', secenek: { esya: i }, ad: 'Önce yavaşça deneyip itiyor ya da reddediyor' }] };
    }
  };

  function gorevMesaj(m, sinif) { gorev.mesajlar.push([m, sinif || '']); }
  function sonrakiAsama() {
    gorev.i++;
    if (gorev.i >= gorev.asamalar.length) { gorev.bitti = true; bolum.bitti = true; return; }
    var a = gorev.asamalar[gorev.i];
    if (a.tip === 'git') { bolum.hedefDegistir(a.x, a.y); return; }
    if (a.tip === 'al') { gorev.tasiyor = true; gorev.nesneAlindi = true; return sonrakiAsama(); }
    if (a.tip === 'ver') { gorev.tasiyor = false; gorev.basari = gorev.basari !== false; if (gorev.ek) gorevMesaj(a.ad + gorev.ek, ''); return sonrakiAsama(); }
    if (a.tip === 'beceri') {
      bAd = a.beceri; var B = BC.BECERILER[bAd];
      bOrtam = B.yeni(Object.assign({}, a.secenek || {}), O.tohum(Math.floor(Math.random() * 4e9)));
      bAjan = new BC.Ajan(B, beceriBeyin[bAd].theta); bOlas = null;
      $('beceriPanel').hidden = false; $('beceriBaslik').textContent = B.ad + ' — beyin: ' + beceriBeyin[bAd].kaynak + ' (' + beceriBeyin[bAd].nesil + ' nesil)';
    }
  }
  function beceriBitti() {
    var o = bOrtam, k = bAd;
    gorevMesaj(o.sonuc, o.kaza ? 'kotu' : o.basari ? 'iyi' : 'kotu');
    if (o.reddetti && o.basari) gorev.not = 'doğru karar: yapamayacağını anlayıp söyledi';
    bOrtam = null;
    if (k === 'kapak') {
      if (o.kaza) { gorev.bitti = true; gorev.basari = false; bolum.bitti = true; return; }
      if (o.reddetti) gorev.ek = o.basari ? ' (kapalı; açamadığını söyledi)' : ' (kapalı)';
      if (!o.basari) gorev.basari = false;
      return sonrakiAsama();
    }
    gorev.basari = o.basari; gorev.bitti = true; bolum.bitti = true;     // itme: zincirin sonu
  }

  function yeniBolum() {
    var mod = $('canliMod').value, rng = O.tohum(Math.floor(Math.random() * 4e9));
    gorev = null; bOrtam = null; $('beceriPanel').hidden = true;
    if (ZINCIR[mod]) {
      bolum = new O.Bolum(Object.assign({}, ortam(), { mod: 'git' }), rng);
      gorev = ZINCIR[mod](bolum, rng); gorev.i = -1; gorev.mesajlar = []; gorev.tasiyor = false;
      sonrakiAsama();
    } else bolum = new O.Bolum(Object.assign({ mod: mod }, ortam()), rng);
    ajan = new O.Ajan(egitici.theta);
    bekle = 0; sonOlas = null;
    ozetYaz();
  }

  var RENK = {}; D.MOBILYALAR.forEach(function (m) { RENK[m.id] = m.renk; });
  var ODA_RENK = { salon: '#f3e6d0', mutfak: '#eef3df', yatak: '#ece3f2', banyo: '#dfeef5' };
  function hucreCiz(c, x, y, renk) { c.fillStyle = renk; c.fillRect(x * CS, y * CS, CS, CS); }
  function izgara(c, W, H) {
    c.strokeStyle = 'rgba(0,0,0,0.06)'; c.lineWidth = 1;
    for (var x = 0; x <= W; x++) { c.beginPath(); c.moveTo(x * CS, 0); c.lineTo(x * CS, H * CS); c.stroke(); }
    for (var y = 0; y <= H; y++) { c.beginPath(); c.moveTo(0, y * CS); c.lineTo(W * CS, y * CS); c.stroke(); }
  }
  function gorusCiz(c, b) {                       // kameranın baktığı yön (yarı saydam yelpaze)
    var cx = (b.x + 0.5) * CS, cy = (b.y + 0.5) * CS, Y = O.YON[b.yon], t = Math.atan2(Y[1], Y[0]), a = 100 * Math.PI / 180;
    c.fillStyle = 'rgba(255,159,28,0.13)'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, CS * O.GORUS, t - a, t + a); c.closePath(); c.fill();
  }
  function nesneCiz(c, tur, cx, cy, olcek) {
    var s = CS * (olcek || 1);
    c.lineWidth = 1.5; c.strokeStyle = '#222';
    if (tur === 'kumanda') { c.fillStyle = '#333'; c.fillRect(cx - s * 0.12, cy - s * 0.3, s * 0.24, s * 0.6); c.fillStyle = '#e33'; c.fillRect(cx - s * 0.05, cy - s * 0.22, s * 0.1, s * 0.08); }
    else if (tur === 'sise') { c.fillStyle = '#9fd3ff'; c.fillRect(cx - s * 0.13, cy - s * 0.2, s * 0.26, s * 0.5); c.strokeRect(cx - s * 0.13, cy - s * 0.2, s * 0.26, s * 0.5); c.fillStyle = '#1b6fd1'; c.fillRect(cx - s * 0.08, cy - s * 0.34, s * 0.16, s * 0.12); }
    else if (tur === 'esya') { c.fillStyle = '#b07a46'; c.fillRect(cx - s * 0.35, cy - s * 0.25, s * 0.7, s * 0.5); c.strokeRect(cx - s * 0.35, cy - s * 0.25, s * 0.7, s * 0.5); }
    else if (tur === 'sahip') { c.fillStyle = '#2563eb'; c.beginPath(); c.arc(cx, cy - s * 0.12, s * 0.14, 0, 6.283); c.fill(); c.beginPath(); c.arc(cx, cy + s * 0.28, s * 0.26, Math.PI, 0); c.fill(); }
  }
  function gorevCiz(c, b) {
    if (!gorev) return;
    var s = gorev.sahip; nesneCiz(c, 'sahip', (s.x + 0.5) * CS, (s.y + 0.5) * CS);
    if (!gorev.nesneAlindi) nesneCiz(c, gorev.nesne.tur, (gorev.nesne.x + 0.5) * CS, (gorev.nesne.y + 0.5) * CS);
  }
  function robotCiz(c, b) {
    var cx = (b.x + 0.5) * CS, cy = (b.y + 0.5) * CS, Y = O.YON[b.yon], t = Math.atan2(Y[1], Y[0]);
    c.save(); c.translate(cx, cy); c.rotate(t);
    c.fillStyle = '#ff9f1c'; c.strokeStyle = '#7a4a00'; c.lineWidth = 2;
    c.beginPath(); c.rect(-CS * 0.34, -CS * 0.3, CS * 0.62, CS * 0.6); c.fill(); c.stroke();      // taban
    c.fillStyle = '#333'; c.fillRect(-CS * 0.1, -CS * 0.42, CS * 0.22, CS * 0.1); c.fillRect(-CS * 0.1, CS * 0.32, CS * 0.22, CS * 0.1);  // tekerlekler
    c.fillStyle = '#7a4a00'; c.beginPath(); c.moveTo(CS * 0.4, 0); c.lineTo(CS * 0.14, -CS * 0.16); c.lineTo(CS * 0.14, CS * 0.16); c.closePath(); c.fill();  // ön
    c.restore();
    if (gorev && gorev.tasiyor) nesneCiz(c, gorev.nesne.tur, cx + CS * 0.3, cy - CS * 0.3, 0.6);
  }
  function hedefCiz(c, b) {
    if (b.mod !== 'git' || gorev) return;
    var cx = (b.hx + 0.5) * CS, cy = (b.hy + 0.5) * CS;
    c.fillStyle = '#1b9e4b'; c.beginPath();
    for (var i = 0; i < 10; i++) { var r = i % 2 ? CS * 0.18 : CS * 0.4, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    c.closePath(); c.fill();
  }
  function ciz() {
    var b = bolum, W = b.W, H = b.H, x, y;
    var g = $('gercekCv'), h = $('hafizaCv');
    if (g.width !== W * CS) { g.width = h.width = W * CS; g.height = h.height = H * CS; }
    var c = g.getContext('2d'), m = h.getContext('2d');
    c.fillStyle = '#4a4f5c'; c.fillRect(0, 0, W * CS, H * CS);
    Object.keys(b.d.odalar).forEach(function (id) {
      var o = b.d.odalar[id]; c.fillStyle = ODA_RENK[id] || '#eee';
      c.fillRect(o.x0 * CS, o.y0 * CS, (o.x1 - o.x0 + 1) * CS, (o.y1 - o.y0 + 1) * CS);
    });
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var kp = b.kapi[y][x];
      if (kp) hucreCiz(c, x, y, kp.acik ? '#e9dcc0' : '#8b5a2b');
      else if (b.mobil[y][x]) hucreCiz(c, x, y, RENK[b.mobil[y][x]]);
      else if (b.engel[y][x] && !b.d.engel[y][x]) hucreCiz(c, x, y, '#9a7b5a');      // rastgele engel (koli)
    }
    izgara(c, W, H); gorusCiz(c, b); hedefCiz(c, b); gorevCiz(c, b); robotCiz(c, b);
    m.fillStyle = '#20242c'; m.fillRect(0, 0, W * CS, H * CS);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (!b.bilinen[y][x]) continue;
      var kk = b.kapi[y][x];
      if (kk) hucreCiz(m, x, y, kk.acik ? '#e9dcc0' : '#8b5a2b');
      else if (b.engel[y][x]) hucreCiz(m, x, y, b.mobil[y][x] ? RENK[b.mobil[y][x]] : (b.d.engel[y][x] ? '#59606f' : '#9a7b5a'));
      else hucreCiz(m, x, y, b.ziyaret[y][x] ? '#cfe8ff' : '#f1f3f6');
    }
    izgara(m, W, H);
    m.font = 'bold 11px system-ui, sans-serif'; m.textAlign = 'center';
    Object.keys(b.yerler).forEach(function (id) {
      var p = b.yerler[id]; m.fillStyle = '#146c2e';
      m.fillText('★ ' + O.BULUNACAK[id].split(' ')[0], (p.x + 0.5) * CS, (p.y + 0.5) * CS + 4);
    });
    hedefCiz(m, b); gorevCiz(m, b); robotCiz(m, b);
  }

  function cubuklar(adlar, olas, secili) {
    var kc = $('kararCubuk'); kc.textContent = ''; kc.style.gridTemplateColumns = 'repeat(' + (adlar.length <= 4 ? adlar.length : 3) + ', 1fr)';
    adlar.forEach(function (ad, i) {
      var p = olas ? olas[i] : 0, d = document.createElement('div'), cb = document.createElement('div'), ic = document.createElement('i');
      d.className = i === secili ? 'secili' : '';
      d.textContent = ad + ' ' + Math.round(p * 100) + '%';
      cb.className = 'cubuk'; ic.style.width = Math.round(p * 100) + '%'; cb.appendChild(ic); d.appendChild(cb); kc.appendChild(d);
    });
  }
  function hafizaCiz(h) {
    var hz = $('hafizaCubuk'); hz.textContent = ''; hz.style.gridTemplateColumns = 'repeat(' + Math.max(1, h.length) + ', 1fr)';
    $('gizliSayi').textContent = h.length;
    h.forEach(function (v) {
      var s = document.createElement('span');
      s.style.background = v >= 0 ? 'rgba(37,99,235,' + (0.15 + 0.85 * v) + ')' : 'rgba(255,159,28,' + (0.15 - 0.85 * v) + ')';
      s.title = virgul(v, 2); hz.appendChild(s);
    });
  }
  function beceriPanelYaz() {
    if (!bOrtam && !(gorev && gorev.sonBeceri)) return;
    var o = bOrtam || gorev.sonBeceri, ol = $('beceriOlcum'); ol.textContent = '';
    o.olcumler().forEach(function (r) {
      var d = document.createElement('div'), ad = document.createElement('span'), cb = document.createElement('div'), ic = document.createElement('i'), dg = document.createElement('span');
      d.className = 'olcum ' + r[4]; ad.textContent = r[0]; dg.textContent = (r[2] >= 20 || r[3] === 'kez' || r[3] === 'adım' || r[3] === '' ? Math.round(r[1]) : virgul(r[1], 1)) + ' ' + r[3];
      cb.className = 'cubuk'; ic.style.width = Math.min(100, Math.round(r[1] / r[2] * 100)) + '%'; cb.appendChild(ic);
      d.appendChild(ad); d.appendChild(cb); d.appendChild(dg); ol.appendChild(d);
    });
    $('beceriGizli').textContent = 'Denetçi bilgisi — ' + o.gizli().replace(/(\d)\.(\d)/g, '$1,$2');
    $('beceriSonuc').textContent = o.bitti ? o.sonuc : 'Adım ' + o.adim + ' · puan ' + virgul(o.toplam, 2);
  }

  function ozetYaz() {
    var b = bolum; if (!b) return;
    var takildi = !b.bitti && b.takilma() >= 1 ? ' · ⚠ takılıyorum (' + b.takiliSure + '/15), başka yol arıyorum' : '';
    if (gorev) {
      var a = gorev.asamalar[Math.min(gorev.i, gorev.asamalar.length - 1)];
      var durumG = gorev.bitti ? (gorev.basari ? (gorev.not ? '✔ görev bitti — ' + gorev.not : '✔ görev tamam') : '✘ görev tamamlanamadı') : (b.bitti && !b.basari && !bOrtam ? (b.durdu ? '✋ takıldım: durdum, sahibime haber veriyorum' : '✘ süre doldu') : '▶ ' + a.ad);
      $('canliOzet').textContent = 'Görev: ' + gorev.ad + ' · ' + durumG + ' · adım ' + b.adim + ' · çarpma ' + b.carpma + takildi;
      var ga = $('gorevAdim'); ga.textContent = '';
      gorev.asamalar.forEach(function (x, i) {
        var li = document.createElement('li');
        li.textContent = (i < gorev.i || gorev.bitti && i <= gorev.i ? '✔ ' : i === gorev.i ? '▶ ' : '○ ') + x.ad;
        li.className = i === gorev.i && !gorev.bitti ? 'simdi' : '';
        ga.appendChild(li);
      });
      gorev.mesajlar.forEach(function (m) { var li = document.createElement('li'); li.textContent = '→ ' + m[0]; li.className = 'mesaj ' + m[1]; ga.appendChild(li); });
    } else {
      var durum = b.bitti ? (b.basari ? '✔ başardı' : b.durdu ? '✋ takıldım: durdum, sahibime haber veriyorum' : '✘ süre doldu') : 'çalışıyor';
      $('canliOzet').textContent = (b.mod === 'git' ? 'Görev: hedefe git (yeşil yıldız)' : 'Görev: evi tara (süpürge)') +
        ' · adım ' + b.adim + '/' + b.maksAdim + ' · ödül ' + virgul(b.toplam, 2) + ' · ' + durum +
        (b.mod === 'tara' ? ' · kapsam ' + yuzde(b.kapsama()) : '') + ' · çarpma ' + b.carpma + ' · ileri-geri ' + b.salinim + ' · fırıldak ' + b.firildakSayisi + takildi;
      $('gorevAdim').textContent = '';
    }
    if (bOrtam) { cubuklar(BC.BECERILER[bAd].EYLEM_AD, bOlas, bOrtam.sonEylem); hafizaCiz(bAjan.h); }
    else { cubuklar(O.EYLEM_AD, sonOlas, b.sonEylem); hafizaCiz(ajan ? ajan.h : []); }
    beceriPanelYaz();
    var yl = $('yerListe'); yl.textContent = '';
    Object.keys(O.BULUNACAK).forEach(function (id) {
      var s = document.createElement('span'), y = b.yerler[id];
      s.className = y ? 'bulundu' : 'yok';
      s.textContent = O.BULUNACAK[id] + (y ? ' → (' + y.x + ',' + y.y + ') adım ' + y.adim : ' → henüz görmedi');
      yl.appendChild(s);
    });
  }

  function tekAdim() {
    var sic = +$('sicaklik').value;
    if (bOrtam) {
      var cb = bAjan.karar(bOrtam.gozlem());
      bOlas = O.olasiliklar(cb, Math.max(0.05, sic));
      bOrtam.ilerle(O.sec(cb, sic, Math.random));
      if (bOrtam.bitti) { gorev.sonBeceri = bOrtam; beceriBitti(); }
      return;
    }
    var cikis = ajan.karar(bolum.gozlem());
    sonOlas = O.olasiliklar(cikis, Math.max(0.05, sic));
    bolum.ilerle(O.sec(cikis, sic, Math.random));
    if (gorev && bolum.bitti && bolum.basari && !gorev.bitti) sonrakiAsama();
    else if (gorev && bolum.bitti && !bolum.basari) { gorev.bitti = true; gorev.basari = false; }
  }
  function bitti() { return gorev ? gorev.bitti : bolum.bitti; }

  function dongu(t) {
    window.requestAnimationFrame(dongu);
    if (!bolum) return;
    var hiz = +$('canliHiz').value, dt = Math.min(0.25, (t - sonKare) / 1000); sonKare = t;
    if (bitti()) {
      bekle += dt;
      if (bekle > (gorev ? 3 : 1.5)) yeniBolum();
    } else {
      birikim += dt * hiz;
      var adimVar = false;
      while (birikim >= 1 && !bitti()) { birikim -= 1; adimVar = true; tekAdim(); }
      if (!adimVar) return;
    }
    ciz(); ozetYaz();
  }

  // ---------- Beceri eğitimi ----------
  var bEgitici = null, bEgitiyor = false, bSonTest = null;
  function bSecili() { return $('beceriSec').value; }
  function bEgiticiKur() {
    var ad = bSecili(), v = beceriBeyin[ad];
    bEgitici = new BC.Egitici(BC.BECERILER[ad], { beyin: v.theta, nesil: v.nesil, tohum: Date.now() % 1e9, lr: v.nesil > 100 ? 0.03 : 0.06, sigma: v.nesil > 100 ? 0.1 : 0.15 });
    bSonTest = null; bYaz(); setTimeout(bTest, 30);
  }
  function bTest() { bSonTest = BC.degerlendir(BC.BECERILER[bSecili()], bEgitici.theta, 200, 4242); bYaz(); }
  function bYaz() {
    var ad = bSecili(), v = beceriBeyin[ad];
    $('bNesil').textContent = bEgitici ? bEgitici.nesil : v.nesil;
    $('bBasari').textContent = bSonTest ? yuzde(bSonTest.basari) : '–';
    $('bRed').textContent = bSonTest ? yuzde(bSonTest.dogruRed) : '–';
    $('bKaza').textContent = bSonTest ? yuzde(bSonTest.kaza) : '–';
    $('bKaynak').textContent = v.kaynak + ' (' + v.nesil + ' nesil)';
    $('bAciklama').textContent = ad === 'kapak' ? 'Başarı: açılabilir kapağı açma. Doğru red: robotun gücünü aşan kapakta denedikten sonra "açamıyorum" deme. Kaza: şişeyi ezme ya da düşürme.'
      : 'Başarı: itilebilir eşyayı 50 cm itme. Doğru red: ağır eşyada ya da devrilme riskinde yavaşça denedikten sonra "yapamam" deme. Kaza: devrilme (simülasyonda).';
  }
  function bIlerleme(n0, testVar) {
    var ad = bSecili();
    beceriBeyin[ad] = { theta: bEgitici.theta.slice(), nesil: bEgitici.nesil, kaynak: 'Senin eğittiğin' };
    if (Math.floor(bEgitici.nesil / 10) !== Math.floor(n0 / 10)) {
      if (!testVar) bTest();
      beceriKaydet(ad);
      gunluk(BC.BECERILER[ad].ad + ' nesil ' + bEgitici.nesil + ': başarı ' + yuzde(bSonTest.basari) + ', doğru red ' + yuzde(bSonTest.dogruRed) + ', kaza ' + yuzde(bSonTest.kaza));
    }
    hizEkle(bEgitici.nesil - n0); bYaz();
  }
  function bTik() {
    if (!bEgitiyor || isci) return;
    var t0 = performance.now(), n0 = bEgitici.nesil;
    do { bEgitici.nesilYap(); } while (performance.now() - t0 < 40);
    bIlerleme(n0, false);
    setTimeout(bTik, 0);
  }
  function bIsciMesaj(d) {
    if (!bEgitiyor || d.tur !== bSecili()) return;
    var n0 = bEgitici.nesil;
    bEgitici.theta = d.theta.slice(); bEgitici.nesil = d.nesil;
    if (d.test) bSonTest = d.test;
    bIlerleme(n0, !!d.test || !!bSonTest);
  }
  function bBaslat() {
    ekraniAcikTut(true); hizOlcum = [];
    if (isci) isci.postMessage({ tip: 'basla', tur: bSecili(), beyin: bEgitici.theta.slice(), nesil: bEgitici.nesil, tohum: Date.now() % 1e9, lr: bEgitici.lr, sigma: bEgitici.sigma, cift: bEgitici.cift, K: bEgitici.K });
    else bTik();
  }
  $('bEgitBtn').addEventListener('click', function () {
    bEgitiyor = !bEgitiyor;
    this.textContent = bEgitiyor ? '⏸ Duraklat' : '▶ Beceriyi eğit';
    this.setAttribute('aria-pressed', String(bEgitiyor));
    if (bEgitiyor) { durdur(); gunluk(BC.BECERILER[bSecili()].ad + ' eğitimi başladı.'); bBaslat(); }
    else { if (isci) isci.postMessage({ tip: 'dur' }); if (!egitimSuruyor()) ekraniAcikTut(false); beceriKaydet(bSecili()); gunluk('Beceri eğitimi duraklatıldı.'); }
  });
  function bDurdur() { if (bEgitiyor) $('bEgitBtn').click(); }
  $('egitBtn').addEventListener('click', function () { if (egitiyor) bDurdur(); });
  $('beceriSec').addEventListener('change', function () { bDurdur(); bEgiticiKur(); });
  $('bHazirBtn').addEventListener('click', function () { bDurdur(); var ad = bSecili(); beceriBeyin[ad] = beceriHazir(ad); beceriKaydet(ad); gunluk(BC.BECERILER[ad].ad + ': hazır eğitilmiş beyne dönüldü.'); bEgiticiKur(); });
  $('bSifirBtn').addEventListener('click', function () {
    bDurdur(); var ad = bSecili(), B = BC.BECERILER[ad];
    beceriBeyin[ad] = { theta: BC.yeniBeyin(B, O.tohum(Date.now() % 1e9)), nesil: 0, kaynak: 'Boş' }; beceriKaydet(ad);
    gunluk(B.ad + ': boş beyin. Görev zincirinde bu beceri artık rastgele davranır; "Beceriyi eğit" ile öğret.'); bEgiticiKur();
  });
  window.addEventListener('pagehide', function () { if (bEgitici) beceriKaydet(bSecili()); });

  // Beceri ödül tabloları (kodla aynı sayılar)
  (function () {
    var ADLAR = { adim: 'Her adım (oyalanmasın)', ilerleme: 'İlerleme (her çeyrek tur / her 5 cm)', kayisKaydi: 'Kayış kaydı (fazla tork)', siseKaydi: 'Şişe elinde döndü (az sıktı)',
      acti: 'Kapağı açtı', ezdi: 'Şişeyi ezdi', dusurdu: 'Şişeyi düşürdü', patinaj: 'Tekerlek patinajı', tehlike: 'Devrilmeye çok yaklaştı (eğim > %80)', itti: 'Eşyayı itti (50 cm)', devrildi: 'Devrildi',
      dogruRed: 'Denedikten sonra doğru "yapamam" dedi', yanlisRed: 'Yapabileceği işe "yapamam" dedi', denemedenRed: 'Hiç denemeden "yapamam" dedi', kararsiz: 'Süre doldu, karar vermedi (sahibini bekletti)' };
    var tb = $('beceriOdulTablo');
    Object.keys(BC.BECERILER).forEach(function (k) {
      var B = BC.BECERILER[k], tr0 = document.createElement('tr'), th = document.createElement('th');
      th.colSpan = 2; th.textContent = B.ad; tr0.appendChild(th); tb.appendChild(tr0);
      Object.keys(B.ODUL).forEach(function (o) {
        var v = B.ODUL[o], tr = document.createElement('tr'), a = document.createElement('td'), b = document.createElement('td');
        a.textContent = ADLAR[o] || o; b.textContent = (v > 0 ? '+' : '') + virgul(v, 2); b.className = v > 0 ? 'arti' : 'eksi';
        tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
      });
    });
    var tr = document.createElement('tr'), a = document.createElement('td'), b = document.createElement('td');
    a.textContent = 'Öğretmen ipucu: doğru kavrama/torka ya da güvenli kuvvete yaklaşma (gizli değerleri simülasyon bilir, robot görmez)'; b.textContent = 'en çok +0,6'; b.className = 'arti';
    tr.appendChild(a); tr.appendChild(b); tb.appendChild(tr);
  })();

  sayaclar(); egriCiz(); yeniBolum(); ciz(); bEgiticiKur();
  setTimeout(function () {
    degerlendirTest(); sayaclar();
    if (kaynak !== 'Hazır eğitilmiş beyin' && sonTest.gitBasari < 0.5)
      gunluk('Not: bu beyin henüz az eğitilmiş (hedefe gitme ' + yuzde(sonTest.gitBasari) + '). Takılabilir ya da yerinde dönebilir. Eğitime devam et ya da "Hazır eğitilmiş beyne dön"e bas.');
  }, 50);
  window.requestAnimationFrame(dongu);
})();
