import { NO_ANSWER } from "@/lib/callAction";
import { REJECT_REASON_LABELS } from "@/lib/utils";

export type Lang = "en" | "tl";

type Entry = { en: string; tl: string };

/**
 * Every interface string the EN/TL switch covers, English and Tagalog side by
 * side so a missing translation is visible in review rather than at runtime.
 *
 * The English column is the console's existing copy, unchanged. Where the
 * English screen already carried a short Tagalog hint beside a term (the
 * mockups' bilingual labels, Ch. 3 §3.7.3), the hint stays in the English
 * string; the Tagalog string doesn't repeat it.
 *
 * The Tagalog column was reviewed on 2026-09-29 — change wording here, never
 * in a component.
 *
 * Deliberately not in this file, so they stay as they are in both languages:
 * - Anything a resident wrote (descriptions, their answers in the drawer).
 *   Translating a report would put words in the reporter's mouth.
 * - Values formatted from report data: category names, priority tiers (the
 *   model's class names), relative times like [5m ago] (worked out in the
 *   browser by timeAgo, still English), review timestamps, and error messages
 *   returned by server actions.
 * - The CSV export, which other offices read.
 * - Screens outside a gated page: sign-in, not-authorized, error pages, and
 *   the toast container's own dismiss label.
 *
 * `{name}` placeholders are filled by translate() in src/lib/i18n.tsx.
 */
