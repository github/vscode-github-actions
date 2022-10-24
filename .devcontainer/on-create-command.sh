#!/bin/bash
set -e

function clone_repo() {
  GREEN='\033[0;32m'

  REPOSITORY_URL=$1
  REPOSITORY_PATH=$2
  if [[ ! -d "$REPOSITORY_PATH/.git" ]]; then
    echo -e "\n${GREEN}➡️ Cloning $REPOSITORY_URL...\n${NC}"
    git clone "$REPOSITORY_URL" "$REPOSITORY_PATH"
  fi
}

# Cache git credentials
git config --global credential.helper cache
git credential-cache exit

# Clone dependent repos
clone_repo https://github.com/github/actions-expressions /workspaces/actions-expressions
clone_repo https://github.com/github/actions-workflow-parser /workspaces/actions-workflow-parser
clone_repo https://github.com/github/actions-languageservice /workspaces/actions-languageservice
clone_repo https://github.com/github/actions-languageserver /workspaces/actions-languageserver

# Copy workspace files
cp /workspaces/vscode-github-actions/.devcontainer/package.json /workspaces/
cp /workspaces/vscode-github-actions/.devcontainer/vscode-github-actions.code-workspace /workspaces/
cp /workspaces/vscode-github-actions/.devcontainer/.npmrc /workspaces/
cp /workspaces/vscode-github-actions/.devcontainer/update-package-locks.sh /workspaces/

# Setup npm auth
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > ~/.npmrc

# Setup npm workspace
pushd /workspaces
npm i
# Build all packages locally
npm run build -ws