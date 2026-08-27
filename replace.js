import fs from 'fs';
const content = fs.readFileSync('src/features/projects/Projects.tsx', 'utf-8');

const targetStr = `const ProjectDescriptionEditor: React.FC<{ project: Project }> = ({ project }) => {
  const { updateProject } = useProjects();
  const [text, setText] = useState(() => {
    return localStorage.getItem(\`drafter_desc_draft_\${project.id}\`) || project.description || '';
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'draft'>('saved');

  // Keep state in sync if project description changes externally
  useEffect(() => {
    if (project.description !== undefined && text === '' && project.description !== text) {
      setText(project.description);
    }
  }, [project.description]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (text !== (project.description || '')) {
        setSaveStatus('saving');
        try {
          await updateProject(project.id, project.ptName, project.address, project.entryDate, {
            description: text
          }, true);
          setSaveStatus('saved');
          localStorage.removeItem(\`drafter_desc_draft_\${project.id}\`);
        } catch (err) {
          setSaveStatus('draft');
        }
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [text, project.description]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    localStorage.setItem(\`drafter_desc_draft_\${project.id}\`, val);
    setSaveStatus('draft');
  };

  return (
    <div className="bg-surface border border-divider rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <FileText size={14} className="text-[var(--color-accent-500)]" />
          Deskripsi Proyek
        </label>
        <span className="text-[10px] flex items-center gap-1 font-medium">
          {saveStatus === 'saving' && (
            <span className="text-amber-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Menyimpan...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Semua perubahan tersimpan
            </span>
          )}
          {saveStatus === 'draft' && (
            <span className="text-blue-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
              Draft disimpan di lokal (auto-save)
            </span>
          )}
        </span>
      </div>
      <textarea
        value={text}
        onChange={handleChange}
        placeholder="Tulis deskripsi atau instruksi khusus untuk proyek ini di sini... (Tersimpan otomatis)"
        rows={3}
        className="w-full text-xs bg-surface-hover/50 border border-divider rounded-lg p-2.5 focus:outline-none focus:border-[var(--color-accent-500)] focus:bg-surface text-primary transition-all resize-y"
      />
    </div>
  );
};`;

const replacement = `const ProjectDetailsSummary: React.FC<{ project: Project }> = ({ project }) => {
  const allRooms = (project.locations || []).flatMap(loc => 
    (loc.rooms || []).map(room => ({ ...room, locationName: loc.name, locationAddress: loc.address }))
  );

  if (allRooms.length === 0) return null;

  return (
    <div className="bg-surface border border-divider rounded-xl p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-3 border-b border-divider pb-2">
        <LayoutList size={16} className="text-[var(--color-accent-600)]" />
        <h4 className="text-sm font-bold text-primary">Detail Spesifikasi Ruangan</h4>
      </div>
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {allRooms.map((room, idx) => (
          <div key={room.id || idx} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-xs bg-surface-hover/50 p-3 rounded-lg border border-divider relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--color-accent-500)]/50" />
            
            <div className="col-span-full sm:col-span-2 xl:col-span-1 border-r border-divider/50 pr-2">
              <span className="font-semibold text-primary text-[13px] flex items-center gap-2 mb-1">
                <Box size={14} className="text-[var(--color-accent-600)]" />
                {room.name || 'Ruangan Tanpa Nama'}
              </span>
              <span className="text-muted text-[10px] flex items-start gap-1 leading-tight">
                <MapPin size={10} className="shrink-0 mt-0.5" />
                <span className="line-clamp-2" title={room.locationName || 'Lokasi Tidak Diketahui'}>{room.locationName || 'Lokasi Tidak Diketahui'}</span>
              </span>
            </div>
            
            <div className="space-y-2">
              <div>
                <span className="block text-muted mb-0.5 text-[10px] font-medium uppercase tracking-wider">Dimensi (P x L x T)</span>
                <span className="font-semibold text-primary text-[11px]">{room.length || '-'} x {room.width || '-'} x {room.height || '-'} m</span>
              </div>
              <div>
                <span className="block text-muted mb-0.5 text-[10px] font-medium uppercase tracking-wider">Suhu</span>
                <span className="font-semibold text-primary text-[11px]">{room.temperature || '-'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="block text-muted mb-0.5 text-[10px] font-medium uppercase tracking-wider">Panel</span>
                <span className="font-semibold text-primary text-[11px]">
                  {room.panelType || '-'} {room.panelThickness ? \`(\${room.panelThickness})\` : ''}
                </span>
              </div>
              <div>
                <span className="block text-muted mb-0.5 text-[10px] font-medium uppercase tracking-wider">Pintu</span>
                <span className="font-semibold text-primary text-[11px]">
                  {room.doorType || '-'} 
                  {room.doorWidth && room.doorHeight ? \` (\${room.doorWidth} x \${room.doorHeight})\` : ''} 
                  {room.doorQty ? \` - \${room.doorQty} unit\` : ''}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <span className="block text-muted mb-0.5 text-[10px] font-medium uppercase tracking-wider">Mesin Evaporator</span>
                <span className="font-semibold text-primary text-[11px] leading-tight block">
                  {room.evaporator || '-'} {room.evaporatorQty ? \`(\${room.evaporatorQty} unit)\` : ''}
                </span>
              </div>
              <div>
                <span className="block text-muted mb-0.5 text-[10px] font-medium uppercase tracking-wider">Mesin Outdoor</span>
                <span className="font-semibold text-primary text-[11px] leading-tight block">
                  {room.outdoorMachine || '-'} {room.outdoorMachineQty ? \`(\${room.outdoorMachineQty} unit)\` : ''}
                </span>
              </div>
            </div>
            
            {(room.note || room.machineType) && (
              <div className="col-span-full xl:col-span-2 space-y-2 border-t xl:border-t-0 xl:border-l border-divider/50 pt-2 xl:pt-0 xl:pl-3">
                {room.machineType && (
                  <div>
                    <span className="block text-muted mb-0.5 text-[10px] font-medium uppercase tracking-wider">Jenis Mesin</span>
                    <span className="font-semibold text-primary text-[11px]">{room.machineType} {room.mountingType ? \`(\${room.mountingType})\` : ''}</span>
                  </div>
                )}
                {room.note && (
                  <div>
                    <span className="block text-muted mb-0.5 text-[10px] font-medium uppercase tracking-wider">Catatan</span>
                    <span className="font-medium text-primary text-[11px] bg-surface p-1.5 rounded border border-divider/50 inline-block w-full line-clamp-2" title={room.note}>{room.note}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};`;

if(content.includes(targetStr)) {
  fs.writeFileSync('src/features/projects/Projects.tsx', content.replace(targetStr, replacement));
  console.log('Successfully replaced!');
} else {
  console.log('Target string not found!');
}
