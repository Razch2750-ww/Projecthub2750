import type { Task } from '../../types';

export interface ProjectControlExportSignal {
  label: string;
  detail: string;
  ready: boolean;
}

export interface ProjectControlExportGroup {
  title: string;
  items: string[];
}

export interface ProjectControlExportData {
  projectTitle: string;
  status: string;
  location: string;
  entryDate: string;
  activeWeek: number;
  roomCount: number;
  drawingCount: number;
  totalTasks: number;
  completedTasks: number;
  taskProgress: number;
  weightedProgress: WeightedProgressSummary;
  activeStageIndex: number;
  stages: string[];
  signals: ProjectControlExportSignal[];
  requirementGroups: ProjectControlExportGroup[];
}

type WeightedTaskInput = Pick<Task, 'id' | 'title' | 'status' | 'weight' | 'actualProgress' | 'plannedProgress'>;

export interface WeightedProgressRow {
  id: string;
  title: string;
  weight: number | null;
  actualProgress: number;
  plannedProgress: number | null;
  actualContribution: number | null;
  plannedContribution: number | null;
  actualFromStatus: boolean;
}

export interface WeightedProgressSummary {
  rows: WeightedProgressRow[];
  totalWeight: number;
  weightedActual: number;
  weightedPlanned: number | null;
  deviation: number | null;
  missingWeightCount: number;
  weightIsComplete: boolean;
}

const COMPLETED_STATUSES = new Set<Task['status']>(['Selesai', 'Approved', 'Signed']);
const roundOne = (value: number) => Math.round(value * 10) / 10;
const percentageOrNull = (value?: number) => (
  typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null
);

export const calculateWeightedProgress = (tasks: WeightedTaskInput[]): WeightedProgressSummary => {
  const rows = tasks.map((task) => {
    const weight = percentageOrNull(task.weight);
    const manualActual = percentageOrNull(task.actualProgress);
    const actualProgress = manualActual ?? (COMPLETED_STATUSES.has(task.status) ? 100 : 0);
    const plannedProgress = percentageOrNull(task.plannedProgress);

    return {
      id: task.id,
      title: task.title,
      weight,
      actualProgress,
      plannedProgress,
      actualContribution: weight === null ? null : roundOne(weight * actualProgress / 100),
      plannedContribution: weight === null || plannedProgress === null ? null : roundOne(weight * plannedProgress / 100),
      actualFromStatus: manualActual === null,
    };
  });
  const weightedRows = rows.filter((row) => row.weight !== null);
  const totalWeight = roundOne(weightedRows.reduce((sum, row) => sum + (row.weight || 0), 0));
  const weightedActual = roundOne(weightedRows.reduce((sum, row) => sum + (row.actualContribution || 0), 0));
  const hasCompletePlan = weightedRows.length > 0 && weightedRows.every((row) => row.plannedProgress !== null);
  const weightedPlanned = hasCompletePlan
    ? roundOne(weightedRows.reduce((sum, row) => sum + (row.plannedContribution || 0), 0))
    : null;

  return {
    rows,
    totalWeight,
    weightedActual,
    weightedPlanned,
    deviation: weightedPlanned === null ? null : roundOne(weightedActual - weightedPlanned),
    missingWeightCount: rows.length - weightedRows.length,
    weightIsComplete: rows.length > 0 && rows.length === weightedRows.length && Math.abs(totalWeight - 100) < 0.05,
  };
};

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
};

export const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);

const formatDate = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Belum ditentukan';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

const dateStamp = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getProjectControlFilename = (projectTitle: string, generatedAt = new Date()) => {
  const safeTitle = projectTitle
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .slice(0, 80) || 'Project';

  return `Project_Control_${safeTitle}_${dateStamp(generatedAt)}.html`;
};

