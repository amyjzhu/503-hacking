var packages = ["core", "net", "util", "parse"]
var classes = ["Count", "Visitor", "Server", "Client", "RPC", "Misc", "Lex", "Parse", "Desugar", "Lower"]


var data = [
    {// packages
        name: "core",
        classes: [{
            name: "Count",
            methods: [],
            uses: ["Visitor", "Client", "RPC", "Misc"]
        },{
            name: "Visitor",
            methods: [],
            uses: ["Count", "Misc"]
        }],
        uses: ["net", "util", "parse"]
    },
    {
        name: "net",
        classes: [{
            name: "Server",
            methods: [],
            uses: ["Client", "RPC", "Misc"]
        }, {
            name: "Client",
            methods: [],
            uses: ["Server", "RPC"]
        }, {
            name: "RPC",
            methods: [],
            uses: []
        }],
        uses: ["core", "util"]
    },
    {
        name: "util",
        classes: [{
            name: "Misc",
            methods: [],
            uses: []
        }],
        uses: ["net", "core"]
    },
    {
        name: "parse",
        classes:[{
            name: "Lex",
            methods: [],
            uses: ["Parse"]
        }, {
            name: "Parse",
            methods: [],
            uses: ["Desugar"]
        }, {
            name: "Desugar",
            methods: [],
            uses: ["Lower"]
        }, {
            name: "Lower",
            methods: [],
            uses: ["Count"]
        }],
        uses: ["core"]
    }
]

console.log(JSON.stringify(data));