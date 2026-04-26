// src/App.js
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import MyProjects from "./pages/MyProjects";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Issues from "./pages/Issues";
import UsersManagement from "./pages/UserManagement";
import ProtectedRoute from "./auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Layout from "./components/Layout";
import ResourceAllocation from "./pages/ResourceAllocation";
import AuditLogs from "./pages/AuditLogs";
import MyRoadmap from "./pages/MyRoadmap";
import ProjectDetail from "./pages/ProjectDetail";
import ProductionTracking from "./pages/ProductionTracking";
import QualityAssurance from "./pages/QualityAssurance";
import SupplyChain from "./pages/SupplyChain";
import FieldService from "./pages/FieldService";
import Workboard from "./pages/Workboard";

const socket = io("http://localhost:5001");

function App() {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.on("issueCreated", () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardCharts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["myIssues"] });
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
    });

    socket.on("issueUpdated", () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardCharts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["myIssues"] });
      queryClient.invalidateQueries({ queryKey: ["myTasks"] });
    });

    return () => {
      socket.off("issueCreated");
      socket.off("issueUpdated");
    };
  }, [queryClient]);

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1e3a8a",
            color: "#fff",
            borderRadius: "12px",
            padding: "1rem 1.5rem",
            fontSize: "0.95rem",
            fontWeight: "500",
          },
          success: { style: { background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" } },
          error: { style: { background: "linear-gradient(135deg,#dc2626,#991b1b)" } },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />

        {/* Dashboard */}
        <Route
          path="/workboard"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
              <Layout>
                <Workboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* NEW: Production Tracking */}
        <Route
          path="/production-tracking"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
              <Layout>
                <ProductionTracking />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Existing routes unchanged */}
        <Route
          path="/projects"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout>
                <Projects />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
              <Layout>
                <ProjectDetail />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-projects"
          element={
            <ProtectedRoute allowedRoles={["developer", "tester"]}>
              <Layout>
                <MyProjects />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/issues"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
              <Layout>
                <Issues />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users-management"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout>
                <UsersManagement />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/resource-allocation"
          element={
            <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
              <Layout>
                <ResourceAllocation />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <Layout>
                <AuditLogs />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/roadmap"
          element={
            <ProtectedRoute allowedRoles={["developer", "tester"]}>
              <Layout>
                <MyRoadmap />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* NEW: Extended Modules */}
        <Route
          path="/quality-assurance"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "tester"]}>
              <Layout>
                <QualityAssurance />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/supply-chain"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout>
                <SupplyChain />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/field-service"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "tester"]}>
              <Layout>
                <FieldService />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<div style={{ padding: "4rem", textAlign: "center" }}><h1>Access Denied</h1><Link to="/dashboard">Back to Dashboard</Link></div>} />

        <Route path="*" element={<div style={{ padding: "4rem", textAlign: "center" }}><h1>404 – Page Not Found</h1><Link to="/dashboard">Back to Dashboard</Link></div>} />
      </Routes>
    </>
  );
}

export default App;


// import { Routes, Route } from "react-router-dom";
// import { Toaster } from "react-hot-toast";
// import { useEffect } from "react";
// import { io } from "socket.io-client";
// import { useQueryClient } from "@tanstack/react-query";
// import { Link } from "react-router-dom";
// import MyProjects from "./pages/MyProjects";
// import Dashboard from "./pages/Dashboard";
// import Projects from "./pages/Projects";
// import Issues from "./pages/Issues";
// import UsersManagement from "./pages/UserManagement";
// import ProtectedRoute from "./auth/ProtectedRoute";
// import Landing from "./pages/Landing";
// import Layout from "./components/Layout";
// import ResourceAllocation from "./pages/ResourceAllocation";
// import AuditLogs from "./pages/AuditLogs";
// import MyRoadmap from "./pages/MyRoadmap";
// import ProjectDetail from "./pages/ProjectDetail";

// const socket = io("http://localhost:5001");

// // NOTE: QueryClient and AuthProvider are declared ONCE in index.js.
// // Do not re-wrap them here — this component is already a child of both.

// function App() {
//   const queryClient = useQueryClient();

//   useEffect(() => {
//     socket.on("issueCreated", () => {
//       queryClient.invalidateQueries({ queryKey: ["dashboardCharts"] });
//       queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
//       queryClient.invalidateQueries({ queryKey: ["myIssues"] });
//       queryClient.invalidateQueries({ queryKey: ["myTasks"] });
//     });

