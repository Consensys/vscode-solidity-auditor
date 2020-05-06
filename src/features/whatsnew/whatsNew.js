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

#### v0.0.24
- new: Solidity Visual Auditor Cockpit panel views
    - Context - Function Call Trace: shows function call trace when clicking into a contract method in the editor
    - Flatfiles: List flat files produced by the extension (matches: \`**/flat_*.sol\`)
- updated: surya (fixed multiple issues when parsing certain smart contracts with \`usingFor\` statements)

#### v0.0.23
- new: Update notifications have arrived!
- updated: solidity parser and surya
- new: 🔥 Solidity Visual Auditor Cockpit panel
    - Workspace Explorer
    - Quick-access to extension settings
    - Find Top Level Contracts
    - Keep track of flattened files
    - List public state-changing methods from the current contract
    - Show the function call trace for the current method

We've been working on a new cockpit view that allows you to navigate large codebases more efficiently. Check out the new &nbsp;<img width="32" alt="sidebar-logo" src="https://user-images.githubusercontent.com/2865694/78054647-acc8b980-7382-11ea-9542-ee8bcfaae175.png">&nbsp; icon in the activity bar to your left.

So, what can you do with it?

- Explore .sol files with the new workspace explorer
- Generate report/graphs for any files/folders selected in the explorer views
- Conveniently flatten selected files (selected folders or all files in the top-level view) (Note: \`truffle-flattener\` may require an \`npm install\` of the project for flattening to work)
- Search for contracts that are likely to be deployed in the system (complete workspace or selected folders)

    <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/78017640-d666ee00-734c-11ea-8d16-fbf393ad4804.png">   

- Context-sensitive views: click into a contract in the editor to list public state-changing methods

    <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/78017716-fc8c8e00-734c-11ea-8e04-0e9ed0a71471.png">

- Get quick access to extension settings

    <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/78018038-7ae93000-734d-11ea-8303-a4366e231217.png">

And there is more to come 🙌 stay tuned!

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