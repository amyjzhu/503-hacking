package org.codemap.parser;

import java.io.File;
import java.io.FileWriter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.stream.Stream;
import java.nio.file.Path;
import java.nio.file.Files;
import java.nio.file.Paths;

import java.lang.SecurityException;
import java.io.IOException;

import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.symbolsolver.JavaSymbolSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.CombinedTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.JavaParserTypeSolver;
import com.github.javaparser.symbolsolver.resolution.typesolvers.ReflectionTypeSolver;
import com.github.javaparser.symbolsolver.model.resolution.TypeSolver;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.body.MethodDeclaration;

import org.json.JSONArray;
import org.json.JSONObject;

public class ResolveMethodReferences {
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

    public static JSONObject getMethodDeclarationInfo(MethodDeclaration method) {
        JSONObject methodDeclInfo = new JSONObject();
        // In the future, I would like to do something more fancy but this will have
        // to do
        methodDeclInfo.put("signature", method.getDeclarationAsString());
        methodDeclInfo.put("name", method.getName());
        return methodDeclInfo;
    }

    public static JSONObject getMethodCallInfo(MethodCallExpr mce) {
        JSONObject methodCallInfo = new JSONObject();
        // TODO: add more info
        methodCallInfo.put("signature", mce.resolve().getQualifiedSignature());
        return methodCallInfo;
    }

    public static void main(String[] args) throws Exception {
        System.out.println("Working Directory = " + System.getProperty("user.dir"));
        TypeSolver reflectionTypeSolver = new ReflectionTypeSolver();
        TypeSolver javaParserTypeSolver = new JavaParserTypeSolver(new File("../toy-data/refactoring-toy-example-master/src"));

        ArrayList<String> fileNames = getJavaFiles("../toy-data/refactoring-toy-example-master/src");
        for (String name : fileNames) {
            System.out.println(name);
        }
//        reflectionTypeSolver.setParent(javaParserTypeSolver);

        CombinedTypeSolver combinedSolver = new CombinedTypeSolver();
        combinedSolver.add(reflectionTypeSolver);
        combinedSolver.add(javaParserTypeSolver);

        JavaSymbolSolver symbolSolver = new JavaSymbolSolver(combinedSolver);

        StaticJavaParser.getConfiguration()
                        .setSymbolResolver(symbolSolver);

        JSONArray classList = new JSONArray();
        JSONArray classNamesList = new JSONArray();
//        JSONObject classToDeclaredMethods = new JSONObject();


        for (String fileName : fileNames) {
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
                                  JSONObject mceInfo = getMethodCallInfo(mce);
                                  if (!calledMethods.contains((String) mceInfo.get("signature"))) {
                                      calledMethods.add((String) mceInfo.get("signature"));
                                      calledMethodsArray.put(mceInfo);
                                  }
                                  System.out.println(clazzOrInterface.resolve().getQualifiedName() + "@" + md.getDeclarationAsString() + ": " + mce.resolve().getQualifiedSignature());

                              });
                            methodInfo.put("calls", calledMethodsArray);
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
        JSONObject allData = new JSONObject();
        allData.put("classNames", classNamesList);
        allData.put("classData", classList);
        try (FileWriter file = new FileWriter("data.json")) {
            file.write(allData.toString(2));
            file.flush();
        } catch (IOException e) {
            System.out.println(e.getMessage());
        }
    }
}
