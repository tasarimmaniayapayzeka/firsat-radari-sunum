/* Fırsat Radarı ana sayfa: saf JS, kütüphane yok.
   Kaydırma dinleyicisi yok; görünürlük IntersectionObserver ile.
   prefers-reduced-motion: reduce iken hiçbir hareket başlatılmaz. */
(function () {
  'use strict';

  var html = document.documentElement;
  var azalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hareket = !azalt;
  if (hareket) html.classList.add('hareket');

  var $ = function (s, k) { return (k || document).querySelector(s); };
  var $$ = function (s, k) { return Array.prototype.slice.call((k || document).querySelectorAll(s)); };

  /* ---------- Yardımcılar ---------- */

  // Başlıktaki kelimeleri maskeli kutulara sarar (metin ve <em> gibi öğe çocukları korunur).
  function kelimeSar(el) {
    if (!el || el.classList.contains('hazir')) return 0;
    var parca = document.createDocumentFragment();
    var sayi = 0;
    var sar = function (icerik) {
      var dis = document.createElement('span');
      dis.className = 'kelime';
      var ic = document.createElement('span');
      ic.style.setProperty('--i', sayi++);
      if (typeof icerik === 'string') ic.textContent = icerik; else ic.appendChild(icerik);
      dis.appendChild(ic);
      return dis;
    };
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (t) {
          if (!t) return;
          if (/^\s+$/.test(t)) parca.appendChild(document.createTextNode(' '));
          else parca.appendChild(sar(t));
        });
      } else if (n.nodeType === 1) {
        parca.appendChild(sar(n));
      }
    });
    el.textContent = '';
    el.appendChild(parca);
    el.classList.add('hazir');
    return sayi;
  }

  // Fiyat biçimi: 4299 -> "4.299,00 TL"
  function fiyatBicim(n) {
    var s;
    try { s = n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    catch (e) { s = n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
    return s + ' TL';
  }

  // Sayaç: 0'dan hedefe 900 ms, easeOut. Genişlik ch ile sabitlenir, düzen zıplamaz.
  function sayac(el) {
    if (!el || el.dataset.sayildi) return;
    el.dataset.sayildi = '1';
    var hedef = parseFloat(el.dataset.fiyat);
    if (!isFinite(hedef)) return;
    var son = fiyatBicim(hedef);
    el.style.display = 'inline-block';
    el.style.minWidth = son.length + 'ch';
    if (!hareket) { el.textContent = son; return; }
    var sure = 900, t0 = null;
    el.textContent = fiyatBicim(0);
    var adim = function (t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / sure);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? fiyatBicim(hedef * e) : son;
      if (p < 1) requestAnimationFrame(adim);
    };
    requestAnimationFrame(adim);
  }

  var IO = 'IntersectionObserver' in window;
  var inceIsaretci = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Üst çubuk ---------- */

  var ust = $('.ust');
  var menuDugme = $('.ust__menu');
  var aciklama = $('.aciklama');

  function menuKapat() {
    if (!ust || !menuDugme) return;
    ust.classList.remove('ust--acik');
    menuDugme.setAttribute('aria-expanded', 'false');
    menuDugme.querySelector('i').className = 'ph ph-list';
    menuDugme.querySelector('.gizli').textContent = 'Menüyü aç';
  }
  if (menuDugme) {
    menuDugme.addEventListener('click', function () {
      var acik = ust.classList.toggle('ust--acik');
      menuDugme.setAttribute('aria-expanded', acik ? 'true' : 'false');
      menuDugme.querySelector('i').className = acik ? 'ph ph-x' : 'ph ph-list';
      menuDugme.querySelector('.gizli').textContent = acik ? 'Menüyü kapat' : 'Menüyü aç';
    });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', menuKapat); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') menuKapat(); });
    var genis = window.matchMedia('(min-width: 960px)');
    if (genis.addEventListener) genis.addEventListener('change', menuKapat);
  }

  // Affiliate satırı üst çubuğun altından çıkınca çubuk küçülür (IntersectionObserver, scroll dinleyicisi yok).
  if (IO && ust && aciklama) {
    new IntersectionObserver(function (girdiler) {
      ust.classList.toggle('ust--kucuk', !girdiler[0].isIntersecting);
    }, { rootMargin: '-64px 0px 0px 0px', threshold: 0 }).observe(aciklama);
  }

  /* ---------- Hero ---------- */

  var hero = $('.hero');
  var video = $('.hero__video');

  // Video: dosya yoksa ya da hareket azaltılmışsa kaldırılır, jpg (ya da nötr kutu) kalır.
  if (video) {
    var kaldir = function () { if (video.parentNode) video.parentNode.removeChild(video); };
    if (!hareket) { kaldir(); }
    else {
      var kaynak = video.querySelector('source');
      if (kaynak) kaynak.addEventListener('error', kaldir);
      video.addEventListener('error', kaldir);
      video.addEventListener('canplay', function () { video.play().catch(function () {}); });
    }
  }

  if (hero) {
    var h1 = $('h1', hero);
    var yuzenler = $$('.yuzen', hero);
    var hkartlar = $$('.hkart', hero);
    var kartAlani = $('.hero__kartlar', hero);

    if (hareket) {
      kelimeSar(h1);
      requestAnimationFrame(function () { requestAnimationFrame(function () { hero.classList.add('goster'); }); });
    }

    // Fiyat sayaçları (yüklemede)
    setTimeout(function () { $$('.hkart__fiyat strong[data-fiyat]', hero).forEach(sayac); }, hareket ? 700 : 0);

    // Kartlar sırayla öne gelir (4 sn); kart alanı hover/odak ya da sekme gizliyken durur.
    if (hareket && hkartlar.length > 1) {
      var aktif = 0;
      setInterval(function () {
        if (document.hidden) return;
        if (kartAlani && (kartAlani.matches(':hover') || kartAlani.matches(':focus-within'))) return;
        aktif = (aktif + 1) % hkartlar.length;
        hkartlar.forEach(function (k, i) {
          k.classList.toggle('hkart--aktif', i === aktif);
          var sarici = k.closest('.yuzen');
          if (sarici) sarici.classList.toggle('yuzen--aktif', i === aktif);
        });
      }, 4000);
    }

    // Fare parallax'ı: yalnız ince işaretçi ve geniş ekran; transform, rAF.
    var ince = window.matchMedia('(pointer: fine)').matches;
    if (hareket && ince && yuzenler.length) {
      var px = 0, py = 0, raf = 0;
      var uygula = function () {
        raf = 0;
        if (window.innerWidth < 1024) { yuzenler.forEach(function (y) { y.style.transform = ''; }); return; }
        yuzenler.forEach(function (y) {
          var d = parseFloat(y.dataset.derinlik) || 0;
          y.style.transform = 'translate3d(' + (px * d).toFixed(1) + 'px,' + (py * d).toFixed(1) + 'px,0)';
        });
      };
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        px = ((e.clientX - r.left) / r.width) * 2 - 1;
        py = ((e.clientY - r.top) / r.height) * 2 - 1;
        if (!raf) raf = requestAnimationFrame(uygula);
      });
      hero.addEventListener('pointerleave', function () {
        px = 0; py = 0;
        if (!raf) raf = requestAnimationFrame(uygula);
      });
    }
  }

  /* ---------- Mağaza bandı: kesintisiz döngü ----------
     Liste ekran genişliğini aşana kadar kendi öğeleriyle çoğaltılır, sonra bütün liste bir kez kopyalanır;
     CSS -%50 kaydırır. Kopyalar ekran okuyucuya gizli ve klavyeyle odaklanmaz. Hız px/sn sabit. */

  function bantKopya(dugum) {
    var k = dugum.cloneNode(true);
    k.setAttribute('aria-hidden', 'true');
    if (k.matches('a, button')) k.setAttribute('tabindex', '-1');
    $$('a, button', k).forEach(function (a) { a.setAttribute('tabindex', '-1'); });
    $$('img', k).forEach(function (i) { i.setAttribute('alt', ''); });
    return k;
  }

  if (hareket) {
    $$('.mbant__sira').forEach(function (sira) {
      var liste = $('.mbant__liste', sira);
      if (!liste) return;
      var ogeler = Array.prototype.slice.call(liste.children);
      var hedef = Math.max(window.innerWidth, (window.screen && window.screen.width) || 0, 1280) + 240;
      var tur = 0;
      while (liste.getBoundingClientRect().width < hedef && tur++ < 8) {
        ogeler.forEach(function (o) { liste.appendChild(bantKopya(o)); });
      }
      var ikinci = bantKopya(liste);
      ikinci.removeAttribute('aria-label');
      sira.appendChild(ikinci);
      var hiz = parseFloat(sira.dataset.hiz) || 32;
      sira.style.setProperty('--sure', (liste.getBoundingClientRect().width / hiz).toFixed(1) + 's');
      sira.classList.add('mbant__sira--akar');
    });
  }

  /* ---------- Bölüm başlıkları: kelime kelime ---------- */

  var basliklar = $$('h2[data-kelime]');
  if (hareket && IO && basliklar.length) {
    basliklar.forEach(kelimeSar);
    var basGoz = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) {
        if (g.isIntersecting) { g.target.classList.add('goster'); basGoz.unobserve(g.target); }
      });
    }, { threshold: 0.4 });
    basliklar.forEach(function (b) { basGoz.observe(b); });
  }

  /* ---------- Bugün doğrulandı: kademeli giriş + sayaç + filtre ---------- */

  var kartlar = $$('.izgara .kart');
  var kartGoster = function (k, gecikme) {
    setTimeout(function () {
      k.classList.add('goruldu');
      $$('strong[data-fiyat]', k).forEach(sayac);
    }, gecikme);
  };
  if (kartlar.length) {
    if (hareket && IO) {
      var kartGoz = new IntersectionObserver(function (girdiler) {
        girdiler.forEach(function (g) {
          if (!g.isIntersecting) return;
          kartGoz.unobserve(g.target);
          var gorunur = kartlar.filter(function (k) { return !k.hidden; });
          var sira = gorunur.indexOf(g.target);
          var sutun = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 720 ? 2 : 1);
          kartGoster(g.target, (Math.max(sira, 0) % sutun) * 80);
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
      kartlar.forEach(function (k) { kartGoz.observe(k); });
    } else {
      kartlar.forEach(function (k) { kartGoster(k, 0); });
    }
  }

  // Filtre çipleri: aria-pressed, kalan kartlar kısa bir girişle gelir, sonuç ekran okuyucuya bildirilir.
  var cipler = $$('.filtre__cip');
  var filtreDurum = $('#filtre-durum');
  cipler.forEach(function (cip) {
    cip.addEventListener('click', function () {
      var f = cip.dataset.filtre;
      cipler.forEach(function (c) { c.setAttribute('aria-pressed', c === cip ? 'true' : 'false'); });
      var sayi = 0;
      kartlar.forEach(function (k) {
        var uygun = f === 'hepsi' || k.dataset.kategori === f;
        k.classList.remove('kart--gir');
        k.hidden = !uygun;
        if (uygun) {
          k.style.setProperty('--s', sayi++);
          k.classList.add('goruldu');
          $$('strong[data-fiyat]', k).forEach(sayac);
        }
      });
      void document.body.offsetWidth; // animasyonu yeniden başlatmak için
      kartlar.forEach(function (k) { if (!k.hidden) k.classList.add('kart--gir'); });
      if (filtreDurum) filtreDurum.textContent = sayi + ' fırsat gösteriliyor.';
    });
  });

  /* ---------- Kategoriler: kademeli giriş + 3D eğim ---------- */

  var bento = $('.bento');
  var karolar = $$('.karo');
  if (bento && karolar.length) {
    if (hareket && IO) {
      var bentoGoz = new IntersectionObserver(function (girdiler) {
        if (!girdiler[0].isIntersecting) return;
        karolar.forEach(function (k) { k.classList.add('goruldu'); });
        bentoGoz.disconnect();
      }, { threshold: 0.12 });
      bentoGoz.observe(bento);
    } else {
      karolar.forEach(function (k) { k.classList.add('goruldu'); });
    }

    // Fare konumuna göre ±6° eğim; yalnız ince işaretçi ve ≥ 1024 px; rAF ile, transform değişkenleri.
    if (hareket && inceIsaretci) {
      var egimHedef = null, ex = 0, ey = 0, egimRaf = 0;
      var egimUygula = function () {
        egimRaf = 0;
        if (!egimHedef) return;
        if (window.innerWidth < 1024) { egimHedef.style.removeProperty('--rx'); egimHedef.style.removeProperty('--ry'); return; }
        egimHedef.style.setProperty('--rx', (-ey * 6).toFixed(2) + 'deg');
        egimHedef.style.setProperty('--ry', (ex * 6).toFixed(2) + 'deg');
      };
      karolar.forEach(function (karo) {
        var bag = $('.karo__bag', karo);
        if (!bag) return;
        karo.addEventListener('pointermove', function (e) {
          var r = karo.getBoundingClientRect(); // eğilmeyen dış kutu: ölçüm sabit kalır
          ex = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
          ey = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
          egimHedef = bag;
          if (!egimRaf) egimRaf = requestAnimationFrame(egimUygula);
        });
        karo.addEventListener('pointerleave', function () {
          if (egimHedef === bag) egimHedef = null;
          bag.style.removeProperty('--rx');
          bag.style.removeProperty('--ry');
        });
      });
    }
  }

  /* ---------- Nasıl doğruluyoruz: aktif adım, sahne ve ilerleme hattı ---------- */

  var adimlar = $$('.adim');
  var sahneGorseller = $$('.sahne__gorsel');
  var sahneEtiket = $('.sahne__etiket');
  var dugumler = $$('.ilerleme__dugum');
  var ilerleme = $('.ilerleme');
  var etiketler = ['Buluyoruz', 'Doğruluyoruz', 'Paylaşıyoruz'];
  var ikonlar = ['ph-magnifying-glass', 'ph-seal-check', 'ph-share-network'];
  var aktifAdim = 0;
  var etiketZamani = 0;

  function etiketYaz(n) {
    if (!sahneEtiket) return;
    var ikon = $('i', sahneEtiket), yazi = $('span', sahneEtiket);
    if (ikon) ikon.className = 'ph ' + ikonlar[n];
    if (yazi) yazi.textContent = etiketler[n];
  }

  function adimSec(n) {
    if (n < 0 || n === aktifAdim) return;
    aktifAdim = n;
    adimlar.forEach(function (a, i) { a.classList.toggle('adim--aktif', i === n); });
    sahneGorseller.forEach(function (g, i) { g.classList.toggle('sahne__gorsel--aktif', i === n); });
    dugumler.forEach(function (d, i) {
      d.classList.toggle('ilerleme__dugum--gecti', i <= n);
      d.classList.toggle('ilerleme__dugum--aktif', i === n);
      if (i === n) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
    if (ilerleme && dugumler.length > 1) ilerleme.style.setProperty('--ilerleme', String(n / (dugumler.length - 1)));
    if (sahneEtiket) {
      if (!hareket) { etiketYaz(n); return; }
      sahneEtiket.classList.add('degisiyor');
      clearTimeout(etiketZamani);
      etiketZamani = setTimeout(function () {
        etiketYaz(aktifAdim);
        sahneEtiket.classList.remove('degisiyor');
      }, 240);
    }
  }

  if (IO && adimlar.length) {
    var adimGoz = new IntersectionObserver(function (girdiler) {
      girdiler.forEach(function (g) {
        if (g.isIntersecting) adimSec(adimlar.indexOf(g.target));
      });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    adimlar.forEach(function (a) { adimGoz.observe(a); });
  }
  dugumler.forEach(function (d, i) {
    d.addEventListener('click', function () {
      if (!adimlar[i]) return;
      adimlar[i].scrollIntoView({ behavior: hareket ? 'smooth' : 'auto', block: 'center' });
      adimSec(i);
    });
  });

  // Yazdırmada her şey görünür olsun.
  window.addEventListener('beforeprint', function () {
    kartlar.forEach(function (k) { kartGoster(k, 0); });
    karolar.forEach(function (k) { k.classList.add('goruldu'); });
    $$('h2[data-kelime], .hero').forEach(function (b) { b.classList.add('goster'); });
  });

  /* ---------- Bülten formu (bağlı değil; satır içi doğrulama) ---------- */

  var form = $('.bulten');
  if (form) {
    var eposta = $('#eposta', form);
    var riza = $('#riza', form);
    var mesaj = $('.bulten__mesaj', form);
    var yaz = function (metin, tur) {
      mesaj.textContent = metin;
      mesaj.className = 'bulten__mesaj' + (tur ? ' bulten__mesaj--' + tur : '');
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!eposta.value || !eposta.validity.valid) { yaz('Geçerli bir e-posta adresi yazın.', 'hata'); eposta.focus(); return; }
      if (!riza.checked) { yaz('Kaydolmak için onay kutusunu işaretleyin.', 'hata'); riza.focus(); return; }
      yaz('Teşekkürler. Onay bağlantısı e-postanıza gönderilecek.', 'tamam');
      form.reset();
    });
    eposta.addEventListener('input', function () { if (mesaj.textContent) yaz('', ''); });
    riza.addEventListener('change', function () { if (mesaj.textContent) yaz('', ''); });
  }
})();
