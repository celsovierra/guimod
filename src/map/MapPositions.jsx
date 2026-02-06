import { useId, useCallback, useEffect } from 'react';
import circle from '@turf/circle';
import { useSelector } from 'react-redux';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';
import { loadImage, findFonts } from './core/mapUtil';
import { formatTime, getStatusColor } from '../common/util/formatter';
import { mapIconKey } from './core/preloadImages';
import { useAttributePreference } from '../common/util/preferences';
import { useCatchCallback } from '../reactHelper';

const MapPositions = ({ positions, onMapClick, onMarkerClick, showStatus, selectedPosition, titleField }) => {
  const id = useId();
  const clusters = `${id}-clusters`;
  const selected = `${id}-selected`;

  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const iconScale = useAttributePreference('iconScale', desktop ? 0.75 : 1);

  const devices = useSelector((state) => state.devices.items || {});
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const geofences = useSelector((state) => state.geofences.items);

  // Force clustering enabled as requested
  const mapCluster = true; // useAttributePreference('mapCluster', true);
  const directionType = useAttributePreference('mapDirection', 'selected');

  const createFeature = (devices, position, selectedPositionId, geofences) => {
    const device = devices[position.deviceId] || {};
    let showDirection;
    switch (directionType) {
      case 'none':
        showDirection = false;
        break;
      case 'all':
        showDirection = position.course > 0;
        break;
      default:
        showDirection = selectedPositionId === position.id && position.course > 0;
        break;
    }

    // Custom Status Color Logic
    let color = showStatus ? position.attributes?.color || getStatusColor(device.status) : 'neutral';

    // Check Blocked
    const isLocked = device.attributes?.blocked || device.attributes?.out1 || position.attributes?.blocked || position.attributes?.out1;
    if (isLocked) {
      color = 'error'; // Red
    }

    // Check Anchored
    const hasAnchorGeofence = device.geofenceIds?.some(id => geofences?.[id]?.name?.startsWith('Âncora'));
    const isAnchored = device.attributes?.anchor || hasAnchorGeofence;
    if (isAnchored) {
      color = 'primary'; // Blue
    }

    return {
      id: position.id,
      deviceId: position.deviceId,
      name: device.name || '',
      fixTime: formatTime(position.fixTime, 'seconds'),
      category: mapIconKey(device.category),
      color: color,
      rotation: position.course || 0,
      direction: showDirection,
    };
  };

  const onMouseEnter = () => { try { map.getCanvas().style.cursor = 'pointer'; } catch (e) { } };
  const onMouseLeave = () => { try { map.getCanvas().style.cursor = ''; } catch (e) { } };

  const onMapClickCallback = useCallback((event) => {
    if (!event.defaultPrevented && onMapClick) {
      onMapClick(event.lngLat.lat, event.lngLat.lng);
    }
  }, [onMapClick]);

  const onMarkerClickCallback = useCallback((event) => {
    event.preventDefault();
    const feature = event.features && event.features[0];
    if (feature && onMarkerClick) {
      onMarkerClick(feature.properties.id, feature.properties.deviceId);
    }
  }, [onMarkerClick]);

  const onClusterClick = useCatchCallback(async (event) => {
    event.preventDefault();
    const features = map.queryRenderedFeatures(event.point, { layers: [clusters] });
    if (!features || !features.length) return;
    const clusterId = features[0].properties.cluster_id;
    const zoom = await map.getSource(id).getClusterExpansionZoom(clusterId);
    map.easeTo({ center: features[0].geometry.coordinates, zoom });
  }, [clusters]);

  useEffect(() => {
    // add sources
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: mapCluster,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
    }

    if (!map.getSource(selected)) {
      map.addSource(selected, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    // add symbol layers for positions and selected
    [id, selected].forEach((source) => {
      if (!map.getLayer(source)) {
        map.addLayer({
          id: source,
          type: 'symbol',
          source,
          filter: ['!has', 'point_count'],
          layout: {
            'icon-image': ['get', 'category'],
            'icon-size': iconScale,
            'icon-allow-overlap': true,
            'icon-rotate': ['get', 'rotation'],
            'icon-rotation-alignment': 'map',
            'symbol-sort-key': ['get', 'id'],
          },
        });
      }

      map.on('mouseenter', source, onMouseEnter);
      map.on('mouseleave', source, onMouseLeave);
      map.on('click', source, onMarkerClickCallback);
    });

    // Anchor global layer setup
    const anchorSourceId = 'anchor-glob-source';
    if (!map.getSource(anchorSourceId)) {
      map.addSource(anchorSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'anchor-glob-fill',
        type: 'fill',
        source: anchorSourceId,
        paint: {
          'fill-color': 'red',
          'fill-opacity': 0.2,
        },
      });
      map.addLayer({
        id: 'anchor-glob-line',
        type: 'line',
        source: anchorSourceId,
        paint: {
          'line-color': 'red',
          'line-width': 2,
        },
      });
    }

    // clusters
    if (!map.getLayer(clusters)) {
      map.addLayer({
        id: clusters,
        type: 'symbol',
        source: id,
        filter: ['has', 'point_count'],
        layout: {
          'icon-image': 'background',
          'icon-size': iconScale,
          'text-field': '{point_count_abbreviated}',
          'text-font': findFonts(map),
          'text-size': 14,
        },
      });
    }

    map.on('mouseenter', clusters, onMouseEnter);
    map.on('mouseleave', clusters, onMouseLeave);
    map.on('click', clusters, onClusterClick);
    map.on('click', onMapClickCallback);

    return () => {
      try {
        map.off('mouseenter', clusters, onMouseEnter);
        map.off('mouseleave', clusters, onMouseLeave);
        map.off('click', clusters, onClusterClick);
        map.off('click', onMapClickCallback);

        if (map.getLayer(clusters)) map.removeLayer(clusters);

        // Cleanup anchor layers
        if (map.getLayer('anchor-glob-fill')) map.removeLayer('anchor-glob-fill');
        if (map.getLayer('anchor-glob-line')) map.removeLayer('anchor-glob-line');
        if (map.getSource(anchorSourceId)) map.removeSource(anchorSourceId);

        [id, selected].forEach((source) => {
          map.off('mouseenter', source, onMouseEnter);
          map.off('mouseleave', source, onMouseLeave);
          map.off('click', source, onMarkerClickCallback);
          if (map.getLayer(source)) map.removeLayer(source);
          if (map.getSource(source)) map.removeSource(source);
        });
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, [mapCluster, clusters, onMarkerClickCallback, onClusterClick, iconScale, titleField]);

  useEffect(() => {
    [id, selected].forEach((source) => {
      map.getSource(source)?.setData({
        type: 'FeatureCollection',
        features: positions.filter((it) => Object.prototype.hasOwnProperty.call(devices, it.deviceId))
          .filter((it) => {
            if (selectedDeviceId) {
              return source === selected && it.deviceId === selectedDeviceId;
            }
            return source === id;
          })
          .map((position) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [position.longitude, position.latitude] },
            properties: createFeature(devices, position, selectedPosition && selectedPosition.id, geofences),
          })),
      });
    });

    // Update global anchor circles
    // console.log('[DEBUG] Checking anchors for', positions.length, 'positions');
    const anchorFeatures = positions
      .filter((pos) => Object.prototype.hasOwnProperty.call(devices, pos.deviceId))
      .filter((pos) => {
        const device = devices[pos.deviceId];
        const hasAnchorGeofence = device.geofenceIds?.some(id => geofences[id]?.name?.startsWith('Âncora'));
        const isAnchored = device.attributes?.anchor || hasAnchorGeofence;

        if (isAnchored) {
          console.log('[DEBUG] Found anchor for device', device.name, 'GeofenceIds:', device.geofenceIds);
        }
        return isAnchored;
      })
      .map((pos) => {
        const center = [pos.longitude, pos.latitude];
        return circle(center, 0.05, { steps: 64, units: 'kilometers' });
      });

    if (map.getSource('anchor-glob-source')) {
      // console.log('[DEBUG] Updating anchor source with', anchorFeatures.length, 'features');
      map.getSource('anchor-glob-source').setData({
        type: 'FeatureCollection',
        features: anchorFeatures,
      });
      // Ensure layer visibility by moving to top if needed
      // if (map.getLayer('anchor-glob-fill')) map.moveLayer('anchor-glob-fill'); 
      // if (map.getLayer('anchor-glob-line')) map.moveLayer('anchor-glob-line');
    }

  }, [mapCluster, clusters, onMarkerClick, onClusterClick, devices, positions, selectedPosition, iconScale, geofences]);

  return null;
};

export default MapPositions;