//     socket.on("issueUpdated", () => {
//       queryClient.invalidateQueries({ queryKey: ["dashboardCharts"] });
//       queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
//       queryClient.invalidateQueries({ queryKey: ["myIssues"] });
//       queryClient.invalidateQueries({ queryKey: ["myTasks"] });
//     });

//     return () => {
//       socket.off("issueCreated");
//       socket.off("issueUpdated");
//     };
//   }, [queryClient]);

//   return (
//     <>
//       <Toaster
//         position="top-center"
//         toastOptions={{
//           duration: 3000,
//           style: {
//             background: "#1e3a8a",
//             color: "#fff",
//             borderRadius: "12px",
//             padding: "1rem 1.5rem",
//             fontSize: "0.95rem",
//             fontWeight: "500",
//           },
//           success: {
//             style: { background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
//           },
//           error: {
//             style: { background: "linear-gradient(135deg,#dc2626,#991b1b)" },
//           },
//         }}
//       />

//       <Routes>
//         {/* Public */}
//         <Route path="/" element={<Landing />} />

//         {/* Dashboard — all roles */}
//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute
//               allowedRoles={["superadmin", "admin", "developer", "tester"]}
//             >
//               <Layout>
//                 <Dashboard />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* All Projects — admin/superadmin ONLY (was mistakenly unprotected) */}
//         <Route
//           path="/projects"
//           element={
//             <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//               <Layout>
//                 <Projects />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* Project Detail — clickable from All Projects for superadmin */}
//         <Route
//           path="/projects/:id"
//           element={
//             <ProtectedRoute
//               allowedRoles={["superadmin", "admin", "developer", "tester"]}
//             >
//               <Layout>
//                 <ProjectDetail />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* My Projects — developer/tester (their assigned projects only) */}
//         <Route
//           path="/my-projects"
//           element={
//             <ProtectedRoute allowedRoles={["developer", "tester"]}>
//               <Layout>
//                 <MyProjects />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* Issues — filtered by role in the Issues page component */}
//         <Route
//           path="/issues"
//           element={
//             <ProtectedRoute
//               allowedRoles={["superadmin", "admin", "developer", "tester"]}
//             >
//               <Layout>
//                 <Issues />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* User Management */}
//         <Route
//           path="/users-management"
//           element={
//             <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//               <Layout>
//                 <UsersManagement />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* Admin — Resource Allocation */}
//         <Route
//           path="/resource-allocation"
//           element={
//             <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
//               <Layout>
//                 <ResourceAllocation />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* SuperAdmin — System Health / Audit Logs */}
//         <Route
//           path="/audit-logs"
//           element={
//             <ProtectedRoute allowedRoles={["superadmin"]}>
//               <Layout>
//                 <AuditLogs />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* Developer / Tester — Roadmap */}
//         <Route
//           path="/roadmap"
//           element={
//             <ProtectedRoute allowedRoles={["developer", "tester"]}>
//               <Layout>
//                 <MyRoadmap />
//               </Layout>
//             </ProtectedRoute>
//           }
//         />

//         {/* Unauthorized */}
//         <Route
//           path="/unauthorized"
//           element={
//             <div
//               style={{
//                 padding: "4rem",
//                 textAlign: "center",
//                 minHeight: "100vh",
//                 display: "flex",
//                 flexDirection: "column",
//                 justifyContent: "center",
//                 alignItems: "center",
//                 background: "#f8fafc",
//               }}
//             >
//               <h1 style={{ fontSize: "3rem", color: "#dc2626" }}>
//                 Access Denied
//               </h1>
//               <p
//                 style={{
//                   fontSize: "1.25rem",
//                   margin: "1rem 0 2rem",
//                   color: "#4b5563",
//                 }}
//               >
//                 You don't have permission to view this page.
//               </p>
//               <Link
//                 to="/dashboard"
//                 style={{
//                   padding: "0.75rem 1.5rem",
//                   background: "#1e40af",
//                   color: "white",
//                   borderRadius: "8px",
//                   textDecoration: "none",
//                   fontWeight: "500",
//                 }}
//               >
//                 Back to Dashboard
//               </Link>
//             </div>
//           }
//         />

//         {/* 404 */}
//         <Route
//           path="*"
//           element={
//             <div style={{ padding: "4rem", textAlign: "center" }}>
//               <h1>404 – Page Not Found</h1>
//               <Link to="/dashboard">Back to Dashboard</Link>
//             </div>
//           }
//         />
//       </Routes>
//     </>
//   );
// }

