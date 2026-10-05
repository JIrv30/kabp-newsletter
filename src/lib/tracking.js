import { useCallback, useEffect, useRef, useState } from "react";
import { arrayUnion, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from "firebase/firestore/lite";
import { db } from "./firebase";
import { SITE } from "../config";

/*
  How reading is measured (no names, emails or IP addresses are stored):

  One "session" document per visit: newsletters/{id}/sessions/{random id}
    visitorId     random id kept on this device, so we can count unique readers
    activeSeconds time the page was on screen and the reader was active (pauses after 45s idle)
    maxScroll     furthest point reached, as a percentage of the page
    blocksSeen    ids of the sections that were at least half on screen for almost a second
    clicks        links pressed, with the section they were in
    reaction      the emoji the reader chose, if any
    source        where they came from (?src=email etc. on the shared link)
    device        mobile / tablet / desktop

  Writes are batched: one when the page opens, then at most one every 20 seconds while
  the reader is active, plus one when they leave or switch app.
*/

const VISITOR_KEY = "kabp-news:visitor";
const OPT_OUT_KEY = "kabp-news:opt-out";
const FLUSH_EVERY_MS = 20000;
const IDLE_AFTER_MS = 45000;
const SEEN_AFTER_MS = 800;
const MAX_SECONDS = 7200;

function randomId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private browsing: carry on without saving */
  }
}

export const isOptedOut = () => readStore(OPT_OUT_KEY) === "1";
export const setOptedOut = (optOut) => writeStore(OPT_OUT_KEY, optOut ? "1" : null);

function visitorId() {
  let id = readStore(VISITOR_KEY);
  if (!id) {
    id = randomId();
    writeStore(VISITOR_KEY, id);
  }
  return id;
}

