import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import AuthProvider from "./auth/AuthProvider";
import ToastProvider from "./components/ui/ToastProvider";
import { applySettingsToDocument, SETTINGS_KEY, THEME_KEY } from "./utils/settings";
import AdminAuthProvider from "./admin/AdminAuthProvider";
import { I18nProvider } from "./i18n";
import "./utils/time";

import "./styles/globals.css";

try {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === "light" || storedTheme === "dark") {
    document.documentElement.dataset.theme = storedTheme;
  }
  const rawSettings = localStorage.getItem(SETTINGS_KEY);
  if (rawSettings) {
    applySettingsToDocument(JSON.parse(rawSettings));
  } else {
    applySettingsToDocument();
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <AdminAuthProvider>
          <AuthProvider>
            <ToastProvider />
            <App />
          </AuthProvider>
        </AdminAuthProvider>
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>
);
