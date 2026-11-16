/*
 * ogrenme.js — Robotun simülasyonda DENEYEREK öğrenmesi (pekiştirmeli öğrenme). Sürüm 2.
 * Kural yok: küçük bir sinir ağı, ödül/cezaya göre kendini geliştirir (evrim stratejisi).
 * Ekran çizimi yok; hem eğitim hem canlı izleme aynı "Bolum" sınıfını kullanır.
 *
 * Sürüm 2'de gerçek robota yaklaştık:
 *   - Hareket: ileri, geri, sola dön, sağa dön (iki motorlu tekerlek: yan yan gidemez, yerinde döner)
 *   - Görme: kafadaki kamera/mesafe sensörü ÖNE bakar (yaklaşık 200°); her yöne yalnız 1 kare yakın algı (tampon)
 *   - Hafıza: ağ bir önceki adımdaki "düşüncesini" (gizli durum) taşır; son hareketini ve takılıp takılmadığını bilir
 *   - İleri-geri gidip gelmek (salınım) ve boşuna sağa-sola dönmek ceza alır
 *
 * İki görev, tek beyin:
 *   git  — rastgele bir başlangıçtan rastgele bir hedefe (hedefin yeri bilinir, evin haritası bilinmez)
 *   tara — robot süpürge gibi evi tarar, kendi haritasını çıkarır, mobilyaların yerini öğrenir
 * Her bölümde başlangıç, yön, hedef, kapıların durumu ve engeller rastgeledir: ezber işe yaramaz.
 */
