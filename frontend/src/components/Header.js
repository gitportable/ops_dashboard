import { useState, useContext } from "react";
import { Box, Switch, Typography, Avatar, IconButton, Menu, MenuItem, Divider } from "@mui/material";
import { AuthContext } from "../auth/AuthContext";
import { useColorMode } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { mode, toggle } = useColorMode();
  const { user, role, logout } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const displayName = user?.name || role || "User";
  const displayRole = (role || user?.role || "").toLowerCase();
  const initials = displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate("/");
  };

  return (
    <Box sx={{
      display: "flex", alignItems: "center", justifyContent: "flex-end",
      gap: 1.5, px: 3, py: 1.5,
      borderBottom: "1px solid", borderColor: "divider",
      bgcolor: "background.paper", position: "sticky", top: 0, zIndex: 100,
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.78rem" }}>
          {mode === "dark" ? "Dark" : "Light"}
        </Typography>
        <Switch size="small" checked={mode === "dark"} onChange={toggle} />
      </Box>
      <Box sx={{
        px: 1.25, py: 0.25, borderRadius: 99, fontSize: "0.72rem", fontWeight: 700,
        bgcolor: "#eff6ff", color: "#1e40af", textTransform: "capitalize", border: "1px solid #bfdbfe",
      }}>
        {displayRole}
      </Box>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ p: 0 }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: "#1e40af", fontSize: "0.8rem", fontWeight: 700 }}>
          {initials}
        </Avatar>
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { minWidth: 180, borderRadius: 2, mt: 1 } }}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>{displayName}</Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", textTransform: "capitalize" }}>
            {displayRole}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: "#dc2626", fontSize: "0.9rem" }}>Logout</MenuItem>
      </Menu>
    </Box>
  );
};

export default Header;
// import { useTheme } from '@mui/material/styles';
// import { Switch } from '@mui/material';

// const Header = () => {
//   const theme = useTheme();
//   const [mode, setMode] = useState(theme.palette.mode);

//   const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');  // Update theme provider state

//   return (
//     <Box sx={{ display: 'flex', justifyContent: 'end' }}>
//       <Switch checked={mode === 'dark'} onChange={toggleMode} />
//       Dark Mode
//     </Box>
//   );
// };