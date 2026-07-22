import React, { useState } from 'react';
import { LayoutDashboard, FolderKanban, Calendar as CalendarIcon, Menu, X, Calculator, Snowflake, Settings, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { RjmLogo } from '../ui/RjmLogo';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  headerActions?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeTab, setActiveTab, headerActions }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const { user, signOut, permissions } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Proyek & Tugas', icon: FolderKanban },
    { id: 'calendar', label: 'Kalender', icon: CalendarIcon },
    { id: 'calculator', label: 'Kalkulator Material', icon: Calculator },
    { id: 'heatload', label: 'Kalkulator Heat Load', icon: Snowflake },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ].filter(item => permissions[item.id as keyof typeof permissions] !== false);

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-base overflow-hidden transition-colors duration-300">
      {/* Sidebar Overlay (Mobile) */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 bg-surface/90 backdrop-blur-xl border-r border-divider transform transition-all duration-300 ease-out flex flex-col shrink-0 shadow-xs",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
          !isDesktopCollapsed ? "md:w-64" : "md:w-20"
        )}
      >
        <div className={cn("flex items-center h-16 border-b border-divider/60 shrink-0 px-4", !isDesktopCollapsed ? "justify-between" : "md:justify-center justify-between")}>
          <RjmLogo collapsed={isDesktopCollapsed} />
          <button 
            className="md:hidden p-1.5 rounded-full text-muted hover:text-primary hover:bg-surface-hover transition-all active:scale-90 shrink-0"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                title={isDesktopCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 w-full font-medium transition-all duration-150 group relative active:scale-[0.98]",
                  !isDesktopCollapsed ? "px-3.5 py-2.5 rounded-full text-[14px]" : "md:justify-center md:p-3 px-3.5 py-2.5 rounded-2xl text-[14px]",
                  isActive 
                    ? "bg-[#0066cc] text-white font-medium shadow-xs" 
                    : "text-secondary hover:bg-surface-hover hover:text-primary"
                )}
              >
                <item.icon size={19} className={cn("shrink-0 transition-colors", isActive ? "text-white" : "text-muted group-hover:text-primary")} />
                <span className={cn("whitespace-nowrap tracking-tight transition-opacity", isDesktopCollapsed ? "md:hidden" : "")}>{item.label}</span>
                
                {/* Tooltip for desktop collapsed state */}
                {isDesktopCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-black/90 text-white text-[12px] font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 md:block hidden shadow-md">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
        
        {/* User Info & Actions */}
        <div className="border-t border-divider/60 p-3 flex flex-col gap-2 bg-surface/50">
            {!isDesktopCollapsed && user && (
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-surface-hover/70 border border-divider/40 overflow-hidden mb-1">
                    <div className="flex items-center gap-2.5 overflow-hidden w-full">
                        <div className="w-7 h-7 rounded-full bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center shrink-0 font-medium text-xs">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <User size={14} className="text-[#0066cc]" />
                            )}
                        </div>
                        <span className="text-[12px] text-secondary font-medium truncate leading-tight w-full" title={user.email || ''}>{user.email}</span>
                    </div>
                </div>
            )}
            
            <div className={cn("flex items-center", !isDesktopCollapsed ? "gap-2" : "flex-col gap-2")}>
              <button
                onClick={signOut}
                 className={cn("flex flex-1 items-center justify-center p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors active:scale-95", isDesktopCollapsed ? "w-full" : "w-1/2")}
                 title="Logout"
              >
                  <LogOut size={isDesktopCollapsed ? 19 : 16} /> 
                  {!isDesktopCollapsed && <span className="text-[13px] font-medium ml-2 tracking-tight">Logout</span>}
              </button>
              
              {/* Desktop Collapse Toggle */}
              <button
                onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                className={cn("hidden md:flex items-center justify-center p-2 rounded-xl text-muted hover:text-primary hover:bg-surface-hover transition-colors active:scale-95", isDesktopCollapsed ? "w-full" : "w-1/2")}
                title={isDesktopCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isDesktopCollapsed ? <ChevronRight size={19} /> : <ChevronLeft size={16} />}
                {!isDesktopCollapsed && <span className="text-[13px] font-medium ml-2 tracking-tight">Sembunyikan</span>}
              </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-divider/60 bg-surface/80 backdrop-blur-md shrink-0 sticky top-0 z-30">
          <div className="flex items-center">
            <button
               className="mr-3 p-2 rounded-full text-secondary hover:text-primary hover:bg-surface-hover md:hidden transition-all active:scale-90"
               onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <h1 className="text-[20px] font-semibold text-primary tracking-tight capitalize">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          {headerActions && <div>{headerActions}</div>}
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

