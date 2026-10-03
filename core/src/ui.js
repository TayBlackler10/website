// The staff app page served by the M2 Core worker.
// Plain HTML, CSS and JS in one string. No backticks or ${ inside, so it can live in a template literal.

export const APP_HTML = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>M2 Core</title>
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black"><meta name="apple-mobile-web-app-title" content="M2 Core"><meta name="theme-color" content="#0A0A0A"><link rel="apple-touch-icon" href="https://m2club.co.nz/assets/apple-touch-icon.png"><link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap">
<style>
:root{--lime:#DFFF00;--ink:#0A0A0A;--ink2:#1A1A18;--paper:#F3F3F0;--tile:#F1F1EC;--olive:#5E6B00;--muted:#5B5B55;--soft:#B9B9B0;--line:#E2E2DC;--warn:#FFF1CC;--warnInk:#6B4A00;--okbg:#F7FBD9;--red:#A33A00}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 "DM Sans","Helvetica Neue",Arial,sans-serif}
button,input,select,textarea{font:inherit;color:inherit}
a{color:var(--olive)}
.app{min-height:100%;display:grid;grid-template-columns:232px minmax(0,1fr)}
aside{background:var(--ink);color:#fff;padding:22px 14px;display:flex;flex-direction:column;gap:22px;position:sticky;top:0;height:100vh;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#333 transparent}aside>*{flex-shrink:0}
aside img{height:20px;width:auto;align-self:flex-start;margin-left:12px}
nav{display:flex;flex-direction:column;gap:2px}
.nav{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;color:var(--soft);text-decoration:none;font-weight:500;border:0;background:none;text-align:left;cursor:pointer;width:100%}
.nav:hover{background:var(--ink2);color:#fff}
.nav.on{background:var(--lime);color:var(--ink);font-weight:600}
.nav .ct{margin-left:auto;background:var(--lime);color:var(--ink);border-radius:999px;font-size:12px;padding:0 8px;font-weight:600}
.nav.on .ct{background:var(--ink);color:var(--lime)}
.me{margin-top:auto;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--ink2)}
.me .av{width:32px;height:32px;border-radius:50%;background:var(--lime);color:var(--ink);display:grid;place-items:center;font-weight:600;font-size:13px}
.me small{display:block;color:#8C8C84;font-size:12px}
main{padding:26px 32px 48px;display:flex;flex-direction:column;gap:18px;min-width:0;max-width:1240px}
h1,h2,h3{font-family:Archivo,"Helvetica Neue",Arial,sans-serif;font-weight:800;letter-spacing:-.02em;margin:0;text-wrap:balance}
h1{font-size:32px}h2{font-size:21px}h3{font-size:16px}
.dot{color:var(--olive)}
.eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--olive);font-weight:600}
.card{background:#fff;border-radius:22px;padding:22px;display:flex;flex-direction:column;gap:12px;min-width:0}
.card.dark{background:var(--ink);color:#fff}
.card.dark .eyebrow{color:var(--lime)}
.row2{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:18px;align-items:start}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.tile{background:var(--tile);border-radius:14px;padding:14px;min-width:0}
.card.dark .tile{background:var(--ink2)}
.tile .n{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:26px;line-height:1.1;font-variant-numeric:tabular-nums}
.card.dark .tile .n{color:var(--lime)}
.tile .l{font-size:13px;color:var(--muted)}
.card.dark .tile .l{color:var(--soft)}
.muted{color:var(--muted);font-size:13px}
.err{color:var(--red);font-size:14px}
.ok{background:var(--okbg);border-radius:12px;padding:12px 14px;font-size:14px}
.warnbox{background:var(--warn);color:#4A3300;border-radius:12px;padding:12px 14px;font-size:14px}
.btn{height:44px;padding:0 20px;border:0;border-radius:999px;background:var(--lime);color:var(--ink);font-weight:600;cursor:pointer;white-space:nowrap}
.btn.dark{background:var(--ink);color:var(--lime)}
.btn.line{background:transparent;border:1px solid var(--ink)}
.btn.sm{height:34px;padding:0 14px;font-size:13px}
.btn:disabled{opacity:.5;cursor:default}
.btn:focus-visible,.nav:focus-visible,.chip:focus-visible,.plan:focus-visible,.job:focus-visible{outline:2px solid var(--olive);outline-offset:2px}
.pill{display:inline-block;font-size:12px;background:var(--tile);border-radius:999px;padding:2px 10px;font-weight:600;white-space:nowrap}
.pill.dark{background:var(--ink);color:var(--lime)}
.pill.warn{background:var(--warn);color:var(--warnInk)}
.pill.ok{background:var(--okbg);color:#3C4400}
.face{width:96px;height:96px;border-radius:50%;background:var(--tile);display:grid;place-items:center;overflow:hidden;flex:none;font:800 30px Archivo,Arial,sans-serif;color:var(--muted);border:3px solid var(--lime)}
.face img{width:100%;height:100%;object-fit:cover}
.face.sm{width:40px;height:40px;font-size:14px;border-width:2px}
.cam{position:fixed;inset:0;background:rgba(10,10,10,.72);display:grid;place-items:center;z-index:50;padding:16px}
.cam .box{background:#fff;border-radius:24px;padding:20px;width:min(520px,100%);display:flex;flex-direction:column;gap:12px}
.cam .view{position:relative;width:100%;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:var(--ink)}
.cam video,.cam canvas,.cam .view img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cam .ring{position:absolute;inset:8%;border:3px dashed rgba(223,255,0,.8);border-radius:50%;pointer-events:none}
.photoRow{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
.tbl{border-collapse:collapse;width:100%;font-size:13.5px}
.tbl th{text-align:left;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:8px;border-bottom:1px solid var(--line);white-space:nowrap}
.tbl td{padding:8px;border-bottom:1px solid var(--line);white-space:nowrap}
.tbl tr[data-member]:hover td{background:var(--tile)}
.search{display:flex;align-items:center;gap:8px;background:#fff;border-radius:999px;padding:0 16px;height:48px;border:1px solid var(--line)}
.search input{border:0;outline:0;flex:1;min-width:0;background:transparent}
.list .r{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px 6px;border-top:1px solid var(--line);cursor:pointer}
.list .r:hover{background:var(--tile)}
.job{display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:12px;align-items:center;background:var(--tile);border-radius:16px;padding:12px 14px;border:0;text-align:left;cursor:pointer;width:100%}
.num{width:30px;height:30px;border-radius:50%;background:var(--ink);color:var(--lime);display:grid;place-items:center;font-weight:600;font-size:13px}
.job b{display:block}
.person{border-top:1px solid var(--line);padding:12px 2px;display:flex;flex-direction:column;gap:8px}
.person .top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.outs{display:flex;gap:6px;flex-wrap:wrap}
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:8px 14px;font-size:14px;cursor:pointer}
.chip.on{background:var(--ink);color:var(--lime);border-color:var(--ink)}
.plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.plan{border:1px solid var(--line);background:#fff;border-radius:14px;padding:14px;text-align:left;cursor:pointer}
.plan.on{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
.plan b{display:block}.plan span{font-size:13px;color:var(--muted)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.fld{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--muted)}
.fld input,.fld select,.fld textarea{height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;color:var(--ink);background:#fff;width:100%}
.fld textarea{height:80px;padding:10px 12px;resize:vertical}
.stepn{width:28px;height:28px;border-radius:50%;background:var(--ink);color:var(--lime);display:inline-grid;place-items:center;font-size:13px;font-weight:600;margin-right:8px;flex:none}
canvas#sig{width:100%;height:140px;border:1px dashed var(--muted);border-radius:12px;background:#fff;touch-action:none}
.tagbox{font-family:Archivo,Arial,sans-serif;font-weight:800;font-size:26px;height:62px;text-align:center;letter-spacing:.1em;border:2px solid var(--ink);border-radius:14px;width:100%;background:#fff}
.board{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:start}
.col{background:#E9E9E3;border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.col h3{display:flex;justify-content:space-between;padding:2px 6px;font-family:"DM Sans",Arial,sans-serif;font-weight:600;font-size:14px;letter-spacing:0}
.lead{background:#fff;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px;cursor:pointer;border:0;text-align:left;width:100%}
.lead .t{display:flex;justify-content:space-between;gap:6px}
.kv{display:grid;grid-template-columns:140px minmax(0,1fr);gap:4px 12px;font-size:14px}
.kv dt{color:var(--muted)}.kv dd{margin:0;min-width:0;overflow-wrap:anywhere}
.hist{display:flex;flex-direction:column}
.hist div{display:grid;grid-template-columns:110px minmax(0,1fr);gap:12px;padding:8px 0;border-top:1px solid var(--line);font-size:14px}
.hist span{color:var(--muted);font-size:13px}
.bars{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:6px;align-items:end;height:110px;border-bottom:1px solid var(--line)}
.bars i{background:var(--line);border-radius:5px 5px 0 0;display:block}
.bars i.last{background:var(--ink)}
.next{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center}
.cls{display:grid;grid-template-columns:70px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 8px;border-top:1px solid var(--line);cursor:pointer;border-radius:10px;background:none;border-left:0;border-right:0;border-bottom:0;text-align:left;width:100%}
.cls:hover,.cls.on{background:var(--tile)}
.cls.past{opacity:.55}
.fill{height:6px;border-radius:3px;background:var(--line);overflow:hidden;width:90px;margin-top:4px}.fill i{display:block;height:100%;background:var(--ink)}.fill i.full{background:var(--olive)}
.dayh{font-weight:600;margin:14px 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--olive)}
.dayh:first-child{margin-top:0}
.att{display:flex;gap:10px;align-items:center;padding:8px 2px;border-top:1px solid var(--line)}
.att .who{margin-right:auto;min-width:0}
.chart{display:flex;align-items:flex-end;gap:6px;height:160px;border-bottom:1px solid var(--line);padding-top:8px}
.chart .c{flex:1;display:flex;align-items:flex-end;justify-content:center;gap:2px;min-width:0;height:100%}
.chart .b{flex:1;max-width:28px;border-radius:4px 4px 0 0;background:var(--ink);min-height:2px}
.chart .b.s1{background:#C9C9BF}.chart .b.s2{background:var(--olive)}.chart .b.neg{background:var(--red)}
.clab{display:flex;gap:6px}.clab span{flex:1;text-align:center;font-size:11px;color:var(--muted);min-width:0;overflow:hidden;white-space:nowrap}
.legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted)}.legend i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
.hb{display:grid;grid-template-columns:minmax(0,150px) minmax(0,1fr) 56px;gap:10px;align-items:center;font-size:13.5px;padding:4px 0}
.hb .bar{height:10px;border-radius:5px;background:var(--line);overflow:hidden}.hb .bar i{display:block;height:100%;background:var(--ink)}
.hb b{text-align:right;font-variant-numeric:tabular-nums}
.goal{height:12px;border-radius:6px;background:var(--ink2);overflow:hidden;margin-top:6px}.goal i{display:block;height:100%;background:var(--lime)}
.goal i.mark{background:transparent}
.line svg{width:100%;height:170px;display:block}
.navlab{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6E6E66;padding:16px 12px 4px}
.tbl td.r,.tbl th.r{text-align:right;font-variant-numeric:tabular-nums}
.wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}
.mcard{display:grid;grid-template-columns:116px minmax(0,1fr);background:#fff;border:0;border-radius:18px;overflow:hidden;text-align:left;cursor:pointer;padding:0;min-height:146px;color:inherit}
.mcard:hover{box-shadow:0 0 0 2px var(--ink)}
.mph{background:var(--tile);display:grid;place-items:center;overflow:hidden;min-height:100%}.mph img{width:100%;height:100%;object-fit:cover;display:block}
.mph i{font:800 32px Archivo,Arial,sans-serif;color:var(--soft);font-style:normal}
.mb{padding:13px 14px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}.mb b{font-size:16px;line-height:1.25}.mb>span{font-size:13px;overflow:hidden;text-overflow:ellipsis}
.mft{margin-top:auto;padding-top:6px;display:flex;gap:5px;flex-wrap:wrap}
.wall.list{grid-template-columns:1fr;gap:6px}.wall.list .mcard{grid-template-columns:52px minmax(0,1fr);min-height:52px;border-radius:12px}
.wall.list .mph i{font-size:16px}.wall.list .mb{flex-direction:row;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 12px}.wall.list .mft{margin:0 0 0 auto;padding:0}
.mtool{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.mtool select{height:48px;border:1px solid var(--line);border-radius:999px;padding:0 14px;background:#fff}
.seg{display:flex;background:#fff;border:1px solid var(--line);border-radius:999px;padding:3px;height:48px;align-items:center}.seg button{border:0;background:none;border-radius:999px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600}.seg button.on{background:var(--ink);color:var(--lime)}
.prof{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:18px;align-items:start}.pcol{display:flex;flex-direction:column;gap:18px;min-width:0}
.face.xl{width:150px;height:150px;border-radius:24px;font-size:46px}
.row3{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:18px;align-items:start}
.vis{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 2px;border-top:1px solid var(--line);cursor:pointer}
.vis:hover{background:var(--tile)}
.termsbox{border:1px solid var(--line);border-radius:12px;max-height:300px;overflow:auto;padding:14px 16px;font-size:13px;line-height:1.55;background:#FCFCFA}
.termsbox h3{font-size:15px;margin:0 0 6px}.termsbox ul{padding-left:18px}
.funnel{display:flex;flex-direction:column;gap:6px}.funnel div{display:grid;grid-template-columns:170px minmax(0,1fr) 90px;gap:10px;align-items:center;font-size:13.5px}
.funnel i{display:block;height:26px;border-radius:8px;background:var(--ink)}.funnel div:nth-child(n+4) i{background:var(--olive)}.funnel b{text-align:right;font-variant-numeric:tabular-nums}
.delta{font-size:12px;font-weight:600}.delta.up{color:#3C4400}.delta.down{color:var(--red)}
.tips{display:flex;flex-direction:column;gap:8px}.tips div{background:var(--tile);border-radius:12px;padding:10px 14px;font-size:14px}
.rgrid{border-collapse:separate;border-spacing:6px;width:100%;table-layout:fixed;min-width:860px}
.rgrid th{font-size:12px;text-align:left;color:var(--muted);font-weight:600;padding:4px}
.rgrid th.today{color:var(--olive)}
.rgrid td{background:var(--tile);border-radius:12px;vertical-align:top;padding:6px;height:64px;cursor:pointer}
.rgrid td.who{background:none;cursor:default;font-weight:600;font-size:14px;padding:8px 4px}
.rgrid td.tot{background:none;cursor:default;font-variant-numeric:tabular-nums;font-size:13px;color:var(--muted)}
.rgrid td:hover:not(.who):not(.tot){box-shadow:inset 0 0 0 2px var(--ink)}
.shift{display:block;background:var(--ink);color:var(--lime);border-radius:8px;padding:4px 7px;font-size:12.5px;font-weight:600;margin-bottom:4px;border:0;width:100%;text-align:left;cursor:pointer}
.shift.draft{background:#fff;color:var(--ink);border:1.5px dashed var(--ink)}
.wcal{display:grid;grid-template-columns:88px repeat(7,minmax(0,1fr));gap:6px;min-width:900px}
.wcal .dh{font-size:12px;font-weight:600;color:var(--muted);padding:2px 4px}.wcal .dh.today{color:var(--olive)}
.wcal .band{font-size:12px;font-weight:600;color:var(--olive);text-transform:uppercase;letter-spacing:.1em;padding:10px 4px}
.wcal .band small{display:block;font-size:11px;color:var(--muted);text-transform:none;letter-spacing:0;font-weight:400;margin-top:2px}
.wcal .wc{background:var(--tile);border-radius:12px;padding:6px;min-height:76px;display:flex;flex-direction:column;gap:5px;cursor:pointer}
.wcal .wc.today{box-shadow:inset 0 0 0 2px var(--olive)}
.wcal .wc:hover{box-shadow:inset 0 0 0 2px var(--ink)}
.ws{background:#fff;border:0;border-radius:9px;padding:6px 8px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:1px;width:100%}
.ws b{font-size:13.5px}.ws span{font-size:12px;color:var(--muted)}
.ws.mg{background:var(--ink);color:#fff}.ws.mg span{color:var(--lime)}
.ws.draft{border:1.5px dashed var(--ink)}.ws.mine{box-shadow:0 0 0 2px var(--lime)}
.hrs{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px}.hrs span{background:var(--tile);border-radius:999px;padding:6px 12px;font-size:13px}.hrs b{font-variant-numeric:tabular-nums}
.ccal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;min-width:900px}
.ccal .cd{display:flex;flex-direction:column;gap:6px;min-width:0}
.ccal .cdh{padding:4px 2px 6px;border-bottom:2px solid var(--line)}.ccal .cdh b{font:800 20px Archivo,Arial,sans-serif;display:block}.ccal .cdh span{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
.ccal .cd.today .cdh{border-color:var(--lime)}.ccal .cd.today .cdh span{color:var(--olive);font-weight:600}
.cb{border:0;border-radius:12px;padding:9px 10px;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:3px;background:var(--tile);border-left:5px solid var(--ink);width:100%}
.cb:hover{box-shadow:0 0 0 2px var(--ink)}.cb.on{box-shadow:0 0 0 2px var(--olive)}.cb.past{opacity:.5}
.cb .ct2{font-size:12px;font-weight:600;color:var(--muted)}.cb b{font-size:14px;line-height:1.2}.cb .co{font-size:12px;color:var(--muted)}
.cb .fill{width:100%}
.legend2{display:flex;gap:8px;flex-wrap:wrap}.legend2 span{display:inline-flex;gap:6px;align-items:center;font-size:13px;background:#fff;border-radius:999px;padding:5px 12px}.legend2 i{width:10px;height:10px;border-radius:3px;display:inline-block}
.col{max-height:74vh;overflow:auto}
.lead .t2{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.age{font-size:11.5px;font-weight:600;border-radius:999px;padding:1px 8px;background:var(--tile);white-space:nowrap}.age.late{background:var(--warn);color:var(--warnInk)}
.mcal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;min-width:860px}
.mcal .dh{font-size:12px;font-weight:600;color:var(--muted);padding:2px 4px}
.mcal .dc{background:var(--tile);border-radius:12px;padding:6px;min-height:118px;display:flex;flex-direction:column;gap:3px;cursor:pointer}
.mcal .dc.out{background:none;cursor:default}.mcal .dc.today{box-shadow:inset 0 0 0 2px var(--olive)}
.mcal .dn{font:800 14px Archivo,Arial,sans-serif}.mcal .ms{font-size:11.5px;line-height:1.25;background:#fff;border-radius:6px;padding:2px 5px;border:0;text-align:left;cursor:pointer}
.ltabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.ltab{background:#fff;border:0;border-radius:16px;padding:12px 14px;text-align:left;cursor:pointer;font:inherit;color:inherit;display:flex;flex-direction:column;gap:2px;min-width:0}.ltab b{font:800 24px Archivo,Arial,sans-serif}.ltab small{font-size:13px;font-weight:600}.ltab span{font-size:12px;color:var(--muted)}.ltab.on{background:var(--ink);color:#fff}.ltab.on b{color:var(--lime)}.ltab.on span{color:var(--soft)}.ltabs.dim .ltab{opacity:.5}.lwrap{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:14px;align-items:start}.lside{position:sticky;top:14px;max-height:calc(100vh - 28px);overflow:auto}.lrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;padding:11px 6px;border:0;border-top:1px solid var(--line);cursor:pointer;background:none;width:100%;text-align:left;font:inherit;color:inherit;border-radius:0}.lrow:hover{background:var(--paper)}.lrow.on{background:var(--okbg)}.lrow .sub{font-size:13px;color:var(--muted);grid-column:1/-1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lgrp{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--olive);font-weight:600;padding:14px 6px 6px}.lgrp:first-child{padding-top:4px}.ptcard{background:#fff;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:10px;border:2px solid transparent}.ptcard.fresh{border-color:var(--lime)}.ptans{display:grid;grid-template-columns:120px minmax(0,1fr);gap:4px 10px;font-size:14px}.ptans dt{color:var(--muted)}.ptans dd{margin:0}.ptwho{display:flex;flex-wrap:wrap;gap:6px}.ptwho button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 12px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}.ptwho button span{color:var(--muted);font-weight:500;margin-left:4px}.ptwho button.on{background:var(--ink);color:var(--lime);border-color:var(--ink)}.ptwho button.on span{color:var(--soft)}.ptst{display:flex;flex-wrap:wrap;gap:6px}.tline{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--line);font-size:14px}
.citem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px;padding:12px 6px;border:0;border-top:1px solid var(--line);background:none;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer}.citem:hover{background:var(--paper)}.citem.on{background:var(--okbg)}.citem .pr{font:800 18px Archivo,Arial,sans-serif;text-align:right}.citem .sub{font-size:13px;color:var(--muted)}.cform .grid2{gap:10px}.cform .chk{display:flex;gap:8px;align-items:center;font-size:14px}
.emc{background:#fff;border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:8px}.emc .top{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}.emc .nums{display:flex;gap:18px;flex-wrap:wrap;font-size:14px}.emc .nums b{font:800 20px Archivo,Arial,sans-serif;display:block}.emframe{width:100%;height:620px;border:1px solid var(--line);border-radius:16px;background:#F3F3F0}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.pbtn{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px;text-align:left;cursor:pointer;font:inherit;color:inherit;display:flex;flex-direction:column;gap:4px;min-height:74px}.pbtn:hover{border-color:var(--ink)}.pbtn b{font-size:14px;line-height:1.25}.pbtn span{font:800 16px Archivo,Arial,sans-serif}.pbtn.off{opacity:.45}.pbtn.edit{border-style:dashed}.cline{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:8px 0;border-top:1px solid var(--line);font-size:14px}.cline .q{display:flex;align-items:center;gap:6px}.cline .q button{width:28px;height:28px;border-radius:50%;border:1px solid var(--line);background:#fff;cursor:pointer;font-weight:700}.ctot{display:flex;justify-content:space-between;align-items:baseline;font:800 26px Archivo,Arial,sans-serif;padding-top:8px;border-top:2px solid var(--ink)}
.bcal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.bcal .bd{background:var(--tile);border:0;border-radius:12px;padding:8px;text-align:left;cursor:pointer;min-height:66px;display:flex;flex-direction:column;gap:2px;font:inherit;color:inherit}.bcal .bd b{font-size:12px;color:var(--muted);font-weight:600}.bcal .bd .c{font-size:18px;font-weight:700}.bcal .bd .t{font-size:12px;color:var(--muted)}.bcal .bd.on{background:var(--ink);color:#fff}.bcal .bd.on .c{color:var(--lime)}.bcal .bd.on b,.bcal .bd.on .t{color:var(--soft)}.bcal .bd.wk b{color:var(--olive)}.bcal .bd.zero{opacity:.55}.bsteps div{display:flex;gap:10px;align-items:center;font-size:14px;padding:6px 0;border-bottom:1px solid var(--line)}.bsteps div:last-child{border:0}.bsteps i{width:22px;height:22px;border-radius:50%;border:2px solid var(--line);display:grid;place-items:center;font-style:normal;font-size:12px;flex:none}.bsteps .y i{background:var(--lime);border-color:var(--lime)}.bform{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;background:var(--tile);border-radius:14px;padding:12px}.bform .fld{flex:1;min-width:130px}
.mcal .ms.mg{background:var(--ink);color:var(--lime)}.mcal .ms.draft{border:1px dashed var(--ink)}
.shift.mine{box-shadow:0 0 0 2px var(--lime)}
[hidden]{display:none!important}a.btn,label.btn{text-decoration:none;display:inline-flex;align-items:center}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
@media (max-width:700px){.bcal{grid-template-columns:repeat(4,minmax(0,1fr))}.ltabs{grid-template-columns:repeat(5,minmax(120px,1fr));overflow-x:auto}.ptans{grid-template-columns:1fr}}
@media (max-width:900px){.lwrap{grid-template-columns:1fr}.lside{position:static;max-height:none}}
@media (max-width:900px){.prof,.row3{grid-template-columns:1fr}.wall{grid-template-columns:1fr}.funnel div{grid-template-columns:110px minmax(0,1fr) 70px}.navlab{display:none}.hb{grid-template-columns:minmax(0,110px) minmax(0,1fr) 50px}.app{grid-template-columns:1fr}aside{position:static;height:auto;flex-direction:column;align-items:stretch;gap:10px;padding:12px}nav{flex-direction:row;overflow-x:auto;gap:4px;padding-bottom:2px;min-width:0;max-width:100%}aside{min-width:0;max-width:100vw}.nav{width:auto;white-space:nowrap;padding:8px 12px}.me{display:none}.row2{grid-template-columns:1fr}.board{grid-template-columns:repeat(2,minmax(0,1fr))}main{padding:18px 14px 40px}}
@media (prefers-reduced-motion:no-preference){.card{animation:none}}
</style></head><body>
<div class="app">
<aside>
<img src="https://m2club.co.nz/assets/img/m2-logo-lime.png" alt="M2 Training Club">
<nav aria-label="Main">
<button class="nav on" data-go="today">Today<span class="ct" id="ctToday" hidden></span></button>
<div class="navlab">Front desk</div>
<button class="nav" data-go="members">Members</button>
<button class="nav" data-go="add" id="navAdd" hidden>Add member</button>
<button class="nav" data-go="pos" id="navPos" hidden>Point of sale</button>
<button class="nav" data-go="tag">Key tag lookup</button>
<div class="navlab">Leads</div>
<button class="nav" data-go="leads">Member leads<span class="ct" id="ctLeads" hidden></span></button>
<button class="nav" data-go="ptleads" id="navPt" hidden>PT leads<span class="ct" id="ctPt" hidden></span></button>
<button class="nav" data-go="mypt" id="navMyPt" hidden>My PT leads<span class="ct" id="ctMyPt" hidden></span></button>
<div class="navlab">Classes and team</div>
<button class="nav" data-go="classes">Classes</button>
<button class="nav" data-go="roster">Roster</button>
<div class="navlab">Memberships and billing</div>
<button class="nav" data-go="catalog" id="navCat" hidden>Memberships and prices</button>
<button class="nav" data-go="billing" id="navBill" hidden>Billing</button>
<button class="nav" data-go="collections" id="navCol" hidden>Money owed</button>
<button class="nav" data-go="passport" id="navFp" hidden>Fitness Passport</button>
<div class="navlab">Members' app and emails</div>
<button class="nav" data-go="emails" id="navEm" hidden>Email automations</button>
<button class="nav" data-go="app" id="navApp" hidden>M2 App</button>
<div class="navlab">The business</div>
<button class="nav" data-go="money" id="navMoney" hidden>Money</button>
<button class="nav" data-go="growth" id="navGrowth" hidden>Growth</button>
<button class="nav" data-go="marketing" id="navMkt" hidden>Marketing</button>
<button class="nav" data-go="reports" id="navReports" hidden>Reports</button>
<div class="navlab">Admin</div>
<button class="nav" data-go="staff" id="navStaff" hidden>Staff and access</button>
<button class="nav" data-go="import" id="navImport" hidden>Import from GymMaster</button>
<button class="nav" data-go="settings" id="navSettings" hidden>Settings</button>
</nav>
<div class="me"><div class="av" id="meAv"></div><div><span id="meName"></span><small id="meRole"></small></div></div>
</aside>

<main>

<!-- TODAY -->
<section data-view="today">
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:18px">
<div style="margin-right:auto"><div class="eyebrow" id="todayDate"></div><h1 id="hello">Today<span class="dot">.</span></h1></div>
<button class="btn" data-go="add" id="addTop" hidden>Add member</button>
</div>
<section class="card dark" id="biz" hidden style="margin-bottom:18px">
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="eyebrow">The business</span><span class="muted" style="color:var(--soft)">Only you and Tim see this</span><span class="muted" style="color:#8C8C84;margin-left:auto" id="sync"></span></div>
<div class="tiles" id="bizTiles"></div>
</section>
<section class="card" id="morning" hidden style="margin-bottom:18px"></section>
<div class="row2">
<section class="card">
<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>Do this today</h2><span class="muted" id="doneToday"></span></div>
<div id="jobs"><div class="muted">Loading the day...</div></div>
</section>
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card" id="jobPanel" hidden></section>
<section class="card" id="recentCard" hidden><h2>Joined lately</h2><div class="list" id="recent"></div></section>
</div>
</div>
<div class="row3" style="margin-top:18px">
<section class="card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>Recent visits</h2><span class="muted" id="rvCount"></span></div><div id="rvList"><div class="muted">Loading...</div></div></section>
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>On the desk today</h2><div id="tdDesk"><div class="muted">Loading...</div></div></section>
<section class="card"><h2>Today's classes</h2><div id="tdClasses"><div class="muted">Loading...</div></div></section>
<section class="card"><h2>Birthdays today</h2><div id="tdBday"></div></section>
</div>
</div>
</section>

<!-- MEMBERS -->
<section data-view="members" hidden>
<div id="mList">
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px"><div style="margin-right:auto"><div class="eyebrow">Everyone in GymMaster and the Core</div><h1>Members<span class="dot">.</span></h1></div><span class="muted" id="mCount"></span></div>
<div class="mtool">
<label class="search" for="q" style="flex:1;min-width:220px"><span class="sr">Search members</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5B5B55" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><input id="q" autocomplete="off" placeholder="Name, email, mobile or member number"></label>
<label class="sr" for="mSort">Sort</label><select id="mSort"><option value="updated">Last updated</option><option value="name">Name A to Z</option><option value="joined">Newest members</option><option value="visits">Most visits this month</option><option value="newest">Newest in GymMaster</option></select>
<div class="seg" role="group" aria-label="Layout"><button class="on" data-mv="grid">Cards</button><button data-mv="list">List</button></div>
</div>
<div class="chips" id="mTabs" style="margin:14px 0 16px"></div>
<div id="mWall" class="wall"><div class="muted">Loading...</div></div>
<div style="text-align:center;margin-top:16px"><button class="btn line" id="mMore" hidden>Show more</button></div>
</div>
<div id="mProf" hidden><button class="btn line sm" id="mBack" style="margin-bottom:14px">All members</button><div id="profile" class="prof"></div></div>
</section>

<!-- LEADS -->
<section data-view="leads" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px">
<div style="margin-right:auto"><div class="eyebrow">Every source, one inbox</div><h1>Leads<span class="dot">.</span></h1></div>
<button class="btn line" id="newLeadBtn" hidden>Add a lead</button>
</div>
<section class="card dark" style="margin-bottom:14px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="eyebrow">Last 30 days</span><span class="muted" style="color:var(--soft)" id="lsNote"></span><button class="btn sm" id="lsRefresh" hidden style="margin-left:auto">Refresh leads</button></div><div class="tiles" id="lsTiles"></div></section>
<details class="card" style="margin-bottom:14px"><summary style="cursor:pointer;font-weight:600">Where leads come from</summary><div class="row3" style="margin-top:12px;grid-template-columns:repeat(3,minmax(0,1fr))"><div><h3>By type</h3><div id="lsKind"></div></div><div><h3>By source</h3><div id="lsSource"></div></div><div><h3>Leads by week</h3><div id="lsWeeks"></div></div></div></details>
<section class="card" id="newLeadCard" hidden style="margin-bottom:14px">
<h2>Add a lead</h2>
<div class="grid2">
<label class="fld">Name<input id="nlName" autocomplete="off"></label>
<label class="fld">Mobile<input id="nlMobile" inputmode="tel" autocomplete="off"></label>
<label class="fld">Email<input id="nlEmail" type="email" autocomplete="off"></label>
<label class="fld">Type<select id="nlKind"><option value="walk_in">Walk in</option><option value="free_pt">Free PT (goes to Tim)</option><option value="website_form">Enquiry</option><option value="bring_a_mate">Bring a Mate</option></select></label>
<label class="fld">Goal<input id="nlGoal" autocomplete="off"></label>
<label class="fld">Where did they hear about us<select id="nlSource"><option value="">Pick one</option></select></label>
</div>
<label class="fld">Notes<textarea id="nlNotes"></textarea></label>
<div class="err" id="nlErr"></div>
<div style="display:flex;gap:8px"><button class="btn dark" id="nlSave">Save lead</button><button class="btn line" id="nlCancel">Cancel</button></div>
</section>
<div class="ltabs" id="lTabs"></div>
<div class="mtool" style="margin:12px 0"><label class="sr" for="lKind">Type</label><select id="lKind"></select><label class="search" for="lQ" style="flex:1;min-width:200px;height:48px"><span class="sr">Search leads</span><input id="lQ" autocomplete="off" placeholder="Search everyone by name, mobile or email"></label></div>
<div class="lwrap"><section class="card" style="padding:8px 14px 14px"><div id="lList"><div class="muted">Loading...</div></div></section><section class="card lside" id="leadPanel"></section></div>
</section>

<!-- POINT OF SALE -->
<section data-view="pos" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:12px">
<div style="margin-right:auto"><div class="eyebrow">Sell at the desk</div><h1>Point of sale<span class="dot">.</span></h1></div>
<button class="btn line" id="posEditBtn">Edit products</button>
</div>
<div class="warnbox" style="margin-bottom:12px">Ready to use. Until GymMaster's point of sale is switched off, sales here don't show in GymMaster or Xero, so pick one place to ring sales through.</div>
<div class="lwrap">
<div style="display:flex;flex-direction:column;gap:12px;min-width:0">
<div class="mtool"><div class="chips" id="posCats"></div><label class="search" for="posQ" style="flex:1;min-width:180px;height:44px"><span class="sr">Find a product</span><input id="posQ" autocomplete="off" placeholder="Find a product"></label></div>
<div id="posEditBar" hidden><div class="ok" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">Tap a product to change it. <button class="btn dark sm" id="posAdd">Add a product</button></div></div>
<div class="pgrid" id="posGrid"><div class="muted">Loading...</div></div>
</div>
<section class="card lside" id="posCart"></section>
</div>
<section class="card" style="margin-top:18px"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2 style="margin-right:auto">Sales</h2><input type="date" id="posDay" style="height:40px;border:1px solid var(--line);border-radius:12px;padding:0 10px"></div><div class="tiles" id="posTotals"></div><div style="overflow-x:auto" id="posSales"></div></section>
</section>

<!-- EMAIL AUTOMATIONS -->
<section data-view="emails" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Ready to take over from GymMaster, one at a time</div><h1>Email automations<span class="dot">.</span></h1></div>
<span class="pill dark" id="emMode"></span>
</div>
<section class="card dark" style="margin-bottom:18px"><div id="emBanner" style="color:var(--soft);font-size:14px"></div><div class="tiles" id="emTiles"></div></section>
<div class="lwrap"><div id="emList" style="display:flex;flex-direction:column;gap:12px;min-width:0"><div class="muted">Loading...</div></div>
<section class="card lside" id="emEdit"><h2>Pick an automation</h2><p class="muted" style="margin:0">Change the words, see exactly how it looks, and send yourself a test.</p></section></div>
</section>

<!-- MEMBERSHIPS AND PRICES -->
<section data-view="catalog" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">What M2 sells. Anyone on the team can change it, and every change is logged</div><h1>Memberships and prices<span class="dot">.</span></h1></div>
<button class="btn dark" id="catNew">Add something new</button>
</div>
<div class="chips" id="catTabs" style="margin-bottom:12px"></div>
<div class="lwrap"><section class="card" style="padding:8px 14px 14px"><div id="catList"><div class="muted">Loading...</div></div></section>
<section class="card lside cform" id="catForm"><h2>Pick something to change</h2><p class="muted" style="margin:0">Tap any membership, trial or pass to change its price, name, lock-in or anything else. Members already on it keep their price.</p></section></div>
<section class="card" style="margin-top:18px"><h2>Recent changes</h2><div class="hist" id="catLog"></div></section>
</section>

<!-- PT LEADS (owners) -->
<section data-view="ptleads" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Free PT questionnaire. Only you and Tim see this</div><h1>PT leads<span class="dot">.</span></h1></div>
<button class="btn line" id="ptSync">Check for new ones</button>
</div>
<section class="card dark" style="margin-bottom:18px"><div class="tiles" id="ptTiles"></div><div class="muted" style="color:var(--soft);font-size:13px" id="ptNote"></div></section>
<div class="row2">
<div style="display:flex;flex-direction:column;gap:12px;min-width:0"><h2 style="margin:0">Waiting for you</h2><div id="ptWait" style="display:flex;flex-direction:column;gap:12px"><div class="muted">Loading...</div></div></div>
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>Trainers</h2><div class="muted" style="font-size:13px">Open leads now, given out in the last 30 days, clients won in 90 days. The bell means their phone gets a buzz.</div><div id="ptTrainers"></div></section>
<section class="card" id="ptPushCard"><h2>Buzz my phone for new leads</h2><div id="ptPush"></div></section>
</div>
</div>
<section class="card" style="margin-top:18px"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2 style="margin-right:auto">With the trainers</h2><div class="chips" id="ptTabs"></div></div><div style="overflow-x:auto" id="ptOpen"></div><div id="ptMove"></div></section>
</section>

<!-- MY PT LEADS (trainers) -->
<section data-view="mypt" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Free PT leads Tim has given you</div><h1>My PT leads<span class="dot">.</span></h1></div>
<section class="card" style="margin-bottom:14px" id="myPushCard"><h2>Get a buzz when Tim gives you a lead</h2><div id="myPush"></div></section>
<div id="myPt" style="display:flex;flex-direction:column;gap:12px"><div class="muted">Loading...</div></div>
</section>

<!-- ROSTER -->
<section data-view="roster" hidden>
<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Reception team. Pay stays in Smartpay</div><h1>Roster<span class="dot">.</span></h1></div>
<div class="seg" role="group" aria-label="View"><button class="on" data-rv="week">Week</button><button data-rv="month">Month</button></div><button class="btn line sm" id="roPrev">Back</button><button class="btn line sm" id="roNow">Now</button><button class="btn line sm" id="roNext">Forward</button>
</div>
<section class="card dark" style="margin-bottom:18px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="eyebrow" id="roTitle"></span><span class="muted" style="color:var(--soft)" id="roNote"></span>
<span style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap" id="roTools" hidden><button class="btn line sm" id="roCopy" style="color:#fff;border-color:#fff">Copy last week</button><a class="btn line sm" id="roCsv" style="color:#fff;border-color:#fff">Download hours</a><button class="btn sm" id="roPub">Publish</button></span></div>
<div class="tiles" id="roTiles"></div></section>
<section class="card"><div style="overflow-x:auto"><div class="wcal" id="roGrid"></div></div><p class="muted" style="margin:0" id="roHelp"></p><div class="hrs" id="roHours"></div></section>
<div class="row2" style="margin-top:18px">
<section class="card" id="roEdit" hidden></section>
<section class="card"><h2>Days off and swaps</h2><div class="list" id="roReq"></div>
<div class="grid2" style="margin-top:8px"><label class="fld">Day<input type="date" id="raDay"></label><label class="fld">What<select id="raKind"><option value="leave">Day off</option><option value="swap">Swap a shift</option><option value="available">I can do extra</option></select></label></div>
<label class="fld">Note<input id="raNote" placeholder="Anything Bekka should know"></label><div class="err" id="raErr"></div><button class="btn dark sm" id="raSave" style="align-self:flex-start">Ask</button></section>
</div>
</section>

<!-- KEY TAG LOOKUP -->
<section data-view="tag" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Found a tag?</div><h1>Key tag lookup<span class="dot">.</span></h1></div>
<section class="card" style="max-width:560px">
<label class="sr" for="lookTag">Key tag number</label>
<input id="lookTag" class="tagbox" autocomplete="off" placeholder="Scan tag">
<div id="lookRes"></div>
</section>
</section>

<!-- REPORTS -->
<section data-view="reports" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:14px">
<div style="margin-right:auto"><div class="eyebrow">Your GymMaster favourites</div><h1>Reports<span class="dot">.</span></h1></div>
<a class="btn line" id="repCsv" href="#">Download CSV</a>
</div>
<div class="chips" id="repKinds" style="margin-bottom:12px"></div>
<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px;align-items:flex-end"><span id="repDates" style="display:flex;gap:10px;flex-wrap:wrap" hidden><label class="fld">From<input type="date" id="repFrom"></label><label class="fld">To<input type="date" id="repTo"></label></span><label class="search" for="repQ" style="flex:1;min-width:200px;height:48px"><span class="sr">Search this report</span><input id="repQ" autocomplete="off" placeholder="Search this report"></label></div>
<section class="card"><div style="display:flex;align-items:baseline;gap:10px"><h2 id="repTitle">Report</h2><span class="muted" id="repCount"></span></div><div style="overflow-x:auto" id="repTable"><div class="muted">Loading...</div></div></section>
</section>

<!-- STAFF -->
<section data-view="staff" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Owners only</div><h1>Staff and access<span class="dot">.</span></h1></div>
<div class="row2">
<section class="card"><h2>Team</h2><p class="muted" style="margin:0">Everyone signs in with their own email and a code. Their role decides what they see: only owners see business numbers, trainers see only their own clients.</p><div class="list" id="staffList"><div class="muted">Loading...</div></div></section>
<section class="card"><h2 id="stTitle">Add someone</h2>
<input type="hidden" id="stId">
<label class="fld">Name<input id="stName" autocomplete="off"></label>
<label class="fld">Email they sign in with<input id="stEmail" type="email" autocomplete="off"></label>
<label class="fld">Role<select id="stRole"><option value="reception">Reception</option><option value="trainer">Trainer</option><option value="coach">Coach</option><option value="manager">Manager</option><option value="owner">Owner</option></select></label>
<label class="fld">Order for free PT leads (lower gets them first)<input id="stOrder" type="number" value="100"></label>
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="stActive" checked> Can sign in</label>
<div class="err" id="stErr"></div><div id="stOk"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="stSave">Save</button><button class="btn line" id="stNew">Clear</button></div>
<p class="muted" style="margin:0;font-size:13px">People with an @m2club.co.nz email can sign in straight away. Anyone on Gmail or another address also needs adding to the sign-in rule in Cloudflare (Zero Trust, Access, m2-core policy).</p>
</section>
</div>
</section>

<!-- CLASSES -->
<section data-view="classes" hidden>
<div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Live from GymMaster, the same as the M2 App</div><h1>Classes<span class="dot">.</span></h1></div>
<button class="btn line sm" id="clsPrev">Last week</button><button class="btn line sm" id="clsNow">This week</button><button class="btn line sm" id="clsNext">Next week</button>
</div>
<section class="card dark" style="margin-bottom:18px"><div class="tiles" id="clsTiles"></div></section>
<section class="card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2 id="clsTitle">This week</h2><span class="muted" id="clsCount"></span><span style="margin-left:auto" class="legend2" id="clsLegend"></span></div><div id="clsNote2"></div><div style="overflow-x:auto"><div id="clsWeek"><div class="muted">Loading...</div></div></div></section>
<div class="row2" style="margin-top:18px;grid-template-columns:minmax(0,1fr)">
<section class="card" id="clsPanel"><h2>Pick a class</h2><p class="muted" style="margin:0">See who's booked with their photos, and book people in or cancel them. Members who owe $250 or more can't be booked until it's paid.</p></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>How full each class runs</h2><span class="muted" id="csNote"></span></div><div id="csName"></div></section>
<section class="card"><h2>By coach</h2><div id="csCoach"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>By time of day</h2><div id="csHour"></div></section>
<section class="card"><h2>Bookings by week</h2><div id="csWeek"></div><h3 style="margin-top:8px">By day</h3><div id="csDay"></div></section>
</div>
</section>

<!-- MONEY OWED -->
<section data-view="collections" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Real balances, checked in GymMaster all day</div><h1>Money owed<span class="dot">.</span></h1></div>
</div>
<section class="card dark" style="margin-bottom:18px"><div class="tiles" id="colTiles"></div><div class="muted" style="color:var(--soft)" id="colNote"></div><div class="muted" style="color:var(--soft)" id="colRules"></div></section>
<div class="chips" id="colTabs" style="margin-bottom:12px"></div>
<div class="row2">
<section class="card"><div style="overflow-x:auto" id="colTable"><div class="muted">Loading...</div></div></section>
<section class="card" id="colPanel"><h2>Pick someone</h2><p class="muted" style="margin:0">Call, record what they said, and settle or refer. Everything is logged on their profile.</p></section>
</div>
</section>

<!-- BILLING -->
<section data-view="billing" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow" id="bilEye">Direct debits, ready for Ezidebit</div><h1>Billing<span class="dot">.</span></h1></div>
<span class="pill dark" id="bilMode"></span>
</div>
<section class="card dark" style="margin-bottom:18px"><div id="bilBanner" style="color:var(--soft);font-size:14px"></div><div class="tiles" id="bilTiles"></div></section>
<div class="row2">
<section class="card"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2 style="margin-right:auto">The next four weeks</h2><span class="muted" style="font-size:13px">Tap a day to see who's debited</span></div><div class="bcal" id="bilCal"></div><div id="bilDay"></div></section>
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>Getting to live</h2><div class="bsteps" id="bilSteps"></div></section>
<section class="card"><h2>Failed payments</h2><div id="bilFailed"><div class="muted">Loading...</div></div></section>
</div>
</div>
<section class="card" style="margin-top:18px"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2 style="margin-right:auto">Ready check</h2><span class="muted" id="bilReadyNote" style="font-size:13px"></span></div><p class="muted" style="margin:0">Everything that would stop a clean move off GymMaster. Fix these in GymMaster or on the member, and they drop off here.</p><div class="chips" id="bilReadyTabs"></div><div style="overflow-x:auto" id="bilReady"><div class="muted">Checking...</div></div></section>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>What changed</h2><div class="hist" id="bilLog"></div></section>
<section class="card" id="bilRulesCard" hidden><h2>Rules</h2>
<div class="grid2"><label class="fld">Send debits this many days ahead<input id="brLead" type="number" min="1" max="7"></label><label class="fld">Failed payment fee ($, 0 for none)<input id="brFee" type="number" min="0" max="50" step="0.5"></label><label class="fld">Retry a failed debit after (days)<input id="brRetry" type="number" min="1" max="14"></label><label class="fld">Retries before it goes to Money owed<input id="brMax" type="number" min="0" max="5"></label></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark sm" id="brSave">Save rules</button><button class="btn line sm" id="brTest">Test Ezidebit connection</button><button class="btn line sm" id="brRun">Run tonight's billing now</button></div><div id="brMsg"></div></section>
</div>
</section>

<!-- MONEY -->
<section data-view="money" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Xero and the Core. Only you and Tim see this</div><h1>Money<span class="dot">.</span></h1></div>
<span class="muted" id="monUpd"></span>
</div>
<section class="card dark" style="margin-bottom:18px"><div id="monGoal"></div><div class="tiles" id="monTiles"></div></section>
<div class="row2">
<section class="card"><h2>Income and costs by month</h2><div id="monChart"></div></section>
<section class="card"><h2>Cash and bills</h2><dl class="kv" id="monPoints"></dl></section>
</div>
<section class="card" style="margin-top:18px"><h2>Profit and loss</h2><div style="overflow-x:auto" id="monTable"></div></section>
<section class="card" style="margin-top:18px" id="monLinesCard" hidden><h2 id="monLinesTitle">Where the money went</h2><div class="row2" id="monLines"></div></section>
</section>

<!-- GROWTH -->
<section data-view="growth" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Members, joins, leaves and trials</div><h1>Growth<span class="dot">.</span></h1></div>
<section class="card dark" style="margin-bottom:18px"><div class="tiles" id="grTiles"></div></section>
<div class="row2">
<section class="card"><div style="display:flex;align-items:baseline;gap:10px"><h2>Members</h2><span class="muted" id="grLineNote"></span></div><div class="line" id="grLine"></div></section>
<section class="card"><h2>Membership mix</h2><div id="grMix"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Joins and leaves by month</h2><div id="grJoins"></div></section>
<section class="card"><h2>Where new members came from</h2><p class="muted" style="margin:0">Last 90 days</p><div id="grSources"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Trials and passes</h2><div style="overflow-x:auto" id="grTrials"></div></section>
<section class="card"><h2>Leads, last 90 days</h2><div id="grLeads"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Who trains here</h2><div class="row2" style="gap:14px"><div><h3>Age</h3><div id="grAge"></div></div><div><h3>Gender</h3><div id="grGender"></div></div></div></section>
<section class="card"><h2>Where they live</h2><div id="grSuburbs"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>How long they've been with us</h2><div id="grTenure"></div></section>
<section class="card"><h2>Weekly billing by membership</h2><div id="grRevenue"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Are they using it</h2><p class="muted" style="margin:0" id="grUsageNote"></p><div style="overflow-x:auto" id="grUsage"></div></section>
<section class="card"><h2>Joins by membership, last 6 months</h2><div style="overflow-x:auto" id="grJoinFam"></div></section>
</div>
</section>

<!-- MARKETING -->
<section data-view="marketing" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Meta, Google Analytics and who actually joined</div><h1>Marketing<span class="dot">.</span></h1></div>
<label class="fld" style="min-width:170px">Month<input type="month" id="mkMonth"></label>
</div>
<section class="card dark" style="margin-bottom:18px"><div id="mkBudget"></div><div class="tiles" id="mkTiles"></div><div class="muted" style="color:var(--soft)" id="mkNote"></div></section>
<div class="row2">
<section class="card"><h2>Spend by day</h2><div id="mkDaily"></div></section>
<section class="card"><h2>Last 6 months</h2><div id="mkTrend"></div></section>
</div>
<section class="card" style="margin-top:18px"><h2>Campaigns</h2><div style="overflow-x:auto" id="mkCamps"></div></section>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Who joined, by where they heard about us</h2><div id="mkJoins"></div></section>
<section class="card"><h2>Website visits by channel</h2><div style="overflow-x:auto" id="mkWeb"></div></section>
</div>
<section class="card" style="margin-top:18px"><h2>Leads in the Core by source</h2><div id="mkLeads"></div></section>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>From ad to member</h2><p class="muted" style="margin:0">This month. Website visits are paid channels only; leads and joins are the ones who said Instagram or Facebook.</p><div class="funnel" id="mkFunnel"></div></section>
<section class="card"><h2>Worth knowing</h2><div class="tips" id="mkTips"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>This month against last</h2><div style="overflow-x:auto" id="mkVs"></div></section>
<section class="card"><h2>Best days for ads</h2><p class="muted" style="margin:0">Cost per website visit by day of the week, last 8 weeks</p><div id="mkWeekday"></div></section>
</div>
</section>

<!-- SETTINGS -->
<!-- M2 APP -->
<section data-view="app" hidden>
<div class="eyebrow">The member app</div><h1>M2 App<span class="dot">.</span></h1>
<p class="muted" style="max-width:720px">The app on members' phones now talks to the Core. The Core answers sign-in, their details, classes, bookings, doors and requests itself, and passes Strava and Coach mode to the old Google service. Start with staff only, check it on your own phone, then switch it on for everyone. You can switch back at any time and nobody gets signed out.</p>
<div class="tiles" id="apTiles" style="margin:14px 0"></div>
<div class="row2">
<section class="card"><h2>Who the Core serves</h2><div id="apMode"></div><div id="apReady"></div></section>
<section class="card"><h2>Doors</h2><p class="muted" style="font-size:14px">Door numbers from GymMaster. Leave a door blank and the old service keeps opening it.</p><div id="apDoors"></div></section>
</div>
<section class="card" style="margin-top:18px"><h2>Requests from the app</h2><p class="muted" style="font-size:14px">Delete my account, upgrade requests and feedback. Owners and the manager get a notification.</p><div style="overflow-x:auto" id="apReq"></div></section>
<section class="card" style="margin-top:18px"><h2>Doors opened from the app</h2><div style="overflow-x:auto" id="apDoorLog"></div></section>
<section class="card" style="margin-top:18px"><h2>See what a member sees</h2><div class="mtool"><input id="apPrevId" inputmode="numeric" placeholder="Member number" style="height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px;width:180px"><button class="btn line" id="apPrevGo">Show</button></div><div id="apPrev"></div></section>
</section>

<section data-view="settings" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Owners only</div><h1>Settings<span class="dot">.</span></h1></div>
<div class="row2">
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>Club rules</h2><p class="muted" style="margin:0">Change a number and press Save. It applies straight away and is logged.</p><div id="setRules"></div></section>
<section class="card"><h2>Club details</h2><dl class="kv" id="setClub"></dl></section>
</div>
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>Money, marketing and backups</h2><div id="setFeeds"><div class="muted">Loading...</div></div></section>
<section class="card"><h2>Connections</h2><div class="list" id="setInt"></div></section>
<section class="card"><h2>Last copies</h2><div class="hist" id="setSync"></div></section>
</div>
</div>
<section class="card" style="margin-top:18px"><h2>Membership types</h2><p class="muted" style="margin:0">GymMaster's types and the plan each one counts as in the Core. Prices and new types still come from GymMaster while it bills.</p><div style="overflow-x:auto" id="setPlans"></div></section>
</section>

<!-- IMPORT -->
<section data-view="import" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Owners only</div><h1>Import from GymMaster<span class="dot">.</span></h1></div>
<section class="card" style="max-width:760px">
<p style="margin:0">In GymMaster run <b>Report &amp; Till → Current Memberships</b> for today, with the <b>Fitness Passport ID</b> column added, and export it as CSV. Pick it below. Run it again any time: members are updated, nothing staff did in the Core is lost.</p>
<label class="fld">Current members (CSV, required)<input type="file" id="impCur" accept=".csv,text/csv"></label>
<label class="fld">Trial history (optional: the same report from 1 Jan 2024 to today)<input type="file" id="impHist" accept=".csv,text/csv"></label>
<div id="impSum" class="muted"></div>
<div class="err" id="impErr"></div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn dark" id="impGo" disabled>Import</button><span class="muted" id="impProg"></span></div>
<div class="list" id="impDone"></div>
</section>
</section>

<!-- FITNESS PASSPORT -->
<section data-view="passport" hidden>
<div style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px">
<div style="margin-right:auto"><div class="eyebrow">Paid per visit, matched on the Passport ID</div><h1>Fitness Passport<span class="dot">.</span></h1></div>
<label class="fld" style="min-width:170px">Month<input type="month" id="fpMonth"></label>
<a class="btn line" id="fpCsv" href="#">Download visits (CSV)</a>
</div>
<section class="card dark" style="margin-bottom:18px"><div class="tiles" id="fpTiles"></div><div class="muted" style="color:var(--soft)" id="fpNote"></div></section>
<div class="row2">
<div style="display:flex;flex-direction:column;gap:18px;min-width:0">
<section class="card"><h2>Visits Passport can't pay for</h2><p class="muted" style="margin:0">Passport members who trained this month with no Passport ID on file. Add the ID and these visits count.</p><div class="list" id="fpNoId"></div></section>
<section class="card" id="fpDupCard" hidden><h2>Same ID on two people</h2><p class="muted" style="margin:0">Every person has their own Passport ID. Check their cards.</p><div class="list" id="fpDup"></div></section>
</div>
<section class="card" id="fpCheckCard"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2 style="margin-right:auto">Core count against GymMaster</h2><button class="btn line sm" id="fpCheckRun">Check this month again</button></div><p class="muted" style="margin:0 0 10px">Before the Core sends Passport visits itself, its count has to match GymMaster's for every member. Checked automatically for last month on the 2nd.</p><div id="fpCheck"><div class="muted">Loading...</div></div></section>
<section class="card"><h2>Every Passport visit</h2><div class="list" id="fpRows"><div class="muted">Loading...</div></div></section>
</div>
<section class="card dark" style="margin-top:18px"><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span class="eyebrow">This month from GymMaster's visit counts</span><span class="muted" style="color:var(--soft)" id="fpNowNote"></span></div><div class="tiles" id="fpNowTiles"></div></section>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Visits and pay by month</h2><div id="fpMonthsChart"></div><div style="overflow-x:auto" id="fpMonthsTbl"></div></section>
<section class="card"><h2>How often Passport members train</h2><p class="muted" style="margin:0" id="fpFreqNote"></p><div id="fpFreq"></div><h3 style="margin-top:10px">New Passport members by month</h3><div id="fpJoins"></div></section>
</div>
<div class="row2" style="margin-top:18px">
<section class="card"><h2>Stopped coming</h2><p class="muted" style="margin:0" id="fpSleepNote"></p><div class="list" id="fpSleep"></div></section>
<section class="card"><h2>Most visits last month</h2><div class="list" id="fpTop"></div></section>
</div>
</section>

<!-- ADD MEMBER -->
<section data-view="add" hidden>
<div style="margin-bottom:16px"><div class="eyebrow">Goes into GymMaster and the Core together</div><h1>Add a member<span class="dot">.</span></h1></div>
<div id="a1" style="display:flex;flex-direction:column;gap:18px">
<section class="card">
<h2><span class="stepn">1</span>Membership</h2>
<div class="chips" id="fam"></div>
<div class="chips" id="freq"></div>
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="flexi"> Flexi (+$5 a week, 30 days notice, no lock-in)</label>
<div class="plans" id="plans"><div class="muted">Loading memberships from GymMaster...</div></div>
</section>
<section class="card">
<h2><span class="stepn">2</span>Their details</h2>
<div class="photoRow"><div class="face" id="aFace">?</div><div style="display:flex;flex-direction:column;gap:6px"><b>Photo</b><span class="muted" style="font-size:13px">So every staff member knows the name to the face.</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn dark sm" id="aPhotoBtn">Take photo</button><label style="display:flex;gap:6px;align-items:center;font-size:13px"><input type="checkbox" id="aNoPhoto"> Not today, take it next visit</label></div></div></div>
<div class="grid2">
<label class="fld">First name<input id="first" autocomplete="off"></label>
<label class="fld">Last name<input id="last" autocomplete="off"></label>
<label class="fld">Email<input id="email" type="email" autocomplete="off"></label>
<label class="fld">Mobile<input id="mobile" inputmode="tel" autocomplete="off"></label>
<label class="fld">Date of birth<input id="dob" type="date"></label>
<label class="fld">Gender<select id="gender"><option value="">Prefer not to say</option><option value="F">Female</option><option value="M">Male</option><option value="O">Other</option></select></label>
<label class="fld">Main goal<select id="goal"><option value="">Pick one</option></select></label>
<label class="fld">Where did they hear about us<select id="source"><option value="">Pick one</option></select></label>
<label class="fld">Emergency contact name<input id="ename" autocomplete="off"></label>
<label class="fld">Emergency contact phone<input id="ephone" inputmode="tel" autocomplete="off"></label>
</div>
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="passport"> Fitness Passport member (no M2 offers or trials)</label>
<div id="fpWrap" hidden class="warnbox" style="display:flex;flex-direction:column;gap:8px"><label class="fld">Fitness Passport ID (compulsory)<input id="fpid" inputmode="numeric" autocomplete="off" placeholder="The number on their Passport card or app"></label><span style="font-size:13px">Passport pays us for every visit on this number. Check it against their card.</span></div>
<div id="mateWrap"><label class="fld">Brought by a member? (Bring a Mate)<input id="mate" placeholder="Search the member who brought them" autocomplete="off"></label><div class="list" id="mateRes"></div><div id="mateSel" class="muted"></div></div>
</section>
<section class="card">
<h2><span class="stepn">3</span>Terms and signature</h2>
<div class="termsbox" id="aTerms"><div class="muted">Pick a membership to see its contract.</div></div>
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><a class="btn line sm" id="aPdf" target="_blank" rel="noopener" hidden>Open the contract as a PDF</a><span class="muted">Let them read it on screen or as a PDF, then sign. A signed copy is kept on their profile.</span></div>
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="aRead"> They've read the contract</label>
<canvas id="sig" aria-label="Signature pad"></canvas>
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="agreed"> They've agreed to the terms</label><button class="btn line sm" id="sigClear" style="margin-left:auto">Clear signature</button></div>
<div class="err" id="aErr"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="aSave">Add member</button><button class="btn line" id="aAnyway" hidden>Add anyway</button></div>
</section>
</div>
<div id="a2" hidden style="display:flex;flex-direction:column;gap:18px">
<div class="ok" id="aDone"></div>
<section class="card" id="fpGm" hidden>
<h2>Passport ID into GymMaster</h2>
<p style="margin:0">GymMaster reports their visits to Fitness Passport, so it needs the ID too. Open their GymMaster profile, go to <b>Additional Details</b> and type <b id="fpGmId"></b> into <b>Fitness Passport ID</b>.</p>
<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn line" id="fpGmOpen" target="_blank" rel="noopener">Open in GymMaster</a><button class="btn dark" id="fpGmDone">It's in GymMaster</button></div>
<div id="fpGmOk"></div>
</section>
<section class="card dark" id="billCard">
<h2><span class="stepn" style="background:var(--lime);color:var(--ink)">4</span>Bank details</h2>
<p style="margin:0;color:var(--soft);font-size:14px" id="billNote"></p>
<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><button class="btn" id="billOpen">Enter bank details</button><div id="qr" style="background:#fff;border-radius:12px;padding:8px" hidden></div></div>
<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="billDone"> Bank details are in</label>
</section>
<section class="card">
<h2><span class="stepn">5</span>Key tag</h2>
<p class="muted" style="margin:0">Scan the new tag. The reader types the number for you.</p>
<label class="sr" for="tag">Key tag number</label>
<input id="tag" class="tagbox" autocomplete="off" placeholder="Scan tag">
<div class="err" id="tagErr"></div>
<div id="tagOk"></div>
<div class="err" id="finErr"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="aFinish">Done</button><button class="btn line" id="aProfile">Open their profile</button></div>
</section>
</div>
</section>

</main>
</div>

<!-- CAMERA -->
<div class="cam" id="cam" hidden role="dialog" aria-modal="true" aria-labelledby="camTitle">
<div class="box">
<div style="display:flex;align-items:baseline;gap:10px"><h2 id="camTitle" style="margin:0">Take their photo</h2><span class="muted" id="camWho"></span><button class="btn line sm" id="camClose" style="margin-left:auto">Close</button></div>
<label class="fld">Camera<select id="camDev"></select></label>
<div class="view"><video id="camVid" autoplay playsinline muted></video><img id="camShot" alt="" hidden><div class="ring"></div></div>
<div class="err" id="camErr"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="camSnap">Take photo</button><button class="btn line" id="camRetake" hidden>Retake</button><button class="btn" id="camUse" hidden>Use this photo</button>
<label class="btn line" style="margin-left:auto;cursor:pointer">Upload a photo<input type="file" accept="image/*" id="camFile" hidden></label></div>
<p class="muted" style="margin:0;font-size:13px">Face in the circle, looking at the camera. Plug the USB camera in before opening this, then pick it above. Chrome remembers your choice.</p>
</div>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
var $=function(s){return document.querySelector(s)};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function get(u){return fetch(u).then(function(r){return r.json()})}
function post(u,b){return fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b||{})}).then(function(r){return r.json()})}
function money(n){return "$"+Number(n||0).toLocaleString("en-NZ",{minimumFractionDigits:2,maximumFractionDigits:2})}
function day(s){if(!s)return "";var d=new Date(String(s).replace(" ","T")+(String(s).length>10?"Z":"T00:00:00"));if(isNaN(d))return String(s).slice(0,10);return d.toLocaleDateString("en-NZ",{day:"numeric",month:"short",year:(new Date().getFullYear()===d.getFullYear()?undefined:"2-digit")})}
function nm(r){return ((r.first_name||"")+" "+(r.last_name||"")).trim()||r.name||"No name"}
var ME=null, VIEW="today";
var OUT_LABEL={joined:"Joined",joining_at_desk:"Joining at the desk",call_back:"Call back",no_answer:"No answer",not_interested:"Not for them",paid:"Paid",billing_in:"Bank details in",tag_given:"Tag given",fp_in_gm:"It's in GymMaster",done:"Done",hold_set:"Hold put on",cancel_set:"Cancelled",kept:"They're staying"};
var JOB_OUTS={new_lead:["joined","call_back","no_answer","not_interested"],missing_billing:["billing_in","call_back","no_answer"],trial_ending:["joined","joining_at_desk","call_back","no_answer","not_interested"],failed_payment:["paid","call_back","no_answer"],cancel_save:["call_back","no_answer","not_interested","done"],hold_ending:["done","call_back"],blocked:["paid","call_back","no_answer"],call_back:["joined","paid","call_back","no_answer","not_interested","done"],no_tag:["tag_given","done"],fp_id_gm:["fp_in_gm"],fp_missing:["call_back","no_answer"],no_photo:["done"],app_hold:["hold_set","call_back","no_answer"],app_cancel:["kept","cancel_set","call_back","no_answer"]};
var KIND={prospect:"Started online or enquired",trial:"5 Days for $5",free_pt:"Free PT",unfinished_signup:"Unfinished sign-up",bring_a_mate:"Bring a Mate",app_upgrade:"App upgrade",website_form:"Enquiry",meta_form:"Meta form",walk_in:"Walk in"};

function show(v){
 VIEW=v;
 $$("[data-view]").forEach(function(s){s.hidden=s.dataset.view!==v});
 $$(".nav").forEach(function(b){b.classList.toggle("on",b.dataset.go===v)});
 window.scrollTo(0,0);
 if(v==="today"){loadToday();if(ME&&ME.can.business){loadBiz();loadMorning()}}
 if(v==="leads")loadLeads();
 if(v==="add")startAdd();
 if(v==="tag")setTimeout(function(){$("#lookTag").focus()},50);
 if(v==="passport"){loadPassport();loadFpMore();setTimeout(function(){loadFpCheck(false)},50)}
 if(v==="reports")loadReport();
 if(v==="staff")loadStaff();
 if(v==="settings")loadSettings();
 if(v==="classes"){loadClasses(CLS.week);loadClassStats()}
 if(v==="roster")loadRoster(RO.week);
 if(v==="collections")loadCol();
 if(v==="billing")loadBill();
 if(v==="ptleads")loadPt();
 if(v==="catalog")loadCat();
 if(v==="pos")loadPos();
 if(v==="app")loadApp();
 if(v==="emails")loadEm();
 if(v==="mypt")loadMyPt();
 if(v==="money")loadMoney();
 if(v==="growth")loadGrowth();
 if(v==="marketing"){loadMkt();loadMktMore()}
 if(v==="members"){$("#mProf").hidden=true;$("#mList").hidden=false;loadWall(false);setTimeout(function(){$("#q").focus()},50)}
}
document.addEventListener("click",function(e){var b=e.target.closest("[data-go]");if(b){e.preventDefault();show(b.dataset.go)}});

/* ---------- start ---------- */
get("/api/me").then(function(me){
 ME=me;
 $("#meName").textContent=me.name;$("#meRole").textContent=me.role.charAt(0).toUpperCase()+me.role.slice(1);
 $("#meAv").textContent=me.name.split(" ").map(function(x){return x[0]}).join("").slice(0,2);
 $("#hello").innerHTML="Morning, "+esc(me.name.split(" ")[0])+'<span class="dot">.</span>';
 var h=new Date().getHours();if(h>=12)$("#hello").innerHTML=(h<17?"Afternoon, ":"Evening, ")+esc(me.name.split(" ")[0])+'<span class="dot">.</span>';
 if(me.can.members===true)$("#navFp").hidden=false;
 if(me.can.settings){$("#navApp").hidden=false;$("#navImport").hidden=false;$("#navStaff").hidden=false;$("#navSettings").hidden=false}
 if(me.can.settings){$("#navPt").hidden=false;ptCount()}
 if(!me.can.settings){get("/api/pt/mine").then(function(d){var L=d.leads||[];if(L.length||["trainer","coach","manager"].indexOf(me.role)>=0){$("#navMyPt").hidden=false;var n=L.filter(function(l){return l.pt_status==="assigned"}).length;$("#ctMyPt").hidden=!n;$("#ctMyPt").textContent=n}})}
 if(me.can.collections){$("#navReports").hidden=false;$("#navCol").hidden=false;$("#navBill").hidden=false;$("#navEm").hidden=false}
 if(me.can.business){$("#navMoney").hidden=false;$("#navGrowth").hidden=false;$("#navMkt").hidden=false}
 if(me.can.add){$("#navPos").hidden=false;$("#navCat").hidden=false;$("#navAdd").hidden=false;$("#addTop").hidden=false;$("#newLeadBtn").hidden=false}
 navLabels();
 var hv=(location.hash||"").slice(1);var hb=hv&&document.querySelector('.nav[data-go="'+hv.replace(/[^a-z]/g,"")+'"]');
 if(hb&&!hb.hidden)show(hb.dataset.go);else{loadToday();if(me.can.business){loadBiz();loadMorning()}}
 if("serviceWorker" in navigator)navigator.serviceWorker.register("/sw.js").catch(function(){});
}).catch(function(e){$("#jobs").innerHTML='<div class="err">'+esc(e)+'</div>'});

function loadBiz(){
 get("/api/summary").then(function(s){
  var fam={};(s.by_family||[]).forEach(function(f){fam[f.family]=f.n});
  var t=[["Members",s.members],["Fitness Passport",s.passport],["Perform",fam.perform||0],["Daily",fam.daily||0],
   ["Billed weekly by Ezidebit",s.weekly_billed!=null?"$"+Math.round(s.weekly_billed).toLocaleString("en-NZ"):"-"],
   ["Owed to M2",s.owed_total!=null?"$"+Math.round(s.owed_total).toLocaleString("en-NZ"):"-"],
   ["Lead source recorded",(s.lead_source_pct||0)+"%"],["Blocked at the door",s.blocked]];
  $("#bizTiles").innerHTML=t.map(function(x){return '<div class="tile"><div class="n">'+esc(typeof x[1]==="number"?x[1].toLocaleString("en-NZ"):x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>'}).join("");
  if(s.last_sync)$("#sync").textContent="Last copy from GymMaster "+day(s.last_sync.finished_at)+(s.last_sync.ok===0?" (failed: "+(s.last_sync.error||"")+")":"");
  $("#biz").hidden=false;
 });
}

/* ---------- today ---------- */
var TODAY=null;
function loadToday(){
 get("/api/today").then(function(d){
  TODAY=d;
  $("#todayDate").textContent=new Date().toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"long"});
  loadTodayMore();
  var total=d.jobs.reduce(function(a,j){return a+j.count},0);
  $("#ctToday").hidden=!total;$("#ctToday").textContent=total;
  $("#doneToday").textContent=(d.done_today?d.done_today+" done today. ":"")+(d.joined_today?d.joined_today+" joined today.":"");
  $("#jobs").innerHTML=d.jobs.length?d.jobs.map(function(j,i){
   return '<button class="job" data-job="'+esc(j.kind)+'"><span class="num">'+(i+1)+'</span><span><b>'+j.count+" "+esc(j.count===1&&j.one?j.one:j.label.charAt(0).toLowerCase()+j.label.slice(1))+'</b><span class="muted">'+esc(j.owner==="manager"?"Manager":"Reception")+(j.items[0]?", starting with "+esc(j.items[0].name):"")+'</span></span><span class="pill dark">Start</span></button>';
  }).join('<div style="height:8px"></div>'):'<div class="ok">Nothing waiting. Nice work.</div>';
  if(d.recent){$("#recentCard").hidden=false;$("#recent").innerHTML=d.recent.map(function(m){return '<div class="r" data-member="'+m.id+'"><span><b>'+esc(nm(m))+'</b> <span class="muted">'+esc(m.plan||"")+'</span></span><span class="pill">'+esc(day(m.joined_on))+'</span></div>'}).join("")}
  if(!$("#jobPanel").hidden&&$("#jobPanel").dataset.kind)openJob($("#jobPanel").dataset.kind);
 });
}
$("#jobs").addEventListener("click",function(e){var b=e.target.closest("[data-job]");if(b)openJob(b.dataset.job)});
function face(id,name,has){var ini=initials(name);return '<div class="face sm">'+(has?'<img loading="lazy" src="/api/members/'+id+'/photo" alt="" data-ini="'+esc(ini)+'">':esc(ini))+'</div>'}
function ago(s){var t=new Date(String(s).replace(" ","T")+(String(s).length>16?"":":00"));var m=Math.round((Date.now()-t.getTime())/60000);if(isNaN(m))return "";if(m<1)return "just now";if(m<60)return m+" min ago";if(m<1440)return Math.round(m/60)+" h ago";return day(s)}
function loadTodayMore(){
 get("/api/roster/now").then(function(r){$("#tdDesk").innerHTML=(r||[]).map(function(x){return '<div class="vis" data-go="roster" style="grid-template-columns:110px minmax(0,1fr) auto"><b>'+esc(x.start)+' to '+esc(x.end)+'</b><span>'+esc(x.name)+' <span class="muted">'+esc(x.area||"")+'</span></span>'+(x.now?'<span class="pill ok">On now</span>':"")+'</div>'}).join("")||'<div class="muted">Nobody rostered today yet.</div>'});
 get("/api/visits/recent").then(function(d){
  if(d.error){$("#rvList").innerHTML='<div class="muted">'+esc(d.error)+'</div>';return}
  $("#tdBday").innerHTML=(d.birthdays||[]).map(function(b){return '<div class="vis" data-member="'+b.id+'">'+face(b.id,nm(b),b.has_photo)+'<span><b>'+esc(nm(b))+'</b></span><span class="pill ok">Happy birthday</span></div>'}).join("")||'<div class="muted">No birthdays today.</div>';
  if(d.rows.length){
   $("#rvCount").textContent=d.today+" in today";
   $("#rvList").innerHTML=d.rows.slice(0,15).map(function(v){var f=v.flags||[];return '<div class="vis" data-member="'+v.id+'">'+face(v.id,nm(v),v.has_photo)+'<span><b>'+esc(nm(v))+'</b> <span class="muted">'+esc(v.plan||"")+(v.door?", "+esc(v.door):"")+'</span>'+(f.indexOf("blocked")>=0?' <span class="pill warn">Owes money</span>':"")+'</span><span class="muted">'+esc(ago(v.at))+'</span></div>'}).join("");
   return;
  }
  // Until GymMaster's live visitor log is connected: who has trained most this month.
  get("/api/members/browse?tab=visited&sort=visits&limit=12").then(function(b){
   $("#rvCount").textContent=d.live?"No check-ins yet today":"Most visits this month";
   $("#rvList").innerHTML=(!d.live?'<div class="muted" style="margin-bottom:6px">'+(ME.can.settings?"Live check-ins appear here once GymMaster's Report API key is added (Settings, Connections). Until then, this month's regulars:":"This month's regulars:")+'</div>':"")+
    ((b.rows||[]).map(function(v){return '<div class="vis" data-member="'+v.id+'">'+face(v.id,nm(v),v.has_photo)+'<span><b>'+esc(nm(v))+'</b> <span class="muted">'+esc(v.plan||"")+'</span></span><span class="pill">'+v.visits_month+' visits</span></div>'}).join("")||'<div class="muted">Visit counts are still being copied from GymMaster.</div>');
  });
 });
 get("/api/classes").then(function(d){
  if(d.error){$("#tdClasses").innerHTML='<div class="muted">'+esc(d.error)+'</div>';return}
  var td=(d.classes||[]).filter(function(c){return c.day===d.today});
  $("#tdClasses").innerHTML=td.map(function(c){var full=c.max&&c.booked>=c.max;return '<div class="vis" data-go="classes"><b>'+esc(c.start)+'</b><span><b>'+esc(c.name)+'</b> <span class="muted">'+esc(c.coach||"")+'</span><div class="fill"><i class="'+(full?"full":"")+'" style="width:'+(c.max?Math.round(c.booked/c.max*100):0)+'%"></i></div></span><span class="pill'+(full?" dark":"")+'">'+c.booked+'/'+c.max+'</span></div>'}).join("")||'<div class="muted">No classes today.</div>';
 });
}
function openJob(kind){
 var j=(TODAY.jobs||[]).find(function(x){return x.kind===kind});var p=$("#jobPanel");
 if(!j){p.hidden=true;p.dataset.kind="";return}
 p.hidden=false;p.dataset.kind=kind;
 p.innerHTML='<div style="display:flex;align-items:baseline;gap:10px"><h2>'+esc(j.label)+'</h2><span class="muted">'+j.count+'</span><button class="btn line sm" style="margin-left:auto" id="jpClose">Close</button></div>'+
  j.items.map(function(it,i){
   var outs=JOB_OUTS[kind]||["done"];
   return '<div class="person" data-i="'+i+'"><div class="top"><b>'+esc(it.name)+'</b>'+(it.mobile?' <a href="tel:'+esc(it.mobile)+'" class="muted">'+esc(it.mobile)+'</a>':"")+(it.member_id?' <a href="#" class="muted" data-member="'+it.member_id+'">Profile</a>':"")+(it.gm_url?' <a href="'+esc(it.gm_url)+'" target="_blank" rel="noopener" class="muted">Open in GymMaster</a>':"")+'</div>'+
    '<div class="muted">'+esc(it.detail||"")+'</div>'+
    (it.need_photo?'<div><button class="btn dark sm" data-photo="'+it.member_id+'" data-name="'+esc(it.name)+'">Take photo</button></div>':"")+
    (it.need_fp?'<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="sr" for="fpj'+i+'">Fitness Passport ID</label><input id="fpj'+i+'" class="fpIn" inputmode="numeric" placeholder="Fitness Passport ID" style="flex:1;min-width:160px;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn dark sm" data-fpsave="'+it.member_id+'">Save ID</button></div>':"")+
    '<div class="outs">'+outs.map(function(o){return '<button class="btn sm '+(o==="joined"||o==="paid"||o==="billing_in"||o==="tag_given"||o==="fp_in_gm"||o==="hold_set"||o==="kept"?"dark":"line")+'" data-out="'+o+'">'+OUT_LABEL[o]+'</button>'}).join("")+'</div></div>';
  }).join("");
 p.scrollIntoView({behavior:"smooth",block:"nearest"});
}
$("#jobPanel").addEventListener("click",function(e){
 if(e.target.id==="jpClose"){$("#jobPanel").hidden=true;$("#jobPanel").dataset.kind="";return}
 var b=e.target.closest("[data-out]");if(!b)return;
 var box=b.closest("[data-i]"),kind=$("#jobPanel").dataset.kind;
 var it=TODAY.jobs.find(function(x){return x.kind===kind}).items[+box.dataset.i];
 var o=b.dataset.out,note="",when="";
 if(o==="call_back"){
  box.querySelector(".outs").innerHTML='<label class="fld" style="flex:1;min-width:160px">When<input type="date" class="cbDate"></label><label class="fld" style="flex:2;min-width:200px">Note<input class="cbNote" placeholder="What to talk about"></label><button class="btn dark sm" data-cb="1" style="align-self:flex-end">Save</button>';
  return;
 }
 send(it,kind,o,note,when,box);
});
$("#jobPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-fpsave]");if(!b)return;
 var box=b.closest("[data-i]"),v=box.querySelector(".fpIn").value;
 post("/api/members/"+b.dataset.fpsave+"/details",{fp_id:v}).then(function(r){
  if(!r.ok){alertIn(box,r.error);return}
  box.innerHTML='<div class="muted">Saved. Now type it into GymMaster, it\'s on Today.</div>';setTimeout(loadToday,600);
 });
});
$("#jobPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-cb]");if(!b)return;
 var box=b.closest("[data-i]"),kind=$("#jobPanel").dataset.kind;
 var it=TODAY.jobs.find(function(x){return x.kind===kind}).items[+box.dataset.i];
 send(it,kind,"call_back",box.querySelector(".cbNote").value,box.querySelector(".cbDate").value,box);
});
function send(it,kind,o,note,when,box){
 box.style.opacity=".5";
 post("/api/jobs",{kind:kind,outcome:o,member_id:it.member_id||null,lead_id:it.lead_id||null,task_id:it.task_id||null,note:note,call_back_on:when}).then(function(r){
  if(!r.ok){box.style.opacity="1";alertIn(box,r.error);return}
  box.innerHTML='<div class="muted">'+esc(it.name)+": "+esc(OUT_LABEL[o])+'</div>';
  setTimeout(loadToday,600);
 });
}
function alertIn(box,msg){var d=document.createElement("div");d.className="err";d.textContent=msg;box.appendChild(d)}

/* ---------- members ---------- */
var MW={tab:"current",sort:"updated",view:"grid",offset:0,q:""};
var qt;
$("#q").addEventListener("input",function(e){clearTimeout(qt);qt=setTimeout(function(){MW.q=e.target.value.trim();loadWall(false)},280)});
function search(v){MW.q=v;loadWall(false)}
$("#mSort").addEventListener("change",function(e){MW.sort=e.target.value;loadWall(false)});
$$("[data-mv]").forEach(function(b){b.addEventListener("click",function(){MW.view=b.dataset.mv;$$("[data-mv]").forEach(function(x){x.classList.toggle("on",x===b)});$("#mWall").classList.toggle("list",MW.view==="list")})});
$("#mTabs").addEventListener("click",function(e){var b=e.target.closest("[data-mt]");if(!b)return;MW.tab=b.dataset.mt;loadWall(false)});
$("#mMore").addEventListener("click",function(){loadWall(true)});
$("#mBack").addEventListener("click",function(){$("#mProf").hidden=true;$("#mList").hidden=false;window.scrollTo(0,MW.scroll||0)});
var MTABS=[["current","Current members"],["visited","Visited this month"],["passport","Fitness Passport"],["owing","Owing"],["prospects","Prospects"],["expired","Expired"],["everyone","Everyone"]];
var MCOUNT={};
function mcard(m){
 var fl=m.flags||[],pills=[];
 if(m.status==="active"&&m.gm_status==="Hold")pills.push('<span class="pill">On hold</span>');
 if(m.status==="former")pills.push('<span class="pill">Left</span>');
 if(m.status==="prospect")pills.push('<span class="pill">Prospect</span>');
 if(fl.indexOf("passport")>=0)pills.push('<span class="pill">Passport</span>');
 if(fl.indexOf("gifted_time")>=0)pills.push('<span class="pill">Gifted time</span>');
 if(m.owing>0)pills.push('<span class="pill warn">Owes '+money(m.owing)+'</span>');
 if(m.visits_month)pills.push('<span class="pill ok">'+m.visits_month+' visit'+(m.visits_month===1?"":"s")+' this month</span>');
 var ini=initials(nm(m));
 return '<button class="mcard" data-member="'+m.id+'"><span class="mph">'+(m.has_photo?'<img loading="lazy" src="/api/members/'+m.id+'/photo" alt="" data-ini="'+esc(ini)+'">':'<i>'+esc(ini)+'</i>')+'</span><span class="mb"><b>'+esc(nm(m))+'</b><span class="muted">#'+m.id+(m.joined_on&&m.status!=="prospect"?", joined "+esc(day(m.joined_on)):"")+'</span><span>'+esc(m.plan||(m.status==="prospect"?"Created "+day(m.created):""))+'</span><span class="mft">'+pills.join("")+'</span></span></button>';
}
function loadWall(more){
 if(!more){MW.offset=0}
 var u="/api/members/browse?tab="+MW.tab+"&sort="+MW.sort+"&offset="+MW.offset+"&limit=48"+(MW.q?"&q="+encodeURIComponent(MW.q):"");
 if(!more)$("#mWall").innerHTML='<div class="muted">Loading...</div>';
 get(u).then(function(d){
  if(d.error){$("#mWall").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  if(d.counts&&d.counts.everyone!=null)MCOUNT=d.counts;
  $("#mTabs").innerHTML=MTABS.map(function(t){var n=MCOUNT[t[0]];return '<button class="chip'+(t[0]===MW.tab?" on":"")+'" data-mt="'+t[0]+'">'+t[1]+(n!=null?" "+Number(n).toLocaleString("en-NZ"):"")+'</button>'}).join("");
  var html=d.rows.map(mcard).join("");
  if(more)$("#mWall").insertAdjacentHTML("beforeend",html);else $("#mWall").innerHTML=html||'<div class="muted">No one here.</div>';
  MW.offset=d.offset+d.rows.length;
  $("#mMore").hidden=MW.offset>=d.total;$("#mMore").textContent="Show more ("+(d.total-MW.offset).toLocaleString("en-NZ")+" left)";
  $("#mCount").textContent=d.total.toLocaleString("en-NZ")+" people";
 });
}
document.addEventListener("error",function(e){var t=e.target;if(t&&t.tagName==="IMG"&&t.dataset&&t.dataset.ini!==undefined){var i=document.createElement("i");i.textContent=t.dataset.ini;t.parentNode.replaceChild(i,t)}},true);
document.addEventListener("click",function(e){var r=e.target.closest("[data-member]");if(!r)return;e.preventDefault();openMember(+r.dataset.member)});
function openMember(id){
 if(VIEW!=="members"){VIEW="members";$$("[data-view]").forEach(function(s){s.hidden=s.dataset.view!=="members"});$$(".nav").forEach(function(b){b.classList.toggle("on",b.dataset.go==="members")})}
 else MW.scroll=window.scrollY;
 $("#mList").hidden=true;$("#mProf").hidden=false;window.scrollTo(0,0);
 $("#profile").innerHTML='<section class="card"><div class="muted">Loading...</div></section>';
 get("/api/members/"+id).then(function(d){renderMember(d,id)});
}
function renderMember(d,id){
 var P=$("#profile");
 if(d.error){P.innerHTML='<section class="card"><div class="err">'+esc(d.error)+'</div></section>';return}
 var m=d.member,ms=d.memberships.filter(function(x){return x.status==="current"})[0]||d.memberships[0]||{};
 var isFp=ms.family==="passport"||d.flags.some(function(f){return f.flag==="passport"});
 var flags=d.flags.filter(function(f){return !(f.flag==="passport"&&ms.family==="passport")}).map(function(f){return '<span class="pill'+(f.flag==="blocked"?" warn":"")+'">'+esc(f.flag.replace(/_/g," ")+(f.detail?": "+f.detail:""))+'</span>'}).join(" ");
 var vis=d.visits||[],weeks=[];for(var w=11;w>=0;w--){var s=0;vis.forEach(function(v){var age=(Date.now()-new Date(v.day+"T00:00:00").getTime())/864e5;if(age>=w*7&&age<(w+1)*7)s+=v.n});weeks.push(s)}
 var mx=Math.max.apply(null,weeks.concat([1]));
 var st={active:"Current member",former:"Left M2",prospect:"Prospect",frozen:"On hold"}[m.status]||m.status;
 var ini=initials(nm(m)),hasPh=d.photo_at||m.photo_url;
 var bill=d.billing?'<section class="card"><h2>Billing</h2>'+(d.billing.balance_owing>0?'<div class="warnbox">Owes <b>'+money(d.billing.balance_owing)+'</b></div>':'<div class="muted">Nothing owing.</div>')+
   '<dl class="kv"><dt>Plan</dt><dd>'+esc(ms.plan||"-")+(ms.price?", "+money(ms.price)+" "+esc(ms.frequency||""):"")+'</dd><dt>Billed by</dt><dd>'+esc(d.billing.billed_by_system==="core"?"M2 Core":"GymMaster")+'</dd>'+(d.billing.free_weeks_credit?'<dt>Free weeks</dt><dd>'+d.billing.free_weeks_credit+' to apply</dd>':"")+(ms.min_term_end?'<dt>Lock-in ends</dt><dd>'+esc(day(ms.min_term_end))+'</dd>':"")+(ms.end_date?'<dt>Ends</dt><dd>'+esc(day(ms.end_date))+'</dd>':"")+'</dl>'+
   (ME.can.add?'<button class="btn line sm" data-bill="'+id+'" style="align-self:flex-start">Enter or update bank details</button>':"")+'</section>':"";
 var tagRows=d.tags.map(function(t){return '<div><span>'+esc(day(t.assigned_at))+'</span><span>'+esc(t.tag)+' <span class="pill'+(t.status==="active"?" ok":"")+'">'+esc(t.status)+'</span></span></div>'}).join("");
 var head='<section class="card"><div style="display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap"><div class="face xl" id="pFace">'+(hasPh?'<img src="/api/members/'+id+'/photo?t='+encodeURIComponent(d.photo_at||"gm")+'" alt="Photo of '+esc(nm(m))+'" data-ini="'+esc(ini)+'">':esc(ini))+'</div>'+
  '<div style="flex:1;min-width:200px"><div class="eyebrow">#'+id+', '+esc(st)+'</div><h2 style="font-size:28px;margin-top:2px">'+esc(nm(m))+'</h2><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill dark">'+esc(ms.plan||st)+'</span>'+flags+'</div>'+
  (ME.can.add?'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn '+(hasPh?"line":"dark")+' sm" data-photo="'+id+'" data-name="'+esc(nm(m))+'">'+(d.photo_at?"Retake photo":"Take photo")+'</button><button class="btn line sm" data-edit="'+id+'">Edit details</button><button class="btn line sm" data-tagfor="'+id+'">'+(m.key_tag?"Replace key tag":"Give key tag")+'</button><button class="btn line sm" data-flagfor="'+id+'">Flags</button><a class="btn line sm" href="'+esc((window.GM_SITE||"https://m2trainingclub.gymmasteronline.com")+"/member/view/"+id)+'" target="_blank" rel="noopener">Open in GymMaster</a></div>':"")+'</div></div>'+
  '<dl class="kv"><dt>Member since</dt><dd>'+esc(day(m.joined_on)||"-")+'</dd><dt>Mobile</dt><dd>'+(m.mobile?'<a href="tel:'+esc(m.mobile)+'">'+esc(m.mobile)+'</a>':'<span class="muted">None</span>')+'</dd><dt>Email</dt><dd>'+esc(m.email||"None")+'</dd><dt>Goal</dt><dd>'+esc(m.goal||"Not recorded")+'</dd><dt>Came from</dt><dd>'+esc(m.lead_source||"Not recorded")+'</dd>'+(d.referrer?'<dt>Brought by</dt><dd><a href="#" data-member="'+d.referrer.id+'">'+esc(nm(d.referrer))+'</a></dd>':"")+(d.trainer?'<dt>Trainer</dt><dd>'+esc(d.trainer.name)+'</dd>':"")+(isFp?'<dt>Fitness Passport ID</dt><dd>'+(m.fp_id?esc(m.fp_id)+(m.fp_id_in_gm?"":' <span class="pill warn">Not in GymMaster yet</span>'):'<span class="pill warn">Missing. Passport can\'t pay for their visits</span>')+'</dd>':"")+(m.passport_number&&m.passport_number!==m.fp_id?'<dt>Old number in surname</dt><dd>'+esc(m.passport_number)+'</dd>':"")+'<dt>Visits, all time</dt><dd>'+esc(m.total_visits_gm||0)+'</dd>'+(d.last_visit?'<dt>Last visit</dt><dd>'+esc(day(d.last_visit))+'</dd>':"")+'<dt>Key tag</dt><dd>'+esc(m.key_tag||"None")+'</dd></dl>'+
  '<div id="editBox"></div></section>';
 var next='<section class="card dark"><div class="next"><div><div class="eyebrow">Best next step</div><div style="font-size:16px;margin-top:4px">'+esc(d.next_step.text)+'</div></div></div></section>';
 var visits=vis.length?'<section class="card"><h2>Visits</h2><div class="bars">'+weeks.map(function(n,i){return '<i class="'+(i===11?"last":"")+'" style="height:'+Math.max(4,Math.round(n/mx*100))+'%" title="'+n+' visits"></i>'}).join("")+'</div><div class="muted">Last 12 weeks</div></section>':"";
 var notes='<section class="card"><h2>Notes and history</h2><div style="display:flex;gap:8px"><label class="sr" for="noteIn">Add a note</label><input id="noteIn" class="fld" style="flex:1;height:44px;border:1px solid var(--line);border-radius:12px;padding:0 12px" placeholder="Add a note, like what they said at the desk"><button class="btn dark sm" data-note="'+id+'" style="height:44px">Save</button></div>'+
  '<div class="hist">'+(d.activity.map(function(a){return '<div><span>'+esc(day(a.at))+'</span><span>'+esc(a.detail)+(a.staff?' <span class="muted">'+esc(a.staff)+'</span>':"")+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>')+'</div></section>';
 P.innerHTML='<div class="pcol">'+head+next+'<div id="gmBox"></div>'+(tagRows?'<section class="card"><h2>Key tags</h2><div class="hist">'+tagRows+'</div></section>':"")+'</div>'+
  '<div class="pcol"><div id="liveBox"><section class="card"><h2>Live from GymMaster</h2><div class="muted">Checking GymMaster...</div></section></div>'+visits+(d.billing?'<div id="billBox"></div>':"")+notes+'</div>';
 loadLive(id);if(d.billing)loadMemberBill(id);
}
document.addEventListener("click",function(e){
 var t;
 if((t=e.target.closest("[data-note]"))){var id=+t.dataset.note,v=$("#noteIn").value;if(!v.trim())return;post("/api/members/"+id+"/notes",{text:v}).then(function(){openMember(id)});}
 if((t=e.target.closest("[data-bill]"))){get("/api/members/"+t.dataset.bill+"/billing-link").then(function(b){if(b.url)window.open(b.url,"m2billing","width=900,height=900");else alert(b.error||"Not set up yet")})}
 if((t=e.target.closest("[data-tagfor]"))){var id2=+t.dataset.tagfor;$("#editBox").innerHTML='<div class="person"><label class="sr" for="ptag">Key tag number</label><input id="ptag" class="tagbox" placeholder="Scan the new tag" autocomplete="off"><label class="fld">If they had one before, it was<select id="pold"><option value="replaced">Swapped for a new one</option><option value="lost">Lost</option><option value="returned">Handed back</option></select></label><div class="err" id="ptErr"></div></div>';var inp=$("#ptag");inp.focus();inp.addEventListener("keydown",function(ev){if(ev.key!=="Enter")return;ev.preventDefault();post("/api/members/"+id2+"/key-tag",{tag:inp.value,oldStatus:$("#pold").value}).then(function(r){if(!r.ok){$("#ptErr").textContent=r.error;inp.select();return}openMember(id2)})})}
 if((t=e.target.closest("[data-flagfor]"))){var id3=+t.dataset.flagfor;var opts=[["gifted_time","Gifted time (never chased for money)"],["do_not_contact","Do not contact"],["passport","Fitness Passport"],["student","Student"],["corporate","Corporate"]];$("#editBox").innerHTML='<div class="person">'+opts.map(function(o){return '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" data-flag="'+o[0]+'"> '+o[1]+'</label>'}).join("")+'<div class="err" id="flErr"></div></div>';get("/api/members/"+id3).then(function(d){d.flags.forEach(function(f){var c=document.querySelector('[data-flag="'+f.flag+'"]');if(c)c.checked=true})});$$("[data-flag]").forEach(function(c){c.addEventListener("change",function(){post("/api/members/"+id3+"/flags",{flag:c.dataset.flag,on:c.checked}).then(function(r){if(!r.ok){$("#flErr").textContent=r.error;c.checked=!c.checked}})})})}
 if((t=e.target.closest("[data-edit]"))){var id4=+t.dataset.edit;get("/api/members/"+id4).then(function(d){var m=d.member;$("#editBox").innerHTML='<div class="person"><div class="grid2"><label class="fld">Email<input id="eEmail" value="'+esc(m.email||"")+'"></label><label class="fld">Mobile<input id="eMobile" value="'+esc(m.mobile||"")+'"></label><label class="fld">Goal<select id="eGoal"></select></label><label class="fld">Came from<select id="eSource"></select></label><label class="fld">Emergency contact<input id="eEn" value="'+esc(m.emergency_name||"")+'"></label><label class="fld">Emergency phone<input id="eEp" value="'+esc(m.emergency_phone||"")+'"></label><label class="fld">Fitness Passport ID<input id="eFp" inputmode="numeric" value="'+esc(m.fp_id||"")+'" placeholder="Passport members only"></label></div><div class="err" id="eErr"></div><button class="btn dark sm" id="eSave" style="align-self:flex-start">Save</button></div>';
  fillSelect($("#eGoal"),GOALS,m.goal);fillSelect($("#eSource"),SOURCES,m.lead_source);
  $("#eSave").addEventListener("click",function(){post("/api/members/"+id4+"/details",{email:$("#eEmail").value,mobile:$("#eMobile").value,goal:$("#eGoal").value,lead_source:$("#eSource").value,emergency_name:$("#eEn").value,emergency_phone:$("#eEp").value,fp_id:$("#eFp").value}).then(function(r){if(!r.ok){$("#eErr").textContent=r.error;return}if(r.note)alert(r.note);openMember(id4)})})})}
});
var GOALS=["Strength","Weight loss","HYROX or racing","Fitness and health","Recovery and wellbeing","Running","Muscle gain","Other"];
var SOURCES=["Instagram","Facebook","Google","Referred by a member","Walked past","Fitness Passport","Work or corporate","Word of mouth","Event","Other"];
function fillSelect(el,list,val){el.innerHTML='<option value="">Pick one</option>'+list.map(function(x){return '<option'+(x===val?" selected":"")+'>'+esc(x)+'</option>'}).join("")+(val&&list.indexOf(val)<0?'<option selected>'+esc(val)+'</option>':"")}

/* ---------- leads ---------- */
var LEADS=null,LKIND="",STAFF=[];
$("#lsRefresh").addEventListener("click",function(){var b=$("#lsRefresh");b.disabled=true;b.textContent="Pulling in...";post("/api/leads/rebuild",{}).then(function(r){b.disabled=false;b.textContent="Refresh leads";loadLeads()})});
var STG={new:"New",contacted:"Contacted",trial:"On trial",joined:"Joined",cold:"Gone cold",lost:"Not for them"};
function loadLeadStats(){
 get("/api/leads/stats").then(function(d){
  if(d.error)return;
  var t=d.total||{n:0,joined:0,touched:0},w=(d.stages||[]).filter(function(x){return x.stage==="new"}).reduce(function(a,x){return a+x.n},0);
  $("#lsTiles").innerHTML=tile(t.n,"Leads")+tile(w,"Waiting for a first contact")+tile(t.n?Math.round(t.touched/t.n*100)+"%":"-","Contacted")+tile(t.joined,"Joined")+tile(t.n?Math.round(t.joined/t.n*100)+"%":"-","Became members")+tile(d.response_hours!=null?(d.response_hours<48?d.response_hours+" h":Math.round(d.response_hours/24)+" days"):"-","Average time to first contact");
  $("#lsNote").textContent="People who started signing up online or enquired, trials, Bring a Mate, website enquiries and walk ins. Free PT requests are on the PT leads page.";
  $("#lsRefresh").hidden=!ME.can.settings;
  $("#lsKind").innerHTML=hbars((d.by||[]).map(function(x){return [x.label+(x.joined?" ("+x.joined+" joined)":""),x.n]}));
  $("#lsSource").innerHTML=hbars((d.sources||[]).map(function(x){return [x.source,x.n]}));
  $("#lsWeeks").innerHTML=(d.weeks||[]).length?bars(d.weeks.map(function(x){return {label:day(x.day),vals:[x.n,x.joined||0]}}),[{name:"Leads",cls:""},{name:"Joined",cls:"s2"}]):'<div class="muted">Nothing yet.</div>';
 });
}
var LT={tab:"new",kind:"",q:"",n:25,data:[],cur:null};
var LTABS=[["new","To call","Nobody has spoken to them yet"],["contacted","Following up","Spoken to, not decided"],["trial","On a trial","Trial or pass running now"],["joined","Joined","Became members lately"],["cold","Gone cold","Worth one more try"]];
var LPH='<h2>Pick someone</h2><p class="muted" style="margin:0">Tap a lead to see their details, call them and record how it went. Everything is saved on their record.</p>';
function lAge(l){return Math.floor((Date.now()-new Date(String(l.created_at).replace(" ","T")).getTime())/864e5)}
function loadLeads(){
 loadLeadStats();
 if(!$("#leadPanel").dataset.id)$("#leadPanel").innerHTML=LPH;
 get("/api/leads"+(LT.q?"?q="+encodeURIComponent(LT.q)+"&days=365":"?days=45")).then(function(d){LT.data=d.leads||[];LT.n=25;drawLeads()});
 if(!STAFF.length)get("/api/staff").then(function(d){STAFF=d.staff||[]});
}
function drawLeads(){
 var all=LT.data,byKind=all.filter(function(l){return !LT.kind||l.kind===LT.kind});
 var cnt={};byKind.forEach(function(l){cnt[l.stage]=(cnt[l.stage]||0)+1});
 if(!LT.q){var nw=all.filter(function(l){return l.stage==="new"}).length;$("#ctLeads").hidden=!nw;$("#ctLeads").textContent=nw}
 $("#lTabs").className="ltabs"+(LT.q?" dim":"");
 $("#lTabs").innerHTML=LTABS.map(function(t){return '<button class="ltab'+(!LT.q&&LT.tab===t[0]?" on":"")+'" data-lt="'+t[0]+'"><b>'+(cnt[t[0]]||0)+'</b><small>'+t[1]+'</small><span>'+t[2]+'</span></button>'}).join("");
 var kinds={};all.forEach(function(l){kinds[l.kind]=(kinds[l.kind]||0)+1});
 $("#lKind").innerHTML='<option value="">Every type</option>'+Object.keys(kinds).map(function(k){return '<option value="'+k+'"'+(k===LT.kind?" selected":"")+'>'+esc(KIND[k]||k)+' ('+kinds[k]+')</option>'}).join("");
 var rows=LT.q?byKind:byKind.filter(function(l){return l.stage===LT.tab});
 if(LT.tab==="new"&&!LT.q)rows.sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at))});
 var shown=rows.slice(0,LT.n),h="",grp="";
 shown.forEach(function(l){
  var a=lAge(l),g=LT.q?"":(a<=0?"Today":a<=6?"This week":a<=13?"Last week":"Earlier");
  if(g!==grp){grp=g;if(g)h+='<div class="lgrp">'+g+'</div>'}
  var sub=[l.goal,l.source&&l.source!=="GymMaster prospect"?l.source:"",l.assigned_name?"With "+l.assigned_name:""].filter(Boolean).join(" \u00b7 ");
  h+='<button class="lrow'+(LT.cur===l.id?" on":"")+'" data-lead="'+l.id+'"><span><b>'+esc(l.name||l.email||l.mobile||"No name")+'</b> <span class="pill">'+esc(KIND[l.kind]||l.kind)+'</span>'+(LT.q?' <span class="pill'+(l.stage==="new"?" warn":l.stage==="joined"?" ok":"")+'">'+esc(STG[l.stage]||l.stage)+'</span>':"")+'</span><span class="age'+(l.stage==="new"&&a>2?" late":"")+'">'+(a<=0?"Today":a===1?"1 day":a+" days")+'</span>'+(sub?'<span class="sub">'+esc(sub)+'</span>':"")+'</button>';
 });
 if(!rows.length)h='<div class="ok" style="margin-top:8px">'+(LT.q?"Nobody matches that.":"Nobody here right now. Nice.")+'</div>';
 if(rows.length>LT.n)h+='<button class="btn line sm" id="lMore" style="margin-top:12px">Show '+Math.min(25,rows.length-LT.n)+' more of '+rows.length+'</button>';
 $("#lList").innerHTML=h;
}
$("#lTabs").addEventListener("click",function(e){var b=e.target.closest("[data-lt]");if(!b)return;LT.tab=b.dataset.lt;LT.n=25;if(LT.q){LT.q="";$("#lQ").value="";loadLeads();return}drawLeads()});
$("#lKind").addEventListener("change",function(e){LT.kind=e.target.value;LT.n=25;drawLeads()});
var lqt;$("#lQ").addEventListener("input",function(e){clearTimeout(lqt);lqt=setTimeout(function(){LT.q=e.target.value.trim();if(LT.q.length===1)return;loadLeads()},300)});
$("#lList").addEventListener("click",function(e){if(e.target.id==="lMore"){LT.n+=25;drawLeads();return}var b=e.target.closest("[data-lead]");if(!b)return;LT.cur=+b.dataset.lead;$$("#lList .lrow").forEach(function(x){x.classList.toggle("on",x===b)});openLead(LT.cur)});
function openLead(id){
 get("/api/leads/"+id).then(function(d){
  var p=$("#leadPanel");p.hidden=false;
  if(d.error){p.innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var l=d.lead;
  p.innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>'+esc(l.name||"Lead")+'</h2><span class="pill">'+esc(KIND[l.kind]||l.kind)+'</span><button class="btn line sm" id="lpClose" style="margin-left:auto">Close</button></div>'+
   '<dl class="kv"><dt>Mobile</dt><dd>'+(l.mobile?'<a href="tel:'+esc(l.mobile)+'">'+esc(l.mobile)+'</a>':"None")+'</dd><dt>Email</dt><dd>'+esc(l.email||"None")+'</dd><dt>Goal</dt><dd>'+esc(l.goal||"-")+'</dd><dt>Came from</dt><dd>'+esc([l.source,l.campaign].filter(Boolean).join(", ")||"-")+'</dd><dt>Came in</dt><dd>'+esc(day(l.created_at))+'</dd>'+(l.notes?'<dt>Notes</dt><dd>'+esc(l.notes)+'</dd>':"")+(l.member_id?'<dt>Member</dt><dd><a href="#" data-member="'+l.member_id+'">Open profile</a></dd>':"")+'</dl>'+
   (ME.can.add?'<label class="fld" style="max-width:320px">Assigned to<select id="lpAssign"><option value="">Nobody</option>'+STAFF.map(function(s){return '<option value="'+s.id+'"'+(s.id===l.assigned_to?" selected":"")+'>'+esc(s.name)+'</option>'}).join("")+'</select></label>':"")+
   '<div class="outs">'+["joined","call_back","no_answer","not_interested"].map(function(o){return '<button class="btn sm '+(o==="joined"?"dark":"line")+'" data-lout="'+o+'">'+OUT_LABEL[o]+'</button>'}).join("")+'</div>'+
   '<div style="display:flex;gap:8px"><input id="lpNote" style="flex:1;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px" placeholder="Add a note"><button class="btn dark sm" id="lpNoteSave" style="height:40px">Save</button></div>'+
   '<div class="hist">'+d.activity.map(function(a){return '<div><span>'+esc(day(a.at))+'</span><span>'+esc(a.detail)+(a.staff?' <span class="muted">'+esc(a.staff)+'</span>':"")+'</span></div>'}).join("")+'</div>';
  p.dataset.id=id;if(window.innerWidth<900)p.scrollIntoView({behavior:"smooth",block:"nearest"});
  var as=$("#lpAssign");if(as)as.addEventListener("change",function(){post("/api/leads/"+id,{assigned_to:as.value||null,assigned_name:as.options[as.selectedIndex].text}).then(function(){loadLeads()})});
 });
}
$("#leadPanel").addEventListener("click",function(e){
 var p=$("#leadPanel"),id=+p.dataset.id;
 if(e.target.id==="lpClose"){p.dataset.id="";LT.cur=null;p.innerHTML=LPH;$$("#lList .lrow").forEach(function(x){x.classList.remove("on")});return}
 if(e.target.id==="lpNoteSave"){var v=$("#lpNote").value;if(!v.trim())return;post("/api/leads/"+id,{note:v}).then(function(){openLead(id)});return}
 var b=e.target.closest("[data-lout]");if(!b)return;
 post("/api/jobs",{kind:"new_lead",outcome:b.dataset.lout,lead_id:id}).then(function(r){if(!r.ok){alertIn(p,r.error);return}openLead(id);loadLeads()});
});
$("#newLeadBtn").addEventListener("click",function(){$("#newLeadCard").hidden=false;fillSelect($("#nlSource"),SOURCES,"");$("#nlName").focus()});
$("#nlCancel").addEventListener("click",function(){$("#newLeadCard").hidden=true});
$("#nlSave").addEventListener("click",function(){
 $("#nlErr").textContent="";
 post("/api/leads",{name:$("#nlName").value,mobile:$("#nlMobile").value,email:$("#nlEmail").value,kind:$("#nlKind").value,goal:$("#nlGoal").value,source:$("#nlSource").value,notes:$("#nlNotes").value}).then(function(r){
  if(!r.ok){$("#nlErr").textContent=r.error;return}
  ["#nlName","#nlMobile","#nlEmail","#nlGoal","#nlNotes"].forEach(function(s){$(s).value=""});$("#newLeadCard").hidden=true;loadLeads();
 });
});

/* ---------- point of sale ---------- */
var POS={items:[],cats:[],cat:"",q:"",cart:[],member:null,customer:"",edit:false};
function loadPos(){
 get("/api/pos").then(function(d){if(d.error){$("#posGrid").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}POS.items=d.items;POS.cats=d.cats;drawPos();drawCart()});
 if(!$("#posDay").value)$("#posDay").value=new Date().toLocaleDateString("en-CA",{timeZone:"Pacific/Auckland"});
 loadPosSales();
}
function drawPos(){
 var have={};POS.items.forEach(function(p){if(p.active||POS.edit)have[p.category]=1});
 $("#posCats").innerHTML='<button class="chip'+(POS.cat?"":" on")+'" data-pc="">Everything</button>'+POS.cats.filter(function(c){return have[c]}).map(function(c){return '<button class="chip'+(POS.cat===c?" on":"")+'" data-pc="'+esc(c)+'">'+esc(c)+'</button>'}).join("");
 var q=POS.q.toLowerCase(),L=POS.items.filter(function(p){return (POS.edit||p.active)&&(!POS.cat||p.category===POS.cat)&&(!q||p.name.toLowerCase().indexOf(q)>=0)});
 $("#posGrid").innerHTML=L.map(function(p){return '<button class="pbtn'+(p.active?"":" off")+(POS.edit?" edit":"")+'" data-pp="'+p.id+'"><b>'+esc(p.name)+'</b><span>'+money(p.price)+'</span></button>'}).join("")||'<div class="muted">Nothing matches.</div>';
 $("#posEditBar").hidden=!POS.edit;$("#posEditBtn").textContent=POS.edit?"Done editing":"Edit products";
}
function cartTotal(){return POS.cart.reduce(function(a,l){return a+l.qty*l.price},0)}
function drawCart(msg){
 var h='<h2>Sale</h2>';
 h+=POS.member?'<div class="ok" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span>For <b>'+esc(POS.member.name)+'</b></span><button class="btn line sm" data-pm="clear">Change</button></div>':
  '<label class="search" for="posMem" style="height:44px"><span class="sr">Find the member</span><input id="posMem" autocomplete="off" placeholder="Member name, mobile or scan their tag (optional)"></label><div id="posMemRes"></div>';
 if(!POS.cart.length)h+='<div class="muted">Tap products to add them.</div>';
 else{h+=POS.cart.map(function(l,i){return '<div class="cline"><span>'+esc(l.name)+'<br><a href="#" class="muted" style="font-size:12px" data-cp="'+i+'">'+money(l.price)+' each</a></span><span class="q"><button data-cq="'+i+'" data-d="-1" aria-label="One less">-</button>'+l.qty+'<button data-cq="'+i+'" data-d="1" aria-label="One more">+</button></span><b>'+money(l.qty*l.price)+'</b></div>'}).join("");
  h+='<div class="ctot"><span>Total</span><span>'+money(cartTotal())+'</span></div>'+
   '<input id="posNote" placeholder="Note (optional)" style="height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px">'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" data-pay="eftpos" style="flex:1">EFTPOS</button><button class="btn line" data-pay="cash" style="flex:1">Cash</button></div><button class="btn line sm" data-pm="empty" style="align-self:flex-start">Clear the sale</button>'}
 if(msg)h+=msg;
 $("#posCart").innerHTML=h;
 var mi=$("#posMem");if(mi){var t2;mi.addEventListener("input",function(){clearTimeout(t2);var v=mi.value.trim();t2=setTimeout(function(){if(v.length<2){$("#posMemRes").innerHTML="";return}get("/api/members?q="+encodeURIComponent(v)).then(function(r){$("#posMemRes").innerHTML=(r.results||[]).slice(0,6).map(function(m){return '<button class="lrow" data-pmid="'+m.id+'" data-pmn="'+esc(nm(m))+'"><span><b>'+esc(nm(m))+'</b> <span class="muted" style="font-size:13px">'+esc(m.plan||m.status||"")+'</span></span><span></span></button>'}).join("")||'<div class="muted" style="font-size:13px">No one found. You can still sell without a member.</div>'})},250)});
  mi.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();var b=$("#posMemRes [data-pmid]");if(b)b.click()}})}
}
function posEditProduct(p){
 p=p||{name:"",price:"",category:POS.cat||"Other",active:1};
 $("#posCart").innerHTML='<h2>'+(p.id?"Change "+esc(p.name):"Add a product")+'</h2><label class="fld">Name<input id="ppN" value="'+esc(p.name)+'"></label><label class="fld">Price ($, incl GST)<input id="ppP" inputmode="decimal" value="'+(p.price===""?"":(+p.price).toFixed(2))+'"></label><label class="fld">Group<select id="ppC">'+POS.cats.map(function(c){return '<option'+(c===p.category?" selected":"")+'>'+esc(c)+'</option>'}).join("")+'</select></label>'+(p.id?'<label class="chk"><input type="checkbox" id="ppA"'+(p.active?" checked":"")+'> On sale</label>':"")+'<div style="display:flex;gap:8px"><button class="btn dark" id="ppSave">Save</button><button class="btn line" id="ppBack">Back to the sale</button></div><div id="ppMsg"></div>';
 $("#ppBack").onclick=function(){drawCart()};
 $("#ppSave").onclick=function(){post("/api/pos/product",{id:p.id,name:$("#ppN").value,price:$("#ppP").value,category:$("#ppC").value,active:p.id?$("#ppA").checked:true}).then(function(r){if(!r.ok){$("#ppMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}get("/api/pos").then(function(d){POS.items=d.items;drawPos();drawCart('<div class="ok">Saved.</div>')})})};
}
function loadPosSales(){
 get("/api/pos/sales?day="+$("#posDay").value).then(function(d){if(d.error)return;
  var t=d.totals,sum=(t.eftpos||0)+(t.cash||0);
  $("#posTotals").innerHTML=tile(money(sum),"Taken")+tile(money(t.eftpos||0),"EFTPOS")+tile(money(t.cash||0),"Cash")+tile(d.rows.filter(function(r){return !r.voided}).length,"Sales");
  $("#posSales").innerHTML=d.rows.length?table([["Time",function(r){return new Date(String(r.at).replace(" ","T")+"Z").toLocaleTimeString("en-NZ",{hour:"numeric",minute:"2-digit"})}],["Who",function(r){return r.member_id?'<a href="#" data-member="'+r.member_id+'">'+esc(nm(r))+'</a>':esc(r.customer||"Walk in")},0,1],["What","items"],["Paid",function(r){return r.paid_by==="eftpos"?"EFTPOS":"Cash"}],["Total",function(r){return r.voided?'<s>'+money(r.total)+'</s> <span class="pill warn">Voided</span>':money(r.total)},1,1],["By","staff"],["",function(r){return d.can_void&&!r.voided?'<a href="#" data-pv="'+r.id+'">Void</a>':""},0,1]],d.rows):'<div class="muted">No sales this day.</div>';
 });
}
$("#posDay").addEventListener("change",loadPosSales);
$("#posCats").addEventListener("click",function(e){var b=e.target.closest("[data-pc]");if(!b)return;POS.cat=b.dataset.pc;drawPos()});
$("#posQ").addEventListener("input",function(e){POS.q=e.target.value;drawPos()});
$("#posEditBtn").addEventListener("click",function(){POS.edit=!POS.edit;drawPos();if(!POS.edit)drawCart()});
$("#posAdd").addEventListener("click",function(){posEditProduct(null)});
$("#posGrid").addEventListener("click",function(e){var b=e.target.closest("[data-pp]");if(!b)return;var p=POS.items.find(function(x){return x.id===+b.dataset.pp});if(!p)return;
 if(POS.edit){posEditProduct(p);return}
 var l=POS.cart.find(function(x){return x.id===p.id&&x.price===p.price});if(l)l.qty++;else POS.cart.push({id:p.id,name:p.name,price:p.price,qty:1});drawCart()});
$("#posSales").addEventListener("click",function(e){var a=e.target.closest("[data-pv]");if(!a)return;e.preventDefault();var why=prompt("Why is this sale being voided?","");if(!why)return;post("/api/pos/sale/"+a.dataset.pv+"/void",{reason:why}).then(function(r){if(!r.ok)alert(r.error);loadPosSales()})});
$("#posCart").addEventListener("click",function(e){var t;
 if((t=e.target.closest("[data-pmid]"))){POS.member={id:+t.dataset.pmid,name:t.dataset.pmn};drawCart();return}
 if((t=e.target.closest("[data-pm]"))){if(t.dataset.pm==="clear")POS.member=null;else POS.cart=[];drawCart();return}
 if((t=e.target.closest("[data-cq]"))){var l=POS.cart[+t.dataset.cq];l.qty+=+t.dataset.d;if(l.qty<1)POS.cart.splice(+t.dataset.cq,1);drawCart();return}
 if((t=e.target.closest("[data-cp]"))){e.preventDefault();var l2=POS.cart[+t.dataset.cp],np=prompt("Price for "+l2.name+" this time (for a discount)",l2.price.toFixed(2));if(np===null)return;var n=parseFloat(np);if(!isNaN(n)&&n>=0){l2.price=Math.round(n*100)/100;drawCart()}return}
 if((t=e.target.closest("[data-pay]"))){var pay=t.dataset.pay;t.disabled=true;
  post("/api/pos/sale",{paid_by:pay,member_id:POS.member&&POS.member.id,note:($("#posNote")||{}).value,lines:POS.cart.map(function(l){return {id:l.id,qty:l.qty,price:l.price}})}).then(function(r){
   if(!r.ok){t.disabled=false;drawCart('<div class="err">'+esc(r.error)+'</div>');return}
   var who=POS.member;POS.cart=[];POS.member=null;
   drawCart('<div class="ok">Sold. '+money(r.total)+' by '+(pay==="eftpos"?"EFTPOS":"cash")+(who?" for "+esc(who.name):"")+'.'+(r.key_tag&&who?' <a href="#" data-member="'+who.id+'">Give them their key tag</a>':"")+'</div>');loadPosSales()})}
});

/* ---------- email automations ---------- */
var EMD=null;
function loadEm(){
 get("/api/emails").then(function(d){
  if(d.error){$("#emList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  EMD=d;var on=d.autos.filter(function(a){return a.sending}).length,today=0,sent=0,prev=0,met=0;
  d.autos.forEach(function(a){today+=a.today.length;sent+=a.stats.sent||0;prev+=a.stats.preview||0;met+=a.stats.met||0});
  $("#emMode").textContent=!d.connected?"Preview":on?on+" sending from the Core":"Connected, all in preview";
  $("#emBanner").textContent=!d.connected?"Email sending isn't connected yet, so GymMaster keeps sending everything. Each morning at 9am the Core works out who every automation would email, so you can compare before switching over.":"Sending from "+d.from+". An automation only sends from the Core once it's switched on here, so turn the GymMaster one off at the same time.";
  $("#emTiles").innerHTML=tile(today,"Would email today")+tile((sent+prev).toLocaleString("en-NZ"),"Emails, last 30 days"+(sent?" ("+sent+" sent)":""))+tile(sent+prev?Math.round(met/(sent+prev)*100)+"%":"-","Did what the email asked")+tile(d.unsubs,"Unsubscribed");
  var GO=["Joining","Trials","Bringing people back","Payments","Holds, cancelling and leaving","Milestones and upgrades","Staff alerts","Other"],grp={};
  d.autos.forEach(function(a){var g=a.group||"Other";(grp[g]=grp[g]||[]).push(a)});
  $("#emList").innerHTML=GO.filter(function(g){return grp[g]}).map(function(g){return '<div class="lgrp" style="padding-left:2px">'+esc(g)+' ('+grp[g].length+')</div>'+grp[g].map(emCard).join("")}).join("");
 });
}
function emCard(a){var d=EMD,st=a.stats,n=(st.sent||0)+(st.preview||0),rate=n?Math.round((st.met||0)/n*100):null,hrate=st.held?Math.round((st.held_met||0)/st.held*100):null;
   return '<div class="emc"><div class="top"><h3 style="margin:0;font-size:17px;margin-right:auto">'+esc(a.name)+'</h3>'+(!a.supported?'<span class="pill warn">Not in the Core yet</span>':a.sending?'<span class="pill dark">The Core sends this</span>':'<span class="pill">Preview. GymMaster still sends</span>')+'</div>'+
    '<div class="muted" style="font-size:13px">'+esc(a.when)+(a.types?" \u00b7 "+a.types+" membership types":"")+(a.to==="staff"?" \u00b7 goes to reception":"")+(a.goal_label?". Goal: they "+esc(a.goal_label):"")+'</div>'+
    (a.supported?'<div class="nums"><span><b>'+a.today.length+'</b>today</span><span><b>'+n+'</b>last 30 days</span>'+(a.goal_label?'<span><b>'+(rate==null?"-":rate+"%")+'</b>'+esc(a.goal_label)+'</span>':"")+(hrate!=null?'<span><b>'+hrate+'%</b>without the email</span>':"")+'</div>'+
     (a.today.length?'<details><summary class="muted" style="cursor:pointer;font-size:13px">Who it\'s for today</summary><div style="font-size:14px;margin-top:6px">'+a.today.map(function(p){return '<a href="#" data-member="'+p.id+'">'+esc(p.name)+'</a>'}).join(", ")+'</div></details>':"")+
     '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn line sm" data-emk="'+a.key+'">'+(a.designed?"See and edit the email":"Edit the email")+'</button>'+(d.can_switch?'<button class="btn line sm" data-emsw="'+a.key+'">'+(a.sending?"Hand back to GymMaster":"Send from the Core")+'</button>':"")+'</div>':'<div style="display:flex;gap:8px"><button class="btn line sm" data-emk="'+a.key+'">See the email</button></div>')+'</div>'
}
function emEdit(key){
 var a=EMD.autos.find(function(x){return x.key===key});if(!a)return;
 if(a.designed)return emEditHtml(a);var v=function(k){return esc(a[k]==null?"":a[k])};
 $("#emEdit").innerHTML='<div style="display:flex;gap:10px;align-items:baseline"><h2 style="margin-right:auto">'+esc(a.name)+'</h2><button class="btn line sm" id="emClose">Close</button></div>'+
  '<label class="fld">Subject<input id="emS" value="'+v("subject")+'"></label><label class="fld">Heading<input id="emH" value="'+v("heading")+'"></label>'+
  '<label class="fld">The email (a blank line starts a new paragraph, {first} is their first name)<textarea id="emB" style="min-height:220px">'+v("body")+'</textarea></label>'+
  '<div class="grid2"><label class="fld">Button<input id="emBt" value="'+v("button")+'"></label><label class="fld">Button link<input id="emU" value="'+v("url")+'"></label>'+(EMD.can_switch?'<label class="fld">Comparison group (% who don\'t get it)<input id="emHo" inputmode="numeric" value="'+(a.holdout_pct||0)+'"></label>':"")+'</div>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="emSave">Save</button>'+(EMD.connected?'<button class="btn line" id="emTest">Send me a test</button>':"")+'</div><div id="emMsg"></div>'+
  (a.updated_by?'<div class="muted" style="font-size:13px">Last changed by '+esc(a.updated_by)+', '+esc(day(a.updated_at))+'</div>':"")+
  '<iframe class="emframe" id="emFrame" title="How the email looks" src="/api/emails/'+key+'/preview?t='+Date.now()+'"></iframe>';
 $("#emClose").onclick=function(){$("#emEdit").innerHTML='<h2>Pick an automation</h2><p class="muted" style="margin:0">Change the words, see exactly how it looks, and send yourself a test.</p>'};
 $("#emSave").onclick=function(){var b={subject:$("#emS").value,heading:$("#emH").value,body:$("#emB").value,button:$("#emBt").value,url:$("#emU").value};if($("#emHo"))b.holdout_pct=$("#emHo").value;
  post("/api/emails/"+key,b).then(function(r){if(!r.ok){$("#emMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}$("#emMsg").innerHTML='<div class="ok">Saved.</div>';$("#emFrame").src="/api/emails/"+key+"/preview?t="+Date.now();get("/api/emails").then(function(d){EMD=d})})};
 var t=$("#emTest");if(t)t.onclick=function(){post("/api/emails/"+key,{action:"test"}).then(function(r){$("#emMsg").innerHTML=r.ok?'<div class="ok">Sent to '+esc(r.to)+'.</div>':'<div class="err">'+esc(r.error)+'</div>'})};
 if(window.innerWidth<900)$("#emEdit").scrollIntoView({behavior:"smooth"});
}
function emEditHtml(a){var key=a.key;
 $("#emEdit").innerHTML='<div style="display:flex;gap:10px;align-items:baseline"><h2 style="margin-right:auto">'+esc(a.name)+'</h2><button class="btn line sm" id="emClose">Close</button></div><div class="muted" style="font-size:13px">The designed email copied from GymMaster. Fields like {58:Member Firstname} fill in for each person.</div><div class="muted">Loading...</div>';
 get("/api/emails/"+key+"/source").then(function(c){
  $("#emEdit").innerHTML='<div style="display:flex;gap:10px;align-items:baseline"><h2 style="margin-right:auto">'+esc(a.name)+'</h2><button class="btn line sm" id="emClose">Close</button></div>'+
   '<label class="fld">Subject<input id="emS" value="'+esc(c.subject||"")+'"></label>'+
   '<iframe class="emframe" id="emFrame" title="How the email looks" src="/api/emails/'+key+'/preview?t='+Date.now()+'"></iframe>'+
   '<details><summary class="muted" style="cursor:pointer;font-size:13px">Change the email itself (HTML)</summary><textarea id="emHtml" style="min-height:260px;font:12px/1.4 monospace;width:100%;margin-top:8px">'+esc(c.html||"")+'</textarea></details>'+
   (EMD.can_switch?'<label class="fld" style="max-width:280px">Comparison group (% who don\'t get it)<input id="emHo" inputmode="numeric" value="'+(a.holdout_pct||0)+'"></label>':"")+
   '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="emSave">Save</button>'+(EMD.connected?'<button class="btn line" id="emTest">Send me a test</button>':"")+'</div><div id="emMsg"></div>'+
   (a.updated_by?'<div class="muted" style="font-size:13px">Last changed by '+esc(a.updated_by)+', '+esc(day(a.updated_at))+'</div>':"");
  $("#emClose").onclick=function(){$("#emEdit").innerHTML='<h2>Pick an automation</h2>'};
  $("#emSave").onclick=function(){var b={subject:$("#emS").value,html:$("#emHtml").value};if($("#emHo"))b.holdout_pct=$("#emHo").value;
   post("/api/emails/"+key,b).then(function(r){$("#emMsg").innerHTML=r.ok?'<div class="ok">Saved.</div>':'<div class="err">'+esc(r.error)+'</div>';if(r.ok)$("#emFrame").src="/api/emails/"+key+"/preview?t="+Date.now()})};
  var t=$("#emTest");if(t)t.onclick=function(){post("/api/emails/"+key,{action:"test"}).then(function(r){$("#emMsg").innerHTML=r.ok?'<div class="ok">Sent to '+esc(r.to)+'.</div>':'<div class="err">'+esc(r.error)+'</div>'})};
 });
 if(window.innerWidth<900)$("#emEdit").scrollIntoView({behavior:"smooth"});
}
$("#emList").addEventListener("click",function(e){var b=e.target.closest("[data-emk]");if(b){emEdit(b.dataset.emk);return}
 var w=e.target.closest("[data-emsw]");if(!w)return;var a=EMD.autos.find(function(x){return x.key===w.dataset.emsw}),on=!a.sending;
 if(on&&!confirm("Send "+a.name+" from the Core from tomorrow 9am? Turn the GymMaster version off now so nobody gets two."))return;
 post("/api/emails/"+a.key,{action:"sending",on:on}).then(function(r){if(!r.ok){alert(r.error);return}loadEm()})});

/* ---------- memberships and prices ---------- */
var CAT={data:null,tab:"membership",cur:null};
var CTABS=[["membership","Memberships"],["trial","Trials and passes"],["paid_in_full","Paid in full"],["corporate","Corporate and other"],["off","Not selling"]];
function catTab(c){if(c.status!=="selling")return "off";if(c.kind==="pass")return "trial";if(c.kind==="other")return "corporate";return c.kind}
function catPrice(c){return c.price==null?"-":money(c.price)}
function loadCat(){
 get("/api/catalog").then(function(d){
  if(d.error){$("#catList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  CAT.data=d;drawCat();
  $("#catLog").innerHTML=d.changes.map(function(c){return '<div><span>'+esc(day(c.at))+'</span><span>'+(c.item?'<b>'+esc(c.item)+'</b>: ':"")+esc(c.what)+(c.staff?' <span class="muted">'+esc(c.staff)+'</span>':"")+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>';
 });
}
function drawCat(){
 var d=CAT.data,cnt={};d.items.forEach(function(c){var t=catTab(c);cnt[t]=(cnt[t]||0)+1});
 $("#catTabs").innerHTML=CTABS.map(function(t){return '<button class="chip'+(CAT.tab===t[0]?" on":"")+'" data-ct2="'+t[0]+'">'+t[1]+" "+(cnt[t[0]]||0)+'</button>'}).join("");
 var fo=Object.keys(d.families),rows=d.items.filter(function(c){return catTab(c)===CAT.tab}).sort(function(a,b){return (fo.indexOf(a.family)-fo.indexOf(b.family))||(a.sort-b.sort)||(a.id-b.id)}),h="",grp="";
 rows.forEach(function(c){
  var g=d.families[c.family]||c.family;if(g!==grp){grp=g;h+='<div class="lgrp">'+esc(g)+'</div>'}
  var bits=[c.flexi?"Flexi, 30 days notice":c.lock_in_months?c.lock_in_months+" month lock-in":"",c.length_days?c.length_days+" days":"",c.visits?c.visits+" visits":"",c.joining_fee?"joining "+money(c.joining_fee):"",c.members?c.members+" on it now":""].filter(Boolean);
  var gmWarn=c.gm_id&&!c.gm_seen?"Not found in GymMaster":c.gm_id&&c.gm_price!=null&&c.price!=null&&Math.abs(c.gm_price-c.price)>0.004?"GymMaster says "+money(c.gm_price):!c.gm_id&&c.status==="selling"?"Not in GymMaster yet":"";
  h+='<button class="citem'+(CAT.cur===c.id?" on":"")+'" data-cat="'+c.id+'"><span><b>'+esc(c.name)+'</b>'+(c.status!=="selling"?' <span class="pill">'+esc(d.statuses[c.status])+'</span>':"")+(gmWarn?' <span class="pill warn">'+esc(gmWarn)+'</span>':"")+'</span><span class="pr">'+catPrice(c)+'<span style="display:block;font:500 12px DM Sans,Arial,sans-serif;color:var(--muted)">'+esc((d.billing[c.billing]||"").toLowerCase())+'</span></span><span class="sub">'+esc(bits.join(" \u00b7 "))+'</span></button>';
 });
 $("#catList").innerHTML=h||'<div class="muted" style="padding:10px 0">Nothing here.</div>';
}
function catOpts(map,val){return Object.keys(map).map(function(k){return '<option value="'+k+'"'+(k===val?" selected":"")+'>'+esc(map[k])+'</option>'}).join("")}
function catEdit(c){
 var d=CAT.data,n=!c;c=c||{kind:CAT.tab==="off"||CAT.tab==="corporate"?"membership":CAT.tab,family:"perform",billing:CAT.tab==="trial"?"once":"weekly",status:"selling",at_desk:1,online:0,joining_fee:0,tag_fee:0};
 var v=function(k){return c[k]==null?"":esc(c[k])},ck=function(k,l){return '<label class="chk"><input type="checkbox" data-cf="'+k+'"'+(c[k]?" checked":"")+'> '+l+'</label>'};
 $("#catForm").innerHTML='<div style="display:flex;gap:10px;align-items:baseline"><h2 style="margin-right:auto">'+(n?"Add something new":esc(c.name))+'</h2><button class="btn line sm" id="cfClose">Close</button></div>'+
  (c.gm_id&&c.gm_price!=null&&c.price!=null&&Math.abs(c.gm_price-c.price)>0.004?'<div class="warnbox">GymMaster still charges '+money(c.gm_price)+' for this. Change it there too until GymMaster is switched off.</div>':"")+
  '<label class="fld">Name<input data-cf="name" value="'+v("name")+'" placeholder="M2 Perform - Weekly"></label>'+
  '<div class="grid2"><label class="fld">Type<select data-cf="kind">'+catOpts(d.kinds,c.kind)+'</select></label><label class="fld">Access<select data-cf="family">'+catOpts(d.families,c.family)+'</select></label>'+
  '<label class="fld">Price ($, incl GST)<input data-cf="price" inputmode="decimal" value="'+v("price")+'"></label><label class="fld">Billed<select data-cf="billing">'+catOpts(d.billing,c.billing)+'</select></label>'+
  '<label class="fld">Joining fee ($)<input data-cf="joining_fee" inputmode="decimal" value="'+v("joining_fee")+'"></label><label class="fld">Key tag fee ($)<input data-cf="tag_fee" inputmode="decimal" value="'+v("tag_fee")+'"></label>'+
  '<label class="fld">Lock-in (months)<input data-cf="lock_in_months" inputmode="numeric" value="'+v("lock_in_months")+'"></label><label class="fld">Lasts (days, trials and passes)<input data-cf="length_days" inputmode="numeric" value="'+v("length_days")+'"></label>'+
  '<label class="fld">Visits included (trip passes)<input data-cf="visits" inputmode="numeric" value="'+v("visits")+'"></label><label class="fld">Status<select data-cf="status">'+catOpts(d.statuses,c.status)+'</select></label></div>'+
  '<div class="grid2">'+ck("flexi","Flexi: 30 days notice, no lock-in")+ck("includes_classes","Includes classes")+ck("includes_recovery","Includes recovery")+ck("at_desk","Sold at the desk")+ck("online","Sold online")+'</div>'+
  '<label class="fld">What members see<textarea data-cf="blurb" placeholder="Gym, classes and recovery. Our best value.">'+v("blurb")+'</textarea></label>'+
  '<label class="fld">Note for staff<input data-cf="staff_note" value="'+v("staff_note")+'" placeholder="Only for people who work at the hospital"></label>'+
  '<details'+(c.gm_id?"":" open")+'><summary class="muted" style="cursor:pointer;font-size:13px">GymMaster link (while GymMaster still runs sign-ups)</summary><label class="fld" style="margin-top:8px">GymMaster membership id<input data-cf="gm_id" inputmode="numeric" value="'+v("gm_id")+'" placeholder="Like 844762"></label><p class="muted" style="font-size:13px;margin:4px 0 0">Make the same membership in GymMaster, then put its id here so it shows in Add member and on the join page.'+(c.gm_name?" GymMaster calls it \u201c"+esc(c.gm_name)+"\u201d.":"")+'</p></details>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark" id="cfSave">'+(n?"Add it":"Save changes")+'</button>'+(!n&&c.status==="selling"?'<button class="btn line" id="cfStop">Stop selling</button>':"")+'</div><div id="cfMsg"></div>';
 $("#cfClose").onclick=function(){CAT.cur=null;$("#catForm").innerHTML='<h2>Pick something to change</h2><p class="muted" style="margin:0">Tap any membership, trial or pass to change it.</p>';drawCat()};
 var send=function(extra){var b={id:c.id};$$("#catForm [data-cf]").forEach(function(el){b[el.dataset.cf]=el.type==="checkbox"?el.checked:el.value});for(var k in extra)b[k]=extra[k];
  post("/api/catalog",b).then(function(r){if(!r.ok){$("#cfMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}var keep=r.id||c.id;CAT.cur=keep;
   get("/api/catalog").then(function(d2){CAT.data=d2;var it=d2.items.find(function(x){return x.id===keep});if(it){CAT.tab=catTab(it);catEdit(it)}drawCat();loadCat();$("#cfMsg").innerHTML='<div class="'+(r.warn?"warnbox":"ok")+'">'+esc(r.warn||(r.unchanged?"Nothing changed.":"Saved."))+'</div>'})})};
 $("#cfSave").onclick=function(){send({})};
 var st=$("#cfStop");if(st)st.onclick=function(){if(confirm("Stop selling "+c.name+"? Members already on it keep it."))send({status:"existing"})};
 if(window.innerWidth<900)$("#catForm").scrollIntoView({behavior:"smooth"});
}
$("#catTabs").addEventListener("click",function(e){var b=e.target.closest("[data-ct2]");if(!b)return;CAT.tab=b.dataset.ct2;drawCat()});
$("#catList").addEventListener("click",function(e){var b=e.target.closest("[data-cat]");if(!b)return;CAT.cur=+b.dataset.cat;drawCat();catEdit(CAT.data.items.find(function(x){return x.id===CAT.cur}))});
$("#catNew").addEventListener("click",function(){CAT.cur=null;drawCat();catEdit(null)});

/* ---------- phone notifications ---------- */
function b64k(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";var r=atob(s),o=new Uint8Array(r.length);for(var i=0;i<r.length;i++)o[i]=r.charCodeAt(i);return o}
function pushBox(el){
 var ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=window.navigator.standalone||window.matchMedia("(display-mode: standalone)").matches;
 if(!("serviceWorker" in navigator)||!("PushManager" in window)){
  el.innerHTML=ios&&!standalone?'<p style="margin:0">On an iPhone, notifications work once M2 Core is on your home screen:</p><ol style="margin:6px 0 0;padding-left:20px;font-size:14px;line-height:1.6"><li>Open M2 Core in Safari</li><li>Tap the Share button, then <b>Add to Home Screen</b></li><li>Open M2 Core from the new icon and come back here</li></ol>':'<div class="muted">This browser can\'t do notifications. Open M2 Core on your phone instead.</div>';return}
 get("/api/push").then(function(st){
  var on=Notification.permission==="granted"&&st.phones>0;
  el.innerHTML=(on?'<div class="ok">Notifications are on for '+st.phones+(st.phones===1?" phone":" phones")+'.</div>':Notification.permission==="denied"?'<div class="warnbox">Notifications are blocked for M2 Core. Turn them on in your phone\'s settings, then come back.</div>':'<p class="muted" style="margin:0">Your phone will buzz the moment something comes in, even when M2 Core is closed.</p>')+
   '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn '+(on?"line":"dark")+' sm" data-push="1">'+(on?"Send me a test":"Turn on notifications")+'</button></div><div data-pmsg></div>';
  el.querySelector("[data-push]").onclick=function(){var b=this,m=el.querySelector("[data-pmsg]");b.disabled=true;m.innerHTML='<div class="muted">Asking your phone...</div>';
   Notification.requestPermission().then(function(p){
    if(p!=="granted")throw new Error("Notifications weren't allowed.");
    return navigator.serviceWorker.register("/sw.js").then(function(){return navigator.serviceWorker.ready});
   }).then(function(reg){return reg.pushManager.getSubscription().then(function(old){return old||reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64k(st.key)})})})
   .then(function(sub){return post("/api/push",{sub:sub.toJSON(),ua:navigator.userAgent,test:true})})
   .then(function(r){b.disabled=false;if(!r.ok)throw new Error(r.error);m.innerHTML='<div class="ok">Done. A test notification is on its way.</div>';setTimeout(function(){pushBox(el)},2500)})
   .catch(function(e){b.disabled=false;m.innerHTML='<div class="err">'+esc(e.message||e)+'</div>'})};
 });
}

/* ---------- PT leads (owners) ---------- */
var PT={data:null,tab:"open",pick:{}};
var PTST={assigned:["With the trainer",""],contacted:["Contacted",""],booked:["Session booked","ok"],client:["Became a client","dark"],lost:["Not going ahead","warn"],"new":["Waiting","warn"]};
function ptCount(){get("/api/pt").then(function(d){if(d.error)return;var n=d.waiting.length;$("#ctPt").hidden=!n;$("#ctPt").textContent=n})}
function ptAns(l){return '<dl class="ptans">'+(l.reason?'<dt>Why</dt><dd>'+esc(l.reason)+'</dd>':"")+(l.wants?'<dt>Wants</dt><dd>'+esc(l.wants)+'</dd>':"")+(l.style?'<dt>Training style</dt><dd>'+esc(l.style)+'</dd>':"")+(l.best_time?'<dt>Best time</dt><dd>'+esc(l.best_time)+'</dd>':"")+(l.injuries?'<dt>Injuries</dt><dd>'+esc(l.injuries)+'</dd>':"")+'<dt>Contact</dt><dd>'+(l.mobile?'<a href="tel:'+esc(l.mobile)+'">'+esc(l.mobile)+'</a>':"No mobile")+(l.email?" \u00b7 "+esc(l.email):"")+'</dd></dl>'}
function ptAgo(s){return s?ago(String(s).slice(0,16)):""}
function loadPt(){
 get("/api/pt").then(function(d){
  if(d.error){$("#ptWait").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  PT.data=d;var st=d.stats||{};
  $("#ctPt").hidden=!d.waiting.length;$("#ctPt").textContent=d.waiting.length;
  $("#ptTiles").innerHTML=tile(d.waiting.length,"Waiting for you")+tile(d.open.length,"With trainers now")+tile(st.n||0,"Came in, last 30 days")+tile(st.won||0,"Became clients, last 30 days")+tile(st.hours_to_assign!=null?(st.hours_to_assign<48?Math.round(st.hours_to_assign)+" h":Math.round(st.hours_to_assign/24)+" days"):"-","Average time to hand out");
  $("#ptNote").textContent="New requests come in from the free PT form every 15 minutes"+(d.last_sync?", last checked "+ago(d.last_sync.replace("T"," ").slice(0,16)):"")+". "+(d.sheet_linked?"Trainers also see them on the old PT board until everyone has moved over.":"Trainers using the old PT board won't see Core assignments until the PT_ADMIN_KEY secret is added to m2-core.");
  var T=d.trainers;
  $("#ptWait").innerHTML=d.waiting.length?d.waiting.map(function(l){var fresh=lAge(l)<1;return '<div class="ptcard'+(fresh?" fresh":"")+'" data-pt="'+l.id+'"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h3 style="margin:0;font-size:18px">'+esc(l.name||"No name")+'</h3><span class="age'+(lAge(l)>1?" late":"")+'">'+esc(ptAgo(l.created_at))+'</span>'+(l.source?'<span class="muted" style="font-size:13px">'+esc(l.source)+'</span>':"")+'</div>'+ptAns(l)+
   '<div class="ptwho">'+T.map(function(t){return '<button data-ptwho="'+t.id+'" class="'+(PT.pick[l.id]===t.id?"on":"")+'">'+esc(t.name.split(" ")[0])+'<span>'+t.open+(t.phones?" \ud83d\udd14":"")+'</span></button>'}).join("")+'</div>'+
   '<div style="display:flex;gap:8px;flex-wrap:wrap"><input data-ptnote placeholder="Note for the trainer (optional)" style="flex:1;min-width:180px;height:42px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn dark sm" data-ptgive style="height:42px">Give to '+(PT.pick[l.id]?esc((T.find(function(t){return t.id===PT.pick[l.id]})||{name:"them"}).name.split(" ")[0]):"a trainer")+'</button></div><div data-pterr></div></div>'}).join(""):'<div class="ok">Nothing waiting. Every lead has a trainer.</div>';
  $("#ptTrainers").innerHTML='<div class="tline" style="border:0;color:var(--muted);font-size:12px"><span>Trainer</span><span>Open</span><span>30 days</span><span>Won</span></div>'+T.map(function(t){return '<div class="tline"><span><b>'+esc(t.name)+'</b>'+(t.phones?' <span title="Notifications on">\ud83d\udd14</span>':"")+'</span><span>'+t.open+'</span><span>'+t.month+'</span><span>'+t.won+'</span></div>'}).join("");
  drawPtOpen();
  pushBox($("#ptPush"));
 });
}
function drawPtOpen(){
 var d=PT.data,rows=PT.tab==="open"?d.open:d.closed;
 $("#ptTabs").innerHTML='<button class="chip'+(PT.tab==="open"?" on":"")+'" data-ptt="open">Open '+d.open.length+'</button><button class="chip'+(PT.tab==="closed"?" on":"")+'" data-ptt="closed">Finished, 60 days '+d.closed.length+'</button>';
 $("#ptOpen").innerHTML=rows.length?table([["Name",function(x){return '<a href="#" data-ptopen="'+x.id+'">'+esc(x.name||"No name")+'</a>'},0,1],["Trainer",function(x){return x.trainer||""}],["Where it's at",function(x){var s=PTST[x.pt_status]||[x.pt_status,""];return '<span class="pill '+s[1]+'">'+esc(s[0])+'</span>'+(x.pt_status==="assigned"&&!x.seen_at?' <span class="muted" style="font-size:12px">not opened yet</span>':"")},0,1],["Given out",function(x){return ptAgo(x.assigned_at)}],["Came in",function(x){return day(x.created_at)}]],rows):'<div class="muted">Nothing here.</div>';
}
$("#ptTabs").addEventListener("click",function(e){var b=e.target.closest("[data-ptt]");if(!b)return;PT.tab=b.dataset.ptt;drawPtOpen()});
$("#ptWait").addEventListener("click",function(e){
 var c=e.target.closest("[data-pt]");if(!c)return;var id=+c.dataset.pt,w=e.target.closest("[data-ptwho]");
 if(w){PT.pick[id]=+w.dataset.ptwho;c.querySelectorAll("[data-ptwho]").forEach(function(x){x.classList.toggle("on",x===w)});c.querySelector("[data-ptgive]").textContent="Give to "+w.firstChild.textContent;return}
 if(e.target.closest("[data-ptgive]")){var err=c.querySelector("[data-pterr]");if(!PT.pick[id]){err.innerHTML='<div class="err">Pick a trainer first.</div>';return}
  e.target.disabled=true;post("/api/pt/"+id+"/assign",{staff_id:PT.pick[id],note:c.querySelector("[data-ptnote]").value}).then(function(r){if(!r.ok){e.target.disabled=false;err.innerHTML='<div class="err">'+esc(r.error)+'</div>';return}
   c.innerHTML='<div class="ok">Given to '+esc(e.target.textContent.replace("Give to ",""))+'.'+(r.pushed&&r.pushed.sent?" Their phone just buzzed.":" They haven't turned on notifications yet, so let them know.")+'</div>';setTimeout(loadPt,1600)})}
});
$("#ptOpen").addEventListener("click",function(e){var a=e.target.closest("[data-ptopen]");if(!a)return;e.preventDefault();var id=+a.dataset.ptopen;
 get("/api/pt/"+id).then(function(r){if(r.error)return;var l=r.lead,T=PT.data.trainers;
  $("#ptMove").innerHTML='<div class="ptcard" style="border-color:var(--line);margin-top:12px"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h3 style="margin:0;margin-right:auto">'+esc(l.name||"Lead")+'</h3><button class="btn line sm" data-ptx>Close</button></div>'+ptAns(l)+
   '<label class="fld" style="max-width:300px">Move to<select data-ptre><option value="">Pick a trainer</option>'+T.map(function(t){return '<option value="'+t.id+'"'+(t.id===l.assigned_to?" selected":"")+'>'+esc(t.name)+'</option>'}).join("")+'</select></label>'+
   '<div class="hist">'+r.activity.map(function(a){return '<div><span>'+esc(day(a.at))+'</span><span>'+esc(a.detail)+(a.staff?' <span class="muted">'+esc(a.staff)+'</span>':"")+'</span></div>'}).join("")+'</div></div>';
  var box=$("#ptMove");box.querySelector("[data-ptx]").onclick=function(){box.innerHTML=""};
  box.querySelector("[data-ptre]").onchange=function(){var v=+this.value;if(!v||v===l.assigned_to)return;post("/api/pt/"+id+"/assign",{staff_id:v}).then(function(){box.innerHTML='<div class="ok">Moved.</div>';loadPt()})};
  box.scrollIntoView({behavior:"smooth",block:"nearest"})})});
$("#ptSync").addEventListener("click",function(){var b=this;b.disabled=true;b.textContent="Checking...";post("/api/pt/sync").then(function(r){b.disabled=false;b.textContent="Check for new ones";loadPt()})});

/* ---------- my PT leads (trainers) ---------- */
function myPtCount(){get("/api/pt/mine").then(function(d){var n=(d.leads||[]).filter(function(l){return l.pt_status==="assigned"}).length;$("#ctMyPt").hidden=!n;$("#ctMyPt").textContent=n})}
function loadMyPt(){
 pushBox($("#myPush"));
 get("/api/pt/mine").then(function(d){
  var L=d.leads||[];$("#ctMyPt").hidden=true;
  $("#myPt").innerHTML=L.length?L.map(function(l){var s=PTST[l.pt_status]||[l.pt_status,""],done=l.pt_status==="client"||l.pt_status==="lost";
   return '<div class="ptcard'+(!l.seen_at?" fresh":"")+'" data-my="'+l.id+'"><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h3 style="margin:0;font-size:18px;margin-right:auto">'+esc(l.name||"No name")+'</h3><span class="pill '+s[1]+'">'+esc(s[0])+'</span></div>'+
    (l.tim_note?'<div class="warnbox" style="padding:8px 12px">From Tim: '+esc(l.tim_note)+'</div>':"")+ptAns(l)+
    (l.mobile?'<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn dark sm" href="tel:'+esc(l.mobile)+'">Call</a><a class="btn line sm" href="sms:'+esc(l.mobile)+'">Text</a></div>':"")+
    (done?"":'<div class="ptst">'+[["contacted","Contacted"],["booked","Session booked"],["client","Became a client"],["lost","Not going ahead"]].map(function(o){return '<button class="btn sm '+(l.pt_status===o[0]?"dark":"line")+'" data-myst="'+o[0]+'">'+o[1]+'</button>'}).join("")+'</div>')+
    '<div style="display:flex;gap:8px"><input data-mynote placeholder="Add a note" style="flex:1;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn line sm" data-mysave style="height:40px">Save</button></div><div data-myerr></div></div>'}).join(""):'<section class="card"><div class="muted">No PT leads yet. When Tim gives you one, it shows up here'+(Notification&&Notification.permission==="granted"?" and your phone buzzes.":".")+'</div></section>';
 });
}
$("#myPt").addEventListener("click",function(e){
 var c=e.target.closest("[data-my]");if(!c)return;var id=+c.dataset.my,st=e.target.closest("[data-myst]");
 if(!st&&!e.target.closest("[data-mysave]"))return;
 var body={note:c.querySelector("[data-mynote]").value};if(st)body.status=st.dataset.myst;
 post("/api/pt/"+id,body).then(function(r){if(!r.ok){c.querySelector("[data-myerr]").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}loadMyPt()});
});

/* ---------- key tag lookup ---------- */
$("#lookTag").addEventListener("keydown",function(e){
 if(e.key!=="Enter")return;e.preventDefault();var v=e.target.value.trim().replace(/\s+/g,"");if(!v)return;
 get("/api/key-tags/"+encodeURIComponent(v)).then(function(d){
  var h=d.current?'<div class="ok">Belongs to <a href="#" data-member="'+d.current.id+'"><b>'+esc(nm(d.current))+'</b></a>.</div>':'<div class="warnbox">Not on anyone right now.</div>';
  if(d.history&&d.history.length)h+='<div class="hist">'+d.history.map(function(x){return '<div><span>'+esc(day(x.assigned_at))+'</span><span>'+esc(nm(x))+' <span class="pill">'+esc(x.status)+'</span></span></div>'}).join("")+'</div>';
  $("#lookRes").innerHTML=h;e.target.select();
 });
});

/* ---------- camera ---------- */
// Works with the USB camera at reception, a laptop camera, or a phone or tablet.
function initials(n){return String(n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(function(x){return x[0].toUpperCase()}).join("")||"?"}
var CAM={stream:null,done:null,shot:null};
function camStop(){if(CAM.stream){CAM.stream.getTracks().forEach(function(t){t.stop()});CAM.stream=null}}
function camStart(devId){
 camStop();$("#camErr").textContent="";
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$("#camErr").textContent="This browser can't use a camera. Use Upload a photo instead.";return Promise.resolve()}
 var v={width:{ideal:1280},height:{ideal:720}};if(devId)v.deviceId={exact:devId};
 return navigator.mediaDevices.getUserMedia({video:v,audio:false}).then(function(s){
  CAM.stream=s;$("#camVid").srcObject=s;
  var id=s.getVideoTracks()[0].getSettings().deviceId;try{if(id)localStorage.setItem("m2cam",id)}catch(e){}
  return navigator.mediaDevices.enumerateDevices().then(function(list){
   var cams=list.filter(function(d){return d.kind==="videoinput"});
   $("#camDev").innerHTML=cams.map(function(c,i){return '<option value="'+esc(c.deviceId)+'"'+(c.deviceId===id?" selected":"")+'>'+esc(c.label||("Camera "+(i+1)))+'</option>'}).join("");
  });
 }).catch(function(e){$("#camErr").textContent=(e&&e.name==="NotAllowedError")?"Chrome blocked the camera. Click the camera icon in the address bar and allow it.":"Can't find a camera. Check the USB camera is plugged in, or use Upload a photo."});
}
function openCam(who,done){
 CAM.done=done;CAM.shot=null;$("#camWho").textContent=who||"";$("#cam").hidden=false;
 $("#camShot").hidden=true;$("#camVid").hidden=false;$("#camSnap").hidden=false;$("#camRetake").hidden=true;$("#camUse").hidden=true;
 var saved=null;try{saved=localStorage.getItem("m2cam")}catch(e){}
 camStart(saved).then(function(){if(!CAM.stream&&saved)camStart(null)});
}
function closeCam(){camStop();$("#cam").hidden=true}
function squareJpeg(src,w,h){var s=Math.min(w,h),c=document.createElement("canvas");c.width=480;c.height=480;c.getContext("2d").drawImage(src,(w-s)/2,(h-s)/2,s,s,0,0,480,480);return c.toDataURL("image/jpeg",0.82)}
function showShot(url){CAM.shot=url;$("#camShot").src=url;$("#camShot").hidden=false;$("#camVid").hidden=true;$("#camSnap").hidden=true;$("#camRetake").hidden=false;$("#camUse").hidden=false}
$("#camSnap").addEventListener("click",function(){var v=$("#camVid");if(!v.videoWidth){$("#camErr").textContent="The camera isn't ready yet.";return}showShot(squareJpeg(v,v.videoWidth,v.videoHeight))});
$("#camRetake").addEventListener("click",function(){CAM.shot=null;$("#camShot").hidden=true;$("#camVid").hidden=false;$("#camSnap").hidden=false;$("#camRetake").hidden=true;$("#camUse").hidden=true});
$("#camUse").addEventListener("click",function(){var u=CAM.shot,d=CAM.done;closeCam();if(d&&u)d(u)});
$("#camClose").addEventListener("click",closeCam);
$("#cam").addEventListener("click",function(e){if(e.target.id==="cam")closeCam()});
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!$("#cam").hidden)closeCam()});
$("#camDev").addEventListener("change",function(e){camStart(e.target.value)});
$("#camFile").addEventListener("change",function(e){var f=e.target.files&&e.target.files[0];if(!f)return;var im=new Image();im.onload=function(){showShot(squareJpeg(im,im.naturalWidth,im.naturalHeight));URL.revokeObjectURL(im.src)};im.src=URL.createObjectURL(f);e.target.value=""});
// Profile and Today: take or retake a member's photo.
document.addEventListener("click",function(e){var b=e.target.closest("[data-photo]");if(!b)return;var id=+b.dataset.photo;
 openCam(b.dataset.name,function(url){post("/api/members/"+id+"/photo",{jpeg:url}).then(function(r){if(!r.ok){alert(r.error);return}
  if(VIEW==="today")loadToday();else openMember(id)})})});
// Add member: photo before saving.
var PHOTO=null;
$("#aPhotoBtn").addEventListener("click",function(){openCam(($("#first").value+" "+$("#last").value).trim(),function(url){PHOTO=url;$("#aFace").innerHTML='<img src="'+url+'" alt="New member photo">';$("#aPhotoBtn").textContent="Retake photo";$("#aNoPhoto").checked=false})});

/* ---------- reports ---------- */
var REP={kind:"current_members"};
function repQuery(){var q="kind="+REP.kind;if(!$("#repDates").hidden&&$("#repFrom").value)q+="&from="+$("#repFrom").value+"&to="+$("#repTo").value;return q}
function loadReport(){
 get("/api/report?"+repQuery()).then(function(d){
  if(d.error){$("#repTable").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  $("#repKinds").innerHTML=d.reports.map(function(r){return '<button class="chip'+(r.kind===d.kind?" on":"")+'" data-rk="'+r.kind+'">'+esc(r.title)+'</button>'}).join("");
  $("#repDates").hidden=!d.dates;if(d.dates){$("#repFrom").value=d.from;$("#repTo").value=d.to}
  $("#repTitle").textContent=d.title;$("#repCount").textContent=d.total.toLocaleString("en-NZ")+(d.total>500?" (first 500 shown, all in the CSV)":"");
  $("#repCsv").href="/api/report?"+repQuery()+"&format=csv";
  REP.d=d;REP.sort=null;drawReport();
 });
}
function drawReport(){
 var d=REP.d;if(!d)return;var q=($("#repQ").value||"").trim().toLowerCase(),rows=d.rows;
 if(q)rows=rows.filter(function(r){return d.columns.some(function(c){return String(r[c]==null?"":r[c]).toLowerCase().indexOf(q)>=0})});
 if(REP.sort){var c=REP.sort.c,dir=REP.sort.dir,num=function(v){var n=parseFloat(String(v).replace(/[$,]/g,""));return isNaN(n)?null:n};rows=rows.slice().sort(function(a,b){var x=a[c],y=b[c],nx=num(x),ny=num(y);var r=(nx!=null&&ny!=null)?nx-ny:String(x==null?"":x).localeCompare(String(y==null?"":y));return r*dir})}
 var idc=d.columns.indexOf("ID")>=0?"ID":d.columns.indexOf("Member ID")>=0?"Member ID":null;
 $("#repTable").innerHTML=rows.length?'<table class="tbl"><thead><tr>'+d.columns.map(function(c){return '<th data-rs="'+esc(c)+'" style="cursor:pointer">'+esc(c)+(REP.sort&&REP.sort.c===c?(REP.sort.dir>0?" \u2191":" \u2193"):"")+'</th>'}).join("")+'</tr></thead><tbody>'+rows.map(function(r){var id=idc&&r[idc];return '<tr'+(id?' data-member="'+id+'" style="cursor:pointer"':"")+'>'+d.columns.map(function(c){var v=r[c];return '<td>'+esc(v==null?"":v)+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table>':'<div class="muted">Nothing for this one.</div>';
 if(q)$("#repCount").textContent=rows.length+" of "+d.total.toLocaleString("en-NZ");
}
$("#repQ").addEventListener("input",drawReport);
$("#repTable").addEventListener("click",function(e){var h=e.target.closest("[data-rs]");if(!h)return;var c=h.dataset.rs;REP.sort=REP.sort&&REP.sort.c===c?{c:c,dir:-REP.sort.dir}:{c:c,dir:1};drawReport()});
$("#repKinds").addEventListener("click",function(e){var b=e.target.closest("[data-rk]");if(!b)return;REP.kind=b.dataset.rk;$("#repFrom").value="";$("#repTo").value="";loadReport()});
$("#repFrom").addEventListener("change",loadReport);$("#repTo").addEventListener("change",loadReport);

/* ---------- charts ---------- */
var MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function ml(ym){var p=String(ym||"").split("-");return p.length>1?MON[+p[1]-1]+(p[1]==="01"?" "+p[0].slice(2):""):String(ym)}
function k$(n){n=Number(n||0);var a=Math.abs(n);return (n<0?"-":"")+"$"+(a>=1e6?(a/1e6).toFixed(2)+"m":a>=1e4?Math.round(a/1e3)+"k":a>=1e3?(a/1e3).toFixed(1)+"k":Math.round(a))}
function whole$(n){return "$"+Math.round(Number(n||0)).toLocaleString("en-NZ")}
// cols: [{label, vals:[...]}], series: [{name, cls}]
function bars(cols,series,fmt){
 fmt=fmt||function(x){return x};
 var mx=1;cols.forEach(function(c){c.vals.forEach(function(v){mx=Math.max(mx,Math.abs(v||0))})});
 return '<div class="chart">'+cols.map(function(c){return '<div class="c">'+c.vals.map(function(v,i){return '<i class="b '+(series[i]&&series[i].cls||"")+(v<0?" neg":"")+'" style="height:'+Math.max(1,Math.round(Math.abs(v||0)/mx*100))+'%" title="'+esc(c.label+": "+(series[i]?series[i].name+" ":"")+fmt(v))+'"></i>'}).join("")+'</div>'}).join("")+'</div>'+
  '<div class="clab">'+cols.map(function(c){return '<span>'+esc(c.label)+'</span>'}).join("")+'</div>'+
  (series.length>1?'<div class="legend">'+series.map(function(s){return '<span><i class="'+s.cls+'" style="background:'+(s.cls==="s1"?"#C9C9BF":s.cls==="s2"?"var(--olive)":"var(--ink)")+'"></i>'+esc(s.name)+'</span>'}).join("")+'</div>':"");
}
function hbars(rows,fmt){fmt=fmt||function(x){return x};var mx=1;rows.forEach(function(r){mx=Math.max(mx,r[1]||0)});
 return rows.length?rows.map(function(r){return '<div class="hb"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r[0])+'</span><span class="bar"><i style="width:'+Math.round((r[1]||0)/mx*100)+'%"></i></span><b>'+esc(fmt(r[1]||0))+'</b></div>'}).join(""):'<div class="muted">Nothing yet.</div>'}
function lineChart(pts){
 if(pts.length<2)return '<div class="muted">Builds up from today: the Core takes a count every night.</div>';
 var ys=pts.map(function(p){return p[1]}),lo=Math.min.apply(null,ys),hi=Math.max.apply(null,ys);if(hi===lo){hi+=1;lo-=1}var pad=(hi-lo)*.15;lo-=pad;hi+=pad;
 var W=600,Hh=150,xy=pts.map(function(p,i){return [Math.round(i/(pts.length-1)*W),Math.round(Hh-(p[1]-lo)/(hi-lo)*Hh)]});
 return '<svg viewBox="0 0 600 170" preserveAspectRatio="none" role="img" aria-label="Members over time"><polyline fill="none" stroke="#0A0A0A" stroke-width="2.5" vector-effect="non-scaling-stroke" points="'+xy.map(function(p){return p.join(",")}).join(" ")+'"/><polygon fill="rgba(223,255,0,.35)" points="0,150 '+xy.map(function(p){return p.join(",")}).join(" ")+' 600,150"/></svg>'+
  '<div class="clab"><span style="text-align:left">'+esc(pts[0][0])+'</span><span style="text-align:right">'+esc(pts[pts.length-1][0])+'</span></div>';
}
function table(cols,rows){return '<table class="tbl"><thead><tr>'+cols.map(function(c){return '<th'+(c[2]?' class="r"':"")+'>'+esc(c[0])+'</th>'}).join("")+'</tr></thead><tbody>'+rows.map(function(r){return '<tr'+(r._member?' data-member="'+r._member+'" style="cursor:pointer"':"")+'>'+cols.map(function(c){var v=typeof c[1]==="function"?c[1](r):r[c[1]];return '<td'+(c[2]?' class="r"':"")+'>'+(c[3]?v:esc(v==null?"":v))+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table>'}
function tile(n,l){return '<div class="tile"><div class="n">'+esc(n)+'</div><div class="l">'+esc(l)+'</div></div>'}

/* ---------- classes ---------- */
var CLS={week:null,data:null,cur:null};
function loadClasses(w){
 get("/api/classes"+(w?"?week="+w:"")).then(function(d){
  if(d.error){$("#clsWeek").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  CLS.data=d;CLS.week=d.week;
  var mon=new Date(d.week+"T12:00:00");
  $("#clsTitle").textContent=(d.today>=d.week&&d.today<d.next?"This week":"Week of "+mon.toLocaleDateString("en-NZ",{day:"numeric",month:"long"}));
  $("#clsCount").textContent=d.classes.length+" classes, "+d.classes.reduce(function(a,c){return a+c.booked},0)+" booked";
  var bk=0,sp=0,fu=0,wl=0,qu=0,top=null;d.classes.forEach(function(c){bk+=c.booked;sp+=c.max;if(c.max&&c.booked>=c.max)fu++;wl+=c.waitlist||0;if(c.day>=d.today&&c.max&&c.booked/c.max<0.25)qu++;if(!top||c.booked>top.booked)top=c});
  var types={};d.classes.forEach(function(c){var t=types[c.name]=types[c.name]||{b:0,s:0};t.b+=c.booked;t.s+=c.max});
  var best=Object.keys(types).sort(function(a,b){return types[b].b/Math.max(types[b].s,1)-types[a].b/Math.max(types[a].s,1)})[0];
  $("#clsTiles").innerHTML=tile(d.classes.length,"Classes this week")+tile(bk,"Spots booked")+tile(sp?Math.round(bk/sp*100)+"%":"-","How full, on average")+tile(fu,"Full classes")+tile(wl,"On waitlists")+tile(qu,"Coming up under a quarter full")+(best?tile(best,"Fullest class type"):"");
  var PAL=["#0A0A0A","#5E6B00","#DFFF00","#8C8C84","#C9A227","#3B6E8F","#A33A00"],names=Object.keys(types).sort(),col={};names.forEach(function(n,i){col[n]=PAL[i%PAL.length]});
  $("#clsLegend").innerHTML=names.map(function(n){return '<span><i style="background:'+col[n]+'"></i>'+esc(n)+' '+d.classes.filter(function(c){return c.name===n}).length+'</span>'}).join("");
  $("#clsNote2").innerHTML=d.classes.length&&!bk?'<div class="warnbox" style="margin-bottom:6px">Nobody has booked through GymMaster this week. Bookings show here as soon as members book in the M2 App or GymMaster, and reception can book people in by tapping a class.</div>':"";
  var days7=[0,1,2,3,4,5,6].map(function(i){var x=new Date(d.week+"T12:00:00Z");x.setUTCDate(x.getUTCDate()+i);return x.toISOString().slice(0,10)});
  $("#clsWeek").className="ccal";
  $("#clsWeek").innerHTML=days7.map(function(dy){var list=d.classes.filter(function(c){return c.day===dy});var dd=new Date(dy+"T12:00:00");
   return '<div class="cd'+(dy===d.today?" today":"")+'"><div class="cdh"><span>'+esc(dd.toLocaleDateString("en-NZ",{weekday:"short"}))+(dy===d.today?", today":"")+'</span><b>'+dd.getDate()+'</b></div>'+
    list.map(function(c){var pct=c.max?Math.round(c.booked/c.max*100):0,full=c.max&&c.booked>=c.max;
     return '<button class="cb'+(dy<d.today?" past":"")+(CLS.cur&&CLS.cur.id===c.id?" on":"")+'" data-cls="'+c.id+'" style="border-left-color:'+col[c.name]+'"><span class="ct2">'+esc(c.time||c.start)+'</span><b>'+esc(c.name)+'</b><span class="co">'+esc(c.coach||"No coach")+'</span><div class="fill"><i class="'+(full?"full":"")+'" style="width:'+pct+'%"></i></div><span class="co">'+c.booked+' of '+c.max+' booked'+(c.waitlist?", "+c.waitlist+" waiting":"")+'</span></button>'}).join("")+(list.length?"":'<div class="muted" style="padding:6px 2px">No classes</div>')+'</div>'}).join("");
 });
}
$("#clsPrev").addEventListener("click",function(){if(CLS.data)loadClasses(CLS.data.prev)});
function pctRows(list){return hbars(list.map(function(x){return [x.k+" ("+x.classes+")",x.fill||0]}),function(v){return v+"%"})}
function loadClassStats(){
 get("/api/classes/stats").then(function(d){
  if(!d.tracked){$("#csNote").textContent="Builds up as classes run.";}
  else $("#csNote").textContent=d.tracked+" classes tracked since "+day(d.since);
  $("#csName").innerHTML=pctRows(d.byName||[]);$("#csCoach").innerHTML=pctRows(d.byCoach||[]);$("#csHour").innerHTML=pctRows(d.byHour||[]);
  $("#csDay").innerHTML=pctRows((d.byDay||[]).map(function(x){return {k:x.k.slice(2),classes:x.classes,fill:x.fill}}));
  $("#csWeek").innerHTML=(d.byWeek||[]).length?bars(d.byWeek.map(function(w){return {label:day(w.k),vals:[w.booked||0,w.spots||0]}}),[{name:"Booked",cls:""},{name:"Spots",cls:"s1"}]):'<div class="muted">Nothing yet.</div>';
 });
}
$("#clsNext").addEventListener("click",function(){if(CLS.data)loadClasses(CLS.data.next)});
$("#clsNow").addEventListener("click",function(){loadClasses(null)});
$("#clsWeek").addEventListener("click",function(e){var b=e.target.closest("[data-cls]");if(!b)return;var c=CLS.data.classes.find(function(x){return String(x.id)===b.dataset.cls});CLS.cur=c;$$(".cb").forEach(function(x){x.classList.toggle("on",x===b)});document.querySelector("#clsPanel").scrollIntoView({behavior:"smooth",block:"nearest"});openClass(c)});
function clsLabel(c){return c.name+", "+new Date(c.day+"T12:00:00").toLocaleDateString("en-NZ",{weekday:"short",day:"numeric",month:"short"})+" "+c.time}
function openClass(c){
 var P=$("#clsPanel");
 P.innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>'+esc(c.name)+'</h2><span class="muted">'+esc(clsLabel(c).split(", ")[1])+'</span></div><dl class="kv"><dt>Coach</dt><dd>'+esc(c.coach||"-")+'</dd><dt>Booked</dt><dd>'+c.booked+' of '+c.max+(c.waitlist?", "+c.waitlist+" waiting":"")+'</dd>'+(c.location?'<dt>Where</dt><dd>'+esc(c.location)+'</dd>':"")+'</dl>'+
  (CLS.data.can_book&&c.day>=CLS.data.today?'<div><label class="sr" for="clsQ">Find a member to book</label><div class="search" style="height:42px"><input id="clsQ" autocomplete="off" placeholder="Book someone in: name, mobile or key tag"></div><div class="list" id="clsFind"></div><div class="err" id="clsErr"></div></div>':"")+
  '<div id="clsAtt"><div class="muted">Getting the list from GymMaster...</div></div>';
 var q=$("#clsQ"),t;if(q)q.addEventListener("input",function(){clearTimeout(t);t=setTimeout(function(){var v=q.value;if(v.trim().length<2){$("#clsFind").innerHTML="";return}
  get("/api/members?q="+encodeURIComponent(v)).then(function(d){$("#clsFind").innerHTML=(d.results||[]).slice(0,8).map(function(m){return '<div class="r" style="cursor:default"><span><b>'+esc(nm(m))+'</b> <span class="muted">'+esc(m.plan||m.status)+'</span></span><button class="btn dark sm" data-book="'+m.id+'">Book</button></div>'}).join("")||'<div class="muted">No one found.</div>'})},250)});
 get("/api/classes/"+c.id).then(function(d){
  if(d.error){$("#clsAtt").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var a=d.attendees||[];
  $("#clsAtt").innerHTML=(a.length?'<h3 style="margin-top:6px">Who\'s coming</h3>':'<div class="muted">Nobody booked yet.</div>')+a.map(function(p){
   return '<div class="att"><div class="face sm">'+(p.has_photo?'<img src="/api/members/'+p.member_id+'/photo" alt="">':esc(initials(p.name)))+'</div><div class="who"><b>'+(p.open?'<a href="#" data-member="'+p.member_id+'">'+esc(p.name)+'</a>':esc(p.name))+'</b> '+(p.status!=="booked"?'<span class="pill'+(p.status==="waitlist"?" warn":" ok")+'">'+esc(p.status==="waitlist"?"Waitlist":p.status==="attended"?"Here":p.status)+'</span> ':"")+(p.blocked?'<span class="pill warn">Owes money</span> ':"")+(p.passport?'<span class="pill">Passport</span>':"")+'</div>'+
    (CLS.data.can_book&&c.day>=CLS.data.today&&p.member_id?'<button class="btn line sm" data-unbook="'+p.member_id+'" data-bid="'+esc(p.booking_id||"")+'">Cancel</button>':"")+'</div>'}).join("")+
   (d.unknown_fields?'<div class="muted">GymMaster sent fields the Core doesn\'t know yet: '+esc(d.unknown_fields.join(", "))+'</div>':"");
 });
}
$("#clsPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-book]"),u=e.target.closest("[data-unbook]"),c=CLS.cur;if(!c||(!b&&!u))return;
 if(b){b.disabled=true;$("#clsErr").textContent="";post("/api/classes/"+c.id+"/book",{member_id:+b.dataset.book,label:clsLabel(c)}).then(function(r){if(!r.ok){b.disabled=false;$("#clsErr").textContent=r.error;return}c.booked++;openClass(c);loadClasses(CLS.week)})}
 if(u){if(!confirm("Cancel this booking?"))return;u.disabled=true;post("/api/classes/"+c.id+"/cancel",{member_id:+u.dataset.unbook,booking_id:u.dataset.bid||null,label:clsLabel(c)}).then(function(r){if(!r.ok){u.disabled=false;alertIn(u.parentNode,r.error);return}c.booked=Math.max(0,c.booked-1);openClass(c);loadClasses(CLS.week)})}
});

/* ---------- live member panel ---------- */
function loadLive(id){
 get("/api/members/"+id+"/live").then(function(d){
  var B=$("#liveBox");if(!B)return;
  if(d.error){B.innerHTML='<section class="card"><h2>Live from GymMaster</h2><div class="muted">'+esc(d.error)+'</div></section>';return}
  var h='<section class="card"><div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><h2>Live from GymMaster</h2><span class="muted">Checked just now</span></div>';
  if(d.owing!=null)h+=(d.owing>0?'<div class="warnbox">Owes <b>'+money(d.owing)+'</b> right now.'+(d.owing>=250?" Blocked at the doors, in the app and from classes until it's paid.":"")+'</div>':'<div class="ok">Nothing owing.</div>');
  if(d.next_bill)h+='<div class="muted">'+esc(d.next_bill)+'</div>';
  if(d.memberships&&d.memberships.length)h+='<div class="hist">'+d.memberships.map(function(x){return '<div><span>'+esc(day(x.start))+'</span><span><b>'+esc(x.name)+'</b>'+(x.price?" "+esc(x.price):"")+(x.on_hold?' <span class="pill warn">On hold</span>':"")+(x.hold_coming?' <span class="pill">Hold coming</span>':"")+(x.in_min_term?' <span class="pill">In lock-in</span>':"")+'<br><span>'+[x.next_payment?"Next payment "+day(x.next_payment):"",x.end?"Ends "+day(x.end):"",x.earliest_cancel?"Can cancel from "+day(x.earliest_cancel):"",x.visit_limit?x.visits_used+" of "+x.visit_limit+" visits used":""].filter(Boolean).map(esc).join(". ")+'</span></span></div>'}).join("")+'</div>';
  if(d.bookings&&d.bookings.length)h+='<h3>Booked in</h3><div class="hist">'+d.bookings.map(function(b){return '<div><span>'+esc(day(b.day))+" "+esc(b.time)+'</span><span>'+esc(b.name)+(b.waitlist?' <span class="pill warn">Waitlist</span>':"")+'</span></div>'}).join("")+'</div>';
  if(d.visits&&d.visits.length){h+='<h3>Visits by month</h3>'+bars(d.visits.map(function(v){return {label:MON[(v.month-1+12)%12]||v.month,vals:[v.visits]}}),[{name:"Visits",cls:""}],function(x){return x+" visits"})}
  if(d.history&&d.history.length)h+='<h3>Account</h3><div style="overflow-x:auto">'+table([["When","when"],["What","note"],["Charged","debit",1],["Paid",function(r){return r.credit||""},1],["Balance","total",1]],d.history)+'</div>';
  B.innerHTML=h+'</section>'+(d.contracts&&d.contracts.length?'<section class="card"><h2>Signed contracts</h2><div class="hist">'+d.contracts.map(function(c){return '<div><span>'+esc(day(c.signed_at))+'</span><span>'+esc(c.plan||"Membership")+(c.staff?' <span class="muted">with '+esc(c.staff)+'</span>':"")+' <a href="/api/members/'+id+'/contracts/'+c.id+'" target="_blank" rel="noopener">View or save as PDF</a></span></div>'}).join("")+'</div></section>':"");
  var p=d.profile,G=$("#gmBox");
  if(p&&G){
   var age=p.dob?Math.floor((Date.now()-new Date(p.dob+"T00:00:00").getTime())/31557600000):null;
   var t=p.totals||{};
   G.innerHTML='<section class="card"><h2>From their GymMaster profile</h2><div class="tiles">'+tile((t.visits||0).toLocaleString("en-NZ"),"Visits")+tile(t.classes||0,"Classes")+tile(t.bookings||0,"Bookings")+(p.streak?tile(p.streak,"Week streak"):"")+'</div>'+
    '<dl class="kv">'+(age!=null?'<dt>Age</dt><dd>'+age+' ('+esc(day(p.dob))+')</dd>':"")+(p.address?'<dt>Address</dt><dd>'+esc(p.address)+'</dd>':"")+(p.occupation?'<dt>Work</dt><dd>'+esc(p.occupation)+'</dd>':"")+
    (p.emergency&&p.emergency.length?'<dt>Emergency</dt><dd>'+p.emergency.map(function(e){return esc([e.name,e.relationship&&"("+e.relationship+")"].filter(Boolean).join(" "))+(e.phone?' <a href="tel:'+esc(e.phone)+'">'+esc(e.phone)+'</a>':"")}).join("<br>")+'</dd>':'<dt>Emergency</dt><dd><span class="pill warn">None on file</span></dd>')+
    (p.medical?'<dt>Medical</dt><dd>'+esc(p.medical)+'</dd>':"")+(p.has_billing!==undefined?'<dt>Bank or card</dt><dd>'+(p.has_billing?'<span class="pill ok">On file</span>':'<span class="pill warn">None on file</span>')+'</dd>':"")+
    (p.tag?'<dt>Tag in GymMaster</dt><dd>'+esc(p.tag)+'</dd>':"")+(p.staff?'<dt>Added by</dt><dd>'+esc(p.staff)+(p.created?", "+esc(day(p.created)):"")+'</dd>':"")+
    (p.linked&&p.linked.length?'<dt>Linked</dt><dd>'+p.linked.map(function(x){return '<a href="#" data-member="'+x.id+'">'+esc(x.name||("#"+x.id))+'</a>'}).join(", ")+'</dd>':"")+'</dl></section>';
  }
 });
}

/* ---------- money owed ---------- */
var COL={tab:"current",data:null,cur:null};
function loadCol(){
 get("/api/collections").then(function(d){
  if(d.error){$("#colTable").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  COL.data=d;var t=d.totals,r=d.rules;
  $("#colTiles").innerHTML=tile(whole$(t.current_sum),t.current+" members owing")+tile(t.blocked,"Blocked at $"+r.limit)+tile(whole$(t.left_sum),t.left+" people who left owing")+tile(t.referable,"Could go to Marshall Freeman");
  var cv=d.coverage||{};$("#colNote").textContent="Balances checked in the last 2 days: "+(cv.recent||0).toLocaleString("en-NZ")+" of "+(cv.n||0).toLocaleString("en-NZ")+" members. The Core checks 20 every 15 minutes"+(cv.last?", last at "+new Date(cv.last.replace(" ","T")+"Z").toLocaleTimeString("en-NZ",{hour:"numeric",minute:"2-digit"}):"")+". Gifted time is never listed.";
  $("#colRules").textContent="Settlement offer: "+r.p1+"% of the debt up to $1,500, "+r.p2+"% above. Only debts of $"+r.refMin.toLocaleString("en-NZ")+" or more go to Marshall Freeman. Change these in Settings.";
  drawCol();
 });
}
function drawCol(){
 var d=COL.data,rows=d.rows.filter(function(x){return COL.tab==="left"?x.left:!x.left});
 $("#colTabs").innerHTML='<button class="chip'+(COL.tab==="current"?" on":"")+'" data-ct="current">Still members '+d.totals.current+'</button><button class="chip'+(COL.tab==="left"?" on":"")+'" data-ct="left">Left M2 '+d.totals.left+'</button>';
 $("#colTable").innerHTML=rows.length?table([["Name",function(x){return '<a href="#" data-col="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Owes",function(x){return money(x.owing)},1],["Offer",function(x){return money(x.offer)},1],["Status",function(x){return x.case_status?'<span class="pill">'+esc({open:"Chasing",promised:"Promised",referred:"Marshall Freeman"}[x.case_status]||x.case_status)+'</span>':(x.blocked&&!x.left?'<span class="pill warn">Blocked</span>':"")},0,1],["Last contact",function(x){return x.last_at?day(x.last_at):""}],["Checked",function(x){return x.checked_at?day(x.checked_at):"Import"}]],rows):'<div class="ok">Nobody here. Nice.</div>';
}
$("#colTabs").addEventListener("click",function(e){var b=e.target.closest("[data-ct]");if(!b)return;COL.tab=b.dataset.ct;drawCol()});
$("#colTable").addEventListener("click",function(e){var a=e.target.closest("[data-col]");if(!a)return;e.preventDefault();e.stopPropagation();openCol(+a.dataset.col)});
function openCol(id){
 var x=COL.data.rows.find(function(r){return r.id===id});if(!x)return;COL.cur=x;
 var owner=ME.can.settings;
 $("#colPanel").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2>'+esc(nm(x))+'</h2><a href="#" class="muted" data-member="'+x.id+'">Profile</a></div>'+
  '<div class="warnbox">Owes <b>'+money(x.owing)+'</b>. Settle for <b>'+money(x.offer)+'</b> if they pay today.</div>'+
  '<dl class="kv"><dt>Mobile</dt><dd>'+(x.mobile?'<a href="tel:'+esc(x.mobile)+'">'+esc(x.mobile)+'</a>':"None")+'</dd><dt>Email</dt><dd>'+esc(x.email||"None")+'</dd><dt>Membership</dt><dd>'+esc(x.plan||"-")+(x.left?" (left)":"")+'</dd>'+(x.next_bill?'<dt>GymMaster</dt><dd>'+esc(x.next_bill)+'</dd>':"")+(x.last_note?'<dt>Last note</dt><dd>'+esc(x.last_note)+'</dd>':"")+'</dl>'+
  '<label class="fld">Note<input id="colNote2" placeholder="What did they say?"></label>'+
  '<div class="outs"><button class="btn dark sm" data-ca="called">Called</button><button class="btn line sm" data-ca="promised">Promised to pay</button><button class="btn line sm" data-ca="settled">Settled</button>'+
  (owner&&x.can_refer?'<button class="btn line sm" data-ca="referred">Refer to Marshall Freeman</button>':"")+(owner?'<button class="btn line sm" data-ca="written_off">Write off</button>':"")+'<button class="btn line sm" data-ca="check">Check balance now</button></div><div class="err" id="colErr"></div>';
}
$("#colPanel").addEventListener("click",function(e){
 var b=e.target.closest("[data-ca]");if(!b)return;var x=COL.cur,a=b.dataset.ca;$("#colErr").textContent="";
 if(a==="check"){b.disabled=true;get("/api/members/"+x.id+"/live").then(function(r){b.disabled=false;if(r.error){$("#colErr").textContent=r.error;return}loadCol();$("#colErr").textContent="GymMaster says "+money(r.owing||0)+".";$("#colErr").style.color="var(--ink)"});return}
 var body={member_id:x.id,action:a,note:$("#colNote2").value};
 if(a==="promised"){var w=prompt("Pay by what date? (like 2026-10-20)","");if(w===null)return;body.when=w}
 if(a==="settled"){var amt=prompt("How much did they pay?",x.offer.toFixed(2));if(amt===null)return;body.amount=amt}
 if(a==="written_off"&&!confirm("Write off "+money(x.owing)+"?"))return;
 post("/api/collections",body).then(function(r){if(!r.ok){$("#colErr").textContent=r.error;return}$("#colPanel").innerHTML='<div class="ok">Saved for '+esc(nm(x))+'.</div>';loadCol()});
});

/* ---------- billing ---------- */
var BIL={day:null,data:null,ready:null,rk:"all"};
var BMODE={preview:["Preview","Not connected to Ezidebit yet. GymMaster still takes every debit. This page shows exactly what the Core would take, so the two can be compared before anyone moves."],sandbox:["Sandbox","Connected to Ezidebit's test system. Only members moved to the Core get test debits. No real money moves."],ready:["Live key in","The live Ezidebit key is in. Debits start once BILLING_MODE is switched to ezidebit in Cloudflare."],live:["Live","The Core sends real debits to Ezidebit for members moved across. Everyone else is still billed by GymMaster."]};
var BKIND={regular:"Debit",one_off:"One-off",retry:"Retry",fee:"Fee",arrangement:"Payment plan"};
var BSTAT={preview:"Would debit",planned:"Planned",sent:"With Ezidebit",paid:"Paid",failed:"Failed",cancelled:"Cancelled",waived:"Waived",due:"Due"};
var FREQ={weekly:"weekly",fortnightly:"fortnightly",monthly:"monthly",quarterly:"quarterly",yearly:"yearly"};
var RKIND={no_method:"No bank details",amount:"Amount differs, unexplained",arrears:"Collecting money owed",credit:"Credit or free weeks",no_plan:"No plan in the Core",no_price:"No price",no_freq:"How often unknown",no_date:"No date"};
function wd(iso){return new Date(iso+"T12:00:00").toLocaleDateString("en-NZ",{weekday:"short",day:"numeric",month:"short"})}
function loadBill(){
 get("/api/billing").then(function(d){
  if(d.error){$("#bilTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  BIL.data=d;var M=BMODE[d.mode.kind]||[d.mode.kind,""],c=d.counts;
  $("#bilMode").textContent=M[0];$("#bilBanner").textContent=M[1];
  var t=tile(c.members.toLocaleString("en-NZ"),"Members on a debit")+tile(c.core,"Billed by the Core")+tile(c.no_method,"No bank or card details")+tile(c.issues,"Need a look before the move");
  if(d.money)t=tile(whole$(d.money.weekly),"Billed per week")+tile(whole$(d.money.next7),"Next 7 days")+tile(whole$(d.money.next28),"Next 4 weeks")+t+(d.money.failed_sum?tile(whole$(d.money.failed_sum),"Failed, last 60 days"):"");
  $("#bilTiles").innerHTML=t;
  $("#bilSteps").innerHTML=d.steps.map(function(s){return '<div class="'+(s.done?"y":"")+'"><i>'+(s.done?"&#10003;":"")+'</i><span>'+esc(s.t)+'</span></div>'}).join("")+(d.last_run?'<div class="muted" style="font-size:13px">Last run '+esc(ago(d.last_run.at.replace("T"," ").slice(0,16)))+': '+(d.last_run.preview||0)+' previewed, '+(d.last_run.sent||0)+' sent'+(d.last_run.errors&&d.last_run.errors.length?', '+d.last_run.errors.length+' problems':"")+'.</div>':'<div class="muted" style="font-size:13px">First run tonight at 2:15am.</div>');
  var wkStart=new Date(d.today+"T12:00:00").getDay();
  $("#bilCal").innerHTML=d.days.map(function(x,i){var dt=new Date(x.date+"T12:00:00");return '<button class="bd'+(x.date===(BIL.day||d.today)?" on":"")+(x.n?"":" zero")+(dt.getDay()===1?" wk":"")+'" data-bday="'+x.date+'"><b>'+esc(wd(x.date))+'</b><span class="c">'+x.n+'</span><span class="t">'+(x.total!=null?whole$(x.total):(x.n===1?"debit":"debits"))+(x.skipped?" &middot; "+x.skipped+" skipped":"")+'</span></button>'}).join("");
  var fl=d.failed||[];
  $("#bilFailed").innerHTML=fl.length?table([["Name",function(x){return '<a href="#" data-member="'+x.member_id+'">'+esc(nm(x))+'</a>'},0,1],["Date",function(x){return day(x.debit_date)}],["Amount",function(x){return money(x.amount)},1],["Why",function(x){return x.failure_reason||""}],["Retry",function(x){return x.retry_pending?'<span class="pill">Booked</span>':'<span class="pill warn">None</span>'},0,1]],fl):'<div class="ok">No failed debits. '+(d.mode.kind==="preview"?"They'll show here once Ezidebit is connected. Until then GymMaster's failed payments are in Money owed.":"")+'</div>';
  $("#bilLog").innerHTML=(d.events||[]).map(function(e){return '<div><span>'+esc(day(e.at))+'</span><span>'+(e.member_id?'<a href="#" data-member="'+e.member_id+'">'+esc(nm(e))+'</a>: ':"")+esc(e.detail)+(e.staff?' <span class="muted">'+esc(e.staff)+'</span>':"")+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>';
  if(ME.can.settings){var r=d.rules;$("#bilRulesCard").hidden=false;$("#brLead").value=r.lead_days;$("#brFee").value=r.failed_fee;$("#brRetry").value=r.retry_days;$("#brMax").value=r.max_retries}
  loadBillDay(BIL.day||d.today);
 });
 get("/api/billing/ready").then(function(r){BIL.ready=r;drawReady()});
}
function drawReady(){
 var r=BIL.ready;if(!r)return;if(r.error){$("#bilReady").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}
 $("#bilReadyNote").textContent=r.clean.toLocaleString("en-NZ")+" of "+r.total.toLocaleString("en-NZ")+" members are ready to move";
 var tabs=[["all","Everything",r.rows.length]].concat(Object.keys(r.kinds).map(function(k){return [k,RKIND[k]||k,r.kinds[k]]}));
 $("#bilReadyTabs").innerHTML=tabs.map(function(t){return '<button class="chip'+(BIL.rk===t[0]?" on":"")+'" data-rk="'+t[0]+'">'+esc(t[1])+' '+t[2]+'</button>'}).join("");
 var rows=r.rows.filter(function(x){return BIL.rk==="all"||x.k===BIL.rk});
 var lim=BIL.rall?600:25;
 $("#bilReady").innerHTML=rows.length?table([["Name",function(x){return '<a href="#" data-member="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Plan","plan"],["What's wrong","t"],["GymMaster says",function(x){return x.gm||""}]],rows.slice(0,lim))+(rows.length>lim?'<button class="btn line sm" id="bilAll" style="margin-top:8px">Show all '+rows.length+'</button>':""):'<div class="ok">Everyone is ready.</div>';
 var ba=$("#bilAll");if(ba)ba.onclick=function(){BIL.rall=true;drawReady()};
}
function loadBillDay(dt){
 BIL.day=dt;$$("#bilCal .bd").forEach(function(b){b.classList.toggle("on",b.dataset.bday===dt)});
 $("#bilDay").innerHTML='<div class="muted">Loading...</div>';
 get("/api/billing/day?date="+dt).then(function(d){
  if(d.error){$("#bilDay").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var h='<h3 style="margin:8px 0 0">'+esc(wd(dt))+': '+d.rows.length+' debits'+(d.total!=null?", "+money(d.total):"")+'</h3>';
  h+=d.rows.length?table([["Name",function(x){return '<a href="#" data-member="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Plan",function(x){return (x.plan||"")+(x.freq?", "+FREQ[x.freq]:"")}],["Amount",function(x){return money(x.amount)},1],["Billed by",function(x){return x.by==="core"?'<span class="pill dark">Core</span>':'<span class="pill">GymMaster</span>'},0,1],["",function(x){return x.status?'<span class="pill'+(x.status==="paid"?" ok":x.status==="failed"?" warn":"")+'">'+esc(BSTAT[x.status]||x.status)+'</span>':""},0,1]],d.rows):'<div class="muted">No debits this day.</div>';
  if(d.extras&&d.extras.length)h+='<h3 style="margin:10px 0 0">Extras</h3>'+table([["Name",function(x){return '<a href="#" data-member="'+x.id_m+'">'+esc(nm(x))+'</a>'},0,1],["What",function(x){return BKIND[x.kind]+(x.note?": "+x.note:"")}],["Amount",function(x){return money(x.amount)},1],["",function(x){return '<span class="pill">'+esc(BSTAT[x.status]||x.status)+'</span>'},0,1]],d.extras);
  if(d.skipped.length)h+='<details style="margin-top:8px"><summary class="muted" style="cursor:pointer">'+d.skipped.length+' skipped this day</summary>'+table([["Name",function(x){return '<a href="#" data-member="'+x.id+'">'+esc(nm(x))+'</a>'},0,1],["Would have been",function(x){return money(x.amount)},1],["Why not","why"]],d.skipped)+'</details>';
  $("#bilDay").innerHTML=h;
 });
}
$("#bilCal").addEventListener("click",function(e){var b=e.target.closest("[data-bday]");if(b)loadBillDay(b.dataset.bday)});
$("#bilReadyTabs").addEventListener("click",function(e){var b=e.target.closest("[data-rk]");if(!b)return;BIL.rk=b.dataset.rk;BIL.rall=false;drawReady()});
function brMsg(h){$("#brMsg").innerHTML=h}
$("#brSave").addEventListener("click",function(){post("/api/billing/rules",{bill_lead_days:$("#brLead").value,bill_failed_fee:$("#brFee").value,bill_retry_days:$("#brRetry").value,bill_max_retries:$("#brMax").value}).then(function(r){brMsg(r.ok?'<div class="ok">Saved.</div>':'<div class="err">'+esc(r.error)+'</div>')})});
$("#brTest").addEventListener("click",function(){brMsg('<div class="muted">Asking Ezidebit...</div>');post("/api/billing/test").then(function(r){brMsg(r.ok?'<div class="ok">Ezidebit answered'+(r.sandbox?" (sandbox)":" (live)")+'. The key works.</div>':'<div class="err">'+esc(r.error||"No answer")+'</div>')})});
$("#brRun").addEventListener("click",function(){var b=this;b.disabled=true;brMsg('<div class="muted">Running...</div>');post("/api/billing/run").then(function(r){b.disabled=false;brMsg('<div class="ok">Done: '+(r.preview||0)+' previewed, '+(r.planned||0)+' planned, '+(r.sent||0)+' sent'+(r.errors&&r.errors.length?'. Problems: '+esc(r.errors.slice(0,3).join("; ")):"")+'.</div>');loadBill()})});

/* member billing card */
function loadMemberBill(id){
 var box=$("#billBox");if(!box)return;box.innerHTML='<section class="card"><h2>Billing</h2><div class="muted">Loading...</div></section>';
 get("/api/billing/member/"+id).then(function(b){drawMemberBill(id,b)});
}
function drawMemberBill(id,b){
 var box=$("#billBox");if(!box)return;
 if(b.error){box.innerHTML='';return}
 var bank=ME.can.add?'<button class="btn line sm" data-bill="'+id+'">Enter or update bank details</button>':"";
 if(b.none){box.innerHTML='<section class="card"><h2>Billing</h2><div class="muted">Not on a direct debit plan.</div>'+(b.items.length?billHist(b):"")+bank+'</section>';return}
 var core=b.billed_by==="core",st=b.state==="hold"?'<span class="pill warn">On hold</span>':b.state==="cancelled"?'<span class="pill warn">Billing stopped</span>':'<span class="pill ok">Active</span>';
 var h='<section class="card"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h2 style="margin-right:auto">Billing</h2>'+st+(core?'<span class="pill dark">Billed by the Core</span>':'<span class="pill">Billed by GymMaster</span>')+'</div>';
 if(b.owing>0)h+='<div class="warnbox">Owes <b>'+money(b.owing)+'</b></div>';
 if(!core)h+='<div class="muted" style="font-size:13px">GymMaster still takes this member\'s debits. Changes here are planned in the Core only, so make the same change in GymMaster until they move across.</div>';
 h+='<dl class="kv"><dt>Plan</dt><dd>'+esc(b.plan||"-")+'</dd><dt>Debit</dt><dd>'+(b.base?money(b.amount_override||b.base)+" "+esc(FREQ[b.freq]||"")+(b.amount_override?' <span class="pill">Changed from '+money(b.base)+'</span>':""):"-")+'</dd><dt>Next debit</dt><dd>'+(b.coming[0]?esc(wd(b.coming[0].date))+", "+money(b.coming[0].amount)+(b.coming[0].skip?' <span class="pill warn">'+esc(b.coming[0].skip)+'</span>':""):"-")+'</dd>'+(b.gm_next&&!core?'<dt>GymMaster says</dt><dd>'+esc(b.gm_next)+'</dd>':"")+(b.method?'<dt>Paying by</dt><dd>'+esc(b.method)+'</dd>':"")+(b.state==="hold"?'<dt>Hold</dt><dd>'+esc((b.hold_from?day(b.hold_from):"Now")+" to "+(b.hold_to?day(b.hold_to):"further notice"))+(b.hold_reason?". "+esc(b.hold_reason):"")+'</dd>':"")+(b.arrangement_extra?'<dt>Payment plan</dt><dd>Extra '+money(b.arrangement_extra)+' each debit'+(b.arrangement_note?". "+esc(b.arrangement_note):"")+'</dd>':"")+(b.min_term_end&&b.min_term_end>=new Date().toISOString().slice(0,10)?'<dt>Lock-in ends</dt><dd>'+esc(day(b.min_term_end))+'</dd>':"")+'</dl>';
 b.issues.filter(function(i){return i.k!=="gifted"}).forEach(function(i){h+='<div class="warnbox" style="padding:8px 12px">'+esc(i.t)+'</div>'});
 if(b.coming.length>1)h+='<div class="muted" style="font-size:13px">Coming up: '+b.coming.slice(1).map(function(x){return esc(wd(x.date))+" "+money(x.amount)+(x.skip?" (skipped)":"")}).join(", ")+'</div>';
 if(b.can_act){
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap">'+(b.state==="hold"?'<button class="btn line sm" data-ba="resume">Take off hold</button>':'<button class="btn line sm" data-ba="hold">Put on hold</button>')+'<button class="btn line sm" data-ba="amount">Change amount</button><button class="btn line sm" data-ba="one_off">One-off charge</button><button class="btn line sm" data-ba="arrangement">'+(b.arrangement_extra?"Change payment plan":"Payment plan")+'</button>'+(b.state==="cancelled"?'<button class="btn line sm" data-ba="restart">Restart billing</button>':'<button class="btn line sm" data-ba="cancel">Stop billing</button>')+(b.can_switch?(core?'<button class="btn line sm" data-ba="back">Move back to GymMaster</button>':'<button class="btn dark sm" data-ba="switch">Move billing to the Core</button>'):"")+(b.mode!=="preview"?'<button class="btn line sm" data-ba="method">Check Ezidebit</button>':"")+bank+'</div><div id="billForm"></div>';
 } else h+=bank;
 h+=billHist(b)+'</section>';
 box.innerHTML=h;box.dataset.id=id;BIL.cur=b;
}
function billHist(b){
 var rows=(b.items||[]).map(function(x){return '<div><span>'+esc(day(x.debit_date))+'</span><span>'+esc(BKIND[x.kind]||x.kind)+' '+money(x.amount)+' <span class="pill'+(x.status==="paid"?" ok":x.status==="failed"?" warn":"")+'">'+esc(BSTAT[x.status]||x.status)+'</span>'+(x.failure_reason?' <span class="muted">'+esc(x.failure_reason)+'</span>':"")+(x.status==="failed"&&b.can_act?' <a href="#" data-bi="'+x.id+'" data-bia="retry">Retry</a> &middot; <a href="#" data-bi="'+x.id+'" data-bia="fee">Add fee</a> &middot; <a href="#" data-bi="'+x.id+'" data-bia="waive">Waive</a>':"")+'</span></div>'}).join("");
 var ev=(b.events||[]).map(function(e){return '<div><span>'+esc(day(e.at))+'</span><span>'+esc(e.detail)+(e.staff?' <span class="muted">'+esc(e.staff)+'</span>':"")+'</span></div>'}).join("");
 return (rows||ev)?'<details><summary class="muted" style="cursor:pointer">Debits and changes</summary><div class="hist">'+rows+ev+'</div></details>':"";
}
var BFORM={
 hold:'<label class="fld">From<input type="date" id="bf1"></label><label class="fld">Until (blank for no end)<input type="date" id="bf2"></label><label class="fld">Why<input id="bf3" placeholder="Injury, travel"></label>',
 amount:'<label class="fld">New amount ($)<input id="bf1" inputmode="decimal" placeholder="49.50"></label><label class="fld">From<input type="date" id="bf2"></label>',
 one_off:'<label class="fld">Amount ($)<input id="bf1" inputmode="decimal"></label><label class="fld">Date<input type="date" id="bf2"></label><label class="fld">For<input id="bf3" placeholder="PT session, merch"></label>',
 arrangement:'<label class="fld">Extra each debit ($)<input id="bf1" inputmode="decimal" placeholder="20.00"></label><label class="fld">Note<input id="bf3" placeholder="Agreed with Bekka"></label>',
 cancel:'<label class="fld">Why is billing stopping?<input id="bf3" placeholder="Cancelled after lock-in"></label>',
 retry:'<label class="fld">Try again on<input type="date" id="bf2"></label>',
 fee:'<label class="fld">Fee ($)<input id="bf1" inputmode="decimal"></label>',
 waive:'<label class="fld">Why<input id="bf3"></label>'
};
function billGo(id,body,form){post("/api/billing/member/"+id,body).then(function(r){if(!r.ok){var e=$("#bfErr");if(e)e.textContent=r.error;else alert(r.error);return}loadMemberBill(id)})}
document.addEventListener("click",function(e){
 var t=e.target.closest("[data-ba]"),u=e.target.closest("[data-bia]");if(!t&&!u)return;e.preventDefault();
 var box=$("#billBox"),id=+box.dataset.id,a=t?t.dataset.ba:u.dataset.bia,item=u?+u.dataset.bi:null;
 if(a==="resume"||a==="restart"){billGo(id,{action:a});return}
 if(a==="method"){post("/api/billing/member/"+id,{action:"method"}).then(function(r){alert(r.ok?"Ezidebit: "+r.method+(r.status?", status "+r.status:""):r.error);loadMemberBill(id)});return}
 if(a==="switch"){if(!confirm("Move this member's billing to the Core? Turn their billing off in GymMaster straight after, or they'll be charged twice."))return;billGo(id,{action:"switch",to:"core"});return}
 if(a==="back"){if(!confirm("Move billing back to GymMaster? Anything already sent to Ezidebit for them is pulled back."))return;billGo(id,{action:"switch",to:"gymmaster"});return}
 if(a==="fee"&&BIL.data&&BIL.data.rules)BFORM.fee='<label class="fld">Fee ($)<input id="bf1" inputmode="decimal" value="'+(BIL.data.rules.failed_fee||"")+'"></label>';
 $("#billForm").innerHTML='<div class="bform">'+BFORM[a]+'<button class="btn dark sm" id="bfGo">Save</button><button class="btn line sm" id="bfNo">Cancel</button><div class="err" id="bfErr" style="width:100%"></div></div>';
 $("#bfNo").onclick=function(){$("#billForm").innerHTML=""};
 $("#bfGo").onclick=function(){var v=function(k){var el=$("#"+k);return el?el.value:""};
  var body={action:a,item:item};
  if(a==="hold"){body.from=v("bf1");body.to=v("bf2");body.reason=v("bf3")}
  if(a==="amount"){body.amount=v("bf1");body.from=v("bf2")}
  if(a==="one_off"){body.amount=v("bf1");body.date=v("bf2");body.note=v("bf3")}
  if(a==="arrangement"){body.extra=v("bf1");body.note=v("bf3")}
  if(a==="cancel"){body.reason=v("bf3")}
  if(a==="retry"){body.date=v("bf2")}
  if(a==="fee"){body.amount=v("bf1")}
  if(a==="waive"){body.note=v("bf3")}
  billGo(id,body)};
});

/* ---------- money (owners) ---------- */
function loadMoney(){
 get("/api/money").then(function(d){
  if(d.error){$("#monTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var pct=d.target?Math.round(d.ytd/d.target*100):0,due=d.target?Math.round(d.target_to_date/d.target*100):0;
  $("#monGoal").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="eyebrow">This financial year, from '+esc(ml(d.fy))+'</span><span style="margin-left:auto;color:var(--soft);font-size:13px">'+whole$(d.ytd)+' of '+whole$(d.target)+' ('+pct+'%). On plan would be '+whole$(d.target_to_date)+' by the end of '+(d.last_month?MON[+d.last_month.slice(5,7)-1]:"this month")+'.</span></div><div class="goal" style="position:relative"><i style="width:'+Math.min(100,pct)+'%"></i><span style="position:absolute;top:-3px;bottom:-3px;left:'+Math.min(100,due)+'%;width:2px;background:#fff"></span></div>';
  var cash=(d.points||[]).find(function(p){return p.key==="cash"});
  $("#monTiles").innerHTML=tile(k$(d.ytd),"Income this year, excl GST")+tile(k$(d.ytd_net),"Profit this year")+tile(d.pace?k$(d.pace):"-","Year at this pace")+
   tile(whole$(d.weekly_billed),"Billed weekly by direct debit")+tile(k$(d.yearly_billed_ex_gst),"Memberships per year, excl GST")+
   (d.passport_estimate!=null?tile(whole$(d.passport_estimate),"Fitness Passport this month so far"):"")+tile(whole$(d.owed_current),"Owed by members")+(cash?tile(k$(cash.value),"Cash in the bank"):"");
  $("#monUpd").textContent=d.updated?"Xero figures from "+day(d.updated):"No Xero figures yet";
  var ms=(d.months||[]).slice(0,12).reverse();
  $("#monChart").innerHTML=ms.length?bars(ms.map(function(m){return {label:ml(m.month),vals:[m.income||0,(m.cost_of_sales||0)+(m.expenses||0),m.net||0]}}),[{name:"Income",cls:""},{name:"Costs",cls:"s1"},{name:"Profit",cls:"s2"}],whole$):'<div class="muted">Ask Claude to bring in Xero and this fills in.</div>';
  $("#monPoints").innerHTML=(d.points||[]).map(function(p){return '<dt>'+esc(p.label||p.key)+'</dt><dd><b>'+money(p.value)+'</b> <span class="muted">'+esc(day(p.as_of))+'</span></dd>'}).join("")+'<dt>Owed by people who left</dt><dd>'+money(d.owed_left)+'</dd>';
  $("#monTable").innerHTML=(d.months||[]).length?table([["Month",function(m){return MON[+m.month.slice(5,7)-1]+" "+m.month.slice(0,4)}],["Income",function(m){return whole$(m.income)},1],["Cost of sales",function(m){return whole$(m.cost_of_sales)},1],["Expenses",function(m){return whole$(m.expenses)},1],["Profit",function(m){return '<b style="color:'+((m.net||0)<0?"var(--red)":"inherit")+'">'+whole$(m.net)+'</b>'},1,1],["Margin",function(m){return m.income?Math.round((m.net||0)/m.income*100)+"%":""},1]],d.months):'<div class="muted">Nothing yet.</div>';
  var lm=(d.months||[]).find(function(m){return m.lines});
  if(lm){$("#monLinesCard").hidden=false;$("#monLinesTitle").textContent="Where the money came from and went, "+MON[+lm.month.slice(5,7)-1]+" "+lm.month.slice(0,4);
   var inc=(lm.lines.income||[]).slice().sort(function(a,b){return b[1]-a[1]}).slice(0,10),exp=(lm.lines.expenses||[]).slice().sort(function(a,b){return b[1]-a[1]}).slice(0,12);
   $("#monLines").innerHTML='<div><h3>Income</h3>'+hbars(inc,whole$)+'</div><div><h3>Biggest costs</h3>'+hbars(exp,whole$)+'</div>'}
 });
}

/* ---------- growth (owners) ---------- */
function loadGrowth(){
 get("/api/growth").then(function(d){
  if(d.error){$("#grTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var sn=d.snaps||[],last=sn[sn.length-1]||{},ym=new Date().toISOString().slice(0,7);
  var ago=sn.filter(function(s){return s.day<=new Date(Date.now()-30*864e5).toISOString().slice(0,10)}).pop();
  var j=(d.joins.find(function(x){return x.month===ym})||{}).n||0,l=(d.leaves.find(function(x){return x.month===ym})||{}).n||0;
  var tr=d.trials.slice(-4,-1),tn=tr.reduce(function(a,x){return a+x.n},0),tj=tr.reduce(function(a,x){return a+(x.joined||0)},0);
  var perf=(d.mix.find(function(x){return x.family==="perform"})||{}).n||0;
  $("#grTiles").innerHTML=tile((last.members||0).toLocaleString("en-NZ"),"Members today")+tile(ago?((last.members-ago.members>=0?"+":"")+(last.members-ago.members)):"-","Change in 30 days")+tile(j,"Joined this month")+tile(l,"Left this month")+tile(tn?Math.round(tj/tn*100)+"%":"-","Trials who joined (3 months)")+tile(last.members?Math.round(perf/last.members*100)+"%":"-","On Perform");
  var pts=sn.map(function(s){return [day(s.day),s.members]});var note="Counted nightly";
  if(pts.length<5&&d.history&&d.history.length>1){pts=d.history.filter(function(h){return h.members}).map(function(h){return [MON[+String(h.month).slice(5,7)-1]+" "+String(h.month).slice(0,4),h.members]});note="Month-end counts from GymMaster"}
  $("#grLineNote").textContent=note;$("#grLine").innerHTML=lineChart(pts);
  var F={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",passport:"Fitness Passport",transporter:"Transporter",pass:"Visit pass",pool:"Pool",trial:"Trial",staff:"Staff",other:"Other",challenge:"Challenge"};
  $("#grMix").innerHTML=hbars(d.mix.map(function(x){return [F[x.family]||x.family,x.n]}),function(n){return n.toLocaleString("en-NZ")});
  var months={};d.joins.forEach(function(x){(months[x.month]=months[x.month]||[0,0])[0]=x.n});d.leaves.forEach(function(x){(months[x.month]=months[x.month]||[0,0])[1]=x.n});
  (d.history||[]).forEach(function(h){if(!months[h.month]&&h.joins!=null)months[h.month]=[h.joins,h.cancels||0]});
  var mk=Object.keys(months).sort().slice(-12);
  $("#grJoins").innerHTML=mk.length?bars(mk.map(function(m){return {label:ml(m),vals:months[m]}}),[{name:"Joined",cls:""},{name:"Left",cls:"s2"}]):'<div class="muted">Nothing yet.</div>';
  $("#grSources").innerHTML=hbars(d.sources.map(function(x){return [x.source,x.n]}));
  $("#grTrials").innerHTML=d.trials.length?table([["Month",function(x){return MON[+x.month.slice(5,7)-1]+" "+x.month.slice(0,4)}],["Trials","n",1],["Joined","joined",1],["Joined %",function(x){return x.n?Math.round((x.joined||0)/x.n*100)+"%":""},1]],d.trials.slice().reverse()):'<div class="muted">No trials yet.</div>';
  $("#grLeads").innerHTML=hbars(d.leads.map(function(x){return [(KIND[x.kind]||x.kind)+(x.joined?" ("+x.joined+" joined)":""),x.n]}));
 });
 get("/api/growth/more").then(function(d){
  if(d.error)return;
  var n=function(v){return Number(v||0).toLocaleString("en-NZ")};
  $("#grAge").innerHTML=hbars(d.age.map(function(x){return [x.band,x.n]}),n);
  $("#grGender").innerHTML=hbars(d.gender.map(function(x){return [x.g,x.n]}),n);
  $("#grSuburbs").innerHTML=hbars(d.suburbs.map(function(x){return [x.s,x.n]}),n);
  var order=["Under 3 months","3 to 6 months","6 to 12 months","1 to 2 years","2 years plus","Unknown"];
  $("#grTenure").innerHTML=hbars(d.tenure.slice().sort(function(a,b){return order.indexOf(a.band)-order.indexOf(b.band)}).map(function(x){return [x.band,x.n]}),n);
  var F={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",transporter:"Transporter",passport:"Fitness Passport",pass:"Visit pass",pool:"Pool",trial:"Trial",staff:"Staff",other:"Other",challenge:"Challenge"};
  $("#grRevenue").innerHTML=hbars(d.revenue.map(function(x){return [(F[x.family]||x.family)+" ("+x.n+")",x.weekly]}),whole$);
  $("#grUsageNote").textContent="Visits in "+MON[+d.last_ym.slice(5,7)-1]+", for members whose counts have been copied from GymMaster.";
  $("#grUsage").innerHTML=d.usage.length?table([["",function(x){return x.who}],["None",function(x){return n(x.none)+" ("+Math.round(x.none/x.n*100)+"%)"},1],["1 to 4",function(x){return n(x.light)},1],["5 to 11",function(x){return n(x.regular)},1],["12 plus",function(x){return n(x.keen)},1]],d.usage):'<div class="muted">Visit counts are still being copied.</div>';
  var fams={},ms={};d.joins_by_family.forEach(function(x){fams[x.family]=1;(ms[x.month]=ms[x.month]||{})[x.family]=x.n});
  var fk=Object.keys(fams).sort(),mk=Object.keys(ms).sort();
  $("#grJoinFam").innerHTML=mk.length?table([["Month",function(m){return MON[+m.slice(5,7)-1]}]].concat(fk.map(function(f){return [F[f]||f,function(m){return ms[m][f]||""},1]})),mk):'<div class="muted">Nothing yet.</div>';
 });
}

/* ---------- marketing (owners) ---------- */
function loadMkt(){
 var m=$("#mkMonth").value;
 get("/api/marketing"+(m?"?month="+m:"")).then(function(d){
  if(d.error){$("#mkTiles").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  if(!m)$("#mkMonth").value=d.month;
  var pct=d.budget?Math.round(d.meta_spend/d.budget*100):0,ppct=d.budget?Math.round(d.projected/d.budget*100):0;
  $("#mkBudget").innerHTML='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><span class="eyebrow">Meta budget</span><span style="margin-left:auto;color:var(--soft);font-size:13px">'+money(d.meta_spend)+' of '+whole$(d.budget)+' ('+pct+'%). Heading for '+whole$(d.projected)+' ('+ppct+'%).</span></div><div class="goal"><i style="width:'+Math.min(100,pct)+'%;'+(ppct>110?"background:#FFB27A":"")+'"></i></div>';
  var sess=(d.web||[]).reduce(function(a,w){return a+(w.sessions||0)},0),conv=(d.web||[]).reduce(function(a,w){return a+(w.conversions||0)},0);
  $("#mkTiles").innerHTML=tile(whole$(d.all_spend),"Ad spend")+(d.platform_leads>=10?tile(d.platform_leads,"Leads Meta counted")+tile(money(d.cpl),"Cost per lead"):tile((d.landing_views||0).toLocaleString("en-NZ"),"People who reached the website from ads")+tile(d.cost_per_view!=null?money(d.cost_per_view):"-","Cost per website visit from ads"))+tile(d.social_leads,"Leads in the Core from Instagram and Facebook")+tile(d.social_joins,"Joined from Instagram and Facebook")+tile(d.cost_per_join!=null?whole$(d.cost_per_join):"-","Meta spend per member who joined")+tile(sess.toLocaleString("en-NZ"),"Website visits")+tile(conv.toLocaleString("en-NZ"),"Website conversions");
  $("#mkNote").textContent=d.data_to?"Ad figures up to "+day(d.data_to)+". Joins count members whose Came from says Instagram or Facebook, so recording it at sign-up matters.":"No ad figures yet. Ask Claude to bring in Meta and Google Analytics.";
  $("#mkDaily").innerHTML=d.daily.length?bars(d.daily.map(function(x){return {label:String(+x.day.slice(8)),vals:[x.spend]}}),[{name:"Spend",cls:""}],money):'<div class="muted">Nothing this month yet.</div>';
  $("#mkTrend").innerHTML=d.trend.length?bars(d.trend.map(function(x){return {label:ml(x.month),vals:[x.spend,x.joins*100]}}),[{name:"Spend",cls:""},{name:"Joins from social (x100)",cls:"s2"}],function(v){return v}):'<div class="muted">Nothing yet.</div>';
  $("#mkCamps").innerHTML=d.campaigns.length?table([["Campaign","campaign"],["Where","source"],["Spend",function(x){return money(x.spend)},1],["Seen by",function(x){return (x.impressions||0).toLocaleString("en-NZ")},1],["Clicks",function(x){return (x.clicks||0).toLocaleString("en-NZ")},1],["Leads",function(x){return x.leads||0},1],["Per lead",function(x){return x.leads?money(x.spend/x.leads):"-"},1]],d.campaigns):'<div class="muted">No campaigns this month yet.</div>';
  $("#mkJoins").innerHTML=hbars(d.joins.map(function(x){return [x.source,x.n]}));
  $("#mkWeb").innerHTML=d.web.length?table([["Channel","channel"],["Visits",function(x){return (x.sessions||0).toLocaleString("en-NZ")},1],["Conversions",function(x){return x.conversions||0},1]],d.web):'<div class="muted">No website figures yet.</div>';
  $("#mkLeads").innerHTML=hbars(d.core_leads.map(function(x){return [x.source+(x.joined?" ("+x.joined+" joined)":""),x.n]}));
 });
}
$("#mkMonth").addEventListener("change",function(){loadMkt();loadMktMore()});
function dl(a,b,inv){if(!b)return "";var c=Math.round((a-b)/b*100);if(!isFinite(c))return "";var good=inv?c<0:c>0;return ' <span class="delta '+(c===0?"":good?"up":"down")+'">'+(c>0?"+":"")+c+'%</span>'}
function loadMktMore(){
 var m=$("#mkMonth").value;
 get("/api/marketing/more"+(m?"?month="+m:"")).then(function(d){
  if(d.error)return;
  var a=d.now||{},b=d.before||{},pw=d.paid_web||{},l=d.leads||{},j=d.joins||{};
  var steps=[["Seen the ads",a.impressions||0],["Clicked",a.clicks||0],["Reached the website",a.views||0],["Website visits from paid",pw.sessions||0],["Leads from Instagram or Facebook",l.social||0],["Joined from Instagram or Facebook",j.social||0]];
  var top=Math.max(1,steps[0][1]);
  $("#mkFunnel").innerHTML=steps.map(function(s){return '<div><span>'+esc(s[0])+'</span><span><i style="width:'+Math.max(1.5,Math.sqrt(s[1]/top)*100)+'%"></i></span><b>'+Number(s[1]).toLocaleString("en-NZ")+'</b></div>'}).join("");
  $("#mkTips").innerHTML=(d.tips||[]).map(function(t){return '<div>'+esc(t)+'</div>'}).join("")||'<div>Not enough data this month yet.</div>';
  var rows=[["Ad spend",money(a.spend),money(b.spend),dl(a.spend,b.spend,true)],["Website visits from ads",(a.views||0).toLocaleString("en-NZ"),(b.views||0).toLocaleString("en-NZ"),dl(a.views,b.views)],
   ["Cost per website visit",a.views?money(a.spend/a.views):"-",b.views?money(b.spend/b.views):"-",a.views&&b.views?dl(a.spend/a.views,b.spend/b.views,true):""],
   ["Click rate",a.impressions?(a.clicks/a.impressions*100).toFixed(2)+"%":"-",b.impressions?(b.clicks/b.impressions*100).toFixed(2)+"%":"-",""],
   ["All website visits",((d.web||{}).sessions||0).toLocaleString("en-NZ"),((d.web_prev||{}).sessions||0).toLocaleString("en-NZ"),dl((d.web||{}).sessions,(d.web_prev||{}).sessions)],
   ["Leads in the Core",l.n||0,(d.leads_prev||{}).n||0,dl(l.n,(d.leads_prev||{}).n)],["New members",j.n||0,(d.joins_prev||{}).n||0,dl(j.n,(d.joins_prev||{}).n)]];
  $("#mkVs").innerHTML='<table class="tbl"><thead><tr><th></th><th class="r">'+esc(ml(d.month))+'</th><th class="r">'+esc(ml(d.prev))+'</th><th class="r">Change</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+esc(r[0])+'</td><td class="r">'+esc(r[1])+'</td><td class="r">'+esc(r[2])+'</td><td class="r">'+r[3]+'</td></tr>'}).join("")+'</tbody></table>';
  var WD=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  $("#mkWeekday").innerHTML=hbars((d.weekday||[]).map(function(x){return [WD[+x.d],x.views?x.spend/x.views:0]}),function(v){return "$"+v.toFixed(2)});
  if(d.campaigns&&d.campaigns.length){var tot=d.campaigns.reduce(function(s,c){return s+c.spend},0);
   $("#mkCamps").innerHTML=table([["Campaign","campaign"],["Spend",function(x){return money(x.spend)},1],["Share",function(x){return Math.round(x.spend/tot*100)+"%"},1],["Seen by",function(x){return (x.impressions||0).toLocaleString("en-NZ")},1],["Click rate",function(x){return x.impressions?(x.clicks/x.impressions*100).toFixed(2)+"%":"-"},1],["Per click",function(x){return x.clicks?money(x.spend/x.clicks):"-"},1],["Website visits",function(x){return (x.views||0).toLocaleString("en-NZ")},1],["Per visit",function(x){return x.views?money(x.spend/x.views):"-"},1]],d.campaigns)}
 });
}

/* ---------- roster ---------- */
var RO={week:null,d:null,view:"week",month:null};
var WDN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function addD(iso,n){var d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
$$("[data-rv]").forEach(function(b){b.addEventListener("click",function(){RO.view=b.dataset.rv;$$("[data-rv]").forEach(function(x){x.classList.toggle("on",x===b)});if(RO.view==="month"){RO.month=(RO.week?addD(RO.week,3):new Date().toISOString()).slice(0,7);loadRosterMonth(RO.month)}else loadRoster(RO.week)})});
function rn(n,people){var f=String(n).split(" ")[0];var dup=(people||[]).filter(function(p){return p.name.split(" ")[0]===f}).length>1;return dup?short(n):f}
function short(n){var p=String(n).split(" ");return p[0]+(p[1]?" "+p[1][0]:"")}
function hm(t){var h=+t.slice(0,2),m=t.slice(3);return ((h+11)%12+1)+(m!=="00"?":"+m:"")+(h<12?"am":"pm")}
function loadRosterMonth(mo){
 get("/api/roster?month="+mo).then(function(d){
  if(d.error)return;RO.d=d;RO.month=mo;
  var first=new Date(mo+"-01T12:00:00Z"),lead=(first.getUTCDay()+6)%7,days=new Date(Date.UTC(+mo.slice(0,4),+mo.slice(5,7),0)).getUTCDate();
  $("#roTitle").textContent=first.toLocaleDateString("en-NZ",{month:"long",year:"numeric"});
  $("#roTools").hidden=!d.can_edit;$("#roPub").textContent=d.unpublished?"Publish "+d.unpublished+" shifts":"All published";$("#roPub").disabled=!d.unpublished;
  $("#roCsv").href="/api/roster.csv?from="+mo+"-01&to="+mo+"-"+days;$("#roCopy").hidden=true;
  var tot=0,per={},names={};d.shifts.forEach(function(s){tot+=s.hours;per[s.staff_id]=(per[s.staff_id]||0)+s.hours;names[s.staff_id]=s.name});
  $("#roTiles").innerHTML=tile(d.shifts.length,"Shifts")+tile(Math.round(tot),"Hours rostered")+Object.keys(per).sort(function(a,b){return per[b]-per[a]}).slice(0,6).map(function(k){return tile(Math.round(per[k]*10)/10+" h",names[k])}).join("");
  $("#roNote").textContent=d.can_edit?"Tap a day to add a shift, tap a shift to change it.":"Your shifts are outlined.";
  var h=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(function(x){return '<div class="dh">'+x+'</div>'}).join("");
  for(var i=0;i<lead;i++)h+='<div class="dc out"></div>';
  for(var dd=1;dd<=days;dd++){var iso=mo+"-"+String(dd).padStart(2,"0");var list=d.shifts.filter(function(s){return s.day===iso});
   h+='<div class="dc'+(iso===d.today?" today":"")+'" data-mday="'+iso+'"><span class="dn">'+dd+'</span>'+list.map(function(s){return '<button class="ms'+(s.area==="Management"?" mg":"")+(s.published?"":" draft")+'" data-shift="'+s.id+'">'+esc(hm(s.start))+' '+esc(short(s.name))+'</button>'}).join("")+'</div>'}
  $("#roGrid").outerHTML='<div class="mcal" id="roGrid">'+h+'</div>';
  $("#roHelp").textContent="Black shifts are management. Download hours gives the whole month for Smartpay.";$("#roHours").innerHTML="";
  $("#roReq").innerHTML=d.requests.map(function(r){return '<div class="r" style="cursor:default"><span><b>'+esc(r.name)+'</b> <span class="muted">'+esc(r.kind)+', '+esc(day(r.day))+'</span></span><span class="pill">'+esc(r.status)+'</span></div>'}).join("")||'<div class="muted">Nothing waiting.</div>';
  bindRoGrid();
 });
}
function loadRoster(w){
 if(RO.view==="month"){loadRosterMonth(RO.month);return}
 if(!$("#roGrid").classList.contains("wcal"))$("#roGrid").outerHTML='<div class="wcal" id="roGrid"></div>',bindRoGrid();
 $("#roCopy").hidden=false;
 get("/api/roster"+(w?"?week="+w:"")).then(function(d){
  if(d.error){$("#roGrid").innerHTML='<tr><td class="err">'+esc(d.error)+'</td></tr>';return}
  RO.d=d;RO.week=d.week;var days=[0,1,2,3,4,5,6].map(function(i){return addD(d.week,i)});
  $("#roTitle").textContent="Week of "+new Date(d.week+"T12:00:00").toLocaleDateString("en-NZ",{day:"numeric",month:"long"});
  $("#roTools").hidden=!d.can_edit;$("#roPub").textContent=d.unpublished?"Publish "+d.unpublished+" shift"+(d.unpublished===1?"":"s"):"All published";$("#roPub").disabled=!d.unpublished;
  $("#roCsv").href="/api/roster.csv?from="+d.week+"&to="+addD(d.week,6);
  $("#roNote").textContent=d.can_edit?(d.unpublished?"Dashed shifts are drafts. Staff only see them once you publish.":""):"Your shifts are outlined.";
  var tot=0,per={};d.shifts.forEach(function(s){tot+=s.hours;per[s.staff_id]=(per[s.staff_id]||0)+s.hours});
  var cover=days.filter(function(x){return d.shifts.some(function(s){return s.day===x})}).length;
  $("#roTiles").innerHTML=tile(d.shifts.length,"Shifts")+tile(Math.round(tot*10)/10,"Hours rostered")+tile(cover+" of 7","Days covered")+tile(d.requests.filter(function(r){return r.status==="pending"}).length,"Requests waiting");
  var BANDS=[["Morning","Opens to 11am",0,11],["Day","11am to 4pm",11,16],["Evening","4pm to close",16,24]];
  var g='<div></div>'+days.map(function(x,i){return '<div class="dh'+(x===d.today?" today":"")+'">'+WDN[i]+' '+(+x.slice(8))+'</div>'}).join("");
  BANDS.forEach(function(b){g+='<div class="band">'+b[0]+'<small>'+b[1]+'</small></div>'+days.map(function(x){var list=d.shifts.filter(function(s){var h=+s.start.slice(0,2);return s.day===x&&h>=b[2]&&h<b[3]}).sort(function(a,c){return a.start.localeCompare(c.start)});
   return '<div class="wc'+(x===d.today?" today":"")+'" data-band="'+b[0]+'|'+x+'">'+list.map(function(s){return '<button class="ws'+(s.area==="Management"?" mg":"")+(s.published?"":" draft")+(s.staff_id===d.me?" mine":"")+'" data-shift="'+s.id+'"><b>'+esc(rn(s.name,d.people))+'</b><span>'+esc(hm(s.start))+' to '+esc(hm(s.end))+(s.area&&s.area!=="Reception"?", "+esc(s.area):"")+'</span></button>'}).join("")+'</div>'}).join("")});
  if($("#roGrid").tagName==="TABLE"){$("#roGrid").outerHTML='<div class="wcal" id="roGrid"></div>';bindRoGrid()}
  $("#roGrid").innerHTML=g;
  $("#roHours").innerHTML=d.people.filter(function(p){return per[p.id]}).sort(function(a,b){return per[b.id]-per[a.id]}).map(function(p){return '<span>'+esc(p.name)+' <b>'+(Math.round(per[p.id]*10)/10)+' h</b></span>'}).join("")||'<span>Nobody rostered this week yet.</span>';

  $("#roHelp").textContent=d.can_edit?"Tap a space to add a shift, tap a shift to change it. Dashed shifts aren't published yet. Black shifts are management.":"Your shifts are outlined in lime.";
  $("#roReq").innerHTML=d.requests.map(function(r){return '<div class="r" style="cursor:default"><span><b>'+esc(r.name)+'</b> <span class="muted">'+esc({leave:"Day off",swap:"Swap",available:"Can do extra"}[r.kind])+', '+esc(day(r.day))+(r.note?". "+esc(r.note):"")+'</span></span>'+(r.status==="pending"&&d.can_edit?'<span style="display:flex;gap:6px"><button class="btn dark sm" data-rq="'+r.id+'" data-st="approved">Approve</button><button class="btn line sm" data-rq="'+r.id+'" data-st="declined">Decline</button></span>':'<span class="pill'+(r.status==="approved"?" ok":r.status==="declined"?" warn":"")+'">'+esc(r.status)+'</span>')+'</div>'}).join("")||'<div class="muted">Nothing waiting.</div>';
 });
}
function roForm(s){
 var d=RO.d,E=$("#roEdit");E.hidden=false;
 E.innerHTML='<h2>'+(s.id?"Change shift":"New shift")+'</h2><div class="grid2"><label class="fld">Who<select id="rfWho">'+d.people.map(function(p){return '<option value="'+p.id+'"'+(p.id===s.staff_id?" selected":"")+'>'+esc(p.name)+'</option>'}).join("")+'</select></label><label class="fld">Day<input type="date" id="rfDay" value="'+esc(s.day)+'"></label><label class="fld">Start<input type="time" id="rfStart" value="'+esc(s.start||"05:30")+'"></label><label class="fld">Finish<input type="time" id="rfEnd" value="'+esc(s.end||"13:30")+'"></label><label class="fld">Unpaid break (minutes)<input type="number" id="rfBreak" value="'+(s.break_min||0)+'"></label><label class="fld">Area<input id="rfArea" value="'+esc(s.area||"Reception")+'"></label></div><label class="fld">Note<input id="rfNote" value="'+esc(s.note||"")+'"></label><div class="err" id="rfErr"></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn dark sm" id="rfSave">Save</button>'+(s.id?'<button class="btn line sm" id="rfDel">Delete</button>':"")+'<button class="btn line sm" id="rfClose">Close</button></div>';
 E.scrollIntoView({behavior:"smooth",block:"nearest"});
 $("#rfClose").onclick=function(){E.hidden=true};
 $("#rfSave").onclick=function(){post("/api/roster",{id:s.id||null,staff_id:$("#rfWho").value,day:$("#rfDay").value,start:$("#rfStart").value,end:$("#rfEnd").value,break_min:$("#rfBreak").value,area:$("#rfArea").value,note:$("#rfNote").value}).then(function(r){if(!r.ok){$("#rfErr").textContent=r.error;return}E.hidden=true;loadRoster(RO.week)})};
 if(s.id)$("#rfDel").onclick=function(){post("/api/roster",{action:"delete",id:s.id}).then(function(){E.hidden=true;loadRoster(RO.week)})};
}
function bindRoGrid(){$("#roGrid").addEventListener("click",function(e){
 var d=RO.d;if(!d||!d.can_edit)return;
 var md=e.target.closest("[data-mday]");if(md&&!e.target.closest("[data-shift]")){roForm({staff_id:(d.people[0]||{}).id,day:md.dataset.mday});return}
 var b=e.target.closest("[data-shift]");if(b){roForm(d.shifts.find(function(s){return String(s.id)===b.dataset.shift}));return}
 var c=e.target.closest("[data-cell]");if(c){var p=c.dataset.cell.split("|");roForm({staff_id:+p[0],day:p[1]})}
 var bd=e.target.closest("[data-band]");if(bd){var q=bd.dataset.band.split("|"),T={Morning:["04:45","09:00"],Day:["08:30","16:00"],Evening:["16:00","22:30"]}[q[0]];roForm({staff_id:(d.people[0]||{}).id,day:q[1],start:T[0],end:T[1]})}
})}
bindRoGrid();
$("#roPrev").addEventListener("click",function(){if(!RO.d)return;if(RO.view==="month")loadRosterMonth(RO.d.prev);else loadRoster(RO.d.prev)});
$("#roNext").addEventListener("click",function(){if(!RO.d)return;if(RO.view==="month")loadRosterMonth(RO.d.next);else loadRoster(RO.d.next)});
$("#roNow").addEventListener("click",function(){if(RO.view==="month")loadRosterMonth(new Date().toISOString().slice(0,7));else loadRoster(null)});
$("#roPub").addEventListener("click",function(){var d=RO.d;if(RO.view==="month"){var ws=[];d.shifts.filter(function(s){return !s.published}).forEach(function(s){ws.push(s.day)});Promise.all(ws.filter(function(x,i){return ws.indexOf(x)===i}).map(function(x){return post("/api/roster",{action:"publish",week:x})})).then(function(){loadRosterMonth(RO.month)});return}post("/api/roster",{action:"publish",week:RO.week}).then(function(){loadRoster(RO.week)})});
$("#roCopy").addEventListener("click",function(){post("/api/roster",{action:"copy",week:RO.week}).then(function(r){if(!r.ok&&r.canForce){if(confirm(r.error+" Copy anyway?"))post("/api/roster",{action:"copy",week:RO.week,force:true}).then(function(){loadRoster(RO.week)});return}loadRoster(RO.week)})});
$("#roReq").addEventListener("click",function(e){var b=e.target.closest("[data-rq]");if(!b)return;post("/api/roster",{action:"request",id:+b.dataset.rq,status:b.dataset.st}).then(function(){loadRoster(RO.week)})});
$("#raSave").addEventListener("click",function(){$("#raErr").textContent="";post("/api/roster/ask",{day:$("#raDay").value,kind:$("#raKind").value,note:$("#raNote").value}).then(function(r){if(!r.ok){$("#raErr").textContent=r.error;return}$("#raNote").value="";loadRoster(RO.week)})});

/* ---------- settings ---------- */
var FAMS={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",transporter:"Transporter",passport:"Fitness Passport",pass:"Visit pass",pool:"Pool",trial:"Trial",challenge:"Challenge",staff:"Staff",other:"Other"};
function loadFeeds(){
 get("/api/feeds").then(function(f){
  if(f.error){$("#setFeeds").innerHTML='<div class="err">'+esc(f.error)+'</div>';return}
  var last=function(l){return l?(l.ok?'<span class="pill ok">Updated '+esc(day(l.finished_at))+'</span>':'<span class="pill warn">Failed: '+esc(l.error||"")+'</span>'):'<span class="pill">Not run yet</span>'};
  var x=f.xero,w=f.windsor,b=f.backup;
  $("#setFeeds").innerHTML=
   '<div class="person"><div class="top"><b>Xero</b> '+(x.connected?'<span class="pill ok">Connected'+(x.org?" to "+esc(x.org):"")+'</span> '+last(x.last):x.keys?'<span class="pill warn">Ready to connect</span>':'<span class="pill warn">Needs XERO_CLIENT_ID and XERO_CLIENT_SECRET</span>')+'</div><div class="muted">Profit and loss by month, cash, bills and GST, every night at 2:15am.</div><div style="display:flex;gap:8px;flex-wrap:wrap">'+(x.keys?'<a class="btn '+(x.connected?"line":"dark")+' sm" href="/xero/connect">'+(x.connected?"Reconnect Xero":"Connect Xero")+'</a>':"")+(x.connected?'<button class="btn line sm" data-feed="xero">Refresh now</button>':"")+'</div></div>'+
   '<div class="person"><div class="top"><b>Meta ads and Google Analytics</b> '+(w.key?last(w.last):'<span class="pill warn">Needs WINDSOR_API_KEY</span>')+'</div><div class="muted">Spend, website visits and conversions by day, every night through Windsor.</div>'+(w.key?'<div><button class="btn line sm" data-feed="marketing">Refresh now</button></div>':"")+'</div>'+
   '<div class="person"><div class="top"><b>Backups</b> '+(b.bucket?last(b.last):'<span class="pill warn">Backup bucket not set up</span>')+'</div><div class="muted">A full copy of the Core every night, kept for 35 days, separate from the live database.</div>'+(b.bucket?'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn line sm" data-feed="backup">Back up now</button>'+b.files.map(function(o){return '<a class="btn line sm" href="/api/backups/'+esc(o.key)+'">'+esc(o.key.slice(8,18))+' ('+Math.round(o.size/1024)+' KB)</a>'}).join("")+'</div>':"")+'</div>';
 });
}
$("#setFeeds").addEventListener("click",function(e){var b=e.target.closest("[data-feed]");if(!b)return;b.disabled=true;b.textContent="Working...";post("/api/feeds/run",{what:b.dataset.feed}).then(function(r){if(r&&r.ok===false)alert(r.error);loadFeeds()})});
function loadSettings(){
 loadFeeds();
 get("/api/settings").then(function(d){
  if(d.error){$("#setRules").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var g="";$("#setRules").innerHTML=d.settings.map(function(s){var h=(s.group!==g?'<div class="eyebrow" style="margin-top:14px">'+esc(s.group)+'</div>':"");g=s.group;
   return h+'<div class="person" data-set="'+esc(s.key)+'"><label class="fld">'+esc(s.label)+'<input class="setIn" value="'+esc(s.value)+'"'+(s.type==="tiers"?"":' inputmode="decimal"')+'></label><div style="display:flex;gap:8px;align-items:center"><button class="btn dark sm" data-setsave="1">Save</button><span class="muted setMsg"></span></div></div>'}).join("");
  $("#setClub").innerHTML=[["Name",d.club.name],["Address",d.club.address],["Phone",d.club.phone],["Email",d.club.email],["Hours",d.club.hours]].map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd>'}).join("");
  $("#setInt").innerHTML=d.integrations.map(function(i){var good=/^(Connected|Set up|Cloudflare|Pushed)/.test(i.status);return '<div class="person"><div class="top"><b>'+esc(i.name)+'</b> <span class="pill'+(good?" ok":" warn")+'">'+esc(i.status)+'</span></div><div class="muted">'+esc(i.detail)+'</div></div>'}).join("");
  $("#setSync").innerHTML=d.sync.map(function(x){return '<div><span>'+esc(day(x.finished_at))+'</span><span>'+esc(x.source==="gymmaster_csv"?"Import from GymMaster":x.source==="gymmaster_members"?"Nightly GymMaster copy":x.source)+' '+(x.ok?'<span class="pill ok">OK, '+(x.rows_changed||0)+' rows</span>':'<span class="pill warn">'+esc(x.error||"Failed")+'</span>')+'</span></div>'}).join("")||'<p class="muted" style="margin:0">Nothing yet.</p>';
  $("#setPlans").innerHTML='<table class="tbl"><thead><tr><th>GymMaster type</th><th>Category</th><th>Counts as</th><th>Billing</th><th>Members</th><th></th></tr></thead><tbody>'+d.plans.map(function(p){return '<tr><td>'+esc(p.name)+'</td><td>'+esc(p.category||"")+'</td><td>'+esc(FAMS[p.family]||p.family)+(p.flexi?", Flexi":"")+(p.corporate?", Corporate"+(p.employer?" ("+esc(p.employer)+")":""):"")+'</td><td>'+esc(p.frequency||"")+'</td><td>'+p.members+'</td><td>'+(p.legacy?'<span class="pill">Existing only</span>':"")+'</td></tr>'}).join("")+'</tbody></table>';
 });
}
$("#setRules").addEventListener("click",function(e){var b=e.target.closest("[data-setsave]");if(!b)return;var box=b.closest("[data-set]"),m=box.querySelector(".setMsg");
 post("/api/settings",{key:box.dataset.set,value:box.querySelector(".setIn").value}).then(function(r){if(!r.ok){m.textContent=r.error;m.style.color="var(--red)";return}box.querySelector(".setIn").value=r.value;m.style.color="";m.textContent="Saved"})});

/* ---------- staff and access ---------- */
var ROLE_N={owner:"Owner",manager:"Manager",reception:"Reception",trainer:"Trainer",coach:"Coach"};
function loadStaff(){
 get("/api/staff-admin").then(function(d){
  if(d.error){$("#staffList").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  $("#staffList").innerHTML=d.staff.map(function(s){return '<div class="r" data-st="'+esc(JSON.stringify(s))+'" style="cursor:pointer'+(s.active?"":";opacity:.5")+'"><span><b>'+esc(s.name)+'</b> <span class="muted">'+esc(s.email)+'</span></span><span class="pill'+(s.role==="owner"?" dark":"")+'">'+esc(ROLE_N[s.role]||s.role)+(s.active?"":", off")+'</span>'+(s.role!=="owner"&&!s.active?'<button class="btn line sm" data-strm="'+s.id+'" data-nm="'+esc(s.name)+'">Remove</button>':"")+'</div>'}).join("");
 });
}
$("#staffList").addEventListener("click",function(e){var b=e.target.closest("[data-strm]");if(!b)return;e.stopPropagation();if(!confirm("Remove "+b.dataset.nm+" completely? Their shifts go, their notes stay without their name."))return;post("/api/staff-admin",{action:"remove",id:+b.dataset.strm}).then(function(r){if(!r.ok)alert(r.error);loadStaff()})},true);
function stFill(s){s=s||{};$("#stId").value=s.id||"";$("#stName").value=s.name||"";$("#stEmail").value=s.email||"";$("#stRole").value=s.role||"reception";$("#stOrder").value=s.list_order==null?100:s.list_order;$("#stActive").checked=s.active!==0;$("#stTitle").textContent=s.id?"Edit "+s.name:"Add someone";$("#stErr").textContent="";$("#stOk").innerHTML=""}
$("#staffList").addEventListener("click",function(e){var r=e.target.closest("[data-st]");if(r)stFill(JSON.parse(r.dataset.st))});
$("#stNew").addEventListener("click",function(){stFill(null)});
$("#stSave").addEventListener("click",function(){
 $("#stErr").textContent="";
 post("/api/staff-admin",{id:$("#stId").value||null,name:$("#stName").value,email:$("#stEmail").value,role:$("#stRole").value,list_order:$("#stOrder").value,active:$("#stActive").checked}).then(function(r){
  if(!r.ok){$("#stErr").textContent=r.error;return}
  var msg='<div class="ok">Saved.'+(r.outsideDomain?" This email isn't @m2club.co.nz, so also add it to the m2-core sign-in rule in Cloudflare.":" They can sign in now with their email and a code.")+'</div>';
  loadStaff();if(!$("#stId").value)stFill(null);$("#stOk").innerHTML=msg;
 });
});

/* ---------- import from GymMaster ---------- */
// Same rules as scripts/import_gymmaster_csv.py, run in the browser so the file goes
// straight from this computer into the Core.
function parseCSV(t){
 t=t.replace(/^﻿/,"");var rows=[],row=[],f="",q=false;
 for(var i=0;i<t.length;i++){var c=t[i];
  if(q){if(c==='"'){if(t[i+1]==='"'){f+='"';i++}else q=false}else f+=c}
  else if(c==='"')q=true;else if(c===","){row.push(f);f=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(f);f="";if(row.length>1||row[0]!=="")rows.push(row);row=[]}else f+=c}
 if(f!==""||row.length){row.push(f);rows.push(row)}
 var h=rows.shift()||[];return rows.map(function(r){var o={};h.forEach(function(k,j){o[k.trim()]=(r[j]||"").trim()});return o});
}
function impNum(v){var n=parseFloat(String(v||"").replace(/[^0-9.\-]/g,""));return isNaN(n)?null:n}
function impMobile(v){var d=String(v||"").replace(/\D/g,"");if(d.indexOf("64")===0)d="0"+d.slice(2);else if(d.charAt(0)==="2"&&d.length>=8&&d.length<=10)d="0"+d;return d||null}
function impPassport(last){last=String(last||"").trim();var m=last.match(/^(.*?)[\s-]*\(?\s*(?:FP|ID:?)?\s*(\d{6,8})\s*\)?\s*$/i);if(!m)return[last,null];return[m[1].replace(/^[\s-]+|[\s-]+$/g,"")||null,m[2]]}
var EMPLOYERS=["woods","smartfit","hectre","bnb group","red bull","msd","auckland council"];
function impClassify(name,cat,pd){
 var n=String(name||"").toLowerCase().replace(/\s+/g," "),c=String(cat||"").toLowerCase(),d=String(pd||"").toLowerCase(),fam="other";
 if(n.indexOf("fitness passport")>=0)fam="passport";
 else if(n.indexOf("trip pass")>=0||n.indexOf("group fitness pass")>=0)fam="pass";
 else if(n.indexOf("trial")>=0||n.indexOf("day pass")>=0||n.indexOf("hour pass")>=0||/days (for|on us)|days\. \d|free class|bring a friend/.test(n))fam="trial";
 else if(c.indexOf("challenge")>=0||/\b\d?wc\b/.test(n))fam="challenge";
 else if(n==="staff"||n==="personal trainer rent"||c.indexOf("staff")>=0)fam="staff";
 else if(n.indexOf("transporter")>=0||n.indexOf("transpoter")>=0)fam="transporter";
 else if(n.indexOf("swimming pool")>=0)fam="pool";
 else if(n.indexOf("recovery")>=0)fam="recovery";
 else if(n.indexOf("perform")>=0||n.indexOf("gateway")>=0)fam="perform";
 else if(n.indexOf("classes")>=0||n.indexOf("group fitness")>=0)fam="classes";
 else if(n.indexOf("daily")>=0||n.indexOf("entry")>=0)fam="daily";
 var p={family:fam,flexi:n.indexOf("flexi")>=0?1:0,frequency:null};
 p.includes_classes=["perform","classes","transporter","passport","pass","trial"].indexOf(fam)>=0?1:0;
 p.includes_recovery=["perform","recovery","transporter","pass","trial"].indexOf(fam)>=0?1:0;
 p.paid_in_full=(/paid in full|pif|lifetime/.test(n)||(d.indexOf("fixed term")>=0&&fam!=="pass"&&fam!=="trial"))?1:0;
 if(fam==="passport")p.frequency="yearly";else if(p.paid_in_full||fam==="pass")p.frequency="upfront";
 else{var F=[["fortnightly",["fortnight","fornight"]],["monthly",["month"]],["quarterly",["quarter"]],["weekly",["week"]]];
  for(var i=0;i<F.length;i++){if(F[i][1].some(function(k){return n.indexOf(k)>=0||d.indexOf(k)>=0})){p.frequency=F[i][0];break}}}
 var emp=EMPLOYERS.filter(function(e){return n.indexOf(e)>=0})[0]||null;
 p.corporate=(c.indexOf("corporate")>=0||emp||n.indexOf("% off")>=0||n.indexOf("student")>=0)?1:0;
 p.employer=emp?emp.replace(/\b\w/g,function(x){return x.toUpperCase()}):null;
 p.student=n.indexOf("student")>=0?1:0;
 p.legacy=(["old","old corporate memberships","discontinued","promotions"].indexOf(c)>=0||/^(entry|flexi - entry|flexi - gateway|gateway)/.test(n)||n.indexOf("transpoter")>=0)?1:0;
 return p;
}
var IMP={cur:null,hist:null};
function impRead(input,key){var f=input.files&&input.files[0];if(!f){IMP[key]=null;impSummary();return}
 var r=new FileReader();r.onload=function(){try{IMP[key]=parseCSV(String(r.result))}catch(e){IMP[key]=null;$("#impErr").textContent="Couldn't read "+f.name}impSummary()};r.readAsText(f)}
function impSummary(){
 var c=IMP.cur,h=IMP.hist;$("#impErr").textContent="";
 if(c&&c.length&&!("Member ID" in c[0])){$("#impErr").textContent="That file isn't a GymMaster Current Memberships export (no Member ID column).";$("#impGo").disabled=true;return}
 var fp=c&&c.length&&("Fitness Passport ID" in c[0]);
 $("#impSum").textContent=c?(c.length+" rows of current members"+(fp?", with Fitness Passport IDs":", no Fitness Passport ID column")+(h?". "+h.length+" rows of history.":".")):"";
 $("#impGo").disabled=!(c&&c.length);
}
$("#impCur").addEventListener("change",function(e){impRead(e.target,"cur")});
$("#impHist").addEventListener("change",function(e){impRead(e.target,"hist")});
function impBuild(){
 var cur=IMP.cur,hist=IMP.hist||[],plans={},planRows=[],members=[],mships=[],billing=[],flags=[],trials=[],seen={},fpCol=cur.length&&("Fitness Passport ID" in cur[0]);
 cur.concat(hist).forEach(function(r){var k=(r["Membership Type Name"]||"")+"\u0001"+(r["Membership Type Category Name"]||"");
  if(!plans[k]){var p=impClassify(r["Membership Type Name"],r["Membership Type Category Name"],r["Price Description"]);plans[k]=p;
   planRows.push([r["Membership Type Name"]||"",r["Membership Type Category Name"]||"",p.family,p.frequency,p.flexi,p.paid_in_full,p.corporate,p.employer,p.student,p.legacy,p.includes_classes,p.includes_recovery])}});
 var WK={weekly:1,fortnightly:2,monthly:52/12,quarterly:13};
 cur.forEach(function(r){var id=parseInt(r["Member ID"],10);if(!id||seen[id])return;seen[id]=1;
  var k=(r["Membership Type Name"]||"")+"\u0001"+(r["Membership Type Category Name"]||""),p=plans[k];
  var sp=impPassport(r["Member Last Name"]),first=(r["Member First Name"]||"").trim(),last=sp[0];
  if(!last&&first.indexOf(" ")>0){last=first.slice(first.lastIndexOf(" ")+1);first=first.slice(0,first.lastIndexOf(" "))}
  var fpd=fpCol?String(r["Fitness Passport ID"]||"").replace(/\D/g,""):"";var fp=(fpd.length>=5&&fpd.length<=12)?fpd:null;
  var price=impNum(r["Membership Type Price"]),wv=(price!=null&&WK[p.frequency])?Math.round(price/WK[p.frequency]*100)/100:null;
  var pd=String(r["Price Description"]||"").toLowerCase(),by=p.family==="passport"?"passport":(pd.indexOf("in person")>=0?"in_person":"ezidebit");
  members.push([id,id,first||"Unknown",last||null,sp[1],fp,fp?1:0,(r["Member Email"]||"").toLowerCase()||null,impMobile(r["Member Cell"]),r["Member Gender"]||null,r["Member Source Promotion"]||null,r["Membership Start Date"]||null,parseInt(r["Member Total Visit"],10)||0]);
  mships.push([id,price,wv,r["Membership Start Date"]||null,r["Membership Minimum Term End Date"]||null,r["Membership End Date"]||null,by,r["Member Billing Comment"]||null,r["Discount Code Used"]||null,r["Sales Rep"]||null,r["Membership Type Name"]||"",r["Membership Type Category Name"]||""]);
  if(by==="ezidebit")billing.push([id]);
  if(p.family==="passport")flags.push([id,"passport",null]);
  if(p.corporate)flags.push([id,"corporate",p.employer]);
  if(p.student)flags.push([id,"student",null]);
 });
 hist.forEach(function(r){if((r["Membership Type Category Name"]||"")!=="Trials & Limited Passes")return;if(String(r["Membership Type Name"]||"").toLowerCase().indexOf("trip pass")>=0)return;
  var id=parseInt(r["Member ID"],10),here=!!seen[id];
  trials.push([here?id:null,((r["Member First Name"]||"")+" "+(r["Member Last Name"]||"")).trim(),(r["Member Email"]||"").toLowerCase()||null,impMobile(r["Member Cell"]),r["Member Source Promotion"]||null,here?"joined":"lost",r["Membership Start Date"]||null])});
 return {fpCol:fpCol,parts:[["plans",planRows],["members",members],["memberships",mships],["billing",billing],["flags",flags],["trials",trials]]};
}
$("#impGo").addEventListener("click",function(){
 var b=$("#impGo");b.disabled=true;$("#impErr").textContent="";$("#impDone").innerHTML="";
 var data;try{data=impBuild()}catch(e){$("#impErr").textContent="Couldn't read the file: "+e.message;b.disabled=false;return}
 var total=data.parts.reduce(function(a,p){return a+p[1].length},0),sent=0,log=null;
 function fail(m){$("#impErr").textContent=m+" Nothing is broken: fix it and press Import again.";b.disabled=false}
 post("/api/import",{step:"start",history:!!IMP.hist}).then(function(r){if(!r.ok)return fail(r.error||"Couldn't start.");log=r.log;
  var queue=[];data.parts.forEach(function(p){for(var i=0;i<p[1].length;i+=150)queue.push([p[0],p[1].slice(i,i+150)])});
  (function next(){
   if(!queue.length){post("/api/import",{step:"finish",log:log,rowsIn:IMP.cur.length+(IMP.hist?IMP.hist.length:0),rowsChanged:sent,fpLoaded:data.fpCol}).then(function(f){
     $("#impProg").textContent="";b.disabled=false;
     $("#impDone").innerHTML='<div class="ok">Done. '+(f.members||0).toLocaleString("en-NZ")+' current members in the Core.</div>'+data.parts.map(function(p){return '<div class="r"><span>'+esc(p[0])+'</span><span class="pill">'+p[1].length.toLocaleString("en-NZ")+'</span></div>'}).join("")});return}
   var q=queue.shift();
   post("/api/import",{step:"rows",table:q[0],rows:q[1]}).then(function(r){if(!r.ok)return fail(r.error||"A batch failed.");sent+=q[1].length;$("#impProg").textContent="Importing... "+Math.round(sent/total*100)+"%";next()}).catch(function(e){fail(String(e))});
  })();
 }).catch(function(e){fail(String(e))});
});

/* ---------- fitness passport ---------- */
function loadPassport(){
 var mi=$("#fpMonth");if(!mi.value){var n=new Date();mi.value=n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")}
 $("#fpCsv").href="/api/passport.csv?month="+mi.value;
 get("/api/passport?month="+mi.value).then(function(d){
  if(d.error){$("#fpRows").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  var t=[["Passport visits",d.visits.toLocaleString("en-NZ")],["Members who trained",d.members_visiting],["Visits with no Passport ID",d.visits_no_id],
   ["Passport members",d.passport_members.toLocaleString("en-NZ")],["Missing a Passport ID",d.members_no_id==null?"Not known yet":d.members_no_id],["ID not in GymMaster yet",d.members_not_in_gm]];
  if(d.money){t.unshift(["Estimated payout",money(d.money.total)],["Rate per visit now",money(d.money.rate)],["Visits to the next rate",d.money.visits_to_next_tier==null?"Top rate":d.money.visits_to_next_tier]);if(d.money.at_risk)t.push(["Lost to missing IDs",money(d.money.at_risk)])}
  $("#fpTiles").innerHTML=t.map(function(x){return '<div class="tile"><div class="n">'+esc(x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>'}).join("");
  $("#fpNote").textContent=(d.ids_loaded?"":"Passport IDs from GymMaster aren't loaded yet. Add the Fitness Passport ID column to the GymMaster member export and import it. ")+
   "GymMaster reports each Passport check-in to Fitness Passport. This page is M2's own check"+(d.money?". Payout is an estimate from the tier rates, paid the month after.":".");
  var more=function(n,shown){return n>shown?'<div class="muted" style="padding:6px">'+(n-shown)+' more. Download the CSV for the full list.</div>':""};
  $("#fpNoId").innerHTML=d.no_id.slice(0,30).map(function(r,i){return '<div class="person" data-i="'+i+'"><div class="top"><a href="#" data-member="'+r.member_id+'"><b>'+esc(nm(r))+'</b></a> <span class="pill warn">'+r.visits+' visits</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><label class="sr" for="fpn'+i+'">Fitness Passport ID</label><input id="fpn'+i+'" class="fpIn" inputmode="numeric" placeholder="Fitness Passport ID" style="flex:1;min-width:160px;height:40px;border:1px solid var(--line);border-radius:12px;padding:0 12px"><button class="btn dark sm" data-fpadd="'+r.member_id+'">Save ID</button></div></div>'}).join("")+more(d.no_id.length,30)||'<div class="ok">Every Passport visit this month has an ID.</div>';
  $("#fpDupCard").hidden=!d.duplicate_ids.length;
  $("#fpDup").innerHTML=d.duplicate_ids.map(function(x){return '<div class="r"><span><b>'+esc(x.fp_id)+'</b> <span class="muted">'+esc(x.names)+'</span></span><span class="pill warn">'+x.n+' people</span></div>'}).join("");
  $("#fpRows").innerHTML=d.rows.slice(0,40).map(function(r){return '<div class="r" data-member="'+r.member_id+'"><span><b>'+esc(nm(r))+'</b> <span class="muted">'+(r.fp_id?esc(r.fp_id):"No ID")+'</span></span><span class="pill'+(r.fp_id?"":" warn")+'">'+r.visits+'</span></div>'}).join("")+more(d.rows.length,40)||'<div class="muted">No Passport visits recorded for this month yet. Visits arrive once the Core copies check-ins from GymMaster or the M2 App opens the doors.</div>';
 });
}
$("#fpMonth").addEventListener("change",function(){loadPassport();loadFpCheck(false)});
function loadFpMore(){
 get("/api/passport/insights").then(function(d){
  if(d.error)return;
  var tm=d.this_month,cv=d.cover||{n:0,swept:0};
  var t=[[tm.visits.toLocaleString("en-NZ"),"Passport visits so far this month"],[tm.pace.toLocaleString("en-NZ"),"Heading for, at this pace"]];
  if(d.money){t.push([money(d.money.pace.total),"Pay at this pace (incl GST)"],[money(d.money.pace.rate),"Rate per visit at that level"],[d.money.pace.visits_to_next_tier==null?"Top rate":d.money.pace.visits_to_next_tier.toLocaleString("en-NZ"),"More visits for the next rate"])}
  t.push([(d.sleeper_count||0).toLocaleString("en-NZ"),"Passport members with no visits last month"]);
  $("#fpNowTiles").innerHTML=t.map(function(x){return tile(x[0],x[1])}).join("");
  $("#fpNowNote").textContent=cv.n?("Counts copied for "+(cv.swept||0)+" of "+cv.n+" Passport members so far. The Core refreshes them through the day."):"";
  var months=d.months||[],mm={};months.forEach(function(m){mm[m.month]=m});(d.sweep||[]).forEach(function(s){mm[s.month]=mm[s.month]||{month:s.month};mm[s.month].swept=s.visits});
  var keys=Object.keys(mm).sort().slice(-12),est={};if(d.money)d.money.months.forEach(function(x){est[x.month]=x});
  $("#fpMonthsChart").innerHTML=keys.length?bars(keys.map(function(k){var x=mm[k];return {label:ml(k),vals:[x.visits||x.swept||0]}}),[{name:"Visits",cls:""}],function(v){return v+" visits"}):'<div class="muted">Nothing yet.</div>';
  $("#fpMonthsTbl").innerHTML=keys.length?table([["Month",function(x){return MON[+x.month.slice(5,7)-1]+" "+x.month.slice(0,4)}],["Visits",function(x){return (x.visits||x.swept||0).toLocaleString("en-NZ")},1],["New members",function(x){return x.signups==null?"":x.signups},1]].concat(d.money?[["Pay from tiers",function(x){var e=est[x.month];return e&&e.estimate?money(e.estimate):""},1],["Paid",function(x){return x.paid?money(x.paid):""},1]]:[]),keys.slice().reverse().map(function(k){return mm[k]})):"";
  var f=d.freq||[],tot=f.reduce(function(a,x){return a+x.n},0);
  $("#fpFreqNote").textContent=tot?("Visits in "+MON[+d.last_ym.slice(5,7)-1]+" by "+tot.toLocaleString("en-NZ")+" Passport members with counts copied. More visits means Passport pays more per visit for everyone."):"Visit counts are still being copied from GymMaster.";
  $("#fpFreq").innerHTML=hbars(f.map(function(x){return [x.band+" visits",x.n]}),function(n){return n.toLocaleString("en-NZ")});
  $("#fpJoins").innerHTML=(d.joins||[]).length?bars(d.joins.slice(-12).map(function(x){return {label:ml(x.month),vals:[x.n]}}),[{name:"New",cls:""}]):'<div class="muted">Nothing yet.</div>';
  $("#fpSleepNote").textContent=(d.sleeper_count||0)+" Passport members didn't come in last month and haven't been in this month. Every visit they make earns M2 money: a quick text or call brings some back.";
  $("#fpSleep").innerHTML=(d.sleepers||[]).slice(0,40).map(function(r){return '<div class="r" data-member="'+r.id+'"><span><b>'+esc(nm(r))+'</b> <span class="muted">'+(r.last_month?"last came in "+ml(r.last_month):"no visits in a year")+'</span></span>'+(r.mobile?'<a class="pill" href="tel:'+esc(r.mobile)+'">'+esc(r.mobile)+'</a>':"")+'</div>'}).join("")||'<div class="muted">Nobody yet, or counts are still being copied.</div>';
  $("#fpTop").innerHTML=(d.top||[]).map(function(r){return '<div class="r" data-member="'+r.id+'"><span><b>'+esc(nm(r))+'</b></span><span class="pill ok">'+r.visits+' visits</span></div>'}).join("")||'<div class="muted">Nothing yet.</div>';
 });
}
$("#fpNoId").addEventListener("click",function(e){
 var b=e.target.closest("[data-fpadd]");if(!b)return;e.stopPropagation();
 var box=b.closest(".person");
 post("/api/members/"+b.dataset.fpadd+"/details",{fp_id:box.querySelector(".fpIn").value}).then(function(r){
  if(!r.ok){alertIn(box,r.error);return}loadPassport();
 });
});

/* ---------- add member ---------- */
var PL=null,pick={fam:"perform",freq:"weekly"},sel=null,mate=null,newId=null;
var FAMN={perform:"Perform",classes:"Classes",daily:"Daily",recovery:"Recovery",trial:"Trial or pass",passport:"Fitness Passport"};
var FREQN={weekly:"Weekly",fortnightly:"Fortnightly",monthly:"Monthly",quarterly:"Quarterly",upfront:"Paid upfront"};
function startAdd(){
 $("#a1").hidden=false;$("#a2").hidden=true;$("#aErr").textContent="";$("#aAnyway").hidden=true;
 if(!PL)get("/api/plans").then(function(d){
  if(d.error){$("#plans").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  PL=d.plans;fillSelect($("#goal"),d.goals,"");fillSelect($("#source"),d.sources,"");drawPlans();
 });
 setTimeout(sizeSig,50);
}
function drawPlans(){
 var fams=[];PL.forEach(function(p){if(fams.indexOf(p.family)<0)fams.push(p.family)});
 $("#fam").innerHTML=fams.map(function(f){return '<button type="button" class="chip'+(f===pick.fam?" on":"")+'" data-f="'+f+'">'+FAMN[f]+'</button>'}).join("");
 var freqs=[];PL.filter(function(p){return p.family===pick.fam}).forEach(function(p){if(freqs.indexOf(p.frequency)<0)freqs.push(p.frequency)});
 if(freqs.indexOf(pick.freq)<0)pick.freq=freqs[0];
 $("#freq").innerHTML=(pick.fam==="trial"||pick.fam==="passport")?"":freqs.map(function(f){return '<button type="button" class="chip'+(f===pick.freq?" on":"")+'" data-q="'+f+'">'+FREQN[f]+'</button>'}).join("");
 var fx=$("#flexi").checked;
 var list=PL.filter(function(p){return p.family===pick.fam&&(pick.fam==="trial"||pick.fam==="passport"||(p.frequency===pick.freq&&(p.frequency==="upfront"||p.frequency==="quarterly"||p.flexi===fx)))});
 $("#plans").innerHTML=list.map(function(p){return '<button type="button" class="plan'+(sel&&sel.id===p.id?" on":"")+'" data-p="'+p.id+'"><b>'+esc(p.name)+'</b><span>'+esc(p.price+" "+(p.priceDescription||""))+(p.signupFee?", joining fee $"+p.signupFee:"")+'</span></button>'}).join("")||'<div class="muted">Nothing for that combination.</div>';
}
$("#fam").addEventListener("click",function(e){var b=e.target.closest("[data-f]");if(!b)return;pick.fam=b.dataset.f;sel=null;if(pick.fam==="passport"){$("#passport").checked=true}fpToggle();drawPlans()});
function fpToggle(){var on=$("#passport").checked||pick.fam==="passport";$("#fpWrap").hidden=!on;$("#mateWrap").hidden=on;if(on){mate=null;$("#mateSel").textContent=""}}
$("#freq").addEventListener("click",function(e){var b=e.target.closest("[data-q]");if(!b)return;pick.freq=b.dataset.q;sel=null;drawPlans()});
$("#flexi").addEventListener("change",function(){sel=null;drawPlans()});
$("#plans").addEventListener("click",function(e){var b=e.target.closest("[data-p]");if(!b)return;sel=PL.find(function(p){return p.id===+b.dataset.p});drawPlans();loadTerms()});
function loadTerms(){
 if(!sel){return}
 $("#aRead").checked=false;$("#aTerms").innerHTML='<div class="muted">Loading the contract from GymMaster...</div>';
 var price=sel.price+" "+(sel.priceDescription||"");
 $("#aPdf").href="/contract?plan="+sel.id+"&name="+encodeURIComponent(sel.name)+"&price="+encodeURIComponent(price);$("#aPdf").hidden=false;
 get("/api/agreement?plan="+sel.id).then(function(d){
  if(!d.ok||!d.agreements.length){$("#aTerms").innerHTML='<div>The M2 Training Club membership terms and conditions apply. GymMaster has no separate contract for '+esc(sel.name)+'.</div>';return}
  $("#aTerms").innerHTML='<p><b>'+esc(sel.name)+'</b>, '+esc(price)+'</p>'+d.agreements.map(function(a){return '<h3>'+esc(a.name)+'</h3>'+a.body+(a.points.length?'<ul>'+a.points.map(function(p){return '<li>'+esc(p)+'</li>'}).join("")+'</ul>':"")}).join("");
 });
}
$("#passport").addEventListener("change",fpToggle);
var mt;$("#mate").addEventListener("input",function(e){clearTimeout(mt);mt=setTimeout(function(){
 if(e.target.value.length<2){$("#mateRes").innerHTML="";return}
 get("/api/members?q="+encodeURIComponent(e.target.value)).then(function(d){$("#mateRes").innerHTML=(d.results||[]).slice(0,6).map(function(m){return '<div class="r" data-m="'+m.id+'" data-n="'+esc(nm(m))+'"><span>'+esc(nm(m))+'</span><span class="pill">'+esc(m.family||"")+'</span></div>'}).join("")});
},250)});
$("#mateRes").addEventListener("click",function(e){var r=e.target.closest("[data-m]");if(!r)return;e.stopPropagation();mate=+r.dataset.m;$("#mateSel").textContent="Brought by "+r.dataset.n+". Both get 4 weeks free.";$("#mateRes").innerHTML="";$("#mate").value=""});
var cv=$("#sig"),cx=cv.getContext("2d"),drawing=false,signed=false;
function sizeSig(){var r=cv.getBoundingClientRect();if(!r.width)return;cv.width=r.width*2;cv.height=r.height*2;cx.setTransform(2,0,0,2,0,0);cx.lineWidth=2;cx.lineCap="round";cx.strokeStyle="#0A0A0A";signed=false}
window.addEventListener("resize",function(){if(VIEW==="add"&&!signed)sizeSig()});
function pt(e){var r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
cv.addEventListener("pointerdown",function(e){drawing=true;cv.setPointerCapture(e.pointerId);var p=pt(e);cx.beginPath();cx.moveTo(p[0],p[1])});
cv.addEventListener("pointermove",function(e){if(!drawing)return;var p=pt(e);cx.lineTo(p[0],p[1]);cx.stroke();signed=true});
cv.addEventListener("pointerup",function(){drawing=false});
$("#sigClear").addEventListener("click",sizeSig);
function saveMember(force){
 $("#aErr").textContent="";$("#aAnyway").hidden=true;
 if(!sel){$("#aErr").textContent="Pick a membership first.";return}
 if(!$("#aRead").checked){$("#aErr").textContent="They need to read the contract first. Tick \"They've read the contract\".";return}
 if(!signed){$("#aErr").textContent="They need to sign first.";return}
 if(!PHOTO&&!$("#aNoPhoto").checked){$("#aErr").textContent="Take their photo, or tick \"Not today\".";return}
 if(($("#passport").checked||sel.family==="passport")&&!$("#fpid").value.trim()){$("#aErr").textContent="Add their Fitness Passport ID. Passport can't pay us for their visits without it.";$("#fpid").focus();return}
 var body={planId:sel.id,planName:sel.name,planPrice:sel.price+" "+(sel.priceDescription||""),first:$("#first").value,last:$("#last").value,email:$("#email").value,mobile:$("#mobile").value,dob:$("#dob").value,gender:$("#gender").value,goal:$("#goal").value,source:$("#source").value,emergencyName:$("#ename").value,emergencyPhone:$("#ephone").value,passport:$("#passport").checked||sel.family==="passport",fpId:$("#fpid").value,referredBy:mate,agreed:$("#agreed").checked||$("#aRead").checked,signature:cv.toDataURL("image/png"),confirmDuplicate:!!force};
 $("#aSave").disabled=true;$("#aSave").textContent="Adding...";
 post("/api/members",body).then(function(d){
  $("#aSave").disabled=false;$("#aSave").textContent="Add member";
  if(!d.ok){$("#aErr").textContent=d.error||"Something went wrong.";if(d.canOverride)$("#aAnyway").hidden=false;return}
  newId=d.id;$("#a1").hidden=true;$("#a2").hidden=false;window.scrollTo(0,0);
  if(PHOTO)post("/api/members/"+newId+"/photo",{jpeg:PHOTO}).then(function(r){if(!r.ok)$("#aDone").insertAdjacentHTML("beforeend",'<br><span class="err">Photo not saved: '+esc(r.error)+'. Take it again from their profile.</span>')});
  $("#aDone").innerHTML="<b>"+esc(body.first+" "+body.last)+"</b> is in, on "+esc(sel.name)+"."+(d.warnings&&d.warnings.length?"<br>"+d.warnings.map(esc).join("<br>"):"");
  $("#fpGm").hidden=!d.fpId;$("#fpGmOk").innerHTML="";$("#fpGmDone").hidden=false;
  if(d.fpId){$("#fpGmId").textContent=d.fpId;$("#fpGmOpen").href=d.gymmasterUrl}
  $("#billCard").hidden=!d.needsBilling;
  if(!d.needsBilling){$("#billNote").textContent="No bank details needed for this one.";$("#billOpen").hidden=true;$("#billDone").checked=true}
  else get("/api/members/"+newId+"/billing-link").then(function(bl){
   $("#billNote").textContent=bl.note||bl.error||"";$("#billOpen").hidden=!bl.url;$("#billOpen").dataset.url=bl.url||"";
   if(bl.mode==="ezidebit"&&window.QRCode){$("#qr").hidden=false;$("#qr").innerHTML="";new QRCode($("#qr"),{text:bl.url,width:120,height:120})}
  });
  setTimeout(function(){$("#tag").focus()},150);
 }).catch(function(e){$("#aSave").disabled=false;$("#aSave").textContent="Add member";$("#aErr").textContent=String(e)});
}
$("#aSave").addEventListener("click",function(){saveMember(false)});
$("#aAnyway").addEventListener("click",function(){saveMember(true)});
$("#fpGmDone").addEventListener("click",function(){
 post("/api/jobs",{kind:"fp_id_gm",outcome:"fp_in_gm",member_id:newId}).then(function(r){
  if(!r.ok){$("#fpGmOk").innerHTML='<div class="err">'+esc(r.error)+'</div>';return}
  $("#fpGmOk").innerHTML='<div class="ok">Thanks. Passport will be paid for their visits.</div>';$("#fpGmDone").hidden=true;
 });
});
$("#billOpen").addEventListener("click",function(e){var u=e.currentTarget.dataset.url;if(u)window.open(u,"m2billing","width=900,height=900")});
function saveTag(){
 $("#tagErr").textContent="";var t=$("#tag").value.trim();if(!t)return;
 post("/api/members/"+newId+"/key-tag",{tag:t}).then(function(d){
  if(!d.ok){$("#tagErr").textContent=d.error;$("#tag").select();return}
  $("#tagOk").innerHTML='<div class="ok">Tag '+esc(d.tag)+' saved. '+esc(d.note||"")+' <a href="'+esc(d.gymmasterUrl)+'" target="_blank" rel="noopener">Open in GymMaster</a></div>';
 });
}
$("#tag").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();saveTag()}});
$("#tag").addEventListener("change",saveTag);
$("#aFinish").addEventListener("click",function(){
 $("#finErr").textContent="";
 if(newId&&$("#billDone").checked&&!$("#billOpen").hidden)post("/api/jobs",{kind:"missing_billing",outcome:"billing_in",member_id:newId});
 if(newId&&!$("#billDone").checked&&!$("#billOpen").hidden&&!$("#finErr").dataset.warned){$("#finErr").textContent="Bank details aren't ticked off. They'll stay on Today until they are. Press Done again to finish.";$("#finErr").dataset.warned="1";return}
 resetAdd();show("today");
});
$("#aProfile").addEventListener("click",function(){var id=newId;resetAdd();openMember(id)});
function resetAdd(){
 ["#first","#last","#email","#mobile","#dob","#ename","#ephone","#tag","#mate"].forEach(function(s){$(s).value=""});
 $("#goal").value="";$("#source").value="";$("#gender").value="";$("#passport").checked=false;$("#fpid").value="";PHOTO=null;$("#aFace").innerHTML="?";$("#aPhotoBtn").textContent="Take photo";$("#aNoPhoto").checked=false;$("#fpWrap").hidden=true;$("#fpGm").hidden=true;$("#billCard").hidden=false;$("#billOpen").hidden=false;$("#agreed").checked=false;$("#billDone").checked=false;$("#mateWrap").hidden=false;
 $("#tagOk").innerHTML="";$("#mateSel").textContent="";$("#qr").hidden=true;$("#finErr").dataset.warned="";sel=null;mate=null;newId=null;if(PL)drawPlans();sizeSig();
}

/* ---------- M2 App ---------- */
function loadApp(){
 get("/api/app").then(function(d){if(d.error){$("#apMode").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
  $("#apTiles").innerHTML=tile(d.users.ever,"Members who have used the app")+tile(d.users.week,"Used it this week")+tile(d.users.week_core,"Served by the Core this week")+tile(d.requests.filter(function(r){return !r.done_at}).length,"Requests to handle");
  var M=[["off","Nobody yet","The old Google service answers everything, as before."],["staff","Staff only","Staff are served by the Core. Use this to test on your own phones."],["all","Everyone","Every member is served by the Core."]];
  $("#apMode").innerHTML=M.map(function(m){return '<label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;cursor:pointer"><input type="radio" name="apm" value="'+m[0]+'"'+(d.mode===m[0]?" checked":"")+' style="margin-top:4px"> <span><b>'+m[1]+'</b><br><span class="muted" style="font-size:13px">'+m[2]+'</span></span></label>'}).join("")+'<div id="apModeMsg"></div>';
  var R=d.ready,steps=[];
  if(!R.secret)steps.push('<li>In the Google script <b>M2 APP Service</b>, open Project Settings, Script properties, and copy the value of <b>SESSION_SECRET</b>. In Cloudflare, Workers, <b>m2-core</b>, Settings, Variables and secrets, add a <b>Secret</b> called <b>APP_SESSION_SECRET</b> with that same value. Then members stay signed in whichever side answers.</li>');
  if(!R.staff_key||!R.member_key)steps.push('<li>The GymMaster keys (GM_API_KEY and GM_STAFF_KEY) are missing on m2-core.</li>');
  var sc=d.secret_check||"";if(R.secret&&!steps.length){steps=null;$("#apReady").innerHTML=/^match/.test(sc)?'<div class="ok" style="margin-top:10px">Ready. The shared secret matches the Google service (checked on a real sign-in).</div>':/^nomatch/.test(sc)?'<div class="err" style="margin-top:10px">APP_SESSION_SECRET doesn\'t match SESSION_SECRET in the Google script. Copy it again before switching on, or people get signed out.</div>':'<div class="warnbox" style="margin-top:10px">Keys are in. The secret gets checked the next time someone signed in opens the app (open it on your phone). Wait for the green tick before switching on.</div>'}else
$("#apReady").innerHTML=steps.length?'<div class="warnbox" style="margin-top:10px"><b>One step before switching on</b><ol style="margin:8px 0 0 18px">'+steps.join("")+'</ol></div>':'<div class="ok" style="margin-top:10px">Ready. Keys and the shared session secret are in.</div>';
  var N={front:"Front door",male:"Men's recovery",female:"Women's recovery",door4:"Fourth door"};
  $("#apDoors").innerHTML=Object.keys(N).map(function(k){return '<label class="fld">'+N[k]+'<input data-apd="'+k+'" inputmode="numeric" value="'+esc(d.doors[k]||"")+'" placeholder="Old service opens it"></label>'}).join("")+'<button class="btn dark" id="apDoorSave">Save doors</button><div id="apDoorMsg"></div>';
  $("#apReq").innerHTML=d.requests.length?table([["When",function(r){return fmtWhen(r.at)}],["Member",function(r){return '<a href="#" data-member="'+r.member_id+'">'+esc(nm(r))+'</a>'},0,1],["Request",function(r){return ({delete:"Delete my account",upgrade:"Upgrade",feedback:"Feedback",hold:"Hold",cancel:"Cancel"})[r.kind]||r.kind}],["Message","text"],["",function(r){return r.done_at?'<span class="muted">Done by '+esc(r.done_by||"")+'</span>':'<a href="#" data-apdone="'+r.id+'">Mark done</a>'},0,1]],d.requests):'<div class="muted">Nothing yet. Requests sent through the Core show here.</div>';
  $("#apDoorLog").innerHTML=d.door_log.length?table([["When",function(r){return fmtWhen(r.at)}],["Member",function(r){return '<a href="#" data-member="'+r.member_id+'">'+esc(nm(r))+'</a>'},0,1],["Door","door"],["Opened",function(r){return r.opened?"Yes":"No"}],["Note","note"],["Metres away","metres",1]],d.door_log):'<div class="muted">No doors opened through the Core yet.</div>';
 });
}
function fmtWhen(s){var d=new Date(String(s).replace(" ","T")+"Z");return d.toLocaleString("en-NZ",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}
$("#apMode").addEventListener("change",function(e){if(e.target.name!=="apm")return;post("/api/app",{mode:e.target.value}).then(function(r){if(!r.ok){$("#apModeMsg").innerHTML='<div class="err">'+esc(r.error)+'</div>';loadApp();return}$("#apModeMsg").innerHTML='<div class="ok">Saved.</div>'})});
$("#apDoors").addEventListener("click",function(e){if(!e.target.closest("#apDoorSave"))return;var o={};document.querySelectorAll("[data-apd]").forEach(function(i){o[i.dataset.apd]=i.value});post("/api/app",{doors:o}).then(function(r){$("#apDoorMsg").innerHTML=r.ok?'<div class="ok">Saved.</div>':'<div class="err">'+esc(r.error)+'</div>'})});
$("#apReq").addEventListener("click",function(e){var a=e.target.closest("[data-apdone]");if(!a)return;e.preventDefault();post("/api/app/request/"+a.dataset.apdone,{}).then(loadApp)});
$("#apPrevGo").addEventListener("click",function(){var id=$("#apPrevId").value.replace(/\D/g,"");if(!id)return;get("/api/app/preview/"+id).then(function(d){if(d.error){$("#apPrev").innerHTML='<div class="err">'+esc(d.error)+'</div>';return}
 var m=d.member;$("#apPrev").innerHTML='<div class="tiles">'+tile(m.first+" "+m.last,"Name")+tile(d.tier||"none","App tier")+tile(m.totalvisits,"Visits")+tile(d.days.length,"Days in the last 400")+'</div><p class="muted" style="margin-top:8px">Memberships: '+esc(d.memberships.map(function(x){return x.name}).join(", ")||"none")+(d.pass?". Pass: "+esc(d.pass.name)+(d.pass.left!=null?", "+d.pass.left+" days left":""):"")+(m.staff?". Staff":"")+(m.coach?", coach":"")+'</p>'})});

function navLabels(){document.querySelectorAll("nav .navlab").forEach(function(l){var n=l.nextElementSibling,any=false;while(n&&!n.classList.contains("navlab")){if(!n.hidden)any=true;n=n.nextElementSibling}l.hidden=!any})}

function loadFpCheck(fresh){var m=$("#fpMonth").value;$("#fpCheck").innerHTML='<div class="muted">'+(fresh?"Asking GymMaster...":"Loading...")+'</div>';
 (fresh?post("/api/passport/check?month="+m,{}):get("/api/passport/check?month="+m)).then(function(d){
  if(d.error){$("#fpCheck").innerHTML='<div class="muted">'+esc(d.error)+'</div>';return}
  if(d.core==null){$("#fpCheck").innerHTML='<div class="muted">Not checked yet for this month. Tap Check this month again.</div>';return}
  var pct=d.members?Math.round(d.same/d.members*1000)/10:0,gap=d.core-d.gm;
  var h='<div class="tiles">'+tile(d.core.toLocaleString("en-NZ"),"Core count")+tile(d.gm.toLocaleString("en-NZ"),"GymMaster count")+(d.fp!=null?tile(d.fp.toLocaleString("en-NZ"),"Passport paid for"):"")+tile(pct+"%","Members that match")+'</div>';
  h+=Math.abs(gap)<=Math.max(5,d.gm*0.005)&&pct>=98?'<div class="ok" style="margin-top:10px">Close enough to switch over: the counts are within half a percent.</div>':'<div class="warnbox" style="margin-top:10px">'+(gap<0?"The Core is missing "+(-gap)+" visits that GymMaster has.":"The Core has "+gap+" more visits than GymMaster.")+' Not ready to take over yet.</div>';
  if(d.diffs&&d.diffs.length)h+='<div style="overflow-x:auto;margin-top:10px">'+table([["Member",function(r){return '<a href="#" data-member="'+r.member_id+'">'+esc(r.name)+'</a>'},0,1],["Core","core",1],["GymMaster","gm",1]],d.diffs.slice(0,30))+(d.diff_count>30?'<div class="muted" style="font-size:13px">and '+(d.diff_count-30)+' more</div>':"")+'</div>';
  $("#fpCheck").innerHTML=h});
}
$("#fpCheckRun").addEventListener("click",function(){loadFpCheck(true)});

/* ---------- owners: yesterday at a glance ---------- */
function loadMorning(){get("/api/morning").then(function(d){if(d.error)return;var el=$("#morning");el.hidden=false;
 var dd=new Date(d.day+"T12:00:00"),dl=dd.toLocaleDateString("en-NZ",{weekday:"long",day:"numeric",month:"long"});
 var paying=d.joins.filter(function(j){return !j.passport}).length,fpj=d.joins.length-paying;
 var pos=0;(d.pos||[]).forEach(function(p){pos+=p.total});
 var fill=function(c){return c&&c.spots?Math.round(c.booked/c.spots*100)+"%":"-"};
 var ld=(d.leads||[]).reduce(function(a,l){return a+l.n},0);
 var h='<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><h2 style="margin-right:auto">Yesterday, '+esc(dl)+'</h2><span class="muted" style="font-size:13px">Only you and Tim see this</span></div>';
 h+='<div class="tiles" style="margin-top:10px">'+tile(paying+(fpj?" + "+fpj+" FP":""),"Joined")+tile(d.cancels.length,"Gave notice")+tile(d.failed.length+(d.failed.length?" ("+money(d.failed_total)+")":""),"Payments failed")+tile(d.people+(d.people_week_ago?" ("+(d.people>=d.people_week_ago?"+":"")+(d.people-d.people_week_ago)+")":""),"Came in (vs last week)")
  +tile(ld,"New leads")+tile(d.pt_waiting,"PT leads waiting for Tim")+tile(fill(d.classes_yesterday),"Classes full yesterday")+tile(money(pos),"Point of sale")+'</div>';
 var fp=d.passport;h+='<div class="ok" style="margin-top:12px">Fitness Passport this month: <b>'+fp.visits.toLocaleString("en-NZ")+' visits</b> in '+fp.days_counted+' days'+(fp.pace?', on pace for <b>'+fp.pace.toLocaleString("en-NZ")+'</b> (about '+money(fp.at_pace)+')':"")+(fp.last_month&&fp.last_month.visits?'. Last month '+fp.last_month.visits.toLocaleString("en-NZ"):"")+'.</div>';
 var lst=function(title,rows,f){return rows.length?'<div style="margin-top:12px"><b>'+title+'</b><div class="list">'+rows.slice(0,8).map(function(r){return '<div class="lrow" data-member="'+r.id+'" style="cursor:pointer"><span>'+esc(r.name)+'</span><span class="muted" style="font-size:13px">'+f(r)+'</span></div>'}).join("")+(rows.length>8?'<div class="muted" style="font-size:13px">and '+(rows.length-8)+' more</div>':"")+'</div></div>':""};
 h+='<div class="row2" style="margin-top:4px"><div>'+lst("Joined",d.joins,function(r){return esc(r.plan||"")})+lst("Gave notice",d.cancels,function(r){return esc((r.plan||"")+(r.reason?", "+r.reason:"")+(r.from?", from "+r.from:""))})+'</div><div>'+lst("Payments failed",d.failed,function(r){return money(r.amount)+(r.reason?", "+esc(r.reason):"")})+
  (d.today_classes.length?'<div style="margin-top:12px"><b>Classes today</b><div class="list">'+d.today_classes.map(function(c){return '<div class="lrow"><span>'+esc(String(c.start||"").slice(0,5))+' '+esc(c.name)+'</span><span class="muted" style="font-size:13px">'+c.booked+' of '+c.max+(c.waitlist?", "+c.waitlist+" waiting":"")+'</span></div>'}).join("")+'</div></div>':"")+'</div></div>';
 if(d.app_requests)h+='<p class="muted" style="margin-top:10px">'+d.app_requests+' request'+(d.app_requests>1?"s":"")+' from the app waiting. <a href="#" data-go="app">See them</a></p>';
 el.innerHTML=h})}
</script></body></html>`;
