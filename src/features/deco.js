const vscode = require('vscode');

let activeEditor = vscode.window.activeTextEditor;

// create a decorator type that we use to decorate small numbers
const decoStyleBoxedLightBlue = vscode.window.createTextEditorDecorationType({
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

const decoStyleBlueBoldForeground= vscode.window.createTextEditorDecorationType({
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


// create a decorator type that we use to decorate large numbers
const largeNumberDecorationType = vscode.window.createTextEditorDecorationType({
    cursor: 'crosshair',
    // use a themable color. See package.json for the declaration and default values.
    backgroundColor: { id: 'myextension.largeNumberBackground' }
});


var styles = {
    decoStyleBoxedLightBlue:decoStyleBoxedLightBlue,
    decoStyleLightGreen:decoStyleLightGreen,
    decoStyleLightOrange:decoStyleLightOrange,
    decoStyleLightBlue:decoStyleLightBlue,
    decoStyleBookmarkGreen:undefined,
    decoStyleBookmarkRed:undefined
}

function updateDecorations() {
    if (!activeEditor) {
        return;
    }
    const regEx = /\d+/g;
    const text = activeEditor.document.getText();
    const smallNumbers= [];
    const largeNumbers= [];
    let match;
    while (match = regEx.exec(text)) {
        const startPos = activeEditor.document.positionAt(match.index);
        const endPos = activeEditor.document.positionAt(match.index + match[0].length);
        const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: 'Number **' + match[0] + '**' };
        if (match[0].length < 3) {
            smallNumbers.push(decoration);
        } else {
            largeNumbers.push(decoration);
        }
    }
    activeEditor.setDecorations(decoStyleBoxedLightBlue, smallNumbers);
    activeEditor.setDecorations(largeNumberDecorationType, largeNumbers);
}

async function decorateWords(editor, words, decoStyle, commentMapper){
    if (!editor) {
        return;
    }
    var smallNumbers= [];
    const text = editor.document.getText();

    words.forEach(function(word){
        //var regEx = new RegExp("\\b" +word+"\\b" ,"g");
        var regEx = new RegExp( word ,"g");
        let match;
        while (match = regEx.exec(text)) {
            if(commentMapper && commentMapper.indexIsInComment(match.index, match.index + match[0].trim().length)){
                continue
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
    })
    console.log("✓ decorateWords " + words)
    editor.setDecorations(decoStyle, smallNumbers);
}

function doDeco(editor, decoArr){
    if (!editor) {
        return;
    }
    editor.setDecorations(decoStyleBoxedLightBlue, decoArr);
}

function HSLtoRGB(h, s, l) {
    let r, g, b;
    
    const rd = (a) => {
      return Math.floor(Math.max(Math.min(a*256, 255), 0)); 
    };
    
    const hueToRGB = (m, n, o) => {
      if (o < 0) o += 1;
      if (o > 1) o -= 1;
      if (o < 1/6) return m + (n - m) * 6 * o;
      if (o < 1/2) return n;
      if (o < 2/3) return m + (n - m) * (2/3 - o) * 6;
      return m;
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hueToRGB(p, q, h + 1/3);
    g = hueToRGB(p, q, h);
    b = hueToRGB(p, q, h - 1/3);
  
    return [rd(r), rd(g), rd(b)]
  }
  
  function RGBtoHex(r, g, b) {
    return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
  }
  
var gutterIcons = {};


function varDecIsArray(node){
    return node.typeName.type=="ArrayTypeName"
}

function varDecIsUserDefined(node){
    return node.typeName.type=="UserDefinedTypeName"
}

function getVariableDeclarationType(node){
    if (typeof node.typeName != "undefined"){
        if(varDecIsArray(node)){
            node = node.typeName.baseTypeName 
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
        return null
    }
}

function semanticHighlightFunctionParameters(arrIdents){
    
    if(arrIdents.length<=0)
        return []
    
    let index = 0;
    let colorAssign = {};

    let funcNode = arrIdents[0].inFunction;  // just take the first items ref to function
    var decorations = new Array();

    for(let name in funcNode.arguments){
        colorAssign[name]="styleArgument" +(index++%15);
        let ident = funcNode.arguments[name];
        if(ident.name===null){
            continue //skip unnamed arguments (solidity allows function a(bytes,bytes))
        }
        let typeName = getVariableDeclarationType(ident);
        typeName = typeName?typeName:""
        decorations.push(
            { 
                range: new vscode.Range(
                    new vscode.Position(ident.loc.end.line-1, ident.loc.end.column),
                    new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                    ),
                hoverMessage: "(*"+ typeName +"*) " +'**Argument** *' + funcNode._node.name + "*.**"+ident.name + '**',
                decoStyle: colorAssign[ident.name]
            });
    }

    
    arrIdents.forEach(function(ident){
        let typeName = getVariableDeclarationType(ident.scopeRef);
        decorations.push(
            { 
                range: new vscode.Range(
                    new vscode.Position(ident.loc.start.line-1, ident.loc.start.column),
                    new vscode.Position(ident.loc.end.line-1, ident.loc.end.column+ident.name.length)
                    ),
                hoverMessage: "(*"+ typeName +"*) " +'**Argument** *' + funcNode._node.name + "*.**"+ident.name + '**',
                decoStyle: colorAssign[ident.name]
            });


    })
    console.log("✓ semantic highlight - " + funcNode._node.name);
    return decorations
}

function init(context, config){
    [...Array(15).keys()].forEach(function(idx){
        styles["styleArgument"+idx] = vscode.window.createTextEditorDecorationType({
            //cursor: 'crosshair',
            // use a themable color. See package.json for the declaration and default values.
            wholeLine: false,
            light: {
                // this color will be used in light color themes
                backgroundColor: RGBtoHex(...HSLtoRGB(((5+idx)*19)%255/255, 0.85, 0.75))+"50"
            },
            dark: {
                // this color will be used in dark color themes
                backgroundColor: RGBtoHex(...HSLtoRGB(((8+idx)*19)%255/255, 0.99, 0.55))+"30"
                //color: RGBtoHex(...HSLtoRGB(((6+idx)*19)%255/255, 0.85, 0.75))+"95",
                //textDecoration: "underline" + RGBtoHex(...HSLtoRGB(((6+idx)*19)%255/255, 0.85, 0.75))+"95"
            },
            xbefore :{
                contentText: " " + idx + " ",
                color: "black",
                //fontStyle: "italic",
                backgroundColor: RGBtoHex(...HSLtoRGB(((6+idx)*19)%255/255, 0.85, 0.75))+"95",
                borderColor: "black"
            },
            after: {
                contentText:"⬆",
                fontStyle: "normal",
                color: RGBtoHex(...HSLtoRGB(((6+idx)*19)%255/255, 0.85, 0.75))+"95"
            }
        });
    })

    gutterIcons.red = context.asAbsolutePath("images/bookmark-red.svg");
    gutterIcons.green = context.asAbsolutePath("images/bookmark-green.svg");

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
    })
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
    })
}


module.exports = {
    init:init,
    updateDecorations: updateDecorations,
    decoStyleBoxedLightBlue: decoStyleBoxedLightBlue,
    styles:styles,
    doDeco:doDeco,
    decorateWords:decorateWords,
    semanticHighlightFunctionParameters:semanticHighlightFunctionParameters
}