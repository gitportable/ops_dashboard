import React, { useState, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllPOs, getPOHistory, updatePOStatus } from '../api/poTrackingApi';
import { toast } from 'react-hot-toast';
import { AuthContext } from '../auth/AuthContext';

const POTracking = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === 'superadmin' || user?.role === 'admin';
  const queryClient = useQueryClient();

  const [expandedPO, setExpandedPO] = useState(null);
  const [statusForm, setStatusForm] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterVendor, setFilterVendor] = useState('All');
  const [filterProject, setFilterProject] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  const [search, setSearch] = useState('');

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['poTracking'],
    queryFn: getAllPOs,
    refetchInterval: 60000
  });

  const { data: history = [] } = useQuery({
    queryKey: ['poHistory', expandedPO],
    queryFn: () => getPOHistory(expandedPO),
    enabled: !!expandedPO
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updatePOStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['poTracking'] });
      if (expandedPO) {
        queryClient.invalidateQueries({ queryKey: ['poHistory', expandedPO] });
      }
      toast.success('PO Status updated');
      setStatusForm(null);
    },
    onError: () => toast.error('Failed to update PO status')
  });

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const stats = {
    total: purchaseOrders.length,
    pending: purchaseOrders.filter(po => po.status === 'Pending').length,
    inTransit: purchaseOrders.filter(po => po.status === 'Shipped' || po.status === 'In Transit').length,
    overdue: purchaseOrders.filter(po => 
      po.expected_date && 
      po.expected_date.split('T')[0] < today && 
      !['Received', 'Cancelled'].includes(po.status)
    ).length
  };

  // Unique lists for filters
  const vendors = [...new Set(purchaseOrders.map(po => po.vendor_name).filter(Boolean))].sort();
  const projects = [...new Set(purchaseOrders.map(po => po.project_name).filter(Boolean))].sort();
  const paymentStatuses = [...new Set(purchaseOrders.map(po => po.payment_status).filter(Boolean))].sort();

  // Apply filters
  const filteredPOs = purchaseOrders.filter(po => {
    if (filterStatus !== 'All' && po.status !== filterStatus) return false;
    if (filterVendor !== 'All' && po.vendor_name !== filterVendor) return false;
    if (filterProject !== 'All' && po.project_name !== filterProject) return false;
    if (filterPayment !== 'All' && po.payment_status !== filterPayment) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!po.po_number?.toLowerCase().includes(q) && !po.invoice_number?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pipelineSteps = ['Pending', 'Approved', 'Shipped', 'In Transit', 'Received'];

  const getPaymentColor = (status) => {
    switch(status) {
      case 'Paid': return '#16a34a';
      case 'Pending': return '#f97316';
      case 'Partial': return '#3b82f6';
      case 'Overdue': return '#dc2626';
      default: return '#64748b';
    }
  };

  const getQcColor = (status) => {
    switch(status) {
      case 'Passed': return '#16a34a';
      case 'Failed': return '#dc2626';
      case 'Pending': return '#94a3b8';
      case 'Not Required': return '#cbd5e1';
      default: return '#94a3b8';
    }
  };

  const formatAmount = (po) => {
    const val = po.total_amount || po.amount;
    return val ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '-';
  };

  // Analytics data
  const statusCounts = purchaseOrders.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {});

  const vendorPerf = {};
  purchaseOrders.forEach(po => {
    if (!po.vendor_name) return;
    if (!vendorPerf[po.vendor_name]) {
      vendorPerf[po.vendor_name] = { total: 0, received: 0, onTime: 0, value: 0 };
    }
    const v = vendorPerf[po.vendor_name];
    v.total++;
    const val = parseFloat(po.total_amount || po.amount || 0);
    v.value += val;
    if (po.status === 'Received') {
      v.received++;
      if (po.expected_date && po.updated_at) { // using updated_at as proxy for receive date if history not joined here
        // simplifying onTime logic since we don't have exact receive date in flat PO row
        // Assuming if it's received, we count it. (A full implementation would check history log dates)
        if (po.expected_date.split('T')[0] >= po.updated_at.split('T')[0]) {
          v.onTime++;
        }
      }
    }
  });

  const vendorList = Object.entries(vendorPerf)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '1.8rem', fontWeight: 800, color: '#1e293b' }}>Purchase Order Tracking</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Monitor PO lifecycle, delivery status, payment tracking, and vendor performance</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total POs</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginTop: '0.5rem' }}>{stats.total}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Pending Approval</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.5rem' }}>{stats.pending}</div>
        </div>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>In Transit</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', marginTop: '0.5rem' }}>{stats.inTransit}</div>
        </div>
        <div style={{ background: stats.overdue > 0 ? '#fef2f2' : '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: stats.overdue > 0 ? '1px solid #fecaca' : 'none' }}>
          <div style={{ color: stats.overdue > 0 ? '#dc2626' : '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Overdue Deliveries</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: stats.overdue > 0 ? '#dc2626' : '#1e293b', marginTop: '0.5rem' }}>{stats.overdue}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Search PO or Invoice..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', width: 250 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
          <option value="All">All Statuses</option>
          {pipelineSteps.concat(['Cancelled']).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterVendor} onChange={e => setFilterVendor(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
          <option value="All">All Vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
          <option value="All">All Projects</option>
          {projects.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filterPayment} onChange={e => setFilterPayment(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff' }}>
          <option value="All">All Payments</option>
          {paymentStatuses.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Main Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', marginBottom: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#0f172a', color: 'white' }}>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>PO Details</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Amount</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600, width: 300 }}>Status Pipeline</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Payment</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Quality Check</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Expected Date</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No purchase orders match the filters.</td></tr>
            ) : filteredPOs.map((po, idx) => {
              const isOverdue = po.expected_date && po.expected_date.split('T')[0] < today && !['Received', 'Cancelled'].includes(po.status);
              const isExpanded = expandedPO === po.id;
              
              return (
                <React.Fragment key={po.id}>
                  <tr style={{ background: isOverdue ? '#fff5f5' : (idx % 2 === 0 ? '#fff' : '#fafafa'), borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{po.po_number}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{po.vendor_name || 'Unknown Vendor'}</div>
                      {po.project_name && <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: 2 }}>{po.project_name}</div>}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: '#334155' }}>
                      {formatAmount(po)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {po.status === 'Cancelled' ? (
                        <span style={{ padding: '4px 8px', borderRadius: 999, background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', fontWeight: 700 }}>Cancelled</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: '#e2e8f0', zIndex: 1, transform: 'translateY(-50%)' }} />
                          {pipelineSteps.map((step, i) => {
                            const currentIndex = pipelineSteps.indexOf(po.status);
                            const isCompleted = i < currentIndex;
                            const isCurrent = i === currentIndex;
                            return (
                              <div key={step} style={{ flex: 1, display: 'flex', justifyContent: 'center', zIndex: 2 }} title={step}>
                                <div style={{ 
                                  width: 14, height: 14, borderRadius: '50%', 
                                  background: isCompleted ? '#1e3a8a' : isCurrent ? '#3b82f6' : '#cbd5e1',
                                  border: '2px solid #fff',
                                  animation: isCurrent ? 'pulse 2s infinite' : 'none'
                                }} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginTop: 8 }}>{po.status}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '4px 8px', borderRadius: 4, background: getPaymentColor(po.payment_status) + '20', color: getPaymentColor(po.payment_status), fontSize: '0.8rem', fontWeight: 700 }}>
                        {po.payment_status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ padding: '4px 8px', borderRadius: 4, background: getQcColor(po.qc_status) + '20', color: getQcColor(po.qc_status), fontSize: '0.8rem', fontWeight: 700 }}>
                        {po.qc_status || 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {po.expected_date ? (
                        <div style={{ color: isOverdue ? '#dc2626' : '#475569', fontWeight: isOverdue ? 700 : 500, fontSize: '0.9rem' }}>
                          {po.expected_date.split('T')[0]}
                          {isOverdue && <div style={{ fontSize: '0.75rem', marginTop: 2 }}>⚠️ Overdue</div>}
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setExpandedPO(isExpanded ? null : po.id)} style={{ padding: '6px 10px', background: isExpanded ? '#e2e8f0' : '#f1f5f9', border: 'none', borderRadius: 6, color: '#475569', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                          📋 History
                        </button>
                        {isAdmin && (
                          <button onClick={() => setStatusForm(po.id === statusForm ? null : po.id)} style={{ padding: '6px 10px', background: '#e0f2fe', border: 'none', borderRadius: 6, color: '#0369a1', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                            → Update
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Inline Status Update Form */}
                  {statusForm === po.id && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={7} style={{ padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #bae6fd' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Next Status</label>
                            <select id={`status-${po.id}`} defaultValue={po.status} style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                              {pipelineSteps.concat(['Cancelled']).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div style={{ flex: 2 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Update Notes</label>
                            <textarea id={`notes-${po.id}`} rows={2} style={{ width: '100%', padding: '0.5rem', borderRadius: 6, border: '1px solid #cbd5e1', resize: 'vertical' }} placeholder="Reason for update..." />
                          </div>
                          <div style={{ flexShrink: 0, paddingTop: '1.2rem' }}>
                            <button onClick={() => {
                              const s = document.getElementById(`status-${po.id}`).value;
                              const n = document.getElementById(`notes-${po.id}`).value;
                              updateMutation.mutate({ id: po.id, data: { status: s, notes: n } });
                            }} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
                              Save Status
                            </button>
                            <button onClick={() => setStatusForm(null)} style={{ padding: '0.5rem 1rem', background: 'transparent', color: '#64748b', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer', marginLeft: 8 }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Inline History Panel */}
                  {isExpanded && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={7} style={{ padding: '1rem 2rem', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: 8, border: '1px solid #e2e8f0', position: 'relative' }}>
                          <button onClick={() => setExpandedPO(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: '1.2rem', color: '#94a3b8', cursor: 'pointer' }}>×</button>
                          <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Status History</h4>
                          {history.length === 0 ? (
                            <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.9rem' }}>No status changes recorded yet.</div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              {history.map((h, i) => (
                                <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', marginTop: 4 }} />
                                  <div>
                                    <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>
                                      <span style={{ fontWeight: 600, color: '#64748b' }}>{h.from_status || 'Draft'}</span> → <span style={{ fontWeight: 700 }}>{h.to_status}</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                                      {new Date(h.changed_at).toLocaleString()} by {h.changed_by_name}
                                    </div>
                                    {h.notes && <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: 4, background: '#f1f5f9', padding: '6px 10px', borderRadius: 4 }}>{h.notes}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Analytics */}
      <div style={{ display: 'flex', gap: '2rem' }}>
        <div style={{ flex: 1, background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e293b' }}>Status Distribution</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['Pending', 'Approved', 'Shipped', 'In Transit', 'Received', 'Cancelled'].map(s => {
              const count = statusCounts[s] || 0;
              const pct = stats.total ? (count / stats.total) * 100 : 0;
              const color = s === 'Pending' ? '#94a3b8' : s === 'Approved' ? '#3b82f6' : s === 'Shipped' ? '#a855f7' : s === 'In Transit' ? '#f97316' : s === 'Received' ? '#16a34a' : '#dc2626';
              return (
                <div key={s}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                    <span>{s}</span>
                    <span>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, background: '#fff', padding: '1.5rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: '#1e293b' }}>Vendor Performance</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '0.8rem' }}>
                  <th style={{ paddingBottom: 8 }}>Vendor Name</th>
                  <th style={{ paddingBottom: 8 }}>Total POs</th>
                  <th style={{ paddingBottom: 8 }}>Completed</th>
                  <th style={{ paddingBottom: 8 }}>On Time %</th>
                  <th style={{ paddingBottom: 8 }}>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {vendorList.slice(0, 5).map(v => (
                  <tr key={v.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 0', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{v.name}</td>
                    <td style={{ padding: '12px 0', color: '#64748b', fontSize: '0.9rem' }}>{v.total}</td>
                    <td style={{ padding: '12px 0', color: '#64748b', fontSize: '0.9rem' }}>{v.received}</td>
                    <td style={{ padding: '12px 0', fontWeight: 600, color: v.received ? (v.onTime/v.received > 0.8 ? '#16a34a' : '#f59e0b') : '#94a3b8', fontSize: '0.9rem' }}>
                      {v.received ? Math.round((v.onTime / v.received) * 100) + '%' : '-'}
                    </td>
                    <td style={{ padding: '12px 0', fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>₹{v.value.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POTracking;
