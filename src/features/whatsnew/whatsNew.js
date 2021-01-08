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
    },
    "0.0.29":function(lastSeenVersion){                         //extensionversion is 0.0.29
        return semver.satisfies(lastSeenVersion, ">=0.0.28");    //skip if last seen version was 0.0.28 or greater
    }
};

const MESSAGE = `[<img width="130" alt="get in touch with Consensys Diligence" src="https://user-images.githubusercontent.com/2865694/56826101-91dcf380-685b-11e9-937c-af49c2510aa0.png">](https://diligence.consensys.net)<br/>
<sup>
[[  🌐  ](https://diligence.consensys.net)  [  📩  ](mailto:diligence@consensys.net)  [  🔥  ](https://consensys.github.io/diligence/)]
</sup><br/><br/>



Thanks for using **Solidity Visual Developer** 🤜🤛

**Note**: Almost anything can be customized/disabled in the extension settings. Make this extension fit your needs!

### What's New?

The complete changelog can be found [here](https://github.com/ConsenSys/vscode-solidity-auditor/blob/master/CHANGELOG.md). 

#### v0.0.31

Happy new year from your [Diligence Family](https://consensys.net/diligence) 🙌 👪🌃🥂🎇!

- new: optionally disable the "find references" provider 
    - \`preferences → Settings → Solidity Visual Developer: solidity-va.findAllReferences.enable\`
- new: experimental [draw.io](https://draw.io) uml export to support your threat modelling needs (you're going to ❤ this!)
    - experimental feature, you'll have to manually enable this
    - \`preferences → Settings → Solidity Visual Developer: solidity-va.codelens.drawio.enable\`
- fix: function signature generation for \`AbiEncoderV2\` functions that declare custom types
    - for now this falls back to assume every custom type is an \`address\`. may need more love if there's support for this feature.
- refactor: modular uml export
- refactor: improved syntax highlighting / decoration performance
    - only decorates when needed, avoid double decoration
    - should fix or make it unlikely that decorations are being applied to the wrong editor - fixes #12
- update: dependencies
    - surya
    - solidity parser
    - keccak

#### v0.0.30
- new: We've finally implemented support for \`Right Click → Find All References\` for solidity source files!
    - Please note that this currently performs a lexical search of all source-code files containing the word under the cursor (including comments). This may be subject to change to return more specific results in the future.
    <br><img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/94445596-eb132a00-01a7-11eb-9098-32958d58ebd6.gif">
    
- update: dependencies surya / solidity parser

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
                webpanel.getPanel().webview.postMessage({
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