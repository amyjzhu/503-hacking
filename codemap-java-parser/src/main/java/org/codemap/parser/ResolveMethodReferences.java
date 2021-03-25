package org.codemap.parser;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import java.nio.file.Path;
import java.nio.file.Files;
import java.nio.file.Paths;

import java.lang.SecurityException;
import java.io.IOException;

import com.github.javaparser.Position;
import com.github.javaparser.ast.Modifier;
import com.github.javaparser.ast.NodeList;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.expr.SimpleName;
import com.github.javaparser.ast.type.TypeParameter;
import com.github.javaparser.resolution.UnsolvedSymbolException;
import com.github.javaparser.resolution.declarations.ResolvedMethodDeclaration;
import com.github.javaparser.symbolsolver.JavaSymbolSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.CombinedTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.JavaParserTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.ReflectionTypeSolver;
import com.github.javaparser.symbolsolver.model.resolution.TypeSolver;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.body.MethodDeclaration;

import org.apache.commons.cli.*;
import org.codemap.parser.utils.ClassInfo;
import org.codemap.parser.utils.MethodDeclarationInfo;
import org.json.JSONArray;
import org.json.JSONObject;

public class ResolveMethodReferences {
    private static int minPackageMatchThreshold = 2;

    private static ArrayList<String> getJavaFiles(String sourceDir) {
        ArrayList<String> fileNames = new ArrayList<>();
        try (Stream<Path> paths = Files.walk(Paths.get(sourceDir))) {
            paths.filter(Files::isRegularFile)
                 .forEach(path -> {
                     try {
                         String fullPath = path.toRealPath().toString();
                         if (fullPath.endsWith(".java")) {
                             fileNames.add(fullPath);
                         }
                     } catch (IOException e) {
                         e.printStackTrace();
                     }
                 });
        } catch (SecurityException | IOException e) {
            System.out.println(e.getMessage());
        }
        return fileNames;
    }


    private static ClassInfo getClassInfo(String fileName, ClassOrInterfaceDeclaration classOrInterface) {
        ClassInfo ci = new ClassInfo();
        String qualifiedName = classOrInterface.resolve().getQualifiedName();
        SimpleName name = classOrInterface.getName();
        Optional<Position> pos = name.getBegin();
        pos.ifPresent(position -> ci.setLineNumber(position.line));
        ci.setClassName(qualifiedName);
        ci.setFileName(fileName);
        return ci;
    }

    private static MethodDeclarationInfo getMethodDeclarationInfo(MethodDeclaration method) {
        MethodDeclarationInfo mdi = new MethodDeclarationInfo();
        mdi.setDeclaration(method.getDeclarationAsString());
        try {
            ResolvedMethodDeclaration rmd = method.resolve();
            mdi.setSignature(rmd.getQualifiedSignature());
            mdi.setReturn(rmd.getReturnType().describe());

            mdi.setStatic(rmd.isStatic());
            mdi.setAbstract(rmd.isAbstract());
            if (rmd.isAbstract()) {
                mdi.setVisibility("public");
            }
        } catch (UnsolvedSymbolException e) {
            System.out.println("Could not solve symbol " + e.getName());
            System.out.println(e.getMessage());
            e.printStackTrace();
        }
        SimpleName name = method.getName();

        mdi.setName(name.asString());
        Optional<Position> lineNumber = name.getBegin();
        lineNumber.ifPresent(position -> mdi.setLineNumber(position.line));

        NodeList<Modifier> modifiers = method.getModifiers();
        for (Modifier mod : modifiers) {
            switch (mod.getKeyword()) {
                case PUBLIC:
                    mdi.setVisibility("public");
                    break;
                case PROTECTED:
                    mdi.setVisibility("protected");
                    break;
                case PRIVATE:
                    mdi.setVisibility("private");
                    break;
                case ABSTRACT:
                    mdi.setAbstract(true);
                    break;
                case DEFAULT:
                    mdi.setDefault(true);
                    break;
                case FINAL:
                    mdi.setFinal(true);
                    break;
                case NATIVE:
                    mdi.setNative(true);
                    break;
                case STATIC:
                    mdi.setStatic(true);
                    break;
                case STRICTFP:
                    mdi.setStrictfp(true);
                    break;
                case SYNCHRONIZED:
                    mdi.setSynchronized(true);
                    break;
                default:
                    break;
            }
        }
        NodeList<Parameter> params = method.getParameters();
        for (Parameter p : params) {
            try {
                mdi.addParameter(p.resolve().describeType());
            } catch (UnsolvedSymbolException e) {
                mdi.addParameter(e.getName());
                System.out.println("Unsolved symbol exception for parameter of type " + e.getName());
            }

        }
        NodeList<TypeParameter> typeParams = method.getTypeParameters();
        for (TypeParameter tp : typeParams) {
            mdi.addTypeParameter(tp.asString());
        }
        return mdi;
    }

