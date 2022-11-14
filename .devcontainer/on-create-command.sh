#!/bin/bash
set -e

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
