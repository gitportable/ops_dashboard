import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getIssues } from "../api/issueApi";
import { getUsers } from "../api/userApi";
import {
  approveRequest,
  getMyPendingApprovals,
  rejectRequest,
} from "../api/approvalApi";

const truncate = (text = "", max = 60) =>
  text.length > max ? `${text.slice(0, max)}...` : text;

const ApprovalQueue = () => {
  const queryClient = useQueryClient();

  const { data: approvals = [], isLoading, isError } = useQuery({
    queryKey: ["myApprovals"],
    queryFn: getMyPendingApprovals,
  });

  const { data: issues = [] } = useQuery({
    queryKey: ["issues"],
    queryFn: async () => {
      const r = await getIssues();
      return Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
  });

  const issueMap = useMemo(() => {
    const m = {};
    (Array.isArray(issues) ? issues : []).forEach((i) => {
      const id = i.issueid || i.issue_id || i.IssueID;
      m[id] = i;
    });
    return m;
  }, [issues]);

  const userMap = useMemo(() => {
    const m = {};
    (Array.isArray(users) ? users : []).forEach((u) => {
      m[u.id] = u.name || u.email || `User ${u.id}`;
    });
    return m;
  }, [users]);

  const handleApprove = async (id) => {
    try {
      await approveRequest(id);
      toast.success("Request approved.");
      queryClient.invalidateQueries({ queryKey: ["myApprovals"] });
    } catch {
      toast.error("Failed to approve request.");
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectRequest(id);
      toast.success("Request rejected.");
      queryClient.invalidateQueries({ queryKey: ["myApprovals"] });
    } catch {
      toast.error("Failed to reject request.");
    }
  };

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <h1 style={{ margin: 0, color: "#1e293b", fontSize: "1.55rem", fontWeight: 800 }}>
        Approval Queue
      </h1>
      <p style={{ marginTop: 6, color: "#64748b", fontSize: "0.88rem" }}>
        Pending approval requests assigned to you.
      </p>

      {isLoading && <div style={{ padding: "2rem 0", color: "#64748b" }}>Loading approvals...</div>}
      {isError && (
        <div style={{ marginTop: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "1rem" }}>
          Failed to load approvals.
        </div>
      )}

      {!isLoading && !isError && (
        <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 12, overflowX: "auto", background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                {["Issue ID", "Issue Type", "Description", "Requested By", "Date", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      color: "#64748b",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(approvals) ? approvals : []).map((a) => {
                const issue = issueMap[a.issue_id] || {};
                const issueType = issue.issuetype || issue.issue_type || "—";
                const desc = issue.description || "—";
                const requestedBy = userMap[a.requested_by] || a.requested_by || "—";
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "11px 14px", fontWeight: 700, color: "#334155" }}>#{a.issue_id}</td>
                    <td style={{ padding: "11px 14px", color: "#334155", fontSize: "0.84rem" }}>{issueType}</td>
                    <td style={{ padding: "11px 14px", color: "#334155", fontSize: "0.84rem" }}>{truncate(desc)}</td>
                    <td style={{ padding: "11px 14px", color: "#334155", fontSize: "0.84rem" }}>{requestedBy}</td>
                    <td style={{ padding: "11px 14px", color: "#64748b", fontSize: "0.82rem" }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => handleApprove(a.id)}
                          style={{
                            padding: "5px 10px",
                            border: "none",
                            borderRadius: 6,
                            background: "#dcfce7",
                            color: "#166534",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(a.id)}
                          style={{
                            padding: "5px 10px",
                            border: "none",
                            borderRadius: 6,
                            background: "#fee2e2",
                            color: "#b91c1c",
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(Array.isArray(approvals) ? approvals : []).length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                    No pending approvals.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
