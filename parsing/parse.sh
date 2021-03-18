#!/usr/bin/env bash

# Example usage: ./parse.sh -t 1 path/to/your/sources
# -t 1 controls the number of prefixes for the fully qualified name from the root.

# Requires the appropriate version of java and also maven
DIR="$(cd $(dirname $0); pwd)"
WORK_DIR="$(pwd)"

die() {
  echo "$1"
  exit 1
}
USAGE="Usage: parse.sh [-t #] <path/to/sources/root> <data destination> <jar path>"
[ "$#" -gt 0 ] || die "$USAGE"

THRESHOLD_ARG=""
while getopts ":t:" flag; do
  case "$flag" in
    t) THRESHOLD_ARG="$OPTARG";;
    \?) die "$USAGE";;
  esac
done
[ $(($# - $OPTIND)) -ge 0 ] || die "$USAGE"

SRC_DIR="${@:$OPTIND:1}"
DATA_DEST="${@:$OPTIND+1:1}"
JAR_PATH="${@:$OPTIND+2:1}"

if ! [ -e "$JAR_PATH" ]; then
  die "Could not find the jar path $JAR_PATH"
  #  cd "$DIR" || die "Could not find directory $DIR"
  #  mvn clean compile assembly:single || die "Maven failed!"
  #  cd "$WORK_DIR" || die "Could not find directory $WORK_DIR"
fi

if [ -z "$THRESHOLD_ARG" ]; then
  java -cp "$JAR_PATH" org.codemap.parser.ResolveMethodReferences "$SRC_DIR" "$DATA_DEST"
else
  java -cp "$JAR_PATH" org.codemap.parser.ResolveMethodReferences -t=${THRESHOLD_ARG} "$SRC_DIR" "$DATA_DEST"
fi
