import { useState, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AuthContext } from '../auth/AuthContext';
import api from '../api/axios';

const fetchAllUsers = () => api.get('/users/all').then(r => r.data);

const ROLE_COLORS = {
  superadmin: { bg:'#fdf2f8', color:'#9d174d', border:'#fbcfe8' },
  admin:      { bg:'#eff6ff', color:'#1e40af', border:'#bfdbfe' },
  developer:  { bg:'#f0fdf4', color:'#15803d', border:'#bbf7d0' },
  tester:     { bg:'#fefce8', color:'#a16207', border:'#fde68a' },
  unknown:    { bg:'#f9fafb', color:'#6b7280', border:'#e5e7eb' },
};

const STATUS_COLORS = {
  approved:  { bg:'#dcfce7', color:'#16a34a' },
  pending:   { bg:'#fef9c3', color:'#a16207' },
  rejected:  { bg:'#fee2e2', color:'#dc2626' },
  suspended: { bg:'#f3f4f6', color:'#4b5563' },
};

const Badge = ({ text, style }) => (
  <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.7rem', fontWeight:700, border:`1px solid ${style.border||'transparent'}`, background:style.bg, color:style.color }}>
    {text}
  </span>
);

const UsersManagement = () => {
  const { role: callerRole } = useContext(AuthContext) || {};
  const isSA = (callerRole||'').toLowerCase() === 'superadmin';
  const qc   = useQueryClient();

  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState('all');
  const [statusFilter,setStatusFilter]= useState('all');
  const [editingRole, setEditingRole] = useState({}); // { [userId]: newRole }
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProjects, setUserProjects] = useState({ loading: false, data: [], error: false });

  const fetchUserProjects = async (user) => {
    setSelectedUser(user);
    setUserProjects({ loading: true, data: [], error: false });
    try {
      const { data } = await api.get(`/users/${user.id}/projects`);
      setUserProjects({ loading: false, data, error: false });
    } catch {
      setUserProjects({ loading: false, data: [], error: true });
    }
  };

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['allUsers'],
    queryFn: fetchAllUsers,
    staleTime: 30000,
  });

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      toast.success('Role updated successfully');
      setEditingRole(prev => { const n={...prev}; delete n[userId]; return n; });
      qc.invalidateQueries({ queryKey: ['allUsers'] });
    } catch { toast.error('Failed to update role'); }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await api.put(`/users/${userId}/status`, { status: newStatus });
      toast.success(`User ${newStatus}`);
      qc.invalidateQueries({ queryKey: ['allUsers'] });
    } catch { toast.error('Failed to update status'); }
  };

  const filtered = users.filter(u => {
    const name  = (u.name || u.email || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const mS = !search || name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
    const mR = roleFilter  === 'all' || u.role   === roleFilter;
    const mSt= statusFilter=== 'all' || u.status === statusFilter;
    return mS && mR && mSt;
  });

  const counts = { total: users.length };
  ['superadmin','admin','developer','tester'].forEach(r => {
    counts[r] = users.filter(u => u.role === r).length;
  });
  counts.pending = users.filter(u => u.status === 'pending').length;

  return (
    <div style={{ padding:'1.5rem 2rem', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ marginBottom:'1.5rem' }}>
        <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'#1e293b', margin:0 }}>Users Management</h1>
        <p style={{ color:'#6b7280', fontSize:'0.83rem', marginTop:4 }}>
          All registered users · {users.length} total
        </p>
      </div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:'1.5rem' }}>
        {[
          { label:'Total Users',   value:counts.total,      bg:'#eff6ff', color:'#1d4ed8' },
          { label:'Developers',    value:counts.developer,  bg:'#f0fdf4', color:'#15803d' },
          { label:'Testers',       value:counts.tester,     bg:'#fefce8', color:'#a16207' },
          { label:'Admins',        value:counts.admin,      bg:'#eff6ff', color:'#1e40af' },
          { label:'Super Admins',  value:counts.superadmin, bg:'#fdf2f8', color:'#9d174d' },
          counts.pending > 0 && { label:'Pending Approval', value:counts.pending, bg:'#fff7ed', color:'#ea580c' },
        ].filter(Boolean).map(c => (
          <div key={c.label} style={{ background:c.bg, borderRadius:12, padding:'12px 18px', flex:'1 1 120px', minWidth:100 }}>
            <div style={{ fontSize:'1.5rem', fontWeight:800, color:c.color, lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:'0.72rem', color:'#6b7280', marginTop:3 }}>{c.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:'1.25rem' }}>
        <input
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:220, padding:'8px 14px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.85rem', outline:'none', background:'#fff' }}
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.85rem', outline:'none', background:'#fff', color:'#374151' }}>
          <option value="all">All Roles</option>
          <option value="superadmin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="developer">Developer</option>
          <option value="tester">Tester</option>
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.85rem', outline:'none', background:'#fff', color:'#374151' }}>
          <option value="all">All Statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={refetch}
          style={{ padding:'8px 16px', border:'1px solid #e5e7eb', borderRadius:8, background:'#fff', cursor:'pointer', fontSize:'0.85rem', color:'#374151', fontWeight:500 }}>
          ↻ Refresh
        </button>
      </div>

      <div style={{ fontSize:'0.78rem', color:'#94a3b8', marginBottom:'0.75rem' }}>
        Showing {filtered.length} of {users.length} users
      </div>

      {isLoading && <div style={{ padding:'2rem', textAlign:'center', color:'#6b7280' }}>Loading users…</div>}
      {isError   && (
        <div style={{ padding:'1rem', background:'#fef2f2', color:'#dc2626', borderRadius:8, marginBottom:'1rem' }}>
          Failed to load users. <button onClick={refetch} style={{ color:'#1d4ed8', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Retry</button>
        </div>
      )}

      {!isLoading && (
        <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, overflow:'hidden' }}>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.83rem' }}>
              <thead>
                <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e5e7eb' }}>
                  {['User','Email','Role','Status','Projects','Joined','Actions'].map(h => (
                    <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontWeight:700, color:'#6b7280', fontSize:'0.72rem', textTransform:'uppercase', letterSpacing:'0.05em', whiteSpace:'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding:'2rem', textAlign:'center', color:'#9ca3af' }}>
                      No users match your search.
                    </td>
                  </tr>
                ) : filtered.map(u => {
                  const rc  = ROLE_COLORS[u.role]  || ROLE_COLORS.unknown;
                  const sc  = STATUS_COLORS[u.status] || STATUS_COLORS.approved;
                  const isEditing = editingRole[u.id] !== undefined;

                  return (
                    <tr key={u.id} style={{ borderBottom:'1px solid #f1f5f9', transition:'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background='#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:`${rc.bg}`, border:`2px solid ${rc.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'0.85rem', color:rc.color, flexShrink:0 }}>
                            {(u.name || u.email || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:600, color:'#1e293b' }}>{u.name || '—'}</div>
                            <div style={{ fontSize:'0.72rem', color:'#94a3b8' }}>ID: {u.id}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding:'12px 16px', color:'#374151' }}>{u.email}</td>

                      <td style={{ padding:'12px 16px' }}>
                        {isEditing ? (
                          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                            <select
                              value={editingRole[u.id]}
                              onChange={e => setEditingRole(prev => ({ ...prev, [u.id]: e.target.value }))}
                              style={{ padding:'4px 8px', border:'1px solid #e5e7eb', borderRadius:6, fontSize:'0.79rem', outline:'none' }}>
                              <option value="developer">Developer</option>
                              <option value="tester">Tester</option>
                              <option value="admin">Admin</option>
                              <option value="superadmin">Super Admin</option>
                            </select>
                            <button onClick={() => handleRoleChange(u.id, editingRole[u.id])}
                              style={{ padding:'4px 8px', background:'#1e40af', color:'#fff', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.75rem', fontWeight:600 }}>✓</button>
                            <button onClick={() => setEditingRole(prev => { const n={...prev}; delete n[u.id]; return n; })}
                              style={{ padding:'4px 6px', background:'#f3f4f6', color:'#6b7280', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.75rem' }}>✕</button>
                          </div>
                        ) : (
                          <Badge text={u.role || 'unknown'} style={rc} />
                        )}
                      </td>

                      <td style={{ padding:'12px 16px' }}>
                        <Badge text={u.status || 'approved'} style={sc} />
                      </td>

                      <td style={{ padding:'12px 16px', color:'#374151', fontWeight:600 }}>
                        <button onClick={(e) => { e.stopPropagation(); fetchUserProjects(u); }} 
                          style={{ background:'transparent', border:'none', color:'#1d4ed8', cursor:'pointer', fontSize:'0.85rem', fontWeight:700, textDecoration:'underline', padding:0 }}>
                          {u.project_count || 0}
                        </button>
                      </td>

                      <td style={{ padding:'12px 16px', color:'#6b7280', fontSize:'0.79rem', whiteSpace:'nowrap' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                      </td>

              
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                          {isSA && !isEditing && (
                            <button
                              onClick={() => setEditingRole(prev => ({ ...prev, [u.id]: u.role || 'developer' }))}
                              style={{ padding:'4px 10px', background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:6, cursor:'pointer', fontSize:'0.74rem', fontWeight:600 }}>
                              Change Role
                            </button>
                          )}
                          {u.status === 'pending' && (
                            <>
                              <button onClick={() => handleStatusChange(u.id, 'approved')}
                                style={{ padding:'4px 10px', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:6, cursor:'pointer', fontSize:'0.74rem', fontWeight:600 }}>
                                Approve
                              </button>
                              <button onClick={() => handleStatusChange(u.id, 'rejected')}
                                style={{ padding:'4px 10px', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:6, cursor:'pointer', fontSize:'0.74rem', fontWeight:600 }}>
                                Reject
                              </button>
                            </>
                          )}
                          {u.status === 'approved' && isSA && (
                            <button onClick={() => handleStatusChange(u.id, 'suspended')}
                              style={{ padding:'4px 10px', background:'#f9fafb', color:'#4b5563', border:'1px solid #e5e7eb', borderRadius:6, cursor:'pointer', fontSize:'0.74rem', fontWeight:600 }}>
                              Suspend
                            </button>
                          )}
                          {u.status === 'suspended' && (
                            <button onClick={() => handleStatusChange(u.id, 'approved')}
                              style={{ padding:'4px 10px', background:'#f0fdf4', color:'#16a34a', border:'1px solid #bbf7d0', borderRadius:6, cursor:'pointer', fontSize:'0.74rem', fontWeight:600 }}>
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedUser && (
        <div style={{ position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setSelectedUser(null)}>
          <div style={{ background:'#fff', borderRadius:12, padding:'1.5rem', width:'90%', maxWidth:600, maxHeight:'80vh', overflowY:'auto', boxShadow:'0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
              <h2 style={{ margin:0, fontSize:'1.2rem', color:'#1e293b' }}>Projects for {selectedUser.name || selectedUser.email}</h2>
              <button onClick={() => setSelectedUser(null)} style={{ background:'transparent', border:'none', fontSize:'1.2rem', cursor:'pointer', color:'#6b7280' }}>✕</button>
            </div>
            
            {userProjects.loading && <p style={{ color:'#6b7280', fontSize:'0.9rem' }}>Loading projects...</p>}
            {userProjects.error && <p style={{ color:'#dc2626', fontSize:'0.9rem' }}>Failed to load projects. Please try again.</p>}
            
            {!userProjects.loading && !userProjects.error && userProjects.data.length === 0 && (
              <div style={{ padding:'2rem', textAlign:'center', color:'#9ca3af', background:'#f8fafc', borderRadius:8 }}>
                This user is not assigned to any projects yet.
              </div>
            )}
            
            {!userProjects.loading && !userProjects.error && userProjects.data.length > 0 && (
              <div style={{ border:'1px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e5e7eb', textAlign:'left' }}>
                      <th style={{ padding:'10px 14px', color:'#6b7280', fontWeight:600 }}>Project Name</th>
                      <th style={{ padding:'10px 14px', color:'#6b7280', fontWeight:600 }}>Status</th>
                      <th style={{ padding:'10px 14px', color:'#6b7280', fontWeight:600 }}>Budget (Used/Allocated)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userProjects.data.map((p, i) => {
                      const pct = p.budgetallocated ? Math.min(100, Math.round((p.budgetused / p.budgetallocated) * 100)) : 0;
                      return (
                        <tr key={p.id} style={{ borderBottom: i === userProjects.data.length - 1 ? 'none' : '1px solid #f1f5f9' }}>
                          <td style={{ padding:'12px 14px', fontWeight:600, color:'#1e293b' }}>
                            <a href={`/projects/${p.id}`} style={{ color:'#1d4ed8', textDecoration:'none' }} onMouseEnter={e => e.target.style.textDecoration='underline'} onMouseLeave={e => e.target.style.textDecoration='none'}>
                              {p.name || `Project ${p.id}`}
                            </a>
                          </td>
                          <td style={{ padding:'12px 14px' }}>
                            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'0.7rem', fontWeight:600, background:'#eff6ff', color:'#1d4ed8' }}>
                              {p.status || 'Active'}
                            </span>
                          </td>
                          <td style={{ padding:'12px 14px', color:'#4b5563' }}>
                            <div style={{ marginBottom:4 }}>
                              ${(p.budgetused || 0).toLocaleString()} <span style={{ color:'#9ca3af' }}>/ ${(p.budgetallocated || 0).toLocaleString()}</span>
                            </div>
                            {p.budgetallocated > 0 && (
                              <div style={{ height:4, background:'#e5e7eb', borderRadius:2, overflow:'hidden' }}>
                                <div style={{ height:'100%', background: pct > 85 ? '#dc2626' : pct > 65 ? '#f59e0b' : '#16a34a', width:`${pct}%`, borderRadius:2 }} />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
