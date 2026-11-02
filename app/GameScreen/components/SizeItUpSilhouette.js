import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

const ACCENT = '#FFF1CD';

const Bicycle = ({ color }) => (
  <G fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="23" cy="71" r="18" strokeWidth="6" />
    <Circle cx="77" cy="71" r="18" strokeWidth="6" />
    <Circle cx="23" cy="71" r="13" strokeWidth="1.5" opacity="0.55" />
    <Circle cx="77" cy="71" r="13" strokeWidth="1.5" opacity="0.55" />
    <Path d="M23 55 L23 87 M7 71 L39 71 M12 60 L34 82 M12 82 L34 60" strokeWidth="1.5" opacity="0.45" />
    <Path d="M77 55 L77 87 M61 71 L93 71 M66 60 L88 82 M66 82 L88 60" strokeWidth="1.5" opacity="0.45" />
    <Path d="M17 50 L33 50 L38 44 M21 50 L23 71" strokeWidth="3" />
    <Path d="M23 71 L47 71 L68 42 L38 42 Z M35 33 L47 71 M66 34 L77 71" strokeWidth="5" />
    <Path d="M30 33 L42 33 Q44 33 43 35 L33 35 Z" fill={color} strokeWidth="2" />
    <Path d="M66 34 L72 30 L79 30 Q84 30 84 35 Q84 40 78 40" strokeWidth="4.5" />
    <Circle cx="47" cy="71" r="6" fill={color} stroke={ACCENT} strokeWidth="2" />
    <Circle cx="23" cy="71" r="3.5" fill={color} stroke="none" />
    <Circle cx="77" cy="71" r="3.5" fill={color} stroke="none" />
  </G>
);

const Person = ({ color }) => (
  <G fill={color}>
    <Path d="M40 12 Q50 3 60 12 L65 14 Q50 16 35 14 Z" />
    <Circle cx="50" cy="17" r="9.5" />
    <Rect x="34" y="29" width="32" height="28" rx="8" opacity="0.45" />
    <Path d="M38 29 Q50 26 62 29 Q69 31 71 39 L74 58 Q74 62 69 62 L66 62 L63 41 L61 56 L61 90 L65 92 Q67 95 62 95 L52 95 L51 61 L49 61 L48 95 L38 95 Q33 95 35 92 L39 90 L39 56 L37 41 L34 62 L31 62 Q26 62 26 58 L29 39 Q31 31 38 29 Z" />
    <Path d="M45 29 L50 38 L55 29" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.75" />
    <Rect x="39" y="54" width="22" height="3.5" rx="1.5" fill={ACCENT} opacity="0.65" />
    <Rect x="45" y="42" width="10" height="8" rx="2" fill={ACCENT} opacity="0.55" />
  </G>
);

const Giraffe = ({ color }) => (
  <G fill={color}>
    <Path d="M18 57 Q18 45 36 44 L56 39 L65 11 L74 11 L75 49 Q76 62 64 68 L28 69 Q18 68 18 57 Z" />
    <Path d="M64 13 Q69 4 79 6 L90 11 Q90 17 83 18 L72 19 Z" />
    <Path d="M67 8 L65 1 L69 1 L70 8 Z M74 7 L76 1 L80 2 L77 8 Z" />
    <Path d="M60 11 Q55 10 57 15 L64 15 Z" />
    <Rect x="22" y="64" width="6.5" height="32" rx="3" />
    <Rect x="32" y="65" width="6" height="31" rx="2.8" opacity="0.82" />
    <Rect x="54" y="63" width="6.5" height="33" rx="3" />
    <Rect x="64" y="64" width="6" height="32" rx="2.8" opacity="0.82" />
    <Path d="M19 54 Q9 63 11 79 L7 83 Q11 86 15 80 Q13 66 21 59 Z" />
    <Circle cx="77" cy="11" r="2" fill={ACCENT} opacity="0.85" />
    <Circle cx="46" cy="51" r="5" fill={ACCENT} opacity="0.45" />
    <Circle cx="34" cy="55" r="5.5" fill={ACCENT} opacity="0.45" />
    <Circle cx="58" cy="54" r="4.5" fill={ACCENT} opacity="0.45" />
    <Circle cx="67" cy="38" r="3.5" fill={ACCENT} opacity="0.45" />
    <Circle cx="69" cy="26" r="3" fill={ACCENT} opacity="0.45" />
    <Circle cx="26" cy="61" r="3.5" fill={ACCENT} opacity="0.45" />
  </G>
);

