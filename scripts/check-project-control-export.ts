import assert from 'node:assert/strict';
import { buildProjectControlHtml, calculateWeightedProgress, getProjectControlFilename } from '../src/features/projects/projectControlExport.ts';

const generatedAt = new Date(2026, 8, 15, 10, 30);
const weightedProgress = calculateWeightedProgress([
  { id: 'task-1', title: 'Panel <b>Freezer</b>', status: 'Bekerja', weight: 30, actualProgress: 55, plannedProgress: 50 },
  { id: 'task-2', title: 'Commissioning', status: 'Selesai', weight: 70, plannedProgress: 10 },
]);
const html = buildProjectControlHtml({
  projectTitle: '<script>alert("x")</script> Cold Room',
  status: 'Tahap 5: Under Construction',
  location: 'Jakarta & Surabaya',
  entryDate: '2026-08-01',
  activeWeek: 7,
  roomCount: 12,
  drawingCount: 4,
  totalTasks: 2,
  completedTasks: 1,
  taskProgress: 50,
  weightedProgress,
  activeStageIndex: 2,
  stages: ['Engineering / Approval', 'Installation'],
  signals: [{ label: 'Project Information', detail: '2 lokasi', ready: true }],
  requirementGroups: [{ title: 'Data & perencanaan', items: ['Project Information'] }],
}, generatedAt);

assert.match(html, /^<!doctype html>/);
assert.match(html, /<html lang="id">/);
assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; Cold Room/);
assert.doesNotMatch(html, /<script>/);
assert.match(html, /Jakarta &amp; Surabaya/);
assert.match(html, /aria-valuenow="50"/);
assert.match(html, /<th>Bobot<\/th>/);
assert.match(html, /Panel &lt;b&gt;Freezer&lt;\/b&gt;/);
assert.doesNotMatch(html, /Panel <b>Freezer<\/b>/);
assert.equal(weightedProgress.totalWeight, 100);
assert.equal(weightedProgress.weightedActual, 86.5);
assert.equal(weightedProgress.weightedPlanned, 22);
assert.equal(weightedProgress.deviation, 64.5);
assert.equal(weightedProgress.rows[1].actualProgress, 100);
assert.equal(weightedProgress.rows[1].actualFromStatus, true);

const incompleteProgress = calculateWeightedProgress([
  { id: 'legacy-task', title: 'Legacy task', status: 'Approved' },
]);
assert.equal(incompleteProgress.totalWeight, 0);
assert.equal(incompleteProgress.missingWeightCount, 1);
assert.equal(incompleteProgress.weightedPlanned, null);
assert.equal(incompleteProgress.rows[0].actualProgress, 100);
assert.equal(incompleteProgress.weightIsComplete, false);
assert.equal(
  getProjectControlFilename('PT Cold / Room', generatedAt),
  'Project_Control_PT_Cold_Room_2026-09-15.html',
);

console.log('Project Control HTML export checks passed.');
