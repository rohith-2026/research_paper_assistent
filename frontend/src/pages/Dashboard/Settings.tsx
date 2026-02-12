import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Eye,
  FileText,
  Keyboard,
  Moon,
  Palette,
  Shield,
  Sliders,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import toast from "react-hot-toast";

import PageShell from "../../components/layout/PageShell";
import Button from "../../components/ui/Button";
import { useAuth } from "../../auth/useAuth";
import { applySettingsToDocument, PREF_KEY, SETTINGS_KEY, THEME_KEY } from "../../utils/settings";
import { apiExportAllData, apiLogoutAll, apiUpdatePreferences } from "../../api/auth.api";
import { toIstIsoString } from "../../utils/time";
import { useI18n } from "../../i18n";
import { getSpeechLang, isSpeechSynthesisSupported, pickVoiceForLang } from "../../utils/speech";

type SettingsState = {
  compactMode: boolean;
  reducedMotion: boolean;
  showGraphHints: boolean;
  highContrast: boolean;
  emailAlerts: boolean;
  inAppAlerts: boolean;
  soundEnabled: boolean;
  ttsEnabled: boolean;
  ttsRate: number;
  weeklySummary: boolean;
  securityAlerts: boolean;
  systemUpdates: boolean;
  usageTracking: boolean;
  fontSize: "sm" | "md" | "lg";
  defaultSummary: "short" | "detailed";
  defaultPaperView: "abstract" | "full";
  defaultExport: "pdf" | "bibtex" | "csv" | "json" | "notes" | "summary";
  keyboardHints: boolean;
  language: "en" | "hi" | "te";
};

const defaultState: SettingsState = {
  compactMode: false,
  reducedMotion: false,
  showGraphHints: true,
  highContrast: false,
  emailAlerts: true,
  inAppAlerts: true,
  soundEnabled: false,
  ttsEnabled: true,
  ttsRate: 1,
  weeklySummary: true,
  securityAlerts: true,
  systemUpdates: true,
  usageTracking: true,
  fontSize: "md",
  defaultSummary: "short",
  defaultPaperView: "abstract",
  defaultExport: "pdf",
  keyboardHints: true,
  language: "en",
};

