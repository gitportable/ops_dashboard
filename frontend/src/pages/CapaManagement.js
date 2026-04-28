import React, { useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "../auth/AuthContext";
import { getAllCapa, updateCapa } from "../api/rcaApi";
import toast from "react-hot-toast";

const CapaManagement = () => {
  const { role } = useContext(AuthContext) || {};
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = React.useState("All");

  const { data: capaItems = [] } = useQuery({
    queryKey: ["allCapa"],
    queryFn: getAllCapa,
    refetchInterval: 60000,
  });

  const today = new Date().toISOString().split("T")[0];
  const filtered = capaItems.filter((item) =>
    statusFilter === "All" ? true : (item.status || "Open") === statusFilter
  );

  const total = capaItems.length;
  const open = capaItems.filter((item) => (item.status || "Open") === "Open").length;
  const completed = capaItems.filter((item) =>
    ["Completed", "Verified"].includes(item.status || "")
  ).length;
  const overdue = capaItems.filter((item) => {
    const status = item.status || "Open";
    const isDone = status === "Completed" || status === "Verified";
    return !!item.due_date && item.due_date < today && !isDone;
  }).length;

  const handleStatusChange = async (id, status) => {
    try {
      await updateCapa(id, { status });
      await queryClient.invalidateQueries({ queryKey: ["allCapa"] });
      toast.success("CAPA status updated");
    } catch {
      toast.error("Failed to update CAPA status");
    }
  };

  const badgeStyle = (status) => {
    if (status === "In Progress") return { bg: "#dbeafe", color: "#1d4ed8" };
    if (status === "Completed") return { bg: "#dcfce7", color: "#15803d" };
    if (status === "Verified") return { bg: "#f3e8ff", color: "#7c3aed" };
    return { bg: "#f3f4f6", color: "#374151" };
  };

  return (
    <div style={{ padding: "1.5rem 2rem", background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ margin: 0, color: "#0f172a", fontSize: "1.5rem" }}>CAPA Management</h1>
      <p style={{ marginTop: 4, marginBottom: 16, color: "#64748b", fontSize: "0.9rem" }}>
        Corrective and Preventive Actions across all projects
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", minWidth: 140 }}>
          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>Total</div>
          <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a" }}>{total}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", minWidth: 140 }}>
          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>Open</div>
          <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a" }}>{open}</div>
        </div>
        <div style={{ background: overdue > 0 ? "#fee2e2" : "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", minWidth: 140 }}>
          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>Overdue</div>
          <div style={{ fontWeight: 800, fontSize: "1.25rem", color: overdue > 0 ? "#b91c1c" : "#0f172a" }}>{overdue}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 14px", minWidth: 140 }}>
          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>Completed</div>
          <div style={{ fontWeight: 800, fontSize: "1.25rem", color: "#0f172a" }}>{completed}</div>
        </div>
      </div>

      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ color: "#64748b", fontSize: "0.8rem" }}>Role: {(role || "").toUpperCase()}</div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "6px 10px", background: "#fff" }}
        >
          <option value="All">All</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Verified">Verified</option>
        </select>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid #e5e7eb", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "#0f172a", color: "#fff" }}>
              {["ID", "Issue ID", "Action Type", "Description", "Assigned To", "Due Date", "Status", "Actions"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontSize: "0.74rem", letterSpacing: "0.03em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const due = item.due_date ? String(item.due_date).split("T")[0] : "—";
              const isOverdue = !!item.due_date && String(item.due_date).split("T")[0] < today && !["Completed", "Verified"].includes(item.status || "");
              const status = item.status || "Open";
              const statusColors = badgeStyle(status);
              const actionType = (item.action_type || "").toLowerCase();
              const actionBadge = actionType === "corrective"
                ? { bg: "#ffedd5", color: "#c2410c", label: "Corrective" }
                : { bg: "#dbeafe", color: "#1d4ed8", label: "Preventive" };
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #eef2f7", background: isOverdue ? "#fff5f5" : "#fff" }}>
                  <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155" }}>{item.id}</td>
                  <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155" }}>{item.issue_id || "—"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: "0.73rem", fontWeight: 700, background: actionBadge.bg, color: actionBadge.color }}>
                      {actionBadge.label}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155" }}>{item.description || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: "#334155" }}>{item.assigned_to_name || item.assigned_to || "—"}</td>
                  <td style={{ padding: "10px 12px", fontSize: "0.82rem", color: isOverdue ? "#b91c1c" : "#334155" }}>{due}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, background: statusColors.bg, color: statusColors.color }}>
                      {status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "4px 8px", fontSize: "0.78rem" }}
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Verified">Verified</option>
                    </select>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: "18px", textAlign: "center", color: "#64748b", fontSize: "0.84rem" }}>
                  No CAPA items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CapaManagement;
