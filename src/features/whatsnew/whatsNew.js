'use strict';
/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
* */
const vscode = require('vscode');
const {InteractiveWebviewGenerator} = require('./interactiveWebview.js');
const settings = require('../../settings');

var semver = require('semver');



class WhatsNewHandler {

    async show(context){

        let extensionVersion = settings.extension().packageJSON.version;
        let config = settings.extensionConfig();

        let lastSeenVersion = context.globalState.get("solidity-va.whatsNew.lastSeenVersion");

        if(config.whatsNew.disabled){ 
            return;
        }

        if(false && lastSeenVersion && semver.satisfies(lastSeenVersion, ">=" + extensionVersion)){
            console.log(">=" + extensionVersion);
            return;
        }

        let doc = {
            uri:"unknown",
        };

        let webview = new InteractiveWebviewGenerator(context, "whats_new");
        webview.revealOrCreatePreview(vscode.ViewColumn.Beside, doc);

        context.globalState.update("solidity-va.whatsNew.lastSeenVersion", extensionVersion);
    }
}

module.exports = {
    WhatsNewHandler:WhatsNewHandler
};