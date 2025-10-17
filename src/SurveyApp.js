import React, { useState, useEffect, useRef } from "react";
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";
import { Box, Alert, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import { saveSurveyResponse, isSupabaseConfigured } from './lib/supabase';
import { surveyJson, displayedImages } from './config/questions';
import { surveyConfig } from './config/surveyConfig';
import { themeJson } from "./theme";
import { loadSurveyConfig, convertToSurveyJS, generateCustomTheme } from './lib/surveyStorage';
import registerImageRankingWidget, { registerImageRatingWidget, registerImageBooleanWidget, registerImageMatrixWidget } from './components/SurveyCustomComponents';

export default function SurveyApp() {
  const [surveyModel, setSurveyModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useAdminConfig, setUseAdminConfig] = useState(true); // Use admin config by default
  const [adminConfigExists, setAdminConfigExists] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [displayedImagesMap, setDisplayedImagesMap] = useState({}); // Track displayed images for each question
  const [currentProjectId, setCurrentProjectId] = useState(null); // Track current project ID
  const displayedImagesRef = useRef({}); // Use ref to ensure onComplete has access to latest value

  // Monitor URL changes and reinitialize when project ID changes
  useEffect(() => {
    const checkUrlChange = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('project') || 'default';
      
      if (currentProjectId !== projectId && currentProjectId !== null) {
        console.log(`🔄 Project ID changed from ${currentProjectId} to ${projectId}, reloading...`);
        setCurrentProjectId(projectId);
        initializeSurvey();
      } else if (currentProjectId === null) {
        setCurrentProjectId(projectId);
      }
    };

    // Check immediately
    checkUrlChange();

    // Also listen for popstate (browser back/forward) and hashchange
    window.addEventListener('popstate', checkUrlChange);
    
    // Check periodically as a fallback (every 10 seconds to avoid rate limits)
    const interval = setInterval(checkUrlChange, 10000);

    return () => {
      window.removeEventListener('popstate', checkUrlChange);
      clearInterval(interval);
    };
  }, [currentProjectId]);

  useEffect(() => {
    console.log('🔄 SurveyApp mounted or useAdminConfig changed, initializing survey...');
    initializeSurvey();
  }, [useAdminConfig]);

  // Force reload when page becomes visible (to refresh expired image URLs)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && surveyModel) {
        console.log('👁️ Page became visible, checking if survey needs refresh...');
        // Optionally reload survey if it's been hidden for too long
        const timeSinceLastLoad = Date.now() - (window.lastSurveyLoadTime || 0);
        if (timeSinceLastLoad > 30 * 60 * 1000) { // 30 minutes
          console.log('⏰ Survey data is stale (>30min), reloading...');
          initializeSurvey();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [surveyModel]);

  // ✅ No longer monitoring localStorage (using sessionStorage now)
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Get current project ID
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('project') || 'default';
      
      if (e.key === `survey_config_${projectId}` && useAdminConfig) {
        console.log(`Project ${projectId} configuration updated, reloading survey...`);
        initializeSurvey();
      }
    };

    // Listen to storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen to custom storage events (updates within the same page)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [useAdminConfig]);

  const initializeSurvey = async () => {
    try {
      setLoading(true);
      
      console.log('🚀 InitializeSurvey called at:', new Date().toISOString());
      
      // Register custom components
      registerImageRankingWidget();
      registerImageRatingWidget();
      registerImageBooleanWidget();
      registerImageMatrixWidget();
      let finalSurveyJson;
      let finalDisplayedImages = displayedImages;
      const imageTracker = {}; // Track displayed images for each question

      // Get project ID from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const projectId = urlParams.get('project') || 'default';
      
      console.log('📂 Loading survey for project:', projectId);

      // Load project object (including Supabase configuration)
      let projectData = null;
      try {
        const { getProjectById } = await import('./lib/projectManager');
        projectData = getProjectById(projectId);
        console.log('✅ Loaded project data:', projectData);
      } catch (error) {
        console.error('❌ Error loading project data:', error);
      }
      
      // Load survey configuration
      const adminConfig = await loadSurveyConfig(projectId);
      
      // If project has Supabase configuration, set it to global supabase_config
      if (projectData && projectData.supabaseConfig && projectData.supabaseConfig.enabled) {
        console.log('🔗 Loading Supabase config for project:', projectId);
        console.log('📍 Supabase URL:', projectData.supabaseConfig.url);
        console.log('🔑 Has Secret Key:', !!projectData.supabaseConfig.secretKey);
        try {
          // ✅ Save to sessionStorage (session-only)
          sessionStorage.setItem('supabase_config', JSON.stringify(projectData.supabaseConfig));
          console.log('✅ Supabase config saved to sessionStorage');
          
          // Re-initialize Supabase client
          const { reinitializeSupabase } = await import('./lib/supabase');
          const client = reinitializeSupabase();
          if (client) {
            console.log('✅ Supabase client reinitialized successfully for project:', projectId);
          } else {
            console.warn('⚠️ Supabase client initialization returned null');
          }
        } catch (error) {
          console.error('❌ Error setting up Supabase for survey:', error);
        }
      } else {
        console.warn('⚠️ No Supabase config found or not enabled for project:', projectId);
        if (projectData) {
          console.log('📊 Project exists but supabaseConfig:', projectData.supabaseConfig);
        } else {
          console.log('❌ Project data is null - project may not exist');
        }
      }
      
      if (useAdminConfig && adminConfig) {
        // Directly use admin configuration (already in standard SurveyJS format)
        // Use deep copy to avoid modifying the original config
        finalSurveyJson = JSON.parse(JSON.stringify(adminConfig));
        
        // Process image questions and convert imageranking to ranking for SurveyJS
        if (finalSurveyJson.pages) {
          for (const page of finalSurveyJson.pages) {
            if (page.elements) {
              for (const element of page.elements) {
                // Keep imageranking as is - it will be handled by our custom component
                if (element.type === 'imageranking') {
                  // Set default properties for image ranking
                  element.imageFit = element.imageFit || "cover";
                  
                  // Clean up any unwanted description text that might have been added
                  if (element.description && element.description.includes('Please select all images in your preferred order')) {
                    element.description = element.description.replace(/\n\nPlease select all images in your preferred order.*$/g, '').trim();
                    if (!element.description) {
                      delete element.description;
                    }
                  }
                }

                // Keep imagerating as is - it will be handled by our custom component
                if (element.type === 'imagerating') {
                  // Set default properties for image rating
                  element.imageFit = element.imageFit || "cover";
                }

                // Keep imageboolean as is - it will be handled by our custom component
                if (element.type === 'imageboolean') {
                  // Set default properties for image boolean
                  element.imageFit = element.imageFit || "cover";
                }

                // Handle image display questions
                if (element.type === 'image') {
                  // Set default properties for image display
                  element.imageFit = element.imageFit || "cover";
                }
                
                // Handle imagematrix questions
                if (element.type === 'imagematrix') {
                  // Set default properties for image matrix
                  element.imageFit = element.imageFit || "cover";
                  
                  console.log('📊 ImageMatrix loaded:', element.name, '- rows:', element.rows?.length || 0, 'columns:', element.columns?.length || 0, 'imageMode:', element.imageSelectionMode);
                }
                
                // Process random image selection for imagepicker, imageranking, imagerating, imageboolean, imagematrix, and image questions
                if ((element.type === 'imagepicker' || element.type === 'imageranking' || element.type === 'imagerating' || element.type === 'imageboolean' || element.type === 'image' || element.type === 'imagematrix') && element.randomImageSelection) {
                  console.log(`🔄 Loading images for ${element.type} question: ${element.name}`);
                  try {
                    let result;
                    
                    // PRIORITY 1: Check if project has preloaded images
                    if (adminConfig.preloadedImages && adminConfig.preloadedImages.length > 0) {
                      console.log(`📦 Using preloaded images from project (${adminConfig.preloadedImages.length} available)`);
                      
                      // Use type-specific defaults if imageCount is not set
                      const defaultCount = (element.type === 'imagerating' || element.type === 'imagematrix' || element.type === 'imageboolean' || element.type === 'image') ? 1 : 4;
                      const imageCount = element.imageCount || defaultCount;
                      
                      // Randomly select from preloaded images
                      const shuffled = [...adminConfig.preloadedImages].sort(() => 0.5 - Math.random());
                      const selectedImages = shuffled.slice(0, imageCount);
                      
                      result = {
                        success: true,
                        images: selectedImages
                      };
                      
                      console.log(`✅ Selected ${selectedImages.length} random images from preloaded pool`);
                    }
                    // PRIORITY 2: Determine image source if no preloaded images
                    else if (element.imageSource === 'huggingface' && element.huggingFaceConfig) {
                      // Load from Hugging Face
                      // Use type-specific defaults if imageCount is not set
                      const defaultCount = (element.type === 'imagerating' || element.type === 'imagematrix' || element.type === 'imageboolean' || element.type === 'image') ? 1 : 4;
                      const imageCount = element.imageCount || defaultCount;
                      console.log(`📥 Fetching ${imageCount} images from Hugging Face dataset: ${element.huggingFaceConfig.datasetName}`);
                      const { getRandomImagesFromHuggingFace } = await import('./lib/huggingface');
                      const { huggingFaceToken, datasetName } = element.huggingFaceConfig;
                      
                      if (datasetName) {
                        result = await getRandomImagesFromHuggingFace(huggingFaceToken, datasetName, imageCount);
                        console.log(`✅ Successfully loaded ${result?.images?.length || 0} images from Hugging Face`);
                      } else {
                        console.warn(`Hugging Face dataset name missing for question: ${element.name}`);
                        continue;
                      }
                    } else if (element.supabaseConfig) {
                      // Load from Supabase (default/legacy behavior)
                      const { getAllImagesFromSupabase } = await import('./lib/supabase');
                      const { createClient } = await import('@supabase/supabase-js');
                      
                      // Create project-specific Supabase client
                      const projectSupabase = createClient(element.supabaseConfig.url, element.supabaseConfig.secretKey);
                      
                      // Get all available images
                      const supabaseResult = await getAllImagesFromSupabase(element.bucketPath, projectSupabase);
                      
                      if (supabaseResult.success && supabaseResult.images.length > 0) {
                        // Randomly select images
                        // Use type-specific defaults if imageCount is not set
                        const defaultCount = (element.type === 'imagerating' || element.type === 'imagematrix' || element.type === 'imageboolean' || element.type === 'image') ? 1 : 4;
                        const imageCount = element.imageCount || defaultCount;
                        const shuffled = [...supabaseResult.images].sort(() => 0.5 - Math.random());
                        const selectedImages = shuffled.slice(0, imageCount);
                        result = { success: true, images: selectedImages };
                      } else {
                        result = supabaseResult;
                      }
                    } else {
                      console.warn(`No image source configured for question: ${element.name}`);
                      continue;
                    }
                    
                    if (result.success && result.images.length > 0) {
                      const selectedImages = result.images;
                      
                      // Track displayed images for this question (store names, not URLs)
                      const imageNames = selectedImages.map(img => img.name);
                      imageTracker[element.name] = imageNames;
                      console.log(`✅ Tracked ${imageNames.length} image names for question: ${element.name}`, imageNames);
                      
                      // Set image data for SurveyJS
                      if (element.type === 'image') {
                        // For image display questions, set imageLink directly
                        if (selectedImages.length > 0) {
                          element.imageLink = selectedImages[0].url; // Use first image for single display
                          element.imageName = selectedImages[0].name; // Store name for tracking
                        }
                        // For multiple images, we could set up an array, but SurveyJS image type typically shows one
                        if (selectedImages.length > 1) {
                          // Store all images in a custom property for potential future use
                          element.imageLinks = selectedImages.map(img => img.url);
                          element.imageNames = selectedImages.map(img => img.name);
                        }
                      } else if (element.type === 'imageboolean' || element.type === 'imagerating' || element.type === 'imagematrix') {
                        // For imageboolean, imagerating, and imagematrix questions, store imageHtml
                        let imagesHtml = '<div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0;">';
                        selectedImages.forEach((image) => {
                          imagesHtml += `<img src="${image.url}" data-image-name="${image.name}" style="max-width: 300px; height: auto; border-radius: 4px;" />`;
                        });
                        imagesHtml += '</div>';
                        
                        element.imageHtml = imagesHtml;
                        // Store image names separately for tracking
                        element.imageNames = selectedImages.map(img => img.name);
                        console.log(`Stored imageHtml for ${element.type} question with ${selectedImages.length} images`);
                      } else {
                        // For other image question types, use choices
                        element.choices = selectedImages.map((image, index) => ({
                          value: `image_${index}`,
                          imageLink: image.url,
                          imageName: image.name // Store name for tracking
                        }));
                        // Also store names in a separate array for easier tracking
                        element.imageNames = selectedImages.map(img => img.name);
                      }
                      element.imageFit = "cover";
                      
                      console.log(`Loaded ${selectedImages.length} random images for question: ${element.name}`);
                    } else {
                      console.warn(`No images found for random selection in question: ${element.name}`);
                    }
                  } catch (error) {
                    console.error(`Error loading random images for question ${element.name}:`, error);
                  }
                }
              }
            }
          }
        }
        
        // Post-process: Convert imageboolean questions to panels with HTML + boolean
        if (finalSurveyJson.pages) {
          for (const page of finalSurveyJson.pages) {
            if (page.elements) {
              const newElements = [];
              for (const element of page.elements) {
                // Extract and track images from imageNames (for manually or randomly selected images)
                if (element.imageNames && !imageTracker[element.name]) {
                  imageTracker[element.name] = element.imageNames;
                  console.log(`✅ Tracked ${element.imageNames.length} image names from imageNames for question: ${element.name}`, element.imageNames);
                } else if (element.imageHtml && !imageTracker[element.name]) {
                  // Fallback: extract names from data-image-name attributes
                  const imgRegex = /data-image-name="([^"]+)"/g;
                  const names = [];
                  let match;
                  while ((match = imgRegex.exec(element.imageHtml)) !== null) {
                    names.push(match[1]);
                  }
                  if (names.length > 0) {
                    imageTracker[element.name] = names;
                    console.log(`✅ Tracked ${names.length} image names from imageHtml data attributes for question: ${element.name}`, names);
                  }
                }
                
                // Extract and track images from choices (for imagepicker, imageranking)
                if (element.choices && !imageTracker[element.name]) {
                  const names = element.choices
                    .map(choice => choice.imageName)
                    .filter(name => name);
                  if (names.length > 0) {
                    imageTracker[element.name] = names;
                    console.log(`✅ Tracked ${names.length} image names from choices for question: ${element.name}`, names);
                  }
                }
                
                // Extract and track images from imageName/imageNames (for image display)
                if (element.imageName && !imageTracker[element.name]) {
                  imageTracker[element.name] = [element.imageName];
                  console.log(`✅ Tracked 1 image name from imageName for question: ${element.name}`, [element.imageName]);
                } else if (element.imageNames && !imageTracker[element.name]) {
                  imageTracker[element.name] = element.imageNames;
                  console.log(`✅ Tracked ${element.imageNames.length} image names from imageNames for question: ${element.name}`, element.imageNames);
                }
                
                // Check if element should be converted to panel (has imageHtml from manual or random selection)
                if (element.type === 'imageboolean' && (element.imageHtml || element.randomImageSelection)) {
                  // If no imageHtml yet, this means images weren't loaded (shouldn't happen after image loading loop)
                  if (!element.imageHtml) {
                    console.warn(`imageboolean ${element.name} has no imageHtml, skipping panel conversion`);
                    newElements.push(element);
                    continue;
                  }
                  // Convert imageboolean to panel - keeps everything in one frame
                  console.log(`Converting imageboolean question ${element.name} to panel with HTML`);
                  
                  newElements.push({
                    type: 'panel',
                    name: `${element.name}_panel`,
                    title: 'See below images:', // Fixed instruction text
                    description: element.description,
                    state: 'expanded',
                    elements: [
                      {
                        type: 'html',
                        name: `${element.name}_images`,
                        html: element.imageHtml
                      },
                      {
                        type: 'boolean',
                        name: element.name,
                        title: element.title, // Show actual question title
                        isRequired: element.isRequired,
                        labelTrue: element.labelTrue || 'Yes',
                        labelFalse: element.labelFalse || 'No',
                        valueTrue: element.valueTrue,
                        valueFalse: element.valueFalse
                      }
                    ]
                  });
                } else if (element.type === 'imagerating' && (element.imageHtml || element.randomImageSelection)) {
                  // If no imageHtml yet, this means images weren't loaded (shouldn't happen after image loading loop)
                  if (!element.imageHtml) {
                    console.warn(`imagerating ${element.name} has no imageHtml, skipping panel conversion`);
                    newElements.push(element);
                    continue;
                  }
                  // Convert imagerating to panel - keeps everything in one frame
                  console.log(`Converting imagerating question ${element.name} to panel with HTML`);
                  
                  newElements.push({
                    type: 'panel',
                    name: `${element.name}_panel`,
                    title: 'See below images:', // Fixed instruction text
                    description: element.description,
                    state: 'expanded',
                    elements: [
                      {
                        type: 'html',
                        name: `${element.name}_images`,
                        html: element.imageHtml
                      },
                      {
                        type: 'rating',
                        name: element.name,
                        title: element.title, // Show actual question title
                        isRequired: element.isRequired,
                        rateMin: element.rateMin || 1,
                        rateMax: element.rateMax || 5,
                        minRateDescription: element.minRateDescription,
                        maxRateDescription: element.maxRateDescription
                      }
                    ]
                  });
                } else if (element.type === 'imagematrix' && (element.imageHtml || element.randomImageSelection)) {
                  // If no imageHtml yet, this means images weren't loaded (shouldn't happen after image loading loop)
                  if (!element.imageHtml) {
                    console.warn(`imagematrix ${element.name} has no imageHtml, skipping panel conversion`);
                    newElements.push(element);
                    continue;
                  }
                  // Convert imagematrix to panel - keeps everything in one frame
                  console.log(`Converting imagematrix question ${element.name} to panel with HTML`);
                  
                  newElements.push({
                    type: 'panel',
                    name: `${element.name}_panel`,
                    title: 'See below images:', // Fixed instruction text
                    description: element.description,
                    state: 'expanded',
                    elements: [
                      {
                        type: 'html',
                        name: `${element.name}_images`,
                        html: element.imageHtml
                      },
                      {
                        type: 'matrix',
                        name: element.name,
                        title: element.title, // Show actual question title
                        isRequired: element.isRequired,
                        columns: element.columns,
                        rows: element.rows
                      }
                    ]
                  });
                } else {
                  newElements.push(element);
                }
              }
              page.elements = newElements;
            }
          }
        }
        
        setAdminConfigExists(true);
        console.log('Using admin configuration:', adminConfig.title);
      } else {
        // Use original configuration
        finalSurveyJson = surveyJson;
        setAdminConfigExists(!!adminConfig);
        console.log('Using original configuration');
      }

      // Create survey model
      const model = new Model(finalSurveyJson);
      
      // Apply theme
      if (useAdminConfig && adminConfig && adminConfig.theme) {
        // Use custom theme from admin config
        const customTheme = generateCustomTheme(adminConfig);
        if (customTheme) {
          model.applyTheme(customTheme);
          console.log('Applied custom theme:', customTheme);
        }
      } else if (themeJson) {
        // Use default theme
        model.applyTheme(themeJson);
      }
      
      // Apply survey configuration based on which config we're using
      if (useAdminConfig && adminConfig) {
        // Use admin configuration settings
        model.title = adminConfig.title || finalSurveyJson.title;
        model.description = adminConfig.description || finalSurveyJson.description;
        model.logo = adminConfig.logo || '';
        model.logoPosition = adminConfig.logoPosition || 'right';
        
        console.log('Applying admin config:', {
          title: model.title,
          description: model.description,
          logo: model.logo,
          logoPosition: model.logoPosition
        });
        
        // Settings already applied to model directly via finalSurveyJson
        console.log('Admin settings applied via SurveyJS format');
      } else {
        // Use original survey configuration
        model.title = surveyConfig.title;
        model.description = surveyConfig.description;
        model.logo = surveyConfig.logo;
        model.logoPosition = surveyConfig.logoPosition;
        
        // Apply original settings (if they exist in nested format)
        if (surveyConfig.settings) {
          Object.keys(surveyConfig.settings).forEach(key => {
            model[key] = surveyConfig.settings[key];
          });
        }
      }

      // Handle survey completion
      model.onComplete.add(async (survey, options) => {
        console.log("=== SURVEY COMPLETION STARTED ===");
        const responses = survey.data;
        
        // Check Supabase configuration before saving
        const currentSupabaseConfig = sessionStorage.getItem('supabase_config');
        console.log('Current Supabase config in sessionStorage:', currentSupabaseConfig);
        
        // Combine user responses with displayed images information
        const completeData = {
          responses: responses,
          displayed_images: displayedImagesRef.current, // Use ref to get latest value
          survey_metadata: {
            completion_time: new Date().toISOString(),
            user_agent: navigator.userAgent,
            screen_resolution: `${window.screen.width}x${window.screen.height}`,
            survey_version: useAdminConfig ? `2.0-admin-${projectId}` : "1.0-original",
            project_id: projectId
          }
        };
        
        console.log("Survey completed with complete data:", completeData);
        console.log("📸 Displayed images in response:", displayedImagesRef.current);
        console.log("Attempting to save to Supabase...");
        
        // Save to Supabase
        const result = await saveSurveyResponse(completeData);
        
        console.log("Save result:", result);
        
        if (result.success) {
          console.log("✅ Survey response saved successfully!");
          const storageMessage = result.storage === 'file' 
            ? "Thank you for completing the survey! Your responses have been saved locally. (Note: Supabase database not configured)"
            : "Thank you for completing the survey! Your responses have been saved to the database.";
          alert(storageMessage);
        } else {
          console.error("❌ Failed to save survey response:", result.error);
          alert("There was an error saving your responses. Please try again.");
        }
      });

      // Save displayed images mapping (both state and ref)
      setDisplayedImagesMap(imageTracker);
      displayedImagesRef.current = imageTracker; // Save to ref for onComplete callback
      console.log('📸 Displayed images tracker:', imageTracker);
      console.log('📸 Number of questions with images:', Object.keys(imageTracker).length);
      
      // Record load time for staleness detection
      window.lastSurveyLoadTime = Date.now();
      console.log('✅ Survey initialized successfully at:', new Date(window.lastSurveyLoadTime).toISOString());
      
      setSurveyModel(model);
      setError(null);
    } catch (err) {
      console.error('Error initializing survey:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading survey: {error}
        </Alert>
        <Button variant="contained" onClick={initializeSurvey}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant={!useAdminConfig ? "contained" : "outlined"}
            onClick={() => setUseAdminConfig(false)}
            sx={{ mr: 1 }}
            title="The original research survey from the published paper"
          >
            Yang et al., 2025
          </Button>
          <Button
            variant={useAdminConfig ? "contained" : "outlined"}
            onClick={() => setUseAdminConfig(true)}
            disabled={!adminConfigExists}
            title="Survey created in the Admin Panel"
          >
            Custom Survey {!adminConfigExists && '(Not Available)'}
          </Button>
          
          {!useAdminConfig && (
            <Alert severity="info" sx={{ py: 0 }}>
              Using the original research survey from the published paper
            </Alert>
          )}
          
          {useAdminConfig && adminConfigExists && (
            <Alert severity="success" sx={{ py: 0 }}>
              Live: Updates automatically from Admin Panel
            </Alert>
          )}
          
          {!adminConfigExists && (
            <Alert severity="warning" sx={{ py: 0 }}>
              No custom survey found. Create one in the Admin Panel.
            </Alert>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {!isSupabaseConfigured() && (
            <Alert severity="info" sx={{ py: 0 }}>
              Using local storage (Supabase not configured)
            </Alert>
          )}
          <Button
            variant="outlined"
            onClick={() => setInfoDialogOpen(true)}
            sx={{ mr: 1 }}
          >
            Survey Types Info
          </Button>
          <Button
            variant="contained"
            onClick={() => window.location.href = '/admin'}
          >
            Go to Admin Panel
          </Button>
        </Box>
      </Box>
      
      {surveyModel && <Survey model={surveyModel} />}
      
      {/* Survey Types Info Dialog */}
      <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Survey Types Explanation</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ mb: 1, color: 'primary.main' }}>
                🔬 Yang et al., 2025
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                This is the original survey from the published research paper:
              </Typography>
              <Typography variant="caption" sx={{ fontStyle: 'italic', mb: 2, display: 'block' }}>
                "Yang, S., Chong, A., Liu, P., & Biljecki, F. (2025). Thermal comfort in sight: 
                Thermal affordance and its visual assessment for sustainable streetscape design. 
                Building and Environment, 112569. Elsevier."
              </Typography>
              <Typography variant="body2">
                • Fixed survey structure designed for streetscape thermal comfort research<br/>
                • Pre-defined questions and street view images<br/>
                • Academically validated survey design<br/>
                • Cannot be modified through the interface
              </Typography>
            </Box>

            <Box>
              <Typography variant="h6" sx={{ mb: 1, color: 'secondary.main' }}>
                🎨 Custom Survey (Admin Panel)
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                This is a survey you can create and customize through the Admin Panel:
              </Typography>
              <Typography variant="body2">
                • Fully customizable survey structure<br/>
                • Upload your own images and create custom questions<br/>
                • Real-time editing and preview<br/>
                • Auto-saves changes automatically<br/>
                • Perfect for new research projects or different study designs
              </Typography>
            </Box>

            <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                💡 Quick Guide:
              </Typography>
              <Typography variant="body2">
                • <strong>For academic replication:</strong> Use "Yang et al., 2025"<br/>
                • <strong>For new research:</strong> Create a "Custom Survey" in the Admin Panel<br/>
                • <strong>For testing:</strong> Try the demo survey by clicking "Load Demo" in Admin Panel
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>Close</Button>
          <Button onClick={() => window.location.href = '/admin'} variant="contained">
            Go to Admin Panel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
