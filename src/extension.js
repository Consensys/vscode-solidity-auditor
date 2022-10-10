'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
 * 
 * */
/** imports */
const vscode = require('vscode');
const { CancellationTokenSource } = require('vscode');
const path = require('path');

//const mod_codelens = require('./features/codelens');
const mod_hover = require('./features/hover');
const mod_decorator = require('./features/deco');
const { SolidityDocumentSymbolProvider, getAstValueForExpression } = require('./features/symbols');
const mod_parser = require('solidity-workspace');
const { DiliDiagnosticCollection } = require('./features/genericDiag');
const { Commands } = require('./features/commands');
const { SolidityCodeLensProvider } = require('./features/codelens');
const settings = require('./settings');
const { Cockpit } = require('./features/cockpit.js');
const { SolidityReferenceProvider } = require('./features/references');

const { WhatsNewHandler } = require('./features/whatsnew/whatsNew');

/** globals - const */
const languageId = settings.languageId;
const docSelector = settings.docSelector;

const g_workspace = new mod_parser.Workspace(vscode.workspace.workspaceFolders.map(wf => wf.uri.fsPath));
var activeEditor;
var g_diagnostics;


const currentCancellationTokens = {
    onDidChange: new CancellationTokenSource(),
    onDidSave: new CancellationTokenSource()
};


/** helper */

function editorJumptoRange(editor, range) {
    let revealType = vscode.TextEditorRevealType.InCenter;
    let selection = new vscode.Selection(range.start.line, range.start.character, range.end.line, range.end.character);
    if (range.start.line === editor.selection.active.line) {
        revealType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
    }

    editor.selection = selection;
    editor.revealRange(selection, revealType);
}

async function setDecorations(editor, decorations) {
    if (!editor) {
        return;
    }
    let deco_map = {};

    for (var styleKey in mod_decorator.styles) {
        deco_map[styleKey] = [];
    }

    decorations.forEach(function (deco) {
        deco_map[deco.decoStyle].push(deco);
    });

    for (let styleKey in deco_map) {
        editor.setDecorations(mod_decorator.styles[styleKey], deco_map[styleKey]);
    }
}



/*** EVENTS *********************************************** */

function onInitModules(context, type) {
    mod_decorator.init(context);

    //globals init
    g_diagnostics = new DiliDiagnosticCollection(context, vscode.workspace.rootPath);
}

/** func decs */

function checkReservedIdentifiers(identifiers) {
    let decorations = [];
    if (!identifiers) {
        return decorations;
    }

    if (typeof identifiers.forEach !== "function") {
        identifiers = Object.values(identifiers);
    }
    identifiers.forEach(function (ident) {
        if (mod_parser.RESERVED_KEYWORDS.indexOf(ident.name) >= 0) {
            decorations.push(mod_decorator.CreateDecoStyle.reserved(ident));
        }
    });
    return decorations;
}

