import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

const Bicycle = ({ color }) => (
  <G fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="24" cy="70" r="19" />
    <Circle cx="77" cy="70" r="19" />
    <Path d="M24 70 L42 42 L58 70 L36 70 L49 55 L77 70 M42 42 L62 42 M63 42 L77 70 M39 37 L50 37" />
  </G>
);

const Person = ({ color }) => (
  <G fill={color}>
    <Circle cx="50" cy="16" r="11" />
    <Path d="M38 31 Q50 25 62 31 L67 60 L59 62 L57 43 L57 94 L46 94 L45 62 L42 94 L31 94 L40 42 L35 62 L27 59 Z" />
  </G>
);

const Giraffe = ({ color }) => (
  <G fill={color}>
    <Ellipse cx="42" cy="59" rx="27" ry="18" />
    <Path d="M57 59 L62 14 L74 13 L75 62 Z M62 17 Q69 2 84 9 L82 21 L69 23 Z M67 9 L64 1 L70 1 L72 10 M78 10 L82 2 L87 4 L83 13" />
    <Rect x="23" y="69" width="8" height="27" rx="3" />
    <Rect x="48" y="69" width="8" height="27" rx="3" />
    <Path d="M17 58 Q5 68 9 78 L14 76 Q11 69 22 65 Z" />
  </G>
);

const Elephant = ({ color }) => (
  <G fill={color}>
    <Ellipse cx="47" cy="55" rx="34" ry="25" />
    <Circle cx="75" cy="49" r="20" />
    <Circle cx="68" cy="47" r="15" opacity="0.5" />
    <Path d="M84 55 Q99 62 88 86 L80 84 Q90 68 77 62 Z" />
    <Rect x="20" y="68" width="11" height="27" rx="3" />
    <Rect x="54" y="68" width="11" height="27" rx="3" />
    <Path d="M15 49 Q3 52 7 69 L12 68 Q9 58 18 57 Z" />
  </G>
);

const Dog = ({ color }) => (
  <G fill={color}>
    <Ellipse cx="46" cy="59" rx="31" ry="19" />
    <Circle cx="76" cy="47" r="16" />
    <Path d="M68 34 L67 17 L79 31 M83 35 L94 25 L91 45" />
    <Rect x="25" y="69" width="8" height="25" rx="3" />
    <Rect x="59" y="69" width="8" height="25" rx="3" />
    <Path d="M17 54 Q4 43 6 33 Q14 42 25 50 Z" />
  </G>
);

const Ostrich = ({ color }) => (
  <G fill={color}>
    <Ellipse cx="42" cy="48" rx="28" ry="21" />
    <Path d="M60 48 Q66 18 76 13 L82 18 Q72 25 69 57 Z" />
    <Circle cx="79" cy="13" r="8" />
    <Path d="M82 10 L96 14 L83 18 Z" />
    <Rect x="34" y="64" width="6" height="31" rx="2" />
    <Rect x="52" y="64" width="6" height="31" rx="2" />
    <Path d="M37 94 L25 98 L40 99 M55 94 L68 98 L53 99" />
  </G>
);

const Turtle = ({ color }) => (
  <G fill={color}>
    <Ellipse cx="48" cy="54" rx="34" ry="23" />
    <Circle cx="84" cy="52" r="11" />
    <Path d="M21 39 L5 25 L31 33 M21 68 L5 82 L32 72 M68 38 L83 25 L64 43 M69 69 L84 82 L63 67" />
  </G>
);

const RoadVehicle = ({ color }) => (
  <G fill={color}>
    <Path d="M8 64 L15 41 Q18 32 29 32 L69 32 Q79 32 85 44 L94 58 L94 75 L7 75 Z" />
    <Path d="M26 38 L21 55 L48 55 L48 38 Z M54 38 L54 55 L81 55 L72 38 Z" fill="#FFF1CD" opacity="0.72" />
    <Circle cx="27" cy="76" r="12" />
    <Circle cx="76" cy="76" r="12" />
  </G>
);

const Bus = ({ color }) => (
  <G fill={color}>
    <Rect x="5" y="25" width="90" height="52" rx="9" />
    <Rect x="13" y="33" width="69" height="19" rx="3" fill="#FFF1CD" opacity="0.72" />
    <Line x1="35" y1="33" x2="35" y2="52" stroke={color} strokeWidth="4" />
    <Line x1="59" y1="33" x2="59" y2="52" stroke={color} strokeWidth="4" />
    <Circle cx="26" cy="78" r="11" />
    <Circle cx="76" cy="78" r="11" />
  </G>
);

const Whale = ({ color }) => (
  <G fill={color}>
    <Path d="M8 56 Q23 26 63 36 Q82 39 94 26 Q91 45 78 55 Q67 75 38 72 Q18 70 8 56 Z" />
    <Path d="M72 51 Q83 70 94 69 Q84 80 68 65 Z M16 51 Q8 42 4 31 Q17 36 24 45 Z" />
  </G>
);

