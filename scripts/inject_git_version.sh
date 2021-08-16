#!/usr/bin/env sh
set -euo pipefail

parse_git_hash() {
  if [ "$GITHUB_EVENT_NAME" == "pull_request" ]; then
    cat $GITHUB_EVENT_PATH | jq -r .pull_request.head.sha
  else
    echo $GITHUB_SHA
  fi
}

repository_name() {
  # basename -s .git $(git config --get remote.origin.url)
  # busybox version
  basename $(git config --get remote.origin.url) .git
}

source_meta_tag="<meta name=\"app:version\" content=\".*\">"
target_meta_tag="<meta name=\"app:version\" content=\"$(repository_name)@$(parse_git_hash)\">"

sed "s/${source_meta_tag}/${target_meta_tag}/" -i app/views/partials/theme/simple/layout/head.liquid
