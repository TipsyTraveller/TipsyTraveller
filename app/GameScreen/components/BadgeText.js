import { Text } from '@react-three/drei/native';
import { Asset } from 'expo-asset';

const font = Asset.fromModule(require('../../../assets/fonts/dogicapixelbold.otf')).uri;
const characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÀÁÂÄÇÈÉËÍÖÜ -'";

export default function BadgeText({ children, material, ...props }) {
  return (
    <Text
      {...props}
      characters={characters}
      font={font}
      sdfGlyphSize={32}
      gpuAccelerateSDF={false}
      material={material}
    >
      {children}
    </Text>
  );
}