    public static boolean sharePackagePrefix(String className, String methodName) {
        String[] splitClassName = className.split("\\.");
        String[] splitMethodName = methodName.split("\\.");
        int minLength = Math.min(splitClassName.length, splitMethodName.length);
        if (minLength > 0) {
            for (int i = 0; i < minLength; i++) {
                if (!splitClassName[i].equals(splitMethodName[i])) {
                    return false;
                }
                if (i == minPackageMatchThreshold - 1) {
                    // If we get here, we obviously haven't found any non-matches thus far
                    return true;
                }
            }
        }
        return false;
    }

    public static JSONObject getMethodCallInfo(MethodCallExpr mce, String className) {
        JSONObject methodCallInfo = new JSONObject();
        ResolvedMethodDeclaration rmd = mce.resolve();
        String signature = rmd.getQualifiedSignature();
        if (sharePackagePrefix(className, signature)) {
            methodCallInfo.put("signature", signature);
        } else {
            methodCallInfo.put("signature", "");
        }
        return methodCallInfo;
    }

    private static Options getOptions() {
        Options options = new Options();
        options.addOption("t", "threshold", true, "The minimum threshold for the number of package prefixes to match for it to be considered in the same package. For example, with a match threshold of 2, \"org.codemap.parser.ResolveMethodReferences\" would be considered to be in the same package as any other entity that begins with \"org.codemap\".");
        options.addOption("h", "help", false, "Print usage and exit.");
        return options;
    }

    private static void printHelp(Options options) {
        HelpFormatter formatter = new HelpFormatter();
        formatter.printHelp("java org.codemap.parser.ResolveMethodReferences [options] <project_source_dir> [<json_output_filename>]", options);
    }


    private static void writeData(String dataFile,
                                  JSONArray classList,
                                  JSONArray classNamesList,
                                  AtomicReference<Integer> numErrors,
                                  AtomicReference<Integer> numMethodCalls) {
        System.out.println("Number of errors: " + numErrors.toString());
        System.out.println("Number of method calls: " + numMethodCalls.toString());
        JSONObject allData = new JSONObject();
        allData.put("classNames", classNamesList);
        allData.put("classData", classList);
        try (FileWriter file = new FileWriter(dataFile)) {
            file.write(allData.toString(2));
            file.flush();
        } catch (IOException e) {
            System.out.println(e.getMessage());
            e.printStackTrace();
        }
    }

