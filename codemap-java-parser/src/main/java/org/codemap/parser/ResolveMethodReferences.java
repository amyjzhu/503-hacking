package org.codemap.parser;

import java.io.File;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;
import java.nio.file.Path;
import java.nio.file.Files;
import java.nio.file.Paths;

import java.lang.SecurityException;
import java.io.IOException;

import com.github.javaparser.ast.Modifier;
import com.github.javaparser.ast.NodeList;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.Parameter;
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
import org.json.JSONArray;
import org.json.JSONObject;

public class ResolveMethodReferences {
    private static int minPackageMatchThreshold = 2;
    public static ArrayList<String> getJavaFiles(String sourceDir) {
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


    public static JSONObject getClassInfo(String fileName, ClassOrInterfaceDeclaration classOrInterface) {
        JSONObject classInfo = new JSONObject();
        String qualifiedName = classOrInterface.resolve().getQualifiedName();
        classInfo.put("className", qualifiedName);
        classInfo.put("fileName", fileName);
        return classInfo;
    }

    public static void initializeMethodModifiers(JSONObject methodDeclInfo) {
        methodDeclInfo.put("abstract", false);
        methodDeclInfo.put("default", false);
        methodDeclInfo.put("final", false);
        methodDeclInfo.put("native", false);
        methodDeclInfo.put("static", false);
        methodDeclInfo.put("strictfp", false);
        methodDeclInfo.put("synchronized", false);
    }

    public static JSONObject getMethodDeclarationInfo(MethodDeclaration method) {
        JSONObject methodDeclInfo = new JSONObject();
        // In the future, I would like to do something more fancy but this will have
        // to do
        methodDeclInfo.put("declaration", method.getDeclarationAsString());
        initializeMethodModifiers(methodDeclInfo);
        try {
            ResolvedMethodDeclaration rmd = method.resolve();
            methodDeclInfo.put("signature", rmd.getQualifiedSignature());
            methodDeclInfo.put("return", rmd.getReturnType().describe());

            methodDeclInfo.put("static", rmd.isStatic());
            methodDeclInfo.put("abstract", rmd.isAbstract());
            if (rmd.isAbstract()) {
                methodDeclInfo.put("visibility", "public");
            }
        } catch (UnsolvedSymbolException e) {
            System.out.println("Could not solve symbol " + e.getName());
            System.out.println(e.getMessage());
            e.printStackTrace();
        }


        methodDeclInfo.put("name", method.getName());
        NodeList<Modifier> modifiers = method.getModifiers();
        for (Modifier mod : modifiers) {
            switch (mod.getKeyword()) {
                case PUBLIC:
                    methodDeclInfo.put("visibility", "public");
                    break;
                case PROTECTED:
                    methodDeclInfo.put("visibility", "protected");
                    break;
                case PRIVATE:
                    methodDeclInfo.put("visibility", "private");
                    break;
                case ABSTRACT:
                    methodDeclInfo.put("abstract", true);
                    break;
                case DEFAULT:
                    methodDeclInfo.put("default", true);
                    break;
                case FINAL:
                    methodDeclInfo.put("final", true);
                    break;
                case NATIVE:
                    methodDeclInfo.put("native", true);
                    break;
                case STATIC:
                    methodDeclInfo.put("static", true);
                    break;
                case STRICTFP:
                    methodDeclInfo.put("strictfp", true);
                    break;
                case SYNCHRONIZED:
                    methodDeclInfo.put("synchronized", true);
                    break;
                default:
                    break;
            }
        }
        NodeList<Parameter> params = method.getParameters();
        JSONArray paramsArray = new JSONArray();
        for (Parameter p : params) {
            try {
                paramsArray.put(p.resolve().describeType());
            } catch (UnsolvedSymbolException e) {
                paramsArray.put(e.getName());
                System.out.println("Unsolved symbol exception for parameter of type " + e.getName());
            }

        }
        methodDeclInfo.put("parameters", paramsArray);
        NodeList<TypeParameter> typeParams = method.getTypeParameters();
        JSONArray typeParamsArray = new JSONArray();
        for (TypeParameter tp : typeParams) {
            typeParamsArray.put(tp.asString());
        }
        methodDeclInfo.put("typeParameters", typeParamsArray);
        return methodDeclInfo;
    }

    public static boolean sharePackagePrefix(String className, String methodName) {
        String[] splitClassName = className.split("\\.");
        String[] splitMethodName = methodName.split("\\.");
        int minLength = Math.min(splitClassName.length, splitMethodName.length);
//        System.out.println("minLength: " + minLength);
//        System.out.println(className + ", " + methodName);
        if (minLength > 0) {
//            boolean matchedSoFar = true;
            for (int i = 0; i < minLength; i++) {
                if (!splitClassName[i].equals(splitMethodName[i])) {
                    return false;
                }
                if (i == minPackageMatchThreshold - 1) {
                    // If we get here, we obviously haven't found any non-matches thus far
//                    System.out.println("Matched: " + className + ", " + methodName + " with threshold " + Integer.toString(minPackageMatchThreshold));
                    return true;
                }
            }
        }
        return false;
    }

    public static JSONObject getMethodCallInfo(MethodCallExpr mce, String className) {
        JSONObject methodCallInfo = new JSONObject();
        // TODO: add more info
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

    public static void main(String[] args) throws Exception {
        Options options = getOptions();
        CommandLineParser parser = new DefaultParser();
        String sourceDir;
        String dataFile = "data.json";
        try {
            CommandLine line = parser.parse(options, args);
            String[] leftoverArgs = line.getArgs();
            if (line.hasOption("h")) {
                printHelp(options);
                return;
            }
            if (leftoverArgs.length != 1 && leftoverArgs.length != 2) {
                System.out.println("ERROR: expected either one or two arguments.");
//                System.out.println("Usage: ResolveMethodReferences project_source_dir [json_output_filename]");
//                System.out.println("By default, json_output_filename will be \"data.json\".");
                printHelp(options);
                return;
            }

            if (line.hasOption("t")) {
                minPackageMatchThreshold = Integer.parseInt(line.getOptionValue("t"));
            }
            sourceDir = leftoverArgs[0];
            if (leftoverArgs.length == 2) {
                dataFile = leftoverArgs[1];
            }
        } catch (ParseException e) {
            System.out.println("Error parsing command line args.");
            System.out.println(e.getMessage());
            e.printStackTrace();
            return;
        }

//        String sourceDir = args[0];
//        String dataFile = "data.json";
//        if (args.length == 2) {
//            dataFile = args[1];
//        }
//        System.out.println("Working Directory = " + System.getProperty("user.dir"));
        // Apparently for org.xml.sax (which is a part of the JDK), the reflection
        // type solver doesn't recognize it as being a part of the JDK, so you have
        // to say that you want jreOnly=false
        TypeSolver reflectionTypeSolver = new ReflectionTypeSolver(false);
        TypeSolver javaParserTypeSolver = new JavaParserTypeSolver(new File(sourceDir));

        ArrayList<String> fileNames = getJavaFiles(sourceDir);
//        for (String name : fileNames) {
//            System.out.println(name);
//        }
//        reflectionTypeSolver.setParent(javaParserTypeSolver);

        CombinedTypeSolver combinedSolver = new CombinedTypeSolver();
        combinedSolver.add(reflectionTypeSolver);
        combinedSolver.add(javaParserTypeSolver);

        JavaSymbolSolver symbolSolver = new JavaSymbolSolver(combinedSolver);

        StaticJavaParser.getConfiguration()
                        .setSymbolResolver(symbolSolver)
                        .setLanguageLevel(com.github.javaparser.ParserConfiguration.LanguageLevel.JAVA_11);

        JSONArray classList = new JSONArray();
        JSONArray classNamesList = new JSONArray();
//        JSONObject classToDeclaredMethods = new JSONObject();

        AtomicReference<Integer> numErrors = new AtomicReference<>(0);
        AtomicReference<Integer> numMethodCalls = new AtomicReference<>(0);
        for (String fileName : fileNames) {
            System.out.println(fileName);
            CompilationUnit cu = StaticJavaParser.parse(new File(fileName));
            cu.findAll(ClassOrInterfaceDeclaration.class).forEach(clazzOrInterface -> {
                JSONObject classInfo = getClassInfo(fileName, clazzOrInterface);
                JSONArray methodsList = new JSONArray();
                clazzOrInterface
                        .findAll(MethodDeclaration.class)
                        .forEach(md -> {
                            JSONObject methodInfo = getMethodDeclarationInfo(md);
                            HashSet<String> calledMethods = new HashSet<>();
                            JSONArray calledMethodsArray = new JSONArray();
                            md.findAll(MethodCallExpr.class)
                              .forEach(mce -> {
                                  try {
                                      JSONObject mceInfo = getMethodCallInfo(mce, (String) classInfo.get("className"));
                                      String sig = (String) mceInfo.get("signature");
                                      if (sig.length() > 0 && !calledMethods.contains((String) mceInfo.get("signature"))) {
                                          calledMethods.add((String) mceInfo.get("signature"));
                                          calledMethodsArray.put(mceInfo);
                                      }
//                                      System.out.println(clazzOrInterface.resolve().getQualifiedName() + "@" + md.getDeclarationAsString() + ": " + mce.resolve().getQualifiedSignature());
                                  } catch (com.github.javaparser.resolution.UnsolvedSymbolException e) {
                                      System.out.println("Error occurred in file " + fileName);
                                      e.printStackTrace();
                                      numErrors.set(numErrors.get() + 1);
                                  } catch (java.lang.RuntimeException e) {
                                      System.out.println("Error occurred in file " + fileName);
                                      System.out.println(e.getMessage());
                                      e.printStackTrace();
                                      numErrors.set(numErrors.get() + 1);
                                  }

                              });
                            methodInfo.put("calls", calledMethodsArray);
                            numMethodCalls.set(numMethodCalls.get() + calledMethodsArray.length());
                            methodsList.put(methodInfo);
                        });
                classInfo.put("methods", methodsList);
                classNamesList.put(classInfo.get("className"));
                classList.put(classInfo);
            });
//            cu.findAll(MethodCallExpr.class).forEach(mce -> System.out.println(mce.resolve().getQualifiedSignature()));
//            cu.findAll(MethodDeclaration.class).forEach(md -> md.findAll(MethodCallExpr.class).forEach(mce -> {
//                System.out.println(md.getDeclarationAsString() + ": " + mce.resolve().getQualifiedSignature());
//            }));
        }
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
        }
    }
}
