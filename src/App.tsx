/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './features/dashboard/Dashboard';
import { Projects } from './features/projects/Projects';
import { CalendarView } from './features/calendar/CalendarView';
import { MaterialCalculator } from './features/calculator/material/MaterialCalculator';
import { ColdRoomCalculator } from './features/calculator/heatload/HeatLoadCalculator';
import { ProductsDatabase } from './features/products/ProductsDatabase';
import { Settings } from './features/users/Settings';
import { Toaster } from 'sonner';
import { Button } from './components/ui/Button';
import { Unauthorized403 } from './components/ui/Unauthorized403';

import { Plus } from 'lucide-react';

function ThemedToaster() {
  const { currentTheme } = useTheme();
  return (
    <Toaster 
      position="bottom-right" 
      richColors 
      theme={currentTheme.category === 'light' ? 'light' : 'dark'} 
    />
  );
}

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { user, loading, signIn, signOut, usersList, permissions } = useAuth();
  const { currentTheme } = useTheme();

  const handleNavigateToProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('projects');
  };

  const dashboardActions = activeTab === 'dashboard' ? (
    <Button 
      onClick={() => handleNavigateToProject('NEW')} 
      size="sm" 
      className="gap-1.5"
    >
      <Plus size={16} /> Proyek Baru
    </Button>
  ) : null;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-base text-primary">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-4 flex-col gap-6">
        <div className="w-full max-w-md p-8 bg-surface border border-divider rounded-2xl shadow-2xl flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-accent-500)] flex items-center justify-center text-white mb-2 shadow-lg shadow-[var(--color-accent-500)]/30">
            <span className="text-2xl font-bold font-mono">DT</span>
          </div>
          <h1 className="text-3xl font-bold text-primary font-sans tracking-tight">Drafter Tracker</h1>
          <p className="text-muted mb-4">
            Silakan masuk untuk mengakses data proyek.
          </p>
          <Button onClick={signIn} size="lg" className="w-full text-base font-medium shadow-md">
            Login dengan Google
          </Button>
          {window.self !== window.top && (
            <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs text-left leading-relaxed">
              <strong className="block mb-0.5">💡 Tips Iframe AI Studio:</strong>
              Login Google tidak dapat dibuka di dalam preview tersemat. Silakan klik tombol <strong>Open in New Tab</strong> di kanan atas preview AI Studio agar masuk dengan lancar!
            </div>
          )}
        </div>
        <ThemedToaster />
      </div>
    );
  }

  const isSuperAdmin = ['reyrazey2750@gmail.com', '2750rzy@googlegroups.com'].includes(user.email || '');
  const hasProfile = usersList.some(u => u.email.toLowerCase() === user.email?.toLowerCase());
  const isAuthorized = isSuperAdmin || hasProfile || (usersList.length === 0);

  if (!isAuthorized && usersList.length > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base p-4 flex-col gap-6">
        <div className="w-full max-w-md p-8 bg-surface border border-divider rounded-2xl shadow-2xl flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center mb-2">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-primary">Akses Ditolak</h1>
          <p className="text-muted">
            Email <strong>{user.email}</strong> tidak memiliki izin mengakses data proyek. Hubungi administrator.
          </p>
          <Button onClick={signOut} variant="outline" className="w-full">Keluar / Ganti Akun</Button>
        </div>
      </div>
    );
  }

  // Check permissions for the active tab
  const hasAccess = permissions[activeTab as keyof typeof permissions] !== false;

  return (
    <ProjectProvider>
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} headerActions={dashboardActions}>
        {!hasAccess ? (
          <Unauthorized403 onBackToAllowed={() => setActiveTab('dashboard')} allowedTabs={[]} />
        ) : (
          <>
            {activeTab === 'dashboard' && <Dashboard onNavigateToProject={handleNavigateToProject} />}
            {activeTab === 'projects' && <Projects selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} />}
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'calculator' && <MaterialCalculator />}
            {activeTab === 'heatload' && <ColdRoomCalculator />}
            {activeTab === 'products' && <ProductsDatabase />}
            {activeTab === 'settings' && <Settings />}
          </>
        )}
      </AppLayout>
      <ThemedToaster />
    </ProjectProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ThemeProvider>
          <MainApp />
        </ThemeProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
