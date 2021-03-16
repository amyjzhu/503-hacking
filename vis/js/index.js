// Load data from disk and initialize the visualization
d3.json(dataPathGlobal).then(jsonData => {
    console.log({jsonData})

    var data = processJson(jsonData);
    console.log(data);
    // nodes, list, groups

    initializeVisualization(data);
})

let initializeVisualization = (data) => {
    var vis = new StructureVis({
        parentElement: "#vis", 
        data: data, 
        // centeredOnClass: "class/Users/audrey/github/jfreechart/src/main/java/org/jfree/chart/renderer/xy/StackedXYAreaRenderer.java",
        centeredOnClass: centerOnGlobal,
        // centeredOnClass: "class/Users/thomas/Projects/503-hacking/toy-data/refactoring-toy-example-master/src/org/felines/AnimalSuper.java",
        classesOnly: false,
        highlighting: false,
        performanceMode: true,
     });

    vis.classOnClick = getPathOnClick;

    // TODO we should also have a different views data structure to help us filter elements
}

// Transform JSON to flat representations: nodes, links, hierarchy
let processJson = ({classData, classNames}) => {

    console.log({classData})

    let classNodes = classData.map(item => ({
        fqn: item.className, 
        name: getShortName(item.className), 
        filePath: item.fileName,
        type: "class"
    }));

    let methodNodes = classData.flatMap(itemClass => {
        return itemClass.methods.flatMap(itemMethod => ({
            fqn: getMethodFqn(itemClass.className, itemMethod.name), 
            name: itemMethod.name,
            type: 'method'
        }));
    });

    let nodes = classNodes.concat(methodNodes)

    let methodLinks = classData.flatMap(itemClass => {
        return itemClass.methods.flatMap(itemMethod => {
            return itemMethod.calls.flatMap(callee => ({
                source: getMethodFqn(itemClass.className, itemMethod.name),
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
            child: getMethodFqn(itemClass.className, itemMethod.name),
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
        classLinks.push({source: sourceClass.parent, target: targetClass.parent, type: 'class' })
    })

    classLinks = Array.from(new Set(classLinks));

    links = links.concat(classLinks);

    console.log({nodes})
    console.log({links})
    console.log({hierarchy})

    return {nodes: nodes, links: links, hierarchy: hierarchy}


    // each package goes in its own group, class go in the package group
    // var pkgGroups = [];
    // var classGroups = [];
    // var methodGroups = [];
    // data.forEach((pkg, idx) => {
    //     // not sre if these groups an be zero-indexed
    //     pkgGroups.push({id: pkg.name, group: idx + 1, type: "package", views: pkg.views || [], container: ""});
    //     pkg.classes.forEach(cls => {
    //         classGroups.push({id: cls.name, group: idx + 1, container: pkg.name, type: "class", views: cls.views || []})
    //     })

    //     // right now we inherit views from classes
    //     // TODO we may want to change this later
    //     pkg.classes.forEach(cls => {
    //         cls.methods.forEach(method => {
    //             methodGroups.push({id: method.name, group: idx + 1, pkg: pkg.name, type: "method", container: cls.name, text: method.text || "", views: cls.views || []}) 
    //         })
    //     })
    // })
    
    // // TODO -- the strength of the package links should depend on number of class links
    // var packageLinks = data.map(p => p.uses.map(link => {return {source: "package" + p.name, target: "package" + link, value: 1, type:"package"}})).flat();

    // var classLinks = data.map(p => p.classes.map(cls => cls.uses.map(link => {return {source: "class" + cls.name, target: "class" + link, value: 1, type: "class"}}))).flat().flat();

    // var methodLinks = data.map(p => p.classes.map(cls => cls.methods.map(meth => meth.uses.map(link => {return {source: "method" + meth.name, target: "method" + link, value: 1, type: "method"}})))).flat().flat().flat();
    
    // console.group("After processJson")
    // console.log(packageLinks);
    // console.log(classLinks);
    // console.log(methodLinks);

    // console.log(pkgGroups);
    // console.log(classGroups);
    // console.log(methodGroups);
    // console.groupEnd();

    // return {
    //     data: pkgGroups.concat(classGroups).concat(methodGroups), 
    //     links: packageLinks.concat(classLinks).concat(methodLinks)
    // };
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
    res = fullQualifiedName.split('.'); // There might be a more efficient way to do this.
    return res[res.length - 1] // Return the last element, which is the class name.
}

// Converts a fully qualified class name and method name to a method FQN.
function getMethodFqn(classFqn, methodName){
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

// ----------------------------------------------------------------------------
// Example of message passing to receive messages from the plugin
// window.addEventListener('message', event => {

//     const message = event.data; // The JSON data our extension sent

//     switch (message.command) {
//         case 'refactor':
//             console.log("It works")
//             break;
//     }
// });