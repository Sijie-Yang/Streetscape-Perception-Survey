// ========================================
// 📚 CITATION
// ========================================
// This survey platform was initially developed for:
// Yang, S., Chong, A., Liu, P., & Biljecki, F. (2025). 
// Thermal comfort in sight: Thermal affordance and its visual assessment for sustainable streetscape design. 
// Building and Environment, 112569. Elsevier.

// ⚠️ CRITICAL: YOU MUST REPLACE THIS WITH YOUR OWN DATA!
// The data below is just an EXAMPLE - replace with your own Supabase URL and image filenames

// 🔧 STEP 1: This will be automatically configured when you upload images through Image Manager
// No hardcoded URLs - images come from Supabase cloud storage only
const SUPABASE_STORAGE_URL = "";

// 🔧 STEP 2: No hardcoded filenames - images are managed through the admin interface
// Upload images through the Image Manager after configuring Supabase
const imageFilenames = [
  // No hardcoded images - use the Image Manager to upload your images
  // After uploading through the admin interface, images will be available for surveys
];

// 🔧 STEP 3: Automatically generate full URLs (no need to edit this part)
export const streetImages = imageFilenames.map(filename => `${SUPABASE_STORAGE_URL}//${filename}`);


// Function to get random images for questions
// Note: This function returns empty array since no hardcoded images are provided
// Images should be uploaded through the Image Manager and used via admin configuration
export function getRandomImages(questionName, count = 4) {
  // No hardcoded images available - return empty array
  // Users must upload images through the Image Manager after configuring Supabase
  return [];
  
  // This ensures the original research survey won't accidentally show placeholder images
  // and forces users to properly configure their image storage
} 