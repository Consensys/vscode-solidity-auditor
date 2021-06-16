'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
/** imports */
const vscode = require('vscode');
const {CancellationTokenSource} = require('vscode');
const path = require('path');

//const mod_codelens = require('./features/codelens');
const mod_hover = require('./features/hover');
const mod_decorator = require('./features/deco');
const {SolidityDocumentSymbolProvider, getAstValueForExpression} = require('./features/symbols');
const {SolidityParser} = require('./features/parser');
const mod_parser = require('./features/parser');
const {DiliDiagnosticCollection} = require('./features/genericDiag');
const {Commands} = require('./features/commands');
const {SolidityCodeLensProvider} = require('./features/codelens');
const settings = require('./settings');
const {Cockpit} = require('./features/cockpit.js');
const {SolidityReferenceProvider} = require('./features/references');

const {WhatsNewHandler} = require('./features/whatsnew/whatsNew');


/** globals - const */
const languageId = settings.languageId;
const docSelector = settings.docSelector;

const g_parser = new SolidityParser();
var activeEditor;
var g_diagnostics;


const currentCancellationTokens = {
    onDidChange: new CancellationTokenSource(),
    onDidSave: new CancellationTokenSource()
};

const ScopeEnum = {
    STATE: 1,  // declared satevar
    ARGUMENT: 2,  // declared in arguments
    RETURNS: 3,  // declared in returns
    LOCAL: 4,  // function body,
    INHERITED: 5 // inherited
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

async function setDecorations(editor, decorations){
    if (!editor) {
        return;
    }
    let deco_map = {};

    for (var styleKey in mod_decorator.styles) {
        deco_map[styleKey] = [];
    }

    decorations.forEach(function(deco){
        deco_map[deco.decoStyle].push(deco);
    });

    for (let styleKey in deco_map){
        editor.setDecorations(mod_decorator.styles[styleKey], deco_map[styleKey]);
    }
}




/*** EVENTS *********************************************** */

function onInitModules(context, type){
    mod_decorator.init(context);

    //globals init
    g_diagnostics = new DiliDiagnosticCollection(context, vscode.workspace.rootPath);
}

/** func decs */

function checkReservedIdentifiers(identifiers){
    let decorations = [];
    if (!identifiers) {
        return decorations;
    }

    let prefix = "**BUILTIN-RESERVED**  ❗RESERVED KEYWORD❗";
    let decoStyle = "decoStyleLightOrange";
    let decl_uri = "[more info..](https://solidity.readthedocs.io/en/latest/miscellaneous.html#reserved-keywords)";
    

    if(typeof identifiers.forEach!=="function"){
        identifiers = Object.values(identifiers);
    }
    identifiers.forEach(function(ident){
        if(mod_parser.reservedKeywords.indexOf(ident.name)>=0){
            decorations.push(
                { 
                    range: new vscode.Range(
                        new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                        new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                        ),
                        hoverMessage: prefix + "**" + ident.name + '**' + " (" + decl_uri + ")",
                    decoStyle: decoStyle
                });
        }
    });
    return decorations;
}

function analyzeSourceUnit(cancellationToken, document, editor){
    console.log("inspect ...");

    if(!document){
        console.error("-BUG- cannot analyze empty document!");
        return;
    }

    var insights = g_parser.inspect(
        document.getText(),
        document.fileName, 
        false, 
        cancellationToken);
    console.log("✓ inspect");

    if(cancellationToken.isCancellationRequested){
        //abort - new analysis running already
        return;
    }

    console.log("linearize ...");
    var inheritance = g_parser.linearizeContract(insights);
    console.log("✓ linearize");

    if(cancellationToken.isCancellationRequested){
        //abort - new analysis running already
        return;
    }

    let currentConfig = settings.extensionConfig();
    let shouldDecorate = currentConfig.deco.statevars || currentConfig.deco.arguments || currentConfig.deco.warn.reserved;  

    if (shouldDecorate && editor) {
        var decorations = [];

        for (var contract in insights.contracts) {
            console.log("+ in contract: " + contract);

            console.log("resolve inheritance..");
            //merge all contracts into one
            inheritance[contract].forEach(contractName => {
                //var subcontract = g_contracts[contractName];
                var subcontract = g_parser.contracts[contractName];
                if(typeof subcontract=="undefined"){
                    console.error("ERROR - contract object not available "+ contractName);
                    return;
                }

                for (let _var in subcontract.stateVars){
                    if (subcontract.stateVars[_var].visibility!="private") {
                        insights.contracts[contract].inherited_names[_var] = contractName;
                    }
                }
                for (let _var in subcontract.functions){
                    if (subcontract.functions[_var].visibility!="private") {
                        insights.contracts[contract].inherited_names[_var] = contractName;
                    }
                }
                for (let _var in subcontract.events){
                    if (subcontract.events[_var].visibility!="private") {
                        insights.contracts[contract].inherited_names[_var] = contractName;
                    }
                }
                for (let _var in subcontract.modifiers){
                    if (subcontract.modifiers[_var].visibility!="private") {
                        insights.contracts[contract].inherited_names[_var] = contractName;
                    }
                }
                for (let _var in subcontract.enums){
                    if (subcontract.enums[_var].visibility!="private") {
                        insights.contracts[contract].inherited_names[_var] = contractName;
                    }
                }
                for (let _var in subcontract.structs){
                    if (subcontract.structs[_var].visibility!="private") {
                        insights.contracts[contract].inherited_names[_var] = contractName;
                    }
                }
                for (let _var in subcontract.mappings){
                    if (subcontract.mappings[_var].visibility!="private") {
                        insights.contracts[contract].inherited_names[_var] = contractName;
                    }
                }
            });
            console.log("✓ resolve inheritance");

            /** todo fixme: rework */
            for (var stateVar in insights.contracts[contract].stateVars) {
                let svar = insights.contracts[contract].stateVars[stateVar];
                // only statevars that are not const
                //check for shadowing

                //get occurences from identifiers
                var prefix = "";
                let knownValue = "";
                var decoStyle = "decoStyleBoxedLightBlue";

                //const commentCommandUri = vscode.Uri.parse(`command:editor.action.addCommentLine`);
                //text.push("[Add comment](${commentCommandUri})")
                //let decl_uri = "([Declaration]("+activeEditor.document.fileName+":"+(svar.loc.start.line+1)+":"+svar.loc.start.column+"))"
                let decl_uri = "([Declaration: #"+(svar.loc.start.line)+"]("+document.uri+"#"+(svar.loc.start.line)+"))";

                if(svar.isDeclaredConst){
                    prefix = "**CONST**  " ;
                    decoStyle = "decoStyleLightGreen";
                    knownValue = getAstValueForExpression(svar.expression);
                    knownValue = knownValue ? ` = **${knownValue}** ` : '';
                }



                currentConfig.deco.statevars && decorations.push({ 
                        range: new vscode.Range(
                            new vscode.Position(svar.loc.start.line-1, svar.loc.start.column),
                            new vscode.Position(svar.loc.end.line-1, svar.loc.end.column+svar.name.length)
                            ),
                        hoverMessage: prefix + "(*"+ (svar.typeName.type=="ElementaryTypeName"?svar.typeName.name:svar.typeName.namePath) +"*) " +'StateVar *' + contract + "*.**"+svar.name + '**',
                        decoStyle: decoStyle
                });
                

                //console.log("--annoate idents--")
                /*** annotate all identifiers */
                //console.log(svar.usedAt)
                svar.usedAt.forEach(ident => {
                    //check shadow in local declaration
                    if(typeof ident.inFunction.declarations[ident.name]=="undefined"){
                        // no local declaration. annotate as statevar
                        currentConfig.deco.statevars && decorations.push(
                            { 
                                range: new vscode.Range(
                                    new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                    new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                    ),
                                    hoverMessage: prefix + "(*"+ (svar.typeName.type=="ElementaryTypeName"?svar.typeName.name:svar.typeName.namePath) +"*) " +'**StateVar** *' + contract + "*.**"+svar.name + '**' + knownValue + " "+decl_uri,
                                decoStyle: decoStyle
                            });
                    } else {
                        //shadowed!
                        console.log("SHADOWED STATEVAR --> "+ident.name);
                        decoStyle = "decoStyleLightOrange";
                        prefix += "❗SHADOWED❗";
                        currentConfig.deco.statevars && decorations.push({ 
                            range: new vscode.Range(
                                new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                ),
                                hoverMessage: prefix + "(*"+ (svar.typeName.type=="ElementaryTypeName"?svar.typeName.name:svar.typeName.namePath) +"*) " +'**StateVar** *' + contract + "*.**"+svar.name + '**'+ " "+decl_uri,
                            decoStyle: decoStyle
                        });
                        //declaration
                        let declaration = ident.inFunction.declarations[ident.name];
                        currentConfig.deco.statevars && decorations.push({ 
                            range: new vscode.Range(
                                new vscode.Position(declaration.loc.start.line-1, declaration.loc.start.column),
                                new vscode.Position(declaration.loc.end.line-1, declaration.loc.end.column+ident.name.length)
                                ),
                            hoverMessage: prefix + "(*"+ (svar.typeName.type=="ElementaryTypeName"?svar.typeName.name:svar.typeName.namePath) +"*) " +'**StateVar** **' + svar.name + '**',
                            decoStyle: decoStyle
                        });
                    }
                });
            }
            console.log("✓ decorate scope");

            /*** inherited vars */
            /** have to get all identifiers :// */
            /** fixme ugly hack ... */
            for (let functionName in insights.contracts[contract].functions){
                //all functions
                let highlightIdentifiers = [];

                insights.contracts[contract].functions[functionName].identifiers.forEach(ident => {
                    if (ident.name === undefined) {
                        return;
                    }  //skip assemblyCall has no attrib .name
                    // all idents in function
                    let is_state_var = typeof insights.contracts[contract].stateVars[ident.name]!="undefined";
                    let is_declared_locally = typeof ident.inFunction.declarations[ident.name]!="undefined";
                    let is_declared_locally_arguments = typeof ident.inFunction.arguments[ident.name]!="undefined";
                    let is_declared_locally_returns = typeof ident.inFunction.returns[ident.name]!="undefined";
                    let is_inherited = typeof insights.contracts[contract].inherited_names[ident.name]!="undefined" && insights.contracts[contract].inherited_names[ident.name]!=contract;

                    if(is_declared_locally){
                        //set scope identifier
                        if(is_declared_locally_arguments){
                            ident.scope=ScopeEnum.ARGUMENT;
                            ident.scopeRef = ident.inFunction.arguments[ident.name];
                            highlightIdentifiers.push(ident); // .scope, .scopeRef and .inFunction is known.
                        } else if(is_declared_locally_returns){
                            ident.scope=ScopeEnum.RETURNS;
                            ident.scopeRef = ident.inFunction.returns[ident.name];
                        }else{
                            ident.scope=ScopeEnum.LOCAL;
                            ident.scopeRef = ident.inFunction.declarations[ident.name];
                        }
                        
                        
                        if(is_state_var){
                            //shadowed staevar
                            console.log("!!!! shadowed statevar");
                            //is handled in the other loop
                        }else if(is_inherited){
                            //shadoewed inherited var
                            console.log("!!!!! shadowed derived var");
                            prefix = "**INHERITED**  ❗SHADOWED❗";
                            decoStyle = "decoStyleLightOrange";
                            let subcontract =  insights.contracts[contract].inherited_names[ident.name];
                            let decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+document.uri+"#"+(ident.loc.start.line)+"))";

                            currentConfig.deco.statevars && decorations.push(
                                { 
                                    range: new vscode.Range(
                                        new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                        new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                        ),
                                        hoverMessage: prefix + "(*"+ "undef" +"*) " +'**StateVar** *' + subcontract + "*.**"+ident.name + '**' + " "+decl_uri,
                                    decoStyle: decoStyle
                                });
                        }else {
                            //all good
                            // is declared locally
                        }
                    } else if(is_state_var){
                        ident.scope=ScopeEnum.STATE;
                        ident.scopeRef = insights.contracts[contract].stateVars[ident.name];

                        if(is_inherited){
                            //shadowed inherited var
                            console.log("!!! statevar shadows inherited");
                            console.log("!!!!! shadowed derived var");
                            prefix = "**INHERITED**  ❗SHADOWED❗";
                            decoStyle = "decoStyleLightOrange";
                            let subcontract =  insights.contracts[contract].inherited_names[ident.name];
                            let decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+document.uri+"#"+(ident.loc.start.line)+"))";

                            currentConfig.deco.statevars && decorations.push(
                                { 
                                    range: new vscode.Range(
                                        new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                        new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                        ),
                                        hoverMessage: prefix + "(*"+ "undef" +"*) " +'**StateVar** *' + subcontract + "*.**"+ident.name + '**' + " "+decl_uri,
                                    decoStyle: decoStyle
                                });
                        } else {
                            //all good statevar
                            // should be covered by the other loop already
                        }
                    } else if (is_inherited){
                        ident.scope=ScopeEnum.INHERITED;
                        ident.scopeRef = insights.contracts[contract].inherited_names[ident.name];
                        // inherited
                        prefix = "**INHERITED**  ";
                        decoStyle = "decoStyleLightBlue";
                        let subcontract =  insights.contracts[contract].inherited_names[ident.name];
                        let decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+document.uri+"#"+(ident.loc.start.line)+"))";

                        currentConfig.deco.statevars && decorations.push(
                            { 
                                range: new vscode.Range(
                                    new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                    new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                    ),
                                    hoverMessage: prefix + "(*"+ "undef" +"*) " +'**StateVar** *' + subcontract + "*.**"+ident.name + '**' + " "+decl_uri,
                                decoStyle: decoStyle
                            });
                    } else {
                        //function calls etc.. fallthru
                        
                    }
                    //annotate external calls?
                });
                if (settings.extensionConfig().deco.arguments) {
                    decorations = decorations.concat(mod_decorator.semanticHighlightFunctionParameters(highlightIdentifiers));
                }

                if (settings.extensionConfig().deco.warn.reserved){
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].functions[functionName].identifiers));
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].functions[functionName].arguments));
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].functions[functionName].returns));
                }
            }
            //decorate modifiers (fixme copy pasta)
            for (let functionName in insights.contracts[contract].modifiers){
                //all modifiers
                let highlightIdentifiers = [];
                insights.contracts[contract].modifiers[functionName].identifiers.forEach(ident => {
                    if (ident.name === undefined) {
                        return;
                    }  //skip assemblyCall has no attrib .name
                    // all idents in function
                    let is_state_var = typeof insights.contracts[contract].stateVars[ident.name]!="undefined";
                    let is_declared_locally = typeof ident.inFunction.declarations[ident.name]!="undefined";
                    let is_declared_locally_arguments = typeof ident.inFunction.arguments[ident.name]!="undefined";
                    let is_declared_locally_returns = typeof ident.inFunction.returns[ident.name]!="undefined";
                    let is_inherited = typeof insights.contracts[contract].inherited_names[ident.name]!="undefined" && insights.contracts[contract].inherited_names[ident.name]!=contract;

                    let prefix = "";

                    if(is_declared_locally){
                        //set scope identifier
                        if(is_declared_locally_arguments){
                            ident.scope=ScopeEnum.ARGUMENT;
                            ident.scopeRef = ident.inFunction.arguments[ident.name];
                            highlightIdentifiers.push(ident); // .scope, .scopeRef and .inFunction is known.
                        } else if(is_declared_locally_returns){
                            ident.scope=ScopeEnum.RETURNS;
                            ident.scopeRef = ident.inFunction.returns[ident.name];
                        }else{
                            ident.scope=ScopeEnum.LOCAL;
                            ident.scopeRef = ident.inFunction.declarations[ident.name];
                        }
                        
                        
                        if(is_state_var){
                            //shadowed staevar
                            console.log("!!!!! shadowed derived var");
                            prefix = "**INHERITED**  ❗SHADOWED❗";
                            decoStyle = "decoStyleLightOrange";
                            let subcontract =  insights.contracts[contract].inherited_names[ident.name];
                            let decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+document.uri+"#"+(ident.loc.start.line)+"))";

                            currentConfig.deco.statevars && decorations.push(
                                { 
                                    range: new vscode.Range(
                                        new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                        new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                        ),
                                        hoverMessage: prefix + "(*"+ "undef" +"*) " +'**StateVar** *' + subcontract + "*.**"+ident.name + '**' + " "+decl_uri,
                                    decoStyle: decoStyle
                                });
                
                            //is handled in the other loop
                        }else if(is_inherited){
                            //shadoewed inherited var
                            console.log("!!!!! shadowed derived var");
                            prefix = "**INHERITED**  ❗SHADOWED❗";
                            decoStyle = "decoStyleLightOrange";
                            let subcontract =  insights.contracts[contract].inherited_names[ident.name];
                            let decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+document.uri+"#"+(ident.loc.start.line)+"))";

                            currentConfig.deco.statevars && decorations.push(
                                { 
                                    range: new vscode.Range(
                                        new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                        new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                        ),
                                        hoverMessage: prefix + "(*"+ "undef" +"*) " +'**StateVar** *' + subcontract + "*.**"+ident.name + '**' + " "+decl_uri,
                                    decoStyle: decoStyle
                                });
                        }else {
                            //all good
                            // is declared locally
                        }
                    } else if(is_state_var){
                        ident.scope=ScopeEnum.STATE;
                        ident.scopeRef = insights.contracts[contract].stateVars[ident.name];

                        if(is_inherited){
                            //shadowed inherited var
                            console.log("!!! statevar shadows inherited");
                            console.log("!!!!! shadowed derived var");
                            prefix = "**INHERITED**  ❗SHADOWED❗";
                            decoStyle = "decoStyleLightOrange";
                            let subcontract =  insights.contracts[contract].inherited_names[ident.name];
                            let decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+document.uri+"#"+(ident.loc.start.line)+"))";

                            currentConfig.deco.statevars && decorations.push(
                                { 
                                    range: new vscode.Range(
                                        new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                        new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                        ),
                                        hoverMessage: prefix + "(*"+ "undef" +"*) " +'**StateVar** *' + subcontract + "*.**"+ident.name + '**' + " "+decl_uri,
                                    decoStyle: decoStyle
                                });
                        } else {
                            //all good statevar
                            // should be covered by the other loop already
                            if(ident.scopeRef.isDeclaredConst){
                                prefix = "**CONST**  ";
                                decoStyle = "decoStyleLightGreen";
                            } else {
                                decoStyle = "decoStyleBoxedLightBlue";
                            } 
                            let decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+document.uri+"#"+(ident.loc.start.line)+"))";

                            currentConfig.deco.statevars && decorations.push(
                                { 
                                    range: new vscode.Range(
                                        new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                        new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                        ),
                                        hoverMessage: prefix + "(*"+ (ident.type) +"*) " +'**StateVar** *' + contract + "*.**"+ident.name + '**' + " "+decl_uri,
                                    decoStyle: decoStyle
                            });

                        }
                    } else if (is_inherited){
                        ident.scope=ScopeEnum.INHERITED;
                        ident.scopeRef = insights.contracts[contract].inherited_names[ident.name];
                        // inherited
                        prefix = "**INHERITED**  ";
                        decoStyle = "decoStyleLightBlue";
                        let subcontract =  insights.contracts[contract].inherited_names[ident.name];
                        let decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+document.uri+"#"+(ident.loc.start.line)+"))";
                        
                        currentConfig.deco.statevars && decorations.push(
                            { 
                                range: new vscode.Range(
                                    new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                    new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                    ),
                                    hoverMessage: prefix + "(*"+ "undef" +"*) " +'**StateVar** *' + subcontract + "*.**"+ident.name + '**' + " "+decl_uri,
                                decoStyle: decoStyle
                            });
                    } else {
                        //function calls etc.. fallthru
                        
                    }
                    //annotate external calls?
                });
                if (settings.extensionConfig().deco.arguments) {
                    decorations = decorations.concat(mod_decorator.semanticHighlightFunctionParameters(highlightIdentifiers));
                }

                if (settings.extensionConfig().deco.warn.reserved){
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].modifiers[functionName].identifiers));
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].modifiers[functionName].arguments));
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].modifiers[functionName].returns));
                }
                    
            }
            //decorate events
            for (var functionName in insights.contracts[contract].events){
                if (settings.extensionConfig().deco.warn.reserved){
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].events[functionName].identifiers));
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].events[functionName].arguments));
                    decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].events[functionName].returns));
                }
            }
            console.log("✓ decorate scope (new) - identifier ");
        }
        console.log("✓ decorate scope done ");
        if(cancellationToken.isCancellationRequested){
            //abort - new analysis running already
            return;
        }

    
        setDecorations(editor, decorations);
        console.log("✓ apply decorations - scope");
    }
    console.log("✓ analyzeSourceUnit - done");
}

