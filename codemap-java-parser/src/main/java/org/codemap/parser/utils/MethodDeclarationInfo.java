package org.codemap.parser.utils;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;

public class MethodDeclarationInfo {
    JSONObject methodInfo = new JSONObject();
    static final String VISIBILITY = "visibility";
    static final String DEFAULT = "default";
    static final String ABSTRACT = "abstract";
    static final String FINAL = "final";
    static final String NATIVE = "native";
    static final String STATIC = "static";
    static final String STRICTFP = "strictfp";
    static final String SYNCHRONIZED = "synchronized";
    static final String SIGNATURE = "signature";
    static final String DECLARATION = "declaration";
    static final String NAME = "name";
    static final String RETURN = "return";
    static final String TYPE_PARAMETERS = "typeParameters";
    static final String PARAMETERS = "parameters";
    static final String CALLS = "calls";
    private HashSet<String> calledMethods = new HashSet<String>();

    public MethodDeclarationInfo() {
        setVisibility("public");
        setDefault(false);
        setAbstract(false);
        setFinal(false);
        setNative(false);
        setStatic(false);
        setStrictfp(false);
        setSynchronized(false);
        setSignature("");
        setDeclaration("");
        setName("");
        setReturn("");
        methodInfo.put(TYPE_PARAMETERS, new JSONArray());
        methodInfo.put(PARAMETERS, new JSONArray());
        methodInfo.put(CALLS, new JSONArray());
    }

    public JSONObject getMethodInfo() {
        return methodInfo;
    }

    public void addCall(JSONObject mceInfo) {
        String sig = mceInfo.getString(SIGNATURE);
        if (sig.length() > 0 && !calledMethods.contains(sig)) {
            methodInfo.getJSONArray(CALLS).put(mceInfo);
            calledMethods.add(sig);
        }
    }

    public int getNumCalls() {
        return getCalls().length();
    }

    private JSONArray getCalls() {
        return methodInfo.getJSONArray(CALLS);
    }

    public void setSignature(String signature) {
        methodInfo.put(SIGNATURE, signature);
    }

    public void setDeclaration(String declaration) {
        methodInfo.put(DECLARATION, declaration);
    }

    public void setName(String name) {
        methodInfo.put(NAME, name);
    }

    public void setReturn(String returnType) {
        methodInfo.put(RETURN, returnType);
    }

    public void addTypeParameter(String type) {
        methodInfo.getJSONArray(TYPE_PARAMETERS).put(type);
    }

    public void addAllTypeParameters(JSONArray typeParameters) {
        methodInfo.getJSONArray(TYPE_PARAMETERS).putAll(typeParameters);
    }

    public void addParameter(String param) {
        methodInfo.getJSONArray(PARAMETERS).put(param);
    }

    public void addAllParameters(JSONArray parameters) {
        methodInfo.getJSONArray(PARAMETERS).putAll(parameters);
    }

    public void setVisibility(String visibility) {
        methodInfo.put(VISIBILITY, visibility);
    }
    public void setDefault(boolean isDefault) {
        methodInfo.put(DEFAULT, isDefault);
    }

    public void setAbstract(boolean isAbstract) {
        methodInfo.put(ABSTRACT, isAbstract);
    }

    public void setFinal(boolean isFinal) {
        methodInfo.put(FINAL, isFinal);
    }

    public void setNative(boolean isNative) {
        methodInfo.put(NATIVE, isNative);
    }

    public void setStatic(boolean isStatic) {
        methodInfo.put(STATIC, isStatic);
    }

    public void setStrictfp(boolean isStrictfp) {
        methodInfo.put(STRICTFP, isStrictfp);
    }

    public void setSynchronized(boolean isSynchronized) {
        methodInfo.put(SYNCHRONIZED, isSynchronized);
    }
}
