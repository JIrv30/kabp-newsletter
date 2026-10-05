import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { collection, doc, getDoc, getDocs } from "firebase/firestore/lite";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Download, ExternalLink, Pencil, RefreshCw } from "lucide-react";
import { db } from "../../lib/firebase";
import { duration, longDate, percent } from "../../lib/format";
import { downloadText, sessionsToCsv, summarise } from "../analytics";
import { BLOCK_ICONS, BarList, Panel, StatusPill, secondaryBtn } from "../components/ui";

const AXIS = { fontSize: 12, fill: "#4b5878" };
const TOOLTIP = { borderRadius: 8, borderColor: "#d6deec" };

function Kpi({ value, label, note }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="font-display text-3xl font-extrabold text-navy tabular-nums">{value}</p>
      <p className="mt-1 font-semibold">{label}</p>
      {note && <p className="mt-0.5 text-sm text-muted">{note}</p>}
    </div>
  );
}

function SectionReach({ blocks, views }) {
  if (!blocks.length) return <p className="text-sm text-muted">This newsletter has no sections.</p>;
  return (
    <ol className="divide-y divide-line">
      {blocks.map((b) => {
        const Icon = BLOCK_ICONS[b.type];
        const frac = views ? b.value / views : 0;
        return (
          <li key={b.id} className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[2rem_minmax(0,1.2fr)_minmax(8rem,1fr)_5.5rem]">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-mist text-navy">
              <Icon aria-hidden="true" className="h-4 w-4" />
            </span>
            <span className="truncate text-sm font-semibold">{b.label}</span>
            <div className="col-start-2 h-3 rounded-full bg-mist sm:col-start-auto">
              <div className="h-full rounded-full bg-navy" style={{ width: `${frac * 100}%` }} />
            </div>
            <span className="col-start-2 text-sm text-muted tabular-nums sm:col-start-auto sm:text-right">
              <span className="font-semibold text-ink">{percent(frac)}</span> ({b.value})
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function AnalyticsPage() {
  const { id } = useParams();
  const [nl, setNl] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState(null);

  const load = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const [nSnap, sSnap] = await Promise.all([
        getDoc(doc(db, "newsletters", id)),
        getDocs(collection(db, "newsletters", id, "sessions")),
      ]);
      if (!nSnap.exists()) {
        setError("This newsletter doesn't exist. It may have been deleted.");
        return;
      }
      setNl({ id: nSnap.id, ...nSnap.data() });
      setSessions(sSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadedAt(new Date());
      document.title = `Statistics: ${nSnap.data().title || "newsletter"} | Staff`;
    } catch (e) {
      console.error(e);
      setError("Statistics couldn't be loaded. Check you're online and try again.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const s = useMemo(() => (nl && sessions ? summarise(sessions, nl) : null), [nl, sessions]);

  const exportCsv = () => {
    const slug = (nl.title || "newsletter").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    downloadText(`reading-stats-${slug}.csv`, sessionsToCsv(sessions));
  };

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p role="alert" className="text-lg">{error}</p>
        <Link to="/admin" className="mt-4 inline-block font-semibold text-navy underline">Back to all newsletters</Link>
      </main>
    );
  }
  if (!s) return <p className="p-8 text-muted" role="status">Loading statistics</p>;

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        All newsletters
      </Link>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy">{nl.title || "Untitled newsletter"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
            <StatusPill status={nl.status} />
            {nl.publishedAt && <span>Published {longDate(nl.publishedAt)}</span>}
            {loadedAt && <span>Figures as of {loadedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className={secondaryBtn}>
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
            Refresh
          </button>
          <button type="button" onClick={exportCsv} disabled={!s.views} className={secondaryBtn}>
            <Download aria-hidden="true" className="h-4 w-4" />
            Download CSV
          </button>
          <Link to={`/admin/edit/${id}`} className={secondaryBtn}>
            <Pencil aria-hidden="true" className="h-4 w-4" />
            Edit
          </Link>
          {nl.status === "published" && (
            <a href={`/n/${id}?preview=1`} target="_blank" rel="noreferrer" className={secondaryBtn}>
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              Open
            </a>
          )}
        </div>
      </div>

      {!s.views ? (
        <Panel className="mt-6" title="No readers yet">
          <p className="text-muted">
            Share the newsletter using the links on its edit page. Visits show up here within a minute of someone opening it.
          </p>
        </Panel>
      ) : (
        <>
          <section aria-label="Summary" className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
            <Kpi value={s.views} label="Views" note="Times the newsletter was opened" />
            <Kpi value={s.readers} label="Readers" note={`${s.returning} came back more than once`} />
            <Kpi value={duration(s.avgTime)} label="Average reading time" note={`Typical visit: ${duration(s.medianTime)}`} />
            <Kpi value={percent(s.finished / s.views)} label="Read to the end" note={`${s.finished} of ${s.views} visits`} />
            <Kpi value={s.totalClicks} label="Link clicks" note={`${percent(s.sessionsWithClicks / s.views)} of visits clicked something`} />
            <Kpi value={s.reacted} label="Reactions" note={`${percent(s.reacted / s.readers)} of readers responded`} />
          </section>

          <Panel
            className="mt-6"
            title="Which sections were seen"
            description="In newsletter order. A section counts as seen once most of it has been on screen for about a second, so a sharp drop shows where people stop reading."
          >
            <SectionReach blocks={s.blocks} views={s.views} />
          </Panel>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Panel title="Views by day" description="From the day it was published.">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.daily} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#d6deec" />
                    <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={{ stroke: "#d6deec" }} />
                    <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
                    <Tooltip cursor={{ fill: "#eef2f9" }} contentStyle={TOOLTIP} />
                    <Bar dataKey="views" name="Views" fill="#13377e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel
              title="When people read"
              description={s.peakHour ? `Busiest hour: ${s.peakHour}, shown in gold. Useful for choosing when to send next week's newsletter.` : undefined}
            >
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.hourly} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#d6deec" />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "#d6deec" }} interval={2} />
                    <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
                    <Tooltip cursor={{ fill: "#eef2f9" }} contentStyle={TOOLTIP} />
                    <Bar dataKey="views" name="Views" radius={[3, 3, 0, 0]}>
                      {s.hourly.map((h) => (
                        <Cell key={h.hour} fill={h.label === s.peakHour ? "#fdb950" : "#13377e"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="How far people read" description="Share of visits that scrolled at least this far down the page.">
              <BarList items={s.depth} total={s.views} />
            </Panel>

            <Panel title="Links clicked" description="Every link, button and 'Add to calendar' press.">
              {s.links.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-muted">
                      <tr>
                        <th scope="col" className="pb-2 font-semibold">Link</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Clicks</th>
                        <th scope="col" className="pb-2 text-right font-semibold">Readers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {s.links.map((l) => (
                        <tr key={l.url}>
                          <td className="max-w-[18rem] truncate py-2 pr-3 font-semibold" title={l.url}>
                            {l.label}
                          </td>
                          <td className="py-2 text-right tabular-nums">{l.clicks}</td>
                          <td className="py-2 text-right tabular-nums">{l.readers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted">No links have been clicked yet.</p>
              )}
            </Panel>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <Panel title="Where readers came from" description="Based on which share link they used.">
              <BarList items={s.sources} total={s.views} />
            </Panel>
            <Panel title="Devices">
              <BarList items={s.devices} total={s.views} />
            </Panel>
            <Panel title="Reactions" description="Each reader's latest choice.">
              <BarList items={s.reactions} total={s.reacted} emptyText="No one has reacted yet." />
            </Panel>
          </div>
        </>
      )}
    </main>
  );
}
