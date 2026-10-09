const env = import.meta.env;

export default {
  style: env.VITE_MAP_STYLE_URL || 'https://demotiles.maplibre.org/style.json',
  satelliteTiles: env.VITE_SATELLITE_TILES_URL || '',
  satelliteAttribution: env.VITE_SATELLITE_ATTRIBUTION || '',
  terrainTiles: env.VITE_TERRAIN_TILES_URL || '',
  terrainAttribution: env.VITE_TERRAIN_ATTRIBUTION || '',
};
