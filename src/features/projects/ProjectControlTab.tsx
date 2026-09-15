import React from 'react';
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Download,
  FileText,
  Flag,
  PackageCheck,
  Snowflake,
  Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import { Project, Task } from '../../types';
import { Button } from '../../components/ui/Button';
import { buildProjectControlHtml, calculateWeightedProgress, getProjectControlFilename } from './projectControlExport';

interface ProjectControlTabProps {
  project: Project;
  projectTasks: Task[];
}

const COMPLETED_TASKS = new Set(['Selesai', 'Approved', 'Signed']);

const STAGES = [
  'Engineering / Approval',
  'Procurement / Fabrication',
  'Installation',
  'QA/QC',
  'Commissioning',
  'Punch List',
  'Handover',
];

const REQUIREMENT_GROUPS = [
  {
    title: 'Data & perencanaan',
    items: ['Project Information', 'Cold Room Database', 'Drawing & Approval', 'Weekly Progress', 'Daily Report', 'Manpower', 'Photo Documentation'],
  },
  {
    title: 'Pengadaan & instalasi',
    items: ['Procurement & Fabrication', 'Installation Checklist', 'Equipment Register', 'Refrigeration Register', 'Electrical Register', 'Project Gate'],
  },
  {
    title: 'Quality & closeout',
    items: ['103 Audit Instalasi', '52 Commissioning Detail', 'Commissioning Summary', 'Finding Register', 'Punch List', 'Handover'],
  },
  {
    title: 'Komersial & pelaporan',
    items: ['Variation Order', 'Budget & Cost', 'Action Plan', 'Issue / Risk', 'Project Reports', 'WhatsApp Update', 'Backup JSON'],
  },
];

const getStageIndex = (status?: Project['status']) => {
  if (status === 'Tahap 6: Completed') return STAGES.length;
  if (status === 'Tahap 5: Under Construction') return 2;
  if (status === 'Tahap 4: Pre Construction') return 1;
  return 0;
};

