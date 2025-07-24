import React, { useState, useEffect } from 'react';
import { AlertCircle, Save, FileText, Settings, CheckCircle } from 'lucide-react';

const YAMLGitHubEditor = () => {
  const [yamlContent, setYamlContent] = useState('');
  const [formData, setFormData] = useState({});
  const [githubToken, setGithubToken] = useState('');
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [branch, setBranch] = useState('main');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Test GitHub connection
  const testConnection = async () => {
    if (!githubToken) {
      setError('Please provide a GitHub token first');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Test basic API access
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'YAML-GitHub-Editor'
        }
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          setError('Invalid GitHub token. Please check your token and try again.');
        } else {
          setError(`GitHub API error: ${userResponse.statusText}`);
        }
        return;
      }

      const userData = await userResponse.json();
      
      // If repo info is provided, test repo access too
      if (repoOwner && repoName) {
        const repoResponse = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'YAML-GitHub-Editor'
          }
        });

        if (!repoResponse.ok) {
          if (repoResponse.status === 404) {
            setError(`Repository ${repoOwner}/${repoName} not found or not accessible with this token.`);
          } else {
            setError(`Cannot access repository: ${repoResponse.statusText}`);
          }
          return;
        }

        const repoData = await repoResponse.json();
        setSuccess(`✅ Connection successful! Authenticated as ${userData.login}. Repository "${repoData.full_name}" is accessible.`);
      } else {
        setSuccess(`✅ Token is valid! Authenticated as ${userData.login}. Please fill in repository details.`);
      }
    } catch (err) {
      setError(`Connection test failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Example JSON Schema for demonstration
  const exampleSchema = {
    type: "object",
    required: ["name", "version"],
    properties: {
      name: {
        type: "string",
        title: "Project Name",
        description: "The name of your project"
      },
      version: {
        type: "string",
        title: "Version",
        pattern: "^\\d+\\.\\d+\\.\\d+$",
        description: "Semantic version (e.g., 1.0.0)"
      },
      description: {
        type: "string",
        title: "Description",
        description: "Project description"
      },
      author: {
        type: "object",
        title: "Author",
        properties: {
          name: { type: "string", title: "Name" },
          email: { type: "string", format: "email", title: "Email" }
        },
        required: ["name"]
      },
      features: {
        type: "array",
        title: "Features",
        items: {
          type: "string"
        },
        description: "List of project features"
      },
      settings: {
        type: "object",
        title: "Settings",
        properties: {
          debug: { type: "boolean", title: "Debug Mode" },
          maxConnections: { type: "integer", title: "Max Connections", minimum: 1, maximum: 100 }
        }
      }
    }
  };

  // Load file from GitHub
  const loadFileFromGitHub = async () => {
    if (!githubToken || !repoOwner || !repoName || !filePath) {
      setError('Please fill in all GitHub configuration fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Attempting to fetch:', `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`);
      
      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'YAML-GitHub-Editor'
          }
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        if (response.status === 404) {
          setYamlContent('# New file - add your content here\n');
          setFormData({});
          setSuccess('File not found. Starting with empty content.');
          return;
        } else if (response.status === 401) {
          setError('Authentication failed. Please check your GitHub token and ensure it has the necessary permissions (repo scope).');
          return;
        } else if (response.status === 403) {
          const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
          if (rateLimitRemaining === '0') {
            setError('GitHub API rate limit exceeded. Please wait before trying again.');
          } else {
            setError('Access forbidden. Check if the repository exists and your token has access to it.');
          }
          return;
        } else {
          const errorText = await response.text();
          console.error('GitHub API error response:', errorText);
          setError(`GitHub API error (${response.status}): ${response.statusText}. ${errorText}`);
          return;
        }
      }

      const data = await response.json();
      console.log('File loaded successfully');
      
      if (data.content) {
        const content = atob(data.content.replace(/\s/g, ''));
        setYamlContent(content);
        
        // Parse YAML and populate form
        try {
          const parsed = parseYAML(content);
          setFormData(parsed || {});
          setSuccess(`File loaded successfully from ${repoOwner}/${repoName}/${filePath}`);
        } catch (yamlError) {
          setError('File loaded but failed to parse YAML content. Please check the YAML syntax.');
        }
      } else {
        setError('File found but no content available.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError(`Network error: Unable to connect to GitHub API. This could be due to:
        1. CORS issues (try using HTTPS if on HTTP)
        2. Network connectivity problems
        3. GitHub API being temporarily unavailable
        4. Browser blocking the request
        
        Original error: ${err.message}`);
      } else {
        setError(`Error loading file: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Simple YAML parser (basic implementation)
  const parseYAML = (yamlString) => {
    try {
      // This is a very basic YAML parser for demo purposes
      // In a real implementation, use a proper YAML library like js-yaml
      const lines = yamlString.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
      const result = {};
      
      for (const line of lines) {
        if (line.includes(':')) {
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          if (value) {
            result[key.trim()] = value.replace(/^["']|["']$/g, '');
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('YAML parsing error:', error);
      return {};
    }
  };

  // Convert form data to YAML
  const formDataToYAML = (data) => {
    const toYAML = (obj, indent = 0) => {
      const spaces = '  '.repeat(indent);
      let yaml = '';
      
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          yaml += `${spaces}${key}:\n`;
          yaml += toYAML(value, indent + 1);
        } else if (Array.isArray(value)) {
          yaml += `${spaces}${key}:\n`;
          value.forEach(item => {
            yaml += `${spaces}  - ${item}\n`;
          });
        } else {
          const quotedValue = typeof value === 'string' && value.includes(' ') ? `"${value}"` : value;
          yaml += `${spaces}${key}: ${quotedValue}\n`;
        }
      }
      
      return yaml;
    };
    
    return toYAML(data);
  };

  // Validate form data against schema
  const validateFormData = (data) => {
    const errors = [];
    
    // Basic validation based on our example schema
    if (!data.name) errors.push('Name is required');
    if (!data.version) errors.push('Version is required');
    if (data.version && !/^\d+\.\d+\.\d+$/.test(data.version)) {
      errors.push('Version must follow semantic versioning (e.g., 1.0.0)');
    }
    if (data.author?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.author.email)) {
      errors.push('Invalid email format');
    }
    
    return errors;
  };

  // Commit to GitHub
  const commitToGitHub = async () => {
    const validationErrors = validateFormData(formData);
    if (validationErrors.length > 0) {
      setError(`Validation errors: ${validationErrors.join(', ')}`);
      return;
    }

    if (!githubToken || !repoOwner || !repoName || !filePath) {
      setError('Please fill in all GitHub configuration fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Convert form data to YAML
      const yamlOutput = formDataToYAML(formData);
      const content = btoa(yamlOutput); // Base64 encode

      console.log('Attempting to commit to:', `${repoOwner}/${repoName}/${filePath}`);

      // Get current file SHA if it exists
      let sha = null;
      try {
        const existingFile = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
          {
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'YAML-GitHub-Editor'
            }
          }
        );
        if (existingFile.ok) {
          const fileData = await existingFile.json();
          sha = fileData.sha;
          console.log('Found existing file with SHA:', sha);
        }
      } catch (e) {
        console.log('File doesn\'t exist, creating new file');
      }

      // Commit the file
      const commitData = {
        message: `Update ${filePath} via web editor`,
        content: content,
        branch: branch
      };

      if (sha) {
        commitData.sha = sha;
      }

      console.log('Committing with data:', { ...commitData, content: '[base64 content]' });

      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'YAML-GitHub-Editor'
          },
          body: JSON.stringify(commitData)
        }
      );

      console.log('Commit response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Check your GitHub token permissions.');
        } else if (response.status === 403) {
          setError('Access forbidden. Ensure your token has write access to the repository.');
        } else if (response.status === 409) {
          setError('Conflict: The file was modified by someone else. Try loading the file again.');
        } else {
          const errorText = await response.text();
          console.error('GitHub commit error:', errorText);
          setError(`GitHub API error (${response.status}): ${response.statusText}`);
        }
        return;
      }

      const result = await response.json();
      console.log('Commit successful:', result);

      setYamlContent(yamlOutput);
      setSuccess(`Successfully committed to GitHub! Commit SHA: ${result.commit?.sha?.substring(0, 7) || 'unknown'}`);
    } catch (err) {
      console.error('Commit error:', err);
      
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError(`Network error during commit: ${err.message}. Check your connection and try again.`);
      } else {
        setError(`Error committing to GitHub: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">YAML Schema Editor</h1>
        <p className="text-gray-600">Edit YAML files with schema validation and commit directly to GitHub</p>
      </div>

      {/* GitHub Configuration */}
      <div className="bg-gray-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          GitHub Configuration
        </h2>
        <div className="bg-blue-50 p-3 rounded-md mb-4 text-sm text-blue-800">
          <strong>Setup Instructions:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
            <li>Generate a new token with <code className="bg-blue-100 px-1 rounded">repo</code> scope</li>
            <li>Fill in the repository details (owner/name) and file path</li>
          </ol>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            type="password"
            placeholder="GitHub Personal Access Token"
            value={githubToken}
            onChange={(e) => setGithubToken(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Repository Owner"
            value={repoOwner}
            onChange={(e) => setRepoOwner(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Repository Name"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="File Path (e.g., config.yml)"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Branch (default: main)"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={loadFileFromGitHub}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isLoading ? 'Loading...' : 'Load File'}
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 text-sm"
          >
            {isLoading ? 'Testing...' : 'Test Connection'}
          </button>
          <span className="text-xs text-gray-500 self-center">
            Test your GitHub token and repository access first
          </span>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <span className="text-green-700">{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Editor */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Schema-based Form</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version *</label>
              <input
                type="text"
                value={formData.version || ''}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1.0.0"
                pattern="^\d+\.\d+\.\d+$"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Project description"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-2">Author</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={formData.author?.name || ''}
                  onChange={(e) => setFormData({
                    ...formData, 
                    author: {...(formData.author || {}), name: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Author name"
                />
                <input
                  type="email"
                  value={formData.author?.email || ''}
                  onChange={(e) => setFormData({
                    ...formData, 
                    author: {...(formData.author || {}), email: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="author@example.com"
                />
              </div>
            </div>
          </div>

          <button
            onClick={commitToGitHub}
            disabled={isLoading}
            className="mt-6 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {isLoading ? 'Committing...' : 'Commit to GitHub'}
          </button>
        </div>

        {/* YAML Preview */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">YAML Preview</h2>
          <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto max-h-96 font-mono">
            {formDataToYAML(formData) || '# Generated YAML will appear here'}
          </pre>
        </div>
      </div>

      {/* Schema Information */}
      <div className="mt-6 bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Schema Information</h3>
        <p className="text-blue-800 text-sm">
          This form is generated from a JSON Schema. The schema defines validation rules, field types,
          and structure. Required fields are marked with *, and validation happens before committing to GitHub.
        </p>
      </div>

      {/* Troubleshooting */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Troubleshooting "Failed to fetch" Error</h3>
        <div className="text-yellow-800 text-sm space-y-2">
          <p><strong>Common causes and solutions:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Invalid Token:</strong> Ensure your GitHub Personal Access Token has the <code className="bg-yellow-100 px-1 rounded">repo</code> scope</li>
            <li><strong>Repository Access:</strong> Verify the repository owner/name are correct and you have access</li>
            <li><strong>Branch Issues:</strong> Make sure the branch exists (try "main" or "master")</li>
            <li><strong>CORS/HTTPS:</strong> Use HTTPS and ensure you're not being blocked by browser security</li>
            <li><strong>Network:</strong> Check your internet connection and GitHub API status</li>
            <li><strong>Rate Limits:</strong> GitHub API has rate limits - wait a few minutes if exceeded</li>
          </ul>
          <p className="mt-2"><strong>Test your token:</strong> Try accessing <code className="bg-yellow-100 px-1 rounded">https://api.github.com/user</code> with your token in a REST client first.</p>
        </div>
      </div>
    </div>
  );
};

export default YAMLGitHubEditor;