/** events */

function onDidSave(document){
    currentCancellationTokens.onDidSave.dispose();
    currentCancellationTokens.onDidSave = new CancellationTokenSource();
    // check if there are any 
    if(settings.extensionConfig().diagnostics.cdili_json.import && g_diagnostics){
        g_diagnostics.updateIssues(currentCancellationTokens.onDidSave.token);
    }

}

function onDidChange(editor){
    let document = editor && editor.document ? editor.document : vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : undefined;
    if(!document){
        console.warn("change event on non-document");
        return;
    }
    if(document.languageId!=languageId){
        console.log("ondidchange: wrong langid");
        return;
    }
    currentCancellationTokens.onDidChange.dispose();
    currentCancellationTokens.onDidChange = new CancellationTokenSource();
    console.log("--- on-did-change");
    try{
        analyzeSourceUnit(currentCancellationTokens.onDidChange.token, document, editor);
    } catch (err){
        if (typeof err !== "object"){ //CancellationToken
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
        
        if(!settings.extensionConfig().mode.active){
            console.log("ⓘ activate extension: entering passive mode. not registering any active code augmentation support.");
            return;
        }
        /** module init */
        onInitModules(context, type);
        onDidChange();

        let commands = new Commands(g_parser);
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
                'solidity-va.test.hardhat.createTemplate', 
                function (doc, contractName) {
                    commands.generateHardhatUnittestStubForContract(doc || vscode.window.activeTextEditor.document, contractName);
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
                    if(files && typeof files[0] === "object" && files[0].hasOwnProperty("children")){
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
                'solidity-va.surya.graphSimple', 
                function (doc, files) {
                    if(files && typeof files[0] === "object" && files[0].hasOwnProperty("children")){
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
                    commands.solidityFlattener([doc.uri || vscode.window.activeTextEditor.document.uri]);
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.cockpit.explorer.context.flatten', 
                async function (treeItem, multiSelectTreeItems) {
                    multiSelectTreeItems = multiSelectTreeItems || [];
                    [...multiSelectTreeItems, treeItem].forEach(async treeItem => {
                        await vscode.extensions
                        .getExtension('tintinweb.vscode-solidity-flattener')
                        .activate()
                        .then(
                            async () => {
                                vscode.commands
                                    .executeCommand('vscode-solidity-flattener.contextMenu.flatten', [], [treeItem.resource])
                                    .then(async (done) => {});
                            });
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
                        obj[path.basename(item.path,".sol")] = vscode.Uri.file(item.path);
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
                if(multiSelectTreeItems){
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
                        if(range) {
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
            if(editor && editor.document &&  editor.document.languageId==type){
                onDidChange(editor);
            }
        }, null, context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(event => {
            if (activeEditor && event.document === activeEditor.document && event.document.languageId==type) {
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
                    return mod_hover.provideHoverHandler(document, position, token, type, g_parser);
                }
            })
        );
        
        /** experimental */
        if(settings.extensionConfig().outline.enable){
            context.subscriptions.push(
                vscode.languages.registerDocumentSymbolProvider(
                    docSel, 
                    new SolidityDocumentSymbolProvider(g_parser, analyzeSourceUnit/* TODO hack hack hack move the inheritance part to parser*/)
                )
            );
        }
        
        if(settings.extensionConfig().codelens.enable){
            context.subscriptions.push(
                vscode.languages.registerCodeLensProvider(
                    docSel,
                    new SolidityCodeLensProvider(g_parser, analyzeSourceUnit)
                )
            );
        }

        if(settings.extensionConfig().findAllReferences.enable){
            context.subscriptions.push(
                vscode.languages.registerReferenceProvider(
                    docSel, 
                    new SolidityReferenceProvider()
                )
            );
        }
    }
}

/* exports */
exports.activate = onActivate;