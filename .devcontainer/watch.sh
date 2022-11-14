#!/bin/bash -e

# allow killing all processes with ctrl-c
trap 'kill 0' SIGINT

for DIR in "actions-expressions/typescript" "actions-workflow-parser/typescript" "actions-languageservices/actions-languageservice" "actions-languageservices/actions-languageserver" "vscode-github-actions"
do
  pushd $DIR
  npm run watch &
  popd
done

wait
