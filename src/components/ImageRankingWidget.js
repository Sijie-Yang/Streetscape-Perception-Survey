import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Box, Typography, Card, CardMedia } from '@mui/material';

// Sortable Item Component
function SortableItem({ id, image, index }) {
  console.log('SortableItem - id:', id, 'image:', image, 'index:', index);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!image || !image.imageLink) {
    return (
      <Card sx={{ mb: 2, p: 2, bgcolor: 'error.light' }}>
        <Typography>Error: No image data - {JSON.stringify(image)}</Typography>
      </Card>
    );
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        cursor: 'grab',
        '&:active': { cursor: 'grabbing' },
        mb: 2,
        position: 'relative',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="150"
          image={image.imageLink}
          alt={`Image ${index + 1}`}
          sx={{ objectFit: 'cover' }}
          onError={(e) => {
            console.error('Image failed to load:', image.imageLink);
            e.target.style.display = 'none';
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', image.imageLink);
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            borderRadius: 1,
            px: 1,
            py: 0.5,
            fontSize: '0.875rem',
            fontWeight: 'bold',
          }}
        >
          #{index + 1}
        </Box>
      </Box>
    </Card>
  );
}

// Main Image Ranking Widget Component
export default function ImageRankingWidget({ question, value, onValueChanged }) {
  const [items, setItems] = useState([]);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize items from question choices
  useEffect(() => {
    console.log('ImageRankingWidget - question:', question);
    console.log('ImageRankingWidget - question.choices:', question.choices);
    
    if (question.choices && question.choices.length > 0) {
      console.log('ImageRankingWidget - raw choices:', question.choices);
      
      const initialItems = question.choices.map((choice, index) => {
        console.log('Processing choice:', choice, 'Type:', typeof choice);
        console.log('Choice keys:', Object.keys(choice));
        console.log('Choice properties:', choice);
        
        // Handle SurveyJS ItemValue objects
        let imageLink;
        
        // Try multiple ways to get imageLink
        if (choice.imageLink) {
          imageLink = choice.imageLink;
          console.log('Found imageLink directly:', imageLink);
        } else if (choice.getPropertyValue) {
          // Try to get imageLink from SurveyJS ItemValue
          imageLink = choice.getPropertyValue('imageLink');
          console.log('Found imageLink via getPropertyValue:', imageLink);
        } else if (choice.locText && choice.locText.renderedHtml) {
          // Check if imageLink is in locText
          console.log('Checking locText:', choice.locText);
        }
        
        // Try accessing internal properties
        if (!imageLink && choice.propertyHash) {
          console.log('Checking propertyHash:', choice.propertyHash);
          console.log('PropertyHash keys:', Object.keys(choice.propertyHash));
          imageLink = choice.propertyHash.imageLink;
          console.log('PropertyHash imageLink:', imageLink);
        }
        
        // Try other common property names
        if (!imageLink) {
          imageLink = choice.image || choice.url || choice.src;
          console.log('Trying fallback properties:', imageLink);
        }
        
        console.log('Final extracted imageLink:', imageLink);
        
        return {
          id: choice.value || `item-${index}`,
          value: choice.value,
          imageLink: imageLink,
          originalIndex: index,
        };
      });
      
      console.log('ImageRankingWidget - initialItems:', initialItems);
      
      // If there's an existing value, restore the order
      if (value && Array.isArray(value) && value.length > 0) {
        const orderedItems = value.map(val => 
          initialItems.find(item => item.value === val)
        ).filter(Boolean);
        
        // Add any missing items at the end
        const usedValues = new Set(value);
        const missingItems = initialItems.filter(item => !usedValues.has(item.value));
        
        setItems([...orderedItems, ...missingItems]);
      } else {
        setItems(initialItems);
      }
    } else {
      console.log('ImageRankingWidget - No choices found');
    }
  }, [question.choices, value]);

  // Handle drag end
  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update the survey value with the new order
        const newValue = newItems.map(item => item.value);
        onValueChanged(newValue);
        
        return newItems;
      });
    }
  }

  console.log('ImageRankingWidget - render - items:', items);
  console.log('ImageRankingWidget - render - items.length:', items.length);

  if (!items || items.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
        <Typography>No images available for ranking</Typography>
        <Typography variant="caption">Items: {JSON.stringify(items)}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              image={item}
              index={index}
            />
          ))}
        </SortableContext>
      </DndContext>
    </Box>
  );
}
