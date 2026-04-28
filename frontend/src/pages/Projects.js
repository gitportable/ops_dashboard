import { useState, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../auth/AuthContext';
import { getProjects, deleteProject, updateProject } from '../api/projectApi';
const pid = (p) => p?.projectid ?? p?.project_id ?? p?.id ?? p?.ProjectID;

const statusColor = (s = '') => {
  const m = {
    active:        ['#dcfce7','#16a34a'], 'in progress':['#dbeafe','#1d4ed8'],
    completed:     ['#f5f3ff','#7c3aed'], 'on hold':    ['#fef9c3','#a16207'],
    planning:      ['#f3f4f6','#6b7280'], cancelled:    ['#fef2f2','#dc2626'],
  };
  return m[s.toLowerCase()] || m['planning'];
};

const healthScore = (p) => {
  const pct = p.budget_total || p.budgetallocated
    ? ((p.budget_used || p.budgetused || 0) / (p.budget_total || p.budgetallocated)) * 100
    : 0;
  if (pct > 95) return { score:'Critical', color:'#dc2626', bg:'#fef2f2' };
  if (pct > 75) return { score:'At Risk',  color:'#f59e0b', bg:'#fef9c3' };
  return            { score:'Healthy',  color:'#16a34a', bg:'#dcfce7' };
};

const ProjectCard = ({ project, role, onDelete, onStatusChange, onClick, onKanban, onSprintPlan }) => {
  const id         = pid(project);
  const [bg, textC] = statusColor(project.status);
  const health     = healthScore(project);
  const budgetTotal = project.budget_total || project.budgetallocated || 0;
  const budgetUsed  = project.budget_used  || project.budgetused      || 0;
  const budgetPct   = budgetTotal ? Math.min(100, Math.round((budgetUsed / budgetTotal) * 100)) : null;
  const budgetColor = budgetPct > 85 ? '#dc2626' : budgetPct > 65 ? '#f59e0b' : '#16a34a';
  const isSA = role === 'superadmin';
  const canViewKanban = role === 'admin' || role === 'superadmin';

  return (
    <div
      style={{ background:'#fff', borderRadius:14, border:'1px solid #e5e7eb',
        padding:'1.25rem', display:'flex', flexDirection:'column', gap:10,
        cursor:'pointer', transition:'box-shadow 0.15s,transform 0.15s',
        boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.1)'; e.currentTarget.style.transform='translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform='none'; }}
      onClick={onClick}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ flex:1, marginRight:8 }}>
          <div style={{ fontWeight:700, fontSize:'1rem', color:'#1e293b' }}>
            {project.projectname || project.name || `Project ${id}`}
          </div>
          <div style={{ fontSize:'0.75rem', color:'#94a3b8', marginTop:2 }}>ID: {id}</div>
        </div>
        <div style={{ display:'flex', gap:5, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <span style={{ padding:'2px 9px', borderRadius:99, fontSize:'0.7rem', fontWeight:700, background:bg, color:textC }}>
            {project.status || 'Active'}
          </span>
          <span style={{ padding:'2px 9px', borderRadius:99, fontSize:'0.7rem', fontWeight:700, background:health.bg, color:health.color }}>
            {health.score}
          </span>
        </div>
      </div>

      <div style={{ display:'flex', gap:14, fontSize:'0.78rem', color:'#64748b', flexWrap:'wrap' }}>
        {project.membercount != null && <span>👥 {project.membercount} members</span>}
        {project.issuecount  != null && <span>🐛 {project.issuecount} issues</span>}
        {(project.sprint || project.current_sprint) && <span>🏃 {project.sprint || project.current_sprint}</span>}
        {project.enddate && <span>📅 {new Date(project.enddate).toLocaleDateString()}</span>}
      </div>

      {budgetPct !== null && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.75rem', color:'#6b7280', marginBottom:4 }}>
            <span>Budget</span>
            <span style={{ fontWeight:600, color:budgetColor }}>
              ${budgetUsed.toLocaleString()} / ${budgetTotal.toLocaleString()} ({budgetPct}%)
            </span>
          </div>
          <div style={{ background:'#f1f5f9', borderRadius:4, height:6, overflow:'hidden' }}>
            <div style={{ width:`${budgetPct}%`, height:'100%', background:budgetColor, borderRadius:4 }} />
          </div>
        </div>
      )}

      {(isSA || canViewKanban) && id && (
        <div style={{ display:'flex', gap:6, marginTop:4 }} onClick={e => e.stopPropagation()}>
          {isSA && (
            <>
              <select
                value={project.status || 'Active'}
                onChange={e => onStatusChange(id, e.target.value)}
                style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #e5e7eb',
                  fontSize:'0.75rem', outline:'none', flex:1, background:'#f8fafc' }}>
                {['Planning','Active','In Progress','On Hold','Completed','Cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={() => onDelete(id, project.projectname || project.name)}
                style={{ padding:'4px 10px', background:'#fef2f2', color:'#dc2626',
                  border:'1px solid #fca5a5', borderRadius:6, fontSize:'0.75rem', cursor:'pointer', fontWeight:600 }}>
                Delete
              </button>
            </>
          )}
          {canViewKanban && (
            <button
              onClick={() => onKanban(id)}
              style={{ padding:'4px 10px', background:'#eff6ff', color:'#1d4ed8',
                border:'1px solid #bfdbfe', borderRadius:6, fontSize:'0.75rem', cursor:'pointer', fontWeight:600 }}>
              Kanban View
            </button>
          )}
          {canViewKanban && (
            <button
              onClick={() => onSprintPlan(id)}
              style={{ padding:'4px 10px', background:'#ecfeff', color:'#0e7490',
                border:'1px solid #a5f3fc', borderRadius:6, fontSize:'0.75rem', cursor:'pointer', fontWeight:600 }}>
              Sprint Plan
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const Projects = () => {
  const { role, user } = useContext(AuthContext) || {};
  const currentRole    = (role || user?.role || '').toLowerCase();
  const navigate       = useNavigate();
  const queryClient    = useQueryClient();

  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterHealth, setFilterHealth] = useState('all');
  const [sortBy, setSortBy]           = useState('name');

  const { data: rawProjects = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['allProjects'],
    queryFn: () => getProjects().then(r => Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : []),
    staleTime: 5 * 60 * 1000,
  });

  const handleDelete = async (id, name) => {
    if (!id) return;
    if (!window.confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProject(id);
      toast.success(`Project "${name}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ['allProjects'] });
    } catch { toast.error('Failed to delete project.'); }
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!id) return;
    try {
      await updateProject(id, { status: newStatus });
      toast.success('Status updated.');
      queryClient.invalidateQueries({ queryKey: ['allProjects'] });
    } catch { toast.error('Failed to update status.'); }
  };

  const projects = rawProjects
    .filter(p => {
      const name  = (p.projectname || p.name || '').toLowerCase();
      const id    = String(pid(p) || '');
      const matchSearch = !search || name.includes(search.toLowerCase()) || id.includes(search);
      const matchStatus = filterStatus === 'all' || (p.status || '').toLowerCase() === filterStatus;
      const health      = healthScore(p).score.toLowerCase();
      const matchHealth = filterHealth === 'all' || health === filterHealth;
      return matchSearch && matchStatus && matchHealth;
    })
    .sort((a, b) => {
      if (sortBy === 'name')   return (a.projectname || a.name || '').localeCompare(b.projectname || b.name || '');
      if (sortBy === 'budget') return ((b.budgetused || b.budget_used || 0) - (a.budgetused || a.budget_used || 0));
      if (sortBy === 'issues') return ((b.issuecount || 0) - (a.issuecount || 0));
      return 0;
    });

  const statusGroups = [...new Set(rawProjects.map(p => p.status).filter(Boolean))];

  return (
    <div style={{ padding:'1.5rem 2rem', fontFamily:"'Inter',sans-serif" }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:'1.6rem', fontWeight:700, color:'#1e293b', margin:0 }}>All Projects</h1>
          <p style={{ color:'#6b7280', margin:'4px 0 0', fontSize:'0.87rem' }}>
            {rawProjects.length} total projects
          </p>
        </div>
        {currentRole === 'superadmin' && (
          <button onClick={() => navigate('/projects/new')}
            style={{ padding:'10px 20px', background:'#1e40af', color:'#fff',
              border:'none', borderRadius:8, cursor:'pointer', fontWeight:600, fontSize:'0.9rem' }}>
            + New Project
          </button>
        )}
      </div>

      {!isLoading && (
        <div style={{ display:'flex', gap:8, marginBottom:'1.25rem', flexWrap:'wrap' }}>
          {[
            { label:'Total',    value:rawProjects.length,    bg:'#eff6ff', color:'#1d4ed8' },
            { label:'Active',   value:rawProjects.filter(p => ['active','in progress'].includes((p.status||'').toLowerCase())).length, bg:'#dcfce7', color:'#16a34a' },
            { label:'At Risk',  value:rawProjects.filter(p => healthScore(p).score==='At Risk').length,   bg:'#fef9c3', color:'#a16207' },
            { label:'Critical', value:rawProjects.filter(p => healthScore(p).score==='Critical').length, bg:'#fef2f2', color:'#dc2626' },
          ].map(s => (
            <span key={s.label} style={{ padding:'6px 14px', borderRadius:99, fontSize:'0.78rem', fontWeight:600, background:s.bg, color:s.color }}>
              {s.label}: {s.value}
            </span>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:10, marginBottom:'1.25rem', flexWrap:'wrap' }}>
        <input placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:220, padding:'8px 14px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.87rem', outline:'none' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.87rem', outline:'none', background:'#fff' }}>
          <option value="all">All Statuses</option>
          {statusGroups.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
        </select>
        <select value={filterHealth} onChange={e => setFilterHealth(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.87rem', outline:'none', background:'#fff' }}>
          <option value="all">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="at risk">At Risk</option>
          <option value="critical">Critical</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding:'8px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:'0.87rem', outline:'none', background:'#fff' }}>
          <option value="name">Sort: Name</option>
          <option value="budget">Sort: Budget Used</option>
          <option value="issues">Sort: Most Issues</option>
        </select>
      </div>

      {isLoading && <div style={{ padding:'2rem', color:'#6b7280' }}>Loading projects…</div>}
      {isError   && (
        <div style={{ padding:'1.5rem', background:'#fef2f2', color:'#dc2626', borderRadius:8 }}>
          Failed to load projects.{' '}
          <button onClick={refetch} style={{ color:'#1d4ed8', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Retry</button>
        </div>
      )}
      {!isLoading && !isError && projects.length === 0 && (
        <div style={{ padding:'3rem', textAlign:'center', color:'#9ca3af', background:'#f8fafc', borderRadius:12 }}>
          No projects match your filters.
        </div>
      )}
      {!isLoading && !isError && projects.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'1rem' }}>
          {projects.map(p => {
            const id = pid(p);
            return (
              <ProjectCard
                key={id ?? `proj-idx-${projects.indexOf(p)}`}
                project={p}
                role={currentRole}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
                onKanban={(projectId) => navigate(`/kanban/${projectId}`)}
                onSprintPlan={(projectId) => navigate(`/sprint-planning/${projectId}`)}
                onClick={() => id && navigate(`/projects/${id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Projects;
