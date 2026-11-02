/*
 * komut_testi.js — Türkçe komut anlama testi.
 * Çalıştırma:  node tests/komut_testi.js
 * Her satır: [cümle, beklenen görevler]. Beklenenin yazılan alanları tutmalı
 * (yazılmayan alanlar kontrol edilmez). Bazı satırlar "anlaşılmamalı" ya da "dur" bekler.
 */
var Anlayici = require('../js/anlayici.js');

var TESTLER = [
  // --- Eşya getirme ---
  ['mutfaktan su getir',                      [{ tur: 'getir', esya: 'su', kaynakOda: 'mutfak', hedefOda: null }]],
  ['şişeyi açıp getir',                       [{ tur: 'getir', esya: 'su', kapakAc: true }]],
  ['Lütfen bana su şişesini getirir misin?',  [{ tur: 'getir', esya: 'su', kapakAc: false }]],
  ['bana kumandayı getir',                    [{ tur: 'getir', esya: 'kumanda' }]],
  ['ilaç kutusunu getirir misin',             [{ tur: 'getir', esya: 'ilac' }]],
  ['ilacı yatak odasından getir',             [{ tur: 'getir', esya: 'ilac', kaynakOda: 'yatak' }]],
  ['havluyu banyodan getir',                  [{ tur: 'getir', esya: 'havlu', kaynakOda: 'banyo' }]],
  ['salona su getir',                         [{ tur: 'getir', esya: 'su', hedefOda: 'salon' }]],
  ['kumandayı salondan getir ve tv yi aç',    [{ tur: 'getir', esya: 'kumanda', kaynakOda: 'salon' }, { tur: 'tv', acik: true }]],
  ['bana su ver',                             [{ tur: 'getir', esya: 'su' }]],
  ['havlu',                                   [{ tur: 'getir', esya: 'havlu' }]],
  ['şişenin kapağını açıp getirir misin',     [{ tur: 'getir', esya: 'su', kapakAc: true }]],
  // --- Kapak açma ---
  ['kapağı aç',                               [{ tur: 'kapakAc', esya: 'su' }]],
  ['su şişesinin kapağını açar mısın',        [{ tur: 'kapakAc', esya: 'su' }]],
  ['şişeyi aç',                               [{ tur: 'kapakAc', esya: 'su' }]],
  // --- Işık ---
  ['ışığı kapatır mısın',                     [{ tur: 'isik', oda: 'kullanici', acik: false }]],
  ['IŞIĞI KAPAT',                             [{ tur: 'isik', oda: 'kullanici', acik: false }]],
  ['ışığı aç',                                [{ tur: 'isik', oda: 'kullanici', acik: true }]],
  ['salonun ışığını yak',                     [{ tur: 'isik', oda: 'salon', acik: true }]],
  ['mutfağın ışığını söndür',                 [{ tur: 'isik', oda: 'mutfak', acik: false }]],
  ['yatak odasındaki ışığı kapat',            [{ tur: 'isik', oda: 'yatak', acik: false }]],
  ['tüm ışıkları kapat',                      [{ tur: 'isik', oda: 'hepsi', acik: false }]],
  ['banyonun lambasını aç',                   [{ tur: 'isik', oda: 'banyo', acik: true }]],
  // --- TV ---
  ['tv yi aç',                                [{ tur: 'tv', acik: true }]],
  ["TV'yi kapat",                             [{ tur: 'tv', acik: false }]],
  ['televizyonu açar mısın',                  [{ tur: 'tv', acik: true }]],
  ['televizyonu kapat',                       [{ tur: 'tv', acik: false }]],
  // --- Kapı ---
  ['kapıyı kapat',                            [{ tur: 'kapiKapat', oda: null }]],
  ['kapıyı kapatır mısın',                    [{ tur: 'kapiKapat' }]],
  ['banyo kapısını aç',                       [{ tur: 'kapiAc', oda: 'banyo' }]],
  ['yatak odasının kapısını kapat',           [{ tur: 'kapiKapat', oda: 'yatak' }]],
  ['kapıyı aç',                               [{ tur: 'kapiAc' }]],
  // --- Yeni görevler ---
  ['tekerlekli sandalyeyi getir',             [{ tur: 'getir', esya: 'sandalye' }]],
  ['sandalyeyi getirir misin',                [{ tur: 'getir', esya: 'sandalye' }]],
  ['tekerlekli sandalyeyi salona getir',      [{ tur: 'getir', esya: 'sandalye', hedefOda: 'salon' }]],
  ['beni salona götür',                       [{ tur: 'gotur', hedefOda: 'salon' }]],
  ['beni yatak odasına götürür müsün',        [{ tur: 'gotur', hedefOda: 'yatak' }]],
  ['beni mutfağa götür',                      [{ tur: 'gotur', hedefOda: 'mutfak' }]],
  ['beni küvete götür',                       [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'kuvet' } }]],
  ['beni duşa götür',                         [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'kuvet' } }]],
  ['beni kanepeye götür',                     [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'kanepe' } }]],
  ['beni koltuğa götür',                      [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'kanepe' } }]],
  ['beni masaya götür',                       [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'masa' } }]],
  ['beni tuvalete götür',                     [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'klozet' } }]],
  ['beni lavaboya götür',                     [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'lavabo' } }]],
  ['beni televizyona götür',                  [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'tv' } }]],
  ['beni buzdolabına götür',                  [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'buzdolabi' } }]],
  ['beni kumandaya götür',                    [{ tur: 'gotur', hedefYer: { tip: 'esya', id: 'kumanda' } }]],
  ['beni havluluğa götür',                    [{ tur: 'gotur', hedefYer: { tip: 'aygit', id: 'havluluk' } }]],
  ['küvete git',                              [{ tur: 'git', yer: { tip: 'aygit', id: 'kuvet' } }]],
  ['kumandaya git',                           [{ tur: 'git', yer: { tip: 'esya', id: 'kumanda' } }]],
  ['mutfaktaki masaya git',                   [{ tur: 'git', yer: { tip: 'aygit', id: 'masa' } }]],
  ['su getir ve beni küvete götür',           [{ tur: 'getir', esya: 'su' }, { tur: 'gotur', hedefYer: { tip: 'aygit', id: 'kuvet' } }]],
  ['buzdolabını aç',                          [{ tur: 'buzdolabiAc' }]],
  ['buzdolabının kapısını aç',                [{ tur: 'buzdolabiAc' }]],
  ['buz dolabını açar mısın',                 [{ tur: 'buzdolabiAc' }]],
  // --- Git / gel ---
  ['mutfağa git',                             [{ tur: 'git', oda: 'mutfak' }]],
  ['banyoya gider misin',                     [{ tur: 'git', oda: 'banyo' }]],
  ['bana gel',                                [{ tur: 'yanimaGel' }]],
  // --- Birden fazla iş ---
  ['havluyu getir ve banyonun ışığını kapat', [{ tur: 'getir', esya: 'havlu' }, { tur: 'isik', oda: 'banyo', acik: false }]],
  ['havlu ve ilaç getir',                     [{ tur: 'getir', esya: 'havlu' }, { tur: 'getir', esya: 'ilac' }]],
  ['su getir, havlu getir',                   [{ tur: 'getir', esya: 'su' }, { tur: 'getir', esya: 'havlu' }]],
  ['tv yi aç sonra ışığı kapat',              [{ tur: 'tv', acik: true }, { tur: 'isik', acik: false }]],
  ['kapıyı açıp salona git',                  [{ tur: 'kapiAc' }, { tur: 'git', oda: 'salon' }]],
  ['mutfağa gidip su getir',                  [{ tur: 'git', oda: 'mutfak' }, { tur: 'getir', esya: 'su' }]],
  ['televizyonu kapat ve havluyu getir',      [{ tur: 'tv', acik: false }, { tur: 'getir', esya: 'havlu' }]],
  ['tv ve ışığı kapat',                       [{ tur: 'tv', acik: false }, { tur: 'isik', acik: false }]],
  // --- Eksik kalıplardan sonra eklenenler ---
  ['şişenin kapağını aç ve bana getir',       [{ tur: 'kapakAc' }, { tur: 'getir', esya: 'su', kapakAc: false }]],
  ['kumandayı getir tv yi aç',                [{ tur: 'getir', esya: 'kumanda' }, { tur: 'tv', acik: true }]],
  ['ışığı kapatır mısın tv yi aç',            [{ tur: 'isik', acik: false }, { tur: 'tv', acik: true }]],
  ['ışıkları söndür',                         [{ tur: 'isik', oda: 'hepsi', acik: false }]],
  ['salona gel',                              [{ tur: 'git', oda: 'salon' }]],
  ['kapıyı kapat lütfen',                     [{ tur: 'kapiKapat' }]],
  ['bana bir bardak su getirsene',            [{ tur: 'getir', esya: 'su' }]],
  ['ilaçlarımı getirir misin lütfen',         [{ tur: 'getir', esya: 'ilac' }]],
  ['salondaki ışığı kapatsana',               [{ tur: 'isik', oda: 'salon', acik: false }]],
  ['dolabı aç',                               [{ tur: 'buzdolabiAc' }]],
  ['havluyu getirip banyonun ışığını kapat',  [{ tur: 'getir', esya: 'havlu' }, { tur: 'isik', oda: 'banyo', acik: false }]]
];

