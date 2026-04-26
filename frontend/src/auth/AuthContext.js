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
  // ── State ────────────────────────────────────────────────────────────────
  // Expose BOTH role (string) and user (object) so all components work:
  //   - role  → used by ProtectedRoute, Sidebar, IssueTable* role checks
  //   - user  → used by BudgetEditor, components that need userId / name
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem("role");
    return saved ? saved.toLowerCase() : null;
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // ── login ────────────────────────────────────────────────────────────────
  // Call this from your Landing / Login page after a successful API response.
  //
  // Expected API response shape:
  //   { token: "...", role: "admin", user: { id, name, email, role } }
  //
  // Fix for "admin cannot login": make sure your backend login handler returns
  // role as a lowercase string ("admin", not "Admin" or "ADMIN").
  // And ensure the DB column for that user has role = 'admin'.
  // const login = (token, newRole, userData = null) => {
  //   const normalizedRole = (newRole || "").toLowerCase();

  //   localStorage.setItem("token", token);
  //   localStorage.setItem("role", normalizedRole);

  //   const userObj = userData
  //     ? { ...userData, role: normalizedRole }
  //     : { role: normalizedRole };

  //   localStorage.setItem("user", JSON.stringify(userObj));

  //   setRole(normalizedRole);
  //   setUser(userObj);
  // };
  const login = (token, newRole, userData = null) => {
  const normalizedRole = (newRole || "").toLowerCase();

  localStorage.setItem("token", token);
  localStorage.setItem("role", normalizedRole);

  const userObj = userData 
    ? { ...userData, role: normalizedRole } 
    : { role: normalizedRole };

  localStorage.setItem("user", JSON.stringify(userObj));

  setRole(normalizedRole);
  setUser(userObj);
};

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.clear();
    setRole(null);
    setUser(null);
  };

  // ── Keep role + user in sync if localStorage changes (e.g. another tab) ─
  useEffect(() => {
    const handleStorage = () => {
      const savedRole = localStorage.getItem("role");
      setRole(savedRole ? savedRole.toLowerCase() : null);
      try {
        const savedUser = localStorage.getItem("user");
        setUser(savedUser ? JSON.parse(savedUser) : null);
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ role, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

































// import { createContext, useState, useEffect } from "react";

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   // Use a function to initialize state so it only runs once
//   const [role, setRole] = useState(() => {
//     const savedRole = localStorage.getItem("role");
//     // Normalize immediately if it exists
//     return savedRole ? savedRole.toLowerCase() : null;
//   });

//   const login = (token, newRole) => {
//     const normalizedRole = newRole.toLowerCase();
//     localStorage.setItem("token", token);
//     localStorage.setItem("role", normalizedRole);
//     setRole(normalizedRole);
//     console.log("AuthContext: Login successful for role:", normalizedRole);
//   };

//   const logout = () => {
//     localStorage.clear();
//     setRole(null);
//     console.log("AuthContext: User logged out");
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
