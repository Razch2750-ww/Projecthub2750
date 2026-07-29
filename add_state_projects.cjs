const fs = require('fs');
let file = fs.readFileSync('src/pages/Projects.tsx', 'utf8');

const targetState = `  const [newRoomMachineCapacity, setNewRoomMachineCapacity] = useState('');`;
const replacementState = `  const [newRoomMachineCapacity, setNewRoomMachineCapacity] = useState('');
  const [newRoomMachineCapacityQty, setNewRoomMachineCapacityQty] = useState('');`;

const targetSave = `            mountingType: newRoomMachineType === 'Plug-In' ? newRoomMountingType : '',
            machineCapacity: newRoomMachineType === 'Plug-In' ? newRoomMachineCapacity : '',`;
const replacementSave = `            mountingType: newRoomMachineType === 'Plug-In' ? newRoomMountingType : '',
            machineCapacity: newRoomMachineType === 'Plug-In' ? newRoomMachineCapacity : '',
            machineCapacityQty: newRoomMachineType === 'Plug-In' ? newRoomMachineCapacityQty : '',`;

const targetClear = `    setNewRoomMachineCapacity('');`;
const replacementClear = `    setNewRoomMachineCapacity('');
    setNewRoomMachineCapacityQty('');`;

file = file.replaceAll(targetState, replacementState);
file = file.replaceAll(targetSave, replacementSave);
file = file.replaceAll(targetClear, replacementClear);

fs.writeFileSync('src/pages/Projects.tsx', file, 'utf8');