export const buildProjectControlHtml = (data: ProjectControlExportData, generatedAt = new Date()) => {
  const progress = Math.min(100, Math.max(0, Math.round(data.taskProgress)));
  const weighted = data.weightedProgress;
  const escapedProjectTitle = escapeHtml(data.projectTitle);
  const generatedLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(generatedAt);
  const formatPercent = (value: number) => `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)}%`;

  const metrics = [
    ['Active week', `W${String(data.activeWeek).padStart(2, '0')}`],
    ['Cold rooms', data.roomCount],
    ['Drawing files', data.drawingCount],
    ['Task progress', `${progress}%`],
    ['Total bobot', formatPercent(weighted.totalWeight)],
    ['Aktual berbobot', formatPercent(weighted.weightedActual)],
  ];

  const metricMarkup = metrics.map(([label, value]) => `
    <article class="metric">
      <p>${escapeHtml(label)}</p>
      <strong>${escapeHtml(value)}</strong>
    </article>`).join('');

  const signalMarkup = data.signals.map((signal) => `
    <div class="signal">
      <div><strong>${escapeHtml(signal.label)}</strong><span>${escapeHtml(signal.detail)}</span></div>
      <b class="${signal.ready ? 'ready' : 'needed'}">${signal.ready ? 'Terhubung' : 'Perlu data'}</b>
    </div>`).join('');

  const stageMarkup = data.stages.map((stage, index) => {
    const complete = index < data.activeStageIndex;
    const active = index === data.activeStageIndex && data.activeStageIndex < data.stages.length;
    const state = complete ? 'Selesai' : active ? 'Aktif' : 'Berikutnya';
    return `
      <li class="stage ${active ? 'active' : ''}">
        <div><span class="stage-number ${complete ? 'complete' : ''}">${complete ? '&#10003;' : index + 1}</span><b>${state}</b></div>
        <p>${escapeHtml(stage)}</p>
      </li>`;
  }).join('');

  const groupMarkup = data.requirementGroups.map((group) => `
    <article class="scope-card">
      <h3>${escapeHtml(group.title)}</h3>
      <ul>${group.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </article>`).join('');

  const weightRowsMarkup = weighted.rows.length
    ? weighted.rows.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.title)}</strong></td>
        <td class="number">${row.weight === null ? '<span class="missing">Belum diisi</span>' : formatPercent(row.weight)}</td>
        <td class="number">${formatPercent(row.actualProgress)}${row.actualFromStatus ? '<small> dari status</small>' : ''}</td>
        <td class="number">${row.plannedProgress === null ? '<span class="missing">Belum diisi</span>' : formatPercent(row.plannedProgress)}</td>
        <td class="number">${row.actualContribution === null ? '-' : formatPercent(row.actualContribution)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" class="empty">Belum ada tugas untuk dihitung.</td></tr>';
  const weightStatus = weighted.weightIsComplete
    ? 'Bobot lengkap dan berjumlah 100%.'
    : weighted.missingWeightCount
      ? `${weighted.missingWeightCount} tugas belum memiliki bobot.`
      : `Total bobot ${formatPercent(weighted.totalWeight)} belum mencapai 100%.`;

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Project Control · ${escapedProjectTitle}</title>
  <style>
    :root { color-scheme: light; --ink:#1d2724; --muted:#66716d; --line:#d8dfdc; --surface:#f4f6f5; --accent:#006b57; --accent-soft:#e7f3ef; --warn:#9a6700; }
    * { box-sizing: border-box; }
    body { margin:0; background:#fff; color:var(--ink); font-family:"Segoe UI",Arial,sans-serif; line-height:1.5; }
    main { width:min(1180px, calc(100% - 32px)); margin:0 auto; padding:56px 0 72px; }
    p,h1,h2,h3 { margin:0; }
    .hero { display:flex; justify-content:space-between; gap:32px; align-items:flex-end; padding-bottom:28px; border-bottom:1px solid var(--line); }
    h1 { font-size:clamp(32px,6vw,64px); line-height:1; letter-spacing:-.04em; }
    .subtitle { max-width:720px; margin-top:16px; color:var(--muted); font-size:15px; }
    .status { display:inline-flex; max-width:300px; padding:8px 12px; border:1px solid var(--line); border-radius:999px; background:var(--surface); font-size:12px; font-weight:700; }
    .project-meta { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; margin:28px 0; background:var(--line); border:1px solid var(--line); border-radius:18px; overflow:hidden; }
    .project-meta div,.metric { background:#fff; padding:18px; }
    .project-meta span,.metric p { display:block; color:var(--muted); font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; }
    .project-meta strong { display:block; margin-top:6px; font-size:14px; overflow-wrap:anywhere; }
    .metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1px; background:var(--line); border:1px solid var(--line); border-radius:18px; overflow:hidden; }
    .metric strong { display:block; margin-top:12px; font-size:28px; letter-spacing:-.03em; }
    .split { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:44px; }
    .panel { padding:24px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
    h2 { font-size:18px; letter-spacing:-.015em; }
    .caption { margin-top:5px; color:var(--muted); font-size:12px; }
    .progress-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; }
    .progress-value { font-size:36px; letter-spacing:-.04em; }
    .track { height:8px; margin-top:22px; overflow:hidden; border-radius:999px; background:var(--surface); }
    .bar { width:${progress}%; height:100%; border-radius:inherit; background:var(--accent); }
    .signal { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:12px 0; border-bottom:1px solid var(--line); }
    .signal:last-child { border-bottom:0; padding-bottom:0; }
    .signal strong,.signal span { display:block; font-size:12px; }
    .signal span { margin-top:2px; color:var(--muted); }
    .signal b { flex:none; font-size:11px; }
    .ready { color:var(--accent); } .needed { color:var(--warn); }
    .section { margin-top:52px; }
    .stages { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; margin:18px 0 0; padding:0; list-style:none; background:var(--line); border:1px solid var(--line); border-radius:18px; overflow:hidden; }
    .stage { min-height:126px; padding:16px; background:#fff; }
    .stage.active { background:var(--accent-soft); }
    .stage div { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .stage div b { color:var(--muted); font-size:9px; text-transform:uppercase; }
    .stage-number { display:grid; width:28px; height:28px; place-items:center; border:1px solid var(--line); border-radius:50%; color:var(--muted); font-size:11px; font-weight:800; }
    .stage-number.complete { border-color:var(--accent); background:var(--accent); color:#fff; }
    .stage p { margin-top:22px; font-size:11px; font-weight:700; }
    .scope { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; margin-top:18px; background:var(--line); border:1px solid var(--line); border-radius:18px; overflow:hidden; }
    .scope-card { padding:22px; background:#fff; }
    .scope-card h3 { font-size:14px; }
    .scope-card ul { margin:14px 0 0; padding-left:18px; color:var(--muted); font-size:11px; }
    .scope-card li + li { margin-top:7px; }
    .weight-head { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; }
    .weight-status { color:var(--muted); font-size:11px; font-weight:700; text-align:right; }
    .weight-status.warning { color:var(--warn); }
    .weight-summary { display:grid; grid-template-columns:repeat(4,1fr); gap:1px; margin-top:18px; overflow:hidden; border:1px solid var(--line); border-radius:14px; background:var(--line); }
    .weight-summary div { padding:14px; background:#fff; }
    .weight-summary span,.weight-summary strong { display:block; }
    .weight-summary span { color:var(--muted); font-size:10px; font-weight:700; text-transform:uppercase; }
    .weight-summary strong { margin-top:6px; font-size:18px; }
    .table-wrap { margin-top:16px; overflow-x:auto; border:1px solid var(--line); border-radius:14px; }
    table { width:100%; min-width:720px; border-collapse:collapse; font-size:11px; }
    th,td { padding:12px 14px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; }
    th { background:var(--surface); color:var(--muted); font-size:9px; letter-spacing:.06em; text-transform:uppercase; }
    td.number { font-variant-numeric:tabular-nums; white-space:nowrap; }
    td small { display:block; color:var(--muted); font-size:9px; }
    tfoot td { border-bottom:0; background:var(--surface); font-weight:800; }
    .missing { color:var(--warn); }
    .empty { padding:28px; color:var(--muted); text-align:center; }
    .rules { display:grid; grid-template-columns:repeat(3,1fr); margin-top:52px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
    .rule { padding:22px; border-right:1px solid var(--line); }
    .rule:first-child { padding-left:0; } .rule:last-child { padding-right:0; border-right:0; }
    .rule h3 { font-size:13px; } .rule p { margin-top:8px; color:var(--muted); font-size:11px; }
    footer { margin-top:30px; color:var(--muted); font-size:10px; text-align:right; }
    @media (max-width:820px) { main{padding-top:28px}.hero{align-items:flex-start;flex-direction:column}.project-meta,.metrics{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr}.stages{grid-template-columns:repeat(2,1fr)}.scope{grid-template-columns:1fr 1fr}.weight-summary{grid-template-columns:1fr 1fr}.weight-head{align-items:flex-start;flex-direction:column}.weight-status{text-align:left}.rules{grid-template-columns:1fr}.rule,.rule:first-child,.rule:last-child{padding:18px 0;border-right:0;border-bottom:1px solid var(--line)}.rule:last-child{border-bottom:0} }
    @media (max-width:500px) { main{width:min(100% - 24px,1180px)}.project-meta,.metrics,.scope{grid-template-columns:1fr}.stage{min-height:104px}.status{max-width:100%} }
    @media print { main{width:100%;padding:0}.section,.split,.rules{break-inside:avoid}.stage,.scope-card,.metric{print-color-adjust:exact;-webkit-print-color-adjust:exact} }
  </style>
</head>
<body>
  <main>
    <header class="hero">
      <div>
        <h1>${escapedProjectTitle}</h1>
        <p class="subtitle">Ringkasan kontrol cold-storage berdasarkan data proyek yang tersimpan.</p>
      </div>
      <span class="status">${escapeHtml(data.status)}</span>
    </header>

    <section class="project-meta" aria-label="Informasi proyek">
      <div><span>Lokasi</span><strong>${escapeHtml(data.location)}</strong></div>
      <div><span>Tanggal masuk</span><strong>${escapeHtml(formatDate(data.entryDate))}</strong></div>
      <div><span>Dibuat</span><strong>${escapeHtml(generatedLabel)}</strong></div>
    </section>

    <section class="metrics" aria-label="Ringkasan metrik">${metricMarkup}</section>

    <div class="split">
      <section class="panel">
        <div class="progress-head"><div><h2>Progress berdasarkan tugas</h2><p class="caption">Selesai, approved, atau signed.</p></div><strong class="progress-value">${progress}%</strong></div>
        <div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><div class="bar"></div></div>
        <p class="caption">${data.completedTasks} selesai · ${Math.max(0, data.totalTasks - data.completedTasks)} masih berjalan</p>
      </section>
      <section class="panel"><h2>Kesiapan data utama</h2><div>${signalMarkup}</div></section>
    </div>

    <section class="section">
      <div class="weight-head">
        <div><h2>Bobot pekerjaan</h2><p class="caption">Kontribusi aktual = bobot × progres aktual ÷ 100.</p></div>
        <p class="weight-status ${weighted.weightIsComplete ? '' : 'warning'}">${escapeHtml(weightStatus)}</p>
      </div>
      <div class="weight-summary">
        <div><span>Total bobot</span><strong>${formatPercent(weighted.totalWeight)}</strong></div>
        <div><span>Aktual berbobot</span><strong>${formatPercent(weighted.weightedActual)}</strong></div>
        <div><span>Rencana berbobot</span><strong>${weighted.weightedPlanned === null ? 'Belum lengkap' : formatPercent(weighted.weightedPlanned)}</strong></div>
        <div><span>Deviasi</span><strong>${weighted.deviation === null ? 'Belum tersedia' : `${weighted.deviation > 0 ? '+' : ''}${formatPercent(weighted.deviation)}`}</strong></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Pekerjaan</th><th>Bobot</th><th>Aktual</th><th>Rencana</th><th>Kontribusi aktual</th></tr></thead>
          <tbody>${weightRowsMarkup}</tbody>
          ${weighted.rows.length ? `<tfoot><tr><td>Total</td><td class="number">${formatPercent(weighted.totalWeight)}</td><td></td><td class="number">${weighted.weightedPlanned === null ? '-' : formatPercent(weighted.weightedPlanned)}</td><td class="number">${formatPercent(weighted.weightedActual)}</td></tr></tfoot>` : ''}
        </table>
      </div>
      <p class="caption">Jika aktual belum diisi, tugas selesai, approved, atau signed dibaca 100%; status lainnya dibaca 0%.</p>
    </section>

    <section class="section">
      <h2>Project stage</h2><p class="caption">Posisi tahap mengikuti status proyek saat diekspor.</p>
      <ol class="stages">${stageMarkup}</ol>
    </section>

    <section class="section">
      <h2>Cakupan Project Control</h2><p class="caption">Modul tanpa sumber data ditampilkan sebagai cakupan pengembangan, bukan angka rekaan.</p>
      <div class="scope">${groupMarkup}</div>
    </section>

    <section class="rules" aria-label="Aturan kontrol utama">
      <article class="rule"><h3>Progress</h3><p>Contribution = weight × actual progress. Planned progress dan deviation memerlukan modul jadwal khusus.</p></article>
      <article class="rule"><h3>QA/QC decision</h3><p>Critical NG wajib menghasilkan HOLD. Audit score mengecualikan status N/A dari denominator.</p></article>
      <article class="rule"><h3>Commissioning</h3><p>Nilai tekanan, arus, superheat, dan subcooling harus mengikuti approved design serta data manufacturer.</p></article>
    </section>

    <footer>Diekspor dari Projecthub · ${escapeHtml(generatedLabel)}</footer>
  </main>
</body>
</html>`;
};
