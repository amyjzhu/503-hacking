# Code Map
Live at http://amy.zhucchini.ca/503-hacking/vis/index.html

Report at https://github.com/amyjzhu/503-hacking/blob/master/cse503-report.pdf

## Directory structure
The root directory contains the Visual Studio Code plugin framework. `package.json` and `extension.json` are the main file defining the plugin. `extension.json` contains the main logic of the plugin and the html code that's injected into view panel inside VSCode.

- `data/` contains the toy projects.
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

## Use cases
- Discover new code base
- Understand interactions between parts of a project, especially when making changes is helpful
- Seeing units of code summarized as collections of their immediate children is helpful

## UI Feedback
- The links were super helpful
- Switch between source code an visualization was useful
- **Overlapping elements are terrible**
- **Zoom levels are jumpy**
- Font too big, everything doesn't fit on the screen
- scaling is obtrusive (e.g. using a consistent font size and showing more stuff at a particular zoom level, maybe abstracting methods into points at some level and letting mouseover reveal names)
- Resizing the window doesn't resize the viewport
- Type of relationships are not clear (we can fix this by being precise for each level: e.g., methods -> calls, classes -> dependencies / imports)
- Make dependency direction clearer
- Should show different levels of information when zooming into a package/class/method, shouldn't just be static; i.e., could show private/public/protected for methods, or the number of methods in a class or whether it's an interface or abstract class, or the number of classes in a package. Since the class is so much bigger on the screen at a higher zoom level, it shouldn't just take up the whole screen with a blank box.
- Another idea to introduce more smooth transitions: gradually make the class/package less and less opaque as you zoom in on it more

## UI Improvement Ideas
- Would like to see the viz and code at the same time (split screen)
- Color coding was helpful but needs to be **color-blind friendly**
- Button to clean all the links so the developer doesn't have to remove all of them manually
- Ability to zoom by dragging the ruler on the bottom right
- Add links between packages
- Color code links based on their target's packages
- Button to toggle on/off all the links between the methods in a class
- Keep the same zoom level when you move from vis -> source code -> vis
- Ability to put the visualization in a split view (in IDE or second screen) to get relevant information based on where I'm in the source file.
- In split view, the visualization updates based on the active text editor (class) and my cursor (method)
- Filtered views
- Showing connections between modules/structs and type classes
- In C, navigate namespaces, code vs header, where functions are defined
- Open map to the side of your editor with text-to-map position syncing/"your cursor/currently selected method is here" on the map
- some info about the last selected unit of code that would let you jump back to it after panning/zooming around
- similarly, an "undo selection/redo selection" concept for moving between selections, since users understand maps in terms of discrete known positions. 
- A way to clean all dependency information (arrows) from the map (right now the map gets "dirty" with old selections); - A way to show all dependency information for all children of a unit to quickly summarize connections in a module. 
- Some kind of flexible "map search" + map filtering. I didn't pay much attention to the directions of dependencies, but - Incorporate liveness into the visualization, e.g. by tracing an actual execution path around the diagram. What I really would have wanted for the title-setting exercise would be something that shows me a map like yours and a running instance of JFreeChart, and when I set a title, I would look at the map to see what parts light up and maybe get a path connecting those parts. Without a running instance of the program (or some proxy for it) I wouldn't trust my analysis.
- More levels (Google Maps has 10 levels which is why it looks so smooth: humans think mostly in Planet-Continent-City-Neighbourhood-Street)
- More details for methods or class if I want to focus on them without jumping to the code. E.g., for a method show its dependencies directly instead of the links (some kind of `alt + click` behavior)
- View Subtype relationship
- Ability to search without leaving the visualization
- Group closely related classes together
- Jump to superclass from inside a class
