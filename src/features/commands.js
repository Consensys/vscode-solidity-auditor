'use strict'
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */

const vscode = require('vscode');
const fs = require('fs')
const child_process = require('child_process');
const path = require('path')

const settings = require('../settings')

const mod_templates = require('./templates');
const mod_utils = require('./utils.js')

const surya = require('surya')

const solidityVAConfig = vscode.workspace.getConfiguration('solidity-va');


function runCommand(cmd, args, env, cwd, stdin){
    cwd = cwd || vscode.workspace.rootPath;

    return new Promise((resolve, reject) => {
        console.log(`running command: ${cmd} ${args.join(" ")}`);
        let p = child_process.execFile(cmd, args, { env: env, cwd: cwd }, (err, stdout, stderr) => {
            p.stdout.on('data', function(data) {
                if(stdin){
                    p.stdin.setEncoding('utf-8');
                    p.stdin.write(stdin);
                    p.stdin.end()
                }
            })
            if(err===null || err.code === 0){
                console.log("success")
                return resolve(err)
            }
            err.stderr = stderr
            return reject(err)
        })
    })
}


class Commands{

    constructor(g_parser){
        this.g_parser = g_parser
    }

    _checkIsSolidity(document){
        if(!document || document.languageId!=settings.languageId){
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

        let files;

        if(solidityVAConfig.tools.surya.input.contracts=="workspace"){
            await vscode.workspace.findFiles("**/*.sol",'**/node_modules', 500)
                .then(uris => {
                    files = uris.map(function (uri) {
                        return uri.path
                    });
                })
        } else {
            files = [document.uri.path, ...Object.keys(this.g_parser.sourceUnits)]  //better only add imported files. need to resolve that somehow
        } 

        switch(command) {
            case "describe":
                ret = surya.describe(files)
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
                break;
            case "graph":
                ret = surya.graph(args || files)
                //solidity-va.preview.render.markdown
                vscode.workspace.openTextDocument({content: ret, language: "dot"})
                    .then(doc => {
                        if(solidityVAConfig.preview.dot){
                            vscode.commands.executeCommand("graphviz.previewToSide", doc.uri)
                            .catch(error => {
                                //command not available. fallback open as text and try graphviz.showPreview
                                vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                                    .then(editor => {
                                        vscode.commands.executeCommand("graphviz.showPreview", editor)  // creates new pane
                                            .catch(error => {
                                                //command not available - do nothing
                                            })
                                    })
                            })
                        } else {
                            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                        }
                        
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
                        if(solidityVAConfig.preview.dot){
                            vscode.commands.executeCommand("graphviz.previewToSide", doc.uri)
                            .catch(error => {
                                //command not available. fallback open as text and try graphviz.showPreview
                                vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                                    .then(editor => {
                                        vscode.commands.executeCommand("graphviz.showPreview", editor)  // creates new pane
                                            .catch(error => {
                                                //command not available - do nothing
                                            })
                                    })
                            })
                        } else {
                            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                        }
                        
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
                        if(solidityVAConfig.preview.markdown){
                            vscode.commands.executeCommand("markdown-preview-enhanced.openPreview", doc.uri)
                                .catch(error => {
                                    //command does not exist
                                    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                                        .then(editor => {
                                            vscode.commands.executeCommand("markdown.extension.togglePreview")
                                            .catch(error => {
                                                //command does not exist
                                            })
                                        })
                                })
                        } else {
                            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                        }
                        //command not available. fallback open as text
                    })
                break;
            default:
              // code block
        }
    }

    async _findTopLevelContracts(files, scanfiles){
        var that = this;
        var dependencies={}
        var contractToFile={}
        if(!scanfiles){
            await vscode.workspace.findFiles("**/*.sol",'**/node_modules', 500)
                .then((solfiles) => {
                    solfiles.forEach(function(solfile){
                        try {
                            let content = fs.readFileSync(solfile.path).toString('utf-8')
                            let sourceUnit = that.g_parser.parseSourceUnit(content)
                            for(let contractName in sourceUnit.contracts){
                                dependencies[contractName] = sourceUnit.contracts[contractName].dependencies
                                contractToFile[contractName] = solfile
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

        let ret = {}
        topLevelContracts.forEach(contractName => {
            ret[contractName] = contractToFile[contractName]
        })
        return ret
    }

    async findTopLevelContracts(files, scanfiles){
        let topLevelContracts = await this._findTopLevelContracts(files, scanfiles);

        let topLevelContractsText = Object.keys(topLevelContracts).join('\n')
        /*
        for (var name in topLevelContracts) {
            topLevelContractsText += name + ' (' + topLevelContracts[name]+')\n';
        }
        */

        let content = `
Top Level Contracts
===================

${topLevelContractsText}`
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
    }
        
    async flaterra(documentOrUri, noTryInstall){
        let docUri = documentOrUri;
        if(documentOrUri.hasOwnProperty("uri")){
            this._checkIsSolidity(documentOrUri)
            docUri = documentOrUri.uri
        }
        

        let cmd = "python3"
        let args = ["-m", "flaterra", "--contract", vscode.workspace.asRelativePath(docUri)]


        runCommand(cmd, args)
            .then(
                (success) =>{
                    vscode.window.showInformationMessage(`Contract flattened: ${path.basename(docUri.path,".sol")}_flat.sol`)
                },
                (err) => {
                    if(err.code === 'ENOENT'){
                        vscode.window.showErrorMessage("'`flaterra` failed with error: unable to execute python3")
                    } else if (err.stderr.indexOf(": No module named flaterra")>=0){
                        if(!noTryInstall){
                            vscode.window.showWarningMessage('Contract Flattener `flaterra` is not installed.\n run `pip3 install flaterra --user` to install? ', 'Install')
                                .then(selection => {
                                    console.log(selection);
                                    if(selection=="Install"){
                                        runCommand("pip3", ["install", "flaterra", "--user"], undefined, undefined, "y\n")
                                            .then(
                                                (success) =>{
                                                vscode.window.showInformationMessage("Successfully installed flaterra.")
                                                this.flaterra(documentOrUri, true)
                                                },
                                                (error) => {
                                                    vscode.window.showErrorMessage("Failed to install flaterra.")
                                                }
                                            )
                                            .catch(err =>{
                                                vscode.window.showErrorMessage("Failed to install flaterra. " + err)
                                            })
                                    } else {
                                        // do not retry
                                    }
                                });
                            }
                    } else {
                        vscode.window.showErrorMessage('`flaterra` failed with: ' + err)
                            .then(selection => {
                                console.log(selection);
                            });
                    }
                })
            .catch(err => {
                    console.log("runcommand threw exception: "+ err)
            })    
    }

    async flattenCandidates(){
        let topLevelContracts = await this._findTopLevelContracts()
        let content = ""
        for(let name in topLevelContracts){
            this.flaterra(new vscode.Uri(topLevelContracts[name]))
            content += name + "  =>  " + topLevelContracts[name] + "\n"
        }
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
    }

    async listFunctionSignatures(document, asJson){
        let sighashes = mod_utils.functionSignatureExtractor(document.getText())
        let content
        if(asJson){
            content = JSON.stringify(sighashes)
        } else {
            content = "Sighash   |   Function Signature\n========================\n"
            for(let hash in sighashes){
                content += hash + "  =>  " + sighashes[hash] + "\n"
            }
        }
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
    }
}



module.exports = {
    Commands:Commands
}