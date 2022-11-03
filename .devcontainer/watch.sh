#!/bin/bash -e

# allow killing all processes with ctrl-c
trap 'kill 0' SIGINT

for DIR in "actions-expressions/typescript" "actions-workflow-parser/typescript" "actions-languageservice" "actions-languageserver"
do
  pushd $DIR
  npm run watch &
  popd
done

wait
