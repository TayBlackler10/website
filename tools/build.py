#!/usr/bin/env python3
"""
M2 Training Club site builder.

Each page lives in _src/pages/<name>.html and starts with a JSON block:

    <!--m2
    {"out": "memberships.html", "title": "...", "description": "...", "nav": "memberships",
     "og_image": "/assets/img/xyz-1600.jpg", "hero_over": true,
     "breadcrumbs": [["Memberships", "/memberships.html"]], "schema": [ {...} ]}
    -->
    ...page body (everything between the header and the footer)...

Run:  python3 tools/build.py
It writes finished, static HTML files to the site root (what GitHub Pages serves).
Folders starting with "_" are not published by GitHub Pages.
"""
import json, os, re, sys, html, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '_src', 'pages')
SITE = 'https://m2club.co.nz'
TRIAL_SWITCH = '2026-09-30T01:45:00Z'  # 5 Days for $5 went live early, 30 Sep 2026 afternoon
MATE_SWITCH = '2026-09-30T11:00:00Z'  # Bring a Mate: 1 Oct 2026 00:00 NZ
OPEN_WEEK_FROM = '2026-09-27T11:00:00Z'
OPEN_WEEK_UNTIL = '2026-10-18T11:00:00Z'
TRIAL_HREF = 'https://m2club.co.nz/join.html?m=844624'  # 5 Days for $5, preselected on our own join page (never the GymMaster checkout)
VERSION = datetime.date.today().strftime('%Y%m%d')

CHEV = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
CHEV_LG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
PHONE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>'

# Menu structure: (group label, main link, [(label, href, blurb)])
MENU = [
    ('Memberships', '/memberships.html', 'memberships', [
        ('All memberships', '/memberships.html', 'Perform, Classes, Daily, Recovery'),
        ('Annual memberships', '/annual-memberships.html', 'Pay upfront and save'),
        ('Fitness Passport', '/fitness-passport.html', 'Train at M2 through your work'),
        ('5 days for $5', TRIAL_HREF, 'Try the whole club for five bucks'),
        ('Bring a Mate', '/bring-a-mate.html', 'You both get 4 weeks free'),
        ('Corporate', '/corporate-memberships.html', 'For teams of 10 or more'),
    ]),
    ('Train', '/classes.html', 'train', [
        ('Classes', '/classes.html', 'Timetable, HYROX, strength and yoga'),
        ('Recovery', '/recovery.html', 'Pool, sauna, spa and ice bath'),
        ('Trainers', '/trainers.html', 'Meet our coaches'),
        ('Ice bath and sauna', '/ice-bath-sauna-auckland.html', 'Contrast therapy in Grafton'),
        ('Physio', '/physio-grafton.html', 'Prana Physiotherapy, in-house'),
        ('Free PT session', '/free-pt.html', 'Included for new members'),
    ]),
    ('HYROX', '/hyrox-auckland.html', 'hyrox', [
        ('HYROX classes', '/hyrox-gym-auckland.html', 'Train for HYROX all year'),
        ('HYROX Auckland', '/hyrox-auckland.html', 'Race ticket offer, $35 a week'),
        ('Free 2 week plan', '/hyrox-auckland-2week-plan.html', 'Download the training plan'),
        ('HYROX guides', '/guides.html', 'Training plan, stations and race tips'),
    ]),
    ('The Club', '/our-story.html', 'club', [
        ('Birthday Open Week', '/birthday-open-week.html', 'Train free 12 to 18 October'),
        ('Our story', '/our-story.html', 'How M2 started'),
        ('Gallery', '/gallery.html', 'Take a look inside'),
        ('Reviews', '/reviews.html', 'What members say'),
        ('Training guides', '/guides.html', 'Free how-to guides'),
        ('Become a PT', '/become-a-pt.html', 'Train clients at M2'),
        ('M2 Hoodie', '/hoodie-presale.html', 'Official M2 merch'),
    ]),
]



