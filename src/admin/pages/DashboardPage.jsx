import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  addDoc,
  average,
  collection,
  count,
  deleteDoc,
  doc,
  getAggregate,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore/lite";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartColumn, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "../../lib/firebase";
import { newBlock, shortId } from "../../lib/blocks";
import { duration, shortDate, toDate } from "../../lib/format";
import { useAuth } from "../AuthProvider";
import { IconButton, Panel, StatusPill, primaryBtn } from "../components/ui";

const AXIS = { fontSize: 12, fill: "#4b5878" };

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(null);
  const [stats, setStats] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const snap = await getDocs(query(collection(db, "newsletters"), orderBy("updatedAt", "desc"), limit(200)));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(list);
      // Count and average are worked out on the server, so this stays cheap however many readers there are
      const entries = await Promise.all(
        list
          .filter((n) => n.publishedAt)
          .map(async (n) => {
            try {
              const agg = await getAggregate(collection(db, "newsletters", n.id, "sessions"), {
                views: count(),
                avgTime: average("activeSeconds"),
              });
              return [n.id, agg.data()];
            } catch {
              return [n.id, null];
            }
          }),
      );
      setStats(Object.fromEntries(entries));
    } catch (e) {
      console.error(e);
      setError("Newsletters couldn't be loaded. Check you're online, then refresh the page.");
    }
  }, []);

  useEffect(() => {
    document.title = "Newsletters | Staff";
    load();
  }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, "newsletters"), {
        title: "",
        subtitle: "",
        coverImage: null,
        blocks: [newBlock("heading"), newBlock("text")],
        status: "draft",
        publishedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.email,
      });
      navigate(`/admin/edit/${ref.id}`);
    } catch {
      setError("A new newsletter couldn't be created. Check you're online and try again.");
      setBusy(false);
    }
  };

  const duplicate = async (n) => {
    const ref = await addDoc(collection(db, "newsletters"), {
      title: n.title ? `${n.title} (copy)` : "",
      subtitle: n.subtitle || "",
      coverImage: n.coverImage || null,
      blocks: (n.blocks || []).map((b) => ({ ...b, id: shortId() })),
      status: "draft",
      publishedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user.email,
    });
    navigate(`/admin/edit/${ref.id}`);
  };

  const remove = async (n) => {
    const name = n.title || "Untitled newsletter";
    if (!window.confirm(`Delete "${name}" and all of its reading statistics? This can't be undone.`)) return;
    try {
      const sessions = await getDocs(collection(db, "newsletters", n.id, "sessions"));
      for (let i = 0; i < sessions.docs.length; i += 450) {
        const batch = writeBatch(db);
        sessions.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      await deleteDoc(doc(db, "newsletters", n.id));
      setItems((list) => list.filter((x) => x.id !== n.id));
    } catch {
      setError(`"${name}" couldn't be deleted. Try again.`);
    }
  };

  const trend = useMemo(
    () =>
      (items || [])
        .filter((n) => n.publishedAt && stats[n.id])
        .sort((a, b) => toDate(a.publishedAt) - toDate(b.publishedAt))
        .slice(-10)
        .map((n) => ({
          name: shortDate(n.publishedAt).replace(/ \d{4}$/, ""),
          title: n.title || "Untitled newsletter",
          views: stats[n.id].views,
          avg: Math.round(stats[n.id].avgTime || 0),
        })),
    [items, stats],
  );

  return (
    <main className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-navy">Newsletters</h1>
        <button type="button" onClick={create} disabled={busy} className={primaryBtn}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          New newsletter
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-md border-l-4 border-crest-red bg-red-soft p-3 text-sm">
          {error}
        </p>
      )}

      {trend.length > 1 && (
        <Panel
          className="mt-6"
          title="Views per issue"
          description="The last ten published newsletters. Hover over a bar for the average reading time."
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#d6deec" />
                <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={{ stroke: "#d6deec" }} />
                <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  cursor={{ fill: "#eef2f9" }}
                  contentStyle={{ borderRadius: 8, borderColor: "#d6deec" }}
                  labelFormatter={(_, p) => p?.[0]?.payload?.title}
                  formatter={(value, _name, p) => [`${value} views, ${duration(p.payload.avg)} average`, ""]}
                  separator=""
                />
                <Bar dataKey="views" fill="#13377e" radius={[3, 3, 0, 0]} maxBarSize={72} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-white">
        {items === null && !error && (
          <p className="p-6 text-muted" role="status">
            Loading newsletters
          </p>
        )}
        {items?.length === 0 && (
          <div className="p-8">
            <h2 className="font-display text-xl font-bold text-navy">No newsletters yet</h2>
            <p className="mt-1 text-muted">Create the first one and it will appear here, with its reading statistics once it's published.</p>
          </div>
        )}
        {items?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left">
              <thead className="border-b border-line bg-mist/60 text-sm text-muted">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Newsletter</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Published</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Views</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Average time</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((n) => {
                  const s = stats[n.id];
                  return (
                    <tr key={n.id} className="hover:bg-mist/40">
                      <td className="max-w-[26rem] px-5 py-3">
                        <Link to={`/admin/edit/${n.id}`} className="font-semibold text-navy hover:underline">
                          {n.title || "Untitled newsletter"}
                        </Link>
                        {n.subtitle && <p className="truncate text-sm text-muted">{n.subtitle}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={n.status} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-muted">{shortDate(n.publishedAt) || "Not yet"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{s ? s.views : ""}</td>
                      <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">{s?.views ? duration(s.avgTime) : ""}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          <IconButton label="Edit" onClick={() => navigate(`/admin/edit/${n.id}`)}>
                            <Pencil className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Statistics" disabled={!n.publishedAt} onClick={() => navigate(`/admin/stats/${n.id}`)}>
                            <ChartColumn className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Copy as a new draft" onClick={() => duplicate(n)}>
                            <Copy className="h-4 w-4" />
                          </IconButton>
                          <IconButton label="Delete" onClick={() => remove(n)}>
                            <Trash2 className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
