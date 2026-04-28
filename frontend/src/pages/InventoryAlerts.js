import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlertRules, getTriggeredAlerts, createAlertRule, updateAlertRule, deleteAlertRule } from '../api/inventoryAlertApi';
import { toast } from 'react-hot-toast';

const InventoryAlerts = () => {
  const queryClient = useQueryClient();
  const [newRule, setNewRule] = useState({ material_type: '', threshold_quantity: '', alert_level: 'Warning' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data: triggeredAlerts = [] } = useQuery({
    queryKey: ['triggeredAlerts'],
    queryFn: getTriggeredAlerts,
    refetchInterval: 60000
  });

  const { data: alertRules = [] } = useQuery({
    queryKey: ['alertRules'],
    queryFn: getAlertRules
  });

  const createMutation = useMutation({
    mutationFn: createAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      queryClient.invalidateQueries({ queryKey: ['triggeredAlerts'] });
      toast.success('Alert rule created successfully');
      setNewRule({ material_type: '', threshold_quantity: '', alert_level: 'Warning' });
    },
    onError: () => toast.error('Failed to create alert rule')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAlertRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      queryClient.invalidateQueries({ queryKey: ['triggeredAlerts'] });
      toast.success('Alert rule updated');
      setEditingId(null);
    },
    onError: () => toast.error('Failed to update alert rule')
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertRules'] });
      queryClient.invalidateQueries({ queryKey: ['triggeredAlerts'] });
      toast.success('Alert rule deleted');
    },
    onError: () => toast.error('Failed to delete alert rule')
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newRule.material_type || !newRule.threshold_quantity) {
      return toast.error('Please fill all fields');
    }
    createMutation.mutate({
      material_type: newRule.material_type,
      threshold_quantity: parseInt(newRule.threshold_quantity, 10),
      alert_level: newRule.alert_level
    });
  };

  const handleSaveEdit = (id) => {
    updateMutation.mutate({
      id,
      data: {
        material_type: editForm.material_type,
        threshold_quantity: parseInt(editForm.threshold_quantity, 10),
        alert_level: editForm.alert_level,
        is_active: editForm.is_active
      }
    });
  };

  const toggleActive = (rule) => {
    updateMutation.mutate({
      id: rule.id,
      data: { ...rule, is_active: !rule.is_active }
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this alert rule?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>Inventory Alert Rules</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Set material quantity thresholds — alerts trigger when stock falls below limit</p>
      </div>

      {/* Section A: Triggered Alerts */}
      <div style={{ marginBottom: '3rem' }}>
        {triggeredAlerts.length > 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #fecaca', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.1)' }}>
            <div style={{ background: '#fef2f2', padding: '16px 20px', borderBottom: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <h2 style={{ margin: 0, color: '#b91c1c', fontSize: '1.2rem', fontWeight: 800 }}>{triggeredAlerts.length} Active Inventory Alert(s)</h2>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {triggeredAlerts.map(alert => {
                const isCritical = alert.alert_level === 'Critical';
                const pct = Math.min(100, Math.max(0, (alert.current_quantity / alert.threshold_quantity) * 100));
                
                return (
                  <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', borderLeft: `4px solid ${isCritical ? '#ef4444' : '#f97316'}` }}>
                    <div style={{ width: 180, flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>{alert.material_type}</div>
                      <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: isCritical ? '#fef2f2' : '#fff7ed', color: isCritical ? '#ef4444' : '#ea580c' }}>
                        {alert.alert_level}
                      </span>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem', fontWeight: 600 }}>
                        <span style={{ color: '#ef4444' }}>Current: {alert.current_quantity} units</span>
                        <span style={{ color: '#64748b' }}>Threshold: {alert.threshold_quantity} units</span>
                      </div>
                      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: isCritical ? '#ef4444' : '#f97316', borderRadius: 999 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>✅</span>
            <h2 style={{ margin: 0, color: '#16a34a', fontSize: '1.1rem', fontWeight: 700 }}>All inventory levels are within safe limits</h2>
          </div>
        )}
      </div>

      {/* Section B: Alert Rules Management */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>Manage Alert Rules</h2>
          
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Material Type</label>
              <input type="text" placeholder="e.g. Solar Cell" value={newRule.material_type} onChange={e => setNewRule({...newRule, material_type: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Threshold Quantity</label>
              <input type="number" min="1" placeholder="Min. stock" value={newRule.threshold_quantity} onChange={e => setNewRule({...newRule, threshold_quantity: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', boxSizing: 'border-box' }} required />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Alert Level</label>
              <select value={newRule.alert_level} onChange={e => setNewRule({...newRule, alert_level: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <button type="submit" style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              + Add Rule
            </button>
          </form>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              {['Material Type', 'Threshold Qty', 'Alert Level', 'Status', 'Actions'].map(th => (
                <th key={th} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{th}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {alertRules.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No alert rules configured.</td></tr>
            ) : alertRules.map(rule => {
              const isEditing = editingId === rule.id;
              
              return (
                <tr key={rule.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {isEditing ? (
                    <>
                      <td style={{ padding: '12px 20px' }}><input value={editForm.material_type} onChange={e => setEditForm({...editForm, material_type: e.target.value})} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }} /></td>
                      <td style={{ padding: '12px 20px' }}><input type="number" min="1" value={editForm.threshold_quantity} onChange={e => setEditForm({...editForm, threshold_quantity: e.target.value})} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', width: 100 }} /></td>
                      <td style={{ padding: '12px 20px' }}>
                        <select value={editForm.alert_level} onChange={e => setEditForm({...editForm, alert_level: e.target.value})} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                          <option value="Warning">Warning</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px 20px' }}>—</td>
                      <td style={{ padding: '12px 20px', display: 'flex', gap: 10 }}>
                        <button onClick={() => handleSaveEdit(rule.id)} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Save</button>
                        <button onClick={() => setEditingId(null)} style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '16px 20px', fontWeight: 600, color: '#334155' }}>{rule.material_type}</td>
                      <td style={{ padding: '16px 20px', color: '#64748b', fontWeight: 600 }}>{rule.threshold_quantity}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: rule.alert_level === 'Critical' ? '#fef2f2' : '#fff7ed', color: rule.alert_level === 'Critical' ? '#ef4444' : '#ea580c' }}>
                          {rule.alert_level}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button onClick={() => toggleActive(rule)} style={{ padding: '4px 10px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, background: rule.is_active ? '#dcfce7' : '#f1f5f9', color: rule.is_active ? '#16a34a' : '#94a3b8', border: 'none', cursor: 'pointer' }}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '16px 20px', display: 'flex', gap: 10 }}>
                        <button onClick={() => { setEditingId(rule.id); setEditForm(rule); }} style={{ padding: '4px 8px', background: 'transparent', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => handleDelete(rule.id)} style={{ padding: '4px 8px', background: 'transparent', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Delete</button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryAlerts;