const TukTuk = ({ color }) => (
  <G fill={color}>
    <Path d="M10 68 L17 39 Q19 31 29 31 L61 31 Q70 34 76 51 L89 57 L93 72 L9 72 Z" />
    <Path d="M28 38 L24 53 L57 53 L55 38 Z" fill="#FFF1CD" opacity="0.72" />
    <Circle cx="28" cy="75" r="11" />
    <Circle cx="78" cy="75" r="11" />
  </G>
);

const Airliner = ({ color }) => (
  <Path
    fill={color}
    d="M4 54 L39 48 L63 12 L74 10 L62 46 L91 42 Q98 43 98 50 Q98 56 91 57 L62 56 L76 87 L66 89 L42 58 L7 63 Z"
  />
);

const Luggage = ({ color }) => (
  <G fill={color}>
    <Rect x="24" y="24" width="52" height="67" rx="9" />
    <Path d="M40 25 L40 12 Q40 7 46 7 L55 7 Q61 7 61 12 L61 25" fill="none" stroke={color} strokeWidth="7" />
    <Circle cx="35" cy="93" r="5" />
    <Circle cx="65" cy="93" r="5" />
  </G>
);

const Guitar = ({ color }) => (
  <G fill={color}>
    <Path d="M42 93 Q18 84 29 62 Q36 50 43 43 Q47 36 43 27 Q38 14 50 7 Q62 14 57 27 Q53 36 58 43 Q66 50 72 62 Q83 84 58 93 Q50 98 42 93 Z" />
    <Circle cx="50" cy="65" r="8" fill="#FFF1CD" opacity="0.75" />
  </G>
);

const Bottle = ({ color }) => (
  <Path fill={color} d="M40 7 L60 7 L61 30 Q72 41 72 55 L72 94 L28 94 L28 55 Q28 41 39 30 Z" />
);

const BowlingPin = ({ color }) => (
  <Path fill={color} d="M43 5 Q50 1 57 5 Q65 17 57 34 Q78 57 69 91 Q50 99 31 91 Q22 57 43 34 Q35 17 43 5 Z" />
);

const Umbrella = ({ color }) => (
  <G fill={color}>
    <Path d="M7 44 Q18 12 50 12 Q82 12 93 44 Q79 35 65 44 Q50 34 35 44 Q21 35 7 44 Z" />
    <Rect x="47" y="40" width="6" height="52" />
    <Path d="M50 91 Q50 99 59 96" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
  </G>
);

const Palm = ({ color }) => (
  <G fill={color}>
    <Path d="M45 96 Q40 55 49 22 L58 23 Q54 60 61 96 Z" />
    <Path d="M51 25 Q20 4 4 24 Q28 17 50 31 M53 25 Q79 3 96 23 Q73 17 54 31 M51 27 Q36 2 25 3 Q42 13 54 34 M54 28 Q66 1 77 4 Q62 15 52 35" />
  </G>
);

const Backpack = ({ color }) => (
  <G fill={color}>
    <Rect x="24" y="22" width="52" height="70" rx="19" />
    <Path d="M37 27 Q36 7 50 7 Q64 7 63 27 M24 43 Q10 49 17 72 M76 43 Q90 49 83 72" fill="none" stroke={color} strokeWidth="7" />
    <Rect x="32" y="59" width="36" height="25" rx="8" fill="#FFF1CD" opacity="0.25" />
  </G>
);

const Kayak = ({ color }) => (
  <G fill={color}>
    <Path d="M3 59 Q50 35 97 59 Q72 78 28 78 Q11 74 3 59 Z" />
    <Ellipse cx="50" cy="58" rx="14" ry="8" fill="#FFF1CD" opacity="0.65" />
    <Path d="M20 27 L80 88 M16 20 L27 31 M73 83 L84 94" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
  </G>
);

const Eiffel = ({ color }) => (
  <Path fill={color} d="M47 4 L54 4 L59 31 L89 95 L68 95 L59 73 L41 73 L32 95 L11 95 L42 31 Z M45 57 L55 57 L50 40 Z" fillRule="evenodd" />
);

const Tower = ({ color, clock = false }) => (
  <G fill={color}>
    <Path d="M33 96 L37 23 L44 15 L47 4 L53 4 L56 15 L63 23 L67 96 Z" />
    {clock ? <Circle cx="50" cy="33" r="9" fill="#FFF1CD" opacity="0.75" /> : null}
    <Rect x="28" y="89" width="44" height="7" />
  </G>
);

const Statue = ({ color }) => (
  <G fill={color}>
    <Path d="M34 95 L41 48 L39 29 L48 24 L57 31 L60 51 L68 95 Z" />
    <Circle cx="50" cy="18" r="9" />
    <Path d="M44 12 L40 4 L47 9 L50 1 L53 9 L60 4 L57 13 M41 37 L22 16 L28 12 L49 31 M22 16 L17 6 L26 10 Z" />
  </G>
);

