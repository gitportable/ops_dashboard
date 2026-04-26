import React, { useState } from "react";
import { useCreateWorkOrder } from "../api/productionApi";
import { toast } from "react-hot-toast";

const AddWorkOrderModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    batch_lot: "",
    stage: "Raw Material",
    quantity: "",
    status: "Planned",
    target_date: "",
    machine: ""
  });

  const createWO = useCreateWorkOrder();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createWO.mutateAsync(formData);
      toast.success("Work Order created successfully");
      onClose();
    } catch (err) {
      toast.error("Failed to create work order");
    }
  };

  const stages = ["Raw Material", "Cell", "Module", "Testing", "Dispatch", "Stringing", "Lamination", "Framing"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: 12, width: "450px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginBottom: "1.5rem", color: "#1e40af" }}>Create New Work Order</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Batch / Lot ID</label>
            <input
              required
              style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0" }}
              value={formData.batch_lot}
              onChange={(e) => setFormData({ ...formData, batch_lot: e.target.value })}
              placeholder="e.g. B2024-001"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Stage</label>
              <select
                style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0" }}
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
              >
                {stages.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Quantity</label>
              <input
                required
                type="number"
                style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0" }}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Target Date</label>
            <input
              required
              type="date"
              style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0" }}
              value={formData.target_date}
              onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Machine / Line</label>
            <input
              style={{ width: "100%", padding: "8px", borderRadius: 6, border: "1px solid #e2e8f0" }}
              value={formData.machine}
              onChange={(e) => setFormData({ ...formData, machine: e.target.value })}
              placeholder="e.g. LINE-01"
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "none" }}>Cancel</button>
            <button
              type="submit"
              disabled={createWO.isPending}
              style={{ padding: "8px 24px", borderRadius: 6, border: "none", background: "#1e40af", color: "#fff", fontWeight: 600 }}
            >
              {createWO.isPending ? "Creating..." : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddWorkOrderModal;
