# Developer Productivity Git Tool

A cross-platform desktop application to automate Git workflows with template-based file generation and PR preparation.

## Features

- JSON editor with syntax highlighting and validation
- Process template files, replacing placeholders with values from your JSON
- Automatic Git operations (checkout, branch creation, commits)
- Prepares Pull Request URLs that open directly in your browser
- Cross-platform support (Windows, macOS, Linux)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Git](https://git-scm.com/)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd dev-productivity-git-tool
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the application:
   ```
   npm start
   ```

## How to Use

1. **Enter JSON Configuration**:
   - Use the JSON editor to define values that will replace placeholders in your templates
   - The editor will validate your JSON and show any errors

2. **Select Directories**:
   - **Git Project Directory**: The local Git repository where changes will be made
   - **Template Directory**: The folder containing template files with placeholders
   - **Output Directory**: Where processed template files will be saved

3. **Configure Git Settings**:
   - **Current Branch**: The branch to check out and pull from
   - **New Branch Name**: Name for the new branch to be created
   - **Commit Message**: Message for the commit
   - **PR Target Branch**: Branch to target for the Pull Request (defaults to 'development')

4. **Generate & Prepare PR**:
   - Click the button to start the process
   - Monitor progress in the terminal output panel
   - When complete, a PR URL will be generated with an "Open Pull Request" button
   - Click the button when you're ready to open the PR in your browser

## Pull Request Workflow

The application follows a workflow similar to GitHub Desktop:

1. Changes are prepared locally (checkout, branch creation, file processing, commit, push)
2. A Pull Request URL is generated that points to GitHub's PR creation page
3. When you're ready, click the "Open Pull Request" button to open your browser
4. Review your changes on GitHub and complete the PR creation process

This approach gives you control over when to create the PR and allows you to make any final adjustments on GitHub.

## Template Format

Templates can include placeholders in the format `{{ key }}` which will be replaced with the corresponding value from your JSON configuration.

For example, if your template contains:
```
Hello {{ name }}!
```

And your JSON is:
```json
{
  "name": "World"
}
```

The output will be:
```
Hello World!
```

### File Naming

Files with names starting with `file_` can have placeholders in their names that will be processed. For example:

- Template file: `file_report_{{ month }}.md`
- JSON: `{ "month": "January" }`
- Output file: `file_report_January.md`

## Troubleshooting

- **Git Errors**: Check that your Git directory is correctly configured and that you have the necessary permissions.
- **PR URL Generation Failed**: Ensure your repository has a valid remote URL pointing to GitHub.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
