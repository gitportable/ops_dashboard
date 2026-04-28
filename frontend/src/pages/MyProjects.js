import { useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "../auth/AuthContext";
import { getMyProjects } from "../api/projectApi";
import { getProjectIssues } from "../api/issueApi";
import IssueTableDeveloper from "../components/IssueTableDeveloper";
import IssueTableTester from "../components/IssueTableTester";
import api from "../api/axios";
import toast from "react-hot-toast";

/* ── Work Order constants (mirrors WorkOrders.js) ── */
const WO_STAGES = ["Raw Material", "Cell", "Module", "Testing", "Dispatch"];
const WO_STAGE_COLORS = {
  "Raw Material": { bg: "#f3f4f6", color: "#4b5563", dot: "#9CA3AF" },
  Cell:           { bg: "#dbeafe", color: "#1d4ed8", dot: "#3B82F6" },
  Module:         { bg: "#ede9fe", color: "#6d28d9", dot: "#8B5CF6" },
  Testing:        { bg: "#ffedd5", color: "#c2410c", dot: "#F97316" },
  Dispatch:       { bg: "#dcfce7", color: "#16a34a", dot: "#22C55E" },
};
const WO_STATUS_COLORS = {
  Open:          { bg: "#dbeafe", color: "#1d4ed8" },
  "In Progress": { bg: "#fef3c7", color: "#b45309" },
  Completed:     { bg: "#dcfce7", color: "#16a34a" },
  "On Hold":     { bg: "#ffedd5", color: "#c2410c" },
  Cancelled:     { bg: "#fee2e2", color: "#b91c1c" },
};
const pid = (p) =>
  p?.projectid ?? p?.project_id ?? p?.id ?? p?.ProjectID ?? p?.projectId;
const pname = (p, id) =>
  p?.projectname ?? p?.name ?? p?.project_name ?? p?.ProjectName ?? (id ? `Project ${id}` : "Project");

const statusStyle = (s = "") => {
  const m = {
    "active":        { dot: "#16a34a", bg: "#dcfce7", color: "#16a34a" },
    "in progress":   { dot: "#1d4ed8", bg: "#dbeafe", color: "#1d4ed8" },
    "completed":     { dot: "#7c3aed", bg: "#f5f3ff", color: "#7c3aed" },
    "on hold":       { dot: "#f59e0b", bg: "#fef9c3", color: "#a16207" },
    "planning":      { dot: "#9ca3af", bg: "#f3f4f6", color: "#6b7280" },
    "blocked":       { dot: "#dc2626", bg: "#fef2f2", color: "#dc2626" },
  };
  return m[s.toLowerCase()] || m["planning"];
};

const MyProjects = () => {
  const { role, user } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || "").toLowerCase();
  const isDeveloper = currentRole === "developer";

  const [projects, setProjects]               = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [issues, setIssues]                   = useState([]);
  const [view, setView]                       = useState("current");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingIssues, setLoadingIssues]     = useState(false);
  const [projectError, setProjectError]       = useState(null);
  const [issueError, setIssueError]           = useState(null);
  /* ── work orders ── */
  const [workOrders, setWorkOrders]           = useState([]);
  const [woLoading, setWoLoading]             = useState(false);
  const [woOpen, setWoOpen]                   = useState(true);
  const [advancingId, setAdvancingId]         = useState(null);

  useEffect(() => {
    setLoadingProjects(true);
    getMyProjects()
      .then((res) => {
        const raw  = res?.data ?? res;
        const list = Array.isArray(raw) ? raw : [];
        console.log("[MyProjects] received", list.length, "projects, first item keys:", list[0] ? Object.keys(list[0]) : "none");
        setProjects(list);
    
        const first = list.find((p) => pid(p) != null);
        if (first) setSelectedProject(first);
      })
      .catch((err) => {
        console.error("[MyProjects] fetch error:", err);
        setProjectError("Failed to load your projects.");
      })
      .finally(() => setLoadingProjects(false));
  }, []);

  const loadIssues = useCallback((project) => {
    const id = pid(project);
    if (id == null) {
      console.warn("[MyProjects] selected project has no ID:", project);
      return;
    }
    setLoadingIssues(true);
    setIssueError(null);
    getProjectIssues(id)
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.data ?? [];
        setIssues(rows);
      })
      .catch((err) => {
        console.error("[MyProjects] issue fetch error:", err);
        setIssueError("Failed to load issues for this project.");
      })
      .finally(() => setLoadingIssues(false));
  }, []);

  /* ── work orders loader ── */
  const loadWorkOrders = useCallback((project) => {
    const id = pid(project);
    if (id == null) return;
    setWoLoading(true);
    api.get(`/work-orders/project/${id}`)
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setWorkOrders(rows);
      })
      .catch(() => setWorkOrders([]))
      .finally(() => setWoLoading(false));
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadIssues(selectedProject);
      loadWorkOrders(selectedProject);
    }
  }, [selectedProject, loadIssues, loadWorkOrders]);

  const currentIssues = issues.filter(
    (i) => !["done", "closed", "verified"].includes((i.status || "").toLowerCase())
  );
  const historyIssues = issues.filter(
    (i) => ["done", "closed", "verified"].includes((i.status || "").toLowerCase())
  );
  const displayIssues = view === "current" ? currentIssues : historyIssues;
  const IssueTable    = isDeveloper ? IssueTableDeveloper : IssueTableTester;

  if (loadingProjects) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontFamily: "'Inter',sans-serif" }}>
      Loading your projects…
    </div>
  );
  if (projectError) return (
    <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8, margin: "2rem" }}>
      {projectError}
    </div>
  );
  if (!projects.length) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontFamily: "'Inter',sans-serif" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
      <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>No projects assigned yet.</p>
      <p style={{ fontSize: "0.85rem", marginTop: 4, color: "#94a3b8" }}>
        Contact your admin to be added to a project.
      </p>
    </div>
  );

  const selId   = pid(selectedProject);
  const selName = pname(selectedProject, selId);

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter',sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
        My Projects
      </h1>
      <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1.5rem" }}>
        Projects assigned to you — click one to view its issues.
      </p>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>

        <div style={{
          width: 260, flexShrink: 0, background: "#fff",
          borderRadius: 12, border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", background: "#1e3a8a", color: "#fff",
            fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Assigned Projects ({projects.length})
          </div>

          {projects.map((p) => {
            const id        = pid(p);
            const name      = pname(p, id);
            const sc        = statusStyle(p.status);
            const isSelected = pid(selectedProject) === id;

            return (
              <div
                key={id ?? `proj-${name}`}
                onClick={() => setSelectedProject(p)}
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  borderBottom: "1px solid #f1f5f9",
                  background: isSelected ? "#eff6ff" : "#fff",
                  borderLeft: isSelected ? "3px solid #1e40af" : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>
                  {name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: sc.dot, display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600,
                    color: sc.color, background: sc.bg,
                    padding: "1px 7px", borderRadius: 99,
                  }}>
                    {p.status || "Active"}
                  </span>
                  {p.member_role && (
                    <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                      {p.member_role}
                    </span>
                  )}
                </div>
                {p.issuecount != null && (
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3 }}>
                    {p.issuecount} issues
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedProject ? (
            <>
             
              <div style={{
                background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
                padding: "16px 20px", marginBottom: "1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                      {selName}
                    </h2>
                    {selectedProject.description && (
                      <p style={{ fontSize: "0.83rem", color: "#6b7280", marginTop: 4 }}>
                        {selectedProject.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {["current", "history"].map((v) => (
                      <button key={v} onClick={() => setView(v)}
                        style={{
                          padding: "5px 14px", borderRadius: 99, fontSize: "0.8rem", fontWeight: 600,
                          cursor: "pointer", border: "none",
                          background: view === v ? "#1e40af" : "#f1f5f9",
                          color: view === v ? "#fff" : "#475569",
                        }}>
                        {v === "current"
                          ? `Active (${currentIssues.length})`
                          : `History (${historyIssues.length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {!loadingIssues && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {[
                      { label: "Total",       val: issues.length },
                      { label: "Open",        val: issues.filter(i => (i.status||"").toLowerCase() === "open").length },
                      { label: "In Progress", val: issues.filter(i => (i.status||"").toLowerCase() === "in progress").length },
                      { label: "Done",        val: issues.filter(i => (i.status||"").toLowerCase() === "done").length },
                    ].map(s => (
                      <div key={s.label} style={{
                        padding: "5px 12px", background: "#f8fafc", borderRadius: 8,
                        fontSize: "0.78rem", color: "#475569", border: "1px solid #e5e7eb",
                      }}>
                        <span style={{ fontWeight: 700 }}>{s.val}</span> {s.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {loadingIssues && (
                <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading issues…</div>
              )}
              {issueError && (
                <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>
                  {issueError}
                </div>
              )}
              {!loadingIssues && !issueError && (
                displayIssues.length > 0 ? (
                  <IssueTable
                    issues={displayIssues}
                    onRefresh={() => loadIssues(selectedProject)}
                  />
                ) : (
                  <div style={{
                    padding: "2.5rem", textAlign: "center", color: "#6b7280",
                    background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
                  }}>
                    {view === "current" ? "No active issues in this project." : "No completed issues yet."}
                  </div>
                )
              )}

              {/* ── Work Orders collapsible section ────────────────── */}
              <div style={{ marginTop: "1.25rem" }}>
                {/* section header / toggle */}
                <button
                  onClick={() => setWoOpen((o) => !o)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "space-between", padding: "10px 16px",
                    background: "#1e3a8a", color: "#fff", border: "none",
                    borderRadius: woOpen ? "12px 12px 0 0" : 12,
                    fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
                    transition: "border-radius 0.2s",
                  }}
                >
                  <span>Work Orders ({workOrders.length})</span>
                  <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                    {woOpen ? "▲ collapse" : "▼ expand"}
                  </span>
                </button>

                {woOpen && (
                  <div style={{
                    background: "#fff", border: "1px solid #e5e7eb",
                    borderTop: "none", borderRadius: "0 0 12px 12px",
                    overflow: "hidden",
                  }}>
                    {woLoading && (
                      <div style={{ padding: "1.25rem", color: "#6b7280", fontSize: "0.85rem" }}>
                        Loading work orders…
                      </div>
                    )}

                    {!woLoading && workOrders.length === 0 && (
                      <div style={{
                        padding: "1.5rem", textAlign: "center",
                        color: "#9ca3af", fontSize: "0.82rem",
                      }}>
                        No work orders for this project.
                      </div>
                    )}

                    {!woLoading && workOrders.map((wo) => {
                      const stageIdx   = WO_STAGES.indexOf(wo.stage);
                      const stageColor = WO_STAGE_COLORS[wo.stage] || WO_STAGE_COLORS["Raw Material"];
                      const statusColor = WO_STATUS_COLORS[wo.status] || { bg: "#f3f4f6", color: "#4b5563" };
                      const isLast     = wo.stage === "Dispatch";
                      const nextStage  = !isLast ? WO_STAGES[stageIdx + 1] : null;
                      const isAdvancing = advancingId === wo.id;

                      return (
                        <div
                          key={wo.id}
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid #f1f5f9",
                            display: "grid",
                            gridTemplateColumns: "auto 1fr auto auto",
                            gap: "12px",
                            alignItems: "center",
                          }}
                        >
                          {/* WO Number + Batch */}
                          <div>
                            <div style={{ fontWeight: 700, color: "#1e3a8a", fontSize: "0.85rem" }}>
                              {wo.wo_number || `WO-${wo.id}`}
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
                              {wo.batch_lot ? `Batch: ${wo.batch_lot}` : "—"}
                            </div>
                          </div>

                          {/* Stage pipeline */}
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              {WO_STAGES.map((stage, idx) => {
                                const done    = idx <= stageIdx;
                                const current = idx === stageIdx;
                                const sc      = WO_STAGE_COLORS[stage];
                                return (
                                  <div
                                    key={stage}
                                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                                    title={stage}
                                  >
                                    {/* dot */}
                                    <div style={{
                                      width:  current ? 10 : 8,
                                      height: current ? 10 : 8,
                                      borderRadius: "50%",
                                      background: done ? sc.dot : "#e5e7eb",
                                      boxShadow: current ? `0 0 0 2px ${sc.dot}44` : "none",
                                      flexShrink: 0,
                                      transition: "all 0.2s",
                                    }} />
                                    {/* connector line */}
                                    {idx < WO_STAGES.length - 1 && (
                                      <div style={{
                                        width: 18,
                                        height: 2,
                                        background: idx < stageIdx ? "#1d4ed8" : "#e5e7eb",
                                        borderRadius: 2,
                                        flexShrink: 0,
                                      }} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {/* current stage label */}
                            <div style={{ marginTop: 5 }}>
                              <span style={{
                                padding: "2px 8px", borderRadius: 99,
                                fontSize: "0.68rem", fontWeight: 700,
                                background: stageColor.bg, color: stageColor.color,
                              }}>
                                {wo.stage || "—"}
                              </span>
                            </div>
                          </div>

                          {/* Status badge */}
                          <span style={{
                            padding: "3px 10px", borderRadius: 99,
                            fontSize: "0.72rem", fontWeight: 700,
                            background: statusColor.bg, color: statusColor.color,
                            whiteSpace: "nowrap",
                          }}>
                            {wo.status || "—"}
                          </span>

                          {/* Advance Stage button */}
                          {!isLast ? (
                            <button
                              disabled={isAdvancing}
                              onClick={async () => {
                                setAdvancingId(wo.id);
                                try {
                                  await api.put(`/work-orders/${wo.id}`, { stage: nextStage });
                                  toast.success(`Moved to ${nextStage}`);
                                  loadWorkOrders(selectedProject);
                                } catch {
                                  toast.error("Failed to advance stage");
                                } finally {
                                  setAdvancingId(null);
                                }
                              }}
                              style={{
                                padding: "4px 10px", borderRadius: 6, border: "none",
                                background: isAdvancing ? "#e5e7eb" : "#1e3a8a",
                                color: isAdvancing ? "#9ca3af" : "#fff",
                                fontSize: "0.75rem", fontWeight: 700,
                                cursor: isAdvancing ? "not-allowed" : "pointer",
                                whiteSpace: "nowrap",
                                transition: "background 0.15s",
                              }}
                            >
                              {isAdvancing ? "…" : `→ ${nextStage}`}
                            </button>
                          ) : (
                            <span style={{
                              fontSize: "0.72rem", color: "#16a34a",
                              fontWeight: 700, whiteSpace: "nowrap",
                            }}>
                              ✓ Complete
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {/* ── end Work Orders section ── */}
            </>
          ) : (
            <div style={{
              padding: "3rem", textAlign: "center", color: "#9ca3af",
              background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
            }}>
              Select a project to view its issues.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProjects;

