// import { useEffect, useState, useContext } from "react";
// import { getProjects, updateProject, assignMemberToProject } from "../api/projectApi";
// import { getUsers } from "../api/userApi"; 
// import { AuthContext } from "../auth/AuthContext";
// import {
//   Box, Typography, Card, CardContent, TextField, Switch,
//   FormControlLabel, Button, CircularProgress, Alert,
//   Stack, Chip, LinearProgress, FormControl, Select, MenuItem, InputLabel, Grid
// } from "@mui/material";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { toast } from 'react-hot-toast';
// import { motion } from "framer-motion";
// import dayjs from "dayjs";

// const Projects = () => {
//   const [projects, setProjects] = useState([]);
//   const [allUsers, setAllUsers] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const { user, role } = useContext(AuthContext);
//   const currentRole = (role || user?.role || localStorage.getItem("role") || "").toLowerCase();

//   const fetchData = async () => {
//     try {
//       setLoading(true);
      
//       // Using separate try/catches so one failure doesn't break both
//       try {
//         const projRes = await getProjects();
//         setProjects(projRes.data || []);
//       } catch (e) {
//         console.error("Projects load failed", e);
//         toast.error("Could not load projects");
//       }

//       try {
//         const userRes = await getUsers();
//         setAllUsers(userRes.data || []);
//       } catch (e) {
//         console.error("Users load failed (404)", e);
//         // We don't toast here to avoid annoying the user if they aren't adding members
//         setAllUsers([]); 
//       }

//     } catch (err) {
//       setError("Critical data load error.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (currentRole) fetchData();
//   }, [currentRole]);

//   // Logic to handle updates (Restored with validation)
//   const handleUpdate = async (project, field, value) => {
//     const projectId = project.projectid || project.project_id;
//     if (project[field] === value) return;

//     const updatedProject = { ...project, [field]: value };
    
//     try {
//       await updateProject(projectId, updatedProject);
//       setProjects(prev => prev.map(p => 
//         (p.projectid || p.project_id) === projectId ? updatedProject : p
//       ));
//       toast.success(`${field.replace('_', ' ')} saved!`);
//     } catch (err) {
//       toast.error("Save failed. Check console.");
//     }
//   };

//   const handleAddMember = async (projectId, userId) => {
//     if (!userId) return;
//     try {
//       await assignMemberToProject(projectId, userId);
//       toast.success("Member assigned!");
//       fetchData(); 
//     } catch (err) {
//       toast.error("Assignment failed");
//     }
//   };

//   const handleApproval = async (projectId) => {
//     try {
//       const project = projects.find(p => (p.projectid || p.project_id) === projectId);
//       const newStatus = !project.isApproved;
//       await updateProject(projectId, { ...project, isApproved: newStatus });
//       setProjects(prev => prev.map(p => 
//         (p.projectid || p.project_id) === projectId ? { ...p, isApproved: newStatus } : p
//       ));
//       toast.success(newStatus ? "Project Approved" : "Approval Revoked");
//     } catch (err) {
//       toast.error("Status update failed");
//     }
//   };

//   const canEdit = (field) => {
//     if (currentRole === "superadmin") return true;
//     if (currentRole === "admin") {
//       return ["project_name", "status", "startdate", "enddate", "budget_allocated", "budget_used"].includes(field);
//     }
//     return false;
//   };

//   if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
//   if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;

//   return (
//     <LocalizationProvider dateAdapter={AdapterDayjs}>
//       <Box sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
//         <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 4 }}>
//           Projects Overview
//         </Typography>

//         {projects.length === 0 ? (
//           <Alert severity="info">No projects found.</Alert>
//         ) : (
//           projects.map((p) => {
//             const id = p.projectid || p.project_id;
//             const progressPercent = p.totalIssues > 0 ? (p.solvedIssues / p.totalIssues) * 100 : 0;

