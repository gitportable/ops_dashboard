import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createIssue } from "../api/issueApi";
import { getProjects, getMyProjects } from "../api/projectApi";
import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";

const IssueForm = () => {
  const { role } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    projectId: "",
    sprint: "",
    issueType: "Bug",
    description: "",
    assigneeTeam: "DevOps",
  });

  const currentRole = (role || "").toLowerCase();
  const isAdminLevel = ["admin", "superadmin"].includes(currentRole);

  useEffect(() => {
    const fetchFn = isAdminLevel ? getProjects : getMyProjects;
    fetchFn()
      .then((data) => setProjects(Array.isArray(data) ? data : data?.data || []))
      .catch(() => toast.error("Could not load projects."))
      .finally(() => setLoadingProjects(false));
  }, [isAdminLevel]);

  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.projectId) {
      toast.error("Please select a project.");
      return;
    }
    setSubmitting(true);
    try {
      await createIssue(formData);
      toast.success("Issue created successfully!");
      navigate("/issues");
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to create issue. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", fontSize: "0.9rem",
    border: "1px solid #e5e7eb", borderRadius: 8, outline: "none",
    background: "#fff", color: "#1e293b", marginBottom: "1rem",
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block", fontSize: "0.8rem", fontWeight: 600,
    color: "#475569", marginBottom: "4px",
  };

  return (
    <div style={{
      maxWidth: 560, margin: "2rem auto",
      background: "#fff", borderRadius: 16,
      padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      border: "1px solid #e5e7eb",
    }}>
      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", marginBottom: "1.5rem" }}>
        Create New Issue
      </h2>

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Project *</label>
        <select
          value={formData.projectId}
          onChange={handleChange("projectId")}
          required
          disabled={loadingProjects}
          style={inputStyle}
        >
          <option value="">
            {loadingProjects ? "Loading projects…" : "Select a project"}
          </option>
          {projects.map((p) => (
            <option key={p.project_id} value={p.project_id}>
              {p.name || p.project_name || `Project ${p.project_id}`}
            </option>
          ))}
        </select>

        <label style={labelStyle}>Sprint</label>
        <input
          type="text"
          placeholder="e.g. Sprint 5"
          value={formData.sprint}
          onChange={handleChange("sprint")}
          required
          style={inputStyle}
        />

        <label style={labelStyle}>Issue Type</label>
        <select value={formData.issueType} onChange={handleChange("issueType")} style={inputStyle}>
          <option value="Bug">Bug</option>
          <option value="Task">Task</option>
        </select>

        <label style={labelStyle}>Assignee Team</label>
        <select value={formData.assigneeTeam} onChange={handleChange("assigneeTeam")} style={inputStyle}>
          <option value="DevOps">DevOps</option>
          <option value="Frontend">Frontend</option>
          <option value="Backend">Backend</option>
          <option value="QA">QA</option>
        </select>

        <label style={labelStyle}>Description *</label>
        <textarea
          placeholder="Describe the issue in detail…"
          value={formData.description}
          onChange={handleChange("description")}
          required
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb",
              background: "#f8fafc", color: "#475569", fontWeight: 600,
              cursor: "pointer", fontSize: "0.9rem",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              flex: 2, padding: "10px", borderRadius: 8, border: "none",
              background: submitting ? "#93c5fd" : "#1e40af",
              color: "#fff", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            {submitting ? "Creating…" : "Create Issue"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default IssueForm;
