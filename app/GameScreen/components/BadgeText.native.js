import { useEffect, useMemo } from 'react';
import { ShapeGeometry } from 'three';
import { Font } from 'three/addons/loaders/FontLoader.js';
import outlines from '../../../assets/fonts/dogicapixelbold-board.json';

// Drei's Text rasterizer requires a browser canvas. These outlines are converted
// from the same bundled Dogica Pixel Bold OTF with Three's TTFLoader.
const font = new Font(outlines);

export default function BadgeText({ children, fontSize, ...props }) {
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
