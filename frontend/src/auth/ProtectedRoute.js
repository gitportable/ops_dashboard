import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role } = useContext(AuthContext);

  if (role === undefined) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", color: "#6b7280", fontFamily: "Inter, sans-serif",
        fontSize: "0.95rem",
      }}>
        Loading…
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  const normalizedRole = role.toLowerCase();
  const normalizedAllowed = (allowedRoles || []).map((r) =>
    r.toString().toLowerCase()
  );

  if (!normalizedAllowed.includes(normalizedRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
