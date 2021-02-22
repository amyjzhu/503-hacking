import sys, os, re
# import xml.etree.ElementTree as ET
from xml.etree import ElementTree as ET


# Index file has the methods for each file, but they were missing the full signature,
# leading to the same file (e.g. TuttleMarinha) have several methods with same name.
def process_index_file(directories):
    tree = ET.parse("index.xml")
    root = tree.getroot()
    for child in root:
        print(child.tag, child.getchildren()[0].text)
        file = child.getchildren()[0].text.split("::")
        if len(file) == 3:
            assert directories[file[-2]][file[-1]]  == {}
            chld = child.getchildren()
            no_varsplusfunc = len(chld) - 1      # the 1 is for the file name itself
            chld = chld[1:]
            for j in chld:
                assert j.tag == "member"
                assert len(j.getchildren()) == 1
                print(j.tag, "hello", j.getchildren()[0].text)
        print(file)

        # print(child.tag, [chd.getchildren() if "member" in chd.tag else chd.text for chd in child.getchildren()])

    # print(root, len(root), root[0].attrib, root[0].getchildren()[0].text)


def search_file_for_functions(search_func, direct_child, file_child, directories):
    found = False
    # one function call
    assert search_func.count("(") == 1
    name, num_arguments = search_func.split("(")
    num_arguments = num_arguments.count(", ") + 1
    
    for direc in directories.keys():
        for file in directories[direc]:
            for func in directories[direc][file]['func']:
                # print(func, "see")
                name_, num_arguments_ = func.split("(")
                num_arguments_ = num_arguments_.count(", ") + 1
                if name == name_ and num_arguments == num_arguments_:       # This does not match type of arguments. 
                    found = True
                    # do not update the directories, instead return
                    # directories[direct_child][file_child]['depends'].append(file)
                    file_it_depends_on = file
                    break
        
            if found:
                break
    # print(direc, "Searched", found)
        if found:
            break

    # These are native functions in Java, not called from another file
    java_functions = ['getClass()', 'super()', 'equals()']
    for jf in java_functions:
        if jf in search_func:
            return file_child
    assert found, "search func: {}, file_child: {}".format(search_func, file_child)
    return file_it_depends_on


## We are findind the XML file for each java file. 
# I think this will work for Java as each file must have a different name in Java
def find_method_dependency(directories):
    # print(directories)
    all_files = os.listdir(".")
    java_files = [i for i in all_files if ("_8java" in i) and (".xml" in i)]
    # print(java_files)
    assert len(java_files) == len([files for direc in directories.keys() for files in directories[direc]])
    java_files_names = [i[:-len("_8java.xml")] for i in java_files]   # remove the last added part
    # print(java_files_names)

    for direc in directories.keys():
        for file in directories[direc]:
            assert file in java_files_names
            if direc == "files_in_main_directory":
                open_file = "../{}".format(file) + ".java"
            else:
                open_file = "../{}/{}".format(direc, file) + ".java"
            with open(open_file, "r") as f:
                content = f.readlines()
            content = [i.strip() for i in content]
            for line in content:
                # match = re.search(r'[\w]+\([\w\s"]*\)', lines)
                # Adding a semi-colon to identify function calls and leave function declarations
                match = re.search(r'[\w]+\(.*\).*;', line)   # this gives more methods than the above one. Use this
                if match and "println" not in match.group(0):   # this works because of short-circuting, cute. 
                    search_func = match.group(0)
                    if search_func.count("(") == 1:
                        file_it_depends_on = search_file_for_functions(search_func, direc, file, directories)
                        if file != file_it_depends_on:
                            directories[direc][file]['depends'].add(file_it_depends_on)
                            # directories[direc][file]['depends'].append(file_it_depends_on)
                    # two function calls
                    elif search_func.count("(") == 2:
                        assert "!=" in search_func      # currently in the files
                        function1, function2 = search_func.split(" != ")
                        file_it_depends_on = search_file_for_functions(function1, direc, file, directories)
                        if file != file_it_depends_on:
                            directories[direc][file]['depends'].add(file_it_depends_on)
                        file_it_depends_on = search_file_for_functions(function2, direc, file, directories)
                        if file != file_it_depends_on:
                            directories[direc][file]['depends'].add(file_it_depends_on)
            
    return directories


# This method is supposed to extract the methods (with full signature) from the files.
# This method can also extract the variables of a method
def process_classorg_files(directories):
    files = os.listdir(".")
    classorg_files = [i for i in files if "classorg" in i]
    for file in classorg_files:
        tree = ET.parse(file)
        root = tree.getroot()
        assert len(root.getchildren()) == 1
        chlds = root.getchildren()[0].getchildren()
        fl = chlds[0].text
        fl_remove_org = fl.split("::")[1:]
        assert ".xml" in file
        file = file[:-4]
        file_remove_org = file.split("_1_1")[1:]
        assert fl_remove_org == file_remove_org

        # This is for the files that are in the main directory, not inside any subdirectory. 
        if len(file_remove_org) == 1:
            # print(file_remove_org, "SEE", directories["files_in_main_directory"])
            directories["files_in_main_directory"][file_remove_org[0]] = {'func':[], 'depends':set()}

        # all the methods are in "basecoumpundref" or "sectiondef"
        for itr in root.getchildren()[0].findall("sectiondef", "basecompoundref"):
            for member in itr.findall("memberdef"):
                if member.attrib['kind'] == "function":
                    # print(file_remove_org, member.find("name").text, member.find("argsstring").text)
                    method = member.find("name").text + member.find("argsstring").text
                    # This is for the files that are in the main directory, not inside any subdirectory. 
                    if len(file_remove_org) == 1:
                        # directories["files_in_main_directory"][file_remove_org[0]].append(method)
                        directories["files_in_main_directory"][file_remove_org[0]]['func'].append(method)
                    elif len(file_remove_org) == 2:
                        directories[file_remove_org[0]][file_remove_org[1]]['func'].append(method)
                    else:
                        raise NotImplementedError

    return directories


# This method return the directories as keys of a dictionary with the files inside each directory as its values. 
# The files themselves are keys of dictionaries with the intent of the having their methods inside them. 
def process_dir_files():
    files = os.listdir(".")
    dir_files = [i for i in files if "dir" in i]
    directories = {}
    for file in dir_files:
        tree = ET.parse(file)
        root = tree.getroot()
        assert len(root) == 1
        assert root[0].attrib['kind'] == "dir"
        for child in root[0]:
            if "compoundname" in child.tag:
                direct = child.text
                directories[child.text] = {}      # create keys with directories
                # print(child.text, "SEE")
            if "innerfile" in child.tag:
                assert ".java" in child.text
                x = child.text.split(".java")
                directories[direct][x[0]] = {'func':[], 'depends':set()}    # for depends using a set
                # print(child.text)
            # print(child.tag, child.text)
    directories["files_in_main_directory"] = {}     # the files have not been populated yet, therefore don't replace with {func and depends}
    # print(directories)
    directories = process_classorg_files(directories)
    directories = find_method_dependency(directories)
    print(directories)
    # for direc in directories:
    #     for file in directories[direc]:
    #         print(file, directories[direc][file]['depends'])


if __name__ == "__main__":
    process_dir_files()
