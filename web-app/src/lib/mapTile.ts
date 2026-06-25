/**
 * OpenStreetMap raster-tile helper. Maps a lat/lng to the URL of the OSM tile
 * that contains it at the given zoom — used as a lightweight static map preview
 * (project cards, the home activity widget background) without loading a full
 * interactive map.
 */
export function osmTileUrl(lat: number, lng: number, zoom = 14): string {
  const x = Math.floor(((lng + 180) / 360) * 2 ** zoom);
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** zoom,
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}
