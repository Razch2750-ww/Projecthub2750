import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, loginWithGoogle, logout, setCachedAccessToken, db } from '../firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { TeamMember } from '../types';

export interface UserRolePermissions {
  dashboard: boolean;
  projects: boolean;
  calendar: boolean;
  calculator: boolean;
  heatload: boolean;
  settings: boolean;
}

export interface AuthContextType {
  user: User | null;
  userProfile: TeamMember | null;
  permissions: UserRolePermissions;
  rolePermissionsMap: Record<string, UserRolePermissions>;
  accessToken: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  connectCalendar: () => Promise<string | null>;
  // User Management
  usersList: TeamMember[];
  addUser: (email: string, name: string, systemRole: 'admin' | 'drafter' | 'reviewer' | 'guest', role: 'Drafting' | 'Review' | 'Both', availability: 'Available' | 'Busy' | 'On Leave') => Promise<void>;
  updateUser: (id: string, updates: Partial<TeamMember>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateRolePermissions: (role: string, permissions: Partial<UserRolePermissions>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SEED_MEMBERS = [
  { id: 'member-1', name: 'Ahmad Fauzi', role: 'Drafting' as const, availability: 'Available' as const, email: 'ahmad@example.com', systemRole: 'drafter' as const },
  { id: 'member-2', name: 'Budi Santoso', role: 'Review' as const, availability: 'Busy' as const, email: 'budi@example.com', systemRole: 'reviewer' as const },
  { id: 'member-3', name: 'Citra Lestari', role: 'Drafting' as const, availability: 'Available' as const, email: 'citra@example.com', systemRole: 'drafter' as const },
  { id: 'member-4', name: 'Diana Putri', role: 'Review' as const, availability: 'On Leave' as const, email: 'diana@example.com', systemRole: 'reviewer' as const },
  { id: 'member-5', name: 'Eko Prasetyo', role: 'Both' as const, availability: 'Available' as const, email: 'eko@example.com', systemRole: 'drafter' as const }
];

const DEFAULT_ADMINS = [
  { id: 'admin-1', name: 'Super Admin', role: 'Both' as const, availability: 'Available' as const, email: 'reyrazey2750@gmail.com', systemRole: 'admin' as const },
  { id: 'admin-2', name: 'Group Admin', role: 'Both' as const, availability: 'Available' as const, email: '2750rzy@googlegroups.com', systemRole: 'admin' as const }
];

const DEFAULT_PERMISSIONS: Record<string, UserRolePermissions> = {
  admin: { dashboard: true, projects: true, calendar: true, calculator: true, heatload: true, settings: true },
  drafter: { dashboard: true, projects: true, calendar: true, calculator: true, heatload: true, settings: true },
  reviewer: { dashboard: true, projects: true, calendar: true, calculator: false, heatload: false, settings: true },
  guest: { dashboard: true, projects: false, calendar: false, calculator: false, heatload: false, settings: true }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<TeamMember | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<TeamMember[]>([]);
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, UserRolePermissions>>(DEFAULT_PERMISSIONS);

  // Compute combined permissions for currently logged-in user
  const permissions: UserRolePermissions = userProfile
    ? (userProfile.systemRole === 'admin'
        ? DEFAULT_PERMISSIONS.admin
        : rolePermissionsMap[userProfile.systemRole || 'guest'] || DEFAULT_PERMISSIONS.guest)
    : DEFAULT_PERMISSIONS.guest;

  // Real-time synchronization of users & permissions from Firestore
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setUserProfile(null);
        setAccessToken(null);
        setCachedAccessToken(null);
        localStorage.removeItem('gcal_access_token');
        setLoading(false);
      } else {
        const storedToken = localStorage.getItem('gcal_access_token');
        if (storedToken) {
          setAccessToken(storedToken);
          setCachedAccessToken(storedToken);
        }

        // Check/Seed current user profile
        try {
          // Check if current user is default admin
          const isAdminEmail = DEFAULT_ADMINS.some(adm => adm.email.toLowerCase() === u.email?.toLowerCase());
          
          // Try to look up profile in database
          // Since Firestore might be offline or empty, handle carefully
          const emailKey = u.email ? u.email.replace(/\./g, '_') : 'unknown_user';
          const userDocRef = doc(db, 'users', emailKey);
          const userSnap = await getDoc(userDocRef);

          if (!userSnap.exists()) {
            // Seed current user if they are admin or if table is empty
            if (isAdminEmail) {
              const matchedAdmin = DEFAULT_ADMINS.find(adm => adm.email.toLowerCase() === u.email?.toLowerCase());
              const newProfile: TeamMember = {
                id: matchedAdmin?.id || 'admin-super',
                name: u.displayName || matchedAdmin?.name || 'Super Admin',
                role: 'Both',
                availability: 'Available',
                email: u.email!,
                systemRole: 'admin'
              };
              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
            } else {
              // Not a pre-defined admin, but let's check if they have any matches
              setUserProfile(null);
            }
          } else {
            setUserProfile(userSnap.data() as TeamMember);
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // Listen to role permissions and users collection once auth is established
  useEffect(() => {
    if (!user) return;

    // 1. Sync permissions
    const unsubPerms = onSnapshot(collection(db, 'role_permissions'), (snapshot) => {
      if (snapshot.empty) {
        // Seed default permissions to Firestore
        Object.entries(DEFAULT_PERMISSIONS).forEach(async ([roleName, perms]) => {
          try {
            await setDoc(doc(db, 'role_permissions', roleName), perms);
          } catch (e) {
            console.error(`Failed to seed permissions for ${roleName}:`, e);
          }
        });
      } else {
        const mappedPerms: Record<string, UserRolePermissions> = { ...DEFAULT_PERMISSIONS };
        snapshot.forEach((d) => {
          mappedPerms[d.id] = d.data() as UserRolePermissions;
        });
        setRolePermissionsMap(mappedPerms);
      }
    }, (error) => {
      console.warn("Firestore permissions listener failed:", error);
    });

    // 2. Sync users list
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      if (snapshot.empty) {
        // Seed initial members and default admins to Firestore
        const allSeeds = [...DEFAULT_ADMINS, ...SEED_MEMBERS];
        allSeeds.forEach(async (member) => {
          try {
            const emailKey = member.email.replace(/\./g, '_');
            await setDoc(doc(db, 'users', emailKey), member);
          } catch (e) {
            console.error(`Failed to seed user ${member.name}:`, e);
          }
        });
      } else {
        const list: TeamMember[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as TeamMember);
        });
        setUsersList(list);

        // Keep current logged-in user profile in-sync
        const currentProfile = list.find(u => u.email.toLowerCase() === user.email?.toLowerCase());
        if (currentProfile) {
          setUserProfile(currentProfile);
        }
      }
    }, (error) => {
      console.warn("Firestore users listener failed:", error);
    });

    return () => {
      unsubPerms();
      unsubUsers();
    };
  }, [user]);

  const signIn = async () => {
    try {
      const result = await loginWithGoogle();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        if (result.accessToken) {
          localStorage.setItem('gcal_access_token', result.accessToken);
          setCachedAccessToken(result.accessToken);
        }
      }
    } catch (error: any) {
      console.error("Error during sign in", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/popup-blocked') {
        toast.error('Gagal Masuk: Popup diblokir atau langsung ditutup. Silakan buka aplikasi di Tab Baru (Open in New Tab) di kanan atas AI Studio agar login berhasil!', {
          duration: 12000,
        });
      } else {
        toast.error(`Gagal masuk dengan Google: ${error.message || error}`);
      }
    }
  };

