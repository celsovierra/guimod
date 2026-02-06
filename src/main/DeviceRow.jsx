import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';
import {
  IconButton, Tooltip, Avatar, ListItemAvatar, ListItemText, ListItemButton,
  Typography,
} from '@mui/material';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import Battery60Icon from '@mui/icons-material/Battery60';
import BatteryCharging60Icon from '@mui/icons-material/BatteryCharging60';
import Battery20Icon from '@mui/icons-material/Battery20';
import BatteryCharging20Icon from '@mui/icons-material/BatteryCharging20';
import ErrorIcon from '@mui/icons-material/Error';
import LockIcon from '@mui/icons-material/Lock';
import AnchorIcon from '@mui/icons-material/Anchor';
import KeyIcon from '@mui/icons-material/Key';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { devicesActions } from '../store';
import {
  formatAlarm, formatBoolean, formatPercentage, formatStatus, getStatusColor,
} from '../common/util/formatter';
import { useTranslation } from '../common/components/LocalizationProvider';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { useAdministrator } from '../common/util/permissions';
import EngineIcon from '../resources/images/data/engine.svg?react';
import { useAttributePreference } from '../common/util/preferences';
import GeofencesValue from '../common/components/GeofencesValue';
import DriverValue from '../common/components/DriverValue';
import { events } from '../common/util/EventBus';

dayjs.extend(relativeTime);

const useStyles = makeStyles()((theme) => ({
  itemContainer: {
    padding: theme.spacing(0.5, 1),
  },
  item: {
    borderRadius: theme.spacing(1.5),
    marginBottom: theme.spacing(0.75),
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    transition: 'all 0.2s ease',
    '&:hover': {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
      borderColor: '#0055b8',
    },
    '&.selected': {
      backgroundColor: '#e3f2fd',
      borderLeft: `4px solid #0055b8`,
      boxShadow: '0 4px 12px rgba(0, 85, 184, 0.15)',
    },
  },
  avatar: {
    width: 50,
    height: 50,
    backgroundColor: '#f0f0f0',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #e0e0e0',
    overflow: 'hidden',
  },
  icon: {
    width: '32px',
    height: '32px',
    filter: 'brightness(0) invert(1)',
  },
  vehicleImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '50%',
  },
  batteryText: {
    fontSize: '0.75rem',
    fontWeight: 'normal',
    lineHeight: '0.875rem',
  },
  primaryText: {
    fontWeight: 700,
    fontSize: '0.95rem',
    color: '#001d3d',
  },
  secondaryText: {
    fontSize: '0.8rem',
    color: '#666666',
  },
  statusOnline: {
    color: '#2e7d32',
    fontWeight: 600,
  },
  statusOffline: {
    color: '#c62828',
    fontWeight: 600,
  },
  statusInactive: {
    color: '#f57c00',
    fontWeight: 600,
  },
  success: {
    color: '#2e7d32',
  },
  warning: {
    color: '#f57c00',
  },
  error: {
    color: '#c62828',
  },
  neutral: {
    color: '#999999',
  },
  iconsContainer: {
    display: 'flex',
    gap: theme.spacing(0.5),
    alignItems: 'center',
  },
  '@keyframes pulse': {
    '0%': { opacity: 1 },
    '50%': { opacity: 0.4 },
    '100%': { opacity: 1 },
  },
  pulseIcon: {
    animation: '$pulse 1s infinite ease-in-out',
  },
  iconRed: {
    color: '#ff0000',
  },
  iconBlue: {
    color: '#007bff',
  },
  iconMoving: {
    filter: 'brightness(0) invert(9%) sepia(96%) saturate(7432%) hue-rotate(248deg) brightness(100%) contrast(145%)',
  },
  statusMoving: {
    color: '#0000FF',
    fontWeight: 600,
    animation: '$pulseText 1.5s infinite ease-in-out',
  },
  '@keyframes pulseText': {
    '0%': { textShadow: '0 0 0px #0000FF' },
    '50%': { textShadow: '0 0 8px #0000FF' },
    '100%': { textShadow: '0 0 0px #0000FF' },
  },
}));

