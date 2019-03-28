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

const toVscodeSeverity = {
    major: vscode.DiagnosticSeverity.Error,
    minor: vscode.DiagnosticSeverity.Warning,
    info: vscode.DiagnosticSeverity.Information
}

/** classdec */
class DiliDiagnosticCollection {
    constructor(context, base, issueFileGlob){
        this.context = context
        this.collections = {}
        this.issueFileGlob = issueFileGlob ? issueFileGlob : ["**/*-issues.json", "*-issues.json"]
        this.base = base
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

    async updateIssues(){
        return new Promise((reject, resolve) => {
            var that = this;
            this.clearAll()
            this.issueFileGlob.forEach(function(g){
            glob(path.join(this.base,g), {}, function (er, files) {
                // files is an array of filenames.
                // If the `nonull` option is set, and nothing
                // was found, then files is ["**/*.js"]
                // er is an error object or null.
                files.forEach(function(f){
                    let basedir = path.dirname(f)
                    let collectionName = path.basename(f)
                    let collection = that.newCollection(collectionName)
                    try {
                        var issues = JSON.parse(fs.readFileSync(f));
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
            })
        }, this)
        })
    }
}

/*
diagnosticCollections.compiler.set(
*/

module.exports = {
    DiliDiagnosticCollection:DiliDiagnosticCollection
}