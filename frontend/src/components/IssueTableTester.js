// src/components/IssueTableTester.js
import React, { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { updateIssueStatus } from "../api/issueApi";
import LogIssueModal from "./LogIssueModal";


const SEVERITY_COLORS = {
  critical: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5", dot: "#ef4444" },
  high:     { bg: "#fff7ed", text: "#c2410c", border: "#fdba74", dot: "#f97316" },
  medium:   { bg: "#fefce8", text: "#a16207", border: "#fde047", dot: "#eab308" },
  low:      { bg: "#f0fdf4", text: "#15803d", border: "#86efac", dot: "#22c55e" },
};

const SeverityBadge = ({ level }) => {
  const s = SEVERITY_COLORS[level] || SEVERITY_COLORS.medium;
  return (
    <span style={{
      padding: "2px 9px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
      display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {(level || "medium").toUpperCase()}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    done:        { bg: "#dcfce7", color: "#16a34a", label: "Done" },
    "in progress": { bg: "#dbeafe", color: "#1d4ed8", label: "In Progress" },
    open:        { bg: "#f3f4f6", color: "#374151", label: "Open" },
    verified:    { bg: "#f5f3ff", color: "#7c3aed", label: "Verified" },
    "needs info": { bg: "#fff7ed", color: "#c2410c", label: "Needs Info" },
    escalated:   { bg: "#fef2f2", color: "#dc2626", label: "Escalated" },
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

const IssueTableTester = ({ issues = [], onRefresh, projectid }) => {
  const { user, role } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || "").toLowerCase();
  const [loadingId, setLoadingId] = useState(null);
  const [toast, setToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [severityMap, setSeverityMap] = useState({});
  const [testNotes, setTestNotes] = useState({});
  const [showLogModal, setShowLogModal] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAction = async (issue, newStatus) => {
    const id = issue.issueid || issue.issue_id || issue.IssueID;
    if (!id) {
        showToast("Invalid Issue ID", "error");
        return;
    }
    setLoadingId(`${id}-${newStatus}`);
    try {
      await updateIssueStatus(id, newStatus);
      showToast(`Issue #${id} marked as "${newStatus}"`, "success");
      onRefresh?.();
    } catch {
      showToast(`Failed to update issue #${id}.`, "error");
    } finally {
      setLoadingId(null);
    }
  };

  const canAct = ["tester", "admin", "superadmin"].includes(currentRole);

  if (!issues.length) return (
    <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No issues found.</div>
  );

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.87rem",
          background: toast.type === "success" ? "#16a34a" : "#dc2626",
          color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}>
          {toast.type === "success" ? "✓" : "✕"} {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "0.78rem", color: "#9ca3af", fontStyle: "italic" }}>
          Tester view — set severity, verify fixes, or flag issues needing more information.
        </div>
        {currentRole === "tester" && projectid && (
          <button 
            onClick={() => setShowLogModal(true)}
            style={{ padding: "6px 16px", background: "#1e40af", color: "#fff", borderRadius: "8px", fontWeight: "600", border: "none", cursor: "pointer" }}
          >
            + Log Bug
          </button>
        )}
      </div>

      <LogIssueModal isOpen={showLogModal} onClose={() => setShowLogModal(false)} onRefresh={onRefresh} projectid={projectid} />

      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1100 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              {["#", "Type", "Sprint", "Team", "Batch/Lot", "Stage", "Defect", "Status", "Severity", "Test Notes", "QA Actions"].map((h) => (
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
            {issues.map((issue, index) => {
              const id = issue.issueid || issue.issue_id || issue.IssueID || `temp-${index}`;
              const isBug = (issue.issuetype || issue.issue_type || "").toLowerCase() === "bug";
              const severity = severityMap[id] || (isBug ? "high" : "low");
              const status = issue.status || "Open";
              const isDone = status.toLowerCase() === "done";

              return (
                <React.Fragment key={id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === id ? null : id)}
                    style={{
                      borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                      background: expandedId === id ? "#f0fdf4" : isBug ? "#fff8f7" : "#fff",
                    }}
                  >
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#374151", fontSize: "0.87rem" }}>#{id}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700, background: isBug ? "#fef2f2" : "#eff6ff", color: isBug ? "#dc2626" : "#1d4ed8" }}>
                        {isBug ? "Bug" : "Task"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.sprint || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.assigneeteam || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.batch_lot || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.production_stage || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.defect_type || "—"}</td>
                    <td style={{ padding: "12px 14px" }}><StatusBadge status={status} /></td>
                    <td style={{ padding: "12px 14px" }}>
                      <SeverityBadge level={severity} />
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        placeholder="Test notes..."
                        value={testNotes[id] || ""}
                        onChange={(e) => setTestNotes((prev) => ({ ...prev, [id]: e.target.value }))}
                        style={{ padding: "4px 8px", fontSize: "0.78rem", borderRadius: 6, border: "1px solid #e5e7eb", width: 160 }}
                      />
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {canAct && !isDone && (
                          <>
                            <button onClick={() => handleAction(issue, "Verified")} disabled={loadingId === `${id}-Verified`}
                              style={{ padding: "4px 9px", background: "#dcfce7", color: "#16a34a", borderRadius: 6 }}>
                              Verify Fix
                            </button>
                            <button onClick={() => handleAction(issue, "Needs Info")} disabled={loadingId === `${id}-Needs Info`}
                              style={{ padding: "4px 9px", background: "#fff7ed", color: "#c2410c", borderRadius: 6 }}>
                              Needs Info
                            </button>
                          </>
                        )}
                        {isDone && <span style={{ color: "#16a34a", fontWeight: 600 }}>Closed</span>}
                      </div>
                    </td>
                  </tr>

                  {expandedId === id && (
                    <tr style={{ background: "#f9fafb" }}>
                      <td colSpan={11} style={{ padding: "12px 20px" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                          <div><strong>Description:</strong><br />{issue.description || "—"}</div>
                          <div><strong>Batch/Lot:</strong> {issue.batch_lot || "—"}</div>
                          <div><strong>Stage:</strong> {issue.production_stage || "—"}</div>
                          <div><strong>Defect:</strong> {issue.defect_type || "—"}</div>
                          <div><strong>RCA:</strong> {issue.rca || "—"}</div>
                          <div><strong>CAPA:</strong> {issue.capa || "—"}</div>
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
    </div>
  );
};

export default IssueTableTester;



// import React, { useContext, useState } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { updateIssueStatus } from "../api/issueApi";

// const SEVERITY_COLORS = {
//   critical: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5", dot: "#ef4444" },
//   high:     { bg: "#fff7ed", text: "#c2410c", border: "#fdba74", dot: "#f97316" },
//   medium:   { bg: "#fefce8", text: "#a16207", border: "#fde047", dot: "#eab308" },
//   low:      { bg: "#f0fdf4", text: "#15803d", border: "#86efac", dot: "#22c55e" },
// };

// const SeverityBadge = ({ level }) => {
//   const s = SEVERITY_COLORS[level] || SEVERITY_COLORS.medium;
//   return (
//     <span style={{
//       padding: "2px 9px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700,
//       background: s.bg, color: s.text, border: `1px solid ${s.border}`,
//       display: "inline-flex", alignItems: "center", gap: 4,
//     }}>
//       <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
//       {(level || "medium").toUpperCase()}
//     </span>
//   );
// };

// const StatusBadge = ({ status }) => {
//   const map = {
//     done:        { bg: "#dcfce7", color: "#16a34a", label: "Done" },
//     "in progress": { bg: "#dbeafe", color: "#1d4ed8", label: "In Progress" },
//     open:        { bg: "#f3f4f6", color: "#374151", label: "Open" },
//     verified:    { bg: "#f5f3ff", color: "#7c3aed", label: "Verified" },
//     "needs info": { bg: "#fff7ed", color: "#c2410c", label: "Needs Info" },
//     escalated:   { bg: "#fef2f2", color: "#dc2626", label: "Escalated" },
//   };
//   const s = map[(status || "").toLowerCase()] || map.open;
//   return (
//     <span style={{
//       padding: "3px 10px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
//       background: s.bg, color: s.color, whiteSpace: "nowrap",
//     }}>
//       {s.label}
//     </span>
//   );
// };

// const IssueTableTester = ({ issues = [], onRefresh }) => {
//   const { user, role } = useContext(AuthContext) || {};
//   const currentRole = (role || user?.role || "").toLowerCase();
//   const [loadingId, setLoadingId] = useState(null);
//   const [toast, setToast] = useState(null);
//   const [expandedId, setExpandedId] = useState(null);
//   const [severityMap, setSeverityMap] = useState({});
//   const [testNotes, setTestNotes] = useState({});

//   const showToast = (msg, type = "success") => {
//     setToast({ msg, type });
//     setTimeout(() => setToast(null), 3000);
//   };

//   const handleAction = async (issue, newStatus) => {
//     const id = issue.issue_id || issue.IssueID;
//     setLoadingId(`${id}-${newStatus}`);
//     try {
//       await updateIssueStatus(id, newStatus);
//       showToast(`Issue #${id} marked as "${newStatus}"`, "success");
//       onRefresh?.();
//     } catch {
//       showToast(`Failed to update issue #${id}. Please try again.`, "error");
//     } finally {
//       setLoadingId(null);
//     }
//   };

//   const canAct = ["tester", "admin", "superadmin"].includes(currentRole);

//   if (!issues.length) return (
//     <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No issues found.</div>
//   );

//   return (
//     <div style={{ fontFamily: "'Inter', sans-serif" }}>
//       {toast && (
//         <div style={{
//           position: "fixed", top: 24, right: 24, zIndex: 9999,
//           padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.87rem",
//           background: toast.type === "success" ? "#16a34a" : "#dc2626",
//           color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
//           animation: "slideIn 0.3s ease",
//         }}>
//           {toast.type === "success" ? "✓" : "✕"} {toast.msg}
//         </div>
//       )}

//       <div style={{ marginBottom: 8, fontSize: "0.78rem", color: "#9ca3af", fontStyle: "italic" }}>
//         Tester view — set severity, verify fixes, or flag issues needing more information.
//       </div>

//       <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" }}>
//         <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
//           <thead>
//             <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
//               {["#", "Type", "Sprint", "Team", "Status", "Severity", "Test Notes", "QA Actions"].map((h) => (
//                 <th key={h} style={{
//                   padding: "12px 14px", textAlign: "left", fontSize: "0.75rem",
//                   fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em",
//                 }}>
//                   {h}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {issues.map((issue) => {
//               const id = issue.issue_id || issue.IssueID;
//               const isBug = (issue.issuetype || issue.issue_type || "").toLowerCase() === "bug";
//               const severity = severityMap[id] || (isBug ? "high" : "low");
//               const status = issue.status || "Open";
//               const isDone = status.toLowerCase() === "done";

//               return (
//                 // FIX: key on React.Fragment
//                 <React.Fragment key={id}>
//                   <tr
//                     onClick={() => setExpandedId(expandedId === id ? null : id)}
//                     style={{
//                       borderBottom: "1px solid #f1f5f9", cursor: "pointer",
//                       background: expandedId === id ? "#f0fdf4" : isBug ? "#fff8f7" : "#fff",
//                     }}
//                   >
//                     <td style={{ padding: "12px 14px", fontWeight: 700, color: "#374151", fontSize: "0.87rem" }}>
//                       #{id}
//                     </td>
//                     <td style={{ padding: "12px 14px" }}>
//                       <span style={{
//                         padding: "2px 9px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
//                         background: isBug ? "#fef2f2" : "#eff6ff",
//                         color: isBug ? "#dc2626" : "#1d4ed8",
//                       }}>
//                         {isBug ? "Bug" : "Task"}
//                       </span>
//                     </td>
//                     <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.sprint || "—"}</td>
//                     <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.assigneeteam || "—"}</td>
//                     <td style={{ padding: "12px 14px" }}><StatusBadge status={status} /></td>
//                     <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
//                       {canAct ? (
//                         <select
//                           value={severity}
//                           onChange={(e) => setSeverityMap((prev) => ({ ...prev, [id]: e.target.value }))}
//                           style={{
//                             padding: "3px 8px", borderRadius: 6,
//                             border: "1px solid #e5e7eb", fontSize: "0.78rem",
//                             cursor: "pointer", outline: "none",
//                           }}
//                         >
//                           <option value="critical">Critical</option>
//                           <option value="high">High</option>
//                           <option value="medium">Medium</option>
//                           <option value="low">Low</option>
//                         </select>
//                       ) : (
//                         <SeverityBadge level={severity} />
//                       )}
//                     </td>
//                     <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
//                       <input
//                         placeholder="Test case / repro steps…"
//                         value={testNotes[id] || ""}
//                         onChange={(e) => setTestNotes((prev) => ({ ...prev, [id]: e.target.value }))}
//                         style={{
//                           padding: "4px 8px", fontSize: "0.78rem", borderRadius: 6,
//                           border: "1px solid #e5e7eb", outline: "none", width: 160,
//                         }}
//                       />
//                     </td>
//                     <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
//                       <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
//                         {canAct && !isDone && (
//                           <>
//                             <button
//                               onClick={() => handleAction(issue, "Verified")}
//                               disabled={loadingId === `${id}-Verified`}
//                               style={{
//                                 padding: "4px 9px", fontSize: "0.73rem", fontWeight: 700,
//                                 borderRadius: 6, border: "none", cursor: "pointer",
//                                 background: "#dcfce7", color: "#16a34a",
//                               }}
//                             >
//                               {loadingId === `${id}-Verified` ? "…" : "Verify Fix"}
//                             </button>
//                             <button
//                               onClick={() => handleAction(issue, "Needs Info")}
//                               disabled={loadingId === `${id}-Needs Info`}
//                               style={{
//                                 padding: "4px 9px", fontSize: "0.73rem", fontWeight: 700,
//                                 borderRadius: 6, border: "none", cursor: "pointer",
//                                 background: "#fff7ed", color: "#c2410c",
//                               }}
//                             >
//                               {loadingId === `${id}-Needs Info` ? "…" : "Needs Info"}
//                             </button>
//                             {isBug && severity === "critical" && (
//                               <button
//                                 onClick={() => handleAction(issue, "Escalated")}
//                                 disabled={loadingId === `${id}-Escalated`}
//                                 style={{
//                                   padding: "4px 9px", fontSize: "0.73rem", fontWeight: 700,
//                                   borderRadius: 6, border: "none", cursor: "pointer",
//                                   background: "#fef2f2", color: "#dc2626",
//                                 }}
//                               >
//                                 {loadingId === `${id}-Escalated` ? "…" : "Escalate"}
//                               </button>
//                             )}
//                           </>
//                         )}
//                         {isDone && (
//                           <span style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>
//                             Closed
//                           </span>
//                         )}
//                       </div>
//                     </td>
//                   </tr>
//                   {expandedId === id && (
//                     <tr style={{ background: "#f9fafb" }}>
//                       <td colSpan={8} style={{ padding: "12px 20px", fontSize: "0.83rem", color: "#374151" }}>
//                         <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.75rem" }}>
//                           <div>
//                             <strong>Description:</strong><br />
//                             {issue.description || "No description provided."}
//                           </div>
//                           <div>
//                             <strong>Created:</strong>{" "}
//                             {issue.createddate ? new Date(issue.createddate).toLocaleDateString() : "Unknown"}
//                           </div>
//                           <div>
//                             <strong>Closed:</strong>{" "}
//                             {issue.closeddate ? new Date(issue.closeddate).toLocaleDateString() : "Not closed"}
//                           </div>
//                           {testNotes[id] && (
//                             <div><strong>Test Notes:</strong> {testNotes[id]}</div>
//                           )}
//                         </div>
//                       </td>
//                     </tr>
//                   )}
//                 </React.Fragment>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//       <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity:0 } to { transform:translateX(0); opacity:1 } }`}</style>
//     </div>
//   );
// };

// export default IssueTableTester;














































// import { useContext, useState } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { updateIssueStatus } from "../api/issueApi";

// const SEVERITY_COLORS = {
//   critical: { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5', dot: '#ef4444' },
//   high:     { bg: '#fff7ed', text: '#c2410c', border: '#fdba74', dot: '#f97316' },
//   medium:   { bg: '#fefce8', text: '#a16207', border: '#fde047', dot: '#eab308' },
//   low:      { bg: '#f0fdf4', text: '#15803d', border: '#86efac', dot: '#22c55e' },
// };

// const SeverityBadge = ({ level }) => {
//   const s = SEVERITY_COLORS[level] || SEVERITY_COLORS.medium;
//   return (
//     <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
//       background: s.bg, color: s.text, border: `1px solid ${s.border}`,
//       display: 'inline-flex', alignItems: 'center', gap: 4 }}>
//       <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
//       {level?.toUpperCase() || 'MEDIUM'}
//     </span>
//   );
// };

// const StatusBadge = ({ status }) => {
//   const map = {
//     'done':        { bg: '#dcfce7', color: '#16a34a', label: '✓ Done' },
//     'in progress': { bg: '#dbeafe', color: '#1d4ed8', label: '⚡ In Progress' },
//     'open':        { bg: '#f3f4f6', color: '#374151', label: '○ Open' },
//     'verified':    { bg: '#f5f3ff', color: '#7c3aed', label: '✅ Verified' },
//     'needs info':  { bg: '#fff7ed', color: '#c2410c', label: '❓ Needs Info' },
//   };
//   const s = map[(status || '').toLowerCase()] || map.open;
//   return (
//     <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
//       background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>
//       {s.label}
//     </span>
//   );
// };

// const IssueTableTester = ({ issues = [], onRefresh }) => {
//   const { user, role } = useContext(AuthContext) || {};
//   const currentRole = (role || user?.role || '').toLowerCase();
//   const [loadingId, setLoadingId] = useState(null);
//   const [toast, setToast] = useState(null);
//   const [expandedId, setExpandedId] = useState(null);
//   const [severityMap, setSeverityMap] = useState({});

//   const showToast = (msg, type = 'success') => {
//     setToast({ msg, type });
//     setTimeout(() => setToast(null), 3000);
//   };

//   const handleAction = async (issue, newStatus) => {
//     const id = issue.issue_id || issue.IssueID;
//     setLoadingId(`${id}-${newStatus}`);
//     try {
//       await updateIssueStatus(id, newStatus);
//       showToast(`Issue #${id} marked as "${newStatus}"`, 'success');
//       onRefresh?.();
//     } catch (err) {
//       showToast(`Failed to update issue #${id}. Please try again.`, 'error');
//     } finally {
//       setLoadingId(null);
//     }
//   };

//   const canAct = ['tester', 'admin', 'superadmin'].includes(currentRole);

//   return (
//     <div style={{ fontFamily: "'Inter', sans-serif" }}>
//       {/* Toast */}
//       {toast && (
//         <div style={{
//           position: 'fixed', top: 24, right: 24, zIndex: 9999,
//           padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: '0.87rem',
//           background: toast.type === 'success' ? '#16a34a' : '#dc2626',
//           color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
//           animation: 'slideIn 0.3s ease',
//         }}>
//           {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
//         </div>
//       )}

//       {/* Table header explanation */}
//       <div style={{ marginBottom: 8, fontSize: '0.78rem', color: '#9ca3af', fontStyle: 'italic' }}>
//         Tester view — set severity, verify fixes, or flag issues needing more information.
//       </div>

//       <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #e5e7eb' }}>
//         <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
//           <thead>
//             <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
//               {['#', 'Type', 'Sprint', 'Team', 'Status', 'Severity', 'QA Actions'].map(h => (
//                 <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {issues.map((issue) => {
//               const id = issue.issue_id || issue.IssueID;
//               const isBug = (issue.issuetype || issue.issue_type || '').toLowerCase() === 'bug';
//               const severity = severityMap[id] || (isBug ? 'high' : 'low');
//               const status = (issue.status || 'Open');
//               const isDone = status.toLowerCase() === 'done';

//               return (
//                 <>
//                   <tr key={id} onClick={() => setExpandedId(expandedId === id ? null : id)}
//                     style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s',
//                       background: expandedId === id ? '#f0fdf4' : isBug ? '#fff8f7' : '#fff' }}>
//                     <td style={{ padding: '12px 14px', fontWeight: 700, color: '#374151', fontSize: '0.87rem' }}>#{id}</td>
//                     <td style={{ padding: '12px 14px' }}>
//                       <span style={{ padding: '2px 9px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
//                         background: isBug ? '#fef2f2' : '#eff6ff',
//                         color: isBug ? '#dc2626' : '#1d4ed8' }}>
//                         {isBug ? '🐛 Bug' : '📋 Task'}
//                       </span>
//                     </td>
//                     <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#374151' }}>{issue.sprint || '—'}</td>
//                     <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#374151' }}>{issue.assigneeteam || '—'}</td>
//                     <td style={{ padding: '12px 14px' }}><StatusBadge status={status} /></td>
//                     <td style={{ padding: '12px 14px' }}>
//                       {canAct ? (
//                         <select
//                           value={severity}
//                           onClick={e => e.stopPropagation()}
//                           onChange={e => setSeverityMap(prev => ({ ...prev, [id]: e.target.value }))}
//                           style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.78rem', cursor: 'pointer', outline: 'none' }}>
//                           <option value="critical">🔴 Critical</option>
//                           <option value="high">🟠 High</option>
//                           <option value="medium">🟡 Medium</option>
//                           <option value="low">🟢 Low</option>
//                         </select>
//                       ) : <SeverityBadge level={severity} />}
//                     </td>
//                     <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
//                       <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
//                         {canAct && !isDone && (
//                           <>
//                             <button
//                               onClick={() => handleAction(issue, 'Verified')}
//                               disabled={loadingId === `${id}-Verified`}
//                               style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer', background: '#dcfce7', color: '#16a34a' }}>
//                               {loadingId === `${id}-Verified` ? '…' : '✅ Verify Fix'}
//                             </button>
//                             <button
//                               onClick={() => handleAction(issue, 'Needs Info')}
//                               disabled={loadingId === `${id}-Needs Info`}
//                               style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#c2410c' }}>
//                               {loadingId === `${id}-Needs Info` ? '…' : '❓ Needs Info'}
//                             </button>
//                             {isBug && severity === 'critical' && (
//                               <button
//                                 onClick={() => handleAction(issue, 'Escalated')}
//                                 disabled={loadingId === `${id}-Escalated`}
//                                 style={{ padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#dc2626' }}>
//                                 {loadingId === `${id}-Escalated` ? '…' : '🚨 Escalate'}
//                               </button>
//                             )}
//                           </>
//                         )}
//                         {isDone && <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>✓ Closed</span>}
//                       </div>
//                     </td>
//                   </tr>
//                   {expandedId === id && (
//                     <tr key={`${id}-detail`} style={{ background: '#f9fafb' }}>
//                       <td colSpan={7} style={{ padding: '12px 20px', fontSize: '0.83rem', color: '#374151' }}>
//                         <strong>Description:</strong> {issue.description || 'No description provided.'}<br />
//                         <strong>Closed date:</strong> {issue.closeddate || 'Not closed'} &nbsp;·&nbsp;
//                         <strong>Created:</strong> {issue.createddate || 'Unknown'}
//                       </td>
//                     </tr>
//                   )}
//                 </>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//       <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity:0 } to { transform: translateX(0); opacity:1 } }`}</style>
//     </div>
//   );
// };

// export default IssueTableTester;