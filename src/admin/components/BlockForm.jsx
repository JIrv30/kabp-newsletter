import { useEffect, useId, useRef, useState } from "react";
import { Bold, Image as ImageIcon, Italic, Link2, List, Plus, Upload } from "lucide-react";
import { BLOCK_ORDER, BLOCK_TYPES } from "../../lib/blocks";
import { storage, uploadImage } from "../staffFirebase";
import { BLOCK_ICONS, Field, IconButton, SelectField, TextField, secondaryBtn } from "./ui";

export function MarkdownField({ label, value = "", onChange, rows = 6, placeholder }) {
  const id = useId();
  const ref = useRef(null);

  const replaceSelection = (build) => {
    const el = ref.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { text, selectFrom, selectTo } = build(value.slice(start, end));
    onChange(value.slice(0, start) + text + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + selectFrom, start + selectTo);
    });
  };

  const wrap = (marker, fallback) =>
    replaceSelection((sel) => {
      const inner = sel || fallback;
      return { text: `${marker}${inner}${marker}`, selectFrom: marker.length, selectTo: marker.length + inner.length };
    });

  const link = () => {
    const url = window.prompt("Link address, for example https://www.example.org");
    if (!url) return;
    replaceSelection((sel) => {
      const inner = sel || "link text";
      return { text: `[${inner}](${url.trim()})`, selectFrom: 1, selectTo: 1 + inner.length };
    });
  };

  const bullets = () =>
    replaceSelection((sel) => {
      const lines = (sel || "List item").split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`));
      const text = lines.join("\n");
      return { text, selectFrom: 0, selectTo: text.length };
    });

  return (
    <Field label={label} htmlFor={id} hint="Leave a blank line between paragraphs.">
      <div className="rounded-md border border-line focus-within:border-navy focus-within:ring-2 focus-within:ring-garter">
        <div className="flex gap-0.5 border-b border-line bg-mist/60 p-1" role="toolbar" aria-label="Text formatting">
          <IconButton label="Bold" onClick={() => wrap("**", "bold text")}>
            <Bold className="h-4 w-4" />
          </IconButton>
          <IconButton label="Italic" onClick={() => wrap("*", "italic text")}>
            <Italic className="h-4 w-4" />
          </IconButton>
          <IconButton label="Add a link" onClick={link}>
            <Link2 className="h-4 w-4" />
          </IconButton>
          <IconButton label="Bulleted list" onClick={bullets}>
            <List className="h-4 w-4" />
          </IconButton>
        </div>
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full resize-y rounded-b-md px-3 py-2.5 leading-relaxed focus:outline-none"
        />
      </div>
    </Field>
  );
}

export function ImageField({ newsletterId, url, alt, onChange, label = "Image" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      onChange({ url: await uploadImage(file, newsletterId) });
    } catch (err) {
      setError(err.message || "The upload didn't finish. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        {url ? (
          <img src={url} alt="" className="h-20 w-28 shrink-0 rounded-md border border-line bg-mist object-cover" />
        ) : (
          <div className="grid h-20 w-28 shrink-0 place-items-center rounded-md border border-dashed border-line text-muted">
            <ImageIcon aria-hidden="true" className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          <TextField label={`${label} web address`} value={url} onChange={(v) => onChange({ url: v.trim() })} placeholder="https://" inputMode="url" />
          {storage && (
            <>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={secondaryBtn}>
                <Upload aria-hidden="true" className="h-4 w-4" />
                {uploading ? "Uploading" : "Upload from this device"}
              </button>
            </>
          )}
        </div>
      </div>
      <TextField
        label="Description for screen readers"
        hint="Say what the picture shows, for example: Year 9 students at the science fair."
        value={alt}
        onChange={(v) => onChange({ alt: v })}
      />
      {error && (
        <p role="alert" className="text-sm text-red-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function BlockForm({ block, onChange, newsletterId }) {
  const set = (key) => (value) => onChange({ [key]: value });

  switch (block.type) {
    case "heading":
      return <TextField label="Heading" value={block.text} onChange={set("text")} placeholder="For example: Dates for the diary" />;

    case "text":
      return <MarkdownField label="Text" value={block.text} onChange={set("text")} />;

    case "image":
      return (
        <div className="space-y-3">
          <ImageField newsletterId={newsletterId} url={block.url} alt={block.alt} onChange={onChange} />
          <TextField label="Caption (optional)" value={block.caption} onChange={set("caption")} />
        </div>
      );

    case "button":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Button text" value={block.label} onChange={set("label")} placeholder="For example: Book a parents' evening slot" />
          <TextField label="Link" value={block.url} onChange={set("url")} placeholder="https://" inputMode="url" />
          <SelectField
            label="Style"
            value={block.style}
            onChange={set("style")}
            options={[
              { value: "primary", label: "Solid navy" },
              { value: "secondary", label: "Outline" },
            ]}
          />
        </div>
      );

    case "event":
      return (
        <div className="space-y-3">
          <TextField label="Event name" value={block.title} onChange={set("title")} placeholder="For example: Year 11 parents' evening" />
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField label="Date" type="date" value={block.date} onChange={set("date")} />
            <TextField label="Starts (optional)" type="time" value={block.start} onChange={set("start")} />
            <TextField label="Ends (optional)" type="time" value={block.end} onChange={set("end")} />
          </div>
          <TextField label="Where (optional)" value={block.location} onChange={set("location")} placeholder="For example: Main hall" />
          <MarkdownField label="Details (optional)" rows={3} value={block.details} onChange={set("details")} />
        </div>
      );

    case "callout":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Colour"
              value={block.tone}
              onChange={set("tone")}
              options={[
                { value: "info", label: "Blue: for information" },
                { value: "important", label: "Red: important or urgent" },
                { value: "celebrate", label: "Gold: celebrations and praise" },
              ]}
            />
            <TextField label="Title (optional)" value={block.title} onChange={set("title")} />
          </div>
          <MarkdownField label="Text" rows={4} value={block.text} onChange={set("text")} />
        </div>
      );

    case "video":
      return (
        <div className="space-y-3">
          <TextField
            label="YouTube link"
            hint="YouTube videos play inside the newsletter. Other links show as a 'Watch the video' link."
            value={block.url}
            onChange={set("url")}
            placeholder="https://www.youtube.com/watch?v="
            inputMode="url"
          />
          <TextField label="Caption (optional)" value={block.caption} onChange={set("caption")} />
        </div>
      );

    case "divider":
      return <p className="text-sm text-muted">A short gold line to separate sections. Nothing to fill in.</p>;

    default:
      return null;
  }
}

function TypeButtons({ onPick, compact = false }) {
  return BLOCK_ORDER.map((type) => {
    const Icon = BLOCK_ICONS[type];
    return (
      <button
        key={type}
        type="button"
        onClick={() => onPick(type)}
        className={`flex items-center gap-2 rounded-md text-left text-sm font-semibold text-ink hover:bg-mist ${
          compact ? "px-2.5 py-2" : "border border-line px-3 py-2.5 hover:border-navy"
        }`}
      >
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-navy" />
        {BLOCK_TYPES[type].label}
      </button>
    );
  });
}

export function AddBlockMenu({ onAdd, variant = "inline" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (variant === "panel") {
    return (
      <div className="rounded-lg border-2 border-dashed border-line bg-white/60 p-4">
        <p className="mb-3 text-sm font-semibold text-ink">Add a block at the end</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <TypeButtons onPick={onAdd} />
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative flex justify-center py-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-muted opacity-60 hover:bg-white hover:text-navy hover:opacity-100 focus-visible:opacity-100"
      >
        <Plus aria-hidden="true" className="h-3.5 w-3.5" />
        Insert block here
      </button>
      {open && (
        <div className="absolute top-full z-20 mt-1 grid w-72 grid-cols-2 gap-0.5 rounded-lg border border-line bg-white p-1.5 shadow-lg">
          <TypeButtons
            compact
            onPick={(type) => {
              onAdd(type);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

