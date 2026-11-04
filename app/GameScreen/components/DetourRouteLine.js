import { memo } from 'react';
import { TouringRoadMesh, useTouringRoad } from './TouringRoad';

const DetourRouteLine = memo(({ routeModel }) => {
  const road = useTouringRoad(routeModel, 'detour');
  return <TouringRoadMesh road={road} />;
});

export default DetourRouteLine;
