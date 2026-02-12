import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiAdminUserDetail } from "../../api/admin.api";
import Loader from "../../components/ui/Loader";
import { getErrorMessage } from "../../utils/errors";
import GlassCard from "../../components/GlassCard";
import ParallaxTilt from "../../components/ParallaxTilt";
import { ApiUsageChart } from "../../components/Charts";

export default function AdminUserAnalytics() {
  const { userId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      try {
        setLoading(true);
        const res = await apiAdminUserDetail(userId);
        setData(res);
      } catch (e: unknown) {
        setError(getErrorMessage(e, "Failed to load user analytics"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size="lg" text="Loading user analytics..." />
      </div>
    );
  }

  if (error) return <div className="text-sm text-red-300">{error}</div>;

  const profile = data?.profile || {};
  const counts = data?.counts || {};
  const activity = data?.activity || [];

  const activitySeries = useMemo(
    () =>
      (activity || []).map((d: any) => ({
        date: d.date,
        count: d.count || 0,
      })),
    [activity]
  );

  const lastActive = activitySeries.slice(-1)[0]?.date || "-";
  const totalActivity = activitySeries.reduce((sum: number, d: any) => sum + (d.count || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.35em] text-white/40">User Analytics</div>
        <div className="text-3xl font-semibold text-white/90 mt-2">Individual Research Profile</div>
        <div className="text-sm text-white/60 mt-2 max-w-2xl">
          Activity timeline and engagement signals for this user.
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-5">
            <div className="text-sm text-white/60">User</div>
            <div className="text-xl font-semibold text-white/90 mt-1">{profile.name || "Unknown"}</div>
            <div className="text-xs text-white/50 mt-1">{profile.email || "-"}</div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "-"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Last login {profile.last_login_at ? new Date(profile.last_login_at).toLocaleString() : "-"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Activity total {totalActivity}
              </span>
            </div>
          </GlassCard>
        </ParallaxTilt>

        <ParallaxTilt className="will-change-transform">
          <GlassCard className="p-5">
            <div className="text-sm text-white/80">Activity timeline</div>
            <div className="text-xs text-white/45 mt-1">Last active: {lastActive}</div>
            <div className="mt-4 h-44">
              <ApiUsageChart data={activitySeries} />
            </div>
          </GlassCard>
        </ParallaxTilt>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Queries", value: counts.queries },
          { label: "Papers", value: counts.papers },
          { label: "Notes", value: counts.notes },
          { label: "Downloads", value: counts.downloads },
        ].map((item) => (
          <GlassCard key={item.label} className="p-4">
            <div className="text-xs text-white/50">{item.label}</div>
            <div className="text-2xl font-semibold text-white/90 mt-2">{item.value ?? 0}</div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
