import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Calculator,
  Database,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
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
  onCreateProject?: () => void;
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

export const AppLayout: React.FC<AppLayoutProps> = ({ children, activeTab, setActiveTab, headerActions, onCreateProject }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const closeMenuRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);
  const { user, userProfile, signOut, permissions } = useAuth();

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => permissions[item.id as keyof typeof permissions] !== false),
    [permissions],
  );

  const activeItem = navItems.find((item) => item.id === activeTab) || NAV_ITEMS[0];
  const mobilePrimaryItems = ['dashboard', 'projects', 'calendar'].map((id) => navItems.find((item) => item.id === id));
  const canCreateProject = permissions.projects !== false && Boolean(onCreateProject);
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

  const openMobileMenu = () => {
    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsMobileOpen(true);
  };

  useEffect(() => {
    if (!isMobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeMenuRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        mobileMenuRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || [],
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      lastFocusedElementRef.current?.focus();
    };
  }, [isMobileOpen]);

  return (
    <div className="app-canvas flex min-h-dvh w-full flex-col text-primary">
      <a className="skip-link" href="#main-content">Lewati ke konten utama</a>

      <header className="sticky top-0 z-30 border-b border-divider bg-surface-elevated/96">
        <div className="mx-auto flex h-[4.5rem] w-full max-w-[1536px] items-center gap-3 px-4 sm:px-6 xl:px-8">
          <button
            type="button"
            className="icon-button md:hidden"
            onClick={openMobileMenu}
            aria-label="Buka menu navigasi"
            aria-expanded={isMobileOpen}
          >
            <Menu size={21} />
          </button>

          <div className="mr-auto shrink-0 md:mr-2">
            <RjmLogo />
          </div>

          <nav className="hidden min-w-0 flex-1 items-center justify-center md:flex" aria-label="Navigasi utama">
            <div className="flex max-w-full items-center gap-1 overflow-x-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'relative flex h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-3 text-xs font-semibold transition-all duration-200 active:translate-y-px',
                      isActive
                        ? 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)]'
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
                        className="absolute inset-x-3 bottom-0 h-px bg-[var(--color-accent-600)]"
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
          <aside ref={mobileMenuRef} className="absolute inset-y-0 left-0 flex w-[min(21rem,88vw)] flex-col border-r border-divider bg-surface-elevated p-4 shadow-[18px_0_48px_-30px_rgb(0_0_0/0.45)]" role="dialog" aria-modal="true" aria-label="Menu navigasi">
            <div className="flex h-14 items-center justify-between border-b border-divider px-1 pb-3">
              <RjmLogo />
              <button ref={closeMenuRef} type="button" className="icon-button" onClick={() => setIsMobileOpen(false)} aria-label="Tutup menu">
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
        <section className="border-b border-divider bg-base" aria-labelledby="page-heading">
          <div className="mx-auto flex w-full max-w-[1536px] flex-col gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-end md:justify-between xl:px-8">
            <div>
              <h1 id="page-heading" className="text-[clamp(1.6rem,3vw,2.25rem)] font-semibold leading-none tracking-[-0.035em] text-primary">
                {activeItem.label}
              </h1>
              <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-secondary">
                {PAGE_DESCRIPTIONS[activeTab]}
              </p>
            </div>
            <div className="flex shrink-0 items-center justify-between gap-5 md:flex-col md:items-end">
              <time className="text-xs font-medium text-muted">{todayLabel}</time>
              {headerActions && <div>{headerActions}</div>}
            </div>
          </div>
        </section>

        <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-28 pt-6 outline-none sm:px-6 md:py-8 xl:px-8">
          <div className="mx-auto w-full max-w-[1536px] page-enter" key={activeTab}>
            {children}
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-divider bg-surface-elevated px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 md:hidden" aria-label="Navigasi utama seluler">
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
          {mobilePrimaryItems.slice(0, 2).map((item, index) => {
            if (!item) return <span key={`empty-primary-${index}`} aria-hidden="true" />;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold', isActive ? 'text-[var(--color-accent-700)]' : 'text-muted')}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {item.shortLabel}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onCreateProject}
            disabled={!canCreateProject}
            className="group -mt-6 flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-[var(--color-accent-700)] disabled:opacity-50"
            aria-label="Buat proyek baru"
          >
            <span className="flex h-13 w-13 items-center justify-center rounded-full border-4 border-[var(--bg-surface-elevated)] bg-[var(--color-accent-600)] text-white transition-transform group-active:translate-y-px group-active:scale-95">
              <Plus size={22} strokeWidth={2.4} />
            </span>
            Baru
          </button>

          {(() => {
            const item = mobilePrimaryItems[2];
            if (!item) return <span aria-hidden="true" />;
            const isActive = activeTab === item.id;
            return (
              <button
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold', isActive ? 'text-[var(--color-accent-700)]' : 'text-muted')}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.4 : 1.8} />
                {item.shortLabel}
              </button>
            );
          })()}

          <button
            type="button"
            onClick={openMobileMenu}
            aria-expanded={isMobileOpen}
            className={cn('flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold', ['calculator', 'heatload', 'products', 'settings'].includes(activeTab) ? 'text-[var(--color-accent-700)]' : 'text-muted')}
          >
            <Menu size={20} strokeWidth={1.9} />
            Lainnya
          </button>
        </div>
      </nav>
    </div>
  );
};
