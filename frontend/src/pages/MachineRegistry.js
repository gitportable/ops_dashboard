import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getUsers } from "../api/userApi";
import {
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  getMachineIssues,
} from "../api/machineApi";

const STATUS_STYLES = {
  operational: { bg: "#dcfce7", color: "#166534", label: "Operational" },
  down: { bg: "#fee2e2", color: "#b91c1c", label: "Down" },
  maintenance: { bg: "#ffedd5", color: "#c2410c", label: "Maintenance" },
};

const PRODUCTION_STAGES = [
  "Cell Stringing",
  "Lamination",
  "IV Testing",
  "Framing",
  "EL Testing",
  "Dispatch",
];

const emptyForm = {
  machine_code: "",
  machine_name: "",
  machine_type: "",
  status: "Operational",
  production_stage: "Cell Stringing",
  location: "",
  manufacturer: "",
  model_number: "",
  serial_number: "",
  capacity_per_hour: "",
  power_consumption_kw: "",
  efficiency_rating: "",
  purchase_date: "",
  warranty_expiry: "",
  last_maintenance_date: "",
  next_maintenance_due: "",
  maintenance_frequency_days: "",
  assigned_technician: "",
  project_id: "",
  notes: "",
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const daysUntil = (value) => {
  if (!value) return null;
  const now = new Date();
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const ms = target.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
};

const valueOrDash = (v) => (v === null || v === undefined || v === "" ? "—" : v);

const MachineRegistry = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const { data: machinesRaw = [], isLoading } = useQuery({
    queryKey: ["machines"],
    queryFn: getMachines,
  });

  const { data: usersRaw = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const machines = useMemo(() => (Array.isArray(machinesRaw) ? machinesRaw : []), [machinesRaw]);
  const users = useMemo(() => (Array.isArray(usersRaw) ? usersRaw : []), [usersRaw]);

  const createMutation = useMutation({
    mutationFn: createMachine,
    onSuccess: () => {
      toast.success("Machine created.");
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("Failed to create machine."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateMachine(id, data),
    onSuccess: () => {
      toast.success("Machine updated.");
      queryClient.invalidateQueries({ queryKey: ["machines"] });
      setIsFormOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("Failed to update machine."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMachine,
    onSuccess: () => {
      toast.success("Machine deleted.");
      queryClient.invalidateQueries({ queryKey: ["machines"] });
    },
    onError: () => toast.error("Failed to delete machine."),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.machine_code || !form.machine_name) {
      toast.error("Machine code and name are required.");
      return;
    }

    const payload = {
      machine_code: form.machine_code || null,
      machine_name: form.machine_name || null,
      machine_type: form.machine_type || null,
      status: form.status || "Operational",
      production_stage: form.production_stage || null,
      location: form.location || null,
      manufacturer: form.manufacturer || null,
      model_number: form.model_number || null,
      serial_number: form.serial_number || null,
      capacity_per_hour: form.capacity_per_hour === "" ? null : Number(form.capacity_per_hour),
      power_consumption_kw: form.power_consumption_kw === "" ? null : Number(form.power_consumption_kw),
      efficiency_rating: form.efficiency_rating === "" ? null : Number(form.efficiency_rating),
      purchase_date: form.purchase_date || null,
      warranty_expiry: form.warranty_expiry || null,
      last_maintenance_date: form.last_maintenance_date || null,
      next_maintenance_due: form.next_maintenance_due || null,
      maintenance_frequency_days:
        form.maintenance_frequency_days === "" ? null : parseInt(form.maintenance_frequency_days, 10),
      assigned_technician: form.assigned_technician ? parseInt(form.assigned_technician, 10) : null,
      project_id: form.project_id || null,
      notes: form.notes || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (machine) => {
    setEditingId(machine.id);
    setForm({
      machine_code: machine.machine_code || "",
      machine_name: machine.machine_name || "",
      machine_type: machine.machine_type || "",
      status: machine.status || "Operational",
      production_stage: machine.production_stage || "Cell Stringing",
      location: machine.location || "",
      manufacturer: machine.manufacturer || "",
      model_number: machine.model_number || "",
      serial_number: machine.serial_number || "",
      capacity_per_hour: machine.capacity_per_hour ?? "",
      power_consumption_kw: machine.power_consumption_kw ?? "",
      efficiency_rating: machine.efficiency_rating ?? "",
      purchase_date: toDateInput(machine.purchase_date),
      warranty_expiry: toDateInput(machine.warranty_expiry),
      last_maintenance_date: toDateInput(machine.last_maintenance_date),
      next_maintenance_due: toDateInput(machine.next_maintenance_due),
      maintenance_frequency_days: machine.maintenance_frequency_days ?? "",
      assigned_technician: machine.assigned_technician ? String(machine.assigned_technician) : "",
      project_id: machine.project_id || "",
      notes: machine.notes || "",
    });
    setIsFormOpen(true);
  };

  const remove = (machine) => {
    if (!window.confirm(`Delete machine "${machine.machine_name || machine.machine_code}"?`)) return;
    deleteMutation.mutate(machine.id);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, color: "#1e3a8a", fontWeight: 800, fontSize: "1.5rem" }}>Machine Registry</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            Manage production machines and view linked issues.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            border: "none",
            background: "#1e3a8a",
            color: "#fff",
            borderRadius: 8,
            padding: "9px 14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          + New Machine
        </button>
      </div>

      {isFormOpen && (
        <form
          onSubmit={submit}
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: "1rem",
            marginBottom: "1rem",
            display: "grid",
            gap: 14,
          }}
        >
          <section>
            <h3 style={{ margin: "0 0 8px", color: "#1e3a8a", fontSize: "0.95rem" }}>Basic Info</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <input value={form.machine_code} onChange={(e) => setForm({ ...form, machine_code: e.target.value })} placeholder="Machine Code" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input value={form.machine_name} onChange={(e) => setForm({ ...form, machine_name: e.target.value })} placeholder="Machine Name" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input value={form.machine_type} onChange={(e) => setForm({ ...form, machine_type: e.target.value })} placeholder="Machine Type" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff" }}>
                <option value="Operational">Operational</option>
                <option value="Down">Down</option>
                <option value="Maintenance">Maintenance</option>
              </select>
              <select value={form.production_stage} onChange={(e) => setForm({ ...form, production_stage: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff" }}>
                {PRODUCTION_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </section>

          <section>
            <h3 style={{ margin: "0 0 8px", color: "#1e3a8a", fontSize: "0.95rem" }}>Technical Specs</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="Manufacturer" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })} placeholder="Model Number" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} placeholder="Serial Number" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input type="number" step="0.01" value={form.capacity_per_hour} onChange={(e) => setForm({ ...form, capacity_per_hour: e.target.value })} placeholder="Capacity / Hour" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input type="number" step="0.01" value={form.power_consumption_kw} onChange={(e) => setForm({ ...form, power_consumption_kw: e.target.value })} placeholder="Power Consumption (kW)" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input type="number" step="0.01" value={form.efficiency_rating} onChange={(e) => setForm({ ...form, efficiency_rating: e.target.value })} placeholder="Efficiency Rating (%)" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
            </div>
          </section>

          <section>
            <h3 style={{ margin: "0 0 8px", color: "#1e3a8a", fontSize: "0.95rem" }}>Maintenance</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input type="date" value={form.warranty_expiry} onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input type="date" value={form.last_maintenance_date} onChange={(e) => setForm({ ...form, last_maintenance_date: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input type="date" value={form.next_maintenance_due} onChange={(e) => setForm({ ...form, next_maintenance_due: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input type="number" value={form.maintenance_frequency_days} onChange={(e) => setForm({ ...form, maintenance_frequency_days: e.target.value })} placeholder="Maintenance Frequency (days)" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
            </div>
          </section>

          <section>
            <h3 style={{ margin: "0 0 8px", color: "#1e3a8a", fontSize: "0.95rem" }}>Assignment</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
              <select value={form.assigned_technician} onChange={(e) => setForm({ ...form, assigned_technician: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff" }}>
                <option value="">Assign technician</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email || `User ${u.id}`}</option>
                ))}
              </select>
              <input value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} placeholder="Project ID (e.g. P3)" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
            </div>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" style={{ marginTop: 10, width: "100%", minHeight: 72, padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
          </section>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={closeForm} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 8, padding: "7px 12px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
            <button type="submit" style={{ border: "none", background: "#1e3a8a", color: "#fff", borderRadius: 8, padding: "7px 12px", fontWeight: 700, cursor: "pointer" }}>{editingId ? "Update Machine" : "Create Machine"}</button>
          </div>
        </form>
      )}

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
        {isLoading ? (
          <div style={{ padding: "1.2rem", color: "#64748b" }}>Loading machines...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
                {["Machine Code", "Name", "Type", "Location", "Status", "Project", "Actions"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 12px", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => {
                const st = STATUS_STYLES[(machine.status || "").toLowerCase()] || STATUS_STYLES.operational;
                const expanded = expandedId === machine.id;
                const maintenanceDays = daysUntil(machine.next_maintenance_due);
                const warrantyDays = daysUntil(machine.warranty_expiry);
                const maintenanceAlert = maintenanceDays !== null && maintenanceDays >= 0 && maintenanceDays <= 7;
                const warrantyAlert = warrantyDays !== null && warrantyDays >= 0 && warrantyDays <= 30;

                return (
                  <Fragment key={machine.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : machine.id)}
                      style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer", background: expanded ? "#f8fafc" : "#fff" }}
                    >
                      <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 700 }}>{machine.machine_code || "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>{machine.machine_name || "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>{machine.machine_type || "—"}</td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>{machine.location || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                          {maintenanceAlert && <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700, background: "#ffedd5", color: "#c2410c" }}>Maintenance Due</span>}
                          {warrantyAlert && <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: "0.68rem", fontWeight: 700, background: "#fee2e2", color: "#b91c1c" }}>Warranty Near Expiry</span>}
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#334155" }}>{machine.project_id || "—"}</td>
                      <td style={{ padding: "10px 12px" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openEdit(machine)} style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>Edit</button>
                          <button onClick={() => remove(machine)} style={{ border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", borderRadius: 6, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={7} style={{ padding: "10px 12px 14px", background: "#f8fafc" }}>
                          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", padding: "10px", marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>Machine Details</div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 8, fontSize: "0.82rem", color: "#334155" }}>
                              <div><b>Production Stage:</b> {valueOrDash(machine.production_stage)}</div>
                              <div><b>Manufacturer:</b> {valueOrDash(machine.manufacturer)}</div>
                              <div><b>Model Number:</b> {valueOrDash(machine.model_number)}</div>
                              <div><b>Serial Number:</b> {valueOrDash(machine.serial_number)}</div>
                              <div><b>Capacity / Hour:</b> {valueOrDash(machine.capacity_per_hour)}</div>
                              <div><b>Power (kW):</b> {valueOrDash(machine.power_consumption_kw)}</div>
                              <div><b>Efficiency (%):</b> {valueOrDash(machine.efficiency_rating)}</div>
                              <div><b>Purchase Date:</b> {valueOrDash(toDateInput(machine.purchase_date))}</div>
                              <div><b>Warranty Expiry:</b> {valueOrDash(toDateInput(machine.warranty_expiry))}</div>
                              <div><b>Last Maintenance:</b> {valueOrDash(toDateInput(machine.last_maintenance_date))}</div>
                              <div><b>Next Maintenance Due:</b> {valueOrDash(toDateInput(machine.next_maintenance_due))}</div>
                              <div><b>Maintenance Frequency (days):</b> {valueOrDash(machine.maintenance_frequency_days)}</div>
                              <div><b>Assigned Technician:</b> {valueOrDash(machine.assigned_technician_name || machine.assigned_technician)}</div>
                              <div><b>Project ID:</b> {valueOrDash(machine.project_id)}</div>
                              <div style={{ gridColumn: "1 / -1" }}><b>Notes:</b> {valueOrDash(machine.notes)}</div>
                            </div>
                          </div>
                          <MachineIssues machineId={machine.id} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {machines.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>No machines found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const MachineIssues = ({ machineId }) => {
  const { data: issuesRaw = [], isLoading } = useQuery({
    queryKey: ["machineIssues", machineId],
    queryFn: () => getMachineIssues(machineId),
    enabled: !!machineId,
  });

  const issues = Array.isArray(issuesRaw) ? issuesRaw : [];
  const recent = issues.slice(0, 8);

  return (
    <div>
      <div style={{ fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>Recent Linked Issues</div>
      {isLoading ? (
        <div style={{ color: "#64748b", fontSize: "0.84rem" }}>Loading machine issues...</div>
      ) : recent.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: "0.84rem" }}>No issues linked to this machine.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                {["Issue ID", "Type", "Status", "Sprint", "Team"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "7px 8px", color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((issue) => (
                <tr key={issue.issueid || issue.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "7px 8px", color: "#0f172a", fontWeight: 700 }}>{issue.issueid || "—"}</td>
                  <td style={{ padding: "7px 8px", color: "#334155" }}>{issue.issuetype || issue.issue_type || "Task"}</td>
                  <td style={{ padding: "7px 8px", color: "#334155" }}>{issue.status || "Open"}</td>
                  <td style={{ padding: "7px 8px", color: "#334155" }}>{issue.sprint || "—"}</td>
                  <td style={{ padding: "7px 8px", color: "#334155" }}>{issue.assigneeteam || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MachineRegistry;
