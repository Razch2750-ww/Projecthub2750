import assert from 'node:assert/strict';
import { buildProjectControlHtml, getProjectControlFilename } from '../src/features/projects/projectControlExport.ts';

const generatedAt = new Date(2026, 8, 15, 10, 30);
const html = buildProjectControlHtml({
  projectTitle: '<script>alert("x")</script> Cold Room',
  status: 'Tahap 5: Under Construction',
  location: 'Jakarta & Surabaya',
  entryDate: '2026-08-01',
  activeWeek: 7,
  roomCount: 12,
  drawingCount: 4,
  totalTasks: 10,
  completedTasks: 6,
  taskProgress: 60,
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
assert.match(html, /aria-valuenow="60"/);
assert.equal(
  getProjectControlFilename('PT Cold / Room', generatedAt),
  'Project_Control_PT_Cold_Room_2026-09-15.html',
);

console.log('Project Control HTML export checks passed.');
