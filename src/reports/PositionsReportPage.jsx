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
import PageLayout from '../common/components/PageLayout';
import ReportsMenu from './components/ReportsMenu';
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
    const threshold = 1; // knots
    const minDuration = 2 * 60 * 1000; // 2 mins
    const result = [];
    let startItem = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.speed <= threshold) {
        if (!startItem) startItem = item;
      } else {
        if (startItem) {
          const startTime = dayjs(startItem.fixTime);
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
        }
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
    <PageLayout menu={<ReportsMenu />} breadcrumbs={['reportTitle', 'reportPositions']}>
      <div className={classes.container}>
        {selectedItem && (
          <div className={classes.containerMap} style={items.length > 0 ? { flexBasis: '100%', height: '100%' } : {}}>
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

            {items.length > 0 && (
              <Box sx={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                <Paper elevation={3} sx={{ borderRadius: 4, px: 2, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton size="small" onClick={() => updateDate(currentDate.subtract(1, 'day'))}>
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant={dayjs().isSame(currentDate, 'day') ? 'contained' : 'text'} onClick={() => updateDate(dayjs())}>
                      {t('reportToday')}
                    </Button>
                    <Button size="small" variant={dayjs().subtract(1, 'day').isSame(currentDate, 'day') ? 'contained' : 'text'} onClick={() => updateDate(dayjs().subtract(1, 'day'))}>
                      {t('reportYesterday')}
                    </Button>
                  </Stack>
                  <Typography variant="body2" sx={{ mx: 1, fontWeight: 500 }}>
                    {currentDate.format('DD/MM/YYYY')}
                  </Typography>
                  <IconButton size="small" onClick={() => updateDate(currentDate.add(1, 'day'))}>
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Paper>
              </Box>
            )}

            {selectedStop && (
              <div style={{ position: 'absolute', top: 60, right: 20, zIndex: 1000 }}>
                <Card elevation={4} sx={{ width: 280, borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ p: 1.5, bgcolor: 'error.main', color: 'error.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Detalhes da Parada</Typography>
                    <IconButton size="small" onClick={() => setSelectedStop(null)} sx={{ color: 'inherit' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Chegada</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {selectedStop.startTime.format('HH:mm:ss')}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Saída</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {selectedStop.endTime.format('HH:mm:ss')}
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Tempo Total</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {Math.floor(selectedStop.duration / 60000)} min
                      </Typography>
                    </Box>
                    {selectedStop.address && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">{t('positionAddress')}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                          {selectedStop.address}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Keeping existing Point Popup but possibly adjusting position if both open? They are independent. */}
            {selectedItem && (
              <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
                <Card elevation={4} sx={{ width: 280, borderRadius: 3, overflow: 'hidden' }}>
                  <Box sx={{ p: 1.5, bgcolor: 'primary.main', color: 'primary.contrastText', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t('reportDetail')}</Typography>
                    <IconButton size="small" onClick={() => setSelectedItem(null)} sx={{ color: 'inherit' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">{t('positionFixTime')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        <PositionValue position={selectedItem} property="fixTime" />
                      </Typography>
                    </Box>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">{t('positionSpeed')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        <PositionValue position={selectedItem} property="speed" />
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{t('positionAddress')}</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                        <PositionValue position={selectedItem} property="address" />
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
        <div className={classes.containerMain} style={items.length > 0 ? { display: 'none' } : {}}>
          <div className={classes.header}>
            <ReportFilter onShow={onShow} onExport={onExport} onSchedule={onSchedule} deviceType="single" loading={loading}>
              <div className={classes.filterItem}>
                <SelectField
                  value={geofenceId}
                  onChange={(e) => {
                    const values = e.target.value ? [e.target.value] : [];
                    updateReportParams(searchParams, setSearchParams, 'geofenceId', values);
                  }}
                  endpoint="/api/geofences"
                  label={t('sharedGeofence')}
                  fullWidth
                />
              </div>
              <ColumnSelect
                columns={columns}
                setColumns={setColumns}
                columnsArray={available}
                rawValues
                disabled={!items.length}
              />
            </ReportFilter>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className={classes.columnAction} />
                {columns.map((key) => (<TableCell key={key}>{positionAttributes[key]?.name || key}</TableCell>))}
                <TableCell className={classes.columnAction} />
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading ? items.slice(0, 4000).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className={classes.columnAction} padding="none">
                    {selectedItem === item ? (
                      <IconButton size="small" onClick={() => setSelectedItem(null)} ref={selectedIcon}>
                        <GpsFixedIcon fontSize="small" />
                      </IconButton>
                    ) : (
                      <IconButton size="small" onClick={() => setSelectedItem(item)}>
                        <LocationSearchingIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                  {columns.map((key) => (
                    <TableCell key={key}>
                      <PositionValue
                        position={item}
                        property={item.hasOwnProperty(key) ? key : null}
                        attribute={item.hasOwnProperty(key) ? null : key}
                      />
                    </TableCell>
                  ))}
                  <TableCell className={classes.actionCellPadding}>
                    <CollectionActions
                      itemId={item.id}
                      endpoint="positions"
                      readonly={readonly}
                      setTimestamp={() => {
                        setItems(items.filter((position) => position.id !== item.id));
                      }}
                    />
                  </TableCell>
                </TableRow>
              )) : (<TableShimmer columns={columns.length + 1} startAction />)}
            </TableBody>
          </Table>
        </div>
      </div>
    </PageLayout>
  );
};

export default PositionsReportPage;
