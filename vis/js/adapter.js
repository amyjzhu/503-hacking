
// Parses "*.codemap" files into an internal representation.

let parseInput = text => {
    // make this a valid JSON
    let replaceSet = /set\((\[[\w,'\s]*\])\)/g;    
    let replaced = text.replace(replaceSet, '$1');
    replaced = replaced.replace(/\'/g, '\"');

    let data = JSON.parse(replaced);
    console.log(data);

    // top-level keys are all packages

    let packages = Object.keys(data);
    console.log(packages);
    let structData = packages.map(pkg => {
        return {
            name: pkg,
            uses: [], // todo should make this robust in vis
            classes: Object.keys(data[pkg]).map(cls => {
                let classObj = data[pkg][cls];
                return {
                    name: cls,
                    uses: classObj.depends,
                    methods: classObj.func.map(func => {
                        return {
                            name: func,
                            uses: [],
                            text: ""
                        }
                    })
                }
            })
        }
    })
    console.log(structData);

    return structData;
}