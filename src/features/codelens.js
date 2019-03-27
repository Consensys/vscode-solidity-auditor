const vscode = require('vscode');




function init(context, type, config){
    solidityVAConfig = config;
    
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(type, {
            provideCodeLenses: function(model, token) {
                return [
                    {
                        range: {
                            startLineNumber: 1,
                            startColumn: 1,
                            endLineNumber: 2,
                            endColumn: 1
                        },
                        id: "First Line",
                        command: {
                            id: commandId,
                            title: "First Line"
                        }
                    }
                ];
            },
            resolveCodeLens: function(model, codeLens, token) {
                return codeLens;
            }
        })
    );
}

module.exports = {
    init:init
}