import re as _re
_IMG_RE = _re.compile(r'<img\b[^>]*?src="(/assets/img/[^"]+?)\.jpg"[^>]*>')
def webpify(html):
    """Wrap site JPGs in <picture> with a WebP source (WebP files sit next to each JPG)."""
    def rep(m):
        tag = m.group(0)
        if not os.path.exists(os.path.join(ROOT, m.group(1).lstrip('/') + '.webp')):
            return tag
        sm = _re.search(r'srcset="([^"]+)"', tag)
        srcset = sm.group(1) if sm else m.group(1) + '.jpg'
        webp = _re.sub(r'(/assets/img/[^\s,"]+?)\.jpg', r'\1.webp', srcset)
        if all(os.path.exists(os.path.join(ROOT, u.lstrip('/'))) for u in _re.findall(r'(/assets/img/[^\s,"]+?\.webp)', webp)):
            sz = _re.search(r'sizes="([^"]+)"', tag)
            sizes = f' sizes="{sz.group(1)}"' if sz else ''
            return f'<picture><source type="image/webp" srcset="{webp}"{sizes}>{tag}</picture>'
        return tag
    html = _IMG_RE.sub(rep, html)
    # video posters: WebP when available
    def prep(m):
        w = m.group(2) + '.webp'
        return f'{m.group(1)}="{w}"' if os.path.exists(os.path.join(ROOT, w.lstrip('/'))) else m.group(0)
    return _re.sub(r'(poster|data-poster-mobile)="(/assets/img/[^"]+?)\.jpg"', prep, html)


def trial_link(cls, loc, label_override=None):
    label = label_override or 'Try 5 days for $5'
    lab_attr = '' if label_override else ' data-trial-label'
    return f'<a class="{cls}" href="{TRIAL_HREF}" data-trial{lab_attr} data-loc="{loc}">{label}</a>'


def meta_cta(meta, cls, loc):
    # A page can swap the footer and sticky mobile button for its own action
    if meta.get('cta_href'):
        return f'<a class="{cls}" href="{meta["cta_href"]}" data-loc="{loc}" data-track="{meta.get("cta_track", "cta_click")}">{meta["cta_label"]}</a>'
    return trial_link(cls, loc)


def head(meta):
    title = meta['title']
    desc = meta['description']
    out = meta['out']
    canonical = SITE + ('/' if out == 'index.html' else '/' + out)
    og = SITE + meta.get('og_image', '/assets/img/og-default.jpg')
    robots = meta.get('robots', 'index, follow, max-image-preview:large')
    schema_blocks = list(meta.get('schema', []))
    crumbs = meta.get('breadcrumbs')
    if crumbs:
        items = [{"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + '/'}]
        for i, (name, url) in enumerate(crumbs, start=2):
            items.append({"@type": "ListItem", "position": i, "name": name, "item": SITE + url})
        schema_blocks.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items})
    schema_html = ''.join(
        '<script type="application/ld+json">' + json.dumps(s, ensure_ascii=False, separators=(',', ':')) + '</script>\n'
        for s in schema_blocks)
    def _pl(p):
        if 'hero-poster' in p and os.path.exists(os.path.join(ROOT, 'assets/img/hero-mobile-poster-800.webp')):
            return ('<link rel="preload" as="image" type="image/webp" href="/assets/img/hero-mobile-poster-800.webp" media="(max-width: 960px)">\n'
                    '<link rel="preload" as="image" type="image/webp" href="/assets/img/hero-poster-1600.webp" media="(min-width: 961px)">\n')
        m = re.match(r'(/assets/img/.+)-(?:800|1600)\.jpg$', p)
        if m and os.path.exists(os.path.join(ROOT, m.group(1).lstrip('/') + '-800.webp')) and os.path.exists(os.path.join(ROOT, m.group(1).lstrip('/') + '-1600.webp')):
            b = m.group(1)
            return f'<link rel="preload" as="image" type="image/webp" imagesrcset="{b}-800.webp 800w, {b}-1600.webp 1600w" imagesizes="100vw">\n'
        return f'<link rel="preload" as="image" href="{p}">\n'
    preload = ''.join(_pl(p) for p in meta.get('preload', []))
    e = html.escape
    return f'''<!DOCTYPE html>
<html lang="en-NZ">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#0A0A0A">
<meta name="geo.region" content="NZ-AUK">
<meta name="geo.placename" content="Grafton, Auckland">
<meta property="og:site_name" content="M2 Training Club">
<meta property="og:locale" content="en_NZ">
<meta property="og:type" content="website">
<meta property="og:title" content="{e(meta.get('og_title', title))}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(meta.get('og_title', title))}">
<meta name="twitter:description" content="{e(desc)}">
<meta name="twitter:image" content="{og}">
<link rel="icon" href="/assets/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/archivo.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/dm-sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/m2.css?v={VERSION}">
{preload}{schema_html}<!-- Google tag (GA4) + Meta Pixel. Commands queue straight away; the heavy
     scripts load after the page is up (or on first interaction) to keep it fast. -->
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-1PW3XYQ1F8');
!function(f){{if(f.fbq)return;var n=f.fbq=function(){{n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)}};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}}(window);fbq('init','1173983798207057');fbq('track','PageView');
(function(){{var done=0;function go(){{if(done)return;done=1;['https://www.googletagmanager.com/gtag/js?id=G-1PW3XYQ1F8','https://connect.facebook.net/en_US/fbevents.js'].forEach(function(u){{var s=document.createElement('script');s.async=true;s.src=u;document.head.appendChild(s);}});}}
if(/[?&](fbclid|gclid|utm_)/.test(location.search)){{go();}}else{{addEventListener('load',function(){{setTimeout(go,1200);}});}}['pointerdown','keydown','touchstart','scroll'].forEach(function(e){{addEventListener(e,go,{{once:true,passive:true}});}});}})();</script>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=1173983798207057&ev=PageView&noscript=1"></noscript>
{meta.get('head_extra', '')}</head>
'''


