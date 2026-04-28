import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;

  const role = user?.role?.toLowerCase();

  if (!role) {
    return <Navigate to="/" replace />;
  }

  const normalizedAllowed = (allowedRoles || []).map((r) =>
    r.toString().toLowerCase()
  );

  if (!normalizedAllowed.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
