import React from 'react';
import { ReactQuestionFactory } from 'survey-react-ui';
import { Serializer, Question } from 'survey-core';
import ImageRankingWidget from './ImageRankingWidget';
import ImageRatingWidget from './ImageRatingWidget';
import ImageBooleanWidget from './ImageBooleanWidget';

// Define the custom question type
const WIDGET_NAME = 'imageranking';

// Register the custom question type with SurveyJS
export function registerImageRankingWidget() {
  console.log('Registering ImageRanking widget...');
  
  // First, add imageLink property to ItemValue
  Serializer.addProperty('itemvalue', {
    name: 'imageLink',
    category: 'general'
  });
  
  console.log('Added imageLink property to itemvalue');

  // Add custom properties to the serializer
  Serializer.addClass(
    WIDGET_NAME,
    [
      {
        name: 'choices:itemvalue[]',
        category: 'choices',
      },
      {
        name: 'imageCount:number',
        default: 4,
        category: 'general',
      },
      {
        name: 'imageSelectionMode',
        default: 'random',
        choices: ['random', 'manual'],
        category: 'general',
      },
      {
        name: 'selectedImageUrls:string[]',
        category: 'general',
      },
      {
        name: 'randomImageSelection:boolean',
        default: false,
        category: 'general',
      },
      {
        name: 'bucketPath',
        category: 'general',
      },
      {
        name: 'supabaseConfig',
        category: 'general',
      },
      {
        name: 'imageFit',
        default: 'cover',
        category: 'general',
      },
    ],
    function () {
      return new ImageRankingQuestion();
    },
    'question'
  );

  // Register the React component
  ReactQuestionFactory.Instance.registerQuestion(WIDGET_NAME, (props) => {
    console.log('ImageRanking component factory called with props:', props);
    return React.createElement(ImageRankingQuestionComponent, props);
  });
  
  console.log('ImageRanking widget registered successfully');
}

// Custom Question Class
class ImageRankingQuestion extends Question {
  getType() {
    return WIDGET_NAME;
  }

  // Ensure the value is always an array
  getValueCore() {
    const val = super.getValueCore();
    return Array.isArray(val) ? val : [];
  }

  setValueCore(newValue) {
    if (Array.isArray(newValue)) {
      super.setValueCore(newValue);
    }
  }
}

// React Component Wrapper
function ImageRankingQuestionComponent(props) {
  const { question } = props;

  console.log('ImageRankingQuestionComponent - props:', props);
  console.log('ImageRankingQuestionComponent - question:', question);
  console.log('ImageRankingQuestionComponent - question.choices:', question.choices);

  const handleValueChange = (newValue) => {
    console.log('ImageRankingQuestionComponent - handleValueChange:', newValue);
    question.value = newValue;
  };

  // Simple test rendering first
  if (!question.choices || question.choices.length === 0) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
        <p>Image Ranking Component Loaded</p>
        <p>No choices available yet. Choices: {JSON.stringify(question.choices)}</p>
        <p>Question type: {question.getType()}</p>
      </div>
    );
  }

  // Return only the widget content, let SurveyJS handle the question wrapper, title, and description
  return (
    <ImageRankingWidget
      question={question}
      value={question.value}
      onValueChanged={handleValueChange}
    />
  );
}

// Register Image Rating Widget
export function registerImageRatingWidget() {
  console.log('Registering ImageRating widget...');
  
  const RATING_WIDGET_NAME = 'imagerating';
  
  // First, add imageLink property to ItemValue (if not already added)
  Serializer.addProperty('itemvalue', {
    name: 'imageLink',
    category: 'general'
  });
  
  console.log('Added imageLink property to itemvalue for rating');

  // Add custom properties to the serializer
  Serializer.addClass(
    RATING_WIDGET_NAME,
    [
      {
        name: 'choices:itemvalue[]',
        category: 'choices',
      },
      {
        name: 'imageCount:number',
        default: 1,
        category: 'general',
      },
      {
        name: 'imageSelectionMode',
        default: 'random',
        choices: ['random', 'manual'],
        category: 'general',
      },
      {
        name: 'selectedImageUrls:string[]',
        category: 'general',
      },
      {
        name: 'randomImageSelection:boolean',
        default: false,
        category: 'general',
      },
      {
        name: 'bucketPath',
        category: 'general',
      },
      {
        name: 'supabaseConfig',
        category: 'general',
      },
      {
        name: 'imageFit',
        default: 'cover',
        category: 'general',
      },
      {
        name: 'rateMin:number',
        default: 1,
        category: 'general',
      },
      {
        name: 'rateMax:number',
        default: 5,
        category: 'general',
      },
      {
        name: 'minRateDescription',
        category: 'general',
      },
      {
        name: 'maxRateDescription',
        category: 'general',
      },
    ],
    function () {
      return new ImageRatingQuestion();
    },
    'question'
  );

  // Register the React component
  ReactQuestionFactory.Instance.registerQuestion(RATING_WIDGET_NAME, (props) => {
    console.log('ImageRating component factory called with props:', props);
    return React.createElement(ImageRatingQuestionComponent, props);
  });
  
  console.log('ImageRating widget registered successfully');
}

