#!/usr/bin/env bash

# Requires the appropriate version of java and also maven

die() {
  echo "$1"
  exit 1
}

[ "$#" -gt 0 ] || die "Usage: parse.sh path/to/sources/root"

DIR="$(cd $(dirname $0); pwd)"
JAR_PATH="$DIR"/codemap-java-parser/target/codemap-java-parser-1.0-SNAPSHOT-jar-with-dependencies.jar

if ! [ -e "$JAR_PATH" ]; then
  cd "$DIR/codemap-java-parser" || die "Could not find directory $DIR/codemap-java-parser"
  mvn clean compile assembly:single || die "Maven failed!"
fi

java -cp "$JAR_PATH" org.codemap.parser.ResolveMethodReferences "$1"
