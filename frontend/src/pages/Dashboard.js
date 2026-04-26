import React, { useContext, useState } from 'react';
import { AuthContext } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

import {
  PieChart, Pie, Cell,
  BarChart, Bar,
  AreaChart, Area,
  ComposedChart,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';

import {
  useDashboardStats,
  useByStatus,
  useByType,
  useBySprint,
  useByTeam,
  useTrend,
  useAgeDistribution,
  useBurndown,
  useProjectList,
  useSolarStats,
  useBySeverity,
} from '../api/dashboardApi';

import { FiAlertCircle, FiCheckSquare, FiSun, FiZap, FiActivity, FiMap, FiTruck } from 'react-icons/fi';

const KPI = ({ title, value, Icon, color, link, nav }) => (
  <div
    onClick={() => link && nav(link)}
    style={{
      background: '#fff',
      padding: '1.4rem',
      borderRadius: 16,
      border: '1px solid #e5e7eb',
      borderTop: `5px solid ${color}`,
      flex: '1 1 200px',
      cursor: link ? 'pointer' : 'default',
      boxShadow: '0 6px 16px rgba(0,0,0,0.07)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#1e293b', marginTop: 8 }}>
          {value ?? '—'}
        </div>
      </div>
      {Icon && <Icon size={38} color={color} />}
    </div>
  </div>
);

const ProjectSidebar = ({ selected, onSelect }) => {
  const { data: projects = [], isLoading } = useProjectList();
  const [search, setSearch] = useState('');

  const filtered = projects.filter(p =>
    !search || (p.projectname || p.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ width: 280, background: '#1e3a8a', color: '#fff', height: '100vh', overflowY: 'auto', paddingTop: '1rem' }}>
      <div style={{ padding: '0 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
        <input
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.95rem' }}
        />
      </div>

      <div style={{ padding: '1rem 0.75rem' }}>
        <div
          onClick={() => onSelect(null)}
          style={{ padding: '12px 16px', borderRadius: 10, background: !selected ? '#3b82f6' : 'transparent', cursor: 'pointer', marginBottom: 6, fontWeight: 500 }}
        >
          All Projects
        </div>

        {isLoading ? <div style={{ padding: '12px', color: '#94a3b8' }}>Loading...</div> :
          filtered.map(p => {
            const id = p.projectid || p.project_id;
            const name = p.projectname || p.name || `Project ${id}`;
            const isSel = String(selected) === String(id);
            return (
              <div
                key={id}
                onClick={() => onSelect(id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  background: isSel ? '#3b82f6' : 'transparent',
                  cursor: 'pointer',
                  marginBottom: 4,
                  fontSize: '0.95rem'
                }}
              >
                {name}
              </div>
            );
          })
        }
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { role, user } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || '').toLowerCase();
  const isAdmin = ['admin', 'superadmin'].includes(currentRole);
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState(null);

  // 🚀 Enhanced click handler for ALL charts
  const handleChartClick = (data, chartType) => {
    if (!data) return;

    let filter = '';

    // Open vs Closed Trend (AreaChart)
    if (chartType === 'trend') {
      filter = data.activePayload?.[0]?.dataKey === 'open' ? '?status=Open' : '?status=Done';
    }

    // Team Workload
    if (chartType === 'team') {
      filter = `?team=${data.name}`;
    }

    // Issue Age & Severity Heatmap
    if (chartType === 'age') {
      if (data.activePayload?.[0]?.dataKey) {
        const severityMap = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
        filter = `?severity=${severityMap[data.activePayload[0].dataKey] || data.activePayload[0].dataKey}`;
      } else if (data.activeLabel) {
        filter = `?age=${data.activeLabel}`;
      }
    }

    // Sprint Burndown / Volume
    if (chartType === 'sprint') {
      filter = `?sprint=${data.activeLabel || data.name}`;
    }

    // Defects by Severity (Pie)
    if (chartType === 'severity') {
      filter = `?severity=${data.name}`;
    }

    // Issues by Type (Bar)
    if (chartType === 'type') {
      filter = `?issuetype=${data.name}`;
    }

    // Production Output by Stage
    if (chartType === 'production') {
      filter = `?stage=${data.name || data.stage}`;
    }

    // Daily Defect Rate
    if (chartType === 'defectRate') {
      filter = `?date=${data.activeLabel || data.day}`;
    }

    // Navigate to issues with filter
    if (filter) {
      navigate(`/issues${filter}${selectedProject ? `&project=${selectedProject}` : ''}`);
    }
  };

  // Data hooks
  const stats = useDashboardStats(selectedProject);
  const solar = useSolarStats();
  const byStatus = useByStatus(selectedProject);
  const byType = useByType(selectedProject);
  const bySprint = useBySprint(selectedProject);
  const byTeam = useByTeam(selectedProject);
  const bySeverity = useBySeverity(selectedProject);
  const trend = useTrend(selectedProject);
  const age = useAgeDistribution(selectedProject);
  const burndown = useBurndown(selectedProject);

  const s = stats.data || {};
  const sol = solar.data || {};

  const ageData = age.data || [];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
      {isAdmin && <ProjectSidebar selected={selectedProject} onSelect={setSelectedProject} />}

      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>Emmvee Solar Ops Dashboard</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Real-time manufacturing + quality tracking</p>

        {/* KPI Row 1: Operations */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <KPI title="TOTAL DEFECTS LOGGED" value={sol.totalDefects ?? 0} Icon={FiAlertCircle} color="#ef4444" link="/issues?issuetype=Defect" nav={navigate} />
          <KPI title="CRITICAL DEFECTS" value={sol.criticalDefects ?? 0} Icon={FiZap} color="#f97316" link="/issues?severity=Critical" nav={navigate} />
          <KPI title="MODULES TRACKED" value={sol.modulesProduced ?? 0} Icon={FiSun} color="#16a34a" link="/production-tracking" nav={navigate} />
          <KPI title="OPEN ISSUES" value={s.openIssues ?? 0} Icon={FiAlertCircle} color="#ef4444" link="/issues?status=Open" nav={navigate} />
          <KPI title="RESOLVED ISSUES" value={s.resolvedIssues ?? 0} Icon={FiCheckSquare} color="#16a34a" link="/issues?status=Done" nav={navigate} />
        </div>

        {/* KPI Row 2: Performance Metrics */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
          <KPI title="AVG RESOLUTION TIME" value={`${sol.avgResolutionTime ?? 0}d`} Icon={FiActivity} color="#3b82f6" link="/quality-assurance" nav={navigate} />
          <KPI title="SITE INSTALL CYCLE" value={`${sol.avgSiteCycleTime ?? 0}d`} Icon={FiMap} color="#8b5cf6" link="/field-service" nav={navigate} />
          <KPI title="VENDOR PERFORMANCE" value={`${sol.avgVendorScore ?? 0}%`} Icon={FiTruck} color="#10b981" link="/supply-chain" nav={navigate} />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
          <button onClick={() => navigate('/production-tracking')} style={{ padding: '14px 34px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600 }}>
            📦 Production Tracking
          </button>
          <button onClick={() => navigate('/issues')} style={{ padding: '14px 34px', background: '#334155', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600 }}>
            ⚠️ View All Issues
          </button>
        </div>

        {/* Charts Grid - ALL CLICKABLE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.75rem' }}>

          {/* 1. Open vs Closed Trend - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '1rem' }}>Open vs Closed Trend 🔗</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend.data || []} onClick={(data) => handleChartClick(data, 'trend')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip cursor={{ cursor: 'pointer' }} />
                <Area type="natural" dataKey="open" stroke="#ef4444" fill="#fee2e2" strokeWidth={3} />
                <Area type="natural" dataKey="closed" stroke="#16a34a" fill="#dcfce7" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 2. Team Workload - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '1rem' }}>Team Workload 🔗</h3>
            <ResponsiveContainer width="100%" height={280}>
              <RadialBarChart
                cx="50%" cy="50%"
                innerRadius="40%"
                outerRadius="85%"
                data={byTeam.data?.map((d, i) => ({
                  name: d.label,
                  count: d.count,
                  fill: ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5]
                })) || []}
                onClick={(data) => handleChartClick(data, 'team')}
              >
                <RadialBar dataKey="count" background />
                <Tooltip cursor={{ cursor: 'pointer' }} />
                <Legend />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          {/* 3. FIXED Issue Age & Severity Heatmap - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Issue Age & Severity 🔗</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Click bars for severity filter</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ageData} onClick={(data) => handleChartClick(data, 'age')}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="range" label={{ value: 'Days Open', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip cursor={{ fill: '#f8fafc', cursor: 'pointer' }} />
                <Legend />
                <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="high" name="High" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="medium" name="Medium" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
                <Bar dataKey="low" name="Low" stackId="a" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 4. Sprint Burndown - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '1rem' }}>Sprint Burndown 🔗</h3>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={burndown.data || []} onClick={(data) => handleChartClick(data, 'sprint')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="sprint" />
                <YAxis />
                <Tooltip cursor={{ cursor: 'pointer' }} />
                <Bar dataKey="done" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="remaining" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Line type="natural" dataKey="ideal" stroke="#64748b" strokeWidth={2.5} strokeDasharray="5 5" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 5. Defects by Severity - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '1rem' }}>Defects by Severity 🔗</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={bySeverity.data?.length ? bySeverity.data.map(item => ({ name: item.label, value: Number(item.count) })) : []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                  onClick={(data) => handleChartClick(data, 'severity')}
                >
                  {bySeverity.data?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.label === 'Critical' ? '#ef4444' : entry.label === 'High' ? '#f97316' : entry.label === 'Medium' ? '#eab308' : '#22c55e'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 6. Issues by Type - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '1rem' }}>Issues by Type 🔗</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={byType.data || []} layout="vertical" margin={{ left: 20 }} onClick={(data) => handleChartClick(data, 'type')}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="label" type="category" width={80} />
                <Tooltip cursor={{ fill: '#f1f5f9', cursor: 'pointer' }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {byType.data?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f97316'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 7. Sprint Volume - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '1rem' }}>Sprint Volume 🔗</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={bySprint.data || []} margin={{ left: -15, right: 15 }} onClick={(data) => handleChartClick(data, 'sprint')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip cursor={{ cursor: 'pointer' }} />
                <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={4} activeDot={{ r: 8 }} dot={{ strokeWidth: 3, r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 8. Production Output by Stage - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '1rem' }}>Production Output by Stage 🔗</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={sol.productionByStage || []}
                onClick={(data) => handleChartClick(data, 'production')}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stage" />
                <YAxis />
                <Tooltip cursor={{ cursor: 'pointer' }} />
                <Bar dataKey="count" fill="#1e40af" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 9. Daily Defect Rate - CLICKABLE */}
          <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
            <h3 style={{ marginBottom: '1rem' }}>Daily Defect Rate (%) 🔗</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={sol.defectTrend || []}
                onClick={(data) => handleChartClick(data, 'defectRate')}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis unit="%" />
                <Tooltip cursor={{ cursor: 'pointer' }} />
                <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

// import React, { useContext, useState } from 'react';
// import { AuthContext } from '../auth/AuthContext';
// import { useNavigate } from 'react-router-dom';

// import {
//   PieChart, Pie, Cell,
//   BarChart, Bar,
//   LineChart, Line,
//   AreaChart, Area,
//   ComposedChart,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
//   RadialBarChart, RadialBar,
// } from 'recharts';

// import {
//   useDashboardStats,
//   useByStatus,
//   useByType,
//   useBySprint,
//   useByTeam,
//   useTrend,
//   useAgeDistribution,
//   useBurndown,
//   useVelocityData,
//   useBudgetUtilization,
//   useResolutionTime,
//   useProjectHealth,
//   useOverdueIssues,
//   useSLACompliance,
//   useCumulativeTrend,
//   useProjectList,
//   useSolarStats,
// } from '../api/dashboardApi';

// import { FiAlertCircle, FiCheckSquare, FiSun, FiZap, FiBriefcase, FiUsers } from 'react-icons/fi';

// const KPI = ({ title, value, Icon, color, link, nav }) => (
//   <div
//     onClick={() => link && nav(link)}
//     style={{
//       background: '#fff',
//       padding: '1.4rem',
//       borderRadius: 16,
//       border: '1px solid #e5e7eb',
//       borderTop: `5px solid ${color}`,
//       flex: '1 1 200px',
//       cursor: link ? 'pointer' : 'default',
//       boxShadow: '0 6px 16px rgba(0,0,0,0.07)',
//       transition: 'transform 0.2s',
//     }}
//     onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
//     onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
//   >
//     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
//       <div>
//         <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</div>
//         <div style={{ fontSize: '2.6rem', fontWeight: 800, color: '#1e293b', marginTop: 12 }}>{value ?? 0}</div>
//       </div>
//       {Icon && <Icon size={38} color={color} />}
//     </div>
//   </div>
// );

// const ProjectSidebar = ({ selected, onSelect }) => {
//   const { data: projects = [], isLoading } = useProjectList();
//   const [search, setSearch] = useState('');

//   const filtered = projects.filter(p => 
//     !search || (p.projectname || p.name || '').toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div style={{ width: 280, background: '#1e3a8a', color: '#fff', height: '100vh', overflowY: 'auto', paddingTop: '1rem' }}>
//       <div style={{ padding: '0 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
//         <input
//           placeholder="Search projects..."
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//           style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.95rem' }}
//         />
//       </div>

//       <div style={{ padding: '1rem 0.75rem' }}>
//         <div 
//           onClick={() => onSelect(null)}
//           style={{ padding: '12px 16px', borderRadius: 10, background: !selected ? '#3b82f6' : 'transparent', cursor: 'pointer', marginBottom: 6, fontWeight: 500 }}
//         >
//           All Projects
//         </div>

//         {isLoading ? <div style={{ padding: '12px', color: '#94a3b8' }}>Loading...</div> : 
//           filtered.map(p => {
//             const id = p.projectid || p.project_id;
//             const name = p.projectname || p.name || `Project ${id}`;
//             const isSel = String(selected) === String(id);
//             return (
//               <div
//                 key={id}
//                 onClick={() => onSelect(id)}
//                 style={{
//                   padding: '12px 16px',
//                   borderRadius: 10,
//                   background: isSel ? '#3b82f6' : 'transparent',
//                   cursor: 'pointer',
//                   marginBottom: 4,
//                   fontSize: '0.95rem'
//                 }}
//               >
//                 {name}
//               </div>
//             );
//           })
//         }
//       </div>
//     </div>
//   );
// };

// const Dashboard = () => {
//   const { role, user } = useContext(AuthContext) || {};
//   const currentRole = (role || user?.role || '').toLowerCase();
//   const isAdmin = ['admin', 'superadmin'].includes(currentRole);
//   const navigate = useNavigate();

//   const [selectedProject, setSelectedProject] = useState(null);

//   // All real hooks
//   const stats     = useDashboardStats(selectedProject);
//   const solar     = useSolarStats();
//   const byStatus  = useByStatus(selectedProject);
//   const byType    = useByType(selectedProject);
//   const bySprint  = useBySprint(selectedProject);
//   const byTeam    = useByTeam(selectedProject);
//   const trend     = useTrend(selectedProject);
//   const age       = useAgeDistribution(selectedProject);
//   const burndown  = useBurndown(selectedProject);
//   const velocity  = useVelocityData(selectedProject);
//   const budget    = useBudgetUtilization(selectedProject);
//   const resTime   = useResolutionTime(selectedProject);
//   const health    = useProjectHealth(selectedProject);
//   const overdue   = useOverdueIssues(selectedProject);
//   const sla       = useSLACompliance(selectedProject);
//   const cumul     = useCumulativeTrend(selectedProject);

//   const s = stats.data || {};
//   const sol = solar.data || {};

//   // Fallback data when real data is empty
//   const fallbackTrend = [{ date: 'May 24', open: 12, closed: 8 }];

//   return (
//     <div style={{ display: 'flex', height: '100vh', background: '#f8fafc', overflow: 'hidden' }}>
//       {/* Project Sidebar for Admin */}
//       {isAdmin && <ProjectSidebar selected={selectedProject} onSelect={setSelectedProject} />}

//       {/* Main Content */}
//       <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
//         <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>Emmvee Solar Ops Dashboard</h1>
//         <p style={{ color: '#64748b', marginBottom: '2rem' }}>Real-time manufacturing + quality tracking</p>

//         {/* KPI Row */}
//         <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '3rem' }}>
//           <KPI title="TOTAL DEFECTS LOGGED" value={sol.totalDefects || 0} Icon={FiAlertCircle} color="#ef4444" link="/issues" nav={navigate} />
//           <KPI title="CRITICAL DEFECTS" value={sol.criticalDefects || 0} Icon={FiZap} color="#f97316" link="/issues" nav={navigate} />
//           <KPI title="MODULES TRACKED" value={sol.modulesProduced || 0} Icon={FiSun} color="#16a34a" link="/production-tracking" nav={navigate} />
//           <KPI title="OPEN ISSUES" value={s.openIssues || 0} Icon={FiAlertCircle} color="#ef4444" link="/issues" nav={navigate} />
//           <KPI title="RESOLVED ISSUES" value={s.resolvedIssues || 0} Icon={FiCheckSquare} color="#16a34a" link="/issues" nav={navigate} />
//         </div>

//         {/* Action Buttons */}
//         <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
//           <button onClick={() => navigate('/production-tracking')} style={{ padding: '14px 34px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '1.05rem' }}>
//             📦 Production Tracking
//           </button>
//           <button onClick={() => navigate('/issues')} style={{ padding: '14px 34px', background: '#334155', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '1.05rem' }}>
//             ⚠️ View All Issues
//           </button>
//         </div>

//         {/* Charts Grid */}
//         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.75rem' }}>

//           {/* 1. Open vs Closed Trend */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Open vs Closed Trend</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <AreaChart data={trend.data?.length ? trend.data : fallbackTrend}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                 <XAxis dataKey="date" />
//                 <YAxis />
//                 <Tooltip />
//                 <Area type="natural" dataKey="open" stroke="#ef4444" fill="#fee2e2" strokeWidth={3} />
//                 <Area type="natural" dataKey="closed" stroke="#16a34a" fill="#dcfce7" strokeWidth={3} />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>

//           {/* 2. Team Workload - Radial */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Team Workload Distribution</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <RadialBarChart cx="50%" cy="50%" innerRadius="40%" outerRadius="85%" data={byTeam.data?.length ? byTeam.data : [{team:'QA', count:42}]}>
//                 <RadialBar dataKey="count" fill="#2563eb" background />
//                 <Tooltip />
//                 <Legend />
//               </RadialBarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* 3. Issue Age Distribution */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Issue Age Distribution</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <BarChart data={age.data?.length ? age.data : [{range:'0-7 days', count:12}]}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="range" />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="count" fill="#f59e0b" radius={[6,6,0,0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* 4. Sprint Burndown */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Sprint Burndown</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <ComposedChart data={burndown.data?.length ? burndown.data : [{sprint:'Sprint 1', done:1, remaining:0}]}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="sprint" />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="done" fill="#16a34a" radius={[4,4,0,0]} />
//                 <Bar dataKey="remaining" fill="#f97316" radius={[4,4,0,0]} />
//                 <Line type="natural" dataKey="ideal" stroke="#64748b" strokeWidth={2.5} strokeDasharray="5 5" />
//               </ComposedChart>
//             </ResponsiveContainer>
//           </div>

//           {/* 5. Defects by Severity - Pie */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Defects by Severity</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <PieChart>
//                 <Pie data={[
//                   {name:'Critical', value: sol.criticalDefects || 19},
//                   {name:'High', value: 31},
//                   {name:'Medium', value: 52},
//                   {name:'Low', value: 40}
//                 ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
//                   <Cell fill="#ef4444" />
//                   <Cell fill="#f97316" />
//                   <Cell fill="#eab308" />
//                   <Cell fill="#22c55e" />
//                 </Pie>
//                 <Tooltip />
//                 <Legend />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>

//           {/* 6. Issues by Production Stage */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Issues by Production Stage</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <BarChart data={[
//                 {stage:'Cell', count:15},
//                 {stage:'Module', count:23},
//                 {stage:'Testing', count:12},
//                 {stage:'Dispatch', count:5}
//               ]}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="stage" />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="count" fill="#0ea5e9" radius={[8,8,0,0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* 7. Cumulative Issue Volume */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Cumulative Issue Volume</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <AreaChart data={cumul.data?.length ? cumul.data : trend.data?.length ? trend.data : fallbackTrend}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="date" />
//                 <YAxis />
//                 <Tooltip />
//                 <Area type="natural" dataKey="total" stroke="#1e40af" fill="#bfdbfe" strokeWidth={3} />
//               </AreaChart>
//             </ResponsiveContainer>
//           </div>

//           {/* 8. By Status Bar */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Issues by Status</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <BarChart data={byStatus.data?.length ? byStatus.data : []}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="label" />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="count" fill="#2563eb" radius={[4,4,0,0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//           {/* 9. Team Workload Bar */}
//           <div style={{ background: '#fff', padding: '1.75rem', borderRadius: 16, boxShadow: '0 6px 20px rgba(0,0,0,0.07)' }}>
//             <h3 style={{ marginBottom: '1rem' }}>Team Workload</h3>
//             <ResponsiveContainer width="100%" height={280}>
//               <BarChart data={byTeam.data?.length ? byTeam.data : []}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis dataKey="team" />
//                 <YAxis />
//                 <Tooltip />
//                 <Bar dataKey="count" fill="#16a34a" radius={[4,4,0,0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>

//         </div>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;
// import { useContext, useState } from 'react';
// import { AuthContext } from '../auth/AuthContext';
// import { useNavigate } from 'react-router-dom';
// import {
//   BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
//   AreaChart, Area, ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis,
//   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
//   RadialBarChart, RadialBar,
// } from 'recharts';
// import {
//   useDashboardStats, useByStatus, useByType, useBySprint, useByTeam,
//   useTrend, useAgeDistribution, useBurndown, useVelocityData,
//   useBudgetUtilization, useResolutionTime, useProjectHealth,
//   useOverdueIssues, useSLACompliance, useCumulativeTrend,
//   useProjectList, useRoleOverview,
// } from '../api/dashboardApi';
// import { FiAlertCircle, FiCheckSquare, FiBriefcase, FiUsers, FiClock, FiList, FiActivity } from 'react-icons/fi';

// // ── Palette & helpers ────────────────────────────────────────────────────────
// const P = ['#2563eb','#7c3aed','#0891b2','#16a34a','#dc2626','#ea580c','#0d9488','#9333ea','#ca8a04','#be185d'];
// const STATUS_CLR = { open:'#2563eb','in progress':'#7c3aed','in review':'#0891b2',blocked:'#dc2626',done:'#16a34a',verified:'#0d9488','needs info':'#ea580c',closed:'#94a3b8' };
// const sdot = s => ({'active':'#16a34a','in progress':'#2563eb',completed:'#7c3aed','on hold':'#ca8a04',blocked:'#dc2626',planning:'#94a3b8','cancelled':'#dc2626'}[(s||'').toLowerCase()]||'#94a3b8');

// const Tip = ({ active, payload, label }) => {
//   if (!active || !payload?.length) return null;
//   return (
//     <div style={{ background:'#1e293b', padding:'8px 12px', borderRadius:8, fontSize:'0.79rem', color:'#fff', boxShadow:'0 4px 12px rgba(0,0,0,.25)', maxWidth:220 }}>
//       {label && <div style={{ color:'#94a3b8', marginBottom:4, fontSize:'0.7rem' }}>{label}</div>}
//       {payload.map((p,i) => (
//         <div key={i} style={{ color: p.color||'#e2e8f0' }}>
//           {p.name}: <b>{typeof p.value==='number' ? p.value.toLocaleString() : p.value}</b>
//         </div>
//       ))}
//     </div>
//   );
// };

// const Skel = ({ h=200 }) => (
//   <div style={{ height:h, borderRadius:8, background:'linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
// );
// const Empty = ({ h=200, msg='No data yet' }) => (
//   <div style={{ height:h, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#cbd5e1', gap:6 }}>
//     <span style={{ fontSize:'1.6rem' }}>📊</span>
//     <span style={{ fontSize:'0.78rem' }}>{msg}</span>
//   </div>
// );

// const Card = ({ title, sub, children, cols=1 }) => (
//   <div style={{ background:'#fff', borderRadius:12, padding:'1.1rem 1.25rem', border:'1px solid #e5e7eb', gridColumn:`span ${cols}`, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
//     <div style={{ fontWeight:700, fontSize:'0.88rem', color:'#1e293b' }}>{title}</div>
//     {sub && <div style={{ fontSize:'0.71rem', color:'#94a3b8', marginBottom:'0.75rem', marginTop:1 }}>{sub}</div>}
//     <div style={{ marginTop: sub ? 0 : '0.6rem' }}>{children}</div>
//   </div>
// );

// const W = (loading, data, chart, h=200) =>
//   loading ? <Skel h={h} /> : !data?.length ? <Empty h={h} /> : chart;

// // ── KPI Card ──────────────────────────────────────────────────────────────────
// const KPI = ({ title, value, Icon, color, link, nav }) => (
//   <div onClick={() => link && nav(link)}
//     style={{ background:'#fff', flex:'1 1 160px', padding:'1.1rem 1.4rem', borderRadius:12,
//       border:'1px solid #e5e7eb', borderTop:`3px solid ${color}`,
//       cursor:link?'pointer':'default', boxShadow:'0 1px 4px rgba(0,0,0,.04)',
//       transition:'box-shadow .15s,transform .15s' }}
//     onMouseEnter={e => { if(link){e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.10)';e.currentTarget.style.transform='translateY(-2px)'}}}
//     onMouseLeave={e => { e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)';e.currentTarget.style.transform=''}}>
//     <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
//       <div>
//         <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em' }}>{title}</div>
//         <div style={{ fontSize:'2rem', fontWeight:800, color:'#1e293b', lineHeight:1.1, marginTop:4 }}>
//           {value ?? <span style={{ color:'#d1d5db', fontWeight:400, fontSize:'1.4rem' }}>—</span>}
//         </div>
//       </div>
//       {Icon && <div style={{ width:38, height:38, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon size={18} color={color} /></div>}
//     </div>
//   </div>
// );

// // ── Project Sidebar — always visible for admin/superadmin ─────────────────────
// const ProjectSidebar = ({ selected, onSelect }) => {
//   const [search, setSearch] = useState('');
//   const { data: projects = [], isLoading } = useProjectList();

//   const filtered = projects.filter(p =>
//     !search || (p.projectname||p.name||'').toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div style={{
//       width:230, flexShrink:0, background:'#fff', display:'flex', flexDirection:'column',
//       borderRight:'1px solid #e5e7eb', height:'100%', overflow:'hidden',
//     }}>
//       {/* Header */}
//       <div style={{ padding:'14px 14px 10px', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
//         <div style={{ fontWeight:800, fontSize:'0.78rem', color:'#1e293b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
//           Projects
//           <span style={{ marginLeft:6, fontWeight:600, color:'#94a3b8', fontSize:'0.72rem', textTransform:'none', letterSpacing:0 }}>
//             ({projects.length})
//           </span>
//         </div>
//         <input
//           placeholder="Search…"
//           value={search}
//           onChange={e => setSearch(e.target.value)}
//           style={{ width:'100%', padding:'6px 10px', border:'1px solid #e5e7eb', borderRadius:7, fontSize:'0.79rem', outline:'none', background:'#f8fafc', boxSizing:'border-box', color:'#374151' }}
//         />
//       </div>

//       {/* Scroll list */}
//       <div style={{ flex:1, overflowY:'auto' }}>
//         {/* All Projects row */}
//         <div onClick={() => onSelect(null)}
//           style={{ padding:'9px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:8,
//             background: !selected ? '#eff6ff' : 'transparent',
//             borderLeft: !selected ? '3px solid #2563eb' : '3px solid transparent',
//             borderBottom:'1px solid #f8fafc' }}>
//           <span style={{ fontSize:'0.83rem', fontWeight:700, color: !selected ? '#1d4ed8' : '#374151' }}>All Projects</span>
//         </div>

//         {isLoading && <div style={{ padding:'1rem', fontSize:'0.79rem', color:'#94a3b8' }}>Loading…</div>}

//         {filtered.map(p => {
//           const id   = p.projectid ?? p.project_id;
//           const name = p.projectname ?? p.name ?? `Project ${id}`;
//           const sel  = String(selected) === String(id);
//           const bPct = p.budget_total > 0 ? Math.min(100, Math.round((p.budget_used / p.budget_total) * 100)) : 0;
//           const bClr = bPct > 85 ? '#dc2626' : bPct > 65 ? '#f59e0b' : '#16a34a';
//           const open = parseInt(p.open_count) || 0;
//           const total= parseInt(p.issue_count) || 0;

//           return (
//             <div key={id ?? name} onClick={() => onSelect(id)}
//               style={{ padding:'9px 14px', cursor:'pointer', borderBottom:'1px solid #f8fafc',
//                 background: sel ? '#eff6ff' : 'transparent',
//                 borderLeft: sel ? '3px solid #2563eb' : '3px solid transparent',
//                 transition:'background .12s' }}
//               onMouseEnter={e => { if(!sel) e.currentTarget.style.background='#f8fafc'; }}
//               onMouseLeave={e => { if(!sel) e.currentTarget.style.background='transparent'; }}>

//               <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
//                 <span style={{ width:7, height:7, borderRadius:'50%', background:sdot(p.status), flexShrink:0 }} />
//                 <span style={{ fontSize:'0.81rem', fontWeight:600, color: sel ? '#1d4ed8' : '#1e293b',
//                   overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }} title={name}>
//                   {name}
//                 </span>
//               </div>
//               <div style={{ fontSize:'0.69rem', color:'#94a3b8', paddingLeft:13 }}>
//                 {open} open · {total} total
//               </div>
//               {bPct > 0 && (
//                 <div style={{ marginLeft:13, marginTop:4, background:'#f1f5f9', borderRadius:3, height:3, overflow:'hidden' }}>
//                   <div style={{ width:`${bPct}%`, height:'100%', background:bClr, borderRadius:3 }} />
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// };

// // ── Role Overview (superadmin) ────────────────────────────────────────────────
// const RoleOverview = ({ pid }) => {
//   const [tab, setTab] = useState('all');
//   const { data, isLoading } = useRoleOverview(pid);
//   const s       = data?.summary  || {};
//   const teams   = Array.isArray(data?.teamStats) ? data.teamStats : [];
//   const sprint  = Array.isArray(data?.sprintBreakdown) ? data.sprintBreakdown.slice(0, 8) : [];
//   const monthly = Array.isArray(data?.monthlyTrend) ? data.monthlyTrend : [];
//   const teamRole = { QA:'tester', Frontend:'developer', Backend:'developer', DevOps:'developer' };
//   const shown = tab === 'all' ? teams : teams.filter(t => teamRole[t.team] === tab);
//   const bugPct    = s.totalIssues > 0 ? Math.round((s.totalBugs/s.totalIssues)*100) : 0;
//   const budgetPct = s.totalBudgetAllocated > 0 ? Math.round((s.totalBudgetUsed/s.totalBudgetAllocated)*100) : 0;
//   const fmt = n => n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n||0}`;

//   return (
//     <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'1.25rem', marginTop:'1.25rem' }}>
//       <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:8 }}>
//         <div>
//           <div style={{ fontWeight:800, fontSize:'0.95rem', color:'#1e293b' }}>Team Activity Overview</div>
//           <div style={{ fontSize:'0.73rem', color:'#94a3b8' }}>Role-based contribution across all projects</div>
//         </div>
//         <div style={{ display:'flex', gap:5, background:'#f8fafc', padding:3, borderRadius:8, border:'1px solid #e5e7eb' }}>
//           {['all','developer','tester'].map(t => (
//             <button key={t} onClick={() => setTab(t)}
//               style={{ padding:'4px 12px', border:'none', borderRadius:6, cursor:'pointer', fontSize:'0.79rem',
//                 fontWeight: tab===t ? 700 : 500,
//                 background: tab===t ? '#2563eb' : 'transparent',
//                 color: tab===t ? '#fff' : '#6b7280', textTransform:'capitalize' }}>
//               {t === 'all' ? 'All Teams' : t}
//             </button>
//           ))}
//         </div>
//       </div>

//       {isLoading ? <Skel h={60} /> : (
//         <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:'1rem' }}>
//           {[
//             { l:`${s.totalProjects||0} Projects`, v:s.totalIssues||0, sub:'total issues', c:'#2563eb', bg:'#eff6ff' },
//             { l:`Bugs (${bugPct}%)`,               v:s.totalBugs||0,   sub:'bugs',         c:'#dc2626', bg:'#fef2f2' },
//             { l:'Tasks',                           v:s.totalTasks||0,  sub:'tasks',        c:'#7c3aed', bg:'#f5f3ff' },
//             { l:'Budget',                          v:`${fmt(s.totalBudgetUsed)} / ${fmt(s.totalBudgetAllocated)} (${budgetPct}%)`, sub:'used/allocated', c:'#16a34a', bg:'#f0fdf4', wide:true },
//             { l:'Blocked',                         v:s.blockedIssues||0, sub:'blocked',    c:'#f59e0b', bg:'#fef9c3' },
//           ].map(c => (
//             <div key={c.l} style={{ background:c.bg, borderRadius:10, padding:'9px 14px', flex: c.wide ? '2 1 180px' : '1 1 90px' }}>
//               <div style={{ fontSize:'1.25rem', fontWeight:800, color:c.c, lineHeight:1 }}>{c.v}</div>
//               <div style={{ fontSize:'0.68rem', color:'#6b7280', marginTop:2 }}>{c.l}</div>
//             </div>
//           ))}
//         </div>
//       )}

//       <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'1rem', marginBottom:'1rem' }}>
//         <Card title="Sprint Breakdown" sub="Issues per sprint by team">
//           {sprint.length === 0 ? <Empty h={150} /> : (
//             <ResponsiveContainer width="100%" height={150}>
//               <BarChart data={sprint} margin={{ left:-10 }}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                 <XAxis dataKey="sprint" tick={{ fontSize:9 }} />
//                 <YAxis tick={{ fontSize:9 }} />
//                 <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize:9 }} />
//                 <Bar dataKey="frontend" name="Frontend" stackId="a" fill="#2563eb" />
//                 <Bar dataKey="backend"  name="Backend"  stackId="a" fill="#7c3aed" />
//                 <Bar dataKey="qa"       name="QA"       stackId="a" fill="#16a34a" />
//                 <Bar dataKey="devops"   name="DevOps"   stackId="a" fill="#f59e0b" />
//               </BarChart>
//             </ResponsiveContainer>
//           )}
//         </Card>

//         <Card title="Monthly Bug vs Task" sub="Issue creation by type over time">
//           {monthly.length === 0 ? <Empty h={150} /> : (
//             <ResponsiveContainer width="100%" height={150}>
//               <ComposedChart data={monthly} margin={{ left:-10 }}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                 <XAxis dataKey="month" tick={{ fontSize:9 }} />
//                 <YAxis tick={{ fontSize:9 }} />
//                 <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize:9 }} />
//                 <Bar dataKey="bugs" name="Bugs" fill="#dc2626" radius={[3,3,0,0]} />
//                 <Line type="monotone" dataKey="tasks" name="Tasks" stroke="#2563eb" strokeWidth={2} dot={false} />
//               </ComposedChart>
//             </ResponsiveContainer>
//           )}
//         </Card>
//       </div>

//       {shown.length > 0 && (
//         <div style={{ overflowX:'auto', border:'1px solid #f1f5f9', borderRadius:10 }}>
//           <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.81rem' }}>
//             <thead>
//               <tr style={{ background:'#f8fafc' }}>
//                 {['Team','Role','Total','Open','Resolved','Blocked','Bugs','Tasks'].map(h => (
//                   <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontWeight:700, color:'#6b7280', fontSize:'0.7rem', textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:'2px solid #e5e7eb' }}>{h}</th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {shown.map(t => (
//                 <tr key={t.team} style={{ borderBottom:'1px solid #f1f5f9' }}>
//                   <td style={{ padding:'8px 14px', fontWeight:600, color:'#1e293b' }}>{t.team}</td>
//                   <td style={{ padding:'8px 14px' }}>
//                     <span style={{ padding:'2px 8px', borderRadius:99, fontSize:'0.69rem', fontWeight:600, background: t.team==='QA'?'#f0fdf4':'#eff6ff', color: t.team==='QA'?'#16a34a':'#1d4ed8' }}>
//                       {t.team==='QA'?'Tester':'Developer'}
//                     </span>
//                   </td>
//                   <td style={{ padding:'8px 14px', fontWeight:700 }}>{t.total_issues}</td>
//                   <td style={{ padding:'8px 14px', color:'#2563eb' }}>{t.open}</td>
//                   <td style={{ padding:'8px 14px', color:'#16a34a' }}>{t.resolved}</td>
//                   <td style={{ padding:'8px 14px', color: t.blocked>0?'#dc2626':'#94a3b8' }}>{t.blocked}</td>
//                   <td style={{ padding:'8px 14px', color:'#dc2626' }}>{t.bugs}</td>
//                   <td style={{ padding:'8px 14px', color:'#7c3aed' }}>{t.tasks}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// };

// // ═══════════════════════════════════════════════════════════════════════════
// // Main Dashboard
// // ═══════════════════════════════════════════════════════════════════════════
// const Dashboard = () => {
//   const { role, user } = useContext(AuthContext) || {};
//   const currentRole = (role || user?.role || '').toLowerCase();
//   const navigate    = useNavigate();
//   const isAdmin = ['admin','superadmin'].includes(currentRole);
//   const isSA    = currentRole === 'superadmin';
//   const isDev   = currentRole === 'developer';
//   const isTst   = currentRole === 'tester';

//   // Selected project for filtering (null = all projects)
//   const [pid, setPid] = useState(null);

//   // All hooks receive the same pid — only fetches for that project if set
//   const stats   = useDashboardStats(pid);
//   const byStatus= useByStatus(pid);
//   const byType  = useByType(pid);
//   const bySprint= useBySprint(pid);
//   const byTeam  = useByTeam(pid);
//   const trend   = useTrend(pid);
//   const age     = useAgeDistribution(pid);
//   const burndown= useBurndown(pid);
//   const velocity= useVelocityData(pid);
//   const budget  = useBudgetUtilization(pid);
//   const resTime = useResolutionTime(pid);
//   const health  = useProjectHealth(pid);
//   const overdue = useOverdueIssues(pid);
//   const sla     = useSLACompliance(pid);
//   const cumul   = useCumulativeTrend(pid);

//   const d = h => Array.isArray(h.data) ? h.data : [];
//   const L = h => h.isLoading;
//   const s = stats.data || {};

//   const pageTitle = isSA ? 'SuperAdmin Dashboard' : isAdmin ? 'Admin Dashboard' : isDev ? 'My Workboard' : 'QA Dashboard';

//   const kpis = [
//     isAdmin && { title:'Total Projects', value:s.totalProjects,  Icon:FiBriefcase,   color:'#f59e0b', link:'/projects' },
//     isAdmin && { title:'Total Users',    value:s.totalUsers,     Icon:FiUsers,       color:'#3b82f6', link:'/users-management' },
//     { title:'Open Issues',   value:s.openIssues,      Icon:FiAlertCircle, color:'#ef4444', link:'/issues' },
//     { title:'Resolved',      value:s.resolvedIssues,  Icon:FiCheckSquare, color:'#16a34a', link:'/issues' },
//     (isDev||isTst) && { title:'My Projects',  value:s.myProjects,   Icon:FiBriefcase,  color:'#7c3aed', link:'/my-projects' },
//     isDev  && { title:'My Open Tasks', value:s.myOpenTasks,  Icon:FiList,      color:'#f97316', link:'/issues' },
//     isTst  && { title:'Pending Verify',value:s.pendingVerify,Icon:FiActivity,  color:'#0891b2', link:'/issues' },
//     isAdmin && { title:'Overdue',       value:s.overdueCount, Icon:FiClock,     color:'#f43f5e', link:'/issues' },
//   ].filter(Boolean);

//   return (
//     <div style={{ display:'flex', height:'100%', overflow:'hidden', fontFamily:"'Inter',sans-serif", background:'#f8fafc' }}>

//       {/* ── Persistent project sidebar (admin/superadmin only) ───────────── */}
//       {isAdmin && <ProjectSidebar selected={pid} onSelect={setPid} />}

//       {/* ── Main content ─────────────────────────────────────────────────── */}
//       <div style={{ flex:1, overflowY:'auto', minWidth:0 }}>
//         <div style={{ padding:'1.5rem 1.75rem' }}>

//           {/* Page header */}
//           <div style={{ marginBottom:'1.25rem' }}>
//             <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
//               <h1 style={{ fontSize:'1.4rem', fontWeight:800, color:'#1e293b', margin:0 }}>{pageTitle}</h1>
//               {pid && (
//                 <span style={{ background:'#dbeafe', color:'#1d4ed8', padding:'3px 10px', borderRadius:99, fontSize:'0.75rem', fontWeight:700 }}>
//                   Filtered: Project {pid}
//                   <button onClick={() => setPid(null)}
//                     style={{ marginLeft:6, background:'transparent', border:'none', color:'#1d4ed8', cursor:'pointer', fontSize:'0.85rem', lineHeight:1, padding:0 }}>✕</button>
//                 </span>
//               )}
//             </div>
//             <p style={{ color:'#6b7280', fontSize:'0.82rem', margin:'3px 0 0' }}>Live data · real-time on issue updates</p>
//           </div>

//           {/* KPI cards */}
//           <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:'1.25rem' }}>
//             {L(stats)
//               ? Array(Math.min(kpis.length,4)).fill(0).map((_,i) => <div key={i} style={{ flex:'1 1 160px', height:88, background:'#e9eef5', borderRadius:12 }} />)
//               : kpis.map((k,i) => <KPI key={i} {...k} nav={navigate} />)
//             }
//           </div>

//           {/* Charts grid */}
//           <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:'0.9rem' }}>

//             {/* 1. Issues by Status — DONUT */}
//             <Card title="Issues by Status" sub="Current breakdown by status">
//               {W(L(byStatus), d(byStatus),
//                 <ResponsiveContainer width="100%" height={200}>
//                   <PieChart>
//                     <Pie data={d(byStatus)} dataKey="count" nameKey="label" cx="50%" cy="50%"
//                       outerRadius={82} innerRadius={42}
//                       label={({ label, percent }) => percent>0.04 ? `${label} ${Math.round(percent*100)}%` : ''}
//                       labelLine={false}>
//                       {d(byStatus).map((e,i) => <Cell key={i} fill={STATUS_CLR[(e.label||'').toLowerCase()]||P[i%P.length]} />)}
//                     </Pie>
//                     <Tooltip content={<Tip />} />
//                   </PieChart>
//                 </ResponsiveContainer>
//               )}
//             </Card>

//             {/* 2. Bug vs Task — HORIZONTAL BAR */}
//             <Card title="Bug vs Task Ratio" sub="Issue type distribution">
//               {W(L(byType), d(byType),
//                 <ResponsiveContainer width="100%" height={200}>
//                   <BarChart data={d(byType)} layout="vertical" margin={{ left:10, right:10 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
//                     <XAxis type="number" tick={{ fontSize:11 }} />
//                     <YAxis dataKey="label" type="category" tick={{ fontSize:12, fontWeight:600 }} width={65} />
//                     <Tooltip content={<Tip />} />
//                     <Bar dataKey="count" name="Count" radius={[0,8,8,0]}>
//                       {d(byType).map((_,i) => <Cell key={i} fill={P[i%P.length]} />)}
//                     </Bar>
//                   </BarChart>
//                 </ResponsiveContainer>
//               )}
//             </Card>

//             {/* 3. Issues per Sprint — MULTI-COLOR BAR, span 2 */}
//             <Card title="Issues per Sprint" sub="Volume across sprints" cols={2}>
//               {W(L(bySprint), d(bySprint),
//                 <ResponsiveContainer width="100%" height={220}>
//                   <BarChart data={d(bySprint)} margin={{ left:-10 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                     <XAxis dataKey="sprint" tick={{ fontSize:11 }} />
//                     <YAxis tick={{ fontSize:11 }} />
//                     <Tooltip content={<Tip />} />
//                     <Bar dataKey="count" name="Issues" radius={[5,5,0,0]}>
//                       {d(bySprint).map((_,i) => <Cell key={i} fill={P[i%P.length]} />)}
//                     </Bar>
//                   </BarChart>
//                 </ResponsiveContainer>
//               , 220)}
//             </Card>

//             {/* 4. Issues by Team — RADIAL BAR */}
//             <Card title="Issues by Team" sub="Workload distribution">
//               {W(L(byTeam), d(byTeam),
//                 <ResponsiveContainer width="100%" height={200}>
//                   <RadialBarChart cx="50%" cy="50%" innerRadius={20} outerRadius={90} startAngle={180} endAngle={-180}
//                     data={d(byTeam).map((r,i) => ({ ...r, fill:P[i%P.length], name: r.team||r.label||'?' }))}>
//                     <RadialBar minAngle={10} background dataKey="count" />
//                     <Tooltip content={<Tip />} />
//                     <Legend iconSize={10} wrapperStyle={{ fontSize:10 }} />
//                   </RadialBarChart>
//                 </ResponsiveContainer>
//               )}
//             </Card>

//             {/* 5. Open vs Closed Trend — AREA */}
//             <Card title="Open vs Closed Trend" sub="Issue status over time">
//               {W(L(trend), d(trend),
//                 <ResponsiveContainer width="100%" height={200}>
//                   <AreaChart data={d(trend)} margin={{ left:-10 }}>
//                     <defs>
//                       <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient>
//                       <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.2}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
//                     </defs>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                     <XAxis dataKey="date" tick={{ fontSize:10 }} />
//                     <YAxis tick={{ fontSize:11 }} />
//                     <Tooltip content={<Tip />} /><Legend />
//                     <Area type="monotone" dataKey="open"   stroke="#ef4444" strokeWidth={2} fill="url(#gO)" name="Open" />
//                     <Area type="monotone" dataKey="closed" stroke="#16a34a" strokeWidth={2} fill="url(#gC)" name="Closed" />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               )}
//             </Card>

//             {/* 6. Sprint Progress — COMPOSED */}
//             <Card title="Sprint Progress" sub="Done vs remaining per sprint">
//               {W(L(burndown), d(burndown),
//                 <ResponsiveContainer width="100%" height={200}>
//                   <ComposedChart data={d(burndown)} margin={{ left:-10 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                     <XAxis dataKey="sprint" tick={{ fontSize:10 }} />
//                     <YAxis tick={{ fontSize:11 }} />
//                     <Tooltip content={<Tip />} /><Legend wrapperStyle={{ fontSize:10 }} />
//                     <Bar dataKey="done"      name="Done"      fill="#16a34a" radius={[3,3,0,0]} stackId="a" />
//                     <Bar dataKey="remaining" name="Remaining" fill="#f97316" radius={[3,3,0,0]} stackId="a" />
//                     <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Ideal" />
//                   </ComposedChart>
//                 </ResponsiveContainer>
//               )}
//             </Card>

//             {/* 7. Team Velocity — STACKED BAR (admin) */}
//             {isAdmin && (
//               <Card title="Team Velocity" sub="Issues closed per sprint by team" cols={2}>
//                 {W(L(velocity), d(velocity),
//                   <ResponsiveContainer width="100%" height={220}>
//                     <BarChart data={d(velocity)} margin={{ left:-10 }}>
//                       <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                       <XAxis dataKey="sprint" tick={{ fontSize:11 }} />
//                       <YAxis tick={{ fontSize:11 }} />
//                       <Tooltip content={<Tip />} /><Legend />
//                       {['Frontend','Backend','QA','DevOps'].map((t,i) => (
//                         <Bar key={t} dataKey={t} stackId="v" fill={P[i]} radius={i===3?[4,4,0,0]:undefined} />
//                       ))}
//                     </BarChart>
//                   </ResponsiveContainer>
//                 , 220)}
//               </Card>
//             )}

//             {/* 8. Budget — GROUPED BAR (admin) */}
//             {isAdmin && (
//               <Card title="Budget Utilization" sub="Allocated vs used per project" cols={2}>
//                 {W(L(budget), d(budget),
//                   <ResponsiveContainer width="100%" height={220}>
//                     <BarChart data={d(budget)} margin={{ left:5 }}>
//                       <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                       <XAxis dataKey="name" tick={{ fontSize:10 }} />
//                       <YAxis tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{ fontSize:11 }} />
//                       <Tooltip formatter={v=>[`$${Number(v).toLocaleString()}`,'']} />
//                       <Legend />
//                       <Bar dataKey="budget_total" name="Allocated" fill="#bfdbfe" radius={[4,4,0,0]} />
//                       <Bar dataKey="budget_used"  name="Used"      fill="#2563eb" radius={[4,4,0,0]} />
//                     </BarChart>
//                   </ResponsiveContainer>
//                 , 220)}
//               </Card>
//             )}

//             {/* 9. Resolution Time — COLOR BAR */}
//             {isAdmin && (
//               <Card title="Avg Resolution Time" sub="Days to close an issue, by team">
//                 {W(L(resTime), d(resTime),
//                   <ResponsiveContainer width="100%" height={200}>
//                     <BarChart data={d(resTime)} margin={{ left:-10 }}>
//                       <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                       <XAxis dataKey="team" tick={{ fontSize:11 }} />
//                       <YAxis tick={{ fontSize:11 }} unit="d" />
//                       <Tooltip content={<Tip />} />
//                       <Bar dataKey="avg_days" name="Avg Days" radius={[5,5,0,0]}>
//                         {d(resTime).map((_,i) => <Cell key={i} fill={P[i%P.length]} />)}
//                       </Bar>
//                     </BarChart>
//                   </ResponsiveContainer>
//                 )}
//               </Card>
//             )}

//             {/* 10. Issue Age — GRADIENT BAR */}
//             <Card title="Issue Age Distribution" sub="How long open issues have been waiting">
//               {W(L(age), d(age),
//                 <ResponsiveContainer width="100%" height={200}>
//                   <BarChart data={d(age)} margin={{ left:-10 }}>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                     <XAxis dataKey="range" tick={{ fontSize:10 }} />
//                     <YAxis tick={{ fontSize:11 }} />
//                     <Tooltip content={<Tip />} />
//                     <Bar dataKey="count" name="Issues" radius={[5,5,0,0]}>
//                       {d(age).map((_,i) => <Cell key={i} fill={['#4ade80','#60a5fa','#fbbf24','#f97316','#ef4444'][i%5]} />)}
//                     </Bar>
//                   </BarChart>
//                 </ResponsiveContainer>
//               )}
//             </Card>

//             {/* 11. Project Health — RADAR (admin) */}
//             {isAdmin && (
//               <Card title="Project Health Overview" sub="% resolved per project">
//                 {W(L(health), d(health),
//                   <ResponsiveContainer width="100%" height={200}>
//                     <RadarChart data={d(health)} cx="50%" cy="50%" outerRadius={75}>
//                       <PolarGrid stroke="#e5e7eb" />
//                       <PolarAngleAxis dataKey="name" tick={{ fontSize:9 }} />
//                       <Radar name="Health %" dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.22} />
//                       <Tooltip content={<Tip />} />
//                     </RadarChart>
//                   </ResponsiveContainer>
//                 )}
//               </Card>
//             )}

//             {/* 12. Open per Project — HORIZONTAL (admin) */}
//             {isAdmin && (
//               <Card title="Open Issues per Project" sub="Current open count by project">
//                 {W(L(overdue), d(overdue),
//                   <ResponsiveContainer width="100%" height={200}>
//                     <BarChart data={d(overdue)} layout="vertical" margin={{ left:10 }}>
//                       <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
//                       <XAxis type="number" tick={{ fontSize:11 }} />
//                       <YAxis dataKey="project" type="category" tick={{ fontSize:10 }} width={85} />
//                       <Tooltip content={<Tip />} />
//                       <Bar dataKey="count" name="Open Issues" radius={[0,5,5,0]}>
//                         {d(overdue).map((_,i) => <Cell key={i} fill={P[i%P.length]} />)}
//                       </Bar>
//                     </BarChart>
//                   </ResponsiveContainer>
//                 )}
//               </Card>
//             )}

//             {/* 13. SLA — DONUT (admin) */}
//             {isAdmin && (
//               <Card title="SLA Compliance" sub="Resolved vs open issues">
//                 {W(L(sla), d(sla),
//                   <ResponsiveContainer width="100%" height={200}>
//                     <PieChart>
//                       <Pie data={d(sla)} dataKey="value" nameKey="name" cx="50%" cy="50%"
//                         outerRadius={82} innerRadius={48}
//                         label={({ name, percent }) => percent>0.04 ? `${name} ${Math.round(percent*100)}%` : ''}
//                         labelLine={false}>
//                         {d(sla).map((_,i) => <Cell key={i} fill={i===0?'#16a34a':'#ef4444'} />)}
//                       </Pie>
//                       <Tooltip content={<Tip />} /><Legend />
//                     </PieChart>
//                   </ResponsiveContainer>
//                 )}
//               </Card>
//             )}

//             {/* 14. Cumulative Volume — AREA, span 2 */}
//             <Card title="Cumulative Issue Volume" sub="Total issues created over time" cols={2}>
//               {W(L(cumul), d(cumul),
//                 <ResponsiveContainer width="100%" height={220}>
//                   <AreaChart data={d(cumul)} margin={{ left:-5 }}>
//                     <defs>
//                       <linearGradient id="gCumul" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
//                         <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
//                       </linearGradient>
//                     </defs>
//                     <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                     <XAxis dataKey="date" tick={{ fontSize:10 }} />
//                     <YAxis tick={{ fontSize:11 }} />
//                     <Tooltip content={<Tip />} /><Legend />
//                     <Area type="monotone" dataKey="monthly" stroke="#93c5fd" strokeWidth={1.5} fill="none" name="Monthly" />
//                     <Area type="monotone" dataKey="total"   stroke="#2563eb" strokeWidth={2.5} fill="url(#gCumul)" name="Total" />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               , 220)}
//             </Card>

//           </div>

//           {/* Team Activity (superadmin) */}
//           {isSA && <RoleOverview pid={pid} />}

//         </div>
//       </div>

//       <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
//     </div>
//   );
// };

// export default Dashboard;


// import React, { useContext, useState } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { useDashboardStats, useDashboardCharts } from "../api/dashboardApi";
// import KPICard from "../components/KPICard";
// import { FiBriefcase, FiAlertCircle, FiCheckCircle, FiTrendingUp, FiTarget, FiZap, FiUsers } from 'react-icons/fi';
// import {
//   PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis,
//   CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer,
//   Legend, AreaChart, Area, RadarChart, Radar, PolarGrid,
//   PolarAngleAxis, PolarRadiusAxis, ComposedChart, ReferenceLine
// } from 'recharts';

// const SEED = {
//   stats: { totalProjects: 40, totalIssues: 120, totalBugs: 91 },
//   issuesPerSprint: [
//     { sprint:"Sprint 1", count:14, bugs:9,  tasks:5,  resolved:12 },
//     { sprint:"Sprint 2", count:18, bugs:10, tasks:8,  resolved:15 },
//     { sprint:"Sprint 3", count:14, bugs:12, tasks:2,  resolved:11 },
//     { sprint:"Sprint 4", count:14, bugs:13, tasks:1,  resolved:13 },
//     { sprint:"Sprint 5", count:19, bugs:14, tasks:5,  resolved:16 },
//     { sprint:"Sprint 6", count:11, bugs:9,  tasks:2,  resolved:10 },
//     { sprint:"Sprint 7", count:13, bugs:10, tasks:3,  resolved:11 },
//     { sprint:"Sprint 8", count:17, bugs:14, tasks:3,  resolved:14 },
//   ],
//   teamLoad: [
//     { assigneeteam:"QA",       count:35 },
//     { assigneeteam:"Frontend", count:33 },
//     { assigneeteam:"DevOps",   count:28 },
//     { assigneeteam:"Backend",  count:24 },
//   ],
//   issuesByType: [
//     { issuetypename:"Bug",  count:91 },
//     { issuetypename:"Task", count:29 },
//   ],
//   monthlyTrend: [
//     { month:"Feb", bugs:21, tasks:8,  total:29 },
//     { month:"Mar", bugs:26, tasks:8,  total:34 },
//     { month:"Apr", bugs:21, tasks:8,  total:29 },
//     { month:"May", bugs:23, tasks:5,  total:28 },
//   ],
//   statusDistribution: [
//     { status:"Active",  count:26 },
//     { status:"Blocked", count:7  },
//     { status:"Planned", count:7  },
//   ],
//   budgetData: [
//     { projectname:"Project_1",  budgetallocated:25795,  budgetused:8838,  pct:34.3 },
//     { projectname:"Project_2",  budgetallocated:10860,  budgetused:5393,  pct:49.7 },
//     { projectname:"Project_3",  budgetallocated:86820,  budgetused:10627, pct:12.2 },
//     { projectname:"Project_4",  budgetallocated:64886,  budgetused:8792,  pct:13.5 },
//     { projectname:"Project_5",  budgetallocated:16265,  budgetused:10555, pct:64.9 },
//     { projectname:"Project_6",  budgetallocated:92386,  budgetused:73969, pct:80.1 },
//     { projectname:"Project_7",  budgetallocated:47194,  budgetused:43001, pct:91.1 },
//     { projectname:"Project_8",  budgetallocated:97498,  budgetused:76552, pct:78.5 },
//     { projectname:"Project_9",  budgetallocated:54131,  budgetused:23897, pct:44.1 },
//     { projectname:"Project_10", budgetallocated:70263,  budgetused:68148, pct:97.0 },
//     { projectname:"Project_11", budgetallocated:26023,  budgetused:23425, pct:90.0 },
//     { projectname:"Project_12", budgetallocated:51090,  budgetused:23483, pct:46.0 },
//   ],
//   utilizationData: [
//     { name:"Project_1",  pct:34.3,  status:"Active"  },
//     { name:"Project_2",  pct:49.7,  status:"Active"  },
//     { name:"Project_3",  pct:12.2,  status:"Active"  },
//     { name:"Project_4",  pct:13.5,  status:"Active"  },
//     { name:"Project_5",  pct:64.9,  status:"Active"  },
//     { name:"Project_6",  pct:80.1,  status:"Active"  },
//     { name:"Project_7",  pct:91.1,  status:"Active"  },
//     { name:"Project_8",  pct:78.5,  status:"Active"  },
//     { name:"Project_9",  pct:44.1,  status:"Blocked" },
//     { name:"Project_10", pct:97.0,  status:"Active"  },
//     { name:"Project_11", pct:90.0,  status:"Active"  },
//     { name:"Project_12", pct:46.0,  status:"Planned" },
//     { name:"Project_13", pct:62.9,  status:"Planned" },
//     { name:"Project_14", pct:22.9,  status:"Active"  },
//     { name:"Project_15", pct:76.4,  status:"Active"  },
//   ],
//   resolutionTime: [
//     { sprint:"Sprint 1", avg_hours:4.7 },
//     { sprint:"Sprint 2", avg_hours:4.7 },
//     { sprint:"Sprint 3", avg_hours:4.8 },
//     { sprint:"Sprint 4", avg_hours:3.6 },
//     { sprint:"Sprint 5", avg_hours:3.7 },
//     { sprint:"Sprint 6", avg_hours:3.5 },
//     { sprint:"Sprint 7", avg_hours:4.7 },
//     { sprint:"Sprint 8", avg_hours:4.6 },
//   ],
//   issuesPerProject: [
//     { projectname:"P30", count:7 }, { projectname:"P27", count:6 },
//     { projectname:"P35", count:5 }, { projectname:"P12", count:5 },
//     { projectname:"P33", count:5 }, { projectname:"P31", count:5 },
//     { projectname:"P14", count:5 }, { projectname:"P28", count:4 },
//     { projectname:"P34", count:4 }, { projectname:"P15", count:4 },
//   ],
// };

// const STATUS_COLOR = { Active:"#10b981", Blocked:"#ef4444", Planned:"#3b82f6" };
// const COLORS = ["#3b82f6","#ef4444","#10b981","#f59e0b","#8b5cf6","#06b6d4"];

// /* ── Dark tooltip ── */
// const Tip = ({ active, payload, label }) => {
//   if (!active || !payload?.length) return null;
//   return (
//     <div style={{ background:"#1e293b", color:"#f8fafc", padding:"10px 14px", borderRadius:8, fontSize:12, boxShadow:"0 4px 20px rgba(0,0,0,.35)" }}>
//       {label && <p style={{ margin:"0 0 5px", fontWeight:700, borderBottom:"1px solid #334155", paddingBottom:4 }}>{label}</p>}
//       {payload.map((p,i)=>(
//         <p key={i} style={{ margin:"2px 0", color:p.color||"#94a3b8" }}>
//           <span style={{ opacity:.75 }}>{p.name}: </span>
//           <b>{typeof p.value==="number" && p.value>500 ? `$${p.value.toLocaleString()}` : p.value}</b>
//         </p>
//       ))}
//     </div>
//   );
// };

// /* ── Chart card ── */
// const Card = ({ title, subtitle, badge, children, span=1, accent="#3b82f6" }) => (
//   <div style={{
//     background:"#fff", borderRadius:16, padding:"1.35rem 1.4rem",
//     boxShadow:"0 2px 12px rgba(0,0,0,.06)", border:"1px solid #e5e7eb",
//     gridColumn:`span ${span}`, borderTop:`3px solid ${accent}`,
//   }}>
//     <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
//       <div>
//         <h3 style={{ margin:0, fontSize:".9rem", fontWeight:700, color:"#0f172a" }}>{title}</h3>
//         {subtitle && <p style={{ margin:"3px 0 0", fontSize:".72rem", color:"#94a3b8" }}>{subtitle}</p>}
//       </div>
//       {badge && (
//         <span style={{ fontSize:".68rem", padding:"3px 9px", borderRadius:99,
//           background:badge.bg, color:badge.color, fontWeight:700, border:`1px solid ${badge.border||badge.bg}`, whiteSpace:"nowrap" }}>
//           {badge.label}
//         </span>
//       )}
//     </div>
//     {children}
//   </div>
// );

// /* ── KPI pill ── */
// const Pill = ({ label, value, sub, color="#3b82f6" }) => (
//   <div style={{ flex:1, minWidth:130, background:`${color}0d`, borderRadius:12, padding:".9rem 1.1rem",
//     border:`1px solid ${color}25` }}>
//     <div style={{ fontSize:"1.6rem", fontWeight:800, color, lineHeight:1 }}>{value}</div>
//     <div style={{ fontSize:".72rem", fontWeight:700, color, marginTop:3, textTransform:"uppercase", letterSpacing:".04em" }}>{label}</div>
//     {sub && <div style={{ fontSize:".67rem", color:"#9ca3af", marginTop:2 }}>{sub}</div>}
//   </div>
// );

// /* ── Progress bar row ── */
// const PRow = ({ label, value, max, color }) => {
//   const pct = Math.min((value/max)*100,100);
//   return (
//     <div style={{ marginBottom:10 }}>
//       <div style={{ display:"flex", justifyContent:"space-between", fontSize:".78rem", marginBottom:3 }}>
//         <span style={{ fontWeight:600, color:"#374151" }}>{label}</span>
//         <span style={{ fontWeight:700, color }}>{value} <span style={{ color:"#9ca3af", fontWeight:400 }}>/ {max}</span></span>
//       </div>
//       <div style={{ height:7, background:"#f1f5f9", borderRadius:99, overflow:"hidden" }}>
//         <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width .5s" }} />
//       </div>
//     </div>
//   );
// };

// /* ══════════ DASHBOARD ══════════ */
// const Dashboard = () => {
//   const { role } = useContext(AuthContext);
//   const cur = (role||"").toLowerCase();

//   const { data:apiStats  } = useDashboardStats();
//   const { data:apiCharts } = useDashboardCharts();

//   const [sfilt, setSfilt] = useState("all");
//   const [tfilt, setTfilt] = useState("all");
//   const [bPage, setBPage] = useState(0);

//   /* merge API over seed — charts render immediately from seed, update if API returns */
//   const stats   = apiStats || SEED.stats;
//   const sprints = apiCharts?.issuesPerSprint?.length ? apiCharts.issuesPerSprint : SEED.issuesPerSprint;
//   const teams   = apiCharts?.teamLoad?.length        ? apiCharts.teamLoad        : SEED.teamLoad;
//   const byType  = apiCharts?.issuesByType?.length    ? apiCharts.issuesByType    : SEED.issuesByType;
//   const statusD = apiCharts?.statusDistribution?.length ? apiCharts.statusDistribution : SEED.statusDistribution;
//   const budget  = apiCharts?.budgetData?.length      ? apiCharts.budgetData      : SEED.budgetData;
//   const monthly = SEED.monthlyTrend;
//   const resTime = apiCharts?.resolutionTime?.length  ? apiCharts.resolutionTime  : SEED.resolutionTime;
//   const issProj = apiCharts?.issuesPerProject?.length? apiCharts.issuesPerProject: SEED.issuesPerProject;
//   const utilData= SEED.utilizationData;

//   const totalBugs   = stats.totalBugs ?? 91;
//   const totalIssues = stats.totalIssues ?? 120;
//   const bugRatio    = Math.round((totalBugs/totalIssues)*100);
//   const totalAlloc  = budget.reduce((a,b)=>a+(b.budgetallocated||0),0);
//   const totalUsed   = budget.reduce((a,b)=>a+(b.budgetused||0),0);
//   const budgetPct   = Math.round((totalUsed/totalAlloc)*100);
//   const overloaded  = teams.filter(t=>t.count>25).length;

//   const filtSprints = sfilt==="all" ? sprints : sprints.filter(s=>s.sprint===sfilt);
//   const filtTeams   = tfilt==="all" ? teams   : teams.filter(t=>t.assigneeteam===tfilt);

//   const PG = 6;
//   const budgetPage  = budget.slice(bPage*PG,(bPage+1)*PG);
//   const budgetE     = budget.map(d=>({ ...d, surplus:Math.max(0,d.budgetallocated-d.budgetused), pct:d.pct||Math.round(d.budgetused/d.budgetallocated*100) }));

//   const isAdmin  = ["admin","superadmin"].includes(cur);
//   const isDev    = cur==="developer";
//   const isTester = cur==="tester";

//   return (
//     <div style={{ padding:"2rem", background:"#f8fafc", minHeight:"100vh", fontFamily:"'Inter',system-ui,sans-serif" }}>

//       {/* header */}
//       <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"1.75rem" }}>
//         <div>
//           <h1 style={{ margin:0, fontSize:"1.55rem", fontWeight:800, color:"#0f172a" }}>
//             {isDev?"⚡ Workboard": isTester?"🧪 QA Dashboard":"📊 Operations Overview"}
//           </h1>
//           <p style={{ margin:"4px 0 0", color:"#64748b", fontSize:".84rem" }}>
//             {stats.totalProjects??40} projects · {totalIssues} issues · 8 sprints · 4 teams
//           </p>
//         </div>
//         <span style={{ padding:"4px 13px", borderRadius:99, fontSize:".7rem", fontWeight:800, letterSpacing:".06em",
//           background: isDev?"#eff6ff": isTester?"#f0fdf4":"#faf5ff",
//           color:      isDev?"#2563eb": isTester?"#16a34a":"#7c3aed",
//           border:`1px solid ${isDev?"#bfdbfe": isTester?"#bbf7d0":"#ddd6fe"}` }}>
//           {cur.toUpperCase()} VIEW
//         </span>
//       </div>

//       {/* KPI strip */}
//       <div style={{ display:"flex", gap:".9rem", marginBottom:"1.75rem", flexWrap:"wrap" }}>
//         <Pill label="Total Projects"  value={stats.totalProjects??40}      color="#2563eb" sub="40 projects tracked" />
//         <Pill label="Total Issues"    value={totalIssues}                   color="#f59e0b" sub="across 8 sprints" />
//         <Pill label="Open Bugs"       value={totalBugs}                     color="#ef4444" sub={`${bugRatio}% of total`} />
//         <Pill label="Tasks"           value={totalIssues-totalBugs}         color="#10b981" sub="non-bug items" />
//         {isAdmin  && <Pill label="Budget Used"   value={`${budgetPct}%`}    color="#8b5cf6" sub={`$${(totalUsed/1000).toFixed(0)}k / $${(totalAlloc/1000).toFixed(0)}k`} />}
//         {isAdmin  && <Pill label="Overloaded Teams" value={overloaded}      color="#ef4444" sub="teams >25 issues" />}
//         {isDev    && <Pill label="Bug Ratio"     value={`${bugRatio}%`}     color="#06b6d4" sub="bugs vs total" />}
//         {isTester && <Pill label="QA Load"       value={teams.find(t=>t.assigneeteam==="QA")?.count??35} color="#10b981" sub="issues in QA queue" />}
//       </div>

//       {/* chart grid */}
//       <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1.2rem" }}>

//         {/* 1 sprint volume stacked */}
//         <Card title="Sprint Issue Volume" subtitle="Bugs vs Tasks per sprint" accent="#3b82f6"
//           badge={{ label:`${sprints.length} sprints`, bg:"#eff6ff", color:"#2563eb" }}>
//           <div style={{ display:"flex", gap:5, marginBottom:9, flexWrap:"wrap" }}>
//             {["all",...sprints.map(s=>s.sprint)].map(s=>(
//               <button key={s} onClick={()=>setSfilt(s)}
//                 style={{ padding:"2px 8px", fontSize:".68rem", borderRadius:99, cursor:"pointer", fontWeight:700, border:"none",
//                   background:sfilt===s?"#2563eb":"#f1f5f9", color:sfilt===s?"#fff":"#64748b" }}>
//                 {s==="all"?"All":s.replace("Sprint ","S")}
//               </button>
//             ))}
//           </div>
//           <ResponsiveContainer width="100%" height={200}>
//             <BarChart data={filtSprints} barSize={22}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
//               <XAxis dataKey="sprint" tick={{fontSize:10}} tickFormatter={v=>v.replace("Sprint ","S")} />
//               <YAxis tick={{fontSize:10}} />
//               <Tooltip content={<Tip/>} />
//               <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
//               <Bar dataKey="bugs"  name="Bugs"  stackId="a" fill="#ef4444" />
//               <Bar dataKey="tasks" name="Tasks" stackId="a" fill="#3b82f6" radius={[4,4,0,0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </Card>

//         {/* 2 issue type donut */}
//         <Card title="Issue Type Split" subtitle="Bug vs Task — 91 bugs, 29 tasks" accent="#ef4444">
//           <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
//             <ResponsiveContainer width="55%" height={200}>
//               <PieChart>
//                 <Pie data={byType} dataKey="count" nameKey="issuetypename"
//                   innerRadius={55} outerRadius={82} paddingAngle={5} cx="50%" cy="50%">
//                   {byType.map((_,i)=><Cell key={i} fill={i===0?"#ef4444":"#3b82f6"}/>)}
//                 </Pie>
//                 <Tooltip content={<Tip/>} />
//               </PieChart>
//             </ResponsiveContainer>
//             <div style={{ flex:1 }}>
//               {byType.map((d,i)=>(
//                 <div key={i} style={{ marginBottom:14 }}>
//                   <div style={{ display:"flex", justifyContent:"space-between", fontSize:".8rem", marginBottom:4 }}>
//                     <span style={{ fontWeight:700, color:i===0?"#ef4444":"#3b82f6" }}>{d.issuetypename}</span>
//                     <b style={{ color:"#0f172a" }}>{d.count}</b>
//                   </div>
//                   <div style={{ height:6, background:"#f1f5f9", borderRadius:99 }}>
//                     <div style={{ height:"100%", width:`${Math.round(d.count/totalIssues*100)}%`, background:i===0?"#ef4444":"#3b82f6", borderRadius:99 }} />
//                   </div>
//                   <div style={{ fontSize:".68rem", color:"#9ca3af", marginTop:2 }}>{Math.round(d.count/totalIssues*100)}% of all issues</div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </Card>

//         {/* 3 team workload */}
//         <Card title="Team Workload" subtitle="Issues per team — red line = overload threshold (25)" accent="#f59e0b"
//           badge={overloaded>0 ? { label:`⚠ ${overloaded} overloaded`, bg:"#fef2f2", color:"#dc2626" } : { label:"✓ All healthy", bg:"#dcfce7", color:"#16a34a" }}>
//           <div style={{ display:"flex", gap:5, marginBottom:9 }}>
//             {["all",...teams.map(t=>t.assigneeteam)].map(t=>(
//               <button key={t} onClick={()=>setTfilt(t)}
//                 style={{ padding:"2px 8px", fontSize:".68rem", borderRadius:99, cursor:"pointer", fontWeight:700, border:"none",
//                   background:tfilt===t?"#f59e0b":"#f1f5f9", color:tfilt===t?"#fff":"#64748b" }}>
//                 {t==="all"?"All":t}
//               </button>
//             ))}
//           </div>
//           <ResponsiveContainer width="100%" height={200}>
//             <BarChart data={filtTeams} layout="vertical" barSize={18}>
//               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
//               <XAxis type="number" tick={{fontSize:10}} domain={[0,40]} />
//               <YAxis dataKey="assigneeteam" type="category" width={68} tick={{fontSize:11, fontWeight:600}} />
//               <Tooltip content={<Tip/>} />
//               <ReferenceLine x={25} stroke="#ef4444" strokeDasharray="4 2"
//                 label={{value:"Limit",position:"insideTopRight",fontSize:8,fill:"#ef4444"}} />
//               <Bar dataKey="count" name="Issues" radius={[0,6,6,0]}>
//                 {filtTeams.map((e,i)=><Cell key={i} fill={e.count>25?"#ef4444":e.count>18?"#f59e0b":"#10b981"}/>)}
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//         </Card>

//         {/* 4 sprint velocity */}
//         <Card title="Sprint Velocity" subtitle="Issues created vs resolved each sprint" accent="#10b981">
//           <ResponsiveContainer width="100%" height={200}>
//             <LineChart data={sprints}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//               <XAxis dataKey="sprint" tick={{fontSize:10}} tickFormatter={v=>v.replace("Sprint ","S")} />
//               <YAxis tick={{fontSize:10}} />
//               <Tooltip content={<Tip/>} />
//               <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
//               <Line type="monotone" dataKey="count"    name="Created"  stroke="#f59e0b" strokeWidth={2.5} dot={{r:4}} />
//               <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2.5} dot={{r:4}} strokeDasharray="5 3" />
//             </LineChart>
//           </ResponsiveContainer>
//         </Card>

//         {/* 5 monthly trend */}
//         <Card title="Monthly Issue Trend" subtitle="Bug & task creation Feb–May 2024" accent="#8b5cf6">
//           <ResponsiveContainer width="100%" height={200}>
//             <AreaChart data={monthly}>
//               <defs>
//                 <linearGradient id="bgr" x1="0" y1="0" x2="0" y2="1">
//                   <stop offset="5%"  stopColor="#ef4444" stopOpacity={.28}/>
//                   <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
//                 </linearGradient>
//                 <linearGradient id="tgr" x1="0" y1="0" x2="0" y2="1">
//                   <stop offset="5%"  stopColor="#3b82f6" stopOpacity={.28}/>
//                   <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
//                 </linearGradient>
//               </defs>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//               <XAxis dataKey="month" tick={{fontSize:11}} />
//               <YAxis tick={{fontSize:10}} />
//               <Tooltip content={<Tip/>} />
//               <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
//               <Area type="monotone" dataKey="bugs"  name="Bugs"  stroke="#ef4444" fill="url(#bgr)" strokeWidth={2.5} />
//               <Area type="monotone" dataKey="tasks" name="Tasks" stroke="#3b82f6" fill="url(#tgr)" strokeWidth={2.5} />
//             </AreaChart>
//           </ResponsiveContainer>
//         </Card>

//         {/* 6 resolution time */}
//         <Card title="Avg Resolution Time" subtitle="Days to close an issue — target 4 days" accent="#06b6d4">
//           <ResponsiveContainer width="100%" height={200}>
//             <ComposedChart data={resTime}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//               <XAxis dataKey="sprint" tick={{fontSize:10}} tickFormatter={v=>v.replace("Sprint ","S")} />
//               <YAxis tick={{fontSize:10}} unit="d" domain={[0,6]} />
//               <Tooltip content={<Tip/>} />
//               <ReferenceLine y={4} stroke="#f59e0b" strokeDasharray="4 2"
//                 label={{value:"Target",position:"insideTopRight",fontSize:8,fill:"#f59e0b"}} />
//               <Bar  dataKey="avg_hours" name="Avg Days" fill="#06b6d4" radius={[4,4,0,0]} opacity={.8} />
//               <Line dataKey="avg_hours" name=" "        stroke="#0284c7" strokeWidth={2.5} dot={{r:4}} />
//             </ComposedChart>
//           </ResponsiveContainer>
//         </Card>

//         {/* 7 project status */}
//         <Card title="Project Portfolio Status" subtitle="26 Active · 7 Blocked · 7 Planned" accent="#10b981">
//           <div style={{ display:"flex", gap:"1rem", alignItems:"center" }}>
//             <ResponsiveContainer width="50%" height={190}>
//               <PieChart>
//                 <Pie data={statusD} dataKey="count" nameKey="status"
//                   innerRadius={48} outerRadius={74} paddingAngle={5}>
//                   {statusD.map((d,i)=><Cell key={i} fill={STATUS_COLOR[d.status]||COLORS[i]}/>)}
//                 </Pie>
//                 <Tooltip content={<Tip/>} />
//               </PieChart>
//             </ResponsiveContainer>
//             <div style={{ flex:1 }}>
//               {statusD.map((d,i)=>(
//                 <div key={i} style={{ marginBottom:13 }}>
//                   <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
//                     <span style={{ fontWeight:700, fontSize:".8rem", color:STATUS_COLOR[d.status] }}>{d.status}</span>
//                     <b style={{ fontSize:".85rem", color:"#0f172a" }}>{d.count}</b>
//                   </div>
//                   <div style={{ height:6, background:"#f1f5f9", borderRadius:99 }}>
//                     <div style={{ height:"100%", width:`${Math.round(d.count/40*100)}%`, background:STATUS_COLOR[d.status], borderRadius:99 }} />
//                   </div>
//                 </div>
//               ))}
//               <div style={{ marginTop:12, padding:"8px 10px", background:"#f8fafc", borderRadius:8, fontSize:".72rem", color:"#64748b" }}>
//                 <b style={{ color:"#ef4444" }}>7 Blocked</b> projects need attention
//               </div>
//             </div>
//           </div>
//         </Card>

//         {/* 8 risk map */}
//         <Card title="Issues Per Project — Risk" subtitle="Top 10 projects by open issue count" accent="#ef4444"
//           badge={{ label:"🔥 Risk Map", bg:"#fef3c7", color:"#d97706", border:"#fde68a" }}>
//           <ResponsiveContainer width="100%" height={190}>
//             <BarChart data={issProj} layout="vertical" barSize={13}>
//               <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
//               <XAxis type="number" tick={{fontSize:10}} domain={[0,8]} />
//               <YAxis dataKey="projectname" type="category" width={32} tick={{fontSize:10}} />
//               <Tooltip content={<Tip/>} />
//               <Bar dataKey="count" name="Open Issues" radius={[0,5,5,0]}>
//                 {issProj.map((e,i)=><Cell key={i} fill={e.count>=6?"#ef4444":e.count>=4?"#f59e0b":"#10b981"}/>)}
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//           <div style={{ display:"flex", gap:10, marginTop:8 }}>
//             {[{c:"#ef4444",l:"6+ High"},{c:"#f59e0b",l:"4–5 Med"},{c:"#10b981",l:"<4 Low"}].map(x=>(
//               <div key={x.l} style={{ display:"flex", alignItems:"center", gap:5, fontSize:".68rem", color:"#64748b" }}>
//                 <div style={{ width:8, height:8, borderRadius:2, background:x.c }}/>{x.l}
//               </div>
//             ))}
//           </div>
//         </Card>

//         {/* 9 budget utilization % */}
//         <Card title="Budget Utilisation %" subtitle="% of allocated spent — 80%+ = warning" accent="#8b5cf6"
//           badge={{ label:`${budgetE.filter(d=>d.pct>80).length} near limit`, bg:"#fef2f2", color:"#dc2626" }}>
//           <ResponsiveContainer width="100%" height={190}>
//             <BarChart data={utilData} barSize={11}>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
//               <XAxis dataKey="name" tick={{fontSize:7.5}} angle={-30} textAnchor="end" height={40} />
//               <YAxis tick={{fontSize:9}} unit="%" domain={[0,110]} />
//               <Tooltip content={<Tip/>} />
//               <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2"
//                 label={{value:"80%",position:"insideTopRight",fontSize:8,fill:"#ef4444"}} />
//               <Bar dataKey="pct" name="Used %" radius={[3,3,0,0]}>
//                 {utilData.map((e,i)=><Cell key={i} fill={e.pct>90?"#ef4444":e.pct>80?"#f59e0b":e.pct>60?"#3b82f6":"#10b981"}/>)}
//               </Bar>
//             </BarChart>
//           </ResponsiveContainer>
//         </Card>

//         {/* 10 budget allocated vs used — paginated — admin only */}
//         {isAdmin && (
//           <Card title="Budget: Allocated vs Used" accent="#f59e0b" span={2}
//             subtitle={`Projects ${bPage*PG+1}–${Math.min((bPage+1)*PG,budget.length)} of ${budget.length} — red = >90% used`}>
//             <ResponsiveContainer width="100%" height={200}>
//               <BarChart data={budgetPage} barSize={20}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
//                 <XAxis dataKey="projectname" tick={{fontSize:10}} angle={-15} textAnchor="end" height={42} />
//                 <YAxis tick={{fontSize:10}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
//                 <Tooltip content={<Tip/>} />
//                 <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
//                 <Bar dataKey="budgetallocated" name="Allocated" fill="#bfdbfe" radius={[3,3,0,0]} />
//                 <Bar dataKey="budgetused"      name="Used"      radius={[3,3,0,0]}>
//                   {budgetPage.map((e,i)=><Cell key={i} fill={e.pct>90?"#ef4444":e.pct>75?"#f59e0b":"#3b82f6"}/>)}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>
//             <div style={{ display:"flex", justifyContent:"center", gap:7, marginTop:8 }}>
//               {Array.from({length:Math.ceil(budget.length/PG)},(_,i)=>(
//                 <button key={i} onClick={()=>setBPage(i)}
//                   style={{ width:8, height:8, borderRadius:"50%", border:"none", cursor:"pointer", padding:0,
//                     background:bPage===i?"#f59e0b":"#e5e7eb" }}/>
//               ))}
//             </div>
//           </Card>
//         )}

//         {/* 10b developer — budget remaining */}
//         {isDev && (
//           <Card title="Project Budget Remaining" subtitle="Remaining headroom per project" accent="#10b981" span={2}>
//             <ResponsiveContainer width="100%" height={200}>
//               <BarChart data={budgetE.slice(0,10)} barSize={20}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
//                 <XAxis dataKey="projectname" tick={{fontSize:10}} angle={-15} textAnchor="end" height={42} />
//                 <YAxis tick={{fontSize:10}} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
//                 <Tooltip content={<Tip/>} />
//                 <Bar dataKey="surplus" name="Remaining ($)" radius={[3,3,0,0]}>
//                   {budgetE.slice(0,10).map((e,i)=><Cell key={i} fill={e.surplus<5000?"#f59e0b":"#10b981"}/>)}
//                 </Bar>
//               </BarChart>
//             </ResponsiveContainer>
//           </Card>
//         )}

//         {/* 11 radar team capacity — admin */}
//         {isAdmin && (
//           <Card title="Team Capacity Radar" subtitle="Issue load vs. 25-issue threshold" accent="#06b6d4">
//             <ResponsiveContainer width="100%" height={200}>
//               <RadarChart data={teams} cx="50%" cy="50%" outerRadius={78}>
//                 <PolarGrid stroke="#e2e8f0" />
//                 <PolarAngleAxis dataKey="assigneeteam" tick={{fontSize:11, fontWeight:600}} />
//                 <PolarRadiusAxis tick={{fontSize:8}} domain={[0,40]} />
//                 <Radar name="Issues" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={.3} />
//                 <Tooltip content={<Tip/>} />
//               </RadarChart>
//             </ResponsiveContainer>
//           </Card>
//         )}

//         {/* 12 team breakdown bars */}
//         <Card title="Team Load Detail" subtitle="Bars show load vs 40-issue max capacity" accent="#10b981">
//           <div style={{ marginTop:4 }}>
//             {teams.map(t=>(
//               <PRow key={t.assigneeteam} label={t.assigneeteam} value={t.count} max={40}
//                 color={t.count>25?"#ef4444":t.count>18?"#f59e0b":"#10b981"} />
//             ))}
//           </div>
//           <div style={{ marginTop:14, padding:"10px 12px", background:"#f8fafc", borderRadius:8 }}>
//             <div style={{ display:"flex", gap:14, fontSize:".72rem", color:"#64748b" }}>
//               <span>Total: <b style={{color:"#0f172a"}}>{teams.reduce((a,b)=>a+b.count,0)}</b></span>
//               <span>Avg/team: <b style={{color:"#0f172a"}}>{Math.round(teams.reduce((a,b)=>a+b.count,0)/teams.length)}</b></span>
//               <span>Peak: <b style={{color:"#ef4444"}}>{Math.max(...teams.map(t=>t.count))}</b></span>
//             </div>
//           </div>
//         </Card>

//         {/* 13 bug density */}
//         <Card title="Bug Density per Sprint" subtitle="Bugs introduced each sprint — avg line at 11" accent="#ef4444">
//           <ResponsiveContainer width="100%" height={200}>
//             <AreaChart data={sprints}>
//               <defs>
//                 <linearGradient id="bdg" x1="0" y1="0" x2="0" y2="1">
//                   <stop offset="5%"  stopColor="#ef4444" stopOpacity={.3}/>
//                   <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
//                 </linearGradient>
//               </defs>
//               <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//               <XAxis dataKey="sprint" tick={{fontSize:10}} tickFormatter={v=>v.replace("Sprint ","S")} />
//               <YAxis tick={{fontSize:10}} />
//               <Tooltip content={<Tip/>} />
//               <ReferenceLine y={11} stroke="#f59e0b" strokeDasharray="4 2"
//                 label={{value:"Avg",position:"insideTopRight",fontSize:8,fill:"#f59e0b"}} />
//               <Area type="monotone" dataKey="bugs" name="Bugs" stroke="#ef4444" fill="url(#bdg)" strokeWidth={2.5} dot={{r:4,fill:"#ef4444"}} activeDot={{r:6}} />
//             </AreaChart>
//           </ResponsiveContainer>
//         </Card>

//       </div>
//     </div>
//   );
// };

// export default Dashboard;





































// import React, { useContext } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { useDashboardStats, useDashboardCharts } from "../api/dashboardApi";
// import KPICard from "../components/KPICard";
// import { FiBriefcase, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
// import { 
//   PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, 
//   CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer, 
//   Legend, AreaChart, Area 
// } from 'recharts';

// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#10b981'];

// const Dashboard = () => {
//   const { role } = useContext(AuthContext);           
//   const currentRole = (role || '').toLowerCase();     

//   const { data: stats, isLoading: statsLoading } = useDashboardStats();
//   const { data: charts, isLoading: chartsLoading } = useDashboardCharts();

//   if (statsLoading || chartsLoading) {
//     return <div style={msgStyle}>Loading dashboard...</div>;
//   }

//   if (!stats || !charts) {
//     return <div style={{...msgStyle, color: '#dc2626'}}>No data available. Check server connection.</div>;
//   }

//   return (
//     <div style={{ padding: "2rem", backgroundColor: "#f9fafb", minHeight: "100vh" }}>

//       {/* 1. KPI SECTION */}
//       <div style={kpiGridStyle}>
//         <KPICard title="Total Projects" icon={<FiBriefcase />} value={stats.totalProjects ?? 0} linkTo="/projects" />
//         <KPICard title="Total Issues" icon={<FiCheckCircle />} value={stats.totalIssues ?? 0} linkTo="/issues" />
//         {["admin", "superadmin", "tester"].includes(currentRole) && (
//           <KPICard title="Total Bugs" icon={<FiAlertCircle />} value={stats.totalBugs ?? 0} linkTo="/issues" />
//         )}
//       </div>

//       {/* 2. MAIN CHARTS GRID */}
//       <div style={mainGridStyle}>

//         {/* Graph: Budget vs Used */}
//         <div style={cardStyle}>
//           <h3>Budget Allocation vs. Used</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <BarChart data={charts.budgetData}>
//               <XAxis dataKey="projectname" />
//               <YAxis /><Tooltip /><Legend />
//               <Bar dataKey="budgetallocated" fill="#8884d8" name="Allocated" />
//               <Bar dataKey="budgetused" fill="#ef4444" name="Used" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Graph: Issue Burndown/Trend */}
//         <div style={cardStyle}>
//           <h3>Issues Created per Sprint</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <AreaChart data={charts.issuesPerSprint}>
//               <XAxis dataKey="sprint" /><YAxis /><Tooltip />
//               <Area type="monotone" dataKey="count" stroke="#82ca9d" fill="#82ca9d" />
//             </AreaChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Graph: Team Load */}
//         <div style={cardStyle}>
//           <h3>Workload by Team</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <BarChart data={charts.teamLoad} layout="vertical">
//               <XAxis type="number" /><YAxis dataKey="assigneeteam" type="category" width={80} />
//               <Tooltip /><Bar dataKey="count" fill="#3b82f6" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Graph: Issue Type Distribution */}
//         <div style={cardStyle}>
//           <h3>Bugs vs Tasks Distribution</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <PieChart>
//               <Pie data={charts.issuesByType} dataKey="count" nameKey="issuetypename" innerRadius={50} outerRadius={80}>
//                 {charts.issuesByType?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
//               </Pie>
//               <Tooltip /><Legend />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Graph: Project Status Portfolio */}
//         <div style={cardStyle}>
//           <h3>Project Portfolio Status</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <PieChart>
//               <Pie data={charts.statusDistribution} dataKey="count" nameKey="status" outerRadius={80} label>
//                 {charts.statusDistribution?.map((_, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Graph: Resolution Rate */}
//         <div style={cardStyle}>
//           <h3>Resolution Efficiency (Hours)</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <LineChart data={charts.resolutionTime}>
//               <XAxis dataKey="sprint" /><YAxis /><Tooltip />
//               <Line type="stepAfter" dataKey="avg_hours" stroke="#ff7300" strokeWidth={3} />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Graph: Issues per Project (Risk) */}
//         <div style={cardStyle}>
//           <h3>Issues per Project</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <BarChart data={charts.issuesPerProject}>
//               <CartesianGrid strokeDasharray="3 3" vertical={false} />
//               <XAxis dataKey="projectname" /><YAxis /><Tooltip />
//               <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Graph: Budget Forecast (Surplus) */}
//         <div style={cardStyle}>
//           <h3>Remaining Budget Forecast</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <BarChart data={charts.budgetData}>
//               <XAxis dataKey="projectname" /><YAxis /><Tooltip />
//               <Bar dataKey="remaining" fill="#10b981" name="Surplus" radius={[4, 4, 0, 0]} />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Monthly Trend (Spans 2 columns if space allows) */}
//         <div style={{ ...cardStyle, gridColumn: "span 1" }}>
//           <h3>Budget Utilization Trend</h3>
//           <ResponsiveContainer width="100%" height={250}>
//             <LineChart data={charts.budgetTrend}>
//               <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
//               <Line type="monotone" dataKey="avg_allocated" stroke="#8884d8" name="Allocated" />
//               <Line type="monotone" dataKey="avg_used" stroke="#82ca9d" name="Used" />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//       </div>
//     </div>
//   );
// };

// // --- STYLES ---
// const mainGridStyle = {
//   display: "grid",
//   gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
//   gap: "1.5rem",
// };

// const kpiGridStyle = {
//   display: "grid",
//   gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
//   gap: "1.5rem",
//   marginBottom: "2rem",
// };

// const cardStyle = {
//   background: "#fff",
//   padding: "1.2rem",
//   borderRadius: "10px",
//   boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
//   border: "1px solid #e5e7eb"
// };

// const msgStyle = {
//   padding: '3rem', 
//   textAlign: 'center', 
//   fontSize: '1.2rem', 
//   fontFamily: 'sans-serif'
// };

// export default Dashboard;






























// import { useContext } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { useDashboardStats, useDashboardCharts } from "../api/dashboardApi";
// import KPICard from "../components/KPICard";
// import { FiBriefcase, FiAlertCircle } from 'react-icons/fi';
// import { 
//   PieChart, Pie, Cell, 
//   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
//   BarChart, Bar, ResponsiveContainer 
// } from 'recharts';
// const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// const Dashboard = () => {
//   const { role } = useContext(AuthContext);           // ← get role from context
//   const currentRole = (role || '').toLowerCase();     // ← safe lowercase

//   const { data: stats, isLoading: statsLoading } = useDashboardStats();
//   const { data: charts, isLoading: chartsLoading } = useDashboardCharts();

//   if (statsLoading || chartsLoading) {
//     return (
//       <div style={{ padding: '3rem', textAlign: 'center', fontSize: '1.3rem' }}>
//         Loading dashboard...
//       </div>
//     );
//   }

//   if (!stats || !charts) {
//     return (
//       <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626' }}>
//         No data available. Please check your login or server.
//       </div>
//     );
//   }

//   // Optional: Filter charts for tester/developer (once /my-projects works)
//   // const filteredCharts = { ...charts }; // add filtering later

//   return (

//     <div style={{ padding: "2rem" }}>
//       {/* KPIs */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
//           gap: "1rem",
//           marginBottom: "2rem",
//         }}
//       >
//         <KPICard
//           title="Total Projects"
//           icon={<FiBriefcase />}
//           value={stats.totalProjects ?? 0}
//           linkTo="/projects"
//         />
//         <KPICard
//           title="Total Issues"
//           value={stats.totalIssues ?? 0}
//           linkTo="/issues"
//         />
//         {["admin", "superadmin", "tester"].includes(currentRole) && (
//           <KPICard
//             title="Total Bugs"
//             icon={<FiAlertCircle />}
//             value={stats.totalBugs ?? 0}
//             linkTo="/issues"
//           />
//         )}
//       </div>

//       {/* Charts – all use safe fallback [] */}
//       <LineChart data={charts?.resolutionTime ?? []}>
//         <Line type="monotone" dataKey="avg_hours" stroke="#8884d8" name="Avg Resolution (hours)" />
//         <XAxis dataKey="sprint" />
//         <YAxis />
//         <Tooltip />
//       </LineChart>

//       <BarChart data={charts?.bugsPerSprint ?? []}>
//         <Bar dataKey="count" fill="#ff7300" />
//         <XAxis dataKey="sprint" />
//         <YAxis />
//         <Tooltip />
//       </BarChart>

//       <BarChart data={charts?.projectDuration ?? []}>
//         <Bar dataKey="duration_days" fill="#82ca9d" />
//         <XAxis dataKey="projectname" angle={-45} textAnchor="end" />
//         <YAxis />
//         <Tooltip />
//       </BarChart>

//       <PieChart>
//         <Pie 
//           data={charts?.issuesPerProject ?? []} 
//           dataKey="count" 
//           nameKey="projectid" 
//           cx="50%" 
//           cy="50%" 
//           outerRadius={80}
//         >
//           {(charts?.issuesPerProject ?? []).map((entry, index) => (
//             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//           ))}
//         </Pie>
//         <Tooltip />
//       </PieChart>

//       <BarChart data={charts?.teamLoad ?? []} layout="vertical">
//         <Bar dataKey="count" fill="#8884d8" />
//         <XAxis type="number" />
//         <YAxis type="category" dataKey="assigneeteam" />
//         <Tooltip />
//       </BarChart>

//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
//           gap: "2rem",
//         }}
//       >
//         {/* Project Status Distribution */}
//         <div>
//           <h3>Project Status Distribution</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={charts?.statusDistribution ?? []}
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={80}
//                 dataKey="count"
//                 nameKey="status"
//                 label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
//               >
//                 {(charts?.statusDistribution ?? []).map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//         <div className="dashboard-grid">
//       {/* 1. Team Load Chart */}
//       <div className="chart-container">
//         <h3>Team Issue Distribution</h3>
//         <ResponsiveContainer width="100%" height={300}>
//           <BarChart data={charts.teamLoad}>
//             <XAxis dataKey="assigneeteam" />
//             <YAxis />
//             <Tooltip />
//             <Bar dataKey="count" fill="#3b82f6" />
//           </BarChart>
//         </ResponsiveContainer>
//       </div>

//       {/* 2. Issues by Type Pie Chart */}
//       <div className="chart-container">
//         <h3>Issue Types</h3>
//         <ResponsiveContainer width="100%" height={300}>
//           <PieChart>
//             <Pie data={charts.issuesByType} dataKey="count" nameKey="issuetypename" cx="50%" cy="50%" outerRadius={80}>
//               {charts.issuesByType?.map((entry, index) => (
//                 <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#10b981'} />
//               ))}
//             </Pie>
//             <Tooltip />
//           </PieChart>
//         </ResponsiveContainer>
//       </div>
//     </div>

//         {/* Issues by Type */}
//         <div>
//           <h3>Issues by Type</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={charts?.issuesByType ?? []}
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={80}
//                 dataKey="count"
//                 nameKey="issuetypename"
//               >
//                 {(charts?.issuesByType ?? []).map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Monthly Budget Utilization Trend */}
//         <div style={{ gridColumn: "1 / -1" }}>
//           <h3>Monthly Budget Utilization Trend</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={charts?.budgetTrend ?? []}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="month" />
//               <YAxis />
//               <Tooltip />
//               <Line type="monotone" dataKey="avg_allocated" stroke="#8884d8" name="Allocated" />
//               <Line type="monotone" dataKey="avg_used" stroke="#82ca9d" name="Used" />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Issues per Sprint */}
//         <div>
//           <h3>Issues per Sprint</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={charts?.issuesPerSprint ?? []}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="sprint" />
//               <YAxis />
//               <Tooltip />
//               <Bar dataKey="count" fill="#8884d8" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Team Load */}
//         <div>
//           <h3>Team Load by Assignee</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={charts?.teamLoad ?? []} layout="vertical">
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis type="number" />
//               <YAxis dataKey="assigneeteam" type="category" />
//               <Tooltip />
//               <Bar dataKey="count" fill="#82ca9d" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Dashboard;
{/* // import { useEffect, useState, useContext } from "react";
// import { getDashboardStats } from "../api/dashboardApi";
// import { AuthContext } from "../auth/AuthContext"; // ← ADD THIS for login
// import KPICard from "../components/KPICard";
// import { useNavigate } from "react-router-dom"; // ← for redirect if needed

// const Dashboard = () => { */}
/* //   const { login } = useContext(AuthContext); // ← now defined
//   const [stats, setStats] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchStats = async () => {
//       try {
//         const res = await getDashboardStats();
//         setStats(res.data);
//       } catch (err) {
//         console.error("Dashboard fetch error:", err);
//         setError("Failed to load dashboard stats");
//         // Optional: redirect to login if unauthorized
//         if (err.response?.status === 401) {
//           navigate("/");
//         }
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchStats();
//   }, [navigate]); // depend on navigate

//   if (loading) return <div>Loading dashboard...</div>;

//   if (error) return <div style={{ color: "red" }}>{error}</div>;

//   return (
//     <div style={{ padding: "20px" }}>
//       <h2>Dashboard</h2>
//       <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
//         <KPICard title="Total Projects" value={stats.totalProjects || 0} />
//         <KPICard title="Total Issues" value={stats.totalIssues || 0} />
//         <KPICard title="Total Bugs" value={stats.totalBugs || 0} />
//       </div>
//     </div>
//   );
// };

// export default Dashboard; */