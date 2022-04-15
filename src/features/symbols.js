'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
 * 
 * */

const vscode = require('vscode');
const settings = require('../settings.js');

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
        };
}

const stateMutabilityToIcon = {
    view:"👀",
    pure:"🌳",
    constant:"👀",
    payable:"💰"
};
const visibilityToIcon = {
    external:"❗️",
    public:"❗️",
    private:"🔐",
    internal:"🔒"
};

function getStateMutabilityToIcon(state){
    let v = stateMutabilityToIcon[state];
    if (typeof v == "undefined")
        return "";
    return v;
}

function getVisibilityToIcon(state){
    let v = visibilityToIcon[state];
    if (typeof v == "undefined")
        return "";
    return v;
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
    );
    
}

function varDecIsArray(node){
    return node.typeName.type=="ArrayTypeName";
}

function varDecIsUserDefined(node){
    return node.typeName.type=="UserDefinedTypeName";
}

function getVariableDeclarationType(node){
    if (typeof node.typeName != "undefined"){
        if(varDecIsArray(node)){
            node = node.typeName.baseTypeName;
        } else 
            node = node.typeName;
    }
    
    if(node.type=="ElementaryTypeName"){
        return node.name;
    } else if (node.type=="UserDefinedTypeName"){
        return node.namePath;
    } else if (node.type=="Mapping"){
        node.namePath = "mapping( " + getVariableDeclarationType(node.keyType)+ "=>" +getVariableDeclarationType(node.valueType)+ " )";
        return node.namePath;
    } else {
        return null;
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
};

function getVariableDeclarationTypeAsSymbolKind(node, _default){
    if(varDecIsUserDefined(node)){
        return varDecToSymbolType.user;
    }

    let solidityType = getVariableDeclarationType(node);
    if (!solidityType)
        return _default;
        
    if (solidityType.startsWith("uint") || solidityType.startsWith("int")){
        return varDecToSymbolType.uint;
    } else if (solidityType.startsWith("bytes")){
        return varDecToSymbolType.bytes;
    }

    let kind = varDecToSymbolType[solidityType];
    return typeof kind!="undefined"?kind:_default;
    
}

function getSymbolKindForDeclaration(node){
    let astnode = typeof node._node!="undefined"?node._node:node;
    let result = {
        symbol: vscode.SymbolKind.Variable,
        prefix: "",
        suffix: "",
        name: typeof astnode.name!="undefined" ? astnode.name:"",
        details: ""
    };

    switch(astnode.type) {
        case "ModifierInvocation":
        case "ModifierDefinition":
            result.symbol = vscode.SymbolKind.Method;

            result.prefix += "Ⓜ ";

            if (settings.extensionConfig().outline.decorations){
                result.prefix += getVisibilityToIcon(astnode.visibility);
                result.prefix += getStateMutabilityToIcon(astnode.stateMutability);
            }
            break;
        case "EventDefinition":
            result.symbol = vscode.SymbolKind.Event;
            break;
        case "FunctionDefinition":
            if (astnode.isConstructor){
                result.symbol = vscode.SymbolKind.Constructor;
                result.name = "⚜ __constructor__ " + (result.name?result.name:"");
            } else {
                result.symbol = vscode.SymbolKind.Function;
            }
            if (settings.extensionConfig().outline.decorations){
                result.prefix += getVisibilityToIcon(astnode.visibility);
                result.prefix += getStateMutabilityToIcon(astnode.stateMutability);
            }

            if (settings.extensionConfig().outline.extras){
                result.suffix += " ( ",
                result.suffix += " complex: " + node.complexity;
                result.suffix += " state: " + (node.accesses_svar?"☑":"☐");
                result.suffix += " )";
            }
            break;
        case "EnumDefinition":
            result.symbol = vscode.SymbolKind.Enum;
            break;
        case "StructDefinition":
            result.symbol = vscode.SymbolKind.Struct;
            break;
        case "VariableDeclaration":
            if(settings.extensionConfig().outline.var.storage_annotations){
                if(astnode.storageLocation=="memory"){
                    result.prefix +="💾";
                    result.details += astnode.storageLocation;
                } else if(astnode.storageLocation=="storage"){
                    result.prefix +="💽";
                    result.details += astnode.storageLocation;
                }
            }
            if(varDecIsArray(astnode)){
                result.name += "[]";
            }

            if(astnode.isDeclaredConst){
                result.symbol = vscode.SymbolKind.Constant;
                break;
            }
            //result.symbol = vscode.SymbolKind.Variable

            result.symbol = getVariableDeclarationTypeAsSymbolKind(astnode, vscode.SymbolKind.Variable);
            break;
        case "Parameter":
            if(settings.extensionConfig().outline.var.storage_annotations){
                if(astnode.storageLocation=="memory"){
                    result.prefix +="💾";
                    result.details += astnode.storageLocation;
                } else if(astnode.storageLocation=="storage"){
                    result.prefix +="💽";
                    result.details += astnode.storageLocation;
                }
            }
            if(varDecIsArray(astnode)){
                result.name += "[]";
            }
            result.symbol = vscode.SymbolKind.TypeParameter;  // lets misuse this kind for params
            break;
        case "ContractDefinition":
            if(astnode.kind=="interface"){
                result.symbol = vscode.SymbolKind.Interface;
            } else if(astnode.kind=="library"){
                result.symbol = vscode.SymbolKind.Class;
                result.prefix += "📚";
            } else {
                result.symbol = vscode.SymbolKind.Class;
            }
            break;
        case "AssemblyFunctionDefinition":
            result.symbol = vscode.SymbolKind.Function;
            break;
        default:
            console.error("<-----");
    }
    if(result.prefix){
        result.prefix = result.prefix + " "; //add space
    }
    return result;
}  

function getAstValueForExpression(astnode){

    switch(astnode.type) {
        case "NumberLiteral":
            return `${astnode.number}${astnode.subdenominator ? astnode.subdenominator : ''}`;
        case "BooleanLiteral":
            return astnode.value ? "true":"false";
        case "StringLiteral":
        case "HexLiteral":
        case "HexNumber":
        case "DecimalNumber":
            return astnode.value;
        default:
            return "";
    }
}


class SolidityDocumentSymbolProvider{

    constructor(g_workspace, cb_analyze){
        this.g_workspace = g_workspace;
        this.cb_analyze = cb_analyze;
    }
    
    provideDocumentSymbols(document, token){
        console.log("preparing symbols...");

        return new Promise((resolve, reject) => {
            var symbols = [];

            console.log("force ast refresh..!"); //fixme!
            this.cb_analyze(token, document);  //remove this hack
            
            if(token.isCancellationRequested){
                reject(token);
                return;
            }
            //var insights = this.g_workspace.inspect(document.getText(), document.fileName, true, token);
            try {
                this.g_workspace.add(document.fileName, { content: document.getText() }).then((insights)=>{
                    console.log(`✓ inspect ${insights.filePath}`);
    
                    console.log("--- preparing symbols for: "+ document.fileName);
    
                    if(token.isCancellationRequested){
                        reject(token);
                        return;
                    }
    
                    var topLevelNode;
    
                    if(settings.extensionConfig().outline.pragmas.show){
                        topLevelNode = astNodeAsDocumentSymbol(
                            document, 
                            getFakeNode("pragma",1),
                            vscode.SymbolKind.Namespace,
                            "pragma",
                            "... (" + insights.pragmas.length + ")"
                        );
                        symbols.push(topLevelNode);
                        insights.pragmas.forEach(function(item){
                            topLevelNode.children.push(astNodeAsDocumentSymbol(
                                document, 
                                item, 
                                vscode.SymbolKind.Namespace, 
                                item.name + " → " + item.value));
                        });
                        console.log("✓ pragmas ");
                    }
                    
                    if(settings.extensionConfig().outline.imports.show){
                        topLevelNode = astNodeAsDocumentSymbol(
                            document, 
                            getFakeNode("imports",1),
                            vscode.SymbolKind.Namespace,
                            "imports",
                            "... (" + insights.imports.length + ")"
                        );
                        symbols.push(topLevelNode);
                        insights.imports.forEach(function(item){
                            topLevelNode.children.push(astNodeAsDocumentSymbol(
                                document, 
                                item, 
                                vscode.SymbolKind.File, 
                                item.path));
                            });
                        
                        console.log("✓ imports ");
                    }
                    
                    for (var contractName in insights.contracts) {
                    
                        let symbolAnnotation = getSymbolKindForDeclaration(insights.contracts[contractName]);
                        topLevelNode = astNodeAsDocumentSymbol(
                            document,
                            insights.contracts[contractName]._node,
                            symbolAnnotation.symbol,
                            symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix
                        );
                        symbols.push(topLevelNode);
    
                        /** the document */
                        console.log("✓ contracts " + contractName);
                        /** constructor - if known */
                        if (insights.contracts[contractName].constructor){
                            topLevelNode.children.push(astNodeAsDocumentSymbol(document, insights.contracts[contractName].constructor._node, vscode.SymbolKind.Constructor));
                        }
                        console.log("✓ constructor");
                        /** stateVars */
                        for (var svar in insights.contracts[contractName].stateVars){
                            let symbolAnnotation = getSymbolKindForDeclaration(insights.contracts[contractName].stateVars[svar]);
                            
                            topLevelNode.children.push(astNodeAsDocumentSymbol(
                                document, 
                                insights.contracts[contractName].stateVars[svar], 
                                symbolAnnotation.symbol,
                                symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                symbolAnnotation.details));
                        
                        } 
                        console.log("✓ statevars");
                        
                        for (let name in insights.contracts[contractName].enums){
                            topLevelNode.children.push(astNodeAsDocumentSymbol(
                                document, 
                                insights.contracts[contractName].enums[name], 
                                vscode.SymbolKind.Enum));
                        }
                        console.log("✓ enums");
                        for (let name in insights.contracts[contractName].structs){
                            topLevelNode.children.push(astNodeAsDocumentSymbol(document, insights.contracts[contractName].structs[name], vscode.SymbolKind.Struct));
                        } 
                        console.log("✓ structs");
                        var functionLevelNode;
                        /** functions - may include constructor / fallback */
                        for (let funcObj of insights.contracts[contractName].functions){
    
                            
                            let symbolAnnotation = getSymbolKindForDeclaration(funcObj);
                            functionLevelNode = astNodeAsDocumentSymbol(
                                document, 
                                funcObj._node, 
                                symbolAnnotation.symbol, 
                                symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                symbolAnnotation.details);
            
                            topLevelNode.children.push(functionLevelNode);
                            // add a fake modifiers list to outline
                            // add pseudonode modifiers
                            let numModifiers = Object.keys(funcObj.modifiers).length;
                            if(numModifiers!==0){
                                let modifiersLevelNode = astNodeAsDocumentSymbol(
                                    document, 
                                    getFakeNode("modifiers",1),
                                    vscode.SymbolKind.Namespace,
                                    "modifiers",
                                    "... (" + numModifiers + ")"
                                    );
                                functionLevelNode.children.push(modifiersLevelNode);
                                // add modifiers
                                for (let modifierName in funcObj.modifiers){
                                    let vardec = funcObj.modifiers[modifierName];
                                    
                                    let symbolAnnotation = getSymbolKindForDeclaration(vardec);
                                    
                                    modifiersLevelNode.children.push(astNodeAsDocumentSymbol(
                                        document, 
                                        vardec, 
                                        symbolAnnotation.symbol,
                                        symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                        symbolAnnotation.details
                                        ));
                                }
                            }
    
                            // add fake assembly functions list to outline
                            let numAssemblyFuncDefs = Object.keys(funcObj.assemblyFunctions).length;
                            if(numAssemblyFuncDefs!==0){
                                let assemblyLevelNode = astNodeAsDocumentSymbol(
                                    document, 
                                    getFakeNode("assembly..",1),
                                    vscode.SymbolKind.Namespace,
                                    "assembly",
                                    "... (" + numAssemblyFuncDefs + ")"
                                    );
                                
                                functionLevelNode.children.push(assemblyLevelNode);
                                // add modifiers
                                for (let modifierName in funcObj.assemblyFunctions){
                                    let vardec = funcObj.assemblyFunctions[modifierName];
                                    
                                    let symbolAnnotation = getSymbolKindForDeclaration(vardec);
                                    
                                    assemblyLevelNode.children.push(astNodeAsDocumentSymbol(
                                        document, 
                                        vardec, 
                                        symbolAnnotation.symbol,
                                        symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                        symbolAnnotation.details
                                        ));
                                }
                            }
                            //get all declarations in function
                            
    
                            for (let declaration in funcObj.declarations){
                                let vardec = funcObj.declarations[declaration];
                                if(declaration=="null")
                                    continue;
                                
                                let symbolAnnotation = getSymbolKindForDeclaration(vardec);
                                
                                functionLevelNode.children.push(astNodeAsDocumentSymbol(
                                    document, 
                                    vardec, 
                                    symbolAnnotation.symbol,
                                    symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                    symbolAnnotation.details
                                    ));
                            }
                            
                        }
                        console.log("✓ functions");
                        
                        /** modifiers */
                        for (let functionName in insights.contracts[contractName].modifiers){
    
                            let symbolAnnotation = getSymbolKindForDeclaration(insights.contracts[contractName].modifiers[functionName]);
                            functionLevelNode = astNodeAsDocumentSymbol(
                                document, 
                                insights.contracts[contractName].modifiers[functionName]._node, 
                                symbolAnnotation.symbol, 
                                symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                symbolAnnotation.details);
    
                            topLevelNode.children.push(functionLevelNode);
                            //get all declarations in function
                            for (let declaration in insights.contracts[contractName].modifiers[functionName].declarations){
                                let vardec = insights.contracts[contractName].modifiers[functionName].declarations[declaration];
                                if(declaration=="null")
                                    continue;
                                let symbolAnnotation = getSymbolKindForDeclaration(vardec);
                                functionLevelNode.children.push(astNodeAsDocumentSymbol(
                                    document, 
                                    vardec, 
                                    symbolAnnotation.symbol,
                                    symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                    symbolAnnotation.details
                                ));
                        
                            }
                        }
                        console.log("✓ modifiers");
                        /** events */
                        for (let eventObj of insights.contracts[contractName].events){
    
                            let symbolAnnotation = getSymbolKindForDeclaration(eventObj);
                            functionLevelNode = astNodeAsDocumentSymbol(
                                document, 
                                eventObj._node, 
                                symbolAnnotation.symbol, 
                                symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                symbolAnnotation.details);
    
                            topLevelNode.children.push(functionLevelNode);
    
                            //get all declarations in function
                            for (let declaration in eventObj.declarations){
                                let vardec = eventObj.declarations[declaration];
                                if(declaration=="null")
                                    continue;
                                let symbolAnnotation = getSymbolKindForDeclaration(vardec);
                                functionLevelNode.children.push(astNodeAsDocumentSymbol(
                                    document, 
                                    vardec, 
                                    symbolAnnotation.symbol,
                                    symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                    symbolAnnotation.details
                                    ));
                            }
                        }
                        console.log("✓ events");
                        /** functions - may include constructor / fallback */
                        if(settings.extensionConfig().outline.inheritance.show){
    
                            var inheritedLevelNode = astNodeAsDocumentSymbol(
                                document, 
                                getFakeNode("↖ ...", 1),
                                vscode.SymbolKind.Namespace,
                                );
                            topLevelNode.children.push(inheritedLevelNode);
    
                            let contractCache = {};
                            let contractNodes = {};
                            for (var name in insights.contracts[contractName].inherited_names){
                                //skip self
                                let inheritedFromContract = insights.contracts[contractName].inherited_names[name];
                                let inheritedFromContractName = inheritedFromContract.name;
                                if(inheritedFromContractName==contractName)
                                    continue;
                                //skip functions, modifiers, events of local contract
                                if(typeof insights.contracts[contractName].names[name]!="undefined")
                                    continue;
                                
                                let _contract = contractCache[inheritedFromContractName];
    
                                if(!_contract){
                                    let _contract = this.g_workspace.findContractsByNameSync(inheritedFromContractName);
                                    if(_contract.length==0){
                                        console.warn(`symbol/inheritance: contract ${inheritedFromContractName} not found :/. skipping.`)
                                        continue; 
                                    }
                                    _contract = _contract.pop(); //pop one item. ignore multiple results
                                    contractCache[inheritedFromContractName] = _contract;
                                }
                                
    
                                let symbolAnnotation;
                                if(typeof _contract=="undefined"){
                                    //contract not found :/
                                    symbolAnnotation = {
                                        symbol:vscode.SymbolKind.Class,
                                        name:inheritedFromContractName,
                                        prefix:"",
                                        suffix:"",
                                        details:"<not found>",
                                    };
                                } else {
                                    symbolAnnotation = getSymbolKindForDeclaration(_contract);
                                }
    
                                let currentContractNode = contractNodes[inheritedFromContractName];
                                if(typeof currentContractNode=="undefined"){
                                    currentContractNode = astNodeAsDocumentSymbol(
                                        document, 
                                        getFakeNode(inheritedFromContractName, 1), 
                                        symbolAnnotation.symbol,
                                        "  ↖ "+ symbolAnnotation.prefix + symbolAnnotation.name + symbolAnnotation.suffix,
                                        symbolAnnotation.details);
                                    contractNodes[inheritedFromContractName] = currentContractNode;
                                    inheritedLevelNode.children.push(currentContractNode);
                                    
                                }
                                // get the item to calculate range/location
                                let varSymbol;
                                try {
                                    varSymbol = getSymbolKindForDeclaration(_contract.names[name]);
                                } catch(e){
                                    varSymbol = {
                                        symbol:vscode.SymbolKind.Variable,
                                        name:name,
                                        prefix:"",
                                        suffix:"",
                                        details:"<not found>",
                                    };
                                }
                                let inheritanceNode = astNodeAsDocumentSymbol(
                                    document, 
                                    getFakeNode(varSymbol.name, 1), 
                                    varSymbol.symbol, 
                                    "  ↖ "+ varSymbol.prefix + varSymbol.name + varSymbol.suffix,
                                    varSymbol.details);
                                currentContractNode.children.push(inheritanceNode);
                            }
                            
                        }
                        console.log("✓ inheritance");
                    }
                    if(token.isCancellationRequested){
                        reject(token);
                        return;
                    }
                    console.log("✓✓✓ done preparing symbols for: "+ document.fileName);
                    resolve(symbols);
    
                }).catch(e => {
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

        });

    }
}


module.exports = {
    SolidityDocumentSymbolProvider:SolidityDocumentSymbolProvider,
    getVariableDeclarationType:getVariableDeclarationType,
    getAstValueForExpression:getAstValueForExpression
};