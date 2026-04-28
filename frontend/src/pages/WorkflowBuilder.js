import { useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { AuthContext } from "../auth/AuthContext";
import {
  getWorkflows,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from "../api/workflowApi";

const emptyStep = () => ({
  label: "",
  status: "",
  allowedFrom: [],
  responsible_role: "Any",
  step_type: "Manual",
  sla_hours: "",
  is_blocking: false,
  step_color: "#3b82f6",
  required_checklist: "",
});

const getTypeColor = (type) => {
  switch (type) {
    case "Production": return { bg: "#dbeafe", color: "#1d4ed8" };
    case "Quality Control": return { bg: "#dcfce7", color: "#16a34a" };
    case "Maintenance": return { bg: "#ffedd5", color: "#c2410c" };
    case "Field Service": return { bg: "#f3e8ff", color: "#7e22ce" };
    default: return { bg: "#f1f5f9", color: "#475569" };
  }
};

const WorkflowBuilder = () => {
  const { role } = useContext(AuthContext) || {};
  const currentRole = (role || "").toLowerCase();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workflowType, setWorkflowType] = useState("Production");
  const [applicableTo, setApplicableTo] = useState("All");
  const [slaHours, setSlaHours] = useState("");
  const [steps, setSteps] = useState([emptyStep()]);

  const { data: workflows = [], isLoading, isError } = useQuery({
    queryKey: ["workflows"],
    queryFn: () =>
      getWorkflows().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const resetForm = () => {
    setSelectedId(null);
    setName("");
    setDescription("");
    setWorkflowType("Production");
    setApplicableTo("All");
    setSlaHours("");
    setSteps([emptyStep()]);
  };

  const selectTemplate = (template) => {
    setSelectedId(template.id);
    setName(template.name || "");
    setDescription(template.description || "");
    setWorkflowType(template.workflow_type || "Production");
    setApplicableTo(template.applicable_to || "All");
    setSlaHours(template.sla_hours || "");
    setSteps(
      Array.isArray(template.steps) && template.steps.length > 0
        ? template.steps.map((s) => ({
            ...s,
            label: s?.label || "",
            status: s?.status || "",
            allowedFrom: Array.isArray(s?.allowedFrom) ? s.allowedFrom : [],
            responsible_role: s?.responsible_role || "Any",
            step_type: s?.step_type || "Manual",
            sla_hours: s?.sla_hours || "",
            is_blocking: s?.is_blocking || false,
            step_color: s?.step_color || "#3b82f6",
            required_checklist: s?.required_checklist || "",
          }))
        : [emptyStep()]
    );
  };

  const statusOptions = useMemo(() => {
    return steps
      .map((s) => (s.status || "").trim())
      .filter((s) => s);
  }, [steps]);

  const updateStep = (index, patch) => {
    setSteps((prev) =>
      prev.map((step, i) =>
        i === index ? { ...step, ...patch } : step
      )
    );
  };

  const addStep = () => setSteps((prev) => [...prev, emptyStep()]);
  const removeStep = (index) =>
    setSteps((prev) => prev.filter((_, i) => i !== index));

  const validateSteps = () => {
    if (steps.length === 0) return "Add at least one step.";
    for (const step of steps) {
      if (!step.label?.trim() || !step.status?.trim()) {
        return "Each step needs a label and status.";
      }
    }
    return null;
  };

  const normalizeSteps = () => {
    const statuses = steps
      .map((s) => (s.status || "").trim())
      .filter(Boolean);
    return steps.map((s) => ({
      label: (s.label || "").trim(),
      status: (s.status || "").trim(),
      allowedFrom: Array.isArray(s.allowedFrom)
        ? s.allowedFrom.filter((v) => statuses.includes(v))
        : [],
      responsible_role: s.responsible_role || "Any",
      step_type: s.step_type || "Manual",
      sla_hours: s.sla_hours ? Number(s.sla_hours) : null,
      is_blocking: !!s.is_blocking,
      step_color: s.step_color || "#3b82f6",
      required_checklist: (s.required_checklist || "").trim(),
    }));
  };

  const handleSave = async () => {
    if (currentRole !== "superadmin") return;
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    const stepError = validateSteps();
    if (stepError) {
      toast.error(stepError);
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      workflow_type: workflowType,
      applicable_to: applicableTo,
      sla_hours: slaHours ? Number(slaHours) : null,
      steps: normalizeSteps(),
    };
    try {
      if (selectedId) {
        await updateWorkflow(selectedId, payload);
        toast.success("Workflow updated.");
      } else {
        const res = await createWorkflow(payload);
        const created = res?.data || res;
        if (created?.id) setSelectedId(created.id);
        toast.success("Workflow created.");
      }
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    } catch {
      toast.error("Failed to save workflow.");
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!window.confirm("Delete this workflow template?")) return;
    try {
      await deleteWorkflow(selectedId);
      toast.success("Workflow deleted.");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    } catch {
      toast.error("Failed to delete workflow.");
    }
  };

  const handleDuplicate = async (e, template) => {
    e.stopPropagation();
    try {
      const payload = { ...template, name: `Copy of ${template.name}` };
      delete payload.id;
      await createWorkflow(payload);
      toast.success("Workflow duplicated.");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    } catch {
      toast.error("Failed to duplicate workflow.");
    }
  };

  const handleToggleActive = async (e, template) => {
    e.stopPropagation();
    try {
      await updateWorkflow(template.id, { ...template, is_active: !template.is_active });
      toast.success(`Workflow ${template.is_active ? 'deactivated' : 'activated'}.`);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    } catch {
      toast.error("Failed to toggle workflow status.");
    }
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData("stepIndex", index);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData("stepIndex"), 10);
    if (sourceIndex === targetIndex) return;
    setSteps((prev) => {
      const newSteps = [...prev];
      const [moved] = newSteps.splice(sourceIndex, 1);
      newSteps.splice(targetIndex, 0, moved);
      return newSteps;
    });
  };

  if (currentRole !== "superadmin") {
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
          Access denied. Superadmin only.
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
          Workflow Builder
        </h1>
        <p style={{ color: "#6b7280", marginTop: 6 }}>
          Design and manage workflow templates used across OpsDash.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "1.5rem" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "1rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, color: "#1e3a8a" }}>Templates</h3>
            <button
              onClick={resetForm}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #dbeafe",
                background: "#eff6ff",
                color: "#1d4ed8",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              + New
            </button>
          </div>
          {isLoading && <div style={{ color: "#6b7280" }}>Loading workflows…</div>}
          {isError && <div style={{ color: "#dc2626" }}>Failed to load workflows.</div>}
          {!isLoading && !isError && workflows.length === 0 && (
            <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
              No templates yet.
            </div>
          )}
          {!isLoading &&
            workflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => selectTemplate(wf)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: selectedId === wf.id ? "1px solid #1d4ed8" : "1px solid #e5e7eb",
                  background: selectedId === wf.id ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  opacity: wf.is_active === false ? 0.5 : 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "#1e293b" }}>{wf.name}</div>
                  <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                    {wf.description || "No description"}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    {(() => {
                      const tc = getTypeColor(wf.workflow_type);
                      return (
                        <span style={{ background: tc.bg, color: tc.color, fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", fontWeight: "600" }}>
                          {wf.workflow_type || "General"}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  <label
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "flex", alignItems: "center", cursor: "pointer", fontSize: "0.7rem", color: "#6b7280" }}
                  >
                    <input
                      type="checkbox"
                      checked={wf.is_active !== false}
                      onChange={(e) => handleToggleActive(e, wf)}
                      style={{ marginRight: 4 }}
                    />
                    Active
                  </label>
                  <button
                    onClick={(e) => handleDuplicate(e, wf)}
                    style={{
                      padding: "2px 6px",
                      fontSize: "0.7rem",
                      borderRadius: 4,
                      border: "1px solid #e5e7eb",
                      background: "#f8fafc",
                      cursor: "pointer",
                    }}
                  >
                    Duplicate
                  </button>
                </div>
              </div>
            ))}
        </div>

        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "1.5rem",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#1e3a8a" }}>
            {selectedId ? "Edit Workflow" : "Create Workflow"}
          </h3>

          <div style={{ display: "grid", gap: 12 }}>
            <input
              type="text"
              placeholder="Workflow name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: "0.9rem",
              }}
            />
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: "0.9rem",
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <select
                value={workflowType}
                onChange={(e) => setWorkflowType(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: "0.9rem",
                  background: "#fff"
                }}
              >
                <option value="Production">Production</option>
                <option value="Quality Control">Quality Control</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Field Service">Field Service</option>
              </select>
              <select
                value={applicableTo}
                onChange={(e) => setApplicableTo(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: "0.9rem",
                  background: "#fff"
                }}
              >
                <option value="Work Orders">Work Orders</option>
                <option value="Issues">Issues</option>
                <option value="Field Tickets">Field Tickets</option>
                <option value="All">All</option>
              </select>
              <input
                type="number"
                placeholder="Default SLA Hours e.g. 48"
                min="1"
                value={slaHours}
                onChange={(e) => setSlaHours(e.target.value)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ margin: 0, color: "#1e3a8a" }}>Steps</h4>
              <button
                onClick={addStep}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #dbeafe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                + Add Step
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              {steps.map((step, idx) => {
                const allowedOptions = statusOptions.filter((s) => s !== step.status);
                return (
                  <div
                    key={`step-${idx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "12px",
                      background: "#f8fafc",
                      display: "flex",
                      gap: 10,
                    }}
                  >
                    <div style={{ cursor: "grab", color: "#9ca3af", display: "flex", alignItems: "center", fontSize: "1.2rem", userSelect: "none" }}>
                      ⠿
                    </div>
                    <div style={{ flex: 1, display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <input
                          type="text"
                          placeholder="Step label"
                          value={step.label}
                          onChange={(e) => updateStep(idx, { label: e.target.value })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.85rem" }}
                        />
                        <input
                          type="text"
                          placeholder="Status (e.g. In Review)"
                          value={step.status}
                          onChange={(e) => updateStep(idx, { status: e.target.value })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                        <select
                          value={step.responsible_role}
                          onChange={(e) => updateStep(idx, { responsible_role: e.target.value })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.85rem", background: "#fff" }}
                        >
                          <option value="Any">Any</option>
                          <option value="developer">developer</option>
                          <option value="tester">tester</option>
                          <option value="admin">admin</option>
                          <option value="superadmin">superadmin</option>
                        </select>
                        <select
                          value={step.step_type}
                          onChange={(e) => updateStep(idx, { step_type: e.target.value })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.85rem", background: "#fff" }}
                        >
                          <option value="Manual">Manual</option>
                          <option value="Auto">Auto</option>
                          <option value="Approval Required">Approval Required</option>
                        </select>
                        <input
                          type="number"
                          placeholder="SLA Hours e.g. 8"
                          min="0"
                          value={step.sla_hours}
                          onChange={(e) => updateStep(idx, { sla_hours: e.target.value })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 15, alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#374151" }}>
                          <input
                            type="checkbox"
                            checked={step.is_blocking}
                            onChange={(e) => updateStep(idx, { is_blocking: e.target.checked })}
                          />
                          Blocking step
                        </label>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "#374151" }}>
                          <label>Color</label>
                          <input
                            type="color"
                            value={step.step_color}
                            onChange={(e) => updateStep(idx, { step_color: e.target.value })}
                            style={{ padding: 0, border: "none", width: 24, height: 24, borderRadius: 4, cursor: "pointer" }}
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Checklist: Comma-separated items e.g. Check wiring, Sign off sheet"
                          value={step.required_checklist}
                          onChange={(e) => updateStep(idx, { required_checklist: e.target.value })}
                          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                        <select
                          multiple
                          value={Array.isArray(step.allowedFrom) ? step.allowedFrom : []}
                          onChange={(e) =>
                            updateStep(idx, {
                              allowedFrom: Array.from(e.target.selectedOptions).map((o) => o.value),
                            })
                          }
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #e5e7eb",
                            fontSize: "0.82rem",
                            minHeight: 80,
                            background: "#fff",
                          }}
                        >
                          {allowedOptions.length === 0 && (
                            <option value="" disabled>
                              Add another status to enable transitions
                            </option>
                          )}
                          {allowedOptions.map((status) => (
                            <option key={`${idx}-${status}`} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => removeStep(idx)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            color: "#b91c1c",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            height: 36,
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#1e3a8a" }}>Workflow Preview</h4>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflowX: "auto", paddingBottom: "10px" }}>
              {steps.map((step, idx) => (
                <div key={`preview-${idx}`} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    padding: "8px 12px",
                    background: step.step_color || "#3b82f6",
                    color: "#fff",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    {step.is_blocking && <span title="Blocking step">🔒</span>}
                    {step.label || `Step ${idx + 1}`}
                    <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                      {step.step_type || "Manual"}
                    </span>
                  </div>
                  {idx < steps.length - 1 && <span style={{ color: "#9ca3af", fontWeight: "bold" }}>→</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {selectedId && (
              <button
                onClick={handleDelete}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  background: "#fef2f2",
                  color: "#b91c1c",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              style={{
                padding: "8px 18px",
                borderRadius: 8,
                border: "1px solid #1e3a8a",
                background: "#1e3a8a",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Save Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
