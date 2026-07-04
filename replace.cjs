const fs = require("fs");
let content = fs.readFileSync("src/pages/Projects.tsx", "utf-8");
content = content.replaceAll(
  `<Input value={room.floorType || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'floorType', e.target.value)} placeholder="Contoh: Cor Beton, Panel PU 100mm" className="h-8 text-xs" />`,
  `<select value={room.floorType || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'floorType', e.target.value)} className="flex h-8 w-full rounded-md border border-divider bg-surface px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-600)] transition-colors"><option value="">Pilih Lantai</option><option value="CONCRETE">CONCRETE</option><option value="INSUL">INSUL</option></select>`
);
fs.writeFileSync("src/pages/Projects.tsx", content);
