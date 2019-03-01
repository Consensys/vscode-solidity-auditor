const vscode = require('vscode');

const fs = require('fs')
const path = require('path');
const parser = require('solidity-parser-antlr');
const { linearize } = require('c3-linearization')
const crypto = require('crypto');
const solidityVAConfig = vscode.workspace.getConfiguration('solidity-va');

const mod_hover = require('./hover/hover.js');
const mod_codelens = require('./codelens/codelens.js');
const mod_decorator = require('./deco/deco.js');

var activeEditor;

var ast_cache = {};


function inspect(input, filepath, parseImports){
    if (typeof filepath=="undefined")
        filepath = activeEditor.document.fileName
    typeof parseImports == "undefined" || parseImports==false ? false : true

    console.log("inspect: " + filepath)
    /** cachelookup first */
    let hash = crypto.createHash('sha1').update(input).digest('base64')
    
    if (ast_cache[hash]!=undefined)
        return ast_cache[hash]  //return cached

    /** parse magic */
    sourceUnit = parseSourceUnit(input);

    /** cache it */
    sourceUnit.hash = hash;
    ast_cache[hash]=sourceUnit;  //cache it

    /** parse imports */
    sourceUnit.imports.forEach(function(imp){

        let importPath = path.dirname(filepath) +"/./" + imp.path
        imp.ast = inspectFile(importPath, false)  // this caches automatically
    })
    /** we're done */
    // should we flatten inherited functions to one object?

    return sourceUnit;
}

function inspectFile(file, parseImports){
    let content
    try {
        content = fs.readFileSync(file).toString('utf-8')
    } catch (e) {
        if (e.code === 'EISDIR') {
        console.error(`Skipping directory ${file}`)
    } else 
        throw e;
    }
    //let hash = crypto.createHash('sha1').update(content).digest('base64')
    //if (ast_cache[hash]!=undefined)
    //    return ast_cache[hash]  //return cached
    console.log(file)
    let sourceUnit = inspect(content, file, parseImports)
    //sourceUnit.hash = hash
    //ast_cache[hash]=sourceUnit;  //cache it

    return sourceUnit
}

