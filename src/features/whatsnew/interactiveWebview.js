'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
* */


/** imports */
const vscode = require("vscode");
const path =  require("path");
const fs = require("fs");

/** global vars */


/** classdecs */

class InteractiveWebviewGenerator {

    constructor(context, content_folder) {
        this.context = context;
        this.webviewPanels = new Map();
        this.timeout = null;
        this.content_folder = content_folder;
    }

    setNeedsRebuild(uri, needsRebuild) {
        let panel = this.webviewPanels.get(uri);

        if (panel) {
            panel.setNeedsRebuild(needsRebuild);
            this.rebuild();
        }
    }

    getPanel(uri){
        return this.webviewPanels.get(uri);
    }

    dispose() {
    }

    rebuild() {
        this.webviewPanels.forEach(panel => {
            if(panel.getNeedsRebuild() && panel.getPanel().visible) {
                this.updateContent(panel, vscode.workspace.textDocuments.find(doc => doc.uri == panel.uri));
            }
        });
    }

    async revealOrCreatePreview(displayColumn, doc) {
        let that = this;
        return new Promise(function(resolve, reject) {
            let previewPanel = that.webviewPanels.get(doc.uri);

            if (previewPanel) {
                previewPanel.reveal(displayColumn);
            }
            else {
                previewPanel = that.createPreviewPanel(doc, displayColumn);
                that.webviewPanels.set(doc.uri, previewPanel);
                // when the user closes the tab, remove the panel
                previewPanel.getPanel().onDidDispose(() => that.webviewPanels.delete(doc.uri), undefined, that.context.subscriptions);
                // when the pane becomes visible again, refresh it
                previewPanel.getPanel().onDidChangeViewState(_ => that.rebuild());

                previewPanel.getPanel().webview.onDidReceiveMessage(e => that.handleMessage(previewPanel, e), undefined, that.context.subscriptions);
            }

            that.updateContent(previewPanel, doc)
                .then(previewPanel => {
                    resolve(previewPanel);
                });
        });
    }

    handleMessage(previewPanel, message) {
        console.log(`Message received from the webview: ${message.command}`);

        switch(message.command){
            case 'onRenderFinished':
                previewPanel.onRenderFinished(message);
                break;
            case 'onPageLoaded':
                previewPanel.onPageLoaded(message);
                break;
            case 'onClick':
                previewPanel.onClick(message);
                break;
            case 'onDblClick':
                console.log("dblclick --> navigate to code location");
                break;
            default:
                previewPanel.handleMessage(message);
                //forward unhandled messages to previewpanel
        }
    }

    createPreviewPanel(doc, displayColumn ) {
        let previewTitle = `Welcome: Solidity Auditor`;

        let webViewPanel = vscode.window.createWebviewPanel('whatsNew', previewTitle, displayColumn, {
            enableFindWidget: false,
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, this.content_folder))]
        });

        webViewPanel.iconPath = vscode.Uri.file(this.context.asAbsolutePath(path.join(this.content_folder, "icon.png")));

        return new PreviewPanel(this, doc.uri, webViewPanel);
    }

    async updateContent(previewPanel, doc) {
        return new Promise(async (resolve, reject) => {
            if(!previewPanel.getPanel().webview.html) {
                previewPanel.getPanel().webview.html = "Please wait...";
            }
            previewPanel.setNeedsRebuild(false);
            previewPanel.getPanel().webview.html = await this.getPreviewHtml(previewPanel, doc);
            return resolve(previewPanel);
        });
    }

    async getPreviewTemplate(context, templateName){
        let previewPath = context.asAbsolutePath(path.join(this.content_folder, templateName));
    
        return new Promise((resolve, reject) => {
            fs.readFile(previewPath, "utf8", function (err, data) {
                if (err) reject(err);
                else resolve(data);
            });
        });
    }

    async getPreviewHtml(previewPanel, doc){
        let templateHtml = await this.getPreviewTemplate(this.context, "index.html");

        templateHtml = templateHtml.replace(/<script .*?src="(.+)">/g, (scriptTag, srcPath) => {
            let resource=vscode.Uri.file(
                path.join(this.context.extensionPath, this.content_folder, path.join(...(srcPath.split("/")))))
                    .with({scheme: "vscode-resource"});
            return `<script src="${resource}">`;
        }).replace(/<link rel="stylesheet" href="(.+)"\/>/g, (scriptTag, srcPath) => {
            let resource=vscode.Uri.file(
                path.join(this.context.extensionPath, this.content_folder, path.join(...(srcPath.split("/")))))
                    .with({scheme: "vscode-resource"});
            return `<link rel="stylesheet" href="${resource}"/>`;
        });
        return templateHtml;
    }
}

class PreviewPanel {

    constructor( parent, uri,  panel) {
        this.parent = parent;
        this.needsRebuild = false;
        this.uri = uri;
        this.panel = panel;

        this.lastRender = null;
    }

    reveal(displayColumn) {
        this.panel.reveal(displayColumn);
    }

    setNeedsRebuild(needsRebuild) {
        this.needsRebuild = needsRebuild;
    }

    getNeedsRebuild() {
        return this.needsRebuild;
    }

    getPanel() {
        return this.panel;
    }

    handleMessage(message){
        console.warn('Unexpected command: ' + message.command);
    }

    onRenderFinished(message){
        this.lockRender = false;
    }

    onPageLoaded(message){
    }

    onClick(message){
        console.debug(message);
    }
}


module.exports = {
    InteractiveWebviewGenerator:InteractiveWebviewGenerator
};