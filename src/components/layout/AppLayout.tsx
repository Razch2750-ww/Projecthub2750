import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FolderKanban, Calendar as CalendarIcon, Menu, X, Palette, Calculator, Snowflake, Settings, ChevronLeft, ChevronRight, LogOut, User, Database } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
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
  const { currentTheme } = useTheme();
  const { user, signOut, permissions } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Proyek & Tugas', icon: FolderKanban },
    { id: 'calendar', label: 'Kalender', icon: CalendarIcon },
    { id: 'calculator', label: 'Kalkulator Material', icon: Calculator },
    { id: 'heatload', label: 'Kalkulator Heat Load', icon: Snowflake },
    { id: 'products', label: 'Database Produk', icon: Database },
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
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
                
          "fixed md:relative inset-y-0 left-0 z-50 bg-surface border-r border-divider transform transition-all duration-300 ease-in-out flex flex-col shrink-0",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
          !isDesktopCollapsed ? "md:w-64" : "md:w-20"
        )}
      >
        <div className={cn(
                "flex items-center h-16 border-b border-divider shrink-0 px-4", !isDesktopCollapsed ? "justify-between" : "md:justify-center justify-between")}>
          <RjmLogo collapsed={isDesktopCollapsed} />
          <button 
            className="md:hidden p-1 text-muted hover:text-primary transition-colors shrink-0"
            onClick={() => setIsMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              title={isDesktopCollapsed ? item.label : undefined}
              className={cn(
                
                "flex items-center gap-3 w-full rounded-md font-medium transition-all duration-300 group relative active:scale-95",
                !isDesktopCollapsed ? "px-3 py-2.5 justify-start text-sm" : "md:justify-center md:p-3 px-3 py-2.5 justify-start text-sm",
                activeTab === item.id 
                  ? "bg-[var(--color-accent-100)] text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]" 
                  : "text-secondary hover:bg-surface-hover hover:text-primary"
              )}
            >
              <item.icon size={20} className={cn(
                "shrink-0", activeTab === item.id ? "text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" : "text-muted group-hover:text-primary")} />
              <span className={cn(
                "whitespace-nowrap transition-opacity", isDesktopCollapsed ? "md:hidden" : "")}>{item.label}</span>
              
              {/* Tooltip for desktop collapsed state */}
              {isDesktopCollapsed && (
                <div className="absolute left-full ml-3 px-2 py-1.5 bg-black/80 text-white text-xs font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 md:block hidden">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </nav>
        
        {/* User Info & Actions */}
        <div className="border-t border-divider p-3 flex flex-col gap-2">
            {!isDesktopCollapsed && user && (
                <div className="flex items-center justify-between p-2 rounded-md bg-surface-hover/50 overflow-hidden mb-1">
                    <div className="flex items-center gap-2 overflow-hidden w-full">
                        <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center shrink-0">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full" />
                            ) : (
                                <User size={12} className="text-muted" />
                            )}
                        </div>
                        <span className="text-xs text-muted truncate leading-tight w-full" title={user.email || ''}>{user.email}</span>
                    </div>
                </div>
            )}
            
            <div className={cn(
                "flex items-center", !isDesktopCollapsed ? "gap-2" : "flex-col gap-2")}>
              <button
                onClick={signOut}
                 className={cn(
                "flex flex-1 items-center justify-center p-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all duration-300 active:scale-95", isDesktopCollapsed ? "w-full" : "w-1/2")}
                 title="Logout"
              >
                  <LogOut size={isDesktopCollapsed ? 20 : 16} /> 
                  {!isDesktopCollapsed && <span className="text-xs font-medium ml-2">Logout</span>}
              </button>
              
              {/* Desktop Collapse Toggle */}
              <button
                onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
                className={cn(
                "hidden md:flex items-center justify-center p-2 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-all duration-300 active:scale-95", isDesktopCollapsed ? "w-full" : "w-1/2")}
                title={isDesktopCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isDesktopCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={16} />}
                {!isDesktopCollapsed && <span className="text-xs font-medium ml-2">Sembunyikan</span>}
              </button>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-divider bg-surface/80 backdrop-blur-md shrink-0">
          <div className="flex items-center">
            <button
               className="mr-4 p-2 rounded-md text-secondary hover:text-primary hover:bg-surface-hover md:hidden transition-colors"
               onClick={() => setIsMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h1 className="text-xl font-semibold text-primary capitalize">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>
          {headerActions && <div>{headerActions}</div>}
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
