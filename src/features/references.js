/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
//API REF: https://code.visualstudio.com/api/references/vscode-api#ReferenceProvider

const vscode = require('vscode');
const settings = require('../settings.js');
const fs = require('fs').promises;



class SolidityReferenceProvider {

    provideReferences(document, position, context, token) {
        console.log("providing references ...");

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

        return new Promise(async (resolve, reject) => {
            var locations = [];

            const range = document.getWordRangeAtPosition(position);
            if (!range || range.length <= 0) {
                return reject();
            }
            const word = document.getText(range);
            const wordLen = word.length;

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

                        const indices = getIndicesOf(word, data, false);
                        if (indices && indices.length) {
                            const lineIndices = getIndicesOf("\n", data, false);
                            indices.forEach(i => {
                                //find line

                                let lineNumber = lineIndices.findIndex(li => i < li);
                                if (lineNumber <= 0) {
                                    lineNumber = 0; //maybe firstline
                                } else {
                                    lineNumber--; // its the previous line
                                }

                                const lineIndex = lineIndices[lineNumber];

                                if (i > 0) {
                                    i--; //vscode columns start at 1
                                }

                                let pos = new vscode.Range(
                                    new vscode.Position(lineNumber + 1, i - lineIndex),
                                    new vscode.Position(lineNumber + 1, i - lineIndex + wordLen)
                                );
                                locations.push(vscode.Location(uri, pos));
                            });
                        }

                    }));
                    return resolve(locations);
                });

        });
    }
}


module.exports = {
    SolidityReferenceProvider: SolidityReferenceProvider
};