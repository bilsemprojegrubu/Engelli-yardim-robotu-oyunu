/*
 * sabitler.js — Tüm varsayımlar ve ayar sabitleri TEK yerde.
 *
 * Buradaki sayıların çoğu henüz gerçek ölçüme dayanmıyor (varsayım).
 * Gerçek robotla ölçüm yapınca sadece bu dosyayı değiştirmek yeterli olmalı.
 * Her sabitin adı, birimi ve açıklaması vardır; arayüzdeki "Varsayımlar"
 * bölümü LISTE'yi kullanarak bunları otomatik gösterir.
 */
(function (kok) {
  'use strict';

  var S = { LISTE: [] };

  // Bir sabit tanımlar: S.AD ile okunur, LISTE'ye de eklenir.
  function tanimla(ad, deger, birim, aciklama, varsayim) {
    S[ad] = deger;
    S.LISTE.push({
      ad: ad, deger: deger, birim: birim, aciklama: aciklama,
      varsayim: varsayim !== false
    });
  }

  // ---- Bilinen varsayımlar (gerçek ölçümle değişecek) ----
  tanimla('KAPAK_TORKU_MIN_NM', 2.2, 'N·m',
    'Su şişesi kapağını açmak için gereken tork, bu değer ile en büyük değer arasında rastgele seçilir (en küçük).');
  tanimla('KAPAK_TORKU_MAX_NM', 4.2, 'N·m',
    'Su şişesi kapağını açmak için gereken tork (en büyük).');
  tanimla('BUZDOLABI_CEKME_KUVVETI_N', 30, 'N',
    'Buzdolabı kapısını açmak için tutacı çekmek gereken kuvvet (varsayım).');
  tanimla('ROBOT_KUTLESI_MIN_KG', 20, 'kg',
    'Robotun kütlesi henüz belli değil; en az bu kadar sayılır. Çekiş hesabında en kötü durum (en hafif) kullanılır.');
  tanimla('ROBOT_KUTLESI_MAX_KG', 30, 'kg',
    'Robotun kütlesi henüz belli değil; en fazla bu kadar sayılır.');

  // ---- Modelleme sabitleri (bizim koyduğumuz basitleştirmeler) ----
  tanimla('TEKER_SURTUNME_KATSAYISI', 0.5, '',
    'Tekerlek-zemin sürtünme katsayısı. Robotun en fazla çekebileceği kuvvet = katsayı × kütle × yerçekimi.');
  tanimla('TORK_EMNIYET_PAYI', 1.1, '×',
    'Robot ölçtüğü kapak torkunun bu kadar katını uygulamaya çalışır (ölçüm hatasına karşı pay). Kavrama torkunu aşamaz.');
  tanimla('TUTMA_KAYMA_CARPANI', 0.5, '×',
    'Tutarken eşyanın kayma olasılığı = "tutma/ölçüm hatası %" × bu çarpan.');
  tanimla('DENEME_SAYISI', 2, 'kez',
    'Tutma kayarsa ya da ölçüm hatası yüzünden tork yetmezse robot en fazla bu kadar dener.');
  tanimla('BUZDOLABI_ACMA_ACISI_DERECE', 75, '°',
    'Buzdolabı kapısı bu açıya kadar açılır.');
  tanimla('BUZDOLABI_DONUS_ORANI', 0.3, '×',
    'Robot geri giderken kapı açısının bu oranı kadar döner (kapı yay çizdiği için).');
  tanimla('YERCEKIMI', 9.81, 'm/s²', 'Yerçekimi ivmesi.', false);
  tanimla('TAKIM_SON_N', 50, 'görev',
    '"Takım kaydı" satırında kaç son görev sayılacak.', false);
  tanimla('YEREL_KAYIT_SINIRI', 500, 'görev',
    'Tarayıcıda en fazla kaç görev kaydı saklanır.', false);

  // Oyun ayarlarının başlangıç değerleri ve sınırları
  S.VARSAYILAN_AYARLAR = { kavramaTorku: 3.5, hataYuzdesi: 5, hiz: 1 };
  S.AYAR_SINIRLARI = {
    kavramaTorku: { min: 1, max: 6, adim: 0.1 },
    hataYuzdesi: { min: 0, max: 30, adim: 1 },
    hiz: { min: 0.5, max: 4, adim: 0.5 }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = S;
  else kok.Sabitler = S;
})(typeof window !== 'undefined' ? window : globalThis);
