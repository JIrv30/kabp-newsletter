import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { doc, getDoc } from "firebase/firestore/lite";
import { db } from "../lib/firebase";
import { useReadTracking } from "../lib/tracking";
import NewsletterView from "../components/NewsletterView";
import { SITE } from "../config";

export default function NewsletterPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const staffPreview = params.get("preview") === "1";
  const [state, setState] = useState({ status: "loading", newsletter: null });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", newsletter: null });
    getDoc(doc(db, "newsletters", id))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists() && snap.data().status === "published") {
          setState({ status: "ready", newsletter: { id: snap.id, ...snap.data() } });
        } else {
          setState({ status: "missing", newsletter: null });
        }
      })
      .catch(() => !cancelled && setState({ status: "missing", newsletter: null }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const tracking = useReadTracking(id, { enabled: state.status === "ready" && !staffPreview });

  useEffect(() => {
    if (state.newsletter) document.title = `${state.newsletter.title} | ${SITE.schoolName}`;
  }, [state.newsletter]);

  if (state.status === "loading") {
    return (
      <div className="min-h-dvh">
        <div className="h-64 bg-navy" />
        <p className="sr-only" role="status">
          Loading newsletter
        </p>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <main className="mx-auto max-w-[36rem] px-5 py-20">
        <h1 className="font-display text-3xl font-bold text-navy">This newsletter isn't available</h1>
        <p className="mt-3 text-lg text-muted">
          It may have been taken down or the link may be incomplete. Every published newsletter is listed on the
          newsletters page.
        </p>
        <Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-md bg-navy px-6 font-semibold text-white">
          See all newsletters
        </Link>
      </main>
    );
  }

  return <NewsletterView newsletter={state.newsletter} tracking={tracking} />;
}
