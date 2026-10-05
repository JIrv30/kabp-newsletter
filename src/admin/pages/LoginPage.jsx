import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../AuthProvider";
import Logo from "../../components/Logo";
import { SITE } from "../../config";

export default function LoginPage() {
  const { status, user, isAdmin, signIn, signOut } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "ready" && isAdmin) return <Navigate to="/admin" replace />;

  const start = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn();
    } catch (e) {
      if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(e?.code)) {
        setError("Sign-in didn't finish. If a pop-up was blocked, allow pop-ups for this site and try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-navy px-5 py-10">
      <div className="w-full max-w-sm rounded-xl bg-white p-7">
        <Logo className="h-14 w-14 object-contain" />
        <h1 className="mt-4 font-display text-2xl font-bold text-navy">Staff sign in</h1>
        <p className="mt-1 text-muted">Write newsletters for {SITE.schoolName} and see how families are reading them.</p>

        {status === "loading" && (
          <p className="mt-6 text-muted" role="status">
            Checking your account
          </p>
        )}

        {status === "ready" && user && !isAdmin && (
          <div role="alert" className="mt-6 rounded-md border-l-4 border-crest-red bg-red-soft p-4 text-sm">
            <p>
              <strong>{user.email}</strong> isn't on the newsletter staff list.
            </p>
            <p className="mt-1">Ask a newsletter administrator to add this address, or use a different account.</p>
            <button type="button" onClick={signOut} className="mt-3 font-semibold text-navy underline underline-offset-2">
              Use a different account
            </button>
          </div>
        )}

        {status === "ready" && !user && (
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-md bg-navy px-5 font-semibold text-white hover:bg-navy-dark disabled:opacity-60"
          >
            {busy ? "Opening Google" : "Sign in with Google"}
          </button>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-text">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
