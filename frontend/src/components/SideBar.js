// import { useContext } from 'react';
// import { NavLink, useNavigate } from 'react-router-dom';
// import { motion, AnimatePresence } from 'framer-motion';
// import { AuthContext } from '../auth/AuthContext';
// import {
//   FiHome, FiBriefcase, FiAlertCircle, FiUsers,
//   FiLogOut, FiMenu, FiX, FiZap, FiPieChart, 
//   FiActivity, FiDollarSign, FiCheckSquare, FiFileText, FiList,filtereddNavItems,
// } from 'react-icons/fi'; // Added missing icons
// import { toast } from 'react-hot-toast';
// import { Link } from 'react-router-dom';
// const Sidebar = ({ collapsed, setCollapsed }) => {
//   const { role, logout } = useContext(AuthContext);
//   const navigate = useNavigate();
//   const currentRole = (role || '').toLowerCase();
//   const handleLogout = () => {
//     toast.success('Logged out successfully');
//     logout();
//     navigate('/');
//   };
//   const menuConfig = {
//   superadmin: [
//     { label: 'Dashboard', path: '/dashboard', icon: <FiPieChart /> },
//     { label: 'Manage Users', path: '/users-management', icon: <FiUsers /> },
//     { label: 'System Health', path: '/system-logs', icon: <FiActivity /> }, // New Page
//     { label: 'All Projects', path: '/projects', icon: <FiBriefcase /> },
//   ],
//   admin: [
//     { label: 'Dashboard', path: '/dashboard', icon: <FiPieChart /> },
//     { label: 'Project Budgeting', path: '/budgeting', icon: <FiDollarSign /> }, // New Page
//     { label: 'Resource Load', path: '/resources', icon: <FiUsers /> }, // New Page
//     { label: 'Issues', path: '/issues', icon: <FiAlertCircle /> },
//   ],
//   tester: [
//     { label: 'My Dashboard', path: '/dashboard', icon: <FiPieChart /> },
//     { label: 'QA Queue', path: '/issues', icon: <FiCheckSquare /> },
//     { label: 'Bug Reports', path: '/reports', icon: <FiFileText /> }, // New Page
//     { label: 'My Projects', path: '/my-projects', icon: <FiBriefcase /> },
//   ],
//   developer: [
//     { label: 'Workboard', path: '/dashboard', icon: <FiPieChart /> },
//     { label: 'My Tasks', path: '/issues', icon: <FiList /> },
//     { label: 'Sprint Velocity', path: '/velocity', icon: <FiZap /> }, // New Page
//   ]
// };
//   const navItems =menuConfig[currentRole] || []; 
//   //   { 
//   //     path: '/dashboard', 
//   //     icon: FiHome, 
//   //     label: 'Dashboard', 
//   //     roles: ['superadmin', 'admin', 'developer', 'tester', 'general'] 
//   //   },
//   //   { 
//   //     path: '/projects', 
//   //     icon: FiBriefcase, 
//   //     label: 'Projects', 
//   //     roles: ['superadmin', 'admin'] 
//   //   },
//   //   { 
//   //     path: '/issues', 
//   //     icon: FiAlertCircle, 
//   //     label: 'Issues', 
//   //     roles: ['superadmin', 'admin', 'developer', 'tester'] 
//   //   },
//   //   { 
//   //   path: '/my-projects', // This points to the "My Assigned Projects" view
//   //   icon: FiBriefcase, 
//   //   label: 'My Projects', 
//   //   roles: ['developer', 'tester'] 
//   //   },
//   //   { 
//   //     path: '/users-management', 
//   //     icon: FiUsers, 
//   //     label: 'User Management', 
//   //     roles: ['superadmin', 'admin'] 
//   //   },
//   // ];
//   // if (currentRole === 'tester') {
//   //   navItems.push({ path: '/my-projects', icon: FiBriefcase, label: 'My Assigned Projects', roles: ['tester'] });
//   //   navItems.push({ path: '/qa-issues', icon: FiZap, label: 'QA Issues', roles: ['tester'] });
//   // }

//   // // Developer-specific items
//   // if (currentRole === 'developer') {
//   //   navItems.push({ path: '/my-projects', icon: FiBriefcase, label: 'My Assigned Projects', roles: ['developer'] });
//   //   navItems.push({ path: '/dev-issues', icon: FiZap, label: 'Dev Issues', roles: ['developer'] });
//   // }

