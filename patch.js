const fs = require('fs');
let code = fs.readFileSync('src/pages/Projects.tsx', 'utf8');

const target1 = `                      <CombinedRoomCanvas 
                          rooms={activeLoc.rooms} 
                          onRoomPositionChange={(idx, x, y) => updateRoomPosition(activeLoc.id, idx, x, y)} 
                      />`;
const replacement1 = `                      <CombinedRoomCanvas 
                          rooms={activeLoc.rooms} 
                          onRoomPositionChange={(idx, x, y) => updateRoomPosition(activeLoc.id, idx, x, y)} 
                          onRoomDimensionChange={(idx, field, value) => updateRoomDetail(activeLoc.id, idx, field, value)}
                      />`;

code = code.split(target1).join(replacement1);

fs.writeFileSync('src/pages/Projects.tsx', code);
console.log('Done!');
