import { useEffect, useMemo, useState } from "react";
import {
  apiAdminSettings,
  apiAdminUpdateSettings,
  apiAdminForceLogoutUsers,
  apiAdminForceLogoutAdmins,
  apiAdminRevokeAllAdminKeys,
  apiAdminTestEmail,
} from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import toast from "react-hot-toast";
import { THEME_KEY } from "../../utils/settings";
import { parseIstInputValue, toIstInputValue } from "../../utils/time";

type SettingsState = {
  maintenance_mode: boolean;
  maintenance_banner: string;
  maintenance_window_start: string | null;
  maintenance_window_end: string | null;
  signups_enabled: boolean;
  audit_logging: boolean;
  abuse_detection: boolean;
  alert_email: string;
  alert_recipients: string;
  digest_frequency: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  alert_severity: string;
  api_spike_threshold: number;
  rate_limit_requests: number;
  rate_limit_window_seconds: number;
  rate_limit_auth_requests: number;
  rate_limit_auth_window_seconds: number;
  rate_limit_chat_requests: number;
  rate_limit_chat_window_seconds: number;
  rate_limit_download_requests: number;
  rate_limit_download_window_seconds: number;
  data_retention_days: number;
  ui_compact_mode: boolean;
  ui_reduced_motion: boolean;
  feature_graph: boolean;
  feature_summaries: boolean;
  feature_downloads: boolean;
  feature_beta: boolean;
};

const defaults: SettingsState = {
  maintenance_mode: false,
  maintenance_banner: "",
  maintenance_window_start: null,
  maintenance_window_end: null,
  signups_enabled: true,
  audit_logging: true,
  abuse_detection: true,
  alert_email: "",
  alert_recipients: "",
  digest_frequency: "weekly",
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_password: "",
  smtp_from: "",
  alert_severity: "medium",
  api_spike_threshold: 5000,
  rate_limit_requests: 200,
  rate_limit_window_seconds: 60,
  rate_limit_auth_requests: 30,
  rate_limit_auth_window_seconds: 60,
  rate_limit_chat_requests: 60,
  rate_limit_chat_window_seconds: 60,
  rate_limit_download_requests: 120,
  rate_limit_download_window_seconds: 300,
  data_retention_days: 90,
  ui_compact_mode: false,
  ui_reduced_motion: false,
  feature_graph: true,
  feature_summaries: true,
  feature_downloads: true,
  feature_beta: false,
};

const toInputDate = (value: string | null | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return toIstInputValue(d);
};

const fromInputDate = (value: string) => {
  if (!value) return null;
  return parseIstInputValue(value);
};

