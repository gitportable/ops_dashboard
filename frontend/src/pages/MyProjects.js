import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import axios from '../api/axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fetchMyProjects = async () => axios.get('/projects/my-projects').then(res => res.data);
const fetchProjectIssues = async (projectId) => axios.get(`/issues?project=${projectId}`).then(res => res.data);
const fetchProjectInsights = async (projectId) => axios.get(`/projects/${projectId}/insights`).then(res => res.data);
const updateIssue = async (issueId, data) => axios.put(`/issues/${issueId}`, data).then(res => res.data);
const submitSprintRequest = async (projectId, data) => axios.post(`/projects/${projectId}/sprint-request`, data).then(res => res.data);

const MyProjects = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [issueToUpdate, setIssueToUpdate] = useState(null);
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['myProjects'],
    queryFn: fetchMyProjects
  });

  const { data: issues = [] } = useQuery({
    queryKey: ['projectIssues', selectedProject?.projectid],
    queryFn: () => fetchProjectIssues(selectedProject.projectid),
    enabled: !!selectedProject
  });

  const { data: insights } = useQuery({
    queryKey: ['projectInsights', selectedProject?.projectid],
    queryFn: () => fetchProjectInsights(selectedProject.projectid),
    enabled: !!selectedProject
  });

  const updateIssueMutation = useMutation({
    mutationFn: updateIssue,
    onSuccess: () => {
      queryClient.invalidateQueries(['projectIssues']);
      setIssueToUpdate(null);
    }
  });

  const sprintRequestMutation = useMutation({
    mutationFn: submitSprintRequest,
    onSuccess: () => alert('Sprint change requested - awaiting admin approval')
  });

  if (isLoading) return <div style={{ padding: '2rem', marginLeft: '260px' }}>Loading projects...</div>;

  if (projects.length === 0) return <div style={{ padding: '2rem', marginLeft: '260px' }}>No projects assigned. Contact admin.</div>;

  return (
    <div style={{ padding: '2rem', marginLeft: '260px' }}>
      <h1>My Assigned Projects</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {projects.map((project) => (
          <div 
            key={project.projectid}
            onClick={() => setSelectedProject(project)}
            style={{ cursor: 'pointer', background: selectedProject?.projectid === project.projectid ? '#e0f2fe' : 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}
          >
            <h3>{project.projectname}</h3>
            <p>Status: {project.status}</p>
            <p>Duration: {insights?.duration_days || 0} days</p>
          </div>
        ))}
      </div>

      {selectedProject && (
        <div>
          <h2>Project: {selectedProject.projectname}</h2>

          {/* Monthly Insights Graph */}
          {insights?.monthly_insights?.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3>Monthly Bugs & Tasks Solved</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={insights.monthly_insights}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bugs_solved" fill="#ff7300" name="Bugs Solved" />
                  <Bar dataKey="tasks_solved" fill="#82ca9d" name="Tasks Solved" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Sprint Request */}
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
            <h3>Current Sprint</h3>
            <p>Sprint: {issues[0]?.sprint || 'Not set'}</p>
            <button 
              onClick={() => {
                const newSprint = prompt('Enter new sprint (e.g., Sprint 6)');
                if (newSprint) {
                  sprintRequestMutation.mutate({ projectId: selectedProject.projectid, newSprint, reason: 'Sprint progress update' });
                }
              }}
              style={{ padding: '0.5rem 1rem', background: '#1e40af', color: 'white', border: 'none', borderRadius: '6px' }}
            >
              Request Sprint Change
            </button>
          </div>

          {/* Issues Table with Update */}
          <h3>Issues in This Project</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e40af', color: 'white' }}>
                <th style={{ padding: '0.75rem' }}>ID</th>
                <th style={{ padding: '0.75rem' }}>Type</th>
                <th style={{ padding: '0.75rem' }}>Sprint</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Team</th>
                <th style={{ padding: '0.75rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={issue.issueid} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem' }}>{issue.issueid}</td>
                  <td style={{ padding: '0.75rem' }}>{issue.issuetype}</td>
                  <td style={{ padding: '0.75rem' }}>{issue.sprint}</td>
                  <td style={{ padding: '0.75rem' }}>{issue.status}</td>
                  <td style={{ padding: '0.75rem' }}>{issue.assigneeteam}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <button 
                      onClick={() => setIssueToUpdate(issue)}
                      style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Update Form */}
          {issueToUpdate && (
            <div style={{ position: 'fixed', top: '20%', left: '30%', background: 'white', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', borderRadius: '8px', zIndex: 1000 }}>
              <h3>Update Issue {issueToUpdate.issueid}</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                updateIssueMutation.mutate({ 
                  issueId: issueToUpdate.issueid, 
                  sprint: formData.get('sprint'), 
                  status: formData.get('status'), 
                  description: formData.get('description') 
                });
              }}>
                <label>Sprint: <input name="sprint" defaultValue={issueToUpdate.sprint} required /></label><br />
                <label>Status: <input name="status" defaultValue={issueToUpdate.status} required /></label><br />
                <label>Description: <textarea name="description" defaultValue={issueToUpdate.description} /></label><br />
                <button type="submit" style={{ padding: '0.5rem 1rem', background: '#1e40af', color: 'white', border: 'none', borderRadius: '6px' }}>Save</button>
                <button type="button" onClick={() => setIssueToUpdate(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', marginLeft: '0.5rem' }}>Cancel</button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyProjects;



// import React, { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { Link } from 'react-router-dom';
// import axios from '../api/axios';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// const fetchMyProjects = async () => {
//   const res = await axios.get('/projects/my-projects');
//   return res.data;
// };

// const fetchProjectIssues = async (projectId) => {
//   const res = await axios.get(`/issues?project=${projectId}`); // adjust to your API
//   return res.data;
// };

// const fetchProjectInsights = async (projectId) => {
//   const res = await axios.get(`/projects/${projectId}/insights`);
//   return res.data;
// };

// const updateIssue = async (issueId, data) => {
//   const res = await axios.put(`/issues/${issueId}`, data);
//   return res.data;
// };

// const submitSprintRequest = async (projectId, data) => {
//   const res = await axios.post(`/projects/${projectId}/sprint-request`, data);
//   return res.data;
// };

// const MyProjects = () => {
//   const [selectedProject, setSelectedProject] = useState(null);
//   const [issueToUpdate, setIssueToUpdate] = useState(null);
//   const queryClient = useQueryClient();

//   const { data: projects = [], isLoading } = useQuery({
//     queryKey: ['myProjects'],
//     queryFn: fetchMyProjects
//   });

//   const { data: issues = [] } = useQuery({
//     queryKey: ['projectIssues', selectedProject?.projectid],
//     queryFn: () => fetchProjectIssues(selectedProject.projectid),
//     enabled: !!selectedProject
//   });

//   const { data: insights } = useQuery({
//     queryKey: ['projectInsights', selectedProject?.projectid],
//     queryFn: () => fetchProjectInsights(selectedProject.projectid),
//     enabled: !!selectedProject
//   });

//   const updateIssueMutation = useMutation({
//     mutationFn: updateIssue,
//     onSuccess: () => {
//       queryClient.invalidateQueries(['projectIssues']);
//       setIssueToUpdate(null);
//     }
//   });

//   const sprintRequestMutation = useMutation({
//     mutationFn: submitSprintRequest,
//     onSuccess: () => {
//       alert('Sprint change requested - awaiting admin approval');
//     }
//   });

//   if (isLoading) return <div>Loading projects...</div>;

//   if (projects.length === 0) return <div>No projects assigned.</div>;

//   return (
//     <div style={{ padding: '2rem', marginLeft: '260px' }}>
//       <h1>My Assigned Projects</h1>
//       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
//         {projects.map((project) => (
//           <div 
//             key={project.projectid}
//             onClick={() => setSelectedProject(project)}
//             style={{ cursor: 'pointer', background: selectedProject?.projectid === project.projectid ? '#e0f2fe' : 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}
//           >
//             <h3>{project.projectname}</h3>
//             <p>Status: {project.status}</p>
//             <p>Duration: {insights?.duration_days || 0} days</p>
//           </div>
//         ))}
//       </div>

//       {selectedProject && (
//         <div>
//           <h2>Project: {selectedProject.projectname}</h2>

//           {/* Insights Chart - Monthly Bugs/Tasks Solved */}
//           {insights?.monthly_insights?.length > 0 && (
//             <div style={{ marginBottom: '2rem' }}>
//               <h3>Monthly Bugs & Tasks Solved</h3>
//               <ResponsiveContainer width="100%" height={300}>
//                 <BarChart data={insights.monthly_insights}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="month" />
//                   <YAxis />
//                   <Tooltip />
//                   <Bar dataKey="bugs_solved" fill="#ff7300" name="Bugs Solved" />
//                   <Bar dataKey="tasks_solved" fill="#82ca9d" name="Tasks Solved" />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           )}

//           {/* Current Sprint & Request Update */}
//           <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
//             <h3>Current Sprint</h3>
//             <p>Sprint: {issues[0]?.sprint || 'Not set'}</p>
//             <button 
//               onClick={() => {
//                 const newSprint = prompt('Enter new sprint (e.g., Sprint 6)');
//                 if (newSprint) {
//                   sprintRequestMutation.mutate({ projectId: selectedProject.projectid, newSprint, reason: 'Sprint progress update' });
//                 }
//               }}
//               style={{ padding: '0.5rem 1rem', background: '#1e40af', color: 'white', border: 'none', borderRadius: '6px' }}
//             >
//               Request Sprint Change
//             </button>
//           </div>

//           {/* Issues List with Update Form */}
//           <h3>Issues in This Project</h3>
//           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//             <thead>
//               <tr style={{ background: '#1e40af', color: 'white' }}>
//                 <th style={{ padding: '0.75rem' }}>Issue ID</th>
//                 <th style={{ padding: '0.75rem' }}>Type</th>
//                 <th style={{ padding: '0.75rem' }}>Sprint</th>
//                 <th style={{ padding: '0.75rem' }}>Status</th>
//                 <th style={{ padding: '0.75rem' }}>Assignee Team</th>
//                 <th style={{ padding: '0.75rem' }}>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {issues.map((issue) => (
//                 <tr key={issue.issueid} style={{ borderBottom: '1px solid #e5e7eb' }}>
//                   <td style={{ padding: '0.75rem' }}>{issue.issueid}</td>
//                   <td style={{ padding: '0.75rem' }}>{issue.issuetype}</td>
//                   <td style={{ padding: '0.75rem' }}>{issue.sprint}</td>
//                   <td style={{ padding: '0.75rem' }}>{issue.status}</td>
//                   <td style={{ padding: '0.75rem' }}>{issue.assigneeteam}</td>
//                   <td style={{ padding: '0.75rem' }}>
//                     <button 
//                       onClick={() => setIssueToUpdate(issue)}
//                       style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', marginRight: '0.5rem' }}
//                     >
//                       Update
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           {/* Update Issue Form (modal-like) */}
//           {issueToUpdate && (
//             <div style={{ position: 'fixed', top: '20%', left: '30%', background: 'white', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', borderRadius: '8px', zIndex: 1000 }}>
//               <h3>Update Issue {issueToUpdate.issueid}</h3>
//               <form onSubmit={(e) => {
//                 e.preventDefault();
//                 updateIssueMutation.mutate({ issueId: issueToUpdate.issueid, ...Object.fromEntries(new FormData(e.target)) });
//               }}>
//                 <label>
//                   Sprint:
//                   <input name="sprint" defaultValue={issueToUpdate.sprint} required />
//                 </label><br />
//                 <label>
//                   Status:
//                   <input name="status" defaultValue={issueToUpdate.status} required />
//                 </label><br />
//                 <label>
//                   Description:
//                   <textarea name="description" defaultValue={issueToUpdate.description} />
//                 </label><br />
//                 <button type="submit" style={{ padding: '0.5rem 1rem', background: '#1e40af', color: 'white', border: 'none', borderRadius: '6px' }}>
//                   Save Changes
//                 </button>
//                 <button type="button" onClick={() => setIssueToUpdate(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', marginLeft: '0.5rem' }}>
//                   Cancel
//                 </button>
//               </form>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default MyProjects;