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
 * The Tagalog column is a first draft awaiting review — change wording here,
 * never in a component.
 *
 * Deliberately not in this file, so they stay as they are in both languages:
 * - Anything a resident wrote (descriptions, their answers in the drawer).
 *   Translating a report would put words in the reporter's mouth.
 * - Values that arrive preformatted from the server: category names, priority
 *   tiers (the model's class names), relative times like [5m ago], review
 *   timestamps, and error messages returned by server actions.
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
      "Emergency tab. · Hindi pa nakakonekta ang pag-flag ng duplicate.",
    tl:
      "Hindi pa pinagsasama-sama ang mga ulat bilang doble, kaya walang laman ang tab na ito — " +
      "hindi ibig sabihin nito na walang dobleng ulat ngayong araw. Suriin ang bawat ulat sa " +
      "tab na Emergency.",
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
  "routing.lead": { en: "(lead)", tl: "(pangunahin)" },
  "routing.agencyCountOne": { en: "1 agency", tl: "1 ahensya" },
  "routing.agencyCount": { en: "{count} agencies", tl: "{count} ahensya" },
  "routing.outcome.resolved": { en: "resolved", tl: "nalutas" },
  "routing.outcome.confirmed-false": { en: "confirmed false", tl: "kumpirmadong hindi totoo" },
  "routing.outcome.duplicate": { en: "duplicate", tl: "doble" },
  "routing.outcome.out-of-scope": { en: "out of scope", tl: "labas sa saklaw" },
  "routing.progress.closed": { en: "Closed — {outcome}", tl: "Isinara — {outcome}" },
  "routing.progress.acknowledged": { en: "Acknowledged", tl: "Kinilala na" },
  "routing.progress.awaiting": { en: "Awaiting acknowledgement", tl: "Naghihintay ng pagkilala" },
  "routing.summary.closedBy": {
    en: "Closed by {agency}{more} — {outcome}",
    tl: "Isinara ng {agency}{more} — {outcome}",
  },
  "routing.summary.resolvedBy": { en: "Resolved by {agency}{more}", tl: "Nalutas ng {agency}{more}" },
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

  // --- Report detail drawer -------------------------------------------------
  "drawer.close": { en: "Close report details", tl: "Isara ang detalye ng ulat" },
  "drawer.tier.emergency": { en: "Emergency fast-triage", tl: "Emergency (mabilisang triage)" },
  "drawer.tier.other_reports": { en: "Standard intake", tl: "Karaniwang ulat" },
  "drawer.discreet": { en: "Discreet reporting requested", tl: "Humiling ng discreet na pag-uulat" },
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
    en: "Returned by the agencies as out of scope — handle it at the barangay. Re-routing isn't available from this console.",
    tl: "Ibinalik ng mga ahensya bilang labas sa saklaw — asikasuhin ito sa barangay. Hindi pa ito maipapasa muli mula sa console na ito.",
  },
  "drawer.footer.reviewed": {
    en: "Already reviewed — no further action available here.",
    tl: "Nasuri na — wala nang ibang magagawa rito.",
  },
  "drawer.stage.closed": { en: "closed {time}", tl: "isinara {time}" },
  "drawer.stage.acknowledged": { en: "acknowledged {time}", tl: "kinilala {time}" },
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
  "clusters.emptyTitle": {
    en: "Duplicate detection isn't connected yet",
    tl: "Hindi pa nakakonekta ang pagtukoy ng doble",
  },
  "clusters.emptyBody": {
    en:
      "Reports aren't being grouped into clusters yet, so this page stays empty — that " +
      "doesn't mean there are no duplicates. Once grouping is switched on, clusters of two " +
      "or more related reports will appear here. Reports sent without a location, including " +
      "every identity-withheld report, can't be grouped.",
    tl:
      "Hindi pa pinagsasama-sama ang mga ulat sa mga kumpol, kaya walang laman ang page na " +
      "ito — hindi ibig sabihin nito na walang dobleng ulat. Kapag binuksan na ang " +
      "pagsasama-sama, lalabas dito ang mga kumpol ng dalawa o higit pang magkakaugnay na " +
      "ulat. Hindi maisasama ang mga ulat na walang lokasyon, kasama ang bawat ulat na " +
      "nakatago ang pagkakakilanlan.",
  },

  // --- Audit Log (sample page) ----------------------------------------------
  "audit.noticeTitle": { en: "Sample data.", tl: "Sample na datos." },
  "audit.noticeBody": {
    en:
      "The audit trail is being recorded, but barangay accounts cannot read it back yet — " +
      "what the barangay desk may see is a data-protection decision still pending. The rows " +
      "below show the intended layout only. · Sample lang ang datos na ito.",
    tl:
      "Itinatala ang audit trail, pero hindi pa ito mababasa ng mga account ng barangay — " +
      "nakabinbin pa ang desisyon sa data privacy kung ano ang maaaring makita ng desk ng " +
      "barangay. Ipinapakita lamang ng mga hilera sa ibaba ang nakaplanong layout.",
  },
  "audit.footer": {
    en: "Showing {count} sample events. Filters and counts above are not live.",
    tl: "Ipinapakita ang {count} sample na pangyayari. Hindi live ang mga filter at bilang sa itaas.",
  },
  "audit.tile.total": { en: "Total events", tl: "Kabuuang pangyayari" },
  "audit.tile.stateChanging": { en: "State-changing actions", tl: "Mga aksyong nagbago ng estado" },
  "audit.tile.pii": { en: "PII-access events", tl: "Mga pag-access sa PII" },
  "audit.tile.actors": { en: "Unique actors", tl: "Natatanging aktor" },
  "audit.filter.stateChanges": { en: "State changes only", tl: "Pagbabago ng estado lang" },
  "audit.filter.pii": { en: "PII access", tl: "Pag-access sa PII" },
  "audit.filter.allActors": { en: "All actors", tl: "Lahat ng aktor" },
  "audit.empty.title": { en: "No audit events in this range", tl: "Walang audit na pangyayari sa saklaw na ito" },
  "audit.empty.body": {
    en: "Try widening the date filter, or switch to “All actors” above.",
    tl: "Palawakin ang filter ng petsa, o piliin ang “Lahat ng aktor” sa itaas.",
  },
  "audit.readOnly": {
    en: "Read-only audit trail — every category and assignment write appends an immutable row.",
    tl:
      "Audit trail na pambasa lamang — bawat pagbabago sa kategorya at pagtatalaga ay " +
      "nagdaragdag ng hilerang hindi na mababago.",
  },
  "audit.caption": {
    en: "Sample audit events, for layout only",
    tl: "Sample na audit na pangyayari, para sa layout lamang",
  },
  "audit.col.actor": { en: "Actor", tl: "Aktor" },
  "audit.col.action": { en: "Action", tl: "Aksyon" },
  "audit.col.entity": { en: "Affected entity", tl: "Apektadong rekord" },
  "audit.col.diff": { en: "Before to after", tl: "Bago at pagkatapos" },

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
} satisfies Record<string, Entry>;

export type MessageKey = keyof typeof MESSAGES;
