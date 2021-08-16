set -eu

DEFAULT_ENV=""
POS_ENV="${1:-$DEFAULT_ENV}"

pos-cli data clean $POS_ENV --auto-confirm --include-schema
pos-cli deploy $POS_ENV
pos-cli data import $POS_ENV --path=./seed/data.zip --zip
pos-cli uploads push $POS_ENV --path=seed/images.zip
