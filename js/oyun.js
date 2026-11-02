/*
 * oyun.js — Arayüz ile oyun mantığını birbirine bağlar (düğmeler, günlük, ayarlar, ses, kayıt).
 * Asıl "beyin" başka dosyalarda: anlayici -> planlayici -> beceriler -> surucu_sim.
 */
(function () {
  'use strict';

  var S = Sabitler;
  var $ = function (id) { return document.getElementById(id); };

  var dunya, surucu;
  var ayarlar = Depo.ayarlar();
  var kod = Depo.oyuncuKodu();
  var mesgul = false;
  var acilDurdu = false;
  var kosuNo = 0;              // her komut yeni bir koşu; acil durdurma o anki koşuyu iptal eder
  var iptalEdilenKosu = -1;
  var calisanSoz = null;

  // ---------- Günlük ve plan ----------
  function gunluk(mesaj, tur) {
    var li = document.createElement('li');
    li.className = tur || 'bilgi';
    li.textContent = mesaj;
    var liste = $('gunluk');
    liste.appendChild(li);
    while (liste.children.length > 300) liste.removeChild(liste.firstChild);
    liste.scrollTop = liste.scrollHeight;
  }

  function planGoster(gorev, plan) {
    var ol = $('planListesi');
    ol.innerHTML = '';
    if (!plan.adimlar.length) {
      var li0 = document.createElement('li'); li0.className = 'bos';
      li0.textContent = plan.bilgi || plan.hata || 'Yapılacak adım yok.';
      ol.appendChild(li0);
      return;
    }
    plan.adimlar.forEach(function (a) {
      var li = document.createElement('li');
      var kod = document.createElement('code');
      kod.textContent = a.beceri + '(' + girdiMetni(a.girdi) + ')';
      li.appendChild(kod);
      li.appendChild(document.createTextNode(' ' + a.aciklama));
      ol.appendChild(li);
    });
  }
  function girdiMetni(g) {
    return Object.keys(g).map(function (k) {
      var v = g[k];
      if (v && typeof v === 'object') v = Object.keys(v).map(function (x) { return v[x]; }).join(':');
      return k + '=' + v;
    }).join(', ');
  }
  function adimDurumu(i, durum) {
    var li = $('planListesi').children[i];
    if (li) li.className = durum;
  }

  // ---------- Animasyon (tarayıcı) ----------
  function animasyon(ms, fn, kontrol) {
    return new Promise(function (coz, red) {
      var t0 = null;
      function kare(t) {
        if (t0 === null) t0 = t;
        try { kontrol(); } catch (e) { return red(e); }
        var p = ms <= 0 ? 1 : Math.min(1, (t - t0) / ms);
        fn(p);
        if (p < 1) requestAnimationFrame(kare); else coz();
      }
      requestAnimationFrame(kare);
    });
  }

  // ---------- Dünya ----------
  function dunyayiKur() {
    dunya = Dunya.kur();
    surucu = new SurucuSim.SimSurucu(dunya, {
      ayarlar: function () { return ayarlar; },
      animasyon: animasyon,
      olay: function (m) { gunluk(m, 'bilgi'); },
      iptal: function () { return iptalEdilenKosu === kosuNo; }
    });
    var eksik = Beceriler.surucuDogrula(surucu);
    if (eksik.length) gunluk('Sürücüde eksik metotlar: ' + eksik.join(', '), 'hata');
  }

  // ---------- Komut çalıştırma ----------
  async function komutVer(metin) {
    metin = (metin || '').trim();
    if (!metin) return;
    if (acilDurdu) {
      gunluk('Acil durdurma açık, komut almıyorum. Devam etmek için kırmızı düğmeye tekrar bas.', 'hata');
      return;
    }
    gunluk('> ' + metin, 'adim');
    // "dur" demek acil durdurmayı açar (robot çalışırken de)
    if (Anlayici.anla(metin).dur) { acilDegistir(true); return; }
    if (mesgul) {
      gunluk('Robot şu an çalışıyor. Bitmesini bekle ya da ACİL DURDUR düğmesine bas.', 'hata');
      return;
    }
    mesgul = true;
    kosuNo++;
    arayuzuGuncelle();
    var benimKosum = kosuNo;
    calisanSoz = Yurutucu.komutuCalistir(metin, {
      surucu: surucu,
      ayarlar: function () { return ayarlar; },
      gunluk: gunluk,
      kayitEt: kayitEt,
      planGoster: planGoster,
      adimDurumu: adimDurumu
    }).catch(function (e) {
      gunluk('Beklenmeyen hata: ' + e.message, 'hata');
      if (window.console) console.error(e);
    }).then(function () {
      if (benimKosum === kosuNo) mesgul = false;
      arayuzuGuncelle();
    });
    await calisanSoz;
  }

  function kayitEt(kayit) {
    Depo.kayitEkle(kayit);
    grafigiGuncelle();
    Takim.gonder(kayit, kod).then(function (s) {
      if (!s.basari && !s.atlandi) gunluk('Takım kaydına gönderilemedi: ' + s.hata, 'hata');
      takimGuncelle();
    });
  }

  // ---------- Takım satırı ve grafik ----------
  function takimGuncelle() {
    Takim.sonGorevler(S.TAKIM_SON_N).then(function (s) {
      $('takimSatiri').textContent = Takim.satirMetni(s, S.TAKIM_SON_N);
    });
  }
  function grafigiGuncelle() {
    var k = Depo.kayitlar();
    Grafik.ciz($('grafik'), k);
    $('grafikOzet').textContent = Grafik.ozet(k);
  }

  // ---------- Acil durdurma ----------
  async function acilDegistir(ac) {
    var yeni = typeof ac === 'boolean' ? ac : !acilDurdu;
    if (yeni === acilDurdu) return;
    if (yeni) {
      acilDurdu = true;
      iptalEdilenKosu = kosuNo;                     // çalışan koşu hemen kesilir
      Ses.durdur();
      arayuzuGuncelle();
    } else {
      // Koşu tamamen durana kadar bekle, sonra robotu hizala
      if (calisanSoz) { try { await calisanSoz; } catch (e) { /* yoksay */ } }
      surucu.hizala();
      mesgul = false;
      acilDurdu = false;
      gunluk('Acil durdurma kapatıldı. Robot komut almaya hazır.', 'bilgi');
      arayuzuGuncelle();
      $('komutGirdi').focus();
    }
  }

  function arayuzuGuncelle() {
    var kilit = acilDurdu;
    $('acilBtn').setAttribute('aria-pressed', acilDurdu ? 'true' : 'false');
    $('acilBtn').textContent = acilDurdu ? 'ACİL DURDURMAYI KALDIR' : 'ACİL DURDUR';
    $('acilBilgi').hidden = !acilDurdu;
    $('komutGirdi').disabled = kilit;
    $('gonderBtn').disabled = kilit || mesgul;
    $('sesBtn').disabled = kilit || mesgul;
    $('sifirlaBtn').disabled = mesgul && !acilDurdu;
    document.querySelectorAll('#oneriler button').forEach(function (b) { b.disabled = kilit || mesgul; });
  }

  // ---------- Ayarlar ----------
  function ayarKur(girdiId, degerId, anahtar, bicim) {
    var g = $(girdiId), sn = S.AYAR_SINIRLARI[anahtar];
    g.min = sn.min; g.max = sn.max; g.step = sn.adim; g.value = ayarlar[anahtar];
    function goster() { $(degerId).textContent = bicim(Number(g.value)); }
    g.addEventListener('input', function () {
      ayarlar[anahtar] = Number(g.value);
      Depo.ayarlariKaydet(ayarlar);
      goster();
    });
    goster();
  }
  function virgul(n, b) { return n.toFixed(b).replace('.', ','); }

  // ---------- Ses ----------
  function sesiBaslat() {
    var durumEl = $('sesDurum');
    durumEl.className = 'ses-durum';
    durumEl.textContent = 'Mikrofon açılıyor… tarayıcı izin sorarsa "İzin ver" de.';
    Ses.dinle({
      basladi: function () { durumEl.textContent = 'Dinliyorum… söyle.'; $('sesBtn').textContent = '🎤 Dinliyorum…'; },
      sonuc: function (metin) {
        durumEl.textContent = 'Duydum: "' + metin + '"';
        $('komutGirdi').value = metin;
        komutVer(metin).then(function () { $('komutGirdi').value = ''; });
      },
      hata: function (mesaj) {
        durumEl.className = 'ses-durum hata';
        durumEl.textContent = /yazı/.test(mesaj) ? mesaj : mesaj + ' Yazıyla devam edebilirsin.';
        $('komutGirdi').focus();                      // yazıyla devam
      },
      bitti: function () { $('sesBtn').textContent = '🎤 Sesle söyle'; }
    });
  }

  // ---------- Başlangıç ----------
  function baslat() {
    dunyayiKur();
    $('oyuncuKodu').textContent = kod;

    ayarKur('ayarTork', 'ayarTorkDeger', 'kavramaTorku', function (n) { return virgul(n, 1); });
    ayarKur('ayarHata', 'ayarHataDeger', 'hataYuzdesi', function (n) { return String(Math.round(n)); });
    ayarKur('ayarHiz', 'ayarHizDeger', 'hiz', function (n) { return virgul(n, 1); });
    $('torkNot').textContent = 'Şişe kapağını açmak için gereken tork ' + virgul(S.KAPAK_TORKU_MIN_NM, 1) + '–' +
      virgul(S.KAPAK_TORKU_MAX_NM, 1) + ' N·m arasında rastgele. Kavrama torku kapak torkundan küçükse kapak açılmaz.';

    Cizim.baslat($('sahne'), function () { return dunya; }, function () { return { acilDurdu: acilDurdu }; },
      function (x, y) {
        if (mesgul || acilDurdu) return;
        if (!Dunya.yurunebilir(dunya, x, y)) return;
        dunya.kullanici.x = x + 0.5; dunya.kullanici.y = y + 0.5;
      });

    $('komutForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var m = $('komutGirdi').value;
      $('komutGirdi').value = '';
      komutVer(m);
    });
    $('sesBtn').addEventListener('click', sesiBaslat);
    $('acilBtn').addEventListener('click', function () { acilDegistir(); });
    $('sifirlaBtn').addEventListener('click', function () {
      if (mesgul) return;
      dunyayiKur();
      $('planListesi').innerHTML = '<li class="bos">Henüz plan yok.</li>';
      gunluk('Ev sıfırlandı: kapılar rastgele, şişenin kapak torku yeniden seçildi.', 'bilgi');
    });
    $('kayitSilBtn').addEventListener('click', function () {
      if (window.confirm('Bu tarayıcıdaki görev kayıtları silinsin mi? (Takım kaydındaki satırlar silinmez.)')) {
        Depo.kayitlariSil(); grafigiGuncelle();
      }
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') acilDegistir(true);   // Esc = acil durdur
    });

    // Örnek komutlar
    ['mutfaktan su getir', 'şişeyi açıp getir', 'havluyu getir ve banyonun ışığını kapat', 'tv yi aç',
      'ışığı kapatır mısın', 'kapıyı kapat', 'tekerlekli sandalyeyi getir', 'beni yatak odasına götür',
      'buzdolabını aç'].forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = m;
      b.addEventListener('click', function () { komutVer(m); });
      $('oneriler').appendChild(b);
    });

    // Ses desteği yoksa baştan söyle
    var sesEngel = Ses.engel();
    if (sesEngel) { $('sesDurum').textContent = sesEngel; $('sesDurum').className = 'ses-durum hata'; }

    // Varsayımlar tablosu
    var tablo = $('varsayimTablo');
    tablo.innerHTML = '<tr><th>Ad</th><th>Değer</th><th>Açıklama</th></tr>';
    S.LISTE.forEach(function (s) {
      var tr = document.createElement('tr');
      [s.ad, s.deger + (s.birim ? ' ' + s.birim : ''), s.aciklama + (s.varsayim ? '' : '')].forEach(function (t, i) {
        var td = document.createElement(i === 0 ? 'th' : 'td'); td.textContent = t; tr.appendChild(td);
      });
      tablo.appendChild(tr);
    });

    // Beceri arayüzü listesi
    Beceriler.katalog().forEach(function (b) {
      var li = document.createElement('li');
      var c = document.createElement('code');
      c.textContent = b.ad + '(' + Object.keys(b.girdi).join(', ') + ')';
      li.appendChild(c); li.appendChild(document.createTextNode(' — ' + b.aciklama));
      $('beceriListe').appendChild(li);
    });

    grafigiGuncelle();
    takimGuncelle();
    arayuzuGuncelle();
    gunluk('Merhaba! Robot hazır. Bir komut yaz ya da "Sesle söyle" düğmesine bas. Esc tuşu da acil durdurur.', 'bilgi');
  }

  // Test ve hata ayıklama için dışarıya küçük bir kapı
  window.RobotEvOyunu = {
    komutVer: komutVer,
    durum: function () { return { dunya: dunya, mesgul: mesgul, acilDurdu: acilDurdu }; }
  };

  baslat();
})();
