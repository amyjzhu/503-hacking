d3.text(dataGlobal).then(data => {
    createVis(parseInput(data));
})

let setUpData = (data) => {
    console.log(data)

    var methodLinks; 

    // each package goes in its own group, class go in the package group
    var pkgGroups = [];
    var classGroups = [];
    var methodGroups = [];
    data.forEach((pkg, idx) => {
        // not sre if these groups an be zero-indexed
        pkgGroups.push({id: pkg.name, group: idx + 1, type: "package", views: pkg.views || []});
        pkg.classes.forEach(cls => {
            classGroups.push({id: cls.name, group: idx + 1, pkg: pkg.name, type: "class", views: cls.views || []})
        })

        // right now we inherit views from classes
        // TODO we may want to change this later
        pkg.classes.forEach(cls => {
            cls.methods.forEach(method => {
                methodGroups.push({id: method.name, group: idx + 1, pkg: pkg.name, type: "method", cls: cls.name, text: method.text || "", views: cls.views || []}) 
            })
        })
    })
    
    // TODO -- the strength of the package links should depend on number of class links
    var packageLinks = data.map(p => p.uses.map(link => {return {source: "package" + p.name, target: "package" + link, value: 1, type:"package"}})).flat();

    var classLinks = data.map(p => p.classes.map(cls => cls.uses.map(link => {return {source: "class" + cls.name, target: "class" + link, value: 1, type: "class"}}))).flat().flat();

    var methodLinks = data.map(p => p.classes.map(cls => cls.methods.map(meth => meth.uses.map(link => {return {source: "method" + meth.name, target: "method" + link, value: 1, type: "method"}})))).flat().flat().flat();
    
    console.log(packageLinks);
    console.log(classLinks);
    console.log(methodLinks);

    console.log(pkgGroups);
    console.log(classGroups);
    console.log(methodGroups);

    // var data = {packages: [], classes: [], packageLinks: [], classLinks: [], data: []} // original data
    return {packages: pkgGroups, classes: classGroups, packageLinks: packageLinks, classLinks: classLinks, methods: methodGroups, methodLinks: methodLinks, data: data};
}

let createVis = (data) => {
    var visData = setUpData(data);    

    // var vis = new StructureVis({parentElement: "#vis", data: visData, centeredOn: "felines"})
    var vis = new StructureVis({parentElement: "#vis", data: visData, 
    // centeredOnPackage: "packagecore", 
    centeredOnClass: centerOnGlobal,
    classesOnly: true});

    vis.classOnClick = getPathOnClick;

    // TODO we should also have a different views data structure to help us filter elements

}

let getPathOnClick = (d) => {
    var clickee = `${d.pkg}/${d.id}.java`
    console.log(clickee)

    // Sending messages to the plugin
    vscode.postMessage({
        command: 'alert',
        text: clickee
    })
}

// Example of message passing to receive messages from the plugin
window.addEventListener('message', event => {

    const message = event.data; // The JSON data our extension sent

    switch (message.command) {
        case 'refactor':
            console.log("It works")
            break;
    }
});