import React from 'react';

const AuditLogs = () => {
  // In a real app, you'd fetch this from a /api/logs endpoint
  const mockLogs = [
    { id: 1, user: "admin@company.com", action: "Updated Project_5 Status", target: "P5", time: "2024-05-20 10:30 AM", ip: "192.168.1.1" },
    { id: 2, user: "superadmin@dev.com", action: "Created Project_22", target: "P22", time: "2024-05-19 02:15 PM", ip: "104.22.11.4" },
    { id: 3, user: "tester_1@qa.com", action: "Resolved Issue I-99", target: "I99", time: "2024-05-19 11:00 AM", ip: "172.16.254.1" },
  ];

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>System Audit Logs</h2>
      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Timestamp</th>
              <th style={{ padding: '1rem' }}>User</th>
              <th style={{ padding: '1rem' }}>Action</th>
              <th style={{ padding: '1rem' }}>Object ID</th>
              <th style={{ padding: '1rem' }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {mockLogs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem', color: '#64748b' }}>{log.time}</td>
                <td style={{ padding: '1rem', fontWeight: '500' }}>{log.user}</td>
                <td style={{ padding: '1rem' }}>{log.action}</td>
                <td style={{ padding: '1rem' }}><code style={{ background: '#f1f5f9', padding: '2px 6px' }}>{log.target}</code></td>
                <td style={{ padding: '1rem', color: '#94a3b8' }}>{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogs;