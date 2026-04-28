import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import api from '../api/axios'
import { getProjects } from "../api/projectApi";

const NewIssue = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projects = [] } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => getProjects().then(r => Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [])
  })
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    projectid: "",
    description: "",
    issuetype: "Task",
    sprint: "",
    assigneeteam: "none",
    status: "Open",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.projectid) {
      toast.error('Project is required')
      return;
    }

    if (!form.description.trim()) {
      toast.error("Description is required.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/issues", form);
      toast.success("Issue created successfully.");
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      navigate("/issues");
    } catch (error) {
      toast.error("Failed to create issue.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "2rem" }}>
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          boxShadow: "0 2px 10px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            background: "#1e3a8a",
            color: "#fff",
            padding: "1rem 1.25rem",
            fontSize: "1.2rem",
            fontWeight: 800,
          }}
        >
          Create New Issue
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "1.25rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.9rem" }}>
                Project
              </label>
              <select
                value={form.projectid}
                onChange={(e) => setForm({ ...form, projectid: e.target.value })}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.projectid} value={p.projectid}>{p.projectname}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.9rem" }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  outline: "none",
                  resize: "vertical",
                }}
                placeholder="Describe the issue..."
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.9rem" }}>
                Issue Type
              </label>
              <select
                value={form.issuetype}
                onChange={(e) => handleChange("issuetype", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
              >
                <option value="Bug">Bug</option>
                <option value="Task">Task</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.9rem" }}>
                Sprint
              </label>
              <input
                type="text"
                value={form.sprint}
                onChange={(e) => handleChange("sprint", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                placeholder="Sprint 1"
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.9rem" }}>
                Assignee Team
              </label>
              <select
                value={form.assigneeteam}
                onChange={(e) => handleChange("assigneeteam", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
              >
                <option value="none">None (No Team)</option>
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="DevOps">DevOps</option>
                <option value="QA">QA</option>
                <option value="Testing">Testing</option>
                <option value="Field Service">Field Service</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: 6, color: "#334155", fontWeight: 600, fontSize: "0.9rem" }}>
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => handleChange("status", e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
              >
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={() => navigate("/issues")}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "none",
                background: "#1e3a8a",
                color: "#fff",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Creating..." : "Create Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewIssue;
