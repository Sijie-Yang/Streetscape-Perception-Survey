// Project templates for different research studies
export const projectTemplates = [
  {
    id: 'yang-2025',
    name: 'Yang et al. 2025',
    description: 'Streetscape perception survey template based on Yang et al. 2025 research',
    author: 'Yang et al.',
    year: '2025',
    category: 'Academic Research',
    tags: ['streetscape', 'perception', 'urban planning'],
    config: {
      title: "Urban Streetscape Perception Survey - Yang et al. 2025",
      description: "This survey investigates how people perceive different urban streetscape environments. Based on the methodology from Yang et al. 2025.",
      logo: "",
      logoPosition: "right",
      settings: {
        showQuestionNumbers: "off",
        showProgressBar: "aboveheader",
        progressBarType: "questions",
        autoGrowComment: true,
        showPreviewBeforeComplete: "showAllQuestions"
      },
      images: [],
      pages: [
        {
          name: "demographics",
          title: "Part 1: Background Information",
          description: "Please tell us a bit about yourself. All questions are optional.",
          elements: [
            {
              type: "dropdown",
              name: "age_group",
              title: "What is your age group?",
              isRequired: false,
              choices: [
                { value: "18-24", text: "18-24 years" },
                { value: "25-34", text: "25-34 years" },
                { value: "35-44", text: "35-44 years" },
                { value: "45-54", text: "45-54 years" },
                { value: "55-64", text: "55-64 years" },
                { value: "65+", text: "65+ years" }
              ]
            },
            {
              type: "dropdown",
              name: "education",
              title: "What is your highest level of education?",
              isRequired: false,
              choices: [
                { value: "high_school", text: "High School" },
                { value: "bachelor", text: "Bachelor's Degree" },
                { value: "master", text: "Master's Degree" },
                { value: "phd", text: "PhD/Doctorate" },
                { value: "other", text: "Other" }
              ]
            }
          ]
        },
        {
          name: "streetscape_evaluation",
          title: "Part 2: Streetscape Evaluation",
          description: "Please evaluate the following street environments based on your perception.",
          elements: [
            {
              type: "imagepicker",
              name: "street_preference",
              title: "Which street environment do you find most appealing?",
              description: "Select the street image that you find most visually appealing and comfortable.",
              isRequired: true,
              imageLinks: [],
              imageCount: 4,
              multiSelect: false
            },
            {
              type: "matrix",
              name: "perception_ratings",
              title: "Rate your perception of the street environments",
              description: "Please rate each aspect on a scale from 1 (Very Poor) to 5 (Excellent)",
              isRequired: true,
              columns: [
                { value: "1", text: "1 - Very Poor" },
                { value: "2", text: "2 - Poor" },
                { value: "3", text: "3 - Neutral" },
                { value: "4", text: "4 - Good" },
                { value: "5", text: "5 - Excellent" }
              ],
              rows: [
                { value: "safety", text: "Safety" },
                { value: "walkability", text: "Walkability" },
                { value: "aesthetics", text: "Visual Appeal" },
                { value: "comfort", text: "Comfort" },
                { value: "accessibility", text: "Accessibility" }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    id: 'basic-survey',
    name: 'Basic Survey Template',
    description: 'A simple, general-purpose survey template',
    author: 'System',
    year: '2024',
    category: 'General',
    tags: ['basic', 'general', 'starter'],
    config: {
      title: "Basic Survey Template",
      description: "A simple survey template to get you started.",
      logo: "",
      logoPosition: "right",
      settings: {
        showQuestionNumbers: "on",
        showProgressBar: "bottom",
        progressBarType: "questions",
        autoGrowComment: true,
        showPreviewBeforeComplete: "noPreview"
      },
      images: [],
      pages: [
        {
          name: "page1",
          title: "Survey Questions",
          description: "Please answer the following questions.",
          elements: [
            {
              type: "text",
              name: "name",
              title: "What is your name?",
              isRequired: false
            },
            {
              type: "radiogroup",
              name: "satisfaction",
              title: "How satisfied are you?",
              isRequired: true,
              choices: [
                { value: "very_satisfied", text: "Very Satisfied" },
                { value: "satisfied", text: "Satisfied" },
                { value: "neutral", text: "Neutral" },
                { value: "dissatisfied", text: "Dissatisfied" },
                { value: "very_dissatisfied", text: "Very Dissatisfied" }
              ]
            }
          ]
        }
      ]
    }
  }
];

export const getTemplateById = (id) => {
  return projectTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category) => {
  return projectTemplates.filter(template => template.category === category);
};

export const getAllCategories = () => {
  const categories = [...new Set(projectTemplates.map(template => template.category))];
  return categories.sort();
};