const Atomium = ({ color }) => (
  <G fill={color} stroke={color} strokeWidth="6">
    <Line x1="22" y1="76" x2="50" y2="21" />
    <Line x1="50" y1="21" x2="79" y2="76" />
    <Line x1="22" y1="76" x2="79" y2="76" />
    <Line x1="22" y1="76" x2="78" y2="45" />
    <Line x1="79" y1="76" x2="23" y2="45" />
    {[['50','18'],['22','78'],['80','78'],['21','43'],['79','43'],['50','61']].map(([cx, cy]) => (
      <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="11" />
    ))}
  </G>
);

const Wheel = ({ color }) => (
  <G fill="none" stroke={color} strokeWidth="5">
    <Circle cx="50" cy="45" r="39" />
    <Circle cx="50" cy="45" r="5" fill={color} />
    <Line x1="50" y1="6" x2="50" y2="84" />
    <Line x1="11" y1="45" x2="89" y2="45" />
    <Line x1="22" y1="17" x2="78" y2="73" />
    <Line x1="78" y1="17" x2="22" y2="73" />
    <Path d="M37 82 L27 97 M63 82 L73 97 M20 97 L80 97" />
  </G>
);

const Arch = ({ color }) => (
  <Path fill={color} fillRule="evenodd" d="M12 94 L12 25 L88 25 L88 94 Z M34 94 L34 61 Q34 40 50 40 Q66 40 66 61 L66 94 Z M8 20 L92 20 L86 8 L14 8 Z" />
);

const Colosseum = ({ color }) => (
  <G fill={color}>
    <Path d="M7 24 Q50 5 93 24 L88 90 Q50 98 12 90 Z" />
    {[20, 40, 60, 80].map((x) => <Rect key={x} x={x - 6} y="39" width="12" height="19" rx="6" fill="#FFF1CD" opacity="0.7" />)}
    {[25, 50, 75].map((x) => <Rect key={x} x={x - 7} y="67" width="14" height="20" rx="7" fill="#FFF1CD" opacity="0.7" />)}
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
    case 'clock-tower': return <Tower color={color} clock />;
    case 'atomium': return <Atomium color={color} />;
    case 'wheel': return <Wheel color={color} />;
    case 'arch': return <Arch color={color} />;
    case 'colosseum': return <Colosseum color={color} />;
    default: return <RoadVehicle color={color} />;
  }
};

const SILHOUETTE_BOUNDS = {
  person: { minX: 27, minY: 5, width: 40, height: 89 },
  giraffe: { minX: 7, minY: 1, width: 80, height: 95 },
  elephant: { minX: 5, minY: 29, width: 90, height: 66 },
  dog: { minX: 5, minY: 17, width: 89, height: 77 },
  ostrich: { minX: 14, minY: 5, width: 82, height: 94 },
  turtle: { minX: 5, minY: 25, width: 90, height: 57 },
  bicycle: { minX: 1.5, minY: 33.5, width: 98, height: 59 },
  'road-vehicle': { minX: 7, minY: 32, width: 87, height: 56 },
  bus: { minX: 5, minY: 25, width: 90, height: 64 },
  whale: { minX: 4, minY: 26, width: 90, height: 50 },
  'tuk-tuk': { minX: 9, minY: 31, width: 84, height: 55 },
  airliner: { minX: 4, minY: 10, width: 94, height: 79 },
  luggage: { minX: 24, minY: 3.5, width: 52, height: 94.5 },
  guitar: { minX: 24, minY: 7, width: 52, height: 89 },
  bottle: { minX: 28, minY: 7, width: 44, height: 87 },
  'bowling-pin': { minX: 26, minY: 3, width: 48, height: 93 },
  umbrella: { minX: 7, minY: 12, width: 86, height: 87 },
  palm: { minX: 4, minY: 3, width: 92, height: 93 },
  backpack: { minX: 11, minY: 3.5, width: 78, height: 88.5 },
  kayak: { minX: 3, minY: 17.5, width: 94, height: 79 },
  statue: { minX: 17, minY: 1, width: 51, height: 94 },
  eiffel: { minX: 11, minY: 4, width: 78, height: 91 },
  tower: { minX: 28, minY: 4, width: 44, height: 92 },
  'clock-tower': { minX: 28, minY: 4, width: 44, height: 92 },
  atomium: { minX: 7, minY: 4, width: 87, height: 88 },
  wheel: { minX: 8.5, minY: 3.5, width: 83, height: 96 },
  arch: { minX: 8, minY: 8, width: 84, height: 86 },
  colosseum: { minX: 7, minY: 14, width: 86, height: 81 },
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
