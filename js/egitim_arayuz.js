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
  function tik() {
    if (!egitiyor) return;
    var t0 = performance.now(), son = null, n0 = egitici.nesil;
    do {
      egitici.ortam = ortam();
      son = egitici.nesilYap();
      denemeSayisi += egitici.cift * 2 * egitici.K;
    } while (performance.now() - t0 < 40);
    if (Math.floor(egitici.nesil / 5) !== Math.floor(n0 / 5)) degerlendirTest();
    if (Date.now() - sonKayitZamani > 3000) kaydet();
    if (Math.floor(egitici.nesil / 10) !== Math.floor(n0 / 10)) {
      gunluk('Nesil ' + egitici.nesil + ': ortalama ödül ' + virgul(son.ortOdul, 2) + ', hedefe gitme ' + yuzde(sonTest.gitBasari) +
        ', tarama ' + yuzde(sonTest.taraKapsama) + ', ileri-geri ' + virgul(sonTest.ortSalinim, 1) + '/bölüm');
    }
    sayaclar(); egriCiz();
    setTimeout(tik, 0);
  }
  $('egitBtn').addEventListener('click', function () {
    egitiyor = !egitiyor;
    this.textContent = egitiyor ? '⏸ Duraklat' : '▶ Eğitime devam et';
    this.setAttribute('aria-pressed', String(egitiyor));
    if (egitiyor) {
      kaynak = 'Senin eğittiğin beyin';
      gunluk('Eğitim başladı.'); tik();
    } else { kaydet(); gunluk('Eğitim duraklatıldı (nesil ' + egitici.nesil + ').'); }
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
  $('kayma').addEventListener('input', function () { $('kaymaDeger').textContent = this.value; });
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
      ['Az önce çıktığı kareye hemen döndü (ileri-geri)', A.salinim], ['Sola dönüp hemen sağa döndü (boşa dönüş)', A.bosaDonus]
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

  // ---------- Canlı izleme ----------
  var bolum = null, ajan = null, bekle = 0, sonKare = 0, birikim = 0, sonOlas = null;
  function yeniBolum() {
    bolum = new O.Bolum(Object.assign({ mod: $('canliMod').value }, ortam()), O.tohum(Math.floor(Math.random() * 4e9)));
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
  function robotCiz(c, b) {
    var cx = (b.x + 0.5) * CS, cy = (b.y + 0.5) * CS, Y = O.YON[b.yon], t = Math.atan2(Y[1], Y[0]);
    c.save(); c.translate(cx, cy); c.rotate(t);
    c.fillStyle = '#ff9f1c'; c.strokeStyle = '#7a4a00'; c.lineWidth = 2;
    c.beginPath(); c.rect(-CS * 0.34, -CS * 0.3, CS * 0.62, CS * 0.6); c.fill(); c.stroke();      // taban
    c.fillStyle = '#333'; c.fillRect(-CS * 0.1, -CS * 0.42, CS * 0.22, CS * 0.1); c.fillRect(-CS * 0.1, CS * 0.32, CS * 0.22, CS * 0.1);  // tekerlekler
    c.fillStyle = '#7a4a00'; c.beginPath(); c.moveTo(CS * 0.4, 0); c.lineTo(CS * 0.14, -CS * 0.16); c.lineTo(CS * 0.14, CS * 0.16); c.closePath(); c.fill();  // ön
    c.restore();
  }
  function hedefCiz(c, b) {
    if (b.mod !== 'git') return;
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
    izgara(c, W, H); gorusCiz(c, b); hedefCiz(c, b); robotCiz(c, b);
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
    hedefCiz(m, b); robotCiz(m, b);
  }

  function ozetYaz() {
    var b = bolum; if (!b) return;
    var durum = b.bitti ? (b.basari ? '✔ başardı' : '✘ süre doldu') : 'çalışıyor';
    var takildi = b.takilma() >= 1 ? ' · ⚠ takıldım, başka yol arıyorum' : '';
    $('canliOzet').textContent = (b.mod === 'git' ? 'Görev: hedefe git (yeşil yıldız)' : 'Görev: evi tara (süpürge)') +
      ' · adım ' + b.adim + '/' + b.maksAdim + ' · ödül ' + virgul(b.toplam, 2) + ' · ' + durum +
      (b.mod === 'tara' ? ' · kapsam ' + yuzde(b.kapsama()) : '') + ' · çarpma ' + b.carpma + ' · ileri-geri ' + b.salinim + takildi;
    var kc = $('kararCubuk'); kc.textContent = '';
    for (var i = 0; i < 4; i++) {
      var p = sonOlas ? sonOlas[i] : 0, d = document.createElement('div'), cb = document.createElement('div'), ic = document.createElement('i');
      d.className = i === b.sonEylem ? 'secili' : '';
      d.textContent = O.EYLEM_AD[i] + ' ' + Math.round(p * 100) + '%';
      cb.className = 'cubuk'; ic.style.width = Math.round(p * 100) + '%'; cb.appendChild(ic); d.appendChild(cb); kc.appendChild(d);
    }
    var hz = $('hafizaCubuk'); hz.textContent = '';
    (ajan ? ajan.h : []).forEach(function (v) {
      var s = document.createElement('span');
      s.style.background = v >= 0 ? 'rgba(37,99,235,' + (0.15 + 0.85 * v) + ')' : 'rgba(255,159,28,' + (0.15 - 0.85 * v) + ')';
      s.title = virgul(v, 2); hz.appendChild(s);
    });
    var yl = $('yerListe'); yl.textContent = '';
    Object.keys(O.BULUNACAK).forEach(function (id) {
      var s = document.createElement('span'), y = b.yerler[id];
      s.className = y ? 'bulundu' : 'yok';
      s.textContent = O.BULUNACAK[id] + (y ? ' → (' + y.x + ',' + y.y + ') adım ' + y.adim : ' → henüz görmedi');
      yl.appendChild(s);
    });
  }

  function dongu(t) {
    window.requestAnimationFrame(dongu);
    if (!bolum) return;
    var hiz = +$('canliHiz').value, dt = Math.min(0.25, (t - sonKare) / 1000); sonKare = t;
    if (bolum.bitti) {
      bekle += dt;
      if (bekle > 1.5) yeniBolum();
    } else {
      birikim += dt * hiz;
      var adimVar = false;
      while (birikim >= 1 && !bolum.bitti) {
        birikim -= 1; adimVar = true;
        var cikis = ajan.karar(bolum.gozlem()), sic = +$('sicaklik').value;
        sonOlas = O.olasiliklar(cikis, Math.max(0.05, sic));
        bolum.ilerle(O.sec(cikis, sic, Math.random));
      }
      if (!adimVar) return;
    }
    ciz(); ozetYaz();
  }

  sayaclar(); egriCiz(); yeniBolum(); ciz();
  setTimeout(function () { degerlendirTest(); sayaclar(); }, 50);
  window.requestAnimationFrame(dongu);
})();
