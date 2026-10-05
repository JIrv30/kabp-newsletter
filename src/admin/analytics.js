import { toDate, hourLabel } from "../lib/format";
import { blockLabel } from "../lib/blocks";
import { SITE } from "../config";

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const SOURCE_LABELS = {
  direct: "Direct or unknown",
  archive: "Newsletters page",
  search: "Search engine",
  instagram: "Instagram",
  other: "Another website",
  ...Object.fromEntries(SITE.shareChannels.map((c) => [c.id, c.label])),
};
const DEVICE_LABELS = { mobile: "Phone", tablet: "Tablet", desktop: "Computer" };

function tally(values, labels) {
  const map = new Map();
  values.forEach((v) => map.set(v || "unknown", (map.get(v || "unknown") || 0) + 1));
  return [...map.entries()]
    .map(([key, value]) => ({ key, label: labels[key] || key, value }))
    .sort((a, b) => b.value - a.value);
}

function linkLabel(url, block) {
  if (url.startsWith("calendar:")) return `Add to calendar: ${url.slice(9)}`;
  if (block?.type === "button" && block.label) return `Button: ${block.label}`;
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

// Turns raw session documents into everything the statistics page shows
export function summarise(sessions, newsletter) {
  const views = sessions.length;

  const byVisitor = new Map();
  for (const s of sessions) {
    const key = s.visitorId || s.id;
    if (!byVisitor.has(key)) byVisitor.set(key, []);
    byVisitor.get(key).push(s);
  }
  const readers = byVisitor.size;
  const returning = [...byVisitor.values()].filter((list) => list.length > 1).length;

  const times = sessions.map((s) => s.activeSeconds || 0).sort((a, b) => a - b);
  const avgTime = views ? times.reduce((a, b) => a + b, 0) / views : 0;
  const medianTime = views ? times[Math.floor(views / 2)] : 0;

  const reached = (pct) => sessions.filter((s) => (s.maxScroll || 0) >= pct).length;
  const finished = reached(90);
  const depth = [
    { key: "25", label: "A quarter of the way", value: reached(25) },
    { key: "50", label: "Halfway", value: reached(50) },
    { key: "75", label: "Three quarters", value: reached(75) },
    { key: "90", label: "To the end", value: finished },
  ];

  const seen = new Map();
  for (const s of sessions) for (const id of new Set(s.blocksSeen || [])) seen.set(id, (seen.get(id) || 0) + 1);
  const blocks = (newsletter?.blocks || [])
    .filter((b) => b.type !== "divider")
    .map((b) => ({ id: b.id, type: b.type, label: blockLabel(b), value: seen.get(b.id) || 0 }));

  const blockById = new Map((newsletter?.blocks || []).map((b) => [b.id, b]));
  const linkMap = new Map();
  let totalClicks = 0;
  let sessionsWithClicks = 0;
  for (const s of sessions) {
    const clicks = s.clicks || [];
    if (clicks.length) sessionsWithClicks += 1;
    for (const c of clicks) {
      totalClicks += 1;
      const entry = linkMap.get(c.url) || { url: c.url, label: linkLabel(c.url, blockById.get(c.blockId)), clicks: 0, readers: new Set() };
      entry.clicks += 1;
      entry.readers.add(s.visitorId);
      linkMap.set(c.url, entry);
    }
  }
  const links = [...linkMap.values()]
    .map((e) => ({ ...e, readers: e.readers.size }))
    .sort((a, b) => b.clicks - a.clicks);

  // One reaction per reader: their most recent choice
  const reactionCounts = new Map(SITE.reactions.map((r) => [r.id, 0]));
  let reacted = 0;
  for (const list of byVisitor.values()) {
    const latest = list
      .filter((s) => s.reaction)
      .sort((a, b) => (toDate(a.startedAt)?.getTime() || 0) - (toDate(b.startedAt)?.getTime() || 0))
      .pop();
    if (latest) {
      reacted += 1;
      reactionCounts.set(latest.reaction, (reactionCounts.get(latest.reaction) || 0) + 1);
    }
  }
  const reactions = SITE.reactions.map((r) => ({ key: r.id, label: `${r.emoji} ${r.label}`, value: reactionCounts.get(r.id) || 0 }));

  const dates = sessions.map((s) => toDate(s.startedAt)).filter(Boolean);
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: hourLabel(h), views: 0 }));
  dates.forEach((d) => {
    hourly[d.getHours()].views += 1;
  });
  const peak = hourly.reduce((best, h) => (h.views > best.views ? h : best), hourly[0]);

  const daily = [];
  if (dates.length) {
    const counts = new Map();
    dates.forEach((d) => counts.set(dayKey(d), (counts.get(dayKey(d)) || 0) + 1));
    const earliest = Math.min(...dates.map((d) => d.getTime()));
    const published = toDate(newsletter?.publishedAt)?.getTime() ?? earliest;
    const first = new Date(Math.min(earliest, published));
    const last = new Date(Math.max(...dates.map((d) => d.getTime())));
    const cursor = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    const end = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    while (cursor <= end && daily.length < 45) {
      daily.push({
        day: cursor.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
        views: counts.get(dayKey(cursor)) || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return {
    views,
    readers,
    returning,
    avgTime,
    medianTime,
    finished,
    depth,
    blocks,
    links,
    totalClicks,
    sessionsWithClicks,
    reacted,
    reactions,
    hourly,
    peakHour: peak.views ? peak.label : null,
    daily,
    devices: tally(sessions.map((s) => s.device), DEVICE_LABELS),
    sources: tally(sessions.map((s) => s.source), SOURCE_LABELS),
  };
}

export function sessionsToCsv(sessions) {
  const header = ["opened_at", "reader_id", "device", "source", "active_seconds", "furthest_scroll_pct", "sections_seen", "link_clicks", "reaction"];
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = sessions.map((s) => [
    toDate(s.startedAt)?.toISOString() ?? "",
    s.visitorId,
    s.device,
    s.source,
    s.activeSeconds ?? 0,
    s.maxScroll ?? 0,
    (s.blocksSeen || []).length,
    (s.clicks || []).length,
    s.reaction ?? "",
  ]);
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadText(filename, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
