export const MODEL_OPTIONS = [
  {
    id: 'barrel_roadster',
    label: 'Barrel Roadster',
    source: require('../../../assets/models/barrel_roadster.glb'),
    preserveMaterials: true,
    yaw: Math.PI / 2,
  },
  {
    id: 'crate_cruiser',
    label: 'Crate Cruiser',
    source: require('../../../assets/models/crate_cruiser.glb'),
    preserveMaterials: true,
    yaw: Math.PI / 2,
  },
  {
    id: 'party_cooler_cart',
    label: 'Party Cooler Cart',
    source: require('../../../assets/models/party_cooler_cart.glb'),
    preserveMaterials: true,
    yaw: Math.PI / 2,
  },
  {
    id: 'tuk_tuk_taproom',
    label: 'Tuk Tuk Taproom',
    source: require('../../../assets/models/tuk_tuk_taproom.glb'),
    preserveMaterials: true,
    yaw: Math.PI / 2,
  },
  {
    id: 'vw_camper_van',
    label: 'VW Camper Van',
    source: require('../../../assets/models/vw_camper_van.glb'),
    preserveMaterials: true,
    yaw: Math.PI / 2,
  },
];

export const getModelOption = (modelId) => (
  MODEL_OPTIONS.find((model) => model.id === modelId) || MODEL_OPTIONS[0]
);

export const getDefaultModelOption = (teamIndex) => (
  MODEL_OPTIONS[0]
);
