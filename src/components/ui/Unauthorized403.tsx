import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';
import { Button } from './Button';

interface Unauthorized403Props {
  onBackToAllowed: () => void;
  allowedTabs: string[];
}

export const Unauthorized403: React.FC<Unauthorized403Props> = ({ onBackToAllowed }) => {
  return (
    <div className="app-panel mx-auto flex max-w-xl flex-col items-start px-7 py-10 text-left sm:px-10 sm:py-12">
      <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500">
        <ShieldAlert size={40} className="stroke-[1.5]" />
      </div>
      
      <p className="eyebrow mb-3 text-red-500">Akses 403</p>
      <h1 className="mb-3 text-3xl font-semibold tracking-[-0.04em] text-primary">Halaman ini dibatasi</h1>
      
      <p className="mb-8 max-w-[52ch] text-sm leading-6 text-secondary">
        Peran akun Anda belum memiliki izin untuk membuka menu ini. Kembali ke dashboard atau hubungi administrator jika akses tersebut memang dibutuhkan.
      </p>

      <div className="flex w-full flex-col gap-3 sm:flex-row">
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
