/*
 * egitim_arayuz.js — Eğitim Laboratuvarı sayfası: eğitimi koşturur, robotu canlı izletir.
 */
(function () {
  'use strict';
  var O = window.Ogrenme, D = window.Dunya;
  var CS = 28;
  var $ = function (id) { return document.getElementById(id); };
  var virgul = function (n, k) { return n.toFixed(k).replace('.', ','); };
  var yuzde = function (n) { return Math.round(n * 100) + '%'; };

  var egitici = new O.Egitici({ tohum: Date.now() % 1e9, lr: 0.1, sigma: 0.2, cift: 20, K: 6 });
  var egitiyor = false, denemeSayisi = 0, sonTest = { gitBasari: null, taraKapsama: null };
  var KAYIT = 'robotBeyni1';

  // ---------- Günlük ----------
  function gunluk(m) {
    var li = document.createElement('li'); li.textContent = m;
    var ol = $('gunluk'); ol.insertBefore(li, ol.firstChild);
    while (ol.children.length > 60) ol.removeChild(ol.lastChild);
  }

  // ---------- Kayıt ----------
  function kaydet() {
    try {
      localStorage.setItem(KAYIT, JSON.stringify({ theta: egitici.theta, nesil: egitici.nesil, gecmis: egitici.gecmis, deneme: denemeSayisi }));
    } catch (e) { /* önemli değil */ }
  }
  function yukle(v) {
    if (!v || !Array.isArray(v.theta) || v.theta.length !== O.PARAM_SAYISI) return false;
    egitici.theta = v.theta.slice(); egitici.nesil = v.nesil || 0; egitici.gecmis = v.gecmis || [];
    egitici.m.fill(0); egitici.v.fill(0);
    denemeSayisi = v.deneme || 0;
    return true;
  }
  try { var k = localStorage.getItem(KAYIT); if (k && yukle(JSON.parse(k))) gunluk('Önceki beyin yüklendi (nesil ' + egitici.nesil + ').'); } catch (e) { /* yok */ }

  // ---------- Sayaçlar ve eğri ----------
  function sayaclar() {
    $('sNesil').textContent = egitici.nesil;
    $('sDeneme').textContent = denemeSayisi;
    $('sGit').textContent = sonTest.gitBasari === null ? '–' : yuzde(sonTest.gitBasari);
    $('sTara').textContent = sonTest.taraKapsama === null ? '–' : yuzde(sonTest.taraKapsama);
  }
  function egriCiz() {
    var cv = $('egriCv'), c = cv.getContext('2d'), W = cv.width = 640, H = cv.height = 280;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = '#e3e7ec'; c.lineWidth = 1; c.fillStyle = '#5b6773'; c.font = '12px system-ui, sans-serif';
    for (var i = 0; i <= 4; i++) { var y = 20 + i * (H - 40) / 4; c.beginPath(); c.moveTo(40, y); c.lineTo(W - 10, y); c.stroke(); }
    c.fillText('1,0', 8, 24); c.fillText('0', 18, H - 16);
    var g = egitici.gecmis;
    if (g.length < 2) { c.fillText('Eğitim başlayınca eğri çizilir.', 60, H / 2); return; }
    var n = g.length, x = function (i) { return 40 + (W - 50) * i / (n - 1); };
    function cizgi(renk, f) {
      c.strokeStyle = renk; c.lineWidth = 2; c.beginPath();
      for (var j = 0; j < n; j++) { var yy = 20 + (H - 40) * (1 - f(g[j], j)); if (j) c.lineTo(x(j), yy); else c.moveTo(x(j), yy); }
      c.stroke();
    }
    var mn = Math.min.apply(null, g.map(function (a) { return a.ortOdul; })), mx = Math.max.apply(null, g.map(function (a) { return a.ortOdul; }));
    var ar = Math.max(0.01, mx - mn);
    function yum(f) { var s = [], t = 0; return function (a, j) { return f(a, j); }; }
    cizgi('#ff9f1c', function (a) { return (a.ortOdul - mn) / ar; });
    // Başarı: 5 nesillik ortalama (gürültü azalsın)
    cizgi('#2563eb', function (a, j) {
      var t = 0, say = 0;
      for (var q = Math.max(0, j - 4); q <= j; q++) { t += g[q].gitBasari; say++; }
      return t / say;
    });
    c.fillStyle = '#5b6773'; c.fillText('nesil 1', 40, H - 4); c.fillText('nesil ' + n, W - 70, H - 4);
  }

  // ---------- Eğitim döngüsü ----------
  function bolumSecenegi(mod) {
    return { mod: mod, kayma: +$('kayma').value / 100, gurultu: +$('kayma').value > 0 ? 0.1 : 0, rastgeleEngel: 5 };
  }
  function degerlendirTest() {
    var t = O.degerlendir(egitici.theta, 24, { kayma: +$('kayma').value / 100, gurultu: +$('kayma').value > 0 ? 0.1 : 0, rastgeleEngel: 5 }, 777);
    sonTest = t;
  }
  function tik() {
    if (!egitiyor) return;
    var t0 = performance.now(), sonKayit = null;
    do {
      egitici.ortam = { kayma: +$('kayma').value / 100, gurultu: +$('kayma').value > 0 ? 0.1 : 0, rastgeleEngel: 5 };
      sonKayit = egitici.nesilYap();
      denemeSayisi += egitici.cift * 2 * egitici.K;
    } while (performance.now() - t0 < 40);
    if (egitici.nesil % 5 < 1 || !sonTest.gitBasari && sonTest.gitBasari !== 0) degerlendirTest();
    if (egitici.nesil % 10 === 0) {
      gunluk('Nesil ' + egitici.nesil + ': ortalama ödül ' + virgul(sonKayit.ortOdul, 2) + ', hedefe gitme %' + Math.round(sonTest.gitBasari * 100) + ', tarama %' + Math.round(sonTest.taraKapsama * 100));
      kaydet();
    }
    sayaclar(); egriCiz();
    setTimeout(tik, 0);
  }
  $('egitBtn').addEventListener('click', function () {
    egitiyor = !egitiyor;
    this.textContent = egitiyor ? '⏸ Duraklat' : '▶ Eğitimi başlat';
    this.setAttribute('aria-pressed', String(egitiyor));
    if (egitiyor) { gunluk('Eğitim başladı.'); tik(); } else { kaydet(); gunluk('Eğitim duraklatıldı (nesil ' + egitici.nesil + ').'); }
  });
  $('sifirBtn').addEventListener('click', function () {
    egitici = new O.Egitici({ tohum: Date.now() % 1e9, lr: 0.1, sigma: 0.2, cift: 20, K: 6 });
    denemeSayisi = 0; sonTest = { gitBasari: null, taraKapsama: null };
    gunluk('Yeni, boş beyin oluşturuldu (rastgele davranır).');
    kaydet(); sayaclar(); egriCiz(); yeniBolum();
  });

  // ---------- Gerçeğe uyum ----------
  $('uyumBtn').addEventListener('click', function () {
    var btn = this; if (btn.disabled) return;
    var kosul = { kayma: 0.3, gurultu: 0.2, rastgeleEngel: 5 };
    var once = O.degerlendir(egitici.theta, 40, kosul, 4242);
    $('uyumSonuc').textContent = 'Önce: hedefe gitme %' + Math.round(once.gitBasari * 100) + ', tarama %' + Math.round(once.taraKapsama * 100) + '. Uyum deneniyor…';
    btn.disabled = true;
    var wasEgitiyor = egitiyor; egitiyor = false;
    var uyum = new O.Egitici({ beyin: egitici.theta, ortam: kosul, alanRastgele: false, sigma: 0.08, lr: 0.04, cift: 20, K: 6, tohum: 99 });
    var hedefNesil = 20;
    (function adim() {
      var t0 = performance.now();
      do { uyum.nesilYap(); } while (performance.now() - t0 < 40 && uyum.nesil < hedefNesil);
      $('uyumSonuc').textContent = 'Uyum: ' + uyum.nesil + '/' + hedefNesil + ' nesil…';
      if (uyum.nesil < hedefNesil) return setTimeout(adim, 0);
      var sonra = O.degerlendir(uyum.theta, 40, kosul, 4242);
      var m = 'Yeni koşullarda (kayma %30, gürültü): hedefe gitme %' + Math.round(once.gitBasari * 100) + ' → %' + Math.round(sonra.gitBasari * 100) +
        ', tarama %' + Math.round(once.taraKapsama * 100) + ' → %' + Math.round(sonra.taraKapsama * 100) + '. Beyin güncellendi.';
      $('uyumSonuc').textContent = m; gunluk(m);
      egitici.theta = uyum.theta.slice(); egitici.m.fill(0); egitici.v.fill(0);
      kaydet(); btn.disabled = false;
      if (wasEgitiyor) { egitiyor = true; tik(); }
    })();
  });

  // ---------- Beyin dosyası ----------
  $('indirBtn').addEventListener('click', function () {
    var b = new Blob([JSON.stringify({ theta: egitici.theta, nesil: egitici.nesil, gecmis: egitici.gecmis, deneme: denemeSayisi })], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'robot-beyni.json'; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('yukleGirdi').addEventListener('change', function () {
    var f = this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        if (yukle(JSON.parse(r.result))) { gunluk('Beyin dosyası yüklendi (nesil ' + egitici.nesil + ').'); kaydet(); degerlendirTest(); sayaclar(); egriCiz(); yeniBolum(); }
        else gunluk('Bu dosya bu beyin biçimine uymuyor.');
      } catch (e) { gunluk('Dosya okunamadı.'); }
    };
    r.readAsText(f);
  });

  // ---------- Ayarlar ----------
  $('sicaklik').addEventListener('input', function () { $('sicDeger').textContent = virgul(+this.value, 2).replace(/0$/, ''); });
  $('kayma').addEventListener('input', function () { $('kaymaDeger').textContent = this.value; });
  $('canliHiz').addEventListener('input', function () { $('canliHizDeger').textContent = this.value; });
  $('canliMod').addEventListener('change', function () { yeniBolum(); });
  $('yeniBolum').addEventListener('click', function () { yeniBolum(); });
  $('paramSayi').textContent = O.PARAM_SAYISI;

  // ---------- Canlı izleme ----------
  var bolum = null, bekle = 0, sonKare = 0, birikim = 0, sonOlas = null, sonGoz = null;
  function yeniBolum() {
    var mod = $('canliMod').value;
    bolum = new O.Bolum(bolumSecenegi(mod), O.tohum(Math.floor(Math.random() * 4e9)));
    bekle = 0; sonOlas = null; sonGoz = null;
    ozetYaz();
  }

  var FURNITURE = {}; D.MOBILYALAR.forEach(function (m) { FURNITURE[m.id] = m.renk; });
  function hucreCiz(c, x, y, renk) { c.fillStyle = renk; c.fillRect(x * CS, y * CS, CS, CS); }
  function izgara(c, W, H) {
    c.strokeStyle = 'rgba(0,0,0,0.06)'; c.lineWidth = 1;
    for (var x = 0; x <= W; x++) { c.beginPath(); c.moveTo(x * CS, 0); c.lineTo(x * CS, H * CS); c.stroke(); }
    for (var y = 0; y <= H; y++) { c.beginPath(); c.moveTo(0, y * CS); c.lineTo(W * CS, y * CS); c.stroke(); }
  }
  function robotCiz(c, b) {
    c.fillStyle = '#ff9f1c'; c.strokeStyle = '#7a4a00'; c.lineWidth = 2;
    c.beginPath(); c.arc((b.x + 0.5) * CS, (b.y + 0.5) * CS, CS * 0.36, 0, 6.283); c.fill(); c.stroke();
    if (b.sonEylem >= 0) {
      var ye = O.YON[b.sonEylem]; c.fillStyle = '#7a4a00';
      c.beginPath(); c.arc((b.x + 0.5 + ye[0] * 0.25) * CS, (b.y + 0.5 + ye[1] * 0.25) * CS, 4, 0, 6.283); c.fill();
    }
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
    g.width = h.width = W * CS; g.height = h.height = H * CS;
    var c = g.getContext('2d'), m = h.getContext('2d');
    // Gerçek ev
    c.fillStyle = '#4a4f5c'; c.fillRect(0, 0, W * CS, H * CS);
    Object.keys(b.d.odalar).forEach(function (id) {
      var o = b.d.odalar[id]; c.fillStyle = { salon: '#f3e6d0', mutfak: '#eef3df', yatak: '#ece3f2', banyo: '#dfeef5' }[id];
      c.fillRect(o.x0 * CS, o.y0 * CS, (o.x1 - o.x0 + 1) * CS, (o.y1 - o.y0 + 1) * CS);
    });
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var kp = b.kapi[y][x];
      if (kp) hucreCiz(c, x, y, kp.acik ? '#e9dcc0' : '#8b5a2b');
      else if (b.mobil[y][x]) hucreCiz(c, x, y, FURNITURE[b.mobil[y][x]]);
      else if (b.engel[y][x] && b.d.engel[y][x] === false) hucreCiz(c, x, y, '#9a7b5a');      // rastgele engel (koli)
    }
    izgara(c, W, H); hedefCiz(c, b); robotCiz(c, b);
    // Robotun haritası
    m.fillStyle = '#20242c'; m.fillRect(0, 0, W * CS, H * CS);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      if (!b.bilinen[y][x]) continue;
      var kk = b.kapi[y][x];
      if (kk) hucreCiz(m, x, y, kk.acik ? '#e9dcc0' : '#8b5a2b');
      else if (b.engel[y][x]) hucreCiz(m, x, y, b.mobil[y][x] ? FURNITURE[b.mobil[y][x]] : (b.d.engel[y][x] ? '#59606f' : '#9a7b5a'));
      else hucreCiz(m, x, y, b.ziyaret[y][x] ? '#cfe8ff' : '#f1f3f6');
    }
    izgara(m, W, H);
    Object.keys(b.yerler).forEach(function (id) {
      var p = b.yerler[id]; m.fillStyle = '#146c2e'; m.font = 'bold 11px system-ui, sans-serif'; m.textAlign = 'center';
      m.fillText('★ ' + O.BULUNACAK[id].split(' ')[0], (p.x + 0.5) * CS, (p.y + 0.5) * CS + 4);
    });
    if (b.mod === 'git') hedefCiz(m, b);
    robotCiz(m, b);
  }

  function ozetYaz() {
    var b = bolum; if (!b) return;
    var durum = b.bitti ? (b.basari ? '✔ başardı' : '✘ süre doldu') : 'çalışıyor';
    $('canliOzet').textContent = (b.mod === 'git' ? 'Görev: hedefe git (yeşil yıldız)' : 'Görev: evi tara (süpürge)') +
      ' · adım ' + b.adim + '/' + b.maksAdim + ' · ödül ' + virgul(b.toplam, 2) + ' · ' + durum +
      (b.mod === 'tara' ? ' · kapsam ' + yuzde(b.kapsama()) : '') + ' · çarpma ' + b.carpma;
    var olas = sonOlas, eylem = b.sonEylem, html = '';
    for (var i = 0; i < 4; i++) {
      var p = olas ? olas[i] : 0;
      html += '<div class="' + (i === eylem ? 'secili' : '') + '">' + O.YON_AD[i] + ' ' + Math.round(p * 100) + '%<div class="cubuk"><i style="width:' + Math.round(p * 100) + '%"></i></div></div>';
    }
    $('kararCubuk').innerHTML = html;
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
      if (bekle > 1.5) { yeniBolum(); }
    } else {
      birikim += dt * hiz;
      while (birikim >= 1 && !bolum.bitti) {
        birikim -= 1;
        var cikis = O.ileri(egitici.theta, bolum.gozlem()), sic = +$('sicaklik').value, e = 0, i;
        sonOlas = O.olasiliklar(cikis, Math.max(0.05, sic));
        if (sic > 0) { var r = Math.random(), s = 0; for (i = 0; i < 4; i++) { s += sonOlas[i]; if (r <= s) { e = i; break; } e = i; } }
        else for (i = 1; i < 4; i++) if (cikis[i] > cikis[e]) e = i;
        bolum.ilerle(e);
      }
    }
    ciz(); ozetYaz();
  }

  gunluk('Hazır. "Eğitimi başlat"a bas; robot başta rastgele davranır, nesiller geçtikçe düzelir.');
  sayaclar(); egriCiz(); yeniBolum(); degerlendirTest(); sayaclar();
  window.requestAnimationFrame(dongu);
})();
