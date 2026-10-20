import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

/**
 * AccountIcon - Clean arcade traveler icon holding a party beverage.
 * Styled with rounded stroke caps to match TipsyTraveller's retro aesthetic.
 */
export function AccountIcon({ size = 24, color = '#2C3E50' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      {/* Head */}
      <Circle
        cx="11"
        cy="7"
        r="4.2"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Torso & Left Shoulder */}
      <Path
        d="M 3.5 24 C 3.5 17.5 6.5 14.5 11 14.5 C 12.6 14.5 14.1 14.9 15.3 15.6"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Right Arm */}
      <Path
        d="M 23.5 24 C 23.5 19.8 21.8 17 19.5 15.8"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Beer Bottle */}
      <Path
        d="M 16.5 24 V 18.5 C 16.5 17.6 17.1 16.8 17.6 16.2 V 14.2 H 20.4 V 16.2 C 20.9 16.8 21.5 17.6 21.5 18.5 V 24 H 16.5 Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottle label band */}
      <Path
        d="M 16.8 20.8 H 21.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * SettingsIcon - Clean 6-tooth arcade mechanical gear with rounded lobes.
 */
export function SettingsIcon({ size = 24, color = '#2C3E50' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
