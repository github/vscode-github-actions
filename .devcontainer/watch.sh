#!/bin/bash -e

# allow killing all processes with ctrl-c
trap 'kill 0' SIGINT

for DIR in "actions-languageservices/actions-expressions" "actions-languageservices/actions-workflow-parser" "actions-languageservices/actions-languageservice" "actions-languageservices/actions-languageserver" "vscode-github-actions"
do
  pushd $DIR
  npm run watch &
  popd
done

wait
