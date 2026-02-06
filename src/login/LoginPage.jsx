import { useEffect, useState } from 'react';
import {
  useMediaQuery, Select, MenuItem, FormControl, Button, TextField, Link, Snackbar, IconButton, Tooltip, Box, InputAdornment, Container, Typography, Card,
} from '@mui/material';
import ReactCountryFlag from 'react-country-flag';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import VpnLockIcon from '@mui/icons-material/VpnLock';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import { useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sessionActions } from '../store';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import LoginLayout from './LoginLayout';
import usePersistedState from '../common/util/usePersistedState';
import {
  generateLoginToken, handleLoginTokenListeners, nativeEnvironment, nativePostMessage,
} from '../common/components/NativeInterface';
import LogoImage from './LogoImage';
import { useCatch } from '../reactHelper';
import QrCodeDialog from '../common/components/QrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';

const useStyles = makeStyles()((theme) => ({
  root: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, #001d3d 0%, #003d82 50%, #0055b8 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(2),
  },
  container: {
    width: '100%',
    maxWidth: theme.spacing(50),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    padding: theme.spacing(5),
    borderRadius: theme.spacing(3),
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    backgroundColor: '#ffffff',
  },
  logoSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: theme.spacing(4),
  },
  logoImage: {
    maxWidth: '120px',
    height: 'auto',
    marginBottom: theme.spacing(2),
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#001d3d',
    textAlign: 'center',
    marginBottom: theme.spacing(0.5),
  },
  subtitle: {
    fontSize: '0.95rem',
    color: theme.palette.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing(3),
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2.5),
    marginBottom: theme.spacing(2),
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.spacing(1.5),
      backgroundColor: '#f5f5f5',
      transition: 'all 0.3s ease',
      '&:hover': {
        backgroundColor: '#f0f0f0',
      },
      '&.Mui-focused': {
        backgroundColor: '#ffffff',
        '& fieldset': {
          borderColor: '#003d82',
          borderWidth: 2,
        },
      },
    },
    '& .MuiInputBase-input': {
      fontSize: '0.95rem',
    },
  },
  loginButton: {
    padding: theme.spacing(1.5),
    fontSize: '1rem',
    fontWeight: 700,
    borderRadius: theme.spacing(1.5),
    textTransform: 'none',
    marginTop: theme.spacing(1),
    background: `linear-gradient(135deg, #003d82 0%, #0055b8 100%)`,
    color: '#ffffff',
    '&:hover': {
      background: `linear-gradient(135deg, #001d3d 0%, #003d82 100%)`,
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 25px rgba(0, 93, 184, 0.3)',
    },
    '&:disabled': {
      background: '#cccccc',
      color: '#666666',
    },
  },
  extraContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing(3),
    marginTop: theme.spacing(2.5),
  },
  link: {
    cursor: 'pointer',
    color: '#003d82',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    '&:hover': {
      color: '#0055b8',
      textDecoration: 'underline',
    },
  },
  options: {
    position: 'fixed',
    top: theme.spacing(2),
    right: theme.spacing(2),
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
    zIndex: 100,
  },
  errorMessage: {
    color: theme.palette.error.main,
    fontSize: '0.85rem',
    marginTop: theme.spacing(0.5),
  },
}));

const LoginPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();

  const { languages, language, setLocalLanguage } = useLocalization();
  const languageList = Object.entries(languages).map((values) => ({ code: values[0], country: values[1].country, name: values[1].name }));

  const [failed, setFailed] = useState(false);

  const [email, setEmail] = usePersistedState('loginEmail', '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showServerTooltip, setShowServerTooltip] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const registrationEnabled = useSelector((state) => state.session.server.registration);
  const languageEnabled = useSelector((state) => {
    const attributes = state.session.server.attributes;
    return !attributes.language && !attributes['ui.disableLoginLanguage'];
  });
  const changeEnabled = useSelector((state) => !state.session.server.attributes.disableChange);
  const emailEnabled = useSelector((state) => state.session.server.emailEnabled);
  const openIdEnabled = useSelector((state) => state.session.server.openIdEnabled);
  const openIdForced = useSelector((state) => state.session.server.openIdEnabled && state.session.server.openIdForce);
  const [codeEnabled, setCodeEnabled] = useState(false);

  const [announcementShown, setAnnouncementShown] = useState(false);
  const announcement = useSelector((state) => state.session.server.announcement);

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setFailed(false);
    try {
      const query = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      const response = await fetch('/api/session', {
        method: 'POST',
        body: new URLSearchParams(code.length ? `${query}&code=${code}` : query),
      });
      if (response.ok) {
        const user = await response.json();
        generateLoginToken();
        dispatch(sessionActions.updateUser(user));
        const target = window.sessionStorage.getItem('postLogin') || '/';
        window.sessionStorage.removeItem('postLogin');
        navigate(target, { replace: true });
      } else if (response.status === 401 && response.headers.get('WWW-Authenticate') === 'TOTP') {
        setCodeEnabled(true);
      } else {
        throw Error(await response.text());
      }
    } catch {
      setFailed(true);
      setPassword('');
    }
  };

  const handleTokenLogin = useCatch(async (token) => {
    const response = await fetchOrThrow(`/api/session?token=${encodeURIComponent(token)}`);
    const user = await response.json();
    dispatch(sessionActions.updateUser(user));
    navigate('/');
  });

  const handleOpenIdLogin = () => {
    document.location = '/api/session/openid/auth';
  };

  useEffect(() => nativePostMessage('authentication'), []);

  useEffect(() => {
    const listener = (token) => handleTokenLogin(token);
    handleLoginTokenListeners.add(listener);
    return () => handleLoginTokenListeners.delete(listener);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem('hostname') !== window.location.hostname) {
      window.localStorage.setItem('hostname', window.location.hostname);
      setShowServerTooltip(true);
    }
  }, []);

  return (
    <div className={classes.root}>
      <div className={classes.options}>
        {nativeEnvironment && changeEnabled && (
          <IconButton color="inherit" onClick={() => navigate('/change-server')}>
            <Tooltip
              title={`${t('settingsServer')}: ${window.location.hostname}`}
              open={showServerTooltip}
              arrow
            >
              <VpnLockIcon />
            </Tooltip>
          </IconButton>
        )}
        {!nativeEnvironment && (
          <IconButton color="inherit" onClick={() => setShowQr(true)}>
            <QrCode2Icon />
          </IconButton>
        )}
        {languageEnabled && (
          <FormControl sx={{ minWidth: 120 }}>
            <Select
              value={language}
              onChange={(e) => setLocalLanguage(e.target.value)}
              sx={{
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '& .MuiSvgIcon-root': {
                  color: '#ffffff',
                },
              }}
            >
              {languageList.map((it) => (
                <MenuItem key={it.code} value={it.code}>
                  <Box component="span" sx={{ mr: 1 }}>
                    <ReactCountryFlag countryCode={it.country} svg />
                  </Box>
                  {it.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </div>

      <Container maxWidth="sm" className={classes.container}>
        <Card className={classes.card}>
          <div className={classes.logoSection}>
            <LogoImage color="#003d82" />
            <Typography className={classes.title}>
              GPScell Rastreamento
            </Typography>
            <Typography className={classes.subtitle}>
              Acesse sua conta para continuar
            </Typography>
          </div>

          {!openIdForced && (
            <>
              <div className={classes.formGroup}>
                <TextField
                  required
                  error={failed}
                  label={t('userEmail')}
                  name="email"
                  value={email}
                  autoComplete="email"
                  autoFocus={!email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={classes.textField}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: '#003d82', marginRight: 1 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                {failed && (
                  <Typography className={classes.errorMessage}>
                    Usuário ou senha inválidos
                  </Typography>
                )}

                <TextField
                  required
                  error={failed}
                  label={t('userPassword')}
                  name="password"
                  value={password}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus={!!email}
                  onChange={(e) => setPassword(e.target.value)}
                  className={classes.textField}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: '#003d82', marginRight: 1 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            size="small"
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                {codeEnabled && (
                  <TextField
                    required
                    error={failed}
                    label={t('loginTotpCode')}
                    name="code"
                    value={code}
                    type="number"
                    onChange={(e) => setCode(e.target.value)}
                    className={classes.textField}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: '#003d82', marginRight: 1 }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                )}
              </div>

              <Button
                onClick={handlePasswordLogin}
                type="submit"
                variant="contained"
                fullWidth
                className={classes.loginButton}
                disabled={!email || !password || (codeEnabled && !code)}
              >
                {t('loginLogin')}
              </Button>
            </>
          )}

          {openIdEnabled && (
            <Button
              onClick={() => handleOpenIdLogin()}
              variant="contained"
              fullWidth
              className={classes.loginButton}
            >
              {t('loginOpenId')}
            </Button>
          )}

          {!openIdForced && (
            <div className={classes.extraContainer}>
              {registrationEnabled && (
                <Link
                  onClick={() => navigate('/register')}
                  className={classes.link}
                  underline="none"
                >
                  {t('loginRegister')}
                </Link>
              )}
              {emailEnabled && (
                <Link
                  onClick={() => navigate('/reset-password')}
                  className={classes.link}
                  underline="none"
                >
                  {t('loginReset')}
                </Link>
              )}
            </div>
          )}
        </Card>
      </Container>

      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
      <Snackbar
        open={!!announcement && !announcementShown}
        message={announcement}
        action={(
          <IconButton size="small" color="inherit" onClick={() => setAnnouncementShown(true)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      />
    </div>
  );
};

export default LoginPage;
