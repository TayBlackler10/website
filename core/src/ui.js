// The staff app page served by the M2 Core worker, assembled from small files so one change can't break
// an unrelated page:
//   ui/head.html, ui/styles.css, ui/shell.html (side rail and top bar)
//   ui/views/*.html      one file per page
//   ui/client/*.client.js  the page scripts, one file per page, in load order
// They're joined into one page here. scripts/check.mjs runs before every deploy and refuses to ship if two
// files declare the same top-level name, if any script doesn't parse, or if a page link has no page.
// Order matters: the list below is the order the browser reads them.
import HEAD from "./ui/head.html";
import STYLES from "./ui/styles.css";
import SHELL from "./ui/shell.html";
import V_TODAY from "./ui/views/today.html";
import V_MONEY_ON_THE_TABLE from "./ui/views/money-on-the-table.html";
import V_INSIGHTS from "./ui/views/insights.html";
import V_WHY_M2_CORE from "./ui/views/why-m2-core.html";
import V_MEMBERS from "./ui/views/members.html";
import V_LEADS from "./ui/views/leads.html";
import V_RECENT_VISITS from "./ui/views/recent-visits.html";
import V_POINT_OF_SALE from "./ui/views/point-of-sale.html";
import V_EMAIL_AUTOMATIONS from "./ui/views/email-automations.html";
import V_MEMBERSHIPS_AND_PRICES from "./ui/views/memberships-and-prices.html";
import V_PT_LEADS__OWNERS from "./ui/views/pt-leads-owners.html";
import V_MY_PT_LEADS__TRAINERS from "./ui/views/my-pt-leads-trainers.html";
import V_ROSTER from "./ui/views/roster.html";
import V_KEY_TAG_LOOKUP from "./ui/views/key-tag-lookup.html";
import V_REPORTS from "./ui/views/reports.html";
import V_STAFF from "./ui/views/staff.html";
import V_CLASSES from "./ui/views/classes.html";
import V_MONEY_OWED from "./ui/views/money-owed.html";
import V_BILLING from "./ui/views/billing.html";
import V_MONEY from "./ui/views/money.html";
import V_GROWTH from "./ui/views/growth.html";
import V_MARKETING from "./ui/views/marketing.html";
import V_SETTINGS from "./ui/views/settings.html";
import V_M2_APP from "./ui/views/m2-app.html";
import V_IMPORT from "./ui/views/import.html";
import V_FITNESS_PASSPORT from "./ui/views/fitness-passport.html";
import V_ADD_MEMBER from "./ui/views/add-member.html";
import AFTER_MAIN from "./ui/after-main.html";
import C00 from "./ui/client/00-helpers.client.js";
import C01 from "./ui/client/01-start.client.js";
import C02 from "./ui/client/02-today.client.js";
import C03 from "./ui/client/03-members.client.js";
import C04 from "./ui/client/04-leads.client.js";
import C05 from "./ui/client/05-point-of-sale.client.js";
import C06 from "./ui/client/06-email-automations.client.js";
import C07 from "./ui/client/07-memberships-and-prices.client.js";
import C08 from "./ui/client/08-phone-notifications.client.js";
import C09 from "./ui/client/09-pt-leads-owners.client.js";
import C10 from "./ui/client/10-my-pt-leads-trainers.client.js";
import C11 from "./ui/client/11-key-tag-lookup.client.js";
import C12 from "./ui/client/12-camera.client.js";
import C13 from "./ui/client/13-reports.client.js";
import C14 from "./ui/client/14-charts.client.js";
import C15 from "./ui/client/15-classes.client.js";
import C16 from "./ui/client/16-live-member-panel.client.js";
import C17 from "./ui/client/17-money-owed.client.js";
import C18 from "./ui/client/18-billing.client.js";
import C19 from "./ui/client/19-money-owners.client.js";
import C20 from "./ui/client/20-growth-owners.client.js";
import C21 from "./ui/client/21-marketing-owners.client.js";
import C22 from "./ui/client/22-roster.client.js";
import C23 from "./ui/client/23-settings.client.js";
import C24 from "./ui/client/24-staff-and-access.client.js";
import C25 from "./ui/client/25-import-from-gymmaster.client.js";
import C26 from "./ui/client/26-fitness-passport.client.js";
import C27 from "./ui/client/27-add-member.client.js";
import C28 from "./ui/client/28-m2-app.client.js";
import C29 from "./ui/client/29-owners-yesterday-at-a-glance.client.js";
import C30 from "./ui/client/30-today-club-os-layout.client.js";
import C31 from "./ui/client/31-money-on-the-table.client.js";
import C32 from "./ui/client/32-ask-m2.client.js";
import C33 from "./ui/client/33-insights.client.js";
import C34 from "./ui/client/34-why-m2-core.client.js";
import C35 from "./ui/client/35-weekly-timetable-owned-by-the-core.client.js";
import C36 from "./ui/client/36-recent-visits.client.js";
import TAIL from "./ui/tail.html";

