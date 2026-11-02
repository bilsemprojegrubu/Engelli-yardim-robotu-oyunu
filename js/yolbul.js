/*
 * yolbul.js — Izgarada BFS (genişlik öncelikli arama) ile en kısa yol.
 * Çapraz yok: robot sadece yukarı/aşağı/sağa/sola gider.
 */
(function (kok) {
  'use strict';

  var YONLER = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  /*
   * yurunebilir(x, y) -> bool : o hücreye girilebilir mi?
   * bas: {x, y}, hedefler: [{x, y}, ...] (herhangi birine varmak yeter)
   * Dönüş: başlangıç hariç hücre listesi. Zaten hedefteyse []. Yol yoksa null.
   */
  function yolBul(yurunebilir, genislik, yukseklik, bas, hedefler) {
    var hedefSet = {};
    hedefler.forEach(function (h) { hedefSet[h.y * genislik + h.x] = true; });
    var baslaKey = bas.y * genislik + bas.x;
    if (hedefSet[baslaKey]) return [];

    var onceki = {};
    onceki[baslaKey] = -1;
    var kuyruk = [bas];
    for (var i = 0; i < kuyruk.length; i++) {
      var c = kuyruk[i];
      for (var k = 0; k < YONLER.length; k++) {
        var nx = c.x + YONLER[k][0], ny = c.y + YONLER[k][1];
        if (nx < 0 || ny < 0 || nx >= genislik || ny >= yukseklik) continue;
        var key = ny * genislik + nx;
        if (key in onceki) continue;
        if (!yurunebilir(nx, ny)) continue;
        onceki[key] = c.y * genislik + c.x;
        if (hedefSet[key]) return geriKur(onceki, key, genislik);
        kuyruk.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  function geriKur(onceki, key, genislik) {
    var yol = [];
    while (onceki[key] !== -1) {
      yol.push({ x: key % genislik, y: Math.floor(key / genislik) });
      key = onceki[key];
    }
    return yol.reverse();
  }

  var API = { yolBul: yolBul };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.YolBul = API;
})(typeof window !== 'undefined' ? window : globalThis);
