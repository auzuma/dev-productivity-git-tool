const fs = require('fs-extra');
const path = require('path');
const { renameFilesInDirectory } = require('./utils/templateParser');

// Test configuration
const testConfig = {
  templateDir: path.join(__dirname, 'example', 'test-files'),
  outputDir: path.join(__dirname, 'example', 'output'),
  jsonConfig: require('./example/file-renaming-example.json')
};

// Logger function
const logger = (message) => console.log(message);

async function runTest() {
  try {
    // Clear output directory
    await fs.emptyDir(testConfig.outputDir);
    logger(`Cleared output directory: ${testConfig.outputDir}`);
    
    // Copy files from template directory to output directory
    await fs.copy(testConfig.templateDir, testConfig.outputDir);
    logger(`Copied files from ${testConfig.templateDir} to ${testConfig.outputDir}`);
    
    // Apply file renaming
    logger('Testing file renaming feature...');
    await renameFilesInDirectory(testConfig.outputDir, testConfig.jsonConfig, logger);
    
    // List files in output directory after renaming
    const files = await fs.readdir(testConfig.outputDir);
    logger('\nFiles in output directory after renaming:');
    for (const file of files) {
      logger(`- ${file}`);
    }
    
    logger('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest();
