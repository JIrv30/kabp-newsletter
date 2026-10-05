import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore/lite";
import { db } from "../lib/firebase";
import Masthead from "../components/Masthead";
import { SiteFooter } from "../components/NewsletterView";
import { longDate, monthYear, shortDate } from "../lib/format";
import { SITE } from "../config";

export default function ArchivePage() {
  const [state, setState] = useState({ status: "loading", items: [] });

  useEffect(() => {
    document.title = `Newsletters | ${SITE.schoolName}`;
    const q = query(
      collection(db, "newsletters"),
      where("status", "==", "published"),
      orderBy("publishedAt", "desc"),
      limit(80),
    );
    getDocs(q)
      .then((snap) => setState({ status: "ready", items: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }))
      .catch((e) => {
        console.error(e);
        setState({ status: "error", items: [] });
      });
  }, []);

  const [latest, ...older] = state.items;
  const groups = useMemo(() => {
    const map = new Map();
    for (const item of older) {
      const key = monthYear(item.publishedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()];
  }, [older]);

  return (
    <div className="@container flex min-h-dvh flex-col">
      <Masthead
        title="News for parents and carers"
        subtitle="Weekly updates, dates for the diary and reminders from school."
        ribbon={SITE.values}
        homeLink={false}
      />

      <main className="mx-auto w-full max-w-[44rem] flex-1 px-5 pt-10 pb-16 @xl:px-8">
        {state.status === "loading" && <p className="text-muted" role="status">Loading newsletters</p>}
        {state.status === "error" && (
          <p className="text-red-text">The newsletters couldn't be loaded. Check your connection and refresh the page.</p>
        )}
        {state.status === "ready" && !latest && <p className="text-muted">The first newsletter will appear here soon.</p>}

        {latest && (
          <section aria-label="Latest newsletter">
            <Link to={`/n/${latest.id}`} className="group block rounded-xl border-2 border-navy p-5 hover:bg-mist @xl:p-7">
              {latest.coverImage?.url && (
                <img src={latest.coverImage.url} alt="" className="mb-5 aspect-[16/7] w-full rounded-lg object-cover" />
              )}
              <p className="text-sm font-semibold text-muted">Latest, {longDate(latest.publishedAt)}</p>
              <h2 className="mt-1 font-display text-3xl leading-tight font-bold text-navy group-hover:underline">
                {latest.title}
              </h2>
              {latest.subtitle && <p className="mt-2 text-lg text-muted">{latest.subtitle}</p>}
            </Link>
          </section>
        )}

        {groups.map(([month, items]) => (
          <section key={month} className="mt-12">
            <h2 className="border-b-2 border-gold pb-2 font-display text-xl font-bold text-navy">{month}</h2>
            <ul>
              {items.map((item) => (
                <li key={item.id} className="border-b border-line">
                  <Link to={`/n/${item.id}`} className="group flex flex-col gap-1 py-4 @lg:flex-row @lg:gap-6">
                    <span className="shrink-0 text-muted @lg:w-28">{shortDate(item.publishedAt)}</span>
                    <span>
                      <span className="block font-semibold text-navy group-hover:underline">{item.title}</span>
                      {item.subtitle && <span className="block text-muted">{item.subtitle}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
