import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button, TextField, Typography, Snackbar, IconButton, Box, Container, Paper, Divider, Link as MuiLink,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import LoginLayout from './LoginLayout';
import { useTranslation } from '../common/components/LocalizationProvider';
import { snackBarDurationShortMs } from '../common/util/duration';
import { useCatch } from '../reactHelper';
import BackIcon from '../common/components/BackIcon';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { sessionActions } from '../store';

const useStyles = makeStyles()((theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  textField: {
    '& .MuiOutlinedInput-root': {
      borderRadius: theme.spacing(1),
    },
  },
  submitButton: {
    padding: theme.spacing(1.5),
    fontSize: '1rem',
    fontWeight: 600,
    borderRadius: theme.spacing(1),
    textTransform: 'none',
    marginTop: theme.spacing(1),
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  linksContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  link: {
    cursor: 'pointer',
    color: theme.palette.primary.main,
    textDecoration: 'none',
    fontSize: '0.875rem',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  registerContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  title: {
    fontWeight: 700,
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3),
  },
  errorMessage: {
    color: theme.palette.error.main,
    fontSize: '0.875rem',
    marginTop: theme.spacing(1),
  },
}));

const LoginPage = () => {
  const { classes } = useStyles();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [error, setError] = useState('');

  const server = useSelector((state) => state.session.server);
  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetchOrThrow('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      dispatch(sessionActions.updateUser(response));
      navigate('/');
    } catch (error) {
      setError(t('loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleReset = () => {
    navigate('/reset-password');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <LoginLayout>
      <Container maxWidth="sm" className={classes.container}>
        <Box>
          <Typography variant="h4" className={classes.title}>
            {t('loginTitle')}
          </Typography>
          <Typography variant="body2" className={classes.subtitle}>
            {t('devicesAndState')}
          </Typography>
        </Box>

        <div className={classes.formGroup}>
          <TextField
            fullWidth
            type="email"
            placeholder={t('userEmail')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className={classes.textField}
            variant="outlined"
          />

          <TextField
            fullWidth
            type="password"
            placeholder={t('userPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className={classes.textField}
            variant="outlined"
          />

          {error && (
            <Typography className={classes.errorMessage}>
              {error}
            </Typography>
          )}

          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleLogin}
            disabled={loading}
            className={classes.submitButton}
          >
            {loading ? t('loginLogin') : t('loginLogin')}
          </Button>
        </div>

        <Box className={classes.linksContainer}>
          <MuiLink
            component="span"
            className={classes.link}
            onClick={handleReset}
          >
            {t('loginReset')}
          </MuiLink>
        </Box>

        <Divider className={classes.divider} />

        <Box className={classes.registerContainer}>
          <Typography variant="body2">
            {t('userTerms')}?
          </Typography>
          <MuiLink
            component="span"
            className={classes.link}
            onClick={handleRegister}
          >
            {t('loginRegister')}
          </MuiLink>
        </Box>
      </Container>
    </LoginLayout>
  );
};

export default LoginPage;