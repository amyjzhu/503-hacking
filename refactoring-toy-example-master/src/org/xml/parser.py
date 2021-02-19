import sys, os
import xml.etree.ElementTree as ET


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


# This method is supposed to extract the methods (with full signature) from the files.
# This method can also extract the variables of a method
def process_classorg_files(directories):
    files = os.listdir(".")
    classorg_files = [i for i in files if "classorg" in i]
    # print(classorg_files)
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
            directories["files_in_main_directory"][file_remove_org[0]] = []

        # all the methods are in "basecoumpundref" or "sectiondef"
        for itr in root.getchildren()[0].findall("sectiondef", "basecompoundref"):
            for member in itr.findall("memberdef"):
                if member.attrib['kind'] == "function":
                    # print(file_remove_org, member.find("name").text, member.find("argsstring").text)
                    method = member.find("name").text + member.find("argsstring").text
                    # This is for the files that are in the main directory, not inside any subdirectory. 
                    if len(file_remove_org) == 1:
                        directories["files_in_main_directory"][file_remove_org[0]].append(method)
                        # print(file_remove_org)
                    elif len(file_remove_org) == 2:
                        directories[file_remove_org[0]][file_remove_org[1]].append(method)
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
                directories[direct][x[0]] = []
                # print(child.text)
            # print(child.tag, child.text)
    directories["files_in_main_directory"] = {}
    print(directories)
    # process_index_file(directories)
    directories = process_classorg_files(directories)
    print(directories)


if __name__ == "__main__":
    process_dir_files()
