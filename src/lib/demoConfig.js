// Demo survey configuration for quick start
export const demoSurveyConfig = {
  title: "🎨 Custom Demo Survey (Admin Created)",
  description: "This is a DEMO survey created with the admin interface. You can edit this survey using the admin panel and see how the customization works with professional academic styling!",
  logo: "https://via.placeholder.com/150x50/474747/white?text=DEMO",
  logoPosition: "right",
  settings: {
    showQuestionNumbers: "off",
    showProgressBar: "aboveheader",
    progressBarType: "questions",
    autoGrowComment: true,
    showPreviewBeforeComplete: "showAllQuestions"
  },
  theme: {
    // Use original theme colors from Yang et al., 2025
    primaryColor: "#474747",
    primaryLight: "#6a6a6a",
    primaryDark: "#2e2e2e",
    secondaryColor: "#ff9814", // rgba(255, 152, 20, 1)
    accentColor: "#e50a3e", // rgba(229, 10, 62, 1) - special red
    successColor: "#19b394", // rgba(25, 179, 148, 1) - special green
    backgroundColor: "#ffffff", // rgba(255, 255, 255, 1)
    cardBackground: "#f8f8f8", // rgba(248, 248, 248, 1)
    headerBackground: "#f3f3f3", // rgba(243, 243, 243, 1)
    textColor: "#000000", // rgba(0, 0, 0, 0.91)
    secondaryText: "#737373", // rgba(0, 0, 0, 0.45)
    disabledText: "#737373", // rgba(0, 0, 0, 0.45)
    borderColor: "#292929", // rgba(0, 0, 0, 0.16)
    focusBorder: "#437fd9" // rgba(67, 127, 217, 1) - special blue
  },
  images: [
    // No demo images - users must upload their own images through the Image Manager
    // After configuring Supabase cloud storage, images will appear here
  ],
  pages: [
    {
      name: "demographics",
      title: "Background Information",
      description: "Please tell us a bit about yourself (optional).",
      elements: [
        {
          type: "radiogroup",
          name: "age_group",
          title: "What is your age group?",
          isRequired: false,
          choices: [
            "Under 18",
            "18-24",
            "25-34", 
            "35-44",
            "45-54",
            "55-64",
            "65 or older"
          ]
        },
        {
          type: "text",
          name: "location",
          title: "Where are you from? (City, Country)",
          isRequired: false
        }
      ]
    },
    {
      name: "perception",
      title: "Street Perception",
      description: "Please evaluate different street environments.",
      elements: [
        {
          type: "imagepicker",
          name: "safety_perception",
          title: "Safety Perception",
          description: "Which street environment do you perceive to be the SAFEST?",
          isRequired: true,
          imageLinks: [
            // No demo images - upload your own images through Image Manager
            // Images will appear here after uploading through the admin interface
          ],
          imageCount: 2,
          multiSelect: false
        },
        {
          type: "imagepicker", 
          name: "attractiveness_perception",
          title: "Visual Attractiveness",
          description: "Which street environment do you find most VISUALLY ATTRACTIVE?",
          isRequired: true,
          imageLinks: [
            // No demo images - upload your own images through Image Manager
            // Images will appear here after uploading through the admin interface
          ],
          imageCount: 2,
          multiSelect: false
        }
      ]
    },
    {
      name: "rating",
      title: "Comfort Rating",
      description: "Please rate how comfortable you would feel in this street environment.",
      elements: [
        {
          type: "image",
          name: "comfort_image",
          imageLinks: [
            // No demo images - upload your own images through Image Manager
          ]
        },
        {
          type: "radiogroup",
          name: "comfort_level",
          title: "How comfortable would you feel walking in this street?",
          isRequired: true,
          choices: [
            { value: 1, text: "Very Uncomfortable" },
            { value: 2, text: "Uncomfortable" },
            { value: 3, text: "Neutral" },
            { value: 4, text: "Comfortable" },
            { value: 5, text: "Very Comfortable" }
          ]
        }
      ]
    },
    {
      name: "elements",
      title: "Street Elements",
      description: "Identify the elements you notice in this street environment.",
      elements: [
        {
          type: "image",
          name: "elements_image", 
          imageLinks: [
            // No demo images - upload your own images through Image Manager
          ]
        },
        {
          type: "checkbox",
          name: "visible_elements",
          title: "Which elements do you notice in this street? (Select all that apply)",
          isRequired: true,
          choices: [
            "Trees and vegetation",
            "Street furniture (benches, lights)",
            "Bicycle lanes",
            "Pedestrian crossings", 
            "Commercial buildings",
            "Residential buildings",
            "Parking spaces"
          ]
        }
      ]
    },
    {
      name: "ranking",
      title: "Feature Importance",
      description: "Rank the features by importance for creating a pleasant walking experience.",
      elements: [
        {
          type: "image",
          name: "ranking_image",
          imageLinks: [
            // No demo images - upload your own images through Image Manager
          ]
        },
        {
          type: "ranking",
          name: "street_features",
          title: "Drag to rank these features from most important (top) to least important (bottom):",
          isRequired: true,
          choices: [
            { value: "safety", text: "Safety and security" },
            { value: "greenery", text: "Trees and greenery" },
            { value: "walkability", text: "Wide sidewalks and walkability" },
            { value: "aesthetics", text: "Visual appeal and aesthetics" },
            { value: "amenities", text: "Street furniture and amenities" }
          ]
        }
      ]
    },
    {
      name: "feedback",
      title: "Your Thoughts",
      description: "Share your thoughts about what makes a great street environment.",
      elements: [
        {
          type: "image",
          name: "feedback_image",
          imageLinks: [
            // No demo images - upload your own images through Image Manager
          ]
        },
        {
          type: "comment",
          name: "general_feedback",
          title: "What makes a street environment appealing to you? (Optional)",
          description: "Please share your thoughts about streetscape design, walkability, or any other aspects that matter to you.",
          isRequired: false,
          maxLength: 500
        }
      ]
    }
  ]
};
