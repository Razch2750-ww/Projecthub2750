import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CADRoom, PanelThickness } from '../types';
import { X, Maximize, Check } from 'lucide-react';

interface QuickDimensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: CADRoom;
  onSave: (dimensions: {
    length: number;
    width: number;
    height: number;
    thickness: PanelThickness;
  }) => void;
  initialFocusField?: 'length' | 'width' | 'height' | 'thickness';
}

export const QuickDimensionModal: React.FC<QuickDimensionModalProps> = ({
  isOpen,
  onClose,
  room,
  onSave,
  initialFocusField = 'length'
}) => {
  const [length, setLength] = useState(room.length);
  const [width, setWidth] = useState(room.width);
  const [height, setHeight] = useState(room.height);
  const [thickness, setThickness] = useState<PanelThickness>(room.thickness);

  useEffect(() => {
    if (isOpen) {
      setLength(room.length);
      setWidth(room.width);
      setHeight(room.height);
      setThickness(room.thickness);
    }
  }, [isOpen, room]);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      length: Math.max(1.0, length),
      width: Math.max(1.0, width),
      height: Math.max(1.5, height),
      thickness
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface-elevated border border-[var(--color-accent-500)]/40 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-surface border-b border-divider">
          <div className="flex items-center gap-2 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold text-sm">
            <Maximize size={16} />
            <span>Ubah Dimensi: {room.name}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted hover:text-primary rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Form */}
        <form onSubmit={handleApply} className="p-5 space-y-4 text-xs">
          {/* Panjang (L) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-secondary font-medium">
              <span>Panjang Ruangan (L):</span>
              <span className="font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold">{Math.round(length * 1000)} mm</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="100"
                min="1000"
                max="30000"
                value={Math.round(length * 1000)}
                autoFocus={initialFocusField === 'length'}
                onChange={e => setLength((Number(e.target.value) || 1000) / 1000)}
                className="flex-1 h-9 bg-surface text-primary font-mono text-sm px-3 rounded-lg border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setLength(l => Math.max(1, +(l - 0.5).toFixed(2)))}
                  className="px-2.5 h-9 bg-surface hover:bg-surface-hover rounded-lg border border-divider text-primary font-bold"
                >
                  -500
                </button>
                <button
                  type="button"
                  onClick={() => setLength(l => +(l + 0.5).toFixed(2))}
                  className="px-2.5 h-9 bg-surface hover:bg-surface-hover rounded-lg border border-divider text-primary font-bold"
                >
                  +500
                </button>
              </div>
            </div>
          </div>

          {/* Lebar (W) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-secondary font-medium">
              <span>Lebar Ruangan (W):</span>
              <span className="font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold">{Math.round(width * 1000)} mm</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="100"
                min="1000"
                max="30000"
                value={Math.round(width * 1000)}
                autoFocus={initialFocusField === 'width'}
                onChange={e => setWidth((Number(e.target.value) || 1000) / 1000)}
                className="flex-1 h-9 bg-surface text-primary font-mono text-sm px-3 rounded-lg border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWidth(w => Math.max(1, +(w - 0.5).toFixed(2)))}
                  className="px-2.5 h-9 bg-surface hover:bg-surface-hover rounded-lg border border-divider text-primary font-bold"
                >
                  -500
                </button>
                <button
                  type="button"
                  onClick={() => setWidth(w => +(w + 0.5).toFixed(2))}
                  className="px-2.5 h-9 bg-surface hover:bg-surface-hover rounded-lg border border-divider text-primary font-bold"
                >
                  +500
                </button>
              </div>
            </div>
          </div>

          {/* Tinggi (H) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-secondary font-medium">
              <span>Tinggi Ruangan (H):</span>
              <span className="font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold">{Math.round(height * 1000)} mm</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="100"
                min="1500"
                max="12000"
                value={Math.round(height * 1000)}
                autoFocus={initialFocusField === 'height'}
                onChange={e => setHeight((Number(e.target.value) || 1500) / 1000)}
                className="flex-1 h-9 bg-surface text-primary font-mono text-sm px-3 rounded-lg border border-divider focus:border-[var(--color-accent-500)] focus:outline-none"
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setHeight(h => Math.max(1.5, +(h - 0.2).toFixed(2)))}
                  className="px-2.5 h-9 bg-surface hover:bg-surface-hover rounded-lg border border-divider text-primary font-bold"
                >
                  -200
                </button>
                <button
                  type="button"
                  onClick={() => setHeight(h => +(h + 0.2).toFixed(2))}
                  className="px-2.5 h-9 bg-surface hover:bg-surface-hover rounded-lg border border-divider text-primary font-bold"
                >
                  +200
                </button>
              </div>
            </div>
          </div>

          {/* Tebal Panel */}
          <div className="space-y-1.5 pt-1">
            <label className="text-secondary font-medium">Tebal Panel Sandwich:</label>
            <div className="grid grid-cols-6 gap-1">
              {([50, 75, 100, 125, 150, 200] as PanelThickness[]).map(th => (
                <button
                  key={th}
                  type="button"
                  onClick={() => setThickness(th)}
                  className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                    thickness === th
                      ? 'bg-[var(--color-accent-600)] text-white border-[var(--color-accent-500)] shadow-xs'
                      : 'bg-surface text-secondary border-divider hover:bg-surface-hover'
                  }`}
                >
                  {th}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-surface-hover text-secondary hover:text-primary font-medium rounded-xl border border-divider transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check size={15} /> Simpan Dimensi
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
