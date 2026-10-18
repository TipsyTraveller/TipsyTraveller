export const MODEL_OPTIONS = [
  {
    id: 'car1',
    label: 'Rally Truck',
    source: require('../../../assets/models/car1.glb'),
    yaw: Math.PI / 2,
  },
  {
    id: 'vehicle001',
    label: 'Neon Nomad',
    source: require('../../../assets/models/vehicle001.glb'),
    preserveMaterials: true,
  },
  {
    id: 'minivan',
    label: 'Party Van',
    source: require('../../../assets/models/minivan.glb'),
  },
  {
    id: 'vehicle002',
    label: 'Moon Buggy',
    source: require('../../../assets/models/vehicle002.glb'),
    preserveMaterials: true,
  },
  {
    id: 'vehicle003',
    label: 'Disco Cruiser',
    source: require('../../../assets/models/vehicle003.glb'),
    preserveMaterials: true,
  },
  {
    id: 'vehicle004',
    label: 'Turbo Comet',
    source: require('../../../assets/models/vehicle004.glb'),
    preserveMaterials: true,
  },
  {
    id: 'vehicle005',
    label: 'Road Rocket',
    source: require('../../../assets/models/vehicle005.glb'),
    preserveMaterials: true,
  },
  {
    id: 'vehicle006',
    label: 'Cosmic Camper',
    source: require('../../../assets/models/vehicle006.glb'),
    preserveMaterials: true,
  },
];

export const getModelOption = (modelId) => (
  MODEL_OPTIONS.find((model) => model.id === modelId) || MODEL_OPTIONS[0]
);

export const getDefaultModelOption = (teamIndex) => (
  MODEL_OPTIONS[0]
);
