// const issueSchema = new mongoose.Schema({
//   issueid: String,
//   projectid: String,
//   sprint: String,
//   issuetype: String,
//   status: { type: String, default: "Open" },
//   assigneeteam: String,
//   description: String,

//   // === EMMVEE SOLAR SPECIFIC FIELDS ===
//   batch_lot: String,
//   production_stage: {
//     type: String,
//     enum: ["Raw Material", "Cell", "Module", "Testing", "Dispatch"]
//   },
//   defect_type: String,
//   severity: { type: String, enum: ["Critical", "High", "Medium", "Low"], default: "Medium" },
//   image_url: String,
//   rca: String,
//   capa: String,
//   vendor_id: String,

//   createddate: { type: Date, default: Date.now },
//   closeddate: Date
// }, { timestamps: true });
// const SOLAR_DEFECT_TYPES = [
//   "Micro-crack", "PID Issue", "Hotspot", 
//   "Glass Breakage", "Cell Misalignment", "Inverter Failure"
// ];

// const PRODUCTION_STAGES = [
//   "Raw Material", "Cell", "Module", "Testing", "Dispatch"
// ];

// // In your Issue Modal / Form:
// <select name="defect_type">
//   {SOLAR_DEFECT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
// </select>

// <select name="production_stage">
//   {PRODUCTION_STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
// </select>
// module.exports = mongoose.model("Issue", issueSchema);



// Inside your Issue Modal / Form in Issues.js
const { user } = useContext(AuthContext);
const userRole = user?.role?.toLowerCase();

// Define allowed status transitions
const getStatusOptions = (currentStatus) => {
  if (userRole === 'tester') {
    return ["In Inspection", "Approved", "Rejected"];
  }
  if (userRole === 'developer') {
    return ["In Progress", "Resolved"];
  }
  return ["Open", "In Inspection", "In Progress", "Resolved", "Approved", "Closed"];
};

// ... inside the form JSX
<div className="form-group">
  <label>Status</label>
  <select name="status" defaultValue={currentIssue?.status || "Open"}>
    {getStatusOptions(currentIssue?.status).map(s => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>
</div>

{/* RCA and CAPA should only be visible/editable once a defect is being inspected */ }
{
  (currentIssue?.status !== "Open") && (
    <>
      <textarea name="rca" placeholder="Root Cause Analysis (e.g., Machine calibration error)" />
      <textarea name="capa" placeholder="Corrective & Preventive Action" />
    </>
  )
}