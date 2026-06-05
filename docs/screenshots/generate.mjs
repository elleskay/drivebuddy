// Generates phone-frame SVG mockups of the DriveBuddy app screens.
// These mirror the real screens' dark theme and content (see apps/drivebuddy/app/*).
// Run: node docs/screenshots/generate.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT = dirname(fileURLToPath(import.meta.url));
mkdirSync(OUT, { recursive: true });

// ---- palette (matches the app) -------------------------------------------
const C = {
  bg: "#0b1220",
  card: "#131c2e",
  cardAlt: "#16223a",
  border: "#243049",
  line: "#1b2435",
  accent: "#4f8cff",
  text: "#e7eefc",
  muted: "#9fb0d0",
  dim: "#5a6b8c",
  danger: "#e5484d",
  danger2: "#ff6b6b",
  green: "#7ee0a2",
  white: "#ffffff",
};

const W = 320,
  H = 660,
  PAD = 20,
  CW = W - PAD * 2; // content width 280
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const t = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${o.size ?? 13}" fill="${o.fill ?? C.text}" font-weight="${o.weight ?? 400}" text-anchor="${o.anchor ?? "start"}"${o.opacity ? ` opacity="${o.opacity}"` : ""}>${esc(s)}</text>`;
const rect = (x, y, w, h, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 0}" fill="${o.fill ?? "none"}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw ?? 1}"` : ""}/>`;
const card = (x, y, w, h, o = {}) => rect(x, y, w, h, { rx: o.rx ?? 14, fill: o.fill ?? C.card, stroke: o.stroke ?? C.border, sw: 1 });
const circle = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

// A nav-list card row used on the home screen: icon, title, desc, chevron.
function navCard(y, icon, title, desc, opts = {}) {
  const h = 64;
  const fill = opts.primary ? C.cardAlt : C.card;
  const stroke = opts.primary ? C.accent : C.border;
  let s = card(PAD, y, CW, h, { fill, stroke });
  s += t(PAD + 18, y + 30, icon, { size: 22, anchor: "middle" });
  s += t(PAD + 40, y + 28, title, { size: 14, weight: 700 });
  s += t(PAD + 40, y + 46, desc, { size: 11, fill: C.muted });
  if (opts.badge) {
    s += rect(PAD + CW - 56, y + 21, 22, 22, { rx: 11, fill: C.danger });
    s += t(PAD + CW - 45, y + 36, opts.badge, { size: 11, weight: 800, fill: C.white, anchor: "middle" });
  }
  s += t(PAD + CW - 16, y + 38, "›", { size: 22, fill: C.accent });
  return s;
}

