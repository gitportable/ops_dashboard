import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { 
  FiAlertCircle, FiCheckCircle, FiClock, FiActivity, 
  FiSearch, FiFilter, FiX, FiChevronRight, FiBox, FiTool 
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';

const COLORS = {
  primary: '#1e3a8a',
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#22c55e',
  resolved: '#22c55e',
  trendTotal: '#3b82f6',
  trendResolved: '#10b981',
  chartRange: ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe']
};

const SOLAR_CATEGORIES = [
  'Hotspot', 'PID Issue', 'Junction Box Issue', 
  'Interconnect Failure', 'Delamination', 'Cell Crack',
  'Bypass Diode Failure', 'Soiling', 'Shading', 'Other'
];

const fetchDefectSummary = () => api.get('/issues/defect-summary').then(res => res.data);
const fetchAllIssues = () => api.get('/issues').then(res => res.data);

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div style={{
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    borderLeft: `6px solid ${color}`,
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: '1 1 200px'
  }}>
    <div style={{
      background: `${color}15`,
      padding: '12px',
      borderRadius: '12px',
      color: color,
      fontSize: '1.5rem'
    }}>
      <Icon />
    </div>
    <div>
      <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{title}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: '2px 0' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{subtitle}</div>}
    </div>
  </div>
);

const ChartCard = ({ title, children, height = 280, topBorderColor }) => (
  <div style={{
    background: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    borderTop: topBorderColor ? `4px solid ${topBorderColor}` : 'none',
    display: 'flex',
    flexDirection: 'column'
  }}>
    <h3 style={{ margin: '0 0 20px 0', color: '#1e3a8a', fontWeight: 700, fontSize: '1.1rem' }}>{title}</h3>
    <div style={{ height, width: '100%' }}>
      {children}
    </div>
  </div>
);