function analyzeSourceUnit(cancellationToken, document, editor) {
    console.log("inspect ...");

    if (!document) {
        console.error("-BUG- cannot analyze empty document!");
        return;
    }

    try {
        g_workspace.add(document.fileName, { content: document.getText()}).then(
            (sourceUnit) => {
                console.log(`✓ inspect ${sourceUnit.filePath}`);
            }
        ).catch(e => {
            console.warn(`Error adding file or one of its dependencies to workspace (parser error): ${document.fileName}`);
            if(settings.extensionConfig().debug.parser.showExceptions){
                console.error(e);
            }
        });
    } catch (e){
        console.warn(`Error adding file or one of its dependencies to workspace (parser error): ${document.fileName}`);
        if(settings.extensionConfig().debug.parser.showExceptions){
            console.error(e);
        }
    }
    

    g_workspace.withParserReady().then((finished) => {

        console.log("✓ workspace ready (linearized, resolved deps, ..)");
        
        if (cancellationToken.isCancellationRequested || !finished.some(fp => fp.value && fp.value.filePath === document.fileName)) {
            //abort - new analysis running already OR our finished task is not in the tasklist :/
            return;
        }

        let currentConfig = settings.extensionConfig();
        let shouldDecorate = currentConfig.deco.statevars || currentConfig.deco.arguments || currentConfig.deco.warn.reserved;

        if (shouldDecorate && editor) {
            var decorations = [];

            let this_sourceUnit = g_workspace.get(document.fileName);

            console.log("+ (decorate) in sourceunit: " + this_sourceUnit.filePath);

            if (settings.extensionConfig().deco.warn.externalCalls) {
                decorations = decorations.concat(this_sourceUnit.getExternalCalls().map(c => {
                    return mod_decorator.CreateDecoStyle.extCall(c._node);
                }));
                console.log("✓ highlight external calls");
            }


            for (var contract of Object.values(this_sourceUnit.contracts)) {
                console.log("+ in contract: " + contract.name);
                console.log("resolve inheritance..");
                //merge all contracts into one
                contract.linearizedDependencies.forEach(subcontract => {
                    if(!subcontract || typeof subcontract !== "object") {
                        console.error("ERROR - contract object not available " + contract.name);
                        return;
                    }
                    if (subcontract.name == contract.name) {
                        return; //skip self
                    }
                    if (subcontract._node.kind === "interface"){
                        return; //skip inherited names from interfaces
                    }
                    
                    for (let _var in subcontract.stateVars) {
                        if (subcontract.stateVars[_var].visibility != "private") {
                            contract.inherited_names[_var] = subcontract;
                        }
                    }
                    for (let _var of subcontract.functions) {
                        if (_var._node.visibility != "private") {
                            contract.inherited_names[_var.name] = subcontract;
                        }
                    }
                    for (let _var of subcontract.events) {
                        if (_var._node.visibility != "private") {
                            contract.inherited_names[_var.name] = subcontract;
                        }
                    }
                    for (let _var in subcontract.modifiers) {
                        if (subcontract.modifiers[_var].visibility != "private") {
                            contract.inherited_names[_var] = subcontract;
                        }
                    }
                    for (let _var in subcontract.enums) {
                        if (subcontract.enums[_var].visibility != "private") {
                            contract.inherited_names[_var] = subcontract;
                        }
                    }
                    for (let _var in subcontract.structs) {
                        if (subcontract.structs[_var].visibility != "private") {
                            contract.inherited_names[_var] = subcontract;
                        }
                    }
                    for (let _var in subcontract.mappings) {
                        if (subcontract.mappings[_var].visibility != "private") {
                            contract.inherited_names[_var] = subcontract;
                        }
                    }
                    
                });
                console.log("✓ resolve inheritance");

                /** todo fixme: rework */
                if(currentConfig.deco.statevars) {
                    for (var stateVar in contract.stateVars) {
                        let svar = contract.stateVars[stateVar];
                        //check for shadowing
                        decorations.push(mod_decorator.CreateDecoStyle.stateVarDecl(svar, document, contract));
    
                        /*** annotate all identifiers */
                        //console.log(svar.usedAt)
                        svar.extra.usedAt.forEach(ident => {
                            //check shadow in local declaration
                            if (typeof ident.extra.inFunction.declarations[ident.name] == "undefined") {
                                // no local declaration. annotate as statevar
                                decorations.push(mod_decorator.CreateDecoStyle.stateVarIdent(ident, document, contract, svar));
                            } else {
                                //shadowed!
                                console.log("SHADOWED STATEVAR --> " + ident.name);
                                decorations.push(mod_decorator.CreateDecoStyle.shadowedStateVar(ident, document, contract, svar));
                                //declaration
                                let declaration = ident.extra.inFunction.declarations[ident.name];
                                decorations.push(mod_decorator.CreateDecoStyle.shadowedStateVar(declaration, document, contract, svar));
    
                            }
                        });
                    }
                    console.log("✓ decorate scope");
                

                    /*** inherited vars */
                    /** have to get all identifiers :// */
                    /** fixme ugly hack ... */
                    for (let func of contract.functions) {
                        //all functions
                        let highlightIdentifiers = [];

                        func.identifiers.forEach(ident => {
                            if (ident.name === undefined) {
                                return;
                            }  //skip assemblyCall has no attrib .name
                            // all idents in function

                            const is_declared_locally = !!ident.extra.inFunction.declarations[ident.name];
                            const is_state_var = !!contract.stateVars[ident.name];
                            const is_inherited = !!(contract.inherited_names[ident.name] && contract.inherited_names[ident.name] != contract);

                            if (is_declared_locally && !is_inherited && !is_state_var) {
                                // local declaration
                                switch (ident.extra.scope) {
                                    case "argument":
                                    case "super":
                                        highlightIdentifiers.push(ident);
                                        break;
                                    case "returns":
                                    case "body":
                                        break;
                                    case "storageRef":
                                        decorations.push(mod_decorator.CreateDecoStyle.stateVarIdent(ident, document, contract, ident.extra.declaration));
                                        break;
                                    case "stateVar":
                                        console.log("!!!! shadowed statevar"); // handled in a previous loop already
                                        break;
                                    case "inheritedName":
                                        console.log("!!!!! shadowed derived var");
                                        decorations.push(mod_decorator.CreateDecoStyle.shadowedInheritedStateVar(ident, document, contract));
                                        break;
                                    default:
                                        break;
                                }
                            } else if (is_declared_locally && is_inherited) {
                                console.log("!!!!! shadowed derived var");
                                decorations.push(mod_decorator.CreateDecoStyle.shadowedInheritedStateVar(ident, document, contract));
                            } else if (is_state_var && is_inherited) {
                                // no local declaration -> direct use of stateVar
                                //shadowed inherited var
                                console.log("!!! statevar shadows inherited");
                                console.log("!!!!! shadowed derived var");
                                decorations.push(mod_decorator.CreateDecoStyle.shadowedInheritedStateVar(ident, document, contract));
                            } else if (is_inherited) {
                                // normal inherited var
                                decorations.push(mod_decorator.CreateDecoStyle.inheritedStateVar(ident, document, contract));
                            }
                            //annotate external calls?
                        });
                        if (settings.extensionConfig().deco.arguments) {
                            decorations = decorations.concat(mod_decorator.semanticHighlightFunctionParameters(highlightIdentifiers));
                        }

                        if (settings.extensionConfig().deco.warn.reserved) {
                            decorations = decorations.concat(checkReservedIdentifiers(func.identifiers));
                            decorations = decorations.concat(checkReservedIdentifiers(func.arguments));
                            decorations = decorations.concat(checkReservedIdentifiers(func.returns));
                        }
                    }
                    //decorate modifiers (fixme copy pasta)
                    for (let functionName in contract.modifiers) {
                        //all modifiers
                        let highlightIdentifiers = [];
                        contract.modifiers[functionName].identifiers.forEach(ident => {
                            if (ident.name === undefined) {
                                return;
                            }  //skip assemblyCall has no attrib .name

                            const is_declared_locally = !!ident.extra.inFunction.declarations[ident.name];
                            const is_state_var = !!contract.stateVars[ident.name];
                            const is_inherited = !!(contract.inherited_names[ident.name] && contract.inherited_names[ident.name] != contract);

                            if (is_declared_locally && !is_inherited && !is_state_var) {
                                // local declaration
                                switch (ident.extra.scope) {
                                    case "argument":
                                        highlightIdentifiers.push(ident);
                                        break;
                                    case "returns":
                                    case "body":
                                        break;
                                    case "storageRef":
                                        decorations.push(mod_decorator.CreateDecoStyle.stateVarIdent(ident, document, contract, ident.extra.declaration));
                                        break;
                                    case "stateVar":
                                        console.log("!!!! shadowed statevar"); // handled in a previous loop already
                                        break;
                                    case "inheritedName":
                                        console.log("!!!!! shadowed derived var");
                                        decorations.push(mod_decorator.CreateDecoStyle.shadowedInheritedStateVar(ident, document, contract));
                                        break;
                                    default:
                                        break;
                                }
                            } else if (is_declared_locally && is_inherited) {
                                console.log("!!!!! shadowed derived var");
                                decorations.push(mod_decorator.CreateDecoStyle.shadowedInheritedStateVar(ident, document, contract));
                            } else if (is_state_var && is_inherited) {
                                // no local declaration -> direct use of stateVar
                                //shadowed inherited var
                                console.log("!!! statevar shadows inherited");
                                console.log("!!!!! shadowed derived var");
                                decorations.push(mod_decorator.CreateDecoStyle.shadowedInheritedStateVar(ident, document, contract));
                            } else if (is_inherited) {
                                // normal inherited var
                                decorations.push(mod_decorator.CreateDecoStyle.inheritedStateVar(ident, document, contract));
                            }

                            //annotate external calls?
                        });
                        if (settings.extensionConfig().deco.arguments ) {
                            decorations = decorations.concat(mod_decorator.semanticHighlightFunctionParameters(highlightIdentifiers));
                        }

                        if (settings.extensionConfig().deco.warn.reserved) {
                            decorations = decorations.concat(checkReservedIdentifiers(contract.modifiers[functionName].identifiers));
                            decorations = decorations.concat(checkReservedIdentifiers(contract.modifiers[functionName].arguments));
                            decorations = decorations.concat(checkReservedIdentifiers(contract.modifiers[functionName].returns));
                        }

                    }
                    //decorate events
                    for (var eventDef of contract.events) {
                        if (settings.extensionConfig().deco.warn.reserved) {
                            decorations = decorations.concat(checkReservedIdentifiers(eventDef.arguments));
                        }
                    }
                    console.log("✓ decorate scope (new) - identifier ");
                }
            }
            console.log("✓ decorate scope done ");
            if (cancellationToken.isCancellationRequested) {
                //abort - new analysis running already
                return;
            }


            setDecorations(editor, decorations);
            console.log("✓ apply decorations - scope");
        }
        console.log("✓ analyzeSourceUnit - done");

    });
}

