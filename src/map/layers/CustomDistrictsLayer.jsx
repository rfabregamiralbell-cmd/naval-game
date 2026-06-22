import React, { useState, useEffect } from 'react';
import { GeoJSON, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGame } from '../../core/context/GameContext';
import { calculateDistrictStats } from '../../engines/economy/districtStats';

const DISTRICT_COLORS = {
  hacienda: { fill: '#8b9045', stroke: '#b8c875' },
  gremio: { fill: '#b86b32', stroke: '#d08a4a' },
  almacen: { fill: '#808080', stroke: '#a9a9a9' },
  aduana: { fill: '#d4af37', stroke: '#f0cc65' },
  puerto: { fill: '#4682b4', stroke: '#7fb0d6' },
  arsenal: { fill: '#4682b4', stroke: '#7fb0d6' },
  fortaleza: { fill: '#5c5c5c', stroke: '#8c8c8c' },
  camino: { fill: '#8b5a2b', stroke: '#cd853f' },
  cabildo: { fill: '#708090', stroke: '#a9a9a9' }
};

const DISTRICT_ICONS = {
  hacienda: '🌾',
  gremio: '⚒️',
  almacen: '📦',
  aduana: '⚖️',
  puerto: '⛵',
  arsenal: '⚓',
  fortaleza: '🏰',
  camino: '🛣️',
  cabildo: '🏛️'
};

const DISTRICT_NAMES = {
  hacienda: 'Hacienda Agrícola',
  gremio: 'Gremio de Artesanos',
  almacen: 'Almacenes de Depósito',
  aduana: 'Aduana',
  puerto: 'Puerto Comercial',
  arsenal: 'Arsenal',
  fortaleza: 'Fortaleza',
  camino: 'Camino Interior',
  cabildo: 'Cabildo'
};

export default function CustomDistrictsLayer({ selectedDistrictId, onSelectDistrict }) {
  const { gameState } = useGame();
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handleZoomEnd = () => {
      setZoom(map.getZoom());
    };
    map.on('zoomend', handleZoomEnd);
    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  const getDistrictStyle = (dist) => {
    const isSelected = selectedDistrictId === dist.id;
    const colors = DISTRICT_COLORS[dist.type] || { fill: '#ff0000', stroke: '#ff3333' };
    
    let weight = isSelected ? 4 : 2;
    let dashArray = null;
    let fillOpacity = 0.14; // Between 0.10 and 0.18
    let strokeOpacity = isSelected ? 0.90 : 0.70; // Clear stroke

    if (dist.status === 'constructing') {
      dashArray = '5, 5';
      fillOpacity = 0.08; // More faded when constructing
    }

    return {
      fillColor: colors.fill,
      fillOpacity,
      color: colors.stroke,
      weight,
      dashArray,
      opacity: strokeOpacity
    };
  };

  return (
    <>
      {gameState.customDistricts?.map((dist) => {
        const stats = calculateDistrictStats(dist.type, dist.areaM2, dist.assignedWorkers, dist.level, gameState.customDistricts);
        const colors = DISTRICT_COLORS[dist.type] || { stroke: '#ff3333' };
        const iconChar = DISTRICT_ICONS[dist.type] || '📍';
        const isSelected = selectedDistrictId === dist.id;

        // Custom divIcon for the building marker
        const customIcon = L.divIcon({
          className: 'custom-building-icon-container',
          html: `
            <div style="
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: rgba(10, 10, 10, 0.75);
              border: 2px solid ${colors.stroke};
              display: flex;
              justify-content: center;
              align-items: center;
              font-size: 14px;
              color: white;
              box-shadow: 0 0 10px ${isSelected ? '#fff' : colors.stroke};
              transition: all 0.2s ease;
              transform: ${isSelected ? 'scale(1.15)' : 'scale(1.0)'};
            ">
              ${iconChar}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        // Zoom responsive Tooltip content
        let tooltipContent = '';
        if (dist.status === 'constructing') {
          tooltipContent = `👷 Construyendo...`;
        } else {
          if (zoom < 14) {
            tooltipContent = `${iconChar} ${DISTRICT_NAMES[dist.type]}`;
          } else if (zoom >= 14 && zoom < 16) {
            tooltipContent = `<strong>${DISTRICT_NAMES[dist.type]}</strong> · ${stats.assignedWorkers} trab.`;
          } else {
            tooltipContent = `
              <div style="text-align: center; font-family: 'Outfit', 'Inter', sans-serif;">
                <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">${DISTRICT_NAMES[dist.type]} ${stats.levelRoman}</div>
                <div style="color: #ccc; font-size: 11px;">👥 ${stats.assignedWorkers} / ${stats.workersRequired} trab.</div>
                <div style="color: #a3e635; font-weight: bold; font-size: 11px; margin-top: 1px;">💰 +${stats.production.rate} ${stats.production.label}/día</div>
              </div>
            `;
          }
        }

        // We use a combined key to ensure Leaflet updates the overlay rendering reactively when selection or status changes
        const uniqueKey = `${dist.id}_${dist.status}_${isSelected}_${zoom}`;

        // Ensure mainBuildingPoint is valid, default to centroid or coords if not present
        const markerPos = dist.mainBuildingPoint || [10.42, -75.54];

        return (
          <React.Fragment key={`group_${uniqueKey}`}>
            {/* Polygon Geometry */}
            <GeoJSON
              key={`poly_${uniqueKey}`}
              data={dist.polygon}
              style={getDistrictStyle(dist)}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectDistrict(dist);
                }
              }}
            />

            {/* Building Icon Marker */}
            <Marker
              key={`marker_${uniqueKey}`}
              position={markerPos}
              icon={customIcon}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  onSelectDistrict(dist);
                }
              }}
            >
              {/* Zoom-Responsive Permanent Tooltip */}
              <Tooltip
                permanent
                direction="bottom"
                offset={[0, 10]}
                opacity={0.95}
                className="compact-district-tooltip"
              >
                <div dangerouslySetInnerHTML={{ __html: tooltipContent }} />
              </Tooltip>
            </Marker>
          </React.Fragment>
        );
      })}
    </>
  );
}
