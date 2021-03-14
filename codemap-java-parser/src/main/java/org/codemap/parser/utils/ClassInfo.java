package org.codemap.parser.utils;

import org.json.JSONArray;
import org.json.JSONObject;

public class ClassInfo {
    static final String CLASS_NAME = "className";
    static final String FILE_NAME = "fileName";
    static final String METHODS = "methods";
    JSONObject info = new JSONObject();

    public ClassInfo() {
        setClassName("");
        setFileName("");
        info.put(METHODS, new JSONArray());
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

    public void addMethod(JSONObject method) {
        info.getJSONArray(METHODS).put(method);
    }
}
