import { useContext, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "../api/axios";
import { AuthContext } from "../auth/AuthContext";

const getFieldTickets = () => api.get("/field-tickets").then((r) => r.data);
const getUsers = () => api.get("/users").then((r) => r.data);
const getProjects = () => api.get("/projects/all").then((r) => r.data);

const TABS = ["Installation", "Maintenance (AMC)", "Warranty Claims"];

const STATUS_STYLES = {
  open: { bg: "#dbeafe", color: "#1d4ed8" },
  "in progress": { bg: "#fef3c7", color: "#a16207" },
  resolved: { bg: "#dcfce7", color: "#166534" },
  closed: { bg: "#e5e7eb", color: "#374151" },
};

const PRIORITY_STYLES = {
  low: { bg: "#dcfce7", color: "#166534" },
  medium: { bg: "#ffedd5", color: "#c2410c" },
  high: { bg: "#fee2e2", color: "#b91c1c" },
  critical: { bg: "#7f1d1d", color: "#ffffff" },
};

const ESCALATION_STYLES = {
  none: { bg: "#e5e7eb", color: "#374151", label: "None" },
  l1: { bg: "#fef3c7", color: "#a16207", label: "L1" },
  l2: { bg: "#ffedd5", color: "#c2410c", label: "L2" },
  l3: { bg: "#fee2e2", color: "#b91c1c", label: "L3" },
};

const emptyForm = {
  ticket_type: "Installation",
  customer_name: "",
  contact_number: "",
  state: "",
  city: "",
  site_name: "",
  location: "",
  description: "",
  status: "Open",
  priority: "Medium",
  assigned_to: "",
  project_id: "",
  sla_due_date: "",
  escalation_level: "None",
  plant_capacity_kw: "",
  resolution_notes: "",
  warranty_expiry: "",
  no_of_panels: "",
  inverter_model: "",
  commissioning_date: "",
  last_service_date: "",
  next_service_due: "",
  amc_contract_number: "",
  claim_number: "",
  component_failed: "",
  failure_date: "",
  replacement_approved: false,
};

const toDateInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const isExpiringSoon = (dateValue) => {
  if (!dateValue) return false;
  const now = new Date();
  const exp = new Date(dateValue);
  const diffDays = (exp - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 30;
};

const isClosedOrResolved = (status) => {
  const s = (status || "").toLowerCase();
  return s === "closed" || s === "resolved";
};

const isSlaBreached = (ticket) => {
  if (!ticket?.sla_due_date || isClosedOrResolved(ticket?.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(ticket.sla_due_date);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

const tabMatch = (tab, type) => {
  const t = (type || "").toLowerCase();
  if (tab === "Installation") return t.includes("installation");
  if (tab === "Maintenance (AMC)") return t.includes("maintenance") || t.includes("amc");
  return t.includes("warranty");
};

const tabToTicketType = (tab) =>
  tab === "Installation" ? "Installation"
    : tab === "Maintenance (AMC)" ? "Maintenance"
      : "Warranty";

const FieldService = () => {
  const { role, user } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || "").toLowerCase();
  const canEdit = currentRole === "admin" || currentRole === "superadmin";
  const isSuperAdmin = currentRole === "superadmin";
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("Installation");
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyForm, ticket_type: tabToTicketType("Installation") });
  const [saving, setSaving] = useState(false);

  const { data: tickets = [], isLoading, isError } = useQuery({
    queryKey: ["fieldTickets"],
    queryFn: getFieldTickets,
  });

  const { data: usersRaw = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });
  const users = Array.isArray(usersRaw) ? usersRaw : usersRaw?.users || [];

  const { data: projectsRaw = [] } = useQuery({
    queryKey: ["allProjects"],
    queryFn: getProjects,
  });
  const projects = Array.isArray(projectsRaw) ? projectsRaw : projectsRaw?.projects || [];

  const filtered = useMemo(
    () => (Array.isArray(tickets) ? tickets : []).filter((t) => tabMatch(tab, t.ticket_type)),
    [tickets, tab]
  );

  const stats = useMemo(() => {
    const rows = Array.isArray(filtered) ? filtered : [];
    return {
      total: rows.length,
      open: rows.filter((t) => (t.status || "").toLowerCase() === "open").length,
      breached: rows.filter((t) => isSlaBreached(t)).length,
      escalated: rows.filter((t) => {
        const lvl = (t.escalation_level || "").toLowerCase();
        return lvl === "l2" || lvl === "l3";
      }).length,
    };
  }, [filtered]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, ticket_type: tabToTicketType(tab) });
    setOpenModal(true);
  };

  const openEdit = (ticket) => {
    setEditing(ticket);
    setForm({
      ticket_type: ticket.ticket_type || "Installation",
      customer_name: ticket.customer_name || "",
      contact_number: ticket.contact_number || "",
      state: ticket.state || "",
      city: ticket.city || "",
      site_name: ticket.site_name || "",
      location: ticket.location || "",
      description: ticket.description || "",
      status: ticket.status || "Open",
      priority: ticket.priority || "Medium",
      assigned_to: ticket.assigned_to || "",
      project_id: ticket.project_id || "",
      sla_due_date: toDateInput(ticket.sla_due_date),
      escalation_level: ticket.escalation_level || "None",
      plant_capacity_kw: ticket.plant_capacity_kw ?? "",
      resolution_notes: ticket.resolution_notes || "",
      warranty_expiry: toDateInput(ticket.warranty_expiry),
      no_of_panels: ticket.no_of_panels ?? "",
      inverter_model: ticket.inverter_model || "",
      commissioning_date: toDateInput(ticket.commissioning_date),
      last_service_date: toDateInput(ticket.last_service_date),
      next_service_due: toDateInput(ticket.next_service_due),
      amc_contract_number: ticket.amc_contract_number || "",
      claim_number: ticket.claim_number || "",
      component_failed: ticket.component_failed || "",
      failure_date: toDateInput(ticket.failure_date),
      replacement_approved: !!ticket.replacement_approved,
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    setForm({ ...emptyForm, ticket_type: tabToTicketType(tab) });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        ticket_type: tabToTicketType(tab),
        assigned_to: form.assigned_to ? parseInt(form.assigned_to, 10) : null,
        project_id: form.project_id || null,
        plant_capacity_kw: form.plant_capacity_kw === "" ? null : Number(form.plant_capacity_kw),
        no_of_panels: form.no_of_panels === "" ? null : parseInt(form.no_of_panels, 10),
        replacement_approved: !!form.replacement_approved,
        maintenance_frequency_days:
          form.maintenance_frequency_days === "" ? null : parseInt(form.maintenance_frequency_days, 10),
        warranty_expiry: form.warranty_expiry || null,
        sla_due_date: form.sla_due_date || null,
        commissioning_date: form.commissioning_date || null,
        last_service_date: form.last_service_date || null,
        next_service_due: form.next_service_due || null,
        failure_date: form.failure_date || null,
      };

      if (editing?.id) {
        await api.put(`/field-tickets/${editing.id}`, payload);
        toast.success("Ticket updated.");
      } else {
        await api.post("/field-tickets", payload);
        toast.success("Ticket created.");
      }
      queryClient.invalidateQueries({ queryKey: ["fieldTickets"] });
      closeModal();
    } catch {
      toast.error("Failed to save ticket.");
    } finally {
      setSaving(false);
    }
  };

  const removeTicket = async (id) => {
    if (!isSuperAdmin) return;
    if (!window.confirm("Delete this ticket?")) return;
    try {
      await api.delete(`/field-tickets/${id}`);
      toast.success("Ticket deleted.");
      queryClient.invalidateQueries({ queryKey: ["fieldTickets"] });
    } catch {
      toast.error("Failed to delete ticket.");
    }
  };

  const getUserName = (id) => {
    if (!id) return "—";
    const u = users.find((x) => x.id === id || x.id === parseInt(id, 10));
    return u ? (u.name || u.username || u.email || `User #${id}`) : `User #${id}`;
  };

  const escalationBadge = (level) => {
    const s = ESCALATION_STYLES[(level || "None").toLowerCase()] || ESCALATION_STYLES.none;
    return (
      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const currentType = (form.ticket_type || tab).toLowerCase();
  const isInstallation = currentType.includes("installation");
  const isMaintenance = currentType.includes("maintenance") || currentType.includes("amc");
  const isWarranty = currentType.includes("warranty");

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      <h1 style={{ margin: 0, color: "#1e3a8a", fontSize: "1.55rem", fontWeight: 800 }}>
        Field Service & Warranty Management
      </h1>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        {[
          { label: "Total Tickets", value: stats.total, color: "#1d4ed8" },
          { label: "Open", value: stats.open, color: "#0f766e" },
          { label: "SLA Breached", value: stats.breached, color: "#b91c1c" },
          { label: "Escalated (L2/L3)", value: stats.escalated, color: "#c2410c" },
        ].map((card) => (
          <div key={card.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem 1rem" }}>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                border: "none",
                borderRadius: 99,
                padding: "7px 12px",
                fontWeight: 700,
                cursor: "pointer",
                background: tab === t ? "#1e3a8a" : "#e2e8f0",
                color: tab === t ? "#fff" : "#334155",
                fontSize: "0.78rem",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        {canEdit && (
          <button
            onClick={openCreate}
            style={{
              padding: "8px 14px",
              border: "none",
              borderRadius: 8,
              background: "#1e3a8a",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + New Ticket
          </button>
        )}
      </div>

      {isLoading && <div style={{ padding: "2rem 0", color: "#64748b" }}>Loading field tickets...</div>}
      {isError && <div style={{ marginTop: 14, background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "1rem" }}>Failed to load field tickets.</div>}

      {!isLoading && !isError && (
        <div style={{ marginTop: 14, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1380 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                {[
                  "Ticket ID",
                  "Type",
                  "Customer",
                  "Site",
                  "Location",
                  "Description",
                  "Priority",
                  "Status",
                  "SLA Due",
                  "Escalation",
                  "Assigned To",
                  "Created Date",
                  "Warranty Expiry",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "11px 14px", fontSize: "0.74rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const st = STATUS_STYLES[(t.status || "").toLowerCase()] || STATUS_STYLES.open;
                const pr = PRIORITY_STYLES[(t.priority || "").toLowerCase()] || PRIORITY_STYLES.medium;
                const expirySoon = isExpiringSoon(t.warranty_expiry);
                const breached = isSlaBreached(t);
                const loc = [t.state, t.city].filter(Boolean).join(", ") || t.location || "—";

                return (
                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#334155" }}>#{t.id}</td>
                    <td style={{ padding: "10px 14px", color: "#334155", fontSize: "0.84rem" }}>{t.ticket_type || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#334155", fontSize: "0.84rem" }}>{t.customer_name || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#334155", fontSize: "0.84rem" }}>{t.site_name || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#334155", fontSize: "0.84rem" }}>{loc}</td>
                    <td style={{ padding: "10px 14px", color: "#334155", fontSize: "0.84rem", maxWidth: 260 }}>{t.description || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700, background: pr.bg, color: pr.color }}>
                        {t.priority || "Medium"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700, background: st.bg, color: st.color }}>
                        {t.status || "Open"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>{t.sla_due_date ? new Date(t.sla_due_date).toLocaleDateString() : "—"}</span>
                        {breached && (
                          <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700, color: "#fff", background: "#dc2626", width: "fit-content" }}>
                            SLA Breached
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>{escalationBadge(t.escalation_level || "None")}</td>
                    <td style={{ padding: "10px 14px", color: "#334155", fontSize: "0.84rem" }}>{getUserName(t.assigned_to)}</td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.82rem" }}>
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "0.82rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>{t.warranty_expiry ? new Date(t.warranty_expiry).toLocaleDateString() : "—"}</span>
                        {expirySoon && (
                          <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: "0.7rem", fontWeight: 700, color: "#b45309", background: "#fef3c7", width: "fit-content" }}>
                            Expiring Soon
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {canEdit && (
                          <button
                            onClick={() => openEdit(t)}
                            style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, fontWeight: 700, fontSize: "0.74rem", padding: "5px 10px", cursor: "pointer" }}
                          >
                            Edit
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => removeTicket(t.id)}
                            style={{ border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", borderRadius: 6, fontWeight: 700, fontSize: "0.74rem", padding: "5px 10px", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                    No tickets found for this tab.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {openModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 2000 }}>
          <form onSubmit={submit} style={{ width: "100%", maxWidth: 980, background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", padding: "1rem", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem", fontWeight: 800 }}>
              {editing ? "Edit Ticket" : "Create Ticket"}
            </h3>

            <div style={{ marginTop: 10, marginBottom: 6, fontWeight: 700, color: "#1e3a8a", fontSize: "0.85rem" }}>Common Fields</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 10 }}>
              <select value={form.ticket_type} onChange={(e) => setForm({ ...form, ticket_type: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                {TABS.map((s) => <option key={s} value={tabToTicketType(s)}>{s}</option>)}
              </select>
              <input placeholder="Customer Name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input placeholder="Contact Number" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input placeholder="Site Name" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />

              <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                <option value="">— Assign To —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.username || u.email || `User #${u.id}`}
                  </option>
                ))}
              </select>

              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                {["Open", "In Progress", "Resolved", "Closed"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                {["Low", "Medium", "High", "Critical"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                <option value="">— Select Project —</option>
                {projects.map((p) => (
                  <option key={p.projectid} value={p.projectid}>
                    {p.projectname || p.projectid}
                  </option>
                ))}
              </select>

              <input type="date" value={form.sla_due_date} onChange={(e) => setForm({ ...form, sla_due_date: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <select value={form.escalation_level} onChange={(e) => setForm({ ...form, escalation_level: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }}>
                {["None", "L1", "L2", "L3"].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="number" placeholder="Plant Capacity (kW)" value={form.plant_capacity_kw} onChange={(e) => setForm({ ...form, plant_capacity_kw: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <input type="date" value={form.warranty_expiry} onChange={(e) => setForm({ ...form, warranty_expiry: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <textarea placeholder="Resolution Notes" value={form.resolution_notes} onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })} style={{ gridColumn: "1 / -1", minHeight: 70, padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, resize: "vertical" }} />
              <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ gridColumn: "1 / -1", minHeight: 90, padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8, resize: "vertical" }} />
            </div>

            {isInstallation && (
              <>
                <div style={{ marginTop: 12, marginBottom: 6, fontWeight: 700, color: "#1e3a8a", fontSize: "0.85rem" }}>Installation Fields</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 10 }}>
                  <input type="number" placeholder="No. of Panels" value={form.no_of_panels} onChange={(e) => setForm({ ...form, no_of_panels: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                  <input placeholder="Inverter Model" value={form.inverter_model} onChange={(e) => setForm({ ...form, inverter_model: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                  <input type="date" value={form.commissioning_date} onChange={(e) => setForm({ ...form, commissioning_date: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                </div>
              </>
            )}

            {isMaintenance && (
              <>
                <div style={{ marginTop: 12, marginBottom: 6, fontWeight: 700, color: "#1e3a8a", fontSize: "0.85rem" }}>Maintenance (AMC) Fields</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 10 }}>
                  <input type="date" value={form.last_service_date} onChange={(e) => setForm({ ...form, last_service_date: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                  <input type="date" value={form.next_service_due} onChange={(e) => setForm({ ...form, next_service_due: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                  <input placeholder="AMC Contract Number" value={form.amc_contract_number} onChange={(e) => setForm({ ...form, amc_contract_number: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                </div>
              </>
            )}

            {isWarranty && (
              <>
                <div style={{ marginTop: 12, marginBottom: 6, fontWeight: 700, color: "#1e3a8a", fontSize: "0.85rem" }}>Warranty Claims Fields</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 10 }}>
                  <input placeholder="Claim Number" value={form.claim_number} onChange={(e) => setForm({ ...form, claim_number: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                  <input placeholder="Component Failed" value={form.component_failed} onChange={(e) => setForm({ ...form, component_failed: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                  <input type="date" value={form.failure_date} onChange={(e) => setForm({ ...form, failure_date: e.target.value })} style={{ padding: "9px 10px", border: "1px solid #cbd5e1", borderRadius: 8 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 10px" }}>
                    <input type="checkbox" checked={!!form.replacement_approved} onChange={(e) => setForm({ ...form, replacement_approved: e.target.checked })} />
                    Replacement Approved
                  </label>
                </div>
              </>
            )}

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button type="button" onClick={closeModal} style={{ border: "1px solid #cbd5e1", background: "#fff", color: "#334155", borderRadius: 8, padding: "7px 12px", fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{ border: "none", background: "#1e3a8a", color: "#fff", borderRadius: 8, padding: "7px 12px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FieldService;
