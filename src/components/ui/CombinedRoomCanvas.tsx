import React, { useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Line } from 'react-konva';
import { RoomDetails } from '../../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

export interface CombinedRoomCanvasProps {
  rooms: RoomDetails[];
  onRoomPositionChange?: (roomIndex: number, x: number, y: number) => void;
  onRoomDimensionChange?: (roomIndex: number, field: 'length' | 'width', value: string) => void;
}

export const CombinedRoomCanvas: React.FC<CombinedRoomCanvasProps> = ({ rooms, onRoomPositionChange, onRoomDimensionChange }) => {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 300 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  const [userScale, setUserScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: 300 // fixed height or based on width
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  let maxW = 1000;
  let maxH = 1000;
  rooms.forEach(r => {
    const l = parseFloat(r.length || '0');
    const w = parseFloat(r.width || '0');
    if (l > 0 && w > 0) {
      if (l > maxW) maxW = l;
      if (w > maxH) maxH = w;
    }
  });

  const logicalViewportMax = Math.max(maxW, maxH) * 2; 
  const baseScale = logicalViewportMax > 0 ? Math.min(containerSize.width / logicalViewportMax, containerSize.height / logicalViewportMax) * 0.8 : 0.05;

  const handleGroupDragEnd = (e: any, index: number) => {
    e.cancelBubble = true;
    if (onRoomPositionChange) {
      let finalX = e.target.x() / baseScale;
      let finalY = e.target.y() / baseScale;

      const snapThreshold = 150; // mm
      const curRoom = validRooms[index];
      if (curRoom) {
        const curL = parseFloat(curRoom.length || '0');
        const curW = parseFloat(curRoom.width || '0');

        for (let i = 0; i < validRooms.length; i++) {
          if (i === index) continue;
          const other = validRooms[i];
          const otherL = parseFloat(other.length || '0');
          const otherW = parseFloat(other.width || '0');
          const ox1 = other.x !== undefined ? other.x : (i * 40 + 20) / baseScale;
          const oy1 = other.y !== undefined ? other.y : (i * 40 + 20) / baseScale;
          const ox2 = ox1 + otherL;
          const oy2 = oy1 + otherW;

          // Check X snap points (vertical alignment/touching)
          if (Math.abs(finalX - ox2) < snapThreshold) {
            finalX = ox2;
          } else if (Math.abs((finalX + curL) - ox1) < snapThreshold) {
            finalX = ox1 - curL;
          } else if (Math.abs(finalX - ox1) < snapThreshold) {
            finalX = ox1;
          } else if (Math.abs((finalX + curL) - ox2) < snapThreshold) {
            finalX = ox2 - curL;
          }

          // Check Y snap points (horizontal alignment/touching)
          if (Math.abs(finalY - oy2) < snapThreshold) {
            finalY = oy2;
          } else if (Math.abs((finalY + curW) - oy1) < snapThreshold) {
            finalY = oy1 - curW;
          } else if (Math.abs(finalY - oy1) < snapThreshold) {
            finalY = oy1;
          } else if (Math.abs((finalY + curW) - oy2) < snapThreshold) {
            finalY = oy2 - curW;
          }
        }
      }

      onRoomPositionChange(index, finalX, finalY);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setUserScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };
  
  const handleZoomIn = () => {
    setUserScale(prev => prev * 1.2);
  };
  
  const handleZoomOut = () => {
    setUserScale(prev => prev / 1.2);
  };

  const handleReset = () => {
    setUserScale(1);
    setStagePos({ x: 0, y: 0 });
  };

  const promptEditDimension = (index: number, field: 'length' | 'width', currentValue: string, e: any) => {
    e.cancelBubble = true;
    const val = window.prompt(`Edit ${field === 'length' ? 'Panjang' : 'Lebar'} (mm):`, currentValue);
    if (val !== null && !isNaN(parseFloat(val)) && onRoomDimensionChange) {
      onRoomDimensionChange(index, field, val);
    }
  };

  const validRooms = rooms.filter(r => parseFloat(r.length || '0') > 0 && parseFloat(r.width || '0') > 0);

  if (validRooms.length === 0) {
    return (
      <div className="w-full h-[200px] flex justify-center items-center bg-surface border-2 border-divider rounded-md my-3 relative">
        <span className="text-secondary text-sm">Tambahkan panjang & lebar untuk preview interaktif</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#f8f9fa] rounded-md border-2 border-divider overflow-hidden my-3 relative group" ref={containerRef}>
      <Stage 
        width={containerSize.width} 
        height={containerSize.height}
        draggable
        onWheel={handleWheel}
        scaleX={userScale}
        scaleY={userScale}
        x={stagePos.x}
        y={stagePos.y}
        onDragEnd={(e) => {
          if (e.target === e.target.getStage()) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {(() => {
            interface SharedWallState {
              left: { isShared: boolean; thickness: number; isDrawOwner: boolean };
              right: { isShared: boolean; thickness: number; isDrawOwner: boolean };
              top: { isShared: boolean; thickness: number; isDrawOwner: boolean };
              bottom: { isShared: boolean; thickness: number; isDrawOwner: boolean };
            }

            const sharedWalls: SharedWallState[] = validRooms.map(() => ({
              left: { isShared: false, thickness: 0, isDrawOwner: false },
              right: { isShared: false, thickness: 0, isDrawOwner: false },
              top: { isShared: false, thickness: 0, isDrawOwner: false },
              bottom: { isShared: false, thickness: 0, isDrawOwner: false },
            }));

            const getPanelThickness = (r: RoomDetails) => {
              return parseFloat(r.panelThickness || '100');
            };

            const EPSILON = 15; // 15mm tolerance

            for (let i = 0; i < validRooms.length; i++) {
              for (let j = i + 1; j < validRooms.length; j++) {
                const roomI = validRooms[i];
                const roomJ = validRooms[j];

                const ix1 = roomI.x !== undefined ? roomI.x : (i * 40 + 20) / baseScale;
                const iy1 = roomI.y !== undefined ? roomI.y : (i * 40 + 20) / baseScale;
                const iL = parseFloat(roomI.length || '0');
                const iW = parseFloat(roomI.width || '0');
                const ix2 = ix1 + iL;
                const iy2 = iy1 + iW;

                const jx1 = roomJ.x !== undefined ? roomJ.x : (j * 40 + 20) / baseScale;
                const jy1 = roomJ.y !== undefined ? roomJ.y : (j * 40 + 20) / baseScale;
                const jL = parseFloat(roomJ.length || '0');
                const jW = parseFloat(roomJ.width || '0');
                const jx2 = jx1 + jL;
                const jy2 = jy1 + jW;

                const thickI = getPanelThickness(roomI);
                const thickJ = getPanelThickness(roomJ);
                const minThick = Math.min(thickI, thickJ);

                // Check 1: Room I is to the left of Room J (I's Right adjacent to J's Left)
                if (Math.abs(ix2 - jx1) < EPSILON) {
                  const overlapStart = Math.max(iy1, jy1);
                  const overlapEnd = Math.min(iy2, jy2);
                  if (overlapEnd - overlapStart > 10) {
                    sharedWalls[i].right = { isShared: true, thickness: minThick, isDrawOwner: true };
                    sharedWalls[j].left = { isShared: true, thickness: minThick, isDrawOwner: false };
                  }
                }

                // Check 2: Room J is to the left of Room I (J's Right adjacent to I's Left)
                if (Math.abs(jx2 - ix1) < EPSILON) {
                  const overlapStart = Math.max(iy1, jy1);
                  const overlapEnd = Math.min(iy2, jy2);
                  if (overlapEnd - overlapStart > 10) {
                    sharedWalls[j].right = { isShared: true, thickness: minThick, isDrawOwner: true };
                    sharedWalls[i].left = { isShared: true, thickness: minThick, isDrawOwner: false };
                  }
                }

                // Check 3: Room I is above Room J (I's Bottom adjacent to J's Top)
                if (Math.abs(iy2 - jy1) < EPSILON) {
                  const overlapStart = Math.max(ix1, jx1);
                  const overlapEnd = Math.min(ix2, jx2);
                  if (overlapEnd - overlapStart > 10) {
                    sharedWalls[i].bottom = { isShared: true, thickness: minThick, isDrawOwner: true };
                    sharedWalls[j].top = { isShared: true, thickness: minThick, isDrawOwner: false };
                  }
                }

                // Check 4: Room J is above Room I (J's Bottom adjacent to I's Top)
                if (Math.abs(jy2 - iy1) < EPSILON) {
                  const overlapStart = Math.max(ix1, jx1);
                  const overlapEnd = Math.min(ix2, jx2);
                  if (overlapEnd - overlapStart > 10) {
                    sharedWalls[j].bottom = { isShared: true, thickness: minThick, isDrawOwner: true };
                    sharedWalls[i].top = { isShared: true, thickness: minThick, isDrawOwner: false };
                  }
                }
              }
            }

            return validRooms.map((room, index) => {
              const orgL = parseFloat(room.length || '0');
              const orgW = parseFloat(room.width || '0');
              const rw = orgL * baseScale;
              const rh = orgW * baseScale;

              const rx = (room.x !== undefined ? room.x * baseScale : index * 40 + 20);
              const ry = (room.y !== undefined ? room.y * baseScale : index * 40 + 20);
              
              const pThickness = Math.max(2, parseFloat(room.panelThickness || '100'));
              const scaledWallWidth = (pThickness * baseScale);
              const wallStroke = room.type === 'Freezer' ? '#8a739e' : room.type === 'Chiller' ? '#5b8c9d' : '#888';
              
              // Dynamic wall widths for rendering inner and outer borders
              const tLeft = sharedWalls[index].left.isShared ? (sharedWalls[index].left.isDrawOwner ? sharedWalls[index].left.thickness * baseScale : 0) : scaledWallWidth;
              const tRight = sharedWalls[index].right.isShared ? (sharedWalls[index].right.isDrawOwner ? sharedWalls[index].right.thickness * baseScale : 0) : scaledWallWidth;
              const tTop = sharedWalls[index].top.isShared ? (sharedWalls[index].top.isDrawOwner ? sharedWalls[index].top.thickness * baseScale : 0) : scaledWallWidth;
              const tBottom = sharedWalls[index].bottom.isShared ? (sharedWalls[index].bottom.isDrawOwner ? sharedWalls[index].bottom.thickness * baseScale : 0) : scaledWallWidth;

              const tempText = room.type === 'Freezer' ? "-18 ~ -20 Deg" : 
                               room.type === 'Chiller' ? "0 ~ +5 Deg" : 
                               room.type === 'ABF' ? "-35 ~ -40 Deg" :
                               room.type === 'Ante Room' ? "10 ~ 15 Deg" : "";
                               
              const dimOffset = 30 / userScale;
              const padArea = 5 / userScale;
              
              const topCollision = validRooms.some((other, oi) => {
                if (oi === index) return false;
                const ox1 = (other.x !== undefined ? other.x * baseScale : oi * 40 + 20);
                const oy1 = (other.y !== undefined ? other.y * baseScale : oi * 40 + 20);
                const ox2 = ox1 + parseFloat(other.length || '0') * baseScale;
                const oy2 = oy1 + parseFloat(other.width || '0') * baseScale;
                return (ox1 < rx + rw + padArea && ox2 > rx - padArea && 
                        oy1 < ry + padArea && oy2 > ry - dimOffset * 1.5);
              });

              const leftCollision = validRooms.some((other, oi) => {
                if (oi === index) return false;
                const ox1 = (other.x !== undefined ? other.x * baseScale : oi * 40 + 20);
                const oy1 = (other.y !== undefined ? other.y * baseScale : oi * 40 + 20);
                const ox2 = ox1 + parseFloat(other.length || '0') * baseScale;
                const oy2 = oy1 + parseFloat(other.width || '0') * baseScale;
                return (oy1 < ry + rh + padArea && oy2 > ry - padArea && 
                        ox1 < rx + padArea && ox2 > rx - dimOffset * 1.5);
              });

              const dimY = topCollision ? rh + dimOffset : -dimOffset;
              const textY_len = topCollision ? rh + dimOffset + 2/userScale : -dimOffset - 12/userScale;
              const hitY_len = topCollision ? rh + dimOffset - 10/userScale : -dimOffset - 10/userScale;
              
              const dimX = leftCollision ? rw + dimOffset : -dimOffset;
              const textX_wid = leftCollision ? rw + dimOffset + 12/userScale : -dimOffset - 12/userScale;
              const hitX_wid = leftCollision ? rw + dimOffset - 10/userScale : -dimOffset - 10/userScale;
              const textRot_wid = leftCollision ? 90 : -90;
              const textY_wid = leftCollision 
                                ? rh/2 - (Math.max(20, orgW.toString().length * 6 / 2))/userScale
                                : rh/2 + (Math.max(20, orgW.toString().length * 6 / 2))/userScale;

              return (
                <Group
                  key={room.type + index}
                  x={rx}
                  y={ry}
                  draggable
                  onDragEnd={(e) => handleGroupDragEnd(e, index)}
                >
                  {/* Outer Wall Boundary */}
                  <Rect
                    width={rw}
                    height={rh}
                    fill={wallStroke}
                    stroke="#000"
                    strokeWidth={1 / userScale}
                    strokeScaleEnabled={false}
                  />
                  
                  {/* Inner Room Area */}
                  <Rect
                    x={tLeft}
                    y={tTop}
                    width={Math.max(0, rw - tLeft - tRight)}
                    height={Math.max(0, rh - tTop - tBottom)}
                    fill="#ffffff"
                    stroke="#000"
                    strokeWidth={1 / userScale}
                    strokeScaleEnabled={false}
                  />

                <Group y={rh / 2 - (20 / userScale)}>
                  <Text
                    text={room.type.toUpperCase()}
                    width={rw}
                    align="center"
                    fill="#0000ff"
                    fontSize={Math.max(10, Math.min(rw, rh) * 0.15) / userScale}
                    fontFamily="monospace"
                  />
                  {tempText && (
                    <Text
                      text={tempText}
                      y={Math.max(10, Math.min(rw, rh) * 0.15) / userScale + 5}
                      width={rw}
                      align="center"
                      fill="#0000ff"
                      fontSize={Math.max(10, Math.min(rw, rh) * 0.15) / userScale}
                      fontFamily="monospace"
                    />
                  )}
                </Group>

                {/* Length Dimension (Top/Header edge) */}
                <Group 
                  onDblClick={(e) => promptEditDimension(index, 'length', room.length || '', e)}
                  onClick={(e) => promptEditDimension(index, 'length', room.length || '', e)}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                >
                  <Line points={[0, dimY, rw, dimY]} stroke="#333" strokeWidth={1/userScale} hoverMode="hover" />
                  <Rect x={0} y={hitY_len} width={rw} height={20/userScale} fill="transparent" />
                  <Line points={[0, dimY - 5/userScale, 0, dimY + 5/userScale]} stroke="#333" strokeWidth={1/userScale} />
                  <Line points={[rw, dimY - 5/userScale, rw, dimY + 5/userScale]} stroke="#333" strokeWidth={1/userScale} />
                  <Text
                    text={`${orgL}mm`}
                    x={0}
                    y={textY_len}
                    width={rw}
                    align="center"
                    fill="#0000ff"
                    fontSize={10 / userScale}
                    fontFamily="monospace"
                  />
                </Group>
                
                {/* Width Dimension (Left edge) */}
                <Group 
                  onDblClick={(e) => promptEditDimension(index, 'width', room.width || '', e)}
                  onClick={(e) => promptEditDimension(index, 'width', room.width || '', e)}
                  onMouseEnter={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'pointer';
                  }}
                  onMouseLeave={(e) => {
                    const container = e.target.getStage()?.container();
                    if (container) container.style.cursor = 'default';
                  }}
                >
                  <Line points={[dimX, 0, dimX, rh]} stroke="#333" strokeWidth={1/userScale} />
                  <Rect x={hitX_wid} y={0} width={20/userScale} height={rh} fill="transparent" />
                  <Line points={[dimX - 5/userScale, 0, dimX + 5/userScale, 0]} stroke="#333" strokeWidth={1/userScale} />
                  <Line points={[dimX - 5/userScale, rh, dimX + 5/userScale, rh]} stroke="#333" strokeWidth={1/userScale} />
                  <Text
                    text={`${orgW}mm`}
                    x={textX_wid}
                    y={textY_wid}
                    rotation={textRot_wid}
                    fill="#0000ff"
                    fontSize={10 / userScale}
                    fontFamily="monospace"
                  />
                </Group>
              </Group>
              );
            });
          })()}
        </Layer>
      </Stage>
      <div className="absolute top-2 left-2 text-[10px] text-[#333] font-mono tracking-widest pointer-events-none bg-white/70 px-2 py-1 rounded shadow-sm border border-gray-200">
        AUTOCAD STYLE DRAFTING (DRAG TO PAN/MOVE ROOMS, SCROLL TO ZOOM)
      </div>
      <div className="absolute bottom-3 right-3 flex gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
        <button onClick={handleZoomOut} className="p-1.5 bg-[#333] hover:bg-[#444] text-white rounded shadow-sm border border-[#555]" title="Zoom Out">
          <ZoomOut size={14} />
        </button>
        <button onClick={handleReset} className="p-1.5 bg-[#333] hover:bg-[#444] text-white rounded shadow-sm border border-[#555]" title="Reset View">
          <Maximize size={14} />
        </button>
        <button onClick={handleZoomIn} className="p-1.5 bg-[#333] hover:bg-[#444] text-white rounded shadow-sm border border-[#555]" title="Zoom In">
          <ZoomIn size={14} />
        </button>
      </div>
    </div>
  );
};
