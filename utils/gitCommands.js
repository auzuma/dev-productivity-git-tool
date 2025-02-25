const simpleGit = require('simple-git');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Class to handle Git operations
 */
class GitCommands {
  /**
   * Constructor
   * @param {string} gitDir - The Git repository directory
   * @param {Function} logger - Function to log messages 
   */
  constructor(gitDir, logger) {
    this.gitDir = gitDir;
    this.git = simpleGit(gitDir);
    this.logger = logger || console.log;
  }
  
  /**
   * Check if the directory is a Git repository
   * @returns {Promise<boolean>}
   */
  async isGitRepo() {
    try {
      await this.git.checkIsRepo();
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Checkout an existing branch
   * @param {string} branchName - Branch to checkout
   * @returns {Promise<void>}
   */
  async checkoutBranch(branchName) {
    this.logger(`Checking out branch: ${branchName}`);
    await this.git.checkout(branchName);
    this.logger(`Successfully checked out branch: ${branchName}`);
  }
  
  /**
   * Pull latest changes from remote
   * @param {string} branchName - Branch to pull from
   * @param {string} remote - Remote name (default: 'origin')
   * @returns {Promise<void>}
   */
  async pull(branchName, remote = 'origin') {
    this.logger(`Pulling latest changes from ${remote}/${branchName}`);
    await this.git.pull(remote, branchName);
    this.logger(`Successfully pulled latest changes`);
  }
  
  /**
   * Create a new branch
   * @param {string} newBranchName - New branch name
   * @param {string} fromBranch - Branch to create from (optional)
   * @returns {Promise<void>}
   */
  async createBranch(newBranchName, fromBranch) {
    if (fromBranch) {
      this.logger(`Creating new branch ${newBranchName} from ${fromBranch}`);
      await this.git.checkoutBranch(newBranchName, fromBranch);
    } else {
      this.logger(`Creating new branch ${newBranchName}`);
      await this.git.checkoutLocalBranch(newBranchName);
    }
    this.logger(`Successfully created branch: ${newBranchName}`);
  }
  
  /**
   * Stage files
   * @param {string|Array<string>} files - Files to stage (default: all)
   * @returns {Promise<void>}
   */
  async add(files = '.') {
    this.logger(`Staging changes: ${files}`);
    await this.git.add(files);
    this.logger('Successfully staged changes');
  }
  
  /**
   * Commit changes
   * @param {string} message - Commit message
   * @returns {Promise<void>}
   */
  async commit(message) {
    this.logger(`Committing with message: "${message}"`);
    await this.git.commit(message);
    this.logger('Successfully committed changes');
  }
  
  /**
   * Push changes to remote
   * @param {string} branchName - Branch to push
   * @param {string} remote - Remote name (default: 'origin')
   * @param {Array<string>} options - Additional push options
   * @returns {Promise<void>}
   */
  async push(branchName, remote = 'origin', options = []) {
    this.logger(`Pushing ${branchName} to ${remote}`);
    await this.git.push(remote, branchName, options);
    this.logger(`Successfully pushed ${branchName} to ${remote}`);
  }
  
  /**
   * Create a Pull Request using GitHub CLI
   * @param {Object} options - PR options
   * @param {string} options.head - Head branch (the branch with changes)
   * @param {string} options.base - Base branch (target branch for PR)
   * @param {string} options.title - PR title
   * @param {string} options.body - PR description
   * @returns {Promise<Object>} - PR information including URL
   */
  async createPR({ head, base, title, body }) {
    this.logger(`Creating PR from ${head} to ${base}`);
    
    try {
      // First check if GitHub CLI is available
      await execPromise('gh --version', { cwd: this.gitDir });
      
      // Create the PR
      const command = `gh pr create --base ${base} --head ${head} --title "${title}" --body "${body}"`;
      const { stdout, stderr } = await execPromise(command, { cwd: this.gitDir });
      
      // Extract PR URL from stdout (GitHub CLI usually outputs the PR URL)
      const prUrl = stdout.trim();
      this.logger(`Successfully created PR: ${prUrl}`);
      
      return {
        success: true,
        url: prUrl,
        output: stdout
      };
    } catch (error) {
      this.logger(`Failed to create PR: ${error.message}`);
      this.logger('Make sure GitHub CLI is installed and authenticated.');
      this.logger('You can install it from: https://cli.github.com/');
      this.logger('And authenticate with: gh auth login');
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get the remote URL for the repo
   * @param {string} remote - Remote name (default: 'origin')
   * @returns {Promise<string>} - The remote URL
   */
  async getRemoteUrl(remote = 'origin') {
    try {
      const remotes = await this.git.getRemotes(true);
      const originRemote = remotes.find(r => r.name === remote);
      if (originRemote && originRemote.refs && originRemote.refs.push) {
        return originRemote.refs.push;
      }
      return null;
    } catch (error) {
      this.logger(`Error getting remote URL: ${error.message}`);
      return null;
    }
  }
}

module.exports = GitCommands;
