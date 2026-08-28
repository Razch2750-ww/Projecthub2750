import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Calculator,
  Database,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Snowflake,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { RjmLogo } from '../ui/RjmLogo';

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  headerActions?: React.ReactNode;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Beranda', icon: LayoutDashboard },
  { id: 'projects', label: 'Proyek & Tugas', shortLabel: 'Proyek', icon: FolderKanban },
  { id: 'calendar', label: 'Kalender', shortLabel: 'Kalender', icon: CalendarIcon },
  { id: 'calculator', label: 'Material', shortLabel: 'Material', icon: Calculator },
  { id: 'heatload', label: 'Heat Load', shortLabel: 'Heat Load', icon: Snowflake },
  { id: 'products', label: 'Database Produk', shortLabel: 'Produk', icon: Database },
  { id: 'settings', label: 'Pengaturan', shortLabel: 'Atur', icon: Settings },
];

const PAGE_DESCRIPTIONS: Record<string, string> = {
  dashboard: 'Pantau progres proyek, pekerjaan aktif, dan jadwal tim.',
  projects: 'Kelola seluruh siklus proyek dan tugas drafting.',
  calendar: 'Lihat agenda survey, target, dan tenggat pekerjaan.',
  calculator: 'Susun estimasi panel dan kebutuhan material cold room.',
  heatload: 'Hitung kebutuhan kapasitas refrigerasi secara terstruktur.',
  products: 'Kelola referensi produk dan spesifikasi teknis.',
  settings: 'Atur pengguna, akses, tema, dan integrasi data.',
};

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeTab, setActiveTab, headerActions }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, userProfile, signOut, permissions } = useAuth();

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => permissions[item.id as keyof typeof permissions] !== false),
    [permissions],
  );

  const activeItem = navItems.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const displayName = userProfile?.name || user?.displayName || 'Tim RJM';
  const todayLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsMobileOpen(false);
  };

  return (
    <div className="app-canvas flex min-h-dvh w-full flex-col text-primary">
      <a className="skip-link" href="#main-content">Lewati ke konten utama</a>

      <header className="sticky top-0 z-30 border-b border-divider bg-surface/88 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.75rem] w-full max-w-[1536px] items-center gap-4 px-4 sm:px-6 xl:px-8">
          <button
            type="button"
            className="icon-button md:hidden"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Buka menu navigasi"
            aria-expanded={isMobileOpen}
          >
            <Menu size={21} />
          </button>

          <div className="mr-auto shrink-0 md:mr-2">
            <RjmLogo />
          </div>

          <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex" aria-label="Navigasi utama">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-divider bg-base/55 p-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all duration-200 active:translate-y-px',
                      isActive
                        ? 'bg-surface-elevated text-primary shadow-[0_8px_20px_-16px_rgb(var(--shadow-color)/0.75)]'
                        : 'text-secondary hover:bg-surface-hover hover:text-primary',
                    )}
                  >
                    <item.icon
                      size={16}
                      strokeWidth={isActive ? 2.4 : 1.9}
                      className={isActive ? 'text-[var(--color-accent-600)]' : 'text-muted'}
                    />
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden">{item.shortLabel}</span>
                    {isActive && (
                      <span
                        className="absolute inset-x-3 -bottom-[0.31rem] h-0.5 rounded-full bg-[var(--color-accent-500)]"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-2">
            <div className="hidden max-w-36 text-right xl:block">
              <p className="truncate text-xs font-semibold text-primary">{displayName}</p>
              <p className="truncate text-[10px] text-muted">{user?.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[0.7rem] border border-divider bg-surface-elevated">
              {user?.photoURL ? (
                <img src={user.photoURL} alt={`Foto profil ${displayName}`} className="h-full w-full object-cover" />
              ) : (
                <User size={16} className="text-muted" aria-hidden="true" />
              )}
            </div>
            <button type="button" onClick={signOut} className="icon-button" aria-label="Keluar dari akun" title="Keluar">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-slate-950/46 backdrop-blur-[2px]"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Tutup menu navigasi"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(21rem,88vw)] flex-col border-r border-divider bg-surface-elevated p-4 shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-divider px-1 pb-3">
              <RjmLogo />
              <button type="button" className="icon-button" onClick={() => setIsMobileOpen(false)} aria-label="Tutup menu">
                <X size={20} />
              </button>
            </div>
            <p className="eyebrow px-3 pb-3 pt-7">Workspace</p>
            <nav className="space-y-1" aria-label="Navigasi seluler">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-all active:scale-[0.99]',
                      isActive
                        ? 'bg-[var(--color-accent-100)] text-[var(--color-accent-700)]'
                        : 'text-secondary hover:bg-surface-hover hover:text-primary',
                    )}
                  >
                    <item.icon size={19} className={isActive ? 'text-[var(--color-accent-600)]' : 'text-muted'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-divider pt-4">
              <p className="truncate px-3 text-sm font-semibold text-primary">{displayName}</p>
              <p className="truncate px-3 pb-3 text-xs text-muted">{user?.email}</p>
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10"
              >
                <LogOut size={18} /> Keluar
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <section className="border-b border-divider bg-base/60" aria-labelledby="page-heading">
          <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-end md:justify-between xl:px-8">
            <div>
              <p className="eyebrow mb-2">RJM project workspace · {todayLabel}</p>
              <h1 id="page-heading" className="text-[clamp(1.6rem,3vw,2.25rem)] font-semibold leading-none tracking-[-0.035em] text-primary">
                {activeItem.label}
              </h1>
              <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-secondary">
                {PAGE_DESCRIPTIONS[activeTab]}
              </p>
            </div>
            {headerActions && <div className="shrink-0">{headerActions}</div>}
          </div>
        </section>

        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 md:py-8 xl:px-8">
          <div className="mx-auto w-full max-w-[1536px] page-enter" key={activeTab}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
