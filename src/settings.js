/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
/** globals - const */
const vscode = require('vscode');
const languageId = "solidity";
const docSelector = {
    language: languageId
};

function extensionConfig() {
    return vscode.workspace.getConfiguration('solidity-va');
}

module.exports = {
    extensionConfig: extensionConfig,
    languageId: languageId,
    docSelector: docSelector
};