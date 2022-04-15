'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
 * 
 * */
/** globals - const */
const vscode = require('vscode');
const languageId = "solidity";
const docSelector = {
    language: languageId
};

const DEFAULT_FINDFILES_EXCLUDES = '{**/node_modules,**/mock*,**/test*,**/migrations,**/Migrations.sol,**/flat_*.sol}';
const DEFAULT_FINDFILES_EXCLUDES_ALLOWFLAT = '{**/node_modules,**/mock*,**/test*,**/migrations,**/Migrations.sol}';

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
    extension: extension,
    DEFAULT_FINDFILES_EXCLUDES: DEFAULT_FINDFILES_EXCLUDES,
    DEFAULT_FINDFILES_EXCLUDES_ALLOWFLAT: DEFAULT_FINDFILES_EXCLUDES_ALLOWFLAT
};