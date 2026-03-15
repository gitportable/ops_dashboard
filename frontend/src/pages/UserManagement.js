import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableRow, Button, Select, MenuItem, CircularProgress, Alert, Box } from '@mui/material';
import api from '../api/axios';
import Typography from '@mui/material/Typography';
const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const res = await api.get('/auth/users/pending'); // ← fixed path
        setUsers(res.data || []);
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load pending users. Are you logged in as SuperAdmin/Admin?");
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  const approveUser = async (id, approve, role) => {
    try {
      await api.put(`/auth/users/${id}/approve`, { approve, role });
      // Refresh list
      const res = await api.get('/auth/users/pending');
      setUsers(res.data || []);
    } catch (err) {
      alert("Approval failed: " + (err.response?.data?.message || "Unknown error"));
    }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', mt: 10 }} />;

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>Pending User Approvals</Typography>

      {users.length === 0 ? (
        <Alert severity="info">No pending approval requests at the moment.</Alert>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Requested Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell>{u.status}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    defaultValue=""
                    onChange={(e) => approveUser(u.id, true, e.target.value)}
                  >
                    <MenuItem value="" disabled>Approve as...</MenuItem>
                    <MenuItem value="Tester">Tester</MenuItem>
                    <MenuItem value="Developer">Developer</MenuItem>
                    <MenuItem value="Admin">Admin</MenuItem>
                  </Select>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => approveUser(u.id, false)}
                    sx={{ ml: 2 }}
                  >
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
};

export default UsersManagement;

// import { useEffect, useState } from 'react';
// import { Table, TableBody, TableCell, TableHead, TableRow, Button, Select, MenuItem } from '@mui/material';
// import api from '../api/axios';

// const UsersManagement = () => {
//   const [users, setUsers] = useState([]);
//   useEffect(() => {
//     api.get('/auth/users/pending')  // ← change to this (full path)
//       .then((res) => setUsers(res.data))
//       .catch((err) => console.error("Failed to fetch pending users:", err));
//       }, []);
//   // useEffect(() => {
//   //   api.get('/users').then((res) => setUsers(res.data));  // Add GET /users route in backend
//   // }, []);

//   const approveUser = async (id, approve, role) => {
//     await api.put(`/users/${id}/approve`, { approve, role });
//     // Refresh users
//     api.get('/users').then((res) => setUsers(res.data));
//   };

//   return (
//     <Table>
//       <TableHead>
//         <TableRow>
//           <TableCell>Email</TableCell>
//           <TableCell>Requested Role</TableCell>
//           <TableCell>Status</TableCell>
//           <TableCell>Actions</TableCell>
//         </TableRow>
//       </TableHead>
//       <TableBody>
//         {users.map((u) => (
//           <TableRow key={u.id}>
//             <TableCell>{u.email}</TableCell>
//             <TableCell>{u.role}</TableCell>
//             <TableCell>{u.status}</TableCell>
//             <TableCell>
//               {u.status === 'pending' && (
//                 <Select onChange={(e) => approveUser(u.id, true, e.target.value)}>
//                   <MenuItem value="Tester">Approve as Tester</MenuItem>
//                   <MenuItem value="Developer">Approve as Developer</MenuItem>
//                   <MenuItem value="Admin">Approve as Admin</MenuItem>
//                 </Select>
//               )}
//               <Button onClick={() => approveUser(u.id, false)}>Reject</Button>
//             </TableCell>
//           </TableRow>
//         ))}
//       </TableBody>
//     </Table>
//   );
// };

// export default UsersManagement;