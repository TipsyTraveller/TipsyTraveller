import Svg, { G, Polygon, Rect } from 'react-native-svg';

const CREAM = '#FFF1CD';
const NAVY = '#2C3E50';
const RED = '#E8412F';
const GOLD = '#F2B33D';

// Flat pixel-style silhouettes on a 60x40 grid, drawn for the navy ticket stub.
const LANDMARKS = {
  paris: (
    <>
      <G fill={CREAM}>
        <Polygon points="30,3 31,3 32,12 34,20 41,34 36,34 34,29 26,29 24,34 19,34 26,20 29,12" />
        <Rect x="26" y="12" width="8" height="2" />
        <Rect x="24" y="20" width="12" height="2" />
      </G>
      <Polygon points="27,34 28,30 32,30 33,34" fill={NAVY} />
    </>
  ),
  madrid: (
    <>
      <G fill={CREAM}>
        <Polygon points="23,12 30,5 37,12" />
        <Rect x="8" y="12" width="44" height="3" />
        <Rect x="11" y="15" width="38" height="19" />
      </G>
      <G fill={NAVY}>
        <Rect x="14" y="22" width="7" height="12" />
        <Rect x="26.5" y="20" width="7" height="14" />
        <Rect x="39" y="22" width="7" height="12" />
      </G>
    </>
  ),
  sevilla: (
    <>
      <G fill={CREAM}>
        <Rect x="24" y="12" width="12" height="22" />
        <Rect x="26" y="8" width="8" height="4" />
        <Rect x="28" y="4" width="4" height="4" />
        <Rect x="29" y="1" width="2" height="3" />
        <Rect x="12" y="26" width="36" height="8" />
      </G>
      <G fill={NAVY}>
        <Rect x="28" y="15" width="4" height="5" />
        <Rect x="28" y="23" width="4" height="5" />
      </G>
    </>
  ),
  lisbon: (
    <>
      <G fill={CREAM}>
        <Rect x="22" y="12" width="16" height="22" />
        <Rect x="22" y="9" width="3" height="3" />
        <Rect x="28.5" y="9" width="3" height="3" />
        <Rect x="35" y="9" width="3" height="3" />
        <Rect x="27" y="3" width="6" height="6" />
        <Rect x="14" y="28" width="32" height="6" />
      </G>
      <G fill={NAVY}>
        <Rect x="27" y="16" width="6" height="5" />
        <Rect x="27" y="24" width="6" height="5" />
      </G>
      <Rect x="28" y="5" width="4" height="2" fill={RED} />
    </>
  ),
  rome: (
    <>
      <Rect x="7" y="13" width="46" height="21" fill={CREAM} />
      <Polygon points="41,13 53,13 53,19" fill={NAVY} />
      <G fill={NAVY}>
        <Rect x="10" y="16" width="4" height="5" />
        <Rect x="17" y="16" width="4" height="5" />
        <Rect x="24" y="16" width="4" height="5" />
        <Rect x="31" y="16" width="4" height="5" />
        <Rect x="38" y="16" width="4" height="5" />
        <Rect x="10" y="25" width="4" height="7" />
        <Rect x="17" y="25" width="4" height="7" />
        <Rect x="24" y="25" width="4" height="7" />
        <Rect x="31" y="25" width="4" height="7" />
        <Rect x="38" y="25" width="4" height="7" />
        <Rect x="45" y="25" width="4" height="7" />
      </G>
    </>
  ),
  berlin: (
    <>
      <G fill={CREAM}>
        <Rect x="8" y="12" width="44" height="4" />
        <Rect x="12" y="8" width="36" height="4" />
        <Rect x="9" y="30" width="42" height="4" />
        <Rect x="11" y="16" width="4" height="14" />
        <Rect x="20" y="16" width="4" height="14" />
        <Rect x="28" y="16" width="4" height="14" />
        <Rect x="36" y="16" width="4" height="14" />
        <Rect x="45" y="16" width="4" height="14" />
      </G>
      <Rect x="25" y="3" width="10" height="5" fill={RED} />
    </>
  ),
  brussels: (
    <>
      <G fill={CREAM}>
        <Rect x="29" y="9" width="2" height="22" />
        <Polygon points="30,9 31,10 15,18 14,17" />
        <Polygon points="30,9 29,10 45,18 46,17" />
        <Polygon points="15,18 14,19 29,31 30,30" />
        <Polygon points="45,18 46,19 31,31 30,30" />
        <Rect x="26" y="1" width="8" height="8" />
        <Rect x="10" y="14" width="8" height="8" />
        <Rect x="42" y="14" width="8" height="8" />
        <Rect x="26" y="14" width="8" height="8" />
        <Rect x="26" y="29" width="8" height="8" />
      </G>
      <G fill={GOLD}>
        <Rect x="28" y="3" width="4" height="4" />
        <Rect x="12" y="16" width="4" height="4" />
        <Rect x="44" y="16" width="4" height="4" />
        <Rect x="28" y="16" width="4" height="4" />
        <Rect x="28" y="31" width="4" height="4" />
      </G>
    </>
  ),
};

const CityLandmark = ({ name, width = 150 }) => {
  const artwork = LANDMARKS[name];
  if (!artwork) return null;

  return (
    <Svg width={width} height={(width * 2) / 3} viewBox="0 0 60 40" accessibilityLabel={`${name} landmark`}>
      {artwork}
    </Svg>
  );
};

export default CityLandmark;
