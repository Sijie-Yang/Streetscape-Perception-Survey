import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import 'survey-core/defaultV2.min.css';

export default function ImageBooleanWidget({ question, value, onValueChanged }) {
  console.log('ImageBooleanWidget - question:', question);
  console.log('ImageBooleanWidget - question.choices:', question.choices);
  console.log('ImageBooleanWidget - current value:', value);

  const handleValueChange = (newValue) => {
    console.log('ImageBooleanWidget - value changed to:', newValue);
    onValueChanged(newValue);
  };

  const labelTrue = question.labelTrue || 'Yes';
  const labelFalse = question.labelFalse || 'No';

  // Render simple boolean control (SurveyJS style)
  const renderBooleanControl = () => {
    return (
      <div className="sd-question sd-question--boolean">
        <div className="sd-boolean">
          <div className="sd-boolean__switch">
            <button
              type="button"
              className={`sd-boolean__switch-item sd-boolean__switch-item--false ${value === false ? 'sd-boolean__switch-item--checked' : ''}`}
              onClick={() => handleValueChange(false)}
              role="switch"
              aria-checked={value === false}
            >
              <span className="sd-boolean__switch-item-text">{labelFalse}</span>
            </button>
            <button
              type="button"
              className={`sd-boolean__switch-item sd-boolean__switch-item--true ${value === true ? 'sd-boolean__switch-item--checked' : ''}`}
              onClick={() => handleValueChange(true)}
              role="switch"
              aria-checked={value === true}
            >
              <span className="sd-boolean__switch-item-text">{labelTrue}</span>
            </button>
            <div className="sd-boolean__switch-slider" />
          </div>
        </div>
      </div>
    );
  };

  if (!question.choices || question.choices.length === 0) {
    // If no images, just render the boolean control
    return renderBooleanControl();
  }

  const imageCount = question.choices.length;

  // Single image display (larger)
  if (imageCount === 1) {
    const choice = question.choices[0];
    let imageLink;
    
    // Extract imageLink from SurveyJS ItemValue object
    if (choice.imageLink) {
      imageLink = choice.imageLink;
    } else if (choice.getPropertyValue) {
      imageLink = choice.getPropertyValue('imageLink');
    } else if (choice.propertyHash) {
      imageLink = choice.propertyHash.imageLink;
    }

    if (!imageLink) {
      return (
        <Box sx={{ p: 2, textAlign: 'center', color: 'error.main' }}>
          <Typography>Error: No image data found</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%' }}>
        {/* Image display */}
        <Box sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
          <img
            src={imageLink}
            alt="Image for yes/no question"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '400px',
              objectFit: 'cover',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
        </Box>
        
        {/* Boolean control */}
        {renderBooleanControl()}
      </Box>
    );
  }

  // Multiple images display (compact grid)
  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {question.choices.map((choice, index) => {
          let imageLink;
          
          // Extract imageLink from SurveyJS ItemValue object
          if (choice.imageLink) {
            imageLink = choice.imageLink;
          } else if (choice.getPropertyValue) {
            imageLink = choice.getPropertyValue('imageLink');
          } else if (choice.propertyHash) {
            imageLink = choice.propertyHash.imageLink;
          }

          if (!imageLink) {
            return (
              <Grid item xs={6} sm={4} md={3} key={index}>
                <Box sx={{ bgcolor: 'error.light', p: 2, borderRadius: 1 }}>
                  <Typography variant="caption">No image data</Typography>
                </Box>
              </Grid>
            );
          }

          return (
            <Grid item xs={6} sm={4} md={3} key={index}>
              <img
                src={imageLink}
                alt={`Image ${index + 1}`}
                style={{
                  width: '100%',
                  height: '120px',
                  objectFit: 'cover',
                  borderRadius: '8px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                }}
              />
            </Grid>
          );
        })}
      </Grid>
      
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        Based on the images shown above, please answer:
      </Typography>
      
      {/* Boolean control */}
      {renderBooleanControl()}
    </Box>
  );
}
