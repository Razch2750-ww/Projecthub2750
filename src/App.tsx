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
import { RjmLogo } from './components/ui/RjmLogo';

import { ArrowRight, Check, FolderKanban, Plus, ShieldCheck, Snowflake } from 'lucide-react';

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
      <div className="app-canvas min-h-dvh p-3 sm:p-5 lg:p-8">
        <a className="skip-link" href="#main-content">Lewati ke formulir masuk</a>
        <main id="main-content" className="mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-[1480px] overflow-hidden rounded-[1.5rem] border border-divider bg-surface-elevated shadow-[0_30px_80px_-52px_rgb(var(--shadow-color)/0.72)] sm:min-h-[calc(100dvh-2.5rem)] lg:grid-cols-[1.15fr_0.85fr]">
          <section className="relative hidden overflow-hidden border-r border-divider p-10 lg:flex lg:flex-col xl:p-14" aria-label="Tentang Drafter Tracker">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-divider bg-[var(--color-accent-100)]/50 blur-2xl" aria-hidden="true" />
            <div className="relative z-10">
              <RjmLogo />
            </div>

            <div className="relative z-10 my-auto max-w-2xl py-16">
              <p className="eyebrow mb-5">Engineering project control</p>
              <h1 className="max-w-[12ch] text-[clamp(3.25rem,6vw,6.4rem)] font-semibold leading-[0.9] tracking-[-0.065em] text-primary">
                Setiap detail proyek, tetap terkendali.
              </h1>
              <p className="mt-8 max-w-[58ch] text-base leading-7 text-secondary xl:text-lg">
                Workspace internal PT Rokindo Jaya Mandiri untuk menghubungkan pekerjaan drafting, jadwal, material, dan perhitungan cold room dalam satu alur kerja.
              </p>
            </div>

            <div className="relative z-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-divider bg-divider">
              {[
                { icon: FolderKanban, label: 'Proyek', value: 'Terpusat' },
                { icon: Snowflake, label: 'Kalkulasi', value: 'Teknis' },
                { icon: ShieldCheck, label: 'Akses', value: 'Terkelola' },
              ].map((item) => (
                <div key={item.label} className="bg-surface px-4 py-5">
                  <item.icon size={18} className="mb-5 text-[var(--color-accent-600)]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-primary">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center p-6 sm:p-10 xl:p-16" aria-labelledby="login-heading">
            <div className="w-full max-w-md">
              <div className="mb-12 lg:hidden">
                <RjmLogo />
              </div>
              <p className="eyebrow mb-4">Portal tim RJM</p>
              <h2 id="login-heading" className="text-4xl font-semibold leading-tight tracking-[-0.045em] text-primary sm:text-5xl">
                Masuk ke workspace
              </h2>
              <p className="mt-4 max-w-[44ch] text-sm leading-6 text-secondary">
                Gunakan akun Google yang sudah terdaftar untuk membuka data proyek dan alat engineering.
              </p>

              <div className="my-8 space-y-3 border-y border-divider py-6">
                {['Data proyek tersinkron melalui Firebase', 'Hak akses mengikuti peran tim', 'Google Calendar dapat dihubungkan setelah masuk'].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-secondary">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--color-accent-100)] text-[var(--color-accent-700)]">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </div>
                ))}
              </div>

              <Button onClick={signIn} size="lg" className="group w-full justify-between px-5 text-base">
                <span className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white font-semibold text-slate-800">G</span>
                  Masuk dengan Google
                </span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Button>

              {window.self !== window.top && (
                <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 text-xs leading-relaxed text-amber-800 dark:text-amber-300" role="note">
                  <strong className="mb-1 block font-semibold">Buka preview di tab baru</strong>
                  Login Google tidak dapat dijalankan di dalam iframe AI Studio. Gunakan <strong>Open in New Tab</strong> agar jendela login dapat terbuka.
                </div>
              )}

              <p className="mt-8 text-xs leading-5 text-muted">
                Akses dibatasi untuk personel yang telah diotorisasi oleh administrator PT Rokindo Jaya Mandiri.
              </p>
            </div>
          </section>
        </main>
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
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} headerActions={dashboardActions}>
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