const Elephant = ({ color }) => (
  <G fill={color}>
    <Path d="M14 54 Q14 27 46 26 Q66 26 73 35 Q85 32 89 45 Q91 53 89 64 Q88 79 96 81 Q96 88 87 87 Q79 85 80 69 L76 62 Q70 72 64 72 L64 95 L53 95 L53 74 L46 74 L46 95 L36 95 L36 73 Q29 73 28 73 L28 95 L17 95 L17 65 Q14 60 14 54 Z" />
    <Path d="M15 47 Q5 54 4 69 L9 70 Q10 58 16 53 Z" />
    <Path d="M55 32 Q74 30 74 49 Q74 64 57 62 Q50 52 55 32 Z" fill={ACCENT} opacity="0.28" />
    <Path d="M77 58 Q88 64 95 58 Q89 69 75 64 Z" fill={ACCENT} opacity="0.9" />
    <Circle cx="81" cy="44" r="2.2" fill={ACCENT} opacity="0.85" />
    <Path d="M18 93 L26 93 M37 93 L45 93 M54 93 L62 93" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
  </G>
);

const Dog = ({ color }) => (
  <G fill={color}>
    <Path d="M18 52 Q27 44 52 43 L67 27 Q72 22 80 25 L93 30 Q95 36 91 41 L80 42 L74 56 Q72 68 58 68 L36 63 Q26 63 22 68 Z" />
    <Path d="M68 27 L66 16 L75 24 Z M76 26 L80 17 L83 27 Z" />
    <Rect x="21" y="61" width="7" height="34" rx="3.2" />
    <Rect x="31" y="61" width="6.5" height="34" rx="3" opacity="0.82" />
    <Rect x="58" y="62" width="7" height="33" rx="3.2" />
    <Rect x="67" y="62" width="6.5" height="33" rx="3" opacity="0.82" />
    <Path d="M21 53 Q9 43 5 29 Q11 28 15 38 Q19 46 26 49 Z" />
    <Path d="M63 34 L76 43" stroke={ACCENT} strokeWidth="4" strokeLinecap="round" opacity="0.78" />
    <Circle cx="76" cy="46" r="2.5" fill={ACCENT} opacity="0.85" />
    <Circle cx="80" cy="30" r="2" fill={ACCENT} opacity="0.85" />
  </G>
);

const Ostrich = ({ color }) => (
  <G fill={color}>
    <Path d="M11 52 Q16 36 33 34 Q55 31 65 44 Q71 24 74 11 Q75 4 81 4 Q87 4 87 11 Q87 16 82 18 Q77 29 73 53 Q70 66 54 67 L24 65 Q14 62 11 52 Z" />
    <Path d="M85 9 L95 12 L85 15 Z" />
    <Path d="M11 52 Q17 44 25 46 Q17 55 14 61 Z" opacity="0.8" />
    <Rect x="36" y="63" width="5.5" height="33" rx="2.5" />
    <Rect x="50" y="63" width="5.5" height="33" rx="2.5" />
    <Path d="M34 94 L46 94 L49 98 L32 98 Z M48 94 L60 94 L63 98 L46 98 Z" />
    <Path d="M26 44 Q42 39 56 47 Q43 57 26 54 Z" fill={ACCENT} opacity="0.35" />
    <Circle cx="82" cy="10" r="2" fill={ACCENT} opacity="0.9" />
  </G>
);

const Turtle = ({ color }) => (
  <G fill={color}>
    <Path d="M56 36 Q68 21 82 21 Q77 33 69 42 Z" />
    <Path d="M56 64 Q68 79 82 79 Q77 67 69 58 Z" />
    <Path d="M24 39 Q12 29 4 33 Q10 42 20 46 Z" />
    <Path d="M24 61 Q12 71 4 67 Q10 58 20 54 Z" />
    <Ellipse cx="46" cy="50" rx="31" ry="22" />
    <Path d="M75 43 Q96 42 96 50 Q96 58 75 57 Z" />
    <Path d="M16 47 L8 50 L16 53 Z" />
    <Polygon points="37,43 46,38 55,43 55,57 46,62 37,57" fill={ACCENT} opacity="0.45" />
    <Path d="M46 28 L46 38 M46 62 L46 72 M25 38 L37 43 M55 43 L67 38 M25 62 L37 57 M55 57 L67 62" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    <Circle cx="88" cy="47" r="2" fill={ACCENT} opacity="0.85" />
  </G>
);

const RoadVehicle = ({ color }) => (
  <G fill={color}>
    <Rect x="22" y="26" width="44" height="6" rx="3" />
    <Path d="M6 64 L11 42 Q14 31 25 31 L69 31 Q79 31 85 44 L94 56 L94 75 L6 75 Z" />
    <Path d="M16 37 L13 53 L33 53 L33 37 Z M38 37 L38 53 L58 53 L58 37 Z M63 37 L63 53 L83 53 L75 37 Z" fill={ACCENT} opacity="0.78" />
    <Rect x="89" y="59" width="5" height="6" rx="1.5" fill={ACCENT} opacity="0.85" />
    <Rect x="6" y="58" width="4" height="8" rx="1.5" fill={ACCENT} opacity="0.65" />
    <Line x1="36" y1="57" x2="59" y2="57" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" opacity="0.55" />
    <Circle cx="26" cy="76" r="12" />
    <Circle cx="75" cy="76" r="12" />
    <Circle cx="26" cy="76" r="5.5" fill={ACCENT} opacity="0.7" />
    <Circle cx="75" cy="76" r="5.5" fill={ACCENT} opacity="0.7" />
  </G>
);

const Bus = ({ color }) => (
  <G fill={color}>
    <Rect x="24" y="22" width="32" height="5" rx="2.5" />
    <Rect x="4" y="26" width="92" height="52" rx="8" />
    <Rect x="72" y="29" width="18" height="4" rx="1.5" fill={ACCENT} opacity="0.85" />
    <Rect x="10" y="35" width="15" height="18" rx="2.5" fill={ACCENT} opacity="0.78" />
    <Rect x="28" y="35" width="15" height="18" rx="2.5" fill={ACCENT} opacity="0.78" />
    <Rect x="46" y="35" width="15" height="18" rx="2.5" fill={ACCENT} opacity="0.78" />
    <Rect x="64" y="35" width="13" height="18" rx="2.5" fill={ACCENT} opacity="0.78" />
    <Rect x="80" y="35" width="11" height="34" rx="2.5" fill={ACCENT} opacity="0.78" />
    <Line x1="85.5" y1="35" x2="85.5" y2="69" stroke={color} strokeWidth="2.2" />
    <Rect x="91" y="61" width="5" height="6" rx="1.5" fill={ACCENT} opacity="0.85" />
    <Circle cx="24" cy="78" r="11" />
    <Circle cx="73" cy="78" r="11" />
    <Circle cx="24" cy="78" r="5" fill={ACCENT} opacity="0.7" />
    <Circle cx="73" cy="78" r="5" fill={ACCENT} opacity="0.7" />
  </G>
);

const Whale = ({ color }) => (
  <G fill={color}>
    <Path d="M16 51 Q28 33 58 33 Q84 33 97 45 Q97 57 82 63 Q64 71 42 66 Q26 62 16 55 Z" />
    <Path d="M19 52 L5 23 Q15 30 22 47 L19 55 Q12 64 3 57 Q10 49 19 52 Z" />
    <Path d="M27 38 Q30 28 36 28 Q34 35 35 38 Z" />
    <Path d="M60 56 Q67 74 55 78 Q50 69 52 57 Z" />
    <Path d="M63 53 Q80 55 94 49 M65 58 Q79 60 90 54 M68 63 Q78 64 85 59" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" opacity="0.65" />
    <Circle cx="83" cy="46" r="2" fill={ACCENT} opacity="0.85" />
  </G>
);

const TukTuk = ({ color }) => (
  <G fill={color}>
    <Path d="M12 32 Q14 26 24 26 L64 26 Q72 26 76 34 L12 34 Z" />
    <Path d="M8 68 L13 32 L75 32 L85 54 L94 60 L94 74 L8 74 Z" />
    <Path d="M16 37 L38 37 L38 56 L14 56 Z" fill={ACCENT} opacity="0.72" />
    <Path d="M43 37 L69 37 L76 54 L43 54 Z" fill={ACCENT} opacity="0.78" />
    <Path d="M60 49 L68 42" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
    <Path d="M14 61 L28 61 M14 65 L28 65" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <Rect x="89" y="56" width="5" height="5" rx="1.5" fill={ACCENT} opacity="0.85" />
    <Circle cx="25" cy="75" r="11" />
    <Circle cx="80" cy="75" r="11" />
    <Circle cx="25" cy="75" r="4.5" fill={ACCENT} opacity="0.7" />
    <Circle cx="80" cy="75" r="4.5" fill={ACCENT} opacity="0.7" />
  </G>
);

const Airliner = ({ color }) => (
  <G fill={color}>
    <Path d="M3 50 L15 45 L42 44 L29 8 L38 8 L61 44 L86 44 Q98 44 98 50 Q98 56 86 56 L61 56 L38 92 L29 92 L42 56 L15 55 Z" />
    <Path d="M15 46 L6 27 L14 27 L25 46 Z M15 54 L6 73 L14 73 L25 54 Z" />
    <Rect x="54" y="25" width="13" height="6" rx="3" />
    <Rect x="54" y="69" width="13" height="6" rx="3" />
    <Path d="M89 47 Q94 47 95 50 Q94 53 89 53 Z" fill={ACCENT} opacity="0.8" />
    <Line x1="36" y1="50" x2="82" y2="50" stroke={ACCENT} strokeWidth="2.4" strokeDasharray="2 3.5" strokeLinecap="round" opacity="0.75" />
  </G>
);

const Luggage = ({ color }) => (
  <G fill={color}>
    <Path d="M39 24 L39 7 Q39 5 42 5 L58 5 Q61 5 61 7 L61 24" fill="none" stroke={color} strokeWidth="4.5" />
    <Rect x="36" y="3" width="28" height="5" rx="2.5" />
    <Rect x="22" y="23" width="56" height="67" rx="10" />
    <Path d="M22 35 Q22 23 34 23 M66 23 Q78 23 78 35 M22 78 Q22 90 34 90 M66 90 Q78 90 78 78" fill="none" stroke={ACCENT} strokeWidth="2.5" opacity="0.45" />
    <Line x1="36" y1="31" x2="36" y2="82" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    <Line x1="50" y1="31" x2="50" y2="82" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    <Line x1="64" y1="31" x2="64" y2="82" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
    <Circle cx="31" cy="94" r="4" />
    <Circle cx="69" cy="94" r="4" />
  </G>
);

const Guitar = ({ color }) => (
  <G fill={color}>
    <Rect x="45" y="4" width="10" height="14" rx="2.5" />
    <Path d="M41 7 L45 7 M41 11 L45 11 M41 15 L45 15 M55 7 L59 7 M55 11 L59 11 M55 15 L59 15" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    <Rect x="46.5" y="17" width="7" height="28" />
    <Path d="M50 39 Q67 39 66 52 Q65 59 60 62 Q76 67 76 81 Q76 97 50 97 Q24 97 24 81 Q24 67 40 62 Q35 59 34 52 Q33 39 50 39 Z" />
    <Circle cx="50" cy="60" r="9.5" fill={ACCENT} opacity="0.35" />
    <Circle cx="50" cy="60" r="7" fill={ACCENT} opacity="0.8" />
    <Path d="M56 58 Q64 61 62 71 Q57 71 55 65 Z" fill={ACCENT} opacity="0.45" />
    <Rect x="41" y="78" width="18" height="4.5" rx="1.5" fill={ACCENT} opacity="0.8" />
    <Line x1="48.5" y1="18" x2="48.5" y2="78" stroke={ACCENT} strokeWidth="1.2" opacity="0.6" />
    <Line x1="51.5" y1="18" x2="51.5" y2="78" stroke={ACCENT} strokeWidth="1.2" opacity="0.6" />
  </G>
);

const Bottle = ({ color }) => (
  <G fill={color}>
    <Rect x="42" y="5" width="16" height="5" rx="1.5" />
    <Path d="M43 10 L57 10 L58 29 Q72 39 72 54 L72 91 Q72 95 68 95 L32 95 Q28 95 28 91 L28 54 Q28 39 42 29 Z" />
    <Line x1="43" y1="17" x2="57" y2="17" stroke={ACCENT} strokeWidth="2" opacity="0.75" />
    <Rect x="34" y="54" width="32" height="24" rx="2.5" fill={ACCENT} opacity="0.78" />
    <Line x1="39" y1="62" x2="61" y2="62" stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
    <Line x1="42" y1="68" x2="58" y2="68" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
    <Path d="M33 43 Q33 37 40 33" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
    <Path d="M40 95 Q50 87 60 95 Z" fill={ACCENT} opacity="0.35" />
  </G>
);

const BowlingPin = ({ color }) => (
  <G fill={color}>
    <Path d="M50 3 Q61 3 61 14 Q61 22 57 31 Q55 37 59 44 Q74 62 74 79 Q74 92 64 97 L36 97 Q26 92 26 79 Q26 62 41 44 Q45 37 43 31 Q39 22 39 14 Q39 3 50 3 Z" />
    <Path d="M42 27 Q50 30 58 27 L57 32 Q50 35 43 32 Z" fill={ACCENT} opacity="0.82" />
    <Path d="M42 36 Q50 39 58 36 L60 41 Q50 44 40 41 Z" fill={ACCENT} opacity="0.82" />
    <Path d="M36 56 Q32 70 36 84" fill="none" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
  </G>
);

const Umbrella = ({ color }) => (
  <G fill={color}>
    <Rect x="48" y="8" width="4" height="7" rx="2" />
    <Path d="M6 45 Q14 13 50 13 Q86 13 94 45 Q83 37 72 45 Q61 37 50 45 Q39 37 28 45 Q17 37 6 45 Z" />
    <Path d="M50 13 Q35 24 28 45 Q39 37 50 45 Z M50 13 Q65 24 72 45 Q83 37 94 45 Q86 13 50 13 Z" fill={ACCENT} opacity="0.38" />
    <Rect x="47.5" y="41" width="5" height="48" />
    <Rect x="46" y="62" width="8" height="5" rx="1.5" />
    <Path d="M50 88 L50 92 Q50 95 55 95 Q60 95 60 90" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
  </G>
);

const Palm = ({ color }) => (
  <G fill={color}>
    <Path d="M42 97 Q45 64 49 27 L57 27 Q55 64 62 97 Z" />
    <Path d="M47 42 L56 44 M46 54 L56 56 M45 66 L57 68 M44 78 L59 80" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
    <Path d="M52 26 Q24 5 4 24 Q20 20 34 26 Q43 24 51 30 Z" />
    <Path d="M54 26 Q80 5 96 24 Q82 20 68 26 Q59 24 55 30 Z" />
    <Path d="M52 24 Q32 1 16 8 Q34 11 51 27 Z" />
    <Path d="M54 24 Q72 1 88 8 Q70 11 55 27 Z" />
    <Path d="M51 28 Q22 22 9 39 Q29 31 50 33 Z" />
    <Path d="M55 28 Q82 22 93 39 Q75 31 56 33 Z" />
    <Circle cx="46" cy="31" r="3.5" fill={ACCENT} opacity="0.7" />
    <Circle cx="59" cy="31" r="3.5" fill={ACCENT} opacity="0.7" />
  </G>
);

const Backpack = ({ color }) => (
  <G fill={color}>
    <Path d="M41 18 Q41 6 50 6 Q59 6 59 18" fill="none" stroke={color} strokeWidth="5.5" strokeLinecap="round" />
    <Path d="M23 36 Q11 43 15 74 Q17 83 24 81 M77 36 Q89 43 85 74 Q83 83 76 81" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
    <Rect x="22" y="16" width="56" height="78" rx="18" />
    <Rect x="17" y="56" width="6" height="24" rx="3" />
    <Rect x="77" y="56" width="6" height="24" rx="3" />
    <Path d="M24 38 Q50 45 76 38" fill="none" stroke={ACCENT} strokeWidth="2.5" opacity="0.6" />
    <Rect x="30" y="52" width="40" height="30" rx="8" fill={ACCENT} opacity="0.32" />
    <Line x1="35" y1="61" x2="65" y2="61" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
    <Rect x="36" y="34" width="5" height="11" rx="1.5" fill={ACCENT} opacity="0.75" />
    <Rect x="59" y="34" width="5" height="11" rx="1.5" fill={ACCENT} opacity="0.75" />
  </G>
);

const Kayak = ({ color }) => (
  <G fill={color}>
    <Path d="M2 58 Q26 40 50 40 Q74 40 98 58 Q74 76 50 76 Q26 76 2 58 Z" />
    <Ellipse cx="50" cy="58" rx="15" ry="8" fill={ACCENT} opacity="0.78" />
    <Ellipse cx="50" cy="58" rx="9" ry="5" fill={color} opacity="0.45" />
    <Ellipse cx="23" cy="58" rx="5" ry="3.5" fill={ACCENT} opacity="0.5" />
    <Ellipse cx="77" cy="58" rx="5" ry="3.5" fill={ACCENT} opacity="0.5" />
    <Line x1="20" y1="22" x2="80" y2="90" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
    <Path d="M12 16 L23 19 L27 30 L16 27 Z M73 82 L84 85 L88 96 L77 93 Z" />
  </G>
);

const Eiffel = ({ color }) => (
  <G fill={color}>
    <Rect x="48.5" y="2" width="3" height="12" />
    <Rect x="44" y="13" width="12" height="5" rx="2" />
    <Path d="M45 18 L55 18 L61 50 L68 71 L89 96 L71 96 L64 81 Q50 68 36 81 L29 96 L11 96 L32 71 L39 50 Z" />
    <Rect x="35" y="48" width="30" height="4.5" rx="1.5" />
    <Rect x="27" y="69" width="46" height="5" rx="1.5" />
    <Polygon points="48,24 52,24 54,45 46,45" fill={ACCENT} opacity="0.55" />
    <Polygon points="44,54 56,54 59,67 41,67" fill={ACCENT} opacity="0.65" />
    <Line x1="35" y1="50" x2="65" y2="50" stroke={ACCENT} strokeWidth="1.6" opacity="0.7" />
    <Line x1="27" y1="71.5" x2="73" y2="71.5" stroke={ACCENT} strokeWidth="1.8" opacity="0.7" />
  </G>
);

const Tower = ({ color }) => (
  <G fill={color}>
    <Rect x="53" y="4" width="2.5" height="6" />
    <Path d="M43 9 L64 11 L63 20 L42 18 Z" />
    <Path d="M37 18 L69 21 L62 93 L30 90 Z" />
    <Rect x="24" y="90" width="46" height="6" rx="1.5" />
    {[22, 33, 44, 55, 66, 77].map((y, index) => {
      const offset = index * 0.9;
      return (
        <G key={y}>
          <Line
            x1={35 - offset}
            y1={y}
            x2={70 - offset}
            y2={y + 3}
            stroke={ color }
            strokeWidth="3"
          />
          {[-9, -3, 3, 9].map((dx) => (
            <Rect
              key={dx}
              x={51 + dx - offset}
              y={y + 3 + (dx * 0.08)}
              width="3.5"
              height="6.5"
              rx="1.7"
              fill={ACCENT}
              opacity="0.75"
            />
          ))}
        </G>
      );
    })}
  </G>
);

const ClockTower = ({ color }) => (
  <G fill={color}>
    <Path d="M49 2 L51 2 L53 11 L61 22 L66 29 L34 29 L39 22 L47 11 Z" />
    <Path d="M29 24 L31 29 L27 29 Z M71 24 L73 29 L69 29 Z" />
    <Rect x="28" y="29" width="44" height="23" rx="2" />
    <Rect x="32" y="52" width="36" height="39" />
    <Rect x="26" y="90" width="48" height="6" rx="1.5" />
    <Circle cx="50" cy="40.5" r="9" fill={ACCENT} opacity="0.85" />
    <Path d="M50 40.5 L50 35 M50 40.5 L55 42" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    {[38, 44, 50, 56, 62].map((x) => (
      <Rect key={x} x={x - 1.2} y="56" width="2.4" height="30" rx="1" fill={ACCENT} opacity="0.45" />
    ))}
  </G>
);

const Statue = ({ color }) => (
  <G fill={color}>
    <Path d="M21 1 Q27 5 25 10 Q21 13 18 9 Q16 5 21 1 Z" />
    <Rect x="16" y="10" width="10" height="3" rx="1" />
    <Path d="M19 13 L24 13 L39 34 L33 38 Z" />
    <Path d="M46 16 L40 8 L48 13 L51 5 L54 13 L61 8 L56 16 L64 14 L58 20" />
    <Circle cx="51" cy="21" r="7.5" />
    <Path d="M36 32 Q50 28 61 34 L66 50 L61 54 L63 82 L37 82 L39 45 Z" />
    <Path d="M55 39 L67 36 L70 50 L58 53 Z" fill={ACCENT} opacity="0.6" />
    <Path d="M43 42 L56 60 M42 55 L58 73" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />
    <Rect x="33" y="82" width="34" height="7" rx="1" />
    <Rect x="29" y="89" width="42" height="7" rx="1.5" />
    <Rect x="46" y="84" width="8" height="9" rx="4" fill={ACCENT} opacity="0.55" />
  </G>
);

const Atomium = ({ color }) => (
  <G fill={color} stroke={color}>
    <Line x1="50" y1="15" x2="50" y2="92" strokeWidth="5.5" />
    <Line x1="18" y1="33" x2="82" y2="69" strokeWidth="5" />
    <Line x1="82" y1="33" x2="18" y2="69" strokeWidth="5" />
    <Polygon points="50,15 82,33 82,69 50,86 18,69 18,33" fill="none" strokeWidth="4.5" />
    <Path d="M34 96 L43 86 L57 86 L66 96 Z" stroke="none" />
    {[
      [50, 15],
      [82, 33],
      [82, 69],
      [50, 85],
      [18, 69],
      [18, 33],
      [50, 51],
    ].map(([cx, cy]) => (
      <G key={`${cx}-${cy}`} stroke="none">
        <Circle cx={cx} cy={cy} r="11" />
        <Circle cx={cx - 3} cy={cy - 3} r="3.5" fill={ACCENT} opacity="0.65" />
      </G>
    ))}
  </G>
);

const Wheel = ({ color }) => (
  <G fill="none" stroke={color}>
    <Circle cx="50" cy="44" r="35" strokeWidth="4.5" />
    <Circle cx="50" cy="44" r="29" strokeWidth="2" opacity="0.65" />
    {[0, 30, 60, 90, 120, 150].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const dx = Math.cos(rad) * 35;
      const dy = Math.sin(rad) * 35;
      return (
        <Line
          key={deg}
          x1={50 - dx}
          y1={44 - dy}
          x2={50 + dx}
          y2={44 + dy}
          strokeWidth="2"
          opacity="0.7"
        />
      );
    })}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const cx = 50 + Math.cos(rad) * 38;
      const cy = 44 + Math.sin(rad) * 38;
      return <Circle key={deg} cx={cx} cy={cy} r="3.5" fill={color} stroke="none" />;
    })}
    <Circle cx="50" cy="44" r="6.5" fill={color} stroke="none" />
    <Circle cx="50" cy="44" r="2.5" fill={ACCENT} stroke="none" opacity="0.85" />
    <Path d="M50 44 L26 95 M50 44 L74 95 M16 95 L84 95" strokeWidth="5" strokeLinecap="round" />
  </G>
);

const Arch = ({ color }) => (
  <G fill={color}>
    <Rect x="14" y="8" width="72" height="11" rx="1.5" />
    <Rect x="8" y="19" width="84" height="6" rx="1.5" />
    <Path
      fillRule="evenodd"
      d="M11 25 L89 25 L89 94 L65 94 L65 58 Q65 40 50 40 Q35 40 35 58 L35 94 L11 94 Z"
    />
    <Rect x="8" y="89" width="29" height="5" rx="1" />
    <Rect x="63" y="89" width="29" height="5" rx="1" />
    <Rect x="20" y="11.5" width="60" height="4" rx="1" fill={ACCENT} opacity="0.55" />
    <Line x1="11" y1="34" x2="89" y2="34" stroke={ACCENT} strokeWidth="2.5" opacity="0.65" />
    <Rect x="17" y="48" width="12" height="22" rx="3" fill={ACCENT} opacity="0.55" />
    <Rect x="71" y="48" width="12" height="22" rx="3" fill={ACCENT} opacity="0.55" />
  </G>
);

const Colosseum = ({ color }) => (
  <G fill={color}>
    <Path d="M6 27 Q38 13 68 18 L68 34 L84 36 L84 52 L94 55 L92 94 L8 94 Z" />
    <Rect x="6" y="89" width="88" height="5" rx="1.5" />
    <Line x1="7" y1="35" x2="68" y2="35" stroke={ACCENT} strokeWidth="2" opacity="0.65" />
    <Line x1="7" y1="53" x2="84" y2="53" stroke={ACCENT} strokeWidth="2" opacity="0.65" />
    <Line x1="8" y1="71" x2="93" y2="71" stroke={ACCENT} strokeWidth="2" opacity="0.65" />
    {[16, 28, 40, 52, 62].map((x) => (
      <Rect key={`top-${x}`} x={x - 2} y="23" width="4" height="7" rx="1" fill={ACCENT} opacity="0.65" />
    ))}
    {[15, 27, 39, 51, 63, 75].map((x) => (
      <Rect key={`mid-${x}`} x={x - 3.5} y="39" width="7" height="11" rx="3.5" fill={ACCENT} opacity="0.75" />
    ))}
    {[15, 27, 39, 51, 63, 75, 86].map((x) => (
      <Rect key={`low-${x}`} x={x - 3.5} y="57" width="7" height="11" rx="3.5" fill={ACCENT} opacity="0.75" />
    ))}
    {[15, 27, 39, 51, 63, 75, 86].map((x) => (
      <Rect key={`base-${x}`} x={x - 3.5} y="75" width="7" height="12" rx="3.5" fill={ACCENT} opacity="0.75" />
    ))}
  </G>
);

const renderSilhouette = (name, color) => {
  switch (name) {
    case 'person': return <Person color={color} />;
    case 'giraffe': return <Giraffe color={color} />;
    case 'elephant': return <Elephant color={color} />;
    case 'dog': return <Dog color={color} />;
    case 'ostrich': return <Ostrich color={color} />;
    case 'turtle': return <Turtle color={color} />;
    case 'bicycle': return <Bicycle color={color} />;
    case 'road-vehicle': return <RoadVehicle color={color} />;
    case 'bus': return <Bus color={color} />;
    case 'whale': return <Whale color={color} />;
    case 'tuk-tuk': return <TukTuk color={color} />;
    case 'airliner': return <Airliner color={color} />;
    case 'luggage': return <Luggage color={color} />;
    case 'guitar': return <Guitar color={color} />;
    case 'bottle': return <Bottle color={color} />;
    case 'bowling-pin': return <BowlingPin color={color} />;
    case 'umbrella': return <Umbrella color={color} />;
    case 'palm': return <Palm color={color} />;
    case 'backpack': return <Backpack color={color} />;
    case 'kayak': return <Kayak color={color} />;
    case 'statue': return <Statue color={color} />;
    case 'eiffel': return <Eiffel color={color} />;
    case 'tower': return <Tower color={color} />;
    case 'clock-tower': return <ClockTower color={color} />;
    case 'atomium': return <Atomium color={color} />;
    case 'wheel': return <Wheel color={color} />;
    case 'arch': return <Arch color={color} />;
    case 'colosseum': return <Colosseum color={color} />;
    default: return <RoadVehicle color={color} />;
  }
};

const SILHOUETTE_BOUNDS = {
  person: { minX: 26, minY: 4, width: 48, height: 91 },
  giraffe: { minX: 7, minY: 1, width: 83, height: 95 },
  elephant: { minX: 4, minY: 26, width: 92, height: 69 },
  dog: { minX: 5, minY: 16, width: 89, height: 79 },
  ostrich: { minX: 11, minY: 4, width: 84, height: 94 },
  turtle: { minX: 4, minY: 21, width: 92, height: 58 },
  bicycle: { minX: 2, minY: 27.5, width: 96, height: 64.5 },
  'road-vehicle': { minX: 6, minY: 26, width: 88, height: 62 },
  bus: { minX: 4, minY: 22, width: 92, height: 67 },
  whale: { minX: 3, minY: 23, width: 94, height: 55 },
  'tuk-tuk': { minX: 8, minY: 26, width: 86, height: 60 },
  airliner: { minX: 3, minY: 8, width: 95, height: 84 },
  luggage: { minX: 22, minY: 3, width: 56, height: 95 },
  guitar: { minX: 24, minY: 4, width: 52, height: 93 },
  bottle: { minX: 28, minY: 5, width: 44, height: 90 },
  'bowling-pin': { minX: 26, minY: 3, width: 48, height: 94 },
  umbrella: { minX: 6, minY: 8, width: 88, height: 89.5 },
  palm: { minX: 4, minY: 3, width: 92, height: 94 },
  backpack: { minX: 11, minY: 3, width: 78, height: 91 },
  kayak: { minX: 2, minY: 16, width: 96, height: 80 },
  statue: { minX: 16, minY: 1, width: 54, height: 95 },
  eiffel: { minX: 11, minY: 2, width: 78, height: 94 },
  tower: { minX: 24, minY: 4, width: 52, height: 92 },
  'clock-tower': { minX: 26, minY: 2, width: 48, height: 94 },
  atomium: { minX: 7, minY: 4, width: 86, height: 92 },
  wheel: { minX: 8.5, minY: 2.5, width: 83, height: 95 },
  arch: { minX: 8, minY: 8, width: 84, height: 86 },
  colosseum: { minX: 6, minY: 16, width: 88, height: 78 },
};


export const getSilhouetteAspectRatio = (silhouette) => {
  const bounds = SILHOUETTE_BOUNDS[silhouette] || SILHOUETTE_BOUNDS['road-vehicle'];
  return bounds.width / bounds.height;
};

export const getSilhouetteDimensions = ({ axis = 'height', silhouette, size }) => {
  const bounds = SILHOUETTE_BOUNDS[silhouette] || SILHOUETTE_BOUNDS['road-vehicle'];
  const aspect = bounds.width / bounds.height;
  const safeSize = Math.max(6, Number(size) || 6);
  const width = axis === 'length' ? safeSize : Math.max(4, safeSize * aspect);
  const height = axis === 'length' ? Math.max(4, safeSize / aspect) : safeSize;

  return {
    aspect,
    bounds,
    height,
    viewBox: `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`,
    width,
  };
};

export default function SizeItUpSilhouette({ axis = 'height', color, label, silhouette, size }) {
  const { height, viewBox, width } = getSilhouetteDimensions({ axis, silhouette, size });

  return (
    <Svg
      accessibilityLabel={`${label} silhouette`}
      height={height}
      preserveAspectRatio="none"
      viewBox={viewBox}
      width={width}
    >
      {renderSilhouette(silhouette, color)}
    </Svg>
  );
}
