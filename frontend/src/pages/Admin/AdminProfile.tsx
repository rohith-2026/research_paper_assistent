import { useEffect, useState } from "react";
import Card from "../../components/ui/Card";
import { useAdminAuth } from "../../admin/useAdminAuth";
import toast from "react-hot-toast";
import {
  apiAdminAuthSessions,
  apiAdminCreateApiKey,
  apiAdminDisableMfa,
  apiAdminEnableMfa,
  apiAdminSudo,
  apiAdminProfile,
  apiAdminIpAllowlist,
  apiAdminAddIpAllowlist,
  apiAdminRemoveIpAllowlist,
  apiAdminResetAdminPassword,
  apiAdminRevokeApiKey,
  apiAdminRevokeAuthSession,
  apiAdminSecurityAlerts,
  apiAdminUpdatePreferences,
} from "../../api/admin.api";

const initials = (email?: string) => {
  if (!email) return "A";
  const name = email.split("@")[0] || "admin";
  const parts = name.split(/[._-]/).filter(Boolean);
  const first = (parts[0] || name)[0] || "A";
  const last = (parts[1] || "")[0] || "";
  return (first + last).toUpperCase();
};

export default function AdminProfile() {
  const { admin } = useAdminAuth();
  const lastLogin = (admin as any)?.last_login_at ? new Date((admin as any).last_login_at) : null;
  const [profile, setProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<any>({});
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [mfa, setMfa] = useState<any>({});
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [allowlist, setAllowlist] = useState<any[]>([]);
  const [sudoUntil, setSudoUntil] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiAdminProfile();
      setProfile(res?.profile || null);
      setPrefs(res?.preferences || {});
      setApiKeys(res?.api_keys || []);
      setMfa(res?.mfa || {});
      setLoginHistory(res?.login_history || []);
      setAllowlist(res?.ip_allowlist || []);
      const sess = await apiAdminAuthSessions();
      setSessions(Array.isArray(sess) ? sess : []);
      const sec = await apiAdminSecurityAlerts();
      setAlerts(Array.isArray(sec) ? sec : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const ensureSudo = async () => {
    if (sudoUntil && new Date(sudoUntil).getTime() > Date.now()) return true;
    const pw = window.prompt("Re-enter password to continue");
    if (!pw) return false;
    const res = await apiAdminSudo(pw);
    if (res?.sudo_until) setSudoUntil(res.sudo_until);
    return true;
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin</div>
        <h1 className="text-3xl font-black text-white/95">Profile</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/20 text-emerald-200 flex items-center justify-center text-lg font-semibold">
              {initials(profile?.email || admin?.email)}
            </div>
            <div>
              <div className="text-sm font-semibold text-white/80">Account</div>
              <div className="text-xs text-white/50">Administrator profile</div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span className="text-white/50">Email</span>
              <div className="flex items-center gap-2">
                <span>{profile?.email || admin?.email || "-"}</span>
                <button
                  className="px-2 py-1 rounded-full text-[10px] border border-white/10 bg-white/5 text-white/60"
                  onClick={() => {
                    const email = profile?.email || admin?.email;
                    if (!email) return;
                    navigator.clipboard?.writeText(email);
                    toast.success("Email copied");
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Role</span>
              <span className="px-2 py-1 rounded-full text-xs border border-white/10 bg-white/5">
                {profile?.role || admin?.role || "admin"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Status</span>
              <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-200">Active</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white/80">Security</div>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span className="text-white/50">MFA</span>
              <span className="text-xs text-white/60">{mfa?.enabled ? "Enabled" : "Not configured"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">Last login</span>
              <span className="text-xs text-white/60">
                {profile?.last_login_at ? new Date(profile.last_login_at).toLocaleString() : lastLogin ? lastLogin.toLocaleString() : "-"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60"
                onClick={async () => {
                  const pw = window.prompt("New password (min 8 chars)");
                  if (!pw) return;
                  const ok = await ensureSudo();
                  if (!ok) return;
                  await apiAdminResetAdminPassword(pw);
                  toast.success("Password updated");
                }}
              >
                Reset password
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60"
                onClick={async () => {
                  const res = await apiAdminEnableMfa();
                  setBackupCodes(res?.backup_codes || []);
                  toast.success("MFA enabled");
                  await load();
                }}
              >
                Enable MFA
              </button>
              <button
                className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-xs text-white/60"
                onClick={async () => {
                  await apiAdminDisableMfa();
                  toast.success("MFA disabled");
                  await load();
                }}
              >
                Disable MFA
              </button>
            </div>
            {backupCodes.length > 0 && (
              <div className="text-xs text-white/50">
                Backup codes: {backupCodes.join(", ")}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold text-white/80">Preferences</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3 text-sm text-white/70">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">Theme</div>
            <select
              className="mt-2 w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
              value={prefs?.theme || "system"}
              onChange={async (e) => {
                const next = { ...prefs, theme: e.target.value };
                setPrefs(next);
                await apiAdminUpdatePreferences(next);
                toast.success("Preferences updated");
              }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">Notifications</div>
            <button
              className="mt-2 px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5"
              onClick={async () => {
                const next = { ...prefs, notifications: !prefs?.notifications };
                setPrefs(next);
                await apiAdminUpdatePreferences(next);
                toast.success("Preferences updated");
              }}
            >
              {prefs?.notifications ? "Enabled" : "Disabled"}
            </button>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-white/50">Audit logging</div>
            <button
              className="mt-2 px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5"
              onClick={async () => {
                const next = { ...prefs, audit_logging: !prefs?.audit_logging };
                setPrefs(next);
                await apiAdminUpdatePreferences(next);
                toast.success("Preferences updated");
              }}
            >
              {prefs?.audit_logging ? "On" : "Off"}
            </button>
          </div>
        </div>
        <div className="mt-4 text-xs text-white/50">Audit events</div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
          {["login", "settings", "users", "compliance", "security"].map((evt) => (
            <label key={evt} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(prefs?.audit_events || []).includes(evt)}
                onChange={async (e) => {
                  const events = new Set(prefs?.audit_events || []);
                  if (e.target.checked) events.add(evt);
                  else events.delete(evt);
                  const next = { ...prefs, audit_events: Array.from(events) };
                  setPrefs(next);
                  await apiAdminUpdatePreferences(next);
                  toast.success("Preferences updated");
                }}
              />
              <span>{evt}</span>
            </label>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">API keys</div>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between">
                <span>{k.name || "API Key"} ({k.prefix})</span>
                <button
                  className="px-2 py-1 rounded-full text-[10px] border border-white/10 bg-white/5"
                  onClick={async () => {
                    const ok = await ensureSudo();
                    if (!ok) return;
                    await apiAdminRevokeApiKey(k.id);
                    toast.success("Key revoked");
                    await load();
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
            {apiKeys.length === 0 && <div className="text-xs text-white/40">No API keys yet.</div>}
            <button
              className="mt-2 px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5"
              onClick={async () => {
                const name = window.prompt("Key name");
                const res = await apiAdminCreateApiKey(name || "API Key");
                if (res?.key) {
                  navigator.clipboard?.writeText(res.key);
                  toast.success("Key created and copied");
                }
                await load();
              }}
            >
              Create API key
            </button>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white/80">Recent sessions</div>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-xs text-white/50">
                  {s.user_agent || "Unknown device"} - {s.ip || "-"}
                </span>
                <button
                  className="px-2 py-1 rounded-full text-[10px] border border-white/10 bg-white/5"
                  onClick={async () => {
                    const ok = await ensureSudo();
                    if (!ok) return;
                    await apiAdminRevokeAuthSession(s.id);
                    toast.success("Session revoked");
                    await load();
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
            {sessions.length === 0 && <div className="text-xs text-white/40">No sessions found.</div>}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="text-sm font-semibold text-white/80">Login history (30d)</div>
          <div className="mt-3 grid gap-2 text-sm text-white/60">
            {loginHistory.map((h: any) => (
              <div key={h.date} className="flex items-center gap-3">
                <div className="w-24 text-xs text-white/50">{h.date}</div>
                <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-emerald-400/70"
                    style={{ width: `${Math.max(6, h.count * 10)}%` }}
                  />
                </div>
                <div className="w-8 text-right text-xs">{h.count}</div>
              </div>
            ))}
            {loginHistory.length === 0 && <div className="text-xs text-white/40">No logins found.</div>}
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-white/80">IP allowlist</div>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            {allowlist.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span>{a.ip} {a.label ? `(${a.label})` : ""}</span>
                <button
                  className="px-2 py-1 rounded-full text-[10px] border border-white/10 bg-white/5"
                  onClick={async () => {
                    const ok = await ensureSudo();
                    if (!ok) return;
                    await apiAdminRemoveIpAllowlist(a.id);
                    toast.success("Removed");
                    await load();
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            {allowlist.length === 0 && <div className="text-xs text-white/40">No allowlisted IPs.</div>}
            <button
              className="mt-2 px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5"
              onClick={async () => {
                const ok = await ensureSudo();
                if (!ok) return;
                const ip = window.prompt("IP address");
                if (!ip) return;
                const label = window.prompt("Label (optional)") || "";
                await apiAdminAddIpAllowlist(ip, label);
                toast.success("IP added");
                await load();
              }}
            >
              Add IP
            </button>
          </div>
        </Card>
      </div>

      <Card>
        <div className="text-sm font-semibold text-white/80">Security alerts</div>
        <div className="mt-3 grid gap-2 text-sm text-white/60">
          {alerts.map((a) => (
            <div key={a.id} className="flex justify-between">
              <span>{a.action}</span>
              <span className="text-xs text-white/50">
                {a.created_at ? new Date(a.created_at).toLocaleString() : "-"}
              </span>
            </div>
          ))}
          {alerts.length === 0 && <div className="text-xs text-white/40">No alerts.</div>}
        </div>
      </Card>
    </div>
  );
}
