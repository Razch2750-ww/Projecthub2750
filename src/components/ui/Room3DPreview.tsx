import React, { useState, useMemo, useRef } from 'react';
import { 
  RefreshCw, 
  Compass, 
  ZoomIn, 
  ZoomOut, 
  Layers, 
  Maximize2, 
  Layout, 
  ArrowRightLeft,
  Grid,
  Info,
  ChevronRight
} from 'lucide-react';

interface Room3DPreviewProps {
  length: number; // mm
  width: number; // mm
  height: number; // mm
  name?: string;
  lampCasings?: number;
  evapLength?: number; // mm
  evapWidth?: number; // mm
  evapHeight?: number; // mm
  evapFanCount?: number;
  evapFanDiameter?: number; // mm
  panelType?: 'PU' | 'PIR';
  panelThickness?: string;
  floorType?: 'tanpa lantai' | 'insulation panel' | 'concrete';
  doorType?: 'Hinged' | 'Sliding';
  doorWidth?: number; // mm
  doorHeight?: number; // mm
  doorWall?: 'depan' | 'kiri' | 'kanan' | 'belakang';
  doorCount?: number;
  forceTopDown?: boolean;
  size?: 'sm' | 'lg';
}

type ViewMode = 'isometric' | 'topDown' | 'frontElevation' | 'sideElevation';

