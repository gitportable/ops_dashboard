import React, { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getVendors, getPurchaseOrders, getInventory, createVendor, createPO } from "../api/featuresApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AuthContext } from "../auth/AuthContext";
import { toast } from "react-hot-toast";

const AddVendorModal = ({ isOpen, onClose, onRefresh }) => {
  const [formData, setFormData] = React.useState({ name: "", category: "", contact_person: "", email: "", performance_score: 95 });
  const [submitting, setSubmitting] = React.useState(false);
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createVendor(formData);
      toast.success("Vendor added successfully");
      onRefresh(); onClose();
    } catch { toast.error("Failed to add vendor"); } finally { setSubmitting(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: "16px", width: "400px" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Add New Vendor</h2>
        <form onSubmit={handleSubmit}>
          <input required style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Vendor Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input required style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Category (e.g. Cells, Glass)" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
          <input style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Contact Person" value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} />
          <input type="email" style={{ width: "100%", padding: "10px", marginBottom: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#1e40af", color: "#fff" }}>{submitting ? "Adding..." : "Add Vendor"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreatePOModal = ({ isOpen, onClose, onRefresh, vendors }) => {
  const [formData, setFormData] = React.useState({ po_number: `PO-${Date.now().toString().slice(-6)}`, vendor_id: "", item_description: "", quantity: 0, amount: 0, eta: "" });
  const [submitting, setSubmitting] = React.useState(false);
  if (!isOpen) return null;
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createPO(formData);
      toast.success("Purchase Order created");
      onRefresh(); onClose();
    } catch { toast.error("Failed to create PO"); } finally { setSubmitting(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: "16px", width: "400px" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Create Purchase Order</h2>
        <form onSubmit={handleSubmit}>
          <select required style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} value={formData.vendor_id} onChange={e => setFormData({...formData, vendor_id: e.target.value})}>
            <option value="">Select Vendor</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          <input required style={{ width: "100%", padding: "10px", marginBottom: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Item Description" value={formData.item_description} onChange={e => setFormData({...formData, item_description: e.target.value})} />
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <input required type="number" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Qty" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
            <input required type="number" style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0" }} placeholder="Amount" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
          </div>
          <input required type="date" style={{ width: "100%", padding: "10px", marginBottom: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }} value={formData.eta} onChange={e => setFormData({...formData, eta: e.target.value})} />
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff" }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", background: "#1e40af", color: "#fff" }}>Create PO</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SupplyChain = () => {
  const { role } = useContext(AuthContext) || {};
  const isAdmin = ["admin", "superadmin"].includes(role?.toLowerCase());

  const [showAddVendor, setShowAddVendor] = React.useState(false);
  const [showCreatePO, setShowCreatePO] = React.useState(false);

  const { data: vendors = [], refetch: refetchVendors } = useQuery({ queryKey: ["vendors"], queryFn: getVendors });
  const { data: pos = [], refetch: refetchPOs } = useQuery({ queryKey: ["pos"], queryFn: getPurchaseOrders });
  const { data: inventory = [] } = useQuery({ queryKey: ["inventory"], queryFn: getInventory });

  const lowStockItems = inventory.filter(item => item.current_stock < item.min_stock_level);

  return (
    <div style={{ padding: "2rem", background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "1.875rem", fontWeight: "800", color: "#1e293b", letterSpacing: "-0.025em" }}>Supply Chain & Vendor Management</h1>
          <p style={{ color: "#64748b" }}>Manage upstream logistics, vendor performance, and maintain optimal inventory levels.</p>
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "1rem" }}>
            <button 
              onClick={() => setShowAddVendor(true)}
              style={{ background: "#fff", color: "#1e40af", border: "1px solid #1e40af", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
            >
              + Add Vendor
            </button>
            <button 
              onClick={() => setShowCreatePO(true)}
              style={{ background: "#1e40af", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", boxShadow: "0 4px 12px rgba(30,64,175,0.2)" }}
            >
              + New PO
            </button>
          </div>
        )}
      </header>

      <AddVendorModal isOpen={showAddVendor} onClose={() => setShowAddVendor(false)} onRefresh={refetchVendors} />
      <CreatePOModal isOpen={showCreatePO} onClose={() => setShowCreatePO(false)} onRefresh={refetchPOs} vendors={vendors} />

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div style={{ marginBottom: "2rem", padding: "1rem", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: "12px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "1.5rem" }}>⚠️</span>
          <div>
            <h4 style={{ color: "#991b1b", fontWeight: "600" }}>Critical Inventory Alerts</h4>
            <p style={{ color: "#b91c1c", fontSize: "0.875rem" }}>
              {lowStockItems.map(i => `${i.item_name} (${i.current_stock} ${i.unit})`).join(", ")} below minimum levels.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Purchase Orders Table */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "1.25rem", fontWeight: "600" }}>Recent Purchase Orders</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>PO #</th>
                  <th style={{ padding: "0.75rem" }}>Vendor</th>
                  <th style={{ padding: "0.75rem" }}>Item</th>
                  <th style={{ padding: "0.75rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "0.75rem", fontWeight: "500" }}>{po.po_number}</td>
                    <td style={{ padding: "0.75rem" }}>{po.vendor_name}</td>
                    <td style={{ padding: "0.75rem" }}>{po.item_description}</td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={{ 
                        padding: "4px 8px", borderRadius: "99px", fontSize: "0.75rem", 
                        background: po.status === 'received' ? '#dcfce7' : po.status === 'delayed' ? '#fef2f2' : '#eff6ff',
                        color: po.status === 'received' ? '#166534' : po.status === 'delayed' ? '#991b1b' : '#1e40af'
                      }}>
                        {po.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vendor Performance Chart */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "1.25rem", fontWeight: "600" }}>Vendor Performance Scores</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="performance_score" radius={[0, 4, 4, 0]}>
                  {vendors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.performance_score > 80 ? "#22c55e" : entry.performance_score > 60 ? "#eab308" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <h3 style={{ marginBottom: "1.25rem", fontWeight: "600" }}>Warehouse Inventory</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {inventory.map(item => (
            <div key={item.id} style={{ padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", background: item.current_stock < item.min_stock_level ? "#fff5f5" : "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <h4 style={{ fontWeight: "600" }}>{item.item_name}</h4>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>{item.category}</span>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Stock Level</span>
                  <span style={{ fontWeight: "bold", color: item.current_stock < item.min_stock_level ? "#ef4444" : "#1e293b" }}>
                    {item.current_stock} / {item.min_stock_level} {item.unit}
                  </span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "#f1f5f9", borderRadius: "4px" }}>
                  <div style={{ 
                    width: `${Math.min(100, (item.current_stock / (item.min_stock_level * 2)) * 100)}%`, 
                    height: "100%", 
                    background: item.current_stock < item.min_stock_level ? "#ef4444" : "#3b82f6",
                    borderRadius: "4px"
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SupplyChain;
