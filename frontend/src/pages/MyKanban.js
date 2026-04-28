import { useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getMyTasks, getProjectIssues, updateIssueStatus } from "../api/issueApi";

/* ── column definitions ─────────────────────────────────────── */
const COLUMNS = ["Open", "In Progress", "In Review", "Blocked", "Done"];

const COLUMN_COLORS = {
  Open:          { header: "#F3F4F6", accent: "#6B7280", dot: "#9CA3AF" },
  "In Progress": { header: "#EFF6FF", accent: "#2563EB", dot: "#3B82F6" },
  "In Review":   { header: "#F5F3FF", accent: "#7C3AED", dot: "#8B5CF6" },
  Blocked:       { header: "#FEF2F2", accent: "#DC2626", dot: "#EF4444" },
  Done:          { header: "#F0FDF4", accent: "#16A34A", dot: "#22C55E" },
};

/* ── allowed developer transitions (mirrors IssueTableDeveloper) ── */
const getNextActions = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "open")        return ["In Progress"];
  if (s === "in progress") return ["In Review", "Blocked"];
  if (s === "in review")   return ["Done"];
  if (s === "blocked")     return ["In Progress"];
  return [];
};

/* ── helpers ─────────────────────────────────────────────────── */
const truncate = (text = "", max = 60) =>
  text.length > max ? `${text.slice(0, max)}…` : text;

const typePill = (type = "") => {
  const isBug = type.toLowerCase() === "bug";
  return isBug
    ? { bg: "#FEE2E2", color: "#B91C1C", label: "Bug" }
    : { bg: "#DBEAFE", color: "#1D4ED8", label: "Task" };
};

