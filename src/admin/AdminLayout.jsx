import { Link, Outlet } from "react-router";
import { ExternalLink, LogOut } from "lucide-react";
import { useAuth } from "./AuthProvider";
import Logo from "../components/Logo";
import { SITE } from "../config";

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  return (
    <div className="min-h-dvh bg-mist">
      <header className="on-dark bg-navy text-white">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-4 px-4 sm:px-6">
          <Link to="/admin" className="flex items-center gap-3">
            <Logo className="h-9 w-9 object-contain" />
            <span className="font-display text-lg font-bold">Newsletters</span>
          </Link>
          <span className="hidden text-sm text-white/70 md:inline">{SITE.schoolName}</span>
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <a href="/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm text-white/90 hover:bg-white/10">
              <ExternalLink aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Parent view</span>
            </a>
            <span className="hidden text-sm text-white/70 lg:inline">{user?.email}</span>
            <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 rounded-md px-2 py-2 text-sm hover:bg-white/10">
              <LogOut aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
