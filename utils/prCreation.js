const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const https = require('https');
const path = require('path');

/**
 * Class to handle Pull Request creation
 */
class PRCreator {
  /**
   * Constructor
   * @param {Function} logger - Function to log messages
   */
  constructor(logger) {
    this.logger = logger || console.log;
  }
  
  /**
   * Check if GitHub CLI is installed and available
   * 
   * @returns {Promise<boolean>} - True if GitHub CLI is available
   */
  async isGitHubCLIAvailable() {
    try {
      await execPromise('gh --version');
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Create a Pull Request using GitHub CLI
   * 
   * @param {Object} options - PR options
   * @param {string} options.repoDir - Local repository directory
   * @param {string} options.head - Head branch (the branch with changes)
   * @param {string} options.base - Base branch (target branch for PR)
   * @param {string} options.title - PR title
   * @param {string} options.body - PR description
   * @returns {Promise<Object>} - PR information including URL
   */
  async createPRWithCLI(options) {
    const { repoDir, head, base, title, body } = options;
    
    this.logger(`Creating PR from ${head} to ${base} using GitHub CLI`);
    
    // First check if GitHub CLI is available
    const isGHAvailable = await this.isGitHubCLIAvailable();
    if (!isGHAvailable) {
      this.logger('GitHub CLI (gh) is not available in the current PATH.');
      this.logger('You have the following options:');
      this.logger('1. Install GitHub CLI: winget install --id GitHub.cli');
      this.logger('2. Restart your computer after installation to update PATH');
      this.logger('3. After restarting, run "gh auth login" to authenticate');
      this.logger('For now, you can create a PR manually on GitHub.');
      
      return {
        success: false,
        error: 'GitHub CLI not available in PATH. See instructions above.'
      };
    }
    
    try {
      // Create the PR
      const command = `gh pr create --base ${base} --head ${head} --title "${title}" --body "${body}"`;
      const { stdout, stderr } = await execPromise(command, { cwd: repoDir });
      
      // Extract PR URL from stdout
      const prUrl = stdout.trim();
      this.logger(`Successfully created PR: ${prUrl}`);
      
      return {
        success: true,
        url: prUrl,
        output: stdout
      };
    } catch (error) {
      this.logger(`Failed to create PR with GitHub CLI: ${error.message}`);
      
      // Check if this is an auth error
      if (error.message.includes('auth') || error.message.includes('login')) {
        this.logger('GitHub CLI is installed but not authenticated.');
        this.logger('Please run "gh auth login" in a terminal and follow the prompts.');
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Create a Pull Request using GitHub API
   * Requires a personal access token with 'repo' scope
   * 
   * @param {Object} options - PR options
   * @param {string} options.token - GitHub personal access token
   * @param {string} options.owner - Repository owner (username or organization)
   * @param {string} options.repo - Repository name
   * @param {string} options.head - Head branch (the branch with changes)
   * @param {string} options.base - Base branch (target branch for PR)
   * @param {string} options.title - PR title
   * @param {string} options.body - PR description
   * @returns {Promise<Object>} - PR information including URL
   */
  createPRWithAPI(options) {
    const { token, owner, repo, head, base, title, body } = options;
    
    this.logger(`Creating PR from ${head} to ${base} using GitHub API`);
    
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        title,
        body,
        head,
        base
      });
      
      const requestOptions = {
        hostname: 'api.github.com',
        path: `/repos/${owner}/${repo}/pulls`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Dev-Productivity-Git-Tool',
          'Authorization': `token ${token}`,
          'Content-Length': data.length
        }
      };
      
      const req = https.request(requestOptions, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(responseData);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              this.logger(`Successfully created PR: ${parsedData.html_url}`);
              resolve({
                success: true,
                url: parsedData.html_url,
                data: parsedData
              });
            } else {
              this.logger(`Failed to create PR: ${parsedData.message}`);
              resolve({
                success: false,
                error: parsedData.message,
                statusCode: res.statusCode,
                data: parsedData
              });
            }
          } catch (error) {
            this.logger(`Error parsing API response: ${error.message}`);
            reject(error);
          }
        });
      });
      
      req.on('error', (error) => {
        this.logger(`Error creating PR with API: ${error.message}`);
        reject(error);
      });
      
      req.write(data);
      req.end();
    });
  }
  
  /**
   * Get repository details from a local Git repository
   * Extracts owner and repo name from the remote URL
   * 
   * @param {string} repoDir - Local repository directory
   * @returns {Promise<Object>} - Repository details (owner, repo)
   */
  async getRepoDetails(repoDir) {
    try {
      const { stdout } = await execPromise('git remote get-url origin', { cwd: repoDir });
      const remoteUrl = stdout.trim();
      
      // Parse various GitHub URL formats
      let match;
      
      // HTTPS: https://github.com/owner/repo.git
      if (remoteUrl.includes('github.com')) {
        match = remoteUrl.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)(?:\.git)?$/);
      }
      
      if (match && match.length >= 3) {
        return {
          owner: match[1],
          repo: match[2]
        };
      }
      
      return null;
    } catch (error) {
      this.logger(`Failed to get repository details: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Try to create a PR using GitHub CLI first, then fall back to API if needed
   * 
   * @param {Object} options - Combined options for both methods
   * @returns {Promise<Object>} - PR information
   */
  async createPR(options) {
    // Try GitHub CLI first
    const cliResult = await this.createPRWithCLI({
      repoDir: options.repoDir,
      head: options.head,
      base: options.base,
      title: options.title,
      body: options.body
    });
    
    if (cliResult.success) {
      return cliResult;
    }
    
    // If CLI failed but we're not set up for API, just return the CLI error with helpful instructions
    if (!options.token) {
      this.logger('\nAlternative: Use GitHub web interface to create PR manually');
      this.logger(`1. Visit GitHub repository in your browser`);
      this.logger(`2. Click "Pull requests" tab`);
      this.logger(`3. Click "New pull request" button`);
      this.logger(`4. Select base branch: ${options.base}`);
      this.logger(`5. Select compare branch: ${options.head}`);
      this.logger(`6. Fill in the title and description and create the PR`);
      
      return {
        success: false,
        manualInstructions: true,
        error: cliResult.error
      };
    }
    
    this.logger('Falling back to GitHub API for PR creation');
    
    // If CLI fails and we have API options, try API
    // First check if we need to extract owner/repo info
    if (!options.owner || !options.repo) {
      const repoDetails = await this.getRepoDetails(options.repoDir);
      if (repoDetails) {
        options.owner = repoDetails.owner;
        options.repo = repoDetails.repo;
      } else {
        this.logger('Cannot determine repository owner/name for API fallback.');
        return cliResult;
      }
    }
    
    // Now try the API
    return await this.createPRWithAPI({
      token: options.token,
      owner: options.owner,
      repo: options.repo,
      head: options.head,
      base: options.base,
      title: options.title,
      body: options.body
    });
  }
}

module.exports = PRCreator;
