import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { doc, getDoc, serverTimestamp, Timestamp, updateDoc } from "firebase/firestore/lite";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChartColumn,
  Check,
  ChevronDown,
  CircleAlert,
  CopyPlus,
  Copy,
  ExternalLink,
  Monitor,
  Save,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { BLOCK_TYPES, blockLabel, newBlock, safeUrl, shortId } from "../../lib/blocks";
import { SITE } from "../../config";
import NewsletterView from "../../components/NewsletterView";
import { AddBlockMenu, BlockForm, ImageField } from "../components/BlockForm";
import { BLOCK_ICONS, IconButton, Panel, StatusPill, TextField, primaryBtn, secondaryBtn } from "../components/ui";

const plural = (n, one, many) => (n === 1 ? one : many);

function findIssues(nl) {
  const issues = [];
  const blocks = nl.blocks || [];
  if (!nl.title?.trim()) issues.push("Add a title. Parents see it at the top and in the newsletters list.");
  const noAlt =
    blocks.filter((b) => b.type === "image" && b.url && !b.alt?.trim()).length + (nl.coverImage?.url && !nl.coverImage.alt?.trim() ? 1 : 0);
  if (noAlt) issues.push(`${noAlt} ${plural(noAlt, "image needs", "images need")} a description for screen readers.`);
  const buttons = blocks.filter((b) => b.type === "button" && (!b.label?.trim() || !safeUrl(b.url))).length;
  if (buttons) issues.push(`${buttons} ${plural(buttons, "button is", "buttons are")} missing text or a link, so won't show.`);
  const undated = blocks.filter((b) => b.type === "event" && !b.date).length;
  if (undated) issues.push(`${undated} ${plural(undated, "event needs", "events need")} a date.`);
  const empty = blocks.filter(
    (b) => (["heading", "text"].includes(b.type) && !b.text?.trim()) || (["image", "video"].includes(b.type) && !b.url),
  ).length;
  if (empty) issues.push(`${empty} empty ${plural(empty, "block", "blocks")} won't appear.`);
  return issues;
}

