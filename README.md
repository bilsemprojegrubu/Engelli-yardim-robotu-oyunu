# Robot Ev Oyunu

Engelli ve yaşlı kişilere ev işlerinde yardım eden bir robot için **tarayıcıda çalışan** simülasyon oyunu
(TÜBİTAK ve TEKNOFEST projesi). Amaç: robotun "üst beynini" (komutu anlama, plan yapma, beceri seçme)
önce bu oyunda geliştirmek, sonra **aynı beyni gerçek robota taşımak**.

- Sadece HTML, CSS ve düz JavaScript. Framework, derleme aracı, npm yok.
- Arka uç isteğe bağlı: Supabase (REST, kütüphanesiz). Ayar boşsa oyun yine çalışır.
- GitHub Pages'te yayınlanır.

## İçindekiler

1. [Çalıştırma](#çalıştırma)
2. [Nasıl oynanır](#nasıl-oynanır)
3. [Nasıl çalışıyor (mimari)](#nasıl-çalışıyor-mimari)
4. [Gerçek robota taşıma](#gerçek-robota-taşıma)
5. [Varsayımlar](#varsayımlar)
6. [Supabase kurulumu](#supabase-kurulumu)
7. [GitHub Pages yayını](#github-pages-yayını)
8. [Testler](#testler)
9. [Katkı kuralları](#katkı-kuralları)
10. [Bilinen sınırlar](#bilinen-sınırlar)

## Çalıştırma

Kurulum gerekmez. Depoyu indirip bir yerel sunucu başlatman yeterli:

```bash
git clone https://github.com/bilsemprojegrubu/engelli-yardim-robotu-oyunu.git
cd engelli-yardim-robotu-oyunu
python3 -m http.server 8000
```

Sonra tarayıcıda `http://localhost:8000` adresini aç.

`index.html` dosyasını çift tıklayıp doğrudan açmak da çalışır. Ama **sesle komut** için `localhost` ya da
`https` adresi daha güvenilirdir (mikrofon izni için). En iyi deneyim: Chrome ya da Edge.

## Nasıl oynanır

Ev 4 odalıdır: **salon, mutfak, yatak odası, banyo**. Kapılar açık ya da kapalıdır; robot kapalı kapıyı kendisi açar.
Mavi daire sensin (haritada boş bir yere tıklayarak yerini değiştirebilirsin), turuncu daire robot.

Komutu yazabilir ya da **🎤 Sesle söyle** düğmesine basıp söyleyebilirsin. Örnekler:

| Komut | Ne olur |
|---|---|
| `mutfaktan su getir` | Su şişesini tutup sana getirir (kapak sıkı kalır) |
| `şişeyi açıp getir` | Kapağı açar, sonra getirir |
| `ışığı kapatır mısın` | Bulunduğun odanın ışığını kapatır |
| `tv yi aç` | Televizyonun yanına gidip açar |
| `havluyu getir ve banyonun ışığını kapat` | İki iş: "ve" ile bağlanır |
| `kapıyı kapat`, `banyo kapısını aç` | Kapıyı kapatır / açar |
| `tekerlekli sandalyeyi getir` | Sandalyeyi sana getirir |
| `beni salona götür` | Yanına gelir, seni salona götürür |
| `beni küvete götür`, `beni masaya götür`, `kumandaya git` | Evdeki **her mobilyayı ve eşyayı** tanır (liste `js/dunya.js` içindeki `MOBILYALAR`'dan gelir); o şeyin yanına gider ya da seni götürür |
| `kalem getir`, `bahçeye git` | Tanımadığı şeyi söyler ve bildiklerini sıralar |
| `buzdolabını aç` | Tutacı tutar, **tekerlekle geri giderek** kapıyı açar |
| `mutfağa git`, `bana gel` | Robotu gönderir / çağırır |
| `tüm ışıkları kapat` | Bütün odaların ışığını kapatır |

**Acil durdur:** kırmızı düğme (ya da `Esc` tuşu, ya da "dur" komutu). Basınca robot ve plan **hemen** durur,
tekrar basılana kadar komut almaz. Acil durdurma bir beceri hatası sayılmaz; o görev için kayıt yazılmaz.

**Ayarlar:**

- **Robotun kavrama torku (N·m):** robotun uygulayabileceği en büyük tork. Kapak torku bundan büyükse kapak
  **açılmaz** ve nedeni günlükte yazar.
- **Tutma / ölçüm hatası (%):** robot kapak torkunu bu kadar yanlış ölçebilir ve eşyayı tutarken kaydırabilir.
- **Oyun hızı:** animasyon hızı.

**Başarı kaydı ve grafik:** her görevden sonra kayıt tutulur. "Gelişim grafiği", görev sayısına göre *toplam*
(birikimli) başarı oranını gösterir. Kayıtlar tarayıcıda saklanır; Supabase ayarlıysa ayrıca takım kaydına gider.

### Kapak torku nasıl modellendi?

1. Her şişenin gerçek kapak torku `KAPAK_TORKU_MIN_NM` ile `KAPAK_TORKU_MAX_NM` (2,2–4,2 N·m) arasında rastgele seçilir.
2. Robot torku **ölçer**; ölçümde "hata yüzdesi" kadar sapma olur.
3. Robot, ölçtüğünün `TORK_EMNIYET_PAYI` katını uygulamaya çalışır ama **kavrama torkunu aşamaz**.
4. Gerçek tork kavrama torkundan büyükse kapak açılmaz (tekrar denemek boşuna, bir kez dener).
   Gerçek tork sınırın altında ama ölçüm düşük çıktığı için tork yetmediyse, bir kez daha dener.
5. Şişe sana teslim edilince kapak yeniden sıkılır ve yeni rastgele tork gelir (oyun kuralı; tekrar tekrar denemek için).
   Teslim edilmeyen (başarısız) görevde tork aynı kalır. "Evi sıfırla" yeni tork seçer.

### Buzdolabı kapısı

Robot buzdolabının önüne gider, **kolu sadece tutaçı tutar**. Kapıyı açan şey **tekerleklerdir**: robot geri gider.
Kapı menteşe etrafında yay çizdiği için robot düz geri gidemez; geri giderken hafifçe döner (kapı açısının
`BUZDOLABI_DONUS_ORANI` katı kadar). Robotun çekebileceği kuvvet (`sürtünme × en hafif kütle × g`),
buzdolabı çekme kuvvetinden (30 N varsayımı) küçükse tekerlekler kayar ve kapı açılmaz. Kapının açılacağı
alanda engel varsa da açılmaz; nedeni günlükte yazar.

## Nasıl çalışıyor (mimari)

```
 "havluyu getir ve banyonun ışığını kapat"
          │
 ┌────────▼─────────┐
 │ 1. ANLAYICI      │  js/anlayici.js    Türkçe metin -> görev listesi (kural tabanlı)
 └────────┬─────────┘
 ┌────────▼─────────┐
 │ 2. PLANLAYICI    │  js/planlayici.js  görev -> beceri adımları (donanımdan bağımsız)
 └────────┬─────────┘
 ┌────────▼─────────┐
 │ 3. BECERİLER     │  js/beceriler.js   git, tut, birak, kapakAc, isik, tv, kapiAc, kapiKapat,
 └────────┬─────────┘                    tekerlekleCek, eslikEt  (ad + girdi şeması)
 ┌────────▼─────────┐
 │ SÜRÜCÜ ARAYÜZÜ   │  js/surucu_sim.js  şimdi: simülasyon.  Sonra: gerçek robot.
 └──────────────────┘
```

`js/yurutucu.js` bu zinciri çalıştırır: görevleri sırayla planlar, adımları yürütür, görev bitince başarı kaydı üretir.

| Dosya | Görevi |
|---|---|
| `js/sabitler.js` | **Tüm varsayımlar ve sabitler tek yerde**, adı ve açıklamasıyla |
| `js/dunya.js` | Ev, odalar, kapılar, eşyalar, cihazlar (veri) |
| `js/yolbul.js` | Izgarada BFS ile yol bulma |
| `js/anlayici.js` | Katman 1: Türkçe komutu anlama |
| `js/planlayici.js` | Katman 2: planı adımlara bölme |
| `js/beceriler.js` | Katman 3: beceriler + sürücü arayüzü tanımı |
| `js/surucu_sim.js` | Beceri arayüzünün simülasyon gerçeklemesi (tork, kayma, çekiş fiziği) |
| `js/yurutucu.js` | Katmanları birbirine bağlar |
| `js/depo.js` | Tarayıcı kaydı (oyuncu kodu, ayarlar, görev kayıtları) |
| `js/takim.js` | Supabase ile takım kaydı (fetch) |
| `js/grafik.js` | Gelişim grafiği |
| `js/ses.js` | Sesle komut (Web Speech API, tr-TR) |
| `js/cizim.js`, `js/oyun.js`, `index.html`, `style.css` | Arayüz |
| `supabase/kurulum.sql` | Tablo + satır güvenliği |
| `tests/` | Testler |

### Komut anlama nasıl çalışıyor?

Yapay zekâ modeli yok; **kural tabanlı**. Metin önce "katlanır" (küçük harf; ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u),
kelimelere ve parçalara bölünür (`ve`, `sonra`, virgül, `-ıp` gibi bağlaçlardan). Her parçada fiil, nesne ve
oda eki (`salona` = oraya, `mutfaktan` = oradan) aranır. "Havlu ve ilaç getir" gibi fiili olmayan parçalar
sonraki parçanın fiilini alır; "kapağını aç ve bana getir" gibi eşya adı olmayan parçalar bir önceki eşyayı kullanır.
Anlaşılmayan ya da olumsuz ("getirme") komut yapılmaz, nedeni söylenir.

Eksik bir kalıp bulursan: `tests/komut_testi.js` içine cümleyi ekle, testin kırıldığını gör, sonra `js/anlayici.js`'i düzelt.

## Gerçek robota taşıma

"Üst beyin" (anlayıcı + planlayıcı + beceriler) donanım bilmez. Donanıma tek kapı, `js/beceriler.js` başındaki
**sürücü arayüzü**dür. Gerçek robota geçmek için:

1. `js/surucu_gercek.js` yaz ve `SimSurucu`daki metotların aynılarını gerçekle:

   | Metot | Ne yapar |
   |---|---|
   | `algi()` | Dünyanın gözlemini ver (robot konumu, eşyalar, kapılar, aygıtlar). Gerçek robotta harita + algılayıcılar. |
   | `kavramaTorkuSiniri()` | Kavrayıcının en büyük torku (N·m) |
   | `ilerle(x, y, {eslik})` | Yan hücreye bir adım (ya da gezinti yığınına hedef ver) |
   | `kavra(nesneId)` | Tutacı kapat; kayarsa `{basari:false, kaydi:true}` |
   | `birak()` | Elindekini bırak |
   | `kapakCevir(esyaId)` | Bileği çevirip kapağı aç; başarısızsa `{neden, yeniden}` |
   | `kapiHareketi(kapiId, acik)` | Kapıyı aç / kapat |
   | `dugmeBas(hedef, acik)` | `'tv'` ya da `'isik:<oda>'` |
   | `tekerlekleCek(nesne)` | Tutaçtan tutup tekerlekle geri giderek aç |

2. Her metot bir `Promise` döndürür: `{basari: true}` ya da `{basari: false, neden: '...'}`.
   Acil durdurmada `acilDurdurma: true` işaretli bir `Error` fırlat.
3. `Beceriler.surucuDogrula(surucu)` eksik metotları listeler.
4. `oyun.js` içinde `SimSurucu` yerine yeni sürücüyü ver. Anlayıcı, planlayıcı ve beceriler **değişmez**.

Simülasyondaki "fizik" (tork ölçüm hatası, tutma kayması, çekiş) gerçek robotta zaten donanımdan gelir;
o sayıları gerçek ölçümle `js/sabitler.js`'e yazarsın.

## Varsayımlar

Bunlar **gerçek ölçümle değişecek** ve kodda **tek yerde** (`js/sabitler.js`) durur. Oyunda da
"Varsayımlar" bölümünde listelenir.

| Sabit | Değer | Açıklama |
|---|---|---|
| `KAPAK_TORKU_MIN_NM` / `MAX_NM` | 2,2 – 4,2 N·m | Şişe kapak torku bu aralıkta rastgele |
| `BUZDOLABI_CEKME_KUVVETI_N` | 30 N | Buzdolabı kapısını açmak için çekme kuvveti |
| `ROBOT_KUTLESI_MIN_KG` / `MAX_KG` | 20 – 30 kg | Robot kütlesi belli değil; en kötü durum (20 kg) kullanılır |

Bizim koyduğumuz **modelleme basitleştirmeleri** (bunlar da `sabitler.js`'te): `TEKER_SURTUNME_KATSAYISI` (0,5),
`TORK_EMNIYET_PAYI` (1,1), `TUTMA_KAYMA_CARPANI` (0,5), `DENEME_SAYISI` (2), `BUZDOLABI_ACMA_ACISI_DERECE` (75°),
`BUZDOLABI_DONUS_ORANI` (0,3). Bunlar ölçüm değil, makul tahmindir.

## Supabase kurulumu

Supabase **isteğe bağlıdır**. `config.js` boşsa oyun çalışır; sayfada "Takım kaydı: kapalı" yazar.

1. [supabase.com](https://supabase.com) üzerinde ücretsiz bir proje aç.
2. Panelde **SQL Editor → New query** aç, [`supabase/kurulum.sql`](supabase/kurulum.sql) dosyasının içeriğini yapıştır, **Run**'a bas.
   Bu, `task_logs` tablosunu kurar, **satır güvenliğini (RLS) açar** ve anonim kullanıcıya **sadece ekleme ve okuma**
   yetkisi verir (silme ve değiştirme yok).
3. **Project Settings → API** sayfasından iki şeyi kopyala:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public** anahtarı (yeni projelerde "publishable" anahtar)
4. `config.js` dosyasına yaz:

   ```js
   window.YAPILANDIRMA = {
     SUPABASE_URL: 'https://xxxx.supabase.co',
     SUPABASE_ANON_KEY: 'buraya-anon-anahtarı'
   };
   ```

> ⚠️ **Sadece `anon` anahtarını yaz.** `service_role` anahtarı her şeye yetkilidir; `config.js` herkese açık
> yayınlandığı için oraya konursa herkes veritabanını silebilir. Oyun, `service_role` anahtarı görürse onu
> **kullanmayı reddeder** ve günlüğe uyarı yazar. Yine de koyma.

**Tablo alanları (`task_logs`):** oyuncu kodu (rastgele, kişisel bilgi yok), komut, başarı, kavrama torku,
hata yüzdesi, kapak torku, zaman. "Komut" alanına, yazdığın ham cümle değil, anlaşılan görevin **temiz özeti**
yazılır (ör. `havluyu getir`). Böylece yanlışlıkla yazılan kişisel bilgi veritabanına gitmez.

**Doğrulama (isteğe bağlı):** ekleme çalışmalı, silme çalışmamalı.

```bash
curl -s -o /dev/null -w "ekleme: %{http_code}\n" -X POST "$URL/rest/v1/task_logs" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON" -H "Content-Type: application/json" \
  -d '{"oyuncu_kodu":"OYN-TEST1234","komut":"deneme","basari":true,"kavrama_torku":3.5,"hata_yuzdesi":5}'
```

```bash
curl -s -w "\nsilme: %{http_code}\n" -X DELETE "$URL/rest/v1/task_logs?oyuncu_kodu=eq.OYN-TEST1234" \
  -H "apikey: $ANON" -H "Authorization: Bearer $ANON"
```

İlkinde `201`, ikincisinde `401`/`403` ("permission denied") beklenir. Kayıt yine de duruyor olmalı.

Bu satırlar `tests/takim_testi.js` ile *sahte sunucuya karşı* denenmiştir; kendi projende yukarıdaki kontrolü bir kez çalıştır.

## GitHub Pages yayını

1. Kodu GitHub'a it ve `main` dalına birleştir.
2. Depoda **Settings → Pages → Build and deployment → Source: Deploy from a branch**.
3. Dal olarak `main`, klasör olarak `/ (root)` seç, **Save**.
4. Birkaç dakika sonra oyun `https://<kullanıcı-adı>.github.io/<depo-adı>/` adresinde yayında olur.

`https` olduğu için sesle komut (mikrofon) orada çalışır. `config.js` içindeki anon anahtarı herkes görebilir; bu normaldir
ve güvenlidir, çünkü yetkiyi RLS sınırlar (bkz. Supabase kurulumu).

## Testler

Tarayıcı ve npm gerekmez, sadece Node.js:

```bash
node tests/komut_testi.js     # 60+ Türkçe cümle: komut anlama
node tests/senaryo_testi.js   # uçtan uca: kapak torku, buzdolabı yayı, acil durdurma, 300 rastgele komut
node tests/takim_testi.js     # Supabase modülü (sahte fetch) + gizli anahtar kontrolü
```

## Katkı kuralları

- **Sadece HTML, CSS ve düz JavaScript.** Framework, derleme aracı ya da npm bağımlılığı ekleme.
- **Yorumlar ve arayüz metinleri Türkçe**, sade ve günlük dille.
- **Gizli anahtar koyma.** `config.js`'e sadece Supabase anon anahtarı yazılabilir. `service_role` asla.
- **Varsayımlı sayıları** (tork, kuvvet, kütle...) koda dağıtma; `js/sabitler.js`'e adı ve açıklamasıyla ekle.
- **Becerilerin adı ve girdileri** gerçek robota bağlanacağı için kıymetlidir. Bir becerinin adını ya da
  girdisini değiştirirsen README'deki sürücü tablosunu ve testleri de güncelle.
- **Yeni komut kalıbı:** önce `tests/komut_testi.js`'e cümleyi ekle, sonra düzelt.
- **Commit'ler küçük ve açıklamalı** olsun; mesajı Türkçe yaz, *ne* ve *neden* değiştiğini söyle.
- Göndermeden önce üç testi çalıştır; üçü de geçmeli.
- Aynı katman kuralına uy: anlayıcı donanım bilmez, planlayıcı sürücü çağırmaz, beceriler dünyaya doğrudan dokunmaz (sadece sürücüden).

## Bilinen sınırlar

- Komut anlama kural tabanlıdır; çok serbest ya da çok karmaşık cümleleri anlamaz (anlamadığında söyler).
- Ses tanıma tarayıcının servisine bağlıdır: internet ister, Firefox'ta yoktur. Çalışmazsa nedeni yazılır, yazıyla devam edilir.
- Buzdolabını yalnızca **açabilir**; kapatmayı bilmez. Buzdolabının içinden eşya almaz.
- Robot bir seferde tek eşya taşır. Kullanıcı ve robot ızgarada birbirine engel olmaz.
- Fizik basittir (kayma olasılığı, tork ölçümü, çekiş kuvveti); gerçek robotun dinamiğini yansıtmaz.
- Supabase bağlantısı gerçek bir projeyle henüz denenmedi; sahte sunucu testleri vardır.

## 3D görünüm

Oyun varsayılan olarak Three.js ile gerçek 3D açılır (sürükle: döndür, tekerlek/iki parmak: yakınlaştır, zemine tıkla: kendini taşı). "2D" düğmesi eski kuş bakışı görünüme döner; tarayıcıda WebGL yoksa 2D otomatik kalır.
Three.js r128 ve OrbitControls (MIT lisanslı) `js/vendor/` altında depodadır, bu yüzden internetsiz de çalışır.
