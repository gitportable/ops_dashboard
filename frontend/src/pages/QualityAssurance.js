import React, { useState, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDefects, getDefectStats, updateRCA, createDefect } from "../api/featuresApi";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { toast } from "react-hot-toast";
import { AuthContext } from "../auth/AuthContext";

const AddDefectModal = ({ isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = React.useState({
    defect_type: "",
    machine_id: "",
    batch_lot: "",
    projectid: "P-101", // Default project for now
    description: ""
  });
  const [submitting, setSubmitting] = React.useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createDefect(formData);
      toast.success("Defect logged successfully");
      onRefresh();
      onClose();
    } catch (err) {
      toast.error("Failed to log defect");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: "16px", width: "450px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginBottom: "1.5rem", fontSize: "1.25rem", fontWeight: "700" }}>Log Production Defect</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600" }}>Defect Type</label>
            <input 
              required
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              placeholder="e.g. Micro-crack, Cell Mismatch"
              value={formData.defect_type}
              onChange={e => setFormData({...formData, defect_type: e.target.value})}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600" }}>Machine ID</label>
            <input 
              required
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              placeholder="e.g. MCH-EL-01"
              value={formData.machine_id}
              onChange={e => setFormData({...formData, machine_id: e.target.value})}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600" }}>Batch / Lot</label>
            <input 
              required
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }}
              placeholder="e.g. LOT-24-A"
              value={formData.batch_lot}
              onChange={e => setFormData({...formData, batch_lot: e.target.value})}
            />
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600" }}>Description</label>
            <textarea 
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", height: "80px" }}
              placeholder="Additional details..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#1e40af", color: "#fff", fontWeight: "600", cursor: "pointer" }}>
              {submitting ? "Logging..." : "Log Defect"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const COLORS = ["#ef4444", "#f97316", "#eab308", "#1e40af", "#8b5cf6", "#ec4899", "#10b981", "#3b82f6"];

const QualityAssurance = () => {
  const queryClient = useQueryClient();
  const { role } = useContext(AuthContext) || {};
  const isAdmin = ["admin", "superadmin", "tester"].includes(role?.toLowerCase());

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [rcaForm, setRcaForm] = useState({ rca: "", capa: "", classification: "", imageUrl: "" });
  
  // Filters
  const [filters, setFilters] = useState({ type: "", machine: "", batch: "", status: "" });

  const { data: defects = [], isLoading, refetch: refetchDefects } = useQuery({
    queryKey: ["defects"],
    queryFn: getDefects
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["defectStats"],
    queryFn: getDefectStats
  });

  const filteredDefects = defects.filter(d => {
    const matchesType = !filters.type || (d.defect_type || "").toLowerCase().includes(filters.type.toLowerCase());
    const matchesMachine = !filters.machine || (d.machine_id || "").toLowerCase().includes(filters.machine.toLowerCase());
    const matchesBatch = !filters.batch || (d.batch_lot || "").toLowerCase().includes(filters.batch.toLowerCase());
    const matchesStatus = !filters.status || (
      filters.status === "pending" ? !d.rca : filters.status === "resolved" ? !!d.rca : true
    );
    return matchesType && matchesMachine && matchesBatch && matchesStatus;
  });

  const rcaMutation = useMutation({
    mutationFn: ({ id, data }) => updateRCA(id, data),
    onSuccess: () => {
      toast.success("RCA/CAPA Updated");
      queryClient.invalidateQueries(["defects"]);
      setSelectedIssue(null);
    }
  });

  const handleEditRca = (issue) => {
    setSelectedIssue(issue);
    setRcaForm({
      rca: issue.rca || "",
      capa: issue.capa || "",
      classification: issue.classification || "",
      imageUrl: issue.image_url || ""
    });
  };

  const handleSubmitRca = (e) => {
    e.preventDefault();
    rcaMutation.mutate({ id: selectedIssue.issueid, data: rcaForm });
  };

  if (isLoading) return <div style={{ padding: "2rem" }}>Loading QA Data...</div>;

  return (
    <div style={{ padding: "2rem", background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "800", color: "#1e293b", letterSpacing: "-0.025em" }}>Quality Assurance & Defect Tracking</h1>
          <p style={{ color: "#64748b" }}>Monitor production quality, analyze root causes, and manage corrective actions.</p>
        </div>
        {isAdmin && (
           <button 
             onClick={() => setShowAddModal(true)}
             style={{ background: "#1e40af", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(30,64,175,0.2)" }}
           >
             + Log New Defect
           </button>
        )}
      </header>

      <AddDefectModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
        onRefresh={refetchDefects} 
      />

      {/* Filter Bar */}
      <div style={{ background: "#fff", padding: "1.25rem", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Defect Type</label>
          <input 
            type="text" placeholder="Filter by type..." 
            value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}
            style={{ width: "100%", padding: "0.625rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Machine</label>
          <input 
            type="text" placeholder="Filter by machine..." 
            value={filters.machine} onChange={e => setFilters({...filters, machine: e.target.value})}
            style={{ width: "100%", padding: "0.625rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>Batch / Lot</label>
          <input 
            type="text" placeholder="Filter by batch..." 
            value={filters.batch} onChange={e => setFilters({...filters, batch: e.target.value})}
            style={{ width: "100%", padding: "0.625rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.875rem" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "0.5rem" }}>RCA Status</label>
          <select 
            value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
            style={{ width: "100%", padding: "0.625rem", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.875rem", background: "#fff" }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending RCA</option>
            <option value="resolved">RCA Logged</option>
          </select>
        </div>
        <button 
          onClick={() => setFilters({ type: "", machine: "", batch: "", status: "" })}
          style={{ padding: "0.625rem 1.25rem", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: "600", cursor: "pointer" }}
        >
          Reset
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Defect Type Distribution */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "700", color: "#1e293b" }}>Defect Type Distribution</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {stats.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Breakdown */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "1rem", fontWeight: "700", color: "#1e293b" }}>Machine Load (Active Defects)</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Defect List */}
      <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f8fafc" }}>
            <tr>
              {["ID", "Type", "Machine", "Batch", "RCA Status", "Actions"].map(h => (
                <th key={h} style={{ padding: "1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredDefects.map((def) => (
              <tr key={def.issueid} style={{ borderTop: "1px solid #f1f5f9" }}>
                <td style={{ padding: "1rem", fontWeight: "700", color: "#1e293b" }}>{def.issueid}</td>
                <td style={{ padding: "1rem" }}>
                    <span style={{ padding: "4px 10px", borderRadius: "99px", background: "#fee2e2", color: "#991b1b", fontSize: "0.75rem", fontWeight: "700" }}>
                        {def.defect_type}
                    </span>
                </td>
                <td style={{ padding: "1rem", color: "#475569" }}>{def.machine_id || "—"}</td>
                <td style={{ padding: "1rem", color: "#475569" }}>{def.batch_lot || "—"}</td>
                <td style={{ padding: "1rem" }}>
                    {def.rca ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#16a34a", fontSize: "0.875rem", fontWeight: "600" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a" }}></span>
                          Resolved
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#d97706", fontSize: "0.875rem", fontWeight: "600" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#d97706" }}></span>
                          Pending RCA
                        </div>
                    )}
                </td>
                <td style={{ padding: "1rem" }}>
                  <button 
                    onClick={() => handleEditRca(def)}
                    style={{ background: "#f1f5f9", color: "#1e40af", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "700", transition: "all 0.2s" }}
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredDefects.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>No defects matching your filters.</div>
        )}
      </div>

      {/* RCA/CAPA Modal */}
      {selectedIssue && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "2rem", borderRadius: "12px", width: "500px" }}>
            <h2 style={{ marginBottom: "1.5rem" }}>Analyze Defect #{selectedIssue.issueid}</h2>
            <form onSubmit={handleSubmitRca}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Classification</label>
                <input 
                  type="text" 
                  value={rcaForm.classification} 
                  onChange={(e) => setRcaForm({...rcaForm, classification: e.target.value})}
                  placeholder="e.g. Mechanical, Electrical, Material"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Root Cause Analysis (RCA)</label>
                <textarea 
                  value={rcaForm.rca} 
                  onChange={(e) => setRcaForm({...rcaForm, rca: e.target.value})}
                  rows={3}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}
                />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Defect Image URL</label>
                <input 
                  type="text" 
                  value={rcaForm.imageUrl} 
                  onChange={(e) => setRcaForm({...rcaForm, imageUrl: e.target.value})}
                  placeholder="https://example.com/defect.jpg"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}
                />
                {rcaForm.imageUrl && (
                  <img src={rcaForm.imageUrl} alt="Defect" style={{ marginTop: "1rem", width: "100%", borderRadius: "8px", maxHeight: "150px", objectFit: "cover" }} />
                )}
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Corrective Actions (CAPA)</label>
                <textarea 
                  value={rcaForm.capa} 
                  onChange={(e) => setRcaForm({...rcaForm, capa: e.target.value})}
                  rows={3}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #e2e8f0" }}
                />
              </div>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setSelectedIssue(null)} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#fff" }}>Cancel</button>
                <button type="submit" style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#1e40af", color: "#fff" }}>Save Analysis</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityAssurance;
