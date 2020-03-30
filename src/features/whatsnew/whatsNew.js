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

const MESSAGE = `[<img width="130" alt="get in touch with Consensys Diligence" src="https://user-images.githubusercontent.com/2865694/56826101-91dcf380-685b-11e9-937c-af49c2510aa0.png">](https://diligence.consensys.net)<br/>
<sup>
[[  🌐  ](https://diligence.consensys.net)  [  📩  ](mailto:diligence@consensys.net)  [  🔥  ](https://consensys.github.io/diligence/)]
</sup><br/><br/>



Hey there 🙌 **Solidity Visual Auditor** just got better! Find out more below.

### What's New?

The complete changelog can be found [here](https://github.com/ConsenSys/vscode-solidity-auditor/blob/master/CHANGELOG.md). 

#### v0.0.23
- new: Update notifications have arrived!

<sub>
Hint: disable future notification? \`settings → solidity-va.whatsNew.disabled : true\`
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

        if(lastSeenVersion && semver.satisfies(lastSeenVersion, ">=" + extensionVersion)){
            console.log(">=" + extensionVersion);
            return;
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