/* ── component ───────────────────────────────────────────────── */
const MyKanban = () => {
  const getStatus = (issue) =>
    issue?.issuestatus || issue?.issue_status || issue?.status || "Open";

  const navigate = useNavigate();
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const draggedRef = useRef(null);        // { id, status }
  const [updatingId, setUpdatingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const { data: tasks = [], isLoading, isError } = useQuery({
    queryKey: projectId ? ["projectIssues", projectId] : ["myTasks"],
    queryFn: async () => {
      const data = projectId ? await getProjectIssues(projectId) : await getMyTasks();
      console.log(data);
      return data;
    },
    enabled: projectId ? !!projectId : true,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  /* group issues into columns */
  const grouped = useMemo(() => {
    const base = COLUMNS.reduce((acc, col) => ({ ...acc, [col]: [] }), {});
    (Array.isArray(tasks) ? tasks : []).forEach((issue) => {
      const status = getStatus(issue);
      const match =
        COLUMNS.find((c) => c.toLowerCase() === status.toLowerCase()) || null;
      if (match) base[match].push(issue);
      // issues with unrecognised status (Verified etc.) are simply not shown
      // on the developer board since they are outside developer workflow
    });
    return base;
  }, [tasks]);

  /* ── drag handlers ─────────────────────────────────────────── */
  const handleDragStart = (e, issue) => {
    e.dataTransfer.effectAllowed = "move";
    draggedRef.current = {
      id: issue.issueid || issue.issue_id,
      status: issue.status || "Open",
    };
  };

  const handleDragOver = (e, column) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverCol !== column) setDragOverCol(column);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault();
    setDragOverCol(null);

    const dragged = draggedRef.current;
    if (!dragged) return;

    const { id, status: currentStatus } = dragged;
    draggedRef.current = null;

    // same column → no-op
    if (!currentStatus || currentStatus.toLowerCase() === targetColumn.toLowerCase()) return;

    // validate transition
    const allowed = getNextActions(currentStatus);
    if (!allowed.some((s) => s.toLowerCase() === targetColumn.toLowerCase())) {
      toast.error("Invalid transition");
      return;
    }

    // valid → call API
    setUpdatingId(id);
    try {
      await updateIssueStatus(id, targetColumn);
      toast.success(`Moved to ${targetColumn}`);
      queryClient.invalidateQueries({
        queryKey: projectId ? ["projectIssues", projectId] : ["myTasks"],
      });
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDragEnd = () => {
    draggedRef.current = null;
    setDragOverCol(null);
  };

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8FAFC",
        padding: "1.5rem 2rem",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.6rem",
              fontWeight: 800,
              color: "#0F172A",
            }}
          >
            My Kanban Board
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.82rem",
              color: "#64748B",
            }}
          >
            Drag cards to update status · Open → In Progress → In Review → Done
          </p>
        </div>

        {/* small summary badges */}
        <div style={{ display: "flex", gap: 8 }}>
          {COLUMNS.map((col) => (
            <span
              key={col}
              style={{
                padding: "4px 10px",
                borderRadius: 99,
                fontSize: "0.72rem",
                fontWeight: 700,
                background: COLUMN_COLORS[col].header,
                color: COLUMN_COLORS[col].accent,
                border: `1px solid ${COLUMN_COLORS[col].accent}22`,
              }}
            >
              {col}: {grouped[col]?.length ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* loading / error */}
      {isLoading && (
        <div style={{ padding: "3rem 0", textAlign: "center", color: "#64748B" }}>
          <div
            style={{
              width: 36,
              height: 36,
              border: "3px solid #E2E8F0",
              borderTop: "3px solid #3B82F6",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          Loading your tasks…
        </div>
      )}

      {isError && (
        <div
          style={{
            marginTop: 16,
            padding: "1rem 1.25rem",
            borderRadius: 12,
            background: "#FEF2F2",
            color: "#991B1B",
            fontWeight: 600,
            border: "1px solid #FECACA",
          }}
        >
          Failed to load tasks. Please try again.
        </div>
      )}

      {/* board */}
      {!isLoading && !isError && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(220px, 1fr))`,
            gap: 14,
          }}
        >
          {COLUMNS.map((column) => {
            const { header, accent, dot } = COLUMN_COLORS[column];
            const isDragTarget = dragOverCol === column;

            return (
              <div
                key={column}
                onDragOver={(e) => handleDragOver(e, column)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column)}
                style={{
                  background: isDragTarget ? `${accent}08` : "#FFFFFF",
                  borderRadius: 14,
                  border: isDragTarget
                    ? `2px dashed ${accent}`
                    : "1px solid #E5E7EB",
                  minHeight: 280,
                  display: "flex",
                  flexDirection: "column",
                  transition: "border 0.2s ease, background 0.2s ease",
                }}
              >
                {/* column header */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid #E5E7EB",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: header,
                    borderRadius: "14px 14px 0 0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: dot,
                        display: "inline-block",
                      }}
                    />
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#1F2937",
                        fontSize: "0.88rem",
                      }}
                    >
                      {column}
                    </span>
                  </div>
                  <span
                    style={{
                      background: `${accent}18`,
                      color: accent,
                      borderRadius: 99,
                      padding: "2px 9px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                    }}
                  >
                    {grouped[column].length}
                  </span>
                </div>

                {/* cards */}
                <div style={{ padding: 10, display: "grid", gap: 10, flex: 1 }}>
                  {grouped[column].length === 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#CBD5E1",
                        fontSize: "0.78rem",
                        fontStyle: "italic",
                        minHeight: 80,
                      }}
                    >
                      No tasks
                    </div>
                  )}

                  {grouped[column].map((issue) => {
                    const issueId = issue?.issueid || issue?.issue_id;
                    const pill = typePill(
                      issue?.issuetype || issue?.issue_type || ""
                    );
                    const isUpdating = updatingId === issueId;

                    return (
                      <div
                        key={issueId}
                        draggable={!isUpdating}
                        onDragStart={(e) => handleDragStart(e, issue)}
                        onDragEnd={handleDragEnd}
                        onClick={() => navigate("/my-projects")}
                        style={{
                          background: "#fff",
                          borderRadius: 12,
                          border: "1px solid #E2E8F0",
                          padding: "12px",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                          opacity: isUpdating ? 0.5 : 1,
                          cursor: isUpdating ? "wait" : "grab",
                          transition: "box-shadow 0.2s ease, transform 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (!isUpdating) {
                            e.currentTarget.style.boxShadow =
                              "0 4px 14px rgba(0,0,0,0.1)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow =
                            "0 1px 4px rgba(0,0,0,0.06)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        {/* top row: id + type badge */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            #{issueId}
                          </span>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 99,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              background: pill.bg,
                              color: pill.color,
                            }}
                          >
                            {pill.label}
                          </span>
                        </div>

                        {/* description */}
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#1F2937",
                            marginBottom: 8,
                            lineHeight: 1.4,
                          }}
                        >
                          {truncate(issue?.description || "", 60)}
                        </div>

                        {/* meta row */}
                        <div
                          style={{
                            fontSize: "0.71rem",
                            color: "#94A3B8",
                            display: "flex",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            🏃 {issue?.sprint || "—"}
                          </span>
                          <span>
                            👥 {issue?.assigneeteam || "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
};

export default MyKanban;
