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
    
    // Apply file renaming rules from JSON config
    targetFileName = applyFileRenaming(targetFileName, jsonConfig);
    
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
 * Apply file renaming rules from JSON config
 * Keys starting with $$FILE_ will be used to rename files
 * 
 * @param {string} filename - The original filename
 * @param {Object} jsonConfig - Configuration object with renaming rules
 * @returns {string} - New filename after applying renaming rules
 */
function applyFileRenaming(filename, jsonConfig) {
  let newFilename = filename;
  
  // Get all keys that start with $$FILE_
  const fileRenameKeys = Object.keys(jsonConfig).filter(key => key.startsWith('$$FILE_'));
  
  for (const key of fileRenameKeys) {
    // Extract the pattern from the key (remove $$FILE_ prefix)
    const pattern = key.substring(7);
    
    // If the filename matches the pattern, replace it with the value
    if (filename.includes(pattern)) {
      newFilename = filename.replace(pattern, jsonConfig[key]);
      break; // Apply only the first matching rule
    }
  }
  
  return newFilename;
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

/**
 * Rename files in a directory based on JSON config keys that start with $$FILE_
 * 
 * @param {string} directory - Directory containing files to rename
 * @param {Object} jsonConfig - Configuration object with renaming rules
 * @param {Function} logger - Function to log messages during processing
 * @returns {Promise<void>}
 */
async function renameFilesInDirectory(directory, jsonConfig, logger) {
  logger(`Scanning directory for files to rename: ${directory}`);
  
  // Get all files recursively from the directory
  const files = await glob('**/*', { cwd: directory, nodir: true });
  
  // Get all keys that start with $$FILE_
  const fileRenameKeys = Object.keys(jsonConfig).filter(key => key.startsWith('$$FILE_'));
  
  if (fileRenameKeys.length === 0) {
    logger('No file renaming rules found in configuration');
    return;
  }
  
  logger(`Found ${files.length} files to check for renaming`);
  logger(`Found ${fileRenameKeys.length} file renaming rules in configuration`);
  
  let renamedCount = 0;
  
  for (const file of files) {
    const originalPath = path.join(directory, file);
    
    // Skip directories - double check with fs.stat
    try {
      const stats = await fs.stat(originalPath);
      if (stats.isDirectory()) {
        continue;
      }
    } catch (error) {
      logger(`Error checking file ${file}: ${error.message}`);
      continue;
    }
    
    // Apply file renaming rules
    const newFilename = applyFileRenaming(file, jsonConfig);
    
    // If the filename changed, rename the file
    if (newFilename !== file) {
      const newPath = path.join(directory, newFilename);
      
      // Ensure the target directory exists
      await fs.ensureDir(path.dirname(newPath));
      
      try {
        await fs.rename(originalPath, newPath);
        logger(`Renamed: ${file} → ${newFilename}`);
        renamedCount++;
      } catch (error) {
        logger(`Error renaming file ${file}: ${error.message}`);
      }
    }
  }
  
  logger(`File renaming complete. Renamed ${renamedCount} files.`);
}

module.exports = {
  processTemplates,
  processPlaceholders,
  applyFileRenaming,
  renameFilesInDirectory
};