//   // // Admin/superadmin-specific
//   // if (['admin', 'superadmin'].includes(currentRole)) {
//   //   navItems.push({ path: '/projects', icon: FiBriefcase, label: 'All Projects', roles: ['admin', 'superadmin'] });
//   //   navItems.push({ path: '/users-management', icon: FiUsers, label: 'Manage Users', roles: ['admin', 'superadmin'] });
//   // }
//   // const filteredNavItems = navItems.filter(item => 
//   //   item.roles.includes(role?.toLowerCase())
//   // );

//   return (
//     <motion.div
//     initial={{ x: -280 }}
//     animate={{ x: 0, width: collapsed ? 80 : 280 }}
//     transition={{ type: "spring", stiffness: 280, damping: 28 }}
//     style={{
//       position: "fixed",
//       left: 0,
//       top: 0,
//       height: "100vh",
//       background: "linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)",
//       backdropFilter: "blur(10px)",           // ← glassmorphism hint
//       WebkitBackdropFilter: "blur(10px)",
//       borderRight: "1px solid rgba(255,255,255,0.08)",
//       boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
//       zIndex: 1200,
//       overflow: "hidden",
//     }}
//     >
//       {/* Header */}
//       <div style={{
//         padding: '2rem 1.5rem',
//         borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//       }}>
//         <AnimatePresence>
//           {!collapsed && (
//             <motion.div
//               initial={{ opacity: 0, x: -20 }}
//               animate={{ opacity: 1, x: 0 }}
//               exit={{ opacity: 0, x: -20 }}
//               style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '1rem',
//                 fontSize: '1.5rem',
//                 fontWeight: '800',
//               }}
//             >
//               <FiZap style={{ fontSize: '2rem', color: '#fbbf24' }} />
//               <span style={{
//                 background: 'linear-gradient(135deg, #fbbf24 0%, #ffffff 100%)',
//                 WebkitBackgroundClip: 'text',
//                 WebkitTextFillColor: 'transparent',
//               }}>
//                 OpsDash
//               </span>
//             </motion.div>
//           )}
//         </AnimatePresence>
        
//         <button
//           onClick={() => setCollapsed(!collapsed)}
//           style={{
//             background: 'rgba(251, 191, 36, 0.15)',
//             border: '1px solid rgba(251, 191, 36, 0.3)',
//             color: '#fbbf24',
//             width: '36px',
//             height: '36px',
//             borderRadius: '8px',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             cursor: 'pointer',
//             transition: 'all 0.3s ease',
//             fontSize: '1.125rem',
//           }}
//           onMouseEnter={(e) => {
//             e.target.style.background = 'rgba(251, 191, 36, 0.25)';
//             e.target.style.borderColor = 'rgba(251, 191, 36, 0.5)';
//           }}
//           onMouseLeave={(e) => {
//             e.target.style.background = 'rgba(251, 191, 36, 0.15)';
//             e.target.style.borderColor = 'rgba(251, 191, 36, 0.3)';
//           }}
//         >
//           {collapsed ? <FiMenu /> : <FiX />}
//         </button>
//       </div>

