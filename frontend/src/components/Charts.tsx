import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useReducedMotion } from "framer-motion";

const ACCENTS = {
  cyan: "#5EE7FF",
  blue: "#4C7DFF",
  pink: "#FF4FD8",
  purple: "#8B5CFF",
};

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Tooltip
          contentStyle={{
            background: "rgba(7,4,15,0.9)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.9)",
          }}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={54}
          outerRadius={80}
          paddingAngle={2}
          stroke="rgba(255,255,255,0.10)"
          isAnimationActive={!reduce}
          fill={ACCENTS.pink}
        />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          iconType="circle"
          wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PerformanceChart({
  data,
}: {
  data: { x: number; read: number; write: number }[];
}) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ left: 4, right: 4, top: 8, bottom: 0 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <Tooltip
          contentStyle={{
            background: "rgba(7,4,15,0.9)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.9)",
          }}
        />
        <Area
          type="monotone"
          dataKey="read"
          stroke={ACCENTS.cyan}
          fill="rgba(94,231,255,0.15)"
          strokeWidth={2}
          isAnimationActive={!reduce}
        />
        <Area
          type="monotone"
          dataKey="write"
          stroke={ACCENTS.blue}
          fill="rgba(76,125,255,0.12)"
          strokeWidth={2}
          isAnimationActive={!reduce}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ConfidenceChart({
  data,
}: {
  data: { x: number; value: number }[];
}) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <Tooltip
          contentStyle={{
            background: "rgba(7,4,15,0.9)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.9)",
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={ACCENTS.pink}
          strokeWidth={2}
          dot={false}
          isAnimationActive={!reduce}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SubjectTrendsChart({
  data,
  keys,
}: {
  data: Record<string, any>[];
  keys: string[];
}) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <Tooltip
          contentStyle={{
            background: "rgba(7,4,15,0.9)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.9)",
          }}
        />
        {keys.map((key, idx) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={[ACCENTS.cyan, ACCENTS.blue, ACCENTS.pink, ACCENTS.purple][idx % 4]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduce}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RetentionChart({
  data,
}: {
  data: { date: string; new_users: number; active_users: number }[];
}) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <Tooltip
          contentStyle={{
            background: "rgba(7,4,15,0.9)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.9)",
          }}
        />
        <Area
          type="monotone"
          dataKey="new_users"
          stroke={ACCENTS.blue}
          fill="rgba(76,125,255,0.18)"
          strokeWidth={2}
          isAnimationActive={!reduce}
        />
        <Area
          type="monotone"
          dataKey="active_users"
          stroke={ACCENTS.cyan}
          fill="rgba(94,231,255,0.12)"
          strokeWidth={2}
          isAnimationActive={!reduce}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ApiUsageChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data}>
        <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
        <Tooltip
          contentStyle={{
            background: "rgba(7,4,15,0.9)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.9)",
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke={ACCENTS.purple}
          fill="rgba(139,92,255,0.18)"
          strokeWidth={2}
          isAnimationActive={!reduce}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Sparkline({
  data,
}: {
  data: { x: number; y: number }[];
}) {
  const reduce = useReducedMotion();
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Tooltip
          cursor={false}
          contentStyle={{
            background: "rgba(7,4,15,0.9)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            color: "rgba(255,255,255,0.9)",
          }}
          labelStyle={{ color: "rgba(255,255,255,0.6)" }}
        />
        <Line
          type="monotone"
          dataKey="y"
          stroke={ACCENTS.purple}
          strokeWidth={2}
          dot={false}
          isAnimationActive={!reduce}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
