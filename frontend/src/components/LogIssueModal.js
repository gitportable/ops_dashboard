import React, { useState, useEffect } from "react";
import { createIssue } from "../api/issueApi";

const LogIssueModal = ({ isOpen, onClose, onRefresh, projectid, initialData = {} }) => {
  const [formData, setFormData] = useState({ 
    issuetype: "Bug", 
    description: "", 
    assigneeteam: "Frontend", 
    severity: "High", 
    sprint: "Sprint 1",
    batch_lot: "",
    production_stage: "",
    machine_id: "",
    rca: "",
    capa: "",
    subtasks: [],
    priority: "Medium",
    assignee: ""
  });
  const [newSubtask, setNewSubtask] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [isOpen, initialData]);

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setFormData(prev => ({
        ...prev,
        subtasks: [...prev.subtasks, { text: newSubtask, done: false }]
    }));
    setNewSubtask("");
  };

  const removeSubtask = (index) => {
    setFormData(prev => ({
        ...prev,
        subtasks: prev.subtasks.filter((_, i) => i !== index)
    }));
  };
  
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectid && !formData.projectid) {
        alert("Please select or provide a project ID");
        return;
    }
    setSubmitting(true);
    let pId = projectid || formData.projectid;
    // Auto-prepend 'P' if user enters a number
    if (pId && !isNaN(pId)) {
        pId = `P${pId}`;
    }

    try {
      await createIssue({ ...formData, projectid: pId });
      onRefresh(); 
      onClose();
    } catch (err) { 
      alert("Failed to log issue"); 
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
      <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "12px", width: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Log New Issue</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#9ca3af" }}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {!projectid && (
            <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Project ID</label>
                <input 
                    required
                    type="number" 
                    placeholder="Enter Project ID" 
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb" }} 
                    value={formData.projectid || ""} 
                    onChange={e => setFormData({...formData, projectid: e.target.value})} 
                />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Type</label>
                <select style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb" }} value={formData.issuetype} onChange={e => setFormData({...formData, issuetype: e.target.value})}>
                    <option value="Defect">Manufacturing Defect</option>
                    <option value="Bug">Software Bug</option>
                    <option value="Task">General Task</option>
                </select>
            </div>
            <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Team</label>
                <select style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb" }} value={formData.assigneeteam} onChange={e => setFormData({...formData, assigneeteam: e.target.value})}>
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="QA">QA</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Manufacturing">Manufacturing</option>
                </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Batch / Lot</label>
                <input 
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: initialData.batch_lot ? "#f3f4f6" : "#fff" }} 
                    value={formData.batch_lot || ""} 
                    readOnly={!!initialData.batch_lot}
                    onChange={e => setFormData({...formData, batch_lot: e.target.value})} 
                />
            </div>
            <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Stage</label>
                <input 
                    style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: initialData.production_stage ? "#f3f4f6" : "#fff" }} 
                    value={formData.production_stage || ""} 
                    readOnly={!!initialData.production_stage}
                    onChange={e => setFormData({...formData, production_stage: e.target.value})} 
                />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Priority</label>
              <select style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb" }} value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Assignee</label>
              <input 
                  placeholder="Username / ID"
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb" }} 
                  value={formData.assignee || ""} 
                  onChange={e => setFormData({...formData, assignee: e.target.value})} 
              />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Machine / Line ID</label>
            <input 
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: initialData.machine_id ? "#f3f4f6" : "#fff" }} 
                value={formData.machine_id || ""} 
                readOnly={!!initialData.machine_id}
                onChange={e => setFormData({...formData, machine_id: e.target.value})} 
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Root Cause Analysis (RCA)</label>
            <textarea 
                placeholder="Why did this happen?" 
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", height: "60px", resize: "none" }} 
                value={formData.rca} 
                onChange={e => setFormData({...formData, rca: e.target.value})} 
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Corrective & Preventive Action (CAPA)</label>
            <textarea 
                placeholder="How will we prevent this?" 
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", height: "60px", resize: "none" }} 
                value={formData.capa} 
                onChange={e => setFormData({...formData, capa: e.target.value})} 
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Description / Notes</label>
            <textarea 
                required 
                placeholder="Specific details about the defect..." 
                style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", height: "80px", resize: "none" }} 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "#6b7280", marginBottom: 4 }}>Subtasks / Checklist</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input 
                    type="text" 
                    placeholder="Add a step..." 
                    style={{ flex: 1, padding: "8px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                    value={newSubtask}
                    onChange={e => setNewSubtask(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                />
                <button type="button" onClick={addSubtask} style={{ padding: "8px 12px", background: "#f1f5f9", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer" }}>Add</button>
            </div>
            <div style={{ maxHeight: "100px", overflowY: "auto" }}>
                {formData.subtasks.map((st, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: "#f8fafc", borderRadius: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: "0.8rem" }}>- {st.text}</span>
                        <button type="button" onClick={() => removeSubtask(i)} style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer" }}>&times;</button>
                    </div>
                ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
            <button type="button" onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: "8px 24px", borderRadius: 8, border: "none", background: "#1e40af", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                {submitting ? "Logging..." : "Log Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LogIssueModal;
