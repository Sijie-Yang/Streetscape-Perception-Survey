import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardActions,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add,
  Delete
} from '@mui/icons-material';

export default function QuestionEditor({ question, onSave, onCancel, images, currentProject }) {
  // Convert ranking with isImageRanking back to imageranking for editing
  const initialQuestion = { ...question };
  if (initialQuestion.type === 'ranking' && initialQuestion.isImageRanking) {
    initialQuestion.type = 'imageranking';
  }
  
  const [editedQuestion, setEditedQuestion] = useState(initialQuestion);
  const [newChoice, setNewChoice] = useState('');
  
  // Image selection states
  const [availableImages, setAvailableImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imageError, setImageError] = useState(null);

  const questionTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'comment', label: 'Text Multi-line Input' },
    { value: 'radiogroup', label: 'Text Single Choice' },
    { value: 'checkbox', label: 'Text Multiple Choice' },
    { value: 'imagepicker', label: 'Image Choice' },
    { value: 'ranking', label: 'Text Ranking' },
    { value: 'imageranking', label: 'Image Ranking' },
    { value: 'rating', label: 'Text Rating Scale' },
    { value: 'imagerating', label: 'Image Rating Scale' },
    { value: 'boolean', label: 'Text Yes/No' },
    { value: 'imageboolean', label: 'Image Yes/No' },
    { value: 'dropdown', label: 'Text Dropdown' },
    { value: 'matrix', label: 'Matrix' },
    { value: 'imagematrix', label: 'Image Matrix' },
    { value: 'expression', label: 'Text Instruction' },
    { value: 'image', label: 'Image Display' }
  ];

  const handleQuestionChange = (field, value) => {
    const updates = { [field]: value };
    
    // Set default imageCount when question type changes
    if (field === 'type') {
      // Types that should have 1 image by default
      if (value === 'imagerating' || value === 'imagematrix' || value === 'imageboolean' || value === 'image') {
        if (!editedQuestion.imageCount) {
          updates.imageCount = 1;
        }
      }
      // Types that should have 4 images by default
      else if (value === 'imagepicker' || value === 'imageranking') {
        if (!editedQuestion.imageCount) {
          updates.imageCount = 4;
        }
      }
    }
    
    setEditedQuestion({
      ...editedQuestion,
      ...updates
    });
  };

  const addChoice = () => {
    if (!newChoice.trim()) return;
    
    const choices = editedQuestion.choices || [];
    // Use SurveyJS standard format: {value, text}
    const choiceValue = newChoice.trim().toLowerCase().replace(/\s+/g, '_');
    const newChoiceObj = {
      value: choiceValue,
      text: newChoice.trim()
    };
    const newChoices = [...choices, newChoiceObj];
    
    setEditedQuestion({
      ...editedQuestion,
      choices: newChoices
    });
    setNewChoice('');
  };

  const removeChoice = (index) => {
    const newChoices = editedQuestion.choices.filter((_, i) => i !== index);
    setEditedQuestion({
      ...editedQuestion,
      choices: newChoices
    });
  };

  const addRankingChoice = () => {
    if (!newChoice.trim()) return;
    
    const choices = editedQuestion.choices || [];
    const newChoices = [...choices, { value: newChoice.toLowerCase().replace(/\s+/g, '_'), text: newChoice.trim() }];
    
    setEditedQuestion({
      ...editedQuestion,
      choices: newChoices
    });
    setNewChoice('');
  };

  const removeRankingChoice = (index) => {
    const newChoices = editedQuestion.choices.filter((_, i) => i !== index);
    setEditedQuestion({
      ...editedQuestion,
      choices: newChoices
    });
  };

  const needsChoices = ['radiogroup', 'checkbox', 'dropdown', 'ranking'].includes(editedQuestion.type);
  const isImageQuestion = ['imagepicker', 'image', 'imageranking', 'imagerating', 'imageboolean', 'imagematrix'].includes(editedQuestion.type);
  const isRankingQuestion = editedQuestion.type === 'ranking';
  const isImageRankingQuestion = editedQuestion.type === 'imageranking';

  // Load images from Hugging Face when image questions are selected and in manual mode
  useEffect(() => {
    if ((editedQuestion.type === 'imagepicker' || editedQuestion.type === 'imageranking' || editedQuestion.type === 'imagerating' || editedQuestion.type === 'imageboolean' || editedQuestion.type === 'image' || editedQuestion.type === 'imagematrix') && editedQuestion.imageSelectionMode === 'huggingface_manual') {
      loadImages();
    }
  }, [editedQuestion.type, editedQuestion.imageSelectionMode]);

  // Initialize selected images from existing question data
  useEffect(() => {
    if ((editedQuestion.type === 'imagepicker' || editedQuestion.type === 'imageranking' || editedQuestion.type === 'imagerating' || editedQuestion.type === 'imageboolean' || editedQuestion.type === 'image' || editedQuestion.type === 'imagematrix') && editedQuestion.selectedImageUrls) {
      setSelectedImages(editedQuestion.selectedImageUrls);
    }
  }, [editedQuestion.type]);

  const loadImages = async () => {
    // Only load from Hugging Face now
    if (editedQuestion.imageSelectionMode === 'huggingface_manual') {
      return loadImagesFromHuggingFace();
    }
  };

  const loadImagesFromHuggingFace = async () => {
    if (!currentProject?.imageDatasetConfig?.enabled || !currentProject?.imageDatasetConfig?.datasetName) {
      setImageError('Hugging Face dataset not configured for this project');
      return;
    }

    setLoadingImages(true);
    setImageError(null);

    try {
      // Import Hugging Face functions dynamically
      const { getImagesFromHuggingFace } = await import('../../lib/huggingface');
      
      const { huggingFaceToken, datasetName } = currentProject.imageDatasetConfig;
      
      // Load ALL images from the dataset (since they're just URLs)
      const allImages = [];
      let offset = 0;
      const batchSize = 100;
      let hasMore = true;
      
      console.log('Loading all images from Hugging Face dataset...');
      
      while (hasMore) {
        const result = await getImagesFromHuggingFace(huggingFaceToken, datasetName, batchSize, offset);
        
        if (result.success && result.images.length > 0) {
          allImages.push(...result.images);
          offset += batchSize;
          
          console.log(`Loaded batch: ${result.images.length} images (total so far: ${allImages.length})`);
          
          // Check if we've reached the end
          if (result.images.length < batchSize || (result.total && offset >= result.total)) {
            hasMore = false;
          }
        } else {
          hasMore = false;
          if (allImages.length === 0) {
            setImageError(`Failed to load images from Hugging Face: ${result.error}`);
          }
        }
      }
      
      if (allImages.length > 0) {
        setAvailableImages(allImages);
        setImageError(null);
        console.log(`✅ Successfully loaded ALL ${allImages.length} images from Hugging Face dataset`);
      } else {
        setImageError('No images found in the Hugging Face dataset');
        setAvailableImages([]);
      }
    } catch (error) {
      console.error('Error loading images from Hugging Face:', error);
      setImageError(`Error loading images from Hugging Face: ${error.message}`);
      setAvailableImages([]);
    } finally {
      setLoadingImages(false);
    }
  };


  const handleImageSelection = (imageUrl, selected) => {
    if (selected) {
      if (selectedImages.length < (editedQuestion.imageCount || 4)) {
        const newSelected = [...selectedImages, imageUrl];
        setSelectedImages(newSelected);
        handleQuestionChange('selectedImageUrls', newSelected);
      }
    } else {
      const newSelected = selectedImages.filter(url => url !== imageUrl);
      setSelectedImages(newSelected);
      handleQuestionChange('selectedImageUrls', newSelected);
    }
  };

  return (
    <Dialog open={true} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        Edit Question
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Basic Question Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
              Basic Settings
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                fullWidth
                variant="outlined"
                label="Question Name (Internal ID)"
                value={editedQuestion.name || ''}
                onChange={(e) => handleQuestionChange('name', e.target.value)}
                helperText="Used internally to identify this question (e.g., 'age_group', 'satisfaction_rating')"
                sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
              />
              
              <FormControl fullWidth variant="outlined">
                <InputLabel sx={{ backgroundColor: 'white', px: 1 }}>Question Type</InputLabel>
                <Select
                  value={editedQuestion.type || 'text'}
                  onChange={(e) => handleQuestionChange('type', e.target.value)}
                  label="Question Type"
                >
                  {questionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                variant="outlined"
                label="Question Title"
                value={editedQuestion.title || ''}
                onChange={(e) => handleQuestionChange('title', e.target.value)}
                helperText="The main question text that participants will see"
                sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
              />

              <TextField
                fullWidth
                variant="outlined"
                multiline
                rows={2}
                label="Question Description (Optional)"
                value={editedQuestion.description || ''}
                onChange={(e) => handleQuestionChange('description', e.target.value)}
                helperText="Additional instructions or context for this question"
                sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={editedQuestion.isRequired || false}
                    onChange={(e) => handleQuestionChange('isRequired', e.target.checked)}
                  />
                }
                label="Required Question - participants must answer this question to continue"
              />
            </Box>
          </Box>

          {/* Image Choice for Image Questions */}
          {isImageQuestion && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
                Image Settings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                {editedQuestion.type === 'imagepicker' && (
                  <>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel sx={{ backgroundColor: 'white', px: 1 }}>Image Selection Mode</InputLabel>
                      <Select
                        value={editedQuestion.imageSelectionMode || 'random'}
                        onChange={(e) => handleQuestionChange('imageSelectionMode', e.target.value)}
                        label="Image Selection Mode"
                      >
                        <MenuItem value="huggingface_random">Random Selection from Hugging Face</MenuItem>
                        <MenuItem value="huggingface_manual">Manual Selection from Hugging Face</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Number of Images to Show"
                      value={editedQuestion.imageCount || 4}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        handleQuestionChange('imageCount', Math.min(Math.max(value, 1), 20));
                      }}
                      onFocus={(e) => e.target.select()}
                      helperText={editedQuestion.imageSelectionMode === 'random' 
                        ? "How many images to randomly select from Supabase" 
                        : "How many images you will manually select"}
                      inputProps={{ min: 1, max: 20, step: 1 }}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={editedQuestion.multiSelect || false}
                          onChange={(e) => handleQuestionChange('multiSelect', e.target.checked)}
                        />
                      }
                      label="Allow Multiple Selection - participants can choose more than one image"
                    />

                    {/* Manual Image Choice Interface */}
                    {editedQuestion.imageSelectionMode === 'huggingface_manual' && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          Select Images ({selectedImages.length}/{editedQuestion.imageCount || 4} selected)
                        </Typography>
                        
                        {imageError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {imageError}
                          </Alert>
                        )}
                        
                        {loadingImages ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                          </Box>
                        ) : (
                          <Grid container spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {availableImages.map((image) => (
                              <Grid item xs={6} sm={4} md={3} key={image.url}>
                                <Card sx={{ position: 'relative' }}>
                                  <CardMedia
                                    component="img"
                                    height="120"
                                    image={image.url}
                                    alt={image.name}
                                    sx={{ objectFit: 'cover' }}
                                  />
                                  <CardActions sx={{ position: 'absolute', top: 0, right: 0, p: 0.5 }}>
                                    <Checkbox
                                      checked={selectedImages.includes(image.url)}
                                      onChange={(e) => handleImageSelection(image.url, e.target.checked)}
                                      disabled={!selectedImages.includes(image.url) && selectedImages.length >= (editedQuestion.imageCount || 4)}
                                      sx={{ 
                                        bgcolor: 'rgba(255,255,255,0.8)',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                      }}
                                    />
                                  </CardActions>
                                  <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                                    <Typography variant="caption" noWrap>
                                      {image.name}
                                    </Typography>
                                  </Box>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>
                    )}
                  </>
                )}

                {editedQuestion.type === 'imageranking' && (
                  <>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel sx={{ backgroundColor: 'white', px: 1 }}>Image Selection Mode</InputLabel>
                      <Select
                        value={editedQuestion.imageSelectionMode || 'random'}
                        onChange={(e) => handleQuestionChange('imageSelectionMode', e.target.value)}
                        label="Image Selection Mode"
                      >
                        <MenuItem value="huggingface_random">Random Selection from Hugging Face</MenuItem>
                        <MenuItem value="huggingface_manual">Manual Selection from Hugging Face</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Number of Images to Rank"
                      value={editedQuestion.imageCount || 4}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 2;
                        handleQuestionChange('imageCount', Math.min(Math.max(value, 2), 10));
                      }}
                      onFocus={(e) => e.target.select()}
                      helperText={editedQuestion.imageSelectionMode === 'random' 
                        ? "How many images to randomly select for ranking from Supabase" 
                        : "How many images you will manually select for ranking"}
                      inputProps={{ min: 2, max: 10, step: 1 }}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    {/* Manual Image Selection Interface for Ranking */}
                    {(editedQuestion.imageSelectionMode === 'manual' || editedQuestion.imageSelectionMode === 'huggingface_manual') && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          Select Images for Ranking ({selectedImages.length}/{editedQuestion.imageCount || 4} selected)
                        </Typography>
                        
                        {imageError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {imageError}
                          </Alert>
                        )}
                        
                        {loadingImages ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                          </Box>
                        ) : (
                          <Grid container spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {availableImages.map((image) => (
                              <Grid item xs={6} sm={4} md={3} key={image.url}>
                                <Card sx={{ position: 'relative' }}>
                                  <CardMedia
                                    component="img"
                                    height="120"
                                    image={image.url}
                                    alt={image.name}
                                    sx={{ objectFit: 'cover' }}
                                  />
                                  <CardActions sx={{ position: 'absolute', top: 0, right: 0, p: 0.5 }}>
                                    <Checkbox
                                      checked={selectedImages.includes(image.url)}
                                      onChange={(e) => handleImageSelection(image.url, e.target.checked)}
                                      disabled={!selectedImages.includes(image.url) && selectedImages.length >= (editedQuestion.imageCount || 4)}
                                      sx={{ 
                                        bgcolor: 'rgba(255,255,255,0.8)',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                                      }}
                                    />
                                  </CardActions>
                                  <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.7)', color: 'white' }}>
                                    <Typography variant="caption" noWrap>
                                      {image.name}
                                    </Typography>
                                  </Box>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>
                    )}
                  </>
                )}

                {/* Image Rating Scale Configuration */}
                {editedQuestion.type === 'imagerating' && (
                  <>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel sx={{ backgroundColor: 'white', px: 1 }}>Image Selection Mode</InputLabel>
                      <Select
                        value={editedQuestion.imageSelectionMode || 'random'}
                        onChange={(e) => handleQuestionChange('imageSelectionMode', e.target.value)}
                        label="Image Selection Mode"
                      >
                        <MenuItem value="huggingface_random">Random Selection from Hugging Face</MenuItem>
                        <MenuItem value="huggingface_manual">Manual Selection from Hugging Face</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Number of Images to Display"
                      value={editedQuestion.imageCount || 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        handleQuestionChange('imageCount', Math.min(Math.max(value, 1), 6));
                      }}
                      onFocus={(e) => e.target.select()}
                      helperText={editedQuestion.imageSelectionMode === 'random' 
                        ? "How many images to randomly select for rating from Supabase" 
                        : "How many images you will manually select for rating"}
                      inputProps={{ min: 1, max: 6, step: 1 }}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    {/* Rating Scale Configuration */}
                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Minimum Rating Value"
                      value={editedQuestion.rateMin || 1}
                      onChange={(e) => handleQuestionChange('rateMin', parseInt(e.target.value))}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Maximum Rating Value"
                      value={editedQuestion.rateMax || 5}
                      onChange={(e) => handleQuestionChange('rateMax', parseInt(e.target.value))}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Minimum Rating Label"
                      value={editedQuestion.minRateDescription || ''}
                      onChange={(e) => handleQuestionChange('minRateDescription', e.target.value)}
                      placeholder="e.g., Very Poor"
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Maximum Rating Label"
                      value={editedQuestion.maxRateDescription || ''}
                      onChange={(e) => handleQuestionChange('maxRateDescription', e.target.value)}
                      placeholder="e.g., Excellent"
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    {/* Manual Image Selection Interface for Rating */}
                    {(editedQuestion.imageSelectionMode === 'manual' || editedQuestion.imageSelectionMode === 'huggingface_manual') && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          Select Images for Rating ({selectedImages.length}/{editedQuestion.imageCount || 1} selected)
                        </Typography>
                        
                        {imageError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {imageError}
                          </Alert>
                        )}
                        
                        {loadingImages ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                          </Box>
                        ) : (
                          <Grid container spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {availableImages.map((image) => (
                              <Grid item xs={6} sm={4} md={3} key={image.url}>
                                <Card sx={{ position: 'relative' }}>
                                  <CardMedia
                                    component="img"
                                    height="120"
                                    image={image.url}
                                    alt={image.name}
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleImageSelection(image.url, !selectedImages.includes(image.url))}
                                  />
                                  <Checkbox
                                    checked={selectedImages.includes(image.url)}
                                    onChange={(e) => handleImageSelection(image.url, e.target.checked)}
                                    disabled={!selectedImages.includes(image.url) && selectedImages.length >= (editedQuestion.imageCount || 1)}
                                    sx={{
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                                    }}
                                  />
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>
                    )}
                  </>
                )}

                {/* Image Yes/No Configuration */}
                {editedQuestion.type === 'imageboolean' && (
                  <>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel sx={{ backgroundColor: 'white', px: 1 }}>Image Selection Mode</InputLabel>
                      <Select
                        value={editedQuestion.imageSelectionMode || 'random'}
                        onChange={(e) => handleQuestionChange('imageSelectionMode', e.target.value)}
                        label="Image Selection Mode"
                      >
                        <MenuItem value="huggingface_random">Random Selection from Hugging Face</MenuItem>
                        <MenuItem value="huggingface_manual">Manual Selection from Hugging Face</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Number of Images to Display"
                      value={editedQuestion.imageCount || 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        handleQuestionChange('imageCount', Math.min(Math.max(value, 1), 6));
                      }}
                      onFocus={(e) => e.target.select()}
                      helperText={editedQuestion.imageSelectionMode === 'random' 
                        ? "How many images to randomly select for yes/no question from Supabase" 
                        : "How many images you will manually select for yes/no question"}
                      inputProps={{ min: 1, max: 6, step: 1 }}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    {/* Yes/No Labels Configuration */}
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Yes Label"
                      value={editedQuestion.labelTrue || ''}
                      onChange={(e) => handleQuestionChange('labelTrue', e.target.value)}
                      placeholder="e.g., Yes, Agree, Like"
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    <TextField
                      fullWidth
                      variant="outlined"
                      label="No Label"
                      value={editedQuestion.labelFalse || ''}
                      onChange={(e) => handleQuestionChange('labelFalse', e.target.value)}
                      placeholder="e.g., No, Disagree, Dislike"
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    {/* Manual Image Selection Interface for Yes/No */}
                    {(editedQuestion.imageSelectionMode === 'manual' || editedQuestion.imageSelectionMode === 'huggingface_manual') && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          Select Images for Yes/No Question ({selectedImages.length}/{editedQuestion.imageCount || 1} selected)
                        </Typography>
                        
                        {imageError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {imageError}
                          </Alert>
                        )}
                        
                        {loadingImages ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                          </Box>
                        ) : (
                          <Grid container spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {availableImages.map((image) => (
                              <Grid item xs={6} sm={4} md={3} key={image.url}>
                                <Card sx={{ position: 'relative' }}>
                                  <CardMedia
                                    component="img"
                                    height="120"
                                    image={image.url}
                                    alt={image.name}
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleImageSelection(image.url, !selectedImages.includes(image.url))}
                                  />
                                  <Checkbox
                                    checked={selectedImages.includes(image.url)}
                                    onChange={(e) => handleImageSelection(image.url, e.target.checked)}
                                    disabled={!selectedImages.includes(image.url) && selectedImages.length >= (editedQuestion.imageCount || 1)}
                                    sx={{
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                                    }}
                                  />
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>
                    )}
                  </>
                )}

                {/* Image Matrix Configuration */}
                {editedQuestion.type === 'imagematrix' && (
                  <>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel sx={{ backgroundColor: 'white', px: 1 }}>Image Selection Mode</InputLabel>
                      <Select
                        value={editedQuestion.imageSelectionMode || 'huggingface_random'}
                        onChange={(e) => handleQuestionChange('imageSelectionMode', e.target.value)}
                        label="Image Selection Mode"
                      >
                        <MenuItem value="huggingface_random">Random Selection from Hugging Face</MenuItem>
                        <MenuItem value="huggingface_manual">Manual Selection from Hugging Face</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Number of Images to Display"
                      value={editedQuestion.imageCount || 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        handleQuestionChange('imageCount', Math.min(Math.max(value, 1), 6));
                      }}
                      onFocus={(e) => e.target.select()}
                      helperText={editedQuestion.imageSelectionMode === 'random' 
                        ? "How many images to randomly select for matrix from Supabase" 
                        : "How many images you will manually select for matrix"}
                      inputProps={{ min: 1, max: 6, step: 1 }}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    {/* Manual Image Selection Interface for Matrix */}
                    {(editedQuestion.imageSelectionMode === 'manual' || editedQuestion.imageSelectionMode === 'huggingface_manual') && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          Select Images for Matrix ({selectedImages.length}/{editedQuestion.imageCount || 1} selected)
                        </Typography>
                        
                        {imageError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {imageError}
                          </Alert>
                        )}
                        
                        {loadingImages ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                          </Box>
                        ) : (
                          <Grid container spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {availableImages.map((image) => (
                              <Grid item xs={6} sm={4} md={3} key={image.url}>
                                <Card sx={{ position: 'relative' }}>
                                  <CardMedia
                                    component="img"
                                    height="120"
                                    image={image.url}
                                    alt={image.name}
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleImageSelection(image.url, !selectedImages.includes(image.url))}
                                  />
                                  <Checkbox
                                    checked={selectedImages.includes(image.url)}
                                    onChange={(e) => handleImageSelection(image.url, e.target.checked)}
                                    disabled={!selectedImages.includes(image.url) && selectedImages.length >= (editedQuestion.imageCount || 1)}
                                    sx={{
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                                    }}
                                  />
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>
                    )}
                  </>
                )}

                {/* Image Display Configuration */}
                {editedQuestion.type === 'image' && (
                  <>
                    <FormControl fullWidth variant="outlined">
                      <InputLabel sx={{ backgroundColor: 'white', px: 1 }}>Image Selection Mode</InputLabel>
                      <Select
                        value={editedQuestion.imageSelectionMode || 'random'}
                        onChange={(e) => handleQuestionChange('imageSelectionMode', e.target.value)}
                        label="Image Selection Mode"
                      >
                        <MenuItem value="huggingface_random">Random Selection from Hugging Face</MenuItem>
                        <MenuItem value="huggingface_manual">Manual Selection from Hugging Face</MenuItem>
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Number of Images to Display"
                      value={editedQuestion.imageCount || 1}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        handleQuestionChange('imageCount', Math.min(Math.max(value, 1), 10));
                      }}
                      onFocus={(e) => e.target.select()}
                      helperText={editedQuestion.imageSelectionMode === 'random' 
                        ? "How many images to randomly select for display from Supabase" 
                        : "How many images you will manually select for display"}
                      inputProps={{ min: 1, max: 10, step: 1 }}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />

                    {/* Manual Image Selection Interface for Display */}
                    {(editedQuestion.imageSelectionMode === 'manual' || editedQuestion.imageSelectionMode === 'huggingface_manual') && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                          Select Images for Display ({selectedImages.length}/{editedQuestion.imageCount || 1} selected)
                        </Typography>
                        
                        {imageError && (
                          <Alert severity="error" sx={{ mb: 2 }}>
                            {imageError}
                          </Alert>
                        )}
                        
                        {loadingImages ? (
                          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                          </Box>
                        ) : (
                          <Grid container spacing={2} sx={{ maxHeight: 400, overflow: 'auto' }}>
                            {availableImages.map((image) => (
                              <Grid item xs={6} sm={4} md={3} key={image.url}>
                                <Card sx={{ position: 'relative' }}>
                                  <CardMedia
                                    component="img"
                                    height="120"
                                    image={image.url}
                                    alt={image.name}
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleImageSelection(image.url, !selectedImages.includes(image.url))}
                                  />
                                  <Checkbox
                                    checked={selectedImages.includes(image.url)}
                                    onChange={(e) => handleImageSelection(image.url, e.target.checked)}
                                    disabled={!selectedImages.includes(image.url) && selectedImages.length >= (editedQuestion.imageCount || 1)}
                                    sx={{
                                      position: 'absolute',
                                      top: 8,
                                      right: 8,
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' }
                                    }}
                                  />
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Box>
          )}

          {/* Choices for Choice-based Questions */}
          {needsChoices && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
                Answer Choices
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Add new choice"
                    value={newChoice}
                    onChange={(e) => setNewChoice(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        isRankingQuestion ? addRankingChoice() : addChoice();
                      }
                    }}
                    helperText="Type a choice and press Enter or click Add"
                    sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                  />
                  <Button
                    variant="contained"
                    onClick={isRankingQuestion ? addRankingChoice : addChoice}
                    startIcon={<Add />}
                    sx={{ minWidth: 100 }}
                  >
                    Add
                  </Button>
                </Box>

                {(editedQuestion.choices && editedQuestion.choices.length > 0) ? (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                      Current Choices:
                    </Typography>
                    <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                      {editedQuestion.choices.map((choice, index) => (
                        <ListItem key={index} divider={index < editedQuestion.choices.length - 1}>
                          <ListItemText
                            primary={isRankingQuestion ? choice.text : (typeof choice === 'object' ? choice.text : choice)}
                            secondary={isRankingQuestion ? `Internal value: ${choice.value}` : (typeof choice === 'object' ? `Internal value: ${choice.value}` : null)}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => isRankingQuestion ? removeRankingChoice(index) : removeChoice(index)}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      No choices added yet. Add some choices above to get started.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Matrix Configuration */}
          {(editedQuestion.type === 'matrix' || editedQuestion.type === 'imagematrix') && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
                Matrix Configuration
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Rows Configuration */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Rows (Questions)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Add new row"
                      value={newChoice}
                      onChange={(e) => setNewChoice(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!newChoice.trim()) return;
                          const rows = editedQuestion.rows || [];
                          const rowValue = newChoice.trim().toLowerCase().replace(/\s+/g, '_');
                          const newRow = { value: rowValue, text: newChoice.trim() };
                          setEditedQuestion({ ...editedQuestion, rows: [...rows, newRow] });
                          setNewChoice('');
                        }
                      }}
                      helperText="Type a row label and press Enter or click Add"
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />
                    <Button
                      variant="contained"
                      onClick={() => {
                        if (!newChoice.trim()) return;
                        const rows = editedQuestion.rows || [];
                        const rowValue = newChoice.trim().toLowerCase().replace(/\s+/g, '_');
                        const newRow = { value: rowValue, text: newChoice.trim() };
                        setEditedQuestion({ ...editedQuestion, rows: [...rows, newRow] });
                        setNewChoice('');
                      }}
                      startIcon={<Add />}
                      sx={{ minWidth: 100 }}
                    >
                      Add
                    </Button>
                  </Box>
                  {editedQuestion.rows && editedQuestion.rows.length > 0 ? (
                    <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                      {editedQuestion.rows.map((row, index) => (
                        <ListItem key={index} divider={index < editedQuestion.rows.length - 1}>
                          <ListItemText
                            primary={typeof row === 'object' ? row.text : row}
                            secondary={typeof row === 'object' ? `Value: ${row.value}` : null}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => {
                                const newRows = editedQuestion.rows.filter((_, i) => i !== index);
                                setEditedQuestion({ ...editedQuestion, rows: newRows });
                              }}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        No rows added yet
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Columns Configuration */}
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Columns (Answer Options)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      label="Add new column"
                      placeholder="e.g., Strongly Agree, Agree, Neutral..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const colText = e.target.value.trim();
                          if (!colText) return;
                          const columns = editedQuestion.columns || [];
                          const colValue = colText.toLowerCase().replace(/\s+/g, '_');
                          const newCol = { value: colValue, text: colText };
                          setEditedQuestion({ ...editedQuestion, columns: [...columns, newCol] });
                          e.target.value = '';
                        }
                      }}
                      helperText="Type a column label and press Enter or click Add"
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />
                    <Button
                      variant="contained"
                      onClick={(e) => {
                        const input = e.target.closest('div').parentElement.querySelector('input');
                        const colText = input.value.trim();
                        if (!colText) return;
                        const columns = editedQuestion.columns || [];
                        const colValue = colText.toLowerCase().replace(/\s+/g, '_');
                        const newCol = { value: colValue, text: colText };
                        setEditedQuestion({ ...editedQuestion, columns: [...columns, newCol] });
                        input.value = '';
                      }}
                      startIcon={<Add />}
                      sx={{ minWidth: 100 }}
                    >
                      Add
                    </Button>
                  </Box>
                  {editedQuestion.columns && editedQuestion.columns.length > 0 ? (
                    <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                      {editedQuestion.columns.map((col, index) => (
                        <ListItem key={index} divider={index < editedQuestion.columns.length - 1}>
                          <ListItemText
                            primary={typeof col === 'object' ? col.text : col}
                            secondary={typeof col === 'object' ? `Value: ${col.value}` : null}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => {
                                const newColumns = editedQuestion.columns.filter((_, i) => i !== index);
                                setEditedQuestion({ ...editedQuestion, columns: newColumns });
                              }}
                              color="error"
                            >
                              <Delete />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        No columns added yet
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {/* Additional Settings for Specific Question Types */}
          {(editedQuestion.type === 'comment' || editedQuestion.type === 'text' || editedQuestion.type === 'rating') && (
            <Box>
              <Typography variant="h6" sx={{ mb: 3, color: 'primary.main' }}>
                Advanced Settings
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {editedQuestion.type === 'comment' && (
                  <TextField
                    fullWidth
                    variant="outlined"
                    type="number"
                    label="Number of Rows"
                    value={editedQuestion.rows || 3}
                    onChange={(e) => handleQuestionChange('rows', parseInt(e.target.value))}
                    helperText="How many rows the text area should display"
                    inputProps={{ min: 1, max: 10 }}
                    sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                  />
                )}

                {editedQuestion.type === 'text' && (
                  <TextField
                    fullWidth
                    variant="outlined"
                    type="number"
                    label="Maximum Length"
                    value={editedQuestion.maxLength || ''}
                    onChange={(e) => handleQuestionChange('maxLength', e.target.value ? parseInt(e.target.value) : undefined)}
                    helperText="Maximum number of characters allowed (leave empty for no limit)"
                    inputProps={{ min: 1 }}
                    sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                  />
                )}

                {editedQuestion.type === 'rating' && (
                  <>
                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Minimum Value"
                      value={editedQuestion.rateMin || 1}
                      onChange={(e) => handleQuestionChange('rateMin', parseInt(e.target.value))}
                      helperText="The lowest rating value"
                      inputProps={{ min: 0 }}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />
                    <TextField
                      fullWidth
                      variant="outlined"
                      type="number"
                      label="Maximum Value"
                      value={editedQuestion.rateMax || 5}
                      onChange={(e) => handleQuestionChange('rateMax', parseInt(e.target.value))}
                      helperText="The highest rating value"
                      inputProps={{ min: 1 }}
                      sx={{ '& .MuiInputLabel-root': { backgroundColor: 'white', px: 1 } }}
                    />
                  </>
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={() => {
          const questionToSave = { ...editedQuestion };
          
          console.log('💾 Saving question:', questionToSave);
          
          if (questionToSave.type === 'imagematrix') {
            console.log('📊 ImageMatrix - rows:', questionToSave.rows);
            console.log('📊 ImageMatrix - columns:', questionToSave.columns);
            console.log('🖼️ ImageMatrix - imageSelectionMode:', questionToSave.imageSelectionMode);
            console.log('🖼️ ImageMatrix - selectedImageUrls:', questionToSave.selectedImageUrls);
            console.log('🖼️ ImageMatrix - imageCount:', questionToSave.imageCount);
          }
          
          // Handle imageboolean, imagerating, imagematrix: keep the type but generate imageHtml for runtime display
          if (questionToSave.type === 'imageboolean' || questionToSave.type === 'imagerating' || questionToSave.type === 'imagematrix') {
            console.log(`🔄 Processing ${questionToSave.type} - keeping type, generating imageHtml`);
            
            // Set default imageSelectionMode if not set
            if (!questionToSave.imageSelectionMode) {
              questionToSave.imageSelectionMode = 'huggingface_random';
            }
            
            // Keep type for Survey Builder recognition
            // But generate HTML for images for runtime display
            
            if (questionToSave.imageSelectionMode === 'huggingface_manual' && questionToSave.selectedImageUrls && questionToSave.selectedImageUrls.length > 0) {
              // Manual selection: generate HTML from selected images
              // Try to find image names from availableImages
              const imageNamesMap = {};
              if (availableImages && availableImages.length > 0) {
                availableImages.forEach(img => {
                  imageNamesMap[img.url] = img.name;
                });
              }
              
              let imagesHtml = '<div style="display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0;">';
              const imageNames = [];
              questionToSave.selectedImageUrls.forEach((url) => {
                const imageName = imageNamesMap[url] || 'unknown';
                imageNames.push(imageName);
                imagesHtml += `<img src="${url}" data-image-name="${imageName}" style="max-width: 300px; height: auto; border-radius: 4px;" />`;
              });
              imagesHtml += '</div>';
              
              // Store the HTML and names for runtime display
              questionToSave.imageHtml = imagesHtml;
              questionToSave.imageNames = imageNames;
            } else if (questionToSave.imageSelectionMode === 'huggingface_random') {
              // Random selection: store config for runtime loading
              questionToSave.randomImageSelection = true;
              questionToSave.imageSource = 'huggingface';
              questionToSave.huggingFaceConfig = currentProject?.imageDatasetConfig || {};
              // Images will be loaded at runtime and imageHtml will be generated then
            }
            
            console.log(`✅ Processed ${questionToSave.type}, randomImageSelection:`, questionToSave.randomImageSelection, 'imageHtml:', questionToSave.imageHtml ? 'yes' : 'no');
          }
          
          // Convert selectedImageUrls to SurveyJS choices format for imagepicker, imageranking, and image questions
          // Note: imageboolean, imagerating, imagematrix use imageHtml instead (handled above)
          if (questionToSave.type === 'imagepicker' || questionToSave.type === 'imageranking' || questionToSave.type === 'image') {
            if (questionToSave.imageSelectionMode === 'huggingface_manual' && questionToSave.selectedImageUrls && questionToSave.selectedImageUrls.length > 0) {
              // Manual selection: use the specifically selected images
              if (questionToSave.type === 'image') {
                // For image display questions, set imageLink directly
                questionToSave.imageLink = questionToSave.selectedImageUrls[0]; // Use first image
                if (questionToSave.selectedImageUrls.length > 1) {
                  // Store all images for potential future use
                  questionToSave.imageLinks = questionToSave.selectedImageUrls;
                }
              } else {
                // For imagepicker and imageranking, use choices
                questionToSave.choices = questionToSave.selectedImageUrls.map((url, index) => ({
                  value: `image_${index}`,
                  imageLink: url
                }));
              }
              questionToSave.imageFit = "cover";
            } else if (questionToSave.imageSelectionMode === 'huggingface_random') {
              // Random selection: store the configuration for runtime image loading
              questionToSave.imageFit = "cover";
              questionToSave.randomImageSelection = true;
              
              // Store Hugging Face config
              questionToSave.imageSource = 'huggingface';
              questionToSave.huggingFaceConfig = currentProject?.imageDatasetConfig || {};
              
              // Don't set choices - they'll be generated at runtime
              delete questionToSave.choices;
            }
          }
          
          onSave(questionToSave);
        }} variant="contained">
          Save Question
        </Button>
      </DialogActions>
    </Dialog>
  );
}
