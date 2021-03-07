# Code Map
## Directory structure
The root directory contains the Visual Studio Code plugin framework. `package.json` and `extension.json` are the main file defining the plugin. `extension.json` contains the main logic of the plugin and the html code that's injected into view panel inside VSCode.

- `toy-data` contains the toy projects.
- `vis` contains the visualization code. You can quickly test it by running `vis/index.html`.

## VSCode Plugin
Using VSCode, you can test the plugin by running a new instance of VSCode with the plugin via "F5".

There are two commands:
- `codemap.view` to visualize the currently opened class.
- `codemap.parse` to parse the source files in the current project.

### Why do you not use Typescript?
Because the skeleton example didn't work out of the box, and I couldn't get it to work properly.

### Requirements
- Doxygen
- Python2