function detectDevice() {
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectSource() {
  const fromLink = (new URLSearchParams(window.location.search).get("src") || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
  if (fromLink) return fromLink;
  if (!document.referrer) return "direct";
  try {
    const host = new URL(document.referrer).hostname;
    if (host === window.location.hostname) return "archive";
    if (/facebook|fb\./.test(host)) return "facebook";
    if (/instagram/.test(host)) return "instagram";
    if (/google|bing|duckduckgo/.test(host)) return "search";
    return "other";
  } catch {
    return "other";
  }
}

// Remove ?src= from the address bar so a forwarded link doesn't claim to be from the original channel
function tidySourceParam() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("src")) return;
  url.searchParams.delete("src");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

const noop = () => undefined;

export function useReadTracking(newsletterId, { enabled = true } = {}) {
  const sessionRef = useRef(null);
  const queueRef = useRef(Promise.resolve(false));
  const observerRef = useRef(null);
  const elementsRef = useRef(new Set());
  const stateRef = useRef({ seconds: 0, maxScroll: 0, seen: new Set(), unsent: [], dirty: false, lastInput: 0 });
  const [active, setActive] = useState(false);
  const [reaction, setReaction] = useState(() => readStore(`kabp-news:reaction:${newsletterId}`));

  const flush = useCallback((extra) => {
    const ref = sessionRef.current;
    if (!ref) return;
    const s = stateRef.current;
    if (!s.dirty && !extra) return;
    const payload = {
      lastSeenAt: serverTimestamp(),
      activeSeconds: Math.min(s.seconds, MAX_SECONDS),
      maxScroll: s.maxScroll,
      ...extra,
    };
    if (s.unsent.length) {
      payload.blocksSeen = arrayUnion(...s.unsent);
      s.unsent = [];
    }
    s.dirty = false;
    // Writes go one at a time, after the session has been created, so they always arrive in order
    queueRef.current = queueRef.current.then((created) =>
      created ? updateDoc(ref, payload).then(() => true, () => true) : false,
    );
  }, []);

  // Start a session once the newsletter has loaded
  useEffect(() => {
    if (!enabled || !newsletterId || isOptedOut()) return undefined;
    const s = stateRef.current;
    s.lastInput = Date.now();

    const ref = doc(db, "newsletters", newsletterId, "sessions", randomId());
    const source = detectSource();
    tidySourceParam();

    queueRef.current = setDoc(ref, {
      visitorId: visitorId(),
      startedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      expireAt: Timestamp.fromMillis(Date.now() + SITE.retentionDays * 86400000),
      activeSeconds: 0,
      maxScroll: 0,
      blocksSeen: [],
      clicks: [],
      reaction: null,
      source,
      device: detectDevice(),
    }).then(
      () => true,
      () => false,
    );
    sessionRef.current = ref;
    setActive(true);

    const markInput = () => {
      s.lastInput = Date.now();
    };
    const measureScroll = () => {
      const total = document.documentElement.scrollHeight;
      const reached = window.scrollY + window.innerHeight;
      const pct = total <= window.innerHeight ? 100 : Math.min(100, Math.round((reached / total) * 100));
      if (pct > s.maxScroll) {
        s.maxScroll = pct;
        s.dirty = true;
      }
    };
    const onScroll = () => {
      markInput();
      measureScroll();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else markInput();
    };
    const onPageHide = () => flush();

    const ticker = setInterval(() => {
      const visible = document.visibilityState === "visible";
      if (visible && Date.now() - s.lastInput < IDLE_AFTER_MS && s.seconds < MAX_SECONDS) {
        s.seconds += 1;
        s.dirty = true;
      }
    }, 1000);
    const flusher = setInterval(() => flush(), FLUSH_EVERY_MS);
    const settle = setTimeout(measureScroll, 1500);

    const inputEvents = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel"];
    inputEvents.forEach((e) => window.addEventListener(e, markInput, { passive: true }));
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    measureScroll();

    return () => {
      flush();
      clearInterval(ticker);
      clearInterval(flusher);
      clearTimeout(settle);
      inputEvents.forEach((e) => window.removeEventListener(e, markInput));
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      sessionRef.current = null;
      setActive(false);
    };
  }, [newsletterId, enabled, flush]);

  // Watch each section and note it as "seen" once it has been properly on screen
  useEffect(() => {
    if (!active) return undefined;
    const s = stateRef.current;
    const timers = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.dataset.trackId;
          if (!id || s.seen.has(id)) continue;
          const enough =
            entry.isIntersecting &&
            (entry.intersectionRatio >= 0.5 || entry.intersectionRect.height >= window.innerHeight * 0.4);
          if (enough && !timers.has(id)) {
            const target = entry.target;
            timers.set(
              id,
              setTimeout(() => {
                timers.delete(id);
                s.seen.add(id);
                s.unsent.push(id);
                s.dirty = true;
                observer.unobserve(target);
              }, SEEN_AFTER_MS),
            );
          } else if (!enough && timers.has(id)) {
            clearTimeout(timers.get(id));
            timers.delete(id);
          }
        }
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    observerRef.current = observer;
    elementsRef.current.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
      observerRef.current = null;
    };
  }, [active]);

  // Callback ref for each block: ref={(el) => tracking.observe(el, block.id)}
  const observe = useCallback((el, id) => {
    if (!el) return undefined;
    el.dataset.trackId = id;
    elementsRef.current.add(el);
    observerRef.current?.observe(el);
    return () => {
      elementsRef.current.delete(el);
      observerRef.current?.unobserve(el);
    };
  }, []);

  const trackClick = useCallback(
    (blockId, url) => {
      flush({
        clicks: arrayUnion({ blockId: String(blockId).slice(0, 40), url: String(url).slice(0, 500), at: Date.now() }),
      });
    },
    [flush],
  );

  const react = useCallback(
    (id) => {
      setReaction(id);
      writeStore(`kabp-news:reaction:${newsletterId}`, id);
      flush({ reaction: id });
    },
    [flush, newsletterId],
  );

  if (!enabled) return { observe: noop, trackClick: noop, react: setReaction, reaction };
  return { observe, trackClick, react, reaction };
}