    private static void parse(String sourceDir, String dataFile) {
        setupParser(sourceDir);

        ArrayList<String> fileNames = getJavaFiles(sourceDir);
        JSONArray classList = new JSONArray();
        JSONArray classNamesList = new JSONArray();
        AtomicReference<Integer> numErrors = new AtomicReference<>(0);
        AtomicReference<Integer> numMethodCalls = new AtomicReference<>(0);
        for (String fileName : fileNames) {
            System.out.println(fileName);
            CompilationUnit cu;
            try {
                cu = StaticJavaParser.parse(new File(fileName));
            } catch (FileNotFoundException e) {
                System.out.println("ERROR: Could not find file " + fileName);
                e.printStackTrace();
                continue;
            }
            cu.findAll(ClassOrInterfaceDeclaration.class).forEach(clazzOrInterface -> {
                ClassInfo classInfo = getClassInfo(fileName, clazzOrInterface);
                clazzOrInterface
                        .findAll(MethodDeclaration.class)
                        .forEach(md -> {
                            MethodDeclarationInfo methodInfo = getMethodDeclarationInfo(md);
                            md.findAll(MethodCallExpr.class)
                              .forEach(mce -> {
                                  try {
                                      methodInfo.addCall(getMethodCallInfo(mce, classInfo.getClassName()));
                                      //                                      System.out.println(clazzOrInterface.resolve().getQualifiedName() + "@" + md.getDeclarationAsString() + ": " + mce.resolve().getQualifiedSignature());
                                  } catch (com.github.javaparser.resolution.UnsolvedSymbolException e) {
                                      System.out.println("Error occurred in file " + fileName + " in method (" + methodInfo.getSignature() + ", " + methodInfo.getDeclaration() + ")");
                                      e.printStackTrace();
                                      numErrors.set(numErrors.get() + 1);
                                  } catch (java.lang.RuntimeException e) {
                                      System.out.println("Error occurred in file " + fileName + " in method (" + methodInfo.getSignature() + ", " + methodInfo.getDeclaration() + ")");
                                      System.out.println(e.getMessage());
                                      e.printStackTrace();
                                      numErrors.set(numErrors.get() + 1);
                                  }
                              });
                                numMethodCalls.set(numMethodCalls.get() + methodInfo.getNumCalls());
                            classInfo.addMethod(methodInfo.getJSON());
                        });
                classNamesList.put(classInfo.getClassName());
                classList.put(classInfo.getJSON());
            });
        }
        writeData(dataFile, classList, classNamesList, numErrors, numMethodCalls);
    }

    private static void setupParser(String sourceDir) {
        // Apparently for org.xml.sax (which is a part of the JDK), the reflection
        // type solver doesn't recognize it as being a part of the JDK, so you have
        // to say that you want jreOnly=false
        TypeSolver reflectionTypeSolver = new ReflectionTypeSolver(false);
        TypeSolver javaParserTypeSolver = new JavaParserTypeSolver(new File(sourceDir));


        CombinedTypeSolver combinedSolver = new CombinedTypeSolver();
        combinedSolver.add(reflectionTypeSolver);
        combinedSolver.add(javaParserTypeSolver);

        JavaSymbolSolver symbolSolver = new JavaSymbolSolver(combinedSolver);

        StaticJavaParser.getConfiguration()
                        .setSymbolResolver(symbolSolver)
                        .setLanguageLevel(com.github.javaparser.ParserConfiguration.LanguageLevel.JAVA_11);
    }


    private static void mustHaveOneOrTwoArguments(Options options, String[] leftoverArgs) {
        if (leftoverArgs.length != 1 && leftoverArgs.length != 2) {
            System.out.println("ERROR: expected either one or two arguments.");
            printHelp(options);
            System.exit(1);
        }
    }
    public static void main(String[] args) {
        Options options = getOptions();
        CommandLineParser parser = new DefaultParser();
        String sourceDir;
        String dataFile = "data.json";
        try {
            CommandLine line = parser.parse(options, args);
            String[] leftoverArgs = line.getArgs();
            if (line.hasOption("h")) {
                printHelp(options);
                System.exit(0);
            }
            mustHaveOneOrTwoArguments(options, leftoverArgs);

            if (line.hasOption("t")) {
                minPackageMatchThreshold = Integer.parseInt(line.getOptionValue("t"));
            }
            sourceDir = leftoverArgs[0];
            if (leftoverArgs.length == 2) {
                dataFile = leftoverArgs[1];
            }
            // Ensure that ~ is properly expanded in paths
            sourceDir = sourceDir.replaceFirst("^~", System.getProperty("user.home"));
            parse(sourceDir, dataFile);
        } catch (ParseException e) {
            System.out.println("Error parsing command line args.");
            System.out.println(e.getMessage());
            e.printStackTrace();
            printHelp(options);
            System.exit(1);
        }
    }
}
