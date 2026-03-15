// import { createContext, useState, useEffect } from "react";

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   // Initialize from localStorage
//   const [role, setRole] = useState(() => {
//     const savedRole = localStorage.getItem("role");
//     console.log("AuthProvider initializing with role from localStorage:", savedRole);
//     return savedRole;
//   });

//   const login = (token, newRole) => {
//     console.log("AuthContext.login called with:", { token, role: newRole });
//     localStorage.setItem("token", token);
//     const normalizedRole = newRole.toLowerCase();
//     localStorage.setItem("role", normalizedRole);
//     setRole(normalizedRole);
//   };

//   const logout = () => {
//     console.log("AuthContext.logout called");
//     localStorage.clear();
//     setRole(null);
//   };

//   // Debug: log whenever role changes
//   useEffect(() => {
//     console.log("AuthContext role updated to:", role);
//   }, [role]);

//   return (
//     <AuthContext.Provider value={{ role, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };
import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Use a function to initialize state so it only runs once
  const [role, setRole] = useState(() => {
    const savedRole = localStorage.getItem("role");
    // Normalize immediately if it exists
    return savedRole ? savedRole.toLowerCase() : null;
  });

  const login = (token, newRole) => {
    const normalizedRole = newRole.toLowerCase();
    localStorage.setItem("token", token);
    localStorage.setItem("role", normalizedRole);
    setRole(normalizedRole);
    console.log("AuthContext: Login successful for role:", normalizedRole);
  };

  const logout = () => {
    localStorage.clear();
    setRole(null);
    console.log("AuthContext: User logged out");
  };

  return (
    <AuthContext.Provider value={{ role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};



























































// import { createContext, useState } from "react";

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [role, setRole] = useState(localStorage.getItem("role") || null); // ← simplify to role only

//   const login = (token, newRole) => {
//     localStorage.setItem("token", token);
//     localStorage.setItem("role", newRole);
//     setRole(newRole);
//   };

//   const logout = () => {
//     localStorage.clear();
//     setRole(null);
//   };

//   return (
//     <AuthContext.Provider value={{ role, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };








// import { createContext, useState } from "react";

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState({
//     role: localStorage.getItem("role"),
//   });

//   const login = (token, role) => {
//     localStorage.setItem("token", token);
//     const lowerRole = role.toLowerCase();
//     localStorage.setItem("role", role);
//     setUser({ role });
//   };

//   const logout = () => {
//     localStorage.clear();
//     setUser(null);
//   };

//   return (
//     <AuthContext.Provider value={{ user, login, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };
