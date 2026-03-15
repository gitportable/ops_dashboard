import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../auth/AuthContext";
import { getProjectById, updateProject, getProjectStats } from "../api/projectApi";
import { 
  Box, Typography, Grid, Paper, Button, Chip, Divider, 
  TextField, CircularProgress, Stack, LinearProgress 
} from "@mui/material";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useContext(AuthContext);
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const isManagement = ["admin", "superadmin"].includes(role?.toLowerCase());

  useEffect(() => {
    const loadData = async () => {
      try {
        const [projRes, statsRes] = await Promise.all([
          getProjectById(id),
          getProjectStats(id)
        ]);
        setProject(projRes.data);
        setStats(statsRes.data); // Array of { date: '2026-01-01', solved: 5 }
      } catch (err) {
        toast.error("Error loading project details");
        navigate("/projects");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  const handleUpdateSprint = async (newSprint) => {
    try {
      await updateProject(id, { current_sprint: newSprint });
      setProject({ ...project, current_sprint: newSprint });
      toast.success("Sprint updated");
    } catch (err) {
      toast.error("Failed to update sprint");
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: "auto" }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/projects")} sx={{ mb: 3 }}>
        Back to Projects
      </Button>

      <Grid container spacing={3}>
        {/* Left Column: Info and Tools */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1e3a8a', mb: 1 }}>
              {project.project_name}
            </Typography>
            <Chip 
              label={project.status} 
              color={project.status === 'Active' ? 'success' : 'default'} 
              sx={{ mb: 2 }} 
            />
            
            <Divider sx={{ my: 2 }} />

            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Current Sprint</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h6">Sprint {project.current_sprint || 0}</Typography>
                  <Button size="small" onClick={() => handleUpdateSprint((project.current_sprint || 0) + 1)}>Next Sprint</Button>
                </Stack>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">Budget Health</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(project.budget_used / project.budget_allocated) * 100} 
                  sx={{ height: 10, borderRadius: 5, mt: 1 }}
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  ${project.budget_used} used of ${project.budget_allocated}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Right Column: Progress Graph */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Issues Solved Trend</Typography>
            <Box sx={{ height: 300, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="solved" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProjectDetail;