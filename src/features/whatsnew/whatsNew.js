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

const SKIP_VERSIONS = {
    "0.0.25":function(lastSeenVersion){                         //extensionversion is 0.0.25
        return semver.satisfies(lastSeenVersion, ">=0.0.24");    //skip if last seen version was 0.0.24 or greater
    }
}

const MESSAGE = `[<img width="130" alt="get in touch with Consensys Diligence" src="https://user-images.githubusercontent.com/2865694/56826101-91dcf380-685b-11e9-937c-af49c2510aa0.png">](https://diligence.consensys.net)<br/>
<sup>
[[  🌐  ](https://diligence.consensys.net)  [  📩  ](mailto:diligence@consensys.net)  [  🔥  ](https://consensys.github.io/diligence/)]
</sup><br/><br/>



Hey there 🙌 **Solidity Visual Developer** just got better! Find out more below.

### What's New?

The complete changelog can be found [here](https://github.com/ConsenSys/vscode-solidity-auditor/blob/master/CHANGELOG.md). 

#### v0.0.27
- new: \`Solidity Visual Auditor\` is now \`Solidity Visual Developer\` 🎉
- new: Ethereum Address hover commands. Hover over an ethereum account address to:
    - \`open\` the account on etherscan.io
    - show the contract \`code\`
    - show the \`VerifiedContract\` source code
    - \`decompile\` the byte-code. requires [vscode-decompiler](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-decompiler)

#### v0.0.26
- new: support for solidity \`>= 0.6.0\`
- new: \`cockpit → Workspace: Explorer → Surya: Contract interaction graph\` aka \`surya.graphSimple\` </br>
    <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/83885864-34e28b00-a747-11ea-990d-74410f062153.png"></br>
    <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/83886949-0f09b600-a748-11ea-8cf2-878773e3f0b0.png">
- updated: surya to 0.4.0 
- updated: \`solidity-parser-diligence\` to community maintained \`@solidity-parser/parser\` 

<sub>
The cockpit view is fully customizable. You can hide both the sidebar menu or any view in the cockpit that you do not need (right-click → hide). 
</sub>

<sub>
Note: This notification is only shown once per release. Disable future notification? \`settings → solidity-va.whatsNew.disabled : true\`
</sub>
___
<sub>
Thinking about smart contract security? We can provide training, ongoing advice, and smart contract auditing. [Contact us](https://diligence.consensys.net/contact/).
</sub>
`;


class WhatsNewHandler {

    async show(context){

        let extensionVersion = settings.extension().packageJSON.version;
        let config = settings.extensionConfig();

        let lastSeenVersion = context.globalState.get("solidity-va.whatsNew.lastSeenVersion");
        if(config.whatsNew.disabled){ 
            return;
        }

        if(lastSeenVersion){
            // what's new msg seen before
            if(semver.satisfies(lastSeenVersion, ">=" + extensionVersion)){
                // msg seen
                console.log(">=" + extensionVersion);
                return;
            }

             //skip if previous version what's new has been seen
            let check_skip_fn = SKIP_VERSIONS[extensionVersion];
            if(check_skip_fn && check_skip_fn(lastSeenVersion)){
                console.log("Skipping what's new for:" +extensionVersion);
                return;
            }
        }

        await this.showMessage(context);
    }

    async showMessage(context) {
        let doc = {
            uri:"unknown",
        };


        let webview = new InteractiveWebviewGenerator(context, "whats_new");
        webview.revealOrCreatePreview(vscode.ViewColumn.Beside, doc)
            .then(webpanel => {
                webpanel.getPanel().postMessage({
                    command:"render", 
                    value:{
                        markdown:MESSAGE,
                    }
                });
            });
        
        context.globalState.update("solidity-va.whatsNew.lastSeenVersion", settings.extension().packageJSON.version);
    }
}

module.exports = {
    WhatsNewHandler:WhatsNewHandler
};