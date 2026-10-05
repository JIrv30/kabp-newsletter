import { parseLocalDate } from "./format";

const pad = (n) => String(n).padStart(2, "0");
const dayStamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
const escape = (text = "") => text.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");

// Builds a calendar file parents can add to their phone. Times are "floating"
// (no time zone), so they appear at the same clock time wherever the reader is.
export function downloadEventIcs(event, schoolName) {
  const day = parseLocalDate(event.date);
  if (!day) return;

  let when;
  if (event.start) {
    const [sh, sm] = event.start.split(":").map(Number);
    const [eh, em] = (event.end || "").split(":").map(Number);
    const endH = Number.isFinite(eh) ? eh : sh + 1;
    const endM = Number.isFinite(em) ? em : sm;
    when = [`DTSTART:${dayStamp(day)}T${pad(sh)}${pad(sm)}00`, `DTEND:${dayStamp(day)}T${pad(endH)}${pad(endM)}00`];
  } else {
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    when = [`DTSTART;VALUE=DATE:${dayStamp(day)}`, `DTEND;VALUE=DATE:${dayStamp(next)}`];
  }

  const now = new Date();
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${schoolName}//Newsletter//EN`,
    "BEGIN:VEVENT",
    `UID:${dayStamp(day)}-${Math.random().toString(36).slice(2)}@newsletter`,
    `DTSTAMP:${stamp}`,
    ...when,
    `SUMMARY:${escape(event.title || "School event")}`,
    event.location ? `LOCATION:${escape(event.location)}` : null,
    event.details ? `DESCRIPTION:${escape(event.details)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(event.title || "event").replace(/[^\w]+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
