export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function longDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "";
}

export function shortDate(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
}

export function monthYear(value) {
  const d = toDate(value);
  return d ? d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "";
}

// "2026-10-14" -> local Date (avoids the UTC off-by-one you get from new Date("2026-10-14"))
export function parseLocalDate(isoDay) {
  if (!isoDay) return null;
  const [y, m, d] = isoDay.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// "18:30" -> "6.30pm", the way school letters write it
export function schoolTime(hhmm) {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}.${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
}

export function duration(seconds) {
  const s = Math.round(seconds || 0);
  if (s < 60) return `${s} sec`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} min ${rest} sec` : `${m} min`;
}

export function percent(fraction) {
  if (!Number.isFinite(fraction)) return "0%";
  return `${Math.round(fraction * 100)}%`;
}

export function hourLabel(h) {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}