function parseSourceUnit(input){
    try {
        var ast = parser.parse(input, {loc:true, tolerant:true})
    } catch (e) {
        if (e instanceof parser.ParserError) {
            console.log(e.errors)
        return;
        }
    }

    var sourceUnit = {
        contracts:{},
        pragmas:[],
        imports:[],
        hash:null
    } 
    /** AST rdy */
    
    var current_contract=null;
    var current_function=null;
    
    parser.visit(ast, {
        PragmaDirective(node){sourceUnit.pragmas.push(node)},
        ImportDirective(node){sourceUnit.imports.push(node)},
        ContractDefinition(node) {
            sourceUnit.contracts[node.name] = {
                _node: node,
                name: node.name,
                dependencies: node.baseContracts.map(spec => spec.baseName.namePath),
                stateVars:{},
                enums:{},
                structs:{},
                mappings:{},
                modifiers:{},
                functions:{},
                constructor:null,
                events:{}
            }
            current_contract = sourceUnit.contracts[node.name]

            parser.visit(node, {
                
                StateVariableDeclaration(_node){
                    parser.visit(_node, {
                        VariableDeclaration(__node){
                            __node.usedAt = new Array();
                            current_contract.stateVars[__node.name]=__node;
                        }
                    })
                },
                // --> is a subtype. Mapping(_node){current_contract.mappings[_node.name]=_node},
                EnumDefinition(_node){current_contract.enums[_node.name]=_node},
                StructDefinition(_node){current_contract.structs[_node.name]=_node},
                ConstructorDefinition(_node){current_contract.constructor=_node}, // wrong def in code: https://github.com/solidityj/solidity-antlr4/blob/fbe865f8ba510cbdb1540fcf9517a42820a4d097/Solidity.g4#L78 for consttuctzor () ..
                ModifierDefinition(_node){
                    current_contract.modifiers[_node.name]={
                        _node:_node,
                        arguments: {},  // declarations: quick access to argument list
                        returns: {},  // declarations: quick access to return argument list
                        declarations: {},  // all declarations: arguments+returns+body
                        identifiers: [],  // all identifiers (use of variables)
                    }
                    current_function = current_contract.modifiers[_node.name];
                    // parse function body to get all function scope params.
                    // first get declarations
                    parser.visit(_node.parameters, {
                        Parameter: function(__node){
                            current_function.arguments[__node.name]=__node
                            current_function.declarations[__node.name]=__node
                        }
                    })
                    parser.visit(_node.returnParameters, {
                        Parameter: function(__node){
                            current_function.returns[__node.name]=__node
                            current_function.declarations[__node.name]=__node
                        }
                    })
                    /**** body declarations */
                    parser.visit(_node.body, {
                        VariableDeclaration(__node){current_function.declarations[__node.name] = __node;}
                    })
                    /**** all identifier */
                    /**** body declarations */
                    parser.visit(_node, {
                        //resolve scope
                        // check if defined in 
                        //
                        //
                        Identifier(__node){
                            if(!current_function)
                                return
                            __node.inFunction = current_function;
                            current_function.identifiers.push(__node);
                        }
                    })
                },
                EventDefinition(_node){current_contract.events[_node.name]=_node},
                FunctionDefinition(_node){
                    current_contract.functions[_node.name]={
                        _node:_node,
                        arguments: {},  // declarations: quick access to argument list
                        returns: {},  // declarations: quick access to return argument list
                        declarations: {},  // all declarations: arguments+returns+body
                        identifiers: [],  // all identifiers (use of variables)
                    }
                    current_function = current_contract.functions[_node.name];
                    // parse function body to get all function scope params.
                    // first get declarations
                    parser.visit(_node.parameters, {
                        Parameter: function(__node){
                            current_function.arguments[__node.name]=__node
                            current_function.declarations[__node.name]=__node
                        }
                    })
                    parser.visit(_node.returnParameters, {
                        Parameter: function(__node){
                            current_function.returns[__node.name]=__node
                            current_function.declarations[__node.name]=__node
                        }
                    })
                    /**** body declarations */
                    parser.visit(_node.body, {
                        VariableDeclaration(__node){current_function.declarations[__node.name] = __node;}
                    })
                    /**** all identifier */
                    /**** body declarations */
                    parser.visit(_node, {
                        //resolve scope
                        // check if defined in 
                        //
                        //
                        Identifier(__node){
                            if(!current_function)
                                return
                            __node.inFunction = current_function;
                            current_function.identifiers.push(__node);
                        }
                    })
                },
            })  
        },
    })
    console.log("resolve idents")
    /*** resolve identifier scope */
    for (var contract in sourceUnit.contracts) {
        for (var funcName in sourceUnit.contracts[contract].functions) {
            var func = sourceUnit.contracts[contract].functions[funcName];
            func.identifiers.forEach(function(identifier){
                identifier.declarations = {
                    local: new Array(),
                    global: sourceUnit.contracts[contract].stateVars[identifier.name]
                };
                
                if(typeof sourceUnit.contracts[contract].stateVars[identifier.name]!="undefined"){
                    sourceUnit.contracts[contract].stateVars[identifier.name].usedAt.push(identifier)
                }
                
                for (var identDec in func.arguments){
                    //if(identDec)
                    if(identifier.name==identDec){
                        identifier.declarations.local.push(func.arguments[identDec]);
                    }
                }
                for (var identDec in func.returns){
                    //if(identDec)
                    if(identifier==identDec){
                        identifier.declarations.local.push(func.returns[identDec]);
                    }
                }
            })  
        }
    }



    /*** also import dependencies? */
    console.log(sourceUnit)
    
    return sourceUnit;
}

function findImportedContract(sourceUnit, searchName){
    console.log("find "+ searchName)
    for (var contractName in sourceUnit.contracts) {
        if(sourceUnit.contracts[contractName].name==searchName)
            return sourceUnit.contracts[contractName];
    }
    //check imports
    console.log("in imports")
    var BreakException = {};

    let result;
    sourceUnit.imports.forEach(function(imp){
        if (typeof result != "undefined")
            return
        let contract = findImportedContract(imp.ast, searchName)
        if (typeof contract != "undefined" && contract.name==searchName){
            console.log("FOUND "+ searchName)
            result = contract;
        }
    })
    console.log("--eof--")
    return result

}

function linearizeContract(sourceUnit){
    let dependencies = {}
    let contractObjects = {}
    for (var contractName in sourceUnit.contracts) {
        dependencies[contractName] = sourceUnit.contracts[contractName].dependencies;
        sourceUnit.contracts[contractName].dependencies.forEach(function(dep){
            let contract = findImportedContract(sourceUnit, dep)
            dependencies[contract.name]=contract.dependencies;
            contractObjects[contract.name]=contract
        })
    }
    return linearize(dependencies, {reverse: true})
}

