import { useContext, useState } from "react";
import { AuthContext } from "../auth/AuthContext";
import { updateBudget } from "../api/projectApi";

const BudgetEditor = ({ project }) => {
  const { user, role } = useContext(AuthContext) || {};

  // Use role from context directly (it's now a top-level string in AuthContext)
  const currentRole = (role || user?.role || "").toLowerCase();

  const [used, setUsed] = useState(project?.budget_used ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Guard: only admin / superadmin see this component
  if (!["admin", "superadmin"].includes(currentRole)) return null;

  const handleUpdate = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateBudget(project.project_id, Number(used));
    } catch (err) {
      setError("Failed to update budget. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="number"
        value={used}
        onChange={(e) => setUsed(e.target.value)}
        style={{
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid #e5e7eb",
          fontSize: "0.9rem",
          width: 140,
        }}
        placeholder="Budget used"
      />
      <button
        onClick={handleUpdate}
        disabled={saving}
        style={{
          padding: "6px 14px",
          background: "#1e40af",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: saving ? "not-allowed" : "pointer",
          fontSize: "0.9rem",
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? "Saving…" : "Update Budget"}
      </button>
      {error && (
        <span style={{ fontSize: "0.8rem", color: "#dc2626" }}>{error}</span>
      )}
    </div>
  );
};

export default BudgetEditor;
