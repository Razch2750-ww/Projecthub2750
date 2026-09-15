import React, { useRef, useState } from 'react';
import { CADRoom } from '../types';
import { Download, FileText, Check, Eye, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface Layout2DViewProps {
  rooms: CADRoom[];
  projectName: string;
  sketchName: string;
}

export const Layout2DView: React.FC<Layout2DViewProps> = ({
  rooms,
  projectName,
  sketchName
}) => {
  const [showDims, setShowDims] = useState(true);
  const [showWalls, setShowWalls] = useState(true);
  const [showCeiling, setShowCeiling] = useState(true);
  const [showAssembly, setShowAssembly] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleExportDrawing = () => {
    toast.success('Gambar 2D Blueprint berhasil diekspor ke format dokumen!');
    window.print();
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-surface rounded-2xl border border-divider overflow-hidden shadow-xl">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between px-6 py-3 bg-surface-elevated border-b border-divider gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted uppercase tracking-wider mr-2 flex items-center gap-1.5">
            <Layers size={14} /> Layer CAD:
          </span>

          <button
            onClick={() => setShowDims(!showDims)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showDims
                ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border-[var(--color-accent-500)]/50'
                : 'bg-surface text-secondary border-divider hover:bg-surface-hover'
            }`}
          >
            Dims (Dimensi)
          </button>

          <button
            onClick={() => setShowWalls(!showWalls)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showWalls
                ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border-[var(--color-accent-500)]/50'
                : 'bg-surface text-secondary border-divider hover:bg-surface-hover'
            }`}
          >
            Wall (Dinding)
          </button>

          <button
            onClick={() => setShowCeiling(!showCeiling)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showCeiling
                ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border-[var(--color-accent-500)]/50'
                : 'bg-surface text-secondary border-divider hover:bg-surface-hover'
            }`}
          >
            Ceiling (Plafon)
          </button>

          <button
            onClick={() => setShowAssembly(!showAssembly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              showAssembly
                ? 'bg-[var(--color-accent-500)]/15 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] border-[var(--color-accent-500)]/50'
                : 'bg-surface text-secondary border-divider hover:bg-surface-hover'
            }`}
          >
            Assembly Sheet
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportDrawing}
            className="px-4 py-2 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Download size={14} /> Export Blueprint PDF
          </button>
        </div>
      </div>

      {/* 2D Architectural Blueprint Canvas Area */}
      <div
        ref={printRef}
        className="flex-1 p-8 overflow-auto flex items-center justify-center bg-base relative"
      >
        {/* Engineering Blueprint Frame */}
        <div className="w-full max-w-4xl bg-surface-elevated border-2 border-[var(--color-accent-500)]/40 rounded-xl p-8 shadow-xl relative">
          {/* Header Title Block */}
          <div className="flex items-center justify-between border-b border-divider pb-4 mb-8">
            <div>
              <div className="text-xl font-mono font-bold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] tracking-wide uppercase">
                {projectName || 'COLD STORAGE PROJECT'}
              </div>
              <div className="text-xs font-mono text-muted mt-1">
                Layout Blueprint • Sketch: <strong className="text-primary">{sketchName}</strong>
              </div>
            </div>
            <div className="text-right text-xs font-mono text-muted">
              <div>Scale: 1:50 Metric</div>
              <div className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold">RJM COLD CHAIN CAD</div>
            </div>
          </div>

          {/* Rooms 2D Floor Plan Grid */}
          <div className="flex flex-wrap items-center justify-center gap-8 py-8">
            {rooms.map((room, rIdx) => {
              const L = room.length;
              const W = room.width;
              const scale = 32; // pixels per meter
              const boxWidth = L * scale;
              const boxHeight = W * scale;

              return (
                <div key={room.id} className="relative flex flex-col items-center">
                  {/* Top Dimension String */}
                  {showDims && (
                    <div className="w-full flex items-center justify-between text-[11px] font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold mb-2 border-b border-[var(--color-accent-500)]/40 pb-1">
                      <span>|</span>
                      <span>{Math.round(L * 1000).toLocaleString()} mm</span>
                      <span>|</span>
                    </div>
                  )}

                  <div className="flex items-center">
                    {/* Left Dimension String */}
                    {showDims && (
                      <div className="h-full flex flex-col justify-between text-[11px] font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-bold mr-2 border-r border-[var(--color-accent-500)]/40 pr-1">
                        <span>—</span>
                        <span className="-rotate-90">{Math.round(W * 1000).toLocaleString()} mm</span>
                        <span>—</span>
                      </div>
                    )}

                    {/* Room Box with Walls */}
                    <div
                      style={{ width: `${boxWidth}px`, height: `${boxHeight}px` }}
                      className={`relative bg-surface border-4 ${
                        showWalls ? 'border-[var(--color-accent-500)]' : 'border-divider'
                      } rounded shadow-inner flex flex-col items-center justify-center p-4`}
                    >
                      {/* Room Spec Label Center */}
                      <div className="text-center font-mono space-y-1 bg-surface-elevated/95 backdrop-blur-xs p-3 rounded-lg border border-[var(--color-accent-500)]/30 shadow-md">
                        <div className="text-sm font-bold text-primary uppercase">{room.name}</div>
                        <div className="text-xs text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">
                          {Math.round(L * 1000)} × {Math.round(W * 1000)} × {Math.round(room.height * 1000)} mm
                        </div>
                        <div className="text-[10px] text-secondary">
                          Luas: {(L * W).toFixed(1)} m² • Vol: {(L * W * room.height).toFixed(1)} m³
                        </div>
                        <div className="text-[10px] text-amber-500 font-bold">
                          Temp: {room.heatLoadParams.roomTemp > 0 ? `+${room.heatLoadParams.roomTemp}` : room.heatLoadParams.roomTemp}°C • {room.thickness}mm Panel
                        </div>
                      </div>

                      {/* Partitions representation */}
                      {room.partitions && room.partitions.map(part => {
                        const partLeft = (part.margin / L) * 100;
                        return (
                          <div
                            key={part.id}
                            style={{ left: `${partLeft}%` }}
                            className="absolute top-0 bottom-0 w-1.5 bg-[var(--color-accent-500)] border-x border-[var(--color-accent-300)] shadow-md flex items-center justify-center"
                          >
                            <span className="text-[8px] font-mono text-white font-extrabold bg-[var(--color-accent-600)] px-0.5 rounded -rotate-90">
                              {part.name}
                            </span>
                          </div>
                        );
                      })}

                      {/* Evaporator Unit footprint representation */}
                      {room.evaporators && room.evaporators.map(evap => (
                        <div
                          key={evap.id}
                          className="absolute top-2 left-1/2 -translate-x-1/2 bg-surface-elevated border border-[var(--color-accent-500)] px-3 py-1 rounded text-[9px] font-mono text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] shadow flex items-center gap-1"
                        >
                          <span className="w-2 h-2 rounded-full bg-[var(--color-accent-500)] animate-pulse" />
                          <span>{evap.name || 'EVAP-1'}</span>
                        </div>
                      ))}

                      {/* Door representation on front wall */}
                      {room.doors && room.doors.map(door => (
                        <div
                          key={door.id}
                          className="absolute bottom-0 left-6 bg-surface-elevated border border-[var(--color-accent-500)] px-2.5 py-0.5 rounded-t text-[9px] font-mono text-primary font-bold shadow"
                        >
                          🚪 {door.name || 'DOOR'} ({Math.round(door.width * 1000)} mm)
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Blueprint Footer Stamp */}
          <div className="mt-8 pt-4 border-t border-divider flex items-center justify-between text-xs font-mono text-muted">
            <div>Approved by: PT. REKAYASA JAYA MANDIRI ENGINEERING</div>
            <div>Date: {new Date().toLocaleDateString('id-ID')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
