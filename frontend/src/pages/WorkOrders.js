import { useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { AuthContext } from "../auth/AuthContext";
import { getProjects } from "../api/projectApi";
import { getUsers } from "../api/userApi";
import api from "../api/axios";
import Layout from "../components/Layout";
import {
  getWorkOrders,
  createWorkOrder,
  updateWorkOrder,
  deleteWorkOrder,
} from "../api/workOrderApi";

const STAGES = ["Raw Material", "Cell", "Module", "Testing", "Dispatch"];
const STATUSES = ["Open", "In Progress", "Completed", "On Hold", "Cancelled"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const SHIFTS = ["Morning", "Afternoon", "Night"];

const stageColors = {
  "Raw Material": { bg: "#f3f4f6", color: "#4b5563" },
  Cell: { bg: "#dbeafe", color: "#1d4ed8" },
  Module: { bg: "#ede9fe", color: "#6d28d9" },
  Testing: { bg: "#ffedd5", color: "#c2410c" },
  Dispatch: { bg: "#dcfce7", color: "#16a34a" },
};

const statusColors = {
  Open: { bg: "#dbeafe", color: "#1d4ed8" },
  "In Progress": { bg: "#fef3c7", color: "#b45309" },
  Completed: { bg: "#dcfce7", color: "#16a34a" },
  "On Hold": { bg: "#ffedd5", color: "#c2410c" },
  Cancelled: { bg: "#fee2e2", color: "#b91c1c" },
};

const priorityColors = {
  Critical: { bg: "#fee2e2", color: "#b91c1c" },
  High: { bg: "#ffedd5", color: "#c2410c" },
  Medium: { bg: "#fef3c7", color: "#b45309" },
  Low: { bg: "#dcfce7", color: "#16a34a" },
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString() : "—";

const WorkOrders = () => {
  const { role } = useContext(AuthContext) || {};
  const currentRole = (role || "").toLowerCase();
  const canEdit = ["superadmin", "admin"].includes(currentRole);
  const canDelete = currentRole === "superadmin";
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedWO, setSelectedWO] = useState(null);
  const [formData, setFormData] = useState({
    wo_number: "",
    batch_lot: "",
    project_id: "",
    stage: STAGES[0],
    status: STATUSES[0],
    priority: PRIORITIES[0],
    shift: SHIFTS[0],
    planned_start_date: "",
    planned_end_date: "",
    actual_start_date: "",
    actual_end_date: "",
    machine_id: "",
    supervisor: "",
    team_size: "",
    target_units: "",
    completed_units: "",
    rejection_count: "",
    description: "",
    remarks: "",
    assigned_to: "",
  });

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ["workOrders"],
    queryFn: () =>
      getWorkOrders().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["allProjects"],
    queryFn: () =>
      getProjects().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers().then((r) => (Array.isArray(r) ? r : [])),
    staleTime: 5 * 60 * 1000,
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () =>
      api.get("/machines").then((r) =>
        Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const projectOptions = useMemo(() => {
    return projects.map((p) => ({
      id: p.projectid,
      name: p.projectname || p.name || p.project_name || `Project ${p.id}`,
    }));
  }, [projects]);

  const assignedOptions = useMemo(() => {
    return users.map((u) => ({
      id: u.id,
      name: u.name || u.email || `User ${u.id}`,
    }));
  }, [users]);

  const machineOptions = useMemo(() => {
    return machines.map((m) => ({
      id: m.id,
      name: m.machine_name || m.name || `Machine ${m.id}`,
    }));
  }, [machines]);

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      wo_number: "",
      batch_lot: "",
      project_id: "",
      stage: STAGES[0],
      status: STATUSES[0],
      priority: PRIORITIES[0],
      shift: SHIFTS[0],
      planned_start_date: "",
      planned_end_date: "",
      actual_start_date: "",
      actual_end_date: "",
      machine_id: "",
      supervisor: "",
      team_size: "",
      target_units: "",
      completed_units: "",
      rejection_count: "",
      description: "",
      remarks: "",
      assigned_to: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (wo) => {
    setEditingId(wo.id);
    setFormData({
      wo_number: wo.wo_number || "",
      batch_lot: wo.batch_lot || "",
      project_id: wo.project_id || "",
      stage: wo.stage || STAGES[0],
      status: wo.status || STATUSES[0],
      priority: wo.priority || PRIORITIES[0],
      shift: wo.shift || SHIFTS[0],
      planned_start_date: wo.planned_start_date ? String(wo.planned_start_date).slice(0, 10) : "",
      planned_end_date: wo.planned_end_date ? String(wo.planned_end_date).slice(0, 10) : "",
      actual_start_date: wo.actual_start_date ? String(wo.actual_start_date).slice(0, 10) : "",
      actual_end_date: wo.actual_end_date ? String(wo.actual_end_date).slice(0, 10) : "",
      machine_id: wo.machine_id || "",
      supervisor: wo.supervisor || "",
      team_size: wo.team_size ?? "",
      target_units: wo.target_units ?? "",
      completed_units: wo.completed_units ?? "",
      rejection_count: wo.rejection_count ?? "",
      description: wo.description || "",
      remarks: wo.remarks || "",
      assigned_to: wo.assigned_to || "",
    });
    setIsFormOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data) => createWorkOrder(data),
    onSuccess: () => {
      toast.success("Work order created.");
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create work order."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateWorkOrder(id, data),
    onSuccess: () => {
      toast.success("Work order updated.");
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to update work order."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteWorkOrder(id),
    onSuccess: () => {
      toast.success("Work order deleted.");
      queryClient.invalidateQueries({ queryKey: ["workOrders"] });
    },
    onError: () => toast.error("Failed to delete work order."),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.wo_number || !formData.project_id) {
      toast.error("WO Number and Project are required.");
      return;
    }
    const targetUnitsValue = formData.target_units === "" ? null : Number(formData.target_units);
    const completedUnitsValue =
      formData.status === "Completed" && (Number(formData.target_units) || 0) > 0
        ? Number(formData.target_units)
        : formData.completed_units === ""
          ? null
          : Number(formData.completed_units);
    const payload = {
      ...formData,
      project_id: formData.project_id || null,
      assigned_to: formData.assigned_to ? parseInt(formData.assigned_to, 10) : null,
      batch_lot: formData.batch_lot || null,
      description: formData.description || null,
      remarks: formData.remarks || null,
      priority: formData.priority || null,
      shift: formData.shift || null,
      planned_start_date: formData.planned_start_date || null,
      planned_end_date: formData.planned_end_date || null,
      actual_start_date: formData.actual_start_date || null,
      actual_end_date: formData.actual_end_date || null,
      machine_id: formData.machine_id ? parseInt(formData.machine_id, 10) : null,
      supervisor: formData.supervisor || null,
      team_size: formData.team_size === "" ? null : Number(formData.team_size),
      target_units: targetUnitsValue,
      completed_units: completedUnitsValue,
      rejection_count: formData.rejection_count === "" ? null : Number(formData.rejection_count),
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id, label) => {
    if (!canDelete) return;
    if (!window.confirm(`Delete work order "${label}"?`)) return;
    deleteMutation.mutate(id);
  };

  const selectedStageStyle = stageColors[selectedWO?.stage] || { bg: "#f3f4f6", color: "#4b5563" };
  const selectedStatusStyle = statusColors[selectedWO?.status] || { bg: "#f3f4f6", color: "#4b5563" };
  const selectedPriorityStyle = priorityColors[selectedWO?.priority] || { bg: "#f3f4f6", color: "#4b5563" };
  const selectedTargetUnits = Number(selectedWO?.target_units) || 0;
  const selectedCompletedUnits = Number(selectedWO?.completed_units) || 0;
  const selectedProgressPct = selectedTargetUnits
    ? Math.min(100, Math.round((selectedCompletedUnits / selectedTargetUnits) * 100))
    : 0;

  const DetailRow = ({ label, value }) => (
    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 10, alignItems: "start" }}>
      <div style={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 700 }}>{label}</div>
      <div style={{ color: "#0f172a", fontSize: "0.9rem" }}>{value || "—"}</div>
    </div>
  );

  return (
    <Layout>
      <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
              Work Orders
            </h1>
            <p style={{ color: "#6b7280", marginTop: 6 }}>
              Track production flow across manufacturing stages.
            </p>
          </div>
          {canEdit && (
            <button
              onClick={openCreate}
              style={{
                padding: "10px 16px",
                background: "#1e3a8a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              + Create Work Order
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[
            { label: "Total WOs", value: workOrders.length, bg: "#eff6ff", color: "#1d4ed8" },
            { label: "In Progress", value: workOrders.filter((w) => (w.status || "").toLowerCase() === "in progress").length, bg: "#fef3c7", color: "#b45309" },
            { label: "Completed", value: workOrders.filter((w) => (w.status || "").toLowerCase() === "completed").length, bg: "#dcfce7", color: "#16a34a" },
            { label: "Critical", value: workOrders.filter((w) => (w.priority || "").toLowerCase() === "critical").length, bg: "#fee2e2", color: "#b91c1c" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "8px 16px", borderRadius: 99, background: s.bg,
              color: s.color, fontWeight: 700, fontSize: "0.82rem",
            }}>
              {s.label}: {s.value}
            </div>
          ))}
        </div>

        {isFormOpen && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: "1.5rem",
              marginBottom: "1.5rem",
              boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 10 }}>Work Order Info</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <input
                placeholder="WO Number"
                value={formData.wo_number}
                onChange={(e) => setFormData({ ...formData, wo_number: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <input
                placeholder="Batch/Lot"
                value={formData.batch_lot}
                onChange={(e) => setFormData({ ...formData, batch_lot: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
              >
                <option value="">Select project</option>
                {projectOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <div style={{ color: "#64748b", fontSize: "0.74rem", marginTop: -4 }}>
                Setting to Completed will auto-fill completion units
              </div>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
              >
                {SHIFTS.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontWeight: 700, color: "#1e3a8a", margin: "16px 0 10px" }}>Schedule</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.82rem" }}>
                  Planned Start Date
                </label>
                <input
                  type="date"
                  value={formData.planned_start_date}
                  onChange={(e) => setFormData({ ...formData, planned_start_date: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.82rem" }}>
                  Planned End Date
                </label>
                <input
                  type="date"
                  value={formData.planned_end_date}
                  onChange={(e) => setFormData({ ...formData, planned_end_date: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.82rem" }}>
                  Actual Start Date
                </label>
                <input
                  type="date"
                  value={formData.actual_start_date}
                  onChange={(e) => setFormData({ ...formData, actual_start_date: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.82rem" }}>
                  Actual End Date
                </label>
                <input
                  type="date"
                  value={formData.actual_end_date}
                  onChange={(e) => setFormData({ ...formData, actual_end_date: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </div>
            </div>

            <div style={{ fontWeight: 700, color: "#1e3a8a", margin: "16px 0 10px" }}>Production</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <select
                value={formData.machine_id}
                onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
              >
                <option value="">Select machine</option>
                {machineOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Supervisor"
                value={formData.supervisor}
                onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <input
                type="number"
                placeholder="Team Size"
                value={formData.team_size}
                onChange={(e) => setFormData({ ...formData, team_size: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <input
                type="number"
                placeholder="Target Units"
                value={formData.target_units}
                onChange={(e) => setFormData({ ...formData, target_units: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <input
                type="number"
                placeholder="Completed Units"
                value={formData.completed_units}
                onChange={(e) => setFormData({ ...formData, completed_units: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <input
                type="number"
                placeholder="Rejection Count"
                value={formData.rejection_count}
                onChange={(e) => setFormData({ ...formData, rejection_count: e.target.value })}
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
            </div>

            <div style={{ fontWeight: 700, color: "#1e3a8a", margin: "16px 0 10px" }}>Notes</div>
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: "100%", minHeight: 90, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <textarea
              placeholder="Remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              style={{ marginTop: 12, width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", width: "100%" }}
            >
              <option value="">Assign to</option>
              {assignedOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setIsFormOpen(false);
                  resetForm();
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #1e3a8a",
                  background: "#1e3a8a",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {editingId ? "Update Work Order" : "Create Work Order"}
              </button>
            </div>
          </form>
        )}

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          {isLoading ? (
            <div style={{ padding: "1.5rem", color: "#6b7280" }}>Loading work orders…</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["WO Number", "Batch/Lot", "Project", "Stage", "Status", "Priority", "Completion", "Assigned To", "Created Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {workOrders.map((wo) => {
                  const stageStyle = stageColors[wo.stage] || { bg: "#f3f4f6", color: "#4b5563" };
                  const statusStyle = statusColors[wo.status] || { bg: "#f3f4f6", color: "#4b5563" };
                  const priorityStyle = priorityColors[wo.priority] || { bg: "#f3f4f6", color: "#4b5563" };
                  const stageIndex = STAGES.indexOf(wo.stage);
                  const targetUnits = Number(wo.target_units) || 0;
                  const completedUnits = Number(wo.completed_units) || 0;
                  const completionPct = targetUnits ? Math.min(100, Math.round((completedUnits / targetUnits) * 100)) : 0;
                  return (
                    <tr key={wo.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td
                        onClick={() => setSelectedWO(wo)}
                        style={{ padding: "10px 14px", cursor: "pointer", color: "#1e3a8a", fontWeight: 700, textDecoration: "underline" }}
                      >
                        {wo.wo_number}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>{wo.batch_lot || "—"}</td>
                      <td style={{ padding: "10px 14px", color: "#374151" }}>{wo.project_id || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: stageStyle.bg,
                            color: stageStyle.color,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          {wo.stage || "—"}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {STAGES.map((stage, idx) => (
                            <div
                              key={`${wo.id}-${stage}`}
                              style={{
                                flex: 1,
                                height: 6,
                                borderRadius: 999,
                                background: idx <= stageIndex && stageIndex >= 0 ? "#1d4ed8" : "#e5e7eb",
                              }}
                              title={stage}
                            />
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {wo.status || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: priorityStyle.bg,
                            color: priorityStyle.color,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {wo.priority || "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", minWidth: 140 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ width: `${completionPct}%`, height: "100%", background: "#22c55e" }} />
                          </div>
                          <span style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 700 }}>
                            {completionPct}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#374151" }}>
                        {wo.assigned_to_name || wo.assigned_to || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>
                        {formatDate(wo.created_at)}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {canEdit && (
                            <button
                              onClick={() => openEdit(wo)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "1px solid #dbeafe",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(wo.id, wo.wo_number)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "1px solid #fecaca",
                                background: "#fef2f2",
                                color: "#b91c1c",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {workOrders.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af" }}>
                      No work orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedWO && (
        <div
          onClick={() => setSelectedWO(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            zIndex: 1499,
          }}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              right: 0,
              top: 0,
              width: 420,
              height: "100vh",
              background: "#fff",
              boxShadow: "-8px 0 30px rgba(0,0,0,0.16)",
              zIndex: 1500,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: "16px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
                  {selectedWO.wo_number || "—"}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: selectedStatusStyle.bg, color: selectedStatusStyle.color, fontSize: "0.75rem", fontWeight: 700 }}>
                    {selectedWO.status || "—"}
                  </span>
                  <span style={{ padding: "4px 10px", borderRadius: 999, background: selectedStageStyle.bg, color: selectedStageStyle.color, fontSize: "0.75rem", fontWeight: 700 }}>
                    {selectedWO.stage || "—"}
                  </span>
                  {selectedWO.priority && (
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: selectedPriorityStyle.bg, color: selectedPriorityStyle.color, fontSize: "0.75rem", fontWeight: 700 }}>
                      {selectedWO.priority}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWO(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#64748b",
                  fontSize: "1.4rem",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "16px 18px", overflowY: "auto", display: "grid", gap: 12 }}>
              <DetailRow label="Shift" value={selectedWO.shift} />
              <DetailRow label="Project ID" value={selectedWO.project_id} />
              <DetailRow label="Batch/Lot" value={selectedWO.batch_lot} />
              <DetailRow label="Assigned To" value={selectedWO.assigned_to_name || selectedWO.assigned_to} />
              <DetailRow label="Description" value={selectedWO.description} />
              <DetailRow label="Remarks" value={selectedWO.remarks} />
              <DetailRow
                label="Planned Dates"
                value={`${formatDate(selectedWO.planned_start_date)} → ${formatDate(selectedWO.planned_end_date)}`}
              />
              <DetailRow
                label="Actual Dates"
                value={`${formatDate(selectedWO.actual_start_date)} → ${formatDate(selectedWO.actual_end_date)}`}
              />
              <DetailRow label="Machine Name" value={selectedWO.machine_name || selectedWO.machine_id} />
              <DetailRow label="Supervisor" value={selectedWO.supervisor} />
              <DetailRow label="Team Size" value={selectedWO.team_size} />
              <DetailRow
                label="Units"
                value={`${selectedWO.target_units ?? "—"} / ${selectedWO.completed_units ?? "—"} / ${selectedWO.rejection_count ?? "—"} (Target / Completed / Rejection)`}
              />
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ color: "#64748b", fontSize: "0.78rem", fontWeight: 700 }}>Progress</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 8, background: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${selectedProgressPct}%`, height: "100%", background: "#22c55e" }} />
                  </div>
                  <span style={{ fontSize: "0.78rem", color: "#475569", fontWeight: 700 }}>{selectedProgressPct}%</span>
                </div>
              </div>
              <DetailRow label="Created Date" value={formatDate(selectedWO.created_at)} />
            </div>
          </aside>
        </div>
      )}
    </Layout>
  );
};

export default WorkOrders;
