import { useContext, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { AuthContext } from "../auth/AuthContext";
import { getProjects } from "../api/projectApi";
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorIssues,
  logVendorIssue,
  updateVendorIssueStatus,
  getPurchaseOrders,
  createPO,
  updatePO,
  deletePO,
} from "../api/vendorApi";

const TABS = [
  { key: "vendors", label: "Vendors" },
  { key: "issues", label: "Vendor Issues" },
  { key: "pos", label: "Purchase Orders" },
];

const severityColors = {
  Low: { bg: "#dcfce7", color: "#16a34a" },
  Medium: { bg: "#ffedd5", color: "#c2410c" },
  High: { bg: "#fee2e2", color: "#b91c1c" },
};

const statusColors = {
  Pending: { bg: "#f3f4f6", color: "#6b7280" },
  Approved: { bg: "#dbeafe", color: "#1d4ed8" },
  Shipped: { bg: "#ede9fe", color: "#6d28d9" },
  Received: { bg: "#dcfce7", color: "#16a34a" },
  Cancelled: { bg: "#fee2e2", color: "#b91c1c" },
};

const issueStatusColors = {
  Open: { bg: "#f3f4f6", color: "#6b7280" },
  "In Progress": { bg: "#dbeafe", color: "#1d4ed8" },
  Resolved: { bg: "#dcfce7", color: "#16a34a" },
  Closed: { bg: "#e5e7eb", color: "#6b7280" },
};

const paymentStatusColors = {
  Unpaid: { bg: "#fee2e2", color: "#b91c1c" },
  "Partially Paid": { bg: "#ffedd5", color: "#c2410c" },
  Paid: { bg: "#dcfce7", color: "#16a34a" },
};

