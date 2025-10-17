import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardMedia, Rating, Grid } from '@mui/material';

export default function ImageRatingWidget({ question, value, onValueChanged }) {
  console.log('ImageRatingWidget - question:', question);
  console.log('ImageRatingWidget - question.choices:', question.choices);
  console.log('ImageRatingWidget - current value:', value);

  const handleRatingChange = (newValue) => {
    console.log('ImageRatingWidget - rating changed to:', newValue);
    onValueChanged(newValue);
  };

  if (!question.choices || question.choices.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>No images available for rating</Typography>
        <Typography variant="caption">Choices: {JSON.stringify(question.choices)}</Typography>
      </Box>
    );
  }

  const imageCount = question.choices.length;
  const rateMin = question.rateMin || 1;
  const rateMax = question.rateMax || 5;
  const minRateDescription = question.minRateDescription || '';
  const maxRateDescription = question.maxRateDescription || '';

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
      <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
        <Card sx={{ mb: 3 }}>
          <CardMedia
            component="img"
            height="300"
            image={imageLink}
            alt="Image to rate"
            sx={{ objectFit: 'cover' }}
          />
        </Card>
        
        <Box sx={{ textAlign: 'center' }}>
          <Rating
            value={value || 0}
            onChange={(event, newValue) => handleRatingChange(newValue)}
            max={rateMax}
            size="large"
            sx={{ mb: 2 }}
          />
          
          {(minRateDescription || maxRateDescription) && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {minRateDescription && `${rateMin}: ${minRateDescription}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {maxRateDescription && `${rateMax}: ${maxRateDescription}`}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  // Multiple images display (compact grid)
  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
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
                <Card sx={{ bgcolor: 'error.light', p: 2 }}>
                  <Typography variant="caption">No image data</Typography>
                </Card>
              </Grid>
            );
          }

          return (
            <Grid item xs={6} sm={4} md={3} key={index}>
              <Card>
                <CardMedia
                  component="img"
                  height="120"
                  image={imageLink}
                  alt={`Image ${index + 1}`}
                  sx={{ objectFit: 'cover' }}
                />
              </Card>
            </Grid>
          );
        })}
      </Grid>
      
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Rate the overall environment shown in these images
        </Typography>
        
        <Rating
          value={value || 0}
          onChange={(event, newValue) => handleRatingChange(newValue)}
          max={rateMax}
          size="large"
          sx={{ mb: 2 }}
        />
        
        {(minRateDescription || maxRateDescription) && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {minRateDescription && `${rateMin}: ${minRateDescription}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {maxRateDescription && `${rateMax}: ${maxRateDescription}`}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
