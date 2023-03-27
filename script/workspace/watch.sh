#!/bin/bash -e

# allow killing all processes with ctrl-c
trap 'kill 0' SIGINT

for DIR in "languageservices/expressions" "languageservices/workflow-parser" "languageservices/languageservice" "languageservices/languageserver" "vscode-github-actions"
do
  pushd $DIR
  npm run watch &
  popd
done

wait
