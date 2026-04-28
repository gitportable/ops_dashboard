import React, { useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { io } from "socket.io-client";
import { Toaster } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Issues from "./pages/Issues";
import MyTasks from "./pages/MyTasks";
import QAQueue from "./pages/QAQueue";
import MyProjects from "./pages/MyProjects";
import ApprovalQueue from "./pages/ApprovalQueue";
import UsersManagement from "./pages/UserManagement";
import ProtectedRoute from "./auth/ProtectedRoute";
import Landing from "./pages/Landing";
import Layout from "./components/Layout";
import ResourceAllocation from "./pages/ResourceAllocation";
import AuditLogs from "./pages/AuditLogs";
import MyRoadmap from "./pages/MyRoadmap";
import ProjectDetail from "./pages/ProjectDetail";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import WorkOrders from "./pages/WorkOrders";
import BatchTracking from "./pages/BatchTracking";
import VendorManagement from "./pages/VendorManagement";
import KPIDashboard from "./pages/KPIDashboard";
import InventoryAlerts from "./pages/InventoryAlerts";
import POTracking from "./pages/POTracking";
import DefectAnalytics from "./pages/DefectAnalytics";
import FieldService from "./pages/FieldService";
import MachineRegistry from "./pages/MachineRegistry";
import MyKanban from "./pages/MyKanban";
import CapaManagement from "./pages/CapaManagement";
import CreateIssue from "./pages/CreateIssue";
import SprintPlanning from "./pages/SprintPlanning";
import IssueDetails from "./pages/IssueDetails";

const socket = io("http://localhost:5000");

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
          path="/issues/new"
          element={
            <ProtectedRoute allowedRoles={["admin", "superadmin", "developer"]}>
              <CreateIssue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/issues/:id"
          element={
            <ProtectedRoute allowedRoles={["admin", "superadmin", "developer", "tester"]}>
              <IssueDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-tasks"
          element={
            <ProtectedRoute allowedRoles={["developer", "tester"]}>
              <Layout>
                <MyTasks />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/qa-queue"
          element={
            <ProtectedRoute allowedRoles={["tester"]}>
              <Layout>
                <QAQueue />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/approval-queue"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "tester"]}>
              <Layout>
                <ApprovalQueue />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users-management"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <Layout>
                <UsersManagement />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/resource-allocation"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
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
          path="/workflow-builder"
          element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <Layout>
                <WorkflowBuilder />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/work-orders"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout>
                <WorkOrders />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/batch-tracking"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout>
                <BatchTracking />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor-management"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout>
                <VendorManagement />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path='/po-tracking' element={
          <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
            <Layout>
              <POTracking />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path='/defect-analytics' element={
          <ProtectedRoute allowedRoles={['tester', 'admin', 'superadmin']}>
            <Layout>
              <DefectAnalytics />
            </Layout>
          </ProtectedRoute>
        } />

        <Route
          path="/kpi-dashboard"
          element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout>
                <KPIDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/field-service"
          element={
            <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
              <Layout>
                <FieldService />
              </Layout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/machines"
          element={
            <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
              <Layout>
                <MachineRegistry />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/roadmap"
          element={
            <ProtectedRoute allowedRoles={['developer', 'tester', 'admin', 'superadmin']}>
              <Layout>
                <MyRoadmap />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path='/inventory-alerts' element={
          <ProtectedRoute allowedRoles={['superadmin']}>
            <Layout>
              <InventoryAlerts />
            </Layout>
          </ProtectedRoute>
        } />

        <Route
          path="/my-kanban"
          element={
            <ProtectedRoute allowedRoles={["developer"]}>
              <Layout>
                <MyKanban />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/kanban/:projectId"
          element={
            <ProtectedRoute allowedRoles={["developer", "admin", "superadmin"]}>
              <Layout>
                <MyKanban />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sprint-planning/:projectId"
          element={
            <ProtectedRoute allowedRoles={["developer", "admin", "superadmin"]}>
              <Layout>
                <SprintPlanning />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path='/capa-management' element={
          <ProtectedRoute allowedRoles={['admin', 'superadmin', 'tester']}>
            <CapaManagement />
          </ProtectedRoute>
        } />

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
                Return to Dashboard
              </Link>
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
