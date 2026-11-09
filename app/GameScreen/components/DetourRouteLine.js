import { memo } from 'react';
import { TouringRoadMesh, useTouringRoad } from './TouringRoad';

const DetourRouteLine = memo(({ routeModel, selected = false, inactive = false }) => {
  const road = useTouringRoad(routeModel, 'detour');
  const opacity = inactive ? 0.62 : (selected ? 0.95 : road.opacity);

  return <TouringRoadMesh road={road} opacity={opacity} renderOrder={3.5} />;
});

export default DetourRouteLine;
