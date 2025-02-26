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
   * Prepare PR information and construct the URL
   * 
   * @param {Object} options - PR options
   * @param {string} options.repoDir - Local repository directory
   * @param {string} options.head - Head branch (the branch with changes)
   * @param {string} options.base - Base branch (target branch for PR)
   * @param {string} options.title - PR title
   * @param {string} options.body - PR description
   * @returns {Promise<Object>} - PR information including URL
   */
  async preparePR(options) {
    const { repoDir, head, base, title, body } = options;
    
    this.logger(`Preparing PR from ${head} to ${base}`);
    
    try {
      // Get repository details
      const repoDetails = await this.getRepoDetails(repoDir);
      
      if (!repoDetails) {
        this.logger('Could not determine repository owner and name from remote URL.');
        return {
          success: false,
          error: 'Could not determine repository details'
        };
      }
      
      const { owner, repo } = repoDetails;
      
      // Construct the PR URL
      // This URL will take the user to the GitHub UI to create a PR with the specified branches
      const prUrl = `https://github.com/${owner}/${repo}/compare/${base}...${head}?expand=1`;
      
      this.logger(`PR URL prepared: ${prUrl}`);
      this.logger('Note: This URL will take you to GitHub where you can review and create the PR.');
      
      return {
        success: true,
        url: prUrl,
        owner,
        repo,
        head,
        base
      };
    } catch (error) {
      this.logger(`Failed to prepare PR: ${error.message}`);
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
   * Prepare PR information and construct the URL
   * 
   * @param {Object} options - PR options
   * @returns {Promise<Object>} - PR information
   */
  async createPR(options) {
    // We're now just preparing the PR URL, not creating it with gh
    return await this.preparePR({
      repoDir: options.repoDir,
      head: options.head,
      base: options.base,
      title: options.title,
      body: options.body
    });
  }
}

module.exports = PRCreator;
