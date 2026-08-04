document.addEventListener('DOMContentLoaded', function () {
  var nav = document.getElementById('mainNav');
  var utilityBar = document.getElementById('utilityBar');
  var siteHeader = document.getElementById('siteHeader');

  function setHeaderHeightVar() {
    if (!siteHeader) return;
    var h = siteHeader.offsetHeight;
    if (h > 0) document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  setHeaderHeightVar();
  window.addEventListener('resize', setHeaderHeightVar);
  window.addEventListener('load', setHeaderHeightVar);

  window.addEventListener('scroll', function () {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    if (utilityBar) utilityBar.classList.toggle('hide', window.scrollY > 10);
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  document.querySelectorAll('.faq-q').forEach(function (q) {
    q.addEventListener('click', function () {
      var item = q.parentElement;
      document.querySelectorAll('.faq-item').forEach(function (i) { if (i !== item) i.classList.remove('open'); });
      item.classList.toggle('open');
    });
  });

  var slides = document.querySelectorAll('.testi-slide');
  var dots = document.querySelectorAll('.testi-dot');
  var testiIndex = 0;
  function showTesti(i) {
    slides.forEach(function (s, idx) { s.classList.toggle('active', idx === i); });
    dots.forEach(function (d, idx) { d.classList.toggle('active', idx === i); });
    testiIndex = i;
  }
  dots.forEach(function (d) { d.addEventListener('click', function () { showTesti(parseInt(d.dataset.i)); }); });
  if (slides.length > 1) {
    setInterval(function () { showTesti((testiIndex + 1) % slides.length); }, 6000);
  }

  var burger = document.querySelector('.nav-burger');
  var mobileMenu = document.querySelector('.mobile-menu');
  var mobileClose = document.querySelector('.mobile-menu-close');
  if (burger && mobileMenu) {
    burger.addEventListener('click', function () { document.body.classList.add('menu-open'); });
  }
  if (mobileClose) {
    mobileClose.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
  }
var galleryTabs = document.querySelectorAll('.gallery-tab');
  if (galleryTabs.length) {
    galleryTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.dataset.tab;
        galleryTabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        document.querySelectorAll('.gallery-panel').forEach(function (p) {
          p.classList.toggle('active', p.id === 'panel-' + target);
        });
      });
    });
  }

  document.querySelectorAll('.mobile-menu a').forEach(function (a) {
    a.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
  });
});
