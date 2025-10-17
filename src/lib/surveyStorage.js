// Survey configuration storage using file system API
// No localStorage dependency - all data saved to server

const STORAGE_PREFIX = 'survey_config_';

export const saveSurveyConfig = async (name, config, options = {}) => {
  try {
    // surveyConfig is now saved through the main project save API
    // This function is kept for compatibility but doesn't use localStorage
    console.log(`📝 saveSurveyConfig called for ${name} (saved through project API)`);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving survey config:', error);
    return { success: false, error: error.message };
  }
};

export const loadSurveyConfig = async (projectId) => {
  try {
    // ✅ Load surveyConfig from project file via API
    console.log(`📂 loadSurveyConfig called for ${projectId} (loading from file system)`);
    
    const response = await fetch(`http://localhost:3001/api/projects/${projectId}`);
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.surveyConfig) {
        console.log(`✅ Loaded surveyConfig for project ${projectId}:`, data.surveyConfig.title);
        return data.surveyConfig;
      }
    }
    
    console.warn(`⚠️ No surveyConfig found for project ${projectId}`);
    return null;
  } catch (error) {
    console.error('Error loading survey config:', error);
    return null;
  }
};

export const deleteSurveyConfig = async (name) => {
  try {
    // Projects are now deleted through the main project API
    console.log(`🗑️ deleteSurveyConfig called for ${name} (deleted through project API)`);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting survey config:', error);
    return { success: false, error: error.message };
  }
};

export const getSavedConfigList = () => {
  try {
    // Project list is now fetched from the server API
    console.log(`📋 getSavedConfigList called (fetched through project API)`);
    return [];
  } catch (error) {
    console.error('Error getting saved config list:', error);
    return [];
  }
};

export const exportSurveyConfig = (config) => {
  const dataStr = JSON.stringify(config, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `survey-config-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Convert admin config to SurveyJS format for actual survey use
export const convertToSurveyJS = (adminConfig) => {
  return {
    title: adminConfig.title,
    description: adminConfig.description,
    logo: adminConfig.logo,
    logoPosition: adminConfig.logoPosition,
    pages: adminConfig.pages?.map(page => ({
      name: page.name,
      title: page.title,
      description: page.description,
      elements: page.elements?.map(element => {
        const question = { ...element };
        
        // Handle image questions
        if (element.type === 'imagepicker' && element.imageLinks) {
          // Randomly select images for the survey
          const shuffled = [...element.imageLinks].sort(() => 0.5 - Math.random());
          const selectedImages = shuffled.slice(0, element.imageCount || 4);
          
          question.choices = selectedImages.map((url, index) => ({
            value: `image_${index}`,
            imageLink: url
          }));
          question.imageFit = "cover";
          question.multiSelect = element.multiSelect || false;
        }
        
        // Handle image display
        if (element.type === 'image' && element.imageLinks && element.imageLinks.length > 0) {
          // Randomly select one image
          const randomIndex = Math.floor(Math.random() * element.imageLinks.length);
          question.imageLink = element.imageLinks[randomIndex];
          question.imageFit = "cover";
          question.imageHeight = "300px";
          question.imageWidth = "100%";
        }
        
        return question;
      }) || []
    })) || [],
    ...adminConfig.settings
  };
};

// Generate custom theme based on admin config
export const generateCustomTheme = (adminConfig) => {
  if (!adminConfig.theme) {
    return null; // Use default theme
  }

  const theme = adminConfig.theme;
  
  return {
    "cssVariables": {
      // General background colors
      "--sjs-general-backcolor": theme.backgroundColor || "#ffffff",
      "--sjs-general-backcolor-dark": theme.cardBackground || "#f8f9fa",
      "--sjs-general-backcolor-dim": theme.headerBackground || "#fafafa",
      
      // Text colors
      "--sjs-general-forecolor": theme.textColor || "#212121",
      "--sjs-general-forecolor-light": theme.secondaryText || "#757575",
      "--sjs-general-dim-forecolor": theme.disabledText || "#bdbdbd",
      
      // Primary colors
      "--sjs-primary-backcolor": theme.primaryColor || "#1976d2",
      "--sjs-primary-backcolor-light": theme.primaryLight || "#42a5f5",
      "--sjs-primary-backcolor-dark": theme.primaryDark || "#1565c0",
      "--sjs-primary-forecolor": "#ffffff",
      
      // Secondary colors
      "--sjs-secondary-backcolor": theme.secondaryColor || "#dc004e",
      "--sjs-secondary-backcolor-light": theme.accentColor || "#ff9800",
      "--sjs-secondary-backcolor-semi-light": theme.successColor || "#4caf50",
      "--sjs-secondary-forecolor": "#ffffff",
      
      // Border colors
      "--sjs-border-light": theme.borderColor || "#e0e0e0",
      "--sjs-border-default": theme.borderColor || "#e0e0e0",
      "--sjs-border-inside": theme.borderColor || "#e0e0e0",
      
      // Focus and active states
      "--sjs-special-red": theme.accentColor || "#ff9800",
      "--sjs-special-green": theme.successColor || "#4caf50",
      "--sjs-special-blue": theme.focusBorder || theme.primaryColor || "#1976d2",
      
      // Shadows and effects
      "--sjs-shadow-small": "0px 1px 2px 0px rgba(0, 0, 0, 0.15)",
      "--sjs-shadow-medium": "0px 2px 6px 0px rgba(0, 0, 0, 0.1)",
      "--sjs-shadow-large": "0px 8px 16px 0px rgba(0, 0, 0, 0.1)",
      "--sjs-shadow-inner": "inset 0px 1px 2px 0px rgba(0, 0, 0, 0.15)",
      
      // Additional customizations for better appearance
      "--sjs-header-backcolor": theme.headerBackground || "#ffffff",
      "--sjs-corner-radius": "8px",
      "--sjs-base-unit": "8px",
      
      // Input and form elements
      "--sjs-editor-backcolor": theme.backgroundColor || "#ffffff",
      "--sjs-editorpanel-backcolor": theme.cardBackground || "#f8f9fa",
      "--sjs-editorpanel-hovercolor": theme.primaryLight || "#42a5f5",
      
      // Progress bar
      "--sjs-progressbar-color": theme.primaryColor || "#1976d2",
      
      // Question panel
      "--sjs-questionpanel-backcolor": theme.cardBackground || "#f8f9fa",
      "--sjs-questionpanel-hovercolor": theme.headerBackground || "#fafafa",
      "--sjs-questionpanel-cornerradius": "8px"
    },
    "themeName": "custom",
    "colorPalette": "light",
    "isPanelless": false
  };
};
