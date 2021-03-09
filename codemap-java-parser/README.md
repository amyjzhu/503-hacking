codemap-java-parser
===================
A Java parser that produces relationships between caller and callee methods for CodeMap, encoded in JSON.

# Building
The `codemap-java-parser` module uses Maven to manage dependencies and build the project. 
Compile using `mvn compile`, and to produce the jar file, use `mvn package`. The `.jar` file is located at `codemap-java-parser/target/codemap-java-parser-[VERSION]-SNAPSHOT.jar`.

## Building the standalone jar

The standalone jar includes all of the dependencies necessary to run, so this makes the
classpath very easy when running it. To build the standalone jar, run:

```
mvn clean compile assembly:single
```

This produces a jar file `codemap-java-parser/target/codemap-java-parser-1.0-SNAPSHOT-jar-with-dependencies.jar`.

## Dependencies
Requires Maven, `org.json` (for JSON file creation), and `JavaParser` (for Java parsing).

# Usage
The file `src/main/java/org/codemap/parser/ResolveMethodReferences.java` contains the main method and takes the following arguments:

1. `sources_dir`: the path to the root of all the source files for the Java project, e.g. `src/main/java`.
2. `data_file`: (optional) the destination for the output JSON file.

## Executing the main method

### Using the standalone jar

If the root of the sources is at `/my/path/to/sources/`, then you can produce the jar file and simply run

```
java -cp target/codemap-java-parser-1.0-SNAPSHOT-jar-with-dependencies.jar org.codemap.parser.ResolveMethodReferences /my/path/to/sources
```

### Using Maven
If you don't want to produce the whole jar file, you can run

```
mvn exec:java -Dexec.mainClass="org.codemap.parser.ResolveMethodReferences" -Dexec.args="sources_dir [data_file]"
```

instead. This has the added benefit of not having to figure out the classpath, since Maven will do it for you.
