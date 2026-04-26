import React, { useState, useEffect, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthContext } from '../auth/AuthContext';
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import LogIssueModal from '../components/LogIssueModal';
import IssueDetailModal from '../components/IssueDetailModal';

const Workboard = () => {
    const queryClient = useQueryClient();
    const { user } = useContext(AuthContext);
    const currentRole = user?.role?.toLowerCase();
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedDetailIssue, setSelectedDetailIssue] = useState(null);
    
    const { data: issues = [], isLoading } = useQuery({
        queryKey: ['allIssuesBoard'],
        queryFn: async () => {
            const res = await api.get('/issues');
            return res.data;
        }
    });

    const { data: projects = [] } = useQuery({
        queryKey: ['projectList'],
        queryFn: async () => {
            const res = await api.get('/dashboard/project-list');
            return res.data;
        }
    });

    const [search, setSearch] = useState("");
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedPriority, setSelectedPriority] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("");
    const [selectedSprint, setSelectedSprint] = useState("");

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            return await api.put(`/issues/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allIssuesBoard'] });
            toast.success("Task moved successfully");
        },
        onError: () => toast.error("Failed to move task")
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return await api.delete(`/issues/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allIssuesBoard'] });
            toast.success("Task deleted");
        },
        onError: () => toast.error("Failed to delete task")
    });

    if (isLoading) return <div style={{ padding: '2rem' }}>Loading Workboard...</div>;

    const columns = [
        { id: 'Open', label: 'To Do', color: '#64748b' },
        { id: 'In Progress', label: 'In Progress', color: '#3b82f6' },
        { id: 'Inspection', label: 'Testing / Review', color: '#f59e0b', extra: ['Approved'] },
        { id: 'Done', label: 'Done', color: '#16a34a' }
    ];

    const filteredIssues = issues.filter(i => {
        const matchesSearch = !search || 
            (i.issueid?.toString().includes(search) || 
             i.description?.toLowerCase().includes(search.toLowerCase()));
        const matchesProject = !selectedProject || i.projectid === selectedProject;
        const matchesPriority = !selectedPriority || i.priority === selectedPriority;
        const matchesTeam = !selectedTeam || i.assigneeteam === selectedTeam;
        const matchesSprint = !selectedSprint || i.sprint === selectedSprint;
        return matchesSearch && matchesProject && matchesPriority && matchesTeam && matchesSprint;
    });

    const stats = {
        total: filteredIssues.length,
        critical: filteredIssues.filter(i => i.priority === 'Critical').length,
        blocked: filteredIssues.filter(i => i.status === 'Blocked').length,
        inReview: filteredIssues.filter(i => i.status === 'Inspection' || i.status === 'In Review').length
    };

    const sprints = [...new Set(issues.filter(i => i.sprint).map(i => i.sprint))];

    const getIssuesByStatus = (col) => {
        return filteredIssues.filter(i => {
            const status = i.status || 'Open';
            if (status === col.id) return true;
            if (col.extra && col.extra.includes(status)) return true;
            return false;
        });
    };

    return (
        <div style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>Interactive Workboard</h1>
                    <p style={{ margin: '4px 0 0', color: '#64748b' }}>Manage tasks into sprints and move them across custom workflows.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={() => queryClient.invalidateQueries({ queryKey: ['allIssuesBoard'] })}
                        style={{ padding: '10px 20px', borderRadius: 10, background: '#fff', color: '#1e40af', border: '1px solid #1e40af', fontWeight: 600, cursor: 'pointer' }}
                    >
                        🔄 Refresh
                    </button>
                    <button 
                        onClick={() => setIsLogModalOpen(true)}
                        style={{ padding: '10px 20px', borderRadius: 10, background: '#1e40af', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,64,175,0.2)' }}
                    >
                        + New Task / Bug
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '1rem', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search by ID or description..." 
                        style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.9rem' }}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select 
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff', fontSize: '0.9rem', minWidth: '180px' }}
                    value={selectedProject}
                    onChange={e => setSelectedProject(e.target.value)}
                >
                    <option value="">All Projects</option>
                    {projects.map(p => (
                        <option key={p.projectid} value={p.projectid}>{p.name || p.projectid}</option>
                    ))}
                </select>
                <select 
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff', fontSize: '0.9rem', minWidth: '130px' }}
                    value={selectedPriority}
                    onChange={e => setSelectedPriority(e.target.value)}
                >
                    <option value="">All Priorities</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
                <select 
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff', fontSize: '0.9rem', minWidth: '130px' }}
                    value={selectedTeam}
                    onChange={e => setSelectedTeam(e.target.value)}
                >
                    <option value="">All Teams</option>
                    <option value="Frontend">Frontend</option>
                    <option value="Backend">Backend</option>
                    <option value="QA">QA</option>
                    <option value="DevOps">DevOps</option>
                    <option value="Manufacturing">Manufacturing</option>
                </select>
                <select 
                    style={{ padding: '10px', borderRadius: 8, border: '1px solid #e2e8f0', outline: 'none', background: '#fff', fontSize: '0.9rem', minWidth: '130px' }}
                    value={selectedSprint}
                    onChange={e => setSelectedSprint(e.target.value)}
                >
                    <option value="">All Sprints</option>
                    {sprints.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div style={{ padding: '0 10px', borderLeft: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem' }}>
                    Showing <strong>{filteredIssues.length}</strong> issues
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ flex: 1, background: '#fff', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>TOTAL ISSUES</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>{stats.total}</span>
                </div>
                <div style={{ flex: 1, background: '#fff', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>CRITICAL BUGS</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626' }}>{stats.critical}</span>
                </div>
                <div style={{ flex: 1, background: '#fff', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>WAITING INSPECTION</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{stats.inReview}</span>
                </div>
                <div style={{ flex: 1, background: '#fff', padding: '1.25rem', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>PROJECTS ACTIVE</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{selectedProject ? 1 : projects.length}</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, gap: '1.25rem', height: 'calc(100vh - 350px)', minWidth: '1100px' }}>
                {columns.map(col => (
                    <div key={col.id} style={{ background: '#f1f5f9', borderRadius: 16, padding: '1rem', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0 4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col.label}</h3>
                            </div>
                             <span style={{ background: '#fff', padding: '2px 10px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 800, color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                {getIssuesByStatus(col).length}
                            </span>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
                            {getIssuesByStatus(col).map(issue => (
                                <div 
                                    key={issue.issueid} 
                                    style={{ 
                                        background: '#fff', 
                                        padding: '1rem', 
                                        borderRadius: 12, 
                                        marginBottom: '0.75rem', 
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        border: '1px solid #e2e8f0',
                                        cursor: 'pointer',
                                        transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    onClick={() => setSelectedDetailIssue(issue)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8' }}>#{issue.issueid}</span>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            {currentRole === 'superadmin' && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm("Delete this task?")) deleteMutation.mutate(issue.issueid);
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: 0, color: '#94a3b8' }}
                                                    title="Delete Task"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                            <span style={{ 
                                                padding: '2px 8px', 
                                                borderRadius: 6, 
                                                fontSize: '0.65rem', 
                                                fontWeight: 700, 
                                                background: issue.issuetype === 'Bug' ? '#fee2e2' : '#eff6ff',
                                                color: issue.issuetype === 'Bug' ? '#ef4444' : '#3b82f6'
                                            }}>
                                                {issue.issuetype}
                                            </span>
                                        </div>
                                    </div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>
                                        {issue.description?.substring(0, 50) || "No description"}
                                    </h4>
                                    
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <strong>🏗 Proj:</strong> {issue.projectid}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <strong>👤 Asgn:</strong> {issue.assignee || "Unassigned"}
                                        </div>
                                        {(issue.batch_lot || issue.production_stage) && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, padding: '2px 6px', background: '#f8fafc', borderRadius: 4, border: '1px solid #f1f5f9' }}>
                                                <span>📦 {issue.batch_lot || '-'}</span>
                                                <span style={{ color: '#cbd5e1' }}>|</span>
                                                <span>🏭 {issue.production_stage || '-'}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 12 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                             {issue.priority && (
                                                <span style={{ 
                                                    fontSize: '0.65rem', 
                                                    fontWeight: 700, 
                                                    padding: '2px 6px',
                                                    borderRadius: 4,
                                                    background: issue.priority === 'Critical' || issue.priority === 'High' ? '#fee2e2' : '#f1f5f9',
                                                    color: issue.priority === 'Critical' || issue.priority === 'High' ? '#ef4444' : '#64748b',
                                                    width: 'fit-content'
                                                }}>
                                                    {issue.priority}
                                                </span>
                                             )}
                                             {issue.subtasks?.length > 0 && (
                                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                                                    ✅ {issue.subtasks.filter(s => s.done).length}/{issue.subtasks.length} subtasks
                                                </span>
                                             )}
                                         </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {/* Smart Move Buttons */}
                                            {columns.findIndex(c => c.id === col.id) > 0 && (
                                                <button 
                                                    title="Move Back"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const idx = columns.findIndex(c => c.id === col.id);
                                                        updateStatusMutation.mutate({ id: issue.issueid, status: columns[idx-1].id });
                                                    }}
                                                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
                                                >
                                                    ←
                                                </button>
                                            )}
                                            {columns.findIndex(c => c.id === col.id) < columns.length - 1 && (
                                                <button 
                                                    title="Move Forward"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const idx = columns.findIndex(c => c.id === col.id);
                                                        updateStatusMutation.mutate({ id: issue.issueid, status: columns[idx+1].id });
                                                    }}
                                                    style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
                                                >
                                                    →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <LogIssueModal 
                isOpen={isLogModalOpen} 
                onClose={() => setIsLogModalOpen(false)} 
                projectid={selectedProject}
                onRefresh={() => queryClient.invalidateQueries({ queryKey: ['allIssuesBoard'] })}
            />
            <IssueDetailModal 
                isOpen={!!selectedDetailIssue} 
                onClose={() => setSelectedDetailIssue(null)} 
                issue={selectedDetailIssue}
            />
        </div>
    );
};

export default Workboard;
