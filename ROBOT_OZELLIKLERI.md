# Robotun özellikleri (proje notu — simülasyon ve eğitim bunu baz alır)

Kaynak: ekibin TASIMA_NOTU_TAM.md dosyası ve çizimleri. Ölçüler **varsayımdır**; şema ve gerçek ölçümler gelince değişir.

## Yapı
- Tekerlekli taban, yaklaşık 45 × 40 cm. İki büyük motorlu tekerlek ortada, iki serbest tekerlek önde ve arkada; palet yok.
- Olduğu yerde dönebilir, ileri/geri gider, yan yan gidemez. Hız en çok 0,5 m/s. Robot yaklaşık 20–30 kg.
- Yükselen direk (~35 cm), üstünde kafa: kamera, mesafe sensörü, mikrofon, hoparlör. Direkte kırmızı acil durdurma düğmesi.
- Önde tampon. Pil altta, beyin Pi 5 + ESP32.
- İki kol (omuz, dirsek, bilek); her kolun ucunda kemerli el (bantlı tutucu).
- Kol uzanıkken robot yürümez. Yürürken kollar katlı, kafa alçakta.

## Özellikler
1. **Şişe kapağı açma (ana iş):** bir el şişenin gövdesini sabit tutar, öbür el kayışla kapağı çevirir; açıp sahibine verir.
2. **Kendine destek:** kişi ayağa kalkarken tutunup güç alabilsin diye robot sabit durur (tekerlekler kilitli).
   - Güvenlik uyarısı: ekip notunda "yürümeye destek" riskli bulunup kapsam dışı bırakılmıştı. Ayağa kalkmaya destek de benzer risk taşır. Önce yalnızca duran, kilitli robot + tutunma kolu olarak ve uzman görüşüyle düşünülmeli; ilk sürümde değil.
3. **Önden kapı açma.**
4. **Buzdolabı açma:** tutacı tutar, tekerlekle geri giderek açar (kapı yay çizdiği için giderken hafif döner).
5. **Televizyon kumandasını getirme** (TV/ışık kontrolü de var).

## Her zaman geçerli kurallar
- Acil durdurma her şeyden önce gelir; yapay zekâdan bağımsız çalışır.
- Kol uzanıkken hareket yasak, hız sınırı, çarpışmada durma, riskli işte onay.
