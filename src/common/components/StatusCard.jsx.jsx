import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  CardActions,
  IconButton,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Menu,
  MenuItem,
  Link,
  Tooltip,
  Avatar,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import AnchorIcon from '@mui/icons-material/Anchor';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RouteIcon from '@mui/icons-material/Route';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import KeyIcon from '@mui/icons-material/Key';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Collapse } from '@mui/material';

import { useTranslation } from './LocalizationProvider';
import PositionValue from './PositionValue';
import { useDeviceReadonly, useRestriction } from '../util/permissions';
import usePositionAttributes from '../attributes/usePositionAttributes';
import { useAttributePreference } from '../util/preferences';
import fetchOrThrow from '../util/fetchOrThrow';
import { useCatchCallback } from '../../reactHelper';
import { mapIconKey, mapIcons } from '../../map/core/preloadImages';
import dayjs from 'dayjs';
import { events } from '../util/EventBus';

const useStyles = makeStyles()((theme) => ({
  card: {
    pointerEvents: 'auto',
    width: '300px',
    maxWidth: 'calc(100vw - 32px)',
    borderRadius: 20,
    backgroundColor: theme.palette.background.paper,
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: theme.typography.fontFamily,
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  hero: {
    height: 80,
    background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1),
    overflow: 'hidden',
  },
  heroPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
    backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
    backgroundSize: '16px 16px',
  },
  heroImage: {
    height: '75%',
    width: 'auto',
    maxWidth: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.25))',
    zIndex: 1,
  },
  heroImageCover: {
    height: '100%',
    width: '100%',
    objectFit: 'cover',
    zIndex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(0.5),
    display: 'flex',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  dragHandle: {
    padding: theme.spacing(0.5),
    cursor: 'grab',
    color: 'rgba(255, 255, 255, 0.8)',
    '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%' },
    '&:active': { cursor: 'grabbing' },
  },
  closeButton: {
    color: 'rgba(255, 255, 255, 0.8)',
    '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.2)' },
    padding: 8,
  },
  mainContent: {
    padding: theme.spacing(1, 2, 0, 2),
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  name: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: theme.palette.text.primary,
    lineHeight: 1.2,
    marginBottom: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 160,
  },
  plate: {
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
    opacity: 0.8,
  },
  statusChip: {
    height: 22,
    fontSize: '0.7rem',
    fontWeight: 700,
    borderRadius: 6,
  },
  scrollContent: {
    maxHeight: 200,
    overflowY: 'auto',
    paddingRight: theme.spacing(0.5),
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2 },
  },
  attributesTable: {
    '& .MuiTableCell-root': {
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      padding: theme.spacing(0.5, 0),
      fontSize: '0.8125rem',
    },
    '& .MuiTableCell-root:last-child': {
      textAlign: 'right',
      fontWeight: 500,
      color: theme.palette.text.primary,
    },
    '& .MuiTableCell-root:first-of-type': {
      color: theme.palette.text.secondary,
      fontWeight: 500,
    },
  },
  actionsBar: {
    padding: theme.spacing(2),
    display: 'flex',
    gap: theme.spacing(2),
    justifyContent: 'space-between',
    background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
    borderTop: '1px solid rgba(0,0,0,0.06)',
  },
  actionBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    background: 'linear-gradient(145deg, #ffffff, #e6e6e6)',
    color: '#555',
    border: '1px solid #ffffff',
    boxShadow: '5px 5px 10px #d9d9d9, -5px -5px 10px #ffffff',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    '&:hover': {
      width: 48, // Slight zoom
      height: 48,
      margin: -1,
      background: '#ffffff',
      color: theme.palette.primary.main,
      boxShadow: '6px 6px 12px #d1d1d1, -6px -6px 12px #ffffff',
    },
    '&:active': {
      background: '#e6e6e6',
      boxShadow: 'inset 4px 4px 8px #d1d1d1, inset -4px -4px 8px #ffffff',
      transform: 'translateY(1px)',
    },
    '&:disabled': { opacity: 0.6, boxShadow: 'none' },
  },
  boatBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    background: 'linear-gradient(145deg, #e3f2fd, #bbdefb)',
    color: '#0d47a1',
    border: '1px solid rgba(255,255,255,0.6)',
    boxShadow: '5px 5px 10px #c5cae9, -5px -5px 10px #ffffff',
    transition: 'all 0.2s ease',
    '&:hover': {
      background: 'linear-gradient(145deg, #daeffd, #90caf9)',
      boxShadow: '6px 6px 12px #c5cae9, -6px -6px 12px #ffffff',
      width: 48,
      height: 48,
      margin: -1,
    },
    '&:active': {
      boxShadow: 'inset 3px 3px 6px #9fa8da, inset -3px -3px 6px #ffffff',
    },
  },
  anchorActive: {
    background: 'linear-gradient(145deg, #007bff, #0056b3) !important',
    color: '#ffffff !important',
    borderColor: '#004085 !important',
    boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.3), 0 0 10px rgba(0,123,255,0.5) !important',
    animation: '$pulse 1.5s infinite ease-in-out',
  },
  lockActive: {
    background: 'linear-gradient(145deg, #d32f2f, #b71c1c) !important',
    color: '#ffffff !important',
    borderColor: '#b71c1c !important',
    boxShadow: 'inset 3px 3px 6px rgba(0,0,0,0.3), 0 0 10px rgba(211,47,47,0.5) !important',
    animation: '$pulse 1.5s infinite ease-in-out',
  },
  pulse: {
    animation: '$pulse 1s infinite ease-in-out',
  },
  toggleBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
    backgroundColor: theme.palette.background.paper,
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.grey[50],
    },
    minHeight: 24,
  },
}));

