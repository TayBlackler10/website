# M2 site build guide (for anyone building a page)

The homepage is the reference: `_src/pages/index.html`. Match its look and structure.
Styles: `assets/css/m2.css` (read it, use only its classes; add nothing new unless unavoidable,
and if you must, use a short inline `style=""`). Script: `assets/js/m2.js` (handles menu, reveal
animations, background videos, campaign date switching, tracking, Web3Forms submit).

## How a page is made
Write ONE file: `_src/pages/<name>.html`. It starts with a JSON header, then the body HTML
(everything between the site header and footer; the build adds head, header, menu, footer,
sticky mobile button and scripts). Build with `python3 tools/build.py`.

```
<!--m2
{"out": "classes.html",
 "title": "Group Fitness Classes in Grafton, Auckland | HYROX & Strength | M2 Training Club",
 "description": "150 to 160 characters, includes the main keyword + Grafton/Auckland + a reason to click.",
 "nav": "train", "hero_over": true,
 "og_image": "/assets/img/og-classes.jpg",
 "breadcrumbs": [["Classes", "/classes.html"]],
 "schema": [ ... page-specific JSON-LD objects ... ]}
-->
<section class="page-hero" data-section="hero"> ... </section>
...
```
- `nav` is one of: memberships, train, hyrox, club, contact.
- `hero_over: true` when the page starts with `.page-hero` (header floats over it).
- Title: unique, keyword first, under ~65 characters where possible, ends with "| M2 Training Club".
- Put `{{TRIAL_HREF}}` for the trial link. Every trial button MUST be:
  `<a class="btn btn-lime" href="{{TRIAL_HREF}}" data-trial data-trial-label data-loc="SECTION">Get your free 3 days</a>`
  (`data-trial-label` makes the label switch to "Try 5 days for $5" on 1 Oct automatically.
  For a text link that should keep its own words, leave off `data-trial-label`.)
- Give every `<section>` a `data-section="short-name"` (used for click tracking).
- Membership join links get `data-plan="Perform"` etc.

## Page hero pattern (subpages)
```
<section class="page-hero" data-section="hero">
  <div class="ph-media"><img src="/assets/img/XXX-1600.jpg" srcset="/assets/img/XXX-800.jpg 800w, /assets/img/XXX-1600.jpg 1600w" sizes="100vw" alt="..." fetchpriority="high"></div>
  <div class="ph-shade" aria-hidden="true"></div>
  <div class="wrap ph-content">
    <nav class="crumbs in-1" aria-label="Breadcrumb"><a href="/">Home</a><span>/</span><span>Classes</span></nav>
    <span class="eyebrow in-1" style="color:var(--lime)">Short label</span>
    <h1 class="in-2">Group classes in Grafton<span class="dot">.</span></h1>
    <p class="sub in-3">One or two short sentences. No more.</p>
    <div class="btn-row in-4"> trial button + one secondary (btn-ghost) </div>
  </div>
</section>
```
Use `page-hero compact` for lighter pages (contact, reviews, gallery, become a PT, hoodie).
The H1 must contain the page's main search phrase (e.g. "Gym memberships", "Recovery", "Personal trainers").

## Components available (see index.html for exact markup)
section / wrap / section-head (+ .center) / eyebrow / h-lg / h-md / lead / card, card-lg, card-paper,
card-dark / steps / bento + tile + tile-cap / grid-2..5 (+ scroll-mobile) / class-card / price-grid + price
(+ featured, price-head, badge, flexi link, li.no for "not included") / split (dark|light) + split-text +
split-media (+ collage) / scroller.bleed + coach / vid-row + vid (testimonial videos) / review / info /
ticks / faq (details) / form, field, row, form-note, form-status / embed / map / btn (lime, dark, line,
ghost, lg) / btn-row / text-link / fine / reveal (fade-up on scroll) / lift / zoom.
Tick icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5E6B00" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>` (stroke #DFFF00 on dark).
FAQ plus icon: copy from index.html.

## Images (all in /assets/img, each as -800.jpg and -1600.jpg)
floor-functional, floor-bikes, floor-rower, floor-wide, floor-wide-2, rig-zone, cable-mural, plates,
pool, pool-2, sauna, sauna-2, ice-bath, ice-bath-member (member in the ice bath), spa,
class-sled, class-sled-2 (sled push), class-busy (busy class), class-1, boxing-pt (PT boxing session),
coaching (coach with members), member-bike, community-5, community-run (members running outside),
community-trophy, community-movember (charity cheque), community-dozen (Deadly Dozen event),
group-1, group-2, group-3 (big group photos), race-rope-1, race-rope-2, race-crew, race-dave-taylor (HYROX race),
coach-te, coach-joe, coach-dave, coach-bekka, coach-taylor, coach-tim, coach-madeliene (portrait headshots),
taylor-ceo, bekka-manager.
Use srcset 800/1600 for big images, just -800 for cards. `loading="lazy"` on everything below the hero.
Write real alt text (what is in the photo + M2/Grafton where natural). NEVER use the old
"Hyrox Lydia" photo anywhere.
Social images: og-default.jpg, og-classes.jpg, og-recovery.jpg, og-hyrox.jpg, og-community.jpg.

