import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createIssue } from '../api/issueApi'; // New API call

const IssueForm = () => {
  const [formData, setFormData] = useState({ projectId: '', sprint: '', issueType: 'Bug', description: '', assigneeTeam: 'DevOps' });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createIssue(formData);
      alert('Issue created!'); // Toast later
      navigate('/issues');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={formData.projectId} onChange={(e) => setFormData({...formData, projectId: e.target.value})} required>
        <option value="">Select Project</option>
        {/* Fetch projects via API and map */}
      </select>
      <input type="text" placeholder="Sprint (e.g., Sprint 5)" value={formData.sprint} onChange={(e) => setFormData({...formData, sprint: e.target.value})} required />
      <select value={formData.issueType} onChange={(e) => setFormData({...formData, issueType: e.target.value})}>
        <option value="Bug">Bug</option>
        <option value="Task">Task</option>
      </select>
      <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
      <select value={formData.assigneeTeam} onChange={(e) => setFormData({...formData, assigneeTeam: e.target.value})}>
        <option value="DevOps">DevOps</option>
        <option value="Frontend">Frontend</option>
        <option value="Backend">Backend</option>
        <option value="QA">QA</option>
      </select>
      <button type="submit">Create Issue</button>
    </form>
  );
};

export default IssueForm;