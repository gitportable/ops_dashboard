import React from 'react';
import { useDashboardCharts } from "../api/dashboardApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const ResourceAllocation = () => {
  const { data: charts, isLoading } = useDashboardCharts();

  if (isLoading) return <div style={{ padding: '2rem' }}>Analyzing team capacity...</div>;

  // Logic: Identify teams with > 15 issues as "At Risk"
  const processData = charts?.teamLoad?.map(team => ({
    ...team,
    status: team.count > 15 ? 'Overloaded' : 'Healthy',
    capacity: 20 // Static threshold for visualization
  })) || [];

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Resource Allocation & Team Capacity</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3>Team Workload vs Capacity</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={processData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="assigneeteam" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="Assigned Issues" radius={[4, 4, 0, 0]}>
                {processData.map((entry, index) => (
                  <Cell key={index} fill={entry.count > 15 ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
              <Bar dataKey="capacity" name="Max Threshold" fill="#e2e8f0" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {processData.filter(t => t.count > 15).map(team => (
            <div key={team.assigneeteam} style={{ borderLeft: '5px solid #ef4444', padding: '1rem', background: '#fef2f2', borderRadius: '8px' }}>
              <h4 style={{ margin: 0, color: '#991b1b' }}>⚠️ Bottleneck Detected: {team.assigneeteam}</h4>
              <p style={{ margin: '5px 0 0', color: '#b91c1c' }}>This team has {team.count} active issues. Consider reassigning tasks to other teams.</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourceAllocation;