"use strict";

var visvis = undefined;

main();

async function main() {
    const jsonData = await d3.json(dataPathGlobal);
    
    console.log({jsonData})

    console.time('processJson')
    var data = processJson(jsonData);
    console.timeEnd('processJson')

    console.log(data);

    initializeVisualization(data);
}

let initializeVisualization = (data) => {
    var vis = new StructureVis({
        parentElement: "#vis",
        data: data,
        centeredOnClass: centerOnGlobal, // Please control centeredOnClass via the centerOnGlobal in index.html.
        classesOnly: false,
        highlighting: false,
        performanceMode: true,
    });

    vis.classOnClick = getPathOnClick;

    visvis = vis;
    // TODO we should also have a different views data structure to help us filter elements
}

function initEventListeners() {
    // Receives messages sent from the extension.
    window.addEventListener('message', event => {

        const message = event.data;

        switch (message.command) {
            case 'center':
                console.log("It works");
                console.log(message.class);
                console.log(visvis)
                visvis.centerOn(message.class);
                break;
        }
    });
}

// Transform JSON to flat representations: nodes, links, hierarchy
let processJson = ({ classData, classNames }) => {

    console.log({ classData })

    let classNodes = classData.map(item => ({
        fqn: item.className,
        name: getShortName(item.className),
        filePath: makeRelative(item.fileName),
        type: "class"
    }));

    let methodNodes = classData.flatMap(itemClass => {
        return itemClass.methods.flatMap(itemMethod => ({
            fqn: itemMethod.signature, //getMethodFqn(itemClass.className, itemMethod.name), 
            name: itemMethod.name,
            type: 'method'
        }));
    });

    let nodes = classNodes.concat(methodNodes)

    let methodLinks = classData.flatMap(itemClass => {
        return itemClass.methods.flatMap(itemMethod => {
            return itemMethod.calls.flatMap(callee => ({
                source: itemMethod.signature, //getMethodFqn(itemClass.className, itemMethod.name),
                target: callee.signature,
                // TODO: type is actually superfluous since we can just check if
                // the source and target are currently visible
                // but this incurs more performance issues so...
                type: 'method'
            }));
        });
    });

    let links = methodLinks

    let methodContainers = classData.flatMap(itemClass => {
        return itemClass.methods.flatMap(itemMethod => ({
            parent: itemClass.className,
            child: itemMethod.signature, //getMethodFqn(itemClass.className, itemMethod.name),
            type: 'method'
        }));
    });

    let classContainers = classNames.map(fqnClassName => {
        let parent = getPackage(fqnClassName);

        // Remove parents that are classes until we find a package.
        while (isClass(parent)) {
            parent = getPackage(parent)
        }

        return {
            parent: parent,
            child: fqnClassName,
            type: 'class'
        }
    });

    let hierarchy = methodContainers.concat(classContainers);

    // add extra links about classes
    let classLinks = [];
    methodLinks.map(ml => {
        let sourceClass = methodContainers.find(m => m.child == ml.source);
        let targetClass = methodContainers.find(m => m.child == ml.target);
        if (targetClass == undefined || sourceClass == undefined) return;
        classLinks.push({ source: sourceClass.parent, target: targetClass.parent, type: 'class' })
    })

    classLinks = Array.from(new Set(classLinks));

    // add extra package links
    let packageLinks = [];
    classLinks.map(ml => {
        let sourcePkg = classContainers.find(m => m.child == ml.source);
        let targetPkg = classContainers.find(m => m.child == ml.target);
        if (sourcePkg == undefined || targetPkg == undefined) return;
        packageLinks.push({ source: sourcePkg.parent, target: targetPkg.parent, type: 'class' })
    })

    links = links.concat(classLinks).concat(packageLinks);

    console.log({ nodes })
    console.log({ links })
    console.log({ hierarchy })

    return { nodes: nodes, links: links, hierarchy: hierarchy }
}

let getPathOnClick = (d) => {
    // console.log(d.filePath)

    // Sending messages to the plugin
    vscode.postMessage({
        command: 'open',
        filePath: d.filePath
    })
}

// Converts a Fully Qualified Name to a short name
// e.g., org.animals.Poodle -> Poodle
function getShortName(fullQualifiedName) {
    let res = fullQualifiedName.split('.'); // There might be a more efficient way to do this.
    return res[res.length - 1] // Return the last element, which is the class name.
}

// Converts a fully qualified class name and method name to a method FQN.
function getMethodFqn(classFqn, methodName) {
    return classFqn + "." + methodName + "()";
}

function getPackage(classFqn) {
    return classFqn.substring(0, classFqn.lastIndexOf("."))
}

// Verifies if a FQN is a class or a package. Returns true if it's a class.
function isClass(classFqn) {
    let splitFqn = classFqn.split('.');
    let maybeAClass = splitFqn[splitFqn.length - 1]; // The last element is either a package or a class.
    return maybeAClass.charCodeAt(0) >= 65 && maybeAClass.charCodeAt(0) <= 90
    // Alternate implementation: look if the candidate is an element of data.classNames. Set operations are O(1).
}

// Attempts to make an absolute path relative IF the global variable `rootFolderNameGlobal` is set.
// Will delete the path before encountering `rootFolderNameGlobal`.
function makeRelative(absolutePath) {
    if (!rootFolderNameGlobal) { return absolutePath; }

    let index = absolutePath.indexOf(rootFolderNameGlobal) + rootFolderNameGlobal.length;

    return absolutePath.substring(index + 1);
}
