import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Switch,
  FormControlLabel,
  CircularProgress,
  LinearProgress,
  Chip,
  Divider
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Save,
  CloudDownload,
  Delete,
  Image as ImageIcon
} from '@mui/icons-material';
import { 
  testHuggingFaceConnection,
  getImagesFromHuggingFace,
  getImageCountFromDataset 
} from '../../lib/huggingface';

export default function ImageDataset({ currentProject, onProjectUpdate, onConfigChange, onNextStep }) {
  const [config, setConfig] = useState({
    huggingFaceToken: '',
    datasetName: '',
    enabled: false,
    supabaseUrl: '',
    supabaseKey: ''
  });
  const [initialConfig, setInitialConfig] = useState(null); // Track the initial saved config
  const [status, setStatus] = useState({
    connected: false,
    loading: false,
    error: null,
    success: null,
    datasetInfo: null
  });

  // Ref to preserve scroll position during updates
  const scrollPositionRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);

  // Effect to restore scroll position after render
  useEffect(() => {
    if (shouldRestoreScrollRef.current) {
      const scrollPos = scrollPositionRef.current;
      // Use multiple methods to ensure scroll restoration
      window.scrollTo(0, scrollPos);
      document.documentElement.scrollTop = scrollPos;
      document.body.scrollTop = scrollPos;
      
      console.log('📍 Restored scroll position:', scrollPos);
      shouldRestoreScrollRef.current = false;
    }
  });

  const [supabaseStatus, setSupabaseStatus] = useState({
    connected: false,
    loading: false,
    error: null,
    success: null,
    projectInfo: null
  });

  const [preloadStatus, setPreloadStatus] = useState({
    loading: false,
    progress: 0,
    total: 0,
    error: null,
    success: null
  });

  useEffect(() => {
    if (currentProject?.imageDatasetConfig) {
      const projectConfig = currentProject.imageDatasetConfig;
      setConfig(projectConfig);
      setInitialConfig(JSON.parse(JSON.stringify(projectConfig))); // Save initial config for comparison
      
      // Restore Hugging Face connection status if previously successful
      if (projectConfig.datasetInfo) {
        setStatus({
          loading: false,
          connected: true,
          error: null,
          success: 'Connection verified (from saved state)',
          datasetInfo: projectConfig.datasetInfo
        });
      }
      
      // Restore Supabase connection status if previously successful
      if (projectConfig.supabaseConnectionStatus) {
        setSupabaseStatus({
          loading: false,
          connected: true,
          error: null,
          success: 'Connection verified (from saved state)',
          projectInfo: projectConfig.supabaseConnectionStatus.projectInfo
        });
      }
    } else {
      const defaultConfig = { enabled: false, huggingFaceToken: '', datasetName: '', datasetInfo: null };
      setConfig(defaultConfig);
      setInitialConfig(JSON.parse(JSON.stringify(defaultConfig)));
    }
  }, [currentProject]);

  // Monitor config changes and notify parent
  useEffect(() => {
    if (initialConfig && onConfigChange) {
      const hasChanges = JSON.stringify(config) !== JSON.stringify(initialConfig);
      console.log('🔍 ImageDataset config changed:', {
        hasChanges,
        currentDataset: config.datasetName,
        initialDataset: initialConfig.datasetName
      });
      // Pass both hasChanges and the latest config to parent
      onConfigChange(hasChanges, config);
    }
  }, [config, initialConfig, onConfigChange]);

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveConfig = () => {
    if (!currentProject) return;

    // Save current scroll position using ref
    scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
    shouldRestoreScrollRef.current = true;
    console.log('💾 Saving scroll position:', scrollPositionRef.current);

    const updatedProject = {
      ...currentProject,
      imageDatasetConfig: config
    };
    onProjectUpdate(updatedProject);
    
    // Update initial config to match saved config (clear unsaved changes indicator)
    setInitialConfig(JSON.parse(JSON.stringify(config)));
    
    if (config.enabled && config.datasetName) {
      testConnection();
    }
  };

  const testConnection = async () => {
    if (!config.datasetName) {
      setStatus(prev => ({
        ...prev,
        error: 'Please provide dataset name'
      }));
      return;
    }

    setStatus(prev => ({
      ...prev,
      loading: true,
      error: null,
      success: null,
      connected: false
    }));

    try {
      const result = await testHuggingFaceConnection(config.huggingFaceToken, config.datasetName);
      
      if (result.success) {
        setStatus({
          loading: false,
          connected: true,
          error: null,
          success: 'Connection successful! (Click "Save Configuration" to persist)',
          datasetInfo: result.datasetInfo
        });
        
        // Update config state with datasetInfo (will be saved when user clicks Save)
        setConfig(prev => ({
          ...prev,
          datasetInfo: result.datasetInfo
        }));
        
        console.log('✅ Hugging Face connection test successful');
      } else {
        setStatus({
          loading: false,
          connected: false,
          error: result.error || 'Connection failed',
          success: null,
          datasetInfo: null
        });
        
        setConfig(prev => ({
          ...prev,
          datasetInfo: null
        }));
      }
    } catch (error) {
      console.error('Connection test error:', error);
      setStatus({
        loading: false,
        connected: false,
        error: `Error testing connection: ${error.message}`,
        success: null,
        datasetInfo: null
      });
      
      setConfig(prev => ({
        ...prev,
        datasetInfo: null
      }));
    }
  };

  const testSupabaseConnection = async () => {
    if (!config.supabaseUrl || !config.supabaseKey) {
      setSupabaseStatus(prev => ({
        ...prev,
        error: 'Please provide both Supabase URL and Service Role Key'
      }));
      return;
    }

    setSupabaseStatus({
      loading: true,
      connected: false,
      error: null,
      success: null,
      projectInfo: null
    });

    try {
      console.log('Testing Supabase connection...');
      
      // Import Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(config.supabaseUrl, config.supabaseKey);

      // Test 1: List buckets (tests authentication and permissions)
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Failed to connect: ${listError.message}`);
      }

      console.log('✓ Successfully connected to Supabase');
      console.log(`✓ Found ${buckets?.length || 0} storage buckets`);

      // Test 2: Check if survey-images bucket exists
      const surveyBucketExists = buckets?.some(b => b.name === 'survey-images');
      
      // Gather project info
      const projectInfo = {
        url: config.supabaseUrl,
        bucketsCount: buckets?.length || 0,
        surveyBucketExists: surveyBucketExists,
        buckets: buckets?.map(b => b.name) || []
      };

      setSupabaseStatus({
        loading: false,
        connected: true,
        error: null,
        success: 'Supabase connection successful! (Click "Save Configuration" to persist)',
        projectInfo: projectInfo
      });

      console.log('Supabase project info:', projectInfo);
      
      // Update config state with connection status (will be saved when user clicks Save)
      setConfig(prev => ({
        ...prev,
        supabaseConnectionStatus: {
          connected: true,
          projectInfo: projectInfo,
          lastTested: new Date().toISOString()
        }
      }));
      
      console.log('✅ Supabase connection test successful');

    } catch (error) {
      console.error('Supabase connection test error:', error);
      
      let errorMessage = error.message;
      
      // Provide helpful error messages
      if (error.message.includes('Invalid API key')) {
        errorMessage = 'Invalid Service Role Key. Please check your key from Supabase Settings → API.';
      } else if (error.message.includes('Invalid URL')) {
        errorMessage = 'Invalid Supabase URL. Please check your Project URL from Supabase Settings → API.';
      }
      
      setSupabaseStatus({
        loading: false,
        connected: false,
        error: errorMessage,
        success: null,
        projectInfo: null
      });
      
      // Update config state with error status (will be saved when user clicks Save)
      setConfig(prev => ({
        ...prev,
        supabaseConnectionStatus: {
          connected: false,
          error: errorMessage,
          lastTested: new Date().toISOString()
        }
      }));
    }
  };

  const handlePreloadAllImages = async () => {
    // Save scroll position using ref
    scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
    shouldRestoreScrollRef.current = true;
    
    if (!config.datasetName) {
      setPreloadStatus(prev => ({
        ...prev,
        error: 'Please configure and test dataset connection first'
      }));
      return;
    }

    if (!config.supabaseUrl || !config.supabaseKey) {
      setPreloadStatus(prev => ({
        ...prev,
        error: 'Please configure Supabase connection first'
      }));
      return;
    }

    setPreloadStatus({
      loading: true,
      progress: 0,
      total: 0,
      error: null,
      success: null
    });

    try {
      console.log('🚀 Starting image preload: Download from HF → Upload to Supabase');

      // Import Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(config.supabaseUrl, config.supabaseKey);

      // Step 1: Ensure bucket exists
      console.log('📦 Checking/creating survey-images bucket...');
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }

      const bucketExists = buckets?.some(b => b.name === 'survey-images');
      
      if (!bucketExists) {
        console.log('🆕 Creating survey-images bucket...');
        const { error: createError } = await supabase.storage.createBucket('survey-images', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (createError) {
          throw new Error(`Failed to create bucket: ${createError.message}`);
        }
        console.log('✅ Bucket created successfully');
      } else {
        console.log('✅ Bucket already exists');
      }

      // Step 2: Get total image count from HF
      const countResult = await getImageCountFromDataset(config.huggingFaceToken, config.datasetName);
      const totalImages = countResult.imageCount || 1000;
      
      console.log(`📊 Total images in dataset: ${totalImages}`);
      
      setPreloadStatus(prev => ({
        ...prev,
        total: totalImages
      }));

      // Step 3: Fetch images from HF in batches
      const allSupabaseImages = [];
      const batchSize = 100;
      const batches = Math.ceil(totalImages / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const offset = i * batchSize;
        const limit = Math.min(batchSize, totalImages - offset);
        
        console.log(`📥 Batch ${i + 1}/${batches}: Fetching ${limit} images from Hugging Face...`);
        
        const result = await getImagesFromHuggingFace(
          config.huggingFaceToken,
          config.datasetName,
          limit,
          offset
        );

        if (!result.success || !result.images) {
          throw new Error(result.error || 'Failed to fetch images from Hugging Face');
        }

        // Step 4: Download and upload each image to Supabase
        console.log(`☁️ Uploading ${result.images.length} images to Supabase...`);
        
        for (const hfImage of result.images) {
          try {
            // Download image from HF
            const response = await fetch(hfImage.url);
            if (!response.ok) {
              console.warn(`⚠️ Failed to download ${hfImage.name}: ${response.statusText}`);
              continue;
            }
            
            const blob = await response.blob();
            
            // Generate unique filename
            const fileName = `${config.datasetName.replace('/', '_')}/${hfImage.name}.jpg`;
            
            // Upload to Supabase
            const { data, error } = await supabase.storage
              .from('survey-images')
              .upload(fileName, blob, {
                contentType: 'image/jpeg',
                upsert: true
              });

            if (error) {
              console.warn(`⚠️ Failed to upload ${fileName}: ${error.message}`);
              continue;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
              .from('survey-images')
              .getPublicUrl(fileName);

            // ✅ Simplified: only store url and name
            allSupabaseImages.push({
              url: publicUrl,
              name: hfImage.name
            });

            setPreloadStatus(prev => ({
              ...prev,
              progress: allSupabaseImages.length
            }));

          } catch (err) {
            console.warn(`⚠️ Error processing ${hfImage.name}:`, err);
          }
        }
      }

      console.log(`✅ Successfully uploaded ${allSupabaseImages.length} images to Supabase`);

      // Step 5: Save Supabase URLs to project config (preserve imageDatasetConfig)
      const updatedProject = {
        ...currentProject,
        preloadedImages: allSupabaseImages,
        preloadedAt: new Date().toISOString(),
        preloadedSource: 'supabase',
        supabaseBucket: 'survey-images',
        imageDatasetConfig: {
          ...currentProject.imageDatasetConfig,
          ...config // Ensure Supabase config is preserved
        }
      };
      
      onProjectUpdate(updatedProject);

      setPreloadStatus({
        loading: false,
        progress: allSupabaseImages.length,
        total: totalImages,
        error: null,
        success: `Successfully preloaded ${allSupabaseImages.length} images to Supabase! All images have permanent URLs.`
      });

    } catch (error) {
      console.error('❌ Error preloading images:', error);
      setPreloadStatus({
        loading: false,
        progress: 0,
        total: 0,
        error: error.message || 'Failed to preload images',
        success: null
      });
    }
  };

  const handleClearPreloadedImages = async () => {
    if (!currentProject) return;

    // Save scroll position using ref
    scrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
    shouldRestoreScrollRef.current = true;

    // Confirm deletion
    const confirmDelete = window.confirm(
      `Are you sure you want to clear all preloaded images?\n\n` +
      `This will:\n` +
      `• Delete ${currentProject.preloadedImages?.length || 0} images from Supabase Storage\n` +
      `• Clear image references from project JSON\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setPreloadStatus({
      loading: true,
      progress: 0,
      total: currentProject.preloadedImages?.length || 0,
      error: null,
      success: null
    });

    try {
      // Step 1: Delete from Supabase Storage (if configured and images exist)
      if (config.supabaseUrl && config.supabaseKey && currentProject.preloadedImages?.length > 0) {
        console.log('🗑️ Deleting images from Supabase Storage...');
        
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(config.supabaseUrl, config.supabaseKey);

        // ✅ Extract file paths from Supabase URLs
        // URL format: https://{project}.supabase.co/storage/v1/object/public/survey-images/{filename}
        const pathsToDelete = currentProject.preloadedImages
          .map(img => {
            try {
              const url = new URL(img.url);
              const pathParts = url.pathname.split('/');
              return pathParts[pathParts.length - 1]; // Get filename from URL
            } catch (e) {
              console.warn('Failed to parse URL:', img.url);
              return null;
            }
          })
          .filter(path => path); // Filter out null paths

        console.log(`Found ${pathsToDelete.length} files to delete from Supabase`);

        if (pathsToDelete.length > 0) {
          // Delete files in batches
          const batchSize = 50; // Supabase recommends batching deletes
          let deletedCount = 0;

          for (let i = 0; i < pathsToDelete.length; i += batchSize) {
            const batch = pathsToDelete.slice(i, i + batchSize);
            
            const { data, error } = await supabase.storage
              .from('survey-images')
              .remove(batch);

            if (error) {
              console.warn(`⚠️ Error deleting batch ${i / batchSize + 1}:`, error);
            } else {
              deletedCount += batch.length;
              console.log(`✓ Deleted batch ${i / batchSize + 1}: ${batch.length} files`);
            }

            setPreloadStatus(prev => ({
              ...prev,
              progress: deletedCount
            }));
          }

          console.log(`✅ Deleted ${deletedCount} files from Supabase Storage`);
        }
      }

      // Step 2: Clear from project JSON (preserve imageDatasetConfig)
      const updatedProject = {
        ...currentProject,
        preloadedImages: [],
        preloadedAt: null,
        preloadedSource: null,
        supabaseBucket: null,
        imageDatasetConfig: {
          ...currentProject.imageDatasetConfig,
          ...config // Preserve Supabase config
        }
      };
      
      onProjectUpdate(updatedProject);

      setPreloadStatus({
        loading: false,
        progress: 0,
        total: 0,
        error: null,
        success: 'Successfully cleared all preloaded images from Supabase and project JSON!'
      });

    } catch (error) {
      console.error('❌ Error clearing preloaded images:', error);
      setPreloadStatus({
        loading: false,
        progress: 0,
        total: 0,
        error: `Failed to clear images: ${error.message}`,
        success: null
      });
    }
  };

  const getStatusIcon = () => {
    if (status.loading) return <CircularProgress size={20} />;
    if (status.connected) return <CheckCircle color="success" />;
    if (status.error) return <ErrorIcon color="error" />;
    return <Warning color="action" />;
  };

  const getStatusMessage = () => {
    if (!config.enabled) {
      return {
        type: 'error',
        message: 'Hugging Face dataset integration is not enabled. Please enable it below.'
      };
    }
    
    if (!config.datasetName) {
      return {
        type: 'info',
        message: 'Enter your dataset configuration below and click "Save Configuration" to get started.'
      };
    }
    
    if (!status.connected && !status.error && !status.loading) {
      return {
        type: 'info',
        message: 'Configuration saved. Click "Test Connection" to verify dataset access.'
      };
    }
    
    if (status.loading) {
      return {
        type: 'info',
        message: 'Testing connection to Hugging Face dataset...'
      };
    }
    
    if (status.connected) {
      return {
        type: 'success',
        message: status.success || 'Successfully connected to Hugging Face dataset!'
      };
    }
    
    if (status.error) {
      return {
        type: 'error',
        message: status.error
      };
    }
    
    return {
      type: 'info',
      message: 'Ready to configure Hugging Face dataset integration.'
    };
  };

  const statusInfo = getStatusMessage();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ mb: 2, color: 'primary.main' }}>
          🤗 Hugging Face Dataset Integration
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Configure your Hugging Face dataset connection to use images in your surveys.
        </Typography>

        {/* Setup Instructions */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            📋 Complete Setup Instructions:
          </Typography>
          <Typography variant="body2" component="div">
            1. <strong>For public datasets:</strong> Leave access token empty - no authentication needed<br/>
            2. <strong>For private datasets:</strong> Get token from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">Hugging Face Settings → Access Tokens</a><br/>
            3. Create a new token with "Read" permissions and paste it below<br/>
            4. Browse <a href="https://huggingface.co/datasets" target="_blank" rel="noopener noreferrer">Hugging Face Datasets</a> to find your dataset<br/>
            5. Use format: "username/dataset-name" (e.g., "sijiey/Thermal-Affordance-Dataset")<br/>
            6. Enable integration and click "Save Configuration"<br/>
            7. Click "Test Connection" to verify dataset access
          </Typography>
        </Alert>

        {/* Status Alert */}
        <Alert severity={statusInfo.type} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {getStatusIcon()}
            <Typography variant="body2">
              {statusInfo.message}
            </Typography>
          </Box>
        </Alert>

        {/* Configuration Form */}
        <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            🔧 Hugging Face Configuration:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                  color="primary"
                />
              }
              label="Enable Hugging Face Dataset Integration"
            />

            <TextField
              fullWidth
              variant="outlined"
              label="Hugging Face Access Token (Optional)"
              type="password"
              value={config.huggingFaceToken}
              onChange={(e) => handleConfigChange('huggingFaceToken', e.target.value)}
              placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              helperText="Optional: Only required for private datasets. Leave empty for public datasets."
              disabled={!config.enabled}
            />

            <TextField
              fullWidth
              variant="outlined"
              label="Dataset Name"
              value={config.datasetName}
              onChange={(e) => handleConfigChange('datasetName', e.target.value)}
              placeholder="sijiey/Thermal-Affordance-Dataset"
              helperText="Format: 'username/dataset-name' (e.g., 'imagenet-1k', 'cifar10' for public datasets)"
              disabled={!config.enabled}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                onClick={handleSaveConfig}
                disabled={!config.enabled || !config.datasetName}
                startIcon={<Save />}
              >
                Save Configuration
              </Button>
              
              <Button
                variant="outlined"
                onClick={testConnection}
                disabled={!config.enabled || !config.datasetName || status.loading}
                startIcon={status.loading ? <CircularProgress size={20} /> : <Refresh />}
              >
                Test Connection
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Dataset Details */}
        {config.datasetInfo && status.connected && (
          <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              📊 Dataset Details:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>Name:</strong> {config.datasetInfo.id}
              </Typography>
              {config.datasetInfo.description && (
                <Typography variant="body2">
                  <strong>Description:</strong> {config.datasetInfo.description}
                </Typography>
              )}
              <Typography variant="body2">
                <strong>Images Found:</strong> {config.datasetInfo.imageCount || 0} images
              </Typography>
              <Typography variant="body2">
                <strong>Private:</strong> {config.datasetInfo.private ? 'Yes' : 'No'}
              </Typography>
              <Typography variant="body2">
                <strong>Last Modified:</strong> {new Date(config.datasetInfo.lastModified).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Viewer:</strong> <a href={`https://huggingface.co/datasets/${config.datasetName}/viewer`} target="_blank" rel="noopener noreferrer">Open Dataset Viewer</a>
              </Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />

        {/* Supabase Storage Configuration */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            ☁️ Supabase Storage Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure Supabase to store images permanently. Preloaded images will be uploaded to Supabase Storage.
          </Typography>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              📋 Setup Instructions:
            </Typography>
            <Typography variant="body2" component="div">
              1. Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Supabase Dashboard</a><br/>
              2. Create a new project or select existing one<br/>
              3. Go to Settings → API<br/>
              4. Copy "Project URL" and "service_role key" (not anon key!)<br/>
              5. Paste them below and click "Test Connection"<br/>
              6. The system will automatically create a "survey-images" bucket when you preload
            </Typography>
          </Alert>

          {/* Supabase Status Alert */}
          {(supabaseStatus.connected || supabaseStatus.error) && (
            <Alert severity={supabaseStatus.connected ? 'success' : 'error'} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {supabaseStatus.loading ? (
                  <CircularProgress size={20} />
                ) : supabaseStatus.connected ? (
                  <CheckCircle />
                ) : (
                  <ErrorIcon />
                )}
                <Typography variant="body2">
                  {supabaseStatus.connected ? supabaseStatus.success : supabaseStatus.error}
                </Typography>
              </Box>
            </Alert>
          )}

          <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              🔧 Supabase Settings:
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                variant="outlined"
                label="Supabase Project URL"
                value={config.supabaseUrl}
                onChange={(e) => handleConfigChange('supabaseUrl', e.target.value)}
                placeholder="https://xxxxx.supabase.co"
                helperText="Your Supabase project URL from Settings → API"
              />

              <TextField
                fullWidth
                variant="outlined"
                label="Supabase Service Role Key"
                type="password"
                value={config.supabaseKey}
                onChange={(e) => handleConfigChange('supabaseKey', e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                helperText="Service role key (NOT anon key) from Settings → API. Required for bucket creation."
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleSaveConfig}
                  startIcon={<Save />}
                  disabled={!config.supabaseUrl || !config.supabaseKey}
                >
                  Save Configuration
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={testSupabaseConnection}
                  disabled={!config.supabaseUrl || !config.supabaseKey || supabaseStatus.loading}
                  startIcon={supabaseStatus.loading ? <CircularProgress size={20} /> : <Refresh />}
                >
                  Test Connection
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Supabase Project Details */}
          {supabaseStatus.projectInfo && supabaseStatus.connected && (
            <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                📊 Supabase Project Details:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Project URL:</strong> {supabaseStatus.projectInfo.url}
                </Typography>
                <Typography variant="body2">
                  <strong>Storage Buckets:</strong> {supabaseStatus.projectInfo.bucketsCount} bucket(s)
                </Typography>
                {supabaseStatus.projectInfo.bucketsCount > 0 && (
                  <Typography variant="body2">
                    <strong>Buckets:</strong> {supabaseStatus.projectInfo.buckets.join(', ')}
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>survey-images bucket:</strong> {supabaseStatus.projectInfo.surveyBucketExists ? (
                    <span style={{ color: 'green' }}>✓ Already exists</span>
                  ) : (
                    <span style={{ color: 'orange' }}>○ Will be created on first preload</span>
                  )}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Image Preload Management */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ImageIcon /> Image Preload Management
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              💡 How Image Preload Works:
            </Typography>
            <Typography variant="body2" component="div">
              1. <strong>Downloads</strong> all images from Hugging Face dataset<br/>
              2. <strong>Uploads</strong> them to your Supabase Storage (survey-images bucket)<br/>
              3. <strong>Saves</strong> permanent Supabase URLs to project JSON<br/>
              4. <strong>Result:</strong> Images never expire, load instantly, work offline<br/>
              <br/>
              ✅ <strong>True permanent URLs</strong> - Supabase URLs never expire!<br/>
              ✅ <strong>No API limits</strong> - Images stored in your own storage<br/>
              ✅ <strong>Production ready</strong> - Perfect for deployed surveys
            </Typography>
          </Alert>

          {/* Current Preload Status */}
          <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              📦 Current Status:
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              {currentProject?.preloadedImages && currentProject.preloadedImages.length > 0 ? (
                <>
                  <Chip 
                    icon={<CheckCircle />} 
                    label={`${currentProject.preloadedImages.length} images in Supabase`}
                    color="success"
                    variant="outlined"
                  />
                  {currentProject.preloadedSource === 'supabase' && (
                    <Chip 
                      label="☁️ Supabase Storage"
                      color="primary"
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {currentProject.supabaseBucket && (
                    <Chip 
                      label={`📦 ${currentProject.supabaseBucket}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {currentProject.preloadedAt && (
                    <Typography variant="body2" color="text.secondary">
                      Uploaded: {new Date(currentProject.preloadedAt).toLocaleString()}
                    </Typography>
                  )}
                </>
              ) : (
                <Chip 
                  icon={<Warning />} 
                  label="No images preloaded to Supabase"
                  color="default"
                  variant="outlined"
                />
              )}
            </Box>

            {/* Preload/Delete Progress */}
            {preloadStatus.loading && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {preloadStatus.progress === 0 && preloadStatus.total > 0 
                      ? 'Downloading from HF → Uploading to Supabase...'
                      : preloadStatus.total > 0 && currentProject?.preloadedImages?.length === preloadStatus.total
                      ? '🗑️ Deleting images from Supabase...'
                      : 'Downloading from HF → Uploading to Supabase...'
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {preloadStatus.progress} / {preloadStatus.total}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={preloadStatus.total > 0 ? (preloadStatus.progress / preloadStatus.total) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {preloadStatus.total > 0 && currentProject?.preloadedImages?.length === preloadStatus.total
                    ? 'Deleting files from Storage...'
                    : 'This may take a few minutes depending on dataset size...'
                  }
                </Typography>
              </Box>
            )}

            {/* Success/Error Messages */}
            {preloadStatus.success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {preloadStatus.success}
              </Alert>
            )}
            {preloadStatus.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {preloadStatus.error}
              </Alert>
            )}

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePreloadAllImages}
                disabled={!status.connected || !config.supabaseUrl || !config.supabaseKey || preloadStatus.loading}
                startIcon={preloadStatus.loading ? <CircularProgress size={20} /> : <CloudDownload />}
              >
                {currentProject?.preloadedImages && currentProject.preloadedImages.length > 0 
                  ? 'Re-preload All Images to Supabase'
                  : 'Preload All Images to Supabase'
                }
              </Button>
              
              <Button
                variant="outlined"
                color="error"
                onClick={handleClearPreloadedImages}
                disabled={!currentProject?.preloadedImages || currentProject.preloadedImages.length === 0 || preloadStatus.loading}
                startIcon={<Delete />}
              >
                Clear Preloaded Images
              </Button>
            </Box>

            {/* Configuration warnings */}
            {!status.connected && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ Please configure Hugging Face dataset and test connection first.
              </Alert>
            )}
            {status.connected && (!config.supabaseUrl || !config.supabaseKey) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                ⚠️ Please configure Supabase Storage above to enable image preload.
              </Alert>
            )}
            {status.connected && config.supabaseUrl && config.supabaseKey && !supabaseStatus.connected && (
              <Alert severity="info" sx={{ mt: 2 }}>
                💡 Please test Supabase connection before preloading images.
              </Alert>
            )}
          </Box>

          {/* Image List Preview (if preloaded) */}
          {currentProject?.preloadedImages && currentProject.preloadedImages.length > 0 && (
            <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                🖼️ Images in Supabase Storage (preview - first 10):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {currentProject.preloadedImages.slice(0, 10).map((img, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      borderRadius: 1, 
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <img 
                      src={img.url} 
                      alt={img.name}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#999;">Failed</div>';
                      }}
                    />
                  </Box>
                ))}
              </Box>
              {currentProject.preloadedImages.length > 10 && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  ... and {currentProject.preloadedImages.length - 10} more images
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Next Step Button */}
      {onNextStep && (
        <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={onNextStep}
            sx={{
              px: 4,
              py: 1.5,
              fontWeight: 600
            }}
          >
            Next: Survey Builder →
          </Button>
        </Box>
      )}
    </Box>
  );
}