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
var g_sourceUnits = {}
var g_contracts = {}


function inspect(input, filepath, parseImports){
    if (typeof filepath=="undefined")
        filepath = activeEditor.document.fileName
    typeof parseImports == "undefined" || parseImports==false ? false : true

    console.log("inspect: " + filepath)
    if (!fs.existsSync(filepath)){
        console.error("file does not exist! --> " + filepath)
        return
    }
    /** cachelookup first */
    let hash = crypto.createHash('sha1').update(input).digest('base64')
    
    if (ast_cache[hash]!=undefined){
        console.log("inspect: " + filepath + "//CACHE DONE")
        return ast_cache[hash]  //return cached
    }
    /** parse magic */
    sourceUnit = parseSourceUnit(input);
    console.log("inspect: " + filepath + "//DONE")

    /** cache it */
    sourceUnit.hash = hash;
    sourceUnit.filepath = filepath;
    ast_cache[hash]=sourceUnit;  //cache it
    g_sourceUnits[sourceUnit.filepath] = sourceUnit
    for (var contractName in sourceUnit.contracts) {
        g_contracts[contractName] = sourceUnit.contracts[contractName]
    }

    if (solidityVAConfig.parser.parseImports){
        /** parse imports */
        sourceUnit.imports.forEach(function(imp){
            //try file path
            let importPath = path.resolve(path.dirname(filepath) +"/./" + imp.path)
            if (!fs.existsSync(importPath)){
                //try relative to workspace root
                importPath = path.resolve(vscode.workspace.rootPath +"/./" + imp.path)
                if (!fs.existsSync(importPath)){
                    //try workspacepath node_modules
                    importPath = path.resolve(vscode.workspace.rootPath +"/node_modules/" + imp.path)
                    if (!fs.existsSync(importPath)){
                        //try ../contracts/node_modules/...
                        let basepath = filepath.split("/contracts/")

                        if (basepath.length==2){ //super dirty
                            basepath=basepath[0]
                            importPath = path.resolve(basepath +"/node_modules/" + imp.path)
                        }
                    }
                }
            }
            try {
                imp.ast = inspectFile(importPath, true)  // this caches automatically
            } catch (e) {
                console.error(e)
            }
        })
    }
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
                stateVars:{},  // pure statevars --> see names
                enums:{},  // enum declarations
                structs:{}, // struct declarations
                mappings:{},  // mapping declarations
                modifiers:{},  // modifier declarations 
                functions:{},  // function and method declarations
                constructor:null,  // ...
                events:{},  // event declarations
                inherited_names: {},  // all names inherited from other contracts
                names:{}   // all names in current contract (methods, events, structs, ...)
            }
            current_contract = sourceUnit.contracts[node.name]

            parser.visit(node, {
                
                StateVariableDeclaration(_node){
                    parser.visit(_node, {
                        VariableDeclaration(__node){
                            __node.usedAt = new Array();
                            current_contract.stateVars[__node.name]=__node;
                            current_contract.names[__node.name]=__node;
                        }
                    })
                },
                // --> is a subtype. Mapping(_node){current_contract.mappings[_node.name]=_node},
                EnumDefinition(_node){
                    current_contract.enums[_node.name]=_node
                    current_contract.names[_node.name]=_node
                },
                StructDefinition(_node){
                    current_contract.structs[_node.name]=_node
                    current_contract.names[_node.name]=_node
                },
                ConstructorDefinition(_node){
                    current_contract.constructor=_node
                    current_contract.names[_node.name]=_node
                }, // wrong def in code: https://github.com/solidityj/solidity-antlr4/blob/fbe865f8ba510cbdb1540fcf9517a42820a4d097/Solidity.g4#L78 for consttuctzor () ..
                ModifierDefinition(_node){
                    current_contract.modifiers[_node.name]={
                        _node:_node,
                        arguments: {},  // declarations: quick access to argument list
                        returns: {},  // declarations: quick access to return argument list
                        declarations: {},  // all declarations: arguments+returns+body
                        identifiers: [],  // all identifiers (use of variables)
                    }
                    
                    current_function = current_contract.modifiers[_node.name];
                    current_contract.names[_node.name]=current_function;
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
                EventDefinition(_node){
                    current_contract.events[_node.name]={
                        _node:_node,
                        arguments: {},  // declarations: quick access to argument list
                        declarations: {},  // all declarations: arguments+returns+body
                    }
                    
                    current_function = current_contract.events[_node.name];
                    current_contract.names[_node.name]=current_function;
                    // parse function body to get all function scope params.
                    // first get declarations
                    parser.visit(_node.parameters, {
                        VariableDeclaration: function(__node){
                            current_function.arguments[__node.name]=__node
                            current_function.declarations[__node.name]=__node
                        }
                    })

                },
                FunctionDefinition(_node){
                    
                    current_contract.functions[_node.name]={
                        _node:_node,
                        arguments: {},  // declarations: quick access to argument list
                        returns: {},  // declarations: quick access to return argument list
                        declarations: {},  // all declarations: arguments+returns+body
                        identifiers: [],  // all identifiers (use of variables)
                        complexity: 0,    // we just count nr. of branching statements here
                        accesses_svar: false //
                    }
                    current_function = current_contract.functions[_node.name];
                    current_contract.names[_node.name]=current_function;
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
                        VariableDeclaration(__node){current_function.declarations[__node.name] = __node;},
                        /** 
                         * subjective complexity - nr. of branching instructions 
                         *   https://stackoverflow.com/a/40069656/1729555
                        */
                        IfStatement(__node){current_function.complexity += 1},
                        WhileStatement(__node){current_function.complexity += 1},
                        ForStatement(__node){current_function.complexity += 1},
                        DoWhileStatement(__node){current_function.complexity += 1},
                        InlineAssemblyStatement(__node){current_function.complexity += 3},
                        AssemblyIf(__node){current_function.complexity += 2},
                        SubAssembly(__node){current_function.complexity += 2},
                        AssemblyFor(__node){current_function.complexity += 2},
                        AssemblyCase(__node){current_function.complexity += 1},
                        Conditional(__node){current_function.complexity +=1},
                        AssemblyCall(__node){current_function.complexity += 1},
                        FunctionCall(__node){current_function.complexity += 2}
                        // ignore throw, require, etc. for now
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
                        },
                        AssemblyCall(__node){
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
                    func.accesses_svar = true;  // TODO: also check for inherited svars
                }
                
                for (var identDec in func.arguments){
                    if(identifier.name==identDec){
                        identifier.declarations.local.push(func.arguments[identDec]);
                    }
                }
                for (var identDec in func.returns){
                    if(identifier==identDec){
                        identifier.declarations.local.push(func.returns[identDec]);
                    }
                }
            })  
        }
    }



    /*** also import dependencies? */
    return sourceUnit;
}

