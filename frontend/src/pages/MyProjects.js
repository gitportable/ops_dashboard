import { useContext, useState, useEffect, useCallback } from "react";
import { AuthContext } from "../auth/AuthContext";
import { getMyProjects } from "../api/projectApi";
import { getProjectIssues } from "../api/issueApi";
import IssueTableDeveloper from "../components/IssueTableDeveloper";
import IssueTableTester from "../components/IssueTableTester";

// ── Resolves project ID regardless of which field name the DB returns ────────
// DB returns: projectid (primary), also aliased as project_id for safety
const pid = (p) =>
  p?.projectid ?? p?.project_id ?? p?.id ?? p?.ProjectID ?? p?.projectId;

// Resolves project name — DB returns projectname, also aliased as name
const pname = (p, id) =>
  p?.projectname ?? p?.name ?? p?.project_name ?? p?.ProjectName ?? (id ? `Project ${id}` : "Project");

const statusStyle = (s = "") => {
  const m = {
    "active":        { dot: "#16a34a", bg: "#dcfce7", color: "#16a34a" },
    "in progress":   { dot: "#1d4ed8", bg: "#dbeafe", color: "#1d4ed8" },
    "completed":     { dot: "#7c3aed", bg: "#f5f3ff", color: "#7c3aed" },
    "on hold":       { dot: "#f59e0b", bg: "#fef9c3", color: "#a16207" },
    "planning":      { dot: "#9ca3af", bg: "#f3f4f6", color: "#6b7280" },
    "blocked":       { dot: "#dc2626", bg: "#fef2f2", color: "#dc2626" },
  };
  return m[s.toLowerCase()] || m["planning"];
};

