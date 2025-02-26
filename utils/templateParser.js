const fs = require('fs-extra');
const path = require('path');
const { glob } = require('glob');

/**
 * Process templates from a source directory to a target directory,
 * replacing placeholders with values from a JSON configuration
 * 
 * @param {string} templateDir - Source directory containing templates
 * @param {string} outputDir - Target directory for processed files
 * @param {Object} jsonConfig - JSON configuration with values to replace placeholders
 * @param {Function} logger - Function to log messages during processing
 * @returns {Promise<void>}
 */
async function processTemplates(templateDir, outputDir, jsonConfig, logger) {
  // Make sure output directory exists
  await fs.ensureDir(outputDir);
  
  // Get all files recursively from template directory
  const files = await glob('**/*', { cwd: templateDir, nodir: true });
  
  logger(`Found ${files.length} files to process`);
  
  for (const file of files) {
    const sourcePath = path.join(templateDir, file);
    
    // Skip directories - double check with fs.stat
    try {
      const stats = await fs.stat(sourcePath);
      if (stats.isDirectory()) {
        logger(`Skipping directory: ${file}`);
        continue;
      }
    } catch (error) {
      logger(`Error checking file ${file}: ${error.message}`);
      continue;
    }
    
    // Process file name for any placeholders
    let targetFileName = file;
    
    // Check if this is a file with placeholders in the name
    if (path.basename(file).startsWith('file_')) {
      targetFileName = processPlaceholders(targetFileName, jsonConfig);
    }
    
    const targetPath = path.join(outputDir, targetFileName);
    
    // Ensure the target directory exists
    await fs.ensureDir(path.dirname(targetPath));
    
    try {
      // Read file content
      const content = await fs.readFile(sourcePath, 'utf8');
      
      // Process content for placeholders
      const processedContent = processPlaceholders(content, jsonConfig);
      
      // Write to target file
      await fs.writeFile(targetPath, processedContent);
      logger(`Processed: ${targetFileName}`);
    } catch (error) {
      logger(`Error processing file ${file}: ${error.message}`);
    }
  }
  
  logger('Template processing complete');
}

/**
 * Process placeholders in a string
 * Replaces {{ key }} with the corresponding value from jsonConfig
 * 
 * @param {string} text - The text containing placeholders
 * @param {Object} jsonConfig - Configuration object with replacement values
 * @returns {string} - Processed text with replacements
 */
function processPlaceholders(text, jsonConfig) {
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    if (jsonConfig.hasOwnProperty(trimmedKey)) {
      return jsonConfig[trimmedKey];
    }
    // Leave unmatched placeholders as-is
    return match;
  });
}

module.exports = {
  processTemplates,
  processPlaceholders
};