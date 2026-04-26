// import { useState } from 'react';
// import Sidebar from './Sidebar';

// const Layout = ({ children }) => {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

//   return (
//     <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
//       <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
//       <div
//         style={{
//           flex: 1,
//           marginLeft: collapsed ? '80px' : '280px',
//           transition: 'margin-left 0.25s ease',
//           overflowY: 'auto',                 // ← prevents body scroll issues
//           background: '#f8fafc',
//           minHeight: '100vh',
//         }}
//       >
//         <main style={{ padding: '1.5rem 2rem' }}>   {/* ← better spacing */}
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// };

// export default Layout;
// import { useState } from 'react';
// import Sidebar from './Sidebar';           // make sure this import exists

// const Layout = ({ children }) => {
//   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

//   return (
//     <div style={{ display: 'flex', minHeight: '100vh' }}>
//       <Sidebar
//         collapsed={sidebarCollapsed}
//         setCollapsed={setSidebarCollapsed}
//       />
//       <div
//         style={{
//           flex: 1,
//           marginLeft: sidebarCollapsed ? '80px' : '280px',
//           transition: 'margin-left 0.3s ease',
//           overflowY: 'auto',
//           background: '#f8fafc',
//         }}
//       >
//         <main style={{ padding: '1.5rem 2rem' }}>
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// };

// export default Layout;
import { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    // height:100vh (not minHeight) so child pages that use height:100% work correctly
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div
        style={{
          flex: 1,
          marginLeft: sidebarCollapsed ? '80px' : '280px',
          transition: 'margin-left 0.3s ease',
          overflowY: 'auto',
          background: '#f8fafc',
          height: '100%',
        }}
      >
        {/* No padding here — each page manages its own padding.
            This lets Dashboard use the full height for its sticky project sidebar. */}
        {children}
      </div>
    </div>
  );
};

export default Layout;