// export default App;










// import { Routes, Route, BrowserRouter } from "react-router-dom";
// import { Toaster } from 'react-hot-toast';
// import { useEffect } from "react";
// import { io } from "socket.io-client";
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { Link } from "react-router-dom";
// import MyProjects from "./pages/MyProjects";
// import Dashboard from "./pages/Dashboard";
// import Projects from "./pages/Projects";
// import Issues from "./pages/Issues";
// import UsersManagement from './pages/UserManagement';
// import ProtectedRoute from "./auth/ProtectedRoute";
// import Landing from './pages/Landing';
// import Layout from './components/Layout';
// import { AuthProvider } from "./auth/AuthContext";
// import ResourceAllocation from "./pages/ResourceAllocation"; // Create this file
// import AuditLogs from "./pages/AuditLogs";                 // Create this file
// import MyRoadmap from "./pages/MyRoadmap";
// import ProjectDetail from "./pages/ProjectDetail";
// const socket = io('http://localhost:5000');

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 5 * 60 * 1000,
//       retry: 1,
//     },
//   },
// });

// function App() {
//   useEffect(() => {
//     socket.on('issueCreated', () => {
//       queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
//       queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
//     });

//     socket.on('issueUpdated', () => {
//       queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
//       queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
//     });

//     return () => {
//       socket.off('issueCreated');
//       socket.off('issueUpdated');
//     };
//   }, []);

//   return (
//     <QueryClientProvider client={queryClient}>
//       <AuthProvider>
//         <Toaster
//           position="top-center"
//           toastOptions={{
//             duration: 3000,
//             style: {
//               background: '#1e3a8a',
//               color: '#fff',
//               borderRadius: '12px',
//               padding: '1rem 1.5rem',
//               fontSize: '0.95rem',
//               fontWeight: '500',
//             },
//             success: { style: { background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' } },
//             error: { style: { background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' } },
//           }}
//         />
//         <Routes>
//           <Route path="/" element={<Landing />} />

//           {/* NEW: Admin Resource Allocation */}
//           <Route path="/resource-allocation" element={
//             <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
//               <Layout><ResourceAllocation /></Layout>
//             </ProtectedRoute>
//           } />

//           {/* NEW: SuperAdmin Audit Logs */}
//           <Route path="/audit-logs" element={
//             <ProtectedRoute allowedRoles={["superadmin"]}>
//               <Layout><AuditLogs /></Layout>
//             </ProtectedRoute>
//           } />

//           {/* NEW: Developer/Tester Roadmap */}
//           <Route path="/roadmap" element={
//             <ProtectedRoute allowedRoles={["developer", "tester"]}>
//               <Layout><MyRoadmap /></Layout>
//             </ProtectedRoute>
//           } />

//             {/* Dashboard (all roles) */}
//             <Route
//               path="/dashboard"
//               element={
//                 <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
//                   <Layout>
//                     <Dashboard />
//                   </Layout>
//                 </ProtectedRoute>
//               }
//             />
//             <Route path="/projects/:id" element={<ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}><Layout><ProjectDetail /></Layout></ProtectedRoute>} />
//             {/* My Projects (tester/developer) */}
//             <Route
//               path="/my-projects"
//               element={
//                 <ProtectedRoute allowedRoles={["developer", "tester"]}>
//                   <Layout>
//                     <MyProjects />
//                   </Layout>
//                 </ProtectedRoute>
//               }
//             />

//             {/* All Projects (admin/superadmin) */}
//             <Route
//               path="/projects"
//               element={
//                 // <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//                   <Layout>
//                     <Projects />
//                   </Layout>
//                 //</ProtectedRoute>
//               }
//             />

//             {/* Issues (all roles) */}
//             <Route
//               path="/issues"
//               element={
//                 <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
//                   <Layout>
//                     <Issues />
//                   </Layout>
//                 </ProtectedRoute>
//               }
//             />

//             {/* User Management (admin/superadmin) */}
//             <Route
//               path="/users-management"
//               element={
//                 <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//                   <Layout>
//                     <UsersManagement />
//                   </Layout>
//                 </ProtectedRoute>
//               }
//             />

