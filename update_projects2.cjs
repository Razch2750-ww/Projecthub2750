const fs = require('fs');
let file = fs.readFileSync('src/pages/Projects.tsx', 'utf8');

const target1 = `                    {newRoomMachineType === 'Plug-In' && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="text-xs font-medium text-primary">Kapasitas Mesin</label>
                        <Input
                          value={newRoomMachineCapacity}
                          onChange={e => setNewRoomMachineCapacity(e.target.value)}
                          placeholder="Contoh: 1.5 HP"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}`;

const replacement1 = `                    {newRoomMachineType === 'Plug-In' && (
                      <div className="space-y-1.5 flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-xs font-medium text-primary">Kapasitas Mesin</label>
                          <Input
                            value={newRoomMachineCapacity}
                            onChange={e => setNewRoomMachineCapacity(e.target.value)}
                            placeholder="Contoh: 1.5 HP"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="w-20 space-y-1.5">
                          <label className="text-xs font-medium text-primary">Qty</label>
                          <Input
                            value={newRoomMachineCapacityQty}
                            onChange={e => setNewRoomMachineCapacityQty(e.target.value)}
                            placeholder="Qty"
                            type="number"
                            min="1"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}`;

file = file.replaceAll(target1, replacement1);
fs.writeFileSync('src/pages/Projects.tsx', file, 'utf8');
