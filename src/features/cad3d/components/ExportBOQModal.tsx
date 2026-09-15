import React from 'react';
import { createPortal } from 'react-dom';
import { CADRoom, CADProject } from '../types';
import { calculateHeatLoad } from '../math/projection3d';
import {
  X,
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Zap,
  Box,
  Layers,
  DoorOpen,
  Fan
} from 'lucide-react';
import { toast } from 'sonner';

interface ExportBOQModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CADProject;
  rooms: CADRoom[];
  sketchName: string;
}

export const ExportBOQModal: React.FC<ExportBOQModalProps> = ({
  isOpen,
  onClose,
  project,
  rooms,
  sketchName
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  // Calculate bill of quantities across all rooms in sketch
  const summary = rooms.map(room => {
    const L = room.length;
    const W = room.width;
    const H = room.height;
    const th = room.thickness;

    // Surface areas
    const wallArea = 2 * (L * H) + 2 * (W * H);
    const ceilingArea = L * W;
    const floorArea = room.floorType !== 'tanpa lantai' ? L * W : 0;
    const partitionArea = (room.partitions || []).reduce(
      (acc, p) => acc + (p.length || W) * (p.height || H),
      0
    );
    const totalPanelM2 = wallArea + ceilingArea + floorArea + partitionArea;
    const internalVolumeM3 = L * W * H;

    const heat = calculateHeatLoad(room, room.heatLoadParams);

    return {
      room,
      L,
      W,
      H,
      th,
      wallArea,
      ceilingArea,
      floorArea,
      partitionArea,
      totalPanelM2,
      internalVolumeM3,
      heat,
      doorsCount: (room.doors || []).length,
      evapsCount: (room.evaporators || []).length
    };
  });

  const grandTotalM2 = summary.reduce((acc, s) => acc + s.totalPanelM2, 0);
  const grandTotalVolume = summary.reduce((acc, s) => acc + s.internalVolumeM3, 0);
  const grandTotalKW = summary.reduce((acc, s) => acc + s.heat.totalHeatLoadKW, 0);
  const grandTotalBTU = summary.reduce((acc, s) => acc + s.heat.totalHeatLoadBTU, 0);
  const grandTotalHP = summary.reduce((acc, s) => acc + s.heat.requiredHP, 0);

  const handleCopyText = () => {
    let text = `=== BILL OF QUANTITIES (BQ) & SPESIFIKASI TEKNIS COLD STORAGE ===\n`;
    text += `Proyek: ${project.name} | Layout: ${sketchName}\n`;
    text += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n\n`;

    summary.forEach((s, idx) => {
      text += `RUANGAN ${idx + 1}: ${s.room.name}\n`;
      text += `- Dimensi Luar (P x L x T): ${Math.round(s.L * 1000)} mm x ${Math.round(s.W * 1000)} mm x ${Math.round(s.H * 1000)} mm\n`;
      text += `- Volume Ruang: ${s.internalVolumeM3.toFixed(1)} m³\n`;
      text += `- Tebal Panel: ${s.th} mm (${s.room.material || 'PU'})\n`;
      text += `- Luas Panel Total: ${s.totalPanelM2.toFixed(1)} m² (Dinding: ${s.wallArea.toFixed(1)}m², Plafon: ${s.ceilingArea.toFixed(1)}m²)\n`;
      text += `- Pintu: ${s.doorsCount} unit (${s.room.doors?.map(d => `${d.type} ${Math.round(d.width * 1000)}x${Math.round(d.height * 1000)} mm`).join(', ') || 'None'})\n`;
      text += `- Evaporator: ${s.evapsCount} unit (${s.heat.recommendedMachinery.evaporatorModel})\n`;
      text += `- Beban Pendinginan: ${s.heat.totalHeatLoadKW} kW (${s.heat.totalHeatLoadBTU.toLocaleString()} BTU/hr)\n`;
      text += `- Rekomendasi Condensing Unit: ${s.heat.recommendedMachinery.condenserModel} (${s.heat.requiredHP} HP)\n\n`;
    });

    text += `--- TOTAL SUMMARY ---\n`;
    text += `Total Luas Panel Sandwich: ${grandTotalM2.toFixed(1)} m²\n`;
    text += `Total Volume Terinsulasi: ${grandTotalVolume.toFixed(1)} m³\n`;
    text += `Total Kapasitas Mesin Pendingin: ${grandTotalKW.toFixed(2)} kW (${grandTotalHP.toFixed(1)} HP / ${grandTotalBTU.toLocaleString()} BTU/hr)\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Rincian BOQ berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCSV = () => {
    const rows = [
      ['No', 'Nama Ruangan', 'Panjang (mm)', 'Lebar (mm)', 'Tinggi (mm)', 'Tebal Panel (mm)', 'Luas Panel (m2)', 'Volume (m3)', 'Target Temp (C)', 'Total Heat Load (kW)', 'Dibutuhkan HP', 'Model CDU', 'Model Evaporator'],
      ...summary.map((s, idx) => [
        idx + 1,
        `"${s.room.name}"`,
        Math.round(s.L * 1000),
        Math.round(s.W * 1000),
        Math.round(s.H * 1000),
        s.th,
        s.totalPanelM2.toFixed(2),
        s.internalVolumeM3.toFixed(2),
        s.room.heatLoadParams.roomTemp,
        s.heat.totalHeatLoadKW,
        s.heat.requiredHP,
        `"${s.heat.recommendedMachinery.condenserModel}"`,
        `"${s.heat.recommendedMachinery.evaporatorModel}"`
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BOQ_${project.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('File CSV BOQ berhasil diunduh!');
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-surface-elevated border border-divider rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface border-b border-divider">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[var(--color-accent-500)]/15 border border-[var(--color-accent-500)]/30 rounded-xl text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary leading-tight">
                Bill of Quantities (BQ) & Estimasi Material CAD
              </h2>
              <p className="text-xs text-muted font-mono">
                {project.name} • {sketchName} ({rooms.length} Ruangan)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted hover:text-primary hover:bg-surface-hover rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI Top Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-surface rounded-xl border border-[var(--color-accent-500)]/30">
              <div className="text-[11px] text-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> Total Luas Panel
              </div>
              <div className="text-2xl font-extrabold text-primary font-mono mt-1">
                {grandTotalM2.toFixed(1)} <span className="text-sm font-semibold text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">m²</span>
              </div>
              <div className="text-[11px] text-muted mt-0.5">Sandwich Panel Dinding + Plafon</div>
            </div>

            <div className="p-3.5 bg-surface rounded-xl border border-amber-500/30">
              <div className="text-[11px] text-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Zap size={14} className="text-amber-500" /> Beban Pendinginan Total
              </div>
              <div className="text-2xl font-extrabold text-primary font-mono mt-1">
                {grandTotalKW.toFixed(2)} <span className="text-sm font-semibold text-amber-500">kW</span>
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {grandTotalHP.toFixed(1)} HP ({grandTotalBTU.toLocaleString()} BTU/hr)
              </div>
            </div>

            <div className="p-3.5 bg-surface rounded-xl border border-emerald-500/30">
              <div className="text-[11px] text-muted uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Box size={14} className="text-emerald-500" /> Total Volume Ruang
              </div>
              <div className="text-2xl font-extrabold text-primary font-mono mt-1">
                {grandTotalVolume.toFixed(1)} <span className="text-sm font-semibold text-emerald-500">m³</span>
              </div>
              <div className="text-[11px] text-muted mt-0.5">Ruang Simpan Bersih</div>
            </div>
          </div>

          {/* Table Details */}
          <div className="border border-divider rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface text-secondary border-b border-divider font-mono text-[11px]">
                  <th className="p-3">Ruangan</th>
                  <th className="p-3">Dimensi (P x L x T)</th>
                  <th className="p-3">Tebal Panel</th>
                  <th className="p-3">Luas Panel (m²)</th>
                  <th className="p-3">Pintu & Evap</th>
                  <th className="p-3">Heat Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider font-mono">
                {summary.map(s => (
                  <tr key={s.room.id} className="hover:bg-surface-hover transition-colors">
                    <td className="p-3 font-bold text-primary font-sans">
                      {s.room.name}
                      <div className="text-[10px] text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)] font-mono font-normal">
                        {s.room.heatLoadParams.roomTemp > 0
                          ? `+${s.room.heatLoadParams.roomTemp}`
                          : s.room.heatLoadParams.roomTemp}
                        °C • {s.internalVolumeM3.toFixed(1)} m³
                      </div>
                    </td>
                    <td className="p-3 text-secondary">
                      {Math.round(s.L * 1000)} × {Math.round(s.W * 1000)} × {Math.round(s.H * 1000)} mm
                    </td>
                    <td className="p-3 text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]">{s.th} mm {s.room.material || 'PU'}</td>
                    <td className="p-3 font-bold text-primary">
                      {s.totalPanelM2.toFixed(1)} m²
                    </td>
                    <td className="p-3 text-secondary">
                      <div className="flex items-center gap-1 text-[11px]">
                        <DoorOpen size={12} className="text-[var(--color-accent-600)] dark:text-[var(--color-accent-400)]" /> {s.doorsCount} Pintu
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted">
                        <Fan size={12} className="text-emerald-500" /> {s.evapsCount} Evap
                      </div>
                    </td>
                    <td className="p-3 text-amber-500 font-bold">
                      {s.heat.totalHeatLoadKW} kW
                      <div className="text-[10px] text-muted font-normal">
                        {s.heat.requiredHP} HP CDU
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-surface border-t border-divider gap-3">
          <div className="text-xs text-muted">
            Format data dapat disinkronkan langsung ke modul Penawaran / Quotation.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-4 py-2 bg-surface-elevated hover:bg-surface-hover text-secondary hover:text-primary text-xs font-semibold rounded-xl border border-divider transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? 'Tersalin' : 'Salin Teks BQ'}
            </button>
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-[var(--color-accent-600)] hover:bg-[var(--color-accent-700)] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Download size={14} /> Download CSV
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
