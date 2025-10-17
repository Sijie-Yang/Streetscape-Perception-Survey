import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Tab,
  Tabs,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { 
  Preview, 
  Menu as MenuIcon,
  FolderOpen,
  Save,
  CleaningServices,
  Star,
  GitHub,
  Palette,
  Check
} from '@mui/icons-material';
import { themes, createCustomTheme } from './themes/themeConfig';
import SurveyBuilder from './components/admin/SurveyBuilder';
import SurveyPreview from './components/admin/SurveyPreview';
import SystemStatus from './components/admin/SystemStatus';
import ImageDataset from './components/admin/ImageDataset';
import WebsiteSetup from './components/admin/WebsiteSetup';
import ProjectSidebar from './components/admin/ProjectSidebar';
import { saveSurveyConfig, loadSurveyConfig } from './lib/surveyStorage';
import { demoSurveyConfig } from './lib/demoConfig';
import { 
  migrateExistingConfig, 
  getActiveProject,
  setActiveProject
} from './lib/projectManager';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function AdminApp() {
  // Theme state
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('sp-survey-theme') || 'default';
  });
  const [themeMenuAnchor, setThemeMenuAnchor] = useState(null);
  const theme = createCustomTheme(currentTheme);
  
  const [tabValue, setTabValue] = useState(0);
  const [surveyConfig, setSurveyConfig] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasUnsavedImageDatasetChanges, setHasUnsavedImageDatasetChanges] = useState(false);
  const [latestImageDatasetConfig, setLatestImageDatasetConfig] = useState(null);
  const [lastSavedConfig, setLastSavedConfig] = useState(null);
  
  // Project state management - save each project's editing state
  // ✅ Now using sessionStorage (session-only, no quota issues!)
  const [projectStates, setProjectStates] = useState({});
  // projectStates structure: { projectId: { surveyConfig, lastSavedConfig, hasUnsavedChanges, tabValue } }
  
  // Load project states from sessionStorage (session-level, cleared when tab closes)
  const loadProjectStatesFromStorage = () => {
    try {
      const saved = sessionStorage.getItem('project_editing_states');
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // ✅ Filter out invalid keys (undefined, null, empty string)
        const validStates = {};
        Object.keys(parsed).forEach(projectId => {
          if (projectId && projectId !== 'undefined' && projectId !== 'null') {
            validStates[projectId] = parsed[projectId];
          } else {
            console.warn(`🔍 Skipping invalid project state with key: "${projectId}"`);
          }
        });
        
        console.log('🔍 Loaded project states from sessionStorage:', Object.keys(validStates));
        // Log tabValue for each project
        Object.keys(validStates).forEach(projectId => {
          console.log(`  - ${projectId}: tabValue = ${validStates[projectId].tabValue}`);
        });
        return validStates;
      }
    } catch (error) {
      console.error('Error loading project states:', error);
    }
    console.log('🔍 No project states found in sessionStorage');
    return {};
  };

  // Save project states to sessionStorage (session-level, no quota limit issues)
  const saveProjectStatesToStorage = (states) => {
    try {
      sessionStorage.setItem('project_editing_states', JSON.stringify(states));
      console.log('🔍 Saved project states to sessionStorage:', Object.keys(states));
    } catch (error) {
      console.error('Error saving project states:', error);
    }
  };
  
  // Project management states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(true);


  useEffect(() => {
    // Clean up any old demo images from saved configurations
    cleanupDemoImages();
    
    // Load project states
    const savedStates = loadProjectStatesFromStorage();
    setProjectStates(savedStates);
    
    // Initialize project system
    initializeProjectSystem();
  }, []);

  // Monitor surveyConfig changes, detect unsaved changes
  useEffect(() => {
    let hasChanges = false;
    
    // Check survey config changes
    if (surveyConfig && lastSavedConfig) {
      const configChanged = JSON.stringify(surveyConfig) !== JSON.stringify(lastSavedConfig);
      console.log('🔍 Checking survey config for changes:', {
        hasConfig: !!surveyConfig,
        hasLastSaved: !!lastSavedConfig,
        configChanged,
        surveyTitle: surveyConfig?.title,
        lastSavedTitle: lastSavedConfig?.title
      });
      hasChanges = hasChanges || configChanged;
    }
    
    // Include image dataset changes
    hasChanges = hasChanges || hasUnsavedImageDatasetChanges;
    
    setHasUnsavedChanges(hasChanges);
    
    // Also update project state
    if (currentProject) {
      saveCurrentProjectState({ hasUnsavedChanges: hasChanges });
    }
  }, [surveyConfig, lastSavedConfig, hasUnsavedImageDatasetChanges]);

  // When surveyConfig first loads, if there's no lastSavedConfig yet, set it
  useEffect(() => {
    if (surveyConfig && !lastSavedConfig) {
      console.log('🔍 Setting initial lastSavedConfig');
      setLastSavedConfig(JSON.parse(JSON.stringify(surveyConfig)));
    }
  }, [surveyConfig, lastSavedConfig]);

  // When switching projects, reset ImageDataset unsaved state
  useEffect(() => {
    if (currentProject) {
      setHasUnsavedImageDatasetChanges(false);
      setLatestImageDatasetConfig(null); // Clear cached config when switching projects
    }
  }, [currentProject?.id]);

  // Monitor projectStates changes, ensure persistence
  useEffect(() => {
    if (Object.keys(projectStates).length > 0) {
      saveProjectStatesToStorage(projectStates);
    }
  }, [projectStates]);

  // Temporarily disable auto-save completely to debug page refresh issues
  // useEffect(() => {
  //   if (surveyConfig && surveyConfig.title && currentProject) {
  //     // Clear previous timer
  //     if (autoSaveTimeout) {
  //       clearTimeout(autoSaveTimeout);
  //     }

  //     // Set new timer, auto-save after 3 seconds (increased delay to reduce frequency)
  //     const timeout = setTimeout(async () => {
  //       try {
  //         // Silent save, don't trigger any state updates or re-renders
  //         console.log('🔄 Auto-saving...', currentProject.name);
          
  //         // Save to localStorage (silent mode, don't trigger storage event)
  //         await saveSurveyConfig(currentProject.id, surveyConfig, { silent: true });
          
  //         console.log('✅ Auto-saved to localStorage only');
  //       } catch (error) {
  //         console.error('❌ Auto-save failed:', error);
  //       }
  //     }, 3000);

  //     setAutoSaveTimeout(timeout);
  //   }

  //   // Cleanup function
  //   return () => {
  //     if (autoSaveTimeout) {
  //       clearTimeout(autoSaveTimeout);
  //     }
  //   };
  // }, [surveyConfig, currentProject]);

  // ✅ No longer needed - demo images are not stored in localStorage
  const cleanupDemoImages = () => {
    console.log('📝 Demo images cleanup skipped (no longer using localStorage)');
  };

  const initializeProjectSystem = async () => {
    try {
      setProjectLoading(true);
      
      // Try to migrate existing 'default' configuration to a project
      const migratedProject = await migrateExistingConfig();
      
      if (migratedProject) {
        // Load the migrated project
        setCurrentProject(migratedProject);
        
        // Try to restore saved state first
        const stateRestored = restoreProjectState(migratedProject.id);
        
        if (!stateRestored) {
          // If no saved state, load from file
          const config = await loadSurveyConfig(migratedProject.id);
          setSurveyConfig(config || demoSurveyConfig);
        }
        
        setSnackbar({ 
          open: true, 
          message: 'Existing configuration migrated to project system!', 
          severity: 'success' 
        });
      } else {
        // Check if there's an active project
        const activeProject = await getActiveProject();
        console.log('🔍 Active project from sessionStorage:', activeProject?.id, activeProject?.name);
        
        if (activeProject) {
          setCurrentProject(activeProject);
          
          // Try to restore saved state first (includes tabValue)
          const stateRestored = restoreProjectState(activeProject.id);
          
          if (!stateRestored) {
            // If no saved state, load from file
            const config = await loadSurveyConfig(activeProject.id);
            setSurveyConfig(config || demoSurveyConfig);
            setTabValue(0); // Default to first tab
          }
          // If state was restored, tabValue is already set by restoreProjectState
        } else {
          // No projects yet - show empty state
          console.log('🔍 No active project, showing null state');
          setSurveyConfig(null);
        }
      }
    } catch (error) {
      console.error('Error initializing project system:', error);
      setSurveyConfig(demoSurveyConfig);
    } finally {
      setProjectLoading(false);
    }
  };

  const handleProjectSelect = async (project, preloadedConfig = null) => {
    if (!project) {
      // Save current project state (if any)
      if (currentProject) {
        saveCurrentProjectState();
      }
      setCurrentProject(null);
      setSurveyConfig(null);
      return;
    }

    try {
      // 1. Save current project's state (if any)
      if (currentProject && currentProject.id !== project.id) {
        console.log('🔍 Saving current project state before switching...');
        saveCurrentProjectState();
      }

      // 2. Load full project data from file system if it's a lightweight version
      let fullProject = project;
      if (project.imageDatasetConfig?.preloadedImagesCount && !project.imageDatasetConfig?.preloadedImages) {
        console.log(`🔍 Project is lightweight version (${project.imageDatasetConfig.preloadedImagesCount} images excluded). Loading full data from file system...`);
        try {
          const response = await fetch(`http://localhost:3001/api/projects/${project.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.project) {
              fullProject = data.project;
              console.log('✅ Loaded full project data with preloaded images');
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not load full project data, using lightweight version:', error);
        }
      }

      // 3. Set new project
      setCurrentProject(fullProject);
      
      // 3. Try to restore project state
      const stateRestored = restoreProjectState(project.id);
      
      if (stateRestored) {
        console.log('🔍 Restored saved project state');
        setSnackbar({ 
          open: true, 
          message: `Restored project: ${project.name} (with unsaved changes)`, 
          severity: 'info' 
        });
      } else {
        // 4. If no saved state, load from file or preloaded config
        console.log('🔍 Loading fresh project state');
        
        if (preloadedConfig) {
          setSurveyConfig(preloadedConfig);
          setLastSavedConfig(JSON.parse(JSON.stringify(preloadedConfig)));
        } else {
          const config = await loadSurveyConfig(project.id);
          const finalConfig = config || createDefaultConfig();
          setSurveyConfig(finalConfig);
          setLastSavedConfig(JSON.parse(JSON.stringify(finalConfig)));
        }
        
        // Reset unsaved state, but keep current tab (don't jump)
        setHasUnsavedChanges(false);
        // No longer force tabValue to 0, keep user's current tab
        
        // Initialize project state, save current tab
        saveCurrentProjectState({ 
          hasUnsavedChanges: false,
          tabValue: tabValue // Keep current tab
        });
        
        setSnackbar({ 
          open: true, 
          message: `Switched to project: ${project.name}`, 
          severity: 'success' 
        });
      }
    } catch (error) {
      console.error('Error loading project:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error loading project', 
        severity: 'error' 
      });
    }
  };

  const createDefaultConfig = () => ({
    // Standard SurveyJS format
    title: "Urban Streetscape Perception Survey",
    description: "This survey helps us understand how people perceive different street environments.",
    logo: "",
    logoPosition: "right",
    
    // SurveyJS standard settings (directly at root level)
    showQuestionNumbers: "off",
    showProgressBar: "aboveheader", 
    progressBarType: "questions",
    autoGrowComment: true,
    showPreviewBeforeComplete: "showAllQuestions",
    
    // SurveyJS standard page structure
    pages: [
      {
        name: "demographics",
        title: "Part 1: Background Information (Optional)",
        description: "Please tell us a bit about yourself. All questions are optional and can be skipped.",
        elements: []
      }
    ],
    
    // Custom theme configuration (kept for theme generation)
    theme: {
      primaryColor: "#1976d2",
      primaryLight: "#42a5f5", 
      primaryDark: "#1565c0",
      secondaryColor: "#dc004e",
      accentColor: "#ff9800",
      successColor: "#4caf50",
      backgroundColor: "#ffffff",
      cardBackground: "#f8f9fa",
      headerBackground: "#ffffff",
      textColor: "#212121",
      secondaryText: "#757575",
      disabledText: "#bdbdbd",
      borderColor: "#e0e0e0",
      focusBorder: "#1976d2"
    }
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Also save current project's tab state
    if (currentProject) {
      saveCurrentProjectState({ tabValue: newValue });
    }
  };

  const handleNextStep = () => {
    const nextTab = Math.min(tabValue + 1, 3); // Max to Step 4 (index 3)
    setTabValue(nextTab);
    if (currentProject) {
      saveCurrentProjectState({ tabValue: nextTab });
    }
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save current project's state
  const saveCurrentProjectState = (updates = {}) => {
    if (!currentProject) return;
    
    const currentState = {
      surveyConfig,
      lastSavedConfig,
      hasUnsavedChanges,
      tabValue,
      ...updates
    };
    
    const newStates = {
      ...projectStates,
      [currentProject.id]: currentState
    };
    
    setProjectStates(newStates);
    saveProjectStatesToStorage(newStates);
    
    console.log('🔍 Saved project state for:', currentProject.name, currentState);
  };

  // Restore project state
  const restoreProjectState = (projectId) => {
    // Always read from localStorage directly to avoid stale state issues
    const allStates = loadProjectStatesFromStorage();
    const savedState = allStates[projectId];
    
    if (savedState) {
      console.log('🔍 Restoring project state for:', projectId, savedState);
      console.log('🔍 Restoring tabValue:', savedState.tabValue);
      
      setSurveyConfig(savedState.surveyConfig);
      setLastSavedConfig(savedState.lastSavedConfig);
      setHasUnsavedChanges(savedState.hasUnsavedChanges);
      setTabValue(savedState.tabValue !== undefined ? savedState.tabValue : 0);
      return true;
    }
    
    console.log('🔍 No saved state found for:', projectId);
    return false;
  };

  // Clean up project state (after project is saved)
  const clearProjectUnsavedState = (projectId) => {
    const newStates = { ...projectStates };
    if (newStates[projectId]) {
      // Keep configuration but clear unsaved state
      newStates[projectId] = {
        ...newStates[projectId],
        hasUnsavedChanges: false,
        lastSavedConfig: newStates[projectId].surveyConfig
      };
      setProjectStates(newStates);
      saveProjectStatesToStorage(newStates);
      console.log('🔍 Cleared unsaved state for project:', projectId);
    }
    // Also clear ImageDataset unsaved changes
    setHasUnsavedImageDatasetChanges(false);
  };

  // Completely delete project state (when project is deleted)
  const removeProjectState = (projectId) => {
    const newStates = { ...projectStates };
    delete newStates[projectId];
    setProjectStates(newStates);
    saveProjectStatesToStorage(newStates);
    console.log('🔍 Removed project state for:', projectId);
  };

  const handleSurveyConfigChange = (newConfig) => {
    console.log('🔍 Survey config changed, updating state...');
    console.log('🔍 New config title:', newConfig?.title);
    console.log('🔍 Pages count:', newConfig?.pages?.length);
    
    setSurveyConfig(newConfig);
    
    // Save current project state immediately (including new configuration)
    if (currentProject) {
      console.log('🔍 Saving updated survey config to project state...');
      // Save immediately, don't use setTimeout, pass new configuration directly
      const newStates = { ...projectStates };
      if (!newStates[currentProject.id]) {
        newStates[currentProject.id] = {
          surveyConfig: newConfig,
          lastSavedConfig: lastSavedConfig,
          hasUnsavedChanges: false,
          tabValue: tabValue
        };
      } else {
        newStates[currentProject.id] = {
          ...newStates[currentProject.id],
          surveyConfig: newConfig,
          tabValue: tabValue
        };
      }
      setProjectStates(newStates);
      saveProjectStatesToStorage(newStates);
      console.log('✅ Survey config saved to project state');
    }
  };

  const handleProjectUpdate = async (updatedProject) => {
    console.log('🔄 Updating project:', updatedProject.name);
    console.log('🔄 Current tabValue:', tabValue);
    
    // Save current tab and state before updating (important!)
    const currentTabValue = tabValue;
    if (currentProject && currentProject.id === updatedProject.id) {
      // Immediately save to localStorage synchronously
      const newStates = {
        ...projectStates,
        [updatedProject.id]: {
          surveyConfig,
          lastSavedConfig,
          hasUnsavedChanges,
          tabValue: currentTabValue
        }
      };
      
      console.log('💾 Saving state with tabValue:', currentTabValue);
      saveProjectStatesToStorage(newStates);
      setProjectStates(newStates);
    }
    
    setCurrentProject(updatedProject);
    
    // ✅ Save directly to file system (no localStorage!)
    try {
      const response = await fetch('http://localhost:3001/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project: updatedProject,
          surveyConfig: surveyConfig, // Use current surveyConfig
          supabaseConfig: updatedProject.supabaseConfig,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Project configuration saved to file system');
      } else {
        console.error('⚠️ Failed to save project to file system:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving project to file system:', error);
    }
  };

  // ✅ Simplified - only clears sessionStorage editing states
  // Theme handlers
  const handleThemeMenuOpen = (event) => {
    setThemeMenuAnchor(event.currentTarget);
  };

  const handleThemeMenuClose = () => {
    setThemeMenuAnchor(null);
  };

  const handleThemeChange = (themeKey) => {
    setCurrentTheme(themeKey);
    localStorage.setItem('sp-survey-theme', themeKey);
    handleThemeMenuClose();
    setSnackbar({
      open: true,
      message: `Theme changed to ${themes[themeKey].name} ${themes[themeKey].icon}`,
      severity: 'success'
    });
  };

  const handleCleanLocalStorage = () => {
    const confirmMessage = 'Clear all temporary editing states?\n\n' +
      'This will:\n' +
      '• Clear all project editing states (sessionStorage)\n' +
      '• Reload the page to start fresh\n\n' +
      'Your saved projects will NOT be affected.\n\n' +
      'Continue?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      // Clear sessionStorage editing states
      sessionStorage.removeItem('project_editing_states');
      console.log('✅ Cleared sessionStorage editing states');
      
      setSnackbar({
        open: true,
        message: 'Session storage cleared. Reloading...',
        severity: 'success'
      });
      
      // Reload page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('❌ Error cleaning session storage:', error);
      setSnackbar({
        open: true,
        message: 'Error clearing session storage: ' + error.message,
        severity: 'error'
      });
    }
  };

  const handleManualSave = async () => {
    console.log('🔍 Manual save started');
    console.log('🔍 Current project ID:', currentProject?.id);
    
    if (!currentProject) {
      console.log('🔍 No project to save');
      return;
    }

    // Get the latest surveyConfig from projectStates (latest configuration)
    const savedState = projectStates[currentProject.id];
    const latestSurveyConfig = savedState?.surveyConfig || surveyConfig;
    
    console.log('🔍 Survey config title:', latestSurveyConfig?.title);
    console.log('🔍 Pages count:', latestSurveyConfig?.pages?.length);
    
    if (latestSurveyConfig?.pages) {
      console.log('🔍 Questions per page:',latestSurveyConfig.pages.map(p => p.elements?.length || 0));
    }

    try {
      // ✅ Update project with latest imageDatasetConfig if available
      const projectToSave = {
        ...currentProject,
        imageDatasetConfig: latestImageDatasetConfig || currentProject.imageDatasetConfig
      };
      
      console.log('🔍 Latest imageDatasetConfig:', latestImageDatasetConfig);
      console.log('🔍 Project imageDatasetConfig to save:', projectToSave.imageDatasetConfig);
      
      // ✅ No localStorage checks needed - saving directly to file system!
      const surveyConfigSize = latestSurveyConfig ? JSON.stringify(latestSurveyConfig).length : 0;
      const projectSize = JSON.stringify(projectToSave).length;
      const totalSize = surveyConfigSize + projectSize;
      console.log(`📊 Data size: surveyConfig=${(surveyConfigSize/1024).toFixed(2)}KB, project=${(projectSize/1024).toFixed(2)}KB, total=${(totalSize/1024).toFixed(2)}KB`);
      
      console.log('🔍 Attempting file system save...');
      // Each project uses its own Supabase configuration, not global configuration
      const projectSupabaseConfig = projectToSave.supabaseConfig || null;
      
      // Add timeout for large files
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error('❌ File save timeout after 30 seconds');
      }, 30000); // 30 second timeout
      
      let response, result;
      try {
        response = await fetch('http://localhost:3001/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project: projectToSave,  // Save the entire project including latest imageDatasetConfig
            surveyConfig: latestSurveyConfig,  // Use the latest survey config
            supabaseConfig: projectSupabaseConfig, // Use project-specific configuration
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        result = await response.json();
        console.log('🔍 File system save result:', result);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.error('❌ File save timed out');
          result = { success: false, error: 'Request timed out (file may be too large)' };
        } else {
          console.error('❌ File save fetch error:', fetchError);
          result = { success: false, error: fetchError.message };
        }
      }
      
      if (result.success) {
        console.log('✅ Save completed successfully to file system!');
        
        // ✅ Ensure activeProject is set correctly (don't switch projects after saving)
        setActiveProject(currentProject.id);
        console.log('🔍 Active project set to:', currentProject.id, currentProject.name);
        
        // ✅ Update currentProject with the saved imageDatasetConfig
        setCurrentProject(projectToSave);
        console.log('🔍 Updated currentProject with latest imageDatasetConfig');
        
        // Update last saved configuration, clear unsaved state
        if (latestSurveyConfig) {
          const savedConfig = JSON.parse(JSON.stringify(latestSurveyConfig));
          setLastSavedConfig(savedConfig);
          setSurveyConfig(latestSurveyConfig); // Ensure UI is using the latest config
        }
        
        // Clear all unsaved changes flags
        setHasUnsavedChanges(false);
        setHasUnsavedImageDatasetChanges(false);
        setLatestImageDatasetConfig(null); // Clear the cached config after successful save
        
        // Clean up current project's unsaved state - save current surveyConfig as lastSavedConfig
        const newStates = { ...projectStates };
        if (newStates[currentProject.id]) {
          newStates[currentProject.id] = {
            ...newStates[currentProject.id],
            hasUnsavedChanges: false,
            surveyConfig: latestSurveyConfig,
            lastSavedConfig: latestSurveyConfig ? JSON.parse(JSON.stringify(latestSurveyConfig)) : null
          };
          setProjectStates(newStates);
          saveProjectStatesToStorage(newStates);
        }
        
        // Show success message
        setSnackbar({
          open: true,
          message: `Project "${currentProject.name}" saved successfully!`,
          severity: 'success'
        });
      } else {
        console.log('⚠️ File save failed:', result.error);
        
        if (latestSurveyConfig) {
          console.log('✅ Save completed to localStorage only');
          // Even if file save fails, localStorage save success counts as saved
          const savedConfig = JSON.parse(JSON.stringify(latestSurveyConfig));
          setLastSavedConfig(savedConfig);
          setSurveyConfig(latestSurveyConfig); // Ensure UI is using the latest config
        }
        
        setHasUnsavedChanges(false);
        setHasUnsavedImageDatasetChanges(false);
        
        // Clean up current project's unsaved state
        const newStates = { ...projectStates };
        if (newStates[currentProject.id]) {
          newStates[currentProject.id] = {
            ...newStates[currentProject.id],
            hasUnsavedChanges: false,
            surveyConfig: latestSurveyConfig,
            lastSavedConfig: latestSurveyConfig ? JSON.parse(JSON.stringify(latestSurveyConfig)) : null
          };
          setProjectStates(newStates);
          saveProjectStatesToStorage(newStates);
        }
        
        // Show partial success message
        setSnackbar({
          open: true,
          message: 'Saved to localStorage. File save failed: ' + result.error,
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('❌ Save failed:', error);
      
      let errorMessage = 'Save failed: ' + error.message;
      
      // Provide helpful suggestions for common errors
      if (error.message.includes('quota') || error.message.includes('QuotaExceededError')) {
        errorMessage = 'Save failed: Project is too large for localStorage. Try clearing preloaded images in Image Dataset tab.';
      } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'Save failed: Request timed out. The project file may be too large. Try clearing preloaded images.';
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
    
    console.log('🔍 Manual save function completed');
  };



  if (projectLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading project system...</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
    <Box sx={{ flexGrow: 1 }}>
        <AppBar 
          position="fixed" 
          sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            bgcolor: hasUnsavedChanges ? 'error.main' : 'primary.main',
            transition: 'background-color 0.3s ease',
            '&:hover': {
              bgcolor: hasUnsavedChanges ? 'error.dark' : 'primary.dark'
            }
          }}
        >
          <Toolbar>
          <Tooltip title="Toggle Project Sidebar">
            <IconButton
              color="inherit"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', letterSpacing: '0.5px' }}>
              SP-Survey
            </Typography>
            
            {/* Custom GitHub Stars Badge */}
            <Box
              component="a"
              href="https://github.com/Sijie-Yang/Streetscape-Perception-Survey"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                ml: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.4,
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.2) 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  '& .github-icon': {
                    transform: 'rotate(360deg)'
                  },
                  '& .star-icon': {
                    transform: 'scale(1.2) rotate(72deg)',
                    filter: 'drop-shadow(0 0 6px #ffd700)'
                  }
                }
              }}
            >
              <GitHub 
                className="github-icon"
                sx={{ 
                  fontSize: '1.1rem',
                  transition: 'transform 0.6s ease'
                }} 
              />
              <Star 
                className="star-icon"
                sx={{ 
                  fontSize: '1rem',
                  color: '#ffd700',
                  filter: 'drop-shadow(0 0 3px rgba(255, 215, 0, 0.6))',
                  transition: 'all 0.3s ease'
                }} 
              />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  lineHeight: 1
                }}
              >
                99
              </Typography>
            </Box>
            
            {currentProject && (
              <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                <FolderOpen sx={{ mr: 1, fontSize: '1.2rem' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {currentProject.name}
                </Typography>
              </Box>
            )}
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
            <Tooltip title={hasUnsavedChanges ? "Save unsaved changes" : "Save project configuration"}>
              <IconButton
                type="button"
                color="inherit"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleManualSave();
                }}
                disabled={!currentProject}
                size="small"
                sx={{ 
                  border: 1,
                  borderColor: hasUnsavedChanges ? 'warning.main' : 'rgba(255, 255, 255, 0.5)',
                  bgcolor: hasUnsavedChanges ? 'warning.main' : 'transparent',
                  color: hasUnsavedChanges ? 'warning.contrastText' : 'inherit',
                  '&:hover': hasUnsavedChanges ? {
                    borderColor: 'warning.dark',
                    bgcolor: 'warning.dark'
                  } : {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  },
                  transition: 'all 0.3s ease',
                  ...(hasUnsavedChanges && {
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.8 },
                      '100%': { opacity: 1 }
                    }
                  })
                }}
              >
                <Save fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Clean localStorage to free up space">
              <IconButton
                color="inherit"
                onClick={handleCleanLocalStorage}
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <CleaningServices fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Change Theme">
              <IconButton
                color="inherit"
                onClick={handleThemeMenuOpen}
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Palette fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Preview Survey">
              <IconButton
                color="inherit"
                onClick={() => setPreviewOpen(true)}
                disabled={!currentProject || !surveyConfig}
                size="small"
                sx={{
                  border: 1,
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                <Preview fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Button 
            color="inherit" 
            onClick={() => {
              if (currentProject) {
                window.open(`/survey?project=${currentProject.id}`, '_blank');
              } else {
                window.open('/survey', '_blank');
              }
            }}
            disabled={!currentProject || !surveyConfig}
            sx={{ 
              bgcolor: 'rgba(255,255,255,0.1)', 
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
              fontWeight: 'bold',
              px: 2
            }}
          >
            🚀 View Live Survey
          </Button>
        </Toolbar>
      </AppBar>

      {/* Theme Selector Menu */}
      <Menu
        anchorEl={themeMenuAnchor}
        open={Boolean(themeMenuAnchor)}
        onClose={handleThemeMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 220,
            maxHeight: 400,
            '& .MuiMenuItem-root': {
              borderRadius: 1,
              mx: 0.5,
              my: 0.25,
              transition: 'all 0.2s'
            }
          }
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Palette fontSize="small" />
            Choose Theme
          </Typography>
        </Box>
        {Object.entries(themes).map(([key, themeData]) => (
          <MenuItem 
            key={key}
            onClick={() => handleThemeChange(key)}
            selected={currentTheme === key}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              '&.Mui-selected': {
                bgcolor: 'primary.light',
                color: 'primary.contrastText',
                '&:hover': {
                  bgcolor: 'primary.main'
                }
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography sx={{ fontSize: '1.2rem' }}>{themeData.icon}</Typography>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: currentTheme === key ? 'bold' : 'normal' }}>
                  {themeData.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
                  <Box 
                    sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      bgcolor: themeData.primary,
                      border: 1,
                      borderColor: 'divider'
                    }} 
                  />
                  <Box 
                    sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '50%', 
                      bgcolor: themeData.secondary,
                      border: 1,
                      borderColor: 'divider'
                    }} 
                  />
                </Box>
              </Box>
            </Box>
            {currentTheme === key && (
              <Check fontSize="small" sx={{ ml: 1 }} />
            )}
          </MenuItem>
        ))}
        <Divider sx={{ my: 0.5 }} />
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Theme preference is saved locally
          </Typography>
        </Box>
      </Menu>

      {/* Project Sidebar */}
      <ProjectSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onProjectSelect={handleProjectSelect}
        onProjectUpdate={handleProjectUpdate}
        currentProject={currentProject}
        surveyConfig={surveyConfig}
        projectStates={projectStates}
        width={400}
      />

      <Container 
        maxWidth="xl" 
        sx={{ 
          mt: 10, // Increase top spacing to accommodate fixed AppBar
          ml: sidebarOpen ? '400px' : 0,
          transition: 'margin-left 0.3s ease',
          width: sidebarOpen ? 'calc(100% - 400px)' : '100%'
        }}
      >
        {!currentProject ? (
          // Empty state - no project selected
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <FolderOpen sx={{ fontSize: '4rem', color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2 }}>
              No Project Selected
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create a new project or select an existing one from the sidebar to get started.
            </Typography>
            <Button
              variant="contained"
              startIcon={<MenuIcon />}
              onClick={() => setSidebarOpen(true)}
              size="large"
            >
              Open Project Sidebar
            </Button>
          </Paper>
        ) : (
          // Project content
          <Paper sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
                <Tab label="Step 1 - Image Dataset" />
                <Tab label="Step 2 - Survey Builder" />
                <Tab label="Step 3 - Server Setup" />
                <Tab label="Step 4 - Website Setup" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <ImageDataset 
                currentProject={currentProject}
                onProjectUpdate={handleProjectUpdate}
                onConfigChange={(hasChanges, latestConfig) => {
                  console.log('🔍 ImageDataset config changed, hasChanges:', hasChanges);
                  setHasUnsavedImageDatasetChanges(hasChanges);
                  // Store the latest config so we can save it when user clicks top Save button
                  if (latestConfig) {
                    setLatestImageDatasetConfig(latestConfig);
                  }
                }}
                onNextStep={handleNextStep}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {surveyConfig ? (
                <SurveyBuilder 
                  config={surveyConfig} 
                  onChange={handleSurveyConfigChange}
                  currentProject={currentProject}
                  onNextStep={handleNextStep}
                />
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography>Loading survey configuration...</Typography>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <SystemStatus 
                surveyConfig={surveyConfig} 
                currentProject={currentProject}
                onProjectUpdate={handleProjectUpdate}
                onNextStep={handleNextStep}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <WebsiteSetup 
                currentProject={currentProject}
                surveyConfig={surveyConfig}
              />
            </TabPanel>
          </Paper>
        )}
      </Container>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          📋 Survey Preview - Exact Live Survey Replica
        </DialogTitle>
        <DialogContent>
          {surveyConfig ? (
            <SurveyPreview config={surveyConfig} />
          ) : (
            <Typography>No survey configuration available</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>


      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
    </ThemeProvider>
  );
}
