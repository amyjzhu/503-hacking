// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(
		vscode.commands.registerCommand('codemap.d3', function () {
			const panel = vscode.window.createWebviewPanel(
				'codemap', // Identifies the type of the webview. Used internally
				'A D3 View', // Title of the panel displayed to the user
				vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{enableScripts: true,} // Webview options
			);

			panel.webview.html = getWebviewContent(context, panel.webview);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codemap.server', function () {
			vscode.window.showInformationMessage('Placeholder behavior for `codemap.server`');
		})
	);
}

function getWebviewContent(context, webview) {
	// Local path to main script run in the webview
	const scriptPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'main.js');
	const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

	const boxPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'box.js');
	const boxUri = webview.asWebviewUri(boxPathOnDisk);

	const dataPathOnDisk = vscode.Uri.joinPath(context.extensionUri, 'data.json');
	const dataUri = webview.asWebviewUri(dataPathOnDisk);

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
				<script src="https://unpkg.com/@hpcc-js/wasm/dist/index.min.js" type="javascript/worker"></script> 
				<title>Vis</title>
		</head>
		<body>

				<script>
					console.log("hi")
					var dataGlobal = "${dataUri}";
					d3.json(dataGlobal).then(function(data) {
						console.log(data)
					  })
					  .catch(function(error) {
						console.log(error)
					  });
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