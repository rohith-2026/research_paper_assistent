export const PREF_KEY = "rpa_profile_prefs";
export const THEME_KEY = "rpa_theme";
export const SETTINGS_KEY = "rpa_settings";

export type UserSettings = {
  compactMode?: boolean;
  reducedMotion?: boolean;
  showGraphHints?: boolean;
  highContrast?: boolean;
  emailAlerts?: boolean;
  inAppAlerts?: boolean;
  soundEnabled?: boolean;
  ttsEnabled?: boolean;
  ttsRate?: number;
  usageTracking?: boolean;
  fontSize?: "sm" | "md" | "lg";
  defaultSummary?: "short" | "detailed";
  defaultPaperView?: "abstract" | "full";
  defaultExport?: "pdf" | "bibtex" | "csv" | "json" | "notes" | "summary";
  keyboardHints?: boolean;
  language?: "en" | "hi" | "te";
};

export function applySettingsToDocument(settings?: UserSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const compact = settings?.compactMode ?? false;
  const reducedMotion = settings?.reducedMotion ?? false;
  const highContrast = settings?.highContrast ?? false;
  const fontSize = settings?.fontSize ?? "md";
  const showGraphHints = settings?.showGraphHints ?? true;
  const keyboardHints = settings?.keyboardHints ?? true;
  const usageTracking = settings?.usageTracking ?? true;
  const language = settings?.language ?? "en";
  const ttsEnabled = settings?.ttsEnabled ?? true;
  const ttsRate = settings?.ttsRate ?? 1;

  root.dataset.compact = compact ? "true" : "false";
  root.dataset.motion = reducedMotion ? "reduced" : "full";
  root.dataset.contrast = highContrast ? "high" : "normal";
  root.dataset.fontSize = fontSize;
  root.dataset.graphHints = showGraphHints ? "true" : "false";
  root.dataset.keyboardHints = keyboardHints ? "true" : "false";
  root.dataset.usageTracking = usageTracking ? "true" : "false";
  root.dataset.ttsEnabled = ttsEnabled ? "true" : "false";
  root.dataset.ttsRate = String(ttsRate);
  root.dataset.lang = language;
  root.lang = language;

  if (fontSize === "sm") root.style.fontSize = "14px";
  else if (fontSize === "lg") root.style.fontSize = "18px";
  else root.style.fontSize = "16px";
}

export function getStoredSettings(): UserSettings | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
