import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FormControl, InputLabel, Select, MenuItem, Button, ButtonGroup, TextField, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useTranslation } from '../../common/components/LocalizationProvider';
import useReportStyles from '../common/useReportStyles';
import SplitButton from '../../common/components/SplitButton';
import SelectField from '../../common/components/SelectField';
import { useRestriction } from '../../common/util/permissions';

export const updateReportParams = (searchParams, setSearchParams, key, values) => {
  const newParams = new URLSearchParams(searchParams);
  newParams.delete(key);
  newParams.delete('from');
  newParams.delete('to');
  values.forEach((value) => newParams.append(key, value));
  setSearchParams(newParams, { replace: true });
};

const ReportFilter = ({
  children, onShow, onExport, onSchedule, deviceType, loading,
}) => {
  const { classes } = useReportStyles();
  const t = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();

  const readonly = useRestriction('readonly');

  const devices = useSelector((state) => state.devices.items);
  const groups = useSelector((state) => state.groups.items);

  const deviceIds = useMemo(() => searchParams.getAll('deviceId').map(Number), [searchParams]);
  const groupIds = useMemo(() => searchParams.getAll('groupId').map(Number), [searchParams]);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState(dayjs().subtract(1, 'hour').locale('en').format('YYYY-MM-DDTHH:mm'));
  const [customTo, setCustomTo] = useState(dayjs().locale('en').format('YYYY-MM-DDTHH:mm'));
  const [selectedOption, setSelectedOption] = useState('json');

  const [description, setDescription] = useState();
  const [calendarId, setCalendarId] = useState();

  const evaluateDisabled = () => {
    if (deviceType !== 'none' && !deviceIds.length && !groupIds.length) {
      return true;
    }
    if (selectedOption === 'schedule' && (!description || !calendarId)) {
      return true;
    }
    return loading;
  }
  const disabled = evaluateDisabled();
  const loaded = from && to && !loading;

  const evaluateOptions = () => {
    const result = {
      json: t('reportShow'),
    };
    if (onExport && loaded) {
      result.export = t('reportExport');
      result.print = t('reportPrint');
    }
    if (onSchedule && !readonly) {
      result.schedule = t('reportSchedule');
    }
    return result;
  }
  const options = evaluateOptions();

  useEffect(() => {
    if (from && to) {
      onShow({ deviceIds, groupIds, from, to });
    }
  }, [deviceIds, groupIds, from, to]);

  const showReport = () => {
    let selectedFrom;
    let selectedTo;
    switch (period) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        break;
      case 'thisWeek':
        selectedFrom = dayjs().startOf('week');
        selectedTo = dayjs().endOf('week');
        break;
      case 'previousWeek':
        selectedFrom = dayjs().subtract(1, 'week').startOf('week');
        selectedTo = dayjs().subtract(1, 'week').endOf('week');
        break;
      case 'thisMonth':
        selectedFrom = dayjs().startOf('month');
        selectedTo = dayjs().endOf('month');
        break;
      case 'previousMonth':
        selectedFrom = dayjs().subtract(1, 'month').startOf('month');
        selectedTo = dayjs().subtract(1, 'month').endOf('month');
        break;
      default:
        selectedFrom = dayjs(customFrom, 'YYYY-MM-DDTHH:mm');
        selectedTo = dayjs(customTo, 'YYYY-MM-DDTHH:mm');
        break;
    }

    const newParams = new URLSearchParams(searchParams);
    newParams.set('from', selectedFrom.toISOString());
    newParams.set('to', selectedTo.toISOString());
    setSearchParams(newParams, { replace: true });
  };

  const onSelected = (type) => {
    switch (type) {
      case 'export':
        onExport({ deviceIds, groupIds, from, to });
        break;
      case 'print':
        window.print();
        break;
      default:
        setSelectedOption(type);
        break;
    }
  }

  const handleQuickPreset = (preset) => {
    let selectedFrom;
    let selectedTo;
    switch (preset) {
      case 'today':
        selectedFrom = dayjs().startOf('day');
        selectedTo = dayjs().endOf('day');
        setPeriod('today');
        break;
      case 'yesterday':
        selectedFrom = dayjs().subtract(1, 'day').startOf('day');
        selectedTo = dayjs().subtract(1, 'day').endOf('day');
        setPeriod('yesterday');
        break;
      case 'hour':
        selectedFrom = dayjs().subtract(1, 'hour');
        selectedTo = dayjs();
        setPeriod('custom');
        break;
      default: return;
    }

    setCustomFrom(selectedFrom.locale('en').format('YYYY-MM-DDTHH:mm'));
    setCustomTo(selectedTo.locale('en').format('YYYY-MM-DDTHH:mm'));

    const newParams = new URLSearchParams(searchParams);
    newParams.set('from', selectedFrom.toISOString());
    newParams.set('to', selectedTo.toISOString());
    setSearchParams(newParams, { replace: true });
  };

  const onClick = (type) => {
    switch (type) {
      case 'schedule':
        onSchedule(deviceIds, groupIds, {
          description,
          calendarId,
          attributes: {},
        });
        break;
      case 'json':
      default:
        showReport();
        break;
    }
  };

  return (
    <div className={classes.filter}>
      <div className={classes.filterItem} style={{ flexGrow: 0, marginRight: 8, minWidth: 'auto' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => window.history.back()}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            color: '#555',
            borderColor: 'rgba(0,0,0,0.12)',
            height: 40,
            padding: '6px 16px',
            bgcolor: 'white',
            '&:hover': {
              borderColor: 'rgba(0,0,0,0.3)',
              backgroundColor: 'rgba(0,0,0,0.04)'
            }
          }}
        >
          VOLTAR
        </Button>
      </div>
      {deviceType !== 'none' && (
        <div className={classes.filterItem}>
          <TextField
            label={t('reportDevice')}
            value={devices[deviceIds[0]]?.name || ''}
            fullWidth
            InputProps={{
              readOnly: true,
            }}
            variant="outlined"
            size="small"
          />
        </div>
      )}
      {deviceType === 'multiple' && (
        <div className={classes.filterItem}>
          <SelectField
            label={t('settingsGroups')}
            data={Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))}
            value={groupIds}
            onChange={(e) => {
              const values = e.target.value;
              updateReportParams(searchParams, setSearchParams, 'groupId', values);
            }}
            multiple
            fullWidth
          />
        </div>
      )}
      {selectedOption !== 'schedule' ? (
        <>
          <div className={classes.filterItem}>
            <ButtonGroup fullWidth size="small" variant="text" sx={{ gap: 1 }}>
              <Button onClick={() => handleQuickPreset('hour')} sx={{ color: '#555', fontWeight: 500, '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } }}>1H</Button>
              <Button onClick={() => handleQuickPreset('today')} sx={{ color: '#555', fontWeight: 500, '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } }}>{t('reportToday')}</Button>
              <Button onClick={() => handleQuickPreset('yesterday')} sx={{ color: '#555', fontWeight: 500, '&:hover': { bgcolor: 'rgba(0,0,0,0.05)' } }}>{t('reportYesterday')}</Button>
            </ButtonGroup>
          </div>
          <div className={classes.filterItem}>
            <Button
              variant={period === 'custom' ? "contained" : "outlined"}
              color="primary"
              onClick={() => setPeriod(period === 'custom' ? 'today' : 'custom')}
              fullWidth
              size="small"
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              Personalizar Data
            </Button>
          </div>
          {period === 'custom' && (
            <>
              <div className={classes.filterItem}>
                <TextField
                  label={<span style={{ fontFamily: 'sans-serif', fontWeight: 600, letterSpacing: '0.5px' }}>INÍCIO</span>}
                  type="datetime-local"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </div>
              <div className={classes.filterItem}>
                <TextField
                  label={<span style={{ fontFamily: 'sans-serif', fontWeight: 600, letterSpacing: '0.5px' }}>FIM</span>}
                  type="datetime-local"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className={classes.filterItem}>
            <TextField
              value={description || ''}
              onChange={(event) => setDescription(event.target.value)}
              label={t('sharedDescription')}
              fullWidth
            />
          </div>
          <div className={classes.filterItem}>
            <SelectField
              value={calendarId}
              onChange={(event) => setCalendarId(Number(event.target.value))}
              endpoint="/api/calendars"
              label={t('sharedCalendar')}
              fullWidth
            />
          </div>
        </>
      )}
      {children}
      <div className={classes.filterItem}>
        {Object.keys(options).length === 1 ? (
          <Button
            fullWidth
            variant="contained"
            disabled={disabled}
            onClick={onClick}
            sx={{ bgcolor: '#00897B', '&:hover': { bgcolor: '#00695C' }, borderRadius: '8px', boxShadow: 'none', height: 40 }}
          >
            <Typography variant="button" noWrap sx={{ fontWeight: 600 }}>{t(loading ? 'sharedLoading' : 'reportShow')}</Typography>
          </Button>
        ) : (
          <SplitButton
            fullWidth
            variant="outlined"
            color="secondary"
            disabled={disabled}
            onClick={onClick}
            selected={selectedOption}
            setSelected={onSelected}
            options={options}
          />
        )}
      </div>
    </div>
  );
};

export default ReportFilter;