function onInitModules(context, type){
    mod_hover.init(context, type, solidityVAConfig);
    //mod_codelens.init(context, type, solidityVAConfig);
    mod_decorator.init(context, solidityVAConfig);
}

function onDidChange(event){
    console.log("did-change")
    //mod_decorator.updateDecorations();
    console.log("inspect")
    var insights = inspect(activeEditor.document.getText());
    console.log("got inspect result")

    var words = new Array();
    var decorations = new Array();

    for (var contract in insights.contracts) {
        console.log("in contract" + contract)
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
            //words.push(stateVar);
            decorations.push({ 
                    range: new vscode.Range(
                        new vscode.Position(svar.loc.start.line-1, svar.loc.start.column),
                        new vscode.Position(svar.loc.end.line-1, svar.loc.end.column+svar.name.length)
                        ),
                    hoverMessage: prefix + "(*"+ (svar.typeName.type=="ElementaryTypeName"?svar.typeName.name:svar.typeName.namePath) +"*) " +'StateVar *' + contract + "*.**"+svar.name + '**',
                    decoStyle: decoStyle
            });
            

            console.log("--annoate idents--")
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
    }
    console.log("--set-decorate--")
    //mod_decorator.decorateWords(activeEditor, words);
    if (solidityVAConfig.deco.statevars)
        setDecorations(activeEditor, decorations)
    console.log("deco end")
}