export default function Settings() {
  const { logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [state, setState] = useState<SettingsState>(defaultState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mergedState = { ...defaultState };
    const storedTheme = localStorage.getItem(THEME_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    }

    const rawPrefs = localStorage.getItem(PREF_KEY);
    if (rawPrefs) {
      try {
        const parsed = JSON.parse(rawPrefs);
        mergedState = { ...mergedState, ...parsed };
      } catch {
        /* ignore */
      }
    }

    const rawSettings = localStorage.getItem(SETTINGS_KEY);
    if (rawSettings) {
      try {
        const parsed = JSON.parse(rawSettings);
        mergedState = { ...mergedState, ...parsed };
      } catch {
        /* ignore */
      }
    }

    const merged = { ...mergedState, language: mergedState.language || lang };
    setState(merged);
    applySettingsToDocument(mergedState);
  }, []);

  const saveState = (next: SettingsState) => {
    setState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      localStorage.setItem(
        PREF_KEY,
        JSON.stringify({
          compactMode: next.compactMode,
          reducedMotion: next.reducedMotion,
          showGraphHints: next.showGraphHints,
          highContrast: next.highContrast,
        })
      );
    }
    applySettingsToDocument(next);
  };

  const updateField = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    const next = { ...state, [key]: value };
    saveState(next);
    if (key === "language") {
      setLang(value as SettingsState["language"]);
    }
    if (key === "usageTracking") {
      const enabled = Boolean(value);
      apiUpdatePreferences({ analytics_opt_out: !enabled })
        .then(() => {
          toast.success(enabled ? "Analytics enabled" : "Analytics disabled");
        })
        .catch(() => {
          toast.error("Failed to update analytics preference");
        });
    }
  };

  const applyTheme = (next: "dark" | "light") => {
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.dataset.theme = next;
    }
  };

  const resetSettings = () => {
    saveState(defaultState);
    toast.success("Settings reset");
  };


  const exportLocalSettings = () => {
    const payload = {
      theme,
      settings: state,
      exported_at: toIstIsoString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rpa_settings.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  const exportAllData = async () => {
    try {
      const payload = await apiExportAllData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rpa_account_data.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Account data exported");
    } catch {
      toast.error("Failed to export account data");
    }
  };

  const logoutAllDevices = async () => {
    try {
      await apiLogoutAll();
      logout();
      toast.success("Signed out on all devices");
    } catch {
      toast.error("Failed to sign out on all devices");
    }
  };

  const clearLocalData = () => {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(PREF_KEY);
    localStorage.removeItem(THEME_KEY);
    toast.success("Local settings cleared");
    saveState(defaultState);
    applyTheme("dark");
  };

  const fontSizeLabel = useMemo(() => {
    if (state.fontSize === "sm") return "Compact";
    if (state.fontSize === "lg") return "Large";
    return "Default";
  }, [state.fontSize]);

  const ttsRateLabel = useMemo(() => {
    if (state.ttsRate <= 0.85) return "Slow";
    if (state.ttsRate >= 1.15) return "Fast";
    return "Normal";
  }, [state.ttsRate]);

  const testVoice = () => {
    if (!isSpeechSynthesisSupported()) {
      toast.error(t("Speech synthesis not supported in this browser"));
      return;
    }
    if (!state.ttsEnabled) {
      toast.error(t("Read aloud disabled in settings"));
      return;
    }
    const langCode = getSpeechLang(state.language);
    const utterance = new SpeechSynthesisUtterance(t("Voice test message"));
    utterance.lang = langCode;
    utterance.rate = state.ttsRate;
    const voice = pickVoiceForLang(langCode);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <PageShell title="Settings" subtitle="Preferences, privacy, and defaults">
      <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          <section className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Palette className="w-4 h-4" /> {t("Appearance")}
            </div>
            <div className="mt-4 grid gap-4">
              <div>
                <div className="text-xs text-white/50 mb-2">{t("Theme")}</div>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm flex items-center justify-center gap-2 ${
                      theme === "dark"
                        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-white/5 text-white/60"
                    }`}
                    onClick={() => applyTheme("dark")}
                  >
                    <Moon className="w-4 h-4" /> {t("Dark")}
                  </button>
                  <button
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm flex items-center justify-center gap-2 ${
                      theme === "light"
                        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-white/5 text-white/60"
                    }`}
                    onClick={() => applyTheme("light")}
                  >
                    <Sun className="w-4 h-4" /> {t("Light")}
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs text-white/50 mb-2">{t("Language")}</div>
                <div className="flex gap-2">
                  {(
                    [
                      { value: "en", label: t("English") },
                      { value: "hi", label: t("Hindi") },
                      { value: "te", label: t("Telugu") },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                        state.language === opt.value
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-white/5 text-white/60"
                      }`}
                      onClick={() => updateField("language", opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  { key: "compactMode", label: "Compact layout", desc: "Tighter spacing across lists" },
                  { key: "reducedMotion", label: "Reduce motion", desc: "Minimize animations" },
                  { key: "showGraphHints", label: "Graph hints", desc: "Show tips on graph pages" },
                  { key: "highContrast", label: "High contrast", desc: "Sharper borders and text" },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="glass-soft rounded-xl p-4 border border-white/10 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold">{item.label}</div>
                      <div className="text-xs text-white/50">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state[item.key as keyof SettingsState] as boolean}
                      onChange={(e) =>
                        updateField(item.key as keyof SettingsState, e.target.checked as any)
                      }
                    />
                  </label>
                ))}
              </div>

              <div className="glass-soft rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/50">Font size</div>
                <div className="mt-2 flex gap-2">
                  {(["sm", "md", "lg"] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateField("fontSize", size)}
                      className={`px-3 py-2 rounded-lg text-xs border ${
                        state.fontSize === size
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-white/5 text-white/60"
                      }`}
                    >
                      {size === "sm" ? "Small" : size === "md" ? "Default" : "Large"}
                    </button>
                  ))}
                  <div className="ml-auto text-xs text-white/50 flex items-center">
                    {fontSizeLabel}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="w-4 h-4" /> Notifications
            </div>
            <div className="mt-4 grid gap-3">
              {[
                { key: "emailAlerts", label: "Email alerts", desc: "Weekly summaries and account alerts" },
                { key: "inAppAlerts", label: "In-app alerts", desc: "Show toast and inline notifications" },
                { key: "soundEnabled", label: "Sound effects", desc: "Play subtle sounds for actions" },
                { key: "weeklySummary", label: "Weekly summary", desc: "Research recap and highlights" },
                { key: "securityAlerts", label: "Security alerts", desc: "Suspicious login notifications" },
                { key: "systemUpdates", label: "System updates", desc: "Product and feature updates" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="glass-soft rounded-xl p-4 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-semibold">{item.label}</div>
                    <div className="text-xs text-white/50">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={state[item.key as keyof SettingsState] as boolean}
                    onChange={(e) =>
                      updateField(item.key as keyof SettingsState, e.target.checked as any)
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sliders className="w-4 h-4" /> Defaults
            </div>
            <div className="mt-4 grid gap-4">
              <div className="glass-soft rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/50">Default summary type</div>
                <div className="mt-2 flex gap-2">
                  {(["short", "detailed"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateField("defaultSummary", t)}
                      className={`px-3 py-2 rounded-lg text-xs border ${
                        state.defaultSummary === t
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-white/5 text-white/60"
                      }`}
                    >
                      {t === "short" ? "Short" : "Detailed"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-soft rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/50">Default paper view</div>
                <div className="mt-2 flex gap-2">
                  {(["abstract", "full"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateField("defaultPaperView", t)}
                      className={`px-3 py-2 rounded-lg text-xs border ${
                        state.defaultPaperView === t
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-white/5 text-white/60"
                      }`}
                    >
                      {t === "abstract" ? "Abstract" : "Full text"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass-soft rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/50">Default export format</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["pdf", "bibtex", "csv", "json", "notes", "summary"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateField("defaultExport", t)}
                      className={`px-3 py-2 rounded-lg text-xs border ${
                        state.defaultExport === t
                          ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-white/5 text-white/60"
                      }`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="w-4 h-4" /> Privacy & Security
            </div>
            <div className="mt-4 grid gap-3">
              <label className="glass-soft rounded-xl p-4 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Usage tracking</div>
                  <div className="text-xs text-white/50">Disable analytics events across the app</div>
                </div>
                <input
                  type="checkbox"
                  checked={state.usageTracking}
                  onChange={(e) => updateField("usageTracking", e.target.checked)}
                />
              </label>

              <label className="glass-soft rounded-xl p-4 border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Keyboard hints</div>
                  <div className="text-xs text-white/50">Show shortcuts on hover</div>
                </div>
                <input
                  type="checkbox"
                  checked={state.keyboardHints}
                  onChange={(e) => updateField("keyboardHints", e.target.checked)}
                />
              </label>

              <div className="grid gap-2 sm:grid-cols-2">
                <Link to="/forgot-password" className="w-full">
                  <Button variant="secondary" className="w-full">
                    Reset password
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    logout();
                    toast.success("Signed out on this device");
                  }}
                >
                  Sign out
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="ghost" className="w-full" onClick={logoutAllDevices}>
                  Sign out all devices
                </Button>
                <Button variant="secondary" className="w-full" onClick={exportAllData}>
                  Export account data
                </Button>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Keyboard className="w-4 h-4" /> Accessibility
            </div>
            <div className="mt-4 grid gap-3">
              <div className="glass-soft rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/50">{t("Voice output")}</div>
                <div className="mt-3 grid gap-3">
                  <label className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">{t("Read aloud")}</div>
                      <div className="text-xs text-white/50">
                        {t("Enable read aloud for assistant answers")}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.ttsEnabled}
                      onChange={(e) => updateField("ttsEnabled", e.target.checked)}
                    />
                  </label>
                  <div>
                    <div className="text-xs text-white/50">{t("Voice speed")}</div>
                    <div className="mt-2 flex gap-2">
                      {[0.8, 1.0, 1.2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => updateField("ttsRate", rate)}
                          className={`px-3 py-2 rounded-lg text-xs border ${
                            Math.abs(state.ttsRate - rate) < 0.01
                              ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                              : "border-white/10 bg-white/5 text-white/60"
                          }`}
                          disabled={!state.ttsEnabled}
                        >
                          {rate === 0.8 ? t("Slow") : rate === 1.0 ? t("Normal") : t("Fast")}
                        </button>
                      ))}
                      <div className="ml-auto text-xs text-white/50 flex items-center">
                        {t(ttsRateLabel)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn-secondary rounded-xl px-3 py-2 text-xs"
                      onClick={testVoice}
                      disabled={!state.ttsEnabled}
                    >
                      {t("Test voice")}
                    </button>
                  </div>
                </div>
              </div>
              <div className="glass-soft rounded-xl p-4 border border-white/10">
                <div className="text-xs text-white/50">Quick tips</div>
                <div className="mt-2 text-sm text-white/70">
                  Use the Graph page mouse wheel to zoom, drag to pan, and click a node to pin.
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="glass rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4" /> Account
          </div>
          <div className="text-sm text-white/70 space-y-2">
            <div>Plan: Research Pro</div>
          </div>

          <div className="divider" />

          <div className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4" /> Data & Storage
          </div>
          <div className="space-y-3">
            <Button variant="secondary" className="w-full" onClick={exportLocalSettings}>
              <FileText className="w-4 h-4" /> Export settings
            </Button>
            <Button variant="secondary" className="w-full" onClick={exportAllData}>
              <FileText className="w-4 h-4" /> Export all data
            </Button>
            <Button variant="ghost" className="w-full" onClick={clearLocalData}>
              <Trash2 className="w-4 h-4" /> Clear local settings
            </Button>
            <Button variant="ghost" className="w-full" onClick={resetSettings}>
              Reset to defaults
            </Button>
          </div>

          <div className="divider" />

          <div className="text-sm font-semibold">Quick links</div>
          <div className="space-y-2 text-sm">
            <Link className="text-emerald-300 hover:text-emerald-200" to="/dashboard/profile">
              Profile overview
            </Link>
            <Link className="text-emerald-300 hover:text-emerald-200" to="/dashboard/history">
              Query history
            </Link>
            <Link className="text-emerald-300 hover:text-emerald-200" to="/dashboard/notes">
              Notes workspace
            </Link>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