## Videos (/assets/video)
hero-desktop.mp4 (B&W, landscape), hero-mobile.mp4 (portrait), testimonial-1/2/3.mp4 (+ posters
/assets/img/testimonial-N-poster-800.jpg), hyrox-race.mp4 (+ hyrox-race-poster-800.jpg),
hyrox-throwdown.mp4 (+ throwdown-poster-800.jpg; M2's own HYROX Throwdown event).
Background/looping video: `<video data-bg data-src="/assets/video/X.mp4" poster="..." muted playsinline loop preload="none"></video>`
Testimonials: `<video data-testimonial="member-1" src="..." poster="..." controls playsinline preload="none" aria-label="..."></video>` inside `.vid`.

## Facts (do not invent anything beyond these or what the old page says)
- Address 8 Nugent Street, Grafton, Auckland 1023. Phone 09 558 1408. reception@m2club.co.nz.
- Hours Mon to Fri 5am to 10pm, Sat and Sun 7am to 7pm. Parking on site, short walk from Grafton station.
- 1,900+ members. 4.4 stars from 125 Google reviews. Opened October 2023. NEVER mention "Fitness Portal" anywhere.
- Official HYROX Training Club. HYROX Auckland is 4 to 7 February 2027.
- Weekly memberships (Join links, weekly term / Flexi):
  - Daily $27.50/wk, 12 month term. Gym floor only (NO classes, NO recovery). Free PT session.
    Join https://m2club.co.nz/join.html?m=844760
    Flexi https://m2club.co.nz/join.html?m=844770
  - M2 Classes $35/wk, 6 month term. Gym floor + unlimited classes incl. HYROX (NO recovery). Free PT session.
    Join https://m2club.co.nz/join.html?m=844761
    Flexi https://m2club.co.nz/join.html?m=844768
  - Perform $49.50/wk, 6 month term. Everything: gym, unlimited classes, HYROX, 20m pool, spa pool, sauna, ice bath. Free PT session. Most popular.
    Join https://m2club.co.nz/join.html?m=844762
    Flexi https://m2club.co.nz/join.html?m=844772
  - Recovery $35/wk, 6 month term. Recovery area only (pool, spa, sauna, ice bath). NO free PT session.
    Join https://m2club.co.nz/join.html?m=844763
    Flexi https://m2club.co.nz/join.html?m=844774
  - Flexi = +$5/wk on any of the above, no fixed term, cancel anytime with 30 days' notice.
  - Joining fee $49, key tag $25.
- Annual (pay upfront): Perform Annual $1,800 (limited spots) https://m2club.co.nz/join.html?m=844786 ;
  Daily Annual $1,215 https://m2club.co.nz/join.html?m=844785 . Use the savings/spot wording from the old annual page.
- Every new member gets one free PT session (booked at /free-pt.html), except Recovery memberships.
- Corporate memberships are NOT sold online (don't add join buttons for them).
- Fitness Passport members get full access to everything (gym, all classes incl. HYROX, recovery) but are excluded from all deals and offers.
- HYROX Auckland offer: show your HYROX Auckland race entry at reception, get Perform Flexi for $35/wk instead of $54.50 (that's over 35% off, never say 40%). In person only.
- Referral: until 1 Oct the offer is "sign up together, both get 2 weeks free". From 1 Oct it's
  "Bring a Mate": a current member refers a friend who joins on a membership (not a trial), both get
  4 weeks free and the mate pays no joining fee or key tag fee (worth $79). Unlimited referrals. Mention it at reception, no codes.
  Show both with date switching: `<span data-until="{{TRIAL_SWITCH}}">old</span><span data-from="{{TRIAL_SWITCH}}" hidden>new</span>`
- Classes: HYROX Threshold, HYROX Strength, HYROX Teams (there is NO HYROX Engine class), Strength Club, and new yoga with Coach Rhea
  (Hatha Mondays 6:30pm, Yin Wednesdays 6:30pm). Timetable and bookings run on Technogym/Mywellness:
  embed https://widgets.mywellness.com/facility/fitnessportalakl (keep the old page's iframe + "open it directly" fallback link).
- Trainers: Te, Joe, Dave, Bekka, Taylor (owner), Tim (owner), Madeliene, Matthew Painter (new Sep 2026: HYROX race prep, running, strength and conditioning, body recomposition, weight loss), Eden Rapana (new Sep 2026: body recomposition, strength, sustainable weight loss, hormone-aware training and nutrition). Use the old trainers page for bios.

## Writing rules
- NEVER use em dashes (—) or en dashes as punctuation. Use commas, full stops, or "to" for ranges.
- Plain, warm, direct NZ English. Short sentences. Sound like Taylor, not an ad agency. No hype words.
- Clean and easy to read: fewer, shorter sections beat long ones. Don't cram. Heroes stay minimal.
- Keep every real fact, form, checkout link, embed and widget from the old page (`_src/legacy/<page>.html`),
  including Web3Forms access keys, hidden fields and the Stripe link. Drop fake-looking testimonials
  (e.g. "Sarah M.", "James K.") and anything not in the facts above or the old page.
- Every page ends its body with its last content section; the footer CTA is added automatically.
- Accessibility: real buttons/links, labels on inputs, alt text, sensible heading order (one H1).

- PT course (Become a PT): $3,000, 25% off the normal $4,000, payment plans available.
- HYROX Summer Prep page was removed and redirects to /hyrox-auckland.html. Do not link to it.
- Hoodie is on sale ongoing (printed to order), no pre-sale deadline.
- On site: in-house physio by Prana Physio (https://www.pranaphysio.co.nz/) and a cafe. The pool is 20m. There is NO steam room.


## Sign-up links (rule from Taylor, 30 Sep 2026)
- Never link to the GymMaster checkout (gymmasteronline.com/portal/membership/...). All trials and memberships go through our own join page: https://m2club.co.nz/join.html?m=<id>.
- 5 Days for $5: join.html?m=844624. Perform Weekly: join.html?m=844762. Other ids come from the join page's membership list.
- The free 3 day trial is gone; the join page filters it out even if GymMaster still lists it.
- Annual: Perform Annual join.html?m=844786, Daily Annual join.html?m=844785 (term 'annual' on the join page).
