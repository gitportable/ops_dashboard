import { useEffect, useState } from "react";
import { getProjectIssues } from "../api/issueApi";

const ProjectMonitor = ({ projectId }) => {
  const [projectData, setProjectData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    getProjectIssues(projectId)
      .then((data) => setProjectData(data))
      .catch((err) => setError("Failed to load project issues."))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return (
    <div style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>
      Loading project data…
    </div>
  );

  if (error) return (
    <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>
      {error}
    </div>
  );

  if (!projectData.length) return (
    <div style={{ padding: "2rem", color: "#6b7280", textAlign: "center" }}>
      No issues found for this project.
    </div>
  );

  return (
    <div>
      <h2 style={{ marginBottom: "1rem", color: "#1e293b", fontSize: "1.1rem" }}>
        Project {projectId} — Issue Monitor
      </h2>
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e5e7eb" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
              {["Sprint", "Issue ID", "Type", "Status", "Team", "Last Updated"].map((h) => (
                <th key={h} style={{
                  padding: "10px 14px", textAlign: "left",
                  fontSize: "0.75rem", fontWeight: 700, color: "#6b7280",
                  textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projectData.map((issue) => (
              <tr key={issue.issue_id || issue.issueid} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "10px 14px", fontSize: "0.85rem" }}>{issue.sprint || "—"}</td>
                <td style={{ padding: "10px 14px", fontSize: "0.85rem", fontWeight: 600 }}>
                  #{issue.issue_id || issue.issueid}
                </td>
                <td style={{ padding: "10px 14px", fontSize: "0.85rem" }}>
                  {issue.issue_type || issue.issuetype || "—"}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
                    background: issue.status?.toLowerCase() === "done" ? "#dcfce7" : "#dbeafe",
                    color: issue.status?.toLowerCase() === "done" ? "#16a34a" : "#1d4ed8",
                  }}>
                    {issue.status || "Open"}
                  </span>
                </td>
                <td style={{ padding: "10px 14px", fontSize: "0.85rem" }}>{issue.assigneeteam || "—"}</td>
                <td style={{ padding: "10px 14px", fontSize: "0.82rem", color: "#6b7280" }}>
                  {issue.closeddate
                    ? new Date(issue.closeddate).toLocaleDateString()
                    : issue.createddate
                    ? new Date(issue.createddate).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectMonitor;