def header(meta):
    active = meta.get('nav', '')
    over = ' over-hero' if meta.get('hero_over') else ''
    items = []
    for label, href, key, _ in MENU:
        cur = ' aria-current="page"' if key == active else ''
        items.append(f'<div class="nav-item"><a class="nav-link" href="{href}"{cur}>{label}{CHEV}</a></div>')
    cur = ' aria-current="page"' if active == 'contact' else ''
    items.append(f'<div class="nav-item nav-plain"><a class="nav-link" href="/contact.html"{cur}>Contact</a></div>')
    cols = []
    for label, href, key, links in MENU:
        ls = ''.join(f'<a class="mega-link" href="{h}"><strong>{l}</strong><span>{b}</span></a>' for l, h, b in links)
        cols.append(f'<div class="mega-col"><span class="eyebrow">{label}</span>{ls}</div>')
    banner = ('' if meta.get('out') == 'birthday-open-week.html' else
              f'<div class="promo-bar" data-from="{OPEN_WEEK_FROM}" data-until="{OPEN_WEEK_UNTIL}" hidden>'
              'M2 turns 3. Train free for a week, 12 to 18 October.'
              '<a href="/birthday-open-week.html" data-track="open_week_banner_click">Register now \u2192</a></div>\n')
    return f'''<body>
<a class="skip-link" href="#main">Skip to content</a>
{banner}<header class="site-header{over}" data-section="header">
<div class="wrap header-inner">
<a class="logo" href="/" aria-label="M2 Training Club home"><img src="/assets/img/m2-logo-lime.png" alt="M2 Training Club" width="264" height="28"></a>
<nav class="main-nav" aria-label="Main">{''.join(items)}</nav>
<div class="header-actions">
<a class="nav-link" href="/free-pt.html">Free PT session</a>
{trial_link('btn btn-lime', 'header')}
</div>
<button class="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-menu" data-menu-open>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
</button>
</div>
<div class="mega"><div class="mega-panel">{''.join(cols)}</div></div>
</header>
'''


def mobile_menu():
    groups = []
    for i, (label, href, key, links) in enumerate(MENU):
        ls = ''.join(f'<a href="{h}">{l}</a>' for l, h, b in links)
        groups.append(f'<details class="mm-group"><summary>{label}{CHEV_LG}</summary><div class="mm-links">{ls}</div></details>')
    return f'''<div class="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" data-section="mobile-menu">
<div class="mm-top">
<img src="/assets/img/m2-logo-lime.png" alt="M2 Training Club" width="188" height="20">
<button class="burger" type="button" aria-label="Close menu" data-menu-close style="display:inline-flex">
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
</button>
</div>
<div class="mm-body">{''.join(groups)}<a class="mm-single" href="/contact.html">Contact</a></div>
<div class="mm-foot">
{trial_link('btn btn-lime btn-lg', 'mobile-menu')}
<a class="btn btn-ghost" href="/free-pt.html">Book your free PT session</a>
<small><a href="tel:095581408">09 558 1408</a> · 8 Nugent St, Grafton</small>
</div>
</div>
'''


