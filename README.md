# Tentative names
- Code Map
- Code Zoom

# Directory structure
The root directory contains the Visual Studio Code plugin framework. `package.json` and `extension.json` are the main file defining the plugin. `extension.json` contains the main logic of the plugin and the html code that's injected into view panel inside VSCode.

- `toy-data` contains the toy projects.
- `vis` contains the visualization code. You can quickly test it by running `vis/index.html`.

# VSCode Plugin
Using VSCode, you can test the plugin by running a new instance of VSCode with the plugin via "F5".

There is two commands:
- `codemap.d3` to launch the d3 view.
- `codemap.server` to launch / connect to the background server and acquire the data.

## Why do you not use Typescript?
Because the skeleton example didn't work out of the box, and I couldn't get it to work properly.