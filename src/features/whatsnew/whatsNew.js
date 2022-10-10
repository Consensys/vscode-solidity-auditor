'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
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

___
ℹ️ Customize this extension to fit your needs! Show/Hide/Enable/Disable features in \`Preference → Settings → Solidity Visual Developer: solidity-va.*\`, select one of the customized security-aware color themes in \`Preferences → Color Themes\`.
___

### What's New?

The complete changelog can be found [here](https://github.com/ConsenSys/vscode-solidity-auditor/blob/master/CHANGELOG.md). 

## v0.1.4

- fix: incompatibility with vscode update v1.72.0 - Extension "[...] has provided an invalid tree item." - #114
- new: optionally disable highlighting in the overview ruler - #115

<img width="440" alt="image" src="https://user-images.githubusercontent.com/2865694/194864316-88b89bf4-331d-43b4-bb0a-324cdcee99da.png">

<img width="185" alt="image" src="https://user-images.githubusercontent.com/2865694/194864195-a1449bb3-9c04-43bb-a011-8d2faf8ffb5a.png"> <img width="181" alt="image" src="https://user-images.githubusercontent.com/2865694/194864429-5d8c42d4-e45b-406d-ad66-e207718aced0.png">

- fix: more consistent highlighting when clicking on an item in the cockpit ExternalCalls/PublicStatechanging views - #110
  - clicking on a function name highlights the first line of the function instead of the full function block in the editor
  - clicking on an external call/modifier highlights the invocation in the editor


## v0.1.3 - 🧸

- new: customize semantic highlighting mode #105 #108
  - \`color and symbol\` - default (decorate + "arrow")
  - \`color only\` - only decorate identifiers declared in the function argument scope 
  - \`symbol only\` - only show an "arrow" next to an identifier declared in the function argument scope

<img width="725" alt="image" src="https://user-images.githubusercontent.com/2865694/180291604-f1a3be47-5aaa-41d4-b734-13dfd813d8ff.png">

- fix: uml - fix null-deref when parsing 'using-for *' #106 #107
- update: configurable trailing "arrow" for semantic function argument highlighting #104 #100


## v0.1.2

- new: decorate/highlight immutable state vars (<span style="color:#9932cc">![#9932cc](https://via.placeholder.com/15/9932cc/000000?text=+)</span>) - #97 (thanks @RomiRand)
<img width="381" alt="image" src="https://user-images.githubusercontent.com/2865694/163415669-7d45d698-2be1-49a3-80b4-c6e2ed861d11.png">

- update: dependencies (surya@0.4.6)
- new: configuration option to enable the \`surya.mdreport\` "negative Modifiers" feature, see [surya#162](https://github.com/ConsenSys/surya/pull/162)
    - enabling \`solidity-va.tools.surya.option.negModifiers\` will list all modifiers observed in the file with the ones that are not being used with the listed method being  ~~striked-through~~

![image](https://user-images.githubusercontent.com/2998191/155733325-7a6187b8-e63e-4410-a312-aa2a1c940e31.png)

  Note that the report can be generated either via the \`report\` codelense or by selecting files in the \`Solidity Visual Developer View → right-click → Surya: generate report\`.

<img width="401" alt="image" src="https://user-images.githubusercontent.com/2865694/163411802-49e91a8d-df9e-44ca-8c62-23510d7c9a4a.png">

<img width="398" alt="image" src="https://user-images.githubusercontent.com/2865694/163412288-20e621df-b715-4074-b8f8-033a4b758002.png">


- fix: typos & links to placeholder[.]com - #93 #91 (thanks @almndbtr)

## v0.1.1 - ❄️🎄🏂🎄❄️

- fix: type resolving and declaration link for inherited statevars
- update: move language specific logic to a web compatible extension
    - https://github.com/tintinweb/vscode-solidity-language (https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-solidity-language)
    - The language ships with three security centered Color Themes that can be selected from the **Solidity Language & Themes (only)** extension page or \`Code → Preferences → Color Themes\` 
    
    ![image](https://user-images.githubusercontent.com/2865694/145625639-a54178d1-5cee-45b6-bf10-44da09875f0e.png)

- update: support for latest solidity parser (extension + surya) #84

## v0.1.0 - with a lot of new features 🥳

- new: 🥳 major parser refactoring #67 and we published the parser as standalone lib "[solidity-workspace](https://github.com/tintinweb/solidity-workspace)"
- new: ⚠️ annotations for potential external calls (yellow gutter icon)
    - best effort - might miss some external calls depending on whether it is possible to easily resolve them (e.g. accessing addresses in nested structures/mappings).
- new: cockpit view that lists external calls in the currently selected contract (click into a contract in the editor for the view to update)

  ![image](https://user-images.githubusercontent.com/2865694/122222447-90933880-ceb2-11eb-91c3-c59549d40c8c.png)

- new: we can now resolve inherited names (hover: declaration link)
  
  ![image](https://user-images.githubusercontent.com/2865694/120014274-26d5ec00-bfe2-11eb-99f7-64d4a57277a0.png)

- new: we now decorate identifiers that are storage references (treating them like state-vars)
- new: unit-test stub/template for Hardhat/Ethers #70 (\`preferences → Settings → Solidity Visual Developer: solidity-va.test.defaultUnittestTemplate\`)
- new: (debug) option to enable/disable stacktraces for parser errors (\`preferences → Settings → Solidity Visual Developer: solidity-va.debug\`)
- new: show codelenses (inline actions) for abstract contracts
- new: customize which codelenses to show or hide (\`preferences → Settings → Solidity Visual Developer: solidity-va.codelens.*\`) #76
- new: expose new command \`solidity-va.surya.graphThis\` #76
- new: use internal ("dumb" lexical) flattener by default. Optionally allow to select \`truffle-flattener\` (\`preferences → Settings → Solidity Visual Developer: solidity-va.flatten.mode\`)
- update: enable \`draw.io csv export\` codelens by default
- fix: misplaced decoration when document changes
- fix: function selector is incorrect if there's a comment in the function signature definition #68
- update: code cleanup; refactored decoration logic and moved it to its own submodule


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