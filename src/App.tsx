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
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { CalendarView } from './pages/CalendarView';
import { MaterialCalculator } from './pages/MaterialCalculator';
import { ColdRoomCalculator } from './pages/ColdRoomCalculator';
import { Settings } from './pages/Settings';
import { Toaster } from 'sonner';
import { Button } from './components/ui/Button';

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
  const { user, loading, signIn } = useAuth();
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

  const authorizedEmails = ['reyrazey2750@gmail.com', '2750rzy@googlegroups.com'];

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
        </div>
        <ThemedToaster />
      </div>
    );
  }

  if (user.email && !authorizedEmails.includes(user.email)) {
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
          <Button onClick={signIn} variant="outline" className="w-full">Ganti Akun</Button>
        </div>
      </div>
    );
  }

  return (
    <ProjectProvider>
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} headerActions={dashboardActions}>
        {activeTab === 'dashboard' && <Dashboard onNavigateToProject={handleNavigateToProject} />}
        {activeTab === 'projects' && <Projects selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'calculator' && <MaterialCalculator />}
        {activeTab === 'heatload' && <ColdRoomCalculator />}
        {activeTab === 'settings' && <Settings />}
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