const StatusRow = ({ name, content }) => (
  <TableRow>
    <TableCell>{name}</TableCell>
    <TableCell>{content}</TableCell>
  </TableRow>
);

const StatusCard = ({ deviceId, position, onClose, disableActions }) => {
  const { classes, cx } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();

  const readonly = useRestriction('readonly');
  const deviceReadonly = useDeviceReadonly();

  const user = useSelector((state) => state.session.user);
  const shareDisabled = useSelector((state) => state.session.server?.attributes?.disableShare);
  const device = useSelector((state) => state.devices.items[deviceId]);

  const positionAttributes = usePositionAttributes(t);
  const positionItems = useAttributePreference('positionItems', 'fixTime,address,speed,totalDistance');

  const navigationAppLink = useAttributePreference('navigationAppLink');
  const navigationAppTitle = useAttributePreference('navigationAppTitle');

  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [commandPending, setCommandPending] = useState(false);
  const [isAnchorActive, setIsAnchorActive] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (device) {
      setIsAnchorActive(device.geofenceIds?.length > 0);
    }
  }, [device?.geofenceIds]);

  const handleAnchor = useCatchCallback(async () => {
    if (!position || !deviceId) return;

    // Use current visual state for toggle decision for responsiveness
    const active = isAnchorActive;

    if (active) {
      // --- DEACTIVATE ---
      setIsAnchorActive(false); // Optimistic immediate update

      // 1. Fetch linked geofences and attributes to find the Anchor ones
      const [geofences, attributes] = await Promise.all([
        (await fetchOrThrow(`/api/geofences?deviceId=${deviceId}`)).json(),
        (await fetchOrThrow(`/api/attributes/computed?deviceId=${deviceId}`)).json(),
      ]);

      // 2. Filter for our specific anchor items (by name pattern)
      const anchorGeofences = geofences.filter(g => g.name.startsWith('Âncora'));
      const anchorAttributes = attributes.filter(a => a.description.startsWith('Regra Âncora'));

      // 3. Unlink Permissions (to avoid DB constraint errors) & Delete Items
      await Promise.all([
        ...anchorGeofences.map(async (g) => {
          await fetchOrThrow('/api/permissions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, geofenceId: g.id })
          });
          await fetchOrThrow(`/api/geofences/${g.id}`, { method: 'DELETE' });
        }),
        ...anchorAttributes.map(async (a) => {
          await fetchOrThrow('/api/permissions', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, attributeId: a.id })
          });
          await fetchOrThrow(`/api/attributes/computed/${a.id}`, { method: 'DELETE' });
        }),
      ]);

      // 4. Send Unlock Command
      handleSendCommand('unlock');

      // 5. Feedback
      setSnackbar({ open: true, message: 'Âncora Removida', severity: 'info' });
      events.emit('remove-anchor', { deviceId });

    } else {
      // --- ACTIVATE ---
      setIsAnchorActive(true); // Optimistic immediate update
      // Emit draw event immediately
      events.emit('draw-anchor', { deviceId, latitude: position.latitude, longitude: position.longitude });

      // 1. Create Geofence
      const geofenceBody = {
        name: `Âncora - ${device.name}`,
        area: `CIRCLE (${position.latitude} ${position.longitude}, 50)`,
      };
      const geofence = await (await fetchOrThrow('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geofenceBody),
      })).json();

      // 2. Link Geofence
      await fetchOrThrow('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, geofenceId: geofence.id }),
      });

      // 3. Create Computed Attribute/Rule for Auto-Block
      // Expression: If NOT inside this geofence, return true (blocked).
      const attributeBody = {
        description: `Regra Âncora - ${device.name}`,
        attribute: 'blocked',
        expression: `!geofenceIds.contains(${geofence.id})`,
        type: 'boolean',
      };
      const attribute = await (await fetchOrThrow('/api/attributes/computed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attributeBody),
      })).json();

      // 4. Link Attribute
      await fetchOrThrow('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, attributeId: attribute.id }),
      });

      // 5. Feedback
      setSnackbar({ open: true, message: 'Âncora Ativada', severity: 'success' });
    }

    setAnchorEl(null);
  });

  const handleSendCommand = useCatchCallback(async (commandType) => {
    setCommandPending(true);
    try {
      if (!deviceId) return;
      const commandName = commandType === 'lock' ? 'engineStop' : 'engineResume';
      const requestBody = {
        deviceId: parseInt(deviceId, 10),
        type: commandName,
        attributes: {},
      };
      const response = await fetch('/api/commands/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const message = commandType === 'lock'
          ? 'Combustível cortado com sucesso'
          : 'Combustível restaurado com sucesso';
        setSnackbar({ open: true, message, severity: 'success' });
      } else {
        throw new Error(`Erro ${response.status}`);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Erro ao enviar comando',
        severity: 'error',
      });
    } finally {
      setCommandPending(false);
      setConfirmDialog({ open: false, action: null });
    }
  });

  const handleLockClick = () => setConfirmDialog({ open: true, action: 'lock' });
  const handleUnlockClick = () => setConfirmDialog({ open: true, action: 'unlock' });

  const statusOnline = Boolean(position);

  // Determine custom image from attributes (support 'foto', 'image', 'deviceImage')
  const customImage = device?.attributes?.foto || device?.attributes?.image || device?.attributes?.deviceImage;

  // Determine fallback icon based on category, defaulting to 'car' if unknown
  const getVehicleFallback = () => {
    const category = device?.category;
    let iconKey = mapIconKey(category);
    // If category is unknown/default, force 'car' as referenced by user request
    if (iconKey === 'default' || !iconKey) {
      iconKey = 'car';
    }
    const icon = mapIcons[iconKey];
    return typeof icon === 'string' ? icon : (icon?.src || icon?.default);
  };

  const vehicleSrc = getVehicleFallback();

  // Status checks for styling
  const isLocked = device?.attributes?.blocked || device?.attributes?.out1 || position?.attributes?.blocked || position?.attributes?.out1;

  const isAnchored = isAnchorActive;

  return (
    <Card className={classes.card} elevation={0}>
      <div
        className={classes.toggleBar}
        onClick={() => setExpanded(!expanded)}
        title={expanded ? "Recolher" : "Expandir"}
      >
        {expanded ? <ExpandLessIcon fontSize="small" color="action" /> : <ExpandMoreIcon fontSize="small" color="action" />}
      </div>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box className={classes.hero}>
          <div className={classes.heroPattern} />

          <Box className={classes.headerOverlay}>
            <Box className={`${classes.dragHandle} status-card-drag-handle`}>
              <DragIndicatorIcon fontSize="small" />
            </Box>
            <IconButton size="small" onClick={onClose} className={classes.closeButton}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {customImage ? (
            <Box component="img" src={customImage} className={classes.heroImageCover} alt="Vehicle" />
          ) : (
            <Box component="img" src={vehicleSrc} className={classes.heroImage} alt="Vehicle Icon" />
          )}
        </Box>

        <Box className={classes.mainContent}>
          <Box className={classes.titleRow}>
            <div>
              <Typography className={classes.name} title={device?.name}>
                {device?.name || t('sharedUnknown')}
                {position && position.attributes.hasOwnProperty('ignition') && (
                  <KeyIcon
                    style={{
                      fontSize: 18,
                      marginLeft: 8,
                      verticalAlign: 'text-bottom',
                      color: position.attributes.ignition ? '#2e7d32' : '#c62828'
                    }}
                  />
                )}
              </Typography>
              <Typography className={classes.plate}>
                {device?.uniqueId || device?.plate || ''}
              </Typography>
            </div>
            <Chip
              label={statusOnline ? t('sharedOnline') : t('sharedOffline')}
              className={classes.statusChip}
              style={{
                backgroundColor: statusOnline ? '#e8f5e9' : '#ffebee',
                color: statusOnline ? '#2e7d32' : '#c62828'
              }}
            />
          </Box>

          {position && (
            <Box className={classes.scrollContent}>
              <Table size="small" className={classes.attributesTable}>
                <TableBody>
                  {positionItems
                    .split(',')
                    .filter((key) => position.hasOwnProperty(key) || (position.attributes && position.attributes.hasOwnProperty(key)))
                    .map((key) => (
                      <StatusRow
                        key={key}
                        name={positionAttributes[key]?.name || key}
                        content={
                          key === 'address' && position.address && typeof position.address === 'string'
                            ? position.address.split(',')[0]
                            : (
                              <PositionValue
                                position={position}
                                property={position.hasOwnProperty(key) ? key : null}
                                attribute={position.hasOwnProperty(key) ? null : key}
                              />
                            )
                        }
                      />
                    ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      </Collapse>

      <Box className={classes.actionsBar}>
        <Tooltip title={t('lock')}>
          <span>
            <IconButton
              className={cx(classes.actionBtn, { [classes.lockActive]: isLocked })}
              disabled={disableActions || deviceReadonly || commandPending}
              onClick={handleLockClick}
            >
              {commandPending ? <CircularProgress size={20} color="inherit" /> : <LockIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('unlock')}>
          <span>
            <IconButton
              className={classes.actionBtn}
              disabled={disableActions || deviceReadonly || commandPending}
              onClick={handleUnlockClick}
            >
              <LockOpenIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('anchor')}>
          <span>
            <IconButton
              className={cx(classes.actionBtn, { [classes.anchorActive]: isAnchored })}
              disabled={disableActions}
              onClick={handleAnchor}
            >
              <AnchorIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('report')}>
          <span>
            <IconButton
              className={classes.boatBtn}
              disabled={disableActions || !position}
              onClick={() => {
                const from = dayjs().startOf('day').toISOString();
                const to = dayjs().endOf('day').toISOString();
                navigate(`/reports/route?deviceId=${deviceId}&from=${from}&to=${to}`);
              }}
            >
              <RouteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('more')}>
          <IconButton className={classes.actionBtn} onClick={(e) => setAnchorEl(e.currentTarget)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} transformOrigin={{ vertical: 'top', horizontal: 'center' }}>
        {!readonly && <MenuItem onClick={handleAnchor}>{t('sharedCreateGeofence')}</MenuItem>}
        {position && (
          <>
            <MenuItem component="a" target="_blank" href={`https://www.google.com/maps/search/?api=1&query=${position.latitude}%2C${position.longitude}`}>
              {t('linkGoogleMaps')}
            </MenuItem>
            <MenuItem component="a" target="_blank" href={`http://maps.apple.com/?ll=${position.latitude},${position.longitude}`}>
              {t('linkAppleMaps')}
            </MenuItem>
            <MenuItem component="a" target="_blank" href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position.latitude}%2C${position.longitude}&heading=${position.course}`}>
              {t('linkStreetView')}
            </MenuItem>
            {navigationAppTitle && (
              <MenuItem component="a" target="_blank" href={navigationAppLink.replace('{latitude}', position.latitude).replace('{longitude}', position.longitude)}>
                {navigationAppTitle}
              </MenuItem>
            )}
          </>
        )}
        {!shareDisabled && !user?.temporary && (
          <MenuItem onClick={() => navigate(`/settings/device/${deviceId}/share`)}>{t('deviceShare')}</MenuItem>
        )}
      </Menu>

      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
        <DialogTitle>
          {confirmDialog.action === 'lock' ? 'Cortar Combustível?' : 'Restaurar Combustível?'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.action === 'lock'
              ? 'Deseja realmente cortar o combustível do veículo?'
              : 'Deseja realmente restaurar o combustível do veículo?'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>Cancelar</Button>
          <Button
            onClick={() => handleSendCommand(confirmDialog.action)}
            variant="contained"
            color={confirmDialog.action === 'lock' ? 'error' : 'success'}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
            color: '#333',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.3)',
            '& .MuiAlert-icon': {
              color: snackbar.severity === 'error' ? '#d32f2f' : '#2e7d32',
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default StatusCard; 
