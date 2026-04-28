import { useState } from 'react';
import Sidebar from './SideBar';

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
        {children}
      </div>
    </div>
  );
};

export default Layout;
