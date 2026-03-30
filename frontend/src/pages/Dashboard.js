import { useContext, useState } from 'react';
import { AuthContext } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  useDashboardStats, useByStatus, useByType, useBySprint, useByTeam,
  useTrend, useAgeDistribution, useBurndown, useVelocityData,
  useBudgetUtilization, useResolutionTime, useProjectHealth,
  useOverdueIssues, useSLACompliance, useCumulativeTrend,
  useProjectList, useRoleOverview,
} from '../api/dashboardApi';
import { FiAlertCircle, FiCheckSquare, FiBriefcase, FiUsers, FiClock, FiList, FiActivity } from 'react-icons/fi';

const P = ['#2563eb','#7c3aed','#0891b2','#16a34a','#dc2626','#ea580c','#0d9488','#9333ea','#ca8a04','#be185d'];
const STATUS_CLR = { open:'#2563eb','in progress':'#7c3aed','in review':'#0891b2',blocked:'#dc2626',done:'#16a34a',verified:'#0d9488','needs info':'#ea580c',closed:'#94a3b8' };
const sdot = s => ({'active':'#16a34a','in progress':'#2563eb',completed:'#7c3aed','on hold':'#ca8a04',blocked:'#dc2626',planning:'#94a3b8','cancelled':'#dc2626'}[(s||'').toLowerCase()]||'#94a3b8');

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e293b', padding:'8px 12px', borderRadius:8, fontSize:'0.79rem', color:'#fff', boxShadow:'0 4px 12px rgba(0,0,0,.25)', maxWidth:220 }}>
      {label && <div style={{ color:'#94a3b8', marginBottom:4, fontSize:'0.7rem' }}>{label}</div>}
      {payload.map((p,i) => (
        <div key={i} style={{ color: p.color||'#e2e8f0' }}>
          {p.name}: <b>{typeof p.value==='number' ? p.value.toLocaleString() : p.value}</b>
        </div>
      ))}
    </div>
  );
};