//       {/* Navigation */}
//       <nav style={{
//         flex: 1,
//         padding: '1.5rem 1rem',
//         overflowY: 'auto',
//       }}>
//         {filteredNavItems.map((item) => (
//           <NavLink
//             key={item.path}
//             to={item.path}
//             className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
//             style={({ isActive }) => ({
//               display: 'flex',
//               alignItems: 'center',
//               gap: '1rem',
//               padding: '1rem 1.25rem',
//               marginBottom: '0.5rem',
//               borderRadius: '12px',
//               color: isActive ? '#1e3a8a' : 'rgba(255, 255, 255, 0.8)',
//               textDecoration: 'none',
//               transition: 'all 0.3s ease',
//               position: 'relative',
//               background: isActive 
//                 ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' 
//                 : 'transparent',
//               fontWeight: isActive ? '600' : '500',
//               boxShadow: isActive ? '0 4px 12px rgba(251, 191, 36, 0.3)' : 'none',
//             })}
//             onMouseEnter={(e) => {
//               if (!e.currentTarget.classList.contains('active')) {
//                 e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
//               }
//             }}
//             onMouseLeave={(e) => {
//               if (!e.currentTarget.classList.contains('active')) {
//                 e.currentTarget.style.background = 'transparent';
//               }
//             }}
//           >
//             <item.icon style={{ fontSize: '1.25rem', minWidth: '24px' }} />
//             <AnimatePresence>
//               {!collapsed && (
//                 <motion.span
//                   initial={{ opacity: 0, x: -10 }}
//                   animate={{ opacity: 1, x: 0 }}
//                   exit={{ opacity: 0, x: -10 }}
//                 >
//                   {item.label}
//                 </motion.span>
//               )}
//             </AnimatePresence>
//           </NavLink>
//         ))}
//       </nav>
//   {/* Logo / Brand with hover scale */}
//   <motion.div
//     className="logo-area"
//     initial={{ opacity: 0, scale: 0.8 }}
//     animate={{ opacity: 1, scale: 1 }}
//     transition={{ delay: 0.2 }}
//     whileHover={{ scale: 1.06 }}
//     style={{
//       padding: "1.5rem 1rem",
//       display: "flex",
//       alignItems: "center",
//       gap: "0.75rem",
//       cursor: "pointer",
//     }}
//     onClick={() => navigate("/dashboard")}
//   >
//     <FiZap size={collapsed ? 28 : 36} color="#fbbf24" />
//     {!collapsed && (
//       <motion.span
//         initial={{ opacity: 0, x: -10 }}
//         animate={{ opacity: 1, x: 0 }}
//         transition={{ delay: 0.3 }}
//         style={{ fontWeight: 800, fontSize: "1.4rem", color: "#fff" }}
//       >
//         H-care
//       </motion.span>
//     )}
//   </motion.div>
// {(currentRole === 'tester' || currentRole === 'developer') && (
//   <li>
//     <Link to="/my-projects">
//       My Assigned Projects
//     </Link>
//   </li>
// )}
//   {/* Nav items – stagger children + hover glow */}
//   <motion.nav
//     initial="hidden"
//     animate="visible"
//     variants={{
//       hidden: { opacity: 0 },
//       visible: {
//         opacity: 1,
//         transition: { staggerChildren: 0.07, delayChildren: 0.2 }
//       }
//     }}
//     style={{ padding: "1rem 0" }}
//   >
//     {filteredNavItems.map((item) => (
//       <motion.div
//         key={item.path}
//         variants={{
//           hidden: { opacity: 0, x: -20 },
//           visible: { opacity: 1, x: 0 }
//         }}
//         whileHover={{ scale: 1.04, x: 6 }}
//         whileTap={{ scale: 0.97 }}
//       >
//         <NavLink
//           to={item.path}
//           className={({ isActive }) => 
//             `nav-item ${isActive ? 'active' : ''}`
//           }
//           // optional: also style based on active state
//           style={({ isActive }) => ({
//             color: isActive ? '#fbbf24' : '#dbeafe',
//             background: isActive ? 'rgba(251,191,36,0.18)' : 'transparent',
//             display: "flex",
//             alignItems: "center",
//             gap: "1rem",
//             padding: "1rem 1.25rem",
//             textDecoration: "none",
//             borderRadius: "0 16px 16px 0",
//             margin: "0.25rem 0",
//             transition: "all 0.2s ease",
//           })}
//         >
//           <item.icon size={24} />
//           {!collapsed && <span>{item.label}</span>} 
//           #{/* Show label only when not collapsed */}
//         </NavLink>
//       </motion.div>
//     ))}
//   </motion.nav>
//       {/* Footer - User Info & Logout */}
//       <div style={{
//         padding: '1.5rem 1rem',
//         borderTop: '1px solid rgba(255, 255, 255, 0.1)',
//       }}>
//         <AnimatePresence>
//           {!collapsed && (
//             <motion.div
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: 10 }}
//               style={{
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '1rem',
//                 marginBottom: '1rem',
//                 padding: '0.75rem',
//                 background: 'rgba(255, 255, 255, 0.05)',
//                 borderRadius: '12px',
//                 border: '1px solid rgba(255, 255, 255, 0.1)',
//               }}
//             >
//               <div style={{
//                 width: '40px',
//                 height: '40px',
//                 borderRadius: '50%',
//                 background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//                 fontWeight: '700',
//                 fontSize: '1.125rem',
//                 color: '#1e3a8a',
//                 boxShadow: '0 4px 8px rgba(251, 191, 36, 0.3)',
//               }}>
//                 {role?.charAt(0).toUpperCase()}
//               </div>
//               <div style={{ flex: 1, minWidth: 0 }}>
//                 <div style={{
//                   fontWeight: '600',
//                   fontSize: '0.9rem',
//                   color: 'white',
//                   overflow: 'hidden',
//                   textOverflow: 'ellipsis',
//                   whiteSpace: 'nowrap',
//                 }}>
//                   User
//                 </div>
//                 <div style={{
//                   fontSize: '0.75rem',
//                   color: '#fbbf24',
//                   textTransform: 'capitalize',
//                   overflow: 'hidden',
//                   textOverflow: 'ellipsis',
//                   whiteSpace: 'nowrap',
//                 }}>
//                   {role}
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
        