const DefectAnalytics = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState({ type: null, value: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const openFullIssueWorkspace = () => {
    if (!selectedIssue) return;
    console.log('selectedIssue full object:', JSON.stringify(selectedIssue));
    const rawId = selectedIssue.issue_id ?? selectedIssue.id ?? selectedIssue.issueId ?? selectedIssue.issueid;
    const numericId = typeof rawId === 'string'
      ? parseInt(rawId.replace(/^I0*/i, ''), 10)
      : Number(rawId);
    if (!numericId || Number.isNaN(numericId)) return;
    navigate(`/issues/${numericId}`);
  };

  const { data: summary = [] } = useQuery({
    queryKey: ['defectSummary'],
    queryFn: fetchDefectSummary,
    refetchInterval: 60000
  });

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['allIssuesAnalytics'],
    queryFn: fetchAllIssues,
    refetchInterval: 60000
  });

  // Data Processing
  const processedData = useMemo(() => {
    if (!issues.length) return null;

    const now = dayjs();
    const last6Months = Array.from({ length: 6 }).map((_, i) => now.subtract(i, 'month').format('MMM')).reverse();

    const stats = {
      total: issues.length,
      critical: issues.filter(i => (i.severity || '').toLowerCase() === 'critical' || (i.severity || '').toLowerCase() === 'high').length,
      resolvedMonth: issues.filter(i => (i.status || '').toLowerCase() === 'done' && dayjs(i.closeddate).isAfter(now.startOf('month'))).length,
      avgResolution: issues.filter(i => i.closeddate).reduce((acc, i) => acc + dayjs(i.closeddate).diff(dayjs(i.createddate), 'day'), 0) / (issues.filter(i => i.closeddate).length || 1)
    };

    const trendData = last6Months.map(month => ({
      name: month,
      total: issues.filter(i => dayjs(i.createddate).format('MMM') === month).length,
      resolved: issues.filter(i => (i.status || '').toLowerCase() === 'done' && dayjs(i.closeddate).format('MMM') === month).length
    }));

    const distribution = SOLAR_CATEGORIES.map(cat => ({
      name: cat,
      value: issues.filter(i => (i.defect_category || 'Other') === cat).length
    })).filter(d => d.value > 0);

    const severityData = [
      { name: 'Critical', value: issues.filter(i => (i.severity || '').toLowerCase() === 'critical').length, color: COLORS.critical },
      { name: 'High', value: issues.filter(i => (i.severity || '').toLowerCase() === 'high').length, color: COLORS.high },
      { name: 'Medium', value: issues.filter(i => (i.severity || '').toLowerCase() === 'medium').length, color: COLORS.medium },
      { name: 'Low', value: issues.filter(i => (i.severity || '').toLowerCase() === 'low').length, color: COLORS.low }
    ];

    const stages = ['Cell Stringing', 'Lamination', 'IV Testing', 'Framing', 'EL Testing', 'Dispatch'];
    const stageData = stages.map((stage, idx) => ({
      stage,
      count: issues.filter(i => (i.production_stage || i.stage || '') === stage).length,
      opacity: 1 - (idx * 0.15)
    }));
    console.log('stageData', stageData);

    const resolutionRate = (issues.filter(i => (i.status || '').toLowerCase() === 'done').length / (issues.length || 1)) * 100;

    return { stats, trendData, distribution, severityData, stageData, resolutionRate };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      const matchesSearch = !searchTerm || 
        (i.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(i.issueid).includes(searchTerm);
      
      const matchesFilter = !activeFilter.type || (
        activeFilter.type === 'category' ? (i.defect_category || 'Other') === activeFilter.value :
        activeFilter.type === 'severity' ? (i.severity || '').toLowerCase() === activeFilter.value.toLowerCase() :
        activeFilter.type === 'stage' ? (i.production_stage || i.stage || '') === activeFilter.value :
        activeFilter.type === 'month' ? dayjs(i.createddate).format('MMM') === activeFilter.value :
        true
      );

      return matchesSearch && matchesFilter;
    });
  }, [issues, searchTerm, activeFilter]);

  const paginatedIssues = filteredIssues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (isLoading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <FiActivity style={{ fontSize: '3rem', color: '#1e3a8a', animation: 'pulse 2s infinite' }} />
        <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 600 }}>Loading Solar Defect Intelligence...</p>
      </div>
    );
  }

  const { stats, trendData, distribution, severityData, stageData, resolutionRate } = processedData || {
    stats: { total: 0, critical: 0, resolvedMonth: 0, avgResolution: 0 },
    trendData: [], distribution: [], severityData: [], stageData: [], resolutionRate: 0
  };

  const clearFilters = () => setActiveFilter({ type: null, value: null });

  return (
    <div style={{ padding: '2rem', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '2.2rem', fontWeight: 800, color: '#1e3a8a' }}>Solar Defect Intelligence</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '1rem' }}>Operational analysis and quality assurance metrics for MNC Solar</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#1e3a8a', fontWeight: 700, fontSize: '0.9rem' }}>Last Refreshed: {dayjs().format('HH:mm:ss')}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Real-time updates via Socket.io</div>
        </div>
      </div>

      {/* Row 1: Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <StatCard title="Total Defects" value={stats.total} icon={FiActivity} color={COLORS.primary} subtitle="All tracked issues" />
        <StatCard title="Critical Defects" value={stats.critical} icon={FiAlertCircle} color={COLORS.critical} subtitle="Severity Critical/High" />
        <StatCard title="Resolved This Month" value={stats.resolvedMonth} icon={FiCheckCircle} color={COLORS.resolved} subtitle="Closed since 1st" />
        <StatCard title="Avg Resolution Time" value={`${stats.avgResolution.toFixed(1)} Days`} icon={FiClock} color="#8b5cf6" subtitle="Mean cycle time" />
      </div>

      {/* Row 2: Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <ChartCard title="Defect Distribution" topBorderColor={COLORS.primary}>
          <div style={{ position: 'relative', height: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  onClick={(data) => setActiveFilter({ type: 'category', value: data.name })}
                >
                  {distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.chartRange[index % COLORS.chartRange.length]} style={{ cursor: 'pointer', transition: 'all 0.3s ease' }} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name, props) => [`${value} (${((value / stats.total) * 100).toFixed(1)}%)`, name]}
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1e3a8a' }}>{stats.total}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Defect Trend Over Time" topBorderColor={COLORS.trendTotal}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} onClick={(data) => data && setActiveFilter({ type: 'month', value: data.activeLabel })}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.trendTotal} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={COLORS.trendTotal} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.trendResolved} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={COLORS.trendResolved} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
              <Area type="monotone" dataKey="total" name="Total Defects" stroke={COLORS.trendTotal} fillOpacity={1} fill="url(#colorTotal)" strokeWidth={3} activeDot={{ r: 8, cursor: 'pointer' }} />
              <Area type="monotone" dataKey="resolved" name="Resolved" stroke={COLORS.trendResolved} fillOpacity={1} fill="url(#colorResolved)" strokeWidth={3} activeDot={{ r: 8, cursor: 'pointer' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Detail Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <ChartCard title="Defects by Severity" topBorderColor={COLORS.critical}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={severityData} margin={{ left: 10 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fontWeight: 600, fill: '#64748b' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} onClick={(data) => setActiveFilter({ type: 'severity', value: data.name })}>
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: 'pointer' }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Production Stage" topBorderColor={COLORS.primary}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stageData}>
              <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} onClick={(data) => setActiveFilter({ type: 'stage', value: data.stage })}>
                {stageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.primary} fillOpacity={entry.opacity} style={{ cursor: 'pointer' }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Resolution Rate Gauge" topBorderColor={COLORS.resolved}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[{ value: resolutionRate }, { value: 100 - resolutionRate }]}
                    startAngle={180}
                    endAngle={0}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    <Cell fill={resolutionRate > 70 ? COLORS.resolved : resolutionRate > 40 ? COLORS.medium : COLORS.critical} />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '-40px', fontSize: '2rem', fontWeight: 800, color: '#1e293b' }}>
                {resolutionRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>RESOLVED</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '20px' }}>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#64748b' }}>{issues.filter(i => (i.status || '').toLowerCase() === 'open').length}</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>OPEN</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#3b82f6' }}>{issues.filter(i => (i.status || '').toLowerCase() === 'in progress').length}</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>PROGRESS</div>
              </div>
              <div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: COLORS.resolved }}>{issues.filter(i => (i.status || '').toLowerCase() === 'done').length}</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700 }}>RESOLVED</div>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Table */}
      <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ margin: 0, color: '#1e3a8a', fontWeight: 700, fontSize: '1.2rem' }}>Category Breakdown & Issue Log</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {activeFilter.type && (
              <div style={{ background: '#eff6ff', color: '#1e40af', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiFilter /> {activeFilter.type.toUpperCase()}: {activeFilter.value}
                <FiX style={{ cursor: 'pointer' }} onClick={clearFilters} />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                type="text" 
                placeholder="Search defects..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', width: '240px', fontSize: '0.9rem' }}
              />
            </div>
            {activeFilter.type && <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Clear all filters</button>}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px' }}>Issue ID</th>
                <th style={{ padding: '12px' }}>Category</th>
                <th style={{ padding: '12px' }}>Severity</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Stage</th>
                <th style={{ padding: '12px' }}>Reported Date</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedIssues.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>No data yet</div>
                    <p style={{ margin: '8px 0 0' }}>Adjust your filters or reported time range</p>
                  </td>
                </tr>
              ) : (
                paginatedIssues.map((issue) => (
                  <tr 
                    key={issue.issueid} 
                    onClick={() => setSelectedIssue(issue)}
                    style={{ background: '#f8fafc', transition: 'all 0.2s ease', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                  >
                    <td style={{ padding: '16px 12px', fontWeight: 700, color: '#1e3a8a', borderRadius: '12px 0 0 12px' }}>#{issue.issueid}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#334155' }}>{issue.defect_category || 'Other'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{issue.projectname}</div>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                        background: (issue.severity || '').toLowerCase() === 'critical' ? '#fee2e2' : (issue.severity || '').toLowerCase() === 'high' ? '#ffedd5' : '#f0fdf4',
                        color: (issue.severity || '').toLowerCase() === 'critical' ? '#ef4444' : (issue.severity || '').toLowerCase() === 'high' ? '#f97316' : '#22c55e'
                      }}>
                        {issue.severity || 'Low'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: (issue.status || '').toLowerCase() === 'done' ? '#22c55e' : (issue.status || '').toLowerCase() === 'in progress' ? '#3b82f6' : '#f59e0b' }} />
                        {issue.status || 'Open'}
                      </div>
                    </td>
                    <td style={{ padding: '16px 12px', color: '#64748b', fontSize: '0.85rem', fontWeight: 500 }}>{issue.production_stage || 'N/A'}</td>
                    <td style={{ padding: '16px 12px', color: '#64748b', fontSize: '0.85rem' }}>{dayjs(issue.createddate).format('MMM DD, YYYY')}</td>
                    <td style={{ padding: '16px 12px', textAlign: 'right', borderRadius: '0 12px 12px 0' }}>
                      <button style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, color: '#1e3a8a', cursor: 'pointer' }}>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredIssues.length > itemsPerPage && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
            {Array.from({ length: Math.ceil(filteredIssues.length / itemsPerPage) }).map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setCurrentPage(idx + 1)}
                style={{ 
                  width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                  background: currentPage === idx + 1 ? '#1e3a8a' : '#f1f5f9',
                  color: currentPage === idx + 1 ? '#fff' : '#64748b',
                  fontWeight: 700, cursor: 'pointer'
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Side Panel */}
      <AnimatePresence>
        {selectedIssue && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedIssue(null)}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', zIndex: 1000 }}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: '450px', background: '#fff', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', zIndex: 1001, padding: '40px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.5rem', fontWeight: 800 }}>Defect Details</h2>
                <button onClick={() => setSelectedIssue(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                  <FiX />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Issue ID</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e3a8a' }}>#{selectedIssue.issueid}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Category</div>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{selectedIssue.defect_category || 'Other'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Project</div>
                    <div style={{ fontWeight: 600, color: '#334155' }}>{selectedIssue.projectname}</div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Description</div>
                  <div style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, background: '#f8fafc', padding: '16px', borderRadius: '12px' }}>
                    {selectedIssue.description || 'No description provided.'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#eff6ff', p: '8px', borderRadius: '8px', color: '#3b82f6' }}><FiTool /></div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>TECHNICIAN</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedIssue.assigneeteam || 'Unassigned'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#fdf2f8', p: '8px', borderRadius: '8px', color: '#ec4899' }}><FiBox /></div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>MACHINE LINKED</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedIssue.machine_id ? `M-${selectedIssue.machine_id}` : 'None'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '20px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Resolution Notes</div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b', fontStyle: 'italic', padding: '12px', borderLeft: '3px solid #e2e8f0' }}>
                    {selectedIssue.status === 'Done' ? 'Resolution verified by QA team.' : 'Issue is currently under investigation.'}
                  </div>
                </div>
              </div>

              <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px' }}>
                <button 
                  onClick={openFullIssueWorkspace}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#1e3a8a', color: '#fff', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  Full Issue Workspace <FiChevronRight />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default DefectAnalytics;
