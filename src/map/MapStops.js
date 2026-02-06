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

        if (!map.getLayer(id)) {
            map.addLayer({
                id,
                type: 'symbol',
                source: id,
                layout: {
                    'text-field': 'P',
                    'text-font': findFonts(map),
                    'text-size': 18,
                    'text-allow-overlap': true,
                    'icon-allow-overlap': true,
                },
                paint: {
                    'text-color': theme.palette.error.main,
                    'text-halo-color': '#ffffff',
                    'text-halo-width': 2,
                },
            });
        }

        const onMouseEnter = () => map.getCanvas().style.cursor = 'pointer';
        const onMouseLeave = () => map.getCanvas().style.cursor = '';

        const onMapClick = (e) => {
            const features = map.queryRenderedFeatures(e.point, { layers: [id] });
            if (features.length) {
                e.preventDefault();
                const index = features[0].properties.index;
                if (onClick && stopsRef.current[index]) {
                    onClick(stopsRef.current[index]);
                }
            }
        };

        map.on('mouseenter', id, onMouseEnter);
        map.on('mouseleave', id, onMouseLeave);
        map.on('click', id, onMapClick);

        return () => {
            map.off('mouseenter', id, onMouseEnter);
            map.off('mouseleave', id, onMouseLeave);
            map.off('click', id, onMapClick);
            if (map.getLayer(id)) map.removeLayer(id);
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
