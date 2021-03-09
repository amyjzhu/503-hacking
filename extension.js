// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const path = require('path');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	
	// Registers a command (named codemap.view) that shows the visualization in D3.
	context.subscriptions.push(
		vscode.commands.registerCommand('codemap.view', function () {
			
			var activeTextEditor = vscode.window.activeTextEditor

			if(!activeTextEditor) {
				vscode.window.showInformationMessage("You need to have an active editor open")
				return;
			}

			const panel = vscode.window.createWebviewPanel(
				'codemap', // Identifies the type of the webview. Used internally
				'Codemap', // Title of the panel displayed to the user
				vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{enableScripts: true,} // Webview options
			);

			
			var currentClass = path.basename(activeTextEditor.document.fileName)
			currentClass = currentClass.split('.').slice(0, -1).join('.')
			panel.webview.html = getWebviewContent(context, panel.webview, currentClass);

			// Receiving messages from the visualization
			panel.webview.onDidReceiveMessage(
				message => {
					switch (message.command) {
					case 'open':
						if(message.text.includes('files_in_main_directory/')) {
							message.text = 'DogManager.java'
						}

						var workspace = vscode.workspace.workspaceFolders[0].uri;
						var file = vscode.Uri.joinPath(workspace, 'src', 'org', message.text);
						
						console.log(file);
						vscode.window.showTextDocument(file);
						panel.dispose();
						return;
					}
				},
				undefined,
				context.subscriptions
			  );

			// Send a message to the visualization.
			// You can send any JSON serializable data.
			// panel.webview.postMessage({ command: 'refactor' });
		})
	);

	// Registers a command (named codemap.parse) that calls a terminal command.
	// TODO Replace with Doxygen command.
	context.subscriptions.push(
		vscode.commands.registerCommand('codemap.parse', function () {
			const terminal = vscode.window.createTerminal(`Codemap Terminal`);
			terminal.sendText("pwd");
			terminal.show();
		})
	);
}

function getWebviewContent(context, webview, centerOn) {
	// Local path to main script run in the webview
	const scriptPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'vis', 'js', 'index.js');
	const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

	const boxPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'vis', 'js', 'box.js');
	const boxUri = webview.asWebviewUri(boxPathOnDisk);

	// Local path for the data file
	const dataPathOnDisk = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, 'data.json');
	const dataUri = webview.asWebviewUri(dataPathOnDisk);

	// Local path to css styles
	const styleResetPath = vscode.Uri.joinPath(context.extensionUri, 'vis', 'css', 'reset.css');
	const stylesResetUri = webview.asWebviewUri(styleResetPath);
	// const stylesPathMainPath = vscode.Uri.joinPath(context.extensionUri, 'css', 'vscode.css');
	// const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

	return `<!DOCTYPE html>
		<html lang="en">
		<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			
				<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/5.12.0/d3.js"></script>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/d3-graphviz/3.1.0/d3-graphviz.min.js"></script>
				<script src="https://unpkg.com/@hpcc-js/wasm/dist/index.min.js" type="javascript/worker"></script> 

				<link href="${stylesResetUri}" rel="stylesheet">
				
				<title>Vis</title>
		</head>
		<body>
				<script>
					var dataPathGlobal = "${dataUri}";
					var centerOnGlobal = "class${centerOn}";

					// TODO Should not be global. For security reasons, you must keep the VS Code API object private and make sure it is never leaked into the global scope.
					const vscode = acquireVsCodeApi();
				</script>

				<div id="button-area"></div>
    
				<div id="container">
					<svg id="vis"></svg>
				</div>
				
				<script src="${scriptUri}"></script>
				<script src="${boxUri}"></script>
		</body>
		</html>`;
  }

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}