// Custom Question Class for Image Rating
class ImageRatingQuestion extends Question {
  getType() {
    return 'imagerating';
  }

  // Ensure the value is a number (rating value)
  getValueCore() {
    const val = super.getValueCore();
    return typeof val === 'number' ? val : null;
  }

  setValueCore(newValue) {
    if (typeof newValue === 'number' || newValue === null) {
      super.setValueCore(newValue);
    }
  }
}

// React Component Wrapper for Image Rating
function ImageRatingQuestionComponent(props) {
  const { question } = props;

  console.log('ImageRatingQuestionComponent - props:', props);
  console.log('ImageRatingQuestionComponent - question:', question);
  console.log('ImageRatingQuestionComponent - question.choices:', question.choices);

  const handleValueChange = (newValue) => {
    console.log('ImageRatingQuestionComponent - handleValueChange:', newValue);
    question.value = newValue;
  };

  // Simple test rendering first
  if (!question.choices || question.choices.length === 0) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
        <p>Image Rating Component Loaded</p>
        <p>No choices available yet. Choices: {JSON.stringify(question.choices)}</p>
        <p>Question type: {question.getType()}</p>
      </div>
    );
  }

  // Return only the widget content, let SurveyJS handle the question wrapper, title, and description
  return (
    <ImageRatingWidget
      question={question}
      value={question.value}
      onValueChanged={handleValueChange}
    />
  );
}

// Register Image Boolean Widget
export function registerImageBooleanWidget() {
  console.log('Registering ImageBoolean widget...');
  
  const BOOLEAN_WIDGET_NAME = 'imageboolean';
  
  // First, add imageLink property to ItemValue (if not already added)
  Serializer.addProperty('itemvalue', {
    name: 'imageLink',
    category: 'general'
  });
  
  console.log('Added imageLink property to itemvalue for boolean');

  // Add custom properties to the serializer - inherit from boolean
  Serializer.addClass(
    BOOLEAN_WIDGET_NAME,
    [
      {
        name: 'choices:itemvalue[]',
        category: 'choices',
      },
      {
        name: 'imageCount:number',
        default: 1,
        category: 'general',
      },
      {
        name: 'imageSelectionMode',
        default: 'random',
        choices: ['random', 'manual'],
        category: 'general',
      },
      {
        name: 'selectedImageUrls:string[]',
        category: 'general',
      },
      {
        name: 'randomImageSelection:boolean',
        default: false,
        category: 'general',
      },
      {
        name: 'bucketPath',
        category: 'general',
      },
      {
        name: 'supabaseConfig',
        category: 'general',
      },
      {
        name: 'imageFit',
        default: 'cover',
        category: 'general',
      },
      {
        name: 'imageSource',
        default: 'huggingface',
        category: 'general',
      },
      {
        name: 'huggingFaceConfig:object',
        category: 'general',
      },
    ],
    function () {
      return new ImageBooleanQuestion();
    },
    'boolean'  // ✅ Inherit from boolean instead of question
  );

  // Register the React component
  ReactQuestionFactory.Instance.registerQuestion(BOOLEAN_WIDGET_NAME, (props) => {
    console.log('ImageBoolean component factory called with props:', props);
    return React.createElement(ImageBooleanQuestionComponent, props);
  });
  
  console.log('ImageBoolean widget registered successfully');
}

// Custom Question Class for Image Boolean
class ImageBooleanQuestion extends Question {
  getType() {
    return 'imageboolean';
  }

  // Ensure the value is a boolean
  getValueCore() {
    const val = super.getValueCore();
    return typeof val === 'boolean' ? val : null;
  }

  setValueCore(newValue) {
    if (typeof newValue === 'boolean' || newValue === null) {
      super.setValueCore(newValue);
    }
  }
}

// React Component Wrapper for Image Boolean
function ImageBooleanQuestionComponent(props) {
  const { question } = props;

  console.log('ImageBooleanQuestionComponent - props:', props);
  console.log('ImageBooleanQuestionComponent - question:', question);
  console.log('ImageBooleanQuestionComponent - question.choices:', question.choices);

  const handleValueChange = (newValue) => {
    console.log('ImageBooleanQuestionComponent - handleValueChange:', newValue);
    question.value = newValue;
  };

  // Simple test rendering first
  if (!question.choices || question.choices.length === 0) {
    return (
      <div style={{ padding: '20px', border: '1px solid #ccc', backgroundColor: '#f9f9f9' }}>
        <p>Image Boolean Component Loaded</p>
        <p>No choices available yet. Choices: {JSON.stringify(question.choices)}</p>
        <p>Question type: {question.getType()}</p>
      </div>
    );
  }

  // Return only the widget content, let SurveyJS handle the question wrapper, title, and description
  return (
    <ImageBooleanWidget
      question={question}
      value={question.value}
      onValueChanged={handleValueChange}
    />
  );
}