function findImportedContract(sourceUnit, searchName){
    for (var contractName in sourceUnit.contracts) {
        if(sourceUnit.contracts[contractName].name==searchName)
            return sourceUnit.contracts[contractName];
    }
    //check imports
    var BreakException = {};

    let result;
    sourceUnit.imports.forEach(function(imp){
        if (typeof result != "undefined")
            return
        let contract = findImportedContract(imp.ast, searchName)
        if (typeof contract != "undefined" && contract.name==searchName){
            result = contract;
        }
    })
    return result

}

function linearizeContract(sourceUnit){
    let dependencies = {}
    for (var contractName in sourceUnit.contracts) {
        dependencies[contractName] = sourceUnit.contracts[contractName].dependencies;
        sourceUnit.contracts[contractName].dependencies.forEach(function(dep){
            let contract = g_contracts[dep]
            if(typeof contract=="undefined")
                console.error("ERROR - could not load contract object for "+dep)
            else
                dependencies[dep]=contract.dependencies;
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
 
    var insights = inspect(activeEditor.document.getText(), activeEditor.document.fileName);
    console.log("inspect - end")

    console.log("linearize")
    var inheritance = linearizeContract(insights)
    console.log("linearize - end")

    var words = new Array();
    var decorations = new Array();

    for (var contract in insights.contracts) {
        console.log("in contract" + contract)

        console.log("resolve inheritance..")
        //merge all contracts into one
        inheritance[contract].forEach(function(contractName){
            var subcontract = g_contracts[contractName];
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
        console.log("resolve inheritance -- done")

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
            //words.push(stateVar);
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

        /*** inherited vars */
        /** have to get all identifiers :// */
        /** fixme ugly hack ... */
        for (var functionName in insights.contracts[contract].functions){
            //all functions
            insights.contracts[contract].functions[functionName].identifiers.forEach(function(ident){
                // all idents in function
                let is_state_var = typeof insights.contracts[contract].stateVars[ident.name]!="undefined"
                let is_declared_locally = typeof ident.inFunction.declarations[ident.name]!="undefined"
                let is_inherited = typeof insights.contracts[contract].inherited_names[ident.name]!="undefined" && insights.contracts[contract].inherited_names[ident.name]!=contract

                if(is_declared_locally){
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

function getSymbolForNode(document, node, kind, name, detail){
    let range = new vscode.Range(
        new vscode.Position(node.loc.start.line-1, node.loc.start.column),
        new vscode.Position(node.loc.end.line-1, typeof node.length!="undefined"?node.loc.end.column+node.length:node.loc.end.column)
        )
    return {
        name: typeof name!="undefined"?name:node.name,
        kind: kind,
        detail: typeof detail!="undefined"?detail:"",
        location: new vscode.Location(document.uri, range)
        //children: []
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

function astNodeAsDocumentSymbol(document, node, kind, name, detail){
    return new vscode.DocumentSymbol(
        typeof name!="undefined"?name:node.name, 
        typeof detail!="undefined"?detail:"", 
        kind,
        new vscode.Range(
            node.loc.start.line-1,
            node.loc.start.column,
            node.loc.end.line-1, 
            typeof node.length!="undefined"?node.loc.end.column+node.length:node.loc.end.column
            ), 
        new vscode.Range(
            node.loc.start.line-1,
            node.loc.start.column,
            node.loc.end.line-1, 
            typeof node.length!="undefined"?node.loc.end.column+node.length:node.loc.end.column
            )
    )
    
}

function varDecIsArray(node){
    return node.typeName.type=="ArrayTypeName"
}

function varDecIsUserDefined(node){
    return node.typeName.type=="UserDefinedTypeName"
}

function getVariableDeclarationType(node){
    if(varDecIsArray(node))
        node = node.typeName.baseTypeName
    else
        node = node.typeName
    if(node.type=="ElementaryTypeName"){
        return node.name;
    } else if (node.type=="UserDefinedTypeName"){
        return node.namePath;
    } else {
        return null
    }
}

const varDecToSymbolType = {
    string: vscode.SymbolKind.String,
    array: vscode.SymbolKind.Array,
    bool: vscode.SymbolKind.Boolean,
    uint: vscode.SymbolKind.Number,
    int: vscode.SymbolKind.Number,
    bytes: vscode.SymbolKind.Array,
    address: vscode.SymbolKind.Variable,
    user: vscode.SymbolKind.Array
}

function getVariableDeclarationTypeAsSymbolKind(node, _default){
    if(varDecIsUserDefined(node)){
        return varDecToSymbolType.user
    }

    let solidityType = getVariableDeclarationType(node)
    if (!solidityType)
        return _default
        
    if (solidityType.startsWith("uint") || solidityType.startsWith("int")){
        return varDecToSymbolType.uint;
    } else if (solidityType.startsWith("bytes")){
        return varDecToSymbolType.bytes;
    }

    let kind = varDecToSymbolType[solidityType]
    return typeof kind!="undefined"?kind:_default;
    
}

function getSymbolKindForDeclaration(node){
    let astnode = typeof node._node!="undefined"?node._node:node
    let result = {
        symbol: vscode.SymbolKind.Variable,
        prefix: "",
        suffix: "",
        name: typeof astnode.name!="undefined" ? astnode.name:"",
        details: ""
    }
    switch(astnode.type) {
        case "ModifierDefinition":
            result.symbol = vscode.SymbolKind.Method 

            result.prefix += "Ⓜ "

            if (solidityVAConfig.outline.decorations){
                result.prefix += getVisibilityToIcon(astnode.visibility)
                result.prefix += getStateMutabilityToIcon(astnode.stateMutability)
            }
            break;
        case "EventDefinition":
            result.symbol = vscode.SymbolKind.Event
            break;
        case "FunctionDefinition":
            if (astnode.isConstructor){
                result.symbol = vscode.SymbolKind.Constructor
                result.name = "⚜ __constructor__ " + result.name
            } else {
                result.symbol = vscode.SymbolKind.Function
            }
            if (solidityVAConfig.outline.decorations){
                result.prefix += getVisibilityToIcon(astnode.visibility)
                result.prefix += getStateMutabilityToIcon(astnode.stateMutability)
            }

            if (solidityVAConfig.outline.extras){
                result.suffix += " ( "
                result.suffix += " complex: "+node.complexity
                result.suffix += " state: " + (node.accesses_svar?"☑":"☐")
                result.suffix += " )"
            }
            break;
        case "EnumDefinition":
            result.symbol = vscode.SymbolKind.Enum
            break;
        case "StructDefinition":
            result.symbol = vscode.SymbolKind.Struct
            break;
        case "VariableDeclaration":
            if(solidityVAConfig.outline.var.storage_annotations){
                if(astnode.storageLocation=="memory"){
                    result.prefix +="💾"
                    result.details += astnode.storageLocation
                } else if(astnode.storageLocation=="storage"){
                    result.prefix +="💽"
                    result.details += astnode.storageLocation
                }
            }
            if(varDecIsArray(astnode)){
                result.name += "[]"
            }

            if(astnode.isDeclaredConst){
                result.symbol = vscode.SymbolKind.Constant
                break
            }
            //result.symbol = vscode.SymbolKind.Variable

            result.symbol = getVariableDeclarationTypeAsSymbolKind(astnode, vscode.SymbolKind.Variable)
            break;
        case "Parameter":
            if(solidityVAConfig.outline.var.storage_annotations){
                if(astnode.storageLocation=="memory"){
                    result.prefix +="💾"
                    result.details += astnode.storageLocation
                } else if(astnode.storageLocation=="storage"){
                    result.prefix +="💽"
                    result.details += astnode.storageLocation
                }
            }
            if(varDecIsArray(astnode)){
                result.name += "[]"
            }
            result.symbol = vscode.SymbolKind.TypeParameter  // lets misuse this kind for params
            break;
        default:
            console.log(node)
            console.log("<-----")
    }
    return result;
}  

class SolidityDocumentSymbolProvider{
    provideDocumentSymbols(document, token){
        console.log("force onDidChange() event to make sure ast is ready when providing symbols")
        onDidChange()
        onDidChange()
        console.log("preparing symbols...")
        return new Promise((resolve, reject) => {
            var symbols = [];
            var insights = inspect(document.getText());
            console.log("preparing symbols for: "+ document.fileName)

            if(solidityVAConfig.outline.pragmas.show){
                var topLevelNode = astNodeAsDocumentSymbol(
                    document, 
                    getFakeNode("pragma",1),
                    vscode.SymbolKind.Namespace,
                    "pragma",
                    "... (" + insights.pragmas.length + ")"
                    )
                symbols.push(topLevelNode)
                insights.pragmas.forEach(function(item){
                    topLevelNode.children.push(astNodeAsDocumentSymbol(
                        document, 
                        item, 
                        vscode.SymbolKind.Namespace, 
                        item.name + " → " + item.value))
                    })
                    console.log("✓ pragmas ")
            }
            
            if(solidityVAConfig.outline.imports.show){
                topLevelNode = astNodeAsDocumentSymbol(
                    document, 
                    getFakeNode("imports",1),
                    vscode.SymbolKind.Namespace,
                    "imports",
                    "... (" + insights.imports.length + ")"
                    )
                symbols.push(topLevelNode)
                insights.imports.forEach(function(item){
                    topLevelNode.children.push(astNodeAsDocumentSymbol(
                        document, 
                        item, 
                        vscode.SymbolKind.File, 
                        item.path))
                    })
                
                console.log("✓ imports ")
            }
            
            for (var contractName in insights.contracts) {
                
                topLevelNode = astNodeAsDocumentSymbol(document, insights.contracts[contractName]._node, vscode.SymbolKind.Class)
                symbols.push(topLevelNode)

                /** the document */
                console.log("✓ contracts " + contractName)
                /** constructor - if known */
                if (insights.contracts[contractName].constructor){
                    topLevelNode.children.push(astNodeAsDocumentSymbol(document, insights.contracts[contractName].functions[functionName]._node, vscode.SymbolKind.Constructor))
                }
                console.log("✓ constructor")
                /** stateVars */
                for (var svar in insights.contracts[contractName].stateVars){
                    let symbolAnnotation = getSymbolKindForDeclaration(insights.contracts[contractName].stateVars[svar])
                    
                    topLevelNode.children.push(astNodeAsDocumentSymbol(
                        document, 
                        insights.contracts[contractName].stateVars[svar], 
                        symbolAnnotation.symbol,
                        symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                        symbolAnnotation.details))
                
                } 
                console.log("✓ statevars")
                
                for (var name in insights.contracts[contractName].enums){
                    topLevelNode.children.push(astNodeAsDocumentSymbol(
                        document, 
                        insights.contracts[contractName].enums[name], 
                        vscode.SymbolKind.Enum))
                }
                console.log("✓ enums")
                for (var name in insights.contracts[contractName].structs){
                    topLevelNode.children.push(astNodeAsDocumentSymbol(document, insights.contracts[contractName].structs[name], vscode.SymbolKind.Struct))
                } 
                console.log("✓ structs")
                var functionLevelNode;
                /** functions - may include constructor / fallback */
                for (var functionName in insights.contracts[contractName].functions){
                    
                    let symbolAnnotation = getSymbolKindForDeclaration(insights.contracts[contractName].functions[functionName])
                    functionLevelNode = astNodeAsDocumentSymbol(
                        document, 
                        insights.contracts[contractName].functions[functionName]._node, 
                        symbolAnnotation.symbol, 
                        symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                        symbolAnnotation.details)
    
                    topLevelNode.children.push(functionLevelNode)
                    //get all declarations in function
                    
                    for (var declaration in insights.contracts[contractName].functions[functionName].declarations){
                        let vardec = insights.contracts[contractName].functions[functionName].declarations[declaration];
                        if(declaration=="null")
                            continue
                        
                        let symbolAnnotation = getSymbolKindForDeclaration(vardec)
                        
                        functionLevelNode.children.push(astNodeAsDocumentSymbol(
                            document, 
                            vardec, 
                            symbolAnnotation.symbol,
                            symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                            symbolAnnotation.details
                            ))
                        
                    }
                    
                }
                console.log("✓ functions")
                
                /** modifiers */
                for (var functionName in insights.contracts[contractName].modifiers){

                    let symbolAnnotation = getSymbolKindForDeclaration(insights.contracts[contractName].modifiers[functionName])
                    functionLevelNode = astNodeAsDocumentSymbol(
                        document, 
                        insights.contracts[contractName].modifiers[functionName]._node, 
                        symbolAnnotation.symbol, 
                        symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                        symbolAnnotation.details)

                    topLevelNode.children.push(functionLevelNode)
                    //get all declarations in function
                    for (var declaration in insights.contracts[contractName].modifiers[functionName].declarations){
                        let vardec = insights.contracts[contractName].modifiers[functionName].declarations[declaration];
                        if(declaration=="null")
                            continue
                        let symbolAnnotation = getSymbolKindForDeclaration(vardec)
                        functionLevelNode.children.push(astNodeAsDocumentSymbol(
                            document, 
                            vardec, 
                            symbolAnnotation.symbol,
                            symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                            symbolAnnotation.details
                            ))
                
                    }
                }
                console.log("✓ modifiers")
                /** events */
                for (var functionName in insights.contracts[contractName].events){
                    let symbolAnnotation = getSymbolKindForDeclaration(insights.contracts[contractName].events[functionName])
                    functionLevelNode = astNodeAsDocumentSymbol(
                        document, 
                        insights.contracts[contractName].events[functionName]._node, 
                        symbolAnnotation.symbol, 
                        symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                        symbolAnnotation.details)

                    topLevelNode.children.push(functionLevelNode)

                    //get all declarations in function
                    for (var declaration in insights.contracts[contractName].events[functionName].declarations){
                        let vardec = insights.contracts[contractName].events[functionName].declarations[declaration];
                        if(declaration=="null")
                            continue
                        let symbolAnnotation = getSymbolKindForDeclaration(vardec)
                        functionLevelNode.children.push(astNodeAsDocumentSymbol(
                            document, 
                            vardec, 
                            symbolAnnotation.symbol,
                            symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                            symbolAnnotation.details
                            ))
                    }
                }
                console.log("✓ events")
                 /** functions - may include constructor / fallback */
                if(solidityVAConfig.outline.inheritance.show){

                    var inheritedLevelNode = astNodeAsDocumentSymbol(
                        document, 
                        getFakeNode("↖ ...", 1),
                        vscode.SymbolKind.Namespace,
                        )
                    topLevelNode.children.push(inheritedLevelNode)

                    let contractNodes = {}
                    for (var name in insights.contracts[contractName].inherited_names){
                        //skip self
                        let inheritedFromContractName = insights.contracts[contractName].inherited_names[name];
                        if(inheritedFromContractName==contractName)
                            continue

                        let currentContractNode = contractNodes[inheritedFromContractName]
                        if(typeof currentContractNode=="undefined"){
                            currentContractNode = astNodeAsDocumentSymbol(
                                document, 
                                getFakeNode(inheritedFromContractName, 1), 
                                vscode.SymbolKind.Class,
                                "  ↖ "+ inheritedFromContractName)
                            contractNodes[inheritedFromContractName] = currentContractNode
                            inheritedLevelNode.children.push(currentContractNode)
                            
                        }
                        // get the item to calculate range/location
                        let varSymbol = getSymbolKindForDeclaration(g_contracts[inheritedFromContractName].names[name])

                        let inheritanceNode = astNodeAsDocumentSymbol(
                            document, 
                            getFakeNode(varSymbol.name, 1), 
                            varSymbol.symbol, 
                            "  ↖ "+ varSymbol.prefix + varSymbol.name + varSymbol.suffix,
                            varSymbol.details)
                        currentContractNode.children.push(inheritanceNode)
                    }
                    
                }
                console.log("✓ inheritance")
            }
            if(token.isCancellationRequested){
                reject(token)
                return
            }
            console.log("done preparing symbols for: "+ document.fileName)
            console.log("resolve")
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

        /** experimental */
        context.subscriptions.push(
            vscode.languages.registerDocumentSymbolProvider({language: type}, new SolidityDocumentSymbolProvider()
        ));

    }
    
    setTimeout(onDidChange, 10000);
}

/* exports */
exports.activate = onActivate;