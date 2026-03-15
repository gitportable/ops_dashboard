import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "./AuthContext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role } = useContext(AuthContext);
  
  console.log("ProtectedRoute rendering:", {
    path: window.location.pathname,
    roleFromContext: role,
    roleFromLocalStorage: localStorage.getItem("role"),
    allowedRoles
  }); 

  // Check both context and localStorage as fallback
  const currentRole = (role || localStorage.getItem("role") || "").toLowerCase();
  if (role === undefined) {  // initial loading state
  return <div>Loading authentication...</div>;}
  if (!currentRole) {
    console.log("No role found - redirecting to login");
    return <Navigate to="/" replace />;
  }

  const normalizedRole = currentRole.toString().toLowerCase();
  const normalizedAllowed = allowedRoles.map(r => r.toString().toLowerCase());

  console.log("ProtectedRoute access check:", {
    currentRole: normalizedRole,
    allowed: normalizedAllowed,
    hasAccess: normalizedAllowed.includes(normalizedRole)
  });

  if (!normalizedAllowed.includes(normalizedRole)) {
    console.log("Access denied - redirecting to unauthorized");
    return <Navigate to="/unauthorized" replace />;
  }

  console.log("Access granted - rendering protected content");
  return children;
};

export default ProtectedRoute;

// import { useContext } from "react";
// import { Navigate } from "react-router-dom";
// import { AuthContext } from "./AuthContext";

// const ProtectedRoute = ({ children, allowedRoles }) => {
//   const { user } = useContext(AuthContext); // ← changed to { user }
//   const role = user?.role; // ← get role from user object

//   if (!role) {
//     console.log("No role in context - redirecting to login");
//     return <Navigate to="/" replace />;
//   }

//   const normalizedRole = role.toString().toLowerCase();
//   const normalizedAllowed = allowedRoles.map(r => r.toString().toLowerCase());

//   console.log("ProtectedRoute check:", {
//     currentRole: normalizedRole,
//     allowed: normalizedAllowed,
//     hasAccess: normalizedAllowed.includes(normalizedRole)
//   });

//   if (!normalizedAllowed.includes(normalizedRole)) {
//     return <Navigate to="/unauthorized" replace />;
//   }

//   return children;
// };

// export default ProtectedRoute;
















// import { useContext } from "react";
// import { Navigate } from "react-router-dom";
// import { AuthContext } from "./AuthContext";

// const ProtectedRoute = ({ children, allowedRoles }) => {
//   const { role } = useContext(AuthContext);

//   if (!role) {
//     console.log("No role in context - redirecting to login");
//     return <Navigate to="/" replace />;
//   }

//   const normalizedRole = role.toString().toLowerCase(); // safe even if role is number/object
//   const normalizedAllowed = allowedRoles.map(r => r.toString().toLowerCase());

//   console.log("ProtectedRoute check:", {
//     currentRole: normalizedRole,
//     allowed: normalizedAllowed,
//     hasAccess: normalizedAllowed.includes(normalizedRole)
//   });

//   if (!normalizedAllowed.includes(normalizedRole)) {
//     return <Navigate to="/unauthorized" replace />;
//   }

//   return children;
// };
// console.log("ProtectedRoute is running for path:", window.location.pathname);
// console.log("Current role value:", role);
// export default ProtectedRoute;





// import { useContext } from "react";
// import { Navigate } from "react-router-dom";
// import { AuthContext } from "./AuthContext";

// const ProtectedRoute = ({ children, allowedRoles }) => {
//   const { role } = useContext(AuthContext).toLowerCase();
  
//   if (!role) return <Navigate to="/" />;

//   if (!allowedRoles.includes(role)) {
//     return <Navigate to="/unauthorized" />;
//   }

//   return children;
// };

// export default ProtectedRoute;
