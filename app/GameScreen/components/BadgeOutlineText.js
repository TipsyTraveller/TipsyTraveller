import { useEffect, useMemo } from 'react';
import { ShapeGeometry } from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import outlines from '../../../assets/fonts/dogicapixelbold-board.json';

// Generated from Dogica Pixel Bold with TTFLoader.reversed = true so Three
// treats enclosed spaces in glyphs such as 4 and 8 as holes.
const font = new Font(outlines);

export default function BadgeOutlineText({ children, fontSize, ...props }) {
  const geometry = useMemo(() => {
    const text = new ShapeGeometry(font.generateShapes(String(children), fontSize * 0.72), 2);
    text.center();
    return text;
  }, [children, fontSize]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh {...props} dispose={null}>
      <primitive object={geometry} attach="geometry" />
    </mesh>
  );
}
