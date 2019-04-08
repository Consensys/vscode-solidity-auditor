'use strict'
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */

const vscode = require('vscode');
const fs = require('fs')
const settings = require('../settings')

const mod_templates = require('./templates');
const surya = require('surya')


class Commands{

    constructor(g_parser){
        this.g_parser = g_parser
    }

    _checkIsSolidity(document){
        if(document.languageId!=settings.languageId){
            vscode.window.showErrorMessage(`[Solidity VA] not a solidity source file ${vscode.window.activeTextEditor.document.uri.path}`)
            throw new Error("not a solidity file")
        }
    }
    
    async generateUnittestStubForContract(document, contractName){
        this._checkIsSolidity(document)

        let content = mod_templates.generateUnittestStubForContract(document, this.g_parser, contractName)

        vscode.workspace.openTextDocument({content: content, language: "javascript"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
    }

    async surya(document, command, args){
        // run surya and maybe return output in new window
        this._checkIsSolidity(document)  // throws
    
        let ret;
        let files = [document.uri.path, ...Object.keys(this.g_parser.sourceUnits)]  //better only add imported files. need to resolve that somehow

        switch(command) {
            case "describe":
                ret = surya.describe(files)
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
                break;
            case "graph":
                ret = surya.graph(args || files)

                vscode.workspace.openTextDocument({content: ret, language: "dot"})
                    .then(doc => {
                        try {
                            vscode.commands.executeCommand("graphviz.previewToSide", doc.uri)  // togles view. preferred
                            return
                        } catch {}
                        //command not available. fallback open as text and try graphviz.showPreview
                        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                            .then(editor => {
                                try {
                                    vscode.commands.executeCommand("graphviz.showPreview", editor)  // creates new pane
                                    .then(resolve => {
                                        //kill the prevs panel? does not work?
                                    })
                                    return
                                } catch {}
                                //command not available
                                
                            })
                    })
                /*
                vscode.env.openExternal(vscode.Uri.file("/Users/tintin/workspace/vscode/solidity-auditor/images/icon.png"))
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
                    */
                break;
            case "inheritance":
                ret = surya.inheritance(files,{draggable:false})
                vscode.workspace.openTextDocument({content: ret, language: "dot"})
                    .then(doc => {
                        try {
                            vscode.commands.executeCommand("graphviz.previewToSide", doc.uri)  // togles view. preferred
                            return
                        } catch {}
                        //command not available. fallback open as text and try graphviz.showPreview
                        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                            .then(editor => {
                                try {
                                    vscode.commands.executeCommand("graphviz.showPreview", editor)  // creates new pane
                                    .then(resolve => {
                                        //kill the prevs panel? does not work?
                                    })
                                    return
                                } catch {}
                                //command not available
                                
                            })
                    })
                    /*
                let draggable = surya.inheritance(files,{draggable:true})
                console.error(draggable)
                createWebViewBesides('imgPreview','imgPreview',draggable)
                */
                break;
            case "parse":
                ret = surya.parse(document.uri.path)
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
                break;
            case "dependencies":
                ret = surya.dependencies(files, args[0])
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
                break;
            case "ftrace":
                ret = surya.ftrace(args[0]+"::"+args[1], "all", files)
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
                break;
            case "mdreport":
                ret = surya.mdreport(files)
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => {
                        try {
                            vscode.commands.executeCommand("markdown-preview-enhanced.openPreview", doc.uri)  // togles view. preferred
                            return
                        } catch {}
                        //command not available. fallback open as text
                        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                    })
                break;
            default:
              // code block
        }
    }

    async findTopLevelContracts(files, scanfiles){
        var that = this;
        var dependencies={}
        if(!scanfiles){
            await vscode.workspace.findFiles("**/*.sol",'**/node_modules', 500)
                .then((solfiles) => {
                    solfiles.forEach(function(solfile){
                        try {
                            let content = fs.readFileSync(solfile.path).toString('utf-8')
                            let sourceUnit = that.g_parser.parseSourceUnit(content)
                            for(let contractName in sourceUnit.contracts){
                                dependencies[contractName] = sourceUnit.contracts[contractName].dependencies
                            }
                        } catch {

                        }
                    });
                });
        } else {
            //files not set: take loaded sourceUnits from this.g_parser
            //files set: only take these sourceUnits
            for(let contractName in that.g_parser.contracts){
                dependencies[contractName] = sourceUnit.contracts[contractName].dependencies
            }
        }
        
        var depnames = [].concat.apply([], Object.values(dependencies));

        let topLevelContracts = Object.keys(dependencies).filter(function (i) {
            return depnames.indexOf(i) === -1;
        });

        let content = `
Top Level Contracts
===================

${topLevelContracts.join("\n")}`
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
        }
        
}


module.exports = {
    Commands:Commands
}