const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const simpleGit = require('simple-git');

// Import utility modules
const { processTemplates, renameFilesInDirectory } = require('./utils/templateParser');
const GitCommands = require('./utils/gitCommands');
const PRCreator = require('./utils/prCreation');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html of the app
  mainWindow.loadFile('index.html');

  // Open DevTools during development
  // mainWindow.webContents.openDevTools();

  // Handle window being closed
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

// Create window when Electron is ready
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

// Handle folder selection dialogs
ipcMain.handle('select-directory', async (event, title) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: title
  });

  if (result.canceled) {
    return null;
  } else {
    return result.filePaths[0];
  }
});

// Handle opening URLs in the default browser
ipcMain.handle('open-url', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening URL:', error);
    return { success: false, error: error.message };
  }
});

// Handle template processing and Git operations
ipcMain.handle('process-templates', async (event, config) => {
  try {
    const { 
      gitProjectDir, 
      templateDir, 
      outputDir, 
      currentBranch, 
      newBranch, 
      commitMessage, 
      prTargetBranch, 
      enableFileRenaming,
      jsonConfig 
    } = config;
    
    let logOutput = [];
    const addLog = (message) => {
      logOutput.push(message);
      event.sender.send('log-message', message);
    };

    // Setup Git commands with logger
    const git = new GitCommands(gitProjectDir, addLog);
    
    // 1. Git operations - checkout and pull
    addLog(`Checking out branch ${currentBranch}...`);
    await git.checkoutBranch(currentBranch);
    
    addLog(`Pulling latest changes from ${currentBranch}...`);
    await git.pull(currentBranch);
    
    // 2. Create new branch
    addLog(`Creating new branch ${newBranch}...`);
    await git.createBranch(newBranch, currentBranch);
    
    // 3. Process templates
    addLog('Processing templates...');
    await processTemplates(templateDir, outputDir, JSON.parse(jsonConfig), addLog);
    
    // 3.5 Rename files in output directory based on JSON config if enabled
    if (enableFileRenaming) {
      addLog('Checking for file renaming rules...');
      await renameFilesInDirectory(outputDir, JSON.parse(jsonConfig), addLog);
    } else {
      addLog('File renaming is disabled. Skipping file renaming step.');
    }
    
    // 4. Git operations - add, commit, push
    addLog('Staging changes...');
    await git.add('.');
    
    addLog(`Committing changes with message: ${commitMessage}`);
    await git.commit(commitMessage);
    
    addLog(`Pushing branch ${newBranch} to origin...`);
    await git.push(newBranch, 'origin', ['--set-upstream']);
    
    // 5. Create PR
    addLog(`Preparing Pull Request from ${newBranch} to ${prTargetBranch}...`);
    
    const prCreator = new PRCreator(addLog);
    const prResult = await prCreator.createPR({
      repoDir: gitProjectDir,
      head: newBranch,
      base: prTargetBranch,
      title: commitMessage,
      body: "Generated using the Dev Productivity Git Tool"
    });
    
    if (prResult.success) {
      addLog('Pull Request URL prepared successfully!');
      if (prResult.url) {
        addLog(`PR URL: ${prResult.url}`);
        addLog('Click the "Open Pull Request" button to open this URL in your browser when ready.');
      }
    } else {
      addLog('Failed to prepare PR URL.');
      addLog(`Error details: ${prResult.error}`);
    }
    
    return { success: true, logs: logOutput };
  } catch (error) {
    console.error('Error in process-templates:', error);
    event.sender.send('log-message', `Error: ${error.message}`);
    return { success: false, error: error.message };
  }
});
