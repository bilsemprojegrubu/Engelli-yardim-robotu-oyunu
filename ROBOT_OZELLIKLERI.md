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
   - **İlk modelde yapılmayacak, sonra eklenecek (ekip kararı).**
   - Güvenlik uyarısı: ekip notunda "yürümeye destek" riskli bulunup kapsam dışı bırakılmıştı. Ayağa kalkmaya destek de benzer risk taşır. Önce yalnızca duran, kilitli robot + tutunma kolu olarak ve uzman görüşüyle düşünülmeli; ilk sürümde değil.
3. **Önden kapı açma.**
4. **Buzdolabı açma:** tutacı tutar, tekerlekle geri giderek açar (kapı yay çizdiği için giderken hafif döner).
5. **Televizyon kumandasını getirme** (TV/ışık kontrolü de var).
6. **Tekerlekli sandalyeyi itme (sonra eklenecek, ilk modelde yok):** kişi sandalyedeyken robot onu salondan mutfağa, mutfaktan yatak odasına götürür. Kucağına almaz; sadece iter.
   - Robot kamera ve sensörlerle ortama bakar; ne kadar kuvvetle iteceğini (tork) öğrenir. Eğitimde kişi/sandalye ağırlığı, zemin eğimi, eşik, halı, engel rastgele değişir.
   - Güvenlik uyarısı: ekip notunda "sandalye getirme/itme" insan ağırlığı ve devrilme riski yüzünden yapılmayacaklar arasındaydı. Şimdi ekip kararıyla sonraki aşamaya alındı. Başlamadan önce: çok düşük hız, eşik/rampa sınırı, devrilme ve fren hesabı, kişi olmadan test, acil durdurma, uzman görüşü gerekir.

## Her zaman geçerli kurallar
- Acil durdurma her şeyden önce gelir; yapay zekâdan bağımsız çalışır.
- Kol uzanıkken hareket yasak, hız sınırı, çarpışmada durma, riskli işte onay.
