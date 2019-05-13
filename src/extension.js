'use strict'
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
/** imports */
const vscode = require('vscode');
const {CancellationTokenSource} = require('vscode')

//const mod_codelens = require('./features/codelens');
const mod_hover = require('./features/hover');
const mod_decorator = require('./features/deco');
const {SolidityDocumentSymbolProvider} = require('./features/symbols')
const {SolidityReferenceProvider} = require('./features/references')
const {SolidityParser} = require('./features/parser')
const mod_parser = require('./features/parser')
const {DiliDiagnosticCollection} = require('./features/genericDiag')
const {Commands} = require('./features/commands');
const {SolidityCodeLensProvider} = require('./features/codelens')
const settings = require('./settings')


/** globals - const */
const languageId = settings.languageId;
const docSelector = settings.docSelector;
const solidityVAConfig = vscode.workspace.getConfiguration('solidity-va');

const g_parser = new SolidityParser()
var activeEditor;
var g_diagnostics;


const currentCancellationTokens = {
    onDidChange: new CancellationTokenSource(),
    onDidSave: new CancellationTokenSource()
}

const ScopeEnum = {
    STATE: 1,  // declared satevar
    ARGUMENT: 2,  // declared in arguments
    RETURNS: 3,  // declared in returns
    LOCAL: 4,  // function body,
    INHERITED: 5 // inherited
};

/** helper */

async function setDecorations(editor, decorations){
    if (!editor) {
        return;
    }
    let deco_map = {}

    for (var styleKey in mod_decorator.styles) {
        deco_map[styleKey] = new Array();
    }

    decorations.forEach(function(deco){
        deco_map[deco.decoStyle].push(deco)
    })

    for (let styleKey in deco_map){
        editor.setDecorations(mod_decorator.styles[styleKey], deco_map[styleKey]);
    }
}




/*** EVENTS *********************************************** */

function onInitModules(context, type){
    //mod_codelens.init(context, type, solidityVAConfig);
    mod_decorator.init(context, solidityVAConfig);

    //globals init
    g_diagnostics = new DiliDiagnosticCollection(context, vscode.workspace.rootPath)
}

/** func decs */

function checkReservedIdentifiers(identifiers){
    let decorations = new Array()
    if(!identifiers)
        return decorations

    let prefix = "**BUILTIN-RESERVED**  ❗RESERVED KEYWORD❗"
    let decoStyle = "decoStyleLightOrange";
    let decl_uri = "[more info..](https://solidity.readthedocs.io/en/latest/miscellaneous.html#reserved-keywords)"
    

    if(typeof identifiers.forEach!=="function"){
        identifiers = Object.values(identifiers)
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
    })
    return decorations;
}

