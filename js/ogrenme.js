/*
 * ogrenme.js — Robotun simülasyonda DENEYEREK öğrenmesi (pekiştirmeli öğrenme).
 * Kural yok: küçük bir sinir ağı, ödül/cezaya göre kendini geliştirir (evrim stratejisi).
 * Ekran çizimi yok; hem eğitim hem canlı izleme aynı "Bolum" sınıfını kullanır.
 *
 * İki görev, tek beyin:
 *   git  — rastgele bir başlangıçtan rastgele bir hedefe (hedefin yeri bilinir, evin haritası bilinmez)
 *   tara — robot süpürge gibi evi tarar, kendi haritasını çıkarır, mobilyaların yerini öğrenir
 * Her bölümde başlangıç, hedef, kapıların durumu ve engeller rastgeledir: ezber işe yaramaz.
 */
(function (kok) {
  'use strict';
  var Dunya = (typeof module !== 'undefined' && module.exports) ? require('./dunya.js') : kok.Dunya;

  var YON = [[0, -1], [0, 1], [-1, 0], [1, 0]];       // yukarı, aşağı, sol, sağ
  var YON_AD = ['yukarı', 'aşağı', 'sol', 'sağ'];
  var GORUS = 4, ISIN = 32;
  var GIRIS = 23, GIZLI = 24, CIKIS = 4;
  var PARAM_SAYISI = GIRIS * GIZLI + GIZLI + GIZLI * CIKIS + CIKIS;
  var BULUNACAK = { buzdolabi: 'Mutfak (buzdolabı)', kanepe: 'Salon (kanepe)', yatak: 'Yatak odası (yatak)', kuvet: 'Banyo (küvet)', tv: 'Televizyon', masa: 'Yemek masası' };

  function tohum(s) {                                  // mulberry32: tekrarlanabilir rastgelelik
    var a = s >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v); }

  // ---------------- Sinir ağı ----------------
  function ileri(w, x) {
    var o = 0, h = new Array(GIZLI), c = new Array(CIKIS), i, j, s;
    for (j = 0; j < GIZLI; j++) {
      s = w[GIRIS * GIZLI + j];
      for (i = 0; i < GIRIS; i++) s += w[o + j * GIRIS + i] * x[i];
      h[j] = Math.tanh(s);
    }
    var o2 = GIRIS * GIZLI + GIZLI;
    for (j = 0; j < CIKIS; j++) {
      s = w[o2 + GIZLI * CIKIS + j];
      for (i = 0; i < GIZLI; i++) s += w[o2 + j * GIZLI + i] * h[i];
      c[j] = s;
    }
    return c;
  }
  function olasiliklar(c, sicaklik) {
    var t = Math.max(0.05, sicaklik), m = Math.max.apply(null, c), e = c.map(function (v) { return Math.exp((v - m) / t); });
    var top = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / top; });
  }
  function yeniBeyin(rng) {
    var w = new Array(PARAM_SAYISI);
    for (var i = 0; i < PARAM_SAYISI; i++) w[i] = gauss(rng) * 0.3;
    return w;
  }

  // ---------------- Bölüm (bir deneme) ----------------
  /*
   * secenek: { mod:'git'|'tara'|'karisik', kayma:0..1 (hareket bazen yan gider), gurultu:0..1 (hedef ölçümü bozulur),
   *            rastgeleEngel:sayı, maksAdim }
   */
  function Bolum(secenek, rng) {
    secenek = secenek || {};
    this.rng = rng;
    this.kayma = secenek.kayma || 0;
    this.gurultu = secenek.gurultu || 0;
    var mod = secenek.mod || 'karisik';
    this.mod = mod === 'karisik' ? (rng() < 0.5 ? 'git' : 'tara') : mod;
    var deneme = 0;
    do { this._kur(secenek); deneme++; } while (!this.uygun && deneme < 30);
    this.maksAdim = secenek.maksAdim || (this.mod === 'git' ? 120 : 220);
    this.adim = 0; this.toplam = 0; this.bitti = false; this.basari = false;
    this.sonEylem = -1; this.sonOdul = 0; this.carpma = 0;
    this._gor();
  }

  Bolum.prototype._kur = function (secenek) {
    var rng = this.rng, d = Dunya.kur(rng), W = d.genislik, H = d.yukseklik, x, y;
    this.d = d; this.W = W; this.H = H;
    var engel = [], mobil = [], kapi = [], bilinen = [], ziyaret = [];
    for (y = 0; y < H; y++) {
      engel.push(d.engel[y].slice()); mobil.push(new Array(W).fill(null));
      kapi.push(new Array(W).fill(null)); bilinen.push(new Array(W).fill(false)); ziyaret.push(new Array(W).fill(0));
    }
    d.mobilyalar.forEach(function (m) {
      for (var yy = m.y; yy < m.y + m.h; yy++) for (var xx = m.x; xx < m.x + m.w; xx++) mobil[yy][xx] = m.id;
    });
    d.kapilar.forEach(function (k) { kapi[k.y][k.x] = k; });
    // Rastgele engeller (ezber olmasın): boş oda hücrelerine
    var bos = [];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (!engel[y][x] && !kapi[y][x]) bos.push([x, y]);
    var kutuSayisi = secenek.rastgeleEngel === undefined ? 5 : secenek.rastgeleEngel;
    for (var i = 0; i < kutuSayisi; i++) {
      var p = bos[Math.floor(rng() * bos.length)];
      engel[p[1]][p[0]] = true;
    }
    this.engel = engel; this.mobil = mobil; this.kapi = kapi; this.bilinen = bilinen; this.ziyaret = ziyaret;
    var serbest = [];
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (!engel[y][x] && !kapi[y][x]) serbest.push([x, y]);
    this.serbestSayisi = serbest.length;
    var b = serbest[Math.floor(rng() * serbest.length)];
    this.x = b[0]; this.y = b[1];
    var g = serbest[Math.floor(rng() * serbest.length)];
    this.hx = g[0]; this.hy = g[1];
    this.mesafe = this._bfs(this.hx, this.hy);
    this.uygun = this.mesafe[this.y][this.x] < 1e9 && (this.mod === 'tara' || this.mesafe[this.y][this.x] >= 6);
    // Tarama için: erişilebilir hücre sayısı
    var say = 0;
    var m0 = this._bfs(this.x, this.y);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (m0[y][x] < 1e9 && !engel[y][x]) say++;
    this.erisilebilir = say;
    this.kesfedilen = 0; this.yerler = {};
    ziyaret[this.y][this.x] = 1;
  };

  Bolum.prototype._bfs = function (sx, sy) {
    var W = this.W, H = this.H, m = [], y, x;
    for (y = 0; y < H; y++) m.push(new Array(W).fill(1e9));
    var k = [[sx, sy]]; m[sy][sx] = 0;
    for (var i = 0; i < k.length; i++) {
      var c = k[i];
      for (var j = 0; j < 4; j++) {
        var nx = c[0] + YON[j][0], ny = c[1] + YON[j][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || this.engel[ny][nx] || m[ny][nx] < 1e9) continue;
        m[ny][nx] = m[c[1]][c[0]] + 1; k.push([nx, ny]);
      }
    }
    return m;
  };

  // Hücrenin gerçek durumu: engel ya da kapalı kapı = geçilmez
  Bolum.prototype._gecilmez = function (x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return true;
    if (this.engel[y][x]) return true;
    var k = this.kapi[y][x];
    return !!(k && !k.acik);
  };

  // Sensör: robot çevresini tarar (duvarın ardını göremez), haritasını günceller. Yeni görülen hücre sayısını döndürür.
  Bolum.prototype._gor = function () {
    var yeni = 0, a, r;
    for (a = 0; a < ISIN; a++) {
      var aci = a / ISIN * 6.283185307, dx = Math.cos(aci) * 0.5, dy = Math.sin(aci) * 0.5;
      var px = this.x + 0.5, py = this.y + 0.5;
      for (r = 0; r < GORUS * 2; r++) {
        px += dx; py += dy;
        var cx = Math.floor(px), cy = Math.floor(py);
        if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.H) break;
        if (!this.bilinen[cy][cx]) {
          this.bilinen[cy][cx] = true;
          if (!this.engel[cy][cx]) yeni++;
          var mid = this.mobil[cy][cx];
          if (mid && BULUNACAK[mid] && !this.yerler[mid]) this.yerler[mid] = { x: cx, y: cy, adim: this.adim };
        }
        if (this._gecilmez(cx, cy)) break;
      }
    }
    this.kesfedilen += yeni;
    return yeni;
  };

  // Robotun BİLDİĞİ duruma göre hücre: -1 geçilmez, 0 bilinmiyor, 1 serbest
  Bolum.prototype.durum = function (x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return -1;
    if (!this.bilinen[y][x]) return 0;
    return this._gecilmez(x, y) ? -1 : 1;
  };

  /*
   * Algı: robotun KENDİ haritasına göre her yönün "hedefe/keşfedilmemiş yere yaklaştırıp yaklaştırmadığı".
   * Bilinmeyen hücreler geçilebilir sayılır (iyimser), bilinen duvarlar geçilmez, kapalı kapı açılabilir.
   * Hedef: git modunda hedef hücre, tara modunda "bilinen serbest ama yanında bilinmeyen olan" sınır hücreleri.
   * +1: o yöne gitmek yaklaştırır, -1: uzaklaştırır/geçilmez, 0: değişmez. Karar yine sinir ağındadır.
   */
  Bolum.prototype._ipucu = function () {
    var W = this.W, H = this.H, m = [], k = [], y, x, j, i;
    for (y = 0; y < H; y++) m.push(new Array(W).fill(1e9));
    if (this.mod === 'git') { m[this.hy][this.hx] = 0; k.push([this.hx, this.hy]); }
    else {
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        if (!this.bilinen[y][x] || this.engel[y][x]) continue;
        for (j = 0; j < 4; j++) {
          var ax = x + YON[j][0], ay = y + YON[j][1];
          if (ax >= 0 && ay >= 0 && ax < W && ay < H && !this.bilinen[ay][ax]) { m[y][x] = 0; k.push([x, y]); break; }
        }
      }
    }
    for (i = 0; i < k.length; i++) {
      var c = k[i];
      for (j = 0; j < 4; j++) {
        var nx = c[0] + YON[j][0], ny = c[1] + YON[j][1];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || m[ny][nx] < 1e9) continue;
        if (this.bilinen[ny][nx] && this.engel[ny][nx]) continue;
        m[ny][nx] = m[c[1]][c[0]] + 1; k.push([nx, ny]);
      }
    }
    var ben = m[this.y][this.x], o = [];
    for (j = 0; j < 4; j++) {
      var tx = this.x + YON[j][0], ty = this.y + YON[j][1];
      if (tx < 0 || ty < 0 || tx >= W || ty >= H || (this.bilinen[ty][tx] && this.engel[ty][tx]) || ben >= 1e9 || m[ty][tx] >= 1e9) o.push(-1);
      else o.push(Math.max(-1, Math.min(1, ben - m[ty][tx])));
    }
    return o;
  };

  Bolum.prototype.gozlem = function () {
    var o = [], j, i;
    for (j = 0; j < 4; j++) {
      o.push(this.durum(this.x + YON[j][0], this.y + YON[j][1]));
      o.push(this.durum(this.x + 2 * YON[j][0], this.y + 2 * YON[j][1]));
    }
    // Bilinmeyen alanın hangi yönde daha çok olduğu
    var say = [0, 0, 0, 0], top = [1e-9, 1e-9, 1e-9, 1e-9], dx, dy;
    for (dy = -GORUS; dy <= GORUS; dy++) for (dx = -GORUS; dx <= GORUS; dx++) {
      var cx = this.x + dx, cy = this.y + dy;
      if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.H) continue;
      var b = this.bilinen[cy][cx] ? 0 : 1;
      if (dy < 0) { say[0] += b; top[0]++; }
      if (dy > 0) { say[1] += b; top[1]++; }
      if (dx < 0) { say[2] += b; top[2]++; }
      if (dx > 0) { say[3] += b; top[3]++; }
    }
    for (i = 0; i < 4; i++) o.push(say[i] / top[i]);
    if (this.mod === 'git') {
      var gx = this.hx - this.x, gy = this.hy - this.y;
      if (this.gurultu > 0) { gx += gauss(this.rng) * this.gurultu * 3; gy += gauss(this.rng) * this.gurultu * 3; }
      o.push(Math.max(-1.5, Math.min(1.5, gx / 8)), Math.max(-1.5, Math.min(1.5, gy / 8)), 1);
    } else o.push(0, 0, 0);
    var ip = this._ipucu();
    for (j = 0; j < 4; j++) o.push(ip[j]);
    for (j = 0; j < 4; j++) {
      var nx = this.x + YON[j][0], ny = this.y + YON[j][1];
      o.push(nx < 0 || ny < 0 || nx >= this.W || ny >= this.H ? 1 : Math.min(1, this.ziyaret[ny][nx] / 3));
    }
    return o;
  };

  // Bir hareket yapar. Dönüş: ödül
  Bolum.prototype.ilerle = function (eylem) {
    if (this.bitti) return 0;
    if (this.kayma > 0 && this.rng() < this.kayma) eylem = Math.floor(this.rng() * 4);   // zemin kaydı
    this.sonEylem = eylem; this.adim++;
    var odul = this.mod === 'git' ? -0.01 : -0.002;
    var nx = this.x + YON[eylem][0], ny = this.y + YON[eylem][1];
    var onceki = this.mod === 'git' ? this.mesafe[this.y][this.x] : 0;
    if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H || this.engel[ny][nx]) {
      odul -= 0.03; this.carpma++;
    } else if (this.kapi[ny][nx] && !this.kapi[ny][nx].acik) {
      this.kapi[ny][nx].acik = true; odul -= 0.01;                  // kapıyı açtı (yerinde kaldı)
    } else {
      this.x = nx; this.y = ny; this.ziyaret[ny][nx]++;
      if (this.ziyaret[ny][nx] > 2) odul -= 0.004;                  // aynı yerde dönüp durmasın
    }
    var yeni = this._gor();
    if (this.mod === 'git') {
      odul += 0.06 * (onceki - this.mesafe[this.y][this.x]);
      if (this.x === this.hx && this.y === this.hy) { odul += 1; this.bitti = true; this.basari = true; }
    } else {
      odul += 1.5 * yeni / Math.max(1, this.erisilebilir);
      if (this.kesfedilen >= this.erisilebilir * 0.97) { this.bitti = true; this.basari = true; }
    }
    if (this.adim >= this.maksAdim) this.bitti = true;
    this.sonOdul = odul; this.toplam += odul;
    return odul;
  };

  Bolum.prototype.kapsama = function () {
    return Math.min(1, this.kesfedilen / Math.max(1, this.erisilebilir));
  };

  // Bir beyinle bölüm oynar. ornekle: sıcaklık (0 = hep en iyi hareket, >0 = olasılıkla seç)
  function oyna(beyin, bolum, sicaklik) {
    var rng = bolum.rng;
    while (!bolum.bitti) {
      var c = ileri(beyin, bolum.gozlem()), e = 0, i;
      if (sicaklik > 0) {
        var p = olasiliklar(c, sicaklik), r = rng(), s = 0;
        for (i = 0; i < 4; i++) { s += p[i]; if (r <= s) { e = i; break; } e = i; }
      } else for (i = 1; i < 4; i++) if (c[i] > c[e]) e = i;
      bolum.ilerle(e);
    }
    return bolum;
  }

  // Bir beyni n rastgele bölümde sınar
  function degerlendir(beyin, n, secenek, tohumDeger) {
    var rng = tohum(tohumDeger === undefined ? 12345 : tohumDeger);
    var s = { git: { n: 0, ok: 0 }, tara: { n: 0, kaps: 0 }, odul: 0 };
    for (var i = 0; i < n; i++) {
      var b = oyna(beyin, new Bolum(Object.assign({}, secenek, { mod: i % 2 ? 'tara' : 'git' }), rng), 0);
      s.odul += b.toplam / n;
      if (b.mod === 'git') { s.git.n++; if (b.basari) s.git.ok++; }
      else { s.tara.n++; s.tara.kaps += b.kapsama(); }
    }
    return { gitBasari: s.git.n ? s.git.ok / s.git.n : 0, taraKapsama: s.tara.n ? s.tara.kaps / s.tara.n : 0, ortOdul: s.odul };
  }

  // ---------------- Eğitici (evrim stratejisi + Adam) ----------------
  function Egitici(secenek) {
    secenek = secenek || {};
    this.rng = tohum(secenek.tohum === undefined ? 1 : secenek.tohum);
    this.theta = secenek.beyin ? secenek.beyin.slice() : yeniBeyin(this.rng);
    this.sigma = secenek.sigma || 0.12; this.lr = secenek.lr || 0.05;
    this.cift = secenek.cift || 16; this.K = secenek.K || 4;
    this.ortam = secenek.ortam || { kayma: 0, gurultu: 0, rastgeleEngel: 5 };
    this.alan = secenek.alanRastgele !== false;        // her bölümde kayma/gürültü rastgele (gerçeğe dayanıklılık)
    this.nesil = 0;
    this.m = new Array(PARAM_SAYISI).fill(0); this.v = new Array(PARAM_SAYISI).fill(0);
    this.gecmis = [];
  }
  Egitici.prototype._puan = function (w, tohumlar) {
    var top = 0, ok = 0, gn = 0, i;
    for (i = 0; i < tohumlar.length; i++) {
      var r = tohum(tohumlar[i]);
      var ort = Object.assign({}, this.ortam);
      if (this.alan) { ort.kayma = (ort.kayma || 0) + r() * 0.1; ort.gurultu = (ort.gurultu || 0) + r() * 0.1; }
      ort.mod = i % 2 ? 'tara' : 'git';
      var b = oyna(w, new Bolum(ort, r), 0);
      top += b.toplam;
      if (b.mod === 'git') { gn++; if (b.basari) ok++; }
    }
    return { puan: top / tohumlar.length, ok: ok, gn: gn };
  };
  Egitici.prototype.nesilYap = function () {
    var n = PARAM_SAYISI, i, j, tohumlar = [];
    for (i = 0; i < this.K; i++) tohumlar.push(Math.floor(this.rng() * 4e9));
    var eps = [], puanlar = [], ort = 0, ok = 0, gn = 0;
    for (i = 0; i < this.cift; i++) {
      var e = new Array(n);
      for (j = 0; j < n; j++) e[j] = gauss(this.rng);
      var a = this.theta.map(function (t, k) { return t + this.sigma * e[k]; }, this);
      var b = this.theta.map(function (t, k) { return t - this.sigma * e[k]; }, this);
      var pa = this._puan(a, tohumlar), pb = this._puan(b, tohumlar);
      eps.push(e); puanlar.push([pa.puan, pb.puan]);
      ort += (pa.puan + pb.puan) / (2 * this.cift); ok += pa.ok + pb.ok; gn += pa.gn + pb.gn;
    }
    // Sıra tabanlı normalizasyon
    var tum = [];
    puanlar.forEach(function (p) { tum.push(p[0], p[1]); });
    var sirali = tum.slice().sort(function (a, b) { return a - b; });
    function sira(v) { return sirali.indexOf(v) / (sirali.length - 1) - 0.5; }
    var g = new Array(n).fill(0);
    for (i = 0; i < this.cift; i++) {
      var f = sira(puanlar[i][0]) - sira(puanlar[i][1]);
      for (j = 0; j < n; j++) g[j] += f * eps[i][j];
    }
    this.nesil++;
    var b1 = 0.9, b2 = 0.999, t = this.nesil;
    for (j = 0; j < n; j++) {
      var gr = g[j] / (this.cift * this.sigma);
      this.m[j] = b1 * this.m[j] + (1 - b1) * gr; this.v[j] = b2 * this.v[j] + (1 - b2) * gr * gr;
      var mh = this.m[j] / (1 - Math.pow(b1, t)), vh = this.v[j] / (1 - Math.pow(b2, t));
      this.theta[j] += this.lr * mh / (Math.sqrt(vh) + 1e-8);
    }
    var kayit = { nesil: this.nesil, ortOdul: ort, gitBasari: gn ? ok / gn : 0 };
    this.gecmis.push(kayit);
    return kayit;
  };

  var API = {
    YON: YON, YON_AD: YON_AD, GIRIS: GIRIS, PARAM_SAYISI: PARAM_SAYISI, BULUNACAK: BULUNACAK, GORUS: GORUS,
    tohum: tohum, yeniBeyin: yeniBeyin, ileri: ileri, olasiliklar: olasiliklar,
    Bolum: Bolum, oyna: oyna, degerlendir: degerlendir, Egitici: Egitici
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Ogrenme = API;
})(typeof window !== 'undefined' ? window : globalThis);
