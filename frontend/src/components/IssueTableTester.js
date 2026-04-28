import React, { useContext, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../auth/AuthContext";
import { updateIssueStatus } from "../api/issueApi";
import { deleteAttachment, getAttachments, uploadAttachment } from "../api/attachmentApi";
import {
  addInspectionItem,
  checkInspectionItem,
  deleteInspectionItem,
  getInspectionComplete,
  getInspectionItems,
  uncheckInspectionItem,
} from "../api/inspectionApi";
import {
  createCapa,
  createRca,
  getCapaItems,
  getRcaForIssue,
  updateCapa,
} from "../api/rcaApi";
import api from "../api/axios";
import toast from "react-hot-toast";

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
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
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

const IssueAttachmentsSection = ({ issue, expandedRow, showToast }) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const issueId = issue.issueid || issue.issue_id || issue.IssueID;

  const { data: attachmentsResponse, isLoading } = useQuery({
    queryKey: ["attachments", issue.issueid],
    queryFn: () => getAttachments(issue.issueid || issueId),
    enabled: expandedRow === issue.issueid,
  });

  const attachments = Array.isArray(attachmentsResponse?.data)
    ? attachmentsResponse.data
    : Array.isArray(attachmentsResponse)
    ? attachmentsResponse
    : Array.isArray(attachmentsResponse?.data?.data)
    ? attachmentsResponse.data.data
    : [];
  const safeAttachments = Array.isArray(attachments) ? attachments : [];

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      await uploadAttachment(issue.issueid || issueId, selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["attachments", issue.issueid] });
      showToast("Attachment uploaded", "success");
    } catch {
      showToast("Failed to upload attachment", "error");
    }
  };

  const handleDelete = async (attachmentId) => {
    try {
      await deleteAttachment(attachmentId);
      await queryClient.invalidateQueries({ queryKey: ["attachments", issue.issueid] });
      showToast("Attachment deleted", "success");
    } catch {
      showToast("Failed to delete attachment", "error");
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <strong>Attachments:</strong>
      <div style={{ marginTop: 8 }}>
        {isLoading && <div style={{ color: "#6b7280" }}>Loading attachments...</div>}
        {!isLoading && safeAttachments.length === 0 && (
          <div style={{ color: "#6b7280" }}>No attachments</div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {safeAttachments.map((attachment) => (
            <div
              key={attachment.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 8,
                width: 140,
                background: "#fff",
              }}
            >
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
              <button
                onClick={() => handleDelete(attachment.id)}
                style={{
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          ref={fileInputRef}
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

const InspectionChecklistSection = ({ issue, expandedRow, showToast }) => {
  const queryClient = useQueryClient();
  const [itemText, setItemText] = useState("");
  const issueId = issue.issueid || issue.issue_id || issue.IssueID;

  const { data: inspectionItems = [], isLoading } = useQuery({
    queryKey: ["inspection", issue.issueid],
    queryFn: () => getInspectionItems(issue.issueid || issueId),
    enabled: expandedRow === issue.issueid,
  });

  const total = inspectionItems.length;
  const checked = inspectionItems.filter((item) => !!item.is_checked).length;

  const toggleItem = async (item) => {
    try {
      if (item.is_checked) {
        await uncheckInspectionItem(item.id);
      } else {
        await checkInspectionItem(item.id);
      }
      await queryClient.invalidateQueries({ queryKey: ["inspection", issue.issueid] });
    } catch {
      showToast("Failed to update inspection item", "error");
    }
  };

  const addItem = async () => {
    const text = itemText.trim();
    if (!text) return;
    try {
      await addInspectionItem(issue.issueid || issueId, text);
      setItemText("");
      await queryClient.invalidateQueries({ queryKey: ["inspection", issue.issueid] });
    } catch {
      showToast("Failed to add inspection item", "error");
    }
  };

  const deleteItem = async (id) => {
    try {
      await deleteInspectionItem(id);
      await queryClient.invalidateQueries({ queryKey: ["inspection", issue.issueid] });
    } catch {
      showToast("Failed to delete inspection item", "error");
    }
  };

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
      <strong>Inspection Checklist</strong>
      <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 4 }}>
        Inspection: {checked}/{total} items verified
      </div>
      {isLoading && <div style={{ color: "#6b7280", marginTop: 8 }}>Loading inspection items...</div>}
      {!isLoading && (
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {inspectionItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 10,
                background: item.is_checked ? "#dcfce7" : "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", flex: 1, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={!!item.is_checked}
                  onChange={() => toggleItem(item)}
                />
                <span style={{ fontSize: "0.82rem", color: "#374151" }}>
                  {item.item_text}
                  {item.is_checked && (
                    <div style={{ fontSize: "0.72rem", color: "#15803d", marginTop: 2 }}>
                      Checked by: {item.checked_by_name || item.checked_by || "Unknown"}
                    </div>
                  )}
                </span>
              </label>
              <button
                onClick={() => deleteItem(item.id)}
                style={{
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#dc2626",
                  borderRadius: 6,
                  padding: "2px 8px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
                title="Delete item"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={itemText}
          onChange={(e) => setItemText(e.target.value)}
          placeholder="Add inspection item..."
          style={{
            minWidth: 220,
            padding: "6px 8px",
            borderRadius: 6,
            border: "1px solid #e5e7eb",
            outline: "none",
            fontSize: "0.8rem",
          }}
        />
        <button
          onClick={addItem}
          disabled={!itemText.trim()}
          style={{
            border: "1px solid #bfdbfe",
            background: itemText.trim() ? "#eff6ff" : "#f3f4f6",
            color: itemText.trim() ? "#1d4ed8" : "#9ca3af",
            borderRadius: 6,
            padding: "5px 10px",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: itemText.trim() ? "pointer" : "not-allowed",
          }}
        >
          Add Item
        </button>
      </div>
    </div>
  );
};

const RcaSection = ({ issue, expandedRow, isBug, severity }) => {
  const queryClient = useQueryClient();
  const issueId = issue.issueid || issue.issue_id || issue.IssueID;
  const [showRcaForm, setShowRcaForm] = useState(false);
  const [showRcaModal, setShowRcaModal] = useState(false);
  const [showCapaForm, setShowCapaForm] = useState(false);
  const [rcaFormData, setRcaFormData] = useState({
    problem_statement: "",
    root_cause: "",
    contributing_factors: "",
    impact_assessment: "",
  });
  const [whys, setWhys] = useState(["", "", "", "", ""]);
  const [capaFormData, setCapaFormData] = useState({
    action_type: "Corrective",
    description: "",
    assigned_to: "",
    due_date: "",
  });

  const { data: rcaData } = useQuery({
    queryKey: ["rca", issue.issueid],
    queryFn: () => getRcaForIssue(issue.issueid),
    enabled: expandedRow === issue.issueid,
  });
  const rca = rcaData ?? null;

  const { data: capaItems = [] } = useQuery({
    queryKey: ["capa", rca?.id],
    queryFn: () => getCapaItems(rca.id),
    enabled: !!rca?.id && showRcaModal,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => api.get("/users").then((r) => r.data),
  });

  const canStartRca = isBug && ["critical", "high"].includes((severity || "").toLowerCase());

  const submitRca = async () => {
    try {
      await createRca(issue.issueid, {
        ...rcaFormData,
        five_why_analysis: whys,
      });
      await queryClient.invalidateQueries({ queryKey: ["rca", issue.issueid] });
      toast.success("RCA created");
      setShowRcaForm(false);
    } catch {
      toast.error("Failed to create RCA");
    }
  };

  const submitCapa = async () => {
    try {
      await createCapa(rca.id, {
        action_type: capaFormData.action_type,
        description: capaFormData.description,
        assigned_to: capaFormData.assigned_to || null,
        due_date: capaFormData.due_date || null,
      });
      await queryClient.invalidateQueries({ queryKey: ["capa", rca.id] });
      setCapaFormData({ action_type: "Corrective", description: "", assigned_to: "", due_date: "" });
      setShowCapaForm(false);
      toast.success("CAPA item created");
    } catch {
      toast.error("Failed to create CAPA item");
    }
  };

  const updateCapaStatus = async (id, status) => {
    try {
      await updateCapa(id, { status });
      await queryClient.invalidateQueries({ queryKey: ["capa", rca.id] });
    } catch {
      toast.error("Failed to update CAPA status");
    }
  };

  const parsedWhys = Array.isArray(rca?.five_why_analysis)
    ? rca.five_why_analysis
    : (() => {
        try {
          const parsed = JSON.parse(rca?.five_why_analysis || "[]");
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 12 }}>
      <strong>RCA / Root Cause Analysis</strong>

      {!rca && canStartRca && !showRcaForm && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setShowRcaForm(true)}
            style={{
              border: "1px solid #fed7aa",
              background: "#fff7ed",
              color: "#c2410c",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: "0.78rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Start RCA Analysis
          </button>
        </div>
      )}

      {showRcaForm && (
        <div style={{ marginTop: 12, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <textarea
              placeholder="Describe the problem clearly"
              value={rcaFormData.problem_statement}
              onChange={(e) => setRcaFormData((p) => ({ ...p, problem_statement: e.target.value }))}
              style={{ minHeight: 70, border: "1px solid #d1d5db", borderRadius: 6, padding: 8, fontSize: "0.82rem", resize: "vertical" }}
            />
            <textarea
              placeholder="What is the root cause?"
              value={rcaFormData.root_cause}
              onChange={(e) => setRcaFormData((p) => ({ ...p, root_cause: e.target.value }))}
              style={{ minHeight: 70, border: "1px solid #d1d5db", borderRadius: 6, padding: 8, fontSize: "0.82rem", resize: "vertical" }}
            />
            <textarea
              placeholder="List contributing factors"
              value={rcaFormData.contributing_factors}
              onChange={(e) => setRcaFormData((p) => ({ ...p, contributing_factors: e.target.value }))}
              style={{ minHeight: 70, border: "1px solid #d1d5db", borderRadius: 6, padding: 8, fontSize: "0.82rem", resize: "vertical" }}
            />
            <textarea
              placeholder="Describe business/quality impact"
              value={rcaFormData.impact_assessment}
              onChange={(e) => setRcaFormData((p) => ({ ...p, impact_assessment: e.target.value }))}
              style={{ minHeight: 70, border: "1px solid #d1d5db", borderRadius: 6, padding: 8, fontSize: "0.82rem", resize: "vertical" }}
            />
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }}>
              {whys.map((value, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <label style={{ width: 56, fontSize: "0.78rem", color: "#334155", fontWeight: 600 }}>
                    Why {idx + 1}:
                  </label>
                  <input
                    value={value}
                    onChange={(e) => {
                      const next = [...whys];
                      next[idx] = e.target.value;
                      setWhys(next);
                    }}
                    style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: 6, padding: "5px 8px", fontSize: "0.8rem" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={submitRca}
                style={{ border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 6, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
              >
                Submit
              </button>
              <button
                onClick={() => setShowRcaForm(false)}
                style={{ border: "1px solid #d1d5db", background: "#fff", color: "#374151", borderRadius: 6, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {rca && (
        <div style={{ marginTop: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#111827" }}>Root Cause:</div>
          <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: 4 }}>{rca.root_cause || "—"}</div>
          <button
            onClick={() => setShowRcaModal(true)}
            style={{ marginTop: 8, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "5px 10px", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}
          >
            View Full RCA
          </button>
        </div>
      )}

      {showRcaModal && rca && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.65)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ width: "min(920px, 100%)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 12, padding: 16, position: "relative" }}>
            <button
              onClick={() => setShowRcaModal(false)}
              style={{ position: "absolute", top: 10, right: 12, border: "none", background: "transparent", fontSize: "1.3rem", cursor: "pointer", color: "#64748b" }}
            >
              ×
            </button>
            <h3 style={{ margin: 0, marginBottom: 12, color: "#0f172a" }}>RCA Report — #{issue.issueid}</h3>

            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
              <div><strong>Problem Statement:</strong><div style={{ color: "#6b7280" }}>{rca.problem_statement || "—"}</div></div>
              <div><strong>Root Cause:</strong><div style={{ color: "#6b7280" }}>{rca.root_cause || "—"}</div></div>
              <div><strong>Contributing Factors:</strong><div style={{ color: "#6b7280" }}>{rca.contributing_factors || "—"}</div></div>
              <div><strong>Impact Assessment:</strong><div style={{ color: "#6b7280" }}>{rca.impact_assessment || "—"}</div></div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ background: "#f8fafc", padding: "8px 10px", fontWeight: 700, fontSize: "0.82rem" }}>5-Why Analysis</div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ width: 90, padding: "8px 10px", fontWeight: 700, fontSize: "0.78rem" }}>Why {i + 1}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.8rem", color: "#475569" }}>{parsedWhys[i] || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>CAPA Items</strong>
              <button
                onClick={() => setShowCapaForm((s) => !s)}
                style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "5px 10px", fontSize: "0.76rem", fontWeight: 700, cursor: "pointer" }}
              >
                + Add CAPA Item
              </button>
            </div>

            {showCapaForm && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, marginBottom: 12, display: "grid", gap: 8 }}>
                <select
                  value={capaFormData.action_type}
                  onChange={(e) => setCapaFormData((p) => ({ ...p, action_type: e.target.value }))}
                  style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: "0.8rem" }}
                >
                  <option value="Corrective">Corrective</option>
                  <option value="Preventive">Preventive</option>
                </select>
                <textarea
                  value={capaFormData.description}
                  onChange={(e) => setCapaFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Description"
                  style={{ minHeight: 70, border: "1px solid #d1d5db", borderRadius: 6, padding: 8, fontSize: "0.82rem", resize: "vertical" }}
                />
                <select
                  value={capaFormData.assigned_to}
                  onChange={(e) => setCapaFormData((p) => ({ ...p, assigned_to: e.target.value }))}
                  style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: "0.8rem" }}
                >
                  <option value="">-- Select Assignee --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={capaFormData.due_date}
                  onChange={(e) => setCapaFormData((p) => ({ ...p, due_date: e.target.value }))}
                  style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: "0.8rem" }}
                />
                <button
                  onClick={submitCapa}
                  style={{ width: "fit-content", border: "none", background: "#1d4ed8", color: "#fff", borderRadius: 6, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Submit
                </button>
              </div>
            )}

            <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Type", "Description", "Assigned To", "Due Date", "Status"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: "0.74rem", color: "#475569" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {capaItems.map((item) => (
                    <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", fontSize: "0.8rem" }}>{item.action_type || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.8rem" }}>{item.description || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.8rem" }}>{item.assigned_to_name || item.assigned_to || "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.8rem" }}>{item.due_date ? String(item.due_date).split("T")[0] : "—"}</td>
                      <td style={{ padding: "8px 10px", fontSize: "0.8rem" }}>
                        <select
                          value={item.status || "Open"}
                          onChange={(e) => updateCapaStatus(item.id, e.target.value)}
                          style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 8px", fontSize: "0.78rem" }}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Verified">Verified</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {capaItems.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "10px", color: "#64748b", fontSize: "0.8rem", textAlign: "center" }}>
                        No CAPA items yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const IssueTableTester = ({ issues = [], onRefresh }) => {
  const { user, role } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || "").toLowerCase();
  const [loadingId, setLoadingId] = useState(null);
  const [toastState, setToastState] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [severityMap, setSeverityMap] = useState({});
  const [testNotes, setTestNotes] = useState({});
  const [defectCats, setDefectCats] = useState({});

  const showToast = (msg, type = "success") => {
    setToastState({ msg, type });
    setTimeout(() => setToastState(null), 3000);
  };

  const handleAction = async (issue, newStatus) => {
    const id = issue.issueid || issue.issue_id || issue.IssueID;
    if (newStatus === "Verified") {
      try {
        const completion = await getInspectionComplete(id);
        if (!completion?.all_complete) {
          toast.error("Complete all inspection items first");
          return;
        }
      } catch {
        showToast("Failed to validate inspection checklist", "error");
        return;
      }
    }
    setLoadingId(`${id}-${newStatus}`);
    try {
      await updateIssueStatus(id, newStatus);
      showToast(`Issue #${id} marked as "${newStatus}"`, "success");
      onRefresh?.();
    } catch {
      showToast(`Failed to update issue #${id}. Please try again.`, "error");
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
      {toastState && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.87rem",
          background: toastState.type === "success" ? "#16a34a" : "#dc2626",
          color: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          animation: "slideIn 0.3s ease",
        }}>
          {toastState.type === "success" ? "✓" : "✕"} {toastState.msg}
        </div>
      )}

      <div style={{ marginBottom: 8, fontSize: "0.78rem", color: "#9ca3af", fontStyle: "italic" }}>
        Tester view — set severity, verify fixes, or flag issues needing more information.
      </div>

      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: "1px solid #e5e7eb" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              {["#", "Type", "Sprint", "Team", "Status", "Severity", "Defect Category", "Test Notes", "QA Actions"].map((h) => (
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
              const isBug = (issue.issuetype || issue.issue_type || "").toLowerCase() === "bug";
              const severity = severityMap[id] || (isBug ? "high" : "low");
              const status = issue.status || "Open";
              const isDone = status.toLowerCase() === "done";

              return (
                // FIX: key on React.Fragment
                <React.Fragment key={id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === id ? null : id)}
                    style={{
                      borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                      background: expandedId === id ? "#f0fdf4" : isBug ? "#fff8f7" : "#fff",
                    }}
                  >
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#374151", fontSize: "0.87rem" }}>
                      #{id}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{
                        padding: "2px 9px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
                        background: isBug ? "#fef2f2" : "#eff6ff",
                        color: isBug ? "#dc2626" : "#1d4ed8",
                      }}>
                        {isBug ? "Bug" : "Task"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.sprint || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: "0.85rem" }}>{issue.assigneeteam || "—"}</td>
                    <td style={{ padding: "12px 14px" }}><StatusBadge status={status} /></td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      {canAct ? (
                        <select
                          value={severity}
                          onChange={(e) => setSeverityMap((prev) => ({ ...prev, [id]: e.target.value }))}
                          style={{
                            padding: "3px 8px", borderRadius: 6,
                            border: "1px solid #e5e7eb", fontSize: "0.78rem",
                            cursor: "pointer", outline: "none",
                          }}
                        >
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      ) : (
                        <SeverityBadge level={severity} />
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      {isBug ? (
                        <select
                          value={defectCats[id] !== undefined ? defectCats[id] : (issue.defect_category || "")}
                          onChange={async (e) => {
                            const val = e.target.value;
                            setDefectCats(prev => ({ ...prev, [id]: val }));
                            if (!val) return;
                            try {
                              await api.put(`/issues/${id}/defect-classify`, { defect_category: val });
                              showToast('Defect classified', 'success');
                            } catch {
                              showToast('Failed to classify defect', 'error');
                            }
                          }}
                          style={{
                            padding: "3px 8px", borderRadius: 6,
                            border: "1px solid #e5e7eb", fontSize: "0.78rem",
                            cursor: "pointer", outline: "none", width: 130
                          }}
                        >
                          <option value="">Select...</option>
                          <option value="Crack">Crack</option>
                          <option value="PID Issue">PID Issue</option>
                          <option value="Hotspot">Hotspot</option>
                          <option value="Delamination">Delamination</option>
                          <option value="Discoloration">Discoloration</option>
                          <option value="Interconnect Failure">Interconnect Failure</option>
                          <option value="Junction Box Issue">Junction Box Issue</option>
                          <option value="Glass Breakage">Glass Breakage</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <input
                        placeholder="Test case / repro steps…"
                        value={testNotes[id] || ""}
                        onChange={(e) => setTestNotes((prev) => ({ ...prev, [id]: e.target.value }))}
                        style={{
                          padding: "4px 8px", fontSize: "0.78rem", borderRadius: 6,
                          border: "1px solid #e5e7eb", outline: "none", width: 160,
                        }}
                      />
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {canAct && !isDone && (
                          <>
                            <button
                              onClick={() => handleAction(issue, "Verified")}
                              disabled={loadingId === `${id}-Verified`}
                              style={{
                                padding: "4px 9px", fontSize: "0.73rem", fontWeight: 700,
                                borderRadius: 6, border: "none", cursor: "pointer",
                                background: "#dcfce7", color: "#16a34a",
                              }}
                            >
                              {loadingId === `${id}-Verified` ? "…" : "Verify Fix"}
                            </button>
                            <button
                              onClick={() => handleAction(issue, "Needs Info")}
                              disabled={loadingId === `${id}-Needs Info`}
                              style={{
                                padding: "4px 9px", fontSize: "0.73rem", fontWeight: 700,
                                borderRadius: 6, border: "none", cursor: "pointer",
                                background: "#fff7ed", color: "#c2410c",
                              }}
                            >
                              {loadingId === `${id}-Needs Info` ? "…" : "Needs Info"}
                            </button>
                            {isBug && severity === "critical" && (
                              <button
                                onClick={() => handleAction(issue, "Escalated")}
                                disabled={loadingId === `${id}-Escalated`}
                                style={{
                                  padding: "4px 9px", fontSize: "0.73rem", fontWeight: 700,
                                  borderRadius: 6, border: "none", cursor: "pointer",
                                  background: "#fef2f2", color: "#dc2626",
                                }}
                              >
                                {loadingId === `${id}-Escalated` ? "…" : "Escalate"}
                              </button>
                            )}
                          </>
                        )}
                        {isDone && (
                          <span style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>
                            Closed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === id && (
                    <tr style={{ background: "#f9fafb" }}>
                      <td colSpan={9} style={{ padding: "12px 20px", fontSize: "0.83rem", color: "#374151" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.75rem" }}>
                          <div>
                            <strong>Description:</strong><br />
                            {issue.description || "No description provided."}
                          </div>
                          <div>
                            <strong>Created:</strong>{" "}
                            {issue.createddate ? new Date(issue.createddate).toLocaleDateString() : "Unknown"}
                          </div>
                          <div>
                            <strong>Closed:</strong>{" "}
                            {issue.closeddate ? new Date(issue.closeddate).toLocaleDateString() : "Not closed"}
                          </div>
                          {testNotes[id] && (
                            <div><strong>Test Notes:</strong> {testNotes[id]}</div>
                          )}
                        </div>
                        <IssueAttachmentsSection
                          issue={issue}
                          expandedRow={expandedId}
                          showToast={showToast}
                        />
                        <InspectionChecklistSection
                          issue={issue}
                          expandedRow={expandedId}
                          showToast={showToast}
                        />
                        <RcaSection
                          issue={issue}
                          expandedRow={expandedId}
                          isBug={isBug}
                          severity={severity}
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
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity:0 } to { transform:translateX(0); opacity:1 } }`}</style>
    </div>
  );
};

export default IssueTableTester;