const DeviceRow = ({ devices, index, style }) => {
  const { classes, cx } = useStyles();
  const dispatch = useDispatch();
  const t = useTranslation();

  const admin = useAdministrator();
  const selectedDeviceId = useSelector((state) => state.devices.selectedId);
  const geofences = useSelector((state) => state.geofences.items);

  const item = devices[index];
  const position = useSelector((state) => state.session.positions[item.id]);

  const [localAnchorState, setLocalAnchorState] = useState(null);
  const [imageError, setImageError] = useState(false);
  const [now, setNow] = useState(dayjs());
  const vehicleImage = item.attributes?.photo || item.attributes?.image || item.attributes?.deviceImage;

  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [vehicleImage, item.id]);

  useEffect(() => {
    const onDrawAnchor = ({ deviceId }) => {
      if (deviceId === item.id) setLocalAnchorState(true);
    };
    const onRemoveAnchor = ({ deviceId }) => {
      if (deviceId === item.id) setLocalAnchorState(false);
    };
    const removeDraw = events.on('draw-anchor', onDrawAnchor);
    const removeUndraw = events.on('remove-anchor', onRemoveAnchor);
    return () => {
      removeDraw();
      removeUndraw();
    };
  }, [item.id]);

  const devicePrimary = useAttributePreference('devicePrimary', 'name');
  const deviceSecondary = useAttributePreference('deviceSecondary', '');

  const resolveFieldValue = (field) => {
    if (field === 'geofenceIds') {
      const geofenceIds = position?.geofenceIds;
      return geofenceIds?.length ? <GeofencesValue geofenceIds={geofenceIds} /> : null;
    }
    if (field === 'driverUniqueId') {
      const driverUniqueId = position?.attributes?.driverUniqueId;
      return driverUniqueId ? <DriverValue driverUniqueId={driverUniqueId} /> : null;
    }
    return item[field];
  };

  const primaryValue = resolveFieldValue(devicePrimary);
  const secondaryValue = resolveFieldValue(deviceSecondary);

  const formatDuration = (ms) => {
    const d = dayjs.duration(ms);
    const days = Math.floor(d.asDays());
    const hours = d.hours();
    const minutes = d.minutes();

    const parts = [];
    if (days > 0) parts.push(`${days} dias`);
    if (hours > 0) parts.push(`${hours} horas`);
    parts.push(`${minutes} min`);

    return parts.join(', ').replace(/, ([^,]*)$/, ' e $1');
  };

  const secondaryText = () => {
    let status;
    let statusClass;
    if (item.status === 'online' || !item.lastUpdate) {
      const speed = position?.speed || 0;
      const ignition = position?.attributes?.ignition;

      // Logic: Ignition ON
      if (ignition) {
        if (speed > 0) {
          status = 'Movendo';
          statusClass = classes.statusMoving;
        } else {
          status = 'Ligado';
          statusClass = classes.statusOnline; // Green
        }
      }
      // Logic: Ignition OFF (Stopped)
      else {
        // Prefer server-computed duration, else fallback to time since last fix (sleep time)
        let diffMs = 0;
        if (position?.attributes?.duration) {
          diffMs = position.attributes.duration;
        } else if (position?.attributes?.parkingTime) {
          diffMs = position.attributes.parkingTime;
        } else if (position?.fixTime) {
          diffMs = now.diff(dayjs(position.fixTime));
        }

        // Safety check for negative diffs
        if (diffMs < 0) diffMs = 0;

        status = `Tempo Parado: ${formatDuration(diffMs)}`;
        statusClass = classes.statusOnline; // Green (as requested to keep it clean, or use neutral)
      }
    } else {
      status = dayjs(item.lastUpdate).fromNow();
      statusClass = classes.statusInactive;
    }
    return (
      <>
        {secondaryValue && (<>{secondaryValue}{' • '}</>)}
        <span className={statusClass}>{status}</span>
      </>
    );
  };

  const isLocked = item.attributes?.blocked || item.attributes?.out1 || position?.attributes?.blocked || position?.attributes?.out1;
  const hasAnchorGeofence = item.geofenceIds?.some(id => geofences && geofences[id]?.name?.startsWith('Âncora'));

  // Logic: Local state overrides if available, otherwise fallback to DB integrity check
  const isAnchored = localAnchorState !== null ? localAnchorState : (item.attributes?.anchor || hasAnchorGeofence);

  return (
    <div style={style} className={classes.itemContainer}>
      <ListItemButton
        key={item.id}
        onClick={() => dispatch(devicesActions.selectId(item.id))}
        disabled={!admin && item.disabled}
        selected={selectedDeviceId === item.id}
        className={`${classes.item} ${selectedDeviceId === item.id ? 'selected' : ''}`}
        sx={{
          '&.selected': {
            backgroundColor: '#e3f2fd',
            borderLeft: '4px solid #0055b8',
            boxShadow: '0 4px 12px rgba(0, 85, 184, 0.15)',
          },
        }}
      >
        <ListItemAvatar>
          <Avatar className={classes.avatar}>
            {vehicleImage && !imageError ? (
              <img
                className={classes.vehicleImage}
                src={vehicleImage}
                alt=""
                onError={() => setImageError(true)}
              />
            ) : (
              <img className={cx(classes.icon, { [classes.iconMoving]: position && position.speed > 0 })} src={mapIcons[mapIconKey(item.category)]} alt="" />
            )}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis' }}>{primaryValue}</span>
              {position && position.attributes.hasOwnProperty('ignition') && (
                <KeyIcon
                  style={{
                    fontSize: 16,
                    color: position.attributes.ignition ? '#2e7d32' : '#c62828'
                  }}
                />
              )}
            </div>
          }
          secondary={secondaryText()}
          slots={{
            primary: Typography,
            secondary: Typography,
          }}
          slotProps={{
            primary: {
              noWrap: true,
              className: classes.primaryText,
              component: 'div',
            },
            secondary: {
              noWrap: true,
              className: classes.secondaryText,
            },
          }}
        />
        {/* Status Icons Container */}
        <div className={classes.iconsContainer}>
          {/* Lock Indicator */}
          {isLocked && (
            <Tooltip title={t('lock')}>
              <IconButton size="small" sx={{ padding: '4px' }}>
                <LockIcon fontSize="small" className={cx(classes.iconRed, classes.pulseIcon)} />
              </IconButton>
            </Tooltip>
          )}

          {/* Anchor Indicator */}
          {isAnchored && (
            <Tooltip title={t('anchor')}>
              <IconButton size="small" sx={{ padding: '4px' }}>
                <AnchorIcon fontSize="small" className={cx(classes.iconBlue, classes.pulseIcon)} />
              </IconButton>
            </Tooltip>
          )}

          {position && (
            <>
              {position.attributes.hasOwnProperty('alarm') && (
                <Tooltip title={`${t('eventAlarm')}: ${formatAlarm(position.attributes.alarm, t)}`}>
                  <IconButton size="small" sx={{ padding: '4px' }}>
                    <ErrorIcon fontSize="small" className={classes.error} />
                  </IconButton>
                </Tooltip>
              )}
              {position.attributes.hasOwnProperty('ignition') && (
                <Tooltip title={`${t('positionIgnition')}: ${formatBoolean(position.attributes.ignition, t)}`}>
                  <IconButton size="small" sx={{ padding: '4px' }}>
                    {position.attributes.ignition ? (
                      <EngineIcon width={18} height={18} className={classes.success} />
                    ) : (
                      <EngineIcon width={18} height={18} className={classes.neutral} />
                    )}
                  </IconButton>
                </Tooltip>
              )}
              {position.attributes.hasOwnProperty('batteryLevel') && (
                <Tooltip title={`${t('positionBatteryLevel')}: ${formatPercentage(position.attributes.batteryLevel)}`}>
                  <IconButton size="small" sx={{ padding: '4px' }}>
                    {(position.attributes.batteryLevel > 70 && (
                      position.attributes.charge
                        ? (<BatteryChargingFullIcon fontSize="small" className={classes.success} />)
                        : (<BatteryFullIcon fontSize="small" className={classes.success} />)
                    )) || (position.attributes.batteryLevel > 30 && (
                      position.attributes.charge
                        ? (<BatteryCharging60Icon fontSize="small" className={classes.warning} />)
                        : (<Battery60Icon fontSize="small" className={classes.warning} />)
                    )) || (
                        position.attributes.charge
                          ? (<BatteryCharging20Icon fontSize="small" className={classes.error} />)
                          : (<Battery20Icon fontSize="small" className={classes.error} />)
                      )}
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </div>
      </ListItemButton>
    </div>
  );
};

export default DeviceRow;
