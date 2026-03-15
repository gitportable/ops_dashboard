import React from 'react';
import { useDashboardCharts } from "../api/dashboardApi";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MyRoadmap = () => {
  const { data: charts, isLoading } = useDashboardCharts();

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading Roadmap...</div>;

  // Mapping budgetData (which contains project names) to a timeline format
  // In your real API, ensure these dates are passed through
  const roadmapData = charts?.budgetData?.slice(0, 8).map(project => ({
    name: project.projectname,
    duration: Math.floor(Math.random() * 90) + 30, // Mocking duration days for visual
    startOffset: Math.floor(Math.random() * 20)
  })) || [];

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>Project Roadmap</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Visual timeline of your currently assigned projects.</p>

      <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart layout="vertical" data={roadmapData} margin={{ left: 50 }}>
            <CartesianGrid stroke="#f1f5f9" horizontal={true} vertical={false} />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} />
            <Tooltip 
               cursor={{ fill: '#f8fafc' }}
               content={({ active, payload }) => {
                 if (active && payload && payload.length) {
                   return (
                     <div style={{ background: '#1e293b', color: '#fff', padding: '10px', borderRadius: '5px' }}>
                       <p>{`${payload[0].payload.name}`}</p>
                       <p>{`Timeline: ${payload[0].value} Days`}</p>
                     </div>
                   );
                 }
                 return null;
               }}
            />
            {/* The first bar is invisible to push the second bar to the "Start Date" */}
            <Bar dataKey="startOffset" stackId="a" fill="transparent" />
            <Bar dataKey="duration" stackId="a" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20} />
          </ComposedChart>
        </ResponsiveContainer>
        
        <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '12px', height: '12px', background: '#8884d8', borderRadius: '2px' }}></div>
            <span style={{ fontSize: '14px' }}>Active Development</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyRoadmap;