import fs from 'fs';
const content = fs.readFileSync('src/features/projects/Projects.tsx', 'utf-8');
const replaced = content.replace(/\{room\.name \|\| 'Ruangan Tanpa Nama'\}/g, "{room.type || 'Ruangan Tanpa Nama'}");
fs.writeFileSync('src/features/projects/Projects.tsx', replaced);
