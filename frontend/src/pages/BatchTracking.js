import { useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { AuthContext } from "../auth/AuthContext";
import { getProjects } from "../api/projectApi";
import {
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
} from "../api/batchApi";

const QC_STATUSES = ["Pending", "Passed", "Failed", "Hold"];

const qcColors = {
  Pending: { bg: "#f3f4f6", color: "#4b5563" },
  Passed: { bg: "#dcfce7", color: "#16a34a" },
  Failed: { bg: "#fee2e2", color: "#b91c1c" },
  Hold: { bg: "#ffedd5", color: "#c2410c" },
};

const BatchTracking = () => {
  const { role } = useContext(AuthContext) || {};
  const currentRole = (role || "").toLowerCase();
  const isSuperadmin = currentRole === "superadmin";
  const canView = ["superadmin", "admin"].includes(currentRole);
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filters, setFilters] = useState({ material_type: "all", qc_status: "all" });
  const [formData, setFormData] = useState({
    lot_number: "",
    material_type: "",
    quantity: "",
    supplier: "",
    received_date: "",
    qc_status: QC_STATUSES[0],
    notes: "",
    project_id: "",
    cell_efficiency: "",
    power_rating_w: "",
    storage_location: "",
    rejection_count: "",
    rejection_reason: "",
    certificate_number: "",
  });

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["batchLots"],
    queryFn: () =>
      getBatches().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
    enabled: canView,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["allProjects"],
    queryFn: () =>
      getProjects().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
    enabled: isSuperadmin,
  });

  const projectOptions = useMemo(() => {
    return projects.map((p) => ({
      id: p.projectid || p.project_id || p.ProjectID || p.id,
      name: p.projectname || p.name || p.project_name || p.projectid || p.project_id,
    }));
  }, [projects]);

  const materialTypes = useMemo(() => {
    const unique = new Set(batches.map((b) => b.material_type).filter(Boolean));
    return ["all", ...Array.from(unique)];
  }, [batches]);

  const filteredBatches = batches.filter((b) => {
    const materialMatch =
      filters.material_type === "all" || b.material_type === filters.material_type;
    const qcMatch = filters.qc_status === "all" || b.qc_status === filters.qc_status;
    return materialMatch && qcMatch;
  });

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      lot_number: "",
      material_type: "",
      quantity: "",
      supplier: "",
      received_date: "",
      qc_status: QC_STATUSES[0],
      notes: "",
      project_id: "",
      cell_efficiency: "",
      power_rating_w: "",
      storage_location: "",
      rejection_count: "",
      rejection_reason: "",
      certificate_number: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (batch) => {
    setEditingId(batch.id);
    setFormData({
      lot_number: batch.lot_number || "",
      material_type: batch.material_type || "",
      quantity: batch.quantity || "",
      supplier: batch.supplier || "",
      received_date: batch.received_date ? String(batch.received_date).slice(0, 10) : "",
      qc_status: batch.qc_status || QC_STATUSES[0],
      notes: batch.notes || "",
      project_id: batch.project_id || "",
      cell_efficiency: batch.cell_efficiency || "",
      power_rating_w: batch.power_rating_w || "",
      storage_location: batch.storage_location || "",
      rejection_count: batch.rejection_count !== null && batch.rejection_count !== undefined ? batch.rejection_count : "",
      rejection_reason: batch.rejection_reason || "",
      certificate_number: batch.certificate_number || "",
    });
    setIsFormOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data) => createBatch(data),
    onSuccess: () => {
      toast.success("Batch created.");
      queryClient.invalidateQueries({ queryKey: ["batchLots"] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create batch."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateBatch(id, data),
    onSuccess: () => {
      toast.success("Batch updated.");
      queryClient.invalidateQueries({ queryKey: ["batchLots"] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: () => toast.error("Failed to update batch."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteBatch(id),
    onSuccess: () => {
      toast.success("Batch deleted.");
      queryClient.invalidateQueries({ queryKey: ["batchLots"] });
    },
    onError: () => toast.error("Failed to delete batch."),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.lot_number) {
      toast.error("Lot Number is required.");
      return;
    }
    const payload = {
      ...formData,
      quantity: formData.quantity === "" ? null : Number(formData.quantity),
      cell_efficiency: formData.cell_efficiency === "" ? null : Number(formData.cell_efficiency),
      power_rating_w: formData.power_rating_w === "" ? null : Number(formData.power_rating_w),
      rejection_count: formData.rejection_count === "" ? null : Number(formData.rejection_count),
      project_id: formData.project_id || null,
      received_date: formData.received_date || null,
      notes: formData.notes || null,
      storage_location: formData.storage_location || null,
      rejection_reason: formData.rejection_reason || null,
      certificate_number: formData.certificate_number || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id, label) => {
    if (!window.confirm(`Delete batch "${label}"?`)) return;
    deleteMutation.mutate(id);
  };

  if (!canView) {
    return (
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: "2rem",
            border: "1px solid #e5e7eb",
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          Access denied. Admins and Superadmins only.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
            Batch Tracking
          </h1>
          <p style={{ color: "#6b7280", marginTop: 6 }}>
            Track incoming materials and QC status.
          </p>
        </div>
        {isSuperadmin && (
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
            + Create Batch
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: "1rem", flexWrap: "wrap" }}>
        <select
          value={filters.material_type}
          onChange={(e) => setFilters({ ...filters, material_type: e.target.value })}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
        >
          {materialTypes.map((mt) => (
            <option key={mt} value={mt}>
              {mt === "all" ? "All Material Types" : mt}
            </option>
          ))}
        </select>
        <select
          value={filters.qc_status}
          onChange={(e) => setFilters({ ...filters, qc_status: e.target.value })}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
        >
          <option value="all">All QC Status</option>
          {QC_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {isSuperadmin && isFormOpen && (
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            <input
              placeholder="Lot Number"
              value={formData.lot_number}
              onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <input
              placeholder="Material Type"
              value={formData.material_type}
              onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <input
              type="number"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <input
              placeholder="Supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <input
              type="date"
              value={formData.received_date}
              onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <select
              value={formData.qc_status}
              onChange={(e) => setFormData({ ...formData, qc_status: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
            >
              {QC_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
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
          </div>
          <textarea
            placeholder="Notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            style={{ marginTop: 12, width: "100%", minHeight: 90, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 12 }}>
            <input
              type="number"
              placeholder="Cell Efficiency (%) e.g. 21.5"
              step="0.01"
              min="0"
              max="100"
              value={formData.cell_efficiency}
              onChange={(e) => setFormData({ ...formData, cell_efficiency: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <input
              type="number"
              placeholder="Power Rating (W) e.g. 550"
              value={formData.power_rating_w}
              onChange={(e) => setFormData({ ...formData, power_rating_w: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <input
              placeholder="Storage Location e.g. Rack A-12"
              value={formData.storage_location}
              onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <input
              placeholder="Certificate Number e.g. IEC61215-2024"
              value={formData.certificate_number}
              onChange={(e) => setFormData({ ...formData, certificate_number: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <input
              type="number"
              min="0"
              placeholder="Rejection Count e.g. 0"
              value={formData.rejection_count}
              onChange={(e) => setFormData({ ...formData, rejection_count: e.target.value })}
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
          </div>
          <textarea
            placeholder="Describe rejection reason if any"
            value={formData.rejection_reason}
            onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
            style={{ marginTop: 12, width: "100%", minHeight: 60, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
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
              {editingId ? "Update Batch" : "Create Batch"}
            </button>
          </div>
        </form>
      )}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: "1.5rem", color: "#6b7280" }}>Loading batches…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Lot Number", "Material Type", "Quantity", "Supplier", "Received Date", "QC Status", "Efficiency", "Power (W)", "Location", "Notes", "Actions"].map((h) => (
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
              {filteredBatches.map((batch) => {
                const qcStyle = qcColors[batch.qc_status] || qcColors.Pending;
                return (
                  <tr key={batch.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>
                      {batch.lot_number}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                      {batch.material_type || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                      {batch.quantity ?? "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                      {batch.supplier || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>
                      {batch.received_date ? new Date(batch.received_date).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: qcStyle.bg,
                          color: qcStyle.color,
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        {batch.qc_status || "Pending"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                      {batch.cell_efficiency ? batch.cell_efficiency + '%' : '—'}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                      {batch.power_rating_w ? batch.power_rating_w + 'W' : '—'}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>
                      {batch.storage_location || '—'}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>
                      {batch.notes || "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {isSuperadmin ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => openEdit(batch)}
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
                          <button
                            onClick={() => handleDelete(batch.id, batch.lot_number)}
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
                        </div>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={11} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af" }}>
                    No batches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BatchTracking;
