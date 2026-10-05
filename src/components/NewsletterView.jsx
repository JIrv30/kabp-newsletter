import { useId, useState } from "react";
import { Link } from "react-router";
import Masthead from "./Masthead";
import { Block } from "./Blocks";
import { SITE } from "../config";
import { longDate } from "../lib/format";
import { isOptedOut, setOptedOut } from "../lib/tracking";

const PREVIEW_TRACKING = { observe: () => undefined, trackClick: () => {}, react: () => {}, reaction: null };

function Reactions({ tracking, disabled }) {
  const headingId = useId();
  const [local, setLocal] = useState(null);
  const chosen = disabled ? local : tracking.reaction;
  const choose = disabled ? setLocal : tracking.react;

  return (
    <section aria-labelledby={headingId} className="mt-14 rounded-xl bg-mist p-5 @xl:p-6">
      <h2 id={headingId} className="font-display text-xl font-bold text-navy">
        Was this newsletter useful?
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {SITE.reactions.map((r) => {
          const pressed = chosen === r.id;
          return (
            <button
              key={r.id}
              type="button"
              aria-pressed={pressed}
              onClick={() => choose(r.id)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors ${
                pressed ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:border-navy"
              }`}
            >
              <span aria-hidden="true" className="text-lg">
                {r.emoji}
              </span>
              {r.label}
            </button>
          );
        })}
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm text-muted">
        {chosen ? "Thank you for letting us know." : ""}
      </p>
    </section>
  );
}

function PrivacyNote() {
  const [optedOut, setState] = useState(isOptedOut);
  const toggle = () => {
    setOptedOut(!optedOut);
    setState(!optedOut);
  };
  return (
    <p>
      We count visits anonymously so we can see which parts of the newsletter are most useful. No names or contact
      details are recorded.{" "}
      <button type="button" onClick={toggle} className="font-semibold text-navy underline underline-offset-2">
        {optedOut ? "Count my visits again" : "Don't count my visits"}
      </button>
      {optedOut && <span> (saved on this device)</span>}
    </p>
  );
}

export function SiteFooter({ preview = false }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-[44rem] space-y-4 px-5 py-8 text-sm text-muted @xl:px-8">
        <p className="font-display text-base font-semibold text-navy italic">{SITE.values}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {preview ? <span>Past newsletters</span> : <Link to="/" className="font-semibold text-navy underline underline-offset-2">Past newsletters</Link>}
          {SITE.schoolWebsite && (
            <a href={SITE.schoolWebsite} className="font-semibold text-navy underline underline-offset-2">
              School website
            </a>
          )}
        </div>
        {!preview && <PrivacyNote />}
      </div>
    </footer>
  );
}

export default function NewsletterView({ newsletter, tracking = PREVIEW_TRACKING, preview = false }) {
  const blocks = newsletter.blocks || [];
  const cover = newsletter.coverImage;
  const ribbon = newsletter.publishedAt ? longDate(newsletter.publishedAt) : "Draft preview";

  return (
    <div className="@container min-h-full bg-white">
      <Masthead
        title={newsletter.title || "Untitled newsletter"}
        subtitle={newsletter.subtitle}
        ribbon={ribbon}
        homeLink={!preview}
      />
      <main className="mx-auto max-w-[44rem] px-5 pt-8 pb-14 @xl:px-8">
        {cover?.url && (
          <img src={cover.url} alt={cover.alt || ""} className="mb-10 w-full rounded-lg" />
        )}
        <div className="flex flex-col gap-7">
          {blocks.map((block) => (
            <div key={block.id} ref={(el) => tracking.observe(el, block.id)}>
              <Block block={block} onLink={tracking.trackClick} />
            </div>
          ))}
        </div>
        <Reactions tracking={tracking} disabled={preview} />
      </main>
      <SiteFooter preview={preview} />
    </div>
  );
}
