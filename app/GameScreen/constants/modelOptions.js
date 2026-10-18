const CAR1_ROTATION = [Math.PI / 2, Math.PI / 2, 0];
const STANDARD_VEHICLE_ROTATION = [Math.PI / 2, 0, 0];

export const MODEL_OPTIONS = [
  {
    id: 'car1',
    label: 'Classic Car',
    source: require('../../../assets/models/car1.glb'),
    normalizeOrigin: true,
    transform: {
      scale: [0.03, 0.03, 0.03],
      position: [0, 0, 0],
      rotation: CAR1_ROTATION,
    },
  },
  {
    id: 'vehicle001',
    label: 'Vehicle 1',
    source: require('../../../assets/models/vehicle001.glb'),
    normalizeOrigin: true,
    preserveMaterials: true,
    transform: {
      scale: [0.045, 0.045, 0.045],
      position: [0, 0, 0],
      rotation: STANDARD_VEHICLE_ROTATION,
    },
  },
  {
    id: 'minivan',
    label: 'Minivan',
    source: require('../../../assets/models/minivan.glb'),
    normalizeOrigin: true,
    transform: {
      scale: [0.001, 0.001, 0.001],
      position: [0, 0, 0],
      rotation: STANDARD_VEHICLE_ROTATION,
    },
  },
  {
    id: 'vehicle002',
    label: 'Vehicle 2',
    source: require('../../../assets/models/vehicle002.glb'),
    normalizeOrigin: true,
    preserveMaterials: true,
    transform: {
      scale: [0.053, 0.053, 0.053],
      position: [0, 0, 0],
      rotation: STANDARD_VEHICLE_ROTATION,
    },
  },
  {
    id: 'vehicle003',
    label: 'Vehicle 3',
    source: require('../../../assets/models/vehicle003.glb'),
    normalizeOrigin: true,
    preserveMaterials: true,
    transform: {
      scale: [0.052, 0.052, 0.052],
      position: [0, 0, 0],
      rotation: STANDARD_VEHICLE_ROTATION,
    },
  },
  {
    id: 'vehicle004',
    label: 'Vehicle 4',
    source: require('../../../assets/models/vehicle004.glb'),
    normalizeOrigin: true,
    preserveMaterials: true,
    transform: {
      scale: [0.053, 0.053, 0.053],
      position: [0, 0, 0],
      rotation: STANDARD_VEHICLE_ROTATION,
    },
  },
  {
    id: 'vehicle005',
    label: 'Vehicle 5',
    source: require('../../../assets/models/vehicle005.glb'),
    normalizeOrigin: true,
    preserveMaterials: true,
    transform: {
      scale: [0.05, 0.05, 0.05],
      position: [0, 0, 0],
      rotation: STANDARD_VEHICLE_ROTATION,
    },
  },
  {
    id: 'vehicle006',
    label: 'Vehicle 6',
    source: require('../../../assets/models/vehicle006.glb'),
    normalizeOrigin: true,
    preserveMaterials: true,
    transform: {
      scale: [0.052, 0.052, 0.052],
      position: [0, 0, 0],
      rotation: STANDARD_VEHICLE_ROTATION,
    },
  },
];

export const getModelOption = (modelId) => (
  MODEL_OPTIONS.find((model) => model.id === modelId) || MODEL_OPTIONS[0]
);

export const getDefaultModelOption = (teamIndex) => (
  MODEL_OPTIONS[0]
);
