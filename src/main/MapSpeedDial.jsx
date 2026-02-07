import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import {
    SpeedDial, SpeedDialAction, SpeedDialIcon, Dialog, DialogContent,
    TextField, List, ListItem, ListItemText, Menu, MenuItem, IconButton, Typography
} from '@mui/material';
import {
    Add, Remove, Layers, MyLocation, Search, Notifications, Close, Map as MapIcon
} from '@mui/icons-material';
import maplibregl from 'maplibre-gl';
import { map } from '../map/core/MapView'; // Correct path based on MainMap location
import { useAttributePreference, usePreference } from '../common/util/preferences';
import usePersistedState, { savePersistedState } from '../common/util/usePersistedState';
import useMapStyles from '../map/core/useMapStyles';
import { useDispatch } from 'react-redux';
import { errorsActions } from '../store';
import useMediaQuery from '@mui/material/useMediaQuery';

const MapSpeedDial = ({ onEventsClick, eventsAvailable, disableEvents }) => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const fullScreen = useMediaQuery(theme.breakpoints.down('md'));

    // Logic for Location (GeolocateControl)
    const geolocateControlRef = useRef(null);

    useEffect(() => {
        if (!geolocateControlRef.current) {
            // Create control but don't add to map visually (or add and hide)
            // To work properly, it MUST be added to map.
            const control = new maplibregl.GeolocateControl({
                positionOptions: { enableHighAccuracy: true, timeout: 5000 },
                trackUserLocation: true,
                showUserLocation: true
            });
            map.addControl(control, 'top-right');

            // Hide the default button
            const container = map.getContainer();
            const btn = container.querySelector('.maplibregl-ctrl-geolocate');
            if (btn) btn.style.display = 'none';

            geolocateControlRef.current = control;
        }
        return () => {
            if (geolocateControlRef.current) {
                map.removeControl(geolocateControlRef.current);
                geolocateControlRef.current = null;
            }
        }
    }, []);

    const handleLocation = () => {
        if (geolocateControlRef.current) {
            geolocateControlRef.current.trigger();
        }
    };

    // Logic for Layers
    const [layersAnchorPos, setLayersAnchorPos] = useState(null);
    const mapStyles = useMapStyles();
    const activeMapStyles = useAttributePreference('activeMapStyles', 'locationIqStreets,locationIqDark,openFreeMap');
    const [defaultMapStyle, setDefaultMapStyle] = usePersistedState('selectedMapStyle', usePreference('map', 'locationIqStreets'));

    const handleLayersOpen = (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setLayersAnchorPos({ top: rect.bottom, left: rect.left });
    };

    const handleLayersClose = () => {
        setLayersAnchorPos(null);
    };

    const handleLayerSelect = (styleId) => {
        const style = mapStyles.find(s => s.id === styleId);
        if (style) {
            map.setStyle(style.style, { diff: false });
            // map.setTransformRequest(style.transformRequest); 
            savePersistedState('selectedMapStyle', styleId);
            setDefaultMapStyle(styleId);
        }
        handleLayersClose();
    };

    const filteredStyles = mapStyles.filter((s) => s.available && activeMapStyles.includes(s.id));
    const availableStyles = filteredStyles.length ? filteredStyles : mapStyles.filter((s) => s.id === 'osm');

    // Logic for Search
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearchOpen = () => setSearchOpen(true);
    const handleSearchClose = () => {
        setSearchOpen(false);
        setSearchResults([]);
        setSearchQuery('');
        setDebouncedQuery('');
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    useEffect(() => {
        const executeSearch = async () => {
            if (!debouncedQuery) {
                setSearchResults([]);
                return;
            }
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${debouncedQuery}&format=geojson&polygon_geojson=1&addressdetails=1`);
                if (response.ok) {
                    const geojson = await response.json();
                    setSearchResults(geojson.features || []);
                }
            } catch (e) {
                dispatch(errorsActions.push(e.message));
            }
        };
        executeSearch();
    }, [debouncedQuery, dispatch]);

    const handleResultClick = (feature) => {
        const center = [
            feature.bbox[0] + (feature.bbox[2] - feature.bbox[0]) / 2,
            feature.bbox[1] + (feature.bbox[3] - feature.bbox[1]) / 2,
        ];
        map.flyTo({ center: center, zoom: 14 });
        handleSearchClose();
    };

    const actions = [
        { icon: <Add />, name: 'Zoom In', onClick: () => map.zoomIn() },
        { icon: <Remove />, name: 'Zoom Out', onClick: () => map.zoomOut() },
        { icon: <Layers />, name: 'Camadas', onClick: handleLayersOpen },
        { icon: <MyLocation />, name: 'Localização', onClick: handleLocation },
        { icon: <Search />, name: 'Buscar', onClick: handleSearchOpen },
        ...(!disableEvents ? [{ icon: <Notifications color={eventsAvailable ? 'error' : 'inherit'} />, name: 'Notificações', onClick: onEventsClick }] : []),
    ];

    return (
        <>
            <SpeedDial
                ariaLabel="Map Controls"
                sx={{ position: 'absolute', top: 16, right: 16 }}
                icon={<SpeedDialIcon />}
                direction="down"
            >
                {actions.map((action) => (
                    <SpeedDialAction
                        key={action.name}
                        icon={action.icon}
                        tooltipTitle={action.name}
                        onClick={action.onClick}
                    />
                ))}
            </SpeedDial>

            {/* Layers Menu */}
            <Menu
                anchorReference="anchorPosition"
                anchorPosition={layersAnchorPos}
                open={Boolean(layersAnchorPos)}
                onClose={handleLayersClose}
            >
                {availableStyles.map((style) => (
                    <MenuItem
                        key={style.id}
                        onClick={() => handleLayerSelect(style.id)}
                        selected={style.id === defaultMapStyle}
                    >
                        <ListItemText primary={style.title} />
                    </MenuItem>
                ))}
            </Menu>

            {/* Search Dialog */}
            <Dialog
                open={searchOpen}
                onClose={handleSearchClose}
                fullWidth
                maxWidth="sm"
                fullScreen={fullScreen && window.innerWidth < 600}
            >
                <DialogContent>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                        <TextField
                            autoFocus
                            margin="dense"
                            label="Buscar endereço"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                            }}
                        />
                        <IconButton onClick={handleSearchClose}>
                            <Close />
                        </IconButton>
                    </div>
                    <List>
                        {searchResults.map((feature, index) => (
                            <ListItem button key={index} onClick={() => handleResultClick(feature)}>
                                <ListItemText primary={feature.properties.display_name} />
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default MapSpeedDial;
