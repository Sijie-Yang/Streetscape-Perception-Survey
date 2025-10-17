import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Menu,
  MenuItem,
  Alert,
  Collapse,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
  Grid
} from '@mui/material';
import {
  Folder,
  Add,
  MoreVert,
  Edit,
  Delete,
  FileCopy,
  Description,
  ExpandLess,
  ExpandMore,
  Science,
  Article,
  Close,
  ContentCopy,
  Download,
  Upload,
  Preview,
  Info,
  InfoOutlined
} from '@mui/icons-material';
import { 
  getUserProjects, 
  createProject, 
  createProjectFromTemplate, 
  deleteProject, 
  updateProject,
  duplicateProject,
  setActiveProject,
  getActiveProjectId 
} from '../../lib/projectManager';
import SurveyPreview from './SurveyPreview';
import { saveSurveyConfig, loadSurveyConfig } from '../../lib/surveyStorage';
import {
  loadTemplatesFromFiles,
  saveTemplateToFile,
  deleteTemplateFile,
  loadProjectsFromFiles,
  exportProjectToExternal,
  duplicateProjectInFolder,
  saveProjectAsTemplate,
  importProjectFromFile,
  deleteProjectFile
} from '../../lib/fileSystemManager';

export default function ProjectSidebar({ 
  open, 
  onClose, 
  onProjectSelect, 
  onProjectUpdate, // New: Used to notify parent component that project has been updated
  currentProject,
  surveyConfig,
  projectStates = {},
  width = 400 
}) {
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  
  // Dialog states
  const [createDialog, setCreateDialog] = useState(false);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [saveAsTemplateDialog, setSaveAsTemplateDialog] = useState(false);
  
  // Form states
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectAuthor, setNewProjectAuthor] = useState('');
  const [newProjectYear, setNewProjectYear] = useState(new Date().getFullYear().toString());
  const [newProjectCategory, setNewProjectCategory] = useState('');
  const [newProjectTags, setNewProjectTags] = useState('');
  const [newProjectWebsite, setNewProjectWebsite] = useState('');
  const [newProjectDataset, setNewProjectDataset] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewingTemplate, setPreviewingTemplate] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [deletingProject, setDeletingProject] = useState(null);
  const [projectToTemplate, setProjectToTemplate] = useState(null);
  
  // UI states
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuProject, setMenuProject] = useState(null);
  const [templatesExpanded, setTemplatesExpanded] = useState(true);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [expandedTemplateMetadata, setExpandedTemplateMetadata] = useState({});
  const [expandedProjectMetadata, setExpandedProjectMetadata] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadProjects();
    loadTemplates();
    setActiveProjectId(getActiveProjectId());

    // Set up file system monitoring (only when sidebar is open)
    const interval = setInterval(async () => {
      try {
        // Only check when sidebar is open to reduce unnecessary checks
        if (!open) return;
        
        const [newTemplates, newProjects] = await Promise.all([
          loadTemplatesFromFiles(),
          loadProjectsFromFiles()
        ]);
        
        // Stricter change detection to avoid unnecessary updates
        const templatesChanged = newTemplates.length !== templates.length || 
          newTemplates.some((t, i) => !templates[i] || t.id !== templates[i].id);
        const projectsChanged = newProjects.length !== projects.length ||
          newProjects.some((p, i) => !projects[i] || p.id !== projects[i].id);
        
        if (templatesChanged || projectsChanged) {
          console.log('📁 File changes detected, updating panel...');
          setTemplates(newTemplates);
          setProjects(newProjects);
        }
      } catch (error) {
        console.error('Error checking file system changes:', error);
      }
    }, 10000); // Increased to 10 seconds to further reduce check frequency

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, [templates.length, projects.length, open]);

  const loadProjects = async () => {
    try {
      const fileProjects = await loadProjectsFromFiles();
      setProjects(fileProjects);
    } catch (error) {
      console.error('Error loading projects from files:', error);
      // ✅ No fallback needed - all data is in files
      setProjects([]);
    }
  };

  const loadTemplates = async () => {
    try {
      console.log('Loading templates from files...');

      // Load all templates from files (including user-created ones)
      const fileTemplates = await loadTemplatesFromFiles();
      console.log('Templates loaded:', fileTemplates);

      setTemplates(fileTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };


  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      const result = await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim()
      });

      if (result.success) {
        // Reload projects to update panel
        await loadProjects();
        setActiveProject(result.project.id);
        setActiveProjectId(result.project.id);
        onProjectSelect(result.project, result.surveyConfig);
        setCreateDialog(false);
        setNewProjectName('');
        setNewProjectDescription('');
        setError('');
        console.log('✅ Project created and panel refreshed');
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      setError('Error creating project: ' + error.message);
    }
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !newProjectName.trim()) {
      setError('Template and project name are required');
      return;
    }

    // Validate template config
    if (!selectedTemplate.config) {
      console.error('❌ Template config is missing:', selectedTemplate);
      setError('Template configuration is missing. Please contact support.');
      return;
    }

    try {
      console.log('🎯 Creating project from template:', selectedTemplate.name);
      console.log('📋 Template ID:', selectedTemplate.id);
      console.log('📋 Template config exists:', !!selectedTemplate.config);
      console.log('📋 Template config keys:', Object.keys(selectedTemplate.config));
      console.log('📋 Template config pages:', selectedTemplate.config.pages?.length || 0);
      
      // ✅ Pass surveyConfig directly to createProject
      // This works for both static templates and file-based templates
      const projectData = {
        name: newProjectName.trim(),
        description: `Based on ${selectedTemplate.name}`,
        templateId: selectedTemplate.id,
        surveyConfig: selectedTemplate.config // ✅ Pass config directly
      };
      
      console.log('🔨 Creating project with data:', projectData);
      const result = await createProject(projectData);
      console.log('📦 Create project result:', result.success ? '✅ Success' : '❌ Failed', result.error || '');
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create project');
      }
      
      // Config already saved by createProject
      const finalConfig = result.surveyConfig;

      // Reload projects to update panel
      console.log('🔄 Reloading projects...');
      await loadProjects();
      
      console.log('🎯 Setting active project:', result.project.id);
      setActiveProject(result.project.id);
      setActiveProjectId(result.project.id);
      onProjectSelect(result.project, finalConfig);
      
      // Close dialog and clear state
      setTemplateDialog(false);
      setNewProjectName('');
      setSelectedTemplate(null);
      setError('');
      console.log('✅ Project created from template and panel refreshed');
    } catch (error) {
      console.error('❌ Error creating project from template:', error);
      setError('Error creating project from template: ' + error.message);
    }
  };

  const handleProjectSelect = async (project) => {
    setActiveProject(project.id);
    setActiveProjectId(project.id);
    onProjectSelect(project);
  };

  const handleProjectMenu = (event, project) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuProject(project);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuProject(null);
  };

  const handleEditProject = () => {
    setEditingProject(menuProject);
    setNewProjectName(menuProject.name);
    setNewProjectDescription(menuProject.description || '');
    setNewProjectAuthor(menuProject.author || '');
    setNewProjectYear(menuProject.year || new Date().getFullYear().toString());
    setNewProjectCategory(menuProject.category || '');
    setNewProjectTags(Array.isArray(menuProject.tags) ? menuProject.tags.join(', ') : (menuProject.tags || ''));
    setNewProjectWebsite(menuProject.website || '');
    setNewProjectDataset(menuProject.huggingfaceDataset || menuProject.dataset || '');
    setEditDialog(true);
    handleMenuClose();
  };

  const handleDeleteProject = () => {
    setDeletingProject(menuProject);
    setDeleteDialog(true);
    handleMenuClose();
  };

  const handleDuplicateProject = async () => {
    try {
      const result = await duplicateProjectInFolder(menuProject, surveyConfig, `${menuProject.name} (Copy)`);
      if (result.success) {
        // Project is automatically saved, reload immediately
        await loadProjects();
        // Switch to the duplicated project
        setActiveProject(result.project.id);
        setActiveProjectId(result.project.id);
        onProjectSelect(result.project, result.surveyConfig);
        console.log('✅ Project duplicated and panel refreshed');
      }
    } catch (error) {
      console.error('Error duplicating project:', error);
      setError('Error duplicating project: ' + error.message);
    }
    handleMenuClose();
  };

  const handleExportProject = async () => {
    if (!menuProject) {
      console.error('No project selected for export');
      return;
    }

    try {
      console.log('📦 Exporting project:', menuProject.name);
      
      // Load the project's surveyConfig from file system
      const projectConfig = await loadSurveyConfig(menuProject.id);
      if (!projectConfig) {
        console.error('Failed to load survey config for project:', menuProject.id);
        setError('Failed to load project configuration');
        return;
      }
      
      const result = await exportProjectToExternal(menuProject, projectConfig);
      if (result.success) {
        console.log(`✅ Project exported as ${result.filename} to your downloads folder.`);
        setError('');
      } else {
        setError('Failed to export project: ' + result.error);
      }
    } catch (error) {
      console.error('Error exporting project:', error);
      setError('Error exporting project: ' + error.message);
    }
    
    handleMenuClose();
  };

  const handleExportAsTemplate = () => {
    if (!menuProject) {
      console.error('No project selected for template creation');
      return;
    }

    // Populate form with project metadata
    setProjectToTemplate(menuProject);
    setNewProjectName(menuProject.name);
    setNewProjectDescription(menuProject.description || `Template created from project: ${menuProject.name}`);
    setNewProjectAuthor(menuProject.author || 'User');
    setNewProjectYear(menuProject.year || new Date().getFullYear().toString());
    setNewProjectCategory(menuProject.category || 'Custom');
    setNewProjectTags(Array.isArray(menuProject.tags) ? menuProject.tags.join(', ') : (menuProject.tags || 'custom, user-created'));
    setNewProjectWebsite(menuProject.website || '');
    setNewProjectDataset(menuProject.huggingfaceDataset || menuProject.dataset || '');
    
    // Open confirmation dialog
    setSaveAsTemplateDialog(true);
    handleMenuClose();
  };

  const confirmSaveAsTemplate = async () => {
    if (!projectToTemplate) {
      console.error('No project to save as template');
      return;
    }

    try {
      console.log('📝 Creating template from project:', projectToTemplate.name);
      
      // Load the project's surveyConfig from file system
      const projectConfig = await loadSurveyConfig(projectToTemplate.id);
      if (!projectConfig) {
        console.error('Failed to load survey config for project:', projectToTemplate.id);
        setError('Failed to load project configuration');
        return;
      }
      
      // Parse tags
      const tagsArray = newProjectTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      // Create modified project with updated metadata
      const modifiedProject = {
        ...projectToTemplate,
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        author: newProjectAuthor.trim() || 'User',
        year: newProjectYear.trim() || new Date().getFullYear().toString(),
        category: newProjectCategory.trim() || 'Custom',
        tags: tagsArray.length > 0 ? tagsArray : ['custom', 'user-created'],
        website: newProjectWebsite.trim() || undefined,
        huggingfaceDataset: newProjectDataset.trim() || undefined
      };
      
      const result = await saveProjectAsTemplate(modifiedProject, projectConfig);
      if (result.success) {
        // Template is automatically saved, reload immediately
        await loadTemplates();
        console.log('✅ Template created and panel refreshed');
        setError('');
        setSaveAsTemplateDialog(false);
        setProjectToTemplate(null);
      } else {
        setError('Failed to create template: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setError('Error creating template: ' + error.message);
    }
  };

  const handleImportProject = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const result = await importProjectFromFile(file);
        if (result.success) {
          // Project is automatically saved, reload immediately
          await loadProjects();
          // Switch to the imported project
          setActiveProject(result.project.id);
          setActiveProjectId(result.project.id);
          onProjectSelect(result.project, result.surveyConfig);
          console.log('✅ Project imported and panel refreshed');
          setError('');
        }
      } catch (error) {
        console.error('Import error:', error);
        setError('Error importing project: ' + error.message);
      }
    }
    // Reset file input
    event.target.value = '';
  };

  const confirmEditProject = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    // Parse tags from comma-separated string
    const tagsArray = newProjectTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    const updates = {
      name: newProjectName.trim(),
      description: newProjectDescription.trim(),
      author: newProjectAuthor.trim() || undefined,
      year: newProjectYear.trim() || undefined,
      category: newProjectCategory.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      website: newProjectWebsite.trim() || undefined,
      huggingfaceDataset: newProjectDataset.trim() || undefined
    };

    const result = await updateProject(editingProject.id, updates);

    if (result.success) {
      // Reload projects list
      await loadProjects();
      
      // If the edited project is the current active project, update it in parent
      if (currentProject && currentProject.id === editingProject.id && onProjectUpdate) {
        console.log('✅ Updating current project with new metadata');
        onProjectUpdate({
          ...currentProject,
          ...updates,
          lastModified: new Date().toISOString()
        });
      }
      
      // Close dialog and reset state
      setEditDialog(false);
      setEditingProject(null);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectAuthor('');
      setNewProjectYear(new Date().getFullYear().toString());
      setNewProjectCategory('');
      setNewProjectTags('');
      setError('');
    } else {
      setError(result.error);
    }
  };

  const confirmDeleteProject = async () => {
    if (!deletingProject) return;

    try {
      // Delete the actual file using deleteProjectFile
      const result = await deleteProjectFile(deletingProject.id);
      if (result.success) {
        // ✅ File deletion only (no localStorage to clean)
        await deleteProject(deletingProject.id);
        
        // Reload projects to update panel
        await loadProjects();
        
        // If we deleted the active project, clear selection
        if (activeProjectId === deletingProject.id) {
          setActiveProjectId(null);
          onProjectSelect(null);
        }
        
        console.log('✅ Project deleted and panel refreshed');
        setError('');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('Error deleting project: ' + error.message);
    }
    
    setDeleteDialog(false);
    setDeletingProject(null);
  };

  // System template IDs (built-in templates that cannot be deleted)
  const SYSTEM_TEMPLATE_IDS = [
    'basic-survey',
    'yang-2025',
    'my-template',
    'test-template'
  ];

  // Check if a template is user-created (can be deleted)
  const isUserTemplate = (template) => {
    // Legacy format: starts with 'user_'
    if (template.id?.startsWith('user_')) {
      return true;
    }
    // New format: not in system template list
    return !SYSTEM_TEMPLATE_IDS.includes(template.id);
  };

  const getTemplateIcon = (category) => {
    switch (category) {
      case 'Academic Research':
        return <Science />;
      case 'General':
        return <Article />;
      default:
        return <Description />;
    }
  };

  return (
    <>
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        variant="persistent"
        sx={{
          width: width,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: width,
            boxSizing: 'border-box',
            top: '64px', // Below AppBar
            height: 'calc(100vh - 64px)',
            borderRight: '1px solid',
            borderColor: 'divider'
          },
        }}
      >
        <Box sx={{ p: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
              Projects
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>

          {/* Templates Section */}
          <Box sx={{ mb: 1.5 }}>
            <ListItemButton 
              onClick={() => setTemplatesExpanded(!templatesExpanded)} 
              sx={{ px: 0, py: 0.5, minHeight: 'unset' }}
            >
              <ListItemIcon sx={{ minWidth: 32, minHeight: 'unset' }}>
                <Description fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Project Templates
                  </Typography>
                } 
                sx={{ my: 0 }}
              />
              {templatesExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </ListItemButton>
            
            <Collapse in={templatesExpanded} timeout="auto" unmountOnExit>
              <List sx={{ pl: 1 }}>
                {templates.length === 0 ? (
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                          No templates found. Create one from a project.
                        </Typography>
                      } 
                    />
                  </ListItem>
                ) : (
                  templates.map((template) => (
                    <ListItem key={template.id} disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <ListItemButton
                        sx={{ 
                          borderRadius: 1, 
                          mb: 0.25,
                          py: 0.5,
                          px: 1,
                          minHeight: 'unset',
                          '&:hover': {
                            bgcolor: 'grey.100',
                          },
                          bgcolor: isUserTemplate(template) ? 'primary.50' : 'transparent',
                        }}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setNewProjectName(`${template.name} - New`);
                          setNewProjectDescription(template.description);
                          setError(''); // Clear any previous errors
                          setTemplateDialog(true);
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 28, minHeight: 'unset' }}>
                          {getTemplateIcon(template.category)}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.3 }}>
                              {template.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                              {template.author || 'Unknown'} • {template.year}
                            </Typography>
                          }
                          sx={{ my: 0 }}
                        />
                        <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto' }}>
                          <Tooltip title={expandedTemplateMetadata[template.id] ? "Hide Metadata" : "Show Metadata"}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedTemplateMetadata(prev => ({
                                  ...prev,
                                  [template.id]: !prev[template.id]
                                }));
                              }}
                              sx={{ p: 0.25, color: 'text.secondary' }}
                            >
                              {expandedTemplateMetadata[template.id] ? <ExpandLess fontSize="small" /> : <InfoOutlined fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Preview Template">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewingTemplate(template);
                                setPreviewDialog(true);
                              }}
                              sx={{ p: 0.25, color: 'info.main' }}
                            >
                              <Preview fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy Template">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTemplate(template);
                                setNewProjectName(`${template.name} - New`);
                                setNewProjectDescription(template.description);
                                setTemplateDialog(true);
                              }}
                              sx={{ color: 'primary.main', p: 0.25 }}
                            >
                              <ContentCopy fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {isUserTemplate(template) && (
                            <Tooltip title="Delete Template">
                              <IconButton 
                                size="small"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await deleteTemplateFile(template.id);
                                    await loadTemplates(); // Refresh templates
                                    console.log('✅ Template deleted and panel refreshed');
                                  } catch (error) {
                                    console.error('Error deleting template:', error);
                                    setError('Error deleting template: ' + error.message);
                                  }
                                }}
                                sx={{ p: 0.25, color: 'error.main' }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </ListItemButton>
                      
                      {/* Metadata Collapse */}
                      <Collapse in={expandedTemplateMetadata[template.id]} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 2, py: 1, bgcolor: 'grey.50', borderRadius: 1, mx: 0.5, mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                            Metadata
                          </Typography>
                          {template.author && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>Author:</strong> {template.author}
                            </Typography>
                          )}
                          {template.year && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>Year:</strong> {template.year}
                            </Typography>
                          )}
                          {template.category && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>Category:</strong> {template.category}
                            </Typography>
                          )}
                          {template.tags && template.tags.length > 0 && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>Tags:</strong> {Array.isArray(template.tags) ? template.tags.join(', ') : template.tags}
                            </Typography>
                          )}
                          {template.website && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                              <strong>Website:</strong> <a href={template.website} target="_blank" rel="noopener noreferrer">{template.website}</a>
                            </Typography>
                          )}
                          {template.huggingfaceDataset && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>HF Dataset:</strong> {template.huggingfaceDataset}
                            </Typography>
                          )}
                          {template.description && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5, fontStyle: 'italic' }}>
                              {template.description}
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </ListItem>
                  ))
                )}
              </List>
            </Collapse>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* User Projects Section */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <ListItemButton 
                onClick={() => setProjectsExpanded(!projectsExpanded)} 
                sx={{ px: 0, py: 0.5, flex: 1, minHeight: 'unset' }}
              >
                <ListItemIcon sx={{ minWidth: 32, minHeight: 'unset' }}>
                  <Folder fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                      My Projects ({projects.length})
                    </Typography>
                  }
                  sx={{ my: 0 }}
                />
                {projectsExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
              </ListItemButton>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title="Import Project">
                  <IconButton component="label" size="small" color="primary">
                    <Upload />
                    <input
                      type="file"
                      hidden
                      accept=".json"
                      onChange={handleImportProject}
                    />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Create New Project">
                  <IconButton 
                    onClick={() => setCreateDialog(true)}
                    size="small"
                    color="primary"
                  >
                    <Add />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Collapse in={projectsExpanded} timeout="auto" unmountOnExit>
              <List sx={{ pl: 1 }}>
                {projects.length === 0 ? (
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                          No projects yet. Create your first project!
                        </Typography>
                      }
                    />
                  </ListItem>
                ) : (
                  projects.map((project) => (
                    <ListItem key={project.id} disablePadding sx={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <ListItemButton
                        selected={activeProjectId === project.id}
                        onClick={() => handleProjectSelect(project)}
                        sx={{ 
                          borderRadius: 1, 
                          mb: 0.25,
                          py: 0.5,
                          px: 1,
                          minHeight: 'unset',
                          '&.Mui-selected': {
                            bgcolor: 'primary.light',
                            color: 'primary.contrastText',
                            '&:hover': {
                              bgcolor: 'primary.main',
                            }
                          }
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 28, minHeight: 'unset' }}>
                          <Folder color={activeProjectId === project.id ? 'inherit' : 'action'} fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="body2" sx={{ fontSize: '0.875rem', lineHeight: 1.3 }}>
                                {project.name}
                              </Typography>
                              {projectStates[project.id]?.hasUnsavedChanges && (
                                <Chip 
                                  label="*" 
                                  size="small" 
                                  color="error" 
                                  sx={{ 
                                    minWidth: 16, 
                                    height: 16, 
                                    fontSize: '0.65rem',
                                    '& .MuiChip-label': { px: 0.3 }
                                  }} 
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                              <Typography 
                                variant="caption" 
                                color="inherit" 
                                sx={{ 
                                  opacity: 0.7, 
                                  fontSize: '0.7rem', 
                                  lineHeight: 1.2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  width: '100%'
                                }}
                                title={project.description || 'No description'}
                              >
                                {project.description || 'No description'}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="inherit" 
                                sx={{ 
                                  opacity: 0.6, 
                                  fontSize: '0.65rem', 
                                  lineHeight: 1.1
                                }}
                              >
                                {new Date(project.lastModified).toLocaleDateString()}
                                {projectStates[project.id]?.hasUnsavedChanges && ' • Unsaved'}
                              </Typography>
                            </Box>
                          }
                          sx={{ my: 0 }}
                        />
                        <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto' }}>
                          <Tooltip title={expandedProjectMetadata[project.id] ? "Hide Metadata" : "Show Metadata"}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedProjectMetadata(prev => ({
                                  ...prev,
                                  [project.id]: !prev[project.id]
                                }));
                              }}
                              sx={{ color: 'inherit', p: 0.25 }}
                            >
                              {expandedProjectMetadata[project.id] ? <ExpandLess fontSize="small" /> : <InfoOutlined fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            onClick={(e) => handleProjectMenu(e, project)}
                            sx={{ color: 'inherit', p: 0.5 }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItemButton>
                      
                      {/* Metadata Collapse */}
                      <Collapse in={expandedProjectMetadata[project.id]} timeout="auto" unmountOnExit>
                        <Box sx={{ 
                          px: 2, 
                          py: 1, 
                          bgcolor: activeProjectId === project.id ? 'primary.dark' : 'grey.50', 
                          borderRadius: 1, 
                          mx: 0.5, 
                          mb: 0.5,
                          color: activeProjectId === project.id ? 'primary.contrastText' : 'inherit'
                        }}>
                          <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                            Metadata
                          </Typography>
                          {project.author && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>Author:</strong> {project.author}
                            </Typography>
                          )}
                          {project.year && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>Year:</strong> {project.year}
                            </Typography>
                          )}
                          {project.category && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>Category:</strong> {project.category}
                            </Typography>
                          )}
                          {project.tags && project.tags.length > 0 && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>Tags:</strong> {Array.isArray(project.tags) ? project.tags.join(', ') : project.tags}
                            </Typography>
                          )}
                          {project.website && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', wordBreak: 'break-all' }}>
                              <strong>Website:</strong> <a href={project.website} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{project.website}</a>
                            </Typography>
                          )}
                          {project.huggingfaceDataset && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem' }}>
                              <strong>HF Dataset:</strong> {project.huggingfaceDataset}
                            </Typography>
                          )}
                          {project.templateId && (
                            <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', mt: 0.5 }}>
                              <strong>Template:</strong> {project.templateId}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.65rem', mt: 0.5, opacity: 0.7 }}>
                            Created: {new Date(project.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Collapse>
                    </ListItem>
                  ))
                )}
              </List>
            </Collapse>
          </Box>
        </Box>
      </Drawer>

      {/* Project Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditProject}>
          <ListItemIcon><Edit /></ListItemIcon>
          <ListItemText>Edit Project</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicateProject}>
          <ListItemIcon><FileCopy /></ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportProject}>
          <ListItemIcon><Download /></ListItemIcon>
          <ListItemText>Export Project</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleExportAsTemplate}>
          <ListItemIcon><Description /></ListItemIcon>
          <ListItemText>Save as Template</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteProject} sx={{ color: 'error.main' }}>
          <ListItemIcon><Delete color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Create Project Dialog */}
      <Dialog open={createDialog} onClose={() => setCreateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateProject} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Create from Template Dialog */}
      <Dialog open={templateDialog} onClose={() => { setTemplateDialog(false); setError(''); }} maxWidth="sm" fullWidth>
        <DialogTitle>Create Project from Template</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {selectedTemplate && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                {selectedTemplate.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedTemplate.description}
              </Typography>
            </Box>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setTemplateDialog(false); setError(''); }}>Cancel</Button>
          <Button onClick={handleCreateFromTemplate} variant="contained">Create Project</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {/* Basic Information */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
            Basic Information
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            sx={{ mb: 3 }}
          />

          {/* Template Metadata */}
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: 'primary.main' }}>
            Template Metadata (for when saving as template)
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Author (Optional)"
                fullWidth
                variant="outlined"
                value={newProjectAuthor}
                onChange={(e) => setNewProjectAuthor(e.target.value)}
                placeholder="e.g., Yang et al."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Year (Optional)"
                fullWidth
                variant="outlined"
                value={newProjectYear}
                onChange={(e) => setNewProjectYear(e.target.value)}
                placeholder="e.g., 2025"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Category (Optional)</InputLabel>
                <Select
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value)}
                  label="Category (Optional)"
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Academic Research">Academic Research</MenuItem>
                  <MenuItem value="General">General</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Tags (Optional)"
                fullWidth
                variant="outlined"
                value={newProjectTags}
                onChange={(e) => setNewProjectTags(e.target.value)}
                placeholder="e.g., streetscape, perception, urban planning"
                helperText="Separate multiple tags with commas"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Research Paper Website (Optional)"
                fullWidth
                variant="outlined"
                value={newProjectWebsite}
                onChange={(e) => setNewProjectWebsite(e.target.value)}
                placeholder="e.g., https://doi.org/10.xxxx/xxxxx or https://your-paper-url.com"
                helperText="URL to the research paper or project website"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Huggingface Image Dataset (Optional)"
                fullWidth
                variant="outlined"
                value={newProjectDataset}
                onChange={(e) => setNewProjectDataset(e.target.value)}
                placeholder="e.g., username/dataset-name or organization/dataset-name"
                helperText="Hugging Face dataset identifier for preloaded images"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={confirmEditProject} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Save As Template Dialog */}
      <Dialog open={saveAsTemplateDialog} onClose={() => setSaveAsTemplateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Save As Template</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <Alert severity="info" sx={{ mb: 2 }}>
            Please confirm or modify the template metadata. Sensitive data (Supabase credentials, tokens) will be automatically removed.
          </Alert>
          
          {/* Template Information */}
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 'bold', color: 'primary.main' }}>
            Template Information
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{ mb: 2 }}
            helperText="This will be the template's display name"
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            sx={{ mb: 3 }}
          />

          {/* Template Metadata */}
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold', color: 'primary.main' }}>
            Template Metadata
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Author"
                fullWidth
                variant="outlined"
                value={newProjectAuthor}
                onChange={(e) => setNewProjectAuthor(e.target.value)}
                placeholder="e.g., Yang et al."
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Year"
                fullWidth
                variant="outlined"
                value={newProjectYear}
                onChange={(e) => setNewProjectYear(e.target.value)}
                placeholder="e.g., 2025"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="dense">
                <InputLabel>Category</InputLabel>
                <Select
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="Academic Research">Academic Research</MenuItem>
                  <MenuItem value="General">General</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Tags"
                fullWidth
                variant="outlined"
                value={newProjectTags}
                onChange={(e) => setNewProjectTags(e.target.value)}
                placeholder="e.g., streetscape, perception, urban planning"
                helperText="Separate multiple tags with commas"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Research Paper Website (Optional)"
                fullWidth
                variant="outlined"
                value={newProjectWebsite}
                onChange={(e) => setNewProjectWebsite(e.target.value)}
                placeholder="e.g., https://doi.org/10.xxxx/xxxxx"
                helperText="URL to the research paper or project website"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                margin="dense"
                label="Huggingface Image Dataset (Optional)"
                fullWidth
                variant="outlined"
                value={newProjectDataset}
                onChange={(e) => setNewProjectDataset(e.target.value)}
                placeholder="e.g., username/dataset-name or organization/dataset-name"
                helperText="Hugging Face dataset identifier for preloaded images"
              />
            </Grid>
          </Grid>
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            <strong>Note:</strong> The template ID will be generated as <code>{newProjectYear}-{newProjectName.trim().split(/\s+/)[0].toLowerCase()}</code>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setSaveAsTemplateDialog(false); setProjectToTemplate(null); setError(''); }}>Cancel</Button>
          <Button onClick={confirmSaveAsTemplate} variant="contained" color="primary">Create Template</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{deletingProject?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteProject} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog 
        open={previewDialog} 
        onClose={() => {
          setPreviewDialog(false);
          setPreviewingTemplate(null);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Preview: {previewingTemplate?.name}
            </Typography>
            <IconButton 
              onClick={() => {
                setPreviewDialog(false);
                setPreviewingTemplate(null);
              }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {previewingTemplate && (
            <SurveyPreview config={previewingTemplate.config} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
