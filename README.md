# Code Map
## Directory structure
The root directory contains the Visual Studio Code plugin framework. `package.json` and `extension.json` are the main file defining the plugin. `extension.json` contains the main logic of the plugin and the html code that's injected into view panel inside VSCode.

- `toy-data/` contains the toy projects.
- `vis/` contains the visualization code. You can quickly test it by running `vis/index.html`.
- `parsing/` contains the parsing scripts and libraries for the plugin.

## Demo
To quickly try out the tool, follow those steps:

1. Clone the repositories. To make things easy, please clone both of these in the same directory.
    - Clone the plugin’s repository: `git clone https://github.com/amyjzhu/503-hacking.git`
    - Clone JFreechart repository: `git clone https://github.com/audreyseo/jfreechart`

2. To use the plugin, open an instance of VSCode on this directory's root.
3. Run the "Run Extension" task using "F5" or through the "Run and Debug" pane. This will launch a new VSCode instance with our CodeMap plugin installed.
4. Open the folder where you cloned JFreechart.
5. Open JFreechart.java file using `cmd + p` / `ctrl+p`
6. Use codemap.view to visualize the currently opened class (open the command palette using `cmd + shift + p` / `ctrl + shift + p` or ‘View -> Command Palette…’
7. Loading the first visualization will take a few seconds, this is normal.

## Visualization controls
- `ctrl + click` (or `cmd + click` on macOS) on a class to open its file and close the visualization.
- `click` on a class to toggle the highlighting.
- `double click` on a link to move between the source and target node (the source or target node must be in the viewport)- `zoom` using the scroll wheel or touchpad to change the level of details.
- `hover` on a class to highlight dependencies.

## VSCode Plugin

### Usage
1. To use the plugin, open an instance of VSCode on this directory's root.
2. Run the "Run Extension" task using "F5" or through the "Run and Debug" pane. This will launch a new VSCode instance with the code map plugin installed.
3. Open the folder where the project you want to visualize is located. 
4. Use `codemap.parse` to parse the source files from your project. It will produce a `data.json` file in the root folder. This process can take a few minutes.
5. When the parser has finished or that a `data.json` file is present at the root, use `codemap.view` to visualize the currently opened class.

### Why do you not use Typescript?
Because the skeleton example didn't work out of the box, and I couldn't get it to work properly.

### Requirements
- NodeJS
- npm

## UI Improvements Ideas
- Button to clean all the links so the developer doesn't have to remove all of them manually
- Ability to zoom by dragging the ruler on the bottom right
- Add links between packages
- Color code links based on their target's packages
- Button to toggle on/off all the links between the methods in a class