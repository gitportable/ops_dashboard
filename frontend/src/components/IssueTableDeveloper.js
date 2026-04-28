import React, { useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../auth/AuthContext";
import { updateIssueStatus } from "../api/issueApi";
import { createApproval } from "../api/approvalApi";
import { getUsers } from "../api/userApi";
import { getSubtasks, createSubtask, updateSubtask, deleteSubtask } from "../api/subtaskApi";
import { getMachines, assignMachineToIssue } from "../api/machineApi";
import { getAttachments, uploadAttachment, deleteAttachment } from "../api/attachmentApi";
import toast from "react-hot-toast";

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

const IssueAttachmentsSection = ({ issue, expandedRow, currentUserId }) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["attachments", issue.issueid],
    queryFn: () =>
      getAttachments(issue.issueid).then((r) =>
        Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : Array.isArray(r?.data?.data) ? r.data.data : []
      ),
    enabled: expandedRow === issue.issueid,
  });
  const safeAttachments = Array.isArray(attachments) ? attachments : [];

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await uploadAttachment(issue.issueid, selectedFile);
      setSelectedFile(null);
      await queryClient.invalidateQueries({ queryKey: ["attachments", issue.issueid] });
      toast.success("Attachment uploaded");
    } catch {
      toast.error("Failed to upload attachment");
    }
  };

  const handleDeleteAttachment = async (attachmentId, issueId) => {
    try {
      await deleteAttachment(attachmentId);
      queryClient.invalidateQueries({ queryKey: ["attachments", issueId] });
      toast.success("Attachment deleted");
    } catch {
      toast.error("Failed to delete attachment");
    }
  };

  return (
    <div style={{ marginTop: "0.9rem", borderTop: "1px solid #dbeafe", paddingTop: "0.85rem" }}>
      <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>Attachments</div>
      {isLoading && <div style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: 8 }}>Loading attachments...</div>}
      {!isLoading && safeAttachments.length === 0 && (
        <div style={{ color: "#6b7280", fontSize: "0.8rem", marginBottom: 8 }}>No attachments</div>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
        {safeAttachments.map((attachment) => {
          const canDeleteOwn = String(attachment.uploaded_by) === String(currentUserId);
          return (
            <div
              key={attachment.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 8,
                width: 150,
                background: "#fff",
                position: "relative",
              }}
            >
              <button
                onClick={() => handleDeleteAttachment(attachment.id, issue.issueid)}
                style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  background: "#EF4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  cursor: "pointer",
                  fontSize: "0.65rem",
                  lineHeight: "18px",
                  textAlign: "center",
                }}
              >
                ×
              </button>
              <img
                src={`http://localhost:5000${attachment.file_path}`}
                alt={attachment.file_name}
                onClick={() =>
                  window.open(
                    `http://localhost:5000${attachment.file_path}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "block",
                  marginBottom: 6,
                }}
              />
              <div
                title={attachment.file_name}
                style={{
                  fontSize: "0.72rem",
                  color: "#374151",
                  wordBreak: "break-word",
                  marginBottom: 6,
                }}
              >
                {attachment.file_name}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile}
          style={{
            border: "1px solid #bfdbfe",
            background: selectedFile ? "#eff6ff" : "#f3f4f6",
            color: selectedFile ? "#1d4ed8" : "#9ca3af",
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: selectedFile ? "pointer" : "not-allowed",
          }}
        >
          Upload
        </button>
      </div>
    </div>
  );
};

const IssueTableDeveloper = ({ issues = [], onRefresh }) => {
  const { user, role } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || "").toLowerCase();
  const [loadingId, setLoadingId] = useState(null);
  const [bannerToast, setBannerToast] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [prLinks, setPrLinks] = useState({});
  const [effortMap, setEffortMap] = useState({});
  const [approvers, setApprovers] = useState([]);
  const [approvalOpenId, setApprovalOpenId] = useState(null);
  const [selectedApprover, setSelectedApprover] = useState({});
  const [requestingApprovalId, setRequestingApprovalId] = useState(null);

  const showToast = (msg, type = "success") => {
    setBannerToast({ msg, type });
    setTimeout(() => setBannerToast(null), 3000);
  };

  useEffect(() => {
    let mounted = true;
    getUsers()
      .then((rows) => {
        if (!mounted) return;
        const filtered = (Array.isArray(rows) ? rows : []).filter((u) => {
          const r = (u?.role || "").toLowerCase();
          return r === "tester" || r === "admin" || r === "superadmin";
        });
        setApprovers(filtered);
      })
      .catch(() => setApprovers([]));
    return () => {
      mounted = false;
    };
  }, []);

  const handleStatusUpdate = async (issue, newStatus) => {
    const id = issue.issueid || issue.issue_id || issue.IssueID;
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

  const handleRequestApproval = async (issue) => {
    const id = issue.issueid || issue.issue_id || issue.IssueID;
    const approverId = selectedApprover[id];
    if (!approverId) {
      toast.error("Please select an approver.");
      return;
    }
    setRequestingApprovalId(id);
    try {
      await createApproval({ issue_id: id, approver_id: approverId });
      toast.success("Approval request created.");
      setApprovalOpenId(null);
    } catch {
      toast.error("Failed to create approval request.");
    } finally {
      setRequestingApprovalId(null);
    }
  };

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
      {bannerToast && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.87rem",
          background: bannerToast.type === "success" ? "#1d4ed8" : "#dc2626",
          color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease",
        }}>
          {bannerToast.type === "success" ? "✓" : "✕"} {bannerToast.msg}
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
              const id = issue.issueid || issue.issue_id || issue.IssueID;
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
                        {canAct && status.toLowerCase() === "in review" && (
                          <button
                            onClick={() => setApprovalOpenId(approvalOpenId === id ? null : id)}
                            style={{
                              padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700,
                              borderRadius: 6, cursor: "pointer",
                              background: "#ecfeff", color: "#0e7490",
                              border: "1px solid #a5f3fc",
                            }}
                          >
                            Request Approval
                          </button>
                        )}
                        {isDone && (
                          <span style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>
                            Complete
                          </span>
                        )}
                      </div>
                      {approvalOpenId === id && (
                        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <select
                            value={selectedApprover[id] || ""}
                            onChange={(e) => setSelectedApprover((prev) => ({ ...prev, [id]: e.target.value }))}
                            style={{
                              padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb",
                              fontSize: "0.75rem", outline: "none", minWidth: 140, background: "#fff",
                            }}
                          >
                            <option value="">Select approver</option>
                            {approvers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name || u.email} ({u.role})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRequestApproval(issue)}
                            disabled={requestingApprovalId === id}
                            style={{
                              padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700,
                              borderRadius: 6, cursor: requestingApprovalId === id ? "not-allowed" : "pointer",
                              background: "#1d4ed8", color: "#fff", border: "none",
                              opacity: requestingApprovalId === id ? 0.7 : 1,
                            }}
                          >
                            {requestingApprovalId === id ? "..." : "Send"}
                          </button>
                        </div>
                      )}
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
                        <div style={{ marginTop: "1rem", borderTop: "1px solid #dbeafe", paddingTop: "0.85rem" }}>
                          <SubtaskChecklist issueId={id} />
                        </div>
                        <div style={{ marginTop: "0.9rem", borderTop: "1px solid #dbeafe", paddingTop: "0.85rem" }}>
                          <MachineAssignment issue={issue} onRefresh={onRefresh} />
                        </div>
                        <IssueAttachmentsSection
                          issue={issue}
                          expandedRow={expandedId}
                          currentUserId={user?.id || user?.userId}
                        />
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

const SubtaskChecklist = ({ issueId }) => {
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState(null);
  const {
    data: subtasks = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["subtasks", issueId],
    queryFn: () => getSubtasks(issueId),
  });

  const safeList = Array.isArray(subtasks) ? subtasks : [];
  const doneCount = safeList.filter((s) => !!s.is_done).length;
  const totalCount = safeList.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      await createSubtask(issueId, title);
      setNewTitle("");
      await refetch();
    } catch {
      toast.error("Failed to add subtask");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (subtask) => {
    const sid = subtask.id;
    setWorkingId(`toggle-${sid}`);
    try {
      await updateSubtask(sid, { is_done: !subtask.is_done });
      await refetch();
    } catch {
      toast.error("Failed to update subtask");
    } finally {
      setWorkingId(null);
    }
  };

  const handleDelete = async (subtask) => {
    const sid = subtask.id;
    setWorkingId(`delete-${sid}`);
    try {
      await deleteSubtask(sid);
      await refetch();
    } catch {
      toast.error("Failed to delete subtask");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div>
      <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>
        Subtasks / Checklist
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: "0.76rem", color: "#334155", marginBottom: 6 }}>
          Subtasks: {doneCount}/{totalCount} completed
        </div>
        <div style={{ width: "100%", height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "#16a34a",
              transition: "width 220ms ease",
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Loading subtasks...</div>
      ) : safeList.length === 0 ? (
        <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 8 }}>+ Add subtask</div>
      ) : (
        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
          {safeList.map((subtask) => {
            const isDone = !!subtask.is_done;
            return (
              <div
                key={subtask.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "6px 8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <input
                    type="checkbox"
                    checked={isDone}
                    disabled={workingId === `toggle-${subtask.id}`}
                    onChange={() => handleToggle(subtask)}
                  />
                  <span
                    style={{
                      color: isDone ? "#166534" : "#334155",
                      textDecoration: isDone ? "line-through" : "none",
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {isDone ? "✓ " : ""}
                    {subtask.title}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(subtask)}
                  disabled={workingId === `delete-${subtask.id}`}
                  style={{
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#dc2626",
                    borderRadius: 6,
                    fontSize: "0.78rem",
                    padding: "2px 8px",
                    cursor: "pointer",
                  }}
                  title="Delete subtask"
                >
                  🗑
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add subtask..."
          style={{
            flex: 1,
            minWidth: 180,
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            outline: "none",
            fontSize: "0.8rem",
            background: "#fff",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newTitle.trim()}
          style={{
            border: "none",
            background: "#1e3a8a",
            color: "#fff",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: "0.78rem",
            padding: "6px 10px",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "..." : "Add"}
        </button>
      </div>
    </div>
  );
};

const MachineAssignment = ({ issue, onRefresh }) => {
  const issueId = issue.issueid || issue.issue_id || issue.IssueID;
  const initialMachineId =
    issue.machine_id !== undefined && issue.machine_id !== null
      ? String(issue.machine_id)
      : issue.machineid !== undefined && issue.machineid !== null
        ? String(issue.machineid)
        : "";
  const [selectedId, setSelectedId] = useState(initialMachineId);
  const [saving, setSaving] = useState(false);

  const { data: machinesRaw = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: getMachines,
  });

  const machines = Array.isArray(machinesRaw) ? machinesRaw : [];
  const selectedMachine =
    machines.find((m) => String(m.id) === String(selectedId || "")) || null;

  const assign = async (value) => {
    setSaving(true);
    try {
      const machineId = value === "" ? null : Number(value);
      await assignMachineToIssue(issueId, machineId);
      setSelectedId(value);
      onRefresh?.();
      toast.success(value === "" ? "Machine cleared." : "Machine assigned.");
    } catch {
      toast.error("Failed to update machine assignment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>Machine</div>
      <div style={{ fontSize: "0.8rem", color: "#334155", marginBottom: 8 }}>
        Current:{" "}
        <b>
          {selectedMachine
            ? `${selectedMachine.machine_name || selectedMachine.machine_code} (#${selectedMachine.id})`
            : initialMachineId
              ? `Machine #${initialMachineId}`
              : "None"}
        </b>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <select
          value={selectedId}
          disabled={saving}
          onChange={(e) => assign(e.target.value)}
          style={{
            minWidth: 220,
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #cbd5e1",
            fontSize: "0.8rem",
            background: "#fff",
          }}
        >
          <option value="">Select machine</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {(m.machine_name || m.machine_code || `Machine ${m.id}`) + (m.location ? ` — ${m.location}` : "")}
            </option>
          ))}
        </select>
        <button
          onClick={() => assign("")}
          disabled={saving || !selectedId}
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#dc2626",
            borderRadius: 6,
            padding: "6px 10px",
            fontSize: "0.76rem",
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default IssueTableDeveloper;
