/*
 * cizim.js — Evi kuş bakışı canvas'a çizer. Oyun mantığı yok, sadece görüntü.
 */
(function (kok) {
  'use strict';
  var Dunya = kok.Dunya;
  var CS = 40;                               // bir hücrenin piksel boyu
  var ZEMIN = { salon: '#f3e6d0', mutfak: '#eef3df', yatak: '#ece3f2', banyo: '#dfeef5' };

  function yuvarlakDikdortgen(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  function cizSahne(c, d, secenek) {
    var W = d.genislik * CS, H = d.yukseklik * CS;
    c.clearRect(0, 0, W, H);
    c.fillStyle = '#4a4f5c'; c.fillRect(0, 0, W, H);                 // duvarlar

    // Zeminler
    Object.keys(d.odalar).forEach(function (id) {
      var o = d.odalar[id];
      c.fillStyle = ZEMIN[id];
      c.fillRect(o.x0 * CS, o.y0 * CS, (o.x1 - o.x0 + 1) * CS, (o.y1 - o.y0 + 1) * CS);
      c.strokeStyle = 'rgba(0,0,0,0.05)'; c.lineWidth = 1;
      for (var x = o.x0; x <= o.x1 + 1; x++) { c.beginPath(); c.moveTo(x * CS, o.y0 * CS); c.lineTo(x * CS, (o.y1 + 1) * CS); c.stroke(); }
      for (var y = o.y0; y <= o.y1 + 1; y++) { c.beginPath(); c.moveTo(o.x0 * CS, y * CS); c.lineTo((o.x1 + 1) * CS, y * CS); c.stroke(); }
    });

    // Kapılar
    d.kapilar.forEach(function (k) {
      var px = k.x * CS, py = k.y * CS;
      c.fillStyle = '#d8c7a3'; c.fillRect(px, py, CS, CS);
      c.lineCap = 'round';
      var t = k.aci * Math.PI / 2;                                    // 0 = kapalı, 90° = açık
      var hx, hy, dx, dy;
      if (k.duvar === 'dikey') { hx = px + CS / 2; hy = py; dx = Math.sin(t); dy = Math.cos(t); }
      else { hx = px; hy = py + CS / 2; dx = Math.cos(t); dy = Math.sin(t); }
      c.strokeStyle = k.aci > 0.98 ? '#a67c52' : '#8b5a2b';
      c.lineWidth = k.aci < 0.02 ? 9 : 5;
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + dx * CS, hy + dy * CS); c.stroke();
    });

    // Mobilyalar
    d.mobilyalar.forEach(function (m) {
      var x = m.x * CS + 2, y = m.y * CS + 2, w = m.w * CS - 4, h = m.h * CS - 4;
      c.fillStyle = m.renk; yuvarlakDikdortgen(c, x, y, w, h, 6); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.stroke();
      if (m.id === 'tv') {                                           // ekran
        c.fillStyle = d.aygitlar.tv.acik ? '#8fd3ff' : '#11131a';
        c.fillRect(x + 6, y + 5, w - 12, h - 12);
      }
      // Etiket altta durur; üstteki eşya rozetleriyle çakışmasın
      c.fillStyle = m.id === 'tv' ? (d.aygitlar.tv.acik ? '#0b3a5a' : '#9aa3b2') : 'rgba(0,0,0,0.55)';
      c.font = '9px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillText(m.ad, x + w / 2, y + h - 3);
    });

    // Buzdolabı kapısı (menteşe etrafında yay çizer)
    var f = d.aygitlar.buzdolabi, ft = f.aci * Math.PI / 180;
    var mx = f.mentese.x * CS, my = f.mentese.y * CS;
    var ex = mx - Math.cos(ft) * f.kapiUzunlugu * CS, ey = my + Math.sin(ft) * f.kapiUzunlugu * CS;
    c.lineCap = 'round';
    c.strokeStyle = '#7d8a93'; c.lineWidth = 9; c.beginPath(); c.moveTo(mx, my); c.lineTo(ex, ey); c.stroke();
    c.strokeStyle = '#eef2f5'; c.lineWidth = 6; c.beginPath(); c.moveTo(mx, my); c.lineTo(ex, ey); c.stroke();
    var tx = mx - Math.cos(ft) * f.tutacMesafesi * CS, ty = my + Math.sin(ft) * f.tutacMesafesi * CS;
    c.fillStyle = '#555'; c.beginPath(); c.arc(tx, ty, 3.5, 0, 6.283); c.fill();

    // Işık anahtarları
    Object.keys(d.odalar).forEach(function (id) {
      var o = d.odalar[id], a = o.anahtar, x = a.x * CS, y = a.y * CS, kx, ky, kw, kh;
      if (a.yon === 'd') { kx = x + CS - 5; ky = y + CS / 2 - 7; kw = 8; kh = 14; }
      else if (a.yon === 'b') { kx = x - 3; ky = y + CS / 2 - 7; kw = 8; kh = 14; }
      else { kx = x + CS / 2 - 7; ky = y - 3; kw = 14; kh = 8; }
      c.fillStyle = o.isik ? '#ffd23f' : '#9a9a9a'; c.fillRect(kx, ky, kw, kh);
      c.strokeStyle = '#333'; c.lineWidth = 1; c.strokeRect(kx, ky, kw, kh);
    });

    // Eşyalar (taşınmayanlar)
    Object.keys(d.esyalar).forEach(function (id) {
      var e = d.esyalar[id];
      if (!e.tasinan) cizEsya(c, e, (e.x + 0.5) * CS, (e.y + 0.5) * CS, 11);
    });

    // Kullanıcı
    var u = d.kullanici;
    c.fillStyle = '#3a86ff'; c.beginPath(); c.arc(u.x * CS, u.y * CS, 12, 0, 6.283); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold 10px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Sen', u.x * CS, u.y * CS + 1);

    // Robot
    var r = d.robot, rx = r.x * CS, ry = r.y * CS;
    c.save(); c.translate(rx, ry); c.rotate(r.yon);
    c.fillStyle = '#ff9f1c'; c.beginPath(); c.arc(0, 0, 14, 0, 6.283); c.fill();
    c.strokeStyle = '#7a4a00'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#7a4a00'; c.beginPath(); c.moveTo(18, 0); c.lineTo(9, -6); c.lineTo(9, 6); c.closePath(); c.fill();
    if (r.tuttugu) { c.strokeStyle = '#7a4a00'; c.lineWidth = 3; c.beginPath(); c.moveTo(8, 0); c.lineTo(20, 0); c.stroke(); }
    c.restore();
    c.fillStyle = '#4a2c00'; c.font = 'bold 11px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('R', rx, ry + 1);
    if (r.tuttugu && d.esyalar[r.tuttugu]) cizEsya(c, d.esyalar[r.tuttugu], rx, ry - 22, 9);

    // Işığı kapalı odaları karart
    Object.keys(d.odalar).forEach(function (id) {
      var o = d.odalar[id];
      if (!o.isik) {
        c.fillStyle = 'rgba(15,25,70,0.38)';
        c.fillRect(o.x0 * CS, o.y0 * CS, (o.x1 - o.x0 + 1) * CS, (o.y1 - o.y0 + 1) * CS);
      }
    });

    // Oda adları
    c.font = 'bold 11px system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    Object.keys(d.odalar).forEach(function (id) {
      var o = d.odalar[id];
      c.fillStyle = 'rgba(0,0,0,0.38)';
      c.fillText(o.ad + (o.isik ? '' : ' (ışık kapalı)'), o.x0 * CS + 6, o.y0 * CS + 13);
    });

    if (secenek && secenek.acilDurdu) {
      c.fillStyle = 'rgba(200,0,0,0.14)'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#c40000'; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);
    }
  }

  function cizEsya(c, e, x, y, r) {
    c.fillStyle = e.renk; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#fff'; c.font = 'bold ' + Math.round(r * 0.9) + 'px system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(e.kisa, x, y + 1);
    if (e.tur === 'sise') {                                         // kapak: dolu = sıkı, boş = açık
      c.beginPath(); c.arc(x + r * 0.8, y - r * 0.8, 3.5, 0, 6.283);
      c.fillStyle = e.kapakAcik ? '#fff' : '#222'; c.fill();
      c.strokeStyle = '#222'; c.lineWidth = 1.5; c.stroke();
    }
  }

  // Canvas'ı kurar; her karede yeniden çizer. Dönüş: tıklanan hücreyi bildirmek için cb.
  function baslat(canvas, dunyaFn, secenekFn, hucreTiklandi) {
    var d0 = dunyaFn();
    var W = d0.genislik * CS, H = d0.yukseklik * CS;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var c = canvas.getContext('2d');
    function kare() {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (canvas.offsetParent !== null) cizSahne(c, dunyaFn(), secenekFn());
      window.requestAnimationFrame(kare);
    }
    kare();
    canvas.addEventListener('click', function (ev) {
      var kutu = canvas.getBoundingClientRect();
      var x = Math.floor((ev.clientX - kutu.left) / kutu.width * d0.genislik);
      var y = Math.floor((ev.clientY - kutu.top) / kutu.height * d0.yukseklik);
      hucreTiklandi(x, y);
    });
  }

  kok.Cizim = { baslat: baslat, CS: CS };
})(window);
