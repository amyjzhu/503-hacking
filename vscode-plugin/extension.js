// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "codemap" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('codemap.d3', function () {
		// The code you place here will be executed every time your command is executed

		const panel = vscode.window.createWebviewPanel(
			'codemap', // Identifies the type of the webview. Used internally
			'A D3 View', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{enableScripts: true,} // Webview options
		);

		
		try {
			// And set its HTML content
			panel.webview.html = getWebviewContent(context, panel.webview);
		}
		catch (e) {
			console.log(e);
		}
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(context, webview) {
	// Local path to main script run in the webview
	const scriptPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'main.js');
	const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

	// Local path to css styles
	// const styleResetPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
	// const stylesPathMainPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');

	// Uri to load styles into webview
	// const stylesResetUri = webview.asWebviewUri(styleResetPath);
	// const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

	return `<!DOCTYPE html>
		<html lang="en">
		<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
			
				<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/5.12.0/d3.js"></script>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/d3-graphviz/3.1.0/d3-graphviz.min.js"></script>
				<title>Vis</title>
		</head>
		<body>
				<script src="${scriptUri}"></script>
		</body>
		</html>`;
  }

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}