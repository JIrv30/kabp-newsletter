import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// StrictMode is left off on purpose: in development it mounts pages twice,
// which would record every test visit as two readers.
createRoot(document.getElementById("root")).render(<App />);
