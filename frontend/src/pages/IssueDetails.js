import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getIssueById } from "../api/issueApi";

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: "1rem",
};

export default function IssueDetails() {
  const { id } = useParams();
  const rawId = id;
  const numericId = typeof rawId === "string"
    ? parseInt(rawId.replace(/^I0*/i, ""), 10)
    : rawId;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["issueDetails", id],
    queryFn: async () => {
      const response = await getIssueById(numericId);
      return response.data;
    },
    enabled: !!numericId && !Number.isNaN(numericId),
  });

  const issueRaw = data?.issue || data?.data || data;
  const issue =
    issueRaw && typeof issueRaw === "object"
      ? {
          ...issueRaw,
          attachments: Array.isArray(issueRaw.attachments)
            ? issueRaw.attachments
            : Array.isArray(issueRaw.attachments?.data)
            ? issueRaw.attachments.data
            : [],
        }
      : issueRaw;

  if (isLoading) {
    return <div style={{ padding: "2rem", color: "#64748b" }}>Loading issue details...</div>;
  }

  if (isError) {
    return (
      <div style={{ padding: "2rem", color: "#b91c1c" }}>
        Failed to load issue details{error?.message ? `: ${error.message}` : "."}
      </div>
    );
  }

  if (!issue || (typeof issue === "object" && Object.keys(issue).length === 0)) {
    return <div style={{ padding: "2rem", color: "#64748b" }}>No issue data found.</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "1.5rem 2rem" }}>
      <h1 style={{ marginTop: 0, marginBottom: "1rem", color: "#0f172a" }}>Issue #{issue.issueid || issue.issue_id || id}</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "1rem",
        }}
      >
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Issue Info</h3>
          <p><strong>Type:</strong> {issue.issuetype || issue.issue_type || "—"}</p>
          <p><strong>Status:</strong> {issue.status || "—"}</p>
          <p><strong>Sprint:</strong> {issue.sprint || "—"}</p>
          <p><strong>Priority:</strong> {issue.priority || "—"}</p>
        </div>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Assignment</h3>
          <p><strong>Project ID:</strong> {issue.projectid || issue.project_id || "—"}</p>
          <p><strong>Assignee Team:</strong> {issue.assigneeteam || "—"}</p>
          <p><strong>Created:</strong> {issue.createddate || issue.created_at || "—"}</p>
          <p><strong>Updated:</strong> {issue.updateddate || issue.updated_at || "—"}</p>
        </div>
      </div>
      <div style={{ ...cardStyle, marginTop: "1rem" }}>
        <h3 style={{ marginTop: 0, color: "#1e293b" }}>Description</h3>
        <p style={{ marginBottom: 0, color: "#334155" }}>{issue.description || "No description available."}</p>
      </div>
    </div>
  );
}