// ---- phone frame ----------------------------------------------------------
function frame(body, { title, headerRight, noHeader } = {}) {
  const head = noHeader
    ? ""
    : t(W / 2, 64, title, { size: 16, weight: 700, anchor: "middle" }) +
      `<line x1="0" y1="80" x2="${W}" y2="80" stroke="${C.line}" stroke-width="1"/>` +
      (headerRight ? t(W - 24, 68, headerRight, { size: 17, anchor: "middle" }) : "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <defs>
    <clipPath id="screen"><rect x="0" y="0" width="${W}" height="${H}" rx="34"/></clipPath>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.35"/></filter>
  </defs>
  <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="34" fill="${C.bg}" stroke="#2a3550" stroke-width="2"/>
  <g clip-path="url(#screen)">
    <rect x="0" y="0" width="${W}" height="${H}" fill="${C.bg}"/>
    <!-- status bar -->
    <text x="26" y="30" font-family="${FONT}" font-size="12" fill="${C.text}" font-weight="700">9:41</text>
    <g transform="translate(${W - 70},20)" fill="${C.text}">
      <rect x="0" y="2" width="16" height="9" rx="2"/><rect x="20" y="2" width="16" height="9" rx="2"/>
      <rect x="40" y="0" width="22" height="11" rx="3" fill="none" stroke="${C.text}" stroke-width="1.2"/>
      <rect x="42" y="2" width="15" height="7" rx="1.5"/><rect x="63" y="3.5" width="2" height="4" rx="1"/>
    </g>
    ${head}
    ${body}
    <!-- home indicator -->
    <rect x="${W / 2 - 55}" y="${H - 14}" width="110" height="5" rx="2.5" fill="#2a3550"/>
  </g>
</svg>`;
}

// ===========================================================================
// SCREENS
// ===========================================================================
const screens = {};

// --- Login -----------------------------------------------------------------
screens.login = frame(
  (() => {
    let s = "";
    s += t(W / 2, 200, "DriveBuddy", { size: 30, weight: 800, fill: C.accent, anchor: "middle" });
    s += t(W / 2, 226, "Welcome back", { size: 14, fill: C.muted, anchor: "middle" });
    s += card(PAD, 260, CW, 46) + t(PAD + 16, 288, "Email", { fill: C.dim });
    s += card(PAD, 316, CW, 46) + t(PAD + 16, 344, "••••••••", { fill: C.muted });
    s += rect(PAD, 374, CW, 48, { rx: 12, fill: C.accent }) + t(W / 2, 404, "Sign in", { size: 15, weight: 700, fill: C.white, anchor: "middle" });
    s += t(W / 2, 446, "New here? ", { fill: C.muted, anchor: "middle" });
    s += t(W / 2, 466, "Create an account", { fill: C.accent, weight: 700, anchor: "middle" });
    return s;
  })(),
  { noHeader: true },
);

// --- Home ------------------------------------------------------------------
screens.home = frame(
  (() => {
    let y = 104;
    let s = t(PAD, y, "Hi Sarah 👋", { size: 22, weight: 800 });
    s += t(PAD, y + 22, "Welcome to DriveBuddy", { size: 13, fill: C.muted });
    y += 44;
    s += navCard(y, "🧭", "Start a Drive", "Track your route, distance & cost", { primary: true });
    s += navCard((y += 72), "🤖", "AI Assistant", "Ask about ERP, traffic, parking & more");
    s += navCard((y += 72), "🌤️", "Live Info", "Weather, traffic, ERP, carparks, petrol");
    s += navCard((y += 72), "🛣️", "Trip History", "Past drives & summaries");
    s += navCard((y += 72), "💡", "Recommendations", "Insights & tips from your drives");
    s += navCard((y += 72), "🔔", "Notifications", "Alerts & trip summaries", { badge: "3" });
    return s;
  })(),
  { title: "DriveBuddy", headerRight: "⚙️" },
);

// --- Journey ---------------------------------------------------------------
screens.journey = frame(
  (() => {
    let s = "";
    // stats row
    s += card(PAD, 120, 134, 78) + t(PAD + 67, 158, "12.4", { size: 26, weight: 800, anchor: "middle" }) + t(PAD + 67, 178, "km", { size: 11, fill: C.muted, anchor: "middle" });
    s += card(PAD + 146, 120, 134, 78) + t(PAD + 213, 158, "18:32", { size: 26, weight: 800, anchor: "middle" }) + t(PAD + 213, 178, "Time", { size: 11, fill: C.muted, anchor: "middle" });
    // pulse
    s += circle(W / 2, 330, 78, "none");
    s += `<circle cx="${W / 2}" cy="330" r="78" fill="${C.cardAlt}" stroke="${C.accent}" stroke-width="2"/>`;
    s += `<circle cx="${W / 2}" cy="330" r="96" fill="none" stroke="${C.accent}" stroke-width="1" opacity="0.25"/>`;
    s += t(W / 2, 336, "Recording", { size: 15, weight: 700, anchor: "middle" });
    // end button
    s += rect(PAD, 452, CW, 52, { rx: 14, fill: C.danger }) + t(W / 2, 485, "End drive", { size: 16, weight: 800, fill: C.white, anchor: "middle" });
    s += t(W / 2, 528, "Tracking uses foreground GPS.", { size: 11, fill: C.dim, anchor: "middle" });
    s += t(W / 2, 544, "Keep the screen on while driving.", { size: 11, fill: C.dim, anchor: "middle" });
    return s;
  })(),
  { title: "Journey" },
);

// --- Trip Summary ----------------------------------------------------------
screens.tripSummary = frame(
  (() => {
    let s = "";
    // map card with polyline
    s += card(PAD, 96, CW, 170, { fill: "#101a2c" });
    const pts = "60,210 90,170 140,150 190,120 230,140 250,110".split(" ").map((p) => p.split(",")).map(([x, y]) => `${+x + 0},${+y - 20}`).join(" ");
    s += `<polyline points="${pts}" fill="none" stroke="${C.accent}" stroke-width="3" stroke-linejoin="round"/>`;
    s += circle(60, 190, 5, C.green) + circle(250, 90, 5, C.danger);
    // stats
    const st = (x, v, u, l) => card(x, 278, 86, 64) + t(x + 43, 304, v, { size: 17, weight: 800, anchor: "middle" }) + t(x + 43, 318, u, { size: 10, fill: C.muted, anchor: "middle" }) + t(x + 43, 332, l, { size: 10, fill: C.muted, anchor: "middle" });
    s += st(PAD, "12.4", "km", "Distance");
    s += st(PAD + 97, "23", "min", "Duration");
    s += st(PAD + 194, "52", "km/h", "Avg speed");
    // cost card
    s += card(PAD, 356, CW, 150);
    s += t(PAD + 16, 380, "Trip cost", { size: 15, weight: 800 });
    const cost = (y, l, v, b) => t(PAD + 16, y, l, { size: 13, fill: b ? C.text : C.muted, weight: b ? 800 : 400 }) + t(PAD + CW - 16, y, v, { size: 13, fill: C.text, weight: b ? 800 : 600, anchor: "end" });
    s += cost(406, "⛽ Fuel", "$2.84");
    s += cost(430, "💳 ERP", "$3.00");
    s += cost(454, "🅿️ Parking", "$1.20");
    s += `<line x1="${PAD + 14}" y1="468" x2="${PAD + CW - 14}" y2="468" stroke="${C.border}" stroke-width="1"/>`;
    s += cost(490, "Total", "$7.04", true);
    return s;
  })(),
  { title: "Trip Summary" },
);

// --- Dashboard / Live Info -------------------------------------------------
screens.dashboard = frame(
  (() => {
    let y = 96;
    const feed = (title, sub, rows, h) => {
      let s = card(PAD, y, CW, h);
      s += t(PAD + 16, y + 26, title, { size: 15, weight: 800 });
      s += t(PAD + 16, y + 42, sub, { size: 11, fill: C.dim });
      let ry = y + 64;
      for (const [l, r] of rows) {
        s += t(PAD + 16, ry, l, { size: 12.5, fill: C.muted });
        s += t(PAD + CW - 16, ry, r, { size: 12.5, weight: 600, anchor: "end" });
        ry += 22;
      }
      y += h + 12;
      return s;
    };
    let s = feed("🌤  Weather", "Next 2 hours · data.gov.sg", [["Ang Mo Kio", "Cloudy"], ["Jurong West", "Light Rain"], ["Tampines", "Partly Cloudy"]], 142);
    s += feed("⛽  Petrol (95)", "Indicative prices", [["Shell FuelSave", "$2.78"], ["Esso Synergy", "$2.81"], ["Caltex", "$2.79"]], 142);
    s += feed("🚧  Traffic incidents", "LTA DataMall", [["Accident", "PIE towards Changi"], ["Roadwork", "CTE Lane 2 closed"]], 120);
    return s;
  })(),
  { title: "Live Info" },
);

// --- AI Assistant ----------------------------------------------------------
screens.assistant = frame(
  (() => {
    let s = "";
    const bubble = (y, txt, role, lines) => {
      const w = role === "user" ? 180 : 232;
      const x = role === "user" ? W - PAD - w : PAD;
      const fill = role === "user" ? C.accent : C.card;
      const stroke = role === "user" ? C.accent : C.border;
      let b = rect(x, y, w, 22 + lines * 16, { rx: 14, fill, stroke, sw: 1 });
      txt.forEach((ln, i) => (b += t(x + 14, y + 22 + i * 16, ln, { size: 12.5, fill: role === "user" ? C.white : C.text })));
      return b;
    };
    s += bubble(96, ["Hi! I'm DriveBuddy. Ask me about", "ERP, traffic, parking, fuel, or", "anything driving in Singapore."], "assistant", 3);
    s += bubble(176, ["How much is ERP at the", "CTE this morning?"], "user", 2);
    s += bubble(238, ["ERP on the CTE during morning", "peak is typically $2–$3 per", "gantry. Leave before 7:30am to", "avoid the highest charges. 🚗"], "assistant", 4);
    s += bubble(330, ["🎤 (voice message)"], "user", 1);
    // input bar
    s += `<line x1="0" y1="${H - 64}" x2="${W}" y2="${H - 64}" stroke="${C.line}"/>`;
    s += circle(PAD + 22, H - 38, 22, C.danger) + t(PAD + 22, H - 32, "⏹", { size: 16, anchor: "middle", fill: C.white });
    s += rect(PAD + 50, H - 60, 150, 44, { rx: 22, fill: C.card, stroke: C.border, sw: 1 }) + t(PAD + 66, H - 33, "Ask DriveBuddy…", { size: 12.5, fill: C.dim });
    s += rect(PAD + 208, H - 60, 72, 44, { rx: 22, fill: C.accent }) + t(PAD + 244, H - 33, "Send", { size: 13, weight: 800, fill: C.white, anchor: "middle" });
    return s;
  })(),
  { title: "AI Assistant" },
);

// --- Notifications ---------------------------------------------------------
screens.notifications = frame(
  (() => {
    let s = t(PAD, 100, "Send test", { size: 13, weight: 600, fill: C.accent });
    s += t(PAD + CW, 100, "Mark all read", { size: 13, weight: 600, fill: C.accent, anchor: "end" });
    let y = 116;
    const note = (icon, title, body, time, unread) => {
      const h = 76;
      let n = card(PAD, y, CW, h, { fill: unread ? C.cardAlt : C.card, stroke: unread ? C.accent : C.border });
      n += t(PAD + 16, y + 30, icon, { size: 20 });
      n += t(PAD + 44, y + 28, title, { size: 13.5, weight: 700 });
      n += t(PAD + 44, y + 46, body, { size: 11.5, fill: C.muted });
      n += t(PAD + 44, y + 62, time, { size: 10, fill: C.dim });
      if (unread) n += circle(PAD + CW - 18, y + 38, 5, C.accent);
      y += h + 10;
      return n;
    };
    s += note("🚗", "Trip complete", "12.4 km · 23 min · $7.04", "5 Jun, 6:32 pm", true);
    s += note("💡", "New driving tips", "You have 2 fresh recommendations.", "5 Jun, 2:00 am", true);
    s += note("⚠️", "Heavy traffic ahead", "Accident on the PIE towards Changi.", "4 Jun, 8:11 am", false);
    s += note("🔔", "DriveBuddy", "Welcome! Add a vehicle to begin.", "3 Jun, 9:00 am", false);
    return s;
  })(),
  { title: "Notifications", headerRight: "⚙️" },
);

// --- Notification settings -------------------------------------------------
screens.notificationSettings = frame(
  (() => {
    const toggle = (x, y, on) => rect(x, y, 40, 22, { rx: 11, fill: on ? C.accent : C.border }) + circle(on ? x + 29 : x + 11, y + 11, 8, C.text);
    let s = t(PAD + 4, 104, "NOTIFICATION TYPES", { size: 11, weight: 700, fill: C.muted });
    let y = 114;
    s += card(PAD, y, CW, 184);
    const rowT = (yy, label, desc, on, last) => {
      let r = t(PAD + 16, yy, label, { size: 14, weight: 600 });
      r += t(PAD + 16, yy + 16, desc, { size: 11, fill: C.muted });
      r += toggle(PAD + CW - 56, yy - 12, on);
      if (!last) r += `<line x1="${PAD + 16}" y1="${yy + 30}" x2="${PAD + CW - 16}" y2="${yy + 30}" stroke="${C.border}"/>`;
      return r;
    };
    s += rowT(y + 28, "Pre-drive alerts", "Reminders before you set off", true);
    s += rowT(y + 74, "Real-time alerts", "Live warnings while driving", true);
    s += rowT(y + 120, "Post-trip summaries", "Cost & distance after each drive", true);
    s += rowT(y + 166, "System", "App news & account notices", false, true);
    y += 200;
    s += t(PAD + 4, y, "REAL-TIME ALERT CHANNELS", { size: 11, weight: 700, fill: C.muted });
    y += 10;
    s += card(PAD, y, CW, 232);
    const rowC = (yy, label, on, last) => {
      let r = t(PAD + 16, yy, label, { size: 14, weight: 600 });
      r += toggle(PAD + CW - 56, yy - 12, on);
      if (!last) r += `<line x1="${PAD + 16}" y1="${yy + 16}" x2="${PAD + CW - 16}" y2="${yy + 16}" stroke="${C.border}"/>`;
      return r;
    };
    s += rowC(y + 30, "🚀 Speed warnings", true);
    s += rowC(y + 74, "⚠️ Road hazards", true);
    s += rowC(y + 118, "💳 ERP charges", false);
    s += rowC(y + 162, "🚧 Traffic incidents", true);
    s += rowC(y + 206, "🌧️ Weather", true, true);
    return s;
  })(),
  { title: "Notification Settings" },
);

// --- Recommendations -------------------------------------------------------
screens.recommendations = frame(
  (() => {
    let s = t(PAD + 4, 100, "YOUR DRIVING", { size: 11, weight: 700, fill: C.muted });
    const stat = (x, y, v, l) => card(x, y, 86, 56) + t(x + 43, y + 26, v, { size: 16, weight: 800, anchor: "middle" }) + t(x + 43, y + 42, l, { size: 10, fill: C.muted, anchor: "middle" });
    s += stat(PAD, 110, "27", "Trips");
    s += stat(PAD + 97, 110, "214", "km total");
    s += stat(PAD + 194, 110, "$148", "Spent");
    s += stat(PAD, 172, "$5.48", "Avg / trip");
    s += stat(PAD + 97, 172, "Fri", "Busiest day");
    s += stat(PAD + 194, 172, "6pm", "Peak hour");
    s += t(PAD + 4, 250, "RECOMMENDATIONS", { size: 11, weight: 700, fill: C.muted });
    let y = 260;
    const rec = (icon, title, body) => {
      let r = card(PAD, y, CW, 86);
      r += t(PAD + 16, y + 30, icon, { size: 20 });
      r += t(PAD + 44, y + 26, title, { size: 13.5, weight: 700 });
      const words = body;
      words.forEach((ln, i) => (r += t(PAD + 44, y + 46 + i * 15, ln, { size: 11, fill: C.muted })));
      r += t(PAD + CW - 14, y + 26, "✕", { size: 14, fill: C.dim, anchor: "end" });
      y += 96;
      return r;
    };
    s += rec("💳", "Beat the ERP peak", ["48% of your drives start during ERP", "peak. Leaving 30 min earlier could", "cut gantry charges."]);
    s += rec("🔁", "Frequent destination", ["You've driven to ~1.300, 103.870", "12 times. Save it as a favourite."]);
    return s;
  })(),
  { title: "Recommendations" },
);

// --- Vehicles --------------------------------------------------------------
screens.vehicles = frame(
  (() => {
    let y = 100;
    const veh = (plate, type, main) => {
      let v = card(PAD, y, CW, 76);
      v += t(PAD + 16, y + 30, "🚗", { size: 20 });
      v += t(PAD + 44, y + 28, plate, { size: 15, weight: 700 });
      v += t(PAD + 44, y + 48, type, { size: 12, fill: C.muted });
      if (main) {
        v += rect(PAD + CW - 70, y + 18, 54, 22, { rx: 11, fill: C.cardAlt, stroke: C.accent, sw: 1 });
        v += t(PAD + CW - 43, y + 33, "Main", { size: 11, weight: 700, fill: C.accent, anchor: "middle" });
      } else {
        v += t(PAD + CW - 16, y + 33, "Set main", { size: 11, weight: 600, fill: C.accent, anchor: "end" });
      }
      y += 86;
      return v;
    };
    let s = veh("SGT1234X", "Petrol · 12.5 L/100km", true);
    s += veh("SBA5678Y", "Hybrid · 5.2 L/100km", false);
    s += veh("SGE9012Z", "Electric · 16 kWh/100km", false);
    y += 6;
    s += t(PAD + 4, y, "ADD A VEHICLE", { size: 11, weight: 700, fill: C.muted });
    y += 12;
    s += card(PAD, y, CW, 46) + t(PAD + 16, y + 29, "Vehicle number", { fill: C.dim });
    s += card(PAD, y + 56, CW, 46) + t(PAD + 16, y + 85, "Fuel type — Petrol ▾", { fill: C.muted });
    s += rect(PAD, y + 112, CW, 48, { rx: 12, fill: C.accent }) + t(W / 2, y + 142, "Add vehicle", { size: 15, weight: 700, fill: C.white, anchor: "middle" });
    return s;
  })(),
  { title: "My Vehicles" },
);

// --- Profile ---------------------------------------------------------------
screens.profile = frame(
  (() => {
    let s = "";
    s += circle(W / 2, 150, 38, C.accent) + t(W / 2, 162, "S", { size: 30, weight: 800, fill: C.white, anchor: "middle" });
    s += t(W / 2, 220, "Sarah Tan", { size: 20, weight: 800, anchor: "middle" });
    s += t(W / 2, 242, "sarah@example.com", { size: 13, fill: C.muted, anchor: "middle" });
    let y = 272;
    const field = (label, val) => {
      let f = t(PAD + 4, y, label, { size: 11, weight: 700, fill: C.muted });
      f += card(PAD, y + 8, CW, 46) + t(PAD + 16, y + 37, val, { size: 14 });
      y += 70;
      return f;
    };
    s += field("FULL NAME", "Sarah Tan");
    s += field("GENDER", "Female");
    s += field("DATE OF BIRTH", "14 Mar 1995");
    s += field("HOME ADDRESS", "Ang Mo Kio Ave 3");
    s += rect(PAD, y + 4, CW, 48, { rx: 12, fill: C.accent }) + t(W / 2, y + 34, "Save changes", { size: 15, weight: 700, fill: C.white, anchor: "middle" });
    return s;
  })(),
  { title: "Profile" },
);

// --- Settings --------------------------------------------------------------
screens.settings = frame(
  (() => {
    let s = card(PAD, 96, CW, 72);
    s += circle(PAD + 42, 132, 26, C.accent) + t(PAD + 42, 141, "S", { size: 22, weight: 800, fill: C.white, anchor: "middle" });
    s += t(PAD + 80, 128, "Sarah Tan", { size: 16, weight: 700 });
    s += t(PAD + 80, 146, "sarah@example.com", { size: 12, fill: C.muted });
    let y = 184;
    const group = (label, rows) => {
      let g = t(PAD + 4, y, label, { size: 11, weight: 700, fill: C.muted });
      y += 12;
      g += card(PAD, y, CW, rows.length * 44);
      rows.forEach(([icon, name], i) => {
        const ry = y + 28 + i * 44;
        g += t(PAD + 16, ry, icon, { size: 16 });
        g += t(PAD + 42, ry, name, { size: 14 });
        g += t(PAD + CW - 16, ry, "›", { size: 18, fill: C.accent, anchor: "end" });
        if (i < rows.length - 1) g += `<line x1="${PAD + 16}" y1="${ry + 14}" x2="${PAD + CW - 16}" y2="${ry + 14}" stroke="${C.border}"/>`;
      });
      y += rows.length * 44 + 16;
      return g;
    };
    s += group("ACCOUNT", [["👤", "Edit profile"], ["🚗", "My vehicles"], ["🔔", "Notification settings"]]);
    s += group("ACTIVITY", [["🛣️", "Trip history"], ["💡", "Recommendations"]]);
    s += t(W / 2, y + 24, "Sign out", { size: 15, weight: 700, fill: C.danger2, anchor: "middle" });
    return s;
  })(),
  { title: "Settings" },
);

// --- Trip History ----------------------------------------------------------
screens.history = frame(
  (() => {
    let y = 100;
    const row = (name, meta) => {
      let r = card(PAD, y, CW, 70);
      r += t(PAD + 16, y + 30, name, { size: 15, weight: 700 });
      r += t(PAD + 16, y + 50, meta, { size: 12.5, fill: C.muted });
      r += t(PAD + CW - 16, y + 42, "›", { size: 22, fill: C.accent, anchor: "end" });
      y += 80;
      return r;
    };
    let s = row("5 Jun, 6:32 pm", "12.4 km · avg 52 km/h");
    s += row("5 Jun, 8:05 am", "9.1 km · avg 38 km/h");
    s += row("4 Jun, 7:48 pm", "15.7 km · avg 61 km/h");
    s += row("4 Jun, 8:11 am", "8.9 km · avg 41 km/h");
    s += row("3 Jun, 6:20 pm", "11.2 km · avg 47 km/h");
    return s;
  })(),
  { title: "Trip History" },
);

// ---- write ----------------------------------------------------------------
let count = 0;
for (const [name, svg] of Object.entries(screens)) {
  const file = name.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
  writeFileSync(join(OUT, `${file}.svg`), svg);
  count++;
}
console.log(`generated ${count} screens into ${OUT}`);
