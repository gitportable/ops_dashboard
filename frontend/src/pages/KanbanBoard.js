import { useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getProjectIssues, updateIssueStatus } from "../api/issueApi";

const COLUMNS = [
  "Open",
  "In Progress",
  "In Review",
  "Blocked",
  "Done",
  "Verified",
  "Needs Info",
  "Escalated",
];

const truncate = (text = "", max = 60) =>
  text.length > max ? `${text.slice(0, max)}...` : text;

const typePill = (type = "") => {
  const isBug = type.toLowerCase() === "bug";
  return isBug
    ? { bg: "#FEE2E2", color: "#B91C1C", label: "Bug" }
    : { bg: "#DBEAFE", color: "#1D4ED8", label: "Task" };
};

const KanbanBoard = () => {
  const getStatus = (issue) =>
    issue?.issuestatus || issue?.issue_status || issue?.status || "Open";

  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const draggedId = useRef("");
  const [updatingKey, setUpdatingKey] = useState("");

  const { data: issues = [], isLoading, isError } = useQuery({
    queryKey: ["projectIssues", projectId],
    queryFn: () => getProjectIssues(projectId),
    enabled: !!projectId,
  });

  const projectName = useMemo(() => {
    const first = Array.isArray(issues) && issues.length > 0 ? issues[0] : null;
    return (
      first?.projectname ||
      first?.project_name ||
      first?.projectid ||
      first?.project_id ||
      projectId
    );
  }, [issues, projectId]);

  const grouped = useMemo(() => {
    const base = COLUMNS.reduce((acc, col) => ({ ...acc, [col]: [] }), {});
    (Array.isArray(issues) ? issues : []).forEach((issue) => {
      const status = getStatus(issue);
      const match = COLUMNS.find((c) => c.toLowerCase() === status.toLowerCase()) || "Open";
      base[match].push(issue);
    });
    return base;
  }, [issues]);

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedId.current) return;
    const issue = (Array.isArray(issues) ? issues : []).find(
      (i) => String(i?.issueid) === String(draggedId.current)
    );
    if (!issue) return;
    const currentSt = issue?.issuestatus || issue?.issue_status || issue?.status || "";
    if (currentSt.toLowerCase() === newStatus.toLowerCase()) return;

    const updateToken = `${draggedId.current}-${newStatus}`;
    setUpdatingKey(updateToken);
    try {
      await updateIssueStatus(draggedId.current, newStatus);
      toast.success(`Issue moved to ${newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["projectIssues", projectId] });
    } catch {
      toast.error("Failed to update issue status.");
    } finally {
      setUpdatingKey("");
      draggedId.current = "";
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <button
        onClick={() => navigate("/projects")}
        style={{
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid #CBD5E1",
          background: "#fff",
          color: "#1E293B",
          cursor: "pointer",
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        ← Back to Projects
      </button>

      <h1 style={{ margin: 0, color: "#0F172A", fontSize: "1.5rem", fontWeight: 800 }}>
        Kanban Board — {projectName}
      </h1>

      {isLoading && (
        <div style={{ padding: "2rem 0", color: "#64748B" }}>Loading board...</div>
      )}
      {isError && (
        <div style={{ marginTop: 16, padding: "1rem", borderRadius: 10, background: "#FEE2E2", color: "#991B1B" }}>
          Failed to load project issues.
        </div>
      )}

      {!isLoading && !isError && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(220px, 1fr))", gap: 12, marginTop: 16 }}>
          {COLUMNS.map((column) => (
            <div
              key={column}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, column)}
              style={{
                background: "#F3F4F6",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                minHeight: 220,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid #E5E7EB",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 700, color: "#1F2937", fontSize: "0.9rem" }}>{column}</span>
                <span
                  style={{
                    background: "#E2E8F0",
                    color: "#334155",
                    borderRadius: 99,
                    padding: "2px 8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                  }}
                >
                  {grouped[column].length}
                </span>
              </div>

              <div style={{ padding: 10, display: "grid", gap: 8 }}>
                {grouped[column].map((issue) => {
                  const issueId = issue?.issueid;
                  const pill = typePill(issue?.issuetype || issue?.issue_type || "");
                  return (
                    <div
                      key={issueId}
                      draggable="true"
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        draggedId.current = issue.issueid;
                      }}
                      style={{
                        background: "#fff",
                        borderRadius: 10,
                        border: "1px solid #D1D5DB",
                        padding: "10px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                        opacity: updatingKey && String(draggedId.current) === String(issueId) ? 0.6 : 1,
                        cursor: "grab",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>#{issueId}</div>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 99,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: pill.bg,
                            color: pill.color,
                          }}
                        >
                          {pill.label}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#1F2937", marginBottom: 6 }}>
                        {truncate(issue?.description || "")}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748B", display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <span>Sprint: {issue?.sprint || "—"}</span>
                        <span>Team: {issue?.assigneeteam || "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;