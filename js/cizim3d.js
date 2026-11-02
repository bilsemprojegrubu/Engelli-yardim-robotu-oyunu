/*
 * cizim3d.js — Evi Three.js ile gerçek 3 boyutlu çizer. Oyun mantığı yok, sadece görüntü.
 * Dünya koordinatları: x → sağ, y → aşağı (kuş bakışı). 3D'de: X = x, Z = y, Y = yükseklik (1 birim = 1 hücre).
 * Fare/parmakla döndür, tekerlek/iki parmakla yakınlaştır. Boş bir zemine tıklayınca kullanıcı oraya geçer.
 */
(function (kok) {
  'use strict';
  var THREE = kok.THREE;

  var ZEMIN = { salon: 0xf3e6d0, mutfak: 0xeef3df, yatak: 0xece3f2, banyo: 0xdfeef5 };
  var YUKSEKLIK = { kanepe: 0.8, sehpa: 0.4, tv: 0.9, tezgah: 0.9, buzdolabi: 1.8, masa: 0.75, yatak: 0.55,
    komodin: 0.5, lavabo: 0.85, klozet: 0.45, kuvet: 0.6, havluluk: 1.1 };
  var DUVAR_Y = 0.9;   // alçak duvar: içerisi yukarıdan görünsün

  function destekliMi() {
    if (!THREE) return false;
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }

  function kutu(w, h, d, renk, x, y, z) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: renk }));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function mobilyaYuksekligi(d, x, y) {
    for (var i = 0; i < d.mobilyalar.length; i++) {
      var m = d.mobilyalar[i];
      if (x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) return YUKSEKLIK[m.id] || 0.6;
    }
    return 0;
  }

  function odaVarMi(d, x, y) {
    return Object.keys(d.odalar).some(function (id) {
      var o = d.odalar[id];
      return x >= o.x0 && x <= o.x1 && y >= o.y0 && y <= o.y1;
    });
  }

  // Yaprak çubuk (kapı kanadı): menteşeden (hx,hz) yöne (dx,dz) uzanır.
  function kanatKoy(mesh, hx, hz, dx, dz, uzunluk, yy) {
    mesh.position.set(hx + dx * uzunluk / 2, yy, hz + dz * uzunluk / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
  }

  function robotYap() {
    var g = new THREE.Group();
    var govde = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.62, 24), new THREE.MeshLambertMaterial({ color: 0xff9f1c }));
    govde.position.y = 0.4; govde.castShadow = true; g.add(govde);
    var teker = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 24), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    teker.position.y = 0.08; teker.castShadow = true; g.add(teker);
    var bas = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 16), new THREE.MeshLambertMaterial({ color: 0xffb84d }));
    bas.position.y = 0.88; bas.castShadow = true; g.add(bas);
    var gozMat = new THREE.MeshBasicMaterial({ color: 0x1b1b1b });
    [-0.09, 0.09].forEach(function (z) {
      var goz = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), gozMat);
      goz.position.set(0.19, 0.92, z); g.add(goz);
    });
    var anten = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 6), new THREE.MeshLambertMaterial({ color: 0x7a4a00 }));
    anten.position.set(0, 1.18, 0); g.add(anten);
    var uc = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
    uc.position.set(0, 1.29, 0); g.add(uc);
    var kol = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.07), new THREE.MeshLambertMaterial({ color: 0x7a4a00 }));
    kol.position.set(0.3, 0.55, 0); kol.castShadow = true; g.add(kol);
    g.userData.kol = kol;
    return g;
  }

  function kullaniciYap() {
    var g = new THREE.Group();
    var m = new THREE.MeshLambertMaterial({ color: 0x3a86ff });
    var govde = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.8, 20), m);
    govde.position.y = 0.45; govde.castShadow = true; g.add(govde);
    var bas = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), new THREE.MeshLambertMaterial({ color: 0xffd9b3 }));
    bas.position.y = 1.0; bas.castShadow = true; g.add(bas);
    return g;
  }

  function esyaYap(e) {
    var renk = new THREE.Color(e.renk);
    var mat = new THREE.MeshLambertMaterial({ color: renk });
    var g = new THREE.Group();
    var m;
    if (e.tur === 'sise') {
      m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 14), mat); m.position.y = 0.15;
      var kapak = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      kapak.position.y = 0.33; g.add(kapak); g.userData.kapak = kapak;
    } else if (e.tur === 'buyuk') {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.45), mat); m.position.y = 0.3;
      [-0.28, 0.28].forEach(function (z) {
        var t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 18), new THREE.MeshLambertMaterial({ color: 0x222222 }));
        t.rotation.x = Math.PI / 2; t.position.set(0, 0.2, z); t.castShadow = true; g.add(t);
      });
    } else if (e.id === 'ilac') {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.16), mat); m.position.y = 0.05;
    } else if (e.id === 'havlu') {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.26), mat); m.position.y = 0.05;
    } else {
      m = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.09), mat); m.position.y = 0.025;
    }
    m.castShadow = true; g.add(m);
    return g;
  }

  function baslat(kapsayici, dunyaFn, secenekFn, hucreTiklandi) {
    if (!destekliMi()) return null;
    var d0 = dunyaFn();
    var GEN = d0.genislik, YUK = d0.yukseklik;

    var canvas = document.createElement('canvas');
    canvas.id = 'sahne3d';
    canvas.setAttribute('aria-label', '3 boyutlu ev: robot turuncu, sen mavi. Döndürmek için sürükle, yakınlaştırmak için tekerleği kullan.');
    kapsayici.appendChild(canvas);

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    } catch (e) { kapsayici.removeChild(canvas); return null; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var sahne = new THREE.Scene();
    sahne.background = new THREE.Color(0x9fb4c7);
    var kamera = new THREE.PerspectiveCamera(45, GEN / YUK, 0.1, 200);
    kamera.position.set(GEN / 2, 15, YUK + 7);

    var kontrol = null;
    if (THREE.OrbitControls) {
      kontrol = new THREE.OrbitControls(kamera, canvas);
      kontrol.target.set(GEN / 2, 0, YUK / 2);
      kontrol.enableDamping = true; kontrol.dampingFactor = 0.12;
      kontrol.minDistance = 4; kontrol.maxDistance = 40;
      kontrol.maxPolarAngle = Math.PI / 2 - 0.05;
      kontrol.enablePan = false;
      kontrol.update();
    }

    // Işıklar
    var ortam = new THREE.HemisphereLight(0xffffff, 0x778899, 0.4); sahne.add(ortam);
    var gunes = new THREE.DirectionalLight(0xffffff, 0.35);
    gunes.position.set(GEN * 0.3, 20, YUK * 0.2);
    gunes.target.position.set(GEN / 2, 0, YUK / 2);
    gunes.castShadow = true;
    gunes.shadow.mapSize.set(2048, 2048);
    var sk = gunes.shadow.camera; sk.left = -14; sk.right = 14; sk.top = 14; sk.bottom = -14; sk.near = 1; sk.far = 60;
    sahne.add(gunes); sahne.add(gunes.target);

    // Zemin, duvarlar
    var odaIsik = {};
    var odaZemin = {};
    Object.keys(d0.odalar).forEach(function (id) {
      var o = d0.odalar[id];
      var w = o.x1 - o.x0 + 1, h = o.y1 - o.y0 + 1;
      var z = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ color: ZEMIN[id] }));
      z.rotation.x = -Math.PI / 2; z.position.set(o.x0 + w / 2, 0, o.y0 + h / 2); z.receiveShadow = true;
      sahne.add(z); odaZemin[id] = z;
      var l = new THREE.PointLight(0xfff1cc, 0.45, 11, 1.6);
      l.position.set(o.x0 + w / 2, 2.2, o.y0 + h / 2);
      sahne.add(l); odaIsik[id] = l;
      var lamba = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
      lamba.position.copy(l.position); lamba.position.y = 2.2; sahne.add(lamba); odaIsik[id].userData.lamba = lamba;
    });
    var disZemin = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: 0x7d8da0 }));
    disZemin.rotation.x = -Math.PI / 2; disZemin.position.set(GEN / 2, -0.02, YUK / 2); disZemin.receiveShadow = true;
    sahne.add(disZemin);

    var kapiHucre = {};
    d0.kapilar.forEach(function (k) { kapiHucre[k.x + ',' + k.y] = true; });
    for (var y = 0; y < YUK; y++) {
      for (var x = 0; x < GEN; x++) {
        if (odaVarMi(d0, x, y)) continue;
        if (kapiHucre[x + ',' + y]) {
                    sahne.add(kutu(1, 0.02, 1, 0xd8c7a3, x + 0.5, 0.01, y + 0.5));                          // eşik
        } else {
          sahne.add(kutu(1, DUVAR_Y, 1, 0x5a6070, x + 0.5, DUVAR_Y / 2, y + 0.5));
        }
      }
    }

    // Mobilyalar
    var tvEkran = null;
    d0.mobilyalar.forEach(function (m) {
      var yy = YUKSEKLIK[m.id] || 0.6;
      sahne.add(kutu(m.w - 0.08, yy, m.h - 0.08, new THREE.Color(m.renk), m.x + m.w / 2, yy / 2, m.y + m.h / 2));
      if (m.id === 'tv') {
        tvEkran = new THREE.Mesh(new THREE.PlaneGeometry(m.w - 0.3, m.h - 0.3), new THREE.MeshBasicMaterial({ color: 0x11131a }));
        tvEkran.rotation.x = -Math.PI / 2; tvEkran.position.set(m.x + m.w / 2, yy + 0.01, m.y + m.h / 2);
        sahne.add(tvEkran);
      }
      if (m.id === 'yatak') {
        sahne.add(kutu(m.w - 0.5, 0.1, 0.5, 0xffffff, m.x + m.w / 2, yy + 0.05, m.y + 0.45));    // yastık
      }
      if (m.id === 'kuvet') {
        sahne.add(kutu(m.w - 0.4, 0.04, m.h - 0.4, 0x9fd3ea, m.x + m.w / 2, yy + 0.02, m.y + m.h / 2)); // su
      }
    });

    // Kapılar
    var kapiMesh = d0.kapilar.map(function (k) {
      var m = kutu(1, 0.8, 0.1, 0x8b5a2b, 0, 0.4, 0); sahne.add(m); return m;
    });
    // Buzdolabı kapısı
    var dolapKapi = kutu(1, 1.7, 0.1, 0xeef2f5, 0, 0.9, 0); sahne.add(dolapKapi);
    var dolapTutac = kutu(0.06, 0.4, 0.06, 0x555555, 0, 1.0, 0); sahne.add(dolapTutac);

    // Işık anahtarları
    var anahtarMesh = {};
    Object.keys(d0.odalar).forEach(function (id) {
      var a = d0.odalar[id].anahtar;
      var ax = a.x + 0.5, az = a.y + 0.5;
      if (a.yon === 'd') ax = a.x + 0.97; else if (a.yon === 'b') ax = a.x + 0.03; else az = a.y + 0.03;
      var mm = kutu(a.yon === 'k' ? 0.14 : 0.06, 0.22, a.yon === 'k' ? 0.06 : 0.14, 0x999999, ax, 1.1, az);
      sahne.add(mm); anahtarMesh[id] = mm;
    });

    // Eşyalar, robot, kullanıcı
    var esyaMesh = {};
    Object.keys(d0.esyalar).forEach(function (id) {
      esyaMesh[id] = esyaYap(d0.esyalar[id]); sahne.add(esyaMesh[id]);
    });
    var robot = robotYap(); sahne.add(robot);
    var kullanici = kullaniciYap(); sahne.add(kullanici);

    // Tıklama → hücre (sürükleme sayılmaz)
    var zeminDuzlemi = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var isin = new THREE.Raycaster();
    var basX = 0, basY = 0;
    canvas.addEventListener('pointerdown', function (ev) { basX = ev.clientX; basY = ev.clientY; });
    canvas.addEventListener('pointerup', function (ev) {
      if (Math.abs(ev.clientX - basX) + Math.abs(ev.clientY - basY) > 6) return;
      var r = canvas.getBoundingClientRect();
      var ndc = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      isin.setFromCamera(ndc, kamera);
      var nokta = new THREE.Vector3();
      if (isin.ray.intersectPlane(zeminDuzlemi, nokta)) hucreTiklandi(Math.floor(nokta.x), Math.floor(nokta.z));
    });

    var sonGen = 0, sonYuk = 0;
    function boyutla() {
      var w = kapsayici.clientWidth;
      if (!w) return false;
      var h = Math.round(w * YUK / GEN);
      if (w !== sonGen || h !== sonYuk) {
        sonGen = w; sonYuk = h;
        renderer.setSize(w, h, false);
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        kamera.aspect = w / h; kamera.updateProjectionMatrix();
      }
      return true;
    }

    function kare() {
      window.requestAnimationFrame(kare);
      if (canvas.offsetParent === null || !boyutla()) return;      // gizliyken çizme
      var d = dunyaFn(), sec = secenekFn();

      Object.keys(d.odalar).forEach(function (id) {
        var acik = d.odalar[id].isik;
        odaIsik[id].intensity = acik ? 0.45 : 0;
        odaIsik[id].userData.lamba.material.color.set(acik ? 0xffe08a : 0x555555);
        odaZemin[id].material.emissive.setHex(acik ? 0x000000 : 0x000000);
        anahtarMesh[id].material.color.set(acik ? 0xffd23f : 0x999999);
      });
      ortam.intensity = sec && sec.acilDurdu ? 0.6 : 0.4;
      sahne.background.set(sec && sec.acilDurdu ? 0xd98080 : 0x9fb4c7);
      canvas.style.outline = sec && sec.acilDurdu ? '4px solid #c40000' : 'none';
      canvas.style.outlineOffset = '-4px';

      if (tvEkran) tvEkran.material.color.set(d.aygitlar.tv.acik ? 0x8fd3ff : 0x11131a);

      d.kapilar.forEach(function (k, i) {
        var t = k.aci * Math.PI / 2, hx, hz, dx, dz;
        if (k.duvar === 'dikey') { hx = k.x + 0.5; hz = k.y; dx = Math.sin(t); dz = Math.cos(t); }
        else { hx = k.x; hz = k.y + 0.5; dx = Math.cos(t); dz = Math.sin(t); }
        kanatKoy(kapiMesh[i], hx, hz, dx, dz, 1, 0.4);
      });

      var f = d.aygitlar.buzdolabi, ft = f.aci * Math.PI / 180;
      var fdx = -Math.cos(ft), fdz = Math.sin(ft);
      kanatKoy(dolapKapi, f.mentese.x, f.mentese.y, fdx, fdz, f.kapiUzunlugu, 0.9);
      dolapKapi.scale.x = f.kapiUzunlugu;
      dolapTutac.position.set(f.mentese.x + fdx * f.tutacMesafesi, 1.0, f.mentese.y + fdz * f.tutacMesafesi);

      var u = d.kullanici; kullanici.position.set(u.x, 0, u.y);
      var r = d.robot; robot.position.set(r.x, 0, r.y); robot.rotation.y = -r.yon;
      robot.userData.kol.position.x = r.tuttugu ? 0.42 : 0.3;
      robot.userData.kol.scale.x = r.tuttugu ? 1.5 : 1;

      Object.keys(esyaMesh).forEach(function (id) {
        var e = d.esyalar[id], mesh = esyaMesh[id];
        if (e.tasinan) {
          mesh.position.set(r.x + Math.cos(r.yon) * 0.5, 0.6, r.y + Math.sin(r.yon) * 0.5);
        } else {
          mesh.position.set(e.x + 0.5, mobilyaYuksekligi(d, e.x, e.y), e.y + 0.5);
        }
        if (mesh.userData.kapak) mesh.userData.kapak.visible = !e.kapakAcik;
      });

      if (kontrol) kontrol.update();
      renderer.render(sahne, kamera);
    }
    kare();
    return { kamerayiSifirla: function () {
      kamera.position.set(GEN / 2, 15, YUK + 7);
      if (kontrol) { kontrol.target.set(GEN / 2, 0, YUK / 2); kontrol.update(); }
    } };
  }

  kok.Cizim3D = { baslat: baslat, destekliMi: destekliMi };
})(window);
