'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
 * 
 * */

const vscode = require('vscode');
const path = require('path');
const mod_parser = require('solidity-workspace');
const { getAstValueForExpression } = require('./symbols');
const settings = require('../settings');


const decoStyleRedLine = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    overviewRulerColor: 'blue',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        backgroundColor: `#E8625250`
    },
    dark: {
        // this color will be used in dark color themes
        backgroundColor: `#E9190F50`
    },
});

// create a decorator type that we use to decorate small numbers
const decoStyleStateVar = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'dotted',
    overviewRulerColor: 'blue',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        borderColor: 'DarkGoldenRod'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: 'GoldenRod'
    },
});

const decoStyleStateVarImmutable = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'dotted',
    //overviewRulerColor: 'blue',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        borderColor: 'DarkOrchid'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: 'Orchid'
    },
});

const decoStyleLightGreen = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'dotted',
    //overviewRulerColor: 'blue',
    //overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        borderColor: 'darkgreen'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: 'green'
    },
});

const decoStyleLightOrange = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'solid',
    overviewRulerColor: 'red',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        borderColor: 'red'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: 'red'
    },
});

const decoStyleLightBlue = vscode.window.createTextEditorDecorationType({
    borderWidth: '1px',
    borderStyle: 'dotted',
    overviewRulerColor: 'blue',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    light: {
        // this color will be used in light color themes
        borderColor: 'darkblue'
    },
    dark: {
        // this color will be used in dark color themes
        borderColor: 'lightblue'
    },
});

const decoStyleBlueBoldForeground = vscode.window.createTextEditorDecorationType({
    light: {
        // this color will be used in light color themes
        //color: 'GoldenRod',
        fontWeight: 'bold',
        //backgroundColor: 'DarkSlateGray'
    },
    dark: {
        // this color will be used in dark color themes
        color: 'Chocolate',
        //backgroundColor: 'Black',
        //fontWeight: 'bold',
        //textDecoration: 'underline overline #FF3028',
        //borderColor: 'GoldenRod',
        //borderStyle: 'solid',
        //borderWidth: '0.1px'
    },
    /*
    after: {
        textDecoration: "underline overline #FF3028",
        contentText: "<--"

    }
    */
});


var styles = {
    decoStyleStateVar: decoStyleStateVar,
    decoStyleStateVarImmutable: decoStyleStateVarImmutable,
    decoStyleLightGreen: decoStyleLightGreen,
    decoStyleLightOrange: decoStyleLightOrange,
    decoStyleLightBlue: decoStyleLightBlue,
    decoStyleRedLine: decoStyleRedLine,
    decoStyleBookmarkGreen: undefined,
    decoStyleBookmarkRed: undefined,
    decoStyleExternalCall: undefined

};


async function decorateWords(editor, words, decoStyle, commentMapper) {
    if (!editor) {
        return;
    }
    var smallNumbers = [];
    const text = editor.document.getText();

    words.forEach(function (word) {
        //var regEx = new RegExp("\\b" +word+"\\b" ,"g");
        var regEx = new RegExp(word, "g");
        let match;
        while (match = regEx.exec(text)) {
            if (commentMapper && commentMapper.indexIsInComment(match.index, match.index + match[0].trim().length)) {
                continue;
            }
            var startPos = editor.document.positionAt(match.index);
            var endPos = editor.document.positionAt(match.index + match[0].trim().length);
            //endPos.line = startPos.line; //hacky force
            var decoration = {
                range: new vscode.Range(startPos, endPos),
                //isWholeLine: true,

                //hoverMessage: 'StateVar **' + match[0] + '**' 
            };
            smallNumbers.push(decoration);
        }
    });
    console.log("✓ decorateWords " + words);
    editor.setDecorations(decoStyle, smallNumbers);
}

function doDeco(editor, decoArr) {
    if (!editor) {
        return;
    }
    editor.setDecorations(decoStyleStateVar, decoArr);
}