//             return (
//               <motion.div key={id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
//                 <Card sx={{ mb: 4, boxShadow: 3, borderRadius: 2, borderLeft: p.isApproved ? '6px solid #4caf50' : '6px solid #ff9800' }}>
//                   <CardContent>
//                     {/* Header Row */}
//                     <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
//                       <Typography 
//                         variant="h5" 
//                         onClick={() => window.location.href = `/projects/${id}`}
//                         sx={{ color: '#1e3a8a', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
//                       >
//                         {p.project_name || "Unnamed Project"}
//                       </Typography>
                      
//                       {currentRole === 'superadmin' && (
//                         <Button 
//                           variant="contained" 
//                           size="small" 
//                           color={p.isApproved ? "error" : "success"}
//                           onClick={() => handleApproval(id)}
//                         >
//                           {p.isApproved ? "Revoke Approval" : "Approve Project"}
//                         </Button>
//                       )}
//                     </Stack>

//                     <Grid container spacing={4}>
//                       {/* Left: Team & Progress */}
//                       <Grid item xs={12} md={6}>
//                         <Typography variant="subtitle2" color="textSecondary">Active Team Members:</Typography>
//                         <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2, flexWrap: 'wrap', gap: 1 }}>
//                           {p.members?.length > 0 ? p.members.map(m => (
//                             <Chip key={m.id} label={`${m.name} (${m.role})`} size="small" variant="outlined" />
//                           )) : <Typography variant="caption">No members assigned</Typography>}
//                         </Stack>

//                         {["admin", "superadmin"].includes(currentRole) && (
//                           <FormControl fullWidth size="small" sx={{ mb: 3 }}>
//                             <InputLabel>Assign Member</InputLabel>
//                             <Select value="" label="Assign Member" onChange={(e) => handleAddMember(id, e.target.value)}>
//                               {allUsers.map(u => (
//                                 <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>
//                               ))}
//                             </Select>
//                           </FormControl>
//                         )}

//                         <Typography variant="body2" sx={{ mb: 0.5 }}>Issues: {p.solvedIssues || 0} / {p.totalIssues || 0} Solved</Typography>
//                         <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 8, borderRadius: 5, mb: 2 }} />
//                       </Grid>

//                       {/* Right: Budget & Editing */}
//                       <Grid item xs={12} md={6}>
//                         <Box sx={{ mb: 2 }}>
//                           <Typography variant="body2">
//                             Budget: <b>${p.budget_used || 0}</b> / ${p.budget_allocated || 0}
//                           </Typography>
//                           {Number(p.budget_used) > Number(p.budget_allocated) && (
//                             <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>⚠️ OVER BUDGET</Typography>
//                           )}
//                         </Box>

//                         <Stack spacing={2}>
//                           <TextField
//                             fullWidth
//                             label="Project Name"
//                             defaultValue={p.project_name}
//                             onBlur={(e) => handleUpdate(p, "project_name", e.target.value)}
//                             disabled={!canEdit("project_name")}
//                             size="small"
//                           />
                          
//                           <Stack direction="row" spacing={2}>
//                             <DatePicker
//                               label="Start"
//                               value={p.startdate ? dayjs(p.startdate) : null}
//                               onChange={(val) => handleUpdate(p, "startdate", val?.format("YYYY-MM-DD"))}
//                               disabled={!canEdit("startdate")}
//                               slotProps={{ textField: { size: 'small', fullWidth: true } }}
//                             />
//                             <DatePicker
//                               label="End"
//                               value={p.enddate ? dayjs(p.enddate) : null}
//                               onChange={(val) => handleUpdate(p, "enddate", val?.format("YYYY-MM-DD"))}
//                               disabled={!canEdit("enddate")}
//                               slotProps={{ textField: { size: 'small', fullWidth: true } }}
//                             />
//                           </Stack>

//                           <FormControlLabel
//                             control={
//                               <Switch 
//                                 checked={(p.status || "").toLowerCase() === "active"} 
//                                 onChange={(e) => handleUpdate(p, "status", e.target.checked ? "Active" : "Inactive")}
//                                 disabled={!canEdit("status")}
//                               />
//                             }
//                             label={`Status: ${p.status || "N/A"}`}
//                           />
//                         </Stack>
//                       </Grid>
//                     </Grid>
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             );
//           })
//         )}
//       </Box>
//     </LocalizationProvider>
//   );
// };

