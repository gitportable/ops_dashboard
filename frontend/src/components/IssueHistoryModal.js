import React, { useState, useEffect } from "react";
import api from "../api/axios";

const IssueHistoryModal = ({ isOpen, onClose, batchLot }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && batchLot) {
      setLoading(true);
      api.get(`/issues/batch/${batchLot}`)
        .then(res => {
          setIssues(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, batchLot]);

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: 12, width: "800px", maxWidth: "90%", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ margin: 0, color: "#1e40af" }}>Quality History: {batchLot}</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#64748b" }}>All defects and tasks recorded for this batch.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#9ca3af" }}>&times;</button>
        </div>

        {loading ? (
          <p>Loading quality history...</p>
        ) : issues.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
            <p style={{ fontSize: "1.2rem" }}>No quality issues recorded for this batch.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", textAlign: "left" }}>ID</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Severity</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>RCA</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>CAPA</th>
                  <th style={{ padding: "12px", textAlign: "left" }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {issues.map(issue => (
                  <tr key={issue.issueid} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", fontWeight: 600 }}>{issue.issueid}</td>
                    <td style={{ padding: "12px" }}>{issue.issuetype}</td>
                    <td style={{ padding: "12px" }}>
                        <span style={{ 
                            padding: "4px 10px", 
                            borderRadius: 99, 
                            fontSize: "0.75rem", 
                            background: issue.status === "Open" ? "#fee2e2" : "#dcfce7",
                            color: issue.status === "Open" ? "#ef4444" : "#16a34a"
                        }}>
                            {issue.status}
                        </span>
                    </td>
                    <td style={{ padding: "12px" }}>{issue.severity}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>{issue.rca || "—"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>{issue.capa || "—"}</td>
                    <td style={{ padding: "12px", fontSize: "0.85rem" }}>{new Date(issue.createddate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueHistoryModal;