const getActiveWeek = (entryDate: string) => {
  const start = new Date(`${entryDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 1;
  return Math.max(1, Math.ceil((Date.now() - start.getTime()) / 604_800_000));
};

const formatPercent = (value: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)}%`;

export const ProjectControlTab: React.FC<ProjectControlTabProps> = ({ project, projectTasks }) => {
  const locationRooms = project.locations?.flatMap((location) => location.rooms || []) || [];
  const rooms = locationRooms.length ? locationRooms : project.rooms || [];
  const completedTasks = projectTasks.filter((task) => COMPLETED_TASKS.has(task.status)).length;
  const taskProgress = projectTasks.length ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
  const drawingCount = project.documents?.filter((document) => document.category === 'Drawings').length || 0;
  const activeStageIndex = getStageIndex(project.status);
  const activeWeek = getActiveWeek(project.entryDate);
  const weightedProgress = calculateWeightedProgress(projectTasks);
  const hasAssignedWeight = weightedProgress.rows.some((row) => row.weight !== null);

  const dataSignals = [
    {
      label: 'Project Information',
      detail: `${project.locations?.length || 0} lokasi · minggu ${activeWeek}`,
      ready: true,
    },
    {
      label: 'Cold Room Database',
      detail: rooms.length ? `${rooms.length} room terdaftar` : 'Belum ada room',
      ready: rooms.length > 0,
    },
    {
      label: 'Drawing & Approval',
      detail: drawingCount ? `${drawingCount} drawing tersimpan` : 'Belum ada drawing',
      ready: drawingCount > 0,
    },
    {
      label: 'Progress pekerjaan',
      detail: projectTasks.length ? `${completedTasks} dari ${projectTasks.length} tugas selesai` : 'Belum ada tugas',
      ready: projectTasks.length > 0,
    },
  ];

  const handleExportHtml = () => {
    try {
      const location = project.locations?.map((item) => [item.name, item.address].filter(Boolean).join(' · ')).filter(Boolean).join(', ')
        || project.address
        || 'Belum ditentukan';
      const html = buildProjectControlHtml({
        projectTitle: project.ptName,
        status: project.status || 'Tahap 1: New',
        location,
        entryDate: project.entryDate,
        activeWeek,
        roomCount: rooms.length,
        drawingCount,
        totalTasks: projectTasks.length,
        completedTasks,
        taskProgress,
        weightedProgress,
        activeStageIndex,
        stages: STAGES,
        signals: dataSignals,
        requirementGroups: REQUIREMENT_GROUPS,
      });
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = getProjectControlFilename(project.ptName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      toast.success('HTML Project Control berhasil dibuat');
    } catch {
      toast.error('Gagal membuat HTML. Coba ulangi.');
    }
  };

  return (
    <section className="space-y-8" aria-labelledby={`project-control-${project.id}`}>
      <header className="flex flex-col gap-4 border-b border-divider pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 id={`project-control-${project.id}`} className="text-2xl font-semibold tracking-[-0.025em] text-primary">
            Project Control
          </h4>
          <p className="mt-2 max-w-[68ch] text-sm leading-6 text-secondary">
            Ringkasan kontrol cold-storage untuk {project.ptName}. Nilai di bawah membaca data proyek yang sudah tersimpan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="min-h-11 gap-2" onClick={handleExportHtml}>
            <Download size={15} aria-hidden="true" />
            Ekspor HTML
          </Button>
          <span className="max-w-full break-words rounded-full border border-divider bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-secondary">
            {project.status || 'Tahap 1: New'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-panel)] border border-divider bg-divider">
        {[
          { label: 'Active week', value: `W${String(activeWeek).padStart(2, '0')}` },
          { label: 'Cold rooms', value: rooms.length },
          { label: 'Drawing files', value: drawingCount },
          { label: 'Task progress', value: `${taskProgress}%` },
          { label: 'Total bobot', value: hasAssignedWeight ? formatPercent(weightedProgress.totalWeight) : 'Belum diisi' },
          { label: 'Aktual berbobot', value: hasAssignedWeight ? formatPercent(weightedProgress.weightedActual) : 'Belum diisi' },
        ].map((metric) => (
          <article key={metric.label} className="bg-surface-elevated p-4 sm:p-5">
            <p className="text-xs font-medium text-muted">{metric.label}</p>
            <p className="data-value mt-3 text-2xl font-semibold text-primary">{metric.value}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-7">
        <section className="border-y border-divider py-6" aria-labelledby={`progress-${project.id}`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h5 id={`progress-${project.id}`} className="text-base font-semibold text-primary">Progress berdasarkan tugas</h5>
              <p className="mt-1 text-xs leading-5 text-muted">Actual progress dihitung dari tugas berstatus selesai, approved, atau signed.</p>
            </div>
            <span className="data-value text-3xl font-semibold text-primary">{taskProgress}%</span>
          </div>
          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-surface-hover"
            role="progressbar"
            aria-label="Progress tugas proyek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={taskProgress}
          >
            <div className="h-full rounded-full bg-[var(--color-accent-600)] transition-[width] duration-500" style={{ width: `${taskProgress}%` }} />
          </div>
          <p className="mt-3 text-xs text-secondary">{completedTasks} selesai · {Math.max(0, projectTasks.length - completedTasks)} masih berjalan</p>
        </section>

        <section className="border-y border-divider py-6" aria-labelledby={`readiness-${project.id}`}>
          <h5 id={`readiness-${project.id}`} className="text-base font-semibold text-primary">Kesiapan data utama</h5>
          <div className="mt-4 divide-y divide-divider">
            {dataSignals.map((signal) => (
              <div key={signal.label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">{signal.label}</p>
                  <p className="mt-0.5 text-xs text-muted">{signal.detail}</p>
                </div>
                <span className={`shrink-0 text-xs font-semibold ${signal.ready ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {signal.ready ? 'Terhubung' : 'Perlu data'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section aria-labelledby={`weights-${project.id}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h5 id={`weights-${project.id}`} className="text-base font-semibold text-primary">Bobot pekerjaan</h5>
            <p className="mt-1 text-xs leading-5 text-muted">Kontribusi aktual = bobot × progres aktual ÷ 100.</p>
          </div>
          {weightedProgress.weightIsComplete ? (
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Bobot lengkap 100%</p>
          ) : (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle size={14} aria-hidden="true" />
              {weightedProgress.missingWeightCount
                ? `${weightedProgress.missingWeightCount} tugas belum diberi bobot`
                : `Total bobot ${formatPercent(weightedProgress.totalWeight)}, target 100%`}
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-panel)] border border-divider bg-divider lg:grid-cols-4">
          {[
            { label: 'Total bobot', value: formatPercent(weightedProgress.totalWeight) },
            { label: 'Aktual berbobot', value: formatPercent(weightedProgress.weightedActual) },
            { label: 'Rencana berbobot', value: weightedProgress.weightedPlanned === null ? 'Belum lengkap' : formatPercent(weightedProgress.weightedPlanned) },
            { label: 'Deviasi', value: weightedProgress.deviation === null ? 'Belum tersedia' : `${weightedProgress.deviation > 0 ? '+' : ''}${formatPercent(weightedProgress.deviation)}` },
          ].map((metric) => (
            <div key={metric.label} className="min-w-0 bg-surface-elevated p-4">
              <p className="text-[11px] font-medium text-muted">{metric.label}</p>
              <p className="data-value mt-2 break-words text-lg font-semibold text-primary">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-x-auto rounded-[var(--radius-control)] border border-divider">
          <table className="w-full min-w-[44rem] border-collapse text-left text-xs">
            <thead className="bg-surface-hover text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Pekerjaan</th>
                <th className="px-4 py-3 font-semibold">Bobot</th>
                <th className="px-4 py-3 font-semibold">Aktual</th>
                <th className="px-4 py-3 font-semibold">Rencana</th>
                <th className="px-4 py-3 font-semibold">Kontribusi aktual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {weightedProgress.rows.length ? weightedProgress.rows.map((row) => (
                <tr key={row.id} className="bg-surface-elevated">
                  <td className="max-w-72 px-4 py-3 font-medium text-primary"><span className="line-clamp-2">{row.title}</span></td>
                  <td className={`data-value whitespace-nowrap px-4 py-3 ${row.weight === null ? 'text-amber-600 dark:text-amber-400' : 'text-secondary'}`}>
                    {row.weight === null ? 'Belum diisi' : formatPercent(row.weight)}
                  </td>
                  <td className="data-value whitespace-nowrap px-4 py-3 text-secondary">
                    {formatPercent(row.actualProgress)}{row.actualFromStatus ? <span className="ml-1 text-[10px] text-muted">dari status</span> : null}
                  </td>
                  <td className={`data-value whitespace-nowrap px-4 py-3 ${row.plannedProgress === null ? 'text-amber-600 dark:text-amber-400' : 'text-secondary'}`}>
                    {row.plannedProgress === null ? 'Belum diisi' : formatPercent(row.plannedProgress)}
                  </td>
                  <td className="data-value whitespace-nowrap px-4 py-3 font-semibold text-primary">
                    {row.actualContribution === null ? '-' : formatPercent(row.actualContribution)}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="bg-surface-elevated px-4 py-8 text-center text-muted">Belum ada tugas untuk dihitung.</td></tr>
              )}
            </tbody>
            {weightedProgress.rows.length > 0 && (
              <tfoot className="border-t border-divider bg-surface-hover font-semibold text-primary">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  <td className="data-value px-4 py-3">{formatPercent(weightedProgress.totalWeight)}</td>
                  <td className="px-4 py-3" />
                  <td className="data-value px-4 py-3">{weightedProgress.weightedPlanned === null ? '-' : formatPercent(weightedProgress.weightedPlanned)}</td>
                  <td className="data-value px-4 py-3">{formatPercent(weightedProgress.weightedActual)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">Jika aktual belum diisi, status selesai, approved, atau signed dibaca 100%; status lainnya dibaca 0%. Isi bobot melalui Edit Tugas.</p>
      </section>

      <section aria-labelledby={`stages-${project.id}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h5 id={`stages-${project.id}`} className="text-base font-semibold text-primary">Project stage</h5>
            <p className="mt-1 text-xs text-muted">Posisi tahap mengikuti status proyek saat ini.</p>
          </div>
          {(project.status === 'Paused' || project.status === 'Cancelled') && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertTriangle size={14} aria-hidden="true" /> Status proyek perlu perhatian
            </span>
          )}
        </div>
        <ol className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-panel)] border border-divider bg-divider">
          {STAGES.map((stage, index) => {
            const complete = index < activeStageIndex;
            const active = index === activeStageIndex && activeStageIndex < STAGES.length;
            return (
              <li key={stage} className={`min-h-24 bg-surface-elevated p-4 ${active ? 'bg-[var(--color-accent-50)]' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${complete ? 'border-emerald-500 bg-emerald-500 text-white' : active ? 'border-[var(--color-accent-600)] text-[var(--color-accent-700)]' : 'border-divider text-muted'}`}>
                    {complete ? <Check size={14} aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="text-[10px] font-semibold text-muted">{complete ? 'Selesai' : active ? 'Aktif' : 'Berikutnya'}</span>
                </div>
                <p className="mt-4 text-xs font-semibold leading-5 text-primary">{stage}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby={`scope-${project.id}`}>
        <h5 id={`scope-${project.id}`} className="text-base font-semibold text-primary">Cakupan Project Control</h5>
        <p className="mt-1 max-w-[72ch] text-xs leading-5 text-muted">
          Struktur berikut berasal dari brief cold-storage yang dilampirkan. Modul yang belum memiliki sumber data ditampilkan sebagai cakupan pengembangan, bukan angka rekaan.
        </p>
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-px overflow-hidden rounded-[var(--radius-panel)] border border-divider bg-divider">
          {REQUIREMENT_GROUPS.map((group, index) => {
            const icons = [FileText, PackageCheck, ClipboardCheck, Flag];
            const Icon = icons[index];
            return (
              <article key={group.title} className="bg-surface-elevated p-5">
                <Icon size={20} className="text-[var(--color-accent-600)]" aria-hidden="true" />
                <h6 className="mt-5 text-sm font-semibold text-primary">{group.title}</h6>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-secondary">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--color-accent-500)]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      <section className="divide-y divide-divider border-y border-divider lg:grid lg:grid-cols-3 lg:divide-x lg:divide-y-0" aria-label="Aturan kontrol utama">
        <article className="py-5 lg:px-5 lg:first:pl-0">
          <Wrench size={19} className="text-[var(--color-accent-600)]" aria-hidden="true" />
          <h6 className="mt-4 text-sm font-semibold text-primary">Progress</h6>
          <p className="mt-2 text-xs leading-5 text-secondary">Contribution = weight × actual progress. Planned progress dan deviation perlu modul jadwal khusus.</p>
        </article>
        <article className="py-5 lg:px-5">
          <ClipboardCheck size={19} className="text-[var(--color-accent-600)]" aria-hidden="true" />
          <h6 className="mt-4 text-sm font-semibold text-primary">QA/QC decision</h6>
          <p className="mt-2 text-xs leading-5 text-secondary">Critical NG wajib menghasilkan HOLD. Audit score mengecualikan status N/A dari denominator.</p>
        </article>
        <article className="py-5 lg:px-5 lg:last:pr-0">
          <Snowflake size={19} className="text-[var(--color-accent-600)]" aria-hidden="true" />
          <h6 className="mt-4 text-sm font-semibold text-primary">Commissioning</h6>
          <p className="mt-2 text-xs leading-5 text-secondary">Nilai tekanan, arus, superheat, dan subcooling harus mengikuti approved design serta data manufacturer.</p>
        </article>
      </section>
    </section>
  );
};
