#!/usr/bin/env bash

# Example usage: ./parse.sh -t 1 path/to/your/sources
# -t 1 controls the number of prefixes for the fully qualified name from the root.

# Requires the appropriate version of java and also maven
DIR="$(cd $(dirname $0); pwd)"

die() {
  echo "$1"
  exit 1
}
USAGE="Usage: parse.sh [-t #] <path/to/sources/root> [<data destination>]"
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

if [ -z "$DATA_DEST" ]; then
  DATA_DEST="vis/data/data.json"
fi

JAR_PATH="$DIR"/target/codemap-java-parser-1.0-SNAPSHOT-jar-with-dependencies.jar

if ! [ -e "$JAR_PATH" ]; then
  cd "$DIR" || die "Could not find directory $DIR"
  mvn clean compile assembly:single || die "Maven failed!"
fi

if [ -z "$THRESHOLD_ARG" ]; then
  java -cp "$JAR_PATH" org.codemap.parser.ResolveMethodReferences "$SRC_DIR" "$DATA_DEST"
else
  java -cp "$JAR_PATH" org.codemap.parser.ResolveMethodReferences -t=${THRESHOLD_ARG} "$SRC_DIR" "$DATA_DEST"
fi
