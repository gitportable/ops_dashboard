import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../api/axios";
import { getProjectIssues } from '../api/issueApi'

const MAX_CAPACITY = 20;

const truncate = (text = "", max = 60) =>
  text.length > max ? `${text.slice(0, max)}...` : text;

const typeBadge = (type = "") => {
  const isBug = type.toLowerCase() === "bug";
  return isBug
    ? { label: "Bug", bg: "#fee2e2", color: "#b91c1c" }
    : { label: "Task", bg: "#dbeafe", color: "#1d4ed8" };
};

const issueIdOf = (issue) => issue?.issueid ?? issue?.issue_id ?? issue?.IssueID;

const sprintNumberOf = (value) => {
  if (value == null) return null;
  const m = String(value).match(/(\d+)/);
  return m ? Number(m[1]) : null;
};
const normalizeSprint = (s) => {
  if (!s) return null;
  const num = parseInt(s.toString().replace(/\D/g, ""), 10);
  return num ? `Sprint ${num}` : null;
};

const SprintPlanning = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeSprint, setActiveSprint] = useState("Sprint 1");
  const [draggedIssueId, setDraggedIssueId] = useState("");
  const [pendingBySprint, setPendingBySprint] = useState({});
  const [assigning, setAssigning] = useState(false);

  const { data: issuesData, isLoading, isError } = useQuery({
    queryKey: ["projectIssues", projectId],
    queryFn: async () => {
      const data = await getProjectIssues(projectId);
      return data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });
  const issues = useMemo(() => (Array.isArray(issuesData) ? issuesData : []), [issuesData]);

  const sprintTabs = useMemo(() => {
    const all = Array.isArray(issues) ? issues : [];
    const maxExisting = all.reduce((mx, issue) => {
      const n = sprintNumberOf(issue?.sprint);
      return n && n > mx ? n : mx;
    }, 0);
    const maxTab = Math.max(2, maxExisting + 1);
    return Array.from({ length: maxTab }, (_, i) => `Sprint ${i + 1}`);
  }, [issues]);

  const grouped = useMemo(() => {
    const all = Array.isArray(issues) ? issues : [];
    const backlog = all.filter((i) => {
      return !i.sprint || String(i.sprint).trim() === '' || String(i.sprint).toLowerCase() === 'backlog' || String(i.sprint) === '—';
    });
    const bySprint = sprintTabs.reduce((acc, label) => ({ ...acc, [label]: [] }), {});
    all.forEach((i) => {
      const sprintKey = normalizeSprint(i?.sprint);
      const found = sprintTabs.find((tab) => tab.toLowerCase() === (sprintKey || "").toLowerCase());
      if (found) bySprint[found].push(i);
    });
    return { backlog, bySprint };
  }, [issues, sprintTabs]);

  const projectName = useMemo(() => {
    const first = Array.isArray(issues) && issues.length > 0 ? issues[0] : null;
    return first?.projectname || first?.project_name || projectId;
  }, [issues, projectId]);

  const handleDropToSprint = (e, sprintLabel) => {
    e.preventDefault();
    if (!draggedIssueId) return;

    setPendingBySprint((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = (next[k] || []).filter((id) => String(id) !== String(draggedIssueId));
      });
      next[sprintLabel] = [...new Set([...(next[sprintLabel] || []), draggedIssueId])];
      return next;
    });
    setActiveSprint(sprintLabel);
    setDraggedIssueId("");
  };

  const assignToSprint = async (sprintLabel) => {
    const selectedIds = pendingBySprint[sprintLabel] || [];
    if (!selectedIds.length) {
      toast.error("No backlog issues selected for this sprint.");
      return;
    }
    setAssigning(true);
    try {
      await api.put("/issues/bulk-assign-sprint", { issueIds: selectedIds, sprint: sprintLabel });
      toast.success(`Assigned ${selectedIds.length} issue(s) to ${sprintLabel}`);
      setPendingBySprint((prev) => ({ ...prev, [sprintLabel]: [] }));
      queryClient.invalidateQueries({ queryKey: ["projectIssues", projectId] });
    } catch {
      toast.error("Failed to assign sprint.");
    } finally {
      setAssigning(false);
    }
  };

  const sprintCount = (sprintLabel) => (grouped.bySprint[sprintLabel] || []).length;
  const pendingCount = (sprintLabel) => (pendingBySprint[sprintLabel] || []).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <button
        onClick={() => navigate("/projects")}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        ← Back to Projects
      </button>

      <h1 style={{ margin: "12px 0 0", color: "#0f172a", fontSize: "1.55rem", fontWeight: 800 }}>
        Sprint Planning — {projectName}
      </h1>

      {isLoading && !issuesData && <div style={{ padding: "2rem 0", color: "#64748b" }}>Loading issues...</div>}
      {isError && (
        <div style={{ marginTop: 14, background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "1rem" }}>
          Failed to load project issues.
        </div>
      )}

      {!isError && (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 14 }}>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 800, color: "#1f2937", marginBottom: 10 }}>
              Backlog ({grouped.backlog.length})
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {grouped.backlog.map((issue) => {
                const id = issueIdOf(issue);
                const t = typeBadge(issue?.issuetype || issue?.issue_type || "");
                return (
                  <div
                    key={id}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      setDraggedIssueId(id);
                    }}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "10px",
                      cursor: "grab",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>#{id}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700, background: t.bg, color: t.color }}>
                        {t.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#1f2937", marginBottom: 5 }}>
                      {truncate(issue?.description || "")}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      Team: {issue?.assigneeteam || "—"}
                    </div>
                  </div>
                );
              })}
              {grouped.backlog.length === 0 && (
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", padding: "0.5rem 0" }}>
                  No backlog issues.
                </div>
              )}
            </div>
          </div>

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {sprintTabs.map((s) => (
                <button
                  key={s}
                  onClick={() => setActiveSprint(s)}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "6px 12px",
                    cursor: "pointer",
                    background: activeSprint === s ? "#1e3a8a" : "#e2e8f0",
                    color: activeSprint === s ? "#fff" : "#334155",
                    fontWeight: 700,
                    fontSize: "0.76rem",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropToSprint(e, activeSprint)}
              style={{
                border: "1px dashed #94a3b8",
                borderRadius: 10,
                background: "#f8fafc",
                padding: "10px",
                marginBottom: 12,
              }}
            >
              Drop backlog issues here to queue for {activeSprint}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 700 }}>
                Capacity: {sprintCount(activeSprint)} / {MAX_CAPACITY}
              </div>
              {sprintCount(activeSprint) > 15 && sprintCount(activeSprint) <= MAX_CAPACITY && (
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#b45309", background: "#fef3c7", borderRadius: 99, padding: "3px 8px" }}>
                  Warning: High Load
                </span>
              )}
              {sprintCount(activeSprint) > MAX_CAPACITY && (
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#b91c1c", background: "#fee2e2", borderRadius: 99, padding: "3px 8px" }}>
                  Over Capacity
                </span>
              )}
            </div>

            <button
              onClick={() => assignToSprint(activeSprint)}
              disabled={assigning}
              style={{
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                background: "#1e40af",
                color: "#fff",
                fontWeight: 700,
                cursor: assigning ? "not-allowed" : "pointer",
                opacity: assigning ? 0.75 : 1,
                marginBottom: 12,
              }}
            >
              Assign to Sprint ({pendingCount(activeSprint)})
            </button>

            <div style={{ display: "grid", gap: 8 }}>
              {(grouped.bySprint[activeSprint] || []).map((issue) => {
                const id = issueIdOf(issue);
                const t = typeBadge(issue?.issuetype || issue?.issue_type || "");
                return (
                  <div key={id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>#{id}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700, background: t.bg, color: t.color }}>
                        {t.label}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#1f2937", marginBottom: 5 }}>
                      {truncate(issue?.description || "")}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                      Team: {issue?.assigneeteam || "—"}
                    </div>
                  </div>
                );
              })}
              {(grouped.bySprint[activeSprint] || []).length === 0 && (
                <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  No issues assigned to {activeSprint}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintPlanning;
