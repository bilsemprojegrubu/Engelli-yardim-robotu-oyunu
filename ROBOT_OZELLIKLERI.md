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

## Sınırlar: robot kendini yıkılmaz sanmasın (ekip kararı, dipnot)
- Simülasyonda robotun **devrilme sınırı** ve **güç sınırı** olacak. Devrilirse ya da gücünü aşarsa (çok ağır masa/sehpa itmek, kolu aşırı uzatıp yük almak, sandalyeyi eğimde itmek) eğitimde ağır ceza alır.
- Amaç: simülasyonda hiç devrilmediği için gerçekte de devrilmeyeceğini sanıp yapamayacağı işe kalkışmasın. Bu yüzden eğitimde sınırın dışına çıkma denemeleri de olacak ve robot "bunu yapamam" demeyi öğrenecek.
- Sahibi "şu masayı it" dediğinde robot önce kendi sınırına bakar: nesne çok ağırsa, zemin kaygansa, devrilme riski varsa **reddeder ve nedenini söyler**.
- Gerçek sınır değerleri (devrilme açısı, itme kuvveti, kol yükü) simülasyonda varsayımdır; gerçek robotta ölçülüp güncellenecek. Robot kendi ölçümlerini (eğim sensörü, motor akımı) sınırı kontrol etmek için kullanır.

## Simülasyondaki durum (Eğitim Laboratuvarı)
- Öğrenildi: hedefe gitme, evi tarama, kapak açma (ve "açamıyorum" deme), eşya itme ile güç/devrilme sınırı ("yapamam" deme), kumanda getirme ve "şişeyi aç ve getir" zincirleri.
- Sırada: buzdolabı açma (geri giderek), tekerlekli sandalye itme, ayağa kalkarken destek.
