/*
 * yurutucu.js — Üç katmanı birbirine bağlar:
 *   komut --(anlayici)--> görevler --(planlayici)--> adımlar --(beceriler)--> sürücü
 *
 * Her görev sırayla planlanır ve çalıştırılır; görev bitince bir başarı kaydı
 * (kayitEt) üretilir. Acil durdurma gelirse her şey hemen kesilir ve kayıt yazılmaz
 * (bu bir beceri hatası değil, insan müdahalesidir).
 */
(function (kok) {
  'use strict';
  var Anlayici = kok.Anlayici || require('./anlayici.js');
  var Planlayici = kok.Planlayici || require('./planlayici.js');
  var Beceriler = kok.Beceriler || require('./beceriler.js');

  /*
   * ortam:
   *   surucu                       beceri sürücüsü
   *   ayarlar()                    {kavramaTorku, hataYuzdesi, hiz}
   *   gunluk(mesaj, tur)           tur: 'bilgi' | 'basari' | 'hata' | 'adim'
   *   kayitEt(kayit)               görev bitince çağrılır
   *   planGoster(gorev, plan)      (isteğe bağlı) arayüzde planı göster
   *   adimDurumu(i, durum)         (isteğe bağlı) 'calisiyor' | 'tamam' | 'hata'
   * Dönüş: { durduruldu, dur, sonuclar:[{gorev, basari, neden}] }
   */
  async function komutuCalistir(metin, ortam) {
    var anlam = Anlayici.anla(metin);
    var sonuc = { durduruldu: false, dur: !!anlam.dur, sonuclar: [], anlasildi: anlam.gorevler.length > 0 };
    if (anlam.mesaj) ortam.gunluk(anlam.mesaj, anlam.gorevler.length ? 'bilgi' : 'hata');
    if (anlam.dur) return sonuc;

    var beceriOrtami = {
      surucu: ortam.surucu,
      gunluk: function (m) { ortam.gunluk(m, 'bilgi'); }
    };

    for (var gi = 0; gi < anlam.gorevler.length; gi++) {
      var gorev = anlam.gorevler[gi];
      var ayar = ortam.ayarlar();
      ortam.gunluk('Görev ' + (gi + 1) + '/' + anlam.gorevler.length + ': ' + gorev.ozet, 'adim');

      var basari = false, neden = '', kapakTorku = null;
      try {
        var gozlem = ortam.surucu.algi();
        var plan = Planlayici.planla(gorev, gozlem);
        if (plan.notlar) plan.notlar.forEach(function (n) { ortam.gunluk(n, 'bilgi'); });
        if (ortam.planGoster) ortam.planGoster(gorev, plan);

        if (plan.hata) { neden = plan.hata; }
        else {
          // Bu görevde şişenin kapağı açılacaksa o anki kapak torkunu kaydet
          if (plan.adimlar.some(function (a) { return a.beceri === 'kapakAc'; }))
            kapakTorku = gozlem.esyalar.su.kapakTorku;
          basari = true;
          for (var i = 0; i < plan.adimlar.length; i++) {
            var a = plan.adimlar[i];
            if (ortam.adimDurumu) ortam.adimDurumu(i, 'calisiyor');
            var r = await Beceriler.calistir(a.beceri, a.girdi, beceriOrtami);
            if (!r.basari) {
              if (ortam.adimDurumu) ortam.adimDurumu(i, 'hata');
              basari = false; neden = r.neden || 'Bilinmeyen hata';
              break;
            }
            if (ortam.adimDurumu) ortam.adimDurumu(i, 'tamam');
          }
          if (basari && plan.bilgi) ortam.gunluk(plan.bilgi, 'bilgi');
        }
      } catch (e) {
        if (e && e.acilDurdurma) {
          ortam.gunluk('ACİL DURDURMA: robot ve plan durduruldu. Bu görev için kayıt yazılmadı.', 'hata');
          sonuc.durduruldu = true;
          return sonuc;
        }
        throw e;
      }

      var kayit = {
        komut: gorev.ozet, basari: basari,
        kavramaTorku: ayar.kavramaTorku, hataYuzdesi: ayar.hataYuzdesi,
        kapakTorku: kapakTorku, zaman: new Date().toISOString()
      };
      sonuc.sonuclar.push({ gorev: gorev, basari: basari, neden: neden });
      ortam.gunluk(basari ? 'Görev tamam: ' + gorev.ozet : 'Görev BAŞARISIZ: ' + gorev.ozet + (neden ? ' — ' + neden : ''),
        basari ? 'basari' : 'hata');
      if (ortam.kayitEt) ortam.kayitEt(kayit);
    }
    return sonuc;
  }

  var API = { komutuCalistir: komutuCalistir };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Yurutucu = API;
})(typeof window !== 'undefined' ? window : globalThis);
