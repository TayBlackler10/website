/* M2 Training Club – site script (2026 redesign) */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  /* ---------- Campaign dates (NZ time) ----------
     The site switches offers automatically, so nobody has to remember on the day.
     Times are in UTC. NZDT is UTC+13, so 00:00 on 1 Oct NZ = 11:00 30 Sep UTC. */
  var CAMPAIGNS = {
    trialSwitch: '2026-09-30T01:45:00Z',        // 5 Days for $5 live from 30 Sep 2026 (went early)
    openWeekBannerFrom: '2026-10-04T11:00:00Z', // show Birthday Open Week banner from 5 Oct
    openWeekBannerUntil: '2026-10-18T11:00:00Z' // hide after 18 Oct (end of Open Week)
  };
  var TRIAL = {
    before: { href: 'https://m2club.co.nz/join.html?m=844624', label: 'Try 5 days for $5' },
    after:  { href: 'https://m2club.co.nz/join.html?m=844624', label: 'Try 5 days for $5' }
  };

  // Allow testing a date: add ?m2date=2026-10-12 to any URL
  var now = new Date();
  try {
    var q = new URLSearchParams(location.search).get('m2date');
    if (q) now = new Date(q + 'T12:00:00+13:00');
  } catch (e) {}
  function after(iso) { return now >= new Date(iso); }

  function applyCampaigns() {
    var trialAfter = after(CAMPAIGNS.trialSwitch);
    var t = trialAfter ? TRIAL.after : TRIAL.before;
    document.querySelectorAll('[data-trial]').forEach(function (a) {
      a.setAttribute('href', t.href);
      if (a.hasAttribute('data-trial-label')) a.textContent = t.label;
    });
    // Generic date windows: data-from / data-until (ISO UTC)
    document.querySelectorAll('[data-from],[data-until]').forEach(function (el) {
      var from = el.getAttribute('data-from');
      var until = el.getAttribute('data-until');
      var show = (!from || after(from)) && (!until || !after(until));
      if (show) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    });
  }

  /* ---------- Tracking ----------
     Every trial, join, free PT, call, email and directions click is sent to
     GA4 (as its own event) and to the Meta pixel (as a standard event). */
  function classify(a) {
    var explicit = a.getAttribute('data-track');
    if (explicit) return explicit;
    var href = a.getAttribute('href') || '';
    if (a.hasAttribute('data-trial')) return 'trial_click';
    if (href.indexOf('join.html') !== -1) return /[?&]m=(trial|844624)\b/.test(href) ? 'trial_click' : 'join_click';
    if (href.indexOf('gymmasteronline.com/portal/membership/') !== -1) {
      if (href.indexOf(TRIAL.before.href.split('/').pop()) !== -1 || href.indexOf(TRIAL.after.href.split('/').pop()) !== -1) return 'trial_click';
      return 'join_click';
    }
    if (href.indexOf('free-pt') !== -1) return 'free_pt_click';
    if (href.indexOf('tel:') === 0) return 'phone_click';
    if (href.indexOf('mailto:') === 0) return 'email_click';
    if (href.indexOf('maps.google') !== -1 || href.indexOf('google.com/maps') !== -1) return 'directions_click';
    return '';
  }
  function locationOf(a) {
    var own = a.getAttribute('data-loc');
    if (own) return own;
    var sec = a.closest('[data-section]');
    return sec ? sec.getAttribute('data-section') : 'page';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var name = classify(a);
    if (!name) return;
    var params = {
      cta_location: locationOf(a),
      cta_text: (a.textContent || '').trim().slice(0, 60),
      plan: a.getAttribute('data-plan') || '',
      link_url: a.href,
      page_path: location.pathname
    };
    try { if (typeof gtag === 'function') gtag('event', name, params); } catch (err) {}
    try {
      if (typeof fbq === 'function') {
        if (name === 'trial_click') fbq('track', 'Lead', { content_name: 'Trial', content_category: params.cta_location });
        else if (name === 'free_pt_click') fbq('track', 'Lead', { content_name: 'Free PT session', content_category: params.cta_location });
        else if (name === 'join_click') fbq('track', 'InitiateCheckout', { content_name: params.plan || 'Membership', content_category: params.cta_location });
        else if (name === 'phone_click' || name === 'email_click') fbq('track', 'Contact');
        else fbq('trackCustom', name, params);
      }
    } catch (err) {}
  }, true);

  /* ---------- Header, menu, motion ---------- */
  function onReady() {
    applyCampaigns();

    var body = document.body;
    document.querySelectorAll('[data-menu-open]').forEach(function (b) {
      b.addEventListener('click', function () { body.classList.add('menu-open'); b.setAttribute('aria-expanded', 'true'); });
    });
    document.querySelectorAll('[data-menu-close]').forEach(function (b) {
      b.addEventListener('click', function () {
        body.classList.remove('menu-open');
        document.querySelectorAll('[data-menu-open]').forEach(function (o) { o.setAttribute('aria-expanded', 'false'); });
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') body.classList.remove('menu-open'); });
    document.querySelectorAll('.mobile-menu a').forEach(function (a) {
      a.addEventListener('click', function () { body.classList.remove('menu-open'); });
    });

    // Pinned header on mobile: once the header scrolls out of view it sticks to the top,
    // so the menu is always one tap away.
    var hdr = document.querySelector('.site-header');
    if (hdr && window.matchMedia) {
      var mq = window.matchMedia('(max-width: 960px)');
      var spacer = document.createElement('div');
      spacer.className = 'header-spacer';
      var over = hdr.classList.contains('over-hero');
      var pinAt = 0, pinned = false;
      var measure = function () {
        if (pinned) return;
        var r = hdr.getBoundingClientRect();
        pinAt = r.bottom + window.scrollY;
      };
      var setPinned = function (on) {
        if (on === pinned) return;
        pinned = on;
        if (on) {
          if (!over) { spacer.style.height = hdr.offsetHeight + 'px'; hdr.parentNode.insertBefore(spacer, hdr); }
          hdr.classList.add('pinned');
        } else {
          hdr.classList.remove('pinned');
          if (spacer.parentNode) spacer.parentNode.removeChild(spacer);
          measure();
        }
      };
      var check = function () { setPinned(mq.matches && window.scrollY > pinAt); };
      measure();
      window.addEventListener('scroll', check, { passive: true });
      window.addEventListener('resize', function () { if (!mq.matches) setPinned(false); measure(); check(); });
      check();
    }

    // Coach row: loop forever (skipped for people who prefer less motion)
    if (!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      document.querySelectorAll('[data-loop]').forEach(function (loop) {
        var track = loop.querySelector('.loop-track');
        if (!track || track.getAttribute('data-cloned')) return;
        Array.prototype.slice.call(track.children).forEach(function (el) {
          var c = el.cloneNode(true);
          c.setAttribute('aria-hidden', 'true');
          c.setAttribute('tabindex', '-1');
          c.querySelectorAll('a,button').forEach(function (x) { x.setAttribute('tabindex', '-1'); });
          track.appendChild(c);
        });
        track.setAttribute('data-cloned', '1');
        loop.style.setProperty('--loop-dur', (track.children.length * 4.5) + 's');
        loop.classList.add('running');
      });
    }

    // Reveal on scroll
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
        });
      }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
      // Safety net: never leave content hidden if the observer doesn't fire.
      setTimeout(function () {
        document.querySelectorAll('.reveal:not(.visible)').forEach(function (el) {
          if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
        });
      }, 2500);
    } else {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
    }

    // Background videos: pick the right file for the screen, respect reduced motion,
    // and pause when off screen to save battery and data.
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = window.matchMedia && window.matchMedia('(max-width: 960px)').matches;
    document.querySelectorAll('video[data-bg]').forEach(function (v) {
      var src = (small && v.getAttribute('data-src-mobile')) || v.getAttribute('data-src');
      if (small && v.getAttribute('data-poster-mobile')) v.setAttribute('poster', v.getAttribute('data-poster-mobile'));
      if (reduce || !src) return;
      v.muted = true; v.loop = true; v.playsInline = true;
      v.src = src;
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (en) {
            if (en.isIntersecting) { var pp = v.play(); if (pp && pp.catch) pp.catch(function () {}); }
            else v.pause();
          });
        }, { threshold: 0.1 }).observe(v);
      }
    });

    // Only one testimonial plays at a time
    var vids = document.querySelectorAll('video[data-testimonial]');
    vids.forEach(function (v) {
      v.addEventListener('play', function () {
        vids.forEach(function (o) { if (o !== v) o.pause(); });
        try { if (typeof gtag === 'function') gtag('event', 'testimonial_play', { video: v.getAttribute('data-testimonial'), page_path: location.pathname }); } catch (e) {}
      });
    });

    // Sticky mobile button: slides in once the hero has scrolled away,
    // and gets out of the way when the footer CTA is on screen
    var sticky = document.querySelector('.sticky-cta');
    var footer = document.querySelector('.site-footer');
    var heroEl = document.querySelector('.hero, .page-hero');
    if (sticky && 'IntersectionObserver' in window) {
      if (heroEl) {
        new IntersectionObserver(function (es) {
          es.forEach(function (en) { sticky.classList.toggle('show', !en.isIntersecting); });
        }, { threshold: 0 }).observe(heroEl);
      } else {
        sticky.classList.add('show');
      }
    } else if (sticky) { sticky.classList.add('show'); }
    if (sticky && footer && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { sticky.classList.toggle('away', en.isIntersecting); });
      }, { threshold: 0.05 }).observe(footer);
    }

    // Web3Forms submit (keeps people on the page)
    document.querySelectorAll('form[data-web3]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var status = form.querySelector('.form-status');
        var btn = form.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending...'; }
        fetch('https://api.web3forms.com/submit', { method: 'POST', body: new FormData(form) })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d.success) {
              form.reset();
              if (status) status.textContent = form.getAttribute('data-success') || 'Thanks, we’ll be in touch soon.';
              try { if (typeof gtag === 'function') gtag('event', 'form_submit', { form: form.id || 'form', page_path: location.pathname }); } catch (e2) {}
              try { if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: form.id || 'form' }); } catch (e3) {}
            } else if (status) status.textContent = 'Something went wrong. Please call us on 09 558 1408.';
          })
          .catch(function () { if (status) status.textContent = 'Something went wrong. Please call us on 09 558 1408.'; })
          .then(function () { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; } });
      });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
