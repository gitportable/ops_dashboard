import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getMyTasks } from "../api/issueApi";
import IssueTableTester from "../components/IssueTableTester";

const QAQueue = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSprint, setFilterSprint] = useState("all");

  const { data: issues = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["myTasks"],
    queryFn: async () => {
      const data = await getMyTasks();
      return Array.isArray(data) ? data : [];
    },
  });

  const error = isError ? "Failed to load QA queue. Please try again." : null;
  const fetchIssues = () => refetch();

  const sprints = [...new Set(issues.map((i) => i.sprint).filter(Boolean))].sort();
  const statuses = [...new Set(issues.map((i) => i.status).filter(Boolean))];

  const filtered = issues.filter((i) => {
    const issueId = i.issueid || i.issue_id || i.IssueID;
    const matchSearch =
      !search ||
      String(issueId || "").includes(search) ||
      (i.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.assigneeteam || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || (i.status || "").toLowerCase() === filterStatus.toLowerCase();
    const matchSprint = filterSprint === "all" || i.sprint === filterSprint;
    return matchSearch && matchStatus && matchSprint;
  });

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", margin: 0 }}>QA Queue</h1>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>
            Issues from your assigned projects — verify fixes and triage bugs
          </p>
        </div>
        <Link
          to="/issues/new"
          style={{
            padding: "8px 18px", background: "#1e40af", color: "#fff",
            borderRadius: 8, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem",
          }}
        >
          + New Issue
        </Link>
      </div>

      {!isLoading && !error && (
        <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[
            { label: "Total", value: issues.length, bg: "#eff6ff", color: "#1d4ed8" },
            { label: "Open", value: issues.filter((i) => (i.status || "").toLowerCase() === "open").length, bg: "#f3f4f6", color: "#374151" },
            { label: "In Progress", value: issues.filter((i) => (i.status || "").toLowerCase() === "in progress").length, bg: "#dbeafe", color: "#1d4ed8" },
            { label: "Done", value: issues.filter((i) => (i.status || "").toLowerCase() === "done").length, bg: "#dcfce7", color: "#16a34a" },
            { label: "Blocked", value: issues.filter((i) => (i.status || "").toLowerCase() === "blocked").length, bg: "#fef2f2", color: "#dc2626" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "8px 16px", borderRadius: 99, background: s.bg,
              color: s.color, fontWeight: 700, fontSize: "0.82rem",
            }}>
              {s.label}: {s.value}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by ID, description, team…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: "7px 12px", borderRadius: 8,
            border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none",
          }}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none" }}
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterSprint}
          onChange={(e) => setFilterSprint(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.88rem", outline: "none" }}
        >
          <option value="all">All Sprints</option>
          {sprints.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button
          onClick={fetchIssues}
          style={{
            padding: "7px 14px", borderRadius: 8, border: "1px solid #e5e7eb",
            background: "#f8fafc", fontSize: "0.88rem", cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>Loading issues…</div>
      )}
      {error && (
        <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>{error}</div>
      )}
      {!isLoading && !error && (
        <>
          <IssueTableTester issues={filtered} onRefresh={fetchIssues} />
          {filtered.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              No issues match your filters.
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QAQueue;
