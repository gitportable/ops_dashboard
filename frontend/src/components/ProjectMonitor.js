import { useEffect, useState } from 'react';
import { getProjectIssues } from '../api/issueApi'; // New API call

const ProjectMonitor = ({ projectId }) => {
  const [projectData, setProjectData] = useState([]);

  useEffect(() => {
    getProjectIssues(projectId).then(setProjectData);
  }, [projectId]);

  return (
    <div>
      <h2>Project {projectId} Monitoring</h2>
      <table>
        <thead>
          <tr>
            <th>Sprint</th>
            <th>Issues Solved</th>
            <th>Team</th>
            <th>Status Changes</th>
          </tr>
        </thead>
        <tbody>
          {projectData.map((issue) => (
            <tr key={issue.issueid}>
              <td>{issue.sprint}</td>
              <td>{issue.status === 'Done' ? 'Solved' : 'Pending'}</td>
              <td>{issue.assigneeteam}</td>
              <td>{issue.closeddate ? 'Updated' : 'New'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectMonitor;