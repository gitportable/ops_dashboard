import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ColorModeProvider({ children }) {
  // Try to read from localStorage or system preference
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('color-mode');
    if (saved) return saved;
    
    // Check system preference
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('color-mode', mode);
    document.documentElement.setAttribute('data-theme', mode);
    // You can also toggle class on <body> or <html> if preferred
    // document.body.className = mode;
  }, [mode]);

  const toggleColorMode = () => {
    setMode(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use anywhere in the app
export const useColorMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useColorMode must be used within ColorModeProvider');
  }
  return context;
};