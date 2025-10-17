import React, { useState, useEffect } from 'react';
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";
import "survey-core/defaultV2.min.css";
import { Box, Alert, CircularProgress } from '@mui/material';
import { convertToSurveyJS, generateCustomTheme } from '../../lib/surveyStorage';
import { themeJson } from "../../theme";
import registerImageRankingWidget, { registerImageRatingWidget, registerImageBooleanWidget } from '../SurveyCustomComponents';

export default function SurveyPreview({ config }) {
  const [processedConfig, setProcessedConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processConfig = async () => {
      if (!config) {
        setLoading(false);
        return;
      }

      try {
        console.log('🎨 Preview: Processing config at:', new Date().toISOString());
        
        // Register custom components
        registerImageRankingWidget();
        registerImageRatingWidget();
        registerImageBooleanWidget();
        
        const configCopy = JSON.parse(JSON.stringify(config));
        
        // Process image questions and convert imageranking to ranking for SurveyJS
        if (configCopy.pages) {
          for (const page of configCopy.pages) {
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
                
                // Process random image selection for imagepicker, imageranking, imagerating, imageboolean, imagematrix, and image questions
                if ((element.type === 'imagepicker' || element.type === 'imageranking' || element.type === 'imagerating' || element.type === 'imageboolean' || element.type === 'image' || element.type === 'imagematrix') && element.randomImageSelection) {
                  console.log(`🔄 Preview: Loading images for ${element.type} question: ${element.name}`);
                  try {
                    let result;
                    
                    // PRIORITY 1: Check if project has preloaded images
                    if (config.preloadedImages && config.preloadedImages.length > 0) {
                      console.log(`📦 Preview: Using preloaded images from project (${config.preloadedImages.length} available)`);
                      
                      // Use type-specific defaults if imageCount is not set
                      const defaultCount = (element.type === 'imagerating' || element.type === 'imagematrix' || element.type === 'imageboolean' || element.type === 'image') ? 1 : 4;
                      const imageCount = element.imageCount || defaultCount;
                      
                      // Randomly select from preloaded images
                      const shuffled = [...config.preloadedImages].sort(() => 0.5 - Math.random());
                      const selectedImages = shuffled.slice(0, imageCount);
                      
                      result = {
                        success: true,
                        images: selectedImages
                      };
                      
                      console.log(`✅ Preview: Selected ${selectedImages.length} random images from preloaded pool`);
                    }
                    // PRIORITY 2: Determine image source if no preloaded images
                    else if (element.imageSource === 'huggingface' && element.huggingFaceConfig) {
                      // Load from Hugging Face
                      // Use type-specific defaults if imageCount is not set
                      const defaultCount = (element.type === 'imagerating' || element.type === 'imagematrix' || element.type === 'imageboolean' || element.type === 'image') ? 1 : 4;
                      const imageCount = element.imageCount || defaultCount;
                      console.log(`📥 Preview: Fetching ${imageCount} images from Hugging Face dataset: ${element.huggingFaceConfig.datasetName}`);
                      const { getRandomImagesFromHuggingFace } = await import('../../lib/huggingface');
                      const { huggingFaceToken, datasetName } = element.huggingFaceConfig;
                      
                      if (datasetName) {
                        result = await getRandomImagesFromHuggingFace(huggingFaceToken, datasetName, imageCount);
                        console.log(`✅ Preview: Successfully loaded ${result?.images?.length || 0} images from Hugging Face`);
                      } else {
                        console.warn(`Preview: Hugging Face dataset name missing for question: ${element.name}`);
                        continue;
                      }
                    } else if (element.supabaseConfig) {
                      // Load from Supabase (default/legacy behavior)
                      const { getAllImagesFromSupabase } = await import('../../lib/supabase');
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
                      console.warn(`Preview: No image source configured for question: ${element.name}`);
                      continue;
                    }
                    
                    if (result.success && result.images.length > 0) {
                      const selectedImages = result.images;
                      
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
                        console.log(`Preview: Stored imageHtml for ${element.type} question with ${selectedImages.length} images`);
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
                      
                      console.log(`Preview loaded ${selectedImages.length} random images for question: ${element.name}`);
                    } else {
                      console.warn(`Preview: No images found for random selection in question: ${element.name}`);
                    }
                  } catch (error) {
                    console.error(`Preview: Error loading random images for question ${element.name}:`, error);
                  }
                }
              }
            }
          }
        }
        
        // Post-process: Convert imageboolean questions to panels with HTML + boolean
        if (configCopy.pages) {
          for (const page of configCopy.pages) {
            if (page.elements) {
              const newElements = [];
              for (const element of page.elements) {
                if (element.type === 'imageboolean' && element.imageHtml) {
                  // Convert imageboolean to panel - keeps everything in one frame
                  console.log(`Preview: Converting imageboolean question ${element.name} to panel with HTML`);
                  
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
                } else if (element.type === 'imagerating' && element.imageHtml) {
                  // Convert imagerating to panel - keeps everything in one frame
                  console.log(`Preview: Converting imagerating question ${element.name} to panel with HTML`);
                  
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
                } else if (element.type === 'imagematrix' && element.imageHtml) {
                  // Convert imagematrix to panel - keeps everything in one frame
                  console.log(`Preview: Converting imagematrix question ${element.name} to panel with HTML`);
                  
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
        
        setProcessedConfig(configCopy);
      } catch (error) {
        console.error('Error processing config for preview:', error);
        setProcessedConfig(config);
      } finally {
        setLoading(false);
      }
    };

    processConfig();
  }, [config]);

  if (!config) {
    return (
      <Alert severity="warning">
        No survey configuration available for preview.
      </Alert>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  try {
    // Directly use processed configuration (already in standard SurveyJS format)
    const model = new Model(processedConfig || config);
    
    // Apply theme (same as Live Survey)
    if (config.theme) {
      // Use custom theme from admin config
      const customTheme = generateCustomTheme(config);
      if (customTheme) {
        model.applyTheme(customTheme);
        console.log('Preview applied custom theme:', customTheme);
      }
    } else if (themeJson) {
      // Use default theme
      model.applyTheme(themeJson);
    }
    
    // Configuration already applied directly to model (via new Model(config))
    // No additional setup needed
    
    // Disable survey completion for preview
    model.mode = "display";
    
    console.log('Preview using standard SurveyJS config:', {
      title: model.title,
      description: model.description,
      logo: model.logo,
      logoPosition: model.logoPosition,
      showQuestionNumbers: model.showQuestionNumbers,
      showProgressBar: model.showProgressBar
    });
    
    return (
      <Box sx={{ maxHeight: '70vh', overflow: 'auto' }}>
        <Box sx={{ 
          bgcolor: 'info.light', 
          color: 'info.contrastText', 
          p: 1, 
          textAlign: 'center', 
          mb: 2,
          borderRadius: 1
        }}>
          📋 Preview Mode - This shows exactly how your survey will appear to participants
        </Box>
        <Survey model={model} />
      </Box>
    );
  } catch (error) {
    console.error('Error creating survey preview:', error);
    return (
      <Alert severity="error">
        Error creating survey preview: {error.message}
      </Alert>
    );
  }
}
