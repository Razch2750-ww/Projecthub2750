import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StartWithType } from '../types';
import { LayoutGrid, PenTool, Sparkles, X, Package } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { SearchableDropdown } from '../../../components/ui/SearchableDropdown';

interface NewCADProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    projectName: string;
    sketchName: string;
    startWith: StartWithType;
    ambientTemp: number;
    ambientRH: number;
    selectedProductId?: string;
  }) => void;
}

export const NewCADProjectModal: React.FC<NewCADProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [projectName, setProjectName] = useState('Project 1');
  const [sketchName, setSketchName] = useState('Sketch 1');
  const [startWith, setStartWith] = useState<StartWithType>('template');
  const [ambientTemp, setAmbientTemp] = useState(35);
  const [ambientRH, setAmbientRH] = useState(60);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [dbProducts, setDbProducts] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      getDocs(collection(db, 'products')).then(snap => {
        const items: any[] = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        setDbProducts(items);
      }).catch(err => console.error("Error fetching products in modal:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      projectName: projectName.trim() || 'Proyek Cold Storage',
      sketchName: sketchName.trim() || 'Sketch 1',
      startWith,
      ambientTemp,
      ambientRH,
      selectedProductId
    });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-surface-elevated border border-divider rounded-2xl shadow-2xl p-6 text-primary space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-divider pb-3">
          <div>
            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" />
              <span>Create New Project</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Choose how to start your sketch, then enter project and sketch names.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface-hover rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">
              Project Name
            </label>
            <input
              type="text"
              required
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Contoh: Cold Room Daging Jakarta"
              className="w-full h-10 bg-surface text-primary px-3.5 rounded-xl border border-divider text-sm focus:border-[var(--color-accent-500)] focus:outline-none"
            />
          </div>

          {/* Start With (Template vs Empty) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">
              Start With
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStartWith('template')}
                className={`py-3 px-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  startWith === 'template'
                    ? 'bg-[var(--color-accent-500)]/15 border-[var(--color-accent-500)] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] shadow-xs'
                    : 'bg-surface border-divider text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                <LayoutGrid size={18} />
                <span className="text-xs font-bold">Template</span>
                <span className="text-[10px] text-muted">Balok persegi cepat</span>
              </button>

              <button
                type="button"
                onClick={() => setStartWith('empty')}
                className={`py-3 px-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  startWith === 'empty'
                    ? 'bg-[var(--color-accent-500)]/15 border-[var(--color-accent-500)] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] shadow-xs'
                    : 'bg-surface border-divider text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                <PenTool size={18} />
                <span className="text-xs font-bold">Empty (Custom)</span>
                <span className="text-[10px] text-muted">Gambar bebas (N, E, S, W)</span>
              </button>
            </div>
            <p className="text-[11px] text-muted italic pt-1">
              {startWith === 'template'
                ? 'Start with a standard 4000×4000 mm rectangular room.'
                : 'Draw custom room shape on a blank 3D canvas.'}
            </p>
          </div>

          {/* Ambient Conditions */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary">Ambient (°C DB)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={ambientTemp}
                  onChange={e => setAmbientTemp(Number(e.target.value))}
                  className="w-full h-9 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center rounded-xl border border-divider text-sm"
                />
                <span className="text-xs text-muted font-mono">°C</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-secondary">Humidity (%RH)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={ambientRH}
                  onChange={e => setAmbientRH(Number(e.target.value))}
                  className="w-full h-9 bg-surface text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono text-center rounded-xl border border-divider text-sm"
                />
                <span className="text-xs text-muted font-mono">%</span>
              </div>
            </div>
          </div>

          {/* Sketch Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider">
              Sketch Name
            </label>
            <input
              type="text"
              required
              value={sketchName}
              onChange={e => setSketchName(e.target.value)}
              placeholder="Sketch 1"
              className="w-full h-10 bg-surface text-primary px-3.5 rounded-xl border border-divider text-sm focus:border-[var(--color-accent-500)] focus:outline-none"
            />
          </div>

          {/* Product Database Selection (Searchable & Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <Package size={13} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Pilih Produk / Mesin Utama (Opsional)
            </label>
            <SearchableDropdown
              options={dbProducts.map(p => ({
                id: p.id,
                label: `${p.brand} ${p.model}`,
                subLabel: p.specifications || p.type
              }))}
              value={selectedProductId}
              onChange={setSelectedProductId}
              placeholder="Cari atau pilih produk (opsional)..."
              emptyLabel="-- Tanpa Produk / Custom --"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-divider">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted hover:text-primary rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white font-bold text-xs rounded-xl shadow-xs transition-all hover:scale-[1.02]"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
