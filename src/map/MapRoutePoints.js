import { useId, useCallback, useEffect } from 'react';
import { useTheme } from '@mui/material';
import { map } from './core/MapView';
import getSpeedColor from '../common/util/colors';
import { findFonts } from './core/mapUtil';
import { SpeedLegendControl } from './legend/MapSpeedLegend';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useAttributePreference } from '../common/util/preferences';

const MapRoutePoints = () => {
  return null;
};

export default MapRoutePoints;
