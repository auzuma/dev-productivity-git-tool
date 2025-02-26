// Wait for the page to load
document.addEventListener('DOMContentLoaded', () => {
  let jsonEditor;
  let isJsonValid = false;
  let prUrl = null; // Store the PR URL when it's created
  
  // Initialize Monaco Editor
  require(['vs/editor/editor.main'], function() {
    // Create JSON editor
    jsonEditor = monaco.editor.create(document.getElementById('jsonEditor'), {
      value: '{\n  "key": "value"\n}',
      language: 'json',
      theme: 'vs-light',
      minimap: {
        enabled: false
      },
      automaticLayout: true,
      formatOnPaste: true,
      formatOnType: true
    });
    
    // Add JSON validation
    const modelUri = monaco.Uri.parse('a://b/file.json');
    const model = jsonEditor.getModel();
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [{
        uri: 'http://myserver/schema.json',
        fileMatch: [modelUri.toString()],
        schema: {
          type: 'object',
          properties: {
            // You can define a schema here if needed
          }
        }
      }]
    });
    
    // Update validation message on content change
    jsonEditor.onDidChangeModelContent(() => {
      validateJson();
    });
    
    // Initial validation
    validateJson();
  });
  
  // JSON validation function
  function validateJson() {
    try {
      const jsonContent = jsonEditor.getValue();
      JSON.parse(jsonContent);
      document.getElementById('jsonValidation').textContent = 'JSON is valid';
      document.getElementById('jsonValidation').style.color = '#2ecc71';
      isJsonValid = true;
    } catch (e) {
      document.getElementById('jsonValidation').textContent = `Invalid JSON: ${e.message}`;
      document.getElementById('jsonValidation').style.color = '#e74c3c';
      isJsonValid = false;
    }
    updateGenerateButtonState();
  }
  
  // Folder selection
  document.getElementById('selectGitDir').addEventListener('click', async () => {
    const path = await window.electronAPI.selectDirectory('Select Git Project Directory');
    if (path) {
      document.getElementById('gitProjectDir').value = path;
      updateGenerateButtonState();
    }
  });
  
  document.getElementById('selectTemplateDir').addEventListener('click', async () => {
    const path = await window.electronAPI.selectDirectory('Select Template Directory');
    if (path) {
      document.getElementById('templateDir').value = path;
      updateGenerateButtonState();
    }
  });
  
  document.getElementById('selectOutputDir').addEventListener('click', async () => {
    const path = await window.electronAPI.selectDirectory('Select Output Directory');
    if (path) {
      document.getElementById('outputDir').value = path;
      updateGenerateButtonState();
    }
  });
  
  // Input validation for text fields
  const textInputs = [
    'currentBranch',
    'newBranch',
    'commitMessage',
    'prTargetBranch'
  ];
  
  textInputs.forEach(id => {
    document.getElementById(id).addEventListener('input', updateGenerateButtonState);
  });
  
  // Update generate button state
  function updateGenerateButtonState() {
    const gitProjectDir = document.getElementById('gitProjectDir').value;
    const templateDir = document.getElementById('templateDir').value;
    const outputDir = document.getElementById('outputDir').value;
    const currentBranch = document.getElementById('currentBranch').value;
    const newBranch = document.getElementById('newBranch').value;
    const commitMessage = document.getElementById('commitMessage').value;
    
    const allFieldsFilled = 
      gitProjectDir && 
      templateDir && 
      outputDir && 
      currentBranch && 
      newBranch && 
      commitMessage && 
      isJsonValid;
    
    document.getElementById('generateBtn').disabled = !allFieldsFilled;
    document.getElementById('generateBtn').style.opacity = allFieldsFilled ? '1' : '0.5';
  }
  
  // Log message handler
  window.electronAPI.onLogMessage((message) => {
    const terminal = document.getElementById('terminal');
    const logLine = document.createElement('div');
    
    // Check if this message contains a PR URL
    if (message.includes('PR URL:')) {
      // Extract the URL from the message
      const urlMatch = message.match(/PR URL: (https:\/\/[^\s]+)/);
      if (urlMatch && urlMatch[1]) {
        prUrl = urlMatch[1];
        
        // Create a button to open the PR
        const openPrButton = document.createElement('button');
        openPrButton.textContent = 'Open Pull Request';
        openPrButton.className = 'open-pr-btn';
        openPrButton.onclick = openPullRequest;
        
        // Add the button after the URL message
        logLine.innerHTML = message.replace(
          urlMatch[0], 
          `${urlMatch[0]} `
        );
        logLine.appendChild(openPrButton);
        terminal.appendChild(logLine);
        return;
      }
    }
    
    // Regular log message
    logLine.textContent = message;
    terminal.appendChild(logLine);
    
    // Auto-scroll to bottom
    terminal.scrollTop = terminal.scrollHeight;
  });
  
  // Function to open the PR URL in the default browser
  function openPullRequest() {
    if (prUrl) {
      window.electronAPI.openUrl(prUrl)
        .then(result => {
          if (!result.success) {
            console.error('Failed to open PR URL:', result.error);
            const terminal = document.getElementById('terminal');
            const errorLine = document.createElement('div');
            errorLine.textContent = `Error opening URL: ${result.error}`;
            errorLine.style.color = '#e74c3c';
            terminal.appendChild(errorLine);
          }
        })
        .catch(error => {
          console.error('Error opening PR URL:', error);
          const terminal = document.getElementById('terminal');
          const errorLine = document.createElement('div');
          errorLine.textContent = `Error opening URL: ${error.message || 'Unknown error'}`;
          errorLine.style.color = '#e74c3c';
          terminal.appendChild(errorLine);
        });
    }
  }
  
  // Generate and Create PR button
  document.getElementById('generateBtn').addEventListener('click', async () => {
    // Clear terminal
    document.getElementById('terminal').innerHTML = '';
    
    // Disable the button during processing
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.textContent = 'Processing...';
    
    // Get all the inputs
    const config = {
      gitProjectDir: document.getElementById('gitProjectDir').value,
      templateDir: document.getElementById('templateDir').value,
      outputDir: document.getElementById('outputDir').value,
      currentBranch: document.getElementById('currentBranch').value,
      newBranch: document.getElementById('newBranch').value,
      commitMessage: document.getElementById('commitMessage').value,
      prTargetBranch: document.getElementById('prTargetBranch').value,
      enableFileRenaming: document.getElementById('enableFileRenaming').checked,
      jsonConfig: jsonEditor.getValue()
    };
    
    try {
      // Call the main process to process templates and run Git commands
      const result = await window.electronAPI.processTemplates(config);
      
      // Handle the result
      if (result.success) {
        // Log terminal will be updated via the onLogMessage handler
      } else {
        // Display error message
        const terminal = document.getElementById('terminal');
        terminal.innerHTML += `<div style="color: #e74c3c">Error: ${result.error}</div>`;
      }
    } catch (error) {
      console.error('Error:', error);
      const terminal = document.getElementById('terminal');
      terminal.innerHTML += `<div style="color: #e74c3c">Error: ${error.message || 'Unknown error'}</div>`;
    } finally {
      // Re-enable the button
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate & Create PR';
      updateGenerateButtonState();
    }
  });
});
