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

function extension() {
    return vscode.extensions.getExtension('tintinweb.solidity-visual-auditor');
}

module.exports = {
    extensionConfig: extensionConfig,
    languageId: languageId,
    docSelector: docSelector,
    extension: extension
};