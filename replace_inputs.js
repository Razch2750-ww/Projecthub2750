import fs from 'fs';
let content = fs.readFileSync('src/features/projects/Projects.tsx', 'utf-8');

const evapSelect = `
                            <select
                              value={newRoomEvaporator}
                              onChange={e => setNewRoomEvaporator(e.target.value)}
                              className="w-full h-8 text-xs bg-surface border border-divider rounded-md px-2 text-primary focus:outline-none focus:border-[var(--color-accent-500)]"
                            >
                              <option value="">Pilih Evaporator...</option>
                              {products.filter(p => p.type === 'Evaporator').map(p => (
                                <option key={p.id} value={\`\${p.brand} \${p.model}\`}>
                                  {p.brand} {p.model}
                                </option>
                              ))}
                            </select>
`;

const outdoorSelect = `
                            <select
                              value={newRoomOutdoorMachine}
                              onChange={e => setNewRoomOutdoorMachine(e.target.value)}
                              className="w-full h-8 text-xs bg-surface border border-divider rounded-md px-2 text-primary focus:outline-none focus:border-[var(--color-accent-500)]"
                            >
                              <option value="">Pilih Mesin Outdoor...</option>
                              {products.filter(p => p.type === 'Mesin (Condensing Unit)').map(p => (
                                <option key={p.id} value={\`\${p.brand} \${p.model}\`}>
                                  {p.brand} {p.model}
                                </option>
                              ))}
                            </select>
`;

const existingEvapSelect = `
                              <select
                                value={room.evaporator || ''}
                                onChange={e => updateRoomDetail(activeLoc.id, index, 'evaporator', e.target.value)}
                                className="w-full h-8 text-xs bg-surface border border-divider rounded-md px-2 text-primary focus:outline-none focus:border-[var(--color-accent-500)]"
                              >
                                <option value="">Pilih Evaporator...</option>
                                {products.filter(p => p.type === 'Evaporator').map(p => (
                                  <option key={p.id} value={\`\${p.brand} \${p.model}\`}>
                                    {p.brand} {p.model}
                                  </option>
                                ))}
                              </select>
`;

const existingOutdoorSelect = `
                              <select
                                value={room.outdoorMachine || ''}
                                onChange={e => updateRoomDetail(activeLoc.id, index, 'outdoorMachine', e.target.value)}
                                className="w-full h-8 text-xs bg-surface border border-divider rounded-md px-2 text-primary focus:outline-none focus:border-[var(--color-accent-500)]"
                              >
                                <option value="">Pilih Mesin Outdoor...</option>
                                {products.filter(p => p.type === 'Mesin (Condensing Unit)').map(p => (
                                  <option key={p.id} value={\`\${p.brand} \${p.model}\`}>
                                    {p.brand} {p.model}
                                  </option>
                                ))}
                              </select>
`;

// Replacing newRoomEvaporator
content = content.replace(/<Input\s*value=\{newRoomEvaporator\}\s*onChange=\{e => setNewRoomEvaporator\(e\.target\.value\)\}\s*placeholder="Contoh: V-Type"\s*className="h-8 text-xs"\s*list="projects-evaporators-list"\s*\/>/g, evapSelect.trim());

// Replacing newRoomOutdoorMachine
content = content.replace(/<Input\s*value=\{newRoomOutdoorMachine\}\s*onChange=\{e => setNewRoomOutdoorMachine\(e\.target\.value\)\}\s*placeholder="Contoh: CDU 5HP"\s*className="h-8 text-xs"\s*\/>/g, outdoorSelect.trim());

// Replacing room.evaporator (edit mode)
content = content.replace(/<Input value=\{room\.evaporator \|\| ''\} onChange=\{e => updateRoomDetail\(activeLoc\.id, index, 'evaporator', e\.target\.value\)\} placeholder="Contoh: V-Type" className="h-8 text-xs" list="projects-evaporators-list" \/>/g, existingEvapSelect.trim());

// Replacing room.outdoorMachine (edit mode)
content = content.replace(/<Input value=\{room\.outdoorMachine \|\| ''\} onChange=\{e => updateRoomDetail\(activeLoc\.id, index, 'outdoorMachine', e\.target\.value\)\} placeholder="Contoh: CDU 5HP" className="h-8 text-xs" \/>/g, existingOutdoorSelect.trim());

fs.writeFileSync('src/features/projects/Projects.tsx', content);
console.log("Replaced!");
