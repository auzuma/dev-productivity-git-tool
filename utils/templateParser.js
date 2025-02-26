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
 * @param {boolean} enableFileRenaming - Whether to enable file renaming based on JSON config
 * @returns {Promise<void>}
 */
async function processTemplates(templateDir, outputDir, jsonConfig, logger, enableFileRenaming = false) {
  // Make sure output directory exists
  await fs.ensureDir(outputDir);
  
  // Get all files recursively from template directory
  const files = await glob('**/*', { cwd: templateDir, nodir: true });
  
  logger(`Found ${files.length} files to process`);
  
  // Extract file renaming rules if enabled
  let renameRules = [];
  if (enableFileRenaming) {
    renameRules = Object.entries(jsonConfig)
      .filter(([key]) => key.startsWith('$$FILE_'))
      .map(([key, value]) => ({
        pattern: key.replace('$$FILE_', ''),
        replacement: value
      }));
      
    logger(`Found ${renameRules.length} file renaming rules`);
  }
  
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
    
    // Apply file renaming rules if enabled
    if (enableFileRenaming && renameRules.length > 0) {
      const newPath = applyFileRenaming(sourcePath, renameRules, templateDir);
      if (newPath !== sourcePath) {
        targetFileName = path.relative(templateDir, newPath);
        logger(`File renamed: ${file} → ${targetFileName}`);
      }
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
 * Rename files in a directory based on rules in the JSON configuration
 * 
 * @param {string} directory - Directory containing files to rename
 * @param {Object} jsonConfig - JSON configuration with renaming rules
 * @param {Function} logger - Function to log messages during processing
 * @returns {Promise<void>}
 */
async function renameFilesInDirectory(directory, jsonConfig, logger) {
  // Get all files recursively from the directory
  const files = await glob('**/*', { cwd: directory, nodir: true });
  
  logger(`Checking ${files.length} files for renaming rules`);
  
  // Extract file renaming rules from JSON config (keys starting with $$FILE_)
  const renameRules = Object.entries(jsonConfig)
    .filter(([key]) => key.startsWith('$$FILE_'))
    .map(([key, value]) => ({
      pattern: key.replace('$$FILE_', ''),
      replacement: value
    }));
  
  if (renameRules.length === 0) {
    logger('No file renaming rules found in configuration');
    return;
  }
  
  logger(`Found ${renameRules.length} file renaming rules`);
  
  // Process each file for renaming
  let renamedCount = 0;
  for (const file of files) {
    const filePath = path.join(directory, file);
    const newFilePath = applyFileRenaming(filePath, renameRules, directory);
    
    if (newFilePath !== filePath) {
      // Ensure target directory exists
      await fs.ensureDir(path.dirname(newFilePath));
      
      // Rename the file
      await fs.rename(filePath, newFilePath);
      logger(`Renamed: ${file} → ${path.relative(directory, newFilePath)}`);
      renamedCount++;
    }
  }
  
  logger(`Renamed ${renamedCount} files based on configuration rules`);
}

/**
 * Apply file renaming rules to a file path
 * 
 * @param {string} filePath - Original file path
 * @param {Array} rules - Array of renaming rules with pattern and replacement
 * @param {string} baseDir - Base directory for relative path calculation
 * @returns {string} - New file path after applying rules
 */
function applyFileRenaming(filePath, rules, baseDir) {
  let fileName = path.basename(filePath);
  let dirName = path.dirname(filePath);
  
  // Apply each rule to the filename
  for (const rule of rules) {
    // Exact match for filename instead of just includes
    if (fileName === rule.pattern) {
      fileName = rule.replacement;
      break; // Stop after first match to prevent multiple rules applying
    }
  }
  
  // Return the new path (unchanged if no rules matched)
  const newPath = path.join(dirName, fileName);
  return newPath;
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
  processPlaceholders,
  renameFilesInDirectory,
  applyFileRenaming
};