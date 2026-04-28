import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import * as issueApi from "../api/issueApi";
import api from "../api/axios";

const getFieldTickets = () => api.get("/field-tickets").then((r) => r.data);
const getWorkOrders = () => api.get("/work-orders").then((r) => r.data);
const getBatches = () => api.get("/batches").then((r) => r.data);
const getMachines = () => api.get("/machines").then((r) => r.data);

const normalizeStatus = (value) => {
  const status = (value || "").toLowerCase().trim();
  if (status === "open") return "open";
  if (status === "in progress") return "in_progress";
  if (status === "blocked") return "blocked";
  if (status === "done" || status === "resolved" || status === "closed") return "done";
  return "other";
};

const getIssueRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.issues)) return raw.issues;
  if (Array.isArray(raw?.data?.issues)) return raw.data.issues;
  return [];
};

const getTicketRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.tickets)) return raw.tickets;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const getWorkOrderRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.workOrders)) return raw.workOrders;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const getBatchRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.batches)) return raw.batches;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const getMachineRows = (raw) => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.machines)) return raw.machines;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
};

const stageColors = {
  "Raw Material": { bg: "#f3f4f6", color: "#4b5563" },
  Cell: { bg: "#dbeafe", color: "#1d4ed8" },
  Module: { bg: "#ede9fe", color: "#6d28d9" },
  Testing: { bg: "#ffedd5", color: "#c2410c" },
  Dispatch: { bg: "#dcfce7", color: "#16a34a" },
};

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#475569" }}>
    <style>
      {`@keyframes od-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}
    </style>
    <span
      style={{
        width: 16,
        height: 16,
        border: "2px solid #cbd5e1",
        borderTop: "2px solid #1e3a8a",
        borderRadius: "50%",
        animation: "od-spin 1s linear infinite",
      }}
    />
    <span style={{ fontSize: "0.9rem" }}>Loading...</span>
  </div>
);

const cardStyle = {
  background: "#ffffff",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  padding: "1.5rem",
};

const sectionTitleStyle = {
  margin: 0,
  marginBottom: "1rem",
  color: "#1e3a8a",
  fontSize: "1.05rem",
  fontWeight: 800,
};

const ResourceAllocation = () => {
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState("All Teams");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [expandedTeams, setExpandedTeams] = useState({});
  const [expandedSprints, setExpandedSprints] = useState({});
  const [teamSortBy, setTeamSortBy] = useState("total");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [displayedStats, setDisplayedStats] = useState({
    totalIssues: 0,
    totalTeams: 0,
    unassignedIssues: 0,
    overloadedTeams: 0,
  });

  const {
    data: issuesRaw,
    isLoading: issuesLoading,
    isError: issuesError,
    isFetching: issuesFetching,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ["issues"],
    queryFn: issueApi.getIssues,
  });

  const {
    data: ticketsRaw,
    isLoading: ticketsLoading,
    isError: ticketsError,
    isFetching: ticketsFetching,
    refetch: refetchTickets,
  } = useQuery({
    queryKey: ["fieldTickets"],
    queryFn: getFieldTickets,
  });

  const {
    data: workOrdersRaw,
    isLoading: workOrdersLoading,
    isError: workOrdersError,
    isFetching: workOrdersFetching,
    refetch: refetchWorkOrders,
  } = useQuery({
    queryKey: ["workOrders"],
    queryFn: getWorkOrders,
  });

  const {
    data: batchesRaw,
    isLoading: batchesLoading,
    isError: batchesError,
    isFetching: batchesFetching,
    refetch: refetchBatches,
  } = useQuery({
    queryKey: ["batches"],
    queryFn: getBatches,
  });

  const {
    data: machinesRaw,
    isLoading: machinesLoading,
    isError: machinesError,
    isFetching: machinesFetching,
    refetch: refetchMachines,
  } = useQuery({
    queryKey: ["machines"],
    queryFn: getMachines,
  });

  const issues = useMemo(() => getIssueRows(issuesRaw), [issuesRaw]);
  const tickets = useMemo(() => getTicketRows(ticketsRaw), [ticketsRaw]);
  const workOrders = useMemo(() => getWorkOrderRows(workOrdersRaw), [workOrdersRaw]);
  const batches = useMemo(() => getBatchRows(batchesRaw), [batchesRaw]);
  const machines = useMemo(() => getMachineRows(machinesRaw), [machinesRaw]);

  const teamBreakdown = useMemo(() => {
    const map = {};
    issues.forEach((issue) => {
      const rawTeam = (issue?.assigneeteam || "").trim().toLowerCase();
      const teamName = (!rawTeam || rawTeam === "none" || rawTeam === "unassigned")
        ? "Unassigned"
        : (issue?.assigneeteam || "").trim();
      const key = teamName.toLowerCase();
      if (!map[key]) {
        map[key] = {
          team: teamName,
          open: 0,
          inProgress: 0,
          blocked: 0,
          done: 0,
          total: 0,
        };
      }
      const status = normalizeStatus(issue?.status);
      map[key].total += 1;
      if (status === "open") map[key].open += 1;
      if (status === "in_progress") map[key].inProgress += 1;
      if (status === "blocked") map[key].blocked += 1;
      if (status === "done") map[key].done += 1;
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [issues]);

  const uniqueTeams = useMemo(() => teamBreakdown.map((t) => t.team), [teamBreakdown]);

  const filteredTeamBreakdown = useMemo(() => {
    const rows =
      selectedTeam === "All Teams"
        ? [...teamBreakdown]
        : teamBreakdown.filter((row) => row.team === selectedTeam);

    const statusFilteredRows = rows.filter((row) => {
      if (selectedStatusFilter === "all") return true;
      if (selectedStatusFilter === "open") return row.open > 0;
      if (selectedStatusFilter === "in_progress") return row.inProgress > 0;
      if (selectedStatusFilter === "blocked") return row.blocked > 0;
      if (selectedStatusFilter === "done") return row.done > 0;
      const otherCount = row.total - row.open - row.inProgress - row.blocked - row.done;
      return otherCount > 0;
    });

    if (teamSortBy === "open") {
      statusFilteredRows.sort((a, b) => b.open - a.open || b.total - a.total);
    } else {
      statusFilteredRows.sort((a, b) => b.total - a.total || b.open - a.open);
    }

    return statusFilteredRows;
  }, [selectedStatusFilter, selectedTeam, teamBreakdown, teamSortBy]);

  const teamWorkloadChartData = useMemo(
    () =>
      filteredTeamBreakdown.map((row) => ({
        assigneeteam: row.team,
        open: Number(row.open) || 0,
        in_progress: Number(row.inProgress) || 0,
      })),
    [filteredTeamBreakdown]
  );
  console.log("workloadData", teamWorkloadChartData);

  const unassignedCount = useMemo(
    () => issues.filter((issue) => {
      const team = (issue?.assigneeteam || "").trim().toLowerCase();
      return !team || team === "none" || team === "unassigned" || team === "n/a";
    }).length,
    [issues]
  );

  const unassignedIssues = useMemo(
    () => issues.filter((issue) => {
      const team = (issue?.assigneeteam || "").trim().toLowerCase();
      return !team || team === "none" || team === "unassigned" || team === "n/a";
    }),
    [issues]
  );

  const overloadedTeams = useMemo(
    () => teamBreakdown.filter((row) => row.team !== "Unassigned" && row.open > 3),
    [teamBreakdown]
  );

  const sprintRows = useMemo(() => {
    const map = {};
    issues.forEach((issue) => {
      const sprintName =
        (issue?.sprint || issue?.sprintname || issue?.sprint_name || "").trim() || "Backlog / No Sprint";
      const key = sprintName.toLowerCase();
      if (!map[key]) {
        map[key] = {
          sprint: sprintName,
          total: 0,
          done: 0,
          remaining: 0,
        };
      }
      const status = normalizeStatus(issue?.status);
      map[key].total += 1;
      if (status === "done") map[key].done += 1;
      else map[key].remaining += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [issues]);

  const sprintIssueMap = useMemo(() => {
    const map = {};
    issues.forEach((issue) => {
      const sprintName =
        (issue?.sprint || issue?.sprintname || issue?.sprint_name || "").trim() || "Backlog / No Sprint";
      if (!map[sprintName]) map[sprintName] = [];
      map[sprintName].push(issue);
    });
    return map;
  }, [issues]);

  const fieldTicketStats = useMemo(() => {
    let open = 0;
    let inProgress = 0;
    let resolved = 0;

    tickets.forEach((ticket) => {
      const status = (ticket?.status || "").toLowerCase().trim();
      if (status === "open") open += 1;
      if (status === "in progress") inProgress += 1;
      if (status === "resolved" || status === "closed") resolved += 1;
    });

    return { open, inProgress, resolved };
  }, [tickets]);

  const issueStatusDistribution = useMemo(() => {
    const counts = {
      open: 0,
      in_progress: 0,
      done: 0,
      blocked: 0,
      other: 0,
    };
    issues.forEach((issue) => {
      const normalized = normalizeStatus(issue?.status);
      counts[normalized] += 1;
    });
    return [
      { name: "Open", value: counts.open, color: "#3b82f6", statusKey: "open" },
      { name: "In Progress", value: counts.in_progress, color: "#f59e0b", statusKey: "in_progress" },
      { name: "Done", value: counts.done, color: "#22c55e", statusKey: "done" },
      { name: "Blocked", value: counts.blocked, color: "#ef4444", statusKey: "blocked" },
      { name: "Other", value: counts.other, color: "#94a3b8", statusKey: "other" },
    ];
  }, [issues]);

  const teamVelocityData = useMemo(
    () =>
      teamBreakdown.map((row) => ({
        team: row.team,
        total: row.total,
        done: row.done,
      })),
    [teamBreakdown]
  );

  const openFieldTickets = useMemo(
    () =>
      tickets
        .filter((ticket) => {
          const status = (ticket?.status || "").toLowerCase().trim();
          return status !== "closed" && status !== "resolved";
        })
        .slice(0, 6),
    [tickets]
  );

  const fieldByType = useMemo(
    () =>
      tickets.reduce((acc, t) => {
        const type = t?.ticket_type || t?.type || "Other";
        const ex = acc.find((x) => x.type === type);
        if (ex) ex.count += 1;
        else acc.push({ type, count: 1 });
        return acc;
      }, []),
    [tickets]
  );

  const workOrderLoadRows = useMemo(() => {
    const orderedStages = ["Raw Material", "Cell", "Module", "Testing", "Dispatch"];
    const map = {};
    orderedStages.forEach((stage) => {
      map[stage] = { stage, total: 0, inProgress: 0, completed: 0 };
    });

    workOrders.forEach((wo) => {
      const stageRaw = (wo?.stage || "").trim();
      const statusRaw = (wo?.status || "").toLowerCase().trim();
      const stage = orderedStages.includes(stageRaw) ? stageRaw : "Raw Material";
      map[stage].total += 1;
      if (statusRaw === "in progress") map[stage].inProgress += 1;
      if (statusRaw === "completed") map[stage].completed += 1;
    });

    return orderedStages.map((stage) => map[stage]);
  }, [workOrders]);

  const batchQualityStats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let pending = 0;

    batches.forEach((batch) => {
      const qcStatus = (batch?.qc_status || batch?.quality_status || batch?.quality_check_status || batch?.status || "")
        .toLowerCase()
        .trim();
      if (qcStatus === "passed") passed += 1;
      else if (qcStatus === "failed") failed += 1;
      else pending += 1;
    });

    return { passed, failed, pending };
  }, [batches]);

  const failedBatches = useMemo(
    () =>
      batches.filter((batch) => {
        const qcStatus = (batch?.qc_status || batch?.quality_status || batch?.quality_check_status || batch?.status || "")
          .toLowerCase()
          .trim();
        return qcStatus === "failed";
      }),
    [batches]
  );

  const machineStatusStats = useMemo(() => {
    let operational = 0;
    let down = 0;
    let maintenance = 0;

    machines.forEach((machine) => {
      const status = (machine?.status || machine?.machine_status || "").toLowerCase().trim();
      if (status === "down") down += 1;
      else if (status === "maintenance") maintenance += 1;
      else operational += 1;
    });

    return { operational, down, maintenance };
  }, [machines]);

  const machineAttentionRows = useMemo(
    () =>
      machines.filter((machine) => {
        const status = (machine?.status || machine?.machine_status || "").toLowerCase().trim();
        return status === "down" || status === "maintenance";
      }),
    [machines]
  );

  const statTargets = useMemo(() => {
    const totalIssues = issues.length;
    const totalTeams = uniqueTeams.length;
    const unassignedIssues = unassignedCount;
    const overloadedTeams = teamBreakdown.filter((row) => row.open > 5).length;
    return { totalIssues, totalTeams, unassignedIssues, overloadedTeams };
  }, [issues.length, uniqueTeams.length, unassignedCount, teamBreakdown]);

  useEffect(() => {
    const steps = 24;
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      const ratio = current / steps;
      setDisplayedStats({
        totalIssues: Math.round(statTargets.totalIssues * ratio),
        totalTeams: Math.round(statTargets.totalTeams * ratio),
        unassignedIssues: Math.round(statTargets.unassignedIssues * ratio),
        overloadedTeams: Math.round(statTargets.overloadedTeams * ratio),
      });
      if (current >= steps) {
        clearInterval(interval);
        setDisplayedStats(statTargets);
      }
    }, 25);

    return () => clearInterval(interval);
  }, [statTargets]);

  useEffect(() => {
    if ((issues.length > 0 || tickets.length > 0) && !lastUpdated) {
      setLastUpdated(new Date());
    }
  }, [issues.length, tickets.length, lastUpdated]);

  const toggleTeamExpanded = (teamName) => {
    setExpandedTeams((prev) => ({ ...prev, [teamName]: !prev[teamName] }));
  };

  const toggleSprintExpanded = (sprintName) => {
    setExpandedSprints((prev) => ({ ...prev, [sprintName]: !prev[sprintName] }));
  };

  const getTeamIssues = (teamName) =>
    issues.filter((issue) => {
      const rawTeam = (issue?.assigneeteam || "").trim().toLowerCase();
      const normalizedTeam = (!rawTeam || rawTeam === "none" || rawTeam === "unassigned") ? "Unassigned" : (issue?.assigneeteam || "").trim();
      if (normalizedTeam !== teamName) return false;
      if (selectedStatusFilter === "all") return true;
      return normalizeStatus(issue?.status) === selectedStatusFilter;
    });

  const getIssueType = (issue) => {
    const type = (issue?.issuetype || issue?.issue_type || issue?.type || "Task").toString();
    return type;
  };

  const getStatusBadge = (statusRaw) => {
    const status = (statusRaw || "Open").toLowerCase().trim();
    if (status === "done" || status === "resolved" || status === "closed") {
      return { bg: "#dcfce7", color: "#166534", label: "Done" };
    }
    if (status === "blocked") {
      return { bg: "#fee2e2", color: "#b91c1c", label: "Blocked" };
    }
    if (status === "in progress") {
      return { bg: "#fef3c7", color: "#a16207", label: "In Progress" };
    }
    return { bg: "#dbeafe", color: "#1d4ed8", label: "Open" };
  };

  const getHealthBadge = (openCount) => {
    if (openCount > 10) return { label: "Overloaded", bg: "#fee2e2", color: "#b91c1c" };
    if (openCount >= 5) return { label: "Busy", bg: "#ffedd5", color: "#c2410c" };
    return { label: "Healthy", bg: "#dcfce7", color: "#166534" };
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["issues"] }),
        queryClient.invalidateQueries({ queryKey: ["fieldTickets"] }),
        queryClient.invalidateQueries({ queryKey: ["workOrders"] }),
        queryClient.invalidateQueries({ queryKey: ["batches"] }),
        queryClient.invalidateQueries({ queryKey: ["machines"] }),
      ]);
      await Promise.all([refetchIssues(), refetchTickets(), refetchWorkOrders(), refetchBatches(), refetchMachines()]);
      setLastUpdated(new Date());
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshSpinning =
    isRefreshing || issuesFetching || ticketsFetching || workOrdersFetching || batchesFetching || machinesFetching;
  const lastUpdatedText = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-US", { hour12: false })
    : "--:--:--";

  return (
    <div style={{ padding: "1.5rem 2rem", background: "#F8FAFC", minHeight: "100vh" }}>
      <style>
        {`@keyframes ra-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}
      </style>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ margin: 0, color: "#1e3a8a", fontSize: "1.45rem", fontWeight: 800 }}>
          Resource & Capacity Dashboard
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onRefresh}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              borderRadius: 8,
              padding: "0.45rem 0.8rem",
              color: "#1e3a8a",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                display: "inline-block",
                animation: refreshSpinning ? "ra-spin 0.9s linear infinite" : "none",
              }}
            >
              ↻
            </span>
            Refresh
          </button>
          <span style={{ color: "#64748b", fontSize: "0.84rem" }}>Last updated: {lastUpdatedText}</span>
        </div>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        {[
          { label: "Total Issues", key: "totalIssues", color: "#3b82f6" },
          { label: "Total Teams", key: "totalTeams", color: "#8b5cf6" },
          { label: "Unassigned Issues", key: "unassignedIssues", color: "#ef4444" },
          { label: "Overloaded Teams", key: "overloadedTeams", color: "#f59e0b" },
        ].map((card) => (
          <div
            key={card.key}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "0.85rem 1rem",
              borderLeft: `6px solid ${card.color}`,
            }}
          >
            <div style={{ fontSize: "1.65rem", lineHeight: 1.1, fontWeight: 800, color: "#0f172a" }}>
              {displayedStats[card.key]}
            </div>
            <div style={{ color: "#64748b", fontSize: "0.82rem", marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </section>

      <section
        style={{
          ...cardStyle,
          marginBottom: "1rem",
          padding: "0.9rem 1rem",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["All Teams", ...uniqueTeams].map((team) => (
            <button
              key={team}
              onClick={() => setSelectedTeam(team)}
              style={{
                border: "none",
                borderRadius: 999,
                padding: "0.42rem 0.82rem",
                fontWeight: 700,
                fontSize: "0.78rem",
                cursor: "pointer",
                background: selectedTeam === team ? "#1e3a8a" : "#e2e8f0",
                color: selectedTeam === team ? "#ffffff" : "#334155",
              }}
            >
              {team}
            </button>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1rem" }}>
        <section style={{ ...cardStyle, minHeight: 300, display: "flex", flexDirection: "column" }}>
          <h2 style={sectionTitleStyle}>Team Workload — Open Issues by Team</h2>
          {issuesLoading && <Spinner />}
          {!issuesLoading && issuesError && <div style={{ color: "#b91c1c" }}>Failed to load issues.</div>}
          {!issuesLoading && !issuesError && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamWorkloadChartData}>
                  <XAxis dataKey="assigneeteam" tick={{ fill: "#334155", fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    dataKey="open"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => {
                      const team = data?.assigneeteam || data?.payload?.assigneeteam || "All Teams";
                      setSelectedTeam(team);
                    }}
                  >
                    {teamWorkloadChartData.map((entry) => (
                      <Cell
                        key={`open-${entry.assigneeteam}`}
                        fillOpacity={selectedTeam === "All Teams" || selectedTeam === entry.assigneeteam ? 1 : 0.4}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="in_progress"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => {
                      const team = data?.assigneeteam || data?.payload?.assigneeteam || "All Teams";
                      setSelectedTeam(team);
                    }}
                  >
                    {teamWorkloadChartData.map((entry) => (
                      <Cell
                        key={`prog-${entry.assigneeteam}`}
                        fillOpacity={selectedTeam === "All Teams" || selectedTeam === entry.assigneeteam ? 1 : 0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Team Issue Breakdown</h2>
          {issuesLoading && <Spinner />}
          {!issuesLoading && issuesError && <div style={{ color: "#b91c1c" }}>Failed to load issues.</div>}
          {!issuesLoading && !issuesError && (
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => setTeamSortBy("total")}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: teamSortBy === "total" ? "#1e3a8a" : "#ffffff",
                    color: teamSortBy === "total" ? "#ffffff" : "#334155",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: "0.74rem",
                    padding: "0.36rem 0.62rem",
                    cursor: "pointer",
                  }}
                >
                  Sort by Total (desc)
                </button>
                <button
                  onClick={() => setTeamSortBy("open")}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: teamSortBy === "open" ? "#1e3a8a" : "#ffffff",
                    color: teamSortBy === "open" ? "#ffffff" : "#334155",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: "0.74rem",
                    padding: "0.36rem 0.62rem",
                    cursor: "pointer",
                  }}
                >
                  Sort by Open (desc)
                </button>
                <button
                  onClick={() => setSelectedStatusFilter("all")}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: selectedStatusFilter === "all" ? "#1e3a8a" : "#ffffff",
                    color: selectedStatusFilter === "all" ? "#ffffff" : "#334155",
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: "0.74rem",
                    padding: "0.36rem 0.62rem",
                    cursor: "pointer",
                  }}
                >
                  Status: {selectedStatusFilter === "all" ? "All" : selectedStatusFilter.replace("_", " ")}
                </button>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {["Team", "Open", "In Progress", "Blocked", "Done", "Total", "Health"].map((label) => (
                      <th
                        key={label}
                        style={{
                          textAlign: "left",
                          padding: "0.65rem 0.75rem",
                          color: "#64748b",
                          fontSize: "0.72rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeamBreakdown.map((row) => {
                    let bg = "#ffffff";
                    if (row.open > 10) bg = "#fee2e2";
                    else if (row.open > 5) bg = "#ffedd5";
                    const health = getHealthBadge(row.open);
                    const isExpanded = !!expandedTeams[row.team];
                    const teamIssues = getTeamIssues(row.team);

                    return (
                      <React.Fragment key={row.team}>
                        <tr
                          style={{ borderBottom: "1px solid #f1f5f9", background: bg, cursor: "pointer" }}
                          onClick={() => toggleTeamExpanded(row.team)}
                        >
                          <td style={{ padding: "0.65rem 0.75rem", color: "#0f172a", fontWeight: 700 }}>
                            {isExpanded ? "▾ " : "▸ "}
                            {row.team}
                          </td>
                          <td style={{ padding: "0.65rem 0.75rem", color: "#0f172a" }}>{row.open}</td>
                          <td style={{ padding: "0.65rem 0.75rem", color: "#0f172a" }}>{row.inProgress}</td>
                          <td style={{ padding: "0.65rem 0.75rem", color: "#0f172a" }}>{row.blocked}</td>
                          <td style={{ padding: "0.65rem 0.75rem", color: "#0f172a" }}>{row.done}</td>
                          <td style={{ padding: "0.65rem 0.75rem", color: "#0f172a", fontWeight: 700 }}>{row.total}</td>
                          <td style={{ padding: "0.65rem 0.75rem" }}>
                            <span
                              style={{
                                background: health.bg,
                                color: health.color,
                                borderRadius: 999,
                                padding: "0.2rem 0.55rem",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                              }}
                            >
                              {health.label}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={7} style={{ padding: "0.65rem 0.75rem", background: "#f8fafc" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                                    {["Issue ID", "Type", "Status", "Sprint"].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          textAlign: "left",
                                          padding: "0.45rem 0.5rem",
                                          color: "#64748b",
                                          fontSize: "0.69rem",
                                          textTransform: "uppercase",
                                          letterSpacing: "0.04em",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {teamIssues.map((issue, issueIndex) => {
                                    const type = getIssueType(issue);
                                    const isBug = type.toLowerCase() === "bug";
                                    const statusBadge = getStatusBadge(issue?.status);
                                    const sprintLabel =
                                      (issue?.sprint || issue?.sprintname || issue?.sprint_name || "").trim() ||
                                      "Backlog / No Sprint";
                                    return (
                                      <tr key={issue?.issueid || `${row.team}-${issueIndex}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                        <td style={{ padding: "0.42rem 0.5rem", color: "#0f172a", fontWeight: 700 }}>
                                          {issue?.issueid || "—"}
                                        </td>
                                        <td style={{ padding: "0.42rem 0.5rem" }}>
                                          <span
                                            style={{
                                              background: isBug ? "#fee2e2" : "#dbeafe",
                                              color: isBug ? "#b91c1c" : "#1d4ed8",
                                              borderRadius: 999,
                                              padding: "0.18rem 0.5rem",
                                              fontSize: "0.69rem",
                                              fontWeight: 700,
                                            }}
                                          >
                                            {type}
                                          </span>
                                        </td>
                                        <td style={{ padding: "0.42rem 0.5rem" }}>
                                          <span
                                            style={{
                                              background: statusBadge.bg,
                                              color: statusBadge.color,
                                              borderRadius: 999,
                                              padding: "0.18rem 0.5rem",
                                              fontSize: "0.69rem",
                                              fontWeight: 700,
                                            }}
                                          >
                                            {statusBadge.label}
                                          </span>
                                        </td>
                                        <td style={{ padding: "0.42rem 0.5rem", color: "#334155" }}>{sprintLabel}</td>
                                      </tr>
                                    );
                                  })}
                                  {teamIssues.length === 0 && (
                                    <tr>
                                      <td colSpan={4} style={{ padding: "0.6rem", color: "#94a3b8", textAlign: "center" }}>
                                        No issues found for this team.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredTeamBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "1rem", color: "#94a3b8", textAlign: "center" }}>
                        No issues available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Unassigned Issues</h2>
          {issuesLoading && <Spinner />}
          {!issuesLoading && issuesError && <div style={{ color: "#b91c1c" }}>Failed to load issues.</div>}
          {!issuesLoading && !issuesError && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "0.9rem 1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ color: "#334155", fontWeight: 700 }}>Issues without a team assignment</div>
                  <span
                    style={{
                      background: unassignedCount > 0 ? "#dc2626" : "#16a34a",
                      color: "#fff",
                      borderRadius: 999,
                      minWidth: 36,
                      textAlign: "center",
                      padding: "0.25rem 0.65rem",
                      fontWeight: 800,
                    }}
                  >
                    {unassignedCount}
                  </span>
                </div>
                {unassignedCount === 0 ? (
                  <div style={{ color: "#166534", fontWeight: 700 }}>All issues are assigned ✓</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 460 }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                          {["Issue ID", "Type", "Sprint", "Status", "Created Date"].map((h) => (
                            <th
                              key={h}
                              style={{
                                textAlign: "left",
                                padding: "0.4rem 0.45rem",
                                color: "#64748b",
                                fontSize: "0.69rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedIssues.map((issue, issueIndex) => {
                          const statusBadge = getStatusBadge(issue?.status);
                          const sprintLabel =
                            (issue?.sprint || issue?.sprintname || issue?.sprint_name || "").trim() || "Backlog / No Sprint";
                          return (
                            <tr key={issue?.issueid || `unassigned-${issueIndex}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "0.4rem 0.45rem", color: "#0f172a", fontWeight: 700 }}>{issue?.issueid || "—"}</td>
                              <td style={{ padding: "0.4rem 0.45rem", color: "#334155" }}>{getIssueType(issue)}</td>
                              <td style={{ padding: "0.4rem 0.45rem", color: "#334155" }}>{sprintLabel}</td>
                              <td style={{ padding: "0.4rem 0.45rem" }}>
                                <span
                                  style={{
                                    background: statusBadge.bg,
                                    color: statusBadge.color,
                                    borderRadius: 999,
                                    padding: "0.16rem 0.5rem",
                                    fontSize: "0.69rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  {statusBadge.label}
                                </span>
                              </td>
                              <td style={{ padding: "0.4rem 0.45rem", color: "#334155" }}>
                                {issue?.createddate ? new Date(issue.createddate).toLocaleDateString() : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "0.9rem 1rem",
                }}
              >
                <div style={{ color: "#334155", fontWeight: 700, marginBottom: 10 }}>Overloaded Teams</div>
                {overloadedTeams.length === 0 ? (
                  <div style={{ color: "#166534", fontWeight: 700 }}>No overloaded teams ✓</div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {overloadedTeams.map((team) => (
                      <span
                        key={team.team}
                        style={{
                          background: "#fff7ed",
                          color: "#c2410c",
                          border: "1px solid #fdba74",
                          borderRadius: 999,
                          padding: "0.25rem 0.6rem",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                        }}
                      >
                        ⚠ {team.team} ({team.open} open)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Work Order Load</h2>
          {workOrdersLoading && <Spinner />}
          {!workOrdersLoading && workOrdersError && <div style={{ color: "#b91c1c" }}>Failed to load work orders.</div>}
          {!workOrdersLoading && !workOrdersError && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    {["Stage", "Total WOs", "In Progress", "Completed"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "0.6rem 0.75rem",
                          color: "#64748b",
                          fontSize: "0.72rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workOrderLoadRows.map((row) => {
                    const badge = stageColors[row.stage] || { bg: "#f3f4f6", color: "#4b5563" };
                    return (
                      <tr key={row.stage} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "0.55rem 0.75rem" }}>
                          <span
                            style={{
                              background: badge.bg,
                              color: badge.color,
                              borderRadius: 999,
                              padding: "0.2rem 0.55rem",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                            }}
                          >
                            {row.stage}
                          </span>
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "#0f172a", fontWeight: 700 }}>{row.total}</td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>{row.inProgress}</td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "#166534", fontWeight: 700 }}>{row.completed}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>Batch Quality Overview</h2>
          {batchesLoading && <Spinner />}
          {!batchesLoading && batchesError && <div style={{ color: "#b91c1c" }}>Failed to load batches.</div>}
          {!batchesLoading && !batchesError && (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
                <div style={{ background: "#ecfdf5", border: "1px solid #86efac", borderRadius: 10, padding: "0.85rem" }}>
                  <div style={{ color: "#166534", fontSize: "0.8rem", fontWeight: 700 }}>Passed</div>
                  <div style={{ color: "#166534", fontSize: "1.4rem", fontWeight: 800 }}>{batchQualityStats.passed}</div>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "0.85rem" }}>
                  <div style={{ color: "#b91c1c", fontSize: "0.8rem", fontWeight: 700 }}>Failed</div>
                  <div style={{ color: "#b91c1c", fontSize: "1.4rem", fontWeight: 800 }}>{batchQualityStats.failed}</div>
                </div>
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "0.85rem" }}>
                  <div style={{ color: "#a16207", fontSize: "0.8rem", fontWeight: 700 }}>Pending</div>
                  <div style={{ color: "#a16207", fontSize: "1.4rem", fontWeight: 800 }}>{batchQualityStats.pending}</div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Lot Number", "Material", "Supplier", "QC Status"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "0.6rem 0.75rem",
                            color: "#64748b",
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {failedBatches.map((batch, idx) => (
                      <tr key={`${batch?.lot_number || batch?.batch_lot || "failed"}-${idx}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                        <td style={{ padding: "0.55rem 0.75rem", color: "#0f172a", fontWeight: 700 }}>
                          {batch?.lot_number || batch?.batch_lot || batch?.lot_no || "—"}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>
                          {batch?.material || batch?.material_name || "—"}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>
                          {batch?.supplier || batch?.supplier_name || batch?.vendor || "—"}
                        </td>
                        <td style={{ padding: "0.55rem 0.75rem" }}>
                          <span style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 999, padding: "0.2rem 0.55rem", fontSize: "0.72rem", fontWeight: 700 }}>
                            Failed
                          </span>
                        </td>
                      </tr>
                    ))}
                    {failedBatches.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: "0.8rem", textAlign: "center", color: "#94a3b8" }}>
                          No failed batches.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: "1rem" }}>
            <section style={cardStyle}>
              <h2 style={sectionTitleStyle}>Sprint Capacity Overview</h2>
              {issuesLoading && <Spinner />}
              {!issuesLoading && issuesError && <div style={{ color: "#b91c1c" }}>Failed to load issues.</div>}
              {!issuesLoading && !issuesError && (
                <div style={{ display: "grid", gap: "0.65rem" }}>
                  {sprintRows.map((row) => {
                    const donePct = row.total > 0 ? (row.done / row.total) * 100 : 0;
                    let color = "#dc2626";
                    if (donePct > 70) color = "#16a34a";
                    else if (donePct >= 40) color = "#f59e0b";
                    const isExpanded = !!expandedSprints[row.sprint];
                    const sprintIssues = sprintIssueMap[row.sprint] || [];

                    return (
                      <div
                        key={row.sprint}
                        style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "0.7rem 0.8rem", cursor: "pointer" }}
                        onClick={() => toggleSprintExpanded(row.sprint)}
                      >
                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: "0.5rem", marginBottom: 8, fontSize: "0.86rem" }}>
                          <div style={{ color: "#0f172a", fontWeight: 700 }}>
                            {isExpanded ? "▾ " : "▸ "}
                            {row.sprint}
                          </div>
                          <div style={{ color: "#334155" }}>Total: {row.total}</div>
                          <div style={{ color: "#334155" }}>Done: {row.done}</div>
                          <div style={{ color: "#334155" }}>Remaining: {row.remaining}</div>
                        </div>
                        <div style={{ width: "100%", height: 10, background: "#e2e8f0", borderRadius: 999 }}>
                          <div
                            style={{
                              width: `${donePct}%`,
                              height: "100%",
                              background: color,
                              borderRadius: 999,
                              transition: "width 250ms ease",
                            }}
                          />
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 8, padding: "0.55rem" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                                  {["Issue ID", "Type", "Status", "Team"].map((h) => (
                                    <th
                                      key={h}
                                      style={{
                                        textAlign: "left",
                                        padding: "0.45rem 0.5rem",
                                        color: "#64748b",
                                        fontSize: "0.69rem",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.04em",
                                      }}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sprintIssues.map((issue, issueIndex) => {
                                  const statusBadge = getStatusBadge(issue?.status);
                                  const type = getIssueType(issue);
                                  const teamName = (issue?.assigneeteam || "").trim() || "Unassigned";
                                  return (
                                    <tr key={issue?.issueid || `${row.sprint}-${issueIndex}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                      <td style={{ padding: "0.42rem 0.5rem", color: "#0f172a", fontWeight: 700 }}>
                                        {issue?.issueid || "—"}
                                      </td>
                                      <td style={{ padding: "0.42rem 0.5rem", color: "#334155" }}>{type}</td>
                                      <td style={{ padding: "0.42rem 0.5rem" }}>
                                        <span
                                          style={{
                                            background: statusBadge.bg,
                                            color: statusBadge.color,
                                            borderRadius: 999,
                                            padding: "0.18rem 0.5rem",
                                            fontSize: "0.69rem",
                                            fontWeight: 700,
                                          }}
                                        >
                                          {statusBadge.label}
                                        </span>
                                      </td>
                                      <td style={{ padding: "0.42rem 0.5rem", color: "#334155" }}>{teamName}</td>
                                    </tr>
                                  );
                                })}
                                {sprintIssues.length === 0 && (
                                  <tr>
                                    <td colSpan={4} style={{ padding: "0.6rem", color: "#94a3b8", textAlign: "center" }}>
                                      No issues found in this sprint.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {sprintRows.length === 0 && <div style={{ color: "#94a3b8" }}>No sprint data available.</div>}
                </div>
              )}
            </section>

            <div style={{ display: "grid", gap: "1rem" }}>
              <section style={{ ...cardStyle, minHeight: 300, display: "flex", flexDirection: "column" }}>
                <h2 style={sectionTitleStyle}>Issue Status Distribution</h2>
                {issuesLoading && <Spinner />}
                {!issuesLoading && issuesError && <div style={{ color: "#b91c1c" }}>Failed to load issues.</div>}
                {!issuesLoading && !issuesError && (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={issueStatusDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          outerRadius={90}
                          onClick={(entry) => {
                            const key = entry?.statusKey || entry?.payload?.statusKey;
                            if (key) setSelectedStatusFilter(key);
                          }}
                        >
                          {issueStatusDistribution.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section style={{ ...cardStyle, minHeight: 300, display: "flex", flexDirection: "column" }}>
                <h2 style={sectionTitleStyle}>Team Velocity Trend</h2>
                {issuesLoading && <Spinner />}
                {!issuesLoading && issuesError && <div style={{ color: "#b91c1c" }}>Failed to load issues.</div>}
                {!issuesLoading && !issuesError && (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={teamVelocityData}>
                        <XAxis dataKey="team" tick={{ fill: "#334155", fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="total"
                          name="Total Issues"
                          fill="#3b82f6"
                          radius={[4, 4, 0, 0]}
                          onClick={(payload) => {
                            const team = payload?.team || payload?.payload?.team;
                            if (team) setSelectedTeam(team);
                          }}
                        />
                        <Bar
                          dataKey="done"
                          name="Done Issues"
                          fill="#22c55e"
                          radius={[4, 4, 0, 0]}
                          onClick={(payload) => {
                            const team = payload?.team || payload?.payload?.team;
                            if (team) setSelectedTeam(team);
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <section style={{ ...cardStyle, minHeight: 300, display: "flex", flexDirection: "column" }}>
                <h2 style={sectionTitleStyle}>Field Service by Type</h2>
                {ticketsLoading && <Spinner />}
                {!ticketsLoading && ticketsError && <div style={{ color: "#b91c1c" }}>Failed to load field tickets.</div>}
                {!ticketsLoading && !ticketsError && (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fieldByType}>
                        <XAxis dataKey="type" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </div>
          </div>
        </section>

        <section style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <h2 style={sectionTitleStyle}>Field Service Load</h2>
          {ticketsLoading && <Spinner />}
          {!ticketsLoading && ticketsError && <div style={{ color: "#b91c1c" }}>Failed to load field tickets.</div>}
          {!ticketsLoading && !ticketsError && (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "0.9rem" }}>
                  <div style={{ color: "#1e3a8a", fontSize: "0.8rem", fontWeight: 700 }}>Total Open</div>
                  <div style={{ color: "#1e3a8a", fontSize: "1.5rem", fontWeight: 800 }}>{fieldTicketStats.open}</div>
                </div>
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "0.9rem" }}>
                  <div style={{ color: "#b45309", fontSize: "0.8rem", fontWeight: 700 }}>In Progress</div>
                  <div style={{ color: "#b45309", fontSize: "1.5rem", fontWeight: 800 }}>{fieldTicketStats.inProgress}</div>
                </div>
                <div style={{ background: "#ecfdf5", border: "1px solid #86efac", borderRadius: 10, padding: "0.9rem" }}>
                  <div style={{ color: "#166534", fontSize: "0.8rem", fontWeight: 700 }}>Resolved</div>
                  <div style={{ color: "#166534", fontSize: "1.5rem", fontWeight: 800 }}>{fieldTicketStats.resolved}</div>
                </div>
              </div>

              {openFieldTickets.length === 0 ? (
                <div style={{ color: "#166534", fontWeight: 700 }}>No open field tickets ✓</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        {["#", "Type", "Site", "Priority", "Status", "Assigned To"].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: "0.6rem 0.75rem",
                              color: "#64748b",
                              fontSize: "0.72rem",
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {openFieldTickets.map((ticket, idx) => {
                        const statusBadge = getStatusBadge(ticket?.status);
                        const priorityRaw = (ticket?.priority || "").toLowerCase().trim();
                        const priorityBadge =
                          priorityRaw === "high" || priorityRaw === "critical"
                            ? { bg: "#fee2e2", color: "#b91c1c", label: ticket?.priority || "High" }
                            : priorityRaw === "medium"
                              ? { bg: "#ffedd5", color: "#c2410c", label: ticket?.priority || "Medium" }
                              : { bg: "#dcfce7", color: "#166534", label: ticket?.priority || "Low" };
                        return (
                          <tr key={`${ticket?.id || ticket?.ticket_id || "ticket"}-${idx}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                            <td style={{ padding: "0.55rem 0.75rem", color: "#0f172a", fontWeight: 700 }}>
                              {ticket?.ticket_number || ticket?.id || idx + 1}
                            </td>
                            <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>{ticket?.type || ticket?.issue_type || "—"}</td>
                            <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>{ticket?.site || ticket?.site_name || "—"}</td>
                            <td style={{ padding: "0.55rem 0.75rem" }}>
                              <span
                                style={{
                                  background: priorityBadge.bg,
                                  color: priorityBadge.color,
                                  borderRadius: 999,
                                  padding: "0.2rem 0.55rem",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                }}
                              >
                                {priorityBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: "0.55rem 0.75rem" }}>
                              <span
                                style={{
                                  background: statusBadge.bg,
                                  color: statusBadge.color,
                                  borderRadius: 999,
                                  padding: "0.2rem 0.55rem",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                }}
                              >
                                {statusBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>
                              {ticket?.assigned_to_name || ticket?.assigned_to || "Unassigned"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>

        <section style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <h2 style={sectionTitleStyle}>Machine Status Overview</h2>
          {machinesLoading && <Spinner />}
          {!machinesLoading && machinesError && <div style={{ color: "#b91c1c" }}>Failed to load machines.</div>}
          {!machinesLoading && !machinesError && (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                <div style={{ background: "#ecfdf5", border: "1px solid #86efac", borderRadius: 10, padding: "0.9rem" }}>
                  <div style={{ color: "#166534", fontSize: "0.8rem", fontWeight: 700 }}>Operational</div>
                  <div style={{ color: "#166534", fontSize: "1.5rem", fontWeight: 800 }}>{machineStatusStats.operational}</div>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "0.9rem" }}>
                  <div style={{ color: "#b91c1c", fontSize: "0.8rem", fontWeight: 700 }}>Down</div>
                  <div style={{ color: "#b91c1c", fontSize: "1.5rem", fontWeight: 800 }}>{machineStatusStats.down}</div>
                </div>
                <div style={{ background: "#fff7ed", border: "1px solid #fdba74", borderRadius: 10, padding: "0.9rem" }}>
                  <div style={{ color: "#c2410c", fontSize: "0.8rem", fontWeight: 700 }}>Maintenance</div>
                  <div style={{ color: "#c2410c", fontSize: "1.5rem", fontWeight: 800 }}>{machineStatusStats.maintenance}</div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {["Machine Code", "Name", "Type", "Status", "Next Maintenance Due"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "0.6rem 0.75rem",
                            color: "#64748b",
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {machineAttentionRows.map((machine, idx) => {
                      const statusRaw = (machine?.status || machine?.machine_status || "").toLowerCase().trim();
                      const statusStyle =
                        statusRaw === "down"
                          ? { bg: "#fee2e2", color: "#b91c1c", label: "Down" }
                          : { bg: "#ffedd5", color: "#c2410c", label: "Maintenance" };
                      return (
                        <tr key={`${machine?.machine_code || machine?.id || "machine"}-${idx}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "0.55rem 0.75rem", color: "#0f172a", fontWeight: 700 }}>
                            {machine?.machine_code || machine?.machineid || "—"}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>
                            {machine?.machine_name || machine?.name || "—"}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>
                            {machine?.machine_type || machine?.type || "—"}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem" }}>
                            <span
                              style={{
                                background: statusStyle.bg,
                                color: statusStyle.color,
                                borderRadius: 999,
                                padding: "0.2rem 0.55rem",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                              }}
                            >
                              {statusStyle.label}
                            </span>
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", color: "#334155" }}>
                            {machine?.next_maintenance_due
                              ? new Date(machine.next_maintenance_due).toLocaleDateString()
                              : machine?.maintenance_due
                                ? new Date(machine.maintenance_due).toLocaleDateString()
                                : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {machineAttentionRows.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: "0.8rem", textAlign: "center", color: "#94a3b8" }}>
                          No machines are down or in maintenance.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ResourceAllocation;
