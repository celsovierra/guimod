import {
  Fragment, useCallback, useEffect, useRef, useState, useMemo,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  IconButton, Table, TableBody, TableCell, TableHead, TableRow, Card, CardContent, Typography, Box, Divider, Paper, Stack, Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import dayjs from 'dayjs';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import LocationSearchingIcon from '@mui/icons-material/LocationSearching';
import ReportFilter, { updateReportParams } from './components/ReportFilter';
import { useTranslation } from '../common/components/LocalizationProvider';
import PositionValue from '../common/components/PositionValue';
import ColumnSelect from './components/ColumnSelect';
import usePositionAttributes from '../common/attributes/usePositionAttributes';
import { useCatch } from '../reactHelper';
import MapView from '../map/core/MapView';
import MapRoutePath from '../map/MapRoutePath';
import MapRoutePoints from '../map/MapRoutePoints';
import MapPositions from '../map/MapPositions.jsx';
import MapStops from '../map/MapStops';
import useReportStyles from './common/useReportStyles';
import TableShimmer from '../common/components/TableShimmer';
import MapCamera from '../map/MapCamera';
import MapGeofence from '../map/MapGeofence';
import scheduleReport from './common/scheduleReport';
import MapScale from '../map/MapScale';
import { useRestriction } from '../common/util/permissions';
import CollectionActions from '../settings/components/CollectionActions';
import fetchOrThrow from '../common/util/fetchOrThrow';
import SelectField from '../common/components/SelectField';

const PositionsReportPage = () => {
  const navigate = useNavigate();
  const { classes } = useReportStyles();
  const t = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();

  const positionAttributes = usePositionAttributes(t);

  const readonly = useRestriction('readonly');

  const [available, setAvailable] = useState([]);
  const [columns, setColumns] = useState(['fixTime', 'latitude', 'longitude', 'speed', 'address']);
  const [items, setItems] = useState([]);
  const geofenceId = searchParams.has('geofenceId') ? parseInt(searchParams.get('geofenceId')) : null;
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStop, setSelectedStop] = useState(null);

  const stops = useMemo(() => {
    // Thresholds
    const minDuration = 5 * 60 * 1000; // 5 minutes
    const result = [];

    let startItem = null;
    let startTime = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const ignition = item?.attributes?.ignition;

      // STRICT logic: Stop is ONLY potential if Ignition is EXPLICITLY FALSE.
      // If ignition is true or undefined, it's not a valid "Stop" by these rules.
      if (ignition === false) {
        if (!startItem) {
          startItem = item;
          startTime = dayjs(item.fixTime);
        }
      } else {
        // Ignition ON (true) or Missing (undefined) -> Stop ended or never started
        if (startItem) {
          const endTime = dayjs(items[i - 1].fixTime);
          const duration = endTime.diff(startTime);

          if (duration >= minDuration) {
            result.push({
              ...startItem,
              startTime: startTime,
              endTime: endTime,
              duration: duration,
              address: startItem.address
            });
          }
          startItem = null;
          startTime = null;
        }
      }
    }

    // Check if the route ENDS in a stop
    if (startItem) {
      const endTime = dayjs(items[items.length - 1].fixTime);
      const duration = endTime.diff(startTime);
      if (duration >= minDuration) {
        result.push({
          ...startItem,
          startTime: startTime,
          endTime: endTime,
          duration: duration,
          address: startItem.address
        });
      }
    }

    return result;
  }, [items]);

  const updateDate = (newDate) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('from', newDate.startOf('day').toISOString());
    newParams.set('to', newDate.endOf('day').toISOString());
    setSearchParams(newParams, { replace: true });
  };

  const from = searchParams.get('from');
  const currentDate = from ? dayjs(from) : dayjs();

  const selectedIcon = useRef();

  useEffect(() => {
    if (selectedIcon.current) {
      selectedIcon.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [selectedIcon.current]);

  const onMapPointClick = useCallback((positionId) => {
    setSelectedItem(items.find((it) => it.id === positionId));
  }, [items, setSelectedItem]);

  const onShow = useCatch(async ({ deviceIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    if (geofenceId) {
      query.append('geofenceId', geofenceId)
    }
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    setLoading(true);
    try {
      const response = await fetchOrThrow(`/api/positions?${query.toString()}`, {
        headers: { Accept: 'application/json' },
      });
      const data = await response.json();
      const keySet = new Set();
      const keyList = [];
      data.forEach((position) => {
        Object.keys(position).forEach((it) => keySet.add(it));
        Object.keys(position.attributes).forEach((it) => keySet.add(it));
      });
      ['id', 'deviceId', 'outdated', 'network', 'attributes'].forEach((key) => keySet.delete(key));
      Object.keys(positionAttributes).forEach((key) => {
        if (keySet.has(key)) {
          keyList.push(key);
          keySet.delete(key);
        }
      });
      setAvailable([...keyList, ...keySet].map((key) => [key, positionAttributes[key]?.name || key]));
      setItems(data);
    } finally {
      setLoading(false);
    }
  });

  const onExport = useCatch(async ({ deviceIds, from, to }) => {
    const query = new URLSearchParams({ from, to });
    if (geofenceId) {
      query.append('geofenceId', geofenceId)
    }
    deviceIds.forEach((deviceId) => query.append('deviceId', deviceId));
    window.location.assign(`/api/positions/csv?${query.toString()}`);
  });

  const onSchedule = useCatch(async (deviceIds, groupIds, report) => {
    report.type = 'route';
    await scheduleReport(deviceIds, groupIds, report);
    navigate('/reports/scheduled');
  });

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      <div className={classes.container} style={{ height: '100%', width: '100%' }}>
        <div className={classes.containerMap} style={{ flex: 1, position: 'relative', height: '100%' }}>
          <MapView>
            <MapGeofence />
            {[...new Set(items.map((it) => it.deviceId))].map((deviceId) => {
              const positions = items.filter((position) => position.deviceId === deviceId);
              return (
                <Fragment key={deviceId}>
                  <MapRoutePath positions={positions} />
                  <MapRoutePoints positions={positions} onClick={onMapPointClick} />
                </Fragment>
              );
            })}
            <MapPositions positions={[selectedItem]} titleField="fixTime" />
            <MapStops stops={stops} onClick={setSelectedStop} />
          </MapView>
          <MapScale />
          <MapCamera positions={items} />

          {/* Top Filter Bar Overlaid */}
          <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16, zIndex: 1000, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
            <Paper elevation={4} sx={{ pointerEvents: 'auto', p: 1.5, borderRadius: '12px', display: 'flex', gap: 2, alignItems: 'center', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', maxWidth: '95%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
              <ReportFilter onShow={onShow} onExport={onExport} onSchedule={onSchedule} deviceType="single" loading={loading} ignoreFormStyles />
            </Paper>
          </Box>

          {selectedStop && (
            <div style={{ position: 'absolute', top: 100, right: 20, zIndex: 1000 }}>
              <Card elevation={6} sx={{ width: 300, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Box sx={{
                  p: 2,
                  background: 'linear-gradient(135deg, #1E88E5 0%, #42A5F5 100%)', // Blue gradient
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Detalhes da Parada</Typography>
                  <IconButton size="small" onClick={() => setSelectedStop(null)} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                <CardContent sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(5px)' }}>
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Data</Typography>
                      <Typography variant="body2" fontWeight="600">{selectedStop.startTime.format('DD/MM/YYYY')}</Typography>
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Início</Typography>
                      <Typography variant="body2" fontWeight="600">{selectedStop.startTime.format('HH:mm:ss')}</Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Fim</Typography>
                      <Typography variant="body2" fontWeight="600">{selectedStop.endTime.format('HH:mm:ss')}</Typography>
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">Tempo Total</Typography>
                      <Chip label={`${Math.floor(selectedStop.duration / 60000)} min`} size="small" color="primary" variant="outlined" sx={{ fontWeight: 'bold' }} />
                    </Box>
                    {selectedStop.address && (
                      <Box sx={{ mt: 1, bgcolor: '#f5f5f5', p: 1, borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>{t('positionAddress')}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>{selectedStop.address}</Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedItem && (
            <div style={{ position: 'absolute', top: 100, right: selectedStop ? 340 : 20, zIndex: 1000, transition: 'right 0.3s' }}>
              <Card elevation={6} sx={{ width: 300, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                <Box sx={{
                  p: 2,
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  color: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Detalhes do Ponto</Typography>
                  <IconButton size="small" onClick={() => setSelectedItem(null)} sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' } }}>
                    <CloseIcon />
                  </IconButton>
                </Box>
                <CardContent sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(5px)' }}>
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">{t('positionFixTime')}</Typography>
                      <Typography variant="body2" fontWeight="600"><PositionValue position={selectedItem} property="fixTime" /></Typography>
                    </Box>
                    <Divider />
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">{t('positionSpeed')}</Typography>
                      <Typography variant="body2" fontWeight="600"><PositionValue position={selectedItem} property="speed" /></Typography>
                    </Box>
                    <Box sx={{ mt: 1, bgcolor: '#f5f5f5', p: 1, borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 0.5 }}>{t('positionAddress')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                        <PositionValue position={selectedItem} property="address" />
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PositionsReportPage;
