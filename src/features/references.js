/** 
 * @author github.com/tintinweb
 * @license MIT
 * 
 * 
 * */
//https://code.visualstudio.com/api/references/vscode-api#ReferenceProvider

const vscode = require('vscode');
const solidityVAConfig = vscode.workspace.getConfiguration('solidity-va');


class SolidityReferenceProvider{

    constructor(g_parser, cb_analyze){
        this.g_parser = g_parser
        this.cb_analyze = cb_analyze
    }
    
    provideReferences(document, position, context, token){
        console.log("providimng references ...")

        console.log(document)
        console.log(position)
        console.log(context)
        console.log(token)

        return new Promise((resolve, reject) => {
            var locations = [];

            locations.push(vscode.Location(document.uri, position));

            return resolve(locations);
        });
    }
}


module.exports = {
    SolidityReferenceProvider:SolidityReferenceProvider
}