// Anlaşılmaması (görev çıkmaması) gerekenler
var ANLASILMAMALI = [
  'bugün hava nasıl',
  'su getirme',
  'buzdolabını kapat',
  'beni götür',
  '',
  'asdf qwer'
];

// Acil durdurma sözcükleri
var DUR = ['dur', 'acil dur', 'durdur', 'iptal'];

var gecen = 0, kalan = [];

function uyusuyor(gercek, beklenen) {
  // İç içe nesneler (hedefYer, yer) de karşılaştırılsın
  return Object.keys(beklenen).every(function (k) { return JSON.stringify(gercek[k]) === JSON.stringify(beklenen[k]); });
}

TESTLER.forEach(function (t) {
  var sonuc = Anlayici.anla(t[0]);
  var ok = sonuc.gorevler.length === t[1].length &&
    t[1].every(function (b, i) { return uyusuyor(sonuc.gorevler[i], b); });
  if (ok) gecen++;
  else kalan.push('"' + t[0] + '"\n   beklenen: ' + JSON.stringify(t[1]) + '\n   bulunan : ' + JSON.stringify(sonuc.gorevler));
});

ANLASILMAMALI.forEach(function (m) {
  var s = Anlayici.anla(m);
  if (s.gorevler.length === 0 && s.mesaj) gecen++;
  else kalan.push('"' + m + '" anlaşılmamalıydı ama: ' + JSON.stringify(s));
});

DUR.forEach(function (m) {
  var s = Anlayici.anla(m);
  if (s.dur && s.gorevler.length === 0) gecen++;
  else kalan.push('"' + m + '" durdurma olmalıydı ama: ' + JSON.stringify(s));
});

var toplam = TESTLER.length + ANLASILMAMALI.length + DUR.length;
console.log('Komut anlama testi: ' + gecen + '/' + toplam + ' geçti (' + TESTLER.length + ' komut cümlesi)');
if (kalan.length) { console.log('\nBaşarısız:\n' + kalan.join('\n')); process.exit(1); }
