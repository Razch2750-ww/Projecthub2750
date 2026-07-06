import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../lib/utils';

interface RjmLogoProps {
  collapsed?: boolean;
  className?: string;
}

export const RjmLogo: React.FC<RjmLogoProps> = ({ collapsed = false, className }) => {
  const { currentTheme } = useTheme();
  const isLight = currentTheme.category === 'light';

  // Theme-aware high-contrast brand colors
  const snowflakeLightBlue = '#4eaed4';
  const snowflakeDarkBlue = isLight ? '#1d5c8e' : '#60a5fa'; // Light blue in dark theme for readability
  const textRjm = isLight ? '#1d5c8e' : '#ffffff';
  const textSubtitle = isLight ? '#4eaed4' : '#93c5fd';
  const dividerColor = isLight ? '#e2e8f0' : 'var(--border-color)';

  const angles = [0, 60, 120, 180, 240, 300];

  return (
    <div className={cn("flex items-center gap-3 overflow-hidden select-none", className)}>
      {/* Snowflake Logo SVG */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300"
      >
        {/* Central Hexagon */}
        <polygon
          points="24,17.5 29.63,20.75 29.63,27.25 24,30.5 18.37,27.25 18.37,20.75"
          stroke={snowflakeDarkBlue}
          strokeWidth="3.2"
          strokeLinejoin="miter"
          fill="none"
        />

        {/* 6 Radiating Branches */}
        {angles.map((angle) => {
          // Vertical columns (0 and 180 degrees) are light blue, others are dark blue
          const isVertical = angle === 0 || angle === 180;
          const color = isVertical ? snowflakeLightBlue : snowflakeDarkBlue;

          return (
            <g key={angle} transform={`rotate(${angle}, 24, 24)`}>
              {/* Main radial trunk */}
              <line
                x1="24"
                y1="17.5"
                x2="24"
                y2="4"
                stroke={color}
                strokeWidth="3.2"
                strokeLinecap="square"
              />
              {/* Left chevron branch */}
              <line
                x1="24"
                y1="11"
                x2="19"
                y2="6"
                stroke={color}
                strokeWidth="3.2"
                strokeLinecap="square"
              />
              {/* Right chevron branch */}
              <line
                x1="24"
                y1="11"
                x2="29"
                y2="6"
                stroke={color}
                strokeWidth="3.2"
                strokeLinecap="square"
              />
            </g>
          );
        })}
      </svg>

      {/* Brand Text Content */}
      {!collapsed && (
        <div className="flex items-center gap-2.5 transition-all duration-300">
          {/* Main Large acronym RJM */}
          <span 
            className="text-2xl font-bold tracking-tight"
            style={{ color: textRjm, fontFamily: 'var(--font-sans)' }}
          >
            RJM
          </span>

          {/* Thin Vertical Divider */}
          <div 
            className="w-[1.5px] h-8 shrink-0" 
            style={{ backgroundColor: dividerColor }}
          />

          {/* Subtitle PT ROKINDO JAYA MANDIRI */}
          <div className="flex flex-col text-[10px] font-bold leading-[1.1] tracking-wider uppercase">
            <span style={{ color: textSubtitle }}>PT ROKINDO</span>
            <span style={{ color: textSubtitle }}>JAYA MANDIRI</span>
          </div>
        </div>
      )}
    </div>
  );
};
