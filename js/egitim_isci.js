/*
 * egitim_isci.js — Eğitimi sayfadan ayrı bir "arka plan işçisinde" (Web Worker) koşturur.
 * Sayfa donmaz; bilgisayarda sekme arka plandayken de eğitim sürer. (Telefonda ekran kapanınca ya da
 * tarayıcı arka plana geçince işletim sistemi sayfayı ve işçiyi dondurabilir; bunu engellemek mümkün değil.)
 */
importScripts('sabitler.js', 'yolbul.js', 'dunya.js', 'ogrenme.js', 'beceri.js');
var O = self.Ogrenme, BC = self.Beceri, eg = null, tur = null, calisiyor = false, tur_no = 0;

self.onmessage = function (m) {
  var d = m.data;
  if (d.tip === 'basla') {
    tur = d.tur;
    var s = { beyin: d.beyin, nesil: d.nesil || 0, tohum: d.tohum, lr: d.lr, sigma: d.sigma, cift: d.cift, K: d.K };
    if (tur === 'yol') { eg = new O.Egitici(s); eg.ortam = d.ortam; }
    else eg = new BC.Egitici(BC.BECERILER[tur], s);
    calisiyor = true; tur_no++; dongu(tur_no);
  } else if (d.tip === 'dur') {
    calisiyor = false;
  } else if (d.tip === 'ortam') {
    if (eg && tur === 'yol') eg.ortam = d.ortam;
  }
};

function dongu(no) {
  if (!calisiyor || no !== tur_no) return;          // eski bir eğitimin döngüsü kalmasın
  var t0 = Date.now(), kayitlar = [], n0 = eg.nesil;
  do { kayitlar.push(eg.nesilYap()); } while (Date.now() - t0 < 200);
  var test = null;
  if (Math.floor(eg.nesil / 5) !== Math.floor(n0 / 5))
    test = tur === 'yol' ? O.degerlendir(eg.theta, 24, eg.ortam, 777) : BC.degerlendir(BC.BECERILER[tur], eg.theta, 200, 4242);
  self.postMessage({ tip: 'ilerleme', tur: tur, theta: eg.theta, nesil: eg.nesil, kayitlar: kayitlar, deneme: kayitlar.length * eg.cift * 2 * eg.K, test: test });
  setTimeout(function () { dongu(no); }, 0);
}