function setDecorations(editor, decorations){
    if (!editor) {
        return;
    }
    deco_map = {}

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

function getSymbolForNode(document, node, kind, name, containerName){
    let range = new vscode.Range(
        new vscode.Position(node.loc.start.line-1, node.loc.start.column),
        new vscode.Position(node.loc.end.line-1, typeof node.length!="undefined"?node.loc.end.column+node.length:node.loc.end.column)
        )
    return {
        name: typeof name!="undefined"?name:node.name,
        kind: kind,
        location: new vscode.Location(document.uri, range),
    }
}

function getFakeNode(name, line){
    return {
        name: name, 
        length:0, 
        loc: {
            start:{
                line:line,
                column:0
            },
            end:{
                line:line,
                column:0}
            }
        }
}

const stateMutabilityToIcon = {
    view:"👀",
    pure:"🌳",
    constant:"👀",
    payable:"💰"
}
const visibilityToIcon = {
    external:"❗️",
    public:"❗️",
    private:"🔐",
    internal:"🔒"
}

function getStateMutabilityToIcon(state){
    let v = stateMutabilityToIcon[state]
    if (typeof v == "undefined")
        return ""
    return v
}

function getVisibilityToIcon(state){
    let v = visibilityToIcon[state]
    if (typeof v == "undefined")
        return ""
    return v
}

class SolidityDocumentSymbolProvider{
    provideDocumentSymbols(document, token){
        console.log("preparing symbols...")
        return new Promise((resolve, reject) => {
            var symbols = [];
            var insights = inspect(document.getText());

            /*
            symbols.push(
                getSymbolForNode(
                    document, 
                    getFakeNode(path.basename(document.fileName),1),
                    vscode.SymbolKind.File
                    )
                )
            */
            
            /*
            insights.imports.forEach(function(imp){
                imp.symbolAliases.forEach(function(sa){
                    sa.forEach(function(impname){
                        if(impname!=null)
                            symbols.push(getSymbolForNode(document, imp, vscode.SymbolKind.Namespace, impname, "_imports_"))
                    })
                })
            })
            */
            

            for (var contractName in insights.contracts) {
                
                
                /** the document */
                symbols.push(getSymbolForNode(document, insights.contracts[contractName]._node, vscode.SymbolKind.Class))
                /** constructor - if known */
                if (insights.contracts[contractName].constructor)
                    symbols.push(getSymbolForNode(document, insights.contracts[contractName].functions[functionName]._node, vscode.SymbolKind.Constructor))
                /** stateVars */
                for (var svar in insights.contracts[contractName].stateVars){
                    symbols.push(getSymbolForNode(document, insights.contracts[contractName].stateVars[svar], vscode.SymbolKind.Field))
                } 

                for (var name in insights.contracts[contractName].enums){
                    symbols.push(getSymbolForNode(document, insights.contracts[contractName].enums[name], vscode.SymbolKind.Enum))
                }
                for (var name in insights.contracts[contractName].structs){
                    symbols.push(getSymbolForNode(document, insights.contracts[contractName].structs[name], vscode.SymbolKind.Struct))
                } 
                

                /** functions - may include constructor / fallback */
                for (var functionName in insights.contracts[contractName].functions){

                    let modifiers = "";
                    if (solidityVAConfig.outline.decorations){
                        modifiers += getVisibilityToIcon(insights.contracts[contractName].functions[functionName]._node.visibility)
                        modifiers += getStateMutabilityToIcon(insights.contracts[contractName].functions[functionName]._node.stateMutability)
                    }

                    if(insights.contracts[contractName].functions[functionName]._node.name==null || functionName=="_constructor_" || insights.contracts[contractName].functions[functionName]._node.isConstructor){
                        symbols.push(getSymbolForNode(document, insights.contracts[contractName].functions[functionName]._node, vscode.SymbolKind.Constructor, "⚜ "+ modifiers + "constructor"))
                    } else
                        symbols.push(getSymbolForNode(document, insights.contracts[contractName].functions[functionName]._node, vscode.SymbolKind.Function, modifiers + insights.contracts[contractName].functions[functionName]._node.name))
                    //get all declarations in function
                    for (var declaration in insights.contracts[contractName].functions[functionName].declarations){
                        let vardec = insights.contracts[contractName].functions[functionName].declarations[declaration];
                        if(declaration=="null")
                            continue
                        symbols.push(getSymbolForNode(document, vardec, vscode.SymbolKind.Variable))
                    }
                }
                
                /** modifiers */
                for (var functionName in insights.contracts[contractName].modifiers){
                    let modifiers = "";
                    if (solidityVAConfig.outline.decorations){
                        modifiers += getVisibilityToIcon(insights.contracts[contractName].modifiers[functionName].visibility)
                        modifiers += getStateMutabilityToIcon(insights.contracts[contractName].modifiers[functionName].stateMutability)
                    }

                    symbols.push(getSymbolForNode(document, insights.contracts[contractName].modifiers[functionName]._node, vscode.SymbolKind.Method, "Ⓜ "+ modifiers + insights.contracts[contractName].modifiers[functionName]._node.name))
                    //get all declarations in function
                    for (var declaration in insights.contracts[contractName].modifiers[functionName].declarations){
                        let vardec = insights.contracts[contractName].modifiers[functionName].declarations[declaration];
                        if(declaration=="null")
                            continue
                        symbols.push(getSymbolForNode(document, vardec, vscode.SymbolKind.Variable))
                    }
                }
                /** events */
                for (var functionName in insights.contracts[contractName].events){
                    let modifiers = "";
                    if (solidityVAConfig.outline.decorations){
                        modifiers += getVisibilityToIcon(insights.contracts[contractName].events[functionName].visibility)
                        modifiers += getStateMutabilityToIcon(insights.contracts[contractName].events[functionName].stateMutability)
                    }
                    symbols.push(getSymbolForNode(document, insights.contracts[contractName].events[functionName], vscode.SymbolKind.Method, "📢 "+ modifiers +insights.contracts[contractName].events[functionName].name))
                }
            }
            resolve(symbols);
        });

    }
}


function onActivate(context) {
    const active = vscode.window.activeTextEditor;
    if (!active || !active.document) return;
    activeEditor = active;

    console.log("activate")

    registerDocType('solidity');

    function registerDocType(type) {
        context.subscriptions.push(
            vscode.languages.reg
        )
        /** experimental */
        context.subscriptions.push(
            vscode.languages.registerDocumentSymbolProvider({language: type}, new SolidityDocumentSymbolProvider()
        ));
        /** module init */
        onInitModules(context, type);

        /** event setup */
        /***** DidChange */
        vscode.window.onDidChangeActiveTextEditor(editor => {
            activeEditor = editor;
            if (editor) {
                onDidChange();
            }
        }, null, context.subscriptions);
        vscode.workspace.onDidChangeTextDocument(event => {
            if (activeEditor && event.document === activeEditor.document) {
                onDidChange(event);
            }
        }, null, context.subscriptions);

    }
    
}

/* exports */
exports.activate = onActivate;