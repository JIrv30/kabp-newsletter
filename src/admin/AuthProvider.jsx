import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore/lite";
import { Navigate } from "react-router";
import { auth, googleProvider } from "./staffFirebase";
import { db } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null, isAdmin: false });

  useEffect(
    () =>
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          setState({ status: "ready", user: null, isAdmin: false });
          return;
        }
        try {
          // Access is granted by a document at admins/{lowercase email}
          const snap = await getDoc(doc(db, "admins", (user.email || "").toLowerCase()));
          setState({ status: "ready", user, isAdmin: snap.exists() });
        } catch {
          setState({ status: "ready", user, isAdmin: false });
        }
      }),
    [],
  );

  const value = useMemo(
    () => ({
      ...state,
      signIn: () => signInWithPopup(auth, googleProvider),
      signOut: () => signOut(auth),
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function RequireAdmin({ children }) {
  const { status, isAdmin } = useAuth();
  if (status === "loading") return <p className="p-8 text-muted" role="status">Checking your account</p>;
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return children;
}
