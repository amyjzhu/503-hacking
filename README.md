# Code Map
## Directory structure
The root directory contains the Visual Studio Code plugin framework. `package.json` and `extension.json` are the main file defining the plugin. `extension.json` contains the main logic of the plugin and the html code that's injected into view panel inside VSCode.

- `toy-data/` contains the toy projects.
- `vis/` contains the visualization code. You can quickly test it by running `vis/index.html`.
- `parsing/` contains the parsing scripts and libraries for the plugin.

## VSCode Plugin

### Usage
1. To use the plugin, open an instance of VSCode on this directory's root.
2. Run the "Run Extension" task using "F5" or through the "Run and Debug" pane. This will launch a new VSCode instance with the code map plugin installed.
3. Open the folder where the project you want to visualize is located. 
4. Use `codemap.parse` to parse the source files from your project. It will produce a `data.json` file in the root folder. This process can take a few minutes.
5. When the parser has finished or that a `data.json` file is present at the root, use `codemap.view` to visualize the currently opened class.

### Visualization controls
- `ctrl + click` on a class to open its file and close the visualization.
- `click` on a class to toggle the highlighting.
- `hover` on a class to highlight dependencies.

### Why do you not use Typescript?
Because the skeleton example didn't work out of the box, and I couldn't get it to work properly.

### Requirements
- NodeJS
- npm
