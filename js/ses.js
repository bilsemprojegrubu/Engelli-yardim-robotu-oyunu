/*
 * ses.js — Sesle komut (Web Speech API, tr-TR).
 * Ses çalışmazsa NEDENİNİ Türkçe söyler; her durumda yazıyla devam edilebilir.
 */
(function (kok) {
  'use strict';

  var HATA_MESAJLARI = {
    'not-allowed': 'Mikrofon izni verilmedi. Adres çubuğundaki kilit simgesinden mikrofona izin verebilirsin.',
    'service-not-allowed': 'Tarayıcı bu sayfada ses tanımaya izin vermiyor (ayar ya da kurum kuralı olabilir).',
    'audio-capture': 'Mikrofon bulunamadı. Mikrofonun takılı ve açık olduğundan emin ol.',
    'no-speech': 'Ses duyamadım. Mikrofona biraz yaklaşıp tekrar dene.',
    'network': 'Ses tanıma için internet gerekiyor (tarayıcı sesi bir servise gönderir). İnternet yoksa yazıyla devam et.',
    'language-not-supported': 'Bu tarayıcı Türkçe ses tanımayı desteklemiyor.',
    'bad-grammar': 'Ses tanıma ayarı hatalı.',
    'aborted': ''
  };

  function Taniyici() { return kok.SpeechRecognition || kok.webkitSpeechRecognition || null; }

  // Ses kullanılamıyorsa nedenini döndürür, kullanılabiliyorsa null.
  function engel() {
    if (!Taniyici()) return 'Bu tarayıcı sesle komutu desteklemiyor (Chrome ya da Edge dene). Yazıyla devam edebilirsin.';
    if (kok.isSecureContext === false)
      return 'Mikrofon sadece güvenli (https) sayfalarda çalışır. GitHub Pages adresi https olduğu için orada çalışır. Şimdilik yazıyla devam edebilirsin.';
    return null;
  }

  var aktif = null;

  /*
   * cb: { basladi(), sonuc(metin), hata(mesaj), bitti() }
   */
  function dinle(cb) {
    var e = engel();
    if (e) { cb.hata(e); cb.bitti && cb.bitti(); return; }
    if (aktif) { try { aktif.abort(); } catch (x) { /* yoksay */ } }
    var T = Taniyici(), r = new T();
    aktif = r;
    r.lang = 'tr-TR';
    r.interimResults = false;
    r.maxAlternatives = 1;
    var sonucAldi = false, basladiMi = false, bekci = null;
    function temizle() { if (bekci) { clearTimeout(bekci); bekci = null; } }
    r.onstart = function () { basladiMi = true; temizle(); cb.basladi && cb.basladi(); };
    r.onresult = function (ev) {
      var metin = ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : '';
      sonucAldi = true;
      if (metin) cb.sonuc(metin); else cb.hata('Ne söylediğini anlayamadım. Tekrar dene ya da yaz.');
    };
    r.onerror = function (ev) {
      var m = HATA_MESAJLARI.hasOwnProperty(ev.error) ? HATA_MESAJLARI[ev.error] : 'Ses tanıma hatası (' + ev.error + '). Yazıyla devam edebilirsin.';
      if (m) cb.hata(m);
      sonucAldi = true;
    };
    r.onend = function () {
      temizle();
      aktif = null;
      if (!sonucAldi) cb.hata('Ses duyamadım. Tekrar dene ya da yaz.');
      cb.bitti && cb.bitti();
    };
    // Bazı ortamlarda izin penceresi cevaplanmaz ya da hiç olay gelmez: sessiz kalma, nedenini söyle.
    bekci = setTimeout(function () {
      if (basladiMi) return;
      sonucAldi = true;
      try { r.abort(); } catch (x) { /* yoksay */ }
      aktif = null;
      cb.hata('Mikrofon açılmadı. Tarayıcı izin sorduysa "İzin ver" de, ya da mikrofon ayarlarını kontrol et. Şimdilik yazıyla devam edebilirsin.');
      cb.bitti && cb.bitti();
    }, 6000);
    try { r.start(); }
    catch (x) { temizle(); aktif = null; cb.hata('Mikrofon başlatılamadı: ' + x.message); cb.bitti && cb.bitti(); }
  }

  function durdur() { if (aktif) { try { aktif.abort(); } catch (x) { /* yoksay */ } } }

  var API = { engel: engel, dinle: dinle, durdur: durdur, HATA_MESAJLARI: HATA_MESAJLARI };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else kok.Ses = API;
})(typeof window !== 'undefined' ? window : globalThis);