/** events */

function onDidSave(document) {
    currentCancellationTokens.onDidSave.dispose();
    currentCancellationTokens.onDidSave = new CancellationTokenSource();
    // check if there are any 
    if (settings.extensionConfig().diagnostics.cdili_json.import && g_diagnostics) {
        g_diagnostics.updateIssues(currentCancellationTokens.onDidSave.token);
    }

}

function onDidChange(editor) {
    let document = editor && editor.document ? editor.document : vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : undefined;
    if (!document) {
        console.warn("change event on non-document");
        return;
    }
    if (document.languageId != languageId) {
        console.log("ondidchange: wrong langid");
        return;
    }
    currentCancellationTokens.onDidChange.dispose();
    currentCancellationTokens.onDidChange = new CancellationTokenSource();
    console.log("--- on-did-change");
    try {
        analyzeSourceUnit(currentCancellationTokens.onDidChange.token, document, editor);
    } catch (err) {
        if (typeof err !== "object") { //CancellationToken
            throw err;
        }
    }

    console.log("✓✓✓ on-did-change - resolved");
}

function onActivate(context) {

    activeEditor = vscode.window.activeTextEditor;

    console.log("onActivate");

    registerDocType(languageId, docSelector);

    new WhatsNewHandler().show(context);

    async function registerDocType(type, docSel) {
        context.subscriptions.push(
            vscode.languages.reg
        );

        if (!settings.extensionConfig().mode.active) {
            console.log("ⓘ activate extension: entering passive mode. not registering any active code augmentation support.");
            return;
        }
        /** module init */
        onInitModules(context, type);
        onDidChange();

        let commands = new Commands(g_workspace);
        let cockpit = new Cockpit(commands);

        /** command setup */
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.whatsNew.show',
                function () {
                    new WhatsNewHandler().showMessage(context);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.test.createTemplate',
                function (doc, contractName) {
                    commands.generateUnittestStubForContract(doc || vscode.window.activeTextEditor.document, contractName);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.mdreport',
                function (doc, multiSelectTreeItems) {
                    doc = multiSelectTreeItems || doc;
                    commands.surya(doc || vscode.window.activeTextEditor.document, "mdreport");
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.graph',
                function (doc, files) {
                    if (files && typeof files[0] === "object" && files[0].hasOwnProperty("children")) {
                        //treeItem or fspaths
                        doc = files;
                        files = undefined;
                    }
                    commands.surya(doc || vscode.window.activeTextEditor.document, "graph", files);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.graphThis',
                function () {
                    commands.surya(vscode.window.activeTextEditor.document, "graph", [vscode.window.activeTextEditor.document.uri.fsPath]);
                }
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.graphSimple',
                function (doc, files) {
                    if (files && typeof files[0] === "object" && files[0].hasOwnProperty("children")) {
                        //treeItem or fspaths
                        doc = files;
                        files = undefined;
                    }
                    commands.surya(doc || vscode.window.activeTextEditor.document, "graphSimple", files);
                }
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.inheritance',
                function (doc, multiSelectTreeItems) {
                    doc = multiSelectTreeItems || doc;
                    commands.surya(doc || vscode.window.activeTextEditor.document, "inheritance");
                }
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.parse',
                function (doc) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "parse");
                }
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.dependencies',
                function (doc, ContractName) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "dependencies", [ContractName]);
                }
            )
        );
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.ftrace',
                function (doc, contractName, functionName, mode) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "ftrace", [contractName, functionName, mode]);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.insights.topLevelContracts',
                function () {
                    commands.findTopLevelContracts();
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.flaterra',
                function (doc) {
                    commands.solidityFlattener([doc && doc.uri || vscode.window.activeTextEditor.document.uri]);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.cockpit.explorer.context.flatten',
                async function (treeItem, multiSelectTreeItems) {
                    multiSelectTreeItems = multiSelectTreeItems || [];
                    [...multiSelectTreeItems, treeItem].forEach(async treeItem => {
                        commands.solidityFlattener([treeItem.resource]);
                        /*
                        await vscode.extensions
                            .getExtension('tintinweb.vscode-solidity-flattener')
                            .activate()
                            .then(
                                async () => {
                                    vscode.commands
                                        .executeCommand('vscode-solidity-flattener.contextMenu.flatten', [], [treeItem.resource])
                                        .then(async (done) => { });
                                });
                        */
                    });
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.flattenCandidates',
                function () {
                    commands.flattenCandidates();
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.cockpit.topLevelContracts.flatten',
                function () {
                    let sourceFiles = cockpit.views.topLevelContracts.dataProvider.data.reduce(function (obj, item) {
                        obj[path.basename(item.path, ".sol")] = vscode.Uri.file(item.path);
                        return obj;
                    }, {});
                    commands.flattenCandidates(sourceFiles);
                    cockpit.views.flatFiles.refresh();
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.function.signatures',
                function (doc, asJson) {
                    commands.listFunctionSignatures(doc || vscode.window.activeTextEditor.document, asJson);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.function.signatures.json',
                function (doc) {
                    commands.listFunctionSignatures(doc || vscode.window.activeTextEditor.document, true);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.function.signatures.forWorkspace.json',
                function (doc) {
                    commands.listFunctionSignaturesForWorkspace(true);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.function.signatureForAstItem',
                function (item) {
                    commands.listFunctionSignatureForAstItem(item);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.remix.openExternal',
                function () {
                    vscode.env.openExternal(vscode.Uri.parse("https://remix.ethereum.org"));
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.uml.contract.outline',
                function (doc, contractObjects) {
                    commands.umlContractsOutline(contractObjects);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.uml.contract.export.drawio.csv',
                function (doc, contractObjects) {
                    commands.drawioContractsOutlineAsCSV(contractObjects);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand("solidity-va.cockpit.topLevelContracts.refresh", async (treeItem, multiSelectTreeItems) => {
                if (multiSelectTreeItems) {
                    cockpit.views.topLevelContracts.refresh(multiSelectTreeItems.filter(t => !t.path.endsWith(".sol")).map(t => t.path));
                } else {
                    cockpit.views.topLevelContracts.refresh(treeItem && treeItem.path);
                }
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand("solidity-va.cockpit.explorer.refresh", async () => {
                cockpit.views.explorer.refresh();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand("solidity-va.cockpit.flatFiles.refresh", async () => {
                cockpit.views.flatFiles.refresh();
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand("solidity-va.cockpit.jumpToRange", (documentUri, range) => {
                vscode.workspace.openTextDocument(documentUri).then(doc => {
                    vscode.window.showTextDocument(doc).then(editor => {
                        if (range) {
                            editorJumptoRange(editor, range);
                        }
                    });
                });
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand("solidity-va.cockpit.settings.toggle", async (treeItem) => {
                let cfg = vscode.workspace.getConfiguration(treeItem.metadata.extension);
                let current = cfg.get(treeItem.metadata.section);
                await cfg.update(treeItem.metadata.section, !current);
                cockpit.views.settings.refresh();
            })
        );

        /** event setup */
        /***** DidChange */
        vscode.window.onDidChangeActiveTextEditor(editor => {
            activeEditor = editor;
            if (editor && editor.document && editor.document.languageId == type) {
                onDidChange(editor);
            }
        }, null, context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(event => {
            if (activeEditor && event.document === activeEditor.document && event.document.languageId == type) {
                onDidChange(activeEditor);
            }
        }, null, context.subscriptions);

        /***** OnSave */
        vscode.workspace.onDidSaveTextDocument(document => {
            onDidSave(document);
        }, null, context.subscriptions);

        /****** OnOpen */
        vscode.workspace.onDidOpenTextDocument(document => {
            onDidSave(document);
        }, null, context.subscriptions);

        /****** onDidChangeTextEditorSelection */
        vscode.window.onDidChangeTextEditorSelection(event /* TextEditorVisibleRangesChangeEvent */ => {
            cockpit.onDidSelectionChange(event); // let cockpit handle the event
        }, null, context.subscriptions);


        context.subscriptions.push(
            vscode.languages.registerHoverProvider(type, {
                provideHover(document, position, token) {
                    return mod_hover.provideHoverHandler(document, position, token, type, g_workspace);
                }
            })
        );

        /** experimental */
        if (settings.extensionConfig().outline.enable) {
            context.subscriptions.push(
                vscode.languages.registerDocumentSymbolProvider(
                    docSel,
                    new SolidityDocumentSymbolProvider(g_workspace, analyzeSourceUnit/* TODO hack hack hack move the inheritance part to parser*/)
                )
            );
        }

        if (settings.extensionConfig().codelens.enable) {
            context.subscriptions.push(
                vscode.languages.registerCodeLensProvider(
                    docSel,
                    new SolidityCodeLensProvider(g_workspace, analyzeSourceUnit)
                )
            );
        }

        if (settings.extensionConfig().findAllReferences.enable) {
            context.subscriptions.push(
                vscode.languages.registerReferenceProvider(
                    docSel,
                    new SolidityReferenceProvider()
                )
            );
        }

        /**
         * trigger decorations for visible editors
         */
        vscode.window.visibleTextEditors.map(editor => {
            if (editor && editor.document && editor.document.languageId == type) {
                onDidChange(editor);
            }
        });
    }
}

/* exports */
exports.activate = onActivate;