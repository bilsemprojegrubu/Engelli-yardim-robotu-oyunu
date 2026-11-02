/*
 * grafik.js — Gelişim grafiği: görev sayısına göre TOPLAM (birikimli) başarı oranı.
 * Kütüphane yok; düz canvas.
 */
(function (kok) {
  'use strict';

  // [{basari:true}, ...] -> [{n:1, yuzde:100}, {n:2, yuzde:50}, ...]
  function noktalar(kayitlar) {
    var ok = 0;
    return kayitlar.map(function (k, i) {
      if (k.basari) ok++;
      return { n: i + 1, yuzde: ok * 100 / (i + 1) };
    });
  }

  function renk(ad, yedek) {
    try { return kok.getComputedStyle(kok.document.documentElement).getPropertyValue(ad).trim() || yedek; }
    catch (e) { return yedek; }
  }

  function ciz(canvas, kayitlar) {
    var W = 520, H = 210;
    var dpr = kok.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);

    var yazi = renk('--yazi', '#1f2933'), soluk = renk('--soluk', '#6b7785'), cizgi = renk('--vurgu', '#2563eb'),
      izgara = renk('--cizgi', '#d9dee4');
    var sol = 44, sag = 14, ust = 14, alt = 36;
    var gw = W - sol - sag, gh = H - ust - alt;
    var nok = noktalar(kayitlar);
    var enBuyukN = Math.max(5, nok.length);

    c.font = '12px system-ui, sans-serif';
    c.textBaseline = 'middle';
    // Yatay çizgiler: %0, %50, %100
    [0, 50, 100].forEach(function (p) {
      var y = ust + gh - gh * p / 100;
      c.strokeStyle = izgara; c.lineWidth = 1;
      c.beginPath(); c.moveTo(sol, y); c.lineTo(W - sag, y); c.stroke();
      c.fillStyle = soluk; c.textAlign = 'right';
      c.fillText('%' + p, sol - 6, y);
    });
    // Alt eksen yazısı
    c.fillStyle = soluk; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('Görev sayısı', sol + gw / 2, H - 6);
    c.textAlign = 'left'; c.fillText('1', sol, H - 20);
    c.textAlign = 'right'; c.fillText(String(enBuyukN), W - sag, H - 20);

    if (!nok.length) {
      c.fillStyle = soluk; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('Henüz görev yok. Bir komut ver!', sol + gw / 2, ust + gh / 2);
      return;
    }
    function px(n) { return sol + (enBuyukN === 1 ? 0 : gw * (n - 1) / (enBuyukN - 1)); }
    function py(p) { return ust + gh - gh * p / 100; }

    c.strokeStyle = cizgi; c.lineWidth = 2.5; c.lineJoin = 'round';
    c.beginPath();
    nok.forEach(function (p, i) { if (i === 0) c.moveTo(px(p.n), py(p.yuzde)); else c.lineTo(px(p.n), py(p.yuzde)); });
    c.stroke();
    // Her görev bir nokta; son nokta büyük ve yazılı
    c.fillStyle = cizgi;
    nok.forEach(function (p) { c.beginPath(); c.arc(px(p.n), py(p.yuzde), nok.length > 60 ? 1.5 : 3, 0, 6.283); c.fill(); });
    var son = nok[nok.length - 1];
    c.beginPath(); c.arc(px(son.n), py(son.yuzde), 5, 0, 6.283); c.fill();
    c.fillStyle = yazi; c.font = 'bold 13px system-ui, sans-serif'; c.textBaseline = 'middle';
    var etiketX = px(son.n), hiza = etiketX > W - 70 ? 'right' : 'left';
    c.textAlign = hiza;
    c.fillText('%' + Math.round(son.yuzde), etiketX + (hiza === 'left' ? 9 : -9), Math.max(ust + 8, py(son.yuzde) - 12));
  }

  function ozet(kayitlar) {
    if (!kayitlar.length) return 'Henüz görev yok.';
    var ok = kayitlar.filter(function (k) { return k.basari; }).length;
    return 'Toplam ' + kayitlar.length + ' görev, ' + ok + ' başarılı: %' + Math.round(ok * 100 / kayitlar.length) + ' başarı.';
  }

  var API = { noktalar: noktalar, ciz: ciz, ozet: ozet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Grafik = API;
})(typeof window !== 'undefined' ? window : globalThis);
