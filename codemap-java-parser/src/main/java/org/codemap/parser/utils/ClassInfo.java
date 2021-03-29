package org.codemap.parser.utils;

import org.json.JSONArray;
import org.json.JSONObject;

public class ClassInfo {
    static final String CLASS_NAME = "className";
    static final String FILE_NAME = "fileName";
    static final String METHODS = "methods";
    static final String LINE_NUMBER = "lineNumber";
    static final String SUPER_CLASSES = "superClasses";
    static final String IS_INTERFACE = "isInterface";
    static final String IS_INNER_CLASS = "isInnerClass";
    static final String VISIBILITY = "visibility";
    static final String ABSTRACT = "abstract";
    static final String ANONYMOUS = "anonymous";
    static final String STATIC = "static";
    static final String FINAL = "final";
    static final String STRICTFP = "strictfp";
    JSONObject info = new JSONObject();

    public ClassInfo() {
        setClassName("");
        setFileName("");
        setLineNumber(0);
        setIsInterface(false);
        setIsInnerClass(false);
        setVisibility("public");
        setAbstract(false);
        setStatic(false);
        setAnonymous(false);
        setFinal(false);
        setStrictfp(false);

        info.put(METHODS, new JSONArray());
        info.put(SUPER_CLASSES, new JSONArray());
    }

    public JSONObject getJSON() {
        return info;
    }

    public String getClassName() {
        return (String) info.get(CLASS_NAME);
    }

    public void setClassName(String className) {
        info.put(CLASS_NAME, className);
    }

    public String getFileName() {
        return info.getString(FILE_NAME);
    }

    public void setFileName(String fileName) {
        info.put(FILE_NAME, fileName);
    }

    public void setLineNumber(int lineNumber) {
        info.put(LINE_NUMBER, lineNumber);
    }

    public void addMethod(JSONObject method) {
        info.getJSONArray(METHODS).put(method);
    }

    public void addSuperClass(String qualifiedName) {
        info.getJSONArray(SUPER_CLASSES).put(qualifiedName);
    }

    public void setIsInnerClass(boolean isInnerClass) {
        info.put(IS_INNER_CLASS, isInnerClass);
    }

    public void setIsInterface(boolean isInterface) {
        info.put(IS_INTERFACE, isInterface);
    }

    public boolean isInterface() {
        return info.getBoolean(IS_INTERFACE);
    }

    public void setVisibility(String visibility) {
        info.put(VISIBILITY, visibility);
    }

    public void setAbstract(boolean isAbstract) {
        info.put(ABSTRACT, isAbstract);
    }

    public void setStatic(boolean isStatic) {
        info.put(STATIC, isStatic);
    }

    public void setAnonymous(boolean isAnonymous) {
        info.put(ANONYMOUS, isAnonymous);
    }

    public void setFinal(boolean isFinal) {
        info.put(FINAL, isFinal);
    }

    public void setStrictfp(boolean isStrictfp) {
        info.put(STRICTFP, isStrictfp);
    }
}
