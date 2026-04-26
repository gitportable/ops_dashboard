// src/components/IssueForm.js
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createIssue } from "../api/issueApi";
import { getMyProjects } from "../api/projectApi";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";

const IssueForm = () => {
  const { role } = useContext(AuthContext) || {};
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [formData, setFormData] = useState({
    projectId: "",
    sprint: "",
    issueType: "Bug",
    description: "",
    assigneeTeam: "Module",
    batchLot: "",
    productionStage: "Module",
    defectType: "",
    severity: "Medium",
    image: null
  });

  useEffect(() => {
    getMyProjects().then(data => {
      setProjects(Array.isArray(data) ? data : data?.data || []);
      setLoadingProjects(false);
    });
  }, []);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleFile = (e) => {
    setFormData(prev => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId) return toast.error("Project is required");

    const fd = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key] !== null) fd.append(key, formData[key]);
    });

    try {
      await createIssue(fd);
      toast.success("Issue created successfully!");
      navigate("/issues");
    } catch (err) {
      toast.error("Failed to create issue");
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "2rem", background: "#fff", borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem" }}>Create Solar Issue</h2>

      <form onSubmit={handleSubmit}>
        <select value={formData.projectId} onChange={handleChange("projectId")} required style={{ width: "100%", padding: "10px", marginBottom: 12 }}>
          <option value="">Select Project</option>
          {projects.map(p => (
            <option key={p.project_id} value={p.project_id}>{p.name || p.projectname}</option>
          ))}
        </select>

        <input type="text" placeholder="Sprint" value={formData.sprint} onChange={handleChange("sprint")} style={{ width: "100%", padding: "10px", marginBottom: 12 }} />

        <select value={formData.issueType} onChange={handleChange("issueType")} style={{ width: "100%", padding: "10px", marginBottom: 12 }}>
          <option value="Bug">Bug</option>
          <option value="Task">Task</option>
        </select>

        <select value={formData.productionStage} onChange={handleChange("productionStage")} style={{ width: "100%", padding: "10px", marginBottom: 12 }}>
          <option value="Raw Material">Raw Material</option>
          <option value="Cell">Cell</option>
          <option value="Module">Module</option>
          <option value="Testing">Testing</option>
          <option value="Dispatch">Dispatch</option>
        </select>

        <input type="text" placeholder="Batch/Lot Number" value={formData.batchLot} onChange={handleChange("batchLot")} style={{ width: "100%", padding: "10px", marginBottom: 12 }} />

        <select value={formData.defectType} onChange={handleChange("defectType")} style={{ width: "100%", padding: "10px", marginBottom: 12 }}>
          <option value="">Defect Type (if applicable)</option>
          <option value="Crack">Crack</option>
          <option value="PID">PID</option>
          <option value="Hotspot">Hotspot</option>
          <option value="Discoloration">Discoloration</option>
          <option value="Junction Box">Junction Box Issue</option>
        </select>

        <select value={formData.severity} onChange={handleChange("severity")} style={{ width: "100%", padding: "10px", marginBottom: 12 }}>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <input type="file" onChange={handleFile} accept="image/*" style={{ marginBottom: 12 }} />

        <textarea placeholder="Description" value={formData.description} onChange={handleChange("description")} rows={4} style={{ width: "100%", padding: "10px", marginBottom: 12 }} required />

        <button type="submit" style={{ width: "100%", padding: "12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700 }}>
          Create Issue
        </button>
      </form>
    </div>
  );
};

export default IssueForm;
// import { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { toast } from "react-hot-toast";
// import { createIssue } from "../api/issueApi";
// import { getProjects, getMyProjects } from "../api/projectApi";
// import { useContext } from "react";
// import { AuthContext } from "../auth/AuthContext";

// const IssueForm = () => {
//   const { role } = useContext(AuthContext) || {};
//   const navigate = useNavigate();
//   const [projects, setProjects] = useState([]);
//   const [loadingProjects, setLoadingProjects] = useState(true);
//   const [submitting, setSubmitting] = useState(false);

//   const [formData, setFormData] = useState({
//     projectId: "",
//     sprint: "",
//     issueType: "Bug",
//     description: "",
//     assigneeTeam: "DevOps",
//   });

//   const currentRole = (role || "").toLowerCase();
//   const isAdminLevel = ["admin", "superadmin"].includes(currentRole);

//   useEffect(() => {
//     // Admins see all projects; devs/testers see only their assigned ones
//     const fetchFn = isAdminLevel ? getProjects : getMyProjects;
//     fetchFn()
//       .then((data) => setProjects(Array.isArray(data) ? data : data?.data || []))
//       .catch(() => toast.error("Could not load projects."))
//       .finally(() => setLoadingProjects(false));
//   }, [isAdminLevel]);

//   const handleChange = (field) => (e) =>
//     setFormData((prev) => ({ ...prev, [field]: e.target.value }));

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!formData.projectId) {
//       toast.error("Please select a project.");
//       return;
//     }
//     setSubmitting(true);
//     try {
//       await createIssue(formData);
//       toast.success("Issue created successfully!");
//       navigate("/issues");
//     } catch (err) {
//       toast.error(err?.response?.data?.error || "Failed to create issue. Please try again.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const inputStyle = {
//     width: "100%", padding: "9px 12px", fontSize: "0.9rem",
//     border: "1px solid #e5e7eb", borderRadius: 8, outline: "none",
//     background: "#fff", color: "#1e293b", marginBottom: "1rem",
//     fontFamily: "inherit",
//   };

//   const labelStyle = {
//     display: "block", fontSize: "0.8rem", fontWeight: 600,
//     color: "#475569", marginBottom: "4px",
//   };

//   return (
//     <div style={{
//       maxWidth: 560, margin: "2rem auto",
//       background: "#fff", borderRadius: 16,
//       padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
//       border: "1px solid #e5e7eb",
//     }}>
//       <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", marginBottom: "1.5rem" }}>
//         Create New Issue
//       </h2>

//       <form onSubmit={handleSubmit}>
//         <label style={labelStyle}>Project *</label>
//         <select
//           value={formData.projectId}
//           onChange={handleChange("projectId")}
//           required
//           disabled={loadingProjects}
//           style={inputStyle}
//         >
//           <option value="">
//             {loadingProjects ? "Loading projects…" : "Select a project"}
//           </option>
//           {projects.map((p) => (
//             <option key={p.project_id} value={p.project_id}>
//               {p.name || p.project_name || `Project ${p.project_id}`}
//             </option>
//           ))}
//         </select>

//         <label style={labelStyle}>Sprint</label>
//         <input
//           type="text"
//           placeholder="e.g. Sprint 5"
//           value={formData.sprint}
//           onChange={handleChange("sprint")}
//           required
//           style={inputStyle}
//         />

//         <label style={labelStyle}>Issue Type</label>
//         <select value={formData.issueType} onChange={handleChange("issueType")} style={inputStyle}>
//           <option value="Bug">Bug</option>
//           <option value="Task">Task</option>
//         </select>

//         <label style={labelStyle}>Assignee Team</label>
//         <select value={formData.assigneeTeam} onChange={handleChange("assigneeTeam")} style={inputStyle}>
//           <option value="DevOps">DevOps</option>
//           <option value="Frontend">Frontend</option>
//           <option value="Backend">Backend</option>
//           <option value="QA">QA</option>
//         </select>

//         <label style={labelStyle}>Description *</label>
//         <textarea
//           placeholder="Describe the issue in detail…"
//           value={formData.description}
//           onChange={handleChange("description")}
//           required
//           rows={4}
//           style={{ ...inputStyle, resize: "vertical" }}
//         />

//         <div style={{ display: "flex", gap: 10 }}>
//           <button
//             type="button"
//             onClick={() => navigate(-1)}
//             style={{
//               flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb",
//               background: "#f8fafc", color: "#475569", fontWeight: 600,
//               cursor: "pointer", fontSize: "0.9rem",
//             }}
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             disabled={submitting}
//             style={{
//               flex: 2, padding: "10px", borderRadius: 8, border: "none",
//               background: submitting ? "#93c5fd" : "#1e40af",
//               color: "#fff", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
//               fontSize: "0.9rem",
//             }}
//           >
//             {submitting ? "Creating…" : "Create Issue"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default IssueForm;

// import { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { createIssue } from '../api/issueApi'; // New API call

// const IssueForm = () => {
//   const [formData, setFormData] = useState({ projectId: '', sprint: '', issueType: 'Bug', description: '', assigneeTeam: 'DevOps' });
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await createIssue(formData);
//       alert('Issue created!'); // Toast later
//       navigate('/issues');
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit}>
//       <select value={formData.projectId} onChange={(e) => setFormData({...formData, projectId: e.target.value})} required>
//         <option value="">Select Project</option>
//         {/* Fetch projects via API and map */}
//       </select>
//       <input type="text" placeholder="Sprint (e.g., Sprint 5)" value={formData.sprint} onChange={(e) => setFormData({...formData, sprint: e.target.value})} required />
//       <select value={formData.issueType} onChange={(e) => setFormData({...formData, issueType: e.target.value})}>
//         <option value="Bug">Bug</option>
//         <option value="Task">Task</option>
//       </select>
//       <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
//       <select value={formData.assigneeTeam} onChange={(e) => setFormData({...formData, assigneeTeam: e.target.value})}>
//         <option value="DevOps">DevOps</option>
//         <option value="Frontend">Frontend</option>
//         <option value="Backend">Backend</option>
//         <option value="QA">QA</option>
//       </select>
//       <button type="submit">Create Issue</button>
//     </form>
//   );
// };

// export default IssueForm;