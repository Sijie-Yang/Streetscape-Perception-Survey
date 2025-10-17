import { createTheme } from '@mui/material/styles';

// 🎨 Theme Configurations
export const themes = {
  // 1. Default Blue Theme (Original)
  default: {
    name: 'Ocean Blue',
    icon: '🌊',
    primary: '#1976d2',
    secondary: '#dc004e',
    background: '#f5f5f5',
    paper: '#ffffff',
    mode: 'light'
  },
  
  // 2. Deep Purple Theme (Elegant Purple)
  purple: {
    name: 'Royal Purple',
    icon: '👑',
    primary: '#7b1fa2',
    secondary: '#f06292',
    background: '#f3e5f5',
    paper: '#ffffff',
    mode: 'light'
  },
  
  // 3. Teal Theme (Modern Teal)
  teal: {
    name: 'Modern Teal',
    icon: '🎯',
    primary: '#009688',
    secondary: '#ff6f00',
    background: '#e0f2f1',
    paper: '#ffffff',
    mode: 'light'
  },
  
  // 4. Dark Mode (Dark Mode)
  dark: {
    name: 'Midnight Dark',
    icon: '🌙',
    primary: '#90caf9',
    secondary: '#f48fb1',
    background: '#121212',
    paper: '#1e1e1e',
    mode: 'dark'
  },
  
  // 5. Warm Orange Theme (Warm Sunset)
  orange: {
    name: 'Sunset Orange',
    icon: '🌅',
    primary: '#ff6f00',
    secondary: '#f50057',
    background: '#fff3e0',
    paper: '#ffffff',
    mode: 'light'
  },
  
  // 6. Forest Green Theme (Nature Green)
  green: {
    name: 'Forest Green',
    icon: '🌲',
    primary: '#2e7d32',
    secondary: '#ff6f00',
    background: '#e8f5e9',
    paper: '#ffffff',
    mode: 'light'
  },
  
  // 7. Rose Gold Theme (Rose Gold)
  rosegold: {
    name: 'Rose Gold',
    icon: '💎',
    primary: '#c2185b',
    secondary: '#ffd54f',
    background: '#fce4ec',
    paper: '#ffffff',
    mode: 'light'
  },
  
  // 8. Tech Blue Theme (Tech Blue)
  techblue: {
    name: 'Tech Blue',
    icon: '🚀',
    primary: '#0277bd',
    secondary: '#00e676',
    background: '#e1f5fe',
    paper: '#ffffff',
    mode: 'light'
  }
};

// Create MUI Theme
export const createCustomTheme = (themeKey) => {
  const themeConfig = themes[themeKey] || themes.default;
  
  return createTheme({
    palette: {
      mode: themeConfig.mode,
      primary: {
        main: themeConfig.primary,
      },
      secondary: {
        main: themeConfig.secondary,
      },
      background: {
        default: themeConfig.background,
        paper: themeConfig.paper,
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  });
};

