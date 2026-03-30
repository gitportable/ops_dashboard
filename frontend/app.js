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
          success: {
            style: { background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          },
          error: {
            style: { background: "linear-gradient(135deg,#dc2626,#991b1b)" },
          },
        }}
      />

      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["superadmin", "admin", "developer", "tester"]}
            >
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

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
            <ProtectedRoute
              allowedRoles={["superadmin", "admin", "developer", "tester"]}
            >
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
            <ProtectedRoute
              allowedRoles={["superadmin", "admin", "developer", "tester"]}
            >
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

        <Route
          path="/unauthorized"
          element={
            <div
              style={{
                padding: "4rem",
                textAlign: "center",
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <h1 style={{ fontSize: "3rem", color: "#dc2626" }}>
                Access Denied
              </h1>
              <p
                style={{
                  fontSize: "1.25rem",
                  margin: "1rem 0 2rem",
                  color: "#4b5563",
                }}
              >
                You don't have permission to view this page.
              </p>
              <Link
                to="/dashboard"
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#1e40af",
                  color: "white",
                  borderRadius: "8px",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                Back to Dashboard
              </Link>
            </div>
          }
        />

        <Route
          path="*"
          element={
            <div style={{ padding: "4rem", textAlign: "center" }}>
              <h1>404 – Page Not Found</h1>
              <Link to="/dashboard">Back to Dashboard</Link>
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
