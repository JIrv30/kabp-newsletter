import { useState } from "react";
import { SITE } from "../config";

export default function Logo({ className = "" }) {
  const [failed, setFailed] = useState(false);
  if (failed || !SITE.logoSrc) return null;
  // Decorative: the school name always sits next to it
  return <img src={SITE.logoSrc} alt="" className={className} onError={() => setFailed(true)} />;
}
