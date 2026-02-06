import circle from '@turf/circle';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import dimensions from '../../common/theme/dimensions';
import { map } from '../core/MapView';
import { usePrevious } from '../../reactHelper';
import { useAttributePreference } from '../../common/util/preferences';

const MapSelectedDevice = ({ mapReady }) => {
  const currentTime = useSelector((state) => state.devices.selectTime);
  const currentId = useSelector((state) => state.devices.selectedId);
  const previousTime = usePrevious(currentTime);
  const previousId = usePrevious(currentId);

  const selectZoom = useAttributePreference('web.selectZoom', 18);
  const mapFollow = useAttributePreference('mapFollow', false);

  const position = useSelector((state) => state.session.positions[currentId]);
  const device = useSelector((state) => state.devices.items[currentId]);
  const geofences = useSelector((state) => state.geofences.items);

  const previousPosition = usePrevious(position);

  useEffect(() => {
    if (!mapReady) return;

    const positionChanged = position && (!previousPosition || position.latitude !== previousPosition.latitude || position.longitude !== previousPosition.longitude);

    if ((currentId !== previousId || currentTime !== previousTime || (mapFollow && positionChanged)) && position) {
      map.easeTo({
        center: [position.longitude, position.latitude],
        zoom: Math.max(map.getZoom(), selectZoom),
        offset: [0, -dimensions.popupMapOffset / 2],
      });
    }

    // Anchor Circle Logic - Immediate Visual Feedback
    const hasAnchorGeofence = device?.geofenceIds?.some(id => geofences[id]?.name?.startsWith('Âncora'));
    const isAnchored = hasAnchorGeofence || (device?.attributes?.anchor);

    // Check/clean previous anchor source if needed
    if (!isAnchored && map.getSource('anchor-source')) {
      if (map.getLayer('anchor-fill')) map.removeLayer('anchor-fill');
      if (map.getLayer('anchor-line')) map.removeLayer('anchor-line');
      map.removeSource('anchor-source');
    }

    if (isAnchored && position) {
      // Generate 50m circle using Turf
      const center = [position.longitude, position.latitude];
      const radius = 0.05; // 50 meters in km
      const options = { steps: 64, units: 'kilometers' };
      const circleGeoJSON = circle(center, radius, options);

      const sourceId = 'anchor-source';
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: circleGeoJSON
        });

        // Add Fill
        map.addLayer({
          id: 'anchor-fill',
          type: 'fill',
          source: sourceId,
          layout: {},
          paint: {
            'fill-color': 'red',
            'fill-opacity': 0.2
          }
        });

        // Add Border
        map.addLayer({
          id: 'anchor-line',
          type: 'line',
          source: sourceId,
          layout: {},
          paint: {
            'line-color': 'red',
            'line-width': 2
          }
        });
      } else {
        // Update existing source
        map.getSource(sourceId).setData(circleGeoJSON);
      }
    }
  }, [currentId, previousId, currentTime, previousTime, mapFollow, position, selectZoom, mapReady, device, geofences]);

  return null;
};

MapSelectedDevice.handlesMapReady = true;

export default MapSelectedDevice;