const MyProjects = () => {
  const { role, user } = useContext(AuthContext) || {};
  const currentRole = (role || user?.role || "").toLowerCase();
  const isDeveloper = currentRole === "developer";

  const [projects, setProjects]               = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [issues, setIssues]                   = useState([]);
  const [view, setView]                       = useState("current");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingIssues, setLoadingIssues]     = useState(false);
  const [projectError, setProjectError]       = useState(null);
  const [issueError, setIssueError]           = useState(null);

  // ── Load projects ─────────────────────────────────────────────────────────
  useEffect(() => {
    setLoadingProjects(true);
    getMyProjects()
      .then((res) => {
        // Axios wraps response in { data: [...] }
        const raw  = res?.data ?? res;
        const list = Array.isArray(raw) ? raw : [];
        console.log("[MyProjects] received", list.length, "projects, first item keys:", list[0] ? Object.keys(list[0]) : "none");
        setProjects(list);
        // Auto-select first project that has a valid ID
        const first = list.find((p) => pid(p) != null);
        if (first) setSelectedProject(first);
      })
      .catch((err) => {
        console.error("[MyProjects] fetch error:", err);
        setProjectError("Failed to load your projects.");
      })
      .finally(() => setLoadingProjects(false));
  }, []);

  // ── Load issues for selected project ─────────────────────────────────────
  const loadIssues = useCallback((project) => {
    const id = pid(project);
    if (id == null) {
      console.warn("[MyProjects] selected project has no ID:", project);
      return;
    }
    setLoadingIssues(true);
    setIssueError(null);
    getProjectIssues(id)
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.data ?? [];
        setIssues(rows);
      })
      .catch((err) => {
        console.error("[MyProjects] issue fetch error:", err);
        setIssueError("Failed to load issues for this project.");
      })
      .finally(() => setLoadingIssues(false));
  }, []);

  useEffect(() => {
    if (selectedProject) loadIssues(selectedProject);
  }, [selectedProject, loadIssues]);

  const currentIssues = issues.filter(
    (i) => !["done", "closed", "verified"].includes((i.status || "").toLowerCase())
  );
  const historyIssues = issues.filter(
    (i) => ["done", "closed", "verified"].includes((i.status || "").toLowerCase())
  );
  const displayIssues = view === "current" ? currentIssues : historyIssues;
  const IssueTable    = isDeveloper ? IssueTableDeveloper : IssueTableTester;

  // ── Loading / Error states ────────────────────────────────────────────────
  if (loadingProjects) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontFamily: "'Inter',sans-serif" }}>
      Loading your projects…
    </div>
  );
  if (projectError) return (
    <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8, margin: "2rem" }}>
      {projectError}
    </div>
  );
  if (!projects.length) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontFamily: "'Inter',sans-serif" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
      <p style={{ fontWeight: 600, fontSize: "1.1rem" }}>No projects assigned yet.</p>
      <p style={{ fontSize: "0.85rem", marginTop: 4, color: "#94a3b8" }}>
        Contact your admin to be added to a project.
      </p>
    </div>
  );

  const selId   = pid(selectedProject);
  const selName = pname(selectedProject, selId);

  return (
    <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter',sans-serif" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>
        My Projects
      </h1>
      <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1.5rem" }}>
        Projects assigned to you — click one to view its issues.
      </p>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* ── Project list sidebar ─────────────────────────────────────────── */}
        <div style={{
          width: 260, flexShrink: 0, background: "#fff",
          borderRadius: 12, border: "1px solid #e5e7eb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", background: "#1e3a8a", color: "#fff",
            fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Assigned Projects ({projects.length})
          </div>

          {projects.map((p) => {
            const id        = pid(p);
            const name      = pname(p, id);
            const sc        = statusStyle(p.status);
            const isSelected = pid(selectedProject) === id;

            return (
              <div
                key={id ?? `proj-${name}`}
                onClick={() => setSelectedProject(p)}
                style={{
                  padding: "12px 16px", cursor: "pointer",
                  borderBottom: "1px solid #f1f5f9",
                  background: isSelected ? "#eff6ff" : "#fff",
                  borderLeft: isSelected ? "3px solid #1e40af" : "3px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>
                  {name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  {/* Status dot */}
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: sc.dot, display: "inline-block", flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600,
                    color: sc.color, background: sc.bg,
                    padding: "1px 7px", borderRadius: 99,
                  }}>
                    {p.status || "Active"}
                  </span>
                  {p.member_role && (
                    <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                      {p.member_role}
                    </span>
                  )}
                </div>
                {p.issuecount != null && (
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3 }}>
                    {p.issuecount} issues
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Issues panel ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedProject ? (
            <>
              {/* Project header */}
              <div style={{
                background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
                padding: "16px 20px", marginBottom: "1rem",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                      {selName}
                    </h2>
                    {selectedProject.description && (
                      <p style={{ fontSize: "0.83rem", color: "#6b7280", marginTop: 4 }}>
                        {selectedProject.description}
                      </p>
                    )}
                  </div>

                  {/* Current / History tabs */}
                  <div style={{ display: "flex", gap: 6 }}>
                    {["current", "history"].map((v) => (
                      <button key={v} onClick={() => setView(v)}
                        style={{
                          padding: "5px 14px", borderRadius: 99, fontSize: "0.8rem", fontWeight: 600,
                          cursor: "pointer", border: "none",
                          background: view === v ? "#1e40af" : "#f1f5f9",
                          color: view === v ? "#fff" : "#475569",
                        }}>
                        {v === "current"
                          ? `Active (${currentIssues.length})`
                          : `History (${historyIssues.length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mini stats */}
                {!loadingIssues && (
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    {[
                      { label: "Total",       val: issues.length },
                      { label: "Open",        val: issues.filter(i => (i.status||"").toLowerCase() === "open").length },
                      { label: "In Progress", val: issues.filter(i => (i.status||"").toLowerCase() === "in progress").length },
                      { label: "Done",        val: issues.filter(i => (i.status||"").toLowerCase() === "done").length },
                    ].map(s => (
                      <div key={s.label} style={{
                        padding: "5px 12px", background: "#f8fafc", borderRadius: 8,
                        fontSize: "0.78rem", color: "#475569", border: "1px solid #e5e7eb",
                      }}>
                        <span style={{ fontWeight: 700 }}>{s.val}</span> {s.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Issues table */}
              {loadingIssues && (
                <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading issues…</div>
              )}
              {issueError && (
                <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>
                  {issueError}
                </div>
              )}
              {!loadingIssues && !issueError && (
                displayIssues.length > 0 ? (
                <IssueTable
                  issues={displayIssues}
                  onRefresh={() => loadIssues(selectedProject)}
                  projectid={pid(selectedProject)}
                />
                ) : (
                  <div style={{
                    padding: "2.5rem", textAlign: "center", color: "#6b7280",
                    background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
                  }}>
                    {view === "current" ? "No active issues in this project." : "No completed issues yet."}
                  </div>
                )
              )}
            </>
          ) : (
            <div style={{
              padding: "3rem", textAlign: "center", color: "#9ca3af",
              background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
            }}>
              Select a project to view its issues.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyProjects;





// import { useContext, useState, useEffect } from "react";
// import { AuthContext } from "../auth/AuthContext";
// import { getMyProjects } from "../api/projectApi";
// import { getProjectIssues } from "../api/issueApi";
// import IssueTableDeveloper from "../components/IssueTableDeveloper";
// import IssueTableTester from "../components/IssueTableTester";

// const statusColor = (s) => {
//   const map = {
//     active:     { bg: "#dcfce7", color: "#16a34a" },
//     completed:  { bg: "#eff6ff", color: "#1d4ed8" },
//     "on hold":  { bg: "#fff7ed", color: "#c2410c" },
//     planning:   { bg: "#f5f3ff", color: "#7c3aed" },
//   };
//   return map[(s || "").toLowerCase()] || { bg: "#f3f4f6", color: "#374151" };
// };

// const MyProjects = () => {
//   const { role, user } = useContext(AuthContext) || {};
//   const currentRole = (role || user?.role || "").toLowerCase();
//   const isDeveloper = currentRole === "developer";

//   const [projects, setProjects] = useState([]);
//   const [selectedProject, setSelectedProject] = useState(null);
//   const [issues, setIssues] = useState([]);
//   const [view, setView] = useState("current"); // "current" | "history"
//   const [loadingProjects, setLoadingProjects] = useState(true);
//   const [loadingIssues, setLoadingIssues] = useState(false);
//   const [projectError, setProjectError] = useState(null);
//   const [issueError, setIssueError] = useState(null);

//   // Load assigned projects
//   useEffect(() => {
//     setLoadingProjects(true);
//     getMyProjects()
//       .then((data) => {
//         const list = Array.isArray(data) ? data : data?.data || [];
//         setProjects(list);
//         if (list.length > 0) setSelectedProject(list[0]);
//       })
//       .catch(() => setProjectError("Failed to load your projects."))
//       .finally(() => setLoadingProjects(false));
//   }, []);

//   // Load issues for selected project
//   useEffect(() => {
//     if (!selectedProject) return;
//     setLoadingIssues(true);
//     setIssueError(null);
//     getProjectIssues(selectedProject.project_id)
//       .then((data) => setIssues(Array.isArray(data) ? data : []))
//       .catch(() => setIssueError("Failed to load issues for this project."))
//       .finally(() => setLoadingIssues(false));
//   }, [selectedProject]);

//   // "Current" = active/in-progress issues; "History" = done/closed
//   const currentIssues = issues.filter(
//     (i) => !["done", "closed", "verified"].includes((i.status || "").toLowerCase())
//   );
//   const historyIssues = issues.filter(
//     (i) => ["done", "closed", "verified"].includes((i.status || "").toLowerCase())
//   );
//   const displayIssues = view === "current" ? currentIssues : historyIssues;

//   const IssueTable = isDeveloper ? IssueTableDeveloper : IssueTableTester;

//   if (loadingProjects) return (
//     <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280" }}>Loading projects…</div>
//   );

//   if (projectError) return (
//     <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8, margin: "2rem" }}>
//       {projectError}
//     </div>
//   );

//   if (!projects.length) return (
//     <div style={{ padding: "3rem", textAlign: "center", color: "#6b7280", fontFamily: "'Inter',sans-serif" }}>
//       <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
//       <p style={{ fontWeight: 600 }}>No projects assigned yet.</p>
//       <p style={{ fontSize: "0.85rem", marginTop: 4 }}>Contact your admin to be added to a project.</p>
//     </div>
//   );

//   return (
//     <div style={{ padding: "1.5rem 2rem", fontFamily: "'Inter',sans-serif" }}>
//       <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1e293b", marginBottom: 4 }}>My Projects</h1>
//       <p style={{ fontSize: "0.85rem", color: "#6b7280", marginBottom: "1.5rem" }}>
//         Projects assigned to you — click a project to view its issues.
//       </p>

//       <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
//         {/* Project list panel */}
//         <div style={{
//           width: 260, flexShrink: 0, background: "#fff",
//           borderRadius: 12, border: "1px solid #e5e7eb",
//           boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden",
//         }}>
//           <div style={{
//             padding: "12px 16px", background: "#1e3a8a",
//             color: "#fff", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase",
//             letterSpacing: "0.05em",
//           }}>
//             Assigned Projects ({projects.length})
//           </div>
//           {projects.map((p) => {
//             const sc = statusColor(p.status);
//             const isSelected = selectedProject?.project_id === p.project_id;
//             return (
//               <div
//                 key={p.project_id}
//                 onClick={() => setSelectedProject(p)}
//                 style={{
//                   padding: "12px 16px", cursor: "pointer",
//                   borderBottom: "1px solid #f1f5f9",
//                   background: isSelected ? "#eff6ff" : "#fff",
//                   borderLeft: isSelected ? "3px solid #1e40af" : "3px solid transparent",
//                   transition: "all 0.15s",
//                 }}
//               >
//                 <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>
//                   {p.name || p.project_name || `Project ${p.project_id}`}
//                 </div>
//                 <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
//                   <span style={{
//                     padding: "1px 7px", borderRadius: 99, fontSize: "0.68rem", fontWeight: 700,
//                     background: sc.bg, color: sc.color,
//                   }}>
//                     {p.status || "Active"}
//                   </span>
//                   <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>
//                     #{p.project_id}
//                   </span>
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         {/* Issues panel */}
//         <div style={{ flex: 1, minWidth: 0 }}>
//           {selectedProject && (
//             <>
//               {/* Project header */}
//               <div style={{
//                 background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
//                 padding: "16px 20px", marginBottom: "1rem",
//                 boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
//               }}>
//                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
//                   <div>
//                     <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
//                       {selectedProject.name || selectedProject.project_name || `Project ${selectedProject.project_id}`}
//                     </h2>
//                     {selectedProject.description && (
//                       <p style={{ fontSize: "0.83rem", color: "#6b7280", marginTop: 4 }}>
//                         {selectedProject.description}
//                       </p>
//                     )}
//                   </div>
//                   <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
//                     {/* Current / History tabs */}
//                     {["current", "history"].map((v) => (
//                       <button
//                         key={v}
//                         onClick={() => setView(v)}
//                         style={{
//                           padding: "5px 14px", borderRadius: 99, fontSize: "0.8rem", fontWeight: 600,
//                           cursor: "pointer", border: "none",
//                           background: view === v ? "#1e40af" : "#f1f5f9",
//                           color: view === v ? "#fff" : "#475569",
//                         }}
//                       >
//                         {v === "current"
//                           ? `Active (${currentIssues.length})`
//                           : `History (${historyIssues.length})`}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Mini stats */}
//                 {!loadingIssues && (
//                   <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
//                     {[
//                       { label: "Total Issues", val: issues.length },
//                       { label: "Open", val: issues.filter((i) => (i.status || "").toLowerCase() === "open").length },
//                       { label: "In Progress", val: issues.filter((i) => (i.status || "").toLowerCase() === "in progress").length },
//                       { label: "Done", val: issues.filter((i) => (i.status || "").toLowerCase() === "done").length },
//                     ].map((s) => (
//                       <div key={s.label} style={{
//                         padding: "5px 12px", background: "#f8fafc", borderRadius: 8,
//                         fontSize: "0.78rem", color: "#475569", border: "1px solid #e5e7eb",
//                       }}>
//                         <span style={{ fontWeight: 700 }}>{s.val}</span> {s.label}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {/* Issues table */}
//               {loadingIssues && (
//                 <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading issues…</div>
//               )}
//               {issueError && (
//                 <div style={{ padding: "1rem", background: "#fee2e2", color: "#991b1b", borderRadius: 8 }}>
//                   {issueError}
//                 </div>
//               )}
//               {!loadingIssues && !issueError && (
//                 displayIssues.length > 0 ? (
//                   <IssueTable
//                     issues={displayIssues}
//                     onRefresh={() => {
//                       getProjectIssues(selectedProject.project_id)
//                         .then((data) => setIssues(Array.isArray(data) ? data : []));
//                     }}
//                   />
//                 ) : (
//                   <div style={{
//                     padding: "2.5rem", textAlign: "center", color: "#6b7280",
//                     background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
//                   }}>
//                     {view === "current"
//                       ? "No active issues in this project."
//                       : "No completed issues yet."}
//                   </div>
//                 )
//               )}
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default MyProjects;



// import React, { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import { Link } from 'react-router-dom';
// import axios from '../api/axios';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// const fetchMyProjects = async () => axios.get('/projects/my-projects').then(res => res.data);
// const fetchProjectIssues = async (projectId) => axios.get(`/issues?project=${projectId}`).then(res => res.data);
// const fetchProjectInsights = async (projectId) => axios.get(`/projects/${projectId}/insights`).then(res => res.data);
// const updateIssue = async (issueId, data) => axios.put(`/issues/${issueId}`, data).then(res => res.data);
// const submitSprintRequest = async (projectId, data) => axios.post(`/projects/${projectId}/sprint-request`, data).then(res => res.data);

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
//     onSuccess: () => alert('Sprint change requested - awaiting admin approval')
//   });

//   if (isLoading) return <div style={{ padding: '2rem', marginLeft: '260px' }}>Loading projects...</div>;

//   if (projects.length === 0) return <div style={{ padding: '2rem', marginLeft: '260px' }}>No projects assigned. Contact admin.</div>;

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

//           {/* Monthly Insights Graph */}
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

//           {/* Sprint Request */}
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

//           {/* Issues Table with Update */}
//           <h3>Issues in This Project</h3>
//           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
//             <thead>
//               <tr style={{ background: '#1e40af', color: 'white' }}>
//                 <th style={{ padding: '0.75rem' }}>ID</th>
//                 <th style={{ padding: '0.75rem' }}>Type</th>
//                 <th style={{ padding: '0.75rem' }}>Sprint</th>
//                 <th style={{ padding: '0.75rem' }}>Status</th>
//                 <th style={{ padding: '0.75rem' }}>Team</th>
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
//                       style={{ padding: '0.25rem 0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px' }}
//                     >
//                       Update
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>

//           {/* Update Form */}
//           {issueToUpdate && (
//             <div style={{ position: 'fixed', top: '20%', left: '30%', background: 'white', padding: '2rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', borderRadius: '8px', zIndex: 1000 }}>
//               <h3>Update Issue {issueToUpdate.issueid}</h3>
//               <form onSubmit={(e) => {
//                 e.preventDefault();
//                 const formData = new FormData(e.target);
//                 updateIssueMutation.mutate({ 
//                   issueId: issueToUpdate.issueid, 
//                   sprint: formData.get('sprint'), 
//                   status: formData.get('status'), 
//                   description: formData.get('description') 
//                 });
//               }}>
//                 <label>Sprint: <input name="sprint" defaultValue={issueToUpdate.sprint} required /></label><br />
//                 <label>Status: <input name="status" defaultValue={issueToUpdate.status} required /></label><br />
//                 <label>Description: <textarea name="description" defaultValue={issueToUpdate.description} /></label><br />
//                 <button type="submit" style={{ padding: '0.5rem 1rem', background: '#1e40af', color: 'white', border: 'none', borderRadius: '6px' }}>Save</button>
//                 <button type="button" onClick={() => setIssueToUpdate(null)} style={{ padding: '0.5rem 1rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', marginLeft: '0.5rem' }}>Cancel</button>
//               </form>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default MyProjects;




















// import React, { useState } from 'react';
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// import axios from '../api/axios';
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
//   ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
// } from 'recharts';

// /* ── API helpers ── */
// const fetchMyProjects    = () => axios.get('/projects/my-projects').then(r => r.data);
// const fetchProjectIssues = id  => axios.get(`/issues?project=${id}`).then(r => r.data);
// const fetchInsights      = id  => axios.get(`/projects/${id}/insights`).then(r => r.data);
// const updateIssue        = ({ issueId, ...data }) => axios.put(`/issues/${issueId}`, data).then(r => r.data);
// const submitSprintReq    = ({ projectId, ...data }) => axios.post(`/projects/${projectId}/sprint-request`, data).then(r => r.data);
// const addNote            = ({ projectId, note }) => axios.post(`/projects/${projectId}/notes`, { note }).then(r => r.data);
// const logHours           = ({ issueId, hours }) => axios.post(`/issues/${issueId}/hours`, { hours }).then(r => r.data);

// const COLORS = ['#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6'];

// /* ── Tooltip ── */
// const Tip = ({ active, payload, label }) => {
//   if (!active || !payload?.length) return null;
//   return (
//     <div style={{ background:'#1e293b', color:'#f8fafc', padding:'9px 13px', borderRadius:8, fontSize:12 }}>
//       {label && <p style={{ margin:'0 0 4px', fontWeight:700 }}>{label}</p>}
//       {payload.map((p,i) => <p key={i} style={{ margin:'2px 0', color:p.color }}>{p.name}: <b>{p.value}</b></p>)}
//     </div>
//   );
// };

// /* ── Status badge ── */
// const SBadge = ({ s }) => {
//   const map = {
//     'Done':        { bg:'#dcfce7', c:'#16a34a', label:'✓ Done' },
//     'In Progress': { bg:'#dbeafe', c:'#1d4ed8', label:'⚡ In Progress' },
//     'Open':        { bg:'#f3f4f6', c:'#374151', label:'○ Open' },
//     'Bug':         { bg:'#fef2f2', c:'#dc2626', label:'🐛 Bug' },
//   };
//   const d = map[s] || map['Open'];
//   return <span style={{ padding:'2px 8px', borderRadius:99, fontSize:'.7rem', fontWeight:700, background:d.bg, color:d.c, whiteSpace:'nowrap' }}>{d.label}</span>;
// };

// /* ── Progress bar ── */
// const ProgBar = ({ pct, color='#3b82f6', h=8 }) => (
//   <div style={{ height:h, background:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
//     <div style={{ height:'100%', width:`${Math.min(pct,100)}%`, background:color, borderRadius:99, transition:'width .5s' }} />
//   </div>
// );

// /* ── Section heading ── */
// const SHead = ({ icon, title, sub }) => (
//   <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:'1rem' }}>
//     <span style={{ fontSize:'1.1rem' }}>{icon}</span>
//     <div>
//       <h3 style={{ margin:0, fontSize:'.92rem', fontWeight:700, color:'#0f172a' }}>{title}</h3>
//       {sub && <p style={{ margin:0, fontSize:'.73rem', color:'#9ca3af' }}>{sub}</p>}
//     </div>
//   </div>
// );

// /* ── Panel card ── */
// const Panel = ({ children, accent='#3b82f6', style={} }) => (
//   <div style={{ background:'#fff', borderRadius:14, padding:'1.25rem 1.35rem',
//     border:'1px solid #e5e7eb', boxShadow:'0 2px 10px rgba(0,0,0,.06)',
//     borderTop:`3px solid ${accent}`, ...style }}>
//     {children}
//   </div>
// );

// /* ═══════════════ MAIN ═══════════════ */
// const MyProjects = () => {
//   const [selProject,    setSelProject]    = useState(null);
//   const [issueModal,    setIssueModal]    = useState(null);
//   const [sprintModal,   setSprintModal]   = useState(false);
//   const [noteModal,     setNoteModal]     = useState(false);
//   const [hoursModal,    setHoursModal]    = useState(null);
//   const [newSprint,     setNewSprint]     = useState('');
//   const [sprintReason,  setSprintReason]  = useState('');
//   const [noteText,      setNoteText]      = useState('');
//   const [hoursVal,      setHoursVal]      = useState('');
//   const [issueStatus,   setIssueStatus]   = useState('');
//   const [issueDesc,     setIssueDesc]     = useState('');
//   const [prLink,        setPrLink]        = useState('');
//   const [toast,         setToast]         = useState(null);
//   const [activeTab,     setActiveTab]     = useState('overview'); // overview | issues | notes | log

//   const qc = useQueryClient();

//   const { data: projects = [], isLoading } = useQuery({ queryKey:['myProjects'], queryFn:fetchMyProjects });

//   const { data: issues = [] } = useQuery({
//     queryKey: ['pIssues', selProject?.projectid],
//     queryFn: () => fetchProjectIssues(selProject.projectid),
//     enabled: !!selProject,
//   });

//   const { data: insights } = useQuery({
//     queryKey: ['pInsights', selProject?.projectid],
//     queryFn: () => fetchInsights(selProject.projectid),
//     enabled: !!selProject,
//   });

//   const showToast = (msg, type='success') => { setToast({msg,type}); setTimeout(()=>setToast(null),3200); };

//   const updateIssueMut = useMutation({ mutationFn:updateIssue,
//     onSuccess:()=>{ qc.invalidateQueries(['pIssues']); setIssueModal(null); showToast('Issue updated!'); },
//     onError:()=>showToast('Update failed — check API connection','error') });

//   const sprintMut = useMutation({ mutationFn:submitSprintReq,
//     onSuccess:()=>{ setSprintModal(false); showToast('Sprint change requested — awaiting admin approval'); },
//     onError:()=>showToast('Sprint request failed','error') });

//   const noteMut = useMutation({ mutationFn:addNote,
//     onSuccess:()=>{ setNoteModal(false); setNoteText(''); showToast('Note saved!'); },
//     onError:()=>showToast('Could not save note','error') });

//   const hoursMut = useMutation({ mutationFn:logHours,
//     onSuccess:()=>{ setHoursModal(null); setHoursVal(''); showToast(`Hours logged!`); },
//     onError:()=>showToast('Hours log failed','error') });

//   /* ── derived stats ── */
//   const bugs    = issues.filter(i=>(i.issuetype||'').toLowerCase()==='bug');
//   const tasks   = issues.filter(i=>(i.issuetype||'').toLowerCase()!=='bug');
//   const done    = issues.filter(i=>(i.status||'').toLowerCase()==='done');
//   const open    = issues.filter(i=>(i.status||'').toLowerCase()!=='done');
//   const donePct = issues.length>0 ? Math.round(done.length/issues.length*100) : 0;
//   const bugPct  = issues.length>0 ? Math.round(bugs.length/issues.length*100) : 0;

//   /* ── chart data ── */
//   const typeChart   = [{ name:'Bugs', value:bugs.length },{ name:'Tasks', value:tasks.length }];
//   const statusChart = [{ name:'Done', value:done.length },{ name:'Open', value:open.length }];
//   const sprintChart = [...new Set(issues.map(i=>i.sprint))].sort().map(sp=>({
//     sprint:sp,
//     bugs:  issues.filter(i=>i.sprint===sp && (i.issuetype||'').toLowerCase()==='bug').length,
//     tasks: issues.filter(i=>i.sprint===sp && (i.issuetype||'').toLowerCase()!=='bug').length,
//     done:  issues.filter(i=>i.sprint===sp && (i.status||'').toLowerCase()==='done').length,
//   }));

//   const budgetPct = selProject
//     ? Math.round(((selProject.budget_used||selProject.budgetused||0) / (selProject.budget_allocated||selProject.budgetallocated||1))*100)
//     : 0;

//   if (isLoading) return (
//     <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:10 }}>
//       <div style={{ width:28, height:28, border:'3px solid #e5e7eb', borderTopColor:'#3b82f6', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
//       <span style={{ color:'#64748b' }}>Loading your projects…</span>
//       <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
//     </div>
//   );

//   if (projects.length===0) return (
//     <div style={{ textAlign:'center', padding:'4rem', color:'#64748b' }}>
//       <div style={{ fontSize:'3rem', marginBottom:12 }}>📂</div>
//       <h2 style={{ color:'#374151' }}>No Projects Assigned</h2>
//       <p>Contact your admin to get added to a project.</p>
//     </div>
//   );

//   return (
//     <div style={{ padding:'2rem', background:'#f8fafc', minHeight:'100vh', fontFamily:"'Inter',system-ui,sans-serif" }}>

//       {/* Toast */}
//       {toast && (
//         <div style={{ position:'fixed', top:20, right:20, zIndex:9999, padding:'11px 18px', borderRadius:10, fontWeight:600, fontSize:'.86rem',
//           background:toast.type==='success'?'#1d4ed8':'#dc2626', color:'#fff', boxShadow:'0 8px 24px rgba(0,0,0,.2)',
//           animation:'slideIn .3s ease' }}>
//           {toast.type==='success'?'✅':'❌'} {toast.msg}
//         </div>
//       )}

//       {/* Page header */}
//       <div style={{ marginBottom:'1.75rem' }}>
//         <h1 style={{ margin:0, fontSize:'1.5rem', fontWeight:800, color:'#0f172a' }}>📁 My Assigned Projects</h1>
//         <p style={{ margin:'4px 0 0', color:'#64748b', fontSize:'.85rem' }}>
//           {projects.length} project{projects.length!==1?'s':''} assigned to you
//         </p>
//       </div>

//       {/* Project cards row */}
//       <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:'1rem', marginBottom:'2rem' }}>
//         {projects.map(p => {
//           const bUsed  = p.budget_used  || p.budgetused  || 0;
//           const bAlloc = p.budget_allocated || p.budgetallocated || 1;
//           const bPct   = Math.round((bUsed/bAlloc)*100);
//           const isSelected = selProject?.projectid===p.projectid;
//           return (
//             <div key={p.projectid} onClick={()=>{ setSelProject(p); setActiveTab('overview'); }}
//               style={{ cursor:'pointer', background:isSelected?'#eff6ff':'#fff', borderRadius:14, padding:'1.1rem 1.2rem',
//                 boxShadow:isSelected?'0 0 0 2px #3b82f6, 0 4px 16px rgba(59,130,246,.18)':'0 2px 8px rgba(0,0,0,.07)',
//                 border:isSelected?'1px solid #3b82f6':'1px solid #e5e7eb', transition:'all .15s' }}>

//               {/* status dot + name */}
//               <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
//                 <h3 style={{ margin:0, fontSize:'.9rem', fontWeight:700, color:'#0f172a' }}>{p.projectname || p.project_name}</h3>
//                 <span style={{ width:8, height:8, borderRadius:'50%', background:p.status==='Active'?'#10b981':p.status==='Blocked'?'#ef4444':'#3b82f6', flexShrink:0, marginTop:4 }} />
//               </div>

//               <div style={{ fontSize:'.75rem', color:'#64748b', marginBottom:10 }}>
//                 <span style={{ padding:'2px 7px', borderRadius:99, fontWeight:700,
//                   background:p.status==='Active'?'#f0fdf4':p.status==='Blocked'?'#fef2f2':'#eff6ff',
//                   color:p.status==='Active'?'#16a34a':p.status==='Blocked'?'#dc2626':'#2563eb' }}>
//                   {p.status}
//                 </span>
//               </div>

//               {/* budget bar */}
//               <div style={{ marginBottom:6 }}>
//                 <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.7rem', color:'#9ca3af', marginBottom:3 }}>
//                   <span>Budget used</span><span style={{ fontWeight:700, color:bPct>80?'#ef4444':'#374151' }}>{bPct}%</span>
//                 </div>
//                 <ProgBar pct={bPct} color={bPct>80?'#ef4444':bPct>60?'#f59e0b':'#3b82f6'} h={5} />
//               </div>

//               <div style={{ fontSize:'.7rem', color:'#9ca3af' }}>
//                 ${(bUsed/1000).toFixed(1)}k / ${(bAlloc/1000).toFixed(1)}k allocated
//               </div>
//             </div>
//           );
//         })}
//       </div>

//       {/* ══ Project Detail ══ */}
//       {selProject && (
//         <div>
//           {/* Header bar */}
//           <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:10 }}>
//             <div style={{ display:'flex', alignItems:'center', gap:12 }}>
//               <h2 style={{ margin:0, fontSize:'1.25rem', fontWeight:800, color:'#0f172a' }}>
//                 {selProject.projectname || selProject.project_name}
//               </h2>
//               <span style={{ padding:'3px 10px', borderRadius:99, fontSize:'.72rem', fontWeight:700,
//                 background:selProject.status==='Active'?'#f0fdf4':selProject.status==='Blocked'?'#fef2f2':'#eff6ff',
//                 color:selProject.status==='Active'?'#16a34a':selProject.status==='Blocked'?'#dc2626':'#2563eb' }}>
//                 {selProject.status}
//               </span>
//             </div>

//             {/* Action buttons */}
//             <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
//               <button onClick={()=>setSprintModal(true)}
//                 style={{ padding:'7px 14px', fontSize:'.78rem', fontWeight:700, borderRadius:8, border:'none', cursor:'pointer', background:'#1d4ed8', color:'#fff' }}>
//                 🏃 Request Sprint Change
//               </button>
//               <button onClick={()=>setNoteModal(true)}
//                 style={{ padding:'7px 14px', fontSize:'.78rem', fontWeight:700, borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', background:'#fff', color:'#374151' }}>
//                 📝 Add Note
//               </button>
//             </div>
//           </div>

//           {/* Tabs */}
//           <div style={{ display:'flex', gap:4, marginBottom:'1.5rem', borderBottom:'2px solid #e5e7eb' }}>
//             {[
//               { id:'overview', label:'📊 Overview' },
//               { id:'issues',   label:`🐛 Issues (${issues.length})` },
//               { id:'notes',    label:'📝 Notes & Log' },
//             ].map(tab => (
//               <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
//                 style={{ padding:'9px 18px', fontSize:'.82rem', fontWeight:600, border:'none', cursor:'pointer', background:'transparent',
//                   color:activeTab===tab.id?'#2563eb':'#64748b',
//                   borderBottom:activeTab===tab.id?'2px solid #2563eb':'2px solid transparent',
//                   marginBottom:-2 }}>
//                 {tab.label}
//               </button>
//             ))}
//           </div>

//           {/* ── TAB: Overview ── */}
//           {activeTab==='overview' && (
//             <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1.2rem' }}>

//               {/* Project stats */}
//               <Panel accent="#3b82f6">
//                 <SHead icon="📋" title="Project Summary" />
//                 <div style={{ display:'flex', gap:'.8rem', marginBottom:'1rem', flexWrap:'wrap' }}>
//                   {[
//                     { l:'Total Issues', v:issues.length,  c:'#374151' },
//                     { l:'Done',         v:done.length,     c:'#16a34a' },
//                     { l:'Open',         v:open.length,     c:'#f59e0b' },
//                     { l:'Bugs',         v:bugs.length,     c:'#ef4444' },
//                   ].map(k=>(
//                     <div key={k.l} style={{ flex:1, minWidth:60, textAlign:'center', padding:'.6rem .4rem', background:'#f8fafc', borderRadius:8 }}>
//                       <div style={{ fontSize:'1.3rem', fontWeight:800, color:k.c }}>{k.v}</div>
//                       <div style={{ fontSize:'.65rem', color:'#9ca3af', fontWeight:600, marginTop:2 }}>{k.l}</div>
//                     </div>
//                   ))}
//                 </div>
//                 <div style={{ marginBottom:8 }}>
//                   <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.76rem', color:'#374151', marginBottom:4 }}>
//                     <span style={{ fontWeight:600 }}>Sprint Completion</span>
//                     <b style={{ color:'#2563eb' }}>{donePct}%</b>
//                   </div>
//                   <ProgBar pct={donePct} color="#2563eb" />
//                 </div>
//                 <div>
//                   <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.76rem', color:'#374151', marginBottom:4 }}>
//                     <span style={{ fontWeight:600 }}>Budget Used</span>
//                     <b style={{ color:budgetPct>80?'#ef4444':'#374151' }}>{budgetPct}%</b>
//                   </div>
//                   <ProgBar pct={budgetPct} color={budgetPct>80?'#ef4444':budgetPct>60?'#f59e0b':'#10b981'} />
//                 </div>
//               </Panel>

//               {/* Bug vs Task donut */}
//               <Panel accent="#ef4444">
//                 <SHead icon="🔍" title="Issue Breakdown" sub="Bug vs Task ratio" />
//                 <ResponsiveContainer width="100%" height={160}>
//                   <PieChart>
//                     <Pie data={typeChart} dataKey="value" innerRadius={45} outerRadius={68} paddingAngle={5} cx="50%" cy="50%">
//                       {typeChart.map((_,i)=><Cell key={i} fill={i===0?'#ef4444':'#3b82f6'}/>)}
//                     </Pie>
//                     <Tooltip content={<Tip/>} />
//                   </PieChart>
//                 </ResponsiveContainer>
//                 <div style={{ display:'flex', justifyContent:'center', gap:'1.5rem', marginTop:4 }}>
//                   {typeChart.map((d,i)=>(
//                     <div key={i} style={{ textAlign:'center' }}>
//                       <div style={{ fontWeight:800, color:i===0?'#ef4444':'#3b82f6', fontSize:'1.2rem' }}>{d.value}</div>
//                       <div style={{ fontSize:'.7rem', color:'#9ca3af' }}>{d.name}</div>
//                     </div>
//                   ))}
//                 </div>
//               </Panel>

//               {/* Done vs Open */}
//               <Panel accent="#10b981">
//                 <SHead icon="✅" title="Resolution Status" sub="Done vs remaining" />
//                 <ResponsiveContainer width="100%" height={160}>
//                   <PieChart>
//                     <Pie data={statusChart} dataKey="value" innerRadius={45} outerRadius={68} paddingAngle={5} cx="50%" cy="50%">
//                       {statusChart.map((_,i)=><Cell key={i} fill={i===0?'#10b981':'#f59e0b'}/>)}
//                     </Pie>
//                     <Tooltip content={<Tip/>} />
//                   </PieChart>
//                 </ResponsiveContainer>
//                 <div style={{ display:'flex', justifyContent:'center', gap:'1.5rem', marginTop:4 }}>
//                   {statusChart.map((d,i)=>(
//                     <div key={i} style={{ textAlign:'center' }}>
//                       <div style={{ fontWeight:800, color:i===0?'#10b981':'#f59e0b', fontSize:'1.2rem' }}>{d.value}</div>
//                       <div style={{ fontSize:'.7rem', color:'#9ca3af' }}>{d.name}</div>
//                     </div>
//                   ))}
//                 </div>
//               </Panel>

//               {/* Sprint issues chart — spans 2 */}
//               {sprintChart.length>0 && (
//                 <Panel accent="#f59e0b" style={{ gridColumn:'span 2' }}>
//                   <SHead icon="🏃" title="Issues by Sprint" sub="Bugs, Tasks and resolved items per sprint" />
//                   <ResponsiveContainer width="100%" height={200}>
//                     <BarChart data={sprintChart} barSize={18}>
//                       <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
//                       <XAxis dataKey="sprint" tick={{fontSize:10}} tickFormatter={v=>v.replace('Sprint ','')} />
//                       <YAxis tick={{fontSize:10}} />
//                       <Tooltip content={<Tip/>} />
//                       <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
//                       <Bar dataKey="bugs"  name="Bugs"  stackId="a" fill="#ef4444" />
//                       <Bar dataKey="tasks" name="Tasks" stackId="a" fill="#3b82f6" radius={[4,4,0,0]} />
//                       <Bar dataKey="done"  name="Done"  fill="#10b981" radius={[4,4,0,0]} />
//                     </BarChart>
//                   </ResponsiveContainer>
//                 </Panel>
//               )}

//               {/* Current sprint info */}
//               <Panel accent="#8b5cf6">
//                 <SHead icon="📅" title="Sprint & Timeline" />
//                 <div style={{ fontSize:'.82rem', color:'#374151', marginBottom:10 }}>
//                   <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
//                     <span style={{ color:'#9ca3af' }}>Current Sprint</span>
//                     <b>{issues[0]?.sprint || 'Not set'}</b>
//                   </div>
//                   <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, padding:'6px 0', borderBottom:'1px solid #f1f5f9' }}>
//                     <span style={{ color:'#9ca3af' }}>Start Date</span>
//                     <b>{selProject.startdate || '—'}</b>
//                   </div>
//                   <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0' }}>
//                     <span style={{ color:'#9ca3af' }}>End Date</span>
//                     <b>{selProject.enddate || '—'}</b>
//                   </div>
//                 </div>
//                 <button onClick={()=>setSprintModal(true)}
//                   style={{ width:'100%', padding:'8px', fontSize:'.78rem', fontWeight:700, borderRadius:8, border:'1px solid #8b5cf6',
//                     cursor:'pointer', background:'#faf5ff', color:'#7c3aed' }}>
//                   🏃 Request Sprint Change
//                 </button>
//               </Panel>

//               {/* Insights from API */}
//               {insights?.monthly_insights?.length>0 && (
//                 <Panel accent="#06b6d4" style={{ gridColumn:'span 3' }}>
//                   <SHead icon="📈" title="Monthly Bugs & Tasks Resolved" sub="From project insights API" />
//                   <ResponsiveContainer width="100%" height={200}>
//                     <AreaChart data={insights.monthly_insights}>
//                       <defs>
//                         <linearGradient id="ig1" x1="0" y1="0" x2="0" y2="1">
//                           <stop offset="5%"  stopColor="#ef4444" stopOpacity={.25}/>
//                           <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
//                         </linearGradient>
//                         <linearGradient id="ig2" x1="0" y1="0" x2="0" y2="1">
//                           <stop offset="5%"  stopColor="#10b981" stopOpacity={.25}/>
//                           <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
//                         </linearGradient>
//                       </defs>
//                       <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
//                       <XAxis dataKey="month" tick={{fontSize:11}} />
//                       <YAxis tick={{fontSize:10}} />
//                       <Tooltip content={<Tip/>} />
//                       <Legend iconSize={8} wrapperStyle={{fontSize:10}} />
//                       <Area type="monotone" dataKey="bugs_solved"  name="Bugs Solved"  stroke="#ef4444" fill="url(#ig1)" strokeWidth={2.5} />
//                       <Area type="monotone" dataKey="tasks_solved" name="Tasks Solved" stroke="#10b981" fill="url(#ig2)" strokeWidth={2.5} />
//                     </AreaChart>
//                   </ResponsiveContainer>
//                 </Panel>
//               )}
//             </div>
//           )}

//           {/* ── TAB: Issues ── */}
//           {activeTab==='issues' && (
//             <Panel accent="#3b82f6">
//               <SHead icon="🐛" title="Issues in This Project" sub="Click Update to change status or log a PR link" />

//               {issues.length===0 ? (
//                 <div style={{ textAlign:'center', padding:'3rem', color:'#9ca3af' }}>
//                   <div style={{ fontSize:'2rem', marginBottom:8 }}>🎉</div>
//                   <p style={{ margin:0 }}>No issues found for this project.</p>
//                 </div>
//               ) : (
//                 <div style={{ overflowX:'auto' }}>
//                   <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
//                     <thead>
//                       <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e5e7eb' }}>
//                         {['ID','Type','Sprint','Status','Team','Actions'].map(h=>(
//                           <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:'.73rem', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'.04em' }}>{h}</th>
//                         ))}
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {issues.map(issue=>{
//                         const id = issue.issueid || issue.issue_id;
//                         const isBug = (issue.issuetype||'').toLowerCase()==='bug';
//                         return (
//                           <tr key={id} style={{ borderBottom:'1px solid #f1f5f9', background:isBug?'#fff8f7':'#fff', transition:'background .12s' }}>
//                             <td style={{ padding:'10px 12px', fontWeight:700, color:'#374151', fontSize:'.85rem' }}>#{id}</td>
//                             <td style={{ padding:'10px 12px' }}>
//                               <span style={{ padding:'2px 8px', borderRadius:99, fontSize:'.7rem', fontWeight:700,
//                                 background:isBug?'#fef2f2':'#eff6ff', color:isBug?'#dc2626':'#2563eb' }}>
//                                 {isBug?'🐛 Bug':'📋 Task'}
//                               </span>
//                             </td>
//                             <td style={{ padding:'10px 12px', fontSize:'.83rem', color:'#374151' }}>{issue.sprint||'—'}</td>
//                             <td style={{ padding:'10px 12px' }}><SBadge s={issue.status||'Open'}/></td>
//                             <td style={{ padding:'10px 12px', fontSize:'.83rem', color:'#374151' }}>{issue.assigneeteam||'—'}</td>
//                             <td style={{ padding:'10px 12px' }}>
//                               <div style={{ display:'flex', gap:5 }}>
//                                 <button onClick={()=>{ setIssueModal(issue); setIssueStatus(issue.status||'Open'); setIssueDesc(issue.description||''); setPrLink(''); }}
//                                   style={{ padding:'4px 10px', fontSize:'.72rem', fontWeight:700, borderRadius:6, border:'none', cursor:'pointer', background:'#eff6ff', color:'#2563eb' }}>
//                                   ✏️ Update
//                                 </button>
//                                 <button onClick={()=>setHoursModal(issue)}
//                                   style={{ padding:'4px 10px', fontSize:'.72rem', fontWeight:700, borderRadius:6, border:'none', cursor:'pointer', background:'#f0fdf4', color:'#16a34a' }}>
//                                   ⏱ Log Hours
//                                 </button>
//                               </div>
//                             </td>
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 </div>
//               )}
//             </Panel>
//           )}

//           {/* ── TAB: Notes & Log ── */}
//           {activeTab==='notes' && (
//             <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.2rem' }}>
//               <Panel accent="#8b5cf6">
//                 <SHead icon="📝" title="Project Notes" sub="Add notes, observations, or blockers" />
//                 <div style={{ marginBottom:12, padding:'1rem', background:'#faf5ff', borderRadius:10, minHeight:120, fontSize:'.83rem', color:'#374151' }}>
//                   {insights?.notes?.length>0
//                     ? insights.notes.map((n,i)=><div key={i} style={{ marginBottom:8, padding:'6px 10px', background:'#fff', borderRadius:7, border:'1px solid #e5e7eb' }}>{n}</div>)
//                     : <span style={{ color:'#c4b5fd' }}>No notes yet. Click "Add Note" to add one.</span>}
//                 </div>
//                 <button onClick={()=>setNoteModal(true)}
//                   style={{ width:'100%', padding:'8px', fontSize:'.78rem', fontWeight:700, borderRadius:8, border:'1px solid #8b5cf6',
//                     cursor:'pointer', background:'#faf5ff', color:'#7c3aed' }}>
//                   + Add New Note
//                 </button>
//               </Panel>
//               <Panel accent="#f59e0b">
//                 <SHead icon="⏱" title="Effort Log" sub="Hours logged against project issues" />
//                 <div style={{ padding:'1rem', background:'#fffbeb', borderRadius:10, minHeight:120, fontSize:'.83rem', color:'#374151' }}>
//                   {insights?.hours_log?.length>0
//                     ? insights.hours_log.map((h,i)=>(
//                         <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:6, padding:'5px 8px', background:'#fff', borderRadius:6 }}>
//                           <span>Issue #{h.issue_id}</span><b>{h.hours}h</b>
//                         </div>
//                       ))
//                     : <span style={{ color:'#fbbf24' }}>No hours logged yet. Use ⏱ Log Hours on any issue.</span>}
//                 </div>
//                 <div style={{ marginTop:12, padding:'8px 12px', background:'#f8fafc', borderRadius:8, fontSize:'.72rem', color:'#64748b' }}>
//                   Total issues: <b style={{color:'#0f172a'}}>{issues.length}</b> &nbsp;·&nbsp;
//                   Bugs: <b style={{color:'#ef4444'}}>{bugs.length}</b> &nbsp;·&nbsp;
//                   Tasks: <b style={{color:'#3b82f6'}}>{tasks.length}</b>
//                 </div>
//               </Panel>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ═══ Modals ═══ */}

//       {/* Issue Update Modal */}
//       {issueModal && (
//         <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
//           <div style={{ background:'#fff', borderRadius:16, padding:'2rem', width:460, boxShadow:'0 24px 60px rgba(0,0,0,.25)', border:'1px solid #e5e7eb' }}>
//             <h3 style={{ margin:'0 0 1.25rem', color:'#0f172a', fontSize:'1rem', fontWeight:700 }}>
//               ✏️ Update Issue #{issueModal.issueid || issueModal.issue_id}
//             </h3>

//             <label style={{ fontSize:'.78rem', fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Status</label>
//             <select value={issueStatus} onChange={e=>setIssueStatus(e.target.value)}
//               style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:'.85rem', marginBottom:12, outline:'none' }}>
//               {['Open','In Progress','In Review','Done','Blocked'].map(s=><option key={s}>{s}</option>)}
//             </select>

//             <label style={{ fontSize:'.78rem', fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>PR / Branch Link</label>
//             <input value={prLink} onChange={e=>setPrLink(e.target.value)} placeholder="https://github.com/org/repo/pull/42"
//               style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:'.83rem', marginBottom:12, outline:'none', boxSizing:'border-box' }} />

//             <label style={{ fontSize:'.78rem', fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Notes / Description</label>
//             <textarea value={issueDesc} onChange={e=>setIssueDesc(e.target.value)} rows={3}
//               style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:'.83rem', resize:'vertical', outline:'none', boxSizing:'border-box' }} />

//             <div style={{ display:'flex', gap:8, marginTop:16 }}>
//               <button onClick={()=>updateIssueMut.mutate({ issueId:issueModal.issueid||issueModal.issue_id, status:issueStatus, description:issueDesc, pr_link:prLink })}
//                 disabled={updateIssueMut.isPending}
//                 style={{ flex:1, padding:'9px', fontWeight:700, fontSize:'.83rem', borderRadius:8, border:'none', cursor:'pointer', background:'#2563eb', color:'#fff' }}>
//                 {updateIssueMut.isPending?'Saving…':'💾 Save Changes'}
//               </button>
//               <button onClick={()=>setIssueModal(null)}
//                 style={{ padding:'9px 16px', fontWeight:700, fontSize:'.83rem', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', background:'#fff', color:'#374151' }}>
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Sprint Request Modal */}
//       {sprintModal && (
//         <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
//           <div style={{ background:'#fff', borderRadius:16, padding:'2rem', width:440, boxShadow:'0 24px 60px rgba(0,0,0,.25)', border:'1px solid #e5e7eb' }}>
//             <h3 style={{ margin:'0 0 1.25rem', color:'#0f172a', fontSize:'1rem', fontWeight:700 }}>🏃 Request Sprint Change</h3>

//             <label style={{ fontSize:'.78rem', fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>New Sprint Name</label>
//             <input value={newSprint} onChange={e=>setNewSprint(e.target.value)} placeholder="e.g. Sprint 9"
//               style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:'.85rem', marginBottom:12, outline:'none', boxSizing:'border-box' }} />

//             <label style={{ fontSize:'.78rem', fontWeight:700, color:'#374151', display:'block', marginBottom:4 }}>Reason for Change</label>
//             <textarea value={sprintReason} onChange={e=>setSprintReason(e.target.value)} rows={3} placeholder="Why do you need to change the sprint?"
//               style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:'.83rem', resize:'vertical', outline:'none', boxSizing:'border-box' }} />

//             <div style={{ display:'flex', gap:8, marginTop:16 }}>
//               <button onClick={()=>sprintMut.mutate({ projectId:selProject.projectid, newSprint, reason:sprintReason })}
//                 disabled={!newSprint||sprintMut.isPending}
//                 style={{ flex:1, padding:'9px', fontWeight:700, fontSize:'.83rem', borderRadius:8, border:'none', cursor:'pointer',
//                   background:newSprint?'#2563eb':'#e5e7eb', color:newSprint?'#fff':'#9ca3af' }}>
//                 {sprintMut.isPending?'Submitting…':'Submit Request'}
//               </button>
//               <button onClick={()=>setSprintModal(false)}
//                 style={{ padding:'9px 16px', fontWeight:700, fontSize:'.83rem', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', background:'#fff', color:'#374151' }}>
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Note Modal */}
//       {noteModal && (
//         <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
//           <div style={{ background:'#fff', borderRadius:16, padding:'2rem', width:420, boxShadow:'0 24px 60px rgba(0,0,0,.25)', border:'1px solid #e5e7eb' }}>
//             <h3 style={{ margin:'0 0 1.25rem', color:'#0f172a', fontSize:'1rem', fontWeight:700 }}>📝 Add Project Note</h3>
//             <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={4} placeholder="Enter your note, observation, or blocker..."
//               style={{ width:'100%', padding:'8px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:'.83rem', resize:'vertical', outline:'none', boxSizing:'border-box' }} />
//             <div style={{ display:'flex', gap:8, marginTop:14 }}>
//               <button onClick={()=>noteMut.mutate({ projectId:selProject.projectid, note:noteText })}
//                 disabled={!noteText||noteMut.isPending}
//                 style={{ flex:1, padding:'9px', fontWeight:700, fontSize:'.83rem', borderRadius:8, border:'none', cursor:'pointer',
//                   background:noteText?'#2563eb':'#e5e7eb', color:noteText?'#fff':'#9ca3af' }}>
//                 {noteMut.isPending?'Saving…':'Save Note'}
//               </button>
//               <button onClick={()=>setNoteModal(false)}
//                 style={{ padding:'9px 16px', fontWeight:700, fontSize:'.83rem', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', background:'#fff', color:'#374151' }}>
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Log Hours Modal */}
//       {hoursModal && (
//         <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
//           <div style={{ background:'#fff', borderRadius:16, padding:'2rem', width:380, boxShadow:'0 24px 60px rgba(0,0,0,.25)', border:'1px solid #e5e7eb' }}>
//             <h3 style={{ margin:'0 0 1.25rem', color:'#0f172a', fontSize:'1rem', fontWeight:700 }}>
//               ⏱ Log Hours — Issue #{hoursModal.issueid||hoursModal.issue_id}
//             </h3>
//             <label style={{ fontSize:'.78rem', fontWeight:700, color:'#374151', display:'block', marginBottom:6 }}>Hours spent</label>
//             <input type="number" min="0" step="0.5" value={hoursVal} onChange={e=>setHoursVal(e.target.value)}
//               placeholder="e.g. 3.5"
//               style={{ width:'100%', padding:'10px', borderRadius:8, border:'1px solid #e5e7eb', fontSize:'1rem', outline:'none', boxSizing:'border-box' }} />
//             <div style={{ display:'flex', gap:8, marginTop:14 }}>
//               <button onClick={()=>hoursMut.mutate({ issueId:hoursModal.issueid||hoursModal.issue_id, hours:parseFloat(hoursVal) })}
//                 disabled={!hoursVal||hoursMut.isPending}
//                 style={{ flex:1, padding:'9px', fontWeight:700, fontSize:'.83rem', borderRadius:8, border:'none', cursor:'pointer',
//                   background:hoursVal?'#16a34a':'#e5e7eb', color:hoursVal?'#fff':'#9ca3af' }}>
//                 {hoursMut.isPending?'Logging…':'✅ Log Hours'}
//               </button>
//               <button onClick={()=>setHoursModal(null)}
//                 style={{ padding:'9px 16px', fontWeight:700, fontSize:'.83rem', borderRadius:8, border:'1px solid #e5e7eb', cursor:'pointer', background:'#fff', color:'#374151' }}>
//                 Cancel
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
//     </div>
//   );
// };

// export default MyProjects;








































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