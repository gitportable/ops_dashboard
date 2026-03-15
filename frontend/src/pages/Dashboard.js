import React, { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import { useDashboardStats, useDashboardCharts } from "../api/dashboardApi";
import KPICard from "../components/KPICard";
import { FiBriefcase, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { 
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, ResponsiveContainer, 
  Legend, AreaChart, Area 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#10b981'];

const Dashboard = () => {
  const { role } = useContext(AuthContext);           
  const currentRole = (role || '').toLowerCase();     

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: charts, isLoading: chartsLoading } = useDashboardCharts();

  if (statsLoading || chartsLoading) {
    return <div style={msgStyle}>Loading dashboard...</div>;
  }

  if (!stats || !charts) {
    return <div style={{...msgStyle, color: '#dc2626'}}>No data available. Check server connection.</div>;
  }

  return (
    <div style={{ padding: "2rem", backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      
      {/* 1. KPI SECTION */}
      <div style={kpiGridStyle}>
        <KPICard title="Total Projects" icon={<FiBriefcase />} value={stats.totalProjects ?? 0} linkTo="/projects" />
        <KPICard title="Total Issues" icon={<FiCheckCircle />} value={stats.totalIssues ?? 0} linkTo="/issues" />
        {["admin", "superadmin", "tester"].includes(currentRole) && (
          <KPICard title="Total Bugs" icon={<FiAlertCircle />} value={stats.totalBugs ?? 0} linkTo="/issues" />
        )}
      </div>

      {/* 2. MAIN CHARTS GRID */}
      <div style={mainGridStyle}>
        
        {/* Graph: Budget vs Used */}
        <div style={cardStyle}>
          <h3>Budget Allocation vs. Used</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.budgetData}>
              <XAxis dataKey="projectname" />
              <YAxis /><Tooltip /><Legend />
              <Bar dataKey="budgetallocated" fill="#8884d8" name="Allocated" />
              <Bar dataKey="budgetused" fill="#ef4444" name="Used" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph: Issue Burndown/Trend */}
        <div style={cardStyle}>
          <h3>Issues Created per Sprint</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={charts.issuesPerSprint}>
              <XAxis dataKey="sprint" /><YAxis /><Tooltip />
              <Area type="monotone" dataKey="count" stroke="#82ca9d" fill="#82ca9d" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Graph: Team Load */}
        <div style={cardStyle}>
          <h3>Workload by Team</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.teamLoad} layout="vertical">
              <XAxis type="number" /><YAxis dataKey="assigneeteam" type="category" width={80} />
              <Tooltip /><Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph: Issue Type Distribution */}
        <div style={cardStyle}>
          <h3>Bugs vs Tasks Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={charts.issuesByType} dataKey="count" nameKey="issuetypename" innerRadius={50} outerRadius={80}>
                {charts.issuesByType?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Graph: Project Status Portfolio */}
        <div style={cardStyle}>
          <h3>Project Portfolio Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={charts.statusDistribution} dataKey="count" nameKey="status" outerRadius={80} label>
                {charts.statusDistribution?.map((_, i) => <Cell key={i} fill={COLORS[(i+2) % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Graph: Resolution Rate */}
        <div style={cardStyle}>
          <h3>Resolution Efficiency (Hours)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={charts.resolutionTime}>
              <XAxis dataKey="sprint" /><YAxis /><Tooltip />
              <Line type="stepAfter" dataKey="avg_hours" stroke="#ff7300" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Graph: Issues per Project (Risk) */}
        <div style={cardStyle}>
          <h3>Issues per Project</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.issuesPerProject}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="projectname" /><YAxis /><Tooltip />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Graph: Budget Forecast (Surplus) */}
        <div style={cardStyle}>
          <h3>Remaining Budget Forecast</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={charts.budgetData}>
              <XAxis dataKey="projectname" /><YAxis /><Tooltip />
              <Bar dataKey="remaining" fill="#10b981" name="Surplus" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Trend (Spans 2 columns if space allows) */}
        <div style={{ ...cardStyle, gridColumn: "span 1" }}>
          <h3>Budget Utilization Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={charts.budgetTrend}>
              <XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
              <Line type="monotone" dataKey="avg_allocated" stroke="#8884d8" name="Allocated" />
              <Line type="monotone" dataKey="avg_used" stroke="#82ca9d" name="Used" />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

// --- STYLES ---
const mainGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
  gap: "1.5rem",
};

const kpiGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "1.5rem",
  marginBottom: "2rem",
};

const cardStyle = {
  background: "#fff",
  padding: "1.2rem",
  borderRadius: "10px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  border: "1px solid #e5e7eb"
};

const msgStyle = {
  padding: '3rem', 
  textAlign: 'center', 
  fontSize: '1.2rem', 
  fontFamily: 'sans-serif'
};

export default Dashboard;

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