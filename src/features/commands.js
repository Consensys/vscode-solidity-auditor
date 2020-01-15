'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */

const vscode = require('vscode');
const fs = require('fs');
const child_process = require('child_process');
const path = require('path');

const settings = require('../settings');

const mod_templates = require('./templates');
const mod_utils = require('./utils.js');
const mod_symbols = require('./symbols.js');

const surya = require('surya');

const solidityVAConfig = vscode.workspace.getConfiguration('solidity-va');

const suryaDefaultColorSchemeDark = {
    digraph : {
      bgcolor: "#2e3e56",
      nodeAttribs : {
        style:"filled",
        fillcolor:"#edad56",
        color:"#edad56",
        penwidth:"3"
      },
      edgeAttribs : {
        color:"#fcfcfc", 
        penwidth:"2", 
        fontname:"helvetica Neue Ultra Light"
      }
    },
    visibility : {
      isFilled: true,
      public: "#FF9797",
      external: "#ffbdb9",
      private: "#edad56",
      internal: "#f2c383",
    },
    nodeType : {
      isFilled: false,
      shape: "doubleoctagon",
      modifier: "#1bc6a6",
      payable: "brown",
    },
    call : {
      default: "white",
      regular: "#1bc6a6",
      this: "#80e097"
    },
    contract : {
      defined: {
        bgcolor: "#445773",
        color: "#445773",
        fontcolor:"#f0f0f0",
        style: "rounded"
      },
      undefined: {
        bgcolor: "#3b4b63",
        color: "#e8726d",
        fontcolor: "#f0f0f0",
        style: "rounded,dashed"
      }
    }
  
  };


function runCommand(cmd, args, env, cwd, stdin){
    cwd = cwd || vscode.workspace.rootPath;

    return new Promise((resolve, reject) => {
        console.log(`running command: ${cmd} ${args.join(" ")}`);
        let p = child_process.execFile(cmd, args, { env: env, cwd: cwd }, (err, stdout, stderr) => {
            p.stdout.on('data', function(data) {
                if(stdin){
                    p.stdin.setEncoding('utf-8');
                    p.stdin.write(stdin);
                    p.stdin.end();
                }
            });
            if(err===null || err.code === 0){
                console.log("success");
                return resolve(err);
            }
            err.stderr = stderr;
            return reject(err);
        });
    });
}

class Commands{

    constructor(g_parser) {
        this.g_parser = g_parser;
    }

    _checkIsSolidity(document) {
        if(!document || document.languageId!=settings.languageId){
            vscode.window.showErrorMessage(`[Solidity VA] not a solidity source file ${vscode.window.activeTextEditor.document.uri.fsPath}`);
            throw new Error("not a solidity file");
        }
    }
    
