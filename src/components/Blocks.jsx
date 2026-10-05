import Markdown from "react-markdown";
import { CalendarPlus, Clock, MapPin } from "lucide-react";
import { safeUrl, youTubeId } from "../lib/blocks";
import { downloadEventIcs } from "../lib/ics";
import { parseLocalDate, schoolTime } from "../lib/format";
import { SITE } from "../config";

function TrackedLink({ href, children, onTrack, className = "" }) {
  const url = safeUrl(href);
  if (!url) return <span>{children}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => onTrack?.(url)} className={className}>
      {children}
    </a>
  );
}

const linkStyle =
  "font-semibold text-navy underline decoration-gold decoration-2 underline-offset-4 hover:decoration-navy";

export function RichText({ text, onLink }) {
  if (!text?.trim()) return null;
  return (
    <div className="space-y-4 text-[1.0625rem] leading-[1.7]">
      <Markdown
        components={{
          a: ({ href, children }) => (
            <TrackedLink href={href} onTrack={onLink} className={linkStyle}>
              {children}
            </TrackedLink>
          ),
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc space-y-1.5 pl-6 marker:text-garter">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1.5 pl-6 marker:text-muted">{children}</ol>,
          h1: ({ children }) => <p className="font-bold">{children}</p>,
          h2: ({ children }) => <p className="font-bold">{children}</p>,
          h3: ({ children }) => <p className="font-bold">{children}</p>,
          img: () => null,
          blockquote: ({ children }) => <blockquote className="border-l-4 border-line pl-4 italic">{children}</blockquote>,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}

function EventBlock({ block, track }) {
  const day = parseLocalDate(block.date);
  const time = block.start ? [schoolTime(block.start), schoolTime(block.end)].filter(Boolean).join(" to ") : "";
  return (
    <section className="flex gap-4 rounded-lg border border-line p-4 @xl:gap-5 @xl:p-5">
      {day && (
        <div aria-hidden="true" className="w-16 shrink-0 self-start overflow-hidden rounded-md border-2 border-navy text-center">
          <div className="bg-navy py-1 text-xs font-bold text-white">
            {day.toLocaleDateString("en-GB", { month: "short" })}
          </div>
          <div className="pt-1.5 font-display text-3xl leading-none font-extrabold text-navy">{day.getDate()}</div>
          <div className="pb-1.5 text-xs text-muted">{day.toLocaleDateString("en-GB", { weekday: "short" })}</div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xl leading-snug font-bold text-ink">{block.title || "Event"}</h3>
        <div className="mt-1.5 space-y-1 text-muted">
          {day && (
            <p className="flex items-start gap-2">
              <Clock aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
              <span>
                {day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                {time && `, ${time}`}
              </span>
            </p>
          )}
          {block.location && (
            <p className="flex items-start gap-2">
              <MapPin aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
              <span>{block.location}</span>
            </p>
          )}
        </div>
        {block.details && (
          <div className="mt-3">
            <RichText text={block.details} onLink={track} />
          </div>
        )}
        {day && (
          <button
            type="button"
            onClick={() => {
              track(`calendar:${block.title || block.date}`);
              downloadEventIcs(block, SITE.schoolName);
            }}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-navy px-4 font-semibold text-navy hover:bg-mist"
          >
            <CalendarPlus aria-hidden="true" className="h-4 w-4" />
            Add to calendar
          </button>
        )}
      </div>
    </section>
  );
}

const calloutTones = {
  info: { box: "bg-mist border-garter", title: "text-navy" },
  important: { box: "bg-red-soft border-crest-red", title: "text-red-text" },
  celebrate: { box: "bg-gold-soft border-gold", title: "text-navy" },
};

function VideoBlock({ block, track }) {
  const id = youTubeId(block.url);
  const url = safeUrl(block.url);
  return (
    <figure>
      {id ? (
        <div className="aspect-video overflow-hidden rounded-lg bg-mist">
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={block.caption || "Video"}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : url ? (
        <TrackedLink href={url} onTrack={track} className={linkStyle}>
          Watch the video
        </TrackedLink>
      ) : null}
      {block.caption && <figcaption className="mt-2 text-sm text-muted">{block.caption}</figcaption>}
    </figure>
  );
}

export function Block({ block, onLink }) {
  const track = (url) => onLink?.(block.id, url);

  switch (block.type) {
    case "heading":
      return block.text ? (
        <h2 className="mt-4 font-display text-[1.625rem] leading-tight font-bold text-balance text-navy @xl:text-3xl">
          {block.text}
        </h2>
      ) : null;

    case "text":
      return <RichText text={block.text} onLink={track} />;

    case "image":
      return block.url ? (
        <figure>
          <img src={block.url} alt={block.alt || ""} loading="lazy" className="w-full rounded-lg" />
          {block.caption && <figcaption className="mt-2 text-sm text-muted">{block.caption}</figcaption>}
        </figure>
      ) : null;

    case "button": {
      const url = safeUrl(block.url);
      if (!url || !block.label) return null;
      const style =
        block.style === "secondary"
          ? "border-2 border-navy text-navy hover:bg-mist"
          : "bg-navy text-white hover:bg-navy-dark";
      return (
        <div>
          <TrackedLink
            href={url}
            onTrack={track}
            className={`inline-flex min-h-12 w-full items-center justify-center rounded-md px-6 text-center font-semibold @md:w-auto ${style}`}
          >
            {block.label}
          </TrackedLink>
        </div>
      );
    }

    case "event":
      return <EventBlock block={block} track={track} />;

    case "callout": {
      const tone = calloutTones[block.tone] || calloutTones.info;
      if (!block.title && !block.text) return null;
      return (
        <aside className={`rounded-r-lg border-l-4 px-5 py-4 ${tone.box}`}>
          {block.title && <h3 className={`mb-2 font-display text-lg font-bold ${tone.title}`}>{block.title}</h3>}
          <RichText text={block.text} onLink={track} />
        </aside>
      );
    }

    case "video":
      return <VideoBlock block={block} track={track} />;

    case "divider":
      return (
        <div className="flex justify-center py-2" role="separator">
          <span className="h-1 w-14 rounded-full bg-gold" />
        </div>
      );

    default:
      return null;
  }
}
