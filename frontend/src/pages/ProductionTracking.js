import React, { useContext, useState } from "react";
import { toast } from "react-hot-toast";
import { AuthContext } from "../auth/AuthContext";
import { useWorkOrders } from "../api/productionApi";
import AddWorkOrderModal from "../components/AddWorkOrderModal";
import LogIssueModal from "../components/LogIssueModal";
import IssueHistoryModal from "../components/IssueHistoryModal";

const ProductionTracking = () => {
  const { role } = useContext(AuthContext) || {};
  const { data: workOrders = [], isLoading } = useWorkOrders();
  const [filterStage, setFilterStage] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [issueModal, setIssueModal] = useState({ open: false, wo: null });
  const [historyModal, setHistoryModal] = useState({ open: false, batchLot: "" });

  const filteredOrders = workOrders.map(wo => ({
    id: wo.wo_id || wo.id,
    batchLot: wo.batch_lot,
    stage: wo.stage,
    quantity: wo.quantity,
    status: wo.status,
    startDate: wo.start_date ? new Date(wo.start_date).toLocaleDateString() : '—',
    targetDate: wo.target_date ? new Date(wo.target_date).toLocaleDateString() : '—',
    defects: wo.defects,
    machine: wo.machine
  })).filter(
    (wo) => filterStage === "All" || wo.stage === filterStage
  );

  const stages = ["All", "Raw Material", "Cell", "Module", "Testing", "Dispatch", "Stringing", "Lamination", "Framing"];

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ color: "#1e40af" }}>Production Tracking & Work Orders</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{ padding: "10px 20px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
        >
          + Create New Work Order
        </button>
      </div>

      <AddWorkOrderModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      <LogIssueModal 
        isOpen={issueModal.open} 
        onClose={() => setIssueModal({ open: false, wo: null })}
        onRefresh={() => {}} // No local state to refresh on this page
        projectid={null} // Will allow user to select or use default
        initialData={issueModal.wo ? {
            batch_lot: issueModal.wo.batchLot,
            production_stage: issueModal.wo.stage,
            machine_id: issueModal.wo.machine,
            issuetype: "Defect"
        } : {}}
      />

      <IssueHistoryModal 
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, batchLot: "" })}
        batchLot={historyModal.batchLot}
      />

      <div style={{ marginBottom: "1rem" }}>
        <label>Filter by Stage: </label>
        <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} style={{ padding: "8px", marginLeft: "10px" }}>
          {stages.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p>Loading production data...</p>
      ) : (
        <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e5e7eb" }}>
                {["WO ID", "Batch/Lot", "Stage", "Quantity", "Status", "Start → Target", "Defects", "Machine", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "14px", textAlign: "left", fontWeight: 700, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((wo) => (
                <tr key={wo.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "14px", fontWeight: 600 }}>{wo.id}</td>
                  <td style={{ padding: "14px" }}>{wo.batchLot}</td>
                  <td style={{ padding: "14px" }}>{wo.stage}</td>
                  <td style={{ padding: "14px" }}>{wo.quantity?.toLocaleString() || 0}</td>
                  <td style={{ padding: "14px" }}>
                    <span style={{
                      padding: "4px 12px",
                      borderRadius: 99,
                      fontSize: "0.8rem",
                      background: wo.status === "Completed" ? "#dcfce7" : wo.status === "In Progress" ? "#dbeafe" : "#fff7ed",
                      color: wo.status === "Completed" ? "#16a34a" : wo.status === "In Progress" ? "#1d4ed8" : "#c2410c",
                    }}>
                      {wo.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px" }}>{wo.startDate} → {wo.targetDate}</td>
                  <td style={{ padding: "14px" }}>
                    <span 
                        onClick={() => setHistoryModal({ open: true, batchLot: wo.batchLot })}
                        style={{ 
                            cursor: "pointer", 
                            color: wo.defects > 0 ? "#ef4444" : "#16a34a", 
                            fontWeight: 700,
                            textDecoration: "underline"
                        }}
                    >
                        {wo.defects}
                    </span>
                   </td>
                  <td style={{ padding: "14px" }}>{wo.machine}</td>
                  <td style={{ padding: "14px" }}>
                    <button
                      onClick={() => setIssueModal({ open: true, wo })}
                      style={{ padding: "6px 14px", background: "#334155", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      Log Issue
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.9rem", color: "#64748b" }}>
        This page tracks work orders across production stages with batch/lot traceability. 
        Real-time data is served from the manufacturing database.
      </p>
    </div>
  );
};

export default ProductionTracking;