//         <button
//           onClick={handleLogout}
//           style={{
//             width: '100%',
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center',
//             gap: '0.75rem',
//             padding: '0.75rem',
//             background: 'rgba(239, 68, 68, 0.15)',
//             border: '1px solid rgba(239, 68, 68, 0.3)',
//             color: '#fca5a5',
//             borderRadius: '8px',
//             cursor: 'pointer',
//             transition: 'all 0.3s ease',
//             fontWeight: '600',
//             fontSize: '0.95rem',
//           }}
//           onMouseEnter={(e) => {
//             e.target.style.background = 'rgba(239, 68, 68, 0.25)';
//             e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
//           }}
//           onMouseLeave={(e) => {
//             e.target.style.background = 'rgba(239, 68, 68, 0.15)';
//             e.target.style.borderColor = 'rgba(239, 68, 68, 0.3)';
//           }}
//         >
//           <FiLogOut />
//           {!collapsed && <span>Logout</span>}
//         </button>
//       </div>
//     </motion.div>
//   );
// };

// export default Sidebar;





import { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../auth/AuthContext';
import {
  FiHome, FiBriefcase, FiAlertCircle, FiUsers,
  FiLogOut, FiMenu, FiX, FiZap, FiPieChart, 
  FiActivity, FiDollarSign, FiCheckSquare, FiFileText, FiList
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const Sidebar = ({ collapsed, setCollapsed }) => {
  const { role, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const currentRole = (role || '').toLowerCase();

  const handleLogout = () => {
    toast.success('Logged out successfully');
    logout();
    navigate('/');
  };

  // 1. Define Menu Configuration per role
  const menuConfig = {
    superadmin: [
      { label: 'Dashboard', path: '/dashboard', icon: FiPieChart },
      { label: 'Manage Users', path: '/users-management', icon: FiUsers },
      { label: 'System Health', path: '/audit-logs', icon: FiActivity },
      { label: 'All Projects', path: '/projects', icon: FiBriefcase },
    ],
    admin: [
      { label: 'Dashboard', path: '/dashboard', icon: FiPieChart },
      { label: 'Resource Load', path: '/resource-allocation', icon: FiUsers },
      { label: 'All Projects', path: '/projects', icon: FiBriefcase },
      { label: 'Issues', path: '/issues', icon: FiAlertCircle },
    ],
    tester: [
      { label: 'My Dashboard', path: '/dashboard', icon: FiPieChart },
      { label: 'QA Queue', path: '/issues', icon: FiCheckSquare },
      { label: 'My Projects', path: '/my-projects', icon: FiBriefcase },
      { label: 'Roadmap', path: '/roadmap', icon: FiFileText },
    ],
    developer: [
      { label: 'Workboard', path: '/dashboard', icon: FiPieChart },
      { label: 'My Tasks', path: '/issues', icon: FiList },
      { label: 'My Projects', path: '/my-projects', icon: FiBriefcase },
      { label: 'Roadmap', path: '/roadmap', icon: FiZap },
    ]
  };

  // 2. Define the variable the JSX is looking for
  // This maps the current role to the menu config above
  const filteredNavItems = menuConfig[currentRole] || [];

  return (
    <motion.div
      initial={{ x: -280 }}
      animate={{ x: 0, width: collapsed ? 80 : 280 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        background: "linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
        zIndex: 1200,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Header */}
      <div style={{
        padding: '2rem 1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.5rem', fontWeight: '800' }}
            >
              <FiZap style={{ fontSize: '2rem', color: '#fbbf24' }} />
              <span style={{ color: '#fff' }}>OpsDash</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#fbbf24',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {collapsed ? <FiMenu /> : <FiX />}
        </button>
      </div>

      {/* Navigation - Using filteredNavItems */}
      <nav style={{ flex: 1, padding: '1.5rem 1rem', overflowY: 'auto' }}>
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              marginBottom: '0.5rem',
              borderRadius: '12px',
              color: isActive ? '#1e3a8a' : 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              background: isActive ? '#fbbf24' : 'transparent',
              fontWeight: isActive ? '600' : '500',
            })}
          >
            <item.icon style={{ fontSize: '1.25rem', minWidth: '24px' }} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '1.5rem 1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        {!collapsed && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px', color: '#fff' }}>
            <div style={{ fontSize: '0.75rem', color: '#fbbf24', textTransform: 'uppercase' }}>{role}</div>
            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Project Member</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          <FiLogOut />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </motion.div>
  );
};

export default Sidebar;