(function (kok) {
  'use strict';
  var Dunya = (typeof module !== 'undefined' && module.exports) ? require('./dunya.js') : kok.Dunya;

  var SURUM = 2;
  var YON = [[0, -1], [1, 0], [0, 1], [-1, 0]];        // saat yönünde: kuzey, doğu, güney, batı (ekranda yukarı, sağ, aşağı, sol)
  var EYLEM_AD = ['ileri', 'geri', 'sola dön', 'sağa dön'];
  var GORECELI_AD = ['ön', 'sağ', 'arka', 'sol'];
  var GORUS = 4, ISIN = 24, GORUS_ACI = 100 * Math.PI / 180;   // önde ±100°
  var GIRIS = 28, GIZLI = 16, CIKIS = 4;
  var A_WH = GIZLI * GIRIS, A_B = A_WH + GIZLI * GIZLI, A_WO = A_B + GIZLI, A_BO = A_WO + CIKIS * GIZLI;
  var PARAM_SAYISI = A_BO + CIKIS;
  var BULUNACAK = { buzdolabi: 'Mutfak (buzdolabı)', kanepe: 'Salon (kanepe)', yatak: 'Yatak odası (yatak)', kuvet: 'Banyo (küvet)', tv: 'Televizyon', masa: 'Yemek masası' };

  // Ödül ve cezalar tek yerde (sayfadaki tablo da buradan okunur)
  var ODUL = {
    adimGit: -0.01,       // hedefe giderken her adım (oyalanmasın)
    adimTara: -0.002,     // tararken her adım
    carpma: -0.03,        // duvara/engele çarpma
    kapiAcma: -0.01,      // kapalı kapıyı açmak biraz zaman alır
    geri: -0.01,          // geri gitmek: arkasını göremez, gerekmedikçe yapmasın
    tekrar: -0.01,        // aynı kareye 3. kez ve sonrası
    salinim: -0.03,       // az önce çıktığı kareye hemen geri dönmek (ileri-geri gidip gelme)
    bosaDonus: -0.01,     // sola dönüp hemen sağa dönmek (ya da tersi)
    firildak: -0.02,      // aynı yöne 3. kez ve daha çok üst üste dönmek (yerinde fırıldak gibi dönme)
    takildiDur: -0.5,     // 25 adım boyunca 1-2 karede takılı kaldı: robot durur, sahibine haber verir (başarısız)
    yaklasma: 0.06,       // hedefe 1 kare yaklaşınca (uzaklaşınca aynı kadar eksi)
    varis: 1,             // hedefe varınca
    yeniYer: 1.5          // taramada: yeni görülen alan oranı × bu
  };

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

  // ---------------- Sinir ağı (hafızalı) ----------------
  // gizli(t) = tanh(Wx·girdi + Wh·gizli(t-1) + b);  çıktı = Wo·gizli(t) + bo
  function Ajan(w) { this.w = w; this.h = new Array(GIZLI).fill(0); }
  Ajan.prototype.sifirla = function () { this.h = new Array(GIZLI).fill(0); };
  Ajan.prototype.karar = function (x) {
    var w = this.w, h0 = this.h, h = new Array(GIZLI), c = new Array(CIKIS), i, j, s, o;
    for (j = 0; j < GIZLI; j++) {
      s = w[A_B + j]; o = j * GIRIS;
      for (i = 0; i < GIRIS; i++) s += w[o + i] * x[i];
      o = A_WH + j * GIZLI;
      for (i = 0; i < GIZLI; i++) s += w[o + i] * h0[i];
      h[j] = Math.tanh(s);
    }
    for (j = 0; j < CIKIS; j++) {
      s = w[A_BO + j]; o = A_WO + j * GIZLI;
      for (i = 0; i < GIZLI; i++) s += w[o + i] * h[i];
      c[j] = s;
    }
    this.h = h;
    return c;
  };
  function olasiliklar(c, sicaklik) {
    var t = Math.max(0.05, sicaklik), m = Math.max.apply(null, c), e = c.map(function (v) { return Math.exp((v - m) / t); });
    var top = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / top; });
  }
  function sec(c, sicaklik, rng) {                      // c: her seçeneğin puanı (seçenek sayısı beyne göre değişir)
    var e = 0, i, n = c.length;
    if (sicaklik > 0) {
      var p = olasiliklar(c, sicaklik), r = rng(), s = 0;
      for (i = 0; i < n; i++) { s += p[i]; e = i; if (r <= s) break; }
    } else for (i = 1; i < n; i++) if (c[i] > c[e]) e = i;
    return e;
  }
  function yeniBeyin(rng) {
    var w = new Array(PARAM_SAYISI);
    for (var i = 0; i < PARAM_SAYISI; i++) w[i] = gauss(rng) * (i >= A_WH && i < A_B ? 0.1 : 0.3);
    return w;
  }

  // ---------------- Bölüm (bir deneme) ----------------
  /*
   * secenek: { mod:'git'|'tara'|'karisik', kayma:0..1 (tekerlek patinajı: hareket/dönüş bazen olmaz),
   *            gurultu:0..1 (hedef ölçümü bozulur), rastgeleEngel:sayı, maksAdim }
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
    this.maksAdim = secenek.maksAdim || (this.mod === 'git' ? 200 : 400);
    this.adim = 0; this.toplam = 0; this.bitti = false; this.basari = false;
    this.sonEylem = -1; this.sonOdul = 0; this.carpma = 0; this.salinim = 0; this.geriSayisi = 0;
    this.donusSeri = 0; this.takiliSure = 0; this.durdu = false; this.firildakSayisi = 0;
    this.izler = [[this.x, this.y]]; this.sonKareler = [];
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
    var b = serbest[Math.floor(rng() * serbest.length)];
    this.x = b[0]; this.y = b[1]; this.yon = Math.floor(rng() * 4);
    var g = serbest[Math.floor(rng() * serbest.length)];
    this.hx = g[0]; this.hy = g[1];
    this.mesafe = this._bfs(this.hx, this.hy);
    this.uygun = this.mesafe[this.y][this.x] < 1e9 && (this.mod === 'tara' || this.mesafe[this.y][this.x] >= 6);
    var say = 0, m0 = this._bfs(this.x, this.y);
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) if (m0[y][x] < 1e9 && !engel[y][x]) say++;
    this.erisilebilir = say;
    this.kesfedilen = 0; this.yerler = {};
    ziyaret[this.y][this.x] = 1;
  };

  Bolum.prototype._bfs = function (sx, sy) {
    var W = this.W, H = this.H, m = [], y;
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

  Bolum.prototype._gecilmez = function (x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return true;
    if (this.engel[y][x]) return true;
    var k = this.kapi[y][x];
    return !!(k && !k.acik);
  };

  Bolum.prototype._isaretle = function (cx, cy) {
    if (this.bilinen[cy][cx]) return 0;
    this.bilinen[cy][cx] = true;
    var mid = this.mobil[cy][cx];
    if (mid && BULUNACAK[mid] && !this.yerler[mid]) this.yerler[mid] = { x: cx, y: cy, adim: this.adim };
    return this.engel[cy][cx] ? 0 : 1;
  };

  // Sensör: önde ışınlar (duvar ardını göremez) + her yöne 1 kare yakın algı. Yeni görülen serbest hücre sayısını döndürür.
  Bolum.prototype._gor = function () {
    var yeni = 0, a, r, dx, dy;
    for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
      var ax = this.x + dx, ay = this.y + dy;
      if (ax >= 0 && ay >= 0 && ax < this.W && ay < this.H) yeni += this._isaretle(ax, ay);
    }
    var taban = Math.atan2(YON[this.yon][1], YON[this.yon][0]);
    for (a = 0; a < ISIN; a++) {
      var aci = taban - GORUS_ACI + 2 * GORUS_ACI * a / (ISIN - 1);
      var sx = Math.cos(aci) * 0.5, sy = Math.sin(aci) * 0.5, px = this.x + 0.5, py = this.y + 0.5;
      for (r = 0; r < GORUS * 2; r++) {
        px += sx; py += sy;
        var cx = Math.floor(px), cy = Math.floor(py);
        if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.H) break;
        yeni += this._isaretle(cx, cy);
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

  // Mutlak yön → robota göre (0 ön, 1 sağ, 2 arka, 3 sol)
  Bolum.prototype.mutlak = function (goreli) { return (this.yon + goreli) % 4; };

  /*
   * Algı: robotun KENDİ haritasına göre her komşu karenin "hedefe/keşfedilmemiş yere yaklaştırıp yaklaştırmadığı".
   * Bilinmeyen hücreler geçilebilir sayılır (iyimser), bilinen duvarlar geçilmez, kapalı kapı açılabilir.
   * Sıra: ön, sağ, arka, sol. +1 yaklaştırır, -1 uzaklaştırır/geçilmez, 0 değişmez. Karar yine sinir ağındadır.
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
      var Y = YON[this.mutlak(j)], tx = this.x + Y[0], ty = this.y + Y[1];
      if (tx < 0 || ty < 0 || tx >= W || ty >= H || (this.bilinen[ty][tx] && this.engel[ty][tx]) || ben >= 1e9 || m[ty][tx] >= 1e9) o.push(-1);
      else o.push(Math.max(-1, Math.min(1, ben - m[ty][tx])));
    }
    return o;
  };

  // Son 10 adımda kaç farklı karede bulundu: 1 = takılmış (hep aynı 1-2 kare), 0 = ilerliyor
  Bolum.prototype.takilma = function () {
    var s = this.sonKareler;
    if (s.length < 10) return 0;
    var f = {};
    s.forEach(function (k) { f[k] = 1; });
    var n = Object.keys(f).length;
    return n <= 2 ? 1 : n === 3 ? 0.5 : 0;
  };

  Bolum.prototype.gozlem = function () {
    var o = [], j, hv = YON[this.yon], hx = hv[0], hy = hv[1];
    for (j = 0; j < 4; j++) {                                   // yakın çevre: ön, sağ, arka, sol (1 ve 2 kare)
      var Y = YON[this.mutlak(j)];
      o.push(this.durum(this.x + Y[0], this.y + Y[1]));
      o.push(this.durum(this.x + 2 * Y[0], this.y + 2 * Y[1]));
    }
    var say = [0, 0, 0, 0], top = [1e-9, 1e-9, 1e-9, 1e-9], dx, dy;   // bilinmeyen alan hangi tarafta çok
    for (dy = -GORUS; dy <= GORUS; dy++) for (dx = -GORUS; dx <= GORUS; dx++) {
      var cx = this.x + dx, cy = this.y + dy;
      if (cx < 0 || cy < 0 || cx >= this.W || cy >= this.H) continue;
      var b = this.bilinen[cy][cx] ? 0 : 1, f = dx * hx + dy * hy, s = -dx * hy + dy * hx;
      if (f > 0) { say[0] += b; top[0]++; }
      if (s > 0) { say[1] += b; top[1]++; }
      if (f < 0) { say[2] += b; top[2]++; }
      if (s < 0) { say[3] += b; top[3]++; }
    }
    for (j = 0; j < 4; j++) o.push(say[j] / top[j]);
    if (this.mod === 'git') {                                   // hedef: robota göre ileri ve sağ bileşen
      var gx = this.hx - this.x, gy = this.hy - this.y;
      if (this.gurultu > 0) { gx += gauss(this.rng) * this.gurultu * 3; gy += gauss(this.rng) * this.gurultu * 3; }
      var gf = gx * hx + gy * hy, gs = -gx * hy + gy * hx;
      o.push(Math.max(-1.5, Math.min(1.5, gf / 8)), Math.max(-1.5, Math.min(1.5, gs / 8)), 1);
    } else o.push(0, 0, 0);
    var ip = this._ipucu();
    for (j = 0; j < 4; j++) o.push(ip[j]);
    for (j = 0; j < 4; j++) {
      var Z = YON[this.mutlak(j)], nx = this.x + Z[0], ny = this.y + Z[1];
      o.push(nx < 0 || ny < 0 || nx >= this.W || ny >= this.H ? 1 : Math.min(1, this.ziyaret[ny][nx] / 3));
    }
    for (j = 0; j < 4; j++) o.push(this.sonEylem === j ? 1 : 0);   // hafıza: son hareketim
    o.push(this.takilma());                                       // hafıza: takıldım mı?
    return o;
  };

  // Bir hareket yapar (0 ileri, 1 geri, 2 sola dön, 3 sağa dön). Dönüş: ödül
  Bolum.prototype.ilerle = function (eylem) {
    if (this.bitti) return 0;
    var oncekiEylem = this.sonEylem;
    this.sonEylem = eylem; this.adim++;
    var odul = this.mod === 'git' ? ODUL.adimGit : ODUL.adimTara;
    var onceki = this.mod === 'git' ? this.mesafe[this.y][this.x] : 0;
    var patinaj = this.kayma > 0 && this.rng() < this.kayma;     // zemin kaydı: tekerlek boşa döner
    this.donusSeri = eylem >= 2 && eylem === oncekiEylem ? this.donusSeri + 1 : (eylem >= 2 ? 1 : 0);
    if (eylem >= 2) {
      if ((eylem === 2 && oncekiEylem === 3) || (eylem === 3 && oncekiEylem === 2)) odul += ODUL.bosaDonus;
      if (this.donusSeri >= 3) { odul += ODUL.firildak; this.firildakSayisi++; }
      if (!patinaj) this.yon = (this.yon + (eylem === 2 ? 3 : 1)) % 4;
      else if (this.rng() < 0.5) this.yon = (this.yon + 2) % 4;     // fazla döndü (yarım tur)
    } else {
      if (eylem === 1) { odul += ODUL.geri; this.geriSayisi++; }
      var Y = YON[eylem === 0 ? this.yon : (this.yon + 2) % 4], nx = this.x + Y[0], ny = this.y + Y[1];
      if (patinaj) { /* yerinde kaldı */ }
      else if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H || this.engel[ny][nx]) {
        odul += ODUL.carpma; this.carpma++;
      } else if (this.kapi[ny][nx] && !this.kapi[ny][nx].acik) {
        if (eylem === 0) { this.kapi[ny][nx].acik = true; odul += ODUL.kapiAcma; }   // önündeki kapıyı açar
        else { odul += ODUL.carpma; this.carpma++; }                                 // geri giderken kapı açamaz
      } else {
        var iz = this.izler;
        if (iz.length >= 2 && iz[iz.length - 2][0] === nx && iz[iz.length - 2][1] === ny) { odul += ODUL.salinim; this.salinim++; }
        this.x = nx; this.y = ny; this.ziyaret[ny][nx]++;
        iz.push([nx, ny]); if (iz.length > 4) iz.shift();
        if (this.ziyaret[ny][nx] > 2) odul += ODUL.tekrar;
      }
    }
    this.sonKareler.push(this.x + ',' + this.y); if (this.sonKareler.length > 10) this.sonKareler.shift();
    var yeni = this._gor();
    if (this.mod === 'git') {
      odul += ODUL.yaklasma * (onceki - this.mesafe[this.y][this.x]);
      if (this.x === this.hx && this.y === this.hy) { odul += ODUL.varis; this.bitti = true; this.basari = true; }
    } else {
      odul += ODUL.yeniYer * yeni / Math.max(1, this.erisilebilir);
      if (this.kesfedilen >= this.erisilebilir * 0.97) { this.bitti = true; this.basari = true; }
    }
    // Takılma: son 10 adımda hep aynı 1-2 kare ve bu 15 adım daha sürdüyse robot durur (gerçekte: sahibine haber verir)
    this.takiliSure = this.takilma() >= 1 ? this.takiliSure + 1 : 0;
    if (!this.bitti && this.takiliSure >= 15) { odul += ODUL.takildiDur; this.bitti = true; this.durdu = true; }
    if (this.adim >= this.maksAdim) this.bitti = true;
    this.sonOdul = odul; this.toplam += odul;
    return odul;
  };

  // Görev zinciri için: aynı evde, aynı haritayla yeni hedef (robot evi hatırlar)
  Bolum.prototype.hedefDegistir = function (x, y) {
    this.mod = 'git'; this.hx = x; this.hy = y; this.mesafe = this._bfs(x, y);
    this.bitti = false; this.basari = false; this.durdu = false; this.maksAdim = this.adim + 200;
    this.takiliSure = 0; this.sonKareler = []; this.izler = [[this.x, this.y]];
  };

  Bolum.prototype.kapsama = function () {
    return Math.min(1, this.kesfedilen / Math.max(1, this.erisilebilir));
  };

  // Bir beyinle bölüm oynar. sicaklik: 0 = hep en iyi hareket, >0 = olasılıkla seç (her seferinde biraz farklı)
  function oyna(beyin, bolum, sicaklik) {
    var ajan = new Ajan(beyin);
    while (!bolum.bitti) bolum.ilerle(sec(ajan.karar(bolum.gozlem()), sicaklik || 0, bolum.rng));
    return bolum;
  }

  // Bir beyni n rastgele bölümde sınar
  function degerlendir(beyin, n, secenek, tohumDeger) {
    var rng = tohum(tohumDeger === undefined ? 12345 : tohumDeger);
    var s = { gn: 0, ok: 0, tn: 0, kaps: 0, odul: 0, sal: 0, carp: 0, fir: 0, dur: 0 };
    for (var i = 0; i < n; i++) {
      var b = oyna(beyin, new Bolum(Object.assign({}, secenek, { mod: i % 2 ? 'tara' : 'git' }), rng), 0);
      s.odul += b.toplam / n; s.sal += b.salinim / n; s.carp += b.carpma / n; s.fir += b.firildakSayisi / n; if (b.durdu) s.dur += 1 / n;
      if (b.mod === 'git') { s.gn++; if (b.basari) s.ok++; }
      else { s.tn++; s.kaps += b.kapsama(); }
    }
    return { gitBasari: s.gn ? s.ok / s.gn : 0, taraKapsama: s.tn ? s.kaps / s.tn : 0, ortOdul: s.odul, ortSalinim: s.sal, ortCarpma: s.carp, ortFirildak: s.fir, takilmaOrani: s.dur };
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
    this.nesil = secenek.nesil || 0;
    this.adamSifirla();
    this.gecmis = secenek.gecmis ? secenek.gecmis.slice() : [];
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
    var tum = [];                                      // sıra tabanlı normalizasyon
    puanlar.forEach(function (p) { tum.push(p[0], p[1]); });
    var sirali = tum.slice().sort(function (a, b) { return a - b; });
    function sira(v) { return sirali.indexOf(v) / (sirali.length - 1) - 0.5; }
    var g = new Array(n).fill(0);
    for (i = 0; i < this.cift; i++) {
      var f = sira(puanlar[i][0]) - sira(puanlar[i][1]);
      for (j = 0; j < n; j++) g[j] += f * eps[i][j];
    }
    this.nesil++;
    var b1 = 0.9, b2 = 0.999, t = ++this.adimT;
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
  Egitici.prototype.adamSifirla = function () {
    this.m = new Array(PARAM_SAYISI).fill(0); this.v = new Array(PARAM_SAYISI).fill(0); this.adimT = 0;
  };

  var API = {
    SURUM: SURUM, YON: YON, EYLEM_AD: EYLEM_AD, GORECELI_AD: GORECELI_AD, GIRIS: GIRIS, GIZLI: GIZLI,
    PARAM_SAYISI: PARAM_SAYISI, BULUNACAK: BULUNACAK, GORUS: GORUS, ODUL: ODUL,
    tohum: tohum, yeniBeyin: yeniBeyin, Ajan: Ajan, olasiliklar: olasiliklar, sec: sec,
    Bolum: Bolum, oyna: oyna, degerlendir: degerlendir, Egitici: Egitici
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Ogrenme = API;
})(typeof window !== 'undefined' ? window : globalThis);