FOOTER_TEXT = '5 days, full access, just $5. No lock-in.'


def footer(meta):
    cta_title = meta.get('footer_title', 'Come and see<br>for yourself<span class="dot">.</span>')
    cols = []
    for label, href, key, links in MENU:
        ls = ''.join(f'<li><a href="{h}">{l}</a></li>' for l, h, b in links)
        cols.append(f'<div><h3>{label}</h3><ul>{ls}</ul></div>')
    contact = ('<div><h3>Contact</h3><ul><li><a href="tel:095581408">09 558 1408</a></li>'
               '<li><a href="mailto:reception@m2club.co.nz">reception@m2club.co.nz</a></li>'
               '<li><a href="/contact.html">Contact us</a></li>'
               '<li><a href="/gym-auckland-cbd.html">Getting here</a></li>'
               '<li><a href="/gym-near-auckland-hospital.html">Near Auckland Hospital</a></li>'
               '<li><a href="/gym-newmarket.html">Near Newmarket</a></li>'
               '<li><a href="https://www.instagram.com/m2trainingclub/" rel="noopener">Instagram</a></li>'
               '<li><a href="https://www.facebook.com/m2trainingclub" rel="noopener">Facebook</a></li></ul></div>')
    year = datetime.date.today().year
    return f'''<footer class="site-footer" data-section="footer">
<div class="wrap">
<div class="footer-cta">
<div><h2>{cta_title}</h2><p>{meta.get('footer_text') or FOOTER_TEXT}</p></div>
{meta_cta(meta, 'btn btn-lime btn-lg', 'footer')}
</div>
<div class="footer-cols">
<div class="footer-brand"><img src="/assets/img/m2-logo-lime.png" alt="M2 Training Club" width="226" height="24" loading="lazy"><p>8 Nugent Street, Grafton<br>Auckland 1023<br>Mon to Fri 5am to 10pm<br>Sat and Sun 7am to 7pm</p></div>
{''.join(cols)}{contact}
</div>
<div class="footer-base"><span>&copy; {year} M2 Training Club · Grafton, Auckland</span><a href="/privacy-policy.html">Privacy policy</a></div>
</div>
</footer>
<div class="sticky-cta" data-section="sticky-mobile">
{meta_cta(meta, 'btn btn-lime', 'sticky-mobile')}
<a class="call" href="tel:095581408" aria-label="Call M2 on 09 558 1408">{PHONE}</a>
</div>
<script src="/assets/js/m2.js?v={VERSION}" defer></script>
{meta.get('body_end', '')}</body>
</html>
'''


def parse(path):
    raw = open(path, encoding='utf-8').read()
    m = re.match(r'\s*<!--m2\s*(\{.*?\})\s*-->\s*', raw, re.S)
    if not m:
        sys.exit(f'{path}: missing <!--m2 {{...}} --> header')
    meta = json.loads(m.group(1))
    body = raw[m.end():]
    return meta, body


def build():
    count = 0
    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.html'):
            continue
        meta, body = parse(os.path.join(SRC, name))
        body = body.replace('{{TRIAL_HREF}}', TRIAL_HREF).replace('{{TRIAL_SWITCH}}', TRIAL_SWITCH).replace('{{MATE_SWITCH}}', MATE_SWITCH)
        page = head(meta) + header(meta) + mobile_menu() + '<main id="main">\n' + body.strip() + '\n</main>\n' + footer(meta)
        # Open Week links in the menus disappear by themselves after the week
        page = page.replace('href="/birthday-open-week.html"><strong>', f'href="/birthday-open-week.html" data-until="{OPEN_WEEK_UNTIL}"><strong>')
        page = page.replace('<li><a href="/birthday-open-week.html">', f'<li><a href="/birthday-open-week.html" data-until="{OPEN_WEEK_UNTIL}">')
        page = page.replace('<a href="/birthday-open-week.html">Birthday Open Week</a>', f'<a href="/birthday-open-week.html" data-until="{OPEN_WEEK_UNTIL}">Birthday Open Week</a>')
        page = webpify(page)
        with open(os.path.join(ROOT, meta['out']), 'w', encoding='utf-8') as f:
            f.write(page)
        count += 1
        print('built', meta['out'])
    print(count, 'pages')


if __name__ == '__main__':
    build()
