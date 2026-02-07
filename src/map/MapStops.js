import { useId, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import { map } from './core/MapView';
import { findFonts } from './core/mapUtil';

const MapStops = ({ stops, onClick }) => {
    const id = useId();
    const theme = useTheme();
    const stopsRef = useRef(stops);

    useEffect(() => {
        stopsRef.current = stops;
    }, [stops]);

    useEffect(() => {
        if (!map) return;

        if (!map.getSource(id)) {
            map.addSource(id, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [],
                },
            });
        }

        if (!map.getLayer(`${id}-circle`)) {
            map.addLayer({
                id: `${id}-circle`,
                type: 'circle',
                source: id,
                paint: {
                    'circle-radius': 12,
                    'circle-color': '#1E88E5', // Blue color for Parking
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff',
                },
            });
        }

        if (!map.getLayer(id)) {
            map.addLayer({
                id,
                type: 'symbol',
                source: id,
                layout: {
                    'text-field': 'P',
                    'text-font': findFonts(map),
                    'text-size': 12,
                    'text-allow-overlap': true,
                    'icon-allow-overlap': true,
                },
                paint: {
                    'text-color': '#ffffff',
                },
            });
        }

        const onMouseEnter = () => map.getCanvas().style.cursor = 'pointer';
        const onMouseLeave = () => map.getCanvas().style.cursor = '';

        const onMapClick = (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [`${id}-circle`, id] });
            if (features.length) {
                e.preventDefault();
                const index = features[0].properties.index;
                onClick(stopsRef.current[index]);
            }
        };

        map.on('mouseenter', `${id}-circle`, onMouseEnter);
        map.on('mouseleave', `${id}-circle`, onMouseLeave);
        map.on('click', `${id}-circle`, onMapClick);
        map.on('click', id, onMapClick);

        return () => {
            map.off('mouseenter', `${id}-circle`, onMouseEnter);
            map.off('mouseleave', `${id}-circle`, onMouseLeave);
            map.off('click', `${id}-circle`, onMapClick);
            map.off('click', id, onMapClick);
            if (map.getLayer(id)) map.removeLayer(id);
            if (map.getLayer(`${id}-circle`)) map.removeLayer(`${id}-circle`);
            if (map.getSource(id)) map.removeSource(id);
        };
    }, [id, theme, onClick]);

    useEffect(() => {
        const source = map.getSource(id);
        if (source) {
            source.setData({
                type: 'FeatureCollection',
                features: stops.map((stop, index) => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [stop.longitude, stop.latitude],
                    },
                    properties: {
                        index,
                    },
                })),
            });
        }
    }, [stops, id]);

    return null;
};

export default MapStops;
