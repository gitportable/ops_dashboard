import { useTheme } from '@mui/material/styles';
import { Switch } from '@mui/material';

const Header = () => {
  const theme = useTheme();
  const [mode, setMode] = useState(theme.palette.mode);

  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark');  // Update theme provider state

  return (
    <Box sx={{ display: 'flex', justifyContent: 'end' }}>
      <Switch checked={mode === 'dark'} onChange={toggleMode} />
      Dark Mode
    </Box>
  );
};