//             {/* Unauthorized page */}
//             <Route 
//               path="/unauthorized" 
//               element={
//                 <div style={{ 
//                   padding: '4rem', 
//                   textAlign: 'center', 
//                   minHeight: '100vh',
//                   display: 'flex',
//                   flexDirection: 'column',
//                   justifyContent: 'center',
//                   alignItems: 'center',
//                   background: '#f8fafc'
//                 }}>
//                   <h1 style={{ fontSize: '3rem', color: '#dc2626' }}>Access Denied</h1>
//                   <p style={{ fontSize: '1.25rem', margin: '1rem 0 2rem', color: '#4b5563' }}>
//                     You don't have permission to view this page.
//                   </p>
//                   <Link 
//                     to="/dashboard" 
//                     style={{ 
//                       padding: '0.75rem 1.5rem', 
//                       background: '#1e40af', 
//                       color: 'white', 
//                       borderRadius: '8px', 
//                       textDecoration: 'none',
//                       fontWeight: '500'
//                     }}
//                   >
//                     Back to Dashboard
//                   </Link>
//                 </div>
//               } 
//             />

//           {/* 404 fallback */}
//           <Route path="*" element={
//             <div style={{ padding: '4rem', textAlign: 'center' }}>
//               <h1>404 - Page Not Found</h1>
//               <Link to="/dashboard">Back to Dashboard</Link>
//             </div>
//           } />
//         </Routes>
//       </AuthProvider>
//     </QueryClientProvider>
//   );
// }

// export default App;










































// import { Routes, Route } from "react-router-dom";
// import { Toaster } from 'react-hot-toast';
// import { useEffect } from "react";
// import { io } from "socket.io-client";
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { Link } from "react-router-dom";
// import MyProjects from "./pages/MyProjects";
// import Dashboard from "./pages/Dashboard";
// import Projects from "./pages/Projects";
// import Issues from "./pages/Issues";
// import UsersManagement from './pages/UserManagement';
// import ProtectedRoute from "./auth/ProtectedRoute";
// import Landing from './pages/Landing';
// import Layout from './components/Layout';
// import { AuthProvider } from "./auth/AuthContext";

// const socket = io('http://localhost:5000');

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 5 * 60 * 1000,
//       retry: 1,
//     },
//   },
// });

// function App() {
//   useEffect(() => {
//     // Listen for real-time issue updates
//     socket.on('issueCreated', () => {
//       queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
//       queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
//       console.log("Issue created → dashboard refreshed");
//     });

//     socket.on('issueUpdated', () => {
//       queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
//       queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
//       console.log("Issue updated → dashboard refreshed");
//     });

//     // Optional: general refresh
//     socket.on("dataUpdated", () => {
//       queryClient.invalidateQueries();
//       console.log("General data updated via socket");
//     });

//     // Cleanup
//     return () => {
//       socket.off('issueCreated');
//       socket.off('issueUpdated');
//       socket.off("dataUpdated");
//     };
//   }, [queryClient]);

//   return (
//     <QueryClientProvider client={queryClient}>
//       <AuthProvider>
//         <Toaster
//           position="top-center"
//           toastOptions={{
//             duration: 3000,
//             style: {
//               background: '#1e3a8a',
//               color: '#fff',
//               borderRadius: '12px',
//               padding: '1rem 1.5rem',
//               fontSize: '0.95rem',
//               fontWeight: '500',
//             },
//             success: { style: { background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' } },
//             error: { style: { background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' } },
//           }}
//         />

//         <Routes>
//           {/* Public landing */}
//           <Route path="/" element={<Landing />} />

//           {/* Protected routes with Layout (sidebar + header) */}
//           <Route
//             path="/dashboard"
//             element={
//               <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
//                 <Layout>
//                   <Dashboard />
//                 </Layout>
//               </ProtectedRoute>
//             }
//           />

//           {/* Tester & Developer: My Projects */}
//           <Route
//             path="/my-projects"
//             element={
//               <ProtectedRoute allowedRoles={["developer", "tester"]}>
//                 <Layout>
//                   <MyProjects />
//                 </Layout>
//               </ProtectedRoute>
//             }
//           />

//           {/* Admin only: All Projects */}
//           <Route
//             path="/projects"
//             element={
//               <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//                 <Layout>
//                   <Projects />
//                 </Layout>
//               </ProtectedRoute>
//             }
//           />

//           {/* Issues (all roles) */}
//           <Route
//             path="/issues"
//             element={
//               <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
//                 <Layout>
//                   <Issues />
//                 </Layout>
//               </ProtectedRoute>
//             }
//           />