const qualityCheckColors = {
  Pending: { bg: "#f3f4f6", color: "#6b7280" },
  Passed: { bg: "#dcfce7", color: "#16a34a" },
  Failed: { bg: "#fee2e2", color: "#b91c1c" },
  "On Hold": { bg: "#fef3c7", color: "#92400e" },
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const VendorManagement = () => {
  const { role } = useContext(AuthContext) || {};
  const currentRole = (role || "").toLowerCase();
  const isSuperadmin = currentRole === "superadmin";
  const canEdit = ["superadmin", "admin"].includes(currentRole);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("vendors");
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [vendorFormOpen, setVendorFormOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    material: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    status: "Active",
    notes: "",
  });

  const [poFormOpen, setPoFormOpen] = useState(false);
  const [editingPoId, setEditingPoId] = useState(null);
  const [poForm, setPoForm] = useState({
    po_number: "",
    vendor_id: "",
    invoice_number: "",
    gst_number: "",
    payment_terms: "",
    material_category: "",
    quantity: "",
    unit_price: "",
    tax_amount: "",
    total_amount: "",
    amount: "",
    status: "Pending",
    payment_status: "Unpaid",
    expected_date: "",
    received_date: "",
    delivery_address: "",
    quality_check_status: "Pending",
    remarks: "",
    project_id: "",
  });
  const [issueForm, setIssueForm] = useState({
    issue_type: "",
    description: "",
    severity: "Medium",
    impact_area: "",
    quantity_affected: "",
    estimated_loss: "",
    due_date: "",
    resolution_notes: "",
  });
  const [issueFormOpen, setIssueFormOpen] = useState(false);

  const { data: vendors = [] } = useQuery({
    queryKey: ["vendors"],
    queryFn: () =>
      getVendors().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchaseOrders"],
    queryFn: () =>
      getPurchaseOrders().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["allProjects"],
    queryFn: () =>
      getProjects().then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 5 * 60 * 1000,
  });

  const vendorMap = useMemo(() => {
    const map = new Map();
    vendors.forEach((v) => map.set(v.id, v));
    return map;
  }, [vendors]);

  const projectOptions = useMemo(() => {
    return projects.map((p) => ({
      id: String(p.projectid || p.project_id || p.ProjectID || "").trim(),
      name: p.projectname || p.name || p.project_name || p.projectid || p.project_id,
    })).filter((p) => p.id);
  }, [projects]);

  const poStats = useMemo(() => {
    const totalPOs = purchaseOrders.length;
    const pendingPayment = purchaseOrders.filter((po) => (po.payment_status || "Unpaid") !== "Paid").length;
    const qualityFailed = purchaseOrders.filter((po) => po.quality_check_status === "Failed").length;
    const totalValue = purchaseOrders.reduce((sum, po) => {
      const value = po.total_amount ?? po.amount;
      const parsed = Number(value);
      return sum + (Number.isNaN(parsed) ? 0 : parsed);
    }, 0);
    return { totalPOs, pendingPayment, qualityFailed, totalValue };
  }, [purchaseOrders]);

  const { data: allIssues = [] } = useQuery({
    queryKey: ["vendorIssuesAll", vendors.map((v) => v.id).join("|")],
    enabled: vendors.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        vendors.map((v) =>
          getVendorIssues(v.id).then((r) => {
            const data = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
            return data.map((issue) => ({ ...issue, vendor_name: v.name, vendor_id: v.id }));
          })
        )
      );
      return results.flat();
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: vendorIssues = [] } = useQuery({
    queryKey: ["vendorIssues", selectedVendor?.id],
    enabled: !!selectedVendor?.id,
    queryFn: () =>
      getVendorIssues(selectedVendor.id).then((r) =>
        Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []
      ),
    staleTime: 60 * 1000,
  });

  const vendorCreate = useMutation({
    mutationFn: (data) => createVendor(data),
    onSuccess: () => {
      toast.success("Vendor created.");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setVendorFormOpen(false);
    },
    onError: () => toast.error("Failed to create vendor."),
  });

  const vendorUpdate = useMutation({
    mutationFn: ({ id, data }) => updateVendor(id, data),
    onSuccess: () => {
      toast.success("Vendor updated.");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setVendorFormOpen(false);
    },
    onError: () => toast.error("Failed to update vendor."),
  });

  const vendorDelete = useMutation({
    mutationFn: (id) => deleteVendor(id),
    onSuccess: () => {
      toast.success("Vendor deleted.");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: () => toast.error("Failed to delete vendor."),
  });

  const issueStatusUpdate = useMutation({
    mutationFn: ({ id, status }) => updateVendorIssueStatus(id, { status }),
    onSuccess: () => {
      toast.success("Issue status updated.");
      queryClient.invalidateQueries({ queryKey: ["vendorIssuesAll"] });
      if (selectedVendor?.id) {
        queryClient.invalidateQueries({ queryKey: ["vendorIssues", selectedVendor.id] });
      }
    },
    onError: () => toast.error("Failed to update status."),
  });

  const poCreate = useMutation({
    mutationFn: (data) => createPO(data),
    onSuccess: () => {
      toast.success("Purchase order created.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      setPoFormOpen(false);
    },
    onError: () => toast.error("Failed to create purchase order."),
  });

  const poUpdate = useMutation({
    mutationFn: ({ id, data }) => updatePO(id, data),
    onSuccess: () => {
      toast.success("Purchase order updated.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      setPoFormOpen(false);
    },
    onError: () => toast.error("Failed to update purchase order."),
  });

  const poDelete = useMutation({
    mutationFn: (id) => deletePO(id),
    onSuccess: () => {
      toast.success("Purchase order deleted.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
    onError: () => toast.error("Failed to delete purchase order."),
  });
  const logIssueMutation = useMutation({
    mutationFn: (data) => logVendorIssue(selectedVendor.id, data),
    onSuccess: () => {
      toast.success("Issue logged.");
      setIssueForm({
        issue_type: "",
        description: "",
        severity: "Medium",
        impact_area: "",
        quantity_affected: "",
        estimated_loss: "",
        due_date: "",
        resolution_notes: "",
      });
      setIssueFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["vendorIssues", selectedVendor?.id] });
      queryClient.invalidateQueries({ queryKey: ["vendorIssuesAll"] });
    },
    onError: () => toast.error("Failed to log issue."),
  });

  const resetVendorForm = () => {
    setEditingVendorId(null);
    setVendorForm({
      name: "",
      material: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      status: "Active",
      notes: "",
    });
  };

  const openVendorCreate = () => {
    resetVendorForm();
    setVendorFormOpen(true);
  };

  const openVendorEdit = (vendor) => {
    setEditingVendorId(vendor.id);
    setVendorForm({
      name: vendor.name || "",
      material: vendor.material || vendor.material_type || "",
      contact_name: vendor.contact_name || "",
      contact_email: vendor.contact_email || "",
      contact_phone: vendor.contact_phone || "",
      status: vendor.status || "Active",
      notes: vendor.notes || "",
    });
    setVendorFormOpen(true);
  };

  const submitVendor = (e) => {
    e.preventDefault();
    if (!vendorForm.name.trim()) {
      toast.error("Vendor name is required.");
      return;
    }
    const payload = {
      name: vendorForm.name.trim(),
      contact_name: vendorForm.contact_name || null,
      contact_email: vendorForm.contact_email || null,
      contact_phone: vendorForm.contact_phone || null,
      address: vendorForm.material || null,
      notes: vendorForm.notes || null,
    };
    if (editingVendorId) {
      vendorUpdate.mutate({ id: editingVendorId, data: payload });
    } else {
      vendorCreate.mutate(payload);
    }
  };

  const resetPoForm = () => {
    setEditingPoId(null);
    setPoForm({
      po_number: "",
      vendor_id: "",
      invoice_number: "",
      gst_number: "",
      payment_terms: "",
      material_category: "",
      quantity: "",
      unit_price: "",
      tax_amount: "",
      total_amount: "",
      amount: "",
      status: "Pending",
      payment_status: "Unpaid",
      expected_date: "",
      received_date: "",
      delivery_address: "",
      quality_check_status: "Pending",
      remarks: "",
      project_id: "",
    });
  };

  const openPoCreate = () => {
    resetPoForm();
    setPoFormOpen(true);
  };

  const openPoEdit = (po) => {
    setEditingPoId(po.id);
    setPoForm({
      po_number: po.po_number || "",
      vendor_id: po.vendor_id || "",
      invoice_number: po.invoice_number || "",
      gst_number: po.gst_number || "",
      payment_terms: po.payment_terms || "",
      material_category: po.material_category || "",
      quantity: po.quantity ?? "",
      unit_price: po.unit_price ?? "",
      tax_amount: po.tax_amount ?? "",
      total_amount: po.total_amount ?? "",
      amount: po.amount ?? "",
      status: po.status || "Pending",
      payment_status: po.payment_status || "Unpaid",
      expected_date: po.expected_date ? String(po.expected_date).slice(0, 10) : "",
      received_date: po.received_date ? String(po.received_date).slice(0, 10) : "",
      delivery_address: po.delivery_address || "",
      quality_check_status: po.quality_check_status || "Pending",
      remarks: po.remarks || "",
      project_id: po.project_id || "",
    });
    setPoFormOpen(true);
  };

  const updatePoPricing = (field, value) => {
    setPoForm((prev) => {
      const next = { ...prev, [field]: value };
      if (next.quantity === "" && next.unit_price === "" && next.tax_amount === "") {
        next.total_amount = "";
        return next;
      }
      const quantity = Number(next.quantity) || 0;
      const unitPrice = Number(next.unit_price) || 0;
      const taxAmount = Number(next.tax_amount) || 0;
      next.total_amount = String(quantity * unitPrice + taxAmount);
      return next;
    });
  };

  const submitPo = (e) => {
    e.preventDefault();
    if (!poForm.po_number || !poForm.vendor_id) {
      toast.error("PO Number and Vendor are required.");
      return;
    }
    const payload = {
      ...poForm,
      amount: poForm.amount === "" ? null : Number(poForm.amount),
      quantity: poForm.quantity === "" ? null : Number(poForm.quantity),
      unit_price: poForm.unit_price === "" ? null : Number(poForm.unit_price),
      tax_amount: poForm.tax_amount === "" ? null : Number(poForm.tax_amount),
      total_amount: poForm.total_amount === "" ? null : Number(poForm.total_amount),
      expected_date: poForm.expected_date || null,
      received_date: poForm.received_date || null,
      project_id: poForm.project_id || null,
    };
    if (editingPoId) {
      poUpdate.mutate({ id: editingPoId, data: payload });
    } else {
      poCreate.mutate(payload);
    }
  };

  const vendorPanel = selectedVendor && (
    <div
      style={{
        position: "fixed",
        right: 20,
        top: 80,
        width: 360,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
        padding: "1.25rem",
        zIndex: 1400,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, color: "#1e3a8a" }}>{selectedVendor.name}</h3>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
            Vendor Issues
          </p>
        </div>
        <button
          onClick={() => setSelectedVendor(null)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: "1.2rem",
            color: "#6b7280",
          }}
        >
          ×
        </button>
      </div>
      {canEdit && (
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={() => setIssueFormOpen((open) => !open)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#1e3a8a",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Log Issue
          </button>
        </div>
      )}
      {canEdit && issueFormOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!issueForm.issue_type.trim() || !issueForm.description.trim()) {
              toast.error("Issue type and description are required.");
              return;
            }
            const payload = {
              ...issueForm,
              impact_area: issueForm.impact_area || null,
              quantity_affected: issueForm.quantity_affected === "" ? null : Number(issueForm.quantity_affected),
              estimated_loss: issueForm.estimated_loss === "" ? null : Number(issueForm.estimated_loss),
              due_date: issueForm.due_date || null,
              resolution_notes: issueForm.resolution_notes || null,
            };
            logIssueMutation.mutate(payload);
          }}
          style={{ marginTop: 10, display: "grid", gap: 8 }}
        >
          <select
            value={issueForm.issue_type}
            onChange={(e) => setIssueForm((prev) => ({ ...prev, issue_type: e.target.value }))}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
              background: "#fff",
            }}
          >
            <option value="">Select Issue Type</option>
            {[
              "Delayed Material",
              "Quality Issue",
              "Invoice Dispute",
              "Short Shipment",
              "Wrong Specification",
              "Damaged Goods",
              "Price Dispute",
              "Other",
            ].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <textarea
            rows={3}
            placeholder="Description"
            value={issueForm.description}
            onChange={(e) => setIssueForm((prev) => ({ ...prev, description: e.target.value }))}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
              resize: "vertical",
            }}
          />
          <input
            type="text"
            placeholder="Impact Area e.g. Production Line"
            value={issueForm.impact_area}
            onChange={(e) => setIssueForm((prev) => ({ ...prev, impact_area: e.target.value }))}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
            }}
          />
          <input
            type="number"
            placeholder="Quantity Affected"
            value={issueForm.quantity_affected}
            onChange={(e) => setIssueForm((prev) => ({ ...prev, quantity_affected: e.target.value }))}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
            }}
          />
          <input
            type="number"
            placeholder="Estimated Loss (₹)"
            value={issueForm.estimated_loss}
            onChange={(e) => setIssueForm((prev) => ({ ...prev, estimated_loss: e.target.value }))}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
            }}
          />
          <label style={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 600 }}>
            Resolution Due Date
          </label>
          <input
            type="date"
            value={issueForm.due_date}
            onChange={(e) => setIssueForm((prev) => ({ ...prev, due_date: e.target.value }))}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
            }}
          />
          <textarea
            rows={2}
            placeholder="Resolution Notes"
            value={issueForm.resolution_notes}
            onChange={(e) => setIssueForm((prev) => ({ ...prev, resolution_notes: e.target.value }))}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
              resize: "vertical",
            }}
          />
          <select
            value={issueForm.severity}
            onChange={(e) => setIssueForm((prev) => ({ ...prev, severity: e.target.value }))}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              fontSize: "0.85rem",
            }}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <button
            type="submit"
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "none",
              background: "#1e3a8a",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Submit Issue
          </button>
        </form>
      )}
      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        {vendorIssues.length === 0 && (
          <div style={{ color: "#9ca3af", fontSize: "0.85rem" }}>No issues logged.</div>
        )}
        {vendorIssues.map((issue) => {
          const sevStyle = severityColors[issue.severity] || severityColors.Medium;
          const stStyle = issueStatusColors[issue.status] || { bg: "#f3f4f6", color: "#6b7280" };
          const dueDate = issue.due_date ? new Date(issue.due_date) : null;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const isOverdue = dueDate && dueDate < today && (issue.status || "Open") === "Open";
          return (
            <div key={issue.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px" }}>
              <div style={{ fontWeight: 700, color: "#1e293b" }}>{issue.issue_type}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: 4 }}>
                {issue.description}
              </div>
              {issue.impact_area && (
                <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: 6 }}>
                  Impact Area: <span style={{ fontWeight: 600 }}>{issue.impact_area}</span>
                </div>
              )}
              {issue.estimated_loss !== null && issue.estimated_loss !== undefined && issue.estimated_loss !== "" && (
                <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: 4 }}>
                  Estimated Loss: <span style={{ fontWeight: 600 }}>{formatCurrency(issue.estimated_loss)}</span>
                </div>
              )}
              {issue.due_date && (
                <div style={{ marginTop: 4, fontSize: "0.78rem", color: "#475569", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  Due: <span style={{ fontWeight: 600 }}>{new Date(issue.due_date).toLocaleDateString()}</span>
                  {isOverdue && (
                    <span style={{ padding: "2px 8px", borderRadius: 999, background: "#fee2e2", color: "#b91c1c", fontSize: "0.68rem", fontWeight: 700 }}>
                      Overdue
                    </span>
                  )}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                <span style={{ padding: "2px 8px", borderRadius: 999, background: sevStyle.bg, color: sevStyle.color, fontSize: "0.7rem", fontWeight: 700 }}>
                  {issue.severity || "Medium"}
                </span>
                <span style={{ padding: "2px 8px", borderRadius: 999, background: stStyle.bg, color: stStyle.color, fontSize: "0.7rem", fontWeight: 700 }}>
                  {issue.status || "Open"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e3a8a", margin: 0 }}>
          Vendor Management
        </h1>
        <p style={{ color: "#6b7280", marginTop: 6 }}>
          Track vendors, issues, and purchase orders.
        </p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: activeTab === tab.key ? "#1e3a8a" : "#fff",
              color: activeTab === tab.key ? "#fff" : "#334155",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "vendors" && (
        <>
          {isSuperadmin && (
            <button
              onClick={openVendorCreate}
              style={{
                padding: "10px 16px",
                background: "#1e3a8a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: "1rem",
              }}
            >
              + Create Vendor
            </button>
          )}

          {vendorFormOpen && isSuperadmin && (
            <form
              onSubmit={submitVendor}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "1.5rem",
                marginBottom: "1.5rem",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                <input
                  placeholder="Vendor Name"
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  placeholder="Material"
                  value={vendorForm.material}
                  onChange={(e) => setVendorForm({ ...vendorForm, material: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  placeholder="Contact Name"
                  value={vendorForm.contact_name}
                  onChange={(e) => setVendorForm({ ...vendorForm, contact_name: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  placeholder="Contact Email"
                  value={vendorForm.contact_email}
                  onChange={(e) => setVendorForm({ ...vendorForm, contact_email: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  placeholder="Contact Phone"
                  value={vendorForm.contact_phone}
                  onChange={(e) => setVendorForm({ ...vendorForm, contact_phone: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </div>
              <textarea
                placeholder="Notes"
                value={vendorForm.notes}
                onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                style={{ marginTop: 12, width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setVendorFormOpen(false);
                    resetVendorForm();
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #1e3a8a",
                    background: "#1e3a8a",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {editingVendorId ? "Update Vendor" : "Create Vendor"}
                </button>
              </div>
            </form>
          )}

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Name", "Material", "Contact", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => {
                  const statusStyle = vendor.status === "Inactive"
                    ? { bg: "#fee2e2", color: "#b91c1c" }
                    : { bg: "#dcfce7", color: "#16a34a" };
                  return (
                    <tr key={vendor.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "#1d4ed8",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {vendor.name}
                        </button>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#374151" }}>
                        {vendor.material || vendor.material_type || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#374151" }}>
                        {(vendor.contact_name || vendor.contact_email || vendor.contact_phone) ? (
                          <div>
                            <div>{vendor.contact_name || "—"}</div>
                            <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
                              {vendor.contact_email || vendor.contact_phone || ""}
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {vendor.status || "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {isSuperadmin ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => openVendorEdit(vendor)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "1px solid #dbeafe",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (!window.confirm(`Delete vendor "${vendor.name}"?`)) return;
                                vendorDelete.mutate(vendor.id);
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "1px solid #fecaca",
                                background: "#fef2f2",
                                color: "#b91c1c",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af" }}>
                      No vendors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {vendorPanel}
        </>
      )}

      {activeTab === "issues" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Vendor", "Issue Type", "Severity", "Status", "Reported By", "Date", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "12px 14px",
                      textAlign: "left",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allIssues.map((issue) => {
                const sevStyle = severityColors[issue.severity] || severityColors.Medium;
                const stStyle = issueStatusColors[issue.status] || { bg: "#f3f4f6", color: "#6b7280" };
                return (
                  <tr key={issue.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", color: "#1e293b", fontWeight: 700 }}>
                      {issue.vendor_name || vendorMap.get(issue.vendor_id)?.name || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#374151" }}>{issue.issue_type}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: 999, background: sevStyle.bg, color: sevStyle.color, fontSize: "0.75rem", fontWeight: 700 }}>
                        {issue.severity || "Medium"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: 999, background: stStyle.bg, color: stStyle.color, fontSize: "0.75rem", fontWeight: 700 }}>
                        {issue.status || "Open"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>
                      {issue.reported_by || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#6b7280" }}>
                      {issue.created_at ? new Date(issue.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      {canEdit ? (
                        <select
                          defaultValue={issue.status || "Open"}
                          onChange={(e) => issueStatusUpdate.mutate({ id: issue.id, status: e.target.value })}
                          style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff" }}
                        >
                          {["Open", "In Progress", "Resolved", "Closed"].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {allIssues.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af" }}>
                    No vendor issues found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "pos" && (
        <>
          {canEdit && (
            <button
              onClick={openPoCreate}
              style={{
                padding: "10px 16px",
                background: "#1e3a8a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                cursor: "pointer",
                marginBottom: "1rem",
              }}
            >
              + Create Purchase Order
            </button>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: "1rem" }}>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px" }}>
              <div style={{ color: "#6b7280", fontSize: "0.78rem" }}>Total POs</div>
              <div style={{ marginTop: 4, fontSize: "1.2rem", fontWeight: 800, color: "#1e293b" }}>{poStats.totalPOs}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px" }}>
              <div style={{ color: "#6b7280", fontSize: "0.78rem" }}>Pending Payment</div>
              <div style={{ marginTop: 4, fontSize: "1.2rem", fontWeight: 800, color: "#c2410c" }}>{poStats.pendingPayment}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px" }}>
              <div style={{ color: "#6b7280", fontSize: "0.78rem" }}>Quality Failed</div>
              <div style={{ marginTop: 4, fontSize: "1.2rem", fontWeight: 800, color: "#b91c1c" }}>{poStats.qualityFailed}</div>
            </div>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px" }}>
              <div style={{ color: "#6b7280", fontSize: "0.78rem" }}>Total Value (₹)</div>
              <div style={{ marginTop: 4, fontSize: "1.2rem", fontWeight: 800, color: "#1e293b" }}>{formatCurrency(poStats.totalValue)}</div>
            </div>
          </div>

          {poFormOpen && canEdit && (
            <form
              onSubmit={submitPo}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: "1.5rem",
                marginBottom: "1.5rem",
                boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ marginBottom: 8, fontSize: "0.82rem", color: "#1e3a8a", fontWeight: 800 }}>PO Details</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                <input
                  placeholder="PO Number"
                  value={poForm.po_number}
                  onChange={(e) => setPoForm({ ...poForm, po_number: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <select
                  value={poForm.vendor_id}
                  onChange={(e) => setPoForm({ ...poForm, vendor_id: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Invoice Number"
                  value={poForm.invoice_number}
                  onChange={(e) => setPoForm({ ...poForm, invoice_number: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  placeholder="GST Number"
                  value={poForm.gst_number}
                  onChange={(e) => setPoForm({ ...poForm, gst_number: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <select
                  value={poForm.project_id}
                  onChange={(e) => setPoForm({ ...poForm, project_id: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                >
                  <option value="">Select project</option>
                  {projectOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Payment Terms"
                  value={poForm.payment_terms}
                  onChange={(e) => setPoForm({ ...poForm, payment_terms: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </div>

              <div style={{ marginTop: 14, marginBottom: 8, fontSize: "0.82rem", color: "#1e3a8a", fontWeight: 800 }}>Material & Pricing</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                <select
                  value={poForm.material_category}
                  onChange={(e) => setPoForm({ ...poForm, material_category: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                >
                  <option value="">Select Material Category</option>
                  {[
                    "Solar Panels",
                    "Inverters",
                    "Cables",
                    "Mounting Structure",
                    "Junction Box",
                    "Batteries",
                    "Other",
                  ].map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Quantity"
                  value={poForm.quantity}
                  onChange={(e) => updatePoPricing("quantity", e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  type="number"
                  placeholder="Unit Price"
                  value={poForm.unit_price}
                  onChange={(e) => updatePoPricing("unit_price", e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  type="number"
                  placeholder="Tax Amount"
                  value={poForm.tax_amount}
                  onChange={(e) => updatePoPricing("tax_amount", e.target.value)}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  type="number"
                  placeholder="Total Amount"
                  value={poForm.total_amount}
                  readOnly
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8fafc" }}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={poForm.amount}
                  onChange={(e) => setPoForm({ ...poForm, amount: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
              </div>

              <div style={{ marginTop: 14, marginBottom: 8, fontSize: "0.82rem", color: "#1e3a8a", fontWeight: 800 }}>Delivery & Status</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                <select
                  value={poForm.status}
                  onChange={(e) => setPoForm({ ...poForm, status: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                >
                  {Object.keys(statusColors).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={poForm.payment_status}
                  onChange={(e) => setPoForm({ ...poForm, payment_status: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                >
                  {["Unpaid", "Partially Paid", "Paid"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={poForm.expected_date}
                  onChange={(e) => setPoForm({ ...poForm, expected_date: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <input
                  type="date"
                  value={poForm.received_date}
                  onChange={(e) => setPoForm({ ...poForm, received_date: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <select
                  value={poForm.quality_check_status}
                  onChange={(e) => setPoForm({ ...poForm, quality_check_status: e.target.value })}
                  style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" }}
                >
                  {["Pending", "Passed", "Failed", "On Hold"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <textarea
                  placeholder="Delivery Address"
                  value={poForm.delivery_address}
                  onChange={(e) => setPoForm({ ...poForm, delivery_address: e.target.value })}
                  style={{ minHeight: 70, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", resize: "vertical" }}
                />
                <textarea
                  placeholder="Remarks"
                  value={poForm.remarks}
                  onChange={(e) => setPoForm({ ...poForm, remarks: e.target.value })}
                  style={{ minHeight: 70, padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", resize: "vertical" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setPoFormOpen(false);
                    resetPoForm();
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: "1px solid #1e3a8a",
                    background: "#1e3a8a",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {editingPoId ? "Update PO" : "Create PO"}
                </button>
              </div>
            </form>
          )}

          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["PO Number", "Vendor", "Material", "Project", "Status", "Payment", "Quality Check", "Total Amount", "Expected Date", "Actions"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 14px",
                        textAlign: "left",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => {
                  const stStyle = statusColors[po.status] || statusColors.Pending;
                  const paymentStyle = paymentStatusColors[po.payment_status] || paymentStatusColors.Unpaid;
                  const qualityStyle = qualityCheckColors[po.quality_check_status] || qualityCheckColors.Pending;
                  return (
                    <tr key={po.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e293b" }}>{po.po_number}</td>
                      <td style={{ padding: "10px 14px", color: "#374151" }}>
                        {vendorMap.get(po.vendor_id)?.name || po.vendor_id || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#374151" }}>
                        {po.material_category || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>
                        {po.project_id || "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: stStyle.bg, color: stStyle.color, fontSize: "0.75rem", fontWeight: 700 }}>
                          {po.status || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: paymentStyle.bg, color: paymentStyle.color, fontSize: "0.75rem", fontWeight: 700 }}>
                          {po.payment_status || "Unpaid"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: qualityStyle.bg, color: qualityStyle.color, fontSize: "0.75rem", fontWeight: 700 }}>
                          {po.quality_check_status || "Pending"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#374151" }}>
                        {formatCurrency(po.total_amount)}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#6b7280" }}>
                        {po.expected_date ? new Date(po.expected_date).toLocaleDateString() : "—"}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {canEdit ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              onClick={() => openPoEdit(po)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 6,
                                border: "1px solid #dbeafe",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Edit
                            </button>
                            {isSuperadmin && (
                              <button
                                onClick={() => {
                                  if (!window.confirm(`Delete PO "${po.po_number}"?`)) return;
                                  poDelete.mutate(po.id);
                                }}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 6,
                                  border: "1px solid #fecaca",
                                  background: "#fef2f2",
                                  color: "#b91c1c",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {purchaseOrders.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ padding: "1.5rem", textAlign: "center", color: "#9ca3af" }}>
                      No purchase orders found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default VendorManagement;
