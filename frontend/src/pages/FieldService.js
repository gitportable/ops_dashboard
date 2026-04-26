import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getInstallations, getTickets, createInstallation, createTicket } from "../api/featuresApi";
import { AuthContext } from "../auth/AuthContext";
import { toast } from "react-hot-toast";

const AddSiteModal = ({ isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = React.useState({ project_id: "SOL-P-101", customer_name: "", site_location: "", pv_capacity_kw: 0, installation_date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = React.useState(false);
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createInstallation(formData);
      toast.success("Site added successfully");
      onRefresh(); onClose();
    } catch { toast.error("Failed to add site"); } finally { setSubmitting(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: "16px", width: "400px" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Register New Installation Site</h2>
        <form onSubmit={handleSubmit}>
          <input required style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Customer Name" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
          <input required style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Site Location" value={formData.site_location} onChange={e => setFormData({...formData, site_location: e.target.value})} />
          <input required type="number" style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="PV Capacity (kW)" value={formData.pv_capacity_kw} onChange={e => setFormData({...formData, pv_capacity_kw: parseFloat(e.target.value)})} />
          <input required type="date" style={{ width: "100%", padding: "10px", marginBottom: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} value={formData.installation_date} onChange={e => setFormData({...formData, installation_date: e.target.value})} />
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#1e40af", color: "#fff" }}>Add Site</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LogTicketModal = ({ isOpen, onClose, onRefresh, installations }) => {
  const [formData, setFormData] = React.useState({ installation_id: "", ticket_type: "Repair", description: "", priority: "Medium", assigned_to: "" });
  const [submitting, setSubmitting] = React.useState(false);
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createTicket(formData);
      toast.success("Maintenance ticket logged");
      onRefresh(); onClose();
    } catch { toast.error("Failed to log ticket"); } finally { setSubmitting(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: "16px", width: "400px" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Log Maintenance Ticket</h2>
        <form onSubmit={handleSubmit}>
          <select required style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} value={formData.installation_id} onChange={e => setFormData({...formData, installation_id: e.target.value})}>
            <option value="">Select Installation</option>
            {installations.map(i => <option key={i.id} value={i.id}>{i.customer_name} - {i.site_location}</option>)}
          </select>
          <select style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
          <textarea required style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", height: "80px" }} placeholder="Issue Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          <input required style={{ width: "100%", padding: "10px", marginBottom: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Assign To" value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})} />
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#1e40af", color: "#fff" }}>Log Ticket</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FieldService = () => {
  const { role } = useContext(AuthContext) || {};
  const isAdmin = ["admin", "superadmin"].includes(role?.toLowerCase());

  const [showAddSite, setShowAddSite] = React.useState(false);
  const [showLogTicket, setShowLogTicket] = React.useState(false);

  const { data: installations = [], refetch: refetchSites } = useQuery({ queryKey: ["installations"], queryFn: getInstallations });
  const { data: tickets = [], refetch: refetchTickets } = useQuery({ queryKey: ["tickets"], queryFn: getTickets });

  const getPriorityColor = (p) => {
    switch(p?.toLowerCase()) {
      case 'critical': return { bg: '#fee2e2', fg: '#991b1b' };
      case 'high': return { bg: '#ffedd5', fg: '#9a3412' };
      case 'medium': return { bg: '#fef9c3', fg: '#854d0e' };
      default: return { bg: '#f0fdf4', fg: '#166534' };
    }
  };

  return (
    <div style={{ padding: "2rem", background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "800", color: "#1e293b", letterSpacing: "-0.025em" }}>Field Service & Installation Tracking</h1>
          <p style={{ color: "#64748b" }}>Monitor site installation progress and manage post-commissioning maintenance and warranty claims.</p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "1rem" }}>
             <button 
               onClick={() => setShowAddSite(true)}
               style={{ background: "#fff", color: "#1e40af", border: "1px solid #1e40af", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
             >
               + New Site
             </button>
             <button 
               onClick={() => setShowLogTicket(true)}
               style={{ background: "#1e40af", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(30,64,175,0.2)" }}
             >
               + Log Ticket
             </button>
          </div>
        )}
      </header>

      <AddSiteModal isOpen={showAddSite} onClose={() => setShowAddSite(false)} onRefresh={refetchSites} />
      <LogTicketModal isOpen={showLogTicket} onClose={() => setShowLogTicket(false)} onRefresh={refetchTickets} installations={installations} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "1.5rem" }}>
        {/* Active Installations */}
        <div>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600", color: "#1e293b" }}>Site Installations</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {installations.map(inst => (
              <div key={inst.id} style={{ background: "#fff", padding: "1.25rem", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderLeft: `4px solid ${inst.status === 'completed' ? '#22c55e' : inst.status === 'issue' ? '#ef4444' : '#3b82f6'}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <h4 style={{ fontWeight: "700", color: "#1e293b" }}>{inst.customer_name}</h4>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#64748b" }}>{inst.pv_capacity_kw} kW</span>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.75rem" }}>📍 {inst.site_location}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ 
                    padding: "4px 10px", borderRadius: "99px", fontSize: "0.7rem", fontWeight: "700",
                    background: inst.status === 'completed' ? '#dcfce7' : inst.status === 'issue' ? '#fef2f2' : '#eff6ff',
                    color: inst.status === 'completed' ? '#166534' : inst.status === 'issue' ? '#991b1b' : '#1e40af'
                  }}>
                    {inst.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Est. {new Date(inst.installation_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance & Warranty Tickets */}
        <div>
          <h3 style={{ marginBottom: "1rem", fontWeight: "600", color: "#1e293b" }}>Maintenance & Warranty Tickets</h3>
          <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f8fafc" }}>
                <tr style={{ textAlign: "left", fontSize: "0.875rem" }}>
                  <th style={{ padding: "1rem" }}>Ticket Info</th>
                  <th style={{ padding: "1rem" }}>Status</th>
                  <th style={{ padding: "1rem" }}>Priority</th>
                  <th style={{ padding: "1rem" }}>Assignee</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => {
                  const pStyle = getPriorityColor(ticket.priority);
                  return (
                    <tr key={ticket.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: "600", fontSize: "0.93rem" }}>{ticket.ticket_type}: {ticket.description.slice(0, 30)}...</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{ticket.customer_name} | {ticket.site_location}</div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{ fontSize: "0.875rem", color: ticket.status === 'resolved' ? '#16a34a' : '#ea580c' }}>
                          ● {ticket.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: "700", background: pStyle.bg, color: pStyle.fg }}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem", color: "#475569" }}>
                        Eng. #{ticket.assigned_to}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tickets.length === 0 && <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No active maintenance tickets.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FieldService;
