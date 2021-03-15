#!/usr/bin/env bash
# Example usage: ./parse.sh path/to/your/sources
# Requires the appropriate version of java

die() {
  echo "$1"
  exit 1
}

[ "$#" -gt 0 ] || die "Usage: parse.sh path/to/sources/root"

DIR="$(cd $(dirname $0); pwd)"
JAR_PATH="$DIR"/parse-java.jar

java -cp "$JAR_PATH" org.codemap.parser.ResolveMethodReferences "$1"
