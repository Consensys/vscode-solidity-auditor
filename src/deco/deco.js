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


// create a decorator type that we use to decorate large numbers
const largeNumberDecorationType = vscode.window.createTextEditorDecorationType({
    cursor: 'crosshair',
    // use a themable color. See package.json for the declaration and default values.
    backgroundColor: { id: 'myextension.largeNumberBackground' }
});


const styles = {
    decoStyleBoxedLightBlue:decoStyleBoxedLightBlue,
    decoStyleLightGreen:decoStyleLightGreen,
    decoStyleLightOrange:decoStyleLightOrange
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

function decorateWords(editor, words){
    if (!editor) {
        return;
    }
    var smallNumbers= [];
    console.log("---")
    console.log(words)
    const text = editor.document.getText();

    words.forEach(function(word){
        console.log("regex -- "+ word)
        var regEx = new RegExp("\\b" +word+"\\b" ,"g");
        
        
        let match;
        while (match = regEx.exec(text)) {
            var startPos = editor.document.positionAt(match.index);
            var endPos = editor.document.positionAt(match.index + match[0].length);
            var decoration = { 
                range: new vscode.Range(startPos, endPos), 
                hoverMessage: 'StateVar **' + match[0] + '**' 
            };
            smallNumbers.push(decoration);
        }
    })
    console.log(smallNumbers)
    editor.setDecorations(decoStyleBoxedLightBlue, smallNumbers);
}

function doDeco(editor, decoArr){
    if (!editor) {
        return;
    }
    editor.setDecorations(decoStyleBoxedLightBlue, decoArr);
}

function init(context, config){

    return;
    if (activeEditor) {
        updateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            updateDecorations();
        }
    }, null, context.subscriptions);

    

}


module.exports = {
    init:init,
    updateDecorations: updateDecorations,
    decoStyleBoxedLightBlue: decoStyleBoxedLightBlue,
    styles:styles,
    doDeco:doDeco
}