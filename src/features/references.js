/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
 * 
 * */
//API REF: https://code.visualstudio.com/api/references/vscode-api#ReferenceProvider

const vscode = require('vscode');
const settings = require('../settings.js');
const fs = require('fs').promises;

function getIndicesOf(searchStr, str, caseSensitive) {
    var searchStrLen = searchStr.length;
    if (searchStrLen == 0) {
        return [];
    }
    var startIndex = 0, index, indices = [];
    if (!caseSensitive) {
        str = str.toLowerCase();
        searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
        indices.push(index);
        startIndex = index + searchStrLen;
    }
    return indices;
}

function getIndicesOfRex(searchRex, str) {
    var regEx = new RegExp("\\b" + searchRex + "\\b", "g");
    let match;
    let results = [];
    while (match = regEx.exec(str)) {
        results.push({ index: match.index, len: match[0].trim().length });
    }
    return results;
}

function indicesToVscodeRange(uri, indices, data, cb) {
    const lineIndices = getIndicesOf("\n", data, true);
    indices.forEach(i => {
        //find line
        let lineIndex;

        let lineNumber = lineIndices.findIndex(li => i.index < li);
        if (lineNumber <= 0) {
            lineNumber = 0; //maybe firstline
            lineIndex = 0; //firstline.
        } else {
            lineNumber--; // its the previous line
            lineIndex = lineIndices[lineNumber];
        }

        if (i.index > 0) {
            i.index--; //vscode columns start at 1
        }

        let pos = new vscode.Range(
            new vscode.Position(lineNumber + 1, i.index - lineIndex),
            new vscode.Position(lineNumber + 1, i.index - lineIndex + i.len)
        );
        cb(vscode.Location(uri, pos));
    });
}

class SolidityReferenceProvider {

    provideReferences(document, position, context, token) {
        console.log("providing references ...");
        return new Promise(async (resolve, reject) => {
            var locations = [];

            const range = document.getWordRangeAtPosition(position);
            if (!range || range.length <= 0) {
                return reject();
            }
            const word = document.getText(range);

            /*
                DANGER: UGLY HACK AHEAD. @todo: replace this with a clean solution. this is just an initial hack to make "find references" work.
            */
            await vscode.workspace.findFiles("**/*.sol", settings.DEFAULT_FINDFILES_EXCLUDES, 500)
                .then(async uris => {

                    await Promise.all(uris.map(async (uri) => {
                        let data = await fs.readFile(uri.fsPath, 'utf8');
                        if (!data) {
                            return;
                        }
                        const indicesRex = getIndicesOfRex(word, data);
                        indicesToVscodeRange(uri, indicesRex, data, (elem) => locations.push(elem));
                    }));
                    return resolve(locations);
                });

        });
    }
}


module.exports = {
    SolidityReferenceProvider: SolidityReferenceProvider
};