//           {/* Admin: User Management */}
//           <Route
//             path="/users-management"
//             element={
//               <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//                 <Layout>
//                   <UsersManagement />
//                 </Layout>
//               </ProtectedRoute>
//             }
//           />

//           {/* Unauthorized / Access Denied page */}
//           <Route 
//             path="/unauthorized" 
//             element={
//               <div style={{ 
//                 padding: '4rem', 
//                 textAlign: 'center', 
//                 minHeight: '100vh',
//                 display: 'flex',
//                 flexDirection: 'column',
//                 justifyContent: 'center',
//                 alignItems: 'center',
//                 background: '#f8fafc'
//               }}>
//                 <h1 style={{ fontSize: '3rem', color: '#dc2626' }}>Access Denied</h1>
//                 <p style={{ fontSize: '1.25rem', margin: '1rem 0 2rem', color: '#4b5563' }}>
//                   You don't have permission to view this page.
//                 </p>
//                 <Link 
//                   to="/dashboard" 
//                   style={{ 
//                     padding: '0.75rem 1.5rem', 
//                     background: '#1e40af', 
//                     color: 'white', 
//                     borderRadius: '8px', 
//                     textDecoration: 'none',
//                     fontWeight: '500'
//                   }}
//                 >
//                   Back to Dashboard
//                 </Link>
//               </div>
//             } 
//           />

//           {/* Catch-all 404 */}
//           <Route 
//             path="*" 
//             element={
//               <div style={{ padding: '4rem', textAlign: 'center' }}>
//                 <h1>404 - Page Not Found</h1>
//                 <Link to="/dashboard">Back to Dashboard</Link>
//               </div>
//             } 
//           />
//         </Routes>
//       </AuthProvider>
//     </QueryClientProvider>
//   );
// }

// export default App;

// import { Routes, Route } from "react-router-dom";
// import { Toaster } from 'react-hot-toast';
// import { useEffect } from "react";
// import { io } from "socket.io-client";
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import MyProjects from "./pages/MyProjects";
// import Dashboard from "./pages/Dashboard";
// import Projects from "./pages/Projects";
// import Issues from "./pages/Issues";
// import UsersManagement from './pages/UserManagement';
// import ProtectedRoute from "./auth/ProtectedRoute";
// import Landing from './pages/Landing';
// import Layout from './components/Layout';
// import { AuthProvider } from "./auth/AuthContext";
// import { Link } from "react-router-dom";
// const socket = io('http://localhost:5000');

// const queryClient = new QueryClient({
//   defaultOptions: {
//     queries: {
//       staleTime: 5 * 60 * 1000,
//       retry: 1,
//     },
//   },
// });

// function App() {
//   useEffect(() => {
//     // Listen for issue changes
//     socket.on('issueCreated', () => {
//       queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
//       queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
//       console.log("Issue created → dashboard refreshed");
//     });

//     socket.on('issueUpdated', () => {
//       queryClient.invalidateQueries({ queryKey: ['dashboardCharts'] });
//       queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
//       console.log("Issue updated → dashboard refreshed");
//     });

//     // Optional: general data update
//     socket.on("dataUpdated", () => {
//       queryClient.invalidateQueries();
//       console.log("General data updated via socket");
//     });

//     // Cleanup on unmount
//     return () => {
//       socket.off('issueCreated');
//       socket.off('issueUpdated');
//       socket.off("dataUpdated");
//     };
//   }, [queryClient]);  // ← dependency

//   return (
//     <QueryClientProvider client={queryClient}>
//       <AuthProvider>
//         <Toaster
//           position="top-center"
//           toastOptions={{
//             duration: 3000,
//             style: {
//               background: '#1e3a8a',
//               color: '#fff',
//               borderRadius: '12px',
//               padding: '1rem 1.5rem',
//               fontSize: '0.95rem',
//               fontWeight: '500',
//             },
//             success: { style: { background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' } },
//             error: { style: { background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' } },
//           }}
//         />

//         <Routes>
//           <Route path="/" element={<Landing />} />

//           <Route
//             path="/dashboard"
//             element={
//               <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester", "general"]}>
//                 <Layout><Dashboard /></Layout>
//               </ProtectedRoute>
//             }
//           />

//           <Route
//             path="/projects"
//             element={
//               <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//                 <Layout><Projects /></Layout>
//               </ProtectedRoute>
//             }
//           />

//           <Route
//             path="/issues"
//             element={
//               <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
//                 <Layout><Issues /></Layout>
//               </ProtectedRoute>
//             }
//           />