export const MESSAGES = {
  // --- Shell: sidebar, top bar, account menu --------------------------------
  "shell.consoleName": { en: "Barangay console", tl: "Console ng Barangay" },
  "shell.openMenu": { en: "Open navigation menu", tl: "Buksan ang menu ng nabigasyon" },
  "shell.closeMenu": { en: "Close navigation", tl: "Isara ang nabigasyon" },
  "shell.breadcrumb": { en: "Breadcrumb", tl: "Kinaroroonan sa console" },
  "shell.accountMenu": { en: "Account menu for {name}", tl: "Menu ng account ni {name}" },
  "shell.signOut": { en: "Sign out", tl: "Mag-sign out" },
  "shell.language": { en: "Interface language", tl: "Wika ng interface" },
  "nav.queue": { en: "Queue", tl: "Pila ng Ulat" },
  "nav.clusterExplorer": { en: "Cluster Explorer", tl: "Mga Kumpol ng Ulat" },
  "nav.validationHistory": { en: "Validation History", tl: "Kasaysayan ng Pag-validate" },
  "nav.auditLog": { en: "Audit Log", tl: "Talaan ng Audit" },
  "nav.reports": { en: "Reports", tl: "Mga Buod" },
  "nav.settings": { en: "Settings", tl: "Mga Setting" },
  "nav.records": { en: "Records", tl: "Mga Rekord" },
  "nav.account": { en: "Account", tl: "Account" },
  "role.barangay_official": { en: "Brgy. Official", tl: "Opisyal ng Brgy." },
  "role.barangay_admin": { en: "Brgy. Admin", tl: "Admin ng Brgy." },
  "role.senior_barangay_admin": { en: "Senior Brgy. Admin", tl: "Senior Admin ng Brgy." },

  // --- Shared ---------------------------------------------------------------
  "common.cancel": { en: "Cancel", tl: "Kanselahin" },
  "common.close": { en: "Close", tl: "Isara" },
  "common.save": { en: "Save", tl: "I-save" },
  "common.working": { en: "Working…", tl: "Pinoproseso…" },
  "common.saving": { en: "Saving…", tl: "Sine-save…" },
  "common.noAnswer": {
    en: NO_ANSWER,
    tl: "Hindi makumpirma kung natuloy iyon. Tingnan muna ang pila bago subukang muli.",
  },
  "reporter.verified": { en: "Verified reporter", tl: "Beripikadong nag-ulat" },
  "reporter.withheld": {
    en: "Verified reporter, identity withheld",
    tl: "Beripikadong nag-ulat, nakatago ang pagkakakilanlan",
  },
  "priority.unscored": { en: "Not scored", tl: "Wala pang iskor" },
  "field.reporter": { en: "Reporter", tl: "Nag-ulat" },
  "field.timestamp": { en: "Timestamp", tl: "Oras" },
  "status.pending_priority": { en: "Pending", tl: "Nakabinbin" },
  "status.prioritized": { en: "Prioritized", tl: "Na-prioritize" },
  "status.validated": { en: "Validated", tl: "Na-validate" },
  "status.rejected": { en: "Rejected", tl: "Tinanggihan" },
  "status.routed": { en: "Routed to agency", tl: "Naipasa sa ahensya" },
  "status.resolved": { en: "Resolved", tl: "Nalutas" },
  "banner.title": { en: "{what} couldn't load.", tl: "Hindi na-load ang {what}." },
  "banner.body": {
    en:
      "Nothing below is current. Refresh the page; if it keeps happening, sign out and back " +
      "in, then tell the pilot support desk. · Hindi na-load ang datos. I-refresh ang page.",
    tl:
      "Hindi napapanahon ang anumang nasa ibaba. I-refresh ang page; kung patuloy itong " +
      "mangyari, mag-sign out at mag-sign in muli, saka ipaalam sa pilot support desk.",
  },
  "banner.what.queue": { en: "The queue", tl: "pila" },
  "banner.what.history": { en: "Validation History", tl: "Kasaysayan ng Pag-validate" },
  "banner.what.clusters": { en: "Cluster Explorer", tl: "Mga Kumpol ng Ulat" },
  "banner.what.reports": { en: "The daily summary", tl: "buod ng araw" },
  "banner.what.audit": { en: "The audit log", tl: "talaan ng audit" },

  // --- Queue page -----------------------------------------------------------
  "queue.tabsLabel": { en: "Queue sections", tl: "Mga seksyon ng pila" },
  "queue.tab.emergency": { en: "Emergency Fast-triage", tl: "Emergency (Mabilisang Triage)" },
  "queue.tab.standard": { en: "Standard intake", tl: "Karaniwang Ulat" },
  "queue.tab.duplicates": { en: "Flagged duplicates", tl: "Posibleng Doble" },
  "queue.tab.validated": { en: "Recent validated", tl: "Kamakailang Na-validate" },
  "queue.kpi.fastTriage": { en: "Fast-triage", tl: "Mabilisang triage" },
  "queue.kpi.standard": { en: "Standard intake", tl: "Karaniwang ulat" },
  "queue.kpi.medianWait": { en: "Median wait", tl: "Median na paghihintay" },
  "queue.kpi.validatedToday": { en: "Validated today", tl: "Na-validate ngayon" },
  "queue.validateNext": { en: "Validate next", tl: "I-validate ang susunod" },
  "queue.nothingToValidate": {
    en: "Nothing left in this tab to validate",
    tl: "Wala nang ive-validate sa tab na ito",
  },
  "queue.searchPlaceholder": {
    en: "Search report ID, category, description…",
    tl: "Hanapin ang ID, kategorya, o paglalarawan…",
  },
  "queue.searchLabel": {
    en: "Search this tab by report ID, category, or description",
    tl: "Maghanap sa tab na ito ayon sa ID ng ulat, kategorya, o paglalarawan",
  },
  "queue.partialLoad": {
    en: "Part of this tab couldn’t be loaded, so it may be incomplete. Refresh to try again.",
    tl: "Hindi na-load ang bahagi ng tab na ito, kaya maaaring kulang ito. I-refresh para subukang muli.",
  },
  "queue.noMatch": {
    en: "No reports in this tab match “{query}”.",
    tl: "Walang ulat sa tab na ito na tumutugma sa “{query}”.",
  },
  "queue.loadFailedEmpty": {
    en: "Reports couldn’t be loaded — see the notice above.",
    tl: "Hindi na-load ang mga ulat — tingnan ang abiso sa itaas.",
  },
  "queue.empty": { en: "No reports in this queue right now.", tl: "Walang ulat sa pilang ito ngayon." },
  "queue.group.awaitingRouting": { en: "Awaiting routing", tl: "Naghihintay maipasa" },
  "queue.group.routed": { en: "Routed to agencies", tl: "Naipasa na sa mga ahensya" },
  "queue.footer.count": { en: "Showing {count} reports", tl: "Ipinapakita ang {count} ulat" },
  "queue.footer.countOne": { en: "Showing 1 report", tl: "Ipinapakita ang 1 ulat" },
  "queue.footer.filtered": {
    en: "Showing {shown} of {total} reports in this tab",
    tl: "Ipinapakita ang {shown} sa {total} ulat sa tab na ito",
  },
  "queue.footer.filteredOne": {
    en: "Showing {shown} of 1 report in this tab",
    tl: "Ipinapakita ang {shown} sa 1 ulat sa tab na ito",
  },
  "queue.footer.ranked": {
    en: "Ranked by priority score, then longest waiting",
    tl: "Nakaayos ayon sa iskor ng priyoridad, saka sa pinakamatagal nang naghihintay",
  },
  "queue.footer.live": {
    en: "Live — updates as reports change",
    tl: "Live — nag-a-update habang nagbabago ang mga ulat",
  },
  "queue.footer.polling": {
    en: "Live updates unavailable — refreshes every {seconds} s",
    tl: "Walang live update — nagre-refresh bawat {seconds} segundo",
  },
  "queue.footer.connecting": { en: "Connecting to live updates…", tl: "Kumokonekta sa live update…" },
  "queue.footer.dataAsOf": { en: "Data as of {time}", tl: "Datos noong {time}" },
  "queue.footer.soundLocked": {
    en: "Click anywhere on the page to allow the alert sound",
    tl: "Mag-click kahit saan sa page para payagan ang tunog ng alerto",
  },
  "queue.footer.updateWaiting": {
    en: "Update waiting — it appears when you’re done here",
    tl: "May naghihintay na update — lalabas ito kapag tapos ka na rito",
  },
  "queue.dup.title": {
    en: "Duplicate flagging isn't connected yet",
    tl: "Hindi pa nakakonekta ang pag-flag ng doble",
  },
  "queue.dup.body": {
    en:
      "Reports aren't being grouped into duplicates yet, so this tab stays empty — that " +
      "doesn't mean none of today's reports are duplicates. Review each report in the " +
      "Emergency tab. When grouping is on, only reports with a location, from the same " +
      "barangay and filed within 72 hours of each other, can be grouped. · Hindi pa " +
      "nakakonekta ang pag-flag ng duplicate.",
    tl:
      "Hindi pa pinagsasama-sama ang mga ulat bilang doble, kaya walang laman ang tab na ito — " +
      "hindi ibig sabihin nito na walang dobleng ulat ngayong araw. Suriin ang bawat ulat sa " +
      "tab na Emergency. Kapag bukas na ang pagsasama-sama, ang mga ulat lang na may " +
      "lokasyon, mula sa iisang barangay, at naipadala sa loob ng 72 oras ng isa't isa ang " +
      "maaaring pagsamahin.",
  },
  // Shown instead of the two above once DUPLICATE_WRITEBACK_LIVE is on.
  "queue.dup.titleLive": {
    en: "No flagged duplicates right now",
    tl: "Walang naka-flag na doble sa ngayon",
  },
  "queue.dup.bodyLive": {
    en:
      "Pending reports the system judges to be the same incident show here, so they can be " +
      "reviewed together. It compares reports from the same barangay filed within 72 hours " +
      "of each other, weighing how close they are in place and time and their category, so " +
      "reports in different categories can still be grouped.",
    tl:
      "Lumalabas dito ang mga nakabinbing ulat na itinuring ng sistema na iisang insidente, " +
      "para masuri nang sabay. Pinaghahambing nito ang mga ulat mula sa iisang barangay na " +
      "naipadala sa loob ng 72 oras ng isa't isa, ayon sa lapit ng lugar at oras at sa " +
      "kategorya, kaya maaaring mapagsama ang mga ulat na magkaiba ang kategorya.",
  },
  "queue.sla.title": {
    en: "Tier 0 report past its 5-minute window",
    tl: "Lumampas na sa 5 minuto ang isang Tier 0 na ulat",
  },
  "queue.sla.discreet": {
    en: "Details hidden — discreet report. Open the queue.",
    tl: "Nakatago ang detalye — discreet na ulat. Buksan ang pila.",
  },
  "queue.sla.toast": {
    en: "A Tier 0 report is past its 5-minute window",
    tl: "May Tier 0 na ulat na lumampas na sa 5 minuto",
  },

  // --- Report row, review, routing ------------------------------------------
  "row.new": { en: "New", tl: "Bago" },
  "row.discreet": { en: "Discreet", tl: "Discreet" },
  "row.viewDetails": { en: "View details for {id}", tl: "Tingnan ang detalye ng {id}" },
  "row.resolvedValidated": {
    en: "Validated — route it from Recent validated",
    tl: "Na-validate — ipasa ito mula sa Kamakailang Na-validate",
  },
  "row.routingIncomplete": { en: "Routing incomplete", tl: "Hindi pa buo ang pagpasa" },
  "row.noMapping": {
    en: "No agency mapped — needs barangay review",
    tl: "Walang nakatalagang ahensya — kailangang suriin ng barangay",
  },
  "row.routingUnavailable": {
    en: "Couldn't load routing options — refresh",
    tl: "Hindi na-load ang mga opsyon sa pagpasa — i-refresh",
  },
  "row.returned": {
    en: "Returned by {agency}{more} — out of scope",
    tl: "Ibinalik ng {agency}{more} — labas sa saklaw",
  },
  "row.returnedChip": { en: "Returned by agencies", tl: "Ibinalik ng mga ahensya" },
  "row.autoRouted": { en: "Auto-routed", tl: "Awtomatikong naipasa" },
  "row.alreadyResolved": { en: "Already resolved, review", tl: "Naayos na raw, suriin" },
  "row.alreadyResolvedTitle": {
    en: "The reporter said it already resolved. Check before acting on it.",
    tl: "Sinabi ng nag-ulat na naayos na ito. Suriin muna bago kumilos.",
  },
  "row.returnedUnavailable": {
    en: "Couldn't load the agency list — refresh",
    tl: "Hindi na-load ang listahan ng ahensya — i-refresh",
  },
  "review.validate": { en: "Validate", tl: "I-validate" },
  "review.reject": { en: "Reject", tl: "Tanggihan" },
  "review.rejectTitle": { en: "Reject {id}?", tl: "Tanggihan ang {id}?" },
  "review.rejectDescription": {
    en: "Choose a reason. It's recorded on the report and shown to your barangay's desk.",
    tl: "Pumili ng dahilan. Itinatala ito sa ulat at makikita ng desk ng inyong barangay.",
  },
  "review.rejectConfirm": { en: "Reject report", tl: "Tanggihan ang ulat" },
  "review.validatedToast": {
    en: "{id} validated — not sent to any agency yet. It's under Recent validated.",
    tl: "Na-validate ang {id} — hindi pa naipapasa sa anumang ahensya. Nasa Kamakailang Na-validate ito.",
  },
  "review.rejectedToast": {
    en: "{id} rejected — moved to Validation History",
    tl: "Tinanggihan ang {id} — inilipat sa Kasaysayan ng Pag-validate",
  },
  "review.failed": { en: "Failed to update report", tl: "Hindi na-update ang ulat" },
  "reason.label": { en: "Reason", tl: "Dahilan" },
  "reason.placeholder": {
    en: "e.g. Same incident as the report filed at 10:42",
    tl: "hal. Parehong insidente ng ulat na naisumite nang 10:42",
  },
  "reason.note": { en: "Note", tl: "Tala" },
  "reason.noteOptional": { en: "optional", tl: "opsyonal" },
  "reason.noteRequired": { en: "required for Other", tl: "kailangan para sa Iba pa" },
  // English names come from REJECT_REASON_LABELS, which the CSV also uses.
  "rejectReason.wrong_category": { en: REJECT_REASON_LABELS.wrong_category, tl: "Maling kategorya" },
  "rejectReason.already_resolved": { en: REJECT_REASON_LABELS.already_resolved, tl: "Naayos na" },
  "rejectReason.mistaken_identity": { en: REJECT_REASON_LABELS.mistaken_identity, tl: "Maling pagkakakilanlan" },
  "rejectReason.not_an_emergency": { en: REJECT_REASON_LABELS.not_an_emergency, tl: "Hindi emergency" },
  "rejectReason.duplicate": { en: REJECT_REASON_LABELS.duplicate, tl: "Doble" },
  "rejectReason.other": { en: REJECT_REASON_LABELS.other, tl: "Iba pa" },
  "routing.routeToAgency": { en: "Route to agency", tl: "Ipasa sa ahensya" },
  "routing.finish": { en: "Finish routing", tl: "Tapusin ang pagpasa" },
  "routing.routeElsewhere": { en: "Route to another agency", tl: "Ipasa sa ibang ahensya" },
  "routing.lead": { en: "(lead)", tl: "(pangunahin)" },
  "routing.agencyCountOne": { en: "1 agency", tl: "1 ahensya" },
  "routing.agencyCount": { en: "{count} agencies", tl: "{count} ahensya" },
  "routing.outcome.resolved": { en: "resolved", tl: "nalutas" },
  "routing.outcome.confirmed-false": { en: "confirmed false", tl: "kumpirmadong hindi totoo" },
  "routing.outcome.duplicate": { en: "duplicate", tl: "doble" },
  "routing.outcome.out-of-scope": { en: "out of scope", tl: "labas sa saklaw" },
  "routing.progress.closed": { en: "Closed — {outcome}", tl: "Isinara — {outcome}" },
  "routing.progress.acknowledged": { en: "Acknowledged", tl: "Kinilala na" },
  "routing.progress.inProgress": { en: "In progress", tl: "Inaasikaso na" },
  "routing.progress.awaiting": { en: "Awaiting acknowledgement", tl: "Naghihintay ng pagkilala" },
  "routing.summary.closedBy": {
    en: "Closed by {agency}{more} — {outcome}",
    tl: "Isinara ng {agency}{more} — {outcome}",
  },
  "routing.summary.resolvedBy": { en: "Resolved by {agency}{more}", tl: "Nalutas ng {agency}{more}" },
  "routing.summary.inProgressAt": {
    en: "In progress at {agency}{more}",
    tl: "Inaasikaso ng {agency}{more}",
  },
  "routing.summary.acknowledgedBy": {
    en: "Acknowledged by {agency}{more}",
    tl: "Kinilala ng {agency}{more}",
  },
  "routing.summary.returned": {
    en: "Returned by {agency}{more} — out of scope · handle it at the barangay",
    tl: "Ibinalik ng {agency}{more} — labas sa saklaw · asikasuhin sa barangay",
  },
  "routing.summary.resolvedOpen": {
    en: "Resolved by {agency} · {agencies} still open",
    tl: "Nalutas ng {agency} · {agencies} pa ang humahawak",
  },
  "routing.summary.returnedOpen": {
    en: "Returned by {agency} — out of scope · {agencies} still open",
    tl: "Ibinalik ng {agency} — labas sa saklaw · {agencies} pa ang humahawak",
  },
  "routing.summary.routedTo": {
    en: "Routed to {agency}{more} · awaiting acknowledgement",
    tl: "Naipasa sa {agency}{more} · naghihintay ng pagkilala",
  },
  "routing.finishTitle": { en: "Finish routing {id}?", tl: "Tapusin ang pagpasa ng {id}?" },
  "routing.finishDescription": {
    en:
      "A previous attempt sent this report to some agencies but didn't complete. " +
      "Finishing sends it to any agencies still missing and records the routing. " +
      "Agencies that already have it won't receive it twice.",
    tl:
      "Naipasa na ang ulat na ito sa ilang ahensya sa naunang pagtatangka, pero hindi ito " +
      "natapos. Ipapasa ito sa mga ahensyang wala pa nito at itatala ang pagpasa. Hindi na " +
      "ito matatanggap nang dalawang beses ng mga ahensyang mayroon na nito.",
  },
  "routing.routeTitle": { en: "Route {id} to {agencies}?", tl: "Ipasa ang {id} sa {agencies}?" },
  "routing.routeDescription": {
    en: "{names} will see it on their dashboards immediately. Routing can't be undone from this console.",
    tl: "Makikita agad ito ng {names} sa kanilang dashboard. Hindi na ito mababawi mula sa console na ito.",
  },
  "routing.mappedAgencies": { en: "The mapped agencies", tl: "mga nakatalagang ahensya" },
  "routing.discreetNote": {
    en: "The reporter asked for discreet reporting.",
    tl: "Humiling ang nag-ulat ng discreet na pag-uulat.",
  },
  "routing.routeConfirm": { en: "Route to {agencies}", tl: "Ipasa sa {agencies}" },
  "routing.routedToast": { en: "{id} routed to {agencies}", tl: "Naipasa ang {id} sa {agencies}" },
  "routing.failed": { en: "Couldn't route this report", tl: "Hindi naipasa ang ulat na ito" },
  "reroute.title": { en: "Route {id} to another agency", tl: "Ipasa ang {id} sa ibang ahensya" },
  "reroute.description": {
    en:
      "{names} sent it back as out of scope. Choose who should handle it instead. " +
      "Routing can't be undone from this console.",
    tl:
      "Ibinalik ito ng {names} bilang labas sa saklaw. Piliin kung sino ang hahawak nito. " +
      "Hindi na ito mababawi mula sa console na ito.",
  },
  "reroute.legend": { en: "Agencies", tl: "Mga ahensya" },
  "reroute.leadHint": {
    en: "The first agency you choose leads. Agencies that already had this report aren't listed.",
    tl: "Ang unang ahensyang pipiliin mo ang mangunguna. Hindi nakalista ang mga ahensyang nagkaroon na ng ulat na ito.",
  },
  "reroute.chooseFirst": { en: "Choose an agency", tl: "Pumili ng ahensya" },

  // --- Report detail drawer -------------------------------------------------
  "drawer.close": { en: "Close report details", tl: "Isara ang detalye ng ulat" },
  "drawer.tier.emergency": { en: "Emergency fast-triage", tl: "Emergency (mabilisang triage)" },
  "drawer.tier.other_reports": { en: "Standard intake", tl: "Karaniwang ulat" },
  "drawer.discreetBanner": {
    en: "Discreet report: do not call or text the reporter.",
    tl: "Discreet na ulat: huwag tawagan o i-text ang nag-ulat.",
  },
  "drawer.noDescription": { en: "No description provided.", tl: "Walang ibinigay na paglalarawan." },
  "drawer.notProvided": { en: "Not provided", tl: "Hindi ibinigay" },
  "drawer.section.reporterSaid": { en: "What the reporter said", tl: "Sinabi ng nag-ulat" },
  "drawer.severity": { en: "Severity (self-rated)", tl: "Kalubhaan (ayon sa nag-ulat)" },
  "drawer.anyoneHurt": { en: "Anyone hurt", tl: "May nasaktan ba" },
  "drawer.ongoing": { en: "Still ongoing", tl: "Nagpapatuloy pa" },
  "drawer.yes": { en: "Yes", tl: "Oo" },
  "drawer.no": { en: "No", tl: "Hindi" },
  "drawer.safetyNet": { en: "Safety-net confirmation", tl: "Kumpirmasyon ng safety net" },
  "drawer.attachments": { en: "Attachments", tl: "Mga kalakip" },
  "drawer.attach.both": { en: "Photo and video", tl: "Larawan at video" },
  "drawer.attach.photo": { en: "Photo", tl: "Larawan" },
  "drawer.attach.video": { en: "Video", tl: "Video" },
  "drawer.attach.none": { en: "No photo or video", tl: "Walang larawan o video" },
  "drawer.section.triage": { en: "Triage", tl: "Triage" },
  "drawer.priority": { en: "Priority", tl: "Priyoridad" },
  "drawer.subCategory": { en: "Sub-category", tl: "Sub-kategorya" },
  "drawer.notScoredYet": { en: "Not scored yet", tl: "Wala pang iskor" },
  "drawer.score": { en: "{priority} · score {score}", tl: "{priority} · iskor {score}" },
  "drawer.confidence": { en: "Confidence", tl: "Kumpiyansa" },
  "drawer.status": { en: "Status", tl: "Katayuan" },
  "drawer.cluster": { en: "Duplicate cluster", tl: "Kumpol ng doble" },
  "drawer.section.submission": { en: "Submission", tl: "Pagsumite" },
  "drawer.submitted": { en: "Submitted", tl: "Isinumite" },
  "drawer.section.routing": { en: "Agency routing", tl: "Pagpasa sa ahensya" },
  "drawer.plan.willRoute": { en: "Will route to", tl: "Ipapasa sa" },
  "drawer.preview.willRoute": {
    en: "After validation, routing sends it to",
    tl: "Pagkatapos ma-validate, ipapasa ito sa",
  },
  "drawer.preview.noMapping": {
    en: "No agency is mapped to this category — after validation it stays with the barangay.",
    tl: "Walang ahensyang nakatalaga sa kategoryang ito — pagkatapos ma-validate, mananatili ito sa barangay.",
  },
  "drawer.plan.finishing": {
    en: "Finishing sends it to all of",
    tl: "Kapag tinapos, ipapasa ito sa lahat ng sumusunod",
  },
  "drawer.returned": {
    en: "Every agency it was routed to sent it back as out of scope. Choose another agency, or handle it at the barangay.",
    tl: "Ibinalik ito ng lahat ng ahensyang pinagpasahan bilang labas sa saklaw. Pumili ng ibang ahensya, o asikasuhin ito sa barangay.",
  },
  "drawer.returnedEarlier": { en: "Returned earlier", tl: "Ibinalik noon" },
  "drawer.autoRouted": {
    en: "Routed automatically, without a review here.",
    tl: "Awtomatikong naipasa, nang walang pagsusuri dito.",
  },
  "drawer.returnedPending": {
    en: "Every agency it was routed to sent it back as out of scope, so it needs a review here. After validation, choose another agency for it.",
    tl: "Ibinalik ito ng lahat ng ahensyang pinagpasahan bilang labas sa saklaw, kaya kailangan itong suriin dito. Pagkatapos ma-validate, pumili ng ibang ahensya para rito.",
  },
  "drawer.incomplete": {
    en: "A routing attempt stopped part-way. These agencies already have it:",
    tl: "Huminto sa kalagitnaan ang isang pagtatangkang ipasa ito. Mayroon na nito ang mga ahensyang ito:",
  },
  "drawer.noMapping": {
    en: "No agency is mapped to this category, so it can't be routed from here. It needs barangay review.",
    tl: "Walang ahensyang nakatalaga sa kategoryang ito, kaya hindi ito maipapasa mula rito. Kailangan itong suriin ng barangay.",
  },
  "drawer.unavailable": {
    en: "Routing options couldn't be loaded. Refresh the page to try again.",
    tl: "Hindi na-load ang mga opsyon sa pagpasa. I-refresh ang page para subukang muli.",
  },
  "drawer.downstreamMissing": {
    en: "Routed, but the agency details couldn't be loaded. Refresh to try again.",
    tl: "Naipasa na, pero hindi na-load ang detalye ng ahensya. I-refresh para subukang muli.",
  },
  "drawer.footer.noMapping": {
    en: "No agency is mapped to this category — handle it at the barangay.",
    tl: "Walang ahensyang nakatalaga sa kategoryang ito — asikasuhin ito sa barangay.",
  },
  "drawer.footer.unavailable": {
    en: "Couldn't load routing options. Refresh to try again.",
    tl: "Hindi na-load ang mga opsyon sa pagpasa. I-refresh para subukang muli.",
  },
  "drawer.footer.downstream": {
    en: "With the agencies now — they update its progress, not this desk.",
    tl: "Nasa mga ahensya na ito — sila ang nag-a-update ng progreso, hindi ang desk na ito.",
  },
  "drawer.footer.returned": {
    en: "Returned by the agencies as out of scope — handle it at the barangay. This report can't be sent to another agency from here.",
    tl: "Ibinalik ng mga ahensya bilang labas sa saklaw — asikasuhin ito sa barangay. Hindi maipapasa ang ulat na ito sa ibang ahensya mula rito.",
  },
  "drawer.footer.optionsUnavailable": {
    en: "Couldn't load the agency list. Refresh to try again.",
    tl: "Hindi na-load ang listahan ng ahensya. I-refresh para subukang muli.",
  },
  "drawer.footer.noOtherAgency": {
    en: "Every agency has already had this report — handle it at the barangay.",
    tl: "Nagkaroon na ng ulat na ito ang lahat ng ahensya — asikasuhin ito sa barangay.",
  },
  "drawer.footer.reviewed": {
    en: "Already reviewed — no further action available here.",
    tl: "Nasuri na — wala nang ibang magagawa rito.",
  },
  "drawer.stage.closed": { en: "closed {time}", tl: "isinara {time}" },
  "drawer.stage.acknowledged": { en: "acknowledged {time}", tl: "kinilala {time}" },
  "drawer.stage.inProgress": { en: "in progress since {time}", tl: "inaasikaso mula {time}" },
  "drawer.stage.routed": { en: "routed {time}", tl: "naipasa {time}" },
  "drawer.sessionExpired": {
    en: "Your session expired. Sign in again.",
    tl: "Nag-expire ang iyong session. Mag-sign in muli.",
  },
  "drawer.notLogged": {
    en: "Opening this report wasn't recorded in the access log. Tell the pilot support desk.",
    tl: "Hindi naitala sa access log ang pagbukas mo sa ulat na ito. Ipaalam sa pilot support desk.",
  },

  // --- Validation History ---------------------------------------------------
  "history.tile.total": { en: "Total", tl: "Kabuuan" },
  "history.tile.confirmed": { en: "Confirmed", tl: "Kumpirmado" },
  "history.tile.rejected": { en: "Rejected", tl: "Tinanggihan" },
  "history.tile.withheld": { en: "Identity withheld", tl: "Nakatagong pagkakakilanlan" },
  "history.range.today": { en: "Today", tl: "Ngayong araw" },
  "history.range.7d": { en: "Last 7d", tl: "Nakaraang 7 araw" },
  "history.range.all": { en: "All time", tl: "Lahat" },
  "history.outcome.all": { en: "All outcomes", tl: "Lahat ng resulta" },
  "history.outcome.Confirmed": { en: "Confirmed", tl: "Kumpirmado" },
  "history.outcome.Rejected": { en: "Rejected", tl: "Tinanggihan" },
  "history.filterOutcome": { en: "Filter by outcome", tl: "Salain ayon sa resulta" },
  "history.filterOfficial": {
    en: "Filter by validating official",
    tl: "Salain ayon sa opisyal na nag-validate",
  },
  "history.allOfficials": { en: "All officials", tl: "Lahat ng opisyal" },
  "history.export": { en: "Export CSV", tl: "I-export ang CSV" },
  "history.exportNothing": {
    en: "Nothing to export with these filters",
    tl: "Walang mai-e-export sa mga filter na ito",
  },
  "history.exported": { en: "Exported {count} records as CSV", tl: "Na-export ang {count} rekord bilang CSV" },
  "history.empty.filteredTitle": {
    en: "No records match these filters",
    tl: "Walang rekord na tumutugma sa mga filter na ito",
  },
  "history.empty.filteredBody": {
    en: "Try a wider date range, or clear the outcome and official filters.",
    tl: "Subukan ang mas malawak na petsa, o alisin ang filter ng resulta at opisyal.",
  },
  "history.empty.title": { en: "No validation records yet", tl: "Wala pang rekord ng pag-validate" },
  "history.empty.body": {
    en: "Records appear here once reports in your barangay's queue have been confirmed or rejected.",
    tl: "Lalabas dito ang mga rekord kapag nakumpirma o natanggihan na ang mga ulat sa pila ng inyong barangay.",
  },
  "history.caption": {
    en:
      "Reviewed reports: report, category and priority, verdict, validating official, " +
      "reporter, and time reviewed",
    tl:
      "Mga nasuring ulat: ulat, kategorya at priyoridad, pasya, opisyal na nag-validate, " +
      "nag-ulat, at oras ng pagsusuri",
  },
  "history.col.report": { en: "Report", tl: "Ulat" },
  "history.col.categoryPriority": { en: "Category / Priority", tl: "Kategorya / Priyoridad" },
  "history.col.verdict": { en: "Verdict", tl: "Pasya" },
  "history.col.official": { en: "Validating official", tl: "Opisyal na nag-validate" },
  "history.tier.emergency": { en: "Emergency", tl: "Emergency" },
  "history.tier.other_reports": { en: "Standard intake", tl: "Karaniwang ulat" },
  "history.verdict.confirmed": { en: "Confirmed", tl: "Kumpirmado" },
  "history.verdict.rejected": { en: "Rejected", tl: "Tinanggihan" },
  "history.trust": { en: "({delta} trust)", tl: "({delta} tiwala)" },
  "history.footer.filtered": {
    en: "Showing {shown} of {total} loaded records",
    tl: "Ipinapakita ang {shown} sa {total} na-load na rekord",
  },
  "history.footer.all": {
    en: "Showing the {count} most recent reviewed reports for {barangay}",
    tl: "Ipinapakita ang {count} pinakabagong nasuring ulat ng {barangay}",
  },
  "history.footer.allOne": {
    en: "Showing the 1 most recent reviewed report for {barangay}",
    tl: "Ipinapakita ang 1 pinakabagong nasuring ulat ng {barangay}",
  },
  "history.footer.newest": { en: "newest first", tl: "pinakabago muna" },
  "history.footer.capped": {
    en: "capped at the {limit} most recent, so filters apply to those only",
    tl: "hanggang {limit} pinakabago lamang ang na-load, kaya sa mga iyon lang gumagana ang mga filter",
  },

  // --- Reports ----------------------------------------------------------------
  "reports.dailyTitle": { en: "Daily Queue Summary", tl: "Pang-araw-araw na Buod ng Pila" },
  "reports.dailyIntro": {
    en: "Reports submitted on the chosen day, by category, counted by where each one stands now.",
    tl: "Mga ulat na isinumite sa napiling araw, ayon sa kategorya, binilang ayon sa kasalukuyang katayuan ng bawat isa.",
  },
  "reports.date": { en: "Date", tl: "Petsa" },
  "reports.tile.submitted": { en: "Submitted", tl: "Naisumite" },
  "reports.tile.awaiting": { en: "Awaiting review", tl: "Naghihintay ng pagsusuri" },
  "reports.col.category": { en: "Category", tl: "Kategorya" },
  "reports.empty": { en: "No reports were submitted on {date}.", tl: "Walang ulat na naisumite noong {date}." },
  "reports.caption": {
    en: "Reports submitted on {date} by category: submitted, awaiting review, validated, and rejected",
    tl: "Mga ulat na naisumite noong {date} ayon sa kategorya: naisumite, naghihintay ng pagsusuri, na-validate, at tinanggihan",
  },
  "reports.footer": {
    en: "Days and times are Manila. A report submitted that day and decided later counts under its decision.",
    tl: "Araw at oras sa Maynila. Ang ulat na naisumite sa araw na iyon at napagpasyahan kalaunan ay binibilang ayon sa pasya.",
  },
  "reports.capped": {
    en: "Only the first {limit} reports of the day were counted.",
    tl: "Ang unang {limit} ulat lamang ng araw ang nabilang.",
  },
  "reports.exported": { en: "Exported the summary for {date} as CSV", tl: "Na-export ang buod ng {date} bilang CSV" },
  "reports.exportNothing": { en: "Nothing to export for this day", tl: "Walang mai-e-export para sa araw na ito" },
  "reports.weeklyTitle": {
    en: "Weekly False-Report Rate per Reporter",
    tl: "Lingguhang Bilang ng Maling Ulat bawat Nag-ulat",
  },
  "reports.weeklyUnavailable": {
    en:
      "Not available in this console. It counts false reports per reporter, which needs each " +
      "reporter's identity and sanction history — data the barangay desk never reads.",
    tl:
      "Hindi available sa console na ito. Binibilang nito ang maling ulat bawat nag-ulat, kaya " +
      "kailangan nito ang pagkakakilanlan at kasaysayan ng parusa ng bawat isa — datos na hindi " +
      "kailanman binabasa ng desk ng barangay.",
  },

  // --- Cluster Explorer (empty state only; see ClusterExplorerClient) -------
  "cluster.card.inBarangay": { en: "{count} reports in {barangay}", tl: "{count} ulat sa {barangay}" },
  "cluster.card.acrossBarangays": { en: "{count} reports across {barangays} barangays", tl: "{count} ulat mula sa {barangays} barangay" },
  "cluster.card.withheld": { en: "· {count} identity-withheld", tl: "· {count} nakatago ang pagkakakilanlan" },
  "cluster.card.validate": { en: "Validate as one cluster", tl: "I-validate bilang isang kumpol" },
  "cluster.card.done": { en: "— all {count} reports validated. They move to Recent validated.", tl: "— na-validate ang lahat ng {count} ulat. Lilipat ang mga ito sa Kamakailang Na-validate." },
  "cluster.toast.all": { en: "Validated all {count} reports in {id}", tl: "Na-validate ang lahat ng {count} ulat sa {id}" },
  "cluster.toast.partial": { en: "Validated {validated} of {total} — {failed} could not be validated", tl: "Na-validate ang {validated} sa {total} — hindi na-validate ang {failed}" },
  "cluster.toast.failed": { en: "Could not validate this cluster", tl: "Hindi ma-validate ang kumpol na ito" },
  "cluster.confirm.title": { en: "Validate all {count} reports in {id}?", tl: "I-validate ang lahat ng {count} ulat sa {id}?" },
  "cluster.confirm.body": { en: "Each report is validated individually. Any that another official has already reviewed will be skipped and reported back.", tl: "Isa-isang iva-validate ang bawat ulat. Lalaktawan ang anumang nasuri na ng ibang opisyal, at sasabihin kung alin." },
  "cluster.confirm.label": { en: "Validate {count} reports", tl: "I-validate ang {count} ulat" },
  "cluster.list.title": { en: "Clusters · {count}", tl: "Mga kumpol · {count}" },
  "cluster.list.members": { en: "{count} members", tl: "{count} kasapi" },
  "cluster.list.radius": { en: " · {meters}m radius", tl: " · {meters}m radius" },
  "cluster.status.standard": { en: "Standard", tl: "Karaniwan" },
  "cluster.member.title": { en: "{id} · {category}, {count} reports clustered", tl: "{id} · {category}, {count} ulat sa kumpol" },
  "cluster.member.where": { en: "Validate members from the Queue", tl: "I-validate ang mga kasapi mula sa Pila ng Ulat" },
  "cluster.member.primary": { en: "Primary", tl: "Pangunahin" },
  "cluster.member.related": { en: "Related", tl: "Kaugnay" },
  "cluster.signal.visualHash": { en: "Visual hash {value}", tl: "Visual hash {value}" },
  "cluster.signal.temporal": { en: "Temporal Δ {minutes}m {seconds}s", tl: "Agwat sa oras {minutes}m {seconds}s" },
  "cluster.signal.sitio": { en: "{sitio} radius", tl: "Radius ng {sitio}" },
  "cluster.map.title": { en: "Spatial extent", tl: "Saklaw sa mapa" },
  "cluster.map.radius": { en: "{meters}m radius around centroid", tl: "{meters}m radius mula sa gitna" },
  "cluster.map.noExtent": { en: "Precise spatial extent not available yet", tl: "Wala pang eksaktong saklaw sa mapa" },
  "cluster.map.aria": { en: "Cluster map, schematic and not to scale", tl: "Mapa ng kumpol, iskematiko at hindi eksakto ang sukat" },
  "cluster.map.schematic": { en: "Schematic, not to scale: each dot is one of the cluster's reports, not its real position.", tl: "Iskematiko at hindi eksakto ang sukat: bawat tuldok ay isa sa mga ulat ng kumpol, hindi ang tunay nitong lokasyon." },
  "cluster.map.area": { en: "Barangay: {name}", tl: "Barangay: {name}" },
  "clusters.emptyTitle": {
    en: "Duplicate detection isn't connected yet",
    tl: "Hindi pa nakakonekta ang pagtukoy ng doble",
  },
  "clusters.emptyBody": {
    en:
      "Reports aren't being grouped into clusters yet, so this page stays empty — that " +
      "doesn't mean there are no duplicates. Once grouping is switched on, clusters of two " +
      "or more related reports will appear here. Reports sent without a location, including " +
      "every identity-withheld report, can't be grouped, and only reports from the same " +
      "barangay, filed within 72 hours of each other, are compared.",
    tl:
      "Hindi pa pinagsasama-sama ang mga ulat sa mga kumpol, kaya walang laman ang page na " +
      "ito — hindi ibig sabihin nito na walang dobleng ulat. Kapag binuksan na ang " +
      "pagsasama-sama, lalabas dito ang mga kumpol ng dalawa o higit pang magkakaugnay na " +
      "ulat. Hindi maisasama ang mga ulat na walang lokasyon, kasama ang bawat ulat na " +
      "nakatago ang pagkakakilanlan, at ang mga ulat lang mula sa iisang barangay, na " +
      "naipadala sa loob ng 72 oras ng isa't isa, ang pinaghahambing.",
  },
  // Shown instead of the two above once DUPLICATE_WRITEBACK_LIVE is on.
  "clusters.emptyTitleLive": {
    en: "No duplicate groups right now",
    tl: "Walang pangkat ng dobleng ulat sa ngayon",
  },
  "clusters.emptyBodyLive": {
    en:
      "Pending reports the system judges to be the same incident are grouped here " +
      "automatically. It compares reports from the same barangay filed within 72 hours of " +
      "each other, weighing how close they are in place and time and their category, so " +
      "reports in different categories can still be grouped. Reports without a location are " +
      "matched by category and barangay. The grouping is the system's and can't be changed " +
      "from this console.",
    tl:
      "Awtomatikong pinagsasama-sama rito ang mga nakabinbing ulat na itinuring ng sistema " +
      "na iisang insidente. Pinaghahambing nito ang mga ulat mula sa iisang barangay na " +
      "naipadala sa loob ng 72 oras ng isa't isa, ayon sa lapit ng lugar at oras at sa " +
      "kategorya, kaya maaaring mapagsama ang mga ulat na magkaiba ang kategorya. Ang mga ulat " +
      "na walang lokasyon ay itinutugma ayon sa kategorya at barangay. Ang sistema ang " +
      "nagpapangkat, at hindi ito mababago mula sa console na ito.",
  },

  // --- Audit Log (sample page) ----------------------------------------------
  "audit.notice": {
    en:
      "Recorded by the system when a report is opened, validated, rejected or routed. " +
      "It names roles, never officials: the trail this console can read leaves out who " +
      "did it, and the reporter's identity is never in it. · Talaan ng paggamit.",
    tl:
      "Itinatala ng sistema kapag binuksan, na-validate, tinanggihan o naipasa ang isang " +
      "ulat. Tungkulin ang ipinapakita, hindi ang pangalan ng opisyal, at wala rito ang " +
      "pagkakakilanlan ng nag-ulat.",
  },
  "audit.footer": {
    en: "Showing the newest {count} events of at most {limit}. The filters above apply to these.",
    tl: "Ipinapakita ang pinakabagong {count} pangyayari, hanggang {limit}. Sa mga ito lang tumutukoy ang mga filter sa itaas.",
  },
  "audit.footerFiltered": {
    en: "Showing {shown} of the newest {count} events. The filter applies to these, not to the whole trail.",
    tl: "Ipinapakita ang {shown} sa pinakabagong {count} pangyayari. Sa mga ito tumutukoy ang filter, hindi sa buong talaan.",
  },
  "audit.tile.total": { en: "Events shown", tl: "Mga pangyayaring ipinapakita" },
  "audit.tile.decisions": { en: "Decisions", tl: "Mga pasya" },
  "audit.tile.routings": { en: "Routings", tl: "Mga pagpapasa" },
  "audit.tile.openings": { en: "Report openings", tl: "Pagbukas ng ulat" },
  "audit.filter.all": { en: "All events", tl: "Lahat ng pangyayari" },
  "audit.filter.decisions": { en: "Decisions", tl: "Mga pasya" },
  "audit.filter.routings": { en: "Routings", tl: "Mga pagpapasa" },
  "audit.filter.openings": { en: "Report openings", tl: "Pagbukas ng ulat" },
  "audit.filterNote": {
    en: "Filters the events loaded below",
    tl: "Sinasala ang mga pangyayaring naka-load sa ibaba",
  },
  "audit.empty.title": { en: "No audit events yet", tl: "Wala pang audit na pangyayari" },
  "audit.empty.body": {
    en: "Opening, validating, rejecting or routing a report writes one here.",
    tl: "Ang pagbukas, pag-validate, pagtanggi o pagpapasa ng ulat ay nagdaragdag dito.",
  },
  "audit.empty.filtered": {
    en: "No events of this kind among the ones loaded.",
    tl: "Walang ganitong pangyayari sa mga naka-load.",
  },
  "audit.refusal.noRole": {
    en: "This account has no barangay role, so there is no trail to show for it.",
    tl: "Walang tungkulin sa barangay ang account na ito, kaya walang talaang maipapakita.",
  },
  "audit.refusal.noBarangay": {
    en:
      "This account isn't assigned to a barangay yet, so there is no trail to show. Tell the " +
      "pilot support desk.",
    tl:
      "Wala pang nakatalagang barangay ang account na ito, kaya walang talaang maipapakita. " +
      "Ipaalam sa pilot support desk.",
  },
  "audit.readOnly": {
    en: "Read-only. Every entry is appended by the system; nothing here can be edited or removed.",
    tl: "Pambasa lamang. Idinaragdag ng sistema ang bawat tala; wala ritong maaaring baguhin o burahin.",
  },
  "audit.caption": {
    en: "Audit events for this barangay's reports, newest first",
    tl: "Mga audit na pangyayari sa mga ulat ng barangay na ito, pinakabago muna",
  },
  "audit.col.action": { en: "Action", tl: "Aksyon" },
  "audit.col.role": { en: "Role", tl: "Tungkulin" },
  "audit.col.report": { en: "Report", tl: "Ulat" },
  "audit.action.report_viewed": { en: "Report opened", tl: "Binuksan ang ulat" },
  "audit.action.report_validated": { en: "Validated", tl: "Na-validate" },
  "audit.action.report_rejected": { en: "Rejected", tl: "Tinanggihan" },
  "audit.action.report_routed_manual": { en: "Routed to agencies", tl: "Naipasa sa mga ahensya" },
  "audit.action.report_auto_routed": { en: "Routed automatically", tl: "Awtomatikong naipasa" },
  "audit.action.routing_in_progress": { en: "In progress at an agency", tl: "Inaasikaso ng ahensya" },
  "audit.action.report_resolved_by_agencies": { en: "Resolved by agencies", tl: "Nalutas ng mga ahensya" },
  "audit.action.report_returned_to_barangay": { en: "Returned to barangay", tl: "Ibinalik sa barangay" },
  "audit.reportGone": { en: "Report no longer in the database", tl: "Wala na sa database ang ulat" },
  "role.municipal_admin": { en: "Municipal Admin", tl: "Municipal Admin" },
  "role.agency_user": { en: "Agency staff", tl: "Kawani ng ahensya" },
  "role.agency_supervisor": { en: "Agency supervisor", tl: "Superbisor ng ahensya" },

  // --- Settings -------------------------------------------------------------
  "settings.nav.profile": { en: "Profile", tl: "Profile" },
  "settings.nav.language": { en: "Language", tl: "Wika" },
  "settings.nav.notifications": { en: "Notifications", tl: "Mga Abiso" },
  "settings.nav.privacy": { en: "Privacy & data rights", tl: "Privacy at karapatan sa datos" },
  "settings.nav.about": { en: "About / Support", tl: "Tungkol / Suporta" },
  "settings.privacy.subtitle": {
    en: "RA 10173 Data Privacy Act controls for records within your barangay scope.",
    tl: "Mga kontrol ng RA 10173 (Data Privacy Act) para sa mga rekord na sakop ng inyong barangay.",
  },
  "settings.privacy.exports": {
    en: "Exports respect Row-Level Security — you can only export records from your own barangay.",
    tl:
      "Sumusunod ang pag-export sa Row-Level Security — mga rekord lamang ng sarili ninyong " +
      "barangay ang maaari ninyong i-export.",
  },
  "settings.privacy.withheld": {
    en: "Identity-withheld reports never expose the reporter's name in any surface you can access.",
    tl:
      "Hindi kailanman ipinapakita ang pangalan ng nag-ulat sa mga ulat na nakatago ang " +
      "pagkakakilanlan, saanmang bahagi ng console.",
  },
  "settings.privacy.attestations": {
    en: "Tier 1 attestations store the event only — no government ID, ID number, or biometric data is retained.",
    tl:
      "Ang pangyayari lamang ang itinatala ng mga Tier 1 attestation — walang government ID, " +
      "numero ng ID, o biometric na datos na itinatago.",
  },
  "settings.about.body": {
    en:
      "For platform issues, contact the LipaAction pilot support desk at CDRRMO Lipa City. " +
      "For account or role-grant questions, contact your Punong Barangay.",
    tl:
      "Para sa mga problema sa platform, makipag-ugnayan sa LipaAction pilot support desk sa " +
      "CDRRMO Lipa City. Para sa mga tanong tungkol sa account o role, makipag-ugnayan sa " +
      "inyong Punong Barangay.",
  },
  "profile.editName": { en: "Edit display name", tl: "Baguhin ang pangalang ipinapakita" },
  "profile.nameLabel": { en: "Display name", tl: "Pangalang ipinapakita" },
  "profile.nameDescription": {
    en: "This is the name shown on reports you validate or reject, and in your barangay's audit trail.",
    tl:
      "Ito ang pangalang lumalabas sa mga ulat na iyong vina-validate o tinatanggihan, at sa " +
      "audit trail ng inyong barangay.",
  },
  "profile.email": { en: "Email", tl: "Email" },
  "profile.phone": { en: "Phone", tl: "Telepono" },
  "profile.notSet": { en: "Not set", tl: "Wala pa" },
  "profile.askAdmin": {
    en: "Ask a municipal admin to change this",
    tl: "Humiling sa municipal admin para baguhin ito",
  },
  "profile.nameUnconfirmed": {
    en: "Couldn't confirm your name was saved. Try again.",
    tl: "Hindi makumpirma kung na-save ang iyong pangalan. Subukang muli.",
  },
  "profile.nameUpdated": { en: "Display name updated", tl: "Na-update ang pangalang ipinapakita" },
  "profile.nameFailed": { en: "Couldn't update display name", tl: "Hindi na-update ang pangalang ipinapakita" },
  "language.title": { en: "Language preferences", tl: "Mga kagustuhan sa wika" },
  "language.body": {
    en:
      "Saved in this browser only · Naka-save sa device na ito. Interface language switches " +
      "the console's menus, buttons, and messages between English and Tagalog — the same " +
      "choice as the EN/TL switch at the top of every page. Reports are always shown exactly " +
      "as the resident wrote them. Some labels that come from the system — report " +
      "categories, priority levels, times, and some error messages — are still in English, " +
      "as are the sign-in and error pages.",
    tl:
      "Naka-save lamang sa browser na ito. Pinapalitan ng wika ng interface ang mga menu, " +
      "button, at mensahe ng console sa pagitan ng Ingles at Tagalog — kapareho ng EN/TL na " +
      "switch sa itaas ng bawat page. Ipinapakita palagi ang mga ulat nang eksakto kung paano " +
      "isinulat ng residente. Nasa Ingles pa ang ilang label na galing sa sistema — mga " +
      "kategorya ng ulat, antas ng priyoridad, oras, at ilang mensahe ng error — pati ang mga " +
      "page ng pag-sign in at ng error.",
  },
  "language.interface": { en: "Interface language", tl: "Wika ng interface" },
  "language.option.en": { en: "English", tl: "Ingles" },
  "language.option.tl": { en: "Tagalog (Filipino)", tl: "Tagalog (Filipino)" },
  "language.emphasis": { en: "Bilingual emphasis", tl: "Diin sa dalawang wika" },
  "language.emphasisNote": {
    en: "Recorded for a later version — it doesn't change the screens yet.",
    tl: "Itinatala para sa susunod na bersyon — hindi pa nito binabago ang mga screen.",
  },
  "language.emphasis.english-first": { en: "English first", tl: "Ingles muna" },
  "language.emphasis.tagalog-first": { en: "Tagalog first", tl: "Tagalog muna" },
  "language.emphasis.english-only": { en: "English only", tl: "Ingles lamang" },
  "notifications.body": {
    en:
      "Saved in this browser only · Naka-save sa device na ito. Alerts fire while the Queue " +
      "page is open in this browser; nothing is sent when the console is closed.",
    tl:
      "Naka-save lamang sa browser na ito. Gumagana ang mga alerto habang bukas ang Pila ng " +
      "Ulat sa browser na ito; walang ipinapadala kapag nakasara ang console.",
  },
  "notifications.audible": {
    en: "Audible alert for new Tier 0 emergencies",
    tl: "Tunog na alerto para sa bagong Tier 0 na emergency",
  },
  "notifications.audibleBody": {
    en: "Plays a short chime when a new fast-triage report arrives while the Queue is open.",
    tl: "Tumutunog nang maikli kapag may dumating na bagong ulat sa mabilisang triage habang bukas ang Pila.",
  },
  "notifications.testSound": { en: "Play test sound", tl: "Patugtugin ang pansubok na tunog" },
  "notifications.sla": { en: "SLA breach browser notification", tl: "Abiso sa browser kapag lumampas sa SLA" },
  "notifications.slaBody": {
    en:
      "Shows a browser notification when a Tier 0 report has waited more than 5 minutes " +
      "without a decision. Your browser will ask for permission the first time.",
    tl:
      "Nagpapakita ng abiso sa browser kapag may Tier 0 na ulat na naghintay nang higit sa 5 " +
      "minuto nang walang pasya. Hihingi ng pahintulot ang iyong browser sa unang pagkakataon.",
  },
  "notifications.unsupported": {
    en: "This browser doesn't support notifications",
    tl: "Hindi sumusuporta sa mga abiso ang browser na ito",
  },
  "notifications.blocked": {
    en: "Notifications are blocked for this site in your browser settings",
    tl: "Naka-block ang mga abiso para sa site na ito sa settings ng iyong browser",
  },
  "notifications.quietPrompt": {
    en: "Waiting for your browser. If no prompt appeared, click the bell icon in the address bar and choose Allow.",
    tl: "Hinihintay ang iyong browser. Kung walang lumabas na tanong, i-click ang icon ng kampana sa address bar at piliin ang Allow.",
  },
  "notifications.notAllowed": {
    en: "Notifications weren't allowed, so the switch stays off. Turn it on again to be asked again.",
    tl: "Hindi pinayagan ang mga abiso, kaya nananatiling naka-off ang switch. I-on itong muli para tanungin ka ulit.",
  },

  // --- City dashboard (municipal_admin) --------------------------------------
  "shell.cityConsoleName": { en: "City console", tl: "Console ng Lungsod" },
  "city.scope": { en: "Lipa City", tl: "Lungsod ng Lipa" },
  "nav.cityOverview": { en: "Overview", tl: "Pangkalahatang-tanaw" },
  "nav.cityResponse": { en: "Agency response", tl: "Tugon ng ahensya" },
  "nav.cityReports": { en: "Reports", tl: "Mga Ulat" },
  "nav.cityAgencies": { en: "Agencies", tl: "Mga Ahensya" },
  "banner.what.cityAgencies": { en: "The agency list", tl: "listahan ng ahensya" },
  "city.agencies.title": { en: "Responder agencies", tl: "Mga ahensyang tumutugon" },
  "city.agencies.intro": {
    en: "Every agency configured in the system, and the report categories routing sends to each.",
    tl: "Bawat ahensyang naka-configure sa sistema, at ang mga kategorya ng ulat na ipinapasa sa bawat isa.",
  },
  "city.agencies.caption": { en: "Agencies and the categories routed to them", tl: "Mga ahensya at ang mga kategoryang ipinapasa sa kanila" },
  "city.agencies.col.agency": { en: "Agency", tl: "Ahensya" },
  "city.agencies.col.code": { en: "Code", tl: "Code" },
  "city.agencies.col.tier": { en: "Tier", tl: "Tier" },
  "city.agencies.col.categories": { en: "Receives", tl: "Tumatanggap ng" },
  "city.agencies.lead": { en: "lead", tl: "pangunahin" },
  "city.agencies.none": { en: "No category routes here", tl: "Walang kategoryang ipinapasa rito" },
  "city.agencies.mappingUnavailable": {
    en: "Couldn't load the routing rules",
    tl: "Hindi ma-load ang mga tuntunin sa pagpasa",
  },
  "city.agencies.empty": { en: "No agency is configured.", tl: "Walang naka-configure na ahensya." },
  "city.agencies.footer": {
    en: "Read from the routing table the console uses when a barangay routes a report. Adding agencies or changing where a category goes isn't done from this page.",
    tl: "Mula sa talaan ng pagpasa na ginagamit ng console kapag nagpapasa ang barangay ng ulat. Hindi rito ginagawa ang pagdagdag ng ahensya o ang pagbago kung saan napupunta ang isang kategorya.",
  },
  "banner.what.cityReports": { en: "The city's reports", tl: "mga ulat ng lungsod" },
  "city.reports.title": { en: "Reports across the city", tl: "Mga ulat sa buong lungsod" },
  "city.reports.intro": {
    en: "Every report filed in the last {days} days, newest first. Opening one is recorded in the access log.",
    tl: "Bawat ulat na naisampa sa nakaraang {days} araw, pinakabago muna. Itinatala sa talaan ng access ang bawat pagbukas.",
  },
  "city.filter.allBarangays": { en: "All barangays", tl: "Lahat ng barangay" },
  "city.filter.stage": { en: "Stage", tl: "Yugto" },
  "city.stage.all": { en: "All", tl: "Lahat" },
  "city.stage.awaiting": { en: "Awaiting review", tl: "Naghihintay ng pagsusuri" },
  "city.stage.validated": { en: "Validated, not routed", tl: "Na-validate, hindi pa naipasa" },
  "city.stage.withAgencies": { en: "With agencies", tl: "Nasa ahensya" },
  "city.stage.rejected": { en: "Rejected", tl: "Tinanggihan" },
  "city.reports.caption": { en: "Reports filed across the city", tl: "Mga ulat na naisampa sa buong lungsod" },
  "city.reports.col.submitted": { en: "Submitted", tl: "Naisumite" },
  "city.reports.col.agencies": { en: "Agencies", tl: "Mga ahensya" },
  "city.reports.col.open": { en: "Open", tl: "Buksan" },
  "city.reports.open": { en: "Details", tl: "Detalye" },
  "city.reports.agenciesUnavailable": { en: "Couldn't load", tl: "Hindi ma-load" },
  "city.reports.empty": {
    en: "No reports were filed in the last {days} days.",
    tl: "Walang ulat na naisampa sa nakaraang {days} araw.",
  },
  "city.reports.emptyFiltered": {
    en: "No report in the last {days} days matches these filters.",
    tl: "Walang ulat sa nakaraang {days} araw na tugma sa mga filter na ito.",
  },
  "city.reports.footer": {
    en: "{count} shown, newest first. The list shows no description and names no reporter; the drawer shows the resident's account, and opening it is logged.",
    tl: "{count} ang ipinapakita, pinakabago muna. Walang paglalarawan at walang pangalan ng nag-ulat sa listahan; nasa drawer ang salaysay ng residente, at itinatala ang pagbukas nito.",
  },
  "city.reports.capped": {
    en: "Only the newest {limit} are listed; narrow the filters to see older ones.",
    tl: "Ang pinakabagong {limit} lamang ang nakalista; paliitin ang mga filter para makita ang mas luma.",
  },
  "city.drawer.reviewed": { en: "Reviewed", tl: "Nasuri" },
  "city.drawer.readOnly": {
    en: "Read-only. Decisions and routing stay with the barangay.",
    tl: "Pagtingin lamang. Nasa barangay ang pagpapasya at pagpasa.",
  },
  "city.drawer.notRouted": { en: "Not routed to any agency.", tl: "Hindi pa naipasa sa anumang ahensya." },
  "city.drawer.agenciesUnavailable": {
    en: "Couldn't load the agencies for this report.",
    tl: "Hindi ma-load ang mga ahensya para sa ulat na ito.",
  },
  "banner.what.cityOverview": { en: "The city overview", tl: "pangkalahatang-tanaw ng lungsod" },
  "banner.what.cityResponse": { en: "Agency response times", tl: "oras ng tugon ng ahensya" },
  "city.readOnly": {
    en: "Read-only. Decisions and routing stay with each barangay. No reporter is named on these pages.",
    tl: "Pagtingin lamang. Nasa bawat barangay pa rin ang pagpapasya at pag-route. Walang nag-ulat na pinangangalanan sa mga pahinang ito.",
  },
  "city.overview.title": { en: "City-wide activity", tl: "Aktibidad sa buong lungsod" },
  "city.overview.intro": {
    en: "Reports from every barangay over the last 7 days, and what is waiting for a decision right now.",
    tl: "Mga ulat mula sa bawat barangay sa nakaraang 7 araw, at ang naghihintay ng pasya ngayon.",
  },
  "city.tile.today": { en: "Reports today", tl: "Mga ulat ngayong araw" },
  "city.tile.average": { en: "Daily average, 7 days", tl: "Karaniwan bawat araw, 7 araw" },
  "city.tile.awaiting": { en: "Awaiting review", tl: "Naghihintay ng pagsusuri" },
  "city.tile.critical": { en: "Critical awaiting review", tl: "Critical na naghihintay" },
  "city.tile.pastSla": { en: "Emergencies past {minutes} min", tl: "Emergency na lampas {minutes} min" },
  "city.col.barangay": { en: "Barangay", tl: "Barangay" },
  "city.col.daily": { en: "Last 7 days, by day", tl: "Nakaraang 7 araw, bawat araw" },
  "city.col.week": { en: "7 days", tl: "7 araw" },
  "city.col.today": { en: "Today", tl: "Ngayon" },
  "city.col.awaiting": { en: "Awaiting review now", tl: "Naghihintay ngayon" },
  "city.col.validated": { en: "Validated (7 days)", tl: "Na-validate (7 araw)" },
  "city.col.rejected": { en: "Rejected (7 days)", tl: "Tinanggihan (7 araw)" },
  "city.overview.caption": {
    en: "Reports per barangay over the last 7 days",
    tl: "Mga ulat bawat barangay sa nakaraang 7 araw",
  },
  "city.dayCount": { en: "{day}: {count}", tl: "{day}: {count}" },
  "city.unnamedBarangay": { en: "Barangay name unavailable", tl: "Hindi makuha ang pangalan ng barangay" },
  "city.noBarangay": { en: "No barangay recorded", tl: "Walang nakatalang barangay" },
  "city.overview.empty": {
    en: "No reports were filed in any barangay in the last 7 days, and none is waiting for a decision.",
    tl: "Walang ulat na naisampa sa alinmang barangay sa nakaraang 7 araw, at walang naghihintay ng pasya.",
  },
  "city.overview.footer": {
    en:
      "Counted at {time}. Validated and rejected count the last 7 days' reports by where each stands now; " +
      "awaiting review counts every undecided report, however old. A barangay with no reports in that time isn't listed.",
    tl:
      "Binilang noong {time}. Ang na-validate at tinanggihan ay bilang ng mga ulat sa nakaraang 7 araw ayon sa kalagayan nila ngayon; " +
      "ang naghihintay ay bilang ng lahat ng hindi pa napagpapasyahan, gaano man katagal. Hindi nakalista ang barangay na walang ulat sa panahong iyon.",
  },
  "city.capped": {
    en: "Only the first {limit} reports were counted.",
    tl: "Ang unang {limit} na ulat lamang ang binilang.",
  },
  "city.response.title": { en: "Agency response times", tl: "Oras ng tugon ng ahensya" },
  "city.response.intro": {
    en:
      "Every routing in the last {days} days, per agency: how long until the agency acknowledged it, " +
      "and how long from acknowledgement to resolution.",
    tl:
      "Bawat pag-route sa nakaraang {days} araw, bawat ahensya: gaano katagal bago ito kinilala ng ahensya, " +
      "at gaano katagal mula sa pagkilala hanggang sa paglutas.",
  },
  "city.response.caption": { en: "Response times per agency", tl: "Oras ng tugon bawat ahensya" },
  "city.response.col.agency": { en: "Agency", tl: "Ahensya" },
  "city.response.col.routed": { en: "Routed", tl: "Na-route" },
  "city.response.col.awaiting": { en: "Awaiting acknowledgement", tl: "Naghihintay ng pagkilala" },
  "city.response.col.toAck": { en: "Time to acknowledge", tl: "Oras bago kilalanin" },
  "city.response.col.toResolve": { en: "Acknowledged to resolved", tl: "Mula pagkilala hanggang lutas" },
  "city.response.col.resolved": { en: "Resolved", tl: "Nalutas" },
  "city.response.col.returned": { en: "Returned out of scope", tl: "Ibinalik, labas sa saklaw" },
  "city.response.median": { en: "median {value}", tl: "median {value}" },
  "city.response.p95": { en: "95th {value}", tl: "ika-95 {value}" },
  "city.response.samples": { en: "{count} timed", tl: "{count} naorasan" },
  "city.response.noTiming": { en: "No timing yet", tl: "Wala pang oras" },
  "city.unnamedAgency": { en: "Agency name unavailable", tl: "Hindi makuha ang pangalan ng ahensya" },
  "city.response.empty": {
    en: "No report was routed to an agency in the last {days} days.",
    tl: "Walang ulat na na-route sa ahensya sa nakaraang {days} araw.",
  },
  "city.response.footer": {
    en:
      "Automatic routing is off, so each clock starts when a barangay routed the report. " +
      "Reports returned out of scope are counted apart and kept out of the resolution time. " +
      "The 95th percentile appears once an agency has {min} timings.",
    tl:
      "Naka-off ang awtomatikong pag-route, kaya nagsisimula ang bawat orasan nang i-route ng barangay ang ulat. " +
      "Hiwalay na binibilang ang mga ibinalik bilang labas sa saklaw at hindi isinasama sa oras ng paglutas. " +
      "Lumalabas ang ika-95 na percentile kapag may {min} nang naorasan ang ahensya.",
  },
} satisfies Record<string, Entry>;

export type MessageKey = keyof typeof MESSAGES;
