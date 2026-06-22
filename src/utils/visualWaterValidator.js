import * as turf from '@turf/turf';

// Simple cache for tiles to avoid fetching repeatedly during live drag
const tileCache = new Map();

// Color thresholds (Heuristics for Esri World Imagery in the Caribbean/Cartagena)
function classifyPixel(r, g, b) {
  // Pure blue / deep water
  if (b > r + 30 && b > g + 10) return 'water';
  
  // Teal / shallow water
  if (g > r + 10 && b > r + 10 && Math.abs(g - b) < 30 && b > 60) return 'water';

  // Mangrove / Dark Green Water (Very dark green/brown, low r/g/b but g is dominant)
  if (g > r && g > b && r < 60 && g < 80 && b < 60) return 'mangrove';
  
  // Wetland / Swamp (Muddy, brownish green with low brightness)
  if (r > 40 && r < 100 && g > 50 && g < 110 && b > 20 && b < 80 && Math.abs(r - g) < 20) return 'wetland';

  // Agricultural / Dry land (Bright green or brown)
  return 'land';
}

function lng2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
function lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

function tile2lng(x, z) { return (x / Math.pow(2, z) * 360 - 180); }
function tile2lat(y, z) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

async function loadTile(x, y, z) {
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  if (tileCache.has(url)) return tileCache.get(url);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, 256, 256).data;
      tileCache.set(url, data);
      resolve(data);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Bounding box + buffer for proximity checks
export async function validatePolygonAgainstVisualWater(polygon, checkProximity = false) {
  const bbox = turf.bbox(polygon);
  
  // If checkProximity is true, we expand the bbox by ~200m (0.002 degrees) to check surrounding pixels
  const bufferDegrees = checkProximity ? 0.002 : 0;
  
  const minLng = bbox[0] - bufferDegrees;
  const minLat = bbox[1] - bufferDegrees;
  const maxLng = bbox[2] + bufferDegrees;
  const maxLat = bbox[3] + bufferDegrees;

  const zoom = 16;
  const minTileX = lng2tile(minLng, zoom);
  const maxTileX = lng2tile(maxLng, zoom);
  const minTileY = lat2tile(maxLat, zoom); // Note: Y decreases as Lat increases
  const maxTileY = lat2tile(minLat, zoom);

  let waterPixelCount = 0;
  let wetlandPixelCount = 0;
  let mangrovePixelCount = 0;
  let waterProximityPixels = 0;

  for (let x = minTileX; x <= maxTileX; x++) {
    for (let y = minTileY; y <= maxTileY; y++) {
      const tileData = await loadTile(x, y, zoom);
      if (!tileData) continue;

      const tileMinLng = tile2lng(x, zoom);
      const tileMaxLng = tile2lng(x + 1, zoom);
      const tileMaxLat = tile2lat(y, zoom); // North edge
      const tileMinLat = tile2lat(y + 1, zoom); // South edge

      for (let py = 0; py < 256; py += 4) { // Step by 4 for performance
        for (let px = 0; px < 256; px += 4) {
          const pixelLng = tileMinLng + (px / 256) * (tileMaxLng - tileMinLng);
          const pixelLat = tileMaxLat - (py / 256) * (tileMaxLat - tileMinLat);
          const pt = turf.point([pixelLng, pixelLat]);

          // Check if pixel is inside the exact polygon
          const inPolygon = turf.booleanPointInPolygon(pt, polygon);
          
          // If not in polygon, but we need proximity, check if it's within the expanded bbox
          const inProximityBuffer = checkProximity && !inPolygon && 
                                    pixelLng >= minLng && pixelLng <= maxLng && 
                                    pixelLat >= minLat && pixelLat <= maxLat;

          if (inPolygon || inProximityBuffer) {
            const idx = (py * 256 + px) * 4;
            const r = tileData[idx], g = tileData[idx+1], b = tileData[idx+2];
            const type = classifyPixel(r, g, b);

            if (inPolygon) {
              if (type === 'water') waterPixelCount++;
              if (type === 'wetland') wetlandPixelCount++;
              if (type === 'mangrove') mangrovePixelCount++;
            } else if (inProximityBuffer) {
              if (type === 'water') waterProximityPixels++;
            }
          }
        }
      }
    }
  }

  return {
    waterPixelCount,
    wetlandPixelCount,
    mangrovePixelCount,
    waterProximity: waterProximityPixels > 10 // Consider "near water" if we found at least 10 water pixels nearby
  };
}
