import React, { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { updateIssueStatus } from "../api/issueApi";

const StatusBadge = ({ status }) => {
  const map = {
    done:        { bg: "#dcfce7", color: "#16a34a", label: "Done" },
    "in progress": { bg: "#dbeafe", color: "#1d4ed8", label: "In Progress" },
    open:        { bg: "#f3f4f6", color: "#374151", label: "Open" },
    blocked:     { bg: "#fef2f2", color: "#dc2626", label: "Blocked" },
    "in review": { bg: "#f5f3ff", color: "#7c3aed", label: "In Review" },
  };
  const s = map[(status || "").toLowerCase()] || map.open;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
      background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
};

const IssueTableDeveloper = ({ issues = [], onRefresh }) => {
  const { user, role } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || "").toLowerCase();
  const [loadingId, setLoadingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [prLinks, setPrLinks] = useState({});
  const [effortMap, setEffortMap] = useState({});

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatusUpdate = async (issue, newStatus) => {
    const id = issue.issue_id || issue.IssueID;
    setLoadingId(`${id}-${newStatus}`);
    try {
      await updateIssueStatus(id, newStatus);
      showToast(`Issue #${id} updated to "${newStatus}"`, "success");
      onRefresh?.();
    } catch {
      showToast(`Could not update issue #${id}. Check connection.`, "error");
    } finally {
      setLoadingId(null);
    }
  };

  const canAct = ["developer", "admin", "superadmin"].includes(currentRole);

  const getNextActions = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "open")        return [{ label: "Start", next: "In Progress", color: "#2563eb" }];
    if (s === "in progress") return [
      { label: "Review", next: "In Review", color: "#7c3aed" },
      { label: "Block",  next: "Blocked",    color: "#dc2626" },
    ];
    if (s === "in review")   return [{ label: "Close",  next: "Done",        color: "#16a34a" }];
    if (s === "blocked")     return [{ label: "Resume", next: "In Progress", color: "#2563eb" }];
    return [];
  };

  if (!issues.length) return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
      No issues found.
    </div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.87rem",
          background: toast.type === "success" ? "#1d4ed8" : "#dc2626",
          color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease",
        }}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 8, fontSize: "0.78rem", color: "#9ca3af", fontStyle: "italic" }}>
        Developer view — Open → In Progress → In Review → Done
      </div>

      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              {["#", "Type", "Sprint", "Team", "Status", "PR / Notes", "Effort (hrs)", "Actions"].map((h) => (
                <th key={h} style={{
                  padding: "12px 14px", textAlign: "left", fontSize: "0.75rem",
                  fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => {
              const id = issue.issue_id || issue.IssueID;
              const isTask = (issue.issuetype || issue.issue_type || "").toLowerCase() !== "bug";
              const status = issue.status || "Open";
              const isDone = status.toLowerCase() === "done";
              const actions = getNextActions(status);

              return (
                // FIX: key must be on React.Fragment, not the child tr
                <React.Fragment key={id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === id ? null : id)}
                    style={{
                      borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                      background: expandedId === id ? "#eff6ff" : isDone ? "#f9fafb" : "#fff",
                    }}
                  >
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#374151", fontSize: "0.87rem" }}>
                      #{id}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        padding: "2px 9px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
                        background: isTask ? "#eff6ff" : "#fef2f2",
                        color: isTask ? "#1d4ed8" : "#dc2626",
                      }}>
                        {isTask ? "Task" : "Bug"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: "#374151" }}>
                      {issue.sprint || "—"}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem", color: "#374151" }}>
                      {issue.assigneeteam || "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }}><StatusBadge status={status} /></td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        placeholder="github.com/pr/…"
                        value={prLinks[id] || ""}
                        onChange={(e) => setPrLinks((prev) => ({ ...prev, [id]: e.target.value }))}
                        style={{
                          padding: "4px 8px", fontSize: "0.78rem", borderRadius: 6,
                          border: "1px solid #e5e7eb", outline: "none", width: 150,
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        placeholder="0"
                        value={effortMap[id] || ""}
                        onChange={(e) => setEffortMap((prev) => ({ ...prev, [id]: e.target.value }))}
                        style={{
                          padding: "4px 8px", fontSize: "0.78rem", borderRadius: 6,
                          border: "1px solid #e5e7eb", outline: "none", width: 70,
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {canAct && actions.map((a) => (
                          <button
                            key={a.next}
                            onClick={() => handleStatusUpdate(issue, a.next)}
                            disabled={loadingId === `${id}-${a.next}`}
                            style={{
                              padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700,
                              borderRadius: 6, cursor: "pointer",
                              background: `${a.color}18`, color: a.color,
                              border: `1px solid ${a.color}40`,
                            }}
                          >
                            {loadingId === `${id}-${a.next}` ? "…" : a.label}
                          </button>
                        ))}
                        {isDone && (
                          <span style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>
                            Complete
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedId === id && (
                    <tr style={{ background: "#f0f7ff" }}>
                      <td colSpan={8} style={{ padding: "12px 20px", fontSize: "0.83rem", color: "#374151" }}>
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "0.75rem",
                        }}>
                          <div>
                            <strong>Description:</strong>
                            <br />{issue.description || "No description provided."}
                          </div>
                          <div><strong>Created:</strong> {issue.createddate ? new Date(issue.createddate).toLocaleDateString() : "Unknown"}</div>
                          <div><strong>Closed:</strong> {issue.closeddate ? new Date(issue.closeddate).toLocaleDateString() : "Not yet"}</div>
                          {prLinks[id] && (
                            <div>
                              <strong>PR:</strong>{" "}
                              <a
                                href={prLinks[id].startsWith("http") ? prLinks[id] : `https://${prLinks[id]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#2563eb", fontSize: "0.83rem" }}
                              >
                                {prLinks[id]}
                              </a>
                            </div>
                          )}
                          {effortMap[id] && <div><strong>Effort logged:</strong> {effortMap[id]} hrs</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>
    </div>
  );
};

export default IssueTableDeveloper;
