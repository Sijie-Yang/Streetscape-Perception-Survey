const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for React app
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

const TEMPLATES_PATH = path.join(__dirname, 'public', 'project_templates');
const PROJECTS_PATH = path.join(__dirname, 'public', 'projects');
const DEPLOYMENTS_PATH = path.join(__dirname, 'deployments');

// Ensure directories exist
fs.ensureDirSync(TEMPLATES_PATH);
fs.ensureDirSync(PROJECTS_PATH);
fs.ensureDirSync(DEPLOYMENTS_PATH);

// Template endpoints
app.post('/api/templates', async (req, res) => {
  try {
    const { template } = req.body;
    const filename = `${template.id}.json`;
    const filePath = path.join(TEMPLATES_PATH, filename);
    
    await fs.writeFile(filePath, JSON.stringify(template, null, 2), 'utf8');
    
    console.log(`✅ Template "${template.name}" saved to ${filePath}`);
    res.json({ success: true, filename, filePath });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/templates/:templateId', async (req, res) => {
  try {
    const { templateId } = req.params;
    const filename = `${templateId}.json`;
    const filePath = path.join(TEMPLATES_PATH, filename);
    
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
      console.log(`✅ Template file ${filename} deleted from ${filePath}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Project endpoints
app.post('/api/projects', async (req, res) => {
  try {
    const { project, surveyConfig, supabaseConfig } = req.body;
    const filename = `${project.id}.json`;
    const filePath = path.join(PROJECTS_PATH, filename);
    
    const projectData = {
      project,
      surveyConfig,
      supabaseConfig,
      savedAt: new Date().toISOString(),
      version: '2.0'
    };
    
    await fs.writeFile(filePath, JSON.stringify(projectData, null, 2), 'utf8');
    
    console.log(`✅ Project "${project.name}" saved to ${filePath}`);
    res.json({ success: true, filename, filePath });
  } catch (error) {
    console.error('Error saving project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET single project data
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filename = `${projectId}.json`;
    const filePath = path.join(PROJECTS_PATH, filename);
    
    if (await fs.pathExists(filePath)) {
      const data = await fs.readFile(filePath, 'utf8');
      const projectData = JSON.parse(data);
      console.log(`✅ Loaded project data for ${projectId}`);
      res.json({ success: true, project: projectData.project, surveyConfig: projectData.surveyConfig });
    } else {
      res.status(404).json({ success: false, error: 'Project not found' });
    }
  } catch (error) {
    console.error('Error loading project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const filename = `${projectId}.json`;
    const filePath = path.join(PROJECTS_PATH, filename);
    
    if (await fs.pathExists(filePath)) {
      await fs.unlink(filePath);
      console.log(`✅ Project file ${filename} deleted from ${filePath}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List files endpoints
app.get('/api/templates', async (req, res) => {
  try {
    const files = await fs.readdir(TEMPLATES_PATH);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    res.json({ files: jsonFiles });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projects', async (req, res) => {
  try {
    const files = await fs.readdir(PROJECTS_PATH);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    res.json({ files: jsonFiles });
  } catch (error) {
    console.error('Error listing projects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deployment endpoints
app.post('/api/create-deployment', async (req, res) => {
  try {
    const { projectName, files } = req.body;
    
    if (!projectName || !files) {
      return res.status(400).json({ success: false, error: 'Project name and files are required' });
    }
    
    // Create deployment folder with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const deploymentFolderName = `${projectName}-${timestamp}`;
    const deploymentPath = path.join(DEPLOYMENTS_PATH, deploymentFolderName);
    
    // Ensure deployment folder exists
    await fs.ensureDir(deploymentPath);
    
    // Copy source files (excluding admin components and original SurveyApp)
    const srcPath = path.join(__dirname, 'src');
    const publicPath = path.join(__dirname, 'public');
    
    if (await fs.pathExists(srcPath)) {
      await fs.copy(srcPath, path.join(deploymentPath, 'src'), {
        filter: (src) => {
          // Exclude admin-related files and original SurveyApp (using SurveyAppClean instead)
          const relativePath = path.relative(srcPath, src);
          const excludePaths = [
            'AdminApp.js',
            'SurveyApp.js',
            'components/admin'
          ];
          return !excludePaths.some(excludePath => relativePath.includes(excludePath));
        }
      });
    }
    
    if (await fs.pathExists(publicPath)) {
      await fs.copy(publicPath, path.join(deploymentPath, 'public'));
    }
    
    // Write deployment-specific files (this will overwrite src/App.js with survey-only version)
    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path.join(deploymentPath, fileName);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, 'utf8');
    }
    
    console.log(`✅ Deployment folder created: ${deploymentPath}`);
    
    res.json({ 
      success: true, 
      deploymentPath: deploymentPath,
      deploymentName: deploymentFolderName
    });
  } catch (error) {
    console.error('Error creating deployment folder:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/deployment-status', async (req, res) => {
  try {
    const deployments = [];
    
    if (await fs.pathExists(DEPLOYMENTS_PATH)) {
      const items = await fs.readdir(DEPLOYMENTS_PATH);
      
      for (const item of items) {
        const itemPath = path.join(DEPLOYMENTS_PATH, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          deployments.push({
            name: item,
            path: itemPath,
            created: stats.birthtime,
            size: await getFolderSize(itemPath)
          });
        }
      }
    }
    
    // Sort by creation date (newest first)
    deployments.sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ deployments });
  } catch (error) {
    console.error('Error getting deployment status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test deployment build
app.post('/api/test-deployment', async (req, res) => {
  try {
    const { deploymentPath } = req.body;
    
    if (!deploymentPath) {
      return res.status(400).json({ success: false, error: 'Deployment path is required' });
    }
    
    if (!await fs.pathExists(deploymentPath)) {
      return res.status(404).json({ success: false, error: 'Deployment folder not found' });
    }
    
    console.log(`🧪 Testing deployment at: ${deploymentPath}`);
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    let fullOutput = '';
    
    // Run npm install
    fullOutput += '📦 Running npm install...\n';
    fullOutput += '─'.repeat(80) + '\n';
    console.log('📦 Running npm install...');
    try {
      const { stdout: installStdout, stderr: installStderr } = await execPromise('npm install', { 
        cwd: deploymentPath, 
        maxBuffer: 10 * 1024 * 1024 
      });
      fullOutput += installStdout || '';
      if (installStderr) fullOutput += installStderr;
      fullOutput += '\n✅ npm install completed\n\n';
      console.log('✅ npm install completed');
    } catch (error) {
      console.error('❌ npm install failed:', error.message);
      fullOutput += `\n❌ npm install failed:\n${error.message}\n`;
      return res.json({ 
        success: false, 
        error: 'npm install failed: ' + error.message,
        step: 'install',
        output: fullOutput
      });
    }
    
    // Run npm run build
    fullOutput += '🏗️  Running npm run build...\n';
    fullOutput += '─'.repeat(80) + '\n';
    console.log('🏗️  Running npm run build...');
    try {
      const { stdout: buildStdout, stderr: buildStderr } = await execPromise('npm run build', { 
        cwd: deploymentPath,
        maxBuffer: 10 * 1024 * 1024
      });
      fullOutput += buildStdout || '';
      if (buildStderr) fullOutput += buildStderr;
      fullOutput += '\n✅ npm run build completed\n\n';
      console.log('✅ npm run build completed');
      
      // Find an available port for preview server
      const findAvailablePort = async (startPort) => {
        const net = require('net');
        return new Promise((resolve) => {
          const server = net.createServer();
          server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
          });
          server.on('error', () => {
            resolve(findAvailablePort(startPort + 1));
          });
        });
      };
      
      const previewPort = await findAvailablePort(3100);
      
      // Start preview server in background
      const buildPath = path.join(deploymentPath, 'build');
      if (await fs.pathExists(buildPath)) {
        // Use serve to start preview server
        const serveProcess = exec(`npx serve -s build -l ${previewPort} --no-clipboard`, { 
          cwd: deploymentPath 
        });
        
        fullOutput += `\n🌐 Preview server started at: http://localhost:${previewPort}\n`;
        fullOutput += '─'.repeat(80) + '\n';
        fullOutput += '\n✅ Build test completed successfully!\n';
        
        res.json({ 
          success: true, 
          message: 'Deployment test completed successfully!',
          output: fullOutput,
          previewUrl: `http://localhost:${previewPort}`,
          previewPort: previewPort
        });
      } else {
        res.json({ 
          success: true, 
          message: 'Build completed but no build folder found',
          output: fullOutput
        });
      }
    } catch (error) {
      console.error('❌ npm run build failed:', error.message);
      fullOutput += `\n❌ npm run build failed:\n${error.message}\n`;
      return res.json({ 
        success: false, 
        error: 'npm run build failed: ' + error.message,
        step: 'build',
        output: fullOutput
      });
    }
  } catch (error) {
    console.error('Error testing deployment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload to GitHub
app.post('/api/upload-to-github', async (req, res) => {
  try {
    const { deploymentPath, githubRepoUrl, commitMessage } = req.body;
    
    if (!deploymentPath || !githubRepoUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Deployment path and GitHub repo URL are required' 
      });
    }
    
    if (!await fs.pathExists(deploymentPath)) {
      return res.status(404).json({ success: false, error: 'Deployment folder not found' });
    }
    
    console.log(`📤 Uploading to GitHub: ${githubRepoUrl}`);
    
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    try {
      // Check if .git already exists
      const gitPath = path.join(deploymentPath, '.git');
      const gitExists = await fs.pathExists(gitPath);
      
      const execOptions = { 
        cwd: deploymentPath,
        maxBuffer: 50 * 1024 * 1024 // Increase buffer to 50MB for large repos
      };
      
      if (!gitExists) {
        // Initialize git repository
        console.log('🔧 Initializing git repository...');
        await execPromise('git init', execOptions);
        await execPromise('git branch -M main', execOptions);
      }
      
      // Add all files
      console.log('📝 Adding files to git...');
      await execPromise('git add .', execOptions);
      
      // Commit with --quiet flag to reduce output
      console.log('💾 Committing changes...');
      const message = commitMessage || 'Initial deployment setup';
      await execPromise(`git commit --quiet -m "${message}"`, execOptions);
      
      // Add remote if not exists
      if (!gitExists) {
        console.log('🔗 Adding remote origin...');
        await execPromise(`git remote add origin ${githubRepoUrl}`, execOptions);
      } else {
        // Try to set the remote URL
        try {
          await execPromise(`git remote set-url origin ${githubRepoUrl}`, execOptions);
        } catch (e) {
          console.log('Remote already set correctly');
        }
      }
      
      // Push to GitHub with --quiet flag
      console.log('🚀 Pushing to GitHub...');
      try {
        await execPromise('git push --quiet -u origin main', execOptions);
        console.log('✅ Successfully uploaded to GitHub!');
      } catch (pushError) {
        // If push fails due to remote having changes, force push
        if (pushError.message.includes('rejected') || pushError.message.includes('fetch first')) {
          console.log('⚠️  Remote has changes, force pushing...');
          await execPromise('git push --quiet --force -u origin main', execOptions);
          console.log('✅ Force push successful!');
        } else {
          throw pushError;
        }
      }
      
      res.json({ 
        success: true, 
        message: 'Successfully uploaded to GitHub!',
        repoUrl: githubRepoUrl
      });
    } catch (error) {
      console.error('❌ Git operation failed:', error.message);
      
      // Provide helpful error messages
      let errorMessage = error.message;
      if (error.message.includes('Permission denied')) {
        errorMessage = 'Git push failed: Permission denied. Please make sure you have set up SSH keys or use a personal access token.';
      } else if (error.message.includes('remote: Repository not found')) {
        errorMessage = 'GitHub repository not found. Please create the repository first on GitHub.';
      }
      
      return res.json({ 
        success: false, 
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('Error uploading to GitHub:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper function to get folder size
async function getFolderSize(folderPath) {
  let totalSize = 0;
  
  try {
    const items = await fs.readdir(folderPath);
    
    for (const item of items) {
      const itemPath = path.join(folderPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        totalSize += await getFolderSize(itemPath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (error) {
    console.warn(`Could not calculate size for ${folderPath}:`, error.message);
  }
  
  return totalSize;
}

// ✅ Survey response endpoint (saves to file instead of localStorage!)
app.post('/api/responses', async (req, res) => {
  try {
    const responseData = req.body;
    const RESPONSES_PATH = path.join(__dirname, 'public', 'responses');
    
    // Ensure responses directory exists
    await fs.ensureDir(RESPONSES_PATH);
    
    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `response_${responseData.participant_id}_${timestamp}.json`;
    const filePath = path.join(RESPONSES_PATH, filename);
    
    await fs.writeFile(filePath, JSON.stringify(responseData, null, 2), 'utf8');
    
    console.log(`✅ Survey response saved to ${filePath}`);
    res.json({ success: true, filename, filePath });
  } catch (error) {
    console.error('Error saving survey response:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Backend restart endpoint
app.post('/api/restart', async (req, res) => {
  try {
    console.log('🔄 Backend restart requested...');
    
    // Send response first
    res.json({ 
      success: true, 
      message: 'Server restart initiated. Please wait 5-10 seconds for the server to restart.' 
    });
    
    // Gracefully restart after sending response
    setTimeout(() => {
      console.log('🔄 Restarting server...');
      process.exit(0); // Exit with success code, process manager should restart
    }, 1000);
  } catch (error) {
    console.error('Error restarting server:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 File management server running on http://localhost:${PORT}`);
  console.log(`📁 Templates directory: ${TEMPLATES_PATH}`);
  console.log(`📁 Projects directory: ${PROJECTS_PATH}`);
  console.log(`📁 Deployments directory: ${DEPLOYMENTS_PATH}`);
});