// ===== IMAGE MATRIX REGISTRATION =====
export function registerImageMatrixWidget() {
  console.log('🎨 Registering ImageMatrix widget...');

  const WIDGET_NAME_MATRIX = 'imagematrix';

  // Add custom properties for image handling
  // Note: rows and columns are inherited from matrix, we only add image-specific properties
  Serializer.addClass(
    WIDGET_NAME_MATRIX,
    [
      {
        name: 'imageLinks:string[]',
        category: 'general',
        default: []
      },
      {
        name: 'imageCount:number',
        default: 1,
        category: 'general',
      },
      {
        name: 'imageSelectionMode',
        default: 'huggingface_random',
        category: 'general',
      },
      {
        name: 'selectedImageUrls:string[]',
        category: 'general',
        default: []
      },
      {
        name: 'randomImageSelection:boolean',
        default: false,
        category: 'general',
      },
      {
        name: 'imageFit',
        default: 'cover',
        category: 'general',
      },
      {
        name: 'imageSource',
        default: 'huggingface',
        category: 'general',
      },
      {
        name: 'huggingFaceConfig:object',
        category: 'general',
      },
    ],
    function () {
      return new ImageMatrixQuestion('');
    },
    'matrix'  // ✅ Inherit from matrix to get rows and columns support
  );

  console.log('✅ ImageMatrix class added to Serializer (inherits from matrix)');

  // Register React component
  ReactQuestionFactory.Instance.registerQuestion(WIDGET_NAME_MATRIX, (props) => {
    console.log('🎨 Rendering ImageMatrix component with props:', props);
    return React.createElement(ImageMatrixQuestionComponent, props);
  });

  console.log('✅ ImageMatrix widget registered successfully');
}

// Custom Question Class for Image Matrix (inherits from matrix)
class ImageMatrixQuestion extends Question {
  getType() {
    return 'imagematrix';
  }
  
  // rows and columns are inherited from matrix, no need to override
}

// React Component for Image Matrix
function ImageMatrixQuestionComponent(props) {
  const { question } = props;

  // Get data from question (inherited from matrix)
  const images = question.imageLinks || [];
  const rows = question.rows || [];
  const columns = question.columns || [];

  console.log('📸 ImageMatrix render - images:', images.length, 'rows:', rows.length, 'columns:', columns.length);

  // Handle value change
  const handleCellClick = (rowValue, columnValue) => {
    const currentValue = question.value || {};
    question.value = {
      ...currentValue,
      [rowValue]: columnValue
    };
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Display Images */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(images.length, 4)}, 1fr)`,
          gap: '16px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px'
        }}>
          {images.map((imageUrl, index) => (
            <div key={index} style={{
              aspectRatio: '1',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <img
                src={imageUrl}
                alt={`Image ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: question.imageFit || 'cover'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Matrix Table */}
      {rows.length > 0 && columns.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderBottom: '2px solid #dee2e6',
                  fontWeight: '600'
                }}>
                  {/* Empty cell for row headers */}
                </th>
                {columns.map((col, index) => (
                  <th key={index} style={{
                    padding: '12px',
                    textAlign: 'center',
                    borderBottom: '2px solid #dee2e6',
                    fontWeight: '600',
                    minWidth: '100px'
                  }}>
                    {typeof col === 'object' ? col.text : col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const rowValue = typeof row === 'object' ? row.value : row;
                const rowText = typeof row === 'object' ? row.text : row;
                const currentValue = question.value || {};

                return (
                  <tr key={rowIndex} style={{
                    borderBottom: rowIndex < rows.length - 1 ? '1px solid #dee2e6' : 'none'
                  }}>
                    <td style={{
                      padding: '12px',
                      fontWeight: '500',
                      backgroundColor: '#f8f9fa'
                    }}>
                      {rowText}
                    </td>
                    {columns.map((col, colIndex) => {
                      const colValue = typeof col === 'object' ? col.value : col;
                      const isSelected = currentValue[rowValue] === colValue;

                      return (
                        <td key={colIndex} style={{
                          padding: '8px',
                          textAlign: 'center'
                        }}>
                          <input
                            type="radio"
                            name={`matrix_${rowValue}`}
                            checked={isSelected}
                            onChange={() => handleCellClick(rowValue, colValue)}
                            style={{
                              width: '20px',
                              height: '20px',
                              cursor: 'pointer'
                            }}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* No configuration message */}
      {(rows.length === 0 || columns.length === 0) && (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          backgroundColor: '#f9f9f9',
          border: '1px dashed #ccc',
          borderRadius: '8px'
        }}>
          <p style={{ margin: 0, color: '#666' }}>
            {rows.length === 0 && 'No rows configured. '}
            {columns.length === 0 && 'No columns configured. '}
            Please configure the matrix in the editor.
          </p>
        </div>
      )}
    </div>
  );
}

// Export default registration function
export default registerImageRankingWidget;
