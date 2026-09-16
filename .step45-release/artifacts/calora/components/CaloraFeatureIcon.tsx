import React from 'react';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

export type CaloraFeatureIconName =
  | 'food'
  | 'camera'
  | 'barcode'
  | 'voice'
  | 'restaurant'
  | 'recipes'
  | 'shopping'
  | 'coach'
  | 'rhythm'
  | 'water'
  | 'mood'
  | 'progress'
  | 'calendar';

type Props = {
  name: CaloraFeatureIconName;
  size?: number;
  primaryColor: string;
  accentColor: string;
  foregroundColor: string;
  highlightColor: string;
};

export function CaloraFeatureIcon({
  name,
  size = 28,
  primaryColor,
  accentColor,
  foregroundColor,
  highlightColor,
}: Props) {
  const ids = {
    main: `calora-${name}-main`,
    accent: `calora-${name}-accent`,
    glow: `calora-${name}-glow`,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <Defs>
        <LinearGradient id={ids.main} x1="7" y1="6" x2="34" y2="35" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={highlightColor} stopOpacity={0.94} />
          <Stop offset="0.3" stopColor={primaryColor} stopOpacity={0.98} />
          <Stop offset="1" stopColor={foregroundColor} stopOpacity={0.78} />
        </LinearGradient>
        <LinearGradient id={ids.accent} x1="8" y1="7" x2="33" y2="35" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={highlightColor} stopOpacity={0.8} />
          <Stop offset="0.38" stopColor={accentColor} />
          <Stop offset="1" stopColor={primaryColor} stopOpacity={0.86} />
        </LinearGradient>
        <RadialGradient id={ids.glow} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(14 10) rotate(52) scale(23)">
          <Stop offset="0" stopColor={highlightColor} stopOpacity={0.9} />
          <Stop offset="0.5" stopColor={accentColor} stopOpacity={0.52} />
          <Stop offset="1" stopColor={primaryColor} stopOpacity={0.9} />
        </RadialGradient>
      </Defs>

      {name === 'food' && (
        <G>
          <Ellipse cx="20" cy="32" rx="14" ry="3" fill={foregroundColor} opacity={0.14} />
          <Path d="M7 17h26c-.9 8.4-5.6 13-13 13S7.9 25.4 7 17Z" fill={`url(#${ids.main})`} />
          <Ellipse cx="20" cy="17" rx="13" ry="5.4" fill={`url(#${ids.accent})`} />
          <Ellipse cx="20" cy="16.1" rx="9.4" ry="2.7" fill={highlightColor} opacity={0.28} />
          <Path d="M10 20.5c2.8 4.1 6.1 5.8 10 5.8s7.2-1.7 10-5.8c-2.8 2-6.1 2.8-10 2.8s-7.2-.8-10-2.8Z" fill={foregroundColor} opacity={0.14} />
          <Ellipse cx="14.4" cy="15.1" rx="2.3" ry="1.1" fill={highlightColor} opacity={0.68} />
        </G>
      )}

      {name === 'camera' && (
        <G>
          <Rect x="6" y="12" width="28" height="21" rx="6" fill={foregroundColor} opacity={0.14} />
          <Rect x="6" y="9" width="28" height="21" rx="6" fill={`url(#${ids.main})`} />
          <Path d="M12 9.5 14.3 6h6.2l2.1 3.5H12Z" fill={`url(#${ids.accent})`} />
          <Circle cx="20" cy="19.5" r="7" fill={foregroundColor} opacity={0.28} />
          <Circle cx="20" cy="18.3" r="6.1" fill={`url(#${ids.glow})`} />
          <Circle cx="20" cy="18.3" r="2.2" fill={highlightColor} opacity={0.88} />
          <Circle cx="28.3" cy="13.8" r="1.6" fill={highlightColor} opacity={0.72} />
          <Path d="M11 12.6h4" stroke={highlightColor} strokeOpacity={0.72} strokeWidth="1.4" strokeLinecap="round" />
        </G>
      )}

      {name === 'barcode' && (
        <G>
          <Rect x="7" y="9" width="26" height="24" rx="6" fill={foregroundColor} opacity={0.14} />
          <Rect x="6" y="6" width="26" height="24" rx="6" fill={`url(#${ids.main})`} />
          <Rect x="10" y="11" width="18" height="13" rx="2.5" fill={highlightColor} opacity={0.9} />
          <Path d="M12 12v11M14.5 12v11M18 12v11M20 12v11M23 12v11M26 12v11" stroke={primaryColor} strokeWidth="1.35" strokeLinecap="round" />
          <Path d="M8 28.5h24" stroke={accentColor} strokeOpacity={0.72} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M10 8.5h8" stroke={highlightColor} strokeOpacity={0.7} strokeWidth="1.6" strokeLinecap="round" />
        </G>
      )}

      {name === 'voice' && (
        <G>
          <Ellipse cx="20" cy="33" rx="11" ry="2.5" fill={foregroundColor} opacity={0.14} />
          <Rect x="12" y="5" width="16" height="23" rx="8" fill={foregroundColor} opacity={0.14} />
          <Rect x="12" y="4" width="16" height="23" rx="8" fill={`url(#${ids.main})`} />
          <Rect x="16" y="8" width="4" height="11" rx="2" fill={highlightColor} opacity={0.58} />
          <Path d="M8 19a12 12 0 0 0 24 0M20 31v-4M14 33h12" stroke={`url(#${ids.accent})`} strokeWidth="3" strokeLinecap="round" />
          <Path d="M8 18.5a12 12 0 0 0 2.2 6.9" stroke={highlightColor} strokeOpacity={0.68} strokeWidth="1.5" strokeLinecap="round" />
        </G>
      )}

      {name === 'restaurant' && (
        <G>
          <Ellipse cx="20" cy="33" rx="14" ry="2.8" fill={foregroundColor} opacity={0.14} />
          <Path d="M8 16h24v16H8V16Z" fill={`url(#${ids.main})`} />
          <Path d="M6 16h28l-2.2-7H8.2L6 16Z" fill={`url(#${ids.accent})`} />
          <Path d="M8 12.5c2 2.6 4.2 2.6 6.2 0 2 2.6 4.1 2.6 6.1 0 2 2.6 4.2 2.6 6.2 0 1.2 1.6 2.4 2.1 3.5 2.1V16H6c.9 0 1.7-.5 2-1.4Z" fill={highlightColor} opacity={0.3} />
          <Rect x="17" y="22" width="7" height="10" rx="1.5" fill={foregroundColor} opacity={0.42} />
          <Rect x="10.5" y="21" width="3.5" height="4" rx="1" fill={highlightColor} opacity={0.76} />
          <Rect x="26" y="21" width="3.5" height="4" rx="1" fill={highlightColor} opacity={0.76} />
          <Path d="M11 8.5h18" stroke={highlightColor} strokeOpacity={0.7} strokeWidth="1.5" strokeLinecap="round" />
        </G>
      )}

      {name === 'recipes' && (
        <G>
          <Ellipse cx="20" cy="33" rx="14" ry="2.8" fill={foregroundColor} opacity={0.14} />
          <Path d="M7 9.5c4.8-1.6 8.5-.8 13 2v20c-4.5-2.8-8.2-3.6-13-2V9.5Z" fill={`url(#${ids.main})`} />
          <Path d="M33 9.5c-4.8-1.6-8.5-.8-13 2v20c4.5-2.8 8.2-3.6 13-2V9.5Z" fill={`url(#${ids.accent})`} />
          <Path d="M20 11.5v20" stroke={highlightColor} strokeOpacity={0.66} strokeWidth="1.2" />
          <Path d="M10.5 14.5c2.3-.4 4.3-.1 6.2 1M10.5 18c2.1-.3 4-.1 5.7.8M29.5 14.5c-2.3-.4-4.3-.1-6.2 1M29.5 18c-2.1-.3-4-.1-5.7.8" stroke={highlightColor} strokeOpacity={0.72} strokeWidth="1.4" strokeLinecap="round" />
          <Path d="M8.5 28.5c4.2-1 7.5-.2 11.5 2M31.5 28.5c-4.2-1-7.5-.2-11.5 2" stroke={foregroundColor} strokeOpacity={0.18} strokeWidth="2" />
        </G>
      )}

      {name === 'shopping' && (
        <G>
          <Ellipse cx="20" cy="33" rx="13" ry="2.7" fill={foregroundColor} opacity={0.14} />
          <Path d="M9 13h22l-2 18H11L9 13Z" fill={`url(#${ids.main})`} />
          <Path d="M14 14c0-5.2 2.5-8 6-8s6 2.8 6 8" stroke={`url(#${ids.accent})`} strokeWidth="3.5" strokeLinecap="round" />
          <Path d="M11 16c4.4 2.2 11.3 2.2 18 0" stroke={highlightColor} strokeOpacity={0.48} strokeWidth="1.5" />
          <Path d="M14 20v7M19 20v8M25 20v7" stroke={highlightColor} strokeOpacity={0.3} strokeWidth="1.3" strokeLinecap="round" />
          <Path d="M11 29h18" stroke={foregroundColor} strokeOpacity={0.22} strokeWidth="2" strokeLinecap="round" />
        </G>
      )}

      {name === 'coach' && (
        <G>
          <Circle cx="21" cy="22" r="13" fill={foregroundColor} opacity={0.14} />
          <Circle cx="19" cy="19" r="13" fill={`url(#${ids.glow})`} />
          <Circle cx="19" cy="19" r="8.3" fill={primaryColor} opacity={0.68} />
          <Path d="M19 13v12M13 19h12" stroke={highlightColor} strokeOpacity={0.78} strokeWidth="1.5" strokeLinecap="round" />
          <Circle cx="19" cy="19" r="3" fill={highlightColor} opacity={0.9} />
          <Path d="m29 5 1.4 3.6L34 10l-3.6 1.4L29 15l-1.4-3.6L24 10l3.6-1.4L29 5Z" fill={accentColor} />
          <Circle cx="10" cy="10" r="2" fill={highlightColor} opacity={0.8} />
          <Path d="M10 28a11 11 0 0 0 18 0" stroke={accentColor} strokeOpacity={0.72} strokeWidth="1.6" strokeLinecap="round" />
        </G>
      )}

      {name === 'rhythm' && (
        <G>
          <Ellipse cx="20" cy="33" rx="14" ry="2.7" fill={foregroundColor} opacity={0.14} />
          <Path d="M7 25c1.8-8.2 6.1-13.3 13-16 6.9 2.7 11.2 7.8 13 16-4.2 3.2-8.5 4.8-13 4.8S11.2 28.2 7 25Z" fill={`url(#${ids.main})`} />
          <Path d="M20 9v19M20 18c-3.5-3.2-6.5-3.8-9.4-3.4M20 22c3.4-3.3 6.5-4-9.4-3.5" stroke={highlightColor} strokeOpacity={0.52} strokeWidth="1.45" strokeLinecap="round" />
          <Path d="M20 28c-4.6-5.6-7.3-10.7-7.7-15.5M20 28c4.6-5.6 7.3-10.7 7.7-15.5" stroke={accentColor} strokeOpacity={0.78} strokeWidth="2" strokeLinecap="round" />
          <Circle cx="20" cy="8" r="2.7" fill={accentColor} />
          <Path d="M20 3v2M15.5 5l1.3 1.3M24.5 5l-1.3 1.3" stroke={highlightColor} strokeOpacity={0.78} strokeWidth="1.3" strokeLinecap="round" />
        </G>
      )}

      {name === 'water' && (
        <G>
          <Ellipse cx="20" cy="33" rx="12" ry="2.5" fill={foregroundColor} opacity={0.14} />
          <Path d="M20 5C16.5 10 10 16.5 10 23a10 10 0 0 0 20 0c0-6.5-6.5-13-10-18Z" fill={`url(#${ids.main})`} />
          <Path d="M20 8.5c-2.2 3.6-6.3 8.1-6.3 13.1a6.3 6.3 0 0 0 6.3 6.3c1.2 0 2.4-.3 3.3-.9-3.3-1.8-5.1-4.5-5.1-8.1 0-3.4 1.2-6.8 1.8-10.4Z" fill={highlightColor} opacity={0.26} />
          <Path d="M14.7 24.8a5.7 5.7 0 0 0 4.6 3" stroke={highlightColor} strokeOpacity={0.72} strokeWidth="1.7" strokeLinecap="round" />
          <Circle cx="25.5" cy="17.5" r="1.6" fill={highlightColor} opacity={0.72} />
        </G>
      )}

      {name === 'mood' && (
        <G>
          <Ellipse cx="20" cy="33" rx="13" ry="2.6" fill={foregroundColor} opacity={0.14} />
          <Path d="M20 31S7.5 23.4 7.5 14.8A6.6 6.6 0 0 1 20 12a6.6 6.6 0 0 1 12.5 2.8C32.5 23.4 20 31 20 31Z" fill={`url(#${ids.main})`} />
          <Path d="M20 28.3S10.8 22 10.8 15.5a4.1 4.1 0 0 1 7.8-1.8 1.5 1.5 0 0 0 2.8 0 4.1 4.1 0 0 1 7.8 1.8c0 6.5-9.2 12.8-9.2 12.8Z" fill={`url(#${ids.accent})`} opacity={0.8} />
          <Path d="M14.2 16.3c1.1-1.2 2.3-1.4 3.7-.6M22.1 15.7c1.4-.8 2.6-.6 3.7.6" stroke={highlightColor} strokeOpacity={0.75} strokeWidth="1.4" strokeLinecap="round" />
          <Path d="M15.5 21c2.7 2.3 6.3 2.3 9 0" stroke={highlightColor} strokeOpacity={0.78} strokeWidth="1.6" strokeLinecap="round" />
        </G>
      )}

      {name === 'progress' && (
        <G>
          <Ellipse cx="20" cy="33" rx="14" ry="2.7" fill={foregroundColor} opacity={0.14} />
          <Rect x="7" y="8" width="26" height="23" rx="6" fill={`url(#${ids.main})`} />
          <Path d="M12 25V20M18 25v-9M24 25v-6M30 25v-13" stroke={highlightColor} strokeOpacity={0.86} strokeWidth="3" strokeLinecap="round" />
          <Path d="m11 16 5-4 5 2 8-7" stroke={`url(#${ids.accent})`} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="29" cy="7" r="2.2" fill={accentColor} />
          <Path d="M11 11h4" stroke={highlightColor} strokeOpacity={0.62} strokeWidth="1.5" strokeLinecap="round" />
        </G>
      )}

      {name === 'calendar' && (
        <G>
          <Ellipse cx="20" cy="33" rx="13" ry="2.6" fill={foregroundColor} opacity={0.14} />
          <Rect x="7" y="9" width="26" height="23" rx="5.5" fill={`url(#${ids.main})`} />
          <Rect x="7" y="9" width="26" height="7" rx="5.5" fill={`url(#${ids.accent})`} />
          <Path d="M13 6v6M27 6v6" stroke={highlightColor} strokeWidth="2.5" strokeLinecap="round" />
          <Path d="M12 21h3M18.5 21h3M25 21h3M12 26h3M18.5 26h3" stroke={highlightColor} strokeOpacity={0.76} strokeWidth="2" strokeLinecap="round" />
          <Path d="M11 13h18" stroke={foregroundColor} strokeOpacity={0.18} strokeWidth="1.4" />
        </G>
      )}
    </Svg>
  );
}