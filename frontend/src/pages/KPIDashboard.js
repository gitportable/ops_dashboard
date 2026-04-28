import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  LineChart,
  ReferenceLine,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import {
  getCycleTime,
  getTeamEfficiency,
  getSprintVelocity,
  getOpenAging,
} from "../api/kpiApi";

/* ── Shared card base ─────────────────────────────────────────────────── */
const baseCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: "24px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  overflow: "hidden",
};

/* ── Cycle Time helpers ───────────────────────────────────────────────── */
const cycleBarColor = (days) => {
  const v = Number(days);
  if (v > 7) return "#ef4444";
  if (v >= 3) return "#f59e0b";
  return "#22c55e";
};

const CycleTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 10,
        padding: "10px 14px",
        color: "#f8fafc",
        fontSize: "0.82rem",
        lineHeight: 1.7,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div>Avg Days: <strong>{Number(d.avg_cycle_days || 0).toFixed(2)}</strong></div>
      <div>Min: <strong>{Number(d.min_cycle_days || 0).toFixed(2)}</strong></div>
      <div>Max: <strong>{Number(d.max_cycle_days || 0).toFixed(2)}</strong></div>
    </div>
  );
};

/* ── Team Efficiency helpers ──────────────────────────────────────────── */
const EXCLUDED_TEAMS = new Set(["none", "bgn"]);

const TeamTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload || {};
  return (
    <div
      style={{
        background: "#1e293b",
        borderRadius: 10,
        padding: "10px 14px",
        color: "#f8fafc",
        fontSize: "0.82rem",
        lineHeight: 1.7,
        boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div>Total Issues: <strong>{d.total ?? "—"}</strong></div>
      <div>Done: <strong>{d.done ?? "—"}</strong></div>
      <div>Blocked: <strong>{d.blocked ?? "—"}</strong></div>
      <div>
        Efficiency:{" "}
        <strong>{Number(d.efficiency_pct || 0).toFixed(1)}%</strong>
      </div>
    </div>
  );
};

const efficiencyCardColor = (pct) => {
  const v = Number(pct);
  if (v > 50) return { bg: "#f0fdf4", border: "#86efac", text: "#15803d", badge: "#22c55e" };
  if (v >= 20) return { bg: "#fff7ed", border: "#fdba74", text: "#c2410c", badge: "#f59e0b" };
  return { bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c", badge: "#ef4444" };
};

/* ════════════════════════════════════════════════════════════════════════ */
const KPIDashboard = () => {
  const { data: cycleData = [] } = useQuery({
    queryKey: ["kpiCycleTime"],
    queryFn: () =>
      getCycleTime().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamData = [] } = useQuery({
    queryKey: ["kpiTeamEfficiency"],
    queryFn: () =>
      getTeamEfficiency().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: sprintData = [] } = useQuery({
    queryKey: ["kpiSprintVelocity"],
    queryFn: () =>
      getSprintVelocity().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: agingData = {} } = useQuery({
    queryKey: ["kpiOpenAging"],
    queryFn: () =>
      getOpenAging().then((r) => (r?.data ? r.data : r)),
    staleTime: 5 * 60 * 1000,
  });

  /* ── Derived: cycle time average ──────────────────────────────────── */
  const cycleAvg = useMemo(() => {
    if (!cycleData.length) return 0;
    const sum = cycleData.reduce((acc, r) => acc + Number(r.avg_cycle_days || 0), 0);
    return sum / cycleData.length;
  }, [cycleData]);

  /* ── Derived: filtered + sorted team data ─────────────────────────── */
  const filteredTeams = useMemo(
    () =>
      teamData.filter(
        (t) => !EXCLUDED_TEAMS.has((t.team || "").toLowerCase())
      ),
    [teamData]
  );

  const top3Teams = useMemo(
    () =>
      [...filteredTeams]
        .sort((a, b) => Number(b.efficiency_pct) - Number(a.efficiency_pct))
        .slice(0, 3),
    [filteredTeams]
  );

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
            KPI &amp; Performance Dashboard
          </h1>
          <p style={{ color: "#6b7280", marginTop: 6 }}>
            Operational KPIs across projects, teams, and sprints.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 16px",
            background: "#1e3a8a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Export Report
        </button>
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>

        {/* ── FIX 1: Cycle Time ─────────────────────────────────────── */}
        <section style={{ ...baseCard, borderTop: "4px solid #1e3a8a" }}>
          {/* Gradient def */}
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <linearGradient id="cycleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
          </svg>

          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e3a8a" }}>
              Cycle Time
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Average days from creation to resolution per project
            </p>
          </div>

          <div style={{ height: 280, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cycleData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="project_name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CycleTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "0.78rem", color: "#64748b" }}
                />
                <ReferenceLine
                  y={cycleAvg}
                  stroke="#f59e0b"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  label={{
                    value: `Avg ${cycleAvg.toFixed(1)}d`,
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "#f59e0b",
                    fontWeight: 700,
                  }}
                />
                <Bar
                  dataKey="avg_cycle_days"
                  name="Avg Cycle Days"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                >
                  {cycleData.map((entry, idx) => (
                    <Cell
                      key={`cycle-cell-${idx}`}
                      fill={cycleBarColor(entry.avg_cycle_days)}
                    />
                  ))}
                </Bar>
                <Line
                  type="monotone"
                  dataKey="avg_cycle_days"
                  name="Trend"
                  stroke="#f59e0b"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── FIX 2: Team Efficiency ────────────────────────────────── */}
        <section style={{ ...baseCard, borderTop: "4px solid #22c55e" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e3a8a" }}>
              Team Efficiency
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Issue resolution rate by team
            </p>
          </div>

          <div style={{ height: 280, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredTeams}
                margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                <XAxis
                  dataKey="team"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<TeamTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "0.78rem", color: "#64748b" }}
                />
                <ReferenceLine
                  y={50}
                  stroke="#22c55e"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  label={{
                    value: "50% target",
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "#22c55e",
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="total" name="Total" fill="#bfdbfe" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="done" name="Done" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="blocked" name="Blocked" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 3 efficiency ranked cards */}
          {top3Teams.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              {top3Teams.map((team, i) => {
                const pct = Number(team.efficiency_pct || 0);
                const c = efficiencyCardColor(pct);
                return (
                  <div
                    key={team.team}
                    style={{
                      background: c.bg,
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 12,
                        background: c.badge,
                        color: "#fff",
                        borderRadius: 99,
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        padding: "2px 7px",
                      }}
                    >
                      #{i + 1}
                    </div>
                    <div style={{ fontWeight: 700, color: c.text, fontSize: "0.85rem" }}>
                      {team.team}
                    </div>
                    <div
                      style={{
                        fontSize: "1.6rem",
                        fontWeight: 800,
                        color: c.badge,
                        lineHeight: 1.2,
                        marginTop: 4,
                      }}
                    >
                      {pct.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: "0.74rem", color: c.text, marginTop: 2, opacity: 0.85 }}>
                      {team.done ?? 0}/{team.total ?? 0} issues done
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Sprint Velocity (unchanged) ───────────────────────────── */}
        <section style={{ ...baseCard, borderTop: "4px solid #f59e0b" }}>
          <h2 style={{ margin: "0 0 1rem", color: "#1e3a8a" }}>Sprint Velocity</h2>
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sprintData}>
                <XAxis dataKey="sprint" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#60a5fa" name="Total Issues" />
                <Line type="monotone" dataKey="done" stroke="#22c55e" name="Done Issues" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Open Issue Aging (unchanged) ──────────────────────────── */}
        <section style={{ ...baseCard, borderTop: "4px solid #ef4444" }}>
          <h2 style={{ margin: "0 0 1rem", color: "#1e3a8a" }}>Open Issue Aging</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { label: "> 7 days", value: agingData?.over7 ?? 0 },
              { label: "> 14 days", value: agingData?.over14 ?? 0 },
              { label: "> 30 days", value: agingData?.over30 ?? 0 },
            ].map((card) => (
              <div key={card.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px" }}>
                <div style={{ color: "#6b7280", fontSize: "0.8rem" }}>{card.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e3a8a" }}>{card.value}</div>
              </div>
            ))}
          </div>
          <div style={{ overflow: "hidden", borderRadius: 10, border: "1px solid #e5e7eb" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Issue", "Project", "Team", "Status", "Age (days)"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(agingData?.issues || []).map((row) => (
                  <tr key={row.issue_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "#1e293b" }}>
                      {row.issue_id}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>{row.projectid || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#374151" }}>{row.assigneeteam || "—"}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{row.status || "Open"}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                      {Number(row.age_days || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {(!agingData?.issues || agingData.issues.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ padding: "1.25rem", textAlign: "center", color: "#9ca3af" }}>
                      No open issues found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
};

export default KPIDashboard;