export default function AdminSettings() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [state, setState] = useState<SettingsState>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailTesting, setEmailTesting] = useState(false);
  const [dangerBusy, setDangerBusy] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiAdminSettings();
        setState((prev) => ({ ...prev, ...res }));
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load settings"));
      } finally {
        setLoading(false);
      }
    };
    load();

    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme === "light" || storedTheme === "dark") {
        setTheme(storedTheme);
      }
    }
  }, []);

  const updateField = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    try {
      setSaving(true);
      await apiAdminUpdateSettings(state);
      toast.success("Settings saved");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (next: "dark" | "light") => {
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, next);
      document.documentElement.dataset.theme = next;
    }
  };

  const confirmAction = (label: string) => {
    if (typeof window === "undefined") return false;
    return window.confirm(`Confirm ${label}? This cannot be undone.`);
  };

  const handleForceLogoutUsers = async () => {
    if (!confirmAction("force logout all users")) return;
    setDangerBusy("users");
    try {
      const res = await apiAdminForceLogoutUsers();
      toast.success(`Revoked ${res.revoked} user sessions`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to revoke user sessions"));
    } finally {
      setDangerBusy(null);
    }
  };

  const handleForceLogoutAdmins = async () => {
    if (!confirmAction("force logout all admins")) return;
    setDangerBusy("admins");
    try {
      const res = await apiAdminForceLogoutAdmins();
      toast.success(`Revoked ${res.revoked} admin sessions`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to revoke admin sessions"));
    } finally {
      setDangerBusy(null);
    }
  };

  const handleRevokeAdminKeys = async () => {
    if (!confirmAction("revoke all admin API keys")) return;
    setDangerBusy("keys");
    try {
      const res = await apiAdminRevokeAllAdminKeys();
      toast.success(`Revoked ${res.revoked} keys`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to revoke admin API keys"));
    } finally {
      setDangerBusy(null);
    }
  };

  const handleTestEmail = async () => {
    setEmailTesting(true);
    try {
      const res = await apiAdminTestEmail(state.alert_email);
      toast.success(`Test email sent to ${res.to}`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to send test email"));
    } finally {
      setEmailTesting(false);
    }
  };

  const rateLimitLabel = useMemo(
    () => `${state.rate_limit_requests} req / ${state.rate_limit_window_seconds}s`,
    [state.rate_limit_requests, state.rate_limit_window_seconds]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading settings..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">Admin</div>
        <h1 className="text-2xl font-semibold text-white/90">Admin Settings</h1>
      </div>

      <Card>
        <div className="text-sm font-semibold text-white/80">System Controls</div>
        <div className="mt-4 grid gap-3">
          {[
            { key: "maintenance_mode", label: "Maintenance mode", desc: "Disable user access while performing updates" },
            { key: "signups_enabled", label: "Signups enabled", desc: "Allow new user registrations" },
            { key: "audit_logging", label: "Audit logging", desc: "Track admin actions in audit log" },
            { key: "abuse_detection", label: "Abuse detection", desc: "Enable anomaly checks and flagging" },
          ].map((item) => (
            <label key={item.key} className="glass-soft rounded-xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-xs text-white/50">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={state[item.key as keyof SettingsState] as boolean}
                onChange={(e) => updateField(item.key as keyof SettingsState, e.target.checked as any)}
              />
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs text-white/50">Maintenance banner</label>
            <textarea
              rows={2}
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.maintenance_banner || ""}
              onChange={(e) => updateField("maintenance_banner", e.target.value)}
              placeholder="We will be down for scheduled maintenance at 02:00 UTC."
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Window start</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={toInputDate(state.maintenance_window_start)}
              onChange={(e) => updateField("maintenance_window_start", fromInputDate(e.target.value) as any)}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Window end</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={toInputDate(state.maintenance_window_end)}
              onChange={(e) => updateField("maintenance_window_end", fromInputDate(e.target.value) as any)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Alerts and Notifications</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-white/50">Primary alert email</label>
            <input
              type="email"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.alert_email}
              onChange={(e) => updateField("alert_email", e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Recipients (comma separated)</label>
            <input
              type="text"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.alert_recipients}
              onChange={(e) => updateField("alert_recipients", e.target.value)}
              placeholder="ops@example.com, security@example.com"
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Alert severity threshold</label>
            <select
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.alert_severity}
              onChange={(e) => updateField("alert_severity", e.target.value)}
            >
              {["low", "medium", "high", "critical"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50">Digest frequency</label>
            <select
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.digest_frequency}
              onChange={(e) => updateField("digest_frequency", e.target.value)}
            >
              {["daily", "weekly", "monthly", "off"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50">API spike threshold (requests/day)</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.api_spike_threshold}
              onChange={(e) => updateField("api_spike_threshold", Number(e.target.value))}
              min={1}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleTestEmail}
              disabled={emailTesting}
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white/80 hover:border-emerald-300/60 hover:text-emerald-200 disabled:opacity-50"
            >
              {emailTesting ? "Sending test email..." : "Send test email"}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">SMTP</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-white/50">Host</label>
            <input
              type="text"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.smtp_host}
              onChange={(e) => updateField("smtp_host", e.target.value)}
              placeholder="smtp.mailgun.org"
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Port</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.smtp_port}
              onChange={(e) => updateField("smtp_port", Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">User</label>
            <input
              type="text"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.smtp_user}
              onChange={(e) => updateField("smtp_user", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Password</label>
            <input
              type="password"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.smtp_password}
              onChange={(e) => updateField("smtp_password", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-white/50">From address</label>
            <input
              type="text"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.smtp_from}
              onChange={(e) => updateField("smtp_from", e.target.value)}
              placeholder="no-reply@example.com"
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Rate Limits</div>
        <div className="mt-2 text-xs text-white/50">{rateLimitLabel}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-white/50">Global requests</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.rate_limit_requests}
              onChange={(e) => updateField("rate_limit_requests", Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Global window (seconds)</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.rate_limit_window_seconds}
              onChange={(e) => updateField("rate_limit_window_seconds", Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Auth requests</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.rate_limit_auth_requests}
              onChange={(e) => updateField("rate_limit_auth_requests", Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Auth window (seconds)</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.rate_limit_auth_window_seconds}
              onChange={(e) => updateField("rate_limit_auth_window_seconds", Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Chat requests</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.rate_limit_chat_requests}
              onChange={(e) => updateField("rate_limit_chat_requests", Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Chat window (seconds)</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.rate_limit_chat_window_seconds}
              onChange={(e) => updateField("rate_limit_chat_window_seconds", Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Download requests</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.rate_limit_download_requests}
              onChange={(e) => updateField("rate_limit_download_requests", Number(e.target.value))}
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-white/50">Download window (seconds)</label>
            <input
              type="number"
              className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
              value={state.rate_limit_download_window_seconds}
              onChange={(e) => updateField("rate_limit_download_window_seconds", Number(e.target.value))}
              min={1}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Compliance</div>
        <div className="mt-4">
          <label className="text-xs text-white/50">Data retention (days)</label>
          <input
            type="number"
            className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
            value={state.data_retention_days}
            onChange={(e) => updateField("data_retention_days", Number(e.target.value))}
            min={1}
          />
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Feature Flags</div>
        <div className="mt-4 grid gap-3">
          {[
            { key: "feature_graph", label: "Graph explorer", desc: "Enable graph visualization features" },
            { key: "feature_summaries", label: "Summaries", desc: "Allow AI summaries and digests" },
            { key: "feature_downloads", label: "Downloads", desc: "Allow file downloads" },
            { key: "feature_beta", label: "Beta features", desc: "Expose experimental admin UI features" },
          ].map((item) => (
            <label key={item.key} className="glass-soft rounded-xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-xs text-white/50">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={state[item.key as keyof SettingsState] as boolean}
                onChange={(e) => updateField(item.key as keyof SettingsState, e.target.checked as any)}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Theme</div>
        <div className="mt-4 flex gap-2">
          <button
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              theme === "dark"
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/60"
            }`}
            onClick={() => applyTheme("dark")}
          >
            Dark
          </button>
          <button
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              theme === "light"
                ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/60"
            }`}
            onClick={() => applyTheme("light")}
          >
            Light
          </button>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Admin UI</div>
        <div className="mt-4 grid gap-3">
          {[
            { key: "ui_compact_mode", label: "Compact mode", desc: "Tighter spacing across admin UI" },
            { key: "ui_reduced_motion", label: "Reduce motion", desc: "Minimize animations and transitions" },
          ].map((item) => (
            <label key={item.key} className="glass-soft rounded-xl p-4 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{item.label}</div>
                <div className="text-xs text-white/50">{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={state[item.key as keyof SettingsState] as boolean}
                onChange={(e) => updateField(item.key as keyof SettingsState, e.target.checked as any)}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Danger Zone</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            onClick={handleForceLogoutUsers}
            disabled={dangerBusy === "users"}
            className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 hover:border-rose-300/70 disabled:opacity-50"
          >
            {dangerBusy === "users" ? "Revoking user sessions..." : "Force logout all users"}
          </button>
          <button
            onClick={handleForceLogoutAdmins}
            disabled={dangerBusy === "admins"}
            className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 hover:border-rose-300/70 disabled:opacity-50"
          >
            {dangerBusy === "admins" ? "Revoking admin sessions..." : "Force logout all admins"}
          </button>
          <button
            onClick={handleRevokeAdminKeys}
            disabled={dangerBusy === "keys"}
            className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 hover:border-rose-300/70 disabled:opacity-50"
          >
            {dangerBusy === "keys" ? "Revoking API keys..." : "Revoke all admin API keys"}
          </button>
        </div>
      </Card>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-emerald-500 text-black px-5 py-2 text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </div>
  );
}
