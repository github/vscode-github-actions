#!/bin/bash
set -e

for DIR in "languageservices" "vscode-github-actions"
do
  pushd $DIR
  # Trigger an npm i without workspaces support to update the local package-lock.json
  npm i --workspaces=false
  rm -fr ./node_modules
  popd
done

npm i