export const PARTS = [
  ["ui/head.html", HEAD],
  ["ui/styles.css", STYLES],
  ["ui/shell.html", SHELL],
  ["ui/views/today.html", V_TODAY],
  ["ui/views/money-on-the-table.html", V_MONEY_ON_THE_TABLE],
  ["ui/views/insights.html", V_INSIGHTS],
  ["ui/views/why-m2-core.html", V_WHY_M2_CORE],
  ["ui/views/members.html", V_MEMBERS],
  ["ui/views/leads.html", V_LEADS],
  ["ui/views/recent-visits.html", V_RECENT_VISITS],
  ["ui/views/point-of-sale.html", V_POINT_OF_SALE],
  ["ui/views/email-automations.html", V_EMAIL_AUTOMATIONS],
  ["ui/views/memberships-and-prices.html", V_MEMBERSHIPS_AND_PRICES],
  ["ui/views/pt-leads-owners.html", V_PT_LEADS__OWNERS],
  ["ui/views/my-pt-leads-trainers.html", V_MY_PT_LEADS__TRAINERS],
  ["ui/views/roster.html", V_ROSTER],
  ["ui/views/key-tag-lookup.html", V_KEY_TAG_LOOKUP],
  ["ui/views/reports.html", V_REPORTS],
  ["ui/views/staff.html", V_STAFF],
  ["ui/views/classes.html", V_CLASSES],
  ["ui/views/money-owed.html", V_MONEY_OWED],
  ["ui/views/billing.html", V_BILLING],
  ["ui/views/money.html", V_MONEY],
  ["ui/views/growth.html", V_GROWTH],
  ["ui/views/marketing.html", V_MARKETING],
  ["ui/views/settings.html", V_SETTINGS],
  ["ui/views/m2-app.html", V_M2_APP],
  ["ui/views/import.html", V_IMPORT],
  ["ui/views/fitness-passport.html", V_FITNESS_PASSPORT],
  ["ui/views/add-member.html", V_ADD_MEMBER],
  ["ui/after-main.html", AFTER_MAIN],
  ["ui/client/00-helpers.client.js", C00],
  ["ui/client/01-start.client.js", C01],
  ["ui/client/02-today.client.js", C02],
  ["ui/client/03-members.client.js", C03],
  ["ui/client/04-leads.client.js", C04],
  ["ui/client/05-point-of-sale.client.js", C05],
  ["ui/client/06-email-automations.client.js", C06],
  ["ui/client/07-memberships-and-prices.client.js", C07],
  ["ui/client/08-phone-notifications.client.js", C08],
  ["ui/client/09-pt-leads-owners.client.js", C09],
  ["ui/client/10-my-pt-leads-trainers.client.js", C10],
  ["ui/client/11-key-tag-lookup.client.js", C11],
  ["ui/client/12-camera.client.js", C12],
  ["ui/client/13-reports.client.js", C13],
  ["ui/client/14-charts.client.js", C14],
  ["ui/client/15-classes.client.js", C15],
  ["ui/client/16-live-member-panel.client.js", C16],
  ["ui/client/17-money-owed.client.js", C17],
  ["ui/client/18-billing.client.js", C18],
  ["ui/client/19-money-owners.client.js", C19],
  ["ui/client/20-growth-owners.client.js", C20],
  ["ui/client/21-marketing-owners.client.js", C21],
  ["ui/client/22-roster.client.js", C22],
  ["ui/client/23-settings.client.js", C23],
  ["ui/client/24-staff-and-access.client.js", C24],
  ["ui/client/25-import-from-gymmaster.client.js", C25],
  ["ui/client/26-fitness-passport.client.js", C26],
  ["ui/client/27-add-member.client.js", C27],
  ["ui/client/28-m2-app.client.js", C28],
  ["ui/client/29-owners-yesterday-at-a-glance.client.js", C29],
  ["ui/client/30-today-club-os-layout.client.js", C30],
  ["ui/client/31-money-on-the-table.client.js", C31],
  ["ui/client/32-ask-m2.client.js", C32],
  ["ui/client/33-insights.client.js", C33],
  ["ui/client/34-why-m2-core.client.js", C34],
  ["ui/client/35-weekly-timetable-owned-by-the-core.client.js", C35],
  ["ui/client/36-recent-visits.client.js", C36],
  ["ui/tail.html", TAIL]
];
export const APP_HTML = PARTS.map(p => p[1]).join("");