function HSLtoRGB(h, s, l) {
    let r, g, b;

    const rd = (a) => {
        return Math.floor(Math.max(Math.min(a * 256, 255), 0));
    };

    const hueToRGB = (m, n, o) => {
        if (o < 0) {
            o += 1;
        }
        if (o > 1) {
            o -= 1;
        }
        if (o < 1 / 6) {
            return m + (n - m) * 6 * o;
        }
        if (o < 1 / 2) {
            return n;
        }
        if (o < 2 / 3) {
            return m + (n - m) * (2 / 3 - o) * 6;
        }
        return m;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hueToRGB(p, q, h + 1 / 3);
    g = hueToRGB(p, q, h);
    b = hueToRGB(p, q, h - 1 / 3);

    return [rd(r), rd(g), rd(b)];
}

function RGBtoHex(r, g, b) {
    return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
}

var gutterIcons = {};


function varDecIsArray(node) {
    return node.typeName.type == "ArrayTypeName";
}

function varDecIsUserDefined(node) {
    return node.typeName.type == "UserDefinedTypeName";
}

function getVariableDeclarationType(node) {
    if (typeof node.typeName != "undefined") {
        if (varDecIsArray(node)) {
            node = node.typeName.baseTypeName;
        } else {
            node = node.typeName;
        }
    }

    if (node.type == "ElementaryTypeName") {
        return node.name;
    } else if (node.type == "UserDefinedTypeName") {
        return node.namePath;
    } else if (node.type == "Mapping") {
        node.namePath = "mapping( " + getVariableDeclarationType(node.keyType) + "=>" + getVariableDeclarationType(node.valueType) + " )";
        return node.namePath;
    } else {
        return null;
    }
}

function semanticHighlightFunctionParameters(arrIdents) {

    if (arrIdents.length <= 0) {
        return [];
    }

    let index = 0;
    let colorAssign = {};

    let funcNode = arrIdents[0].extra.inFunction;  // just take the first items ref to function
    var decorations = [];

    for (let name in funcNode.arguments) {
        colorAssign[name] = "styleArgument" + ((index += 1) % 15);
        let ident = funcNode.arguments[name];
        if (ident.name === null) {
            continue; //skip unnamed arguments (solidity allows function a(bytes,bytes))
        }
        let typeName = getVariableDeclarationType(ident);
        typeName = typeName ? typeName : "";
        decorations.push(
            {
                range: new vscode.Range(
                    new vscode.Position(ident.loc.end.line - 1, ident.loc.end.column),
                    new vscode.Position(ident.loc.end.line - 1, ident.loc.end.column + ident.name.length)
                ),
                hoverMessage: "(*" + typeName + "*) " + '**Argument** *' + funcNode._node.name + "*.**" + ident.name + '**',
                decoStyle: colorAssign[ident.name]
            });
    }


    arrIdents.forEach(function (ident) {
        let typeName = getVariableDeclarationType(ident.extra.declaration);
        decorations.push(
            {
                range: new vscode.Range(
                    new vscode.Position(ident.loc.start.line - 1, ident.loc.start.column),
                    new vscode.Position(ident.loc.end.line - 1, ident.loc.end.column + ident.name.length)
                ),
                hoverMessage: "(*" + typeName + "*) " + '**Argument** *' + funcNode._node.name + "*.**" + ident.name + '**',
                decoStyle: colorAssign[ident.name]
            });


    });
    console.log("✓ semantic highlight - " + funcNode._node.name);
    return decorations;
}

function init(context) {

    styles.decoStyleExternalCall = vscode.window.createTextEditorDecorationType({
        gutterIconPath: context.asAbsolutePath(path.join("images", "warning.svg")),
        gutterIconSize: "50%",
    });

    const decoSuffix = settings.extensionConfig().deco.argumentsSuffix;

    [...Array(15).keys()].forEach(function (idx) {
        styles["styleArgument" + idx] = vscode.window.createTextEditorDecorationType({
            //cursor: 'crosshair',
            // use a themable color. See package.json for the declaration and default values.
            wholeLine: false,
            light: {
                // this color will be used in light color themes
                backgroundColor: RGBtoHex(...HSLtoRGB(((5 + idx) * 19) % 255 / 255, 0.85, 0.75)) + "50"
            },
            dark: {
                // this color will be used in dark color themes
                backgroundColor: RGBtoHex(...HSLtoRGB(((8 + idx) * 19) % 255 / 255, 0.99, 0.55)) + "30"
                //color: RGBtoHex(...HSLtoRGB(((6+idx)*19)%255/255, 0.85, 0.75))+"95",
                //textDecoration: "underline" + RGBtoHex(...HSLtoRGB(((6+idx)*19)%255/255, 0.85, 0.75))+"95"
            },
            xbefore: {
                contentText: " " + idx + " ",
                color: "black",
                //fontStyle: "italic",
                backgroundColor: RGBtoHex(...HSLtoRGB(((6 + idx) * 19) % 255 / 255, 0.85, 0.75)) + "95",
                borderColor: "black"
            },
            after: {
                contentText: decoSuffix || undefined,
                fontStyle: "normal",
                color: RGBtoHex(...HSLtoRGB(((6 + idx) * 19) % 255 / 255, 0.85, 0.75)) + "95"
            }
        });
    });

    gutterIcons.red = context.asAbsolutePath("images/bookmark-red.svg");
    gutterIcons.green = context.asAbsolutePath("images/bookmark-green.svg");
    gutterIcons.blue = context.asAbsolutePath("images/bookmark-blue.svg");
    gutterIcons.issue = context.asAbsolutePath("images/bookmark-issue.svg");

    styles.decoStyleBookmarkRed = vscode.window.createTextEditorDecorationType({
        gutterIconPath: gutterIcons.red,
        light: {
            // this color will be used in light color themes
            //color: 'GoldenRod',
            fontWeight: 'bold',
            //backgroundColor: 'DarkSlateGray'
        },
        dark: {
            // this color will be used in dark color themes
            color: 'Chocolate',
            //backgroundColor: 'Black',
            //fontWeight: 'bold',
            //textDecoration: 'underline overline #FF3028',
            //borderColor: 'GoldenRod',
            //borderStyle: 'solid',
            //borderWidth: '0.1px'
        },
        /*
        after: {
            textDecoration: "underline overline #FF3028",
            contentText: "<--"
    
        }
        */
    });
    styles.decoStyleBookmarkGreen = vscode.window.createTextEditorDecorationType({
        gutterIconPath: gutterIcons.green,
        light: {
            // this color will be used in light color themes
            //color: 'GoldenRod',
            fontWeight: 'bold',
            //backgroundColor: 'DarkSlateGray'
        },
        dark: {
            // this color will be used in dark color themes
            color: 'Chocolate',
            //backgroundColor: 'Black',
            //fontWeight: 'bold',
            //textDecoration: 'underline overline #FF3028',
            //borderColor: 'GoldenRod',
            //borderStyle: 'solid',
            //borderWidth: '0.1px'
        },
        /*
        after: {
            textDecoration: "underline overline #FF3028",
            contentText: "<--"
    
        }
        */
    });
    styles.decoStyleBookmarkBlue = vscode.window.createTextEditorDecorationType({
        gutterIconPath: gutterIcons.blue,
        light: {
            // this color will be used in light color themes
            //color: 'GoldenRod',
            fontWeight: 'bold',
            //backgroundColor: 'DarkSlateGray'
        },
        dark: {
            // this color will be used in dark color themes
            color: 'Chocolate',
            //backgroundColor: 'Black',
            //fontWeight: 'bold',
            //textDecoration: 'underline overline #FF3028',
            //borderColor: 'GoldenRod',
            //borderStyle: 'solid',
            //borderWidth: '0.1px'
        },
        /*
        after: {
            textDecoration: "underline overline #FF3028",
            contentText: "<--"
    
        }
        */
    });
    styles.decoStyleBookmarkIssue = vscode.window.createTextEditorDecorationType({
        gutterIconPath: gutterIcons.issue,
        light: {
            // this color will be used in light color themes
            //color: 'GoldenRod',
            fontWeight: 'bold',
            //backgroundColor: 'DarkSlateGray'
        },
        dark: {
            // this color will be used in dark color themes
            color: 'Chocolate',
            //backgroundColor: 'Black',
            //fontWeight: 'bold',
            //textDecoration: 'underline overline #FF3028',
            //borderColor: 'GoldenRod',
            //borderStyle: 'solid',
            //borderWidth: '0.1px'
        },
        /*
        after: {
            textDecoration: "underline overline #FF3028",
            contentText: "<--"
    
        }
        */
    });
}

class CreateDecoStyle {
    static reserved(node) {
        let prefix = "**BUILTIN-RESERVED**  ❗RESERVED KEYWORD❗";
        let decoStyle = "decoStyleLightOrange";
        let decl_uri = "[more info..](https://solidity.readthedocs.io/en/latest/miscellaneous.html#reserved-keywords)";

        return {
            range: new vscode.Range(
                new vscode.Position(node.loc.start.line - 1, node.loc.start.column),
                new vscode.Position(node.loc.end.line - 1, node.loc.end.column + node.name.length)
            ),
            hoverMessage: prefix + "**" + node.name + '**' + " (" + decl_uri + ")",
            decoStyle: decoStyle
        };
    }
    static extCall(node) {
        return {
            range: new vscode.Range(
                new vscode.Position(node.loc.start.line - 1, node.loc.start.column),
                new vscode.Position(node.loc.start.line - 1, node.loc.start.column + mod_parser.parserHelpers.getAstNodeName(node.expression).length) //only highlight first if extcall spans multiple lines
            ),
            hoverMessage: "❗**EXTCALL**❗",
            decoStyle: "decoStyleExternalCall"
        };
    }
    static stateVarDecl(node, document, contract) {
        var prefix = "";
        let knownValue = "";
        var decoStyle = "decoStyleStateVar";

        let decl_uri = "([Declaration: #" + (node.loc.start.line) + "](" + document.uri + "#" + (node.loc.start.line) + "))";

        if (node.isDeclaredConst) {
            prefix = "**CONST**  ";
            decoStyle = "decoStyleLightGreen";
            knownValue = getAstValueForExpression(node.expression);
            knownValue = knownValue ? ` = **${knownValue}** ` : '';
        }

        if (node.hasOwnProperty('isImmutable') && node.isImmutable) {
            prefix = "**IMMUTABLE**  ";
            decoStyle = "decoStyleStateVarImmutable";
        }

        return {
            range: new vscode.Range(
                new vscode.Position(node.identifier.loc.start.line - 1, node.identifier.loc.start.column),
                new vscode.Position(node.identifier.loc.end.line - 1, node.identifier.loc.end.column + node.identifier.name.length)
            ),
            hoverMessage: prefix + "(*" + (node.typeName.type == "ElementaryTypeName" ? node.typeName.name : node.typeName.namePath) + "*) " + 'StateVar *' + contract.name + "*.**" + node.identifier.name + '**',
            decoStyle: decoStyle
        };
    }
    static stateVarIdent(node, document, contract, svar) {
        var prefix = "";
        let knownValue = "";
        var decoStyle = "decoStyleStateVar";

        let decl_uri = "([Declaration: #" + (svar.loc.start.line) + "](" + document.uri + "#" + (svar.loc.start.line) + "))";
        
        if (svar.isDeclaredConst) {
            prefix = "**CONST**  ";
            decoStyle = "decoStyleLightGreen";
            knownValue = getAstValueForExpression(svar.expression);
            knownValue = knownValue ? ` = **${knownValue}** ` : '';
        }

        if (svar.hasOwnProperty('isImmutable') && svar.isImmutable) {
            prefix = "**IMMUTABLE**  ";
            decoStyle = "decoStyleStateVarImmutable";
        }

        return {
            range: new vscode.Range(
                new vscode.Position(node.loc.start.line - 1, node.loc.start.column),
                new vscode.Position(node.loc.end.line - 1, node.loc.end.column + node.name.length)
            ),
            hoverMessage: prefix + "(*" + (svar.typeName.type == "ElementaryTypeName" ? svar.typeName.name : svar.typeName.namePath) + "*) " + '**StateVar** *' + contract.name + "*.**" + svar.name + '**' + knownValue + " " + decl_uri,
            decoStyle: decoStyle
        };
    }
    static shadowedStateVar(node, document, contract, declaration, prefix) {
        let decoStyle = "decoStyleLightOrange";
        prefix = prefix || "❗SHADOWED❗";
        let decl_uri = "([Declaration: #" + (declaration.loc.start.line) + "](" + document.uri + "#" + (declaration.loc.start.line) + "))";

        return {
            range: new vscode.Range(
                new vscode.Position(node.loc.start.line - 1, node.loc.start.column),
                new vscode.Position(node.loc.end.line - 1, node.loc.end.column + node.name.length)
            ),
            hoverMessage: prefix + "(*" + (declaration.typeName.type == "ElementaryTypeName" ? declaration.typeName.name : declaration.typeName.namePath) + "*) " + '**StateVar** *' + contract.name + "*.**" + declaration.name + '**' + " " + decl_uri,
            decoStyle: decoStyle
        };
    }
    static shadowedInheritedStateVar(node, document, contract, declaration) {
        let decoStyle = "decoStyleLightOrange";
        let prefix = "**INHERITED**  ❗SHADOWED❗";
        declaration = declaration || node;
        let decl_uri = "([Declaration: #" + (node.loc.start.line) + "](" + document.uri + "#" + (node.loc.start.line) + "))";
        let knownType = "undef";

        let subcontract = contract.inherited_names[node.name];
        if(subcontract){
            let foreignSourceUnit = subcontract._parent;
            let uri = vscode.Uri.file(foreignSourceUnit.filePath);
            declaration = subcontract.names[node.name]._node || node;
            decl_uri = "([Declaration: " + subcontract + "#" + (declaration.loc.start.line) + "](" + uri + "#" + (declaration.loc.start.line) + "))";
            knownType = getVariableDeclarationType(declaration);
        }
        

        return {
            range: new vscode.Range(
                new vscode.Position(node.loc.start.line - 1, node.loc.start.column),
                new vscode.Position(node.loc.end.line - 1, node.loc.end.column + node.name.length)
            ),
            hoverMessage: prefix + "(*" + knownType + "*) " + '**StateVar** *' + subcontract.name + "*.**" + node.name + '**' + " " + decl_uri,
            decoStyle: decoStyle
        };
    }
    static inheritedStateVar(node, document, contract, declaration){
        let decoStyle = "decoStyleLightBlue";
        let prefix = "**INHERITED**  ";
        declaration = declaration || node;
        let decl_uri = "([Declaration: #" + (declaration.loc.start.line) + "](" + document.uri + "#" + (declaration.loc.start.line) + "))";
        let knownType = getVariableDeclarationType(declaration);

        let subcontract = contract.inherited_names[node.name];
        if(subcontract){
            let foreignSourceUnit = subcontract._parent;
            let uri = vscode.Uri.file(foreignSourceUnit.filePath);
            declaration = subcontract.names[node.name] || node;
            declaration = declaration.hasOwnProperty("_node") ? declaration._node : declaration;
            decl_uri = "([Declaration: " + subcontract.name + "#" + (declaration.loc.start.line) + "](" + uri + "#" + (declaration.loc.start.line) + "))";
            knownType = getVariableDeclarationType(declaration);
        }
    
        return {
            range: new vscode.Range(
                new vscode.Position(node.loc.start.line - 1, node.loc.start.column),
                new vscode.Position(node.loc.end.line - 1, node.loc.end.column + node.name.length)
            ),
            hoverMessage: prefix + "(*" + (knownType || "?") + "*) " + '**StateVar** *' + (subcontract ? subcontract.name : "Unknown") + "*.**" + node.name + '**' + " " + decl_uri,
            decoStyle: decoStyle
        };
    }
}


module.exports = {
    init: init,
    decoStyleStateVar: decoStyleStateVar,
    styles: styles,
    doDeco: doDeco,
    decorateWords: decorateWords,
    semanticHighlightFunctionParameters: semanticHighlightFunctionParameters,
    CreateDecoStyle: CreateDecoStyle
};