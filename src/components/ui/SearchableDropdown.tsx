import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableDropdownProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Pilih atau cari...',
  emptyMessage = 'Tidak ada data ditemukan',
  allowEmpty = true,
  emptyLabel = '-- Tanpa Pilihan / Custom --',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.subLabel && o.subLabel.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-9 bg-surface-elevated text-primary px-3 rounded-xl border border-divider flex items-center justify-between text-xs cursor-pointer hover:border-[var(--color-accent-500)] transition-colors"
      >
        <span className={selectedOption ? 'font-medium truncate' : 'text-muted truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1 text-muted shrink-0">
          {value && allowEmpty && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-primary rounded"
              title="Hapus pilihan"
            >
              <X size={14} />
            </button>
          )}
          <ChevronDown size={14} />
        </div>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-elevated border border-divider rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-64 animate-in fade-in duration-150">
          {/* Search Input */}
          <div className="p-2 border-b border-divider flex items-center gap-2 bg-surface">
            <Search size={14} className="text-muted shrink-0 ml-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari..."
              className="w-full bg-transparent text-xs text-primary focus:outline-none"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-muted hover:text-primary p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-1 space-y-0.5 font-mono">
            {allowEmpty && (
              <div
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors font-sans italic text-muted hover:bg-surface-hover hover:text-primary ${
                  !value ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-semibold' : ''
                }`}
              >
                {emptyLabel}
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted font-sans">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors flex flex-col gap-0.5 ${
                    value === opt.id
                      ? 'bg-[var(--color-accent-600)] text-white font-bold'
                      : 'hover:bg-surface-hover text-secondary hover:text-primary'
                  }`}
                >
                  <div className="font-sans font-semibold">{opt.label}</div>
                  {opt.subLabel && (
                    <div className={`text-[10px] ${value === opt.id ? 'text-white/80' : 'text-muted'}`}>
                      {opt.subLabel}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
