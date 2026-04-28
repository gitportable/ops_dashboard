import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem("role");
    return saved ? saved.toLowerCase() : null;
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) return JSON.parse(saved);
      const savedRole = localStorage.getItem("role");
      return savedRole ? { role: savedRole.toLowerCase() } : null;
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
    setLoading(false);
    const handleStorage = () => {
      const savedRole = localStorage.getItem("role");
      setRole(savedRole ? savedRole.toLowerCase() : null);
      try {
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser(savedRole ? { role: savedRole.toLowerCase() } : null);
        }
      } catch {
        setUser(null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ role, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
