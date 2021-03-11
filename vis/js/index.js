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
        centeredOnClass: "classorg.jfree.data.xy.YWithXInterval",
        classesOnly: true
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
                target: callee.signature
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

    let classContainers = classNames.map(className => ({ // includes private classses!
        parent: getPackage(className),
        child: className, 
        type: 'class'
    }));

    let hierarchy = methodContainers.concat(classContainers);

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
    var file = `${d.pkg}/${d.id}.java`
    console.log(file)

    // Sending messages to the plugin
    vscode.postMessage({
        command: 'open',
        text: file
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