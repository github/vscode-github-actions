#!/bin/bash -e

# allow killing all processes with ctrl-c
trap 'kill 0' SIGINT

for DIR in "actions-languageservices/expressions" "actions-languageservices/workflow-parser" "actions-languageservices/languageservice" "actions-languageservices/languageserver" "vscode-github-actions"
do
  pushd $DIR
  npm run watch &
  popd
done

wait
