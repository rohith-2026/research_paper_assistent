import { useEffect, useState } from "react";
import { apiAdminCreateAdmin, apiAdminListAdmins, apiAdminUpdateAdmin } from "../../api/admin.api";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import { toIstIsoString } from "../../utils/time";
import toast from "react-hot-toast";

type AuditEntry = {
  id: string;
  action: string;
  actor: string;
  target?: string;
  at: string;
};

const ROLE_DEFS = [
  {
    key: "superadmin",
    name: "Superadmin",
    description: "Full platform control, settings, and security.",
    scope: "All systems",
  },
  {
    key: "admin",
    name: "Admin",
    description: "Operational control of users, analytics, and health.",
    scope: "Operational",
  },
  {
    key: "support",
    name: "Support",
    description: "User support, feedback review, limited exports.",
    scope: "Support",
  },
  {
    key: "analyst",
    name: "Analyst",
    description: "Read-only analytics and reporting access.",
    scope: "Analytics",
  },
];

const PERMISSIONS = [
  "users.read",
  "users.write",
  "users.delete",
  "analytics.read",
  "analytics.write",
  "system.read",
  "system.write",
  "sessions.revoke",
  "exports.run",
  "feedback.manage",
  "abuse.review",
];

const ROLE_PERMS: Record<string, string[]> = {
  superadmin: PERMISSIONS,
  admin: [
    "users.read",
    "users.write",
    "analytics.read",
    "analytics.write",
    "system.read",
    "sessions.revoke",
    "exports.run",
    "feedback.manage",
    "abuse.review",
  ],
  support: ["users.read", "feedback.manage", "exports.run", "sessions.revoke"],
  analyst: ["users.read", "analytics.read", "system.read"],
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: "from-rose-500/20 via-transparent to-rose-500/10",
  admin: "from-emerald-500/20 via-transparent to-emerald-500/10",
  support: "from-sky-500/20 via-transparent to-sky-500/10",
  analyst: "from-amber-500/20 via-transparent to-amber-500/10",
};

