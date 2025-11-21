# Github Actions for VSCode - patrickkidd fork

This is a simple fork project to add a combined workflow feature to this extension.

## Problem Description

I have a few repos that work together, common in micro services or backend / frontend / etc decoupling. I push often with continuous delivery. Right now you can only fit a single repo's workflows on screen in the workflows section at a time. There is no tool that simply shows all of your workflow builds in a master dashboard.

## Describe the solution you'd like

I would love to see a combined Workflows view that shows all builds for all repos in a single list, in the order that they were triggered.
Optionally, some repo workflows trigger other workflows in another repo, and it would be great to have a visual representation of that, like an arrow from the triggering to the triggered or something.

## Additional context

Note how I have four related repos but expanding one takes up the entire screen, e.g. you can't even see the third and fourth repo. Further there is no chronological workflow ordering across repos.

## Your attitude and communication style

I am an experienced software architect of 25+ years with experience across many languages, domains, and tools. I am able to read and understand any programming language, having seen so many that they all look the same now. But I have no experience with node apps, let alone vscode plugins. I need a little hand-holding on how the architecture works, how to test the plugin, and and otherwise just want to vibe-code features into it.

## Development Setup & Testing

### First Time Setup

1. Install dependencies:
```bash
npm i
```

### Testing Your Changes

1. Open VSCode in this directory
2. Go to the Debug tab (Run and Debug icon on left sidebar)
3. Select "Watch all & Launch Extension (workspace)" from the dropdown
4. Hit the play button (F5)
   - This starts `npm watch` automatically to rebuild on file changes
   - Opens a new VSCode window called "Extension Development Host"
5. Make your code changes
6. To see changes, click the refresh button in the debug toolbar (or restart the debugger)
   - Wait for `npm watch` to finish rebuilding before testing
7. The new "Combined Workflows" view should appear in the GitHub Actions sidebar

### Manual Build Commands

Build once:
```bash
npm run build
```

Watch for changes:
```bash
npm run watch
```

Run tests:
```bash
npm test
```

Lint:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

### Installing from Development Code

To install this development version as a real extension:

1. Package the extension:
```bash
npm run package
```

2. This creates a `.vsix` file in the root directory

3. Install it in VSCode:
   - Open VSCode
   - Go to Extensions (Cmd+Shift+X)
   - Click the "..." menu at the top
   - Select "Install from VSIX..."
   - Choose the generated `.vsix` file

### Installing from GitHub (Your Fork)

To install from your GitHub fork instead of the official releases:

1. Push your changes to your fork on GitHub
2. Create a release on your fork:
   - Go to your fork on GitHub
   - Click "Releases" → "Create a new release"
   - Tag it (e.g., `v0.28.2-combined-workflows`)
   - Attach the `.vsix` file (build it first with `npm run package`)
3. Install from your release:
   - Download the `.vsix` from your release
   - Install via "Install from VSIX..." as described above

### Uninstalling

To switch back to the official version or test a fresh install:
- Go to Extensions
- Find "GitHub Actions"
- Click Uninstall
- Then reinstall from Marketplace or your `.vsix` file