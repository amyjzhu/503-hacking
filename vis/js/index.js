
d3.json(dataGlobal).then(data => {
    console.log(data)

    // this is kind of just temp. data processing stuff for a prototype


    var methodLinks; // should be a similar approach...
    // also need to associate the method and class together 

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
    console.log(packageLinks)
    
    /*"nodes": [
    {"id": "Myriel", "group": 1},
    {"id": "Napoleon", "group": 1},
    {"id": "Mlle.Baptistine", "group": 1},*/

    var classLinks = data.map(p => p.classes.map(cls => cls.uses.map(link => {return {source: "class" + cls.name, target: "class" + link, value: 1, type: "class"}}))).flat().flat();

    var methodLinks = data.map(p => p.classes.map(cls => cls.methods.map(meth => meth.uses.map(link => {return {source: "method" + meth.name, target: "method" + link, value: 1, type: "method"}})))).flat().flat().flat();

    console.log(classLinks);
    console.log(methodLinks);

    console.log(pkgGroups);
    console.log(classGroups);
    console.log(methodGroups);

    // var data = {packages: [], classes: [], packageLinks: [], classLinks: [], data: []} // original data
    var visData = {packages: pkgGroups, classes: classGroups, packageLinks: packageLinks, classLinks: classLinks, methods: methodGroups, methodLinks: methodLinks, data: data};

    var vis = new StructureVis({parentElement: "#vis", data: visData})

    // TODO we should also have a different views data structure to help us filter elements

})
