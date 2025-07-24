# GitOps YAML Editor

A frontend application that generates forms from JSON schemas and commits the results as YAML files to GitHub repositories via pull requests.

## Features

- **Dynamic Form Generation**: Load any JSON schema URL and automatically generate a form
- **Schema Validation**: Validates form data against the JSON schema before submission
- **GitHub Integration**: Creates pull requests with YAML files to any GitHub repository
- **No Backend Required**: Runs entirely in the browser using GitHub's API
- **GitHub Pages Ready**: Deploy directly to GitHub Pages

## Setup

### 1. Enable GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. The site will be available at `https://[username].github.io/[repository-name]`

### 2. GitHub Personal Access Token

To use this tool, you'll need a GitHub Personal Access Token (PAT) with the following permissions:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with these scopes:
   - `repo` (Full control of private repositories)
   - `public_repo` (Access public repositories)

**Security Note**: Keep your PAT secure and never share it publicly.

## Usage

1. **Open the Application**: Navigate to your GitHub Pages URL
2. **Configure**:
   - **JSON Schema URL**: Enter the URL to your JSON schema file
   - **GitHub Repository**: Enter the target repository (format: `owner/repo`)
   - **GitHub PAT**: Enter your Personal Access Token
   - **YAML File Path**: Specify where to save the YAML file in the repository
3. **Load Schema**: Click "Load Schema & Generate Form"
4. **Fill Form**: Complete the dynamically generated form
5. **Validate**: Click "Validate" to ensure data conforms to the schema
6. **Submit**: Click "Create Pull Request" to generate a PR with your YAML file

## Supported JSON Schema Features

- **Data Types**: string, number, integer, boolean, array, object
- **Validation**: required fields, min/max values, enums
- **Formats**: email, url, date, textarea
- **Nested Objects**: Full support for complex nested structures
- **Arrays**: Dynamic add/remove array items
- **Descriptions**: Field tooltips from schema descriptions

## Example JSON Schema

```json
{
  "title": "Application Configuration",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "title": "Application Name",
      "description": "The name of your application"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "title": "Version",
      "description": "Semantic version number"
    },
    "environment": {
      "type": "string",
      "enum": ["development", "staging", "production"],
      "title": "Environment"
    },
    "features": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "title": "Enabled Features"
    }
  },
  "required": ["name", "version", "environment"]
}
```

## Development

This is a static frontend application that requires no build process:

- `index.html` - Main application structure
- `styles.css` - Styling and responsive design
- `app.js` - Core application logic and GitHub API integration

### Dependencies (via CDN)

- [js-yaml](https://github.com/nodeca/js-yaml) - YAML parsing and generation
- [Ajv](https://ajv.js.org/) - JSON schema validation

## Security Considerations

- PATs are stored only in browser memory and never persisted
- All GitHub API calls use HTTPS
- Form validation prevents invalid data submission
- CORS policies may require schemas to be served with appropriate headers

## Troubleshooting

### Schema Loading Issues

- Ensure the JSON schema URL is publicly accessible
- Check that the server serves the schema with proper CORS headers
- Verify the JSON schema is valid JSON

### GitHub API Issues

- Confirm your PAT has the necessary permissions
- Check that the repository exists and you have write access
- Ensure the repository name format is correct (`owner/repo`)

### Validation Errors

- Review the validation error messages for specific field issues
- Ensure all required fields are filled
- Check that data types match the schema requirements

## License

MIT License - feel free to use and modify as needed.