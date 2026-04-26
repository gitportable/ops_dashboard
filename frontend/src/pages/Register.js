import React, { useState, useContext } from 'react';
import { TextField, Button, FormControl, InputLabel, Select, MenuItem, Alert, Box } from '@mui/material';
import { AuthContext } from '../auth/AuthContext';
import api from '../api/axios';
import { toast } from 'react-toastify'; // if you have toast installed

const Register = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState('Tester');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const res = await api.post('/auth/register', { email, password, requestedRole });
      setMessage(res.data.message || "Registration request sent! You'll get an email when approved.");
      toast.success("Registration submitted!"); // nicer popup
      // Clear form
      setEmail('');
      setPassword('');
      setRequestedRole('Tester');
    } catch (err) {
      console.error("Register error:", err);
      const errMsg = err.response?.data?.message || "Registration failed. Try again.";
      setMessage(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, mx: "auto", mt: 4 }}>
      <h2>Register</h2>

      {message && (
        <Alert severity={message.includes("failed") || message.includes("Error") ? "error" : "success"} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      <TextField
        label="Email"
        type="email"
        fullWidth
        margin="normal"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <TextField
        label="Password"
        type="password"
        fullWidth
        margin="normal"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Requested Role</InputLabel>
        <Select
          value={requestedRole}
          label="Requested Role"
          onChange={(e) => setRequestedRole(e.target.value)}
        >
          <MenuItem value="Tester">Tester</MenuItem>
          <MenuItem value="Developer">Developer</MenuItem>
          <MenuItem value="Admin">Admin</MenuItem>
        </Select>
      </FormControl>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? "Submitting..." : "Register"}
      </Button>
    </Box>
  );
};

export default Register;

// import { useState } from 'react';
// import { useContext } from 'react';
// import { TextField, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
// import { AuthContext } from '../auth/AuthContext';
// import api from '../api/axios';

// const Register = () => {
//   const { login } = useContext(AuthContext);  // Not used, but for future
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [requestedRole, setRequestedRole] = useState('Tester');

//   const submit = async () => {
//     try {
//       await api.post('/auth/register', { email, password, requestedRole });
//       alert('Registration submitted for approval!');
//     } catch (err) {
//       alert('Error registering');
//     }
//   };

//   return (
//     <form onSubmit={submit}>
//       <TextField label="Email" fullWidth margin="normal" onChange={(e) => setEmail(e.target.value)} />
//       <TextField label="Password" type="password" fullWidth margin="normal" onChange={(e) => setPassword(e.target.value)} />
//       <FormControl fullWidth margin="normal">
//         <InputLabel>Requested Role</InputLabel>
//         <Select value={requestedRole} onChange={(e) => setRequestedRole(e.target.value)}>
//           <MenuItem value="Tester">Tester</MenuItem>
//           <MenuItem value="Developer">Developer</MenuItem>
//           <MenuItem value="Admin">Admin</MenuItem>
//         </Select>
//       </FormControl>
//       <Button variant="contained" fullWidth type="submit" sx={{ mt: 2 }}>Register</Button>
//     </form>
//   );
// };

// export default Register;