/* ==========================================================================
   MASTER DESIGN SYSTEM - AKSYON BASURA
   This file contains all Tailwind CSS classes organized by section.
   Changing a class here updates the look across the entire application.
   ========================================================================== */

export const design = {
  // GLOBAL LAYOUT: Controls the background, sidebar behavior, and main container
  layout: {
    screen: "flex bg-[#E8F5E9], min-h-screen font-sans",
    main: "flex-1 transition-all duration-300 ease-in-out relative min-h-screen",
    header: "bg-white h-20 px-8 flex items-center justify-between sticky top-0 z-[1000] shadow-md border-b border-gray-100",
    searchBox: "w-full pl-10 pr-10 py-2 bg-white border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-600",
    clearBtn: "absolute right-3 top-2.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer",
    profileCircle: "w-10 h-10 bg-[#1B5E20] rounded-full flex items-center justify-center text-white font-bold border border-green-800 shadow-sm overflow-hidden",
  },

  // DASHBOARD SECTION: Stats, Map, and Lower List cards
  dashboard: {
    // Top Row Cards (KPIs)
    kpiGrid: "grid grid-cols-1 md:grid-cols-4 gap-6",
    kpiCard: "bg-white p-6 rounded-xl shadow-sm border-l-8 border-[#2E7D32] h-32 flex flex-col justify-center",
    kpiLabel: "text-gray-500 text-[10px] font-black uppercase tracking-widest",
    kpiValue: "text-3xl font-black text-gray-800 mt-1",
    
    // Map Components
    mapCard: "bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 flex flex-col",
    mapHeader: "p-4 flex justify-between items-center border-b",
    mapFrame: "h-[490px] w-full relative z-0 border-b border-gray-100 bg-gray-50",
    mapLegend: "bg-white px-6 py-3 flex gap-8 text-[11px] font-bold text-gray-600 border-t border-gray-50",
    legendItem: "flex items-center gap-2",
    
    // Bottom Section Grid
    listGrid: "grid grid-cols-1 lg:grid-cols-2 gap-8 h-[550px]",
    citizenCard: "bg-white rounded-2xl shadow-md flex flex-col border-t-4 border-[#FFA600]",
    photoCard: "bg-white rounded-2xl shadow-md flex flex-col border-t-4 border-[#2B9447]",
    emptyState: "flex-1 flex flex-col justify-center items-center opacity-40",
    emptyText: "text-sm font-bold text-gray-400",
  },

  // USER INTERFACE (UI): Reusable buttons and interactive elements
  ui: {
    btnSeeAllOrange: "px-4 py-1 text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200 rounded-md hover:bg-orange-100 transition-colors",
    btnSeeAllGreen: "px-4 py-1 text-xs font-bold bg-green-50 text-[#2B9447] border border-green-200 rounded-md hover:bg-green-100 transition-colors",
    btnApprove: "px-4 py-1 text-xs font-bold bg-gray-200 text-white rounded-md cursor-not-allowed",
    btnLive: "text-[10px] px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md font-bold",
    btnPlayback: "text-[10px] px-3 py-1 bg-gray-100 text-gray-600 rounded-md font-bold",
    backToTop: "fixed bottom-8 right-8 p-3 bg-gradient-to-tr from-[#1B8E57] to-[#003A1E] text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 z-[1000] cursor-pointer border-2 border-white/20 backdrop-blur-sm"
  },


  // USER MANAGEMENT SPECIFIC
  userManagement: {
    titleSection: "mb-6 -mt-4",
    tableControls: "bg-white p-4 rounded-t-lg shadow-sm border-b border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4",
    filterSelect: "appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-green-600 cursor-pointer",
    searchWrapper: "relative w-full md:w-64",
    tableContainer: "bg-white rounded-b-lg shadow-sm overflow-hidden",
    table: "w-full text-left border-collapse",
    tableHead: "bg-gray-50 border-b border-gray-200",
    tableHeadCell: "px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider",
    tableRow: "hover:bg-gray-50 transition-colors",
    tableCell: "px-6 py-4 text-sm text-gray-700",
    
    // Role Badges
    badgeAdmin: "bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold",
    badgeCollector: "bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold",
    badgeDriver: "bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold",
    badgeCitizen: "bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold",
    
    // Status Badges
    statusActive: "bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold",
    statusInactive: "bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold",
  }
};