import { lazy, Suspense } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router";
import { isConfigured } from "./lib/firebase";
import ArchivePage from "./pages/ArchivePage";
import NewsletterPage from "./pages/NewsletterPage";

// Staff screens (editor, charts) load separately so parents' phones only download the reading page
const AdminApp = lazy(() => import("./admin/AdminApp"));

function Message({ title, children }) {
  return (
    <main className="mx-auto max-w-[36rem] px-5 py-20">
      <h1 className="font-display text-3xl font-bold text-navy">{title}</h1>
      <div className="mt-3 space-y-3 text-lg text-muted">{children}</div>
    </main>
  );
}

export default function App() {
  if (!isConfigured) {
    return (
      <Message title="Firebase isn't connected yet">
        <p>
          Copy <code>.env.example</code> to <code>.env.local</code>, paste in your Firebase web app settings, then restart{" "}
          <code>npm run dev</code>. The README walks through each step.
        </p>
      </Message>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ArchivePage />} />
        <Route path="/n/:id" element={<NewsletterPage />} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<p className="p-8 text-muted" role="status">Loading</p>}>
              <AdminApp />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Message title="Page not found">
              <p>
                <Link to="/" className="font-semibold text-navy underline">
                  Go to the newsletters page
                </Link>
              </p>
            </Message>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