//           <Route
//             path="/users-management"
//             element={
//               <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//                 <Layout><UsersManagement /></Layout>
//               </ProtectedRoute>
//             }
//           />
//           <Route 
//             path="/my-projects" 
//             element={
//               <ProtectedRoute>
//                 <MyProjects />
//               </ProtectedRoute>
//             } 
//           />
//           <Route path="/my-projects" element={<ProtectedRoute><MyProjects /></ProtectedRoute>} />
//           <Route path="/unauthorized" element={<div style={{ padding: '2rem', textAlign: 'center' }}><h1>Access Denied</h1><p>You don't have permission for this page. <Link to="/dashboard">Back to Dashboard</Link></p></div>} />
//         </Routes>
//       </AuthProvider>
//     </QueryClientProvider>
//   );
// }

// export default App;




























































































// import { Routes, Route } from "react-router-dom";
// import Dashboard from "./pages/Dashboard";
// import Projects from "./pages/Projects";
// import Issues from "./pages/Issues";
// import UsersManagement from './pages/UserManagement';
// import ProtectedRoute from "./auth/ProtectedRoute";
// import Landing from './pages/Landing';

// function App() {
//   return (
//     <Routes>
//       <Route path="/" element={<Landing />} />
      
//       <Route
//         path="/users-management"
//         element={
//           <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//             <UsersManagement />
//           </ProtectedRoute>
//         }
//       />
      
//       <Route
//         path="/dashboard"
//         element={
//           <ProtectedRoute
//             allowedRoles={["superadmin", "admin", "developer", "tester", "general"]}
//           >
//             <Dashboard />
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/projects"
//         element={
//           <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//             <Projects />
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/issues"
//         element={
//           <ProtectedRoute
//             allowedRoles={["superadmin", "admin", "developer", "tester"]}
//           >
//             <Issues />
//           </ProtectedRoute>
//         }
//       />
//     </Routes>
//   );
// }

// export default App;









// import UsersManagement from './pages/UserManagement';
// import { Routes, Route } from "react-router-dom";
// import Dashboard from "./pages/Dashboard";
// import Projects from "./pages/Projects";
// import Issues from "./pages/Issues";
// import ProtectedRoute from "./auth/ProtectedRoute";
// import Landing from './pages/Landing';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// const queryClient = new QueryClient();

// function App() {
//   return (
//     <Routes>
//       <Route path="/" element={<Landing />} /> // ← only one
//       <Route path="/users-management" element={<ProtectedRoute allowedRoles={["superadmin", "admin"]}><UsersManagement /></ProtectedRoute>} />
//       <Route
//         path="/dashboard"
//         element={
//           <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester", "general"]}>
//             <Dashboard />
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/projects"
//         element={
//           <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//             <Projects />
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/issues"
//         element={
//           <ProtectedRoute allowedRoles={["superadmin", "admin", "developer", "tester"]}>
//             <Issues />
//           </ProtectedRoute>
//         }
//       />
//     </Routes>
//   );
// }

// export default App;






// import UsersManagement from './pages/UserManagement';
// import { Routes, Route } from "react-router-dom";
// import Login from "./pages/Login";
// import Dashboard from "./pages/Dashboard";
// import Projects from "./pages/Projects";
// import Issues from "./pages/Issues";
// import ProtectedRoute from "./auth/ProtectedRoute";
// import Landing from './pages/Landing';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// const queryClient = new QueryClient();

// // In render:

// function App() {
//   return (
//     <Routes>
//       {/* <Route path="/" element={<Login />} />
//     // ... existing */}
//       <Route path="/" element={<Landing />} />
//       <Route path="/users-management" element={<ProtectedRoute allowedRoles={["SuperAdmin", "Admin"]}><UsersManagement /></ProtectedRoute>} />
//       <Route
//         path="/dashboard"
//         element={
//           <ProtectedRoute
//             allowedRoles={[
//               "superadmin",
//               "admin",
//               "developer",
//               "tester",
//               "general",
//             ]}
//           >
//             <Dashboard />
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/projects"
//         element={
//           <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
//             <Projects />
//           </ProtectedRoute>
//         }
//       />

//       <Route
//         path="/issues"
//         element={
//           <ProtectedRoute
//             allowedRoles={["superadmin", "admin", "developer", "tester"]}
//           >
//             <Issues />
//           </ProtectedRoute>
//         }
//       />
//     </Routes>
//   );
// }

// export default App;