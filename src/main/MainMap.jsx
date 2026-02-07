import { useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch, useSelector } from 'react-redux';
import MapView from '../map/core/MapView';
import MapSelectedDevice from '../map/main/MapSelectedDevice';
import MapAccuracy from '../map/main/MapAccuracy';
import MapGeofence from '../map/MapGeofence';
import PoiMap from '../map/main/PoiMap';
import MapPadding from '../map/MapPadding';
import { devicesActions } from '../store';
import MapDefaultCamera from '../map/main/MapDefaultCamera';
import MapLiveRoutes from '../map/main/MapLiveRoutes';
import MapPositions from '../map/MapPositions.jsx';
import MapMarkers from '../map/MapMarkers';
import MapScale from '../map/MapScale';
import useFeatures from '../common/util/useFeatures';
import MapSpeedDial from './MapSpeedDial';

const MainMap = ({ filteredPositions, selectedPosition, onEventsClick, devicesOpen }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const desktop = useMediaQuery(theme.breakpoints.up('md'));

  const eventsAvailable = useSelector((state) => !!state.events.items.length);

  const features = useFeatures();

  const onMarkerClick = useCallback((_, deviceId) => {
    dispatch(devicesActions.selectId(deviceId));
  }, [dispatch]);

  return (
    <>
      <MapView>
        <MapGeofence />
        <MapAccuracy positions={filteredPositions} />
        <MapLiveRoutes deviceIds={filteredPositions.map((p) => p.deviceId)} />
        {/* Use performant MapPositions (MapLibre symbol layers) for the full dataset.
            Use DOM markers only for small sets or when a position is explicitly selected
            to keep UI snappy. */}
        <MapPositions
          positions={filteredPositions}
          onMarkerClick={onMarkerClick}
          selectedPosition={selectedPosition}
          showStatus
        />
        {(
          // condition: if few positions or a single selected position, render markers layer
          (filteredPositions.length <= 50) || selectedPosition
        ) && (
            <MapMarkers
              markers={filteredPositions}
              showTitles
            />
          )}
        <MapDefaultCamera />
        <MapSelectedDevice />
        <PoiMap />
        <MapSpeedDial
          eventsAvailable={eventsAvailable}
          onEventsClick={onEventsClick}
          disableEvents={features.disableEvents}
        />
      </MapView>
      <MapScale />
      {desktop && devicesOpen && (
        <MapPadding start={parseInt(theme.dimensions.drawerWidthDesktop, 10) + parseInt(theme.spacing(1.5), 10)} />
      )}
    </>
  );
};

export default MainMap;
