import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Button, FormControlLabel, Switch, Box, Avatar, Typography, Paper, Divider
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import BadgeIcon from '@mui/icons-material/Badge';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { useTheme } from '@mui/material/styles';
import { makeStyles } from 'tss-react/mui';
import { useEffectAsync } from '../reactHelper';
import { useTranslation } from '../common/components/LocalizationProvider';
import PageLayout from '../common/components/PageLayout';
import SettingsMenu from './components/SettingsMenu';
import CollectionFab from './components/CollectionFab';
import CollectionActions from './components/CollectionActions';
import TableShimmer from '../common/components/TableShimmer';
import SearchHeader, { filterByKeyword } from './components/SearchHeader';
import { formatAddress, formatStatus, formatTime } from '../common/util/formatter';
import { useDeviceReadonly, useManager } from '../common/util/permissions';
import { usePreference } from '../common/util/preferences';
import useSettingsStyles from './common/useSettingsStyles';
import DeviceUsersValue from './components/DeviceUsersValue';
import usePersistedState from '../common/util/usePersistedState';
import fetchOrThrow from '../common/util/fetchOrThrow';
import AddressValue from '../common/components/AddressValue';
import exportExcel from '../common/util/exportExcel';
import { mapIconKey, mapIcons } from '../map/core/preloadImages';
import { devicesActions } from '../store';

const useStyles = makeStyles()((theme) => ({
  container: {
    padding: theme.spacing(2),
  },
  controls: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(0, 2, 2),
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(1.5),
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    borderLeft: '5px solid transparent', // Base for status border
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
  },
  statusOnline: { borderLeftColor: theme.palette.success.main },
  statusOffline: { borderLeftColor: theme.palette.error.main },
  statusUnknown: { borderLeftColor: theme.palette.warning.main },

  avatarContainer: {
    marginRight: theme.spacing(2),
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: theme.palette.grey[100],
    border: `1px solid ${theme.palette.grey[200]}`,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    padding: 4,
  },
  content: {
    flexGrow: 1,
    minWidth: 0, // Crucial for text truncation
  },
  titleRow: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  deviceName: {
    fontWeight: 700,
    fontSize: '1rem',
    marginRight: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  detailsRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    color: theme.palette.text.secondary,
    fontSize: '0.8125rem',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  detailIcon: {
    fontSize: '1rem',
    opacity: 0.7,
  },
  actions: {
    marginLeft: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
  },
}));

const DevicesPage = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const t = useTranslation();

  const groups = useSelector((state) => state.groups.items);

  const manager = useManager();
  const deviceReadonly = useDeviceReadonly();
  const coordinateFormat = usePreference('coordinateFormat');

  const positions = useSelector((state) => state.session.positions);

  const [timestamp, setTimestamp] = useState(Date.now());
  const [items, setItems] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAll, setShowAll] = usePersistedState('showAllDevices', false);
  const [loading, setLoading] = useState(false);

  useEffectAsync(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ all: showAll });
      const response = await fetchOrThrow(`/api/devices?${query.toString()}`);
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  }, [timestamp, showAll]);

  const handleExport = async () => {
    const data = items.filter(filterByKeyword(searchKeyword)).map((item) => ({
      [t('sharedName')]: item.name,
      [t('deviceIdentifier')]: item.uniqueId,
      [t('groupParent')]: item.groupId ? groups[item.groupId]?.name : null,
      [t('sharedPhone')]: item.phone,
      [t('deviceModel')]: item.model,
      [t('deviceContact')]: item.contact,
      [t('userExpirationTime')]: formatTime(item.expirationTime, 'date'),
      [t('deviceStatus')]: formatStatus(item.status, t),
      [t('deviceLastUpdate')]: formatTime(item.lastUpdate, 'minutes'),
      [t('positionAddress')]: positions[item.id] ? formatAddress(positions[item.id], coordinateFormat) : '',
    }));
    const sheets = new Map();
    sheets.set(t('deviceTitle'), data);
    await exportExcel(t('deviceTitle'), 'devices.xlsx', sheets, theme);
  };

  const handleClick = (deviceId) => {
    dispatch(devicesActions.selectId(deviceId));
    navigate('/');
  };

  const actionConnections = {
    key: 'connections',
    title: t('sharedConnections'),
    icon: <LinkIcon fontSize="small" />,
    handler: (deviceId) => navigate(`/settings/device/${deviceId}/connections`),
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'online': return classes.statusOnline;
      case 'offline': return classes.statusOffline;
      default: return classes.statusUnknown;
    }
  };

  const getVehicleIcon = (item) => {
    const iconKey = mapIconKey(item.category);
    const icon = mapIcons[iconKey];
    if (icon) {
      return typeof icon === 'string' ? icon : (icon.src || icon.default);
    }
    return null;
  };

  return (
    <PageLayout menu={<SettingsMenu />} breadcrumbs={['settingsTitle', 'deviceTitle']}>
      <SearchHeader keyword={searchKeyword} setKeyword={setSearchKeyword} />

      <div className={classes.controls}>
        <Button onClick={handleExport} variant="text" size="small">{t('reportExport')}</Button>
        <FormControlLabel
          control={(
            <Switch
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              size="small"
            />
          )}
          label={t('notificationAlways')}
          labelPlacement="start"
          disabled={!manager}
          componentsProps={{ typography: { variant: 'body2' } }}
        />
      </div>

      <Box className={classes.container}>
        {!loading ? items.filter(filterByKeyword(searchKeyword)).map((item) => {
          const vehicleSrc = getVehicleIcon(item);
          return (
            <Paper
              key={item.id}
              className={`${classes.listItem} ${getStatusClass(item.status)}`}
              elevation={0}
              onClick={() => handleClick(item.id)}
            >
              <div className={classes.avatarContainer}>
                <Avatar className={classes.avatar}>
                  {vehicleSrc ? (
                    <img src={vehicleSrc} alt="" className={classes.avatarImg} />
                  ) : (
                    <DirectionsCarIcon color="action" />
                  )}
                </Avatar>
              </div>

              <div className={classes.content}>
                <div className={classes.titleRow}>
                  <Typography className={classes.deviceName} noWrap>{item.name}</Typography>
                </div>

                <div className={classes.detailsRow}>
                  <div className={classes.detailItem} title={t('deviceIdentifier')}>
                    <BadgeIcon className={classes.detailIcon} />
                    <span>{item.uniqueId}</span>
                  </div>
                  {item.phone && (
                    <div className={classes.detailItem} title={t('sharedPhone')}>
                      <SmartphoneIcon className={classes.detailIcon} />
                      <span>{item.phone}</span>
                    </div>
                  )}
                  {positions[item.id] && (
                    <Typography variant="caption" noWrap sx={{ maxWidth: 200, display: { xs: 'none', sm: 'block' } }}>
                      {formatAddress(positions[item.id], coordinateFormat)}
                    </Typography>
                  )}
                </div>
              </div>

              <div className={classes.actions} onClick={(e) => e.stopPropagation()}>
                <CollectionActions
                  itemId={item.id}
                  editPath="/settings/device"
                  endpoint="devices"
                  setTimestamp={setTimestamp}
                  customActions={[actionConnections]}
                  readonly={deviceReadonly}
                />
              </div>
            </Paper>
          );
        }) : (
          <TableShimmer columns={1} endAction />
        )}
      </Box>

      <CollectionFab editPath="/settings/device" />
    </PageLayout>
  );
};

export default DevicesPage;
