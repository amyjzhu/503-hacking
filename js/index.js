d3.json("data.json").then(data => {
    console.log(data)

    var packageLinks = data.map(p => p.uses.map(link => {return {source: p.name, target: link, value: 1}})).flat();
    console.log(packageLinks)
    // TODO create links object with source, target, value
    // TODO package nodes will have to become class nodes with different groups
    /*"nodes": [
    {"id": "Myriel", "group": 1},
    {"id": "Napoleon", "group": 1},
    {"id": "Mlle.Baptistine", "group": 1},*/

    var classLinks = data.map(p => p.classes.map(cls => cls.uses.map(link => {return {source: cls.name, target: link, value: 1}}))).flat().flat();
    console.log(classLinks);

    var methodLinks; // should be a similar approach...

    // each package goes in its own group, class go in the package group
    var pkgGroups = [];
    var classGroups = [];
    data.forEach((pkg, idx) => {
        // not sre if these groups an be zero-indexed
        pkgGroups.push({id: pkg.name, group: idx + 1});
        pkg.classes.forEach(cls => {
            classGroups.push({id: cls.name, group: idx + 1})
        })
    })

    console.log(pkgGroups);
    console.log(classGroups);

    // var data = {packages: [], classes: [], packageLinks: [], classLinks: [], data: []} // original data
    var visData = {packages: pkgGroups, classes: classGroups, packageLinls: packageLinks, classLinks: classLinks, data: data};

    // TODO we should also have a different views data structure to help us filter elements

})