// export default Projects;
import { useEffect, useState } from "react";
import { getProjects, updateProject, assignMemberToProject } from "../api/projectApi";
import { getUsers } from "../api/userApi";
import { Box, Typography, Card, CardContent, TextField, Button, CircularProgress, Stack, Chip, LinearProgress, FormControl, Select, MenuItem, InputLabel, Grid, Paper } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { toast } from 'react-hot-toast';
import dayjs from "dayjs";

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [pRes, uRes] = await Promise.all([getProjects(), getUsers()]);
      setProjects(pRes.data || []);
      setAllUsers(uRes.data || []);
    } catch (err) {
      console.error("Load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdate = async (project, field, value) => {
    if (project[field] === value) return;
    try {
      const id = project.projectid || project.project_id || project.id;
      await updateProject(id, { ...project, [field]: value });
      toast.success("Saved!");
      loadData();
    } catch (err) { toast.error("Save failed"); }
  };

  if (loading) return <CircularProgress sx={{ m: 10 }} />;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#1e3a8a' }}>Projects Overview</Typography>
        
        {projects.map((p) => {
          const id = p.projectid || p.project_id || p.id;
          const name = p.project_name || p.name || "Unnamed Project";
          const prog = p.totalIssues > 0 ? (p.solvedIssues / p.totalIssues) * 100 : 0;

          return (
            <Card key={id} sx={{ mb: 4, borderRadius: 3, boxShadow: 3 }}>
              <CardContent>
                <Grid container spacing={3}>
                  {/* Info Section */}
                  <Grid item xs={12} md={7}>
                    <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>{name}</Typography>
                    <Typography variant="body2" color="text.secondary">Sprint Progress</Typography>
                    <LinearProgress variant="determinate" value={prog} sx={{ height: 10, borderRadius: 5, my: 1 }} />
                    <Typography variant="caption">{p.solvedIssues || 0} / {p.totalIssues || 0} Issues Solved</Typography>
                    
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle2">Team Members:</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
                        {p.members?.map(m => <Chip key={m.id} label={m.name} size="small" />)}
                      </Stack>
                      <FormControl fullWidth size="small">
                        <InputLabel>Assign Member</InputLabel>
                        <Select value="" label="Assign Member" onChange={(e) => assignMemberToProject(id, e.target.value).then(() => loadData())}>
                          {allUsers.map(u => <MenuItem key={u.id} value={u.id}>{u.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Box>
                  </Grid>

                  {/* Budget Section */}
                  <Grid item xs={12} md={5}>
                    <Paper sx={{ p: 2, bgcolor: '#f8fafc' }}>
                      <Typography variant="subtitle2">Budget: ${p.budget_used || 0} / ${p.budget_allocated || 0}</Typography>
                      <TextField 
                        fullWidth label="Project Name" size="small" sx={{ mt: 2 }}
                        defaultValue={name} 
                        onBlur={(e) => handleUpdate(p, "project_name", e.target.value)} 
                      />
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <DatePicker label="Start" value={dayjs(p.startdate)} onChange={(v) => handleUpdate(p, "startdate", v.format("YYYY-MM-DD"))} slotProps={{ textField: { size: 'small' } }} />
                        <DatePicker label="End" value={dayjs(p.enddate)} onChange={(v) => handleUpdate(p, "enddate", v.format("YYYY-MM-DD"))} slotProps={{ textField: { size: 'small' } }} />
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </LocalizationProvider>
  );
};

export default Projects;















































































// import { useEffect, useState, useContext } from "react";
// import { getProjects, updateProject } from "../api/projectApi";
// import { AuthContext } from "../auth/AuthContext";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { toast } from 'react-hot-toast'; // Correct library matching App.js
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import { getUsers } from "../api/userApi";
// import {
//   Box, Typography, Card, CardContent, TextField, Switch,
//   FormControlLabel, Button, CircularProgress, Alert,
//   Stack, Chip, LinearProgress // <--- Add these three here
// } from "@mui/material";
// const Projects = () => {
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [allUsers, setAllUsers] = useState([]);
  
//   const { user, role } = useContext(AuthContext); 
//   const currentRole = (role || user?.role || localStorage.getItem("role") || "").toLowerCase();
//   const fetchData = async () => {
//     try {
//       setLoading(true);
//       const [projRes, userRes] = await Promise.all([getProjects(), getUsers()]);
//       setProjects(projRes.data || []);
//       setAllUsers(userRes.data || []);
//     } catch (err) {
//       console.error("API Error:", err);
//       setError("Failed to load data from server.");
//     } finally {
//       setLoading(false);
//     }
//   };
//   useEffect(() => {
//     console.log("Projects Page Loaded. Role:", currentRole); // This will now show up!
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const [projRes, userRes] = await Promise.all([getProjects(), getUsers()]);
//         setProjects(projRes.data || []);
//         setAllUsers(userRes.data || []);
//       } catch (err) {
//         toast.error("Failed to load data");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   const handleAddMember = async (projectId, userId) => {
//     try {
//       await assignMemberToProject(projectId, userId);
//       toast.success("Member assigned successfully!");
//       // Refresh projects to show new member chips
//       const res = await getProjects();
//       setProjects(res.data);
//     } catch (err) {
//       toast.error("Assignment failed");
//     }
//   };
//     const fetchProjects = async () => {
//       try {
//         setLoading(true);
//         const res = await getProjects();
//         setProjects(res.data || []);
//       } catch (err) {
//         console.error("API Error:", err);
//         setError("Failed to load projects from server.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (currentRole) fetchProjects();
//   }, [currentRole]);

//   const canEdit = (field) => {
//     if (currentRole === "superadmin") return true;
//     if (currentRole === "admin") {
//       return ["project_name", "status", "startdate", "enddate", "budget_allocated", "budget_used"].includes(field);
//     }
//     return false;
//   };

//   const handleChange = async (project, field, value) => {
//     if (!canEdit(field)) return;
    
//     const updatedProject = { ...project, [field]: value };
    
//     // Using react-hot-toast confirm pattern
//     toast((t) => (
//       <span>
//         Save changes to <b>{project.project_name}</b>?
//         <button 
//           onClick={async () => {
//             toast.dismiss(t.id);
//             try {
//               await updateProject(project.projectid || project.project_id, updatedProject);
//               setProjects(prev => prev.map(p => 
//                 (p.projectid || p.project_id) === (project.projectid || project.project_id) ? updatedProject : p
//               ));
//               toast.success("Saved!");
//             } catch (err) {
//               toast.error("Save failed");
//             }
//           }}
//           style={{ marginLeft: '10px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
//         >
//           Confirm
//         </button>
//       </span>
//     ));
//   };
  
//   // --- RENDER LOGIC ---
//   if (!currentRole) return <Box sx={{ p: 4 }}><Alert severity="error">Access Denied: No Role Found</Alert></Box>;
//   if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;
//   if (error) return <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>;
//   // 1. Add this function inside your Projects component (before the return)
// const handleApproval = async (projectId) => {
//   try {
//     // Find the current project to toggle its status
//       const projectToUpdate = projects.find(proj => (proj.projectid || proj.project_id) === projectId);
//       const newApprovalStatus = !projectToUpdate.isApproved;

//       await updateProject(projectId, { ...projectToUpdate, isApproved: newApprovalStatus });
      
//       // Update local state so UI refreshes immediately
//       setProjects(prev => prev.map(proj => 
//         (proj.projectid || proj.project_id) === projectId 
//           ? { ...proj, isApproved: newApprovalStatus } 
//           : proj
//       ));
      
//       toast.success(newApprovalStatus ? "Project Approved!" : "Approval Revoked");
//     } catch (err) {
//       toast.error("Failed to update approval status.");
//     }
//   };


//     return (
//       <LocalizationProvider dateAdapter={AdapterDayjs}>
//         <Box sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
//           <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>
//             Projects Overview
//           </Typography>

//           {projects.length === 0 ? (
//             <Alert severity="info">No projects found in the database.</Alert>
//           ) : (
//             projects.map((p) => {
//               const id = p.projectid || p.project_id;
              
//               // Calculate Progress Safely
//               const total = p.totalIssues || 0;
//               const solved = p.solvedIssues || 0;
//               const progressPercent = total > 0 ? (solved / total) * 100 : 0;

//               return (
//                 <Box sx={{ p: 4 }}>
//       {projects.map((p) => (
//         <Card key={p.projectid} sx={{ mb: 4, cursor: 'pointer', "&:hover": { boxShadow: 6 } }}>
//           <CardContent>
//             {/* Header: Click name to go to detailed tools */}
//             <Typography 
//               variant="h5" 
//               onClick={() => window.location.href = `/projects/${p.projectid}`}
//               sx={{ color: '#1e3a8a', cursor: 'pointer', textDecoration: 'underline' }}
//             >
//               {p.project_name}
//             </Typography>

//             {/* Admin Member Assignment Tool */}
//             {["admin", "superadmin"].includes(currentRole) && (
//               <Box sx={{ mt: 2, p: 2, border: '1px dashed #ccc' }}>
//                 <Typography variant="subtitle2">Add Team Member:</Typography>
//                 <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
//                   <FormControl size="small" sx={{ minWidth: 200 }}>
//                     <Select
//                       onChange={(e) => handleAddMember(p.projectid, e.target.value)}
//                       displayEmpty
//                     >
//                       <MenuItem value="" disabled>Select User</MenuItem>
//                       {allUsers.map(u => (
//                         <MenuItem key={u.id} value={u.id}>{u.name} ({u.role})</MenuItem>
//                       ))}
//                     </Select>
//                   </FormControl>
//                 </Stack>
//               </Box>
//             )}
//                 <motion.div key={id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
//                   <Card sx={{ mb: 4, boxShadow: 3, borderRadius: 2 }}>
//                     <CardContent>
//                       <Typography variant="h6" color="primary" gutterBottom>
//                         {p.project_name || "Unnamed Project"}
//                       </Typography>
                      
//                       <div className="project-card-details" style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#fcfcfc', borderRadius: '8px' }}>
                        
//                         {/* 1. Team Members */}
//                         <div className="team-section">
//                           <Typography variant="subtitle2">Active Team:</Typography>
//                           <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
//                             {p.members?.length > 0 ? p.members.map(m => (
//                               <Chip key={m.id} label={`${m.name} (${m.role})`} size="small" variant="outlined" />
//                             )) : <Typography variant="caption" color="text.secondary">No members assigned</Typography>}
//                           </Stack>
//                         </div>

//                         {/* 2. Issue Progress */}
//                         <div className="progress-container" style={{ margin: '15px 0' }}>
//                           <Typography variant="body2">Issues: {solved} / {total} Solved</Typography>
//                           <LinearProgress 
//                             variant="determinate" 
//                             value={progressPercent} 
//                             sx={{ height: 8, borderRadius: 5, mt: 1 }} 
//                           />
//                         </div>

//                         {/* 3. Budget Status */}
//                         <div className="budget-status" style={{ margin: '15px 0' }}>
//                           <Typography variant="body2">
//                             Budget Used: <strong>${p.budget_used || 0}</strong> / ${p.budget_allocated || 0}
//                           </Typography>
//                           {Number(p.budget_used) > Number(p.budget_allocated) && (
//                             <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>⚠️ OVER BUDGET</Typography>
//                           )}
//                         </div>

//                         {/* 4. Superadmin Approval Toggle */}
//                         {currentRole === 'superadmin' && (
//                           <div className="approval-actions" style={{ borderTop: '1px solid #eee', paddingTop: '10px', marginTop: '10px' }}>
//                             <Typography variant="body2" sx={{ mb: 1 }}>
//                               Approval Status: {p.isApproved ? "✅ Approved" : "⏳ Pending"}
//                             </Typography>
//                             <Button 
//                               variant="contained" 
//                               size="small"
//                               color={p.isApproved ? "error" : "success"}
//                               onClick={() => handleApproval(id)}
//                             >
//                               {p.isApproved ? "Revoke Access" : "Approve Project"}
//                             </Button>
//                           </div>
//                         )}
//                       </div>
//                     <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 2 }}>
//                       <TextField
//                         label="Project Name"
//                         value={p.project_name || ""}
//                         onChange={(e) => handleChange(p, "project_name", e.target.value)}
//                         disabled={!canEdit("project_name")}
//                         fullWidth
//                       />

//                       <FormControlLabel
//                         control={
//                           <Switch
//                             checked={(p.status || "").toLowerCase() === "active"}
//                             onChange={(e) => handleChange(p, "status", e.target.checked ? "Active" : "Inactive")}
//                             disabled={!canEdit("status")}
//                           />
//                         }
//                         label={`Status: ${p.status || "N/A"}`}
//                       />

//                       <DatePicker
//                         label="Start Date"
//                         value={p.startdate ? dayjs(p.startdate) : null}
//                         onChange={(val) => handleChange(p, "startdate", val?.format("YYYY-MM-DD"))}
//                         disabled={!canEdit("startdate")}
//                         slotProps={{ textField: { fullWidth: true } }}
//                       />

//                       <DatePicker
//                         label="End Date"
//                         value={p.enddate ? dayjs(p.enddate) : null}
//                         onChange={(val) => handleChange(p, "enddate", val?.format("YYYY-MM-DD"))}
//                         disabled={!canEdit("enddate")}
//                         slotProps={{ textField: { fullWidth: true } }}
//                       />
//                     </Box>
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             );
//           })
//         )}
//       </Box>
//     </LocalizationProvider>
//   );
// };

// export default Projects;










































































































































{/* // import dayjs from "dayjs";
// import { motion } from "framer-motion";
// import { toast } from "react-toastify";
// import { useEffect, useState, useContext } from "react";
// import { getProjects, updateProject } from "../api/projectApi"; // Make sure updateProject exists
// import { AuthContext } from "../auth/AuthContext";
// import { */}
//   Box,
//   Typography,
//   Card,
//   CardContent,
//   TextField,
//   Switch,
//   FormControlLabel,
//   Button,
//   CircularProgress,
//   Alert,
// } from "@mui/material";
// import { DatePicker } from "@mui/x-date-pickers/DatePicker";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
// import { toast } from "react-toastify";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";

// const Projects = () => {
//   const [projects, setProjects] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const { user } = useContext(AuthContext);

//   useEffect(() => {
//     if (!user) return;

//     const fetchProjects = async () => {
//       try {
//         const res = await getProjects();
//         setProjects(res.data || []);
//       } catch (err) {
//         console.error("Failed to load projects:", err);
//         setError("Failed to load projects. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProjects();
//   }, [user]);

//   const canEdit = (field) => {
//     if (!user) return false;
//     const role = user.role?.toLowerCase();

//     if (role === "superadmin") return true;

//     if (role === "admin") {
//       return ["project_name", "status", "startdate", "enddate", "budget_allocated", "budget_used"].includes(field);
//     }

//     // Developer / Tester / others: read-only
//     return false;
//   };

//   const handleChange = async (project, field, value) => {
//     if (!canEdit(field)) return;

//     const updatedProject = { ...project, [field]: value };

//     toast.info("Save this change?", {
//       position: "top-center",
//       autoClose: false,
//       closeOnClick: true,
//       onClick: async () => {
//         try {
//           await updateProject(project.projectid || project.project_id, updatedProject);
//           setProjects((prev) =>
//             prev.map((p) =>
//               (p.projectid || p.project_id) === (project.projectid || project.project_id) ? updatedProject : p
//             )
//           );
//           toast.success("Changes saved successfully!");
//         } catch (err) {
//           console.error("Update failed:", err);
//           toast.error("Failed to save changes");
//         }
//       },
//     });
//   };

//   if (!user) return <Alert severity="warning">Please log in to view projects.</Alert>;

//   if (loading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 10 }} />;

//   if (error) return <Alert severity="error">{error}</Alert>;

//   return (
//     <LocalizationProvider dateAdapter={AdapterDayjs}>
//       <Box sx={{ p: 4, maxWidth: 1200, mx: "auto" }}>
//         <Typography variant="h4" gutterBottom align="center">
//           Projects Overview
//         </Typography>

//         {projects.length === 0 ? (
//           <Alert severity="info">No projects found or still loading...</Alert>
//         ) : (
//           projects.map((p) => {
//             const id = p.projectid || p.project_id;
//             const canEditAll = canEdit("all"); // for simplicity in some checks

//             return (
//               <motion.div
//                 key={id}
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.5 }}
//               >
//                 <Card sx={{ mb: 4, boxShadow: 6, borderRadius: 3 }}>
//                   <CardContent>
//                     <Typography variant="h6" gutterBottom>
//                       {p.project_name || p.projectname || "Unnamed Project"}
//                     </Typography>

//                     <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
//                       {/* Project Name */}
//                       <TextField
//                         label="Project Name"
//                         value={p.project_name || p.projectname || ""}
//                         onChange={(e) => handleChange(p, "project_name", e.target.value)}
//                         disabled={!canEdit("project_name")}
//                         fullWidth
//                       />

//                       {/* Status Toggle */}
//                       <FormControlLabel
//                         control={
//                           <Switch
//                             checked={(p.status || "").toLowerCase() === "active"}
//                             onChange={(e) =>
//                               handleChange(p, "status", e.target.checked ? "Active" : "Inactive")
//                             }
//                             disabled={!canEdit("status")}
//                           />
//                         }
//                         label={`Status: ${p.status || "N/A"}`}
//                       />

//                       {/* Start Date */}
//                       <DatePicker
//                         label="Start Date"
//                         value={p.startdate ? dayjs(p.startdate) : null}
//                         onChange={(newValue) => handleChange(p, "startdate", newValue?.format("YYYY-MM-DD"))}
//                         disabled={!canEdit("startdate")}
//                         slotProps={{ textField: { fullWidth: true } }}
//                       />

//                       {/* End Date */}
//                       <DatePicker
//                         label="End Date"
//                         value={p.enddate ? dayjs(p.enddate) : null}
//                         onChange={(newValue) => handleChange(p, "enddate", newValue?.format("YYYY-MM-DD"))}
//                         disabled={!canEdit("enddate")}
//                         slotProps={{ textField: { fullWidth: true } }}
//                       />

//                       {/* Budget Allocated */}
//                       <TextField
//                         label="Budget Allocated (₹)"
//                         type="number"
//                         value={p.budget_allocated || p.budgetallocated || 0}
//                         onChange={(e) => handleChange(p, "budget_allocated", Number(e.target.value))}
//                         disabled={!canEdit("budget_allocated")}
//                         fullWidth
//                         InputProps={{ startAdornment: "₹" }}
//                       />

//                       {/* Budget Used */}
//                       <TextField
//                         label="Budget Used (₹)"
//                         type="number"
//                         value={p.budget_used || p.budgetspent || 0}
//                         onChange={(e) => handleChange(p, "budget_used", Number(e.target.value))}
//                         disabled={!canEdit("budget_used")}
//                         fullWidth
//                         InputProps={{ startAdornment: "₹" }}
//                       />
//                     </Box>

//                     {/* Quick actions for SuperAdmin */}
//                     {canEditAll && (
//                       <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
//                         <Button
//                           variant="outlined"
//                           color="primary"
//                           onClick={() => handleChange(p, "budget_allocated", (p.budget_allocated || 0) + 10000)}
//                         >
//                           +₹10,000 Allocated
//                         </Button>
//                         <Button variant="contained" color="success">
//                           Save All Changes
//                         </Button>
//                       </Box>
//                     )}
//                   </CardContent>
//                 </Card>
//               </motion.div>
//             );
//           })
//         )}
//       </Box>
//     </LocalizationProvider>
//   );
// };

// export default Projects;