// public/js/worldsConfig.js

window.PLANET_TYPES = {
  TEMPERATE_FOREST: {
    name: "Planeta Templado Boscoso",
    radiusRange: [4.0, 7.0],
    gravity: 9.8,
    atmosphereColor: 0x87ceeb,
    ozoneDensity: 0.65,
    dayNightCycleSpeed: 0.001,
    rotationSpeed: 0.005,
    orbitalSpeed: 0.0002,
    hasOcean: true,
    oceanColor: 0x1e90ff,
    oceanLevel: 0.95,
    climate: {
      baseTemperature: 22,
      weatherTypes: ["clear", "rain", "fog"],
    },
    biomes: ["grassland", "dense_forest", "rocky_hills", "river_bed"],
    colors: {
      low: 0x2e5a1e,
      mid: 0x4a7c36,
      high: 0x8a8a8a,
      peak: 0xffffff
    },
    resources: [
      { type: "tree", density: 40, rarity: "common" },
      { type: "rock", density: 25, rarity: "common" },
      { type: "iron_ore", density: 10, rarity: "uncommon" }
    ]
  },
  OCEANIC_WORLD: {
    name: "Planeta Oceánico",
    radiusRange: [5.0, 8.0],
    gravity: 10.0,
    atmosphereColor: 0x00bfff,
    ozoneDensity: 0.50,
    dayNightCycleSpeed: 0.0012,
    rotationSpeed: 0.004,
    orbitalSpeed: 0.00025,
    hasOcean: true,
    oceanColor: 0x0047ab,
    oceanLevel: 0.98,
    climate: {
      baseTemperature: 25,
      weatherTypes: ["rain", "storm", "fog"],
    },
    biomes: ["coral_shallows", "deep_trench", "floating_archipelago"],
    colors: {
      low: 0x1c3b57,
      mid: 0x2a52be,
      high: 0x4682b4,
      peak: 0xb0e0e6
    },
    resources: [
      { type: "kelp_fiber", density: 35, rarity: "common" },
      { type: "coral_rock", density: 20, rarity: "uncommon" }
    ]
  },
  DESERT_WASTELAND: {
    name: "Planeta Desértico",
    radiusRange: [5.5, 9.0],
    gravity: 10.5,
    atmosphereColor: 0xffd700,
    ozoneDensity: 0.35,
    dayNightCycleSpeed: 0.0015,
    rotationSpeed: 0.006,
    orbitalSpeed: 0.0003,
    hasOcean: false,
    oceanColor: 0x000000,
    oceanLevel: 0.0,
    climate: {
      baseTemperature: 45,
      weatherTypes: ["sandstorm", "heatwave", "clear"],
    },
    biomes: ["dunes", "canyons", "salt_flats", "arid_plateau"],
    colors: {
      low: 0xc2a65e,
      mid: 0xd2b48c,
      high: 0xbc8f8f,
      peak: 0x8b4513
    },
    resources: [
      { type: "sandstone_rock", density: 40, rarity: "common" },
      { type: "silica_crystal", density: 15, rarity: "rare" }
    ]
  },
  FROZEN_ICE: {
    name: "Planeta Helado",
    radiusRange: [7.0, 10.5],
    gravity: 8.5,
    atmosphereColor: 0xb0e0e6,
    ozoneDensity: 0.40,
    dayNightCycleSpeed: 0.0005,
    rotationSpeed: 0.002,
    orbitalSpeed: 0.0001,
    hasOcean: true,
    oceanColor: 0xadd8e6,
    oceanLevel: 0.97,
    climate: {
      baseTemperature: -35,
      weatherTypes: ["blizzard", "snow"],
    },
    biomes: ["glacier_sheet", "frozen_tundra", "ice_spikes", "subglacial_volcano"],
    colors: {
      low: 0x8ab6d6,
      mid: 0xb0e0e6,
      high: 0xe0f7ff,
      peak: 0x4a3b32
    },
    resources: [
      { type: "frozen_tree", density: 15, rarity: "uncommon" },
      { type: "cryo_crystal", density: 12, rarity: "rare" }
    ]
  },
  VOLCANIC_MAGMA: {
    name: "Planeta Volcánico",
    radiusRange: [8.0, 12.0],
    gravity: 12.0,
    atmosphereColor: 0xff4500,
    ozoneDensity: 0.20,
    dayNightCycleSpeed: 0.002,
    rotationSpeed: 0.008,
    orbitalSpeed: 0.0004,
    hasOcean: true,
    oceanColor: 0x3b0000,
    oceanLevel: 0.90,
    climate: {
      baseTemperature: 85,
      weatherTypes: ["ash_storm", "ember_rain"],
    },
    biomes: ["obsidian_fields", "magma_rivers", "crater_ash", "sulfur_vents"],
    colors: {
      low: 0x1a0500,
      mid: 0x3d1400,
      high: 0x5e2605,
      peak: 0x222222
    },
    resources: [
      { type: "obsidian_rock", density: 50, rarity: "common" },
      { type: "sulfur_crystal", density: 20, rarity: "rare" }
    ]
  },
  BARREN_COLOSSUS: {
    name: "Coloso Árido Masivo",
    radiusRange: [10.0, 12.0],
    gravity: 14.0,
    atmosphereColor: 0x708090,
    ozoneDensity: 0.15,
    dayNightCycleSpeed: 0.0003,
    rotationSpeed: 0.001,
    orbitalSpeed: 0.00005,
    hasOcean: false,
    oceanColor: 0x000000,
    oceanLevel: 0.0,
    climate: {
      baseTemperature: 10,
      weatherTypes: ["meteor_shower", "dead_calm"],
    },
    biomes: ["impact_craters", "iron_mountains", "barren_plateaus"],
    colors: {
      low: 0x2f4f4f,
      mid: 0x556b2f,
      high: 0x696969,
      peak: 0x778899
    },
    resources: [
      { type: "heavy_iron", density: 60, rarity: "common" },
      { type: "titanium_ore", density: 10, rarity: "epic" }
    ]
  }
};

window.STAR_SYSTEMS = [
  {
    id: "system_alpha",
    name: "Sistema Alpha Centauri",
    starType: "yellow_dwarf",
    starColor: 0xffd700,
    planets: [
      { id: "p_01", type: "VOLCANIC_MAGMA", orbitRadius: 35, seed: 11111 },
      { id: "p_02", type: "TEMPERATE_FOREST", orbitRadius: 65, seed: 12345 },
      { id: "p_03", type: "FROZEN_ICE", orbitRadius: 95, seed: 67890 },
      { id: "p_04", type: "BARREN_COLOSSUS", orbitRadius: 130, seed: 99999 }
    ]
  }
];
