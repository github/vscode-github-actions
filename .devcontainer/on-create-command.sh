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

/workspaces/vscode-github-actions/script/bootstrap

# Setup npm auth
echo "//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}" > ~/.npmrc

# Setup npm workspace
pushd /workspaces
npm i
# Build all packages locally
npm run build -ws
