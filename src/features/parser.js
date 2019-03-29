/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * */
const vscode = require('vscode');
const fs = require('fs')
const path = require('path');
const parser = require('solidity-parser-antlr');
const parserHelpers = require("./parser/parserHelpers")
const { linearize } = require('c3-linearization')
const crypto = require('crypto');
const solidityVAConfig = vscode.workspace.getConfiguration('solidity-va');


class SolidityParser{

    constructor(){
        this.contracts = {}
        this.ast_cache = {}
        this.sourceUnits = {}
        this.inheritance = null
    }

    inspect(input, filepath, parseImports, cancellationToken){
        if(cancellationToken.isCancellationRequested){
            throw cancellationToken
        }

        if (typeof filepath=="undefined")
            filepath = vscode.window.activeTextEditor.document.fileName
        typeof parseImports == "undefined" || parseImports==false ? false : true

        console.log("→ inspect:   " + filepath)
        if (!fs.existsSync(filepath)){
            console.error("[ERR] file does not exist! --> " + filepath)
            return
        }
        /** cachelookup first */
        let hash = crypto.createHash('sha1').update(input).digest('base64')
        
        if (this.ast_cache[hash]!=undefined){
            console.log("✓ [CACHE HIT] inspect:   " + filepath + "//CACHE DONE")
            return this.ast_cache[hash]  //return cached
        }
        /** parse magic */
        let sourceUnit = this.parseSourceUnit(input);
        console.log("✓ [NEW] inspect:   " + filepath + "//DONE")

        /** cache it */
        sourceUnit.hash = hash;
        sourceUnit.filepath = filepath;
        this.ast_cache[hash]=sourceUnit;  //cache it
        this.sourceUnits[sourceUnit.filepath] = sourceUnit
        for (var contractName in sourceUnit.contracts) {
            this.contracts[contractName] = sourceUnit.contracts[contractName]
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
                    imp.ast = this.inspectFile(importPath, true, cancellationToken)  // this caches automatically
                } catch (e) {
                    console.error(e)
                }
            }, this)
        }
        /** we're done */
        // should we flatten inherited functions to one object?
        return sourceUnit;

    }

    async inspectFile(file, parseImports, cancellationToken){
        return new Promise((resolve, reject) => {
            console.log("inspectFILE - "+file)
            let content
            try {
                content = fs.readFileSync(file).toString('utf-8')
            } catch (e) {
                if (e.code === 'EISDIR') {
                    console.error(`Skipping directory ${file}`)
                } else
                    reject(e)
                    //throw e;
            }
            //let hash = crypto.createHash('sha1').update(content).digest('base64')
            //if (this.ast_cache[hash]!=undefined)
            //    return this.ast_cache[hash]  //return cached
            let sourceUnit = this.inspect(content, file, parseImports, cancellationToken)
            //sourceUnit.hash = hash
            //this.ast_cache[hash]=sourceUnit;  //cache it
            //resolve(sourceUnit)
            resolve(sourceUnit)
            //return sourceUnit;
        });
    }

    parseSourceUnit(input){
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
                    Mapping(_node){
                        current_contract.mappings[_node.name]=_node
                    },
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
                            modifiers: {},   // quick access to modifiers
                            arguments: {},  // declarations: quick access to argument list
                            returns: {},  // declarations: quick access to return argument list
                            declarations: {},  // all declarations: arguments+returns+body
                            identifiers: [],  // all identifiers (use of variables)
                            complexity: 0,    // we just count nr. of branching statements here
                            accesses_svar: false, //
                            calls: []  // internal and external calls
                        }
                        current_function = current_contract.functions[_node.name];
                        current_contract.names[_node.name]=current_function;
                        // subparse modifier list
                        parser.visit(_node.modifiers, {
                            ModifierInvocation: function(__node){
                                current_function.modifiers[__node.name]=__node
                            }
                        })
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
                            FunctionCall(__node){
                                current_function.complexity += 2;

                                var current_funccall = {
                                    _node: __node,
                                    name: null,
                                    contract_name: current_contract,
                                    visibility: "internal",
                                    type:"regular"
                                }
                                
                                current_function.calls.push(current_funccall)
                                const expr = __node.expression;

                                if (parserHelpers.isRegularFunctionCall(__node)) {
                                    current_funccall.name = expr.name;
                                    current_funccall.type ="regular";
                                    
                                } else if (parserHelpers.isMemberAccess(__node)) {
                                    current_funccall.name = expr.memberName;
                                    current_funccall.type ="memberAccess";

                                    if (expr.expression.hasOwnProperty('name')) {

                                    // checking if it is a member of `address` and pass along it's contents
                                    } else if (parserHelpers.isMemberAccessOfAddress(__node)) {
                                        current_funccall.type ="memberAccessOfAddress";

                                    // checking if it is a typecasting to a user-defined contract type
                                    } else if (parserHelpers.isAContractTypecast(__node)) {
                                        current_funccall.type ="contractTypecast"
                                        
                                    } else {
                                        //
                                    }
                                }
                            }
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
                                __node.scope = undefined;
                                __node.scopeRef = undefined;
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
                        global: typeof sourceUnit.contracts[contract].stateVars[identifier.name]=="undefined"?new Array():sourceUnit.contracts[contract].stateVars[identifier.name]
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

    findImportedContract(sourceUnit, searchName){
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

    linearizeContract(sourceUnit){
        let dependencies = {}
        for (var contractName in sourceUnit.contracts) {
            dependencies[contractName] = sourceUnit.contracts[contractName].dependencies;
            sourceUnit.contracts[contractName].dependencies.forEach(function(dep){
                let contract = this.contracts[dep]
                if(typeof contract=="undefined"){
                    console.error("ERROR - could not load contract object for "+dep)
                    return
                }
                dependencies[dep]=contract.dependencies  // this needs to be recursive otherwise we'll only see the first layer
            }, this)
        }
        // fetch all other contracts that may be referenced in dependencies
        // TODO: this is probably wrong. we need to c3 linearize contract for contract
        for (var depName in dependencies) {
            dependencies[depName].forEach(function(dep){
                if(dependencies.hasOwnProperty(dep)){
                    return  // alrerady in our list
                }
                let contract = this.contracts[dep]
                if(typeof contract=="undefined"){
                    console.error("ERROR - could not load contract object for "+dep)
                    return
                }
                dependencies[dep]=contract.dependencies  // this needs to be recursive otherwise we'll only see the first layer
            }, this)
        }
        return linearize(dependencies, {reverse: true})
    }

}


module.exports = {
    SolidityParser:SolidityParser
}