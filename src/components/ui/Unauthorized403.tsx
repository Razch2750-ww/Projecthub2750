import React from 'react';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface Unauthorized403Props {
  onBackToAllowed: () => void;
  allowedTabs: string[];
}

export const Unauthorized403: React.FC<Unauthorized403Props> = ({ onBackToAllowed, allowedTabs }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-lg shadow-red-500/5 animate-pulse">
        <ShieldAlert size={40} className="stroke-[1.5]" />
      </div>
      
      <h1 className="text-3xl font-extrabold text-primary tracking-tight mb-2">403 - Akses Ditolak</h1>
      <p className="text-sm font-semibold text-red-500 dark:text-red-400 mb-4 bg-red-500/10 dark:bg-red-500/20 px-3 py-1 rounded-full border border-red-500/20">
        Hak Akses Terbatas (Unauthorized)
      </p>
      
      <p className="text-secondary text-sm leading-relaxed mb-8">
        Halaman ini memerlukan hak akses tambahan. Akun Anda tidak memiliki izin untuk melihat menu ini. Silakan hubungi Administrator atau Super Admin jika Anda merasa ini adalah kesalahan.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
        <Button 
          onClick={onBackToAllowed}
          className="gap-2 font-medium"
        >
          <Home size={16} />
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
};
