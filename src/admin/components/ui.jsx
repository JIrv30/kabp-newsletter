import { useId } from "react";
import {
  CalendarDays,
  Heading,
  Image as ImageIcon,
  Megaphone,
  Minus,
  MousePointerClick,
  Type,
  Video,
} from "lucide-react";
import { percent } from "../../lib/format";

export const BLOCK_ICONS = {
  heading: Heading,
  text: Type,
  image: ImageIcon,
  button: MousePointerClick,
  event: CalendarDays,
  callout: Megaphone,
  video: Video,
  divider: Minus,
};

export const primaryBtn =
  "inline-flex min-h-10 items-center gap-2 rounded-md bg-navy px-4 text-sm font-semibold text-white hover:bg-navy-dark disabled:opacity-50";
export const secondaryBtn =
  "inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-navy hover:border-navy disabled:opacity-50";
export const inputClass =
  "w-full rounded-md border border-line bg-white px-3 py-2.5 text-ink placeholder:text-muted/70 focus:border-navy";

export function StatusPill({ status }) {
  return status === "published" ? (
    <span className="inline-flex items-center rounded-full border border-gold bg-gold-soft px-2.5 py-0.5 text-xs font-bold text-navy">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-bold text-muted">
      Draft
    </span>
  );
}

export function Panel({ title, description, children, className = "", action }) {
  return (
    <section className={`rounded-lg border border-line bg-white p-5 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-navy">{title}</h2>
          {description && <p className="mt-1 max-w-prose text-sm text-muted">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export function TextField({ label, hint, value, onChange, ...rest }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputClass} {...rest} />
    </Field>
  );
}

export function SelectField({ label, value, onChange, options }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function IconButton({ label, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-mist hover:text-navy disabled:pointer-events-none disabled:opacity-30"
      {...rest}
    >
      {children}
    </button>
  );
}

export function BarList({ items, total, emptyText = "Nothing to show yet." }) {
  if (!items.length || !total) return <p className="text-sm text-muted">{emptyText}</p>;
  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const frac = item.value / total;
        return (
          <li key={item.key ?? item.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold">{item.label}</span>
              <span className="shrink-0 text-muted tabular-nums">
                {item.value} <span className="text-muted/80">({percent(frac)})</span>
              </span>
            </div>
            <div className="mt-1 h-2.5 rounded-full bg-mist">
              <div className="h-full rounded-full bg-navy" style={{ width: `${item.value ? Math.max(frac * 100, 2) : 0}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
