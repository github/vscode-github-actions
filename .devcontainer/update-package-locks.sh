#!/bin/bash
set -e

for DIR in "actions-expressions/typescript" "actions-workflow-parser/typescript" "actions-languageservices/actions-languageservice" "actions-languageservices/actions-languageserver" "vscode-github-actions"
do
  pushd $DIR
  # Trigger an npm i without workspaces support to update the local package-lock.json
  npm i --workspaces=false
  popd
done
