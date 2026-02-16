import React, { useState } from 'react';
import Sidebar from './Sidebar';

/**
 * CloseSidebar (MainLayout) 
 * Wraps all protected pages to maintain sidebar state during navigation.
 */
const CloseSidebar = ({ children }) => {
  // This state is now "Persistent" because this component stays 
  // mounted even when the 'children' (Dashboard, Users, etc.) change.
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar stays fixed on the left */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      {/* The main content area adjusts its margin based on the sidebar state.
          We use 'overflow-y-auto' here so each page can scroll independently.
      */}
      <div className={`flex-1 transition-all duration-300 h-full overflow-y-auto 
        ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        {children}
      </div>
    </div>
  );
};

export default CloseSidebar;