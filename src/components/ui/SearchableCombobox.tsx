import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Check, Edit3 } from 'lucide-react';

export interface ComboboxOption {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
}

export const SearchableCombobox: React.FC<SearchableComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Ketik manual atau pilih...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = value || '';
  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.subLabel && o.subLabel.toLowerCase().includes(query.toLowerCase()))
  );

  const exactMatch = options.some(o => o.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full h-8 bg-surface border border-divider rounded-md px-2.5 pr-14 text-xs text-primary focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-600)] focus:border-[var(--color-accent-600)] transition-colors placeholder:text-muted"
        />

        <div className="absolute right-1.5 flex items-center gap-0.5 text-muted">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                inputRef.current?.focus();
              }}
              className="p-1 hover:text-primary rounded"
              title="Hapus"
            >
              <X size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(prev => !prev);
              if (!isOpen) inputRef.current?.focus();
            }}
            className="p-1 hover:text-primary rounded"
            title="Buka daftar pilihan"
          >
            <ChevronDown size={13} className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-elevated border border-divider rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-56 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="overflow-y-auto p-1 space-y-0.5">
            {/* Indikator manual text jika ada input dan bukan exact match */}
            {query.trim() && !exactMatch && (
              <div
                onClick={() => {
                  setIsOpen(false);
                }}
                className="px-2.5 py-1.5 rounded-md text-[11px] cursor-pointer bg-[var(--color-accent-500)]/10 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-medium flex items-center justify-between gap-1 hover:bg-[var(--color-accent-500)]/20 transition-colors"
              >
                <span className="truncate flex items-center gap-1.5">
                  <Edit3 size={12} />
                  Gunakan teks manual: <strong>&quot;{query.trim()}&quot;</strong>
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted shrink-0 font-sans">Manual</span>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted">
                {query.trim() ? (
                  <span>Teks manual tersimpan. Tidak ada katalog cocok.</span>
                ) : (
                  <span>Tidak ada pilihan katalog</span>
                )}
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = value.trim().toLowerCase() === opt.label.toLowerCase();
                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      onChange(opt.label);
                      setIsOpen(false);
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-xs cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[var(--color-accent-600)] text-white font-medium'
                        : 'hover:bg-surface-hover text-secondary hover:text-primary'
                    }`}
                  >
                    <div className="truncate">
                      <div className="truncate font-medium">{opt.label}</div>
                      {opt.subLabel && (
                        <div className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-muted'}`}>
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
