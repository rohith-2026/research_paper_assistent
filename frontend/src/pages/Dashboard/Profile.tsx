import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BookOpen,
  Calendar,
  Copy,
  Download,
  ExternalLink,
  Folder,
  GripVertical,
  Mail,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import PageShell from "../../components/layout/PageShell";
import Card from "../../components/ui/Card";
import Loader from "../../components/ui/Loader";

import {
  apiAccountUsage,
  apiDeleteAccount,
  apiDeleteAccountData,
  apiGetMe,
  AccountUsageResponse,
  UserMeResponse,
} from "../../api/auth.api";
import { apiAnalyticsOverview, AnalyticsOverview } from "../../api/analytics.api";
import { apiListCollections } from "../../api/collections.api";
import { apiListDownloads } from "../../api/downloads.api";
import { apiHistory, apiListSavedPapers, HistoryItem, SavedPaper } from "../../api/assistant.api";
import { getErrorMessage } from "../../utils/errors";
import { useAuth } from "../../auth/useAuth";

export default function Profile() {
  const [profile, setProfile] = useState<UserMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [collectionsCount, setCollectionsCount] = useState<number | null>(null);
  const [downloadsCount, setDownloadsCount] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<HistoryItem[]>([]);
  const [recentPapers, setRecentPapers] = useState<SavedPaper[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteDataLoading, setDeleteDataLoading] = useState(false);
  const [usage, setUsage] = useState<AccountUsageResponse | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const { logout } = useAuth();

  const LAYOUT_KEY = "rpa_profile_layout";
  const [dragState, setDragState] = useState<{
    key: string | null;
    column: "left" | "right" | null;
  }>({ key: null, column: null });

  const defaultLayout = useMemo(
    () => ({
      left: ["header", "account", "usage", "danger"] as const,
      right: ["quick"] as const,
    }),
    []
  );
  const [layout, setLayout] = useState<{ left: string[]; right: string[] }>(() => ({
    left: [...defaultLayout.left],
    right: [...defaultLayout.right],
  }));

  const normalizeLayout = (next: { left: string[]; right: string[] }) => {
    const left = Array.isArray(next.left) ? [...next.left] : [...defaultLayout.left];
    const right = Array.isArray(next.right) ? [...next.right] : [...defaultLayout.right];
    const all = new Set([...left, ...right]);
    defaultLayout.left.forEach((k) => {
      if (!all.has(k)) left.push(k);
    });
    defaultLayout.right.forEach((k) => {
      if (!all.has(k)) right.push(k);
    });
    return { left, right };
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const data = await apiGetMe();
        setProfile(data);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load profile"));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLayout = localStorage.getItem(LAYOUT_KEY);
    if (storedLayout) {
      try {
        const parsed = JSON.parse(storedLayout);
        if (parsed?.left && parsed?.right) {
          setLayout(
            normalizeLayout({
              left: Array.isArray(parsed.left) ? parsed.left : [...defaultLayout.left],
              right: Array.isArray(parsed.right) ? parsed.right : [...defaultLayout.right],
            })
          );
        }
      } catch {
        /* ignore */
      }
    }
  }, [defaultLayout]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        const [ov, collections, downloads] = await Promise.all([
          apiAnalyticsOverview(),
          apiListCollections(),
          apiListDownloads(),
        ]);
        setOverview(ov);
        setCollectionsCount(collections.length);
        setDownloadsCount(downloads.length);
      } catch (e: unknown) {
        setStatsError(getErrorMessage(e, "Failed to load usage stats"));
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        setActivityLoading(true);
        const [historyRes, savedRes] = await Promise.all([
          apiHistory(3, 0),
          apiListSavedPapers(3, 0),
        ]);
        setRecentQueries(historyRes.items || []);
        setRecentPapers(savedRes || []);
      } catch (e: unknown) {
        setActivityError(getErrorMessage(e, "Failed to load activity"));
      } finally {
        setActivityLoading(false);
      }
    };
    loadActivity();
  }, []);

  useEffect(() => {
    const loadUsage = async () => {
      try {
        setUsageLoading(true);
        const res = await apiAccountUsage();
        setUsage(res);
      } catch (e: unknown) {
        setUsageError(getErrorMessage(e, "Failed to load storage usage"));
      } finally {
        setUsageLoading(false);
      }
    };
    loadUsage();
  }, []);


  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Unknown";
  const lastLogin = usage?.last_login_at || profile?.last_login_at;
  const lastLoginLabel = lastLogin
    ? new Date(lastLogin).toLocaleString("en-US")
    : "Unknown";
  const roleLabel = profile?.role ? profile.role : "user";

  const topSubjects = useMemo(() => {
    if (!overview?.top_subjects?.length) return [];
    return overview.top_subjects.slice(0, 5);
  }, [overview]);

  const copyToClipboard = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const persistLayout = (next: { left: string[]; right: string[] }) => {
    const normalized = normalizeLayout(next);
    setLayout(normalized);
    if (typeof window !== "undefined") {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(normalized));
    }
  };

  const onDragStart = (key: string, column: "left" | "right") => {
    setDragState({ key, column });
  };

  const onDrop = (targetKey: string, targetColumn: "left" | "right") => {
    if (!dragState.key || !dragState.column) return;
    const sourceColumn = dragState.column;
    const sourceList = [...layout[sourceColumn]];
    const targetList =
      sourceColumn === targetColumn ? sourceList : [...layout[targetColumn]];

    const movingIndex = sourceList.indexOf(dragState.key);
    if (movingIndex === -1) return;
    sourceList.splice(movingIndex, 1);

    const insertIndex = targetList.indexOf(targetKey);
    const finalIndex = insertIndex === -1 ? targetList.length : insertIndex;
    targetList.splice(finalIndex, 0, dragState.key);

    const next =
      sourceColumn === targetColumn
        ? {
            ...layout,
            [targetColumn]: targetList,
          }
        : {
            ...layout,
            [sourceColumn]: sourceList,
            [targetColumn]: targetList,
          };
    persistLayout(next);
    setDragState({ key: null, column: null });
  };

  const handleDeleteAccount = async () => {
    if (deleteLoading) return;
    const confirmed = window.confirm(
      "Delete your account permanently? This action cannot be undone."
    );
    if (!confirmed) return;
    const typed = window.prompt('Type "DELETE" to confirm.');
    if (typed !== "DELETE") {
      toast.error("Deletion cancelled.");
      return;
    }

    try {
      setDeleteLoading(true);
      const res = await apiDeleteAccount();
      if (res?.deleted === false) {
        throw new Error("Account could not be deleted.");
      }
      toast.success("Account deleted.");
      logout();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to delete account"));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteAccountData = async () => {
    if (deleteDataLoading) return;
    const confirmed = window.confirm(
      "Delete all your saved data but keep your account? This action cannot be undone."
    );
    if (!confirmed) return;
    const typed = window.prompt('Type "DELETE" to confirm.');
    if (typed !== "DELETE") {
      toast.error("Deletion cancelled.");
      return;
    }

    try {
      setDeleteDataLoading(true);
      const res = await apiDeleteAccountData();
      if (res?.deleted_data !== true) {
        throw new Error("Data could not be deleted.");
      }
      toast.success("Account data deleted.");
      logout();
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, "Failed to delete account data"));
    } finally {
      setDeleteDataLoading(false);
    }
  };

  return (
    <PageShell title="Profile" subtitle="Manage your account settings">
      <div className="max-w-5xl">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader size="lg" text="Loading profile..." />
          </div>
        )}

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        {profile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
              <div className="space-y-6">
                {layout.left.map((sectionKey) => {
                  const commonProps = {
                    draggable: true,
                    onDragStart: () => onDragStart(sectionKey, "left"),
                    onDragOver: (e: React.DragEvent) => e.preventDefault(),
                    onDrop: () => onDrop(sectionKey, "left"),
                    className: "relative",
                  };

                  if (sectionKey === "header") {
                    return (
                      <Card key="header" {...commonProps}>
                        <div className="absolute right-4 top-4 text-white/40 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                            <User className="w-8 h-8 text-black" />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h2 className="text-xl font-semibold">{profile.name}</h2>
                              <span className="text-xs uppercase tracking-[0.2em] px-2.5 py-1 rounded-full bg-white/10 text-white/60">
                                {roleLabel}
                              </span>
                            </div>
                            <p className="text-sm text-white/60">
                              Research Paper Assistant user workspace
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  if (sectionKey === "account") {
                    return (
                      <Card key="account" {...commonProps}>
                        <div className="absolute right-4 top-4 text-white/40 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold mb-4 text-white/80">
                          Account Information
                        </h3>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-white/60" />
                            <div className="flex-1">
                              <p className="text-xs text-white/50">Email</p>
                              <p className="text-sm font-medium">{profile.email}</p>
                            </div>
                            <button
                              className="text-xs text-white/60 hover:text-white transition"
                              onClick={() => copyToClipboard(profile.email, "Email")}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <User className="w-5 h-5 text-white/60" />
                            <div className="flex-1">
                              <p className="text-xs text-white/50">User ID</p>
                              <p className="text-sm font-mono">{profile.id}</p>
                            </div>
                            <button
                              className="text-xs text-white/60 hover:text-white transition"
                              onClick={() => copyToClipboard(profile.id, "User ID")}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-white/60" />
                            <div>
                              <p className="text-xs text-white/50">Member Since</p>
                              <p className="text-sm">{memberSince}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-white/60" />
                            <div>
                              <p className="text-xs text-white/50">Last Login</p>
                              <p className="text-sm">{lastLoginLabel}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="text-xs text-white/50 mb-2">Storage usage</div>
                          {usageLoading && (
                            <div className="text-xs text-white/50">Loading usage...</div>
                          )}
                          {usageError && (
                            <div className="text-xs text-red-300">{usageError}</div>
                          )}
                          {!usageLoading && !usageError && usage && (
                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                <div className="text-xs text-white/50">Total records</div>
                                <div className="text-sm font-semibold">{usage.total_records}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                <div className="text-xs text-white/50">Papers saved</div>
                                <div className="text-sm font-semibold">{usage.counts.papers}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                <div className="text-xs text-white/50">Notes</div>
                                <div className="text-sm font-semibold">{usage.counts.notes}</div>
                              </div>
                              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                                <div className="text-xs text-white/50">Queries</div>
                                <div className="text-sm font-semibold">{usage.counts.queries}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  }

                  if (sectionKey === "usage") {
                    return (
                      <Card key="usage" {...commonProps}>
                        <div className="absolute right-4 top-4 text-white/40 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Usage Snapshot
                          </h3>
                          <Link
                            className="text-xs text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                            to="/dashboard/analytics"
                          >
                            View analytics <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>

                        {statsLoading && (
                          <div className="py-6 flex justify-center">
                            <Loader size="md" text="Loading stats..." />
                          </div>
                        )}

                        {statsError && (
                          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/20 text-red-300 text-xs">
                            {statsError}
                          </div>
                        )}

                        {!statsLoading && !statsError && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="text-xs text-white/50">Queries</div>
                              <div className="text-lg font-semibold">
                                {overview?.total_queries ?? 0}
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="text-xs text-white/50">Saved papers</div>
                              <div className="text-lg font-semibold">
                                {overview?.papers_saved ?? 0}
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="text-xs text-white/50">Collections</div>
                              <div className="text-lg font-semibold">
                                {collectionsCount ?? 0}
                              </div>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                              <div className="text-xs text-white/50">Downloads</div>
                              <div className="text-lg font-semibold">
                                {downloadsCount ?? 0}
                              </div>
                            </div>
                          </div>
                        )}

                        {!!topSubjects.length && (
                          <div className="mt-4">
                            <div className="text-xs text-white/50 mb-2">Top subjects</div>
                            <div className="flex flex-wrap gap-2">
                              {topSubjects.map((s) => (
                                <span
                                  key={s.subject}
                                  className="px-3 py-1 rounded-full bg-white/8 border border-white/10 text-xs text-white/70"
                                >
                                  {s.subject} - {s.count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  }

                  if (sectionKey === "danger") {
                    return (
                      <Card key="danger" {...commonProps}>
                        <div className="absolute right-4 top-4 text-white/40 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-400" />
                            Danger Zone
                          </h3>
                        </div>
                        <p className="text-xs text-white/60">
                          Deleting your account removes your profile and all associated data.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:border-red-400 hover:text-red-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleDeleteAccountData}
                            disabled={deleteDataLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                            {deleteDataLoading ? "Deleting data..." : "Delete Data Only"}
                          </button>
                          <button
                            className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:border-red-400 hover:text-red-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                            {deleteLoading ? "Deleting..." : "Delete Account"}
                          </button>
                        </div>
                      </Card>
                    );
                  }

                  return null;
                })}
              </div>

              <div className="space-y-6">
                {layout.right.map((sectionKey) => {
                  const commonProps = {
                    draggable: true,
                    onDragStart: () => onDragStart(sectionKey, "right"),
                    onDragOver: (e: React.DragEvent) => e.preventDefault(),
                    onDrop: () => onDrop(sectionKey, "right"),
                    className: "relative",
                  };

                  if (sectionKey === "quick") {
                    return (
                      <Card key="quick" {...commonProps}>
                        <div className="absolute right-4 top-4 text-white/40 cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold mb-4 text-white/80 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Quick Actions
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <Link
                            to="/dashboard/notes"
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 hover:border-emerald-400/40 transition"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <BookOpen className="w-4 h-4 text-emerald-300" />
                              Notes
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                              Review and edit notes
                            </div>
                          </Link>
                          <Link
                            to="/dashboard/downloads"
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 hover:border-emerald-400/40 transition"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Download className="w-4 h-4 text-emerald-300" />
                              Downloads
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                              Export your papers
                            </div>
                          </Link>
                          <Link
                            to="/dashboard/history"
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 hover:border-emerald-400/40 transition"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Activity className="w-4 h-4 text-emerald-300" />
                              History
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                              Recent queries
                            </div>
                          </Link>
                          <Link
                            to="/dashboard/collections"
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 hover:border-emerald-400/40 transition"
                          >
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Folder className="w-4 h-4 text-emerald-300" />
                              Collections
                            </div>
                            <div className="text-xs text-white/50 mt-1">
                              Organize saved work
                            </div>
                          </Link>
                        </div>
                      </Card>
                    );
                  }

                  return null;
                })}
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-white/80">Recent Activity</div>
                    <Link
                      className="text-xs text-emerald-300 hover:text-emerald-200"
                      to="/dashboard/history"
                    >
                      View all
                    </Link>
                  </div>
                  {activityLoading && (
                    <div className="py-3">
                      <Loader size="sm" text="Loading activity..." />
                    </div>
                  )}
                  {activityError && (
                    <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/20 text-red-300 text-xs">
                      {activityError}
                    </div>
                  )}
                  {!activityLoading && !activityError && (
                    <div className="space-y-3">
                      {recentQueries.length === 0 && (
                        <div className="text-xs text-white/50">No recent queries yet.</div>
                      )}
                      {recentQueries.map((q) => (
                        <div key={q.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <div className="text-sm font-medium">
                            {q.subject_area || q.text || q.input_text || "Untitled query"}
                          </div>
                          <div className="text-xs text-white/50">
                            {q.created_at ? new Date(q.created_at).toLocaleString("en-US") : "Unknown date"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-white/80">Recently Saved Papers</div>
                    <Link
                      className="text-xs text-emerald-300 hover:text-emerald-200"
                      to="/dashboard/history"
                    >
                      Open saved papers
                    </Link>
                  </div>
                  {activityLoading && (
                    <div className="py-3">
                      <Loader size="sm" text="Loading papers..." />
                    </div>
                  )}
                  {!activityLoading && !activityError && (
                    <div className="space-y-3">
                      {recentPapers.length === 0 && (
                        <div className="text-xs text-white/50">No saved papers yet.</div>
                      )}
                      {recentPapers.map((p) => (
                        <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <div className="text-sm font-medium">{p.title}</div>
                          <div className="text-xs text-white/50">
                            {p.venue ? `${p.venue} - ` : ""}{p.year || "Unknown year"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
