/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ProjectProvider } from './context/ProjectContext';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Toaster } from 'sonner';
import { Button } from './components/ui/Button';
import { Unauthorized403 } from './components/ui/Unauthorized403';
import { LoginExperience } from './components/auth/LoginExperience';

import { Plus, Snowflake } from 'lucide-react';

const Dashboard = React.lazy(() => import('./features/dashboard/Dashboard').then((module) => ({ default: module.Dashboard })));
const Projects = React.lazy(() => import('./features/projects/Projects').then((module) => ({ default: module.Projects })));
const CalendarView = React.lazy(() => import('./features/calendar/CalendarView').then((module) => ({ default: module.CalendarView })));
const MaterialCalculator = React.lazy(() => import('./features/calculator/material/MaterialCalculator').then((module) => ({ default: module.MaterialCalculator })));
const ColdRoomCalculator = React.lazy(() => import('./features/calculator/heatload/HeatLoadCalculator').then((module) => ({ default: module.ColdRoomCalculator })));
const ProductsDatabase = React.lazy(() => import('./features/products/ProductsDatabase').then((module) => ({ default: module.ProductsDatabase })));
const Settings = React.lazy(() => import('./features/users/Settings').then((module) => ({ default: module.Settings })));

function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat halaman">
      <span className="sr-only">Memuat halaman...</span>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <div className="skeleton h-40 rounded-[1.15rem] md:col-span-5" />
        <div className="skeleton h-40 rounded-[1.15rem] md:col-span-3" />
        <div className="skeleton h-40 rounded-[1.15rem] md:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="skeleton h-80 rounded-[1.15rem] lg:col-span-3" />
        <div className="skeleton h-80 rounded-[1.15rem] lg:col-span-2" />
      </div>
    </div>
  );
}

function AppLoading() {
  return (
    <main id="main-content" className="app-canvas flex min-h-dvh items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6" role="status" aria-live="polite">
        <div className="app-panel flex h-20 w-20 items-center justify-center p-3">
          <Snowflake className="h-10 w-10 animate-[spin_4s_linear_infinite] text-[var(--color-accent-600)]" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">Menyiapkan workspace</p>
          <p className="mt-1 text-xs text-muted">Menyinkronkan akses dan data proyek</p>
        </div>
        <div className="h-1 w-36 overflow-hidden rounded-full bg-surface-hover">
          <div className="h-full w-1/2 animate-[pulse_1.2s_ease-in-out_infinite] rounded-full bg-[var(--color-accent-500)]" />
        </div>
      </div>
    </main>
  );
}

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

  if (loading) return <AppLoading />;

  if (!user) {
    return (
      <div>
        <LoginExperience onSignIn={signIn} />
        <ThemedToaster />
      </div>
    );
  }

  const isSuperAdmin = ['reyrazey2750@gmail.com', '2750rzy@googlegroups.com'].includes(user.email || '');
  const hasProfile = usersList.some(u => u.email.toLowerCase() === user.email?.toLowerCase());
  const isAuthorized = isSuperAdmin || hasProfile || (usersList.length === 0);

  if (!isAuthorized && usersList.length > 0) {
    return (
      <main className="app-canvas flex min-h-dvh items-center justify-center p-5">
        <div className="app-panel w-full max-w-lg p-7 sm:p-10">
          <p className="eyebrow mb-4 text-rose-600">Akses 403</p>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-primary">Akun belum terdaftar</h1>
          <p className="mt-4 text-sm leading-6 text-secondary">
            Email <strong className="font-semibold text-primary">{user.email}</strong> belum memiliki izin untuk membuka workspace ini. Hubungi administrator agar akun ditambahkan ke daftar pengguna.
          </p>
          <Button onClick={signOut} variant="outline" className="mt-8 w-full">Keluar dan gunakan akun lain</Button>
        </div>
      </main>
    );
  }

  // Check permissions for the active tab
  const hasAccess = permissions[activeTab as keyof typeof permissions] !== false;

  return (
    <ProjectProvider>
      <AppLayout
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        headerActions={dashboardActions}
        onCreateProject={() => handleNavigateToProject('NEW')}
      >
        {!hasAccess ? (
          <Unauthorized403 onBackToAllowed={() => setActiveTab('dashboard')} allowedTabs={[]} />
        ) : (
          <Suspense fallback={<PageSkeleton />}>
            {activeTab === 'dashboard' && <Dashboard onNavigateToProject={handleNavigateToProject} />}
            {activeTab === 'projects' && <Projects selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} />}
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'calculator' && <MaterialCalculator />}
            {activeTab === 'heatload' && <ColdRoomCalculator />}
            {activeTab === 'products' && <ProductsDatabase />}
            {activeTab === 'settings' && <Settings />}
          </Suspense>
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
