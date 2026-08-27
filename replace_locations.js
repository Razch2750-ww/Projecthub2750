import fs from 'fs';
let content = fs.readFileSync('src/features/projects/Projects.tsx', 'utf-8');

// Replace Add Location section in Add Project
let target1 = `<div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-primary">Daftar Lokasi</label>
              <Button type="button" size="sm" variant="outline" onClick={handleAddLocation} className="h-7 text-xs gap-1 py-0"><Plus size={14} /> Lokasi</Button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-divider mb-3">
              {locations.map((loc, idx) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setActiveLocationId(loc.id)}
                  className={\`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-2 \${
                    activeLocationId === loc.id
                      ? 'bg-[var(--color-accent-600)] text-[var(--color-accent-100)] dark:text-[var(--color-accent-900)] shadow-sm'
                      : 'bg-surface border border-divider text-secondary hover:bg-surface-hover'
                  }\`}
                >
                  {loc.name || \`Lokasi \${idx + 1}\`}
                  {locations.length > 1 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); handleRemoveLocation(loc.id); }}
                      className={\`transition-opacity opacity-60 hover:opacity-100 \${activeLocationId === loc.id ? 'hover:text-red-200' : 'hover:text-red-500'}\`}
                    >
                      <Trash2 size={12} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            {locations.map((activeLoc) => {
              if (activeLoc.id !== activeLocationId) return null;`;

let replacement1 = `<div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-primary">Data Lokasi Proyek</label>
            </div>

            {locations.map((activeLoc) => {
              if (activeLoc.id !== locations[0].id) return null;`;

if(content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log("Replaced target1");
} else {
  console.log("Target1 not found");
}

fs.writeFileSync('src/features/projects/Projects.tsx', content);