    async generateUnittestStubForContract(document, contractName) {
        this._checkIsSolidity(document);

        let content = mod_templates.generateUnittestStubForContract(document, this.g_parser, contractName);

        vscode.workspace.openTextDocument({content: content, language: "javascript"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
    }

    async surya(document, command, args) {
        // run surya and maybe return output in new window
        this._checkIsSolidity(document);  // throws
    
        let ret;

        let files;

        if(solidityVAConfig.tools.surya.input.contracts=="workspace"){
            await vscode.workspace.findFiles("**/*.sol",'**/node_modules', 500)
                .then(uris => {
                    files = uris.map(function (uri) {
                        return uri.fsPath;
                    });
                });
        } else {
            files = [document.uri.fsPath, ...Object.keys(this.g_parser.sourceUnits)];  //better only add imported files. need to resolve that somehow
        } 

        switch(command) {
            case "describe":
                ret = surya.describe(files, {}, true);
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                break;
            case "graph":
                ret = surya.graph(args || files, {colorScheme: suryaDefaultColorSchemeDark});
                //solidity-va.preview.render.markdown
                vscode.workspace.openTextDocument({content: ret, language: "dot"})
                    .then(doc => {
                        if(solidityVAConfig.preview.dot){
                            vscode.commands.executeCommand("interactive-graphviz.preview.beside", {document: doc, content:ret, callback:null})
                            .catch(error =>{
                                vscode.commands.executeCommand("graphviz.previewToSide", doc.uri)
                                .catch(error => {
                                    //command not available. fallback open as text and try graphviz.showPreview
                                    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                                        .then(editor => {
                                            vscode.commands.executeCommand("graphviz.showPreview", editor)  // creates new pane
                                                .catch(error => {
                                                    //command not available - do nothing
                                                });
                                        });
                                });
                            });
                        } else {
                            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                        }
                        
                    });
                /*
                vscode.env.openExternal(vscode.Uri.file("/Users/tintin/workspace/vscode/solidity-auditor/images/icon.png"))
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
                    */
                break;
            case "inheritance":
                ret = surya.inheritance(files,{draggable:false});
                vscode.workspace.openTextDocument({content: ret, language: "dot"})
                    .then(doc => {
                        if(solidityVAConfig.preview.dot){
                            vscode.commands.executeCommand("interactive-graphviz.preview.beside", {document: doc, content:ret, callback:null})
                            .catch(error =>{
                                vscode.commands.executeCommand("graphviz.previewToSide", doc.uri)
                                .catch(error => {
                                    //command not available. fallback open as text and try graphviz.showPreview
                                    vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                                        .then(editor => {
                                            vscode.commands.executeCommand("graphviz.showPreview", editor)  // creates new pane
                                                .catch(error => {
                                                    //command not available - do nothing
                                                });
                                        });
                                });
                            });
                        } else {
                            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                        }
                        
                    });
                    /*
                let draggable = surya.inheritance(files,{draggable:true})
                console.error(draggable)
                createWebViewBesides('imgPreview','imgPreview',draggable)
                */
                break;
            case "parse":
                ret = surya.parse(document.uri.fsPath);
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                break;
            case "dependencies":
                ret = surya.dependencies(files, args[0]);

                let outTxt = [];

                if(ret){
                    outTxt.push(ret[0]);
                
                    if (ret.length < 2) {
                        outTxt = ['No Dependencies Found'];
                    }
                    else {
                        ret.shift();
                        const reducer = (accumulator, currentValue) => `${accumulator}\n  ↖ ${currentValue}`;
                        outTxt.push(`  ↖ ${ret.reduce(reducer)}`);
                    }
                    

                    vscode.workspace.openTextDocument({content: outTxt.join("\n"), language: "markdown"})
                        .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                }
                break;
            case "ftrace":
                //  contract::func, all, files 
                if (args[1] === null){
                    args[1] =  "<Constructor>";
                } else if (args[1] === ""){
                    args[1] = "<Fallback>";
                }

                ret = surya.ftrace(args[0] + "::" + args[1], args[2] || 'all', files, {}, true);
                vscode.workspace.openTextDocument({content: ret, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
                break;
            case "mdreport":
                ret = surya.mdreport(files);
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
                                            });
                                        });
                                });
                        } else {
                            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
                        }
                        //command not available. fallback open as text
                    });
                break;
            default:
              // code block
        }
    }

    async _findTopLevelContracts(files, scanfiles) {
        var that = this;
        var dependencies={};
        var contractToFile={};
        if(!scanfiles){
            await vscode.workspace.findFiles("**/*.sol",'{**/node_modules,**/mock*,**/test*,**/migrations,**/Migrations.sol,**/flat_*.sol}', 500)
                .then((solfiles) => {
                    solfiles.forEach(function(solfile){
                        try {
                            let content = fs.readFileSync(solfile.path).toString('utf-8');
                            let sourceUnit = that.g_parser.parseSourceUnit(content);
                            for(let contractName in sourceUnit.contracts){
                                dependencies[contractName] = sourceUnit.contracts[contractName].dependencies;
                                contractToFile[contractName] = solfile;
                            }
                        } catch (e) {

                        }
                    });
                });
        } else {
            //files not set: take loaded sourceUnits from this.g_parser
            //files set: only take these sourceUnits
            for(let contractName in this.g_parser.contracts){
                dependencies[contractName] = this.g_parser.contracts[contractName].dependencies;
            }
        }
        
        var depnames = [].concat.apply([], Object.values(dependencies));

        let topLevelContracts = Object.keys(dependencies).filter(function (i) {
            return depnames.indexOf(i) === -1;
        });

        let ret = {};
        topLevelContracts.forEach(contractName => {
            ret[contractName] = contractToFile[contractName];
        });
        return ret;
    }

    async findTopLevelContracts(files, scanfiles) {
        let topLevelContracts = await this._findTopLevelContracts(files, scanfiles);

        let topLevelContractsText = Object.keys(topLevelContracts).join('\n');
        /*
        for (var name in topLevelContracts) {
            topLevelContractsText += name + ' (' + topLevelContracts[name]+')\n';
        }
        */

        let content = `
Top Level Contracts
===================

${topLevelContractsText}`;
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
    }

    async solidityFlattener(files, callback, showErrors) {

        vscode.extensions.getExtension("tintinweb.vscode-solidity-flattener").activate().then(
            (active) => {
                vscode.commands.executeCommand("vscode-solidity-flattener.flatten", {files: files, callback:callback, showErrors:showErrors})
                    .catch(error =>{
                        // command not available
                        vscode.window.showWarningMessage("Error running `tintinweb.vscode-solidity-flattener`. Please make sure the extension is installed.\n" + error);
                    });
            },
            (err) => { throw new Error(`Solidity Auditor: Failed to activate "tintinweb.vscode-solidity-flattener". Make sure the extension is installed from the marketplace. Details: ${err}`); }
        );
    }
        
    async flaterra(documentOrUri, noTryInstall) {
        let docUri = documentOrUri;
        if(documentOrUri.hasOwnProperty("uri")){
            this._checkIsSolidity(documentOrUri);
            docUri = documentOrUri.uri;
        }
        

        let cmd = "python3";
        let args = ["-m", "flaterra", "--contract", vscode.workspace.asRelativePath(docUri)];


        runCommand(cmd, args)
            .then(
                (success) =>{
                    vscode.window.showInformationMessage(`Contract flattened: ${path.basename(docUri.fsPath,".sol")}_flat.sol`);
                },
                (err) => {
                    if(err.code === 'ENOENT'){
                        vscode.window.showErrorMessage("'`flaterra` failed with error: unable to execute python3");
                    } else if (err.stderr.indexOf(": No module named flaterra")>=0){
                        if(!noTryInstall){
                            vscode.window.showWarningMessage('Contract Flattener `flaterra` is not installed.\n run `pip3 install flaterra --user` to install? ', 'Install')
                                .then(selection => {
                                    console.log(selection);
                                    if(selection=="Install"){
                                        runCommand("pip3", ["install", "flaterra", "--user"], undefined, undefined, "y\n")
                                            .then(
                                                (success) =>{
                                                vscode.window.showInformationMessage("Successfully installed flaterra.");
                                                this.flaterra(documentOrUri, true);
                                                },
                                                (error) => {
                                                    vscode.window.showErrorMessage("Failed to install flaterra.");
                                                }
                                            )
                                            .catch(err =>{
                                                vscode.window.showErrorMessage("Failed to install flaterra. " + err);
                                            });
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
                    console.log("runcommand threw exception: "+ err);
            });    
    }

    async flattenCandidates() {
        let topLevelContracts = await this._findTopLevelContracts();
        let content = "";

        
        this.solidityFlattener(Object.values(topLevelContracts), (filepath, trufflepath, content) => {
            let outpath = path.parse(filepath);
        
            fs.writeFile(path.join(outpath.dir, "flat_" + outpath.base), content, function(err) {
                if(err) {
                    return console.log(err);
                }
            });
        });
        

        for(let name in topLevelContracts){
            //this.flaterra(new vscode.Uri(topLevelContracts[name]))
            let outpath = path.parse(topLevelContracts[name].path);
            content += name + "  =>  " + vscode.Uri.file(path.join(outpath.dir, "flat_" + outpath.base)) + "\n";
        }
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
    }

    async listFunctionSignatures(document, asJson) {
        let sighash_colls = mod_utils.functionSignatureExtractor(document.getText());
        let sighashes = sighash_colls.sighashes;

        if(sighash_colls.collisions.length){
            vscode.window.showErrorMessage('🔥 FuncSig collisions detected! ' + sighash_colls.collisions.join(","));
        }

        let content;
        if(asJson){
            content = JSON.stringify(sighashes);
        } else {
            content = "Sighash   |   Function Signature\n========================\n";
            for(let hash in sighashes){
                content += hash + "  =>  " + sighashes[hash] + "\n";
            }
            if(sighash_colls.collisions.length){
                content += "\n\n";
                content += "collisions 🔥🔥🔥                 \n========================\n";
                content += sighash_colls.collisions.join("\n");
            }
        }
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
    }

    async listFunctionSignaturesForWorkspace(asJson) {

        let sighashes = {};
        let collisions = [];

        await vscode.workspace.findFiles("**/*.sol",'**/node_modules', 500)
                .then(uris => {
                    uris.forEach(uri => {
                        try {
                            let sig_colls = mod_utils.functionSignatureExtractor(fs.readFileSync(uri.fsPath).toString('utf-8'));
                            collisions = collisions.concat(sig_colls.collisions);  //we're not yet checking sighash collisions across contracts

                            let currSigs = sig_colls.sighashes;
                            for(let k in currSigs){
                                sighashes[k]=currSigs[k];
                            }
                        } catch (e) {}
                    });
                });

        if(collisions.length){
            vscode.window.showErrorMessage('🔥 FuncSig collisions detected! ' + collisions.join(","));
        }

        let content;
        if(asJson){
            content = JSON.stringify(sighashes);
        } else {
            content = "Sighash   |   Function Signature\n========================  \n";
            for(let hash in sighashes){
                content += hash + "  =>  " + sighashes[hash] + "  \n";
            }
            if(collisions.length){
                content += "\n\n";
                content += "collisions 🔥🔥🔥                 \n========================\n";
                content += collisions.join("\n");
            }
        }
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
    }

    async listFunctionSignatureForAstItem(item, asJson) {

        let sighashes = mod_utils.functionSignatureFromAstNode(item);

        let content;
        if(asJson){
            content = JSON.stringify(sighashes);
        } else {
            content = "Sighash   |   Function Signature\n========================  \n";
            for(let hash in sighashes){
                content += hash + "  =>  " + sighashes[hash] + "  \n";
            }
        }
        vscode.workspace.openTextDocument({content: content, language: "markdown"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside));
    }

    async umlContractsOutline(contractObjects) {
        const stateMutabilityToIcon = {
            view:"🔍",
            pure:"🔍",
            constant:"🔍",
            payable:"💰"
        };

        const functionVisibility = { 
            "public": '+',
            "external": '+',  //~
            "internal": '#',  //mapped to protected; ot
            "private": '-' ,  
            "default": '+' // public
        };
        const variableVisibility = { 
            "public": '+',
            "external": '+',  //~
            "internal": '#',  //mapped to protected; ot
            "private": '-' ,  
            "default": "#"  // internal
        };
        const contractNameMapping = {
            "contract":"class",
            "interface":"interface",
            "library":"abstract"
        };

        function _mapAstFunctionName(name) {
            switch(name) {
                case null:
                    return "**__constructor__**";
                case "":
                    return "**__fallback__**";
                default:
                    return name;
            }
        }

        let content = `@startuml
' -- for auto-render install: https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml
' -- options --
${solidityVAConfig.uml.options}
${solidityVAConfig.uml.actors.enable ? "allowmixing": ""}

' -- classes --
`;

        content += contractObjects.reduce((umlTxt, contractObj) => {

            return umlTxt + `\n
${contractNameMapping[contractObj._node.kind] || "class"} ${contractObj.name} {
    ' -- inheritance --
${Object.values(contractObj.dependencies).reduce((txt, name) => {
        return txt + `\t{abstract}${name}\n`;
    },"")
}
    ' -- usingFor --
${Object.values(contractObj.usingFor).reduce((txt, astNode) => {
        return txt + `\t{abstract}📚${astNode.libraryName} for [[${mod_symbols.getVariableDeclarationType(astNode)}]]\n`;
    },"")
}
    ' -- vars --
${Object.values(contractObj.stateVars).reduce((umlSvarTxt, astNode) => {
        return umlSvarTxt + `\t${variableVisibility[astNode.visibility] || ""}${astNode.isDeclaredConst?"{static}":""}[[${mod_symbols.getVariableDeclarationType(astNode).replace(/\(/g,"").replace(/\)/g,"")}]] ${astNode.name}\n`;
    }, "")
}
    ' -- methods --
${Object.values(contractObj.functions).reduce((umlFuncTxt, funcObj) => {
        return umlFuncTxt + `\t${functionVisibility[funcObj._node.visibility] || ""}${stateMutabilityToIcon[funcObj._node.stateMutability]||""}${_mapAstFunctionName(funcObj._node.name)}()\n`;
    }, "")
}
}
`;
}, "");

        content += "' -- inheritance / usingFor --\n" + contractObjects.reduce((umlTxt, contractObj) => {
            return umlTxt
                + Object.values(contractObj.dependencies).reduce((txt, name) => {
                    return txt + `${contractObj.name} --[#DarkGoldenRod]|> ${name}\n`;
                }, "")
                +  Object.values(contractObj.usingFor).reduce((txt, astNode) => {
                    return txt + `${contractObj.name} ..[#DarkOliveGreen]|> ${astNode.libraryName} : //for ${mod_symbols.getVariableDeclarationType(astNode)}//\n`;
                }, "");
        }, "");


        if(solidityVAConfig.uml.actors.enable){
            //lets see if we can get actors as well :)

            let addresses = [];

            for (let contractObj of contractObjects) {
                addresses = addresses.concat(Object.values(contractObj.stateVars).filter(astNode => !astNode.isDeclaredConst && astNode.typeName.name =="address").map(astNode => astNode.name));
                for (let fidx in contractObj.functions){
                    let functionObj = contractObj.functions[fidx];
                    addresses = addresses.concat(Object.values(functionObj.arguments).filter(astNode => astNode.typeName.name =="address").map(astNode => astNode.name));
                }
            }

            let actors = [...new Set(addresses)];
            actors = actors.filter( item => {
                if (item === null) {
                    return false;
                }  // no nulls
                if (item.startsWith("_") && actors.indexOf(item.slice(1))) {
                    return false;
                }  // no _<name> dupes
                return true; 
                });

            content += `
' -- actors --
together {
${actors.reduce((txt, name) => txt + `\tactor ${name}\n`, "")}
}
`;
        }

        content += "\n@enduml";
        
        vscode.workspace.openTextDocument({content: content, language: "plantuml"})
            .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside)
                .then(editor => {
                    vscode.extensions.getExtension("jebbs.plantuml").activate().then(
                        (active) => {
                            vscode.commands.executeCommand("plantuml.preview")
                                .catch(error => {
                                    //command does not exist
                                });
                        },
                        (err) => { console.warn(`Solidity Auditor: Failed to activate "jebbs.plantuml". Make sure the extension is installed from the marketplace. Details: ${err}`); }
                    );
                })
            );
    }
}



module.exports = {
    Commands:Commands
};