export const Room3DPreview: React.FC<Room3DPreviewProps> = ({
  length,
  width,
  height,
  name,
  lampCasings = 0,
  evapLength,
  evapWidth,
  evapHeight,
  evapFanCount,
  evapFanDiameter,
  panelType = 'PU',
  panelThickness = '100mm',
  floorType = 'tanpa lantai',
  doorType = 'Hinged',
  doorWidth = 900,
  doorHeight = 1900,
  doorWall = 'depan',
  doorCount = 1,
  forceTopDown = false,
  size = 'lg'
}) => {
  // View mode: 'isometric', 'topDown', 'frontElevation', 'sideElevation'
  const [viewModeState, setViewMode] = useState<ViewMode>('isometric');
  const viewMode = forceTopDown ? 'topDown' : viewModeState;

  // 3D View states (angles in radians)
  const [yaw, setYaw] = useState<number>(Math.PI / 4 + 0.25); // horizontal angle
  const [pitch, setPitch] = useState<number>(0.55); // vertical angle (elevation)
  const [zoom, setZoom] = useState<number>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // Dragging states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const startAngles = useRef({ yaw: 0, pitch: 0 });

  // Dimensions in meters
  const L = length / 1000 || 1;
  const W = width / 1000 || 1;
  const H = height / 1000 || 1;

  // Panel thick value in meters
  const thickVal = parseInt(panelThickness) / 1000 || 0.1;
  const pWidth = panelType === 'PU' ? 1.2 : 1.16; // Effective width

  // Max dimension to compute base scale
  const maxDim = Math.max(L, W, H);
  const heightVal = size === 'sm'
    ? (forceTopDown ? 220 : 280)
    : (forceTopDown ? 340 : 480);
  const baseScale = size === 'sm'
    ? (forceTopDown ? Math.min(85, 110 / (maxDim || 1)) : Math.min(110, 140 / (maxDim || 1)))
    : (forceTopDown ? Math.min(130, 160 / (maxDim || 1)) : Math.min(200, 240 / (maxDim || 1)));
  const scale = baseScale * zoom;

  // Centering offsets
  const centerX = 250;
  const centerY = heightVal / 2;

  // Dynamic Projection based on viewMode
  const project = useMemo(() => {
    let currentYaw = yaw;
    let currentPitch = pitch;

    if (viewMode === 'topDown') {
      currentYaw = 0;
      currentPitch = Math.PI / 2 - 0.001; // nearly top down
    } else if (viewMode === 'frontElevation') {
      currentYaw = 0;
      currentPitch = 0;
    } else if (viewMode === 'sideElevation') {
      currentYaw = Math.PI / 2;
      currentPitch = 0;
    }

    const cosY = Math.cos(currentYaw);
    const sinY = Math.sin(currentYaw);
    const cosP = Math.cos(currentPitch);
    const sinP = Math.sin(currentPitch);

    return (X: number, Y: number, Z: number) => {
      // Rotate around Y-axis (yaw)
      const x1 = X * cosY - Z * sinY;
      const z1 = X * sinY + Z * cosY;

      // Rotate around X-axis (pitch)
      const y2 = Y * cosP - z1 * sinP;
      const z2 = Y * sinP + z1 * cosP;

      return {
        x: centerX + x1 * scale,
        y: centerY - y2 * scale, // screen Y is inverted
        depth: z2 // depth coordinate for painter's algorithm sorting
      };
    };
  }, [yaw, pitch, scale, viewMode, centerX, centerY]);

  // Center coordinate reference depth
  const centerDepth = useMemo(() => {
    return project(0, 0, 0).depth;
  }, [project]);

  // Mouse / Touch handlers for dragging
  const handleStart = (clientX: number, clientY: number) => {
    if (viewMode !== 'isometric') return; // only rotate in isometric mode
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    startAngles.current = { yaw, pitch };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;

    // Adjust horizontal rotation (yaw) and vertical tilt (pitch)
    setYaw(startAngles.current.yaw + dx * 0.0075);
    // Constrain pitch so we don't flip the room upside down
    setPitch(Math.max(0.05, Math.min(1.45, startAngles.current.pitch - dy * 0.005)));
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleReset = () => {
    setYaw(Math.PI / 4 + 0.25);
    setPitch(0.55);
    setZoom(1.0);
  };

  // Dimensions of the room relative to center
  const hL = L / 2;
  const hW = W / 2;
  const hH = H / 2;

  // 1. Build Room Bounding Box Vertices
  const v000 = project(-hL, -hH, -hW); // bottom-back-left
  const v100 = project(hL, -hH, -hW);  // bottom-back-right
  const v101 = project(hL, -hH, hW);   // bottom-front-right
  const v001 = project(-hL, -hH, hW);  // bottom-front-left
  const v010 = project(-hL, hH, -hW);  // top-back-left
  const v110 = project(hL, hH, -hW);   // top-back-right
  const v111 = project(hL, hH, hW);    // top-front-right
  const v011 = project(-hL, hH, hW);   // top-front-left

  // Elements to render, each has a depth and render function
  const renderables: Array<{ depth: number; render: () => React.ReactNode }> = [];

  // A. Floor grid & PU layout (for 2D top view or 3D isometric)
  if (showGrid) {
    const gridSegments = 8;
    for (let i = 0; i <= gridSegments; i++) {
      const ratio = i / gridSegments;
      const x = -hL + ratio * L;
      const z = -hW + ratio * W;

      // Lines along Z (parallel to width)
      const pX1 = project(x, -hH, -hW);
      const pX2 = project(x, -hH, hW);
      renderables.push({
        depth: (pX1.depth + pX2.depth) / 2 + 0.01,
        render: () => (
          <line
            key={`grid-x-${i}`}
            x1={pX1.x}
            y1={pX1.y}
            x2={pX2.x}
            y2={pX2.y}
            stroke="rgba(110, 110, 120, 0.25)"
            strokeWidth="1"
            strokeDasharray={viewMode === 'topDown' ? undefined : "3,3"}
          />
        )
      });

      // Lines along X (parallel to length)
      const pZ1 = project(-hL, -hH, z);
      const pZ2 = project(hL, -hH, z);
      renderables.push({
        depth: (pZ1.depth + pZ2.depth) / 2 + 0.01,
        render: () => (
          <line
            key={`grid-z-${i}`}
            x1={pZ1.x}
            y1={pZ1.y}
            x2={pZ2.x}
            y2={pZ2.y}
            stroke="rgba(110, 110, 120, 0.25)"
            strokeWidth="1"
            strokeDasharray={viewMode === 'topDown' ? undefined : "3,3"}
          />
        )
      });
    }
  }

  // B. Floor polygon (Bottom face)
  renderables.push({
    depth: (v000.depth + v100.depth + v101.depth + v001.depth) / 4 + 0.08,
    render: () => (
      <polygon
        key="floor"
        points={`${v000.x},${v000.y} ${v100.x},${v100.y} ${v101.x},${v101.y} ${v001.x},${v001.y}`}
        fill="#1e1e24"
        fillOpacity="0.8"
        stroke="#33333f"
        strokeWidth="1"
      />
    )
  });

  // Ceiling polygon (Top face)
  if (viewMode !== 'topDown') {
    renderables.push({
      depth: (v010.depth + v110.depth + v111.depth + v011.depth) / 4 - 0.08,
      render: () => (
        <polygon
          key="ceiling"
          points={`${v010.x},${v010.y} ${v110.x},${v110.y} ${v111.x},${v111.y} ${v011.x},${v011.y}`}
          fill="#2d2d35"
          fillOpacity="0.15"
          stroke="#444452"
          strokeWidth="1.25"
          strokeDasharray="4,4"
        />
      )
    });
  }

  // C. Walls with Panel Joints (SupaCAD signature: Drawing interlocking PU/PIR panel seams!)
  const drawWallWithPanels = (
    p0: typeof v000, // bottom-left
    p1: typeof v000, // bottom-right
    p2: typeof v000, // top-right
    p3: typeof v000, // top-left
    startX: number,
    endX: number,
    startZ: number,
    endZ: number,
    key: string,
    isOpaque: boolean
  ) => {
    const avgDepth = (p0.depth + p1.depth + p2.depth + p3.depth) / 4;
    
    renderables.push({
      depth: avgDepth + (isOpaque ? 0.04 : -0.04),
      render: () => {
        const panels: React.ReactNode[] = [];
        
        // Base wall polygon
        panels.push(
          <polygon
            key={`${key}-base`}
            points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
            fill={isOpaque ? "#23232b" : "transparent"}
            fillOpacity="0.65"
            stroke="#3a3a47"
            strokeWidth="1"
          />
        );

        // Calculate panel divisions
        const isXWall = Math.abs(startZ - endZ) < 0.001; // Wall parallel to X (back/front)
        const totalLen = isXWall ? Math.abs(startX - endX) : Math.abs(startZ - endZ);
        const panelCount = Math.ceil(totalLen / pWidth);

        // Draw joint line segments
        for (let j = 1; j < panelCount; j++) {
          const t = j / panelCount;
          
          let jx0, jz0, jx1, jz1;
          if (isXWall) {
            jx0 = startX + (endX - startX) * t;
            jz0 = startZ;
            jx1 = jx0;
            jz1 = jz0;
          } else {
            jx0 = startX;
            jz0 = startZ + (endZ - startZ) * t;
            jx1 = jx0;
            jz1 = jz0;
          }

          const jBottom = project(jx0, -hH, jz0);
          const jTop = project(jx1, hH, jz1);

          panels.push(
            <line
              key={`${key}-joint-${j}`}
              x1={jBottom.x}
              y1={jBottom.y}
              x2={jTop.x}
              y2={jTop.y}
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="1"
              strokeDasharray="1,2"
            />
          );
        }

        return <g key={key}>{panels}</g>;
      }
    });
  };

  // Determine wall visibility based on depth relative to center
  const backWallOpaque = v000.depth > centerDepth && v100.depth > centerDepth;
  const leftWallOpaque = v000.depth > centerDepth && v001.depth > centerDepth;
  const rightWallOpaque = v100.depth > centerDepth && v101.depth > centerDepth;
  const frontWallOpaque = v001.depth > centerDepth && v101.depth > centerDepth;

  // Let's render the walls!
  if (viewMode !== 'topDown') {
    // Back Wall (Z = -hW, X goes -hL to hL)
    drawWallWithPanels(v000, v100, v110, v010, -hL, hL, -hW, -hW, "wall-back", backWallOpaque || viewMode === 'frontElevation');
    // Left Wall (X = -hL, Z goes -hW to hW)
    drawWallWithPanels(v000, v001, v011, v010, -hL, -hL, -hW, hW, "wall-left", leftWallOpaque || viewMode === 'sideElevation');
    // Right Wall (X = hL, Z goes -hW to hW)
    drawWallWithPanels(v100, v101, v111, v110, hL, hL, -hW, hW, "wall-right", rightWallOpaque || viewMode === 'sideElevation');
    // Front Wall (Z = hW, X goes -hL to hL)
    drawWallWithPanels(v001, v101, v111, v011, -hL, hL, hW, hW, "wall-front", frontWallOpaque);
  }

  // D. 2D Cavity / Wall Thickness drawing (only for TopDown 2D Floor Plan)
  if (viewMode === 'topDown') {
    renderables.push({
      depth: centerDepth + 0.05,
      render: () => {
        // Outer box vertices (represented by the normal bounding box)
        // Inner box vertices (offset inside by thickVal)
        const iL = hL - thickVal;
        const iW = hW - thickVal;

        const iv00 = project(-iL, -hH, -iW);
        const iv10 = project(iL, -hH, -iW);
        const iv11 = project(iL, -hH, iW);
        const iv01 = project(-iL, -hH, iW);

        return (
          <g key="cad-cavity-walls">
            {/* Wall core hatch/fill */}
            <polygon
              points={`${v000.x},${v000.y} ${v100.x},${v100.y} ${v101.x},${v101.y} ${v001.x},${v001.y}`}
              fill="none"
              stroke="#444452"
              strokeWidth="2"
            />
            <polygon
              points={`${iv00.x},${iv00.y} ${iv10.x},${iv10.y} ${iv11.x},${iv11.y} ${iv01.x},${iv01.y}`}
              fill="#121214"
              stroke="#555566"
              strokeWidth="1.5"
            />
            {/* Interlocking panel division lines around the perimeter */}
            {/* Draw hatch stripes inside wall cavity */}
            <path
              d={`M ${v000.x} ${v000.y} L ${iv00.x} ${iv00.y} M ${v100.x} ${v100.y} L ${iv10.x} ${iv10.y} M ${v101.x} ${v101.y} L ${iv11.x} ${iv11.y} M ${v001.x} ${v001.y} L ${iv01.x} ${iv01.y}`}
              stroke="#2d2d3a"
              strokeWidth="1"
            />
          </g>
        );
      }
    });
  }

  // E. Door Rendering with Swing or Sliding Tracks!
  const dW = doorWidth / 1000;
  const dH = doorHeight / 1000;
  
  // Find door center position in meters based on chosen doorWall
  let doorCoords3D: {
    bl: [number, number, number];
    br: [number, number, number];
    tr: [number, number, number];
    tl: [number, number, number];
    faceDepth: number;
  };

  const pad = 0.01; // offset so door sits slightly proud of wall surface
  if (doorWall === 'belakang') {
    doorCoords3D = {
      bl: [-dW/2, -hH, -hW - pad],
      br: [dW/2, -hH, -hW - pad],
      tr: [dW/2, -hH + dH, -hW - pad],
      tl: [-dW/2, -hH + dH, -hW - pad],
      faceDepth: -hW
    };
  } else if (doorWall === 'kiri') {
    doorCoords3D = {
      bl: [-hL - pad, -hH, -dW/2],
      br: [-hL - pad, -hH, dW/2],
      tr: [-hL - pad, -hH + dH, dW/2],
      tl: [-hL - pad, -hH + dH, -dW/2],
      faceDepth: -hL
    };
  } else if (doorWall === 'kanan') {
    doorCoords3D = {
      bl: [hL + pad, -hH, -dW/2],
      br: [hL + pad, -hH, dW/2],
      tr: [hL + pad, -hH + dH, dW/2],
      tl: [hL + pad, -hH + dH, -dW/2],
      faceDepth: hL
    };
  } else { // default: depan (Z = hW)
    doorCoords3D = {
      bl: [-dW/2, -hH, hW + pad],
      br: [dW/2, -hH, hW + pad],
      tr: [dW/2, -hH + dH, hW + pad],
      tl: [-dW/2, -hH + dH, hW + pad],
      faceDepth: hW
    };
  }

  const pBL = project(...doorCoords3D.bl);
  const pBR = project(...doorCoords3D.br);
  const pTR = project(...doorCoords3D.tr);
  const pTL = project(...doorCoords3D.tl);
  const doorAvgDepth = (pBL.depth + pBR.depth + pTR.depth + pTL.depth) / 4 - 0.06;

  // Let's add the door to the render list!
  renderables.push({
    depth: doorAvgDepth,
    render: () => {
      // 1. In 2D TopDown Plan: Render authentic CAD drawing of the Door (Swing Arc or Slide Vector)
      if (viewMode === 'topDown') {
        // Door hinge / slide anchor points on floor plan (Y = -hH)
        let anchorX = 0, anchorZ = 0, leafEndX = 0, leafEndZ = 0;
        
        if (doorWall === 'depan') {
          anchorX = -dW / 2;
          anchorZ = hW;
          
          if (doorType === 'Hinged') {
            // Hinged single swings out at 90 deg (towards hW + dW)
            leafEndX = anchorX;
            leafEndZ = hW + dW;
            const pAnchor = project(anchorX, -hH, anchorZ);
            const pLeafEnd = project(leafEndX, -hH, leafEndZ);
            const pArcStart = project(dW / 2, -hH, hW);
            
            // Draw arc as standard path SVG
            const rX = Math.abs(pAnchor.x - pArcStart.x);
            return (
              <g key="door-cad-swing">
                {/* Wall Opening Cutout */}
                <line x1={pAnchor.x} y1={pAnchor.y} x2={pArcStart.x} y2={pArcStart.y} stroke="#121214" strokeWidth="4" />
                {/* Door leaf panel */}
                <line x1={pAnchor.x} y1={pAnchor.y} x2={pLeafEnd.x} y2={pLeafEnd.y} stroke="#10b981" strokeWidth="2" />
                {/* Dotted swing path */}
                <path
                  d={`M ${pArcStart.x} ${pArcStart.y} A ${rX} ${rX} 0 0 0 ${pLeafEnd.x} ${pLeafEnd.y}`}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="1"
                  strokeDasharray="2,3"
                />
                <text x={pAnchor.x + 10} y={pAnchor.y + 12} fill="#10b981" fontSize="9" fontWeight="bold">PINTU SWING</text>
              </g>
            );
          } else {
            // Sliding door slides right
            const pAnchor = project(anchorX, -hH, anchorZ);
            const pArcStart = project(dW / 2, -hH, hW);
            const pSlideEnd = project(dW * 1.25, -hH, hW + 0.04);
            const pSlideStart = project(-dW / 2, -hH, hW + 0.04);

            return (
              <g key="door-cad-sliding">
                {/* Track line */}
                <line x1={pAnchor.x} y1={pAnchor.y + 4} x2={pSlideEnd.x} y2={pSlideEnd.y} stroke="#3b82f6" strokeWidth="2" />
                {/* Door leaf panel (slid open 30%) */}
                <line x1={pSlideStart.x + 20} y1={pSlideStart.y} x2={pSlideEnd.x - 20} y2={pSlideEnd.y} stroke="#60a5fa" strokeWidth="3" />
                {/* Slide Direction Arrow */}
                <line x1={pAnchor.x} y1={pAnchor.y + 8} x2={pAnchor.x + 30} y2={pAnchor.y + 8} stroke="#3b82f6" strokeWidth="1" />
                <polygon points={`${pAnchor.x + 30},${pAnchor.y + 6} ${pAnchor.x + 36},${pAnchor.y + 8} ${pAnchor.x + 30},${pAnchor.y + 10}`} fill="#3b82f6" />
                <text x={pAnchor.x + 40} y={pAnchor.y + 12} fill="#3b82f6" fontSize="9" fontWeight="bold">PINTU GESER (SLIDING)</text>
              </g>
            );
          }
        }
        
        // Return blank if door falls on side wall in topDown but still show reference point
        const pOpeningL = project(doorCoords3D.bl[0], -hH, doorCoords3D.bl[2]);
        const pOpeningR = project(doorCoords3D.br[0], -hH, doorCoords3D.br[2]);
        return (
          <g key="door-cad-reference">
            <line x1={pOpeningL.x} y1={pOpeningL.y} x2={pOpeningR.x} y2={pOpeningR.y} stroke="#e11d48" strokeWidth="2.5" />
            <circle cx={pOpeningL.x} cy={pOpeningL.y} r="2" fill="#ffffff" />
            <text x={pOpeningL.x - 10} y={pOpeningL.y - 8} fill="#e11d48" fontSize="8" fontWeight="semibold">Pintu ({doorWall})</text>
          </g>
        );
      }

      // 2. In 3D Isometric View or Elevation Views
      const strokeColor = doorType === 'Hinged' ? '#10b981' : '#3b82f6';
      const fillColor = doorType === 'Hinged' ? '#064e3b' : '#1e3a8a';

      if (doorType === 'Hinged') {
        // Swing door: Draw the open frame leaf slightly open in 3D (swings 30 deg open)
        const angle = -0.6; // ~35 degrees open
        let opCoords: Array<[number, number, number]>;

        if (doorWall === 'depan' || doorWall === 'belakang') {
          const sZ = doorWall === 'depan' ? 1 : -1;
          // Pivot is at Left edge of opening: (-dW/2, -hH, doorWallZ)
          opCoords = [
            [-dW/2, -hH, doorCoords3D.bl[2]], // bottom-hinge
            [-dW/2 + dW * Math.cos(angle), -hH, doorCoords3D.bl[2] + dW * Math.sin(angle) * sZ], // bottom-swing
            [-dW/2 + dW * Math.cos(angle), -hH + dH, doorCoords3D.bl[2] + dW * Math.sin(angle) * sZ], // top-swing
            [-dW/2, -hH + dH, doorCoords3D.bl[2]] // top-hinge
          ];
        } else {
          // Pivot is on side wall
          const sX = doorWall === 'kanan' ? 1 : -1;
          opCoords = [
            [doorCoords3D.bl[0], -hH, -dW/2], // bottom-hinge
            [doorCoords3D.bl[0] + dW * Math.sin(angle) * sX, -hH, -dW/2 + dW * Math.cos(angle)], // bottom-swing
            [doorCoords3D.bl[0] + dW * Math.sin(angle) * sX, -hH + dH, -dW/2 + dW * Math.cos(angle)], // top-swing
            [doorCoords3D.bl[0], -hH + dH, -dW/2] // top-hinge
          ];
        }

        const pO0 = project(...opCoords[0]);
        const pO1 = project(...opCoords[1]);
        const pO2 = project(...opCoords[2]);
        const pO3 = project(...opCoords[3]);

        return (
          <g key="hinged-door-3d">
            {/* Dark inner opening cutout (empty door recess) */}
            <polygon
              points={`${pBL.x},${pBL.y} ${pBR.x},${pBR.y} ${pTR.x},${pTR.y} ${pTL.x},${pTL.y}`}
              fill="#0b0a12"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            {/* Open door panel leaf */}
            <polygon
              points={`${pO0.x},${pO0.y} ${pO1.x},${pO1.y} ${pO2.x},${pO2.y} ${pO3.x},${pO3.y}`}
              fill={fillColor}
              fillOpacity="0.75"
              stroke="#ffffff"
              strokeWidth="1.25"
            />
            {/* Door handle bar */}
            <line
              x1={pO1.x - (pO1.x - pO0.x) * 0.15}
              y1={pO1.y - (pO1.y - pO2.y) * 0.5 - 6}
              x2={pO1.x - (pO1.x - pO0.x) * 0.15}
              y2={pO1.y - (pO1.y - pO2.y) * 0.5 + 6}
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Pivot lines (hinges) */}
            <circle cx={pO0.x} cy={pO0.y - 10} r="1.5" fill="#e4e4e7" />
            <circle cx={pO3.x} cy={pO3.y + 10} r="1.5" fill="#e4e4e7" />
          </g>
        );
      } else {
        // Sliding Door: Top track rail, rollers, and door shifted to side (50% slid open)
        const slideOffset = dW * 0.45; // Slid open slightly to show CAD realism
        let slidCoords: Array<[number, number, number]>;
        let railCoords: Array<[number, number, number]>;

        if (doorWall === 'depan' || doorWall === 'belakang') {
          const zVal = doorCoords3D.bl[2];
          slidCoords = [
            [-dW/2 + slideOffset, -hH, zVal],
            [dW/2 + slideOffset, -hH, zVal],
            [dW/2 + slideOffset, -hH + dH, zVal],
            [-dW/2 + slideOffset, -hH + dH, zVal]
          ];
          railCoords = [
            [-dW/2 - 0.1, -hH + dH + 0.05, zVal],
            [dW * 1.1, -hH + dH + 0.05, zVal]
          ];
        } else {
          const xVal = doorCoords3D.bl[0];
          slidCoords = [
            [xVal, -hH, -dW/2 + slideOffset],
            [xVal, -hH, dW/2 + slideOffset],
            [xVal, -hH + dH, dW/2 + slideOffset],
            [xVal, -hH + dH, -dW/2 + slideOffset]
          ];
          railCoords = [
            [xVal, -hH + dH + 0.05, -dW/2 - 0.1],
            [xVal, -hH + dH + 0.05, dW * 1.1]
          ];
        }

        const pS0 = project(...slidCoords[0]);
        const pS1 = project(...slidCoords[1]);
        const pS2 = project(...slidCoords[2]);
        const pS3 = project(...slidCoords[3]);

        const pR0 = project(...railCoords[0]);
        const pR1 = project(...railCoords[1]);

        return (
          <g key="sliding-door-3d">
            {/* Dark door opening cutout */}
            <polygon
              points={`${pBL.x},${pBL.y} ${pBR.x},${pBR.y} ${pTR.x},${pTR.y} ${pTL.x},${pTL.y}`}
              fill="#0b0a12"
              stroke={strokeColor}
              strokeWidth="1.5"
            />
            {/* Solid sliding panel face */}
            <polygon
              points={`${pS0.x},${pS0.y} ${pS1.x},${pS1.y} ${pS2.x},${pS2.y} ${pS3.x},${pS3.y}`}
              fill={fillColor}
              fillOpacity="0.85"
              stroke="#e4e4e7"
              strokeWidth="1.25"
            />
            {/* Sliding tracks / rail line */}
            <line
              x1={pR0.x}
              y1={pR0.y}
              x2={pR1.x}
              y2={pR1.y}
              stroke="#cbd5e1"
              strokeWidth="3.25"
              strokeLinecap="round"
            />
            {/* Two roller wheels connecting door top to track */}
            <circle cx={pS3.x + (pS2.x - pS3.x) * 0.25} cy={pS3.y} r="3" fill="#94a3b8" stroke="#1e293b" strokeWidth="0.75" />
            <circle cx={pS3.x + (pS2.x - pS3.x) * 0.75} cy={pS3.y} r="3" fill="#94a3b8" stroke="#1e293b" strokeWidth="0.75" />
            {/* Recessed slider handle */}
            <rect
              x={pS0.x + (pS1.x - pS0.x) * 0.15 - 3}
              y={pS0.y - (pS0.y - pS3.y) * 0.5 - 12}
              width="6"
              height="24"
              rx="2"
              fill="#1e293b"
              stroke="#cbd5e1"
              strokeWidth="0.5"
            />
          </g>
        );
      }
    }
  });

  // F. Evaporator (Cooling Unit) rendered near back wall (Z = -hW) and ceiling (Y = hH)
  const eL = evapLength ? evapLength / 1000 : (L > 2.5 ? 1.4 : 0.75);
  const eW = evapWidth ? evapWidth / 1000 : 0.45;
  const eH = evapHeight ? evapHeight / 1000 : 0.35;
  const fanCount = evapFanCount || (L > 2.5 ? 2 : 1);
  const fanDia = evapFanDiameter ? evapFanDiameter / 1000 : 0.3;
  const fanRadius = Math.min(eH / 2 - 0.04, fanDia / 2);

  // Bounds of evaporator box
  const ex0 = -eL / 2;
  const ex1 = eL / 2;
  const ey0 = hH - eH - 0.08; // 8cm hanging from ceiling
  const ey1 = hH - 0.08;
  const ez0 = -hW + 0.05; // 5cm offset from back wall
  const ez1 = -hW + eW + 0.05;

  const eb000 = project(ex0, ey0, ez0);
  const eb100 = project(ex1, ey0, ez0);
  const eb101 = project(ex1, ey0, ez1);
  const eb001 = project(ex0, ey0, ez1);
  const eb010 = project(ex0, ey1, ez0);
  const eb110 = project(ex1, ey1, ez0);
  const eb111 = project(ex1, ey1, ez1);
  const eb011 = project(ex0, ey1, ez1);

  const addEvapFace = (p0: typeof v000, p1: typeof v000, p2: typeof v000, p3: typeof v000, key: string, isFrontFace = false) => {
    const avgDepth = (p0.depth + p1.depth + p2.depth + p3.depth) / 4;
    renderables.push({
      depth: avgDepth - 0.02,
      render: () => (
        <polygon
          key={key}
          points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`}
          fill={isFrontFace ? "#334155" : "#1e293b"}
          stroke="#94a3b8"
          strokeWidth="0.75"
        />
      )
    });
  };

  if (viewMode !== 'topDown') {
    addEvapFace(eb000, eb100, eb110, eb010, "evap-face-back");
    addEvapFace(eb000, eb001, eb011, eb010, "evap-face-left");
    addEvapFace(eb100, eb101, eb111, eb110, "evap-face-right");
    addEvapFace(eb010, eb110, eb111, eb011, "evap-face-top");
    addEvapFace(eb000, eb100, eb111, eb011, "evap-face-bottom");
    // Front face
    addEvapFace(eb001, eb101, eb111, eb011, "evap-face-front", true);

    // Evaporator Fans
    for (let i = 0; i < fanCount; i++) {
      const step = eL / (fanCount + 1);
      const fx = ex0 + step * (i + 1);
      const fy = (ey0 + ey1) / 2;
      const fz = ez1;

      const fanPoints3D: Array<[number, number, number]> = [];
      const segments = 12;
      for (let s = 0; s < segments; s++) {
        const angle = (s * 2 * Math.PI) / segments;
        fanPoints3D.push([
          fx + fanRadius * Math.cos(angle),
          fy + fanRadius * Math.sin(angle),
          fz
        ]);
      }

      const projectedFanPoints = fanPoints3D.map(([px, py, pz]) => project(px, py, pz));
      const pointsString = projectedFanPoints.map(p => `${p.x},${p.y}`).join(' ');
      const fanAvgDepth = projectedFanPoints.reduce((sum, p) => sum + p.depth, 0) / segments - 0.05;

      renderables.push({
        depth: fanAvgDepth,
        render: () => (
          <g key={`fan-${i}`}>
            <polygon
              points={pointsString}
              fill="#0f172a"
              fillOpacity="0.9"
              stroke="#38bdf8"
              strokeWidth="0.75"
            />
            {/* Spinner Rotor */}
            <circle
              cx={project(fx, fy, fz).x}
              cy={project(fx, fy, fz).y}
              r={Math.max(2, scale * fanRadius * 0.35)}
              fill="#cbd5e1"
              stroke="#334155"
              strokeWidth="0.5"
            />
          </g>
        )
      });
    }
  } else {
    // 2D CAD Top View: Render exact top outline of the evaporator unit with fan wind flow direction arrows!
    const ec00 = project(ex0, hH, ez0);
    const ec10 = project(ex1, hH, ez0);
    const ec11 = project(ex1, hH, ez1);
    const ec01 = project(ex0, hH, ez1);

    renderables.push({
      depth: centerDepth - 0.05,
      render: () => (
        <g key="evap-cad-top">
          <polygon
            points={`${ec00.x},${ec00.y} ${ec10.x},${ec10.y} ${ec11.x},${ec11.y} ${ec01.x},${ec01.y}`}
            fill="#334155"
            fillOpacity="0.45"
            stroke="#38bdf8"
            strokeWidth="1.5"
          />
          <text
            x={(ec00.x + ec11.x) / 2}
            y={(ec00.y + ec11.y) / 2 + 3}
            textAnchor="middle"
            fill="#38bdf8"
            fontSize="9"
            fontWeight="extrabold"
          >
            EVAP ({fanCount} FAN)
          </text>
          {/* Fan blow flow arrows (pointing into room) */}
          <path
            d={`M ${(ec01.x + ec11.x) / 2 - 20} ${ec11.y + 4} L ${(ec01.x + ec11.x) / 2 - 20} ${ec11.y + 16} m 0 0 l -4 -4 m 4 4 l 4 -4`}
            stroke="#38bdf8"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d={`M ${(ec01.x + ec11.x) / 2 + 20} ${ec11.y + 4} L ${(ec01.x + ec11.x) / 2 + 20} ${ec11.y + 16} m 0 0 l -4 -4 m 4 4 l 4 -4`}
            stroke="#38bdf8"
            strokeWidth="1.5"
            fill="none"
          />
        </g>
      )
    });
  }

  // G. Light/Lamps
  if (lampCasings > 0 && viewMode !== 'topDown') {
    const cols = Math.ceil(Math.sqrt(lampCasings));
    const rows = Math.ceil(lampCasings / cols);
    const spacingX = L / (cols + 1);
    const spacingZ = W / (rows + 1);

    for (let i = 0; i < lampCasings; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const lx = -hL + spacingX * (c + 1);
      const lz = -hW + spacingZ * (r + 1);
      const ly = hH - 0.02;

      const lpx0 = project(lx - 0.2, ly, lz - 0.06);
      const lpx1 = project(lx + 0.2, ly, lz - 0.06);
      const lpx2 = project(lx + 0.2, ly, lz + 0.06);
      const lpx3 = project(lx - 0.2, ly, lz + 0.06);

      const lampDepth = (lpx0.depth + lpx1.depth + lpx2.depth + lpx3.depth) / 4 - 0.04;

      renderables.push({
        depth: lampDepth,
        render: () => (
          <g key={`lamp-${i}`}>
            <polygon
              points={`${lpx0.x},${lpx0.y} ${lpx1.x},${lpx1.y} ${lpx2.x},${lpx2.y} ${lpx3.x},${lpx3.y}`}
              fill="#ffffff"
              stroke="#fbbf24"
              strokeWidth="0.75"
            />
            {/* Glow circle */}
            <circle
              cx={(lpx0.x + lpx2.x)/2}
              cy={(lpx0.y + lpx2.y)/2}
              r="8"
              fill="#fef08a"
              fillOpacity="0.3"
              filter="blur(1px)"
            />
          </g>
        )
      });
    }
  }

  // Sort everything by depth (Painter's algorithm)
  const sortedRenderables = [...renderables].sort((a, b) => b.depth - a.depth);

  // H. ARCHITECTURAL DIMENSION LABELS
  // 1. Length dimension helper (front edge)
  const lenHStart = project(-hL, -hH, hW + 0.35);
  const lenHEnd = project(hL, -hH, hW + 0.35);
  const lenAngle = Math.atan2(lenHEnd.y - lenHStart.y, lenHEnd.x - lenHStart.x);
  const lenPerpX = Math.cos(lenAngle + Math.PI / 2) * 4;
  const lenPerpY = Math.sin(lenAngle + Math.PI / 2) * 4;

  // 2. Width dimension helper (right edge)
  const widHStart = project(hL + 0.35, -hH, -hW);
  const widHEnd = project(hL + 0.35, -hH, hW);
  const widAngle = Math.atan2(widHEnd.y - widHStart.y, widHEnd.x - widHStart.x);
  const widPerpX = Math.cos(widAngle + Math.PI / 2) * 4;
  const widPerpY = Math.sin(widAngle + Math.PI / 2) * 4;

  // 3. Height dimension helper (vertical front-left edge)
  const heiHStart = project(-hL - 0.35, -hH, hW + 0.05);
  const heiHEnd = project(-hL - 0.35, hH, hW + 0.05);
  const heiAngle = Math.atan2(heiHEnd.y - heiHStart.y, heiHEnd.x - heiHStart.x);
  const heiPerpX = Math.cos(heiAngle + Math.PI / 2) * 4;
  const heiPerpY = Math.sin(heiAngle + Math.PI / 2) * 4;

  return (
    <div className={`w-full flex flex-col rounded-xl overflow-hidden relative ${
      forceTopDown 
        ? 'bg-white border border-zinc-200 text-zinc-900 shadow-none' 
        : 'bg-[#0b0a0f] border border-zinc-800 text-zinc-100 shadow-2xl'
    }`}>
      
      {/* 1. TOP CAD HUD CONTROLLER VIEW CHOOSERS */}
      {!forceTopDown && (
        <div className={`flex border-b border-zinc-800 bg-[#121117] items-center justify-between z-10 ${size === 'sm' ? 'p-1' : 'p-2'}`}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setViewMode('isometric')}
              className={`rounded-lg font-semibold flex items-center transition-all ${
                size === 'sm' ? 'px-2 py-1 text-[10px] gap-1' : 'px-3 py-1.5 text-xs gap-1.5'
              } ${
                viewMode === 'isometric' 
                  ? 'bg-[var(--color-accent-600)] text-white shadow-md shadow-emerald-950/50' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Compass size={size === 'sm' ? 11 : 13} />
              Isometric 3D
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('topDown');
                setZoom(0.9);
              }}
              className={`rounded-lg font-semibold flex items-center transition-all ${
                size === 'sm' ? 'px-2 py-1 text-[10px] gap-1' : 'px-3 py-1.5 text-xs gap-1.5'
              } ${
                viewMode === 'topDown' 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Layout size={size === 'sm' ? 11 : 13} />
              CAD 2D (Atas)
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('frontElevation');
                setZoom(0.95);
              }}
              className={`rounded-lg font-semibold flex items-center transition-all ${
                size === 'sm' ? 'px-2 py-1 text-[10px] gap-1' : 'px-3 py-1.5 text-xs gap-1.5'
              } ${
                viewMode === 'frontElevation' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <Layers size={size === 'sm' ? 11 : 13} />
              Tampak Depan
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowGrid(g => !g)}
            className={`rounded-md border text-zinc-400 transition-all ${
              size === 'sm' ? 'p-1' : 'p-1.5'
            } ${
              showGrid ? 'border-[var(--color-accent-800)] bg-[var(--color-accent-950)]/40 text-[var(--color-accent-400)]' : 'border-zinc-800 hover:bg-zinc-800'
            }`}
            title="Toggle Grid"
          >
            <Grid size={size === 'sm' ? 12 : 14} />
          </button>
        </div>
      )}

      {/* 2. MAIN SVG CANVAS AREA */}
      <div 
        className={`w-full relative overflow-hidden select-none ${
          size === 'sm'
            ? (forceTopDown ? 'h-[180px]' : 'h-[240px]')
            : (forceTopDown ? 'h-[250px]' : 'h-[360px] md:h-[480px]')
        } ${
          viewMode === 'isometric' ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <svg
          className="w-full h-full"
          viewBox={`0 0 500 ${heightVal}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleEnd}
        >
          {/* Render 3D and 2D elements in correct order */}
          {sortedRenderables.map(r => r.render())}

          {/* Render Dimensions Overlays */}
          {/* Length (L) */}
          {(viewMode === 'isometric' || viewMode === 'topDown' || viewMode === 'frontElevation') && (
            <g id="dimension-length">
              <line
                x1={lenHStart.x}
                y1={lenHStart.y}
                x2={lenHEnd.x}
                y2={lenHEnd.y}
                stroke="#10b981"
                strokeWidth="1.25"
              />
              <line x1={lenHStart.x - lenPerpX} y1={lenHStart.y - lenPerpY} x2={lenHStart.x + lenPerpX} y2={lenHStart.y + lenPerpY} stroke="#10b981" strokeWidth="1.5" />
              <line x1={lenHEnd.x - lenPerpX} y1={lenHEnd.y - lenPerpY} x2={lenHEnd.x + lenPerpX} y2={lenHEnd.y + lenPerpY} stroke="#10b981" strokeWidth="1.5" />
              <g transform={`translate(${(lenHStart.x + lenHEnd.x) / 2}, ${(lenHStart.y + lenHEnd.y) / 2})`}>
                <rect x="-28" y="-9" width="56" height="18" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
                <text y="3" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="extrabold" fontFamily="monospace">
                  L:{length}mm
                </text>
              </g>
            </g>
          )}

          {/* Width (W) */}
          {(viewMode === 'isometric' || viewMode === 'topDown' || viewMode === 'sideElevation') && (
            <g id="dimension-width">
              <line
                x1={widHStart.x}
                y1={widHStart.y}
                x2={widHEnd.x}
                y2={widHEnd.y}
                stroke="#f59e0b"
                strokeWidth="1.25"
              />
              <line x1={widHStart.x - widPerpX} y1={widHStart.y - widPerpY} x2={widHStart.x + widPerpX} y2={widHStart.y + widPerpY} stroke="#f59e0b" strokeWidth="1.5" />
              <line x1={widHEnd.x - widPerpX} y1={widHEnd.y - widPerpY} x2={widHEnd.x + widPerpX} y2={widHEnd.y + widPerpY} stroke="#f59e0b" strokeWidth="1.5" />
              <g transform={`translate(${(widHStart.x + widHEnd.x) / 2}, ${(widHStart.y + widHEnd.y) / 2})`}>
                <rect x="-28" y="-9" width="56" height="18" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
                <text y="3" textAnchor="middle" fill="#f59e0b" fontSize="9" fontWeight="extrabold" fontFamily="monospace">
                  W:{width}mm
                </text>
              </g>
            </g>
          )}

          {/* Height (H) */}
          {(viewMode === 'isometric' || viewMode === 'frontElevation' || viewMode === 'sideElevation') && (
            <g id="dimension-height">
              <line
                x1={heiHStart.x}
                y1={heiHStart.y}
                x2={heiHEnd.x}
                y2={heiHEnd.y}
                stroke="#3b82f6"
                strokeWidth="1.25"
              />
              <line x1={heiHStart.x - heiPerpX} y1={heiHStart.y - heiPerpY} x2={heiHStart.x + heiPerpX} y2={heiHStart.y + heiPerpY} stroke="#3b82f6" strokeWidth="1.5" />
              <line x1={heiHEnd.x - heiPerpX} y1={heiHEnd.y - heiPerpY} x2={heiHEnd.x + heiPerpX} y2={heiHEnd.y + heiPerpY} stroke="#3b82f6" strokeWidth="1.5" />
              <g transform={`translate(${(heiHStart.x + heiHEnd.x) / 2}, ${(heiHStart.y + heiHEnd.y) / 2})`}>
                <rect x="-28" y="-9" width="56" height="18" rx="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" />
                <text y="3" textAnchor="middle" fill="#3b82f6" fontSize="9" fontWeight="extrabold" fontFamily="monospace">
                  H:{height}mm
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* 3. FLOATING OVERLAYS (HUD) */}
        {!forceTopDown && (
          <>
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <div className="bg-[#121117]/90 backdrop-blur-md border border-zinc-800/60 px-3 py-2 rounded-lg shadow-xl">
                <span className="text-zinc-100 text-xs font-extrabold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  {name || 'Layout Cold Room'}
                </span>
                <div className="flex gap-3 text-[10px] text-zinc-400 mt-1 font-mono">
                  <span>Vol: {(L * W * H).toFixed(2)} m³</span>
                  <span>Lantai: {(L * W).toFixed(1)} m²</span>
                </div>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
                className="p-1.5 bg-[#121117]/85 hover:bg-zinc-800 text-zinc-300 rounded-md border border-zinc-800 transition-colors shadow-md"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(2.2, z + 0.15))}
                className="p-1.5 bg-[#121117]/85 hover:bg-zinc-800 text-zinc-300 rounded-md border border-zinc-800 transition-colors shadow-md"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
              {viewMode === 'isometric' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 bg-[#121117]/85 hover:bg-zinc-800 text-zinc-300 rounded-md border border-zinc-800 transition-colors shadow-md"
                  title="Reset Rotasi"
                >
                  <RefreshCw size={13} />
                </button>
              )}
            </div>

            {/* Dynamic bottom helper prompt */}
            <div className="absolute bottom-3 left-3 text-[9px] text-zinc-400 pointer-events-none bg-[#121117]/90 px-2.5 py-1 rounded border border-zinc-800/80 backdrop-blur-sm">
              {viewMode === 'isometric' 
                ? 'Seret / Geser untuk memutar Ruang Pendingin 3D' 
                : viewMode === 'topDown' 
                  ? 'Tampilan Blue-print CAD panel atas dan sekat antar panel'
                  : 'Tampilan elevasi tegak struktur dinding luar'
              }
            </div>

            {/* Realtime 2D CAD blueprint Legend */}
            {viewMode === 'topDown' && (
              <div className="absolute bottom-3 right-3 bg-[#121117]/95 border border-zinc-800 rounded-lg p-2 flex flex-col gap-1 text-[8px] font-semibold text-zinc-400 shadow-xl max-w-[130px]">
                <span className="text-[9px] text-zinc-100 font-bold border-b border-zinc-800 pb-0.5 mb-0.5 uppercase tracking-wide">Legenda CAD</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1.5 bg-[#1e1e24] border border-[#555566] inline-block" />
                  <span>Dinding Panel ({panelThickness})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1.5 bg-[#334155] border border-[#38bdf8] inline-block" />
                  <span>Semburan Evaporator</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-[#10b981] inline-block" />
                  <span>Swing Arc Pintu</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 4. DETAILS BOTTOM INFO STRIP */}
      {!forceTopDown && (
        <div className="border-t border-zinc-800 bg-[#0f0e13] px-4 py-2.5 flex flex-wrap gap-y-1.5 items-center justify-between text-[10px] text-zinc-400">
          <div className="flex items-center gap-2">
            <Info size={12} className="text-zinc-500" />
            <span>Dividensi panel: <strong>{pWidth}m</strong> lebar efektif.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Tebal Panel: <strong className="text-zinc-200">{panelThickness} ({panelType})</strong></span>
            <span>Pintu: <strong className="text-zinc-200">{doorType} ({doorWidth}x{doorHeight}mm)</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