function analyzeSourceUnit(cancellationToken, document){
    //mod_decorator.updateDecorations();
    console.log("inspect ...")
    //var insights = inspect(activeEditor.document.getText(), activeEditor.document.fileName);
    var insights = g_parser.inspect(
        document?document.getText():activeEditor.document.getText(), 
        document?document.fileName:activeEditor.document.fileName, 
        false, 
        cancellationToken)
    console.log("✓ inspect")

    if(cancellationToken.isCancellationRequested){
        //abort - new analysis running already
        return
    }

    console.log("linearize ...")
    var inheritance = g_parser.linearizeContract(insights)
    console.log("✓ linearize")

    var decorations = new Array();

    for (var contract in insights.contracts) {
        console.log("+ in contract: " + contract)

        console.log("resolve inheritance..")
        //merge all contracts into one
        inheritance[contract].forEach(function(contractName){
            //var subcontract = g_contracts[contractName];
            var subcontract = g_parser.contracts[contractName]
            if(typeof subcontract=="undefined"){
                console.error("ERROR - contract object not available "+ contractName)
                return
            }

            for (let _var in subcontract.stateVars){
                if(subcontract.stateVars[_var].visibility!="private")
                    insights.contracts[contract].inherited_names[_var] = contractName;
            }
            for (let _var in subcontract.functions){
                if(subcontract.functions[_var].visibility!="private")
                    insights.contracts[contract].inherited_names[_var] = contractName;
            }
            for (let _var in subcontract.events){
                if(subcontract.events[_var].visibility!="private")
                    insights.contracts[contract].inherited_names[_var] = contractName;
            }
            for (let _var in subcontract.modifiers){
                if(subcontract.modifiers[_var].visibility!="private")
                    insights.contracts[contract].inherited_names[_var] = contractName;
            }
            for (let _var in subcontract.enums){
                if(subcontract.enums[_var].visibility!="private")
                    insights.contracts[contract].inherited_names[_var] = contractName;
            }
            for (let _var in subcontract.structs){
                if(subcontract.structs[_var].visibility!="private")
                    insights.contracts[contract].inherited_names[_var] = contractName;
            }
            for (let _var in subcontract.mappings){
                if(subcontract.mappings[_var].visibility!="private")
                    insights.contracts[contract].inherited_names[_var] = contractName;
            }
        })
        console.log("✓ resolve inheritance")

        /** todo fixme: rework */
        for (var stateVar in insights.contracts[contract].stateVars) {
            let svar = insights.contracts[contract].stateVars[stateVar];
            // only statevars that are not const
            //check for shadowing

            //get occurences from identifiers
            var prefix = "";
            var decoStyle = "decoStyleBoxedLightBlue";

            //const commentCommandUri = vscode.Uri.parse(`command:editor.action.addCommentLine`);
            //text.push("[Add comment](${commentCommandUri})")
            //var decl_uri = "([Declaration]("+activeEditor.document.fileName+":"+(svar.loc.start.line+1)+":"+svar.loc.start.column+"))"
            var decl_uri = "([Declaration: #"+(svar.loc.start.line)+"]("+activeEditor.document.uri+":"+(svar.loc.start.line)+":1))"

            if(svar.isDeclaredConst){
                prefix = "**CONST**  "
                decoStyle = "decoStyleLightGreen";
            }

            decorations.push({ 
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
            svar.usedAt.forEach(function (ident){
                //check shadow in local declaration
                if(typeof ident.inFunction.declarations[ident.name]=="undefined"){
                    // no local declaration. annotate as statevar
                    decorations.push(
                        { 
                            range: new vscode.Range(
                                new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                                new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                                ),
                                hoverMessage: prefix + "(*"+ (svar.typeName.type=="ElementaryTypeName"?svar.typeName.name:svar.typeName.namePath) +"*) " +'**StateVar** *' + contract + "*.**"+svar.name + '**' + " "+decl_uri,
                            decoStyle: decoStyle
                        });
                } else {
                    //shadowed!
                    console.log("SHADOWED STATEVAR --> "+ident.name)
                    decoStyle = "decoStyleLightOrange"
                    prefix += "❗SHADOWED❗"
                    decorations.push({ 
                        range: new vscode.Range(
                            new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                            new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                            ),
                            hoverMessage: prefix + "(*"+ (svar.typeName.type=="ElementaryTypeName"?svar.typeName.name:svar.typeName.namePath) +"*) " +'**StateVar** *' + contract + "*.**"+svar.name + '**'+ " "+decl_uri,
                        decoStyle: decoStyle
                    });
                    //declaration
                    let declaration = ident.inFunction.declarations[ident.name];
                    decorations.push({ 
                        range: new vscode.Range(
                            new vscode.Position(declaration.loc.start.line-1, declaration.loc.start.column),
                            new vscode.Position(declaration.loc.end.line-1, declaration.loc.end.column+ident.name.length)
                            ),
                        hoverMessage: prefix + "(*"+ (svar.typeName.type=="ElementaryTypeName"?svar.typeName.name:svar.typeName.namePath) +"*) " +'**StateVar** **' + svar.name + '**',
                        decoStyle: decoStyle
                    });
                }
            })
        }
        console.log("✓ decorate scope")

        /*** inherited vars */
        /** have to get all identifiers :// */
        /** fixme ugly hack ... */
        for (var functionName in insights.contracts[contract].functions){
            //all functions
            var highlightIdentifiers = new Array();

            insights.contracts[contract].functions[functionName].identifiers.forEach(function(ident){
                // all idents in function
                let is_state_var = typeof insights.contracts[contract].stateVars[ident.name]!="undefined"
                let is_declared_locally = typeof ident.inFunction.declarations[ident.name]!="undefined"
                let is_declared_locally_arguments = typeof ident.inFunction.arguments[ident.name]!="undefined"
                let is_declared_locally_returns = typeof ident.inFunction.returns[ident.name]!="undefined"
                let is_inherited = typeof insights.contracts[contract].inherited_names[ident.name]!="undefined" && insights.contracts[contract].inherited_names[ident.name]!=contract

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
                        console.log("!!!! shadowed statevar")
                        //is handled in the other loop
                    }else if(is_inherited){
                        //shadoewed inherited var
                        console.log("!!!!! shadowed derived var")
                        prefix = "**INHERITED**  ❗SHADOWED❗"
                        decoStyle = "decoStyleLightOrange";
                        let subcontract =  insights.contracts[contract].inherited_names[ident.name]
                        var decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+activeEditor.document.uri+":"+(ident.loc.start.line)+":1))"

                        decorations.push(
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
                        console.log("!!! statevar shadows inherited")
                        console.log("!!!!! shadowed derived var")
                        prefix = "**INHERITED**  ❗SHADOWED❗"
                        decoStyle = "decoStyleLightOrange";
                        let subcontract =  insights.contracts[contract].inherited_names[ident.name]
                        var decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+activeEditor.document.uri+":"+(ident.loc.start.line)+":1))"

                        decorations.push(
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
                    prefix = "**INHERITED**  "
                    decoStyle = "decoStyleLightBlue";
                    let subcontract =  insights.contracts[contract].inherited_names[ident.name]
                    var decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+activeEditor.document.uri+":"+(ident.loc.start.line)+":1))"

                    decorations.push(
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
            })
            if (solidityVAConfig.deco.arguments)
                decorations = decorations.concat(mod_decorator.semanticHighlightFunctionParameters(highlightIdentifiers));

            if (solidityVAConfig.deco.warn.reserved){
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].functions[functionName].identifiers))
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].functions[functionName].arguments))
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].functions[functionName].returns))
            }
        }
        //decorate modifiers (fixme copy pasta)
        for (var functionName in insights.contracts[contract].modifiers){
            //all modifiers
            var highlightIdentifiers = new Array();
            insights.contracts[contract].modifiers[functionName].identifiers.forEach(function(ident){
                // all idents in function
                let is_state_var = typeof insights.contracts[contract].stateVars[ident.name]!="undefined"
                let is_declared_locally = typeof ident.inFunction.declarations[ident.name]!="undefined"
                let is_declared_locally_arguments = typeof ident.inFunction.arguments[ident.name]!="undefined"
                let is_declared_locally_returns = typeof ident.inFunction.returns[ident.name]!="undefined"
                let is_inherited = typeof insights.contracts[contract].inherited_names[ident.name]!="undefined" && insights.contracts[contract].inherited_names[ident.name]!=contract

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
                        console.log("!!!!! shadowed derived var")
                        prefix = "**INHERITED**  ❗SHADOWED❗"
                        decoStyle = "decoStyleLightOrange";
                        let subcontract =  insights.contracts[contract].inherited_names[ident.name]
                        var decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+activeEditor.document.uri+":"+(ident.loc.start.line)+":1))"

                        decorations.push(
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
                        console.log("!!!!! shadowed derived var")
                        prefix = "**INHERITED**  ❗SHADOWED❗"
                        decoStyle = "decoStyleLightOrange";
                        let subcontract =  insights.contracts[contract].inherited_names[ident.name]
                        var decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+activeEditor.document.uri+":"+(ident.loc.start.line)+":1))"

                        decorations.push(
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
                        console.log("!!! statevar shadows inherited")
                        console.log("!!!!! shadowed derived var")
                        prefix = "**INHERITED**  ❗SHADOWED❗"
                        decoStyle = "decoStyleLightOrange";
                        let subcontract =  insights.contracts[contract].inherited_names[ident.name]
                        var decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+activeEditor.document.uri+":"+(ident.loc.start.line)+":1))"

                        decorations.push(
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
                        var prefix = "";
                        if(ident.scopeRef.isDeclaredConst){
                            prefix = "**CONST**  "
                            decoStyle = "decoStyleLightGreen";
                        } else {
                            decoStyle = "decoStyleBoxedLightBlue";
                        } 

                        decorations.push(
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
                    prefix = "**INHERITED**  "
                    decoStyle = "decoStyleLightBlue";
                    let subcontract =  insights.contracts[contract].inherited_names[ident.name]
                    var decl_uri = "([Declaration: #"+(ident.loc.start.line)+"]("+activeEditor.document.uri+":"+(ident.loc.start.line)+":1))"
                    
                    decorations.push(
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
            })
            if (solidityVAConfig.deco.arguments)
                decorations = decorations.concat(mod_decorator.semanticHighlightFunctionParameters(highlightIdentifiers));

            if (solidityVAConfig.deco.warn.reserved){
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].modifiers[functionName].identifiers))
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].modifiers[functionName].arguments))
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].modifiers[functionName].returns))
            }
                
        }
        //decorate events
        for (var functionName in insights.contracts[contract].events){
            if (solidityVAConfig.deco.warn.reserved){
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].events[functionName].identifiers))
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].events[functionName].arguments))
                decorations = decorations.concat(checkReservedIdentifiers(insights.contracts[contract].events[functionName].returns))
            }
        }
        console.log("✓ decorate scope (new) - identifier ")
    }

    if(cancellationToken.isCancellationRequested){
        //abort - new analysis running already
        return
    }

    if (solidityVAConfig.deco.statevars)
        setDecorations(activeEditor, decorations)
        console.log("✓ apply decorations - scope")

    if(solidityVAConfig.audit.tags.enable){
        console.log("apply deco satic words...")
        mod_decorator.decorateWords(activeEditor, ["@audit\-ok[ \\t\\n]"], mod_decorator.styles.decoStyleBookmarkGreen)
        mod_decorator.decorateWords(activeEditor, ["@audit[ \\t\\n]"], mod_decorator.styles.decoStyleBookmarkRed)
        console.log("✓ apply decorations - audit tags")
    }
}

