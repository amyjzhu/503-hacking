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
Requires Maven, `org.json` (for JSON file creation), and `JavaParser` (for Java parsing). Additionally, `commons-cli` is used to parse command line options and produce the usage output.

# Usage
The file `src/main/java/org/codemap/parser/ResolveMethodReferences.java` contains the main method and takes the following arguments:

1. `sources_dir`: the path to the root of all the source files for the Java project, e.g. `src/main/java`. This should _not_ include the beginning of the package name, e.g., do not include the `org` directory for a package called `org.myorg.package`.
2. `data_file`: (optional) the destination for the output JSON file.

There are also some optional flags, which are summed up here:

```
usage: java org.codemap.parser.ResolveMethodReferences [options]
            <sources_dir> [<data_file>]
 -h,--help              Print usage and exit.
 -t,--threshold <arg>   The minimum threshold for the number of package
                        prefixes to match for it to be considered in the
                        same package. For example, with a match threshold
                        of 2, "org.codemap.parser.ResolveMethodReferences"
                        would be considered to be in the same package as
                        any other entity that begins with "org.codemap".
```

## Executing the main method

### Using the standalone jar

If the root of the sources is at `/my/path/to/sources/`, then you can produce the jar file and simply run

```
java -cp target/codemap-java-parser-1.0-SNAPSHOT-jar-with-dependencies.jar org.codemap.parser.ResolveMethodReferences /my/path/to/sources
```

If you want to run the parser on the toy example, you should run it with the option `-t 1`:

```
java -cp target/codemap-java-parser-1.0-SNAPSHOT-jar-with-dependencies.jar org.codemap.parser.ResolveMethodReferences -t 1 /path/to/toy/example
```

### Using Maven
If you don't want to produce the whole jar file, you can run

```
mvn exec:java -Dexec.mainClass="org.codemap.parser.ResolveMethodReferences" -Dexec.args="sources_dir [data_file]"
```

instead. This has the added benefit of not having to figure out the classpath, since Maven will do it for you. The `-t 1` option also applies here for toy data, and you would add this to the `exec.args` property set in the above.