  const connectCalendar = async (): Promise<string | null> => {
    try {
      const result = await loginWithGoogle();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        if (result.accessToken) {
          localStorage.setItem('gcal_access_token', result.accessToken);
          setCachedAccessToken(result.accessToken);
        }
        return result.accessToken;
      }
      return null;
    } catch (e: any) {
      console.error("Gagal menghubungkan Google Calendar", e);
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/popup-blocked') {
        toast.error('Koneksi Kalender Gagal: Popup diblokir atau langsung ditutup. Silakan buka aplikasi di Tab Baru (Open in New Tab) di kanan atas AI Studio!', {
          duration: 12000,
        });
      } else {
        toast.error(`Gagal menghubungkan Google Calendar: ${e.message || e}`);
      }
      return null;
    }
  };

  const signOutUser = async () => {
    await logout();
    setAccessToken(null);
    setCachedAccessToken(null);
    localStorage.removeItem('gcal_access_token');
    setUserProfile(null);
  };

  // User Management functions
  const addUser = async (
    email: string, 
    name: string, 
    systemRole: 'admin' | 'drafter' | 'reviewer' | 'guest',
    role: 'Drafting' | 'Review' | 'Both',
    availability: 'Available' | 'Busy' | 'On Leave'
  ) => {
    try {
      const emailKey = email.toLowerCase().replace(/\./g, '_');
      const newMember: TeamMember = {
        id: `user-${Date.now()}`,
        name,
        email: email.toLowerCase(),
        role,
        availability,
        systemRole
      };
      await setDoc(doc(db, 'users', emailKey), newMember);
      toast.success(`Pengguna ${name} berhasil ditambahkan.`);
    } catch (e) {
      console.error("Error adding user:", e);
      toast.error("Gagal menambahkan pengguna.");
    }
  };

  const updateUser = async (id: string, updates: Partial<TeamMember>) => {
    try {
      const targetUser = usersList.find(u => u.id === id);
      if (!targetUser) throw new Error("Pengguna tidak ditemukan");
      
      const emailKey = targetUser.email.toLowerCase().replace(/\./g, '_');
      const updatedProfile = { ...targetUser, ...updates };
      
      await setDoc(doc(db, 'users', emailKey), updatedProfile);
      toast.success(`Profil ${updatedProfile.name} berhasil diperbarui.`);
    } catch (e) {
      console.error("Error updating user:", e);
      toast.error("Gagal memperbarui pengguna.");
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const targetUser = usersList.find(u => u.id === id);
      if (!targetUser) throw new Error("Pengguna tidak ditemukan");
      
      const emailKey = targetUser.email.toLowerCase().replace(/\./g, '_');
      await deleteDoc(doc(db, 'users', emailKey));
      toast.success(`Pengguna ${targetUser.name} berhasil dihapus.`);
    } catch (e) {
      console.error("Error deleting user:", e);
      toast.error("Gagal menghapus pengguna.");
    }
  };

  const updateRolePermissions = async (role: string, permsUpdates: Partial<UserRolePermissions>) => {
    try {
      const currentPerms = rolePermissionsMap[role] || DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.guest;
      const updatedPerms = { ...currentPerms, ...permsUpdates };
      
      await setDoc(doc(db, 'role_permissions', role), updatedPerms);
      toast.success(`Hak akses untuk peran "${role}" berhasil diperbarui.`);
    } catch (e) {
      console.error("Error updating permissions:", e);
      toast.error("Gagal memperbarui hak akses.");
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userProfile, 
      permissions, 
      rolePermissionsMap, 
      accessToken, 
      loading, 
      signIn, 
      signOut: signOutUser, 
      connectCalendar,
      usersList,
      addUser,
      updateUser,
      deleteUser,
      updateRolePermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
