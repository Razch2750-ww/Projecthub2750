const fs = require('fs');
let file = fs.readFileSync('src/pages/Projects.tsx', 'utf8');

const target1 = `                    {newRoomMachineType === 'Split' && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                          <Input
                            value={newRoomOutdoorMachine}
                            onChange={e => setNewRoomOutdoorMachine(e.target.value)}
                            placeholder="Contoh: CDU 5HP"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-primary">Evaporator</label>
                          <Input
                            value={newRoomEvaporator}
                            onChange={e => setNewRoomEvaporator(e.target.value)}
                            placeholder="Contoh: V-Type"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}`;

const replacement1 = `                    {newRoomMachineType === 'Split' && (
                      <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1.5 flex gap-2">
                          <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                            <Input
                              value={newRoomOutdoorMachine}
                              onChange={e => setNewRoomOutdoorMachine(e.target.value)}
                              placeholder="Contoh: CDU 5HP"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="w-20 space-y-1.5">
                            <label className="text-xs font-medium text-primary">Qty</label>
                            <Input
                              value={newRoomOutdoorMachineQty}
                              onChange={e => setNewRoomOutdoorMachineQty(e.target.value)}
                              placeholder="Qty"
                              type="number"
                              min="1"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5 flex gap-2">
                          <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-primary">Evaporator</label>
                            <Input
                              value={newRoomEvaporator}
                              onChange={e => setNewRoomEvaporator(e.target.value)}
                              placeholder="Contoh: V-Type"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="w-20 space-y-1.5">
                            <label className="text-xs font-medium text-primary">Qty</label>
                            <Input
                              value={newRoomEvaporatorQty}
                              onChange={e => setNewRoomEvaporatorQty(e.target.value)}
                              placeholder="Qty"
                              type="number"
                              min="1"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}`;


const target2 = `                      {(!room.machineType || room.machineType === 'Split' || room.outdoorMachine || room.evaporator) && room.machineType !== 'Plug-In' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                            <Input value={room.outdoorMachine || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'outdoorMachine', e.target.value)} placeholder="Contoh: CDU 5HP" className="h-8 text-xs" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-primary">Evaporator</label>
                            <Input value={room.evaporator || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'evaporator', e.target.value)} placeholder="Contoh: V-Type" className="h-8 text-xs" />
                          </div>
                        </div>
                      )}`;

const replacement2 = `                      {(!room.machineType || room.machineType === 'Split' || room.outdoorMachine || room.evaporator) && room.machineType !== 'Plug-In' && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="space-y-1.5 flex gap-2">
                            <div className="flex-1 space-y-1.5">
                              <label className="text-xs font-medium text-primary">Mesin Outdoor</label>
                              <Input value={room.outdoorMachine || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'outdoorMachine', e.target.value)} placeholder="Contoh: CDU 5HP" className="h-8 text-xs" />
                            </div>
                            <div className="w-20 space-y-1.5">
                              <label className="text-xs font-medium text-primary">Qty</label>
                              <Input value={room.outdoorMachineQty || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'outdoorMachineQty', e.target.value)} placeholder="Qty" type="number" min="1" className="h-8 text-xs" />
                            </div>
                          </div>
                          <div className="space-y-1.5 flex gap-2">
                            <div className="flex-1 space-y-1.5">
                              <label className="text-xs font-medium text-primary">Evaporator</label>
                              <Input value={room.evaporator || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'evaporator', e.target.value)} placeholder="Contoh: V-Type" className="h-8 text-xs" />
                            </div>
                            <div className="w-20 space-y-1.5">
                              <label className="text-xs font-medium text-primary">Qty</label>
                              <Input value={room.evaporatorQty || ''} onChange={e => updateRoomDetail(activeLoc.id, index, 'evaporatorQty', e.target.value)} placeholder="Qty" type="number" min="1" className="h-8 text-xs" />
                            </div>
                          </div>
                        </div>
                      )}`;

file = file.replaceAll(target1, replacement1);
file = file.replaceAll(target2, replacement2);

fs.writeFileSync('src/pages/Projects.tsx', file, 'utf8');
