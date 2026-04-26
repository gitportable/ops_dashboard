// import { updateIssueStatus } from "../api/issueApi";
// import { AuthContext } from "../auth/AuthContext";
// import { useContext } from "react";
// const IssueTable = ({ issues }) => {
//   const { user } = useContext(AuthContext)||{};
//   if (!role) {
//     return <div>Please log in to view actions.</div>;
//   }
//   return (
//     <table>
//       <thead>
//         <tr>
//           <th>ID</th>
//           <th>Type</th>
//           <th>Status</th>
//           <th>Action</th>
//         </tr>
//       </thead>
//       <tbody>
//         {issues.map((i) => (
//           <tr key={i.issue_id}>
//             <td>{i.issue_id}</td>
//             <td>{i.issue_type}</td>
//             <td>{i.status}</td>
//             <td>
//               {(user.role === "developer" || user.role === "tester") && (
//                 <button onClick={() => updateIssueStatus(i.issue_id, "Done")}>
//                   Mark Done
//                 </button>
//               )}
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// };

// export default IssueTable;


import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import { updateIssueStatus } from "../api/issueApi";

const IssueTable = ({ issues = [] }) => {
  const context = useContext(AuthContext) || {};
  const { user, role } = context;

  const currentRole = (role || user?.role || "").toLowerCase();

  if (!currentRole) {
    return (
      <div style={{ padding: "1.5rem", background: "#fee2e2", color: "#991b1b", borderRadius: "8px", textAlign: "center" }}>
        Please log in to view actions.
      </div>
    );
  }

  const canUpdate = ["developer", "tester", "admin", "superadmin"].includes(currentRole);

  const handleMarkDone = async (issueId) => {
    try {
      await updateIssueStatus(issueId, "Done");
      alert("Issue marked as Done!");
    } catch (err) {
      console.error("Failed to update issue:", err);
      alert("Failed to mark issue. Please try again.");
    }
  };

  if (issues.length === 0) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No issues found.</div>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", borderRadius: "8px", overflow: "hidden" }}>
        <thead>
          <tr style={{ background: "#1e40af", color: "white" }}>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>ID</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Type</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Status</th>
            <th style={{ padding: "12px 16px", textAlign: "left" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr 
              key={issue.issue_id || issue.IssueID} 
              style={{ borderBottom: "1px solid #e5e7eb", background: issue.status === "Done" ? "#f3f4f6" : "white" }}
            >
              <td style={{ padding: "12px 16px" }}>{issue.issue_id || issue.IssueID}</td>
              <td style={{ padding: "12px 16px" }}>{issue.issuetype || issue.issue_type || "—"}</td>
              <td style={{ padding: "12px 16px" }}>{issue.status || "Open"}</td>
              <td style={{ padding: "12px 16px" }}>
                {canUpdate && issue.status !== "Done" && (
                  <button
                    onClick={() => handleMarkDone(issue.issue_id || issue.IssueID)}
                    style={{ background: "#10b981", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    Mark Done
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IssueTable;






// import { useContext } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { updateIssueStatus } from "../api/issueApi";

// const IssueTable = ({ issues }) => {
//   const context = useContext(AuthContext) || {};
//   const { user, role } = context; // safe destructuring

//   // Use role if available in context, fallback to user?.role
//   const currentRole = role || user?.role;

//   if (!currentRole) {
//     return <div>Please log in to view actions.</div>;
//   }

//   return (
//     <table style={{ width: "100%", borderCollapse: "collapse" }}>
//       <thead>
//         <tr style={{ background: "#1e40af", color: "white" }}>
//           <th style={{ padding: "12px", textAlign: "left" }}>ID</th>
//           <th style={{ padding: "12px", textAlign: "left" }}>Type</th>
//           <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
//           <th style={{ padding: "12px", textAlign: "left" }}>Action</th>
//         </tr>
//       </thead>
//       <tbody>
//         {issues.map((issue) => (
//           <tr key={issue.issue_id} style={{ borderBottom: "1px solid #e2e8f0" }}>
//             <td style={{ padding: "12px" }}>{issue.issue_id}</td>
//             <td style={{ padding: "12px" }}>{issue.issuetype || issue.issue_type || "—"}</td>
//             <td style={{ padding: "12px" }}>{issue.status || "Open"}</td>
//             <td style={{ padding: "12px" }}>
//               {["developer", "tester", "admin", "superadmin"].includes(currentRole.toLowerCase()) && (
//                 <button
//                   onClick={() => updateIssueStatus(issue.issue_id, "Done")}
//                   style={{
//                     background: "#10b981",
//                     color: "white",
//                     border: "none",
//                     padding: "6px 12px",
//                     borderRadius: "6px",
//                     cursor: "pointer",
//                   }}
//                 >
//                   Mark Done
//                 </button>
//               )}
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// };

// export default IssueTable;