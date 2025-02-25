# Developer Productivity Git Tool

A cross-platform desktop application to automate Git workflows with template-based file generation and PR creation.

## Features

- JSON editor with syntax highlighting and validation
- Process template files, replacing placeholders with values from your JSON
- Automatic Git operations (checkout, branch creation, commits, and PR creation)
- Cross-platform support (Windows, macOS, Linux)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Git](https://git-scm.com/)
- [GitHub CLI](https://cli.github.com/) (optional, for PR creation)

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

4. **Generate & Create PR**:
   - Click the button to start the process
   - Monitor progress in the terminal output panel

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

- **PR Creation Failed**: Make sure GitHub CLI is installed and authenticated. You can run `gh auth login` in your terminal to set it up.
- **Git Errors**: Check that your Git directory is correctly configured and that you have the necessary permissions.

## License

