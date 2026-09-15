import React, { useRef, useState, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useProjects } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Palette, Globe, Ruler, Database, Download, Upload, RotateCcw, 
  Shield, Users, UserPlus, Trash2, Edit2, CheckCircle2, Lock, Unlock, 
  Search, Check, Sparkles, SlidersHorizontal, Sun, Moon, Zap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { THEMES, ThemeCategory } from '../../lib/themes';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { toast } from 'sonner';
import { TeamMember } from '../../types';
import { motion, AnimatePresence } from 'motion/react';

export const Settings = () => {
  const { currentTheme, setCurrentThemeId } = useTheme();
  const { 
    language, setLanguage, 
    lengthUnit, setLengthUnit,
    smallLengthUnit, setSmallLengthUnit,
    weightUnit, setWeightUnit,
    tempUnit, setTempUnit
  } = useSettings();

  const { restoreFromBackup, tasks } = useProjects();
  const { user, userProfile, usersList, addUser, updateUser, deleteUser, rolePermissionsMap, updateRolePermissions } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme category filter state
  const [themeFilter, setThemeFilter] = useState<'all' | ThemeCategory>('all');

  // Admin section states
  const [adminTab, setAdminTab] = useState<'members' | 'permissions'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TeamMember | null>(null);

  // Form States for Add User
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newSystemRole, setNewSystemRole] = useState<'admin' | 'drafter' | 'reviewer' | 'guest'>('drafter');
  const [newTaskRole, setNewTaskRole] = useState<'Drafting' | 'Review' | 'Both'>('Drafting');
  const [newAvailability, setNewAvailability] = useState<'Available' | 'Busy' | 'On Leave'>('Available');

  // Form States for Edit User
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editSystemRole, setEditSystemRole] = useState<'admin' | 'drafter' | 'reviewer' | 'guest'>('drafter');
  const [editTaskRole, setEditTaskRole] = useState<'Drafting' | 'Review' | 'Both'>('Drafting');
  const [editAvailability, setEditAvailability] = useState<'Available' | 'Busy' | 'On Leave'>('Available');

  const isAdmin = userProfile?.systemRole === 'admin';

  // Calculate real-time active workload for a team member
  const getWorkloadCount = (memberId: string) => {
    return tasks.filter(t => t.assigneeId === memberId && t.status !== 'Selesai' && t.status !== 'Approved' && t.status !== 'Signed' && t.status !== 'Paused' && t.status !== 'Cancelled').length;
  };

  const getWorkloadLevel = (count: number) => {
    if (count === 0) return { label: 'Kosong', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (count <= 2) return { label: 'Ringan', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
    if (count <= 4) return { label: 'Sedang', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Sangat Padat', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
  };

  const filteredThemes = useMemo(() => {
    if (themeFilter === 'all') return THEMES;
    return THEMES.filter(t => t.category === themeFilter);
  }, [themeFilter]);

  const exportBackup = () => {
    try {
      const backupData = {
        projects: JSON.parse(localStorage.getItem('drafter_projects_backup') || '[]'),
        tasks: JSON.parse(localStorage.getItem('drafter_tasks_backup') || '[]'),
      };
      if (backupData.projects.length === 0 && backupData.tasks.length === 0) {
        toast.info("Tidak ada data cadangan di browser untuk diekspor.");
        return;
      }
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `drafter-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("File cadangan berhasil diunduh.");
    } catch (e) {
      toast.error("Gagal mengekspor data.");
    }
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data && (data.projects || data.tasks)) {
          if (data.projects) {
            localStorage.setItem('drafter_projects_backup', JSON.stringify(data.projects));
          }
          if (data.tasks) {
            localStorage.setItem('drafter_tasks_backup', JSON.stringify(data.tasks));
          }
          toast.success("File cadangan berhasil diunggah ke browser. Silakan klik 'Jalankan Pemulihan' untuk menyinkronkannya.");
        } else {
          toast.error("Format file cadangan tidak valid.");
        }
      } catch (error) {
        toast.error("Gagal membaca file cadangan. Pastikan file berformat JSON.");
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) {
      toast.error("Silakan isi semua bidang");
      return;
    }
    
    // Check duplication
    const duplicate = usersList.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase());
    if (duplicate) {
      toast.error("Email ini sudah terdaftar sebagai anggota.");
      return;
    }

    await addUser(newEmail.trim(), newName.trim(), newSystemRole, newTaskRole, newAvailability);
    setIsAddUserOpen(false);
    
    // Reset Form
    setNewEmail('');
    setNewName('');
    setNewSystemRole('drafter');
    setNewTaskRole('Drafting');
    setNewAvailability('Available');
  };

  const openEditModal = (member: TeamMember) => {
    setSelectedUser(member);
    setEditName(member.name);
    setEditEmail(member.email);
    setEditSystemRole(member.systemRole || 'drafter');
    setEditTaskRole(member.role || 'Drafting');
    setEditAvailability(member.availability || 'Available');
    setIsEditUserOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      toast.error("Nama dan email tidak boleh kosong");
      return;
    }

    await updateUser(selectedUser.id, {
      name: editName.trim(),
      email: editEmail.trim(),
      systemRole: editSystemRole,
      role: editTaskRole,
      availability: editAvailability
    });

    setIsEditUserOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteClick = async (member: TeamMember) => {
    if (member.email.toLowerCase() === user?.email?.toLowerCase()) {
      toast.error("Anda tidak dapat menghapus akun Anda sendiri!");
      return;
    }
    
    if (window.confirm(`Apakah Anda yakin ingin menghapus anggota ${member.name}?`)) {
      await deleteUser(member.id);
    }
  };

  const handleTogglePermission = async (role: string, menuId: string, currentVal: boolean) => {
    if (role === 'admin') return; // Admin permissions are read-only and locked
    await updateRolePermissions(role, { [menuId]: !currentVal });
  };

  const UnitToggle = ({ label, value, options, onChange }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-divider/40 last:border-0 gap-2">
      <span className="text-secondary text-xs font-medium shrink-0">{label}</span>
      <div className="flex flex-wrap bg-surface-hover/50 rounded-lg border border-divider p-0.5">
        {options.map((opt: any) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold rounded-md transition-all flex-1 text-center min-w-[36px]",
              value === opt.value
                ? "bg-[var(--color-accent-600)] text-white shadow-xs"
                : "text-secondary hover:text-primary hover:bg-surface"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  const filteredMembers = usersList.filter(member => 
    member.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    member.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (member.systemRole || 'guest').toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Top Preference Section: General & Themes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: General Preferences (Language & Units) */}
        <div className="lg:col-span-5 bg-surface border border-divider rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-5 border-b border-divider pb-4">
              <div className="p-2.5 rounded-xl bg-[var(--color-accent-50)] text-[var(--color-accent-600)] border border-[var(--color-accent-200)]/40">
                <Globe size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-primary">Preferensi Umum</h2>
                <p className="text-xs text-secondary">Bahasa antarmuka dan standar satuan ukuran.</p>
              </div>
            </div>

            {/* Language Selector */}
            <div className="space-y-3 mb-6">
              <label className="text-xs font-bold uppercase tracking-wider text-muted">Bahasa (Language)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage('id')}
                  className={cn(
                    "px-3.5 py-2.5 border rounded-xl flex items-center justify-center gap-2.5 text-xs font-semibold transition-all cursor-pointer",
                    language === 'id'
                      ? "border-[var(--color-accent-600)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)] shadow-xs ring-1 ring-[var(--color-accent-500)]/30"
                      : "border-divider bg-surface text-secondary hover:bg-surface-hover hover:text-primary"
                  )}
                >
                  <span className="font-bold px-1.5 py-0.5 rounded text-[10px] bg-surface border border-divider">ID</span>
                  Indonesia
                  {language === 'id' && <Check size={14} className="text-[var(--color-accent-600)] ml-auto" />}
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-3.5 py-2.5 border rounded-xl flex items-center justify-center gap-2.5 text-xs font-semibold transition-all cursor-pointer",
                    language === 'en'
                      ? "border-[var(--color-accent-600)] bg-[var(--color-accent-50)] text-[var(--color-accent-700)] shadow-xs ring-1 ring-[var(--color-accent-500)]/30"
                      : "border-divider bg-surface text-secondary hover:bg-surface-hover hover:text-primary"
                  )}
                >
                  <span className="font-bold px-1.5 py-0.5 rounded text-[10px] bg-surface border border-divider">EN</span>
                  English
                  {language === 'en' && <Check size={14} className="text-[var(--color-accent-600)] ml-auto" />}
                </button>
              </div>
            </div>

            {/* Units Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Ruler size={13} />
                Satuan Ukuran Standar
              </label>
              <div className="bg-surface-hover/30 border border-divider rounded-xl px-4 py-2">
                <UnitToggle 
                  label="Panjang / Dimensi (Besar)" 
                  value={lengthUnit} 
                  onChange={setLengthUnit} 
                  options={[
                    { label: 'km', value: 'km' },
                    { label: 'm', value: 'm' },
                    { label: 'cm', value: 'cm' },
                    { label: 'mm', value: 'mm' },
                    { label: 'ft', value: 'ft' },
                    { label: 'in', value: 'in' },
                  ]} 
                />
                <UnitToggle 
                  label="Tebal / Dimensi (Kecil)" 
                  value={smallLengthUnit} 
                  onChange={setSmallLengthUnit} 
                  options={[
                    { label: 'km', value: 'km' },
                    { label: 'm', value: 'm' },
                    { label: 'cm', value: 'cm' },
                    { label: 'mm', value: 'mm' },
                    { label: 'ft', value: 'ft' },
                    { label: 'in', value: 'in' },
                  ]} 
                />
                <UnitToggle 
                  label="Berat" 
                  value={weightUnit} 
                  onChange={setWeightUnit} 
                  options={[
                    { label: 'ton', value: 'ton' },
                    { label: 'kg', value: 'kg' },
                    { label: 'g', value: 'g' },
                    { label: 'lbs', value: 'lbs' },
                  ]} 
                />
                <UnitToggle 
                  label="Suhu" 
                  value={tempUnit} 
                  onChange={setTempUnit} 
                  options={[{ label: '°C', value: 'C' }, { label: '°F', value: 'F' }]} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Theme & Appearance */}
        <div className="lg:col-span-7 bg-surface border border-divider rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-divider pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[var(--color-accent-50)] text-[var(--color-accent-600)] border border-[var(--color-accent-200)]/40">
                  <Palette size={18} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary">Tampilan & Tema</h2>
                  <p className="text-xs text-secondary">Pilih palet warna workspace sesuai kenyamanan Anda.</p>
                </div>
              </div>

              {/* Theme Category Filter Pills */}
              <div className="flex items-center bg-surface-hover/50 border border-divider p-1 rounded-xl gap-1 shrink-0 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setThemeFilter('all')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all",
                    themeFilter === 'all'
                      ? "bg-[var(--color-accent-600)] text-white shadow-xs"
                      : "text-secondary hover:text-primary hover:bg-surface"
                  )}
                >
                  Semua ({THEMES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setThemeFilter('light')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                    themeFilter === 'light'
                      ? "bg-[var(--color-accent-600)] text-white shadow-xs"
                      : "text-secondary hover:text-primary hover:bg-surface"
                  )}
                >
                  <Sun size={12} />
                  Terang
                </button>
                <button
                  type="button"
                  onClick={() => setThemeFilter('dark')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                    themeFilter === 'dark'
                      ? "bg-[var(--color-accent-600)] text-white shadow-xs"
                      : "text-secondary hover:text-primary hover:bg-surface"
                  )}
                >
                  <Moon size={12} />
                  Gelap
                </button>
                <button
                  type="button"
                  onClick={() => setThemeFilter('amoled')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1",
                    themeFilter === 'amoled'
                      ? "bg-[var(--color-accent-600)] text-white shadow-xs"
                      : "text-secondary hover:text-primary hover:bg-surface"
                  )}
                >
                  <Zap size={12} />
                  AMOLED
                </button>
              </div>
            </div>

            {/* Themes Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
              {filteredThemes.map((t) => {
                const isSelected = currentTheme.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCurrentThemeId(t.id)}
                    className={cn(
                      'flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group',
                      isSelected
                        ? 'border-[var(--color-accent-600)] ring-2 ring-[var(--color-accent-500)]/40 bg-surface shadow-xs'
                        : 'border-divider bg-surface hover:border-secondary hover:bg-surface-hover/50 text-secondary'
                    )}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div 
                          className="w-4 h-4 rounded-full border border-divider shadow-xs shrink-0" 
                          style={{ backgroundColor: t.bg }} 
                        />
                        <span className={cn('font-semibold text-xs truncate', isSelected ? 'text-primary' : 'text-secondary group-hover:text-primary')}>
                          {t.name}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 size={15} className="text-[var(--color-accent-600)] shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 w-full mt-1">
                      <div className="h-2 flex-1 rounded-full shadow-2xs" style={{ backgroundColor: t.accent1 }} />
                      <div className="h-2 flex-1 rounded-full shadow-2xs" style={{ backgroundColor: t.accent2 }} />
                      {t.accents[2] && (
                        <div className="h-2 flex-1 rounded-full shadow-2xs hidden sm:block" style={{ backgroundColor: t.accents[2] }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Backup and Sync Recovery Section */}
      <div className="bg-surface border border-divider rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-5 border-b border-divider pb-4">
          <div className="p-2.5 rounded-xl bg-[var(--color-accent-50)] text-[var(--color-accent-600)] border border-[var(--color-accent-200)]/40">
            <Database size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary">Sinkronisasi & Pemulihan Data</h2>
            <p className="text-xs text-secondary">
              Kelola cadangan lokal browser atau ekspor/impor file data (.json) mandiri.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Restore Local Backup */}
          <div className="p-4 border border-divider rounded-xl bg-surface-hover/20 flex flex-col justify-between gap-4 transition-all hover:border-emerald-500/40">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <RotateCcw size={16} />
                </div>
                <h3 className="font-semibold text-primary text-sm">
                  Pulihkan Cadangan Lokal
                </h3>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                Tulis kembali data proyek dan tugas yang tersimpan di memori browser ini ke Firestore cloud.
              </p>
            </div>
            <Button 
              onClick={restoreFromBackup}
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold hover:border-emerald-500 hover:text-emerald-600"
            >
              Jalankan Pemulihan
            </Button>
          </div>

          {/* Export Backup File */}
          <div className="p-4 border border-divider rounded-xl bg-surface-hover/20 flex flex-col justify-between gap-4 transition-all hover:border-blue-500/40">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Download size={16} />
                </div>
                <h3 className="font-semibold text-primary text-sm">
                  Ekspor Cadangan Lokal
                </h3>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                Unduh data cadangan lokal Anda sebagai file JSON mandiri untuk arsip cadangan offline.
              </p>
            </div>
            <Button 
              onClick={exportBackup}
              variant="outline"
              size="sm"
              className="w-full text-xs font-semibold hover:border-blue-500 hover:text-blue-600"
            >
              Unduh File JSON
            </Button>
          </div>

          {/* Import Backup File */}
          <div className="p-4 border border-divider rounded-xl bg-surface-hover/20 flex flex-col justify-between gap-4 transition-all hover:border-amber-500/40">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Upload size={16} />
                </div>
                <h3 className="font-semibold text-primary text-sm">
                  Impor File Cadangan
                </h3>
              </div>
              <p className="text-muted text-xs leading-relaxed">
                Unggah file cadangan JSON yang telah diunduh untuk dimasukkan ke memori browser lokal ini.
              </p>
            </div>
            <div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={importBackup} 
                accept=".json" 
                className="hidden" 
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold hover:border-amber-500 hover:text-amber-600"
              >
                Unggah File JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN CONTROL PANEL - Coordinator and permissions */}
      {isAdmin && (
        <div className="bg-surface border border-divider rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-divider pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--color-accent-50)] text-[var(--color-accent-600)] border border-[var(--color-accent-200)]/40">
                <Shield size={18} strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-base font-bold text-primary">Panel Kendali Admin (Coordinator)</h2>
                <p className="text-xs text-secondary">Kelola hak akses pengguna, peran, ketersediaan, dan pembatasan menu.</p>
              </div>
            </div>
            
            {/* Tab Selector */}
            <div className="flex bg-surface-hover/50 rounded-xl border border-divider p-1 shrink-0 self-start sm:self-center gap-1">
              <button
                type="button"
                onClick={() => setAdminTab('members')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  adminTab === 'members'
                    ? "bg-[var(--color-accent-600)] text-white shadow-xs"
                    : "text-secondary hover:text-primary hover:bg-surface"
                )}
              >
                <Users size={14} />
                Daftar Anggota ({usersList.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminTab('permissions')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  adminTab === 'permissions'
                    ? "bg-[var(--color-accent-600)] text-white shadow-xs"
                    : "text-secondary hover:text-primary hover:bg-surface"
                )}
              >
                <Lock size={14} />
                Hak Akses Menu
              </button>
            </div>
          </div>

          <div>
            {/* TAB 1: MEMBERS LIST AND ACTIONS */}
            {adminTab === 'members' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <input
                      type="text"
                      placeholder="Cari nama, email, atau peran..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full text-xs h-9 bg-surface border border-divider rounded-xl pl-9 pr-3 focus:outline-none focus:border-[var(--color-accent-500)] text-primary"
                    />
                  </div>
                  <Button
                    onClick={() => setIsAddUserOpen(true)}
                    size="sm"
                    className="gap-1.5 font-semibold bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)] shrink-0 shadow-xs"
                  >
                    <UserPlus size={16} />
                    Tambah Anggota
                  </Button>
                </div>

                <div className="border border-divider rounded-xl overflow-hidden bg-surface">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-divider bg-surface-hover/30 text-[10px] uppercase font-bold text-secondary tracking-wider">
                          <th className="py-3 px-4">Nama & Email</th>
                          <th className="py-3 px-4">Akses Sistem</th>
                          <th className="py-3 px-4">Peran Desain</th>
                          <th className="py-3 px-4">Ketersediaan</th>
                          <th className="py-3 px-4">Beban Kerja</th>
                          <th className="py-3 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider/50 text-xs">
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-muted">
                              Tidak ada anggota tim yang cocok dengan pencarian Anda.
                            </td>
                          </tr>
                        ) : (
                          filteredMembers.map((member) => {
                            const activeWorkload = getWorkloadCount(member.id);
                            const workloadLvl = getWorkloadLevel(activeWorkload);
                            
                            return (
                              <tr key={member.id} className="hover:bg-surface-hover/25 transition-colors">
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-950)] dark:text-[var(--color-accent-300)] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[var(--color-accent-200)]/20 shadow-xs">
                                      {member.name.split(' ').slice(0,2).map(n => n[0]).join('')}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-primary truncate flex items-center gap-1">
                                        {member.name}
                                        {member.email.toLowerCase() === user?.email?.toLowerCase() && (
                                          <span className="text-[9px] bg-[var(--color-accent-100)] text-[var(--color-accent-800)] dark:bg-[var(--color-accent-950)] dark:text-[var(--color-accent-300)] px-1.5 py-0.2 rounded-full border border-[var(--color-accent-500)]/15 font-medium">Anda</span>
                                        )}
                                      </p>
                                      <p className="text-[10px] text-muted truncate">{member.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 capitalize">
                                  <span className={cn(
                                    "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                                    member.systemRole === 'admin' 
                                      ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800"
                                      : member.systemRole === 'drafter'
                                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800"
                                      : member.systemRole === 'reviewer'
                                      ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800"
                                      : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-300 dark:border-gray-800"
                                  )}>
                                    {member.systemRole || 'guest'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-medium text-secondary">
                                  {member.role || 'Both'}
                                </td>
                                <td className="py-3.5 px-4">
                                  {member.availability === 'Available' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      Tersedia
                                    </span>
                                  ) : member.availability === 'Busy' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      Sibuk
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-300 border border-red-200 dark:border-red-800">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                      Cuti
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className={cn("px-1.5 py-0.5 text-[9px] rounded font-semibold border", workloadLvl.color)}>
                                      {workloadLvl.label}
                                    </span>
                                    <span className="text-[10px] text-muted">{activeWorkload} tugas aktif</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(member)}
                                      className="p-1.5 rounded-lg text-muted hover:text-[var(--color-accent-600)] hover:bg-surface-hover transition-colors"
                                      title="Edit Anggota"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteClick(member)}
                                      className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                      title="Hapus Anggota"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: GRANULAR ROLE ACCESS CONTROL */}
            {adminTab === 'permissions' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-[var(--color-accent-200)]/35 bg-[var(--color-accent-500)]/5 text-secondary text-xs leading-relaxed flex items-start gap-2.5">
                  <Shield size={16} className="text-[var(--color-accent-600)] shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-primary font-semibold mb-0.5">Petunjuk Konfigurasi Hak Akses:</strong>
                    Tentukan halaman mana saja yang boleh diakses dan dilihat di navigasi oleh peran pengguna (Drafter, Reviewer, Guest). Perubahan disimpan secara real-time ke database Firestore dan akan langsung memengaruhi antarmuka pengguna seketika. Akun berstatus <strong>Super Admin (Admin)</strong> memiliki semua hak akses secara absolut dan tidak dapat dibatasi.
                  </div>
                </div>

                <div className="border border-divider rounded-xl overflow-hidden bg-surface">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-divider bg-surface-hover/30 text-[10px] uppercase font-bold text-secondary tracking-wider">
                        <th className="py-3.5 px-5">Peran Sistem</th>
                        <th className="py-3.5 px-4 text-center">Dashboard</th>
                        <th className="py-3.5 px-4 text-center">Proyek & Tugas</th>
                        <th className="py-3.5 px-4 text-center">Kalender</th>
                        <th className="py-3.5 px-4 text-center">Material</th>
                        <th className="py-3.5 px-4 text-center">Heat Load</th>
                        <th className="py-3.5 px-4 text-center">Database Produk</th>
                        <th className="py-3.5 px-4 text-center">Pengaturan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider text-xs">
                      {/* ADMIN ROW (LOCKED) */}
                      <tr className="bg-surface-hover/10">
                        <td className="py-4 px-5 font-semibold text-primary flex items-center gap-1.5">
                          <Lock size={12} className="text-purple-500" />
                          <span>Admin (Super Admin)</span>
                        </td>
                        {['dashboard', 'projects', 'calendar', 'calculator', 'heatload', 'products', 'settings'].map((menu) => (
                          <td key={menu} className="py-4 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={true}
                              disabled={true}
                              className="w-4 h-4 rounded border-divider text-purple-600 bg-surface-hover cursor-not-allowed"
                            />
                          </td>
                        ))}
                      </tr>

                      {/* OTHER ROLES (EDITABLE) */}
                      {['drafter', 'reviewer', 'guest'].map((role) => {
                        const rolePerms = rolePermissionsMap[role] || {
                          dashboard: true,
                          projects: role === 'drafter' || role === 'reviewer',
                          calendar: role === 'drafter' || role === 'reviewer',
                          calculator: role === 'drafter',
                          heatload: role === 'drafter',
                          products: true,
                          settings: true
                        };

                        return (
                          <tr key={role} className="hover:bg-surface-hover/20 transition-colors">
                            <td className="py-4 px-5 font-semibold text-primary capitalize flex items-center gap-1.5">
                              <Unlock size={12} className="text-muted" />
                              <span>{role}</span>
                            </td>
                            {(['dashboard', 'projects', 'calendar', 'calculator', 'heatload', 'products', 'settings'] as const).map((menu) => {
                              const isChecked = rolePerms[menu] !== false;
                              return (
                                <td key={menu} className="py-4 px-4 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(role, menu, isChecked)}
                                    className="w-4 h-4 rounded border-divider text-[var(--color-accent-600)] focus:ring-[var(--color-accent-500)] cursor-pointer"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD USER */}
      <Modal isOpen={isAddUserOpen} onClose={() => setIsAddUserOpen(false)} title="Tambah Anggota Baru" maxWidth="max-w-md">
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Nama Lengkap</label>
            <input
              type="text"
              required
              placeholder="Contoh: Ahmad Fauzi"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-3 focus:outline-none focus:border-[var(--color-accent-500)] text-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Alamat Email Google (Login)</label>
            <input
              type="email"
              required
              placeholder="Contoh: ahmad@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-3 focus:outline-none focus:border-[var(--color-accent-500)] text-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-secondary">Akses Sistem</label>
              <select
                value={newSystemRole}
                onChange={(e) => setNewSystemRole(e.target.value as any)}
                className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
              >
                <option value="guest">Guest</option>
                <option value="reviewer">Reviewer</option>
                <option value="drafter">Drafter</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-secondary">Peran Pekerjaan</label>
              <select
                value={newTaskRole}
                onChange={(e) => setNewTaskRole(e.target.value as any)}
                className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
              >
                <option value="Drafting">Drafting</option>
                <option value="Review">Review</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Ketersediaan Awal</label>
            <select
              value={newAvailability}
              onChange={(e) => setNewAvailability(e.target.value as any)}
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
            >
              <option value="Available">Available (Tersedia)</option>
              <option value="Busy">Busy (Sibuk)</option>
              <option value="On Leave">On Leave (Cuti)</option>
            </select>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddUserOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white font-semibold">
              Tambah Anggota
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDIT USER */}
      <Modal isOpen={isEditUserOpen} onClose={() => setIsEditUserOpen(false)} title="Edit Profil Anggota" maxWidth="max-w-md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Nama Lengkap</label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-3 focus:outline-none focus:border-[var(--color-accent-500)] text-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Alamat Email Google (Login)</label>
            <input
              type="email"
              required
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-3 focus:outline-none focus:border-[var(--color-accent-500)] text-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-secondary">Akses Sistem</label>
              <select
                value={editSystemRole}
                onChange={(e) => setEditSystemRole(e.target.value as any)}
                disabled={selectedUser?.email.toLowerCase() === user?.email?.toLowerCase()}
                className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer disabled:opacity-50"
              >
                <option value="guest">Guest</option>
                <option value="reviewer">Reviewer</option>
                <option value="drafter">Drafter</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-secondary">Peran Pekerjaan</label>
              <select
                value={editTaskRole}
                onChange={(e) => setEditTaskRole(e.target.value as any)}
                className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
              >
                <option value="Drafting">Drafting</option>
                <option value="Review">Review</option>
                <option value="Both">Both</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-secondary">Status Ketersediaan</label>
            <select
              value={editAvailability}
              onChange={(e) => setEditAvailability(e.target.value as any)}
              className="w-full text-xs h-9 bg-surface border border-divider rounded-lg px-2 focus:outline-none focus:border-[var(--color-accent-500)] text-primary cursor-pointer"
            >
              <option value="Available">Available (Tersedia)</option>
              <option value="Busy">Busy (Sibuk)</option>
              <option value="On Leave">On Leave (Cuti)</option>
            </select>
          </div>

          {selectedUser?.email.toLowerCase() === user?.email?.toLowerCase() && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              * Anda tidak bisa mengubah peran sistem Anda sendiri untuk menghindari kehilangan akses admin.
            </p>
          )}

          <div className="flex gap-2.5 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditUserOpen(false)}>
              Batal
            </Button>
            <Button type="submit" className="flex-1 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white font-semibold">
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
