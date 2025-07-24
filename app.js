class GitOpsYAMLEditor {
    constructor() {
        this.schema = null;
        this.validator = null;
        this.formData = {};
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        document.getElementById('load-schema').addEventListener('click', () => this.loadSchema());
        document.getElementById('validate-form').addEventListener('click', () => this.validateForm());
        document.getElementById('submit-form').addEventListener('click', () => this.submitForm());
    }

    async loadSchema() {
        const schemaUrl = document.getElementById('schema-url').value;
        if (!schemaUrl) {
            this.showStatus('Please enter a JSON schema URL', 'error');
            return;
        }

        try {
            this.showStatus('Loading schema...', 'info');
            const response = await fetch(schemaUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch schema: ${response.statusText}`);
            }
            
            this.schema = await response.json();
            this.validator = new Ajv({allErrors: true}).compile(this.schema);
            
            this.displaySchemaInfo();
            this.generateForm();
            this.showStatus('Schema loaded successfully!', 'success');
        } catch (error) {
            this.showStatus(`Error loading schema: ${error.message}`, 'error');
        }
    }

    displaySchemaInfo() {
        const schemaInfo = document.getElementById('schema-info');
        const title = document.getElementById('schema-title');
        const description = document.getElementById('schema-description');
        
        title.textContent = this.schema.title || 'Untitled Schema';
        description.textContent = this.schema.description || 'No description available';
        
        schemaInfo.style.display = 'block';
    }

    generateForm() {
        const formContainer = document.getElementById('dynamic-form');
        formContainer.innerHTML = '';
        
        if (this.schema.type === 'object' && this.schema.properties) {
            this.generateObjectFields(formContainer, this.schema, '');
        } else {
            this.generateField(formContainer, '', this.schema, '');
        }
        
        document.getElementById('form-container').style.display = 'block';
    }

    generateObjectFields(container, schema, path) {
        const properties = schema.properties || {};
        const required = schema.required || [];
        
        Object.keys(properties).forEach(key => {
            const fieldSchema = properties[key];
            const fieldPath = path ? `${path}.${key}` : key;
            const isRequired = required.includes(key);
            
            this.generateField(container, key, fieldSchema, fieldPath, isRequired);
        });
    }

    generateField(container, name, schema, path, isRequired = false) {
        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = schema.title || name || 'Value';
        if (isRequired) {
            label.innerHTML += ' <span class="required">*</span>';
        }
        if (schema.description) {
            label.title = schema.description;
        }
        fieldGroup.appendChild(label);
        
        let input;
        
        switch (schema.type) {
            case 'string':
                input = this.generateStringField(schema, path);
                break;
            case 'number':
            case 'integer':
                input = this.generateNumberField(schema, path);
                break;
            case 'boolean':
                input = this.generateBooleanField(schema, path);
                break;
            case 'array':
                input = this.generateArrayField(schema, path);
                break;
            case 'object':
                input = this.generateObjectField(schema, path);
                break;
            default:
                input = this.generateStringField(schema, path);
        }
        
        if (input) {
            fieldGroup.appendChild(input);
        }
        
        container.appendChild(fieldGroup);
    }

    generateStringField(schema, path) {
        let input;
        
        if (schema.enum) {
            input = document.createElement('select');
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select an option...';
            input.appendChild(defaultOption);
            
            schema.enum.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option;
                optionElement.textContent = option;
                input.appendChild(optionElement);
            });
        } else if (schema.format === 'textarea' || (schema.minLength && schema.minLength > 100)) {
            input = document.createElement('textarea');
            input.rows = 4;
        } else {
            input = document.createElement('input');
            input.type = schema.format === 'email' ? 'email' : 
                       schema.format === 'uri' ? 'url' : 
                       schema.format === 'date' ? 'date' : 'text';
        }
        
        if (schema.default !== undefined) {
            input.value = schema.default;
        }
        
        if (schema.placeholder) {
            input.placeholder = schema.placeholder;
        }
        
        input.addEventListener('change', () => this.updateFormData(path, input.value));
        input.addEventListener('input', () => this.updateFormData(path, input.value));
        
        return input;
    }

    generateNumberField(schema, path) {
        const input = document.createElement('input');
        input.type = 'number';
        
        if (schema.minimum !== undefined) input.min = schema.minimum;
        if (schema.maximum !== undefined) input.max = schema.maximum;
        if (schema.default !== undefined) input.value = schema.default;
        
        input.addEventListener('change', () => {
            const value = schema.type === 'integer' ? parseInt(input.value) : parseFloat(input.value);
            this.updateFormData(path, isNaN(value) ? null : value);
        });
        
        return input;
    }

    generateBooleanField(schema, path) {
        const input = document.createElement('input');
        input.type = 'checkbox';
        
        if (schema.default !== undefined) {
            input.checked = schema.default;
        }
        
        input.addEventListener('change', () => this.updateFormData(path, input.checked));
        
        return input;
    }

    generateArrayField(schema, path) {
        const container = document.createElement('div');
        container.className = 'array-container';
        
        const items = [];
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'array-items';
        
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn btn-secondary btn-small';
        addButton.textContent = 'Add Item';
        
        addButton.addEventListener('click', () => {
            const itemIndex = items.length;
            const itemPath = `${path}[${itemIndex}]`;
            const itemContainer = document.createElement('div');
            itemContainer.className = 'array-item';
            
            this.generateField(itemContainer, `Item ${itemIndex + 1}`, schema.items, itemPath);
            
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'btn btn-secondary btn-small';
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => {
                itemContainer.remove();
                items.splice(itemIndex, 1);
                this.updateArrayFormData(path, items);
            });
            
            const controls = document.createElement('div');
            controls.className = 'array-controls';
            controls.appendChild(removeButton);
            itemContainer.appendChild(controls);
            
            itemsContainer.appendChild(itemContainer);
            items.push(null);
            this.updateArrayFormData(path, items);
        });
        
        container.appendChild(itemsContainer);
        container.appendChild(addButton);
        
        return container;
    }

    generateObjectField(schema, path) {
        const container = document.createElement('div');
        container.className = 'object-container';
        
        this.generateObjectFields(container, schema, path);
        
        return container;
    }

    updateFormData(path, value) {
        if (!path) return;
        
        const keys = path.split(/[\.\[\]]/).filter(k => k !== '');
        let current = this.formData;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                const nextKey = keys[i + 1];
                current[key] = isNaN(parseInt(nextKey)) ? {} : [];
            }
            current = current[key];
        }
        
        const lastKey = keys[keys.length - 1];
        if (value === '' || value === null) {
            delete current[lastKey];
        } else {
            current[lastKey] = value;
        }
    }

    updateArrayFormData(path, items) {
        const keys = path.split(/[\.\[\]]/).filter(k => k !== '');
        let current = this.formData;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current)) {
                current[key] = {};
            }
            current = current[key];
        }
        
        const lastKey = keys[keys.length - 1];
        current[lastKey] = items.filter(item => item !== null);
    }

    validateForm() {
        if (!this.validator) {
            this.showStatus('No schema loaded', 'error');
            return false;
        }
        
        const isValid = this.validator(this.formData);
        const resultsDiv = document.getElementById('validation-results');
        
        if (isValid) {
            resultsDiv.className = 'validation-results success';
            resultsDiv.innerHTML = '<h3>✓ Validation Successful</h3><p>The form data conforms to the schema.</p>';
            resultsDiv.style.display = 'block';
            document.getElementById('submit-form').disabled = false;
            return true;
        } else {
            resultsDiv.className = 'validation-results error';
            let errorsHtml = '<h3>✗ Validation Errors</h3><ul>';
            this.validator.errors.forEach(error => {
                errorsHtml += `<li>${error.instancePath || 'root'}: ${error.message}</li>`;
            });
            errorsHtml += '</ul>';
            resultsDiv.innerHTML = errorsHtml;
            resultsDiv.style.display = 'block';
            document.getElementById('submit-form').disabled = true;
            return false;
        }
    }

    async submitForm() {
        if (!this.validateForm()) {
            return;
        }
        
        const githubRepo = document.getElementById('github-repo').value;
        const githubPat = document.getElementById('github-pat').value;
        const filePath = document.getElementById('file-path').value;
        
        if (!githubRepo || !githubPat || !filePath) {
            this.showStatus('Please fill in all GitHub configuration fields', 'error');
            return;
        }
        
        try {
            this.showStatus('Creating pull request...', 'info');
            
            const yamlContent = jsyaml.dump(this.formData, {
                indent: 2,
                lineWidth: -1,
                noRefs: true,
                sortKeys: false
            });
            
            const prUrl = await this.createGitHubPR(githubRepo, githubPat, filePath, yamlContent);
            
            this.showStatus(`✓ Pull request created successfully! <a href="${prUrl}" target="_blank">View PR</a>`, 'success');
        } catch (error) {
            this.showStatus(`Error creating pull request: ${error.message}`, 'error');
        }
    }

    async createGitHubPR(repo, token, filePath, content) {
        const [owner, repoName] = repo.split('/');
        const apiBase = `https://api.github.com/repos/${owner}/${repoName}`;
        
        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        const mainBranch = await this.getDefaultBranch(apiBase, headers);
        const branchName = `gitops-yaml-update-${Date.now()}`;
        
        const latestCommit = await this.getLatestCommit(apiBase, headers, mainBranch);
        
        await this.createBranch(apiBase, headers, branchName, latestCommit.sha);
        
        const fileExists = await this.checkFileExists(apiBase, headers, filePath, branchName);
        let fileSha = null;
        
        if (fileExists) {
            const fileData = await this.getFileContent(apiBase, headers, filePath, branchName);
            fileSha = fileData.sha;
        }
        
        await this.commitFile(apiBase, headers, filePath, content, branchName, fileSha);
        
        const prData = await this.createPullRequest(apiBase, headers, {
            title: `Update ${filePath}`,
            head: branchName,
            base: mainBranch,
            body: `Automated update to ${filePath} via GitOps YAML Editor\n\nGenerated from JSON schema validation.`
        });
        
        return prData.html_url;
    }

    async getDefaultBranch(apiBase, headers) {
        const response = await fetch(apiBase, { headers });
        if (!response.ok) throw new Error(`Failed to get repository info: ${response.statusText}`);
        const repo = await response.json();
        return repo.default_branch;
    }

    async getLatestCommit(apiBase, headers, branch) {
        const response = await fetch(`${apiBase}/git/refs/heads/${branch}`, { headers });
        if (!response.ok) throw new Error(`Failed to get latest commit: ${response.statusText}`);
        const ref = await response.json();
        return ref.object;
    }

    async createBranch(apiBase, headers, branchName, sha) {
        const response = await fetch(`${apiBase}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                ref: `refs/heads/${branchName}`,
                sha
            })
        });
        if (!response.ok) throw new Error(`Failed to create branch: ${response.statusText}`);
    }

    async checkFileExists(apiBase, headers, filePath, branch) {
        try {
            const response = await fetch(`${apiBase}/contents/${filePath}?ref=${branch}`, { headers });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getFileContent(apiBase, headers, filePath, branch) {
        const response = await fetch(`${apiBase}/contents/${filePath}?ref=${branch}`, { headers });
        if (!response.ok) throw new Error(`Failed to get file content: ${response.statusText}`);
        return await response.json();
    }

    async commitFile(apiBase, headers, filePath, content, branch, sha = null) {
        const commitData = {
            message: `Update ${filePath} via GitOps YAML Editor`,
            content: btoa(unescape(encodeURIComponent(content))),
            branch
        };
        
        if (sha) {
            commitData.sha = sha;
        }
        
        const response = await fetch(`${apiBase}/contents/${filePath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(commitData)
        });
        
        if (!response.ok) throw new Error(`Failed to commit file: ${response.statusText}`);
    }

    async createPullRequest(apiBase, headers, prData) {
        const response = await fetch(`${apiBase}/pulls`, {
            method: 'POST',
            headers,
            body: JSON.stringify(prData)
        });
        
        if (!response.ok) throw new Error(`Failed to create pull request: ${response.statusText}`);
        return await response.json();
    }

    showStatus(message, type) {
        const statusDiv = document.getElementById('status');
        statusDiv.className = `status ${type}`;
        statusDiv.innerHTML = message;
        statusDiv.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 10000);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new GitOpsYAMLEditor();
});