const BUNDLES: Record<string, string[]> = {
  readonly: ["users.read", "analytics.read", "system.read"],
  support: ["users.read", "feedback.manage", "exports.run", "sessions.revoke"],
  ops: [
    "users.read",
    "users.write",
    "analytics.read",
    "analytics.write",
    "system.read",
    "sessions.revoke",
    "exports.run",
  ],
  full: PERMISSIONS,
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

export default function AdminRolesAccess() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");
  const [showCreate, setShowCreate] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("admin");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [hoverRole, setHoverRole] = useState<string | null>(null);
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [editRole, setEditRole] = useState<string>("admin");
  const [rolePerms, setRolePerms] = useState<Record<string, string[]>>(ROLE_PERMS);
  const [showAdminDetail, setShowAdminDetail] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [approvalNeeded, setApprovalNeeded] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await apiAdminListAdmins(1, 25);
      setData(res);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to load admins"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createAdmin = async () => {
    try {
      await apiAdminCreateAdmin({ email: email.trim(), password, role });
      toast.success("Admin created");
      setAudit((prev) => [
        {
          id: `a-${Date.now()}`,
          action: `Created admin (${role})`,
          actor: "You",
          target: email.trim(),
          at: toIstIsoString(),
        },
        ...prev,
      ]);
      setEmail("");
      setPassword("");
      await load();
      setShowCreate(false);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to create admin"));
    }
  };

  const toggleActive = async (id: string, next: boolean) => {
    const targetAdmin = (data?.items || []).find((a: any) => a.id === id);
    if (targetAdmin?.role === "superadmin" && next === false) {
      setApprovalNeeded("Disabling a Superadmin requires approval.");
      toast.error("Approval required to disable Superadmin");
      return;
    }
    await apiAdminUpdateAdmin(id, { is_active: next });
    const target = (data?.items || []).find((a: any) => a.id === id)?.email || id;
    setAudit((prev) => [
      {
        id: `a-${Date.now()}`,
        action: next ? "Enabled admin" : "Disabled admin",
        actor: "You",
        target,
        at: toIstIsoString(),
      },
      ...prev,
    ]);
    await load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const bulkSetActive = async (next: boolean) => {
    try {
      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        await apiAdminUpdateAdmin(id, { is_active: next });
      }
      toast.success(next ? "Admins enabled" : "Admins disabled");
      setSelected({});
      await load();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Bulk update failed"));
    }
  };

  const sendInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Invite email required");
      return;
    }
    toast.success("Invite queued (backend hookup pending)");
    setAudit((prev) => [
      {
        id: `a-${Date.now()}`,
        action: `Sent invite (${inviteRole})`,
        actor: "You",
        target: inviteEmail.trim(),
        at: toIstIsoString(),
      },
      ...prev,
    ]);
    setInviteEmail("");
  };

  const admins = (data?.items || []).filter((a: any) => {
    const q = search.trim().toLowerCase();
    if (q && !(a.email || "").toLowerCase().includes(q)) return false;
    if (filterRole !== "all" && a.role !== filterRole) return false;
    if (filterStatus !== "all" && (a.is_active ? "active" : "disabled") !== filterStatus) return false;
    return true;
  });

  const totalAdmins = (data?.items || []).length || 0;
  const activeAdmins = (data?.items || []).filter((a: any) => a.is_active).length || 0;
  const disabledAdmins = totalAdmins - activeAdmins;
  const inviteCount = audit.filter((a) => a.action.startsWith("Sent invite")).length;

  const togglePerm = (r: string, p: string) => {
    setRolePerms((prev) => {
      const current = new Set(prev[r] || []);
      if (current.has(p)) current.delete(p);
      else current.add(p);
      return { ...prev, [r]: Array.from(current) };
    });
  };

  const groupedAudit = audit.reduce<Record<string, AuditEntry[]>>((acc, entry) => {
    const d = new Date(entry.at);
    const key = Number.isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString();
    acc[key] = acc[key] || [];
    acc[key].push(entry);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading admins..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">Admin</div>
          <h1 className="text-3xl font-black text-white/95">Roles & Access</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => setShowCreate(true)}
          >
            Create admin
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => bulkSetActive(true)}
            disabled={selectedIds.length === 0}
          >
            Enable selected
          </button>
          <button
            className="px-3 py-2 rounded-full text-xs border border-white/10 bg-white/5 text-white/60"
            onClick={() => bulkSetActive(false)}
            disabled={selectedIds.length === 0}
          >
            Disable selected
          </button>
        </div>
      </div>

      {approvalNeeded && (
        <Card>
          <div className="flex items-center justify-between text-sm text-amber-200">
            <div>{approvalNeeded}</div>
            <button className="text-xs text-white/60" onClick={() => setApprovalNeeded(null)}>
              Dismiss
            </button>
          </div>
        </Card>
      )}

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="glass-soft rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50">Total admins</div>
            <div className="text-2xl font-semibold text-white/90">{totalAdmins}</div>
          </div>
          <div className="glass-soft rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50">Active</div>
            <div className="text-2xl font-semibold text-emerald-200">{activeAdmins}</div>
          </div>
          <div className="glass-soft rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50">Disabled</div>
            <div className="text-2xl font-semibold text-white/80">{disabledAdmins}</div>
          </div>
          <div className="glass-soft rounded-2xl p-4 border border-white/10">
            <div className="text-xs text-white/50">Invites pending</div>
            <div className="text-2xl font-semibold text-white/90">{inviteCount}</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="grid gap-4 md:grid-cols-4">
          {ROLE_DEFS.map((r) => (
            <div
              key={r.key}
              className="glass-soft rounded-2xl p-4 border border-white/10 bg-gradient-to-br relative overflow-hidden"
              onMouseEnter={() => setHoverRole(r.key)}
              onMouseLeave={() => setHoverRole(null)}
            >
              <div
                className={`absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-br ${ROLE_COLORS[r.key]} opacity-70`}
              />
              <div className="relative text-sm font-semibold text-white/90">{r.name}</div>
              <div className="text-xs text-white/50 mt-1">{r.description}</div>
              <div className="text-[11px] text-white/40 mt-3">Scope</div>
              <div className="text-xs text-white/70">{r.scope}</div>
              <div className="mt-3 text-[11px] text-white/40">Default permissions</div>
              <div className="mt-1 text-xs text-white/70">
                {(rolePerms[r.key] || []).length} permissions
              </div>
              <div className="mt-3 relative">
                <button
                  className="text-xs text-emerald-200 hover:text-emerald-100"
                  onClick={() => {
                    setEditRole(r.key);
                    setShowRoleEditor(true);
                  }}
                >
                  Edit role
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Permission matrix</div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-[860px] w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr className="text-xs text-white/50">
                <th className="px-3 py-2 text-left">Permission</th>
                {ROLE_DEFS.map((r) => (
                  <th
                    key={r.key}
                    className={`px-3 py-2 text-center ${hoverRole === r.key ? "text-white" : ""}`}
                  >
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {PERMISSIONS.map((p) => (
                <tr key={p} className="text-sm text-white/70">
                  <td className="px-3 py-2">{p}</td>
                  {ROLE_DEFS.map((r) => {
                    const enabled = rolePerms[r.key]?.includes(p);
                    const highlight = hoverRole === r.key;
                    return (
                      <td key={r.key} className="px-3 py-2 text-center">
                        <button
                          className={`px-2 py-1 rounded-full text-[10px] border ${
                            enabled
                              ? "border-emerald-400/40 text-emerald-200 bg-emerald-500/10"
                              : "border-white/10 text-white/40"
                          } ${highlight ? "ring-1 ring-white/20" : ""}`}
                          onClick={() => {
                            setApprovalNeeded("Editing permissions requires approval.");
                            toast("Permission editing requires backend");
                          }}
                        >
                          {enabled ? "Enabled" : "Disabled"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm font-semibold text-white/80">Admins</div>
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs outline-none focus:border-emerald-300/50"
              placeholder="Search email"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="all">All roles</option>
              {ROLE_DEFS.map((r) => (
                <option key={r.key} value={r.key}>{r.name}</option>
              ))}
            </select>
            <select
              className="rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>
        <div className="mt-4 overflow-auto">
          <table className="min-w-[860px] w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: "36px" }} />
              <col style={{ width: "260px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "220px" }} />
            </colgroup>
            <thead>
              <tr className="text-xs text-white/50">
                <th className="px-3 py-2 text-left" />
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Last login</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {admins.map((a: any) => {
                const breakGlass = (a.email || "").toLowerCase().includes("breakglass");
                return (
                <tr
                  key={a.id}
                  className="text-sm text-white/70 cursor-pointer"
                  onClick={() => {
                    setCurrentAdmin(a);
                    setShowAdminDetail(true);
                  }}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={!!selected[a.id]}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(a.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <span>{a.email}</span>
                      {breakGlass && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-200 border border-rose-400/30">
                          Break-glass
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">{a.role}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        a.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-white/50"
                      }`}
                    >
                      {a.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-xs text-white/50">{formatDate(a.last_login_at)}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="inline-flex gap-3 text-xs">
                      <button
                        className="text-emerald-300 hover:text-emerald-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(a.id, !a.is_active);
                        }}
                      >
                        {a.is_active ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="text-white/70 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast("Reset password requires backend");
                        }}
                      >
                        Reset password
                      </button>
                      <button
                        className="text-white/70 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast("Session revoke requires backend");
                        }}
                      >
                        Revoke sessions
                      </button>
                      <button
                        className="text-white/70 hover:text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          toast("Activity view requires backend");
                        }}
                      >
                        View activity
                      </button>
                    </div>
                  </td>
                </tr>
              )})}
              {admins.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-sm text-white/50">
                    No admins match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-white/80">Audit log</div>
        <div className="mt-3 space-y-4">
          {audit.length === 0 && <div className="text-xs text-white/40">No recent changes.</div>}
          {Object.entries(groupedAudit).map(([day, entries]) => (
            <div key={day}>
              <div className="text-[11px] text-white/40 mb-2">{day}</div>
              <div className="space-y-2">
                {entries.slice(0, 6).map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-xs text-white/60">
                    <div>
                      <span className="text-white/80">{a.action}</span>
                      {a.target ? ` - ${a.target}` : ""}
                    </div>
                    <div>{formatDate(a.at)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50">
          <div className="w-full max-w-md h-full bg-[#0b0f14] border-l border-white/10 p-6 overflow-auto">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-white/90">Create admin</div>
              <button className="text-white/50 hover:text-white" onClick={() => setShowCreate(false)}>
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
                placeholder="Password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
              />
              <div className="flex flex-wrap gap-2">
                {ROLE_DEFS.map((r) => (
                  <button
                    key={r.key}
                    className={`px-3 py-2 rounded-lg text-xs border ${
                      role === r.key
                        ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                        : "border-white/10 bg-white/5 text-white/60"
                    }`}
                    onClick={() => setRole(r.key)}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
              <button
                className="w-full rounded-xl bg-emerald-500 text-black px-4 py-2 text-sm font-semibold hover:bg-emerald-400"
                onClick={createAdmin}
              >
                Create admin
              </button>
            </div>

            <div className="mt-8 border-t border-white/10 pt-6">
              <div className="text-sm font-semibold text-white/80">Send invite</div>
              <div className="mt-3 space-y-3">
                <input
                  className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm outline-none focus:border-emerald-300/50"
                  placeholder="Invite email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <select
                  className="w-full rounded-xl bg-black/30 border border-white/15 px-4 py-3 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ROLE_DEFS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-sm"
                  onClick={sendInvite}
                >
                  Send invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRoleEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50">
          <div className="w-full max-w-lg h-full bg-[#0b0f14] border-l border-white/10 p-6 overflow-auto">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-white/90">Edit role</div>
              <button className="text-white/50 hover:text-white" onClick={() => setShowRoleEditor(false)}>
                Close
              </button>
            </div>
            <div className="mt-3 text-xs text-white/50">
              Editing permissions requires backend enforcement. Changes here are local preview.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {ROLE_DEFS.map((r) => (
                <button
                  key={r.key}
                  className={`px-3 py-2 rounded-lg text-xs border ${
                    editRole === r.key
                      ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-white/5 text-white/60"
                  }`}
                  onClick={() => setEditRole(r.key)}
                >
                  {r.name}
                </button>
              ))}
            </div>
            <div className="mt-5">
              <div className="text-sm font-semibold text-white/80">Permission bundles</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(BUNDLES).map(([k, perms]) => (
                  <button
                    key={k}
                    className="px-3 py-2 rounded-lg text-xs border border-white/10 bg-white/5 text-white/60"
                    onClick={() => setRolePerms((prev) => ({ ...prev, [editRole]: perms }))}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5">
              <div className="text-sm font-semibold text-white/80">Permissions</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PERMISSIONS.map((p) => {
                  const enabled = rolePerms[editRole]?.includes(p);
                  return (
                    <button
                      key={p}
                      className={`px-3 py-2 rounded-lg text-xs border text-left ${
                        enabled ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/60"
                      }`}
                      onClick={() => togglePerm(editRole, p)}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-5">
              <button
                className="w-full rounded-xl bg-emerald-500 text-black px-4 py-2 text-sm font-semibold hover:bg-emerald-400"
                onClick={() => {
                  setApprovalNeeded("Saving permission changes requires approval.");
                  toast("Save requires backend");
                }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAdminDetail && currentAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50">
          <div className="w-full max-w-md h-full bg-[#0b0f14] border-l border-white/10 p-6 overflow-auto">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-white/90">Admin details</div>
              <button className="text-white/50 hover:text-white" onClick={() => setShowAdminDetail(false)}>
                Close
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <div>Email: <span className="text-white/90">{currentAdmin.email}</span></div>
              <div>Role: <span className="text-white/90">{currentAdmin.role}</span></div>
              <div>Status: <span className="text-white/90">{currentAdmin.is_active ? "Active" : "Disabled"}</span></div>
              <div>Last login: <span className="text-white/90">{formatDate(currentAdmin.last_login_at)}</span></div>
              <div className="text-xs text-white/50 mt-4">Recent sessions</div>
              <div className="text-xs text-white/40">Session data requires backend.</div>
            </div>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="px-4 py-3 rounded-2xl bg-black/80 border border-white/10 backdrop-blur flex items-center gap-3 text-xs text-white/70">
            <div>{selectedIds.length} selected</div>
            <button
              className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5"
              onClick={() => bulkSetActive(true)}
            >
              Enable
            </button>
            <button
              className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5"
              onClick={() => bulkSetActive(false)}
            >
              Disable
            </button>
            <button
              className="px-3 py-1.5 rounded-full text-xs border border-white/10 bg-white/5"
              onClick={() => setSelected({})}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
