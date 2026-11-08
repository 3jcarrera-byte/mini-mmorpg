// public/js/worldsConfig.js

export const PLANET_TYPES = {
  TEMPERATE_FOREST: {
    name: "Planeta Templado Boscoso",
    radiusRange: [4.0, 7.0], // Variación de tamaño del mini planeta
    gravity: 9.8,
    atmosphereColor: 0x87ceeb,
    dayNightCycleSpeed: 0.001,
    rotationSpeed: 0.005,
    orbitalSpeed: 0.0002, // Traslación alrededor de la estrella
    hasOcean: true,
    oceanColor: 0x1e90ff,
    oceanLevel: 0.95, // Altura respecto al radio del planeta
    climate: {
      baseTemperature: 22, // Celsius
      weatherTypes: ["clear", "rain", "fog"],
    },
    biomes: ["grassland", "dense_forest", "rocky_hills", "river_bed"],
    colors: {
      low: 0x2e5a1e,    // Valles y riberas
      mid: 0x4a7c36,    // Praderas y bosques base
      high: 0x8a8a8a,   // Colinas rocosas
      peak: 0xffffff    // Cumbres nevadas
    },
    resources: [
      { type: "tree", density: 40, rarity: "common" },
      { type: "rock", density: 25, rarity: "common" },
      { type: "iron_ore", density: 10, rarity: "uncommon" }
    ]
  },
  VOLCANIC_MAGMA: {
    name: "Planeta Volcánico",
    radiusRange: [3.0, 5.5],
    gravity: 12.0,
    atmosphereColor: 0xff4500,
    dayNightCycleSpeed: 0.002,
    rotationSpeed: 0.008,
    orbitalSpeed: 0.0004,
    hasOcean: true,
    oceanColor: 0x3b0000, // Océano de lava
    oceanLevel: 0.90,
    climate: {
      baseTemperature: 85,
      weatherTypes: ["ash_storm", "ember_rain"],
    },
    biomes: ["obsidian_fields", "magma_rivers", "crater_ash", "sulfur_vents"],
    colors: {
      low: 0x1a0500,    // Ríos de magma / depresiones profundas
      mid: 0x3d1400,    // Campos de obsidiana y ceniza
      high: 0x5e2605,   // Laderas volcánicas agrietadas
      peak: 0x222222    // Picos de roca calcinada y azufre
    },
    resources: [
      { type: "obsidian_rock", density: 50, rarity: "common" },
      { type: "sulfur_crystal", density: 20, rarity: "rare" }
    ]
  },
  FROZEN_ICE: {
    name: "Planeta Helado",
    radiusRange: [5.0, 8.0],
    gravity: 8.5,
    atmosphereColor: 0xb0e0e6,
    dayNightCycleSpeed: 0.0005,
    rotationSpeed: 0.002,
    orbitalSpeed: 0.0001,
    hasOcean: true,
    oceanColor: 0xadd8e6, // Océano congelado / agua fría
    oceanLevel: 0.97,
    climate: {
      baseTemperature: -35,
      weatherTypes: ["blizzard", "snow"],
    },
    biomes: ["glacier_sheet", "frozen_tundra", "ice_spikes", "subglacial_volcano"],
    colors: {
      low: 0x8ab6d6,    // Grietas de hielo profundo y lagos congelados
      mid: 0xb0e0e6,    // Tundra helada y glaciares
      high: 0xe0f7ff,   // Picos de hielo puro / ventisqueros
      peak: 0x4a3b32    // Fumarolas o ceniza volcánica subglaciar permitida lógicamente
    },
    resources: [
      { type: "frozen_tree", density: 15, rarity: "uncommon" },
      { type: "cryo_crystal", density: 12, rarity: "rare" }
    ]
  }
};

export const STAR_SYSTEMS = [
  {
    id: "system_alpha",
    name: "Sistema Alpha Centauri",
    starType: "yellow_dwarf",
    starColor: 0xffd700,
    planets: [
      { id: "p_01", type: "TEMPERATE_FOREST", orbitRadius: 50, seed: 12345 },
      { id: "p_02", type: "VOLCANIC_MAGMA", orbitRadius: 85, seed: 67890 }
    ]
  }
];
