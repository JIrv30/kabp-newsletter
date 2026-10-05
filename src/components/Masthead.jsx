import { Link } from "react-router";
import Logo from "./Logo";
import { SITE } from "../config";

function Identity() {
  return (
    <>
      <Logo className="h-11 w-11 shrink-0 object-contain" />
      <span className="leading-tight">
        <span className="block font-semibold">{SITE.schoolName}</span>
        <span className="block text-sm text-white/75">{SITE.newsletterName}</span>
      </span>
    </>
  );
}

// Navy masthead with the gold crest-style ribbon straddling its bottom edge.
// Uses container queries (@xl:) so the editor's phone preview matches a real phone.
export default function Masthead({ title, subtitle, ribbon, homeLink = true }) {
  return (
    <>
      <header className="on-dark bg-navy text-white">
        <div className="mx-auto max-w-[44rem] px-5 pt-6 pb-12 @xl:px-8 @xl:pt-8 @xl:pb-14">
          {homeLink ? (
            <Link to="/" className="inline-flex items-center gap-3">
              <Identity />
            </Link>
          ) : (
            <div className="inline-flex items-center gap-3">
              <Identity />
            </div>
          )}
          <h1 className="mt-8 font-display text-[2.125rem] leading-[1.08] font-extrabold tracking-[-0.01em] text-balance @xl:text-5xl">
            {title}
          </h1>
          {subtitle && <p className="mt-3 max-w-[34rem] text-lg text-white/80">{subtitle}</p>}
        </div>
      </header>
      {ribbon && (
        <div className="mx-auto -mt-5 max-w-[44rem] px-5 @xl:px-8">
          <p className="ribbon ribbon-unfurl inline-block bg-gold px-7 py-2.5 font-display text-[0.95rem] font-bold text-navy @xl:text-base">
            {ribbon}
          </p>
        </div>
      )}
    </>
  );
}