function BlockCard({ block, index, total, collapsed, onToggle, onChange, onMove, onDuplicate, onRemove, newsletterId }) {
  const Icon = BLOCK_ICONS[block.type];
  const bodyId = useId();
  return (
    <article className="rounded-lg border border-line bg-white">
      <div className={`flex items-center gap-1 px-2 py-1.5 ${collapsed ? "" : "border-b border-line"}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded px-1 py-1 text-left"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-mist text-navy">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs text-muted">{BLOCK_TYPES[block.type].label}</span>
            <span className="block truncate text-sm font-semibold">{blockLabel(block)}</span>
          </span>
          <ChevronDown aria-hidden="true" className={`ml-auto h-4 w-4 shrink-0 text-muted transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </button>
        <div className="flex shrink-0 items-center">
          <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" />
          </IconButton>
          <IconButton label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown className="h-4 w-4" />
          </IconButton>
          <IconButton label="Duplicate" onClick={onDuplicate}>
            <CopyPlus className="h-4 w-4" />
          </IconButton>
          <IconButton label="Remove" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      {!collapsed && (
        <div id={bodyId} className="p-4">
          <BlockForm block={block} onChange={onChange} newsletterId={newsletterId} />
        </div>
      )}
    </article>
  );
}

function SharePanel({ id }) {
  const [copied, setCopied] = useState(null);
  const base = `${window.location.origin}/n/${id}`;
  const copy = async (key, url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };
  return (
    <Panel
      className="mt-6"
      title="Share links"
      description="Use a different link for each channel. The statistics page can then show where readers came from."
    >
      <ul className="divide-y divide-line">
        {SITE.shareChannels.map((c) => {
          const url = `${base}?src=${c.id}`;
          return (
            <li key={c.id} className="flex items-center gap-3 py-2.5">
              <span className="w-28 shrink-0 text-sm font-semibold">{c.label}</span>
              <code className="min-w-0 flex-1 truncate text-sm text-muted">{url}</code>
              <button type="button" onClick={() => copy(c.id, url)} className={secondaryBtn}>
                {copied === c.id ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                {copied === c.id ? "Copied" : "Copy"}
              </button>
            </li>
          );
        })}
      </ul>
      <a href={`${base}?preview=1`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy underline underline-offset-2">
        <ExternalLink aria-hidden="true" className="h-4 w-4" />
        Open the live page (your visit isn't counted)
      </a>
    </Panel>
  );
}

export default function EditorPage() {
  const { id } = useParams();
  const [nl, setNl] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [view, setView] = useState("edit");
  const [frame, setFrame] = useState("phone");
  const nlRef = useRef(null);
  const edits = useRef(0);

  useEffect(() => {
    nlRef.current = nl;
  }, [nl]);

  useEffect(() => {
    getDoc(doc(db, "newsletters", id))
      .then((snap) => {
        if (!snap.exists()) {
          setLoadError("This newsletter doesn't exist. It may have been deleted.");
          return;
        }
        const data = snap.data();
        setNl({ id: snap.id, ...data, blocks: data.blocks || [] });
        document.title = `Editing ${data.title || "newsletter"} | Staff`;
      })
      .catch(() => setLoadError("The newsletter couldn't be loaded. Check you're online, then refresh."));
  }, [id]);

  const change = useCallback((updater) => {
    edits.current += 1;
    setNl((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
    setDirty(true);
  }, []);

  const setBlocks = (fn) => change((prev) => ({ ...prev, blocks: fn(prev.blocks) }));
  const updateBlock = (blockId, patch) => setBlocks((bs) => bs.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  const insertBlock = (index, type) => setBlocks((bs) => [...bs.slice(0, index), newBlock(type), ...bs.slice(index)]);
  const moveBlock = (index, dir) =>
    setBlocks((bs) => {
      const j = index + dir;
      if (j < 0 || j >= bs.length) return bs;
      const copy = [...bs];
      [copy[index], copy[j]] = [copy[j], copy[index]];
      return copy;
    });
  const duplicateBlock = (index) => setBlocks((bs) => [...bs.slice(0, index + 1), { ...bs[index], id: shortId() }, ...bs.slice(index + 1)]);
  const removeBlock = (index) => {
    if (window.confirm("Remove this block?")) setBlocks((bs) => bs.filter((_, i) => i !== index));
  };
  const toggle = (blockId) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });

  const persist = useCallback(
    async (extra = {}) => {
      const current = nlRef.current;
      if (!current) return false;
      const editsAtStart = edits.current;
      setSaving(true);
      setMessage("");
      try {
        await updateDoc(doc(db, "newsletters", id), {
          title: current.title?.trim() || "",
          subtitle: current.subtitle?.trim() || "",
          coverImage: current.coverImage?.url ? current.coverImage : null,
          blocks: current.blocks,
          updatedAt: serverTimestamp(),
          ...extra,
        });
        if (edits.current === editsAtStart) setDirty(false);
        setSavedAt(new Date());
        return true;
      } catch (e) {
        console.error(e);
        setMessage("Changes couldn't be saved. Check you're online and try again.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [id],
  );

  const publish = async () => {
    if (!nl.title?.trim()) {
      setMessage("Add a title before publishing.");
      return;
    }
    const extra = { status: "published" };
    if (!nl.publishedAt) extra.publishedAt = serverTimestamp();
    if (await persist(extra)) {
      setNl((prev) => ({ ...prev, status: "published", publishedAt: prev.publishedAt || Timestamp.now() }));
    }
  };

  const unpublish = async () => {
    if (!window.confirm("Take this newsletter offline? Anyone with the link will see a 'not available' message until you publish it again.")) return;
    if (await persist({ status: "draft" })) setNl((prev) => ({ ...prev, status: "draft" }));
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        persist();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const issues = useMemo(() => (nl ? findIssues(nl) : []), [nl]);

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <p role="alert" className="text-lg">{loadError}</p>
        <Link to="/admin" className="mt-4 inline-block font-semibold text-navy underline">Back to all newsletters</Link>
      </main>
    );
  }
  if (!nl) return <p className="p-8 text-muted" role="status">Loading newsletter</p>;

  const published = nl.status === "published";
  const statusText = saving
    ? "Saving"
    : dirty
      ? "Unsaved changes"
      : savedAt
        ? `Saved at ${savedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
        : "All changes saved";

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            to="/admin"
            onClick={(e) => dirty && !window.confirm("Leave without saving your changes?") && e.preventDefault()}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            All newsletters
          </Link>
          <StatusPill status={nl.status} />
          <span className="text-sm text-muted" role="status">
            {statusText}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Show" className="inline-flex rounded-md border border-line p-0.5 lg:hidden">
              {["edit", "preview"].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`rounded px-3 py-1.5 text-sm font-semibold ${view === v ? "bg-navy text-white" : "text-navy"}`}
                >
                  {v === "edit" ? "Edit" : "Preview"}
                </button>
              ))}
            </div>
            {nl.publishedAt && (
              <Link to={`/admin/stats/${id}`} className={secondaryBtn}>
                <ChartColumn aria-hidden="true" className="h-4 w-4" />
                Statistics
              </Link>
            )}
            <button type="button" onClick={() => persist()} disabled={saving || !dirty} className={secondaryBtn}>
              <Save aria-hidden="true" className="h-4 w-4" />
              {published ? "Save and update live page" : "Save draft"}
            </button>
            {published ? (
              <button type="button" onClick={unpublish} disabled={saving} className={secondaryBtn}>
                Unpublish
              </button>
            ) : (
              <button type="button" onClick={publish} disabled={saving} className={primaryBtn}>
                <Send aria-hidden="true" className="h-4 w-4" />
                Publish
              </button>
            )}
          </div>
        </div>
        {message && (
          <p role="alert" className="border-t border-line bg-red-soft px-6 py-2 text-sm text-red-text">
            {message}
          </p>
        )}
      </div>

      <div className="mx-auto grid max-w-[90rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
        <div className={view === "preview" ? "hidden lg:block" : ""}>
          <Panel title="Details">
            <div className="space-y-4">
              <TextField label="Title" value={nl.title} onChange={(v) => change({ title: v })} placeholder="For example: Week beginning 5 October" />
              <TextField
                label="Subtitle (optional)"
                value={nl.subtitle}
                onChange={(v) => change({ subtitle: v })}
                placeholder="For example: Parents' evening dates, Year 7 trip and our new library"
              />
              <ImageField
                label="Cover image (optional)"
                newsletterId={id}
                url={nl.coverImage?.url}
                alt={nl.coverImage?.alt}
                onChange={(patch) => change((prev) => ({ ...prev, coverImage: { url: "", alt: "", ...prev.coverImage, ...patch } }))}
              />
            </div>
          </Panel>

          <section className="mt-6" aria-labelledby="content-heading">
            <h2 id="content-heading" className="mb-2 font-display text-lg font-bold text-navy">
              Content
            </h2>
            {nl.blocks.length > 0 && <AddBlockMenu onAdd={(t) => insertBlock(0, t)} />}
            {nl.blocks.map((block, i) => (
              <Fragment key={block.id}>
                <BlockCard
                  block={block}
                  index={i}
                  total={nl.blocks.length}
                  collapsed={collapsed.has(block.id)}
                  onToggle={() => toggle(block.id)}
                  onChange={(patch) => updateBlock(block.id, patch)}
                  onMove={(dir) => moveBlock(i, dir)}
                  onDuplicate={() => duplicateBlock(i)}
                  onRemove={() => removeBlock(i)}
                  newsletterId={id}
                />
                {i < nl.blocks.length - 1 && <AddBlockMenu onAdd={(t) => insertBlock(i + 1, t)} />}
              </Fragment>
            ))}
            <div className="mt-3">
              <AddBlockMenu variant="panel" onAdd={(t) => insertBlock(nl.blocks.length, t)} />
            </div>
          </section>

          {issues.length > 0 && (
            <Panel className="mt-6" title="Before you publish">
              <ul className="space-y-2">
                {issues.map((issue) => (
                  <li key={issue} className="flex items-start gap-2 text-sm">
                    <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-crest-red" />
                    {issue}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {published && <SharePanel id={id} />}
        </div>

        <div className={view === "edit" ? "hidden lg:block" : ""}>
          <div className="lg:sticky lg:top-24">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-navy">Preview</h2>
              <div role="group" aria-label="Preview size" className="inline-flex rounded-md border border-line bg-white p-0.5">
                {[
                  { key: "phone", label: "Phone", Icon: Smartphone },
                  { key: "wide", label: "Wide", Icon: Monitor },
                ].map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={frame === key}
                    onClick={() => setFrame(key)}
                    className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-semibold ${frame === key ? "bg-navy text-white" : "text-navy"}`}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto rounded-xl border border-line bg-mist lg:max-h-[calc(100dvh-8rem)]">
              <div className="mx-auto bg-white shadow-sm" style={{ maxWidth: frame === "phone" ? 390 : "none" }}>
                <NewsletterView newsletter={nl} preview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
