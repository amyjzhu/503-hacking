#!/usr/bin/env bash

# Example usage: ./parse.sh -t 1 path/to/your/sources
# -t 1 controls the number of prefixes for the fully qualified name from the root.

# Requires the appropriate version of java and also maven

die() {
  echo "$1"
  exit 1
}

[ "$#" -gt 0 ] || die "Usage: parse.sh path/to/sources/root"

DIR="$(cd $(dirname $0); pwd)"
JAR_PATH="$DIR"/parse-java.jar

java -cp "$JAR_PATH" org.codemap.parser.ResolveMethodReferences "$1"
