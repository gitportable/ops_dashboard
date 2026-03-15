import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../auth/AuthContext";
import api from "../api/axios";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    console.log("Form submit triggered! Email:", email, "Password:", password);

    try {
      const response = await api.post("/auth/login", { email, password });
      console.log("Login SUCCESS! Response:", response.data);

      const { token, role } = response.data;

      // Call login to update context AND localStorage
      login(token, role);

      // IMPORTANT: Use setTimeout to ensure state update completes
      // This gives React time to update context before navigation
      setTimeout(() => {
        console.log("Role now confirmed in context:", role);
        console.log("Navigating to /dashboard");
        navigate("/dashboard");
      }, 0);

    } catch (err) {
      console.error("Login FAILED:", err);
      const message = err.response?.data?.message || "Login failed";
      setError(message);
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "100px auto", padding: "20px" }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "15px" }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: "100%", padding: "8px" }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ padding: "10px 20px" }}>
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;



// import { useContext, useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import api from "../api/axios";
// import { AuthContext } from "../auth/AuthContext";
// import { Button, TextField, Box, Alert, CircularProgress } from "@mui/material";

// const Login = () => {
//   const { login, role } = useContext(AuthContext);
//   const navigate = useNavigate();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [loginSuccess, setLoginSuccess] = useState(false); // flag to know login done

  
//   useEffect(() => {
//     if (loginSuccess && role) {
//       console.log("Role now confirmed in context:", role);
//       console.log("Navigating to /dashboard");
//       navigate("/dashboard", { replace: true });
//       setLoginSuccess(false);
//     }
//   }, [role, loginSuccess, navigate]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (loading) return;

//     setLoading(true);
//     setError("");
//     setLoginSuccess(false);

//     console.log("Form submit triggered! Email:", email, "Password:", password);

//     try {
//       const res = await api.post("/auth/login", { email, password });
//       console.log("Login SUCCESS! Response:", res.data);

//       login(res.data.token, res.data.role);
//       setLoginSuccess(true); // trigger useEffect when role updates
//     } catch (err) {
//       console.error("Login FAILED:", err.response?.data || err.message);
//       setError(err.response?.data?.message || "Login failed. Check credentials or server.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Box
//       component="form"
//       onSubmit={handleSubmit}
//       sx={{
//         maxWidth: 400,
//         mx: "auto",
//         mt: 8,
//         p: 4,
//         borderRadius: 2,
//         boxShadow: 3,
//         bgcolor: "background.paper",
//       }}
//     >
//       <h2 style={{ textAlign: "center", marginBottom: 24 }}>Login</h2>

//       {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

//       <TextField
//         label="Email"
//         type="email"
//         fullWidth
//         margin="normal"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//         required
//         disabled={loading}
//       />

//       <TextField
//         label="Password"
//         type="password"
//         fullWidth
//         margin="normal"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//         required
//         disabled={loading}
//       />

//       <Button
//         type="submit"
//         variant="contained"
//         color="primary"
//         fullWidth
//         disabled={loading}
//         sx={{ mt: 3, py: 1.5 }}
//       >
//         {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
//       </Button>

//       <Button
//         variant="contained"
//         fullWidth
//         href="http://localhost:5000/api/auth/google"
//         sx={{
//           mt: 2,
//           bgcolor: "#4285F4",
//           color: "white",
//           "&:hover": { bgcolor: "#357ae8" },
//         }}
//         disabled={loading}
//       >
//         Login with Google
//       </Button>
//     </Box>
//   );
// };

// export default Login;













// import { useContext, useState,useEffect } from "react";
// import { useNavigate } from "react-router-dom"; // ← REQUIRED import for navigate
// import api from "../api/axios";
// import { AuthContext } from "../auth/AuthContext";
// import { Button, TextField, Box, Alert, CircularProgress } from "@mui/material";

// const Login = () => {
//   const { login, role } = useContext(AuthContext); // ← add role from context
//   const navigate = useNavigate();
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   // Auto-redirect when role is set after login
//   useEffect(() => {
//     if (role) {
//       console.log("Role updated in context:", role);
//       navigate("/dashboard");
//     }
//   }, [role, navigate]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     setError("");

//     console.log("Form submit triggered! Email:", email, "Password:", password);

//     try {
//       const res = await api.post("/auth/login", { email, password });
//       console.log("Login SUCCESS! Response:", res.data);

//       login(res.data.token, res.data.role);
//       // Do NOT navigate here — let useEffect handle it when role updates
//     } catch (err) {
//       console.error("Login FAILED:", err.response?.data || err.message);
//       setError(err.response?.data?.message || "Login failed. Check credentials or server.");
//     } finally {
//       setLoading(false);
//     }
//   };
//   // const handleSubmit = async (e) => {
//   //   e.preventDefault();
//   //   setLoading(true);
//   //   setError(null);

//   //   try {
//   //     const res = await api.post("/auth/login", { email, password });
//   //     login(res.data.token, res.data.role);
//   //     navigate("/dashboard"); // ← now works: redirects to dashboard
//   //     // Optional: toast.success("Login successful!");
//   //   } catch (err) {
//   //     console.error("Login error:", err);
//   //     setError(err.response?.data?.message || "Login failed. Check credentials or server.");
//   //   } finally {
//   //     setLoading(false);
//   //   }
//   // };
//   // In return:
//   <Button type="submit" disabled={loading}>
//     {loading ? "Logging in..." : "Login"}
//   </Button>
//   return (
//     <Box
//       component="form"
//       onSubmit={handleSubmit}
//       sx={{
//         maxWidth: 400,
//         mx: "auto",
//         mt: 8,
//         p: 4,
//         borderRadius: 2,
//         boxShadow: 3,
//         bgcolor: "background.paper",
//       }}
//     >
//       <h2 style={{ textAlign: "center", marginBottom: 24 }}>Login</h2>

//       {error && (
//         <Alert severity="error" sx={{ mb: 3 }}>
//           {error}
//         </Alert>
//       )}

//       <TextField
//         label="Email"
//         type="email"
//         fullWidth
//         margin="normal"
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//         required
//       />

//       <TextField
//         label="Password"
//         type="password"
//         fullWidth
//         margin="normal"
//         value={password}
//         onChange={(e) => setPassword(e.target.value)}
//         required
//       />

//       <Button
//         type="submit"
//         variant="contained"
//         color="primary"
//         fullWidth
//         disabled={loading}
//         sx={{ mt: 3, py: 1.5 }}
//       >
//         {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
//       </Button>
//       <Button
//         variant="contained"
//         fullWidth
//         href="http://localhost:5000/api/auth/google"
//         sx={{
//           mt: 2,
//           bgcolor: "#4285F4",
//           color: "white",
//           "&:hover": { bgcolor: "#357ae8" },
//         }}
//       >
//         Login with Google
//       </Button>
//     </Box>
//   );
// };

// export default Login;




















































// import { useContext, useState } from "react";
// import api from "../api/axios";
// import { AuthContext } from "../auth/AuthContext";

// const Login = () => {
//   const { login } = useContext(AuthContext);
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const submit = async () => {
//     const res = await api.post("/auth/login", { email, password });
//     login(res.data.token, res.data.role);
//   };

//   return (
//     <div>
//       <h2>Login</h2>
//       <input onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
//       <input
//         type="password"
//         onChange={(e) => setPassword(e.target.value)}
//         placeholder="Password"
//       />
//       <button onClick={submit}>Login</button>
//     </div>
//   );
// };

// export default Login;
