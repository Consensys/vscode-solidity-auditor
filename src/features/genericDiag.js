'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
 * 
 * */
/** imports */
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const fileHashes = {};

const toVscodeSeverity = {
    critical: vscode.DiagnosticSeverity.Error,
    major: vscode.DiagnosticSeverity.Error,
    minor: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information
};

function fileDidChange(path, input){
    let hash = crypto.createHash('sha1').update(input).digest('base64');
    if(fileHashes[path] && hash===fileHashes[path]){
        return false;
    }
    fileHashes[path] = hash;
    return true;
}

/** classdec */
class DiliDiagnosticCollection {
    constructor(context, base, issueFileGlob) {
        this.context = context;
        this.collections = {};
        this.issueFileGlob = issueFileGlob ? issueFileGlob : ["**/*-issues.json", "*-issues.json"];
        this.base = base;
        this.running = 0;
    }

    newCollection(name) {
        if(!this.collections.hasOwnProperty(name)){
            this.collections[name] = vscode.languages.createDiagnosticCollection(name);
            this.context.subscriptions.push(this.collections[name]);
        }
        return this.collections[name];
    }

    getCollection(name) {
        return this.collections[name];
    }

    clearAll() {
        Object.values(this.collections).forEach(function(ob){
            ob.clear();
        },this);
    }

    async updateIssues(cancellationToken) {
        return new Promise((resolve, reject) => {
            var that = this;

            try {
                vscode.workspace.findFiles("**/*-issues.json",'**/node_modules', 100, cancellationToken)
                    .then((uris) => {
                        uris.forEach(function(uri){
                            let f = uri.fsPath;
                            let basedir = path.dirname(f);
                            let collectionName = f; // path.basename(f)

                            
                            try {
                                let content = fs.readFileSync(f);
                                if(!fileDidChange(f, content)){
                                    return;
                                }

                                //collection.clear()  //only reload this collection
                                var issues = JSON.parse(content);
                                /*
                                    {"onInputFile": "contracts/BountiesMetaTxRelayer.sol", 
                                    "atLineNr": "10", 
                                    "ruleType": "code_smell", 
                                    "severity": "major", 
                                    "remediationEffortMinutes": "5",
                                    "linterVersion": "0.1", 
                                    "linterName": "maru", 
                                    "message": "State Variable  Default Visibility - It is best practice to set the visibility of state variables explicitly. The default           visibility for \"bountiesContract\" is internal. Other possible visibility values are public and private.",         
                                    "forRule": "State_Variable_Default_Visibility"}
                                */
                                let pathToIssues = new Map();
                                let pathToUri = new Map();
                                
                                issues.forEach(function(issue){
                                    //abspath or relpath?
                                    let targetFileUri = issue.onInputFile.startsWith("/") ? issue.onInputFile : vscode.Uri.file(path.join(basedir,issue.onInputFile));
                                        
                                    if(!fs.existsSync(targetFileUri.fsPath)){
                                        // skip nonexistent files
                                        // todo: maybe skip node_modules?
                                        //console.error(targetFileUri.fsPath)
                                        return;
                                    }

                                    if(!pathToIssues.has(targetFileUri.fsPath)){
                                        pathToIssues.set(targetFileUri.fsPath,[]);
                                    }
                                    pathToUri.set(targetFileUri.fsPath, targetFileUri);
                                    pathToIssues.get(targetFileUri.fsPath).push({
                                        code: '',
                                        message: `${issue.linterName}/${issue.severity}/${issue.ruleType} - ${issue.message}`,
                                        range: new vscode.Range(new vscode.Position(issue.atLineNr - 1, 0), new vscode.Position(issue.atLineNr - 1, 255)),
                                        severity: toVscodeSeverity[issue.severity],
                                        source: "",
                                        relatedInformation: []
                                        
                                    });
                                });

                                if(cancellationToken.isCancellationRequested){
                                    throw cancellationToken;
                                }

                                let collection = that.newCollection(collectionName);
                                pathToIssues.forEach(function(value, key){
                                    collection.set(pathToUri.get(key), value);
                                });

                            } catch (err) {
                                console.warn(f);
                                console.warn(err);
                            }
                        });
                });
                resolve();
            } catch (err) {
                reject(err);
                if (typeof err !=="object"){ //CancellationToken
                    throw err;
                }
            }
        });
    }
}

module.exports = {
    DiliDiagnosticCollection:DiliDiagnosticCollection
};