/** events */

function onDidSave(document){
    currentCancellationTokens.onDidSave.dispose()
    currentCancellationTokens.onDidSave = new CancellationTokenSource()
    // check if there are any 
    if(solidityVAConfig.diagnostics.cdili_json.import && g_diagnostics){
        g_diagnostics.updateIssues(currentCancellationTokens.onDidSave.token)
    }

}

function onDidChange(event){
    if(vscode.window.activeTextEditor.document.languageId!=languageId){
        console.log("wrong langid")
        return;
    }
    currentCancellationTokens.onDidChange.dispose()
    currentCancellationTokens.onDidChange = new CancellationTokenSource()
    console.log("--- on-did-change")
    try{
        analyzeSourceUnit(currentCancellationTokens.onDidChange.token)
    } catch (err){
        if (typeof err !=="CancellationToken"){
            throw err
        }
    }
    
    console.log("✓✓✓ on-did-change - resolved")
}

function onActivate(context) {
    const active = vscode.window.activeTextEditor;
    if (!active || !active.document) return;
    activeEditor = active;

    console.log("onActivate")

    registerDocType(languageId, docSelector);

    async function registerDocType(type, docSel) {
        context.subscriptions.push(
            vscode.languages.reg
        )
        
        if(!solidityVAConfig.mode.active){
            console.log("ⓘ activate extension: entering passive mode. not registering any active code augmentation support.")
            return;
        }
        /** module init */
        onInitModules(context, type);
        onDidChange()
        onDidSave(vscode.window.activeTextEditor.document)

        let commands = new Commands(g_parser)
        
        /** command setup */
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.test.createTemplate', 
                function (doc, contractName) {
                    commands.generateUnittestStubForContract(doc || vscode.window.activeTextEditor.document, contractName)
                }
            )
        )
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.mdreport', 
                function (doc) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "mdreport")
                }
            )
        )
        /*  does not yet return the values but writes to console
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.describe', 
                function () {
                    commands.surya(vscode.window.activeTextEditor.document, "describe")
                }
            )
        )
        */
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.graph', 
                function (doc, files) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "graph", files)
                }
            )
        )
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.inheritance', 
                function (doc) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "inheritance")
                }
            )
        )
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.parse', 
                function (doc) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "parse")
                }
            )
        )
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.dependencies', 
                function (doc, ContractName) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "dependencies", [ContractName])
                }
            )
        )
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.surya.ftrace', 
                function (doc, functionName) {
                    commands.surya(doc || vscode.window.activeTextEditor.document, "ftrace", [functionName])
                }
            )
        )

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.insights.topLevelContracts', 
                function () {
                    commands.findTopLevelContracts()
                }
            )
        )

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.flaterra', 
                function (doc) {
                    commands.flaterra(doc || vscode.window.activeTextEditor.document)
                }
            )
        )
        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.flattenCandidates', 
                function () {
                    commands.flattenCandidates()
                }
            )
        )

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.function.signatures', 
                function (doc, asJson) {
                    commands.listFunctionSignatures(doc || vscode.window.activeTextEditor.document, asJson)
                }
            )
        )

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.function.signatures.json', 
                function (doc) {
                    commands.listFunctionSignatures(doc || vscode.window.activeTextEditor.document, true)
                }
            )
        )

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.function.signatures.forWorkspace.json', 
                function (doc) {
                    commands.listFunctionSignaturesForWorkspace(true)
                }
            )
        )

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'solidity-va.tools.remix.openExternal', 
                function () {
                    vscode.env.openExternal(vscode.Uri.parse("https://remix.ethereum.org"))
                }
            )
        )

        /** event setup */
        /***** DidChange */
        vscode.window.onDidChangeActiveTextEditor(editor => {
            activeEditor = editor;
            if(editor && editor.document.languageId==type){
                onDidChange();
            }
        }, null, context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(event => {
            if (activeEditor && event.document === activeEditor.document && event.document.languageId==type) {
                onDidChange(event);
            }
        }, null, context.subscriptions);

          /***** OnSave */
        vscode.workspace.onDidSaveTextDocument(document => {
            onDidSave(document);  
        }, null, context.subscriptions);

        context.subscriptions.push(
            vscode.languages.registerHoverProvider(type, {
                provideHover(document, position, token) {
                    return mod_hover.provideHoverHandler(document, position, token, type, g_parser);
                }
            })
        );
        
        /** experimental */
        //onDidChange() // forces inspection and makes sure data is ready for symbolprovider
        if(solidityVAConfig.outline.enable){
            context.subscriptions.push(
                vscode.languages.registerDocumentSymbolProvider(
                    docSel, 
                    new SolidityDocumentSymbolProvider(g_parser, analyzeSourceUnit/* TODO hack hack hack move the inheritance part to parser*/)
                )
            );
        }

        if(solidityVAConfig.outline.enable){
            context.subscriptions.push(
                vscode.languages.registerReferenceProvider(
                    docSel, 
                    new SolidityReferenceProvider(g_parser, analyzeSourceUnit/* TODO hack hack hack move the inheritance part to parser*/)
                )
            );
        }
        
        if(solidityVAConfig.codelens.enable){
            context.subscriptions.push(
                vscode.languages.registerCodeLensProvider(
                    docSel,
                    new SolidityCodeLensProvider(g_parser)
                )
            );
        }
    }
}

/* exports */
exports.activate = onActivate;