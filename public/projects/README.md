# Projects Directory

This directory stores survey project files created in the admin panel.

## Structure

Each project is saved as a JSON file with the format:
```
proj_[timestamp]_[randomid].json
```

## Contents

Each project file contains:
- **project**: Project metadata (name, description, settings)
- **surveyConfig**: Complete survey configuration (pages, questions, logic)
- **supabaseConfig**: Cloud storage and database settings

## Development

Project files are automatically created when you:
1. Create a new project in Admin Panel
2. Load a template and save it
3. Import an existing project

## Production

In production deployments, project configurations are typically:
- Embedded directly in the deployed code
- Or loaded from a database/API endpoint

This directory is used for local development and testing only.

