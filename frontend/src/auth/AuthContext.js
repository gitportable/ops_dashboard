import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
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
  const logout = () => {
    localStorage.clear();
    setRole(null);
    setUser(null);
  };

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
