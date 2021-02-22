// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Tracks the current file open in the editor.
	context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(function(editor) {
		if(editor){
			console.log(editor.document.fileName);
		}
	}));

	// Registers a command (named codemap.view) that shows the visualization in D3.
	context.subscriptions.push(
		vscode.commands.registerCommand('codemap.view', function () {
			const panel = vscode.window.createWebviewPanel(
				'codemap', // Identifies the type of the webview. Used internally
				'Codemap', // Title of the panel displayed to the user
				vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{enableScripts: true,} // Webview options
			);
			panel.webview.html = getWebviewContent(context, panel.webview);
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

function getWebviewContent(context, webview) {
	// Local path to main script run in the webview
	const scriptPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'vis', 'js', 'index.js');
	const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

	const boxPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'vis', 'js', 'box.js');
	const boxUri = webview.asWebviewUri(boxPathOnDisk);

	const dataPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'vis', 'data.json');
	const dataUri = webview.asWebviewUri(dataPathOnDisk);

	// Local path to css styles
	const styleResetPath = vscode.Uri.joinPath(context.extensionUri, 'vis', 'css', 'reset.css');
	const stylesPathMainPath = vscode.Uri.joinPath(context.extensionUri, 'css', 'vscode.css');

	// Uri to load styles into webview
	const stylesResetUri = webview.asWebviewUri(styleResetPath);
	const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

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
				<link href="${stylesMainUri}" rel="stylesheet">
				<title>Vis</title>
		</head>
		<body>
				<script>
					var dataGlobal = "${dataUri}";
				</script>

				<div id="button-area"></div>
    			<svg id="vis" width="1200" height="800"></svg>
				
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