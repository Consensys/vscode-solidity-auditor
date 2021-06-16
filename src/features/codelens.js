'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
const vscode = require('vscode');
const settings = require('../settings.js');

/*
await window.showInputBox({prompt: 'prompt for something',})
*/

function elemLocToRange(elem){
    let name = elem.name?elem.name:Object(elem.name).toString();
    return new vscode.Range(
        new vscode.Position(elem.loc.start.line-1, elem.loc.start.column),
        new vscode.Position(elem.loc.start.line-1, elem.loc.start.column+name.length)
    );
}

class SolidityCodeLensProvider  {
    constructor(g_workspace, cb_analyze) {
        this.g_workspace = g_workspace;
        this.cb_analyze = cb_analyze;
    }

    async provideCodeLenses(document, token) {
        let codeLens = [];
        let firstLine = new vscode.Range(0, 0, 0, 0);

        //kick-off analysis even though this might be overlapping :/ we'll fix that later
        await this.cb_analyze(token, document);
        
        /** top level lenses */
        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.surya.mdreport',
                    title: 'report'
                }
            )
        );
        /*  does not yet return values but writes to console
        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.surya.describe',
                    title: 'describe',
                    arguments: [document.uri.fsPath]
                }
            )
        )
        */
        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.surya.graph',
                    title: 'graph (this)',
                    arguments: [document, [document.uri.fsPath]]
                }
            )
        );
        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.surya.graph',
                    title: 'graph',
                    arguments: [document]  //auto-loads all parsed files
                }
            )
        );
        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.surya.inheritance',
                    title: 'inheritance',
                    arguments: [document]
                }
            )
        );
        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.surya.parse',
                    title: 'parse',
                    arguments: [document]
                }
            )
        );

        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.tools.flaterra',
                    title: 'flatten',
                    arguments: [document]
                }
            )
        );

        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.tools.function.signatures',
                    title: 'funcSigs',
                    arguments: [document]
                }
            )
        );

        let parser = this.g_workspace.sourceUnits[document.uri.fsPath];
        if(!parser) {
            console.warn("[ERR] parser was not ready while adding codelenses. omitting contract specific lenses.");
            return codeLens;
        }

        codeLens.push(new vscode.CodeLens(firstLine, {
            command: 'solidity-va.uml.contract.outline',
            title: 'uml',
            arguments: [document, Object.values(parser.contracts)]
            })
        );

        if(settings.extensionConfig().codelens.drawio.enable){
            codeLens.push(new vscode.CodeLens(firstLine, {
                command: 'solidity-va.uml.contract.export.drawio.csv',
                title: 'draw.io',
                arguments: [document, Object.values(parser.contracts)]
                })
            );
        }

        let annotateContractTypes = ["contract","library", "abstract"];
        /** all contract decls */
        for(let contractObj of Object.values(parser.contracts)){
            if(token.isCancellationRequested){
                return [];
            }

            if(annotateContractTypes.indexOf(contractObj._node.kind)>=0){
                codeLens = codeLens.concat(this.onContractDecl(document,contractObj));

                /** all function decls */
                for(let funcObj of contractObj.functions){
                    codeLens = codeLens.concat(this.onFunctionDecl(document, contractObj.name, funcObj));
                }
            } else if (contractObj._node.kind == "interface"){
                // add uml to interface
                let item = contractObj;
                codeLens.push(new vscode.CodeLens(elemLocToRange(item._node), {
                    command: 'solidity-va.uml.contract.outline',
                    title: 'uml',
                    arguments: [document, [item]]
                    })
                );
            }
        }
        return codeLens;
    }

    onContractDecl(document, item) {
        let lenses = [];
        let range = elemLocToRange(item._node);

        lenses.push(new vscode.CodeLens(range, {
            command: 'solidity-va.test.createTemplate',
            title: 'UnitTest stub',
            arguments: [document, item.name]
            })
        );
        
        lenses.push(new vscode.CodeLens(range, {
            command: 'solidity-va.surya.dependencies',
            title: 'dependencies',
            arguments: [document, item.name, []]
            })
        );

        lenses.push(new vscode.CodeLens(range, {
            command: 'solidity-va.uml.contract.outline',
            title: 'uml',
            arguments: [document, [item]]
            })
        );

        if(settings.extensionConfig().codelens.drawio.enable){
            lenses.push(new vscode.CodeLens(range, {
                command: 'solidity-va.uml.contract.export.drawio.csv',
                title: 'draw.io',
                arguments: [document, [item]]
                })
            );
        }
        
        return lenses;
    }

    onFunctionDecl(document, contractName, item) {
        let lenses = [];
        let range = elemLocToRange(item._node);

        lenses.push(new vscode.CodeLens(range, {
            command: 'solidity-va.surya.ftrace',
            title: 'ftrace',
            arguments: [document, contractName, item._node.name, "all"]
            })
        );

        lenses.push(new vscode.CodeLens(range, {
            command: 'solidity-va.tools.function.signatureForAstItem',
            title: 'funcSig',
            arguments: [item]
            })
        );

        return lenses;
    }
}

module.exports = {
    SolidityCodeLensProvider:SolidityCodeLensProvider
};
