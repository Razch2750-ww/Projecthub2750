import fs from 'fs';
let content = fs.readFileSync('src/features/projects/Projects.tsx', 'utf-8');

const datalistStr = `<datalist id="projects-evaporators-list">
        {products.filter(p => p.type === 'Evaporator').map(p => (
          <option key={p.id} value={p.model || p.brand || ''}>
            {p.brand} {p.model} ({p.evapLength || 0}x{p.evapWidth || 0}x{p.evapHeight || 0}mm, {p.evapFanCount || 1} Fan)
          </option>
        ))}
      </datalist>`;

content = content.replace(datalistStr, '');

fs.writeFileSync('src/features/projects/Projects.tsx', content);
console.log("Removed datalist!");
