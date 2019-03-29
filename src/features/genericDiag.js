/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
/** imports */
const vscode = require('vscode')
const fs = require('fs')
const path = require('path')
const glob = require('glob')
const crypto = require('crypto')

const fileHashes = {}

const toVscodeSeverity = {
    major: vscode.DiagnosticSeverity.Error,
    minor: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information
}

function fileDidChange(path, input){
    let hash = crypto.createHash('sha1').update(input).digest('base64');
    if(fileHashes[path] && hash===fileHashes[path]){
        return false;
    }
    fileHashes[path] = hash;
    return true
}

/** classdec */
class DiliDiagnosticCollection {
    constructor(context, base, issueFileGlob){
        this.context = context
        this.collections = {}
        this.issueFileGlob = issueFileGlob ? issueFileGlob : ["**/*-issues.json", "*-issues.json"]
        this.base = base
        this.running = 0;
    }

    newCollection(name){
        if(!this.collections.hasOwnProperty(name)){
            this.collections[name] = vscode.languages.createDiagnosticCollection(name)
            this.context.subscriptions.push(this.collections[name])
        }
        return this.collections[name]
    }

    getCollection(name){
        return this.collections[name]
    }

    clearAll(){
        Object.values(this.collections).forEach(function(ob){
            ob.clear()
        },this)
    }

    async updateIssues(cancellationToken){
        return new Promise((reject, resolve) => {
            var that = this;
            try{
                this.issueFileGlob.forEach(function(g){
                    glob(path.join(this.base,g), {}, function (er, files) {
                        // files is an array of filenames.
                        // If the `nonull` option is set, and nothing
                        // was found, then files is ["**/*.js"]
                        // er is an error object or null.
                        files.forEach(function(f){
                            if(cancellationToken.isCancellationRequested){
                                throw cancellationToken
                            }
                            let basedir = path.dirname(f)
                            let collectionName = f //path.basename(f)
                            let collection = that.newCollection(collectionName)
                            try {
                                let content = fs.readFileSync(f)
                                if(!fileDidChange(f, content)){
                                    return
                                }
                                collection.clear()  //only reload this collection
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
                                issues.forEach(function(issue){
                                    //abspath or relpath?
                                    let targetFileUri = issue.onInputFile.startsWith("/") ? issue.onInputFile : vscode.Uri.file(path.join(basedir,issue.onInputFile))
                                    if(!fs.existsSync(targetFileUri.path)){
                                        // skip nonexistent files
                                        // todo: maybe skip node_modules?
                                        return
                                    }
                                    collection.set(targetFileUri, [{
                                        code: '',
                                        message: `${issue.linterName}/${issue.severity}/${issue.ruleType} - ${issue.message}`,
                                        range: new vscode.Range(new vscode.Position(issue.atLineNr - 1, 0), new vscode.Position(issue.atLineNr - 1, 255)),
                                        severity: toVscodeSeverity[issue.severity],
                                        source: "",
                                        relatedInformation: []
                                    }]);
                                })
                            } catch (err) {
                                console.error(err)
                            }
                        })
                    resolve()
                    })
                }, this)
            } catch (err) {
                reject(err)
                if (typeof err !=="CancellationToken"){
                    throw err
                }
            }
        })
    }
}

module.exports = {
    DiliDiagnosticCollection:DiliDiagnosticCollection
}