const Skel = ({ h=200 }) => (
  <div style={{ height:h, borderRadius:8, background:'linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
);
const Empty = ({ h=200, msg='No data yet' }) => (
  <div style={{ height:h, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#cbd5e1', gap:6 }}>
    <span style={{ fontSize:'1.6rem' }}>📊</span>
    <span style={{ fontSize:'0.78rem' }}>{msg}</span>
  </div>
);

const Card = ({ title, sub, children, cols=1 }) => (
  <div style={{ background:'#fff', borderRadius:12, padding:'1.1rem 1.25rem', border:'1px solid #e5e7eb', gridColumn:`span ${cols}`, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
    <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#1e293b' }}>{title}</div>
    {sub && <div style={{ fontSize:'0.71rem', color:'#94a3b8', marginBottom:'0.75rem', marginTop:1 }}>{sub}</div>}
    <div style={{ marginTop: sub ? 0 : '0.6rem' }}>{children}</div>
  </div>
);

const W = (loading, data, chart, h=200) =>
  loading ? <Skel h={h} /> : !data?.length ? <Empty h={h} /> : chart;
const KPI = ({ title, value, Icon, color, link, nav }) => (
  <div onClick={() => link && nav(link)}
    style={{ background:'#fff', flex:'1 1 160px', padding:'1.1rem 1.4rem', borderRadius:12,
      border:'1px solid #e5e7eb', borderTop:`3px solid ${color}`,
      cursor:link?'pointer':'default', boxShadow:'0 1px 4px rgba(0,0,0,.04)',
      transition:'box-shadow .15s,transform .15s' }}
    onMouseEnter={e => { if(link){e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.10)';e.currentTarget.style.transform='translateY(-2px)'}}}
    onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)';e.currentTarget.style.transform=''}}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
      <div>
        <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>{title}</div>
        <div style={{ fontSize:'2rem', fontWeight:800, color:'#1e293b', lineHeight:1.1, marginTop:4 }}>
          {value ?? <span style={{ color:'#d1d5db', fontWeight:400, fontSize:'1.4rem' }}>—</span>}
        </div>
      </div>
      {Icon && <div style={{ width:38, height:38, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={18} color={color} /></div>}
    </div>
  </div>
);


const ProjectSidebar = ({ selected, onSelect }) => {
  const [search, setSearch] = useState('');
  const { data: projects = [], isLoading } = useProjectList();

  const filtered = projects.filter(p =>
    !search || (p.projectname||p.name||'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      width:230, flexShrink:0, background:'#fff', display:'flex', flexDirection:'column',
      borderRight:'1px solid #e5e7eb', height:'100%', overflow:'hidden',
    }}>
     
      <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
        <div style={{ fontWeight:800, fontSize:'0.78rem', color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
          Projects
          <span style={{ marginLeft:6, fontWeight:600, color:'#94a3b8', fontSize:'0.72rem', textTransform:'none', letterSpacing:0 }}>
            ({projects.length})
          </span>
        </div>
        <input
          placeholder="Search…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:7, fontSize:'0.79rem', outline:'none', background:'#f8fafc', boxSizing:'border-box', color:'#374151' }}
        />
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        <div onClick={() => onSelect(null)}
          style={{ padding:'9px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
            background: !selected ? '#eff6ff' : 'transparent',
            borderLeft: !selected ? '3px solid #2563eb' : '3px solid transparent',
            borderBottom:'1px solid #f8fafc' }}>
          <span style={{ fontSize:'0.83rem', fontWeight:700, color: !selected ? '#1d4ed8' : '#374151' }}>All Projects</span>
        </div>

        {isLoading && <div style={{ padding:'1rem', fontSize:'0.79rem', color:'#94a3b8' }}>Loading…</div>}

        {filtered.map(p => {
          const id   = p.projectid ?? p.project_id;
          const name = p.projectname ?? p.name ?? `Project ${id}`;
          const sel  = String(selected) === String(id);
          const bPct = p.budget_total > 0 ? Math.min(100, Math.round((p.budget_used / p.budget_total) * 100)) : 0;
          const bClr = bPct > 85 ? '#dc2626' : bPct > 65 ? '#f59e0b' : '#16a34a';
          const open = parseInt(p.open_count) || 0;
          const total= parseInt(p.issue_count) || 0;

          return (
            <div key={id ?? name} onClick={() => onSelect(id)}
              style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid #f8fafc',
                background: sel ? '#eff6ff' : 'transparent',
                borderLeft: sel ? '3px solid #2563eb' : '3px solid transparent',
                transition:'background .12s' }}
              onMouseEnter={e => { if(!sel) e.currentTarget.style.background='#f8fafc'; }}
              onMouseLeave={e => { if(!sel) e.currentTarget.style.background='transparent'; }}>

              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:sdot(p.status), flexShrink:0 }} />
                <span style={{ fontSize:'0.81rem', fontWeight:600, color: sel ? '#1d4ed8' : '#1e293b',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }} title={name}>
                  {name}
                </span>
              </div>
              <div style={{ fontSize:'0.69rem', color:'#94a3b8', paddingLeft:13 }}>
                {open} open · {total} total
              </div>
              {bPct > 0 && (
                <div style={{ marginLeft:13, marginTop:4, background:'#f1f5f9', borderRadius:3, height:3, overflow:'hidden' }}>
                  <div style={{ width:`${bPct}%`, height:'100%', background:bClr, borderRadius:3 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RoleOverview = ({ pid }) => {
  const [tab, setTab] = useState('all');
  const { data, isLoading } = useRoleOverview(pid);
  const s       = data?.summary  || {};
  const teams   = Array.isArray(data?.teamStats) ? data.teamStats : [];
  const sprint  = Array.isArray(data?.sprintBreakdown) ? data.sprintBreakdown.slice(0, 8) : [];
  const monthly = Array.isArray(data?.monthlyTrend) ? data.monthlyTrend : [];
  const teamRole = { QA:'tester', Frontend:'developer', Backend:'developer', DevOps:'developer' };
  const shown = tab === 'all' ? teams : teams.filter(t => teamRole[t.team] === tab);
  const bugPct    = s.totalIssues > 0 ? Math.round((s.totalBugs/s.totalIssues)*100) : 0;
  const budgetPct = s.totalBudgetAllocated > 0 ? Math.round((s.totalBudgetUsed/s.totalBudgetAllocated)*100) : 0;
  const fmt = n => n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n||0}`;

  return (
    <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'1.25rem', marginTop:'1.25rem' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
        <div>
          <div style={{ fontWeight:800, fontSize:'0.95rem', color:'#1e293b' }}>Team Activity Overview</div>
          <div style={{ fontSize:'0.73rem', color:'#94a3b8' }}>Role-based contribution across all projects</div>
        </div>
        <div style={{ display:'flex', gap:5, background:'#f8fafc', padding:3, borderRadius:8, border:'1px solid #e5e7eb' }}>
          {['all','developer','tester'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding:'4px 12px', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.79rem',
                fontWeight: tab===t ? 700 : 500,
                background: tab===t ? '#2563eb' : 'transparent',
                color: tab===t ? '#fff' : '#6b7280', textTransform:'capitalize' }}>
              {t === 'all' ? 'All Teams' : t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <Skel h={60} /> : (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:'1rem' }}>
          {[
            { l:`${s.totalProjects||0} Projects`, v:s.totalIssues||0, sub:'total issues', c:'#2563eb', bg:'#eff6ff' },
            { l:`Bugs (${bugPct}%)`,               v:s.totalBugs||0,   sub:'bugs',         c:'#dc2626', bg:'#fef2f2' },
            { l:'Tasks',                           v:s.totalTasks||0,  sub:'tasks',        c:'#7c3aed', bg:'#f5f3ff' },
            { l:'Budget',                          v:`${fmt(s.totalBudgetUsed)} / ${fmt(s.totalBudgetAllocated)} (${budgetPct}%)`, sub:'used/allocated', c:'#16a34a', bg:'#f0fdf4', wide:true },
            { l:'Blocked',                         v:s.blockedIssues||0, sub:'blocked',    c:'#f59e0b', bg:'#fef9c3' },
          ].map(c => (
            <div key={c.l} style={{ background:c.bg, borderRadius:10, padding:'9px 14px', flex: c.wide ? '2 1 180px' : '1 1 90px' }}>
              <div style={{ fontSize:'1.25rem', fontWeight:800, color:c.c, lineHeight:1 }}>{c.v}</div>
              <div style={{ fontSize:'0.68rem', color:'#6b7280', marginTop:2 }}>{c.l}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1rem', marginBottom:'1rem' }}>
        <Card title="Sprint Breakdown" sub="Issues per sprint by team">
          {sprint.length === 0 ? <Empty h={150} /> : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={sprint} margin={{ left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="sprint" tick={{ fontSize:9 }} />
                <YAxis tick={{ fontSize:9 }} />
                <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize:9 }} />
                <Bar dataKey="frontend" name="Frontend" stackId="a" fill="#2563eb" />
                <Bar dataKey="backend"  name="Backend"  stackId="a" fill="#7c3aed" />
                <Bar dataKey="qa"       name="QA"       stackId="a" fill="#16a34a" />
                <Bar dataKey="devops"   name="DevOps"   stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Monthly Bug vs Task" sub="Issue creation by type over time">
          {monthly.length === 0 ? <Empty h={150} /> : (
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={monthly} margin={{ left:-10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize:9 }} />
                <YAxis tick={{ fontSize:9 }} />
                <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize:9 }} />
                <Bar dataKey="bugs" name="Bugs" fill="#dc2626" radius={[3,3,0,0]} />
                <Line type="monotone" dataKey="tasks" name="Tasks" stroke="#2563eb" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {shown.length > 0 && (
        <div style={{ overflowX:'auto', border:'1px solid #f1f5f9', borderRadius:10 }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.81rem' }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Team','Role','Total','Open','Resolved','Blocked','Bugs','Tasks'].map(h => (
                  <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontWeight:700, color:'#6b7280', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:'2px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map(t => (
                <tr key={t.team} style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'8px 14px', fontWeight:600, color:'#1e293b' }}>{t.team}</td>
                  <td style={{ padding:'8px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:99, fontSize:'0.69rem', fontWeight:600, background: t.team==='QA'?'#f0fdf4':'#eff6ff', color: t.team==='QA'?'#16a34a':'#1d4ed8' }}>
                      {t.team==='QA'?'Tester':'Developer'}
                    </span>
                  </td>
                  <td style={{ padding:'8px 14px', fontWeight:700 }}>{t.total_issues}</td>
                  <td style={{ padding:'8px 14px', color:'#2563eb' }}>{t.open}</td>
                  <td style={{ padding:'8px 14px', color:'#16a34a' }}>{t.resolved}</td>
                  <td style={{ padding:'8px 14px', color: t.blocked>0?'#dc2626':'#94a3b8' }}>{t.blocked}</td>
                  <td style={{ padding:'8px 14px', color:'#dc2626' }}>{t.bugs}</td>
                  <td style={{ padding:'8px 14px', color:'#7c3aed' }}>{t.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Dashboard = () => {
  const { role, user } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || '').toLowerCase();
  const navigate    = useNavigate();
  const isAdmin = ['admin','superadmin'].includes(currentRole);
  const isSA    = currentRole === 'superadmin';
  const isDev   = currentRole === 'developer';
  const isTst   = currentRole === 'tester';
  const [pid, setPid] = useState(null);

  const stats   = useDashboardStats(pid);
  const byStatus= useByStatus(pid);
  const byType  = useByType(pid);
  const bySprint= useBySprint(pid);
  const byTeam  = useByTeam(pid);
  const trend   = useTrend(pid);
  const age     = useAgeDistribution(pid);
  const burndown= useBurndown(pid);
  const velocity= useVelocityData(pid);
  const budget  = useBudgetUtilization(pid);
  const resTime = useResolutionTime(pid);
  const health  = useProjectHealth(pid);
  const overdue = useOverdueIssues(pid);
  const sla     = useSLACompliance(pid);
  const cumul   = useCumulativeTrend(pid);

  const d = h => Array.isArray(h.data) ? h.data : [];
  const L = h => h.isLoading;
  const s = stats.data || {};

  const pageTitle = isSA ? 'SuperAdmin Dashboard' : isAdmin ? 'Admin Dashboard' : isDev ? 'My Workboard' : 'QA Dashboard';

  const kpis = [
    isAdmin && { title:'Total Projects', value:s.totalProjects,  Icon:FiBriefcase,   color:'#f59e0b', link:'/projects' },
    isAdmin && { title:'Total Users',    value:s.totalUsers,     Icon:FiUsers,       color:'#3b82f6', link:'/users-management' },
    { title:'Open Issues',   value:s.openIssues,      Icon:FiAlertCircle, color:'#ef4444', link:'/issues' },
    { title:'Resolved',      value:s.resolvedIssues,  Icon:FiCheckSquare, color:'#16a34a', link:'/issues' },
    (isDev||isTst) && { title:'My Projects',  value:s.myProjects,   Icon:FiBriefcase,  color:'#7c3aed', link:'/my-projects' },
    isDev  && { title:'My Open Tasks', value:s.myOpenTasks,  Icon:FiList,      color:'#f97316', link:'/issues' },
    isTst  && { title:'Pending Verify',value:s.pendingVerify,Icon:FiActivity,  color:'#0891b2', link:'/issues' },
    isAdmin && { title:'Overdue',       value:s.overdueCount, Icon:FiClock,     color:'#f43f5e', link:'/issues' },
  ].filter(Boolean);

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden', fontFamily:"'Inter',sans-serif", background:'#f8fafc' }}>
      {isAdmin && <ProjectSidebar selected={pid} onSelect={setPid} />}
      <div style={{ flex:1, overflowY:'auto', minWidth:0 }}>
        <div style={{ padding:'1.5rem 1.75rem' }}>

          
          <div style={{ marginBottom:'1.25rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <h1 style={{ fontSize:'1.4rem', fontWeight:800, color:'#1e293b', margin:0 }}>{pageTitle}</h1>
              {pid && (
                <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'3px 10px', borderRadius:99, fontSize:'0.75rem', fontWeight:700 }}>
                  Filtered: Project {pid}
                  <button onClick={() => setPid(null)}
                    style={{ marginLeft:6, background:'transparent', border:'none', color:'#1d4ed8', cursor:'pointer', fontSize:'0.85rem', lineHeight:1, padding:0 }}>✕</button>
                </span>
              )}
            </div>
            <p style={{ color:'#6b7280', fontSize:'0.82rem', margin:'3px 0 0' }}>Live data · real-time on issue updates</p>
          </div>

          
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:'1.25rem' }}>
            {L(stats)
              ? Array(Math.min(kpis.length,4)).fill(0).map((_,i) => <div key={i} style={{ flex:'1 1 160px', height:88, background:'#e9eef5', borderRadius:12 }} />)
              : kpis.map((k,i) => <KPI key={i} {...k} nav={navigate} />)
            }
          </div>

         
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'0.9rem' }}>

           
            <Card title="Issues by Status" sub="Current breakdown by status">
              {W(L(byStatus), d(byStatus),
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={d(byStatus)} dataKey="count" nameKey="label" cx="50%" cy="50%"
                      outerRadius={82} innerRadius={42}
                      label={({ label, percent }) => percent>0.04 ? `${label} ${Math.round(percent*100)}%` : ''}
                      labelLine={false}>
                      {d(byStatus).map((e,i) => <Cell key={i} fill={STATUS_CLR[(e.label||'').toLowerCase()]||P[i%P.length]} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Bug vs Task Ratio" sub="Issue type distribution">
              {W(L(byType), d(byType),
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d(byType)} layout="vertical" margin={{ left:10, right:10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize:11 }} />
                    <YAxis dataKey="label" type="category" tick={{ fontSize:12, fontWeight:600 }} width={65} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="count" name="Count" radius={[0,8,8,0]}>
                      {d(byType).map((_,i) => <Cell key={i} fill={P[i%P.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card title="Issues per Sprint" sub="Volume across sprints" cols={2}>
              {W(L(bySprint), d(bySprint),
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={d(bySprint)} margin={{ left:-10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="sprint" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="count" name="Issues" radius={[5,5,0,0]}>
                      {d(bySprint).map((_,i) => <Cell key={i} fill={P[i%P.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              , 220)}
            </Card>

           
            <Card title="Issues by Team" sub="Workload distribution">
              {W(L(byTeam), d(byTeam),
                <ResponsiveContainer width="100%" height={200}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={90} startAngle={180} endAngle={-180}
                    data={d(byTeam).map((r,i) => ({ ...r, fill:P[i%P.length], name: r.team||r.label||'?' }))}>
                    <RadialBar minAngle={10} background dataKey="count" />
                    <Tooltip content={<Tip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize:10 }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              )}
            </Card>

          
            <Card title="Open vs Closed Trend" sub="Issue status over time">
              {W(L(trend), d(trend),
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={d(trend)} margin={{ left:-10 }}>
                    <defs>
                      <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip content={<Tip />} /><Legend />
                    <Area type="monotone" dataKey="open"   stroke="#ef4444" strokeWidth={2} fill="url(#gO)" name="Open" />
                    <Area type="monotone" dataKey="closed" stroke="#16a34a" strokeWidth={2} fill="url(#gC)" name="Closed" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* 6. Sprint Progress — COMPOSED */}
            <Card title="Sprint Progress" sub="Done vs remaining per sprint">
              {W(L(burndown), d(burndown),
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={d(burndown)} margin={{ left:-10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="sprint" tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize:10 }} />
                    <Bar dataKey="done"      name="Done"      fill="#16a34a" radius={[3,3,0,0]} stackId="a" />
                    <Bar dataKey="remaining" name="Remaining" fill="#f97316" radius={[3,3,0,0]} stackId="a" />
                    <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Ideal" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Card>

          
            {isAdmin && (
              <Card title="Team Velocity" sub="Issues closed per sprint by team" cols={2}>
                {W(L(velocity), d(velocity),
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d(velocity)} margin={{ left:-10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="sprint" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:11 }} />
                      <Tooltip content={<Tip />} /><Legend />
                      {['Frontend','Backend','QA','DevOps'].map((t,i) => (
                        <Bar key={t} dataKey={t} stackId="v" fill={P[i]} radius={i===3?[4,4,0,0]:undefined} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                , 220)}
              </Card>
            )}

          
            {isAdmin && (
              <Card title="Budget Utilization" sub="Allocated vs used per project" cols={2}>
                {W(L(budget), d(budget),
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={d(budget)} margin={{ left:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize:10 }} />
                      <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{ fontSize:11 }} />
                      <Tooltip formatter={v=>[`$${Number(v).toLocaleString()}`,'']} />
                      <Legend />
                      <Bar dataKey="budget_total" name="Allocated" fill="#bfdbfe" radius={[4,4,0,0]} />
                      <Bar dataKey="budget_used"  name="Used"      fill="#2563eb" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                , 220)}
              </Card>
            )}

            {isAdmin && (
              <Card title="Avg Resolution Time" sub="Days to close an issue, by team">
                {W(L(resTime), d(resTime),
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={d(resTime)} margin={{ left:-10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="team" tick={{ fontSize:11 }} />
                      <YAxis tick={{ fontSize:11 }} unit="d" />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="avg_days" name="Avg Days" radius={[5,5,0,0]}>
                        {d(resTime).map((_,i) => <Cell key={i} fill={P[i%P.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}

        
            <Card title="Issue Age Distribution" sub="How long open issues have been waiting">
              {W(L(age), d(age),
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={d(age)} margin={{ left:-10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip content={<Tip />} />
                    <Bar dataKey="count" name="Issues" radius={[5,5,0,0]}>
                      {d(age).map((_,i) => <Cell key={i} fill={['#4ade80','#60a5fa','#fbbf24','#f97316','#ef4444'][i%5]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

         
            {isAdmin && (
              <Card title="Project Health Overview" sub="% resolved per project">
                {W(L(health), d(health),
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={d(health)} cx="50%" cy="50%" outerRadius={75}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize:9 }} />
                      <Radar name="Health %" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.22} />
                      <Tooltip content={<Tip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}

            
            {isAdmin && (
              <Card title="Open Issues per Project" sub="Current open count by project">
                {W(L(overdue), d(overdue),
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={d(overdue)} layout="vertical" margin={{ left:10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize:11 }} />
                      <YAxis dataKey="project" type="category" tick={{ fontSize:10 }} width={85} />
                      <Tooltip content={<Tip />} />
                      <Bar dataKey="count" name="Open Issues" radius={[0,5,5,0]}>
                        {d(overdue).map((_,i) => <Cell key={i} fill={P[i%P.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}

         
            {isAdmin && (
              <Card title="SLA Compliance" sub="Resolved vs open issues">
                {W(L(sla), d(sla),
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={d(sla)} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        outerRadius={82} innerRadius={48}
                        label={({ name, percent }) => percent>0.04 ? `${name} ${Math.round(percent*100)}%` : ''}
                        labelLine={false}>
                        {d(sla).map((_,i) => <Cell key={i} fill={i===0?'#16a34a':'#ef4444'} />)}
                      </Pie>
                      <Tooltip content={<Tip />} /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}

          
            <Card title="Cumulative Issue Volume" sub="Total issues created over time" cols={2}>
              {W(L(cumul), d(cumul),
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={d(cumul)} margin={{ left:-5 }}>
                    <defs>
                      <linearGradient id="gCumul" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize:10 }} />
                    <YAxis tick={{ fontSize:11 }} />
                    <Tooltip content={<Tip />} /><Legend />
                    <Area type="monotone" dataKey="monthly" stroke="#93c5fd" strokeWidth={1.5} fill="none" name="Monthly" />
                    <Area type="monotone" dataKey="total"   stroke="#2563eb" strokeWidth={2.5} fill="url(#gCumul)" name="Total" />
                  </AreaChart>
                </ResponsiveContainer>
              , 220)}
            </Card>

          </div>

          
          {isSA && <RoleOverview pid={pid} />}

        </div>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </div>
  );
};

export default Dashboard;
