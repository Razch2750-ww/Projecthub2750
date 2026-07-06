import React, { useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Palette, Globe, Ruler, Database, Download, Upload, RotateCcw, Shield, Users, UserPlus, Trash2, Edit2, CheckCircle2, Lock, Unlock, Search, Eye, Circle, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { THEMES } from '../lib/themes';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';
import { TeamMember } from '../types';

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("bg-surface border border-divider shadow-sm rounded-xl overflow-hidden", className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("px-6 py-4 border-b border-divider bg-surface-hover/30", className)}>
    {children}
  </div>
);

const CardTitle = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <h3 className={cn("font-semibold text-primary", className)}>
    {children}
  </h3>
);

const CardContent = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn("p-6", className)}>
    {children}
  </div>
);

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
    return tasks.filter(t => t.assigneeId === memberId && t.status !== 'Selesai' && t.status !== 'Approved').length;
  };

  const getWorkloadLevel = (count: number) => {
    if (count === 0) return { label: 'Kosong', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
    if (count <= 2) return { label: 'Ringan', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' };
    if (count <= 4) return { label: 'Sedang', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
    return { label: 'Sangat Padat', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
  };

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-divider/50 last:border-0 gap-2">
      <span className="text-secondary text-sm shrink-0">{label}</span>
      <div className="flex flex-wrap bg-surface rounded-lg border border-divider p-1">
        {options.map((opt: any) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-all flex-1 text-center min-w-[40px]",
              value === opt.value
                ? "bg-[var(--color-accent-600)] text-white shadow-sm"
                : "text-secondary hover:text-primary hover:bg-surface-hover"
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
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-primary tracking-tight">Pengaturan</h2>
        <p className="text-secondary mt-1">Sesuaikan preferensi aplikasi Anda di sini.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language & Units */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-[var(--color-accent-600)]" />
              Preferensi Umum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-primary">Bahasa (Language)</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLanguage('id')}
                  className={cn(
                    "px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-all",
                    language === 'id'
                      ? "border-[var(--color-accent-600)] bg-[var(--color-accent-100)] dark:bg-[var(--color-accent-900)] text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)] ring-1 ring-[var(--color-accent-600)]"
                      : "border-divider bg-surface text-secondary hover:bg-surface-hover"
                  )}
                >
                  <span className="font-semibold px-2 py-0.5 rounded text-xs bg-surface border border-divider shadow-sm">ID</span>
                  Indonesia
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-4 py-3 border rounded-lg flex items-center justify-center gap-2 transition-all",
                    language === 'en'
                      ? "border-[var(--color-accent-600)] bg-[var(--color-accent-100)] dark:bg-[var(--color-accent-900)] text-[var(--color-accent-600)] dark:text-[var(--color-accent-300)] ring-1 ring-[var(--color-accent-600)]"
                      : "border-divider bg-surface text-secondary hover:bg-surface-hover"
                  )}
                >
                  <span className="font-semibold px-2 py-0.5 rounded text-xs bg-surface border border-divider shadow-sm">EN</span>
                  English
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-primary flex items-center gap-2">
                <Ruler className="w-4 h-4" />
                Satuan Ukuran
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
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-[var(--color-accent-600)]" />
              Tampilan & Tema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 h-[328px] overflow-y-auto pr-2 custom-scrollbar">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setCurrentThemeId(t.id)}
                  className={cn(
                    'flex flex-col items-start gap-2 p-3 rounded-xl border text-left transition-all',
                    currentTheme.id === t.id
                      ? 'border-[var(--color-accent-600)] ring-1 ring-[var(--color-accent-600)] bg-surface'
                      : 'border-divider bg-surface hover:bg-surface-hover text-secondary'
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-4 h-4 rounded-full border border-divider shrink-0" style={{ backgroundColor: t.bg }} />
                    <span className={cn('font-medium text-sm truncate', currentTheme.id === t.id ? 'text-primary' : '')}>
                      {t.name}
                    </span>
                  </div>
                  <div className="flex gap-1 w-full mt-1">
                    <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: t.accent1 }} />
                    <div className="h-1.5 w-full rounded-full" style={{ backgroundColor: t.accent2 }} />
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup and Sync Recovery Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[var(--color-accent-600)]" />
            Sinkronisasi & Pemulihan Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-secondary text-sm leading-relaxed">
            Gunakan fitur ini untuk memulihkan data proyek dan tugas dari cadangan browser lokal Anda ke penyimpanan cloud Firebase, atau untuk mengekspor/mengimpor file cadangan mandiri (.json).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Restore Local Backup */}
            <div className="p-4 border border-divider rounded-xl bg-surface-hover/20 flex flex-col justify-between gap-4">
              <div>
                <h4 className="font-semibold text-primary text-sm flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-emerald-500" />
                  Pulihkan dari Cadangan Lokal
                </h4>
                <p className="text-muted text-xs mt-1 leading-relaxed">
                  Tulis kembali data proyek dan tugas yang dicadangkan di memori lokal browser ini ke Firestore cloud.
                </p>
              </div>
              <Button 
                onClick={restoreFromBackup}
                variant="outline"
                className="w-full text-xs font-semibold"
              >
                Jalankan Pemulihan
              </Button>
            </div>

            {/* Export Backup File */}
            <div className="p-4 border border-divider rounded-xl bg-surface-hover/20 flex flex-col justify-between gap-4">
              <div>
                <h4 className="font-semibold text-primary text-sm flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-blue-500" />
                  Ekspor Cadangan Lokal
                </h4>
                <p className="text-muted text-xs mt-1 leading-relaxed">
                  Unduh data cadangan lokal Anda sebagai file JSON mandiri untuk disimpan secara manual.
                </p>
              </div>
              <Button 
                onClick={exportBackup}
                variant="outline"
                className="w-full text-xs font-semibold"
              >
                Unduh File JSON
              </Button>
            </div>

            {/* Import Backup File */}
            <div className="p-4 border border-divider rounded-xl bg-surface-hover/20 flex flex-col justify-between gap-4">
              <div>
                <h4 className="font-semibold text-primary text-sm flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-amber-500" />
                  Impor File Cadangan
                </h4>
                <p className="text-muted text-xs mt-1 leading-relaxed">
                  Unggah file cadangan JSON yang diunduh sebelumnya untuk dipulihkan ke browser lokal ini.
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
                  className="w-full text-xs font-semibold"
                >
                  Unggah File JSON
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ADMIN CONTROL PANEL - Hidden for non-admins */}
      {isAdmin && (
        <Card className="border-[var(--color-accent-500)]/30 ring-1 ring-[var(--color-accent-500)]/10 shadow-lg">
          <CardHeader className="bg-[var(--color-accent-500)]/5 border-b border-[var(--color-accent-500)]/15">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-[var(--color-accent-700)] dark:text-[var(--color-accent-300)]">
                  <Shield className="w-5 h-5 text-[var(--color-accent-500)]" />
                  Panel Kendali Admin (Coordinator)
                </CardTitle>
                <p className="text-xs text-secondary mt-0.5">Kelola hak akses pengguna, peran, ketersediaan, dan pembatasan menu.</p>
              </div>
              
              {/* Tab Selector */}
              <div className="flex bg-surface rounded-lg border border-divider p-1 shrink-0 self-start sm:self-center">
                <button
                  onClick={() => setAdminTab('members')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                    adminTab === 'members'
                      ? "bg-[var(--color-accent-600)] text-white shadow"
                      : "text-secondary hover:text-primary hover:bg-surface-hover"
                  )}
                >
                  <Users size={14} />
                  Daftar Anggota
                </button>
                <button
                  onClick={() => setAdminTab('permissions')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5",
                    adminTab === 'permissions'
                      ? "bg-[var(--color-accent-600)] text-white shadow"
                      : "text-secondary hover:text-primary hover:bg-surface-hover"
                  )}
                >
                  <Lock size={14} />
                  Hak Akses Menu
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
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
                      className="w-full text-xs h-9 bg-surface-hover/30 border border-divider rounded-lg pl-9 pr-3 focus:outline-none focus:border-[var(--color-accent-500)] text-primary"
                    />
                  </div>
                  <Button
                    onClick={() => setIsAddUserOpen(true)}
                    size="sm"
                    className="gap-1.5 font-semibold bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-700)] shrink-0 shadow-sm"
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
                                    <div className="w-8 h-8 rounded-full bg-[var(--color-accent-100)] text-[var(--color-accent-700)] dark:bg-[var(--color-accent-950)]/40 dark:text-[var(--color-accent-300)] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[var(--color-accent-200)]/20 shadow-sm">
                                      {member.name.split(' ').slice(0,2).map(n => n[0]).join('')}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-primary truncate flex items-center gap-1">
                                        {member.name}
                                        {member.email.toLowerCase() === user?.email?.toLowerCase() && (
                                          <span className="text-[9px] bg-[var(--color-accent-100)] text-[var(--color-accent-800)] dark:bg-[var(--color-accent-950)]/60 dark:text-[var(--color-accent-300)] px-1.5 py-0.2 rounded-full border border-[var(--color-accent-500)]/15 font-medium">Anda</span>
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
                                      onClick={() => openEditModal(member)}
                                      className="p-1 rounded text-muted hover:text-[var(--color-accent-600)] hover:bg-surface-hover/80 transition-colors"
                                      title="Edit Anggota"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteClick(member)}
                                      className="p-1 rounded text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
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
                    Tentukan halaman mana saja yang boleh diakses dan dilihat di sidebar oleh peran pengguna (Drafter, Reviewer, Guest). Perubahan disimpan secara real-time ke database Firestore dan akan langsung memengaruhi antarmuka pengguna tersebut seketika. Akun berstatus <strong>Super Admin (Admin)</strong> memiliki semua hak akses secara absolut dan tidak dapat dibatasi.
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
                        <th className="py-3.5 px-4 text-center">Kalkulator Material</th>
                        <th className="py-3.5 px-4 text-center">Kalkulator Heat Load</th>
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
                        {['dashboard', 'projects', 'calendar', 'calculator', 'heatload', 'settings'].map((menu) => (
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
                          settings: true
                        };

                        return (
                          <tr key={role} className="hover:bg-surface-hover/20 transition-colors">
                            <td className="py-4 px-5 font-semibold text-primary capitalize flex items-center gap-1.5">
                              <Unlock size={12} className="text-muted" />
                              <span>{role}</span>
                            </td>
                            {(['dashboard', 'projects', 'calendar', 'calculator', 'heatload', 'settings'] as const).map((menu) => {
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
          </CardContent>
        </Card>
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
