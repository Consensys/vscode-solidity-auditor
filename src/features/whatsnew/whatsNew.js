"use strict";
/**
 * @author github.com/tintinweb
 * @license GPLv3
 *
 * */
const vscode = require("vscode");
const { InteractiveWebviewGenerator } = require("./interactiveWebview.js");
const settings = require("../../settings");

var semver = require("semver");

const SKIP_VERSIONS = {
  "0.0.25": function (lastSeenVersion) {
    //extensionversion is 0.0.25
    return semver.satisfies(lastSeenVersion, ">=0.0.24"); //skip if last seen version was 0.0.24 or greater
  },
  "0.0.29": function (lastSeenVersion) {
    //extensionversion is 0.0.29
    return semver.satisfies(lastSeenVersion, ">=0.0.28"); //skip if last seen version was 0.0.28 or greater
  },
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

## v0.2.0 - 🍂🍁🍃 Atumn Is Here! 🎃👻

- fix: includes parser performance optimizations with [solidity-workspace@v0.2.0](https://github.com/tintinweb/solidity-workspace/releases/tag/v0.2.0) (🙏 @vquelque)
- update: completely refactored function signature computation - #127
- fix: performance optimizations - #127
- new: command \`solidity-va.tools.function.signatures.forWorkspace\` to show all function signatures for files in the workspace - #127
- fix: \`ftrace\` error in cockpit view due to non-existent filepath being passed to surya - #127
- fix: draw.io/plantuml mistakenly named \`receive()|fallback()\` as \`constructor\` - #127
- fix: function signature extraction only returns \`public|external\` interfaces - #127
- fix: external function call list in cockpit view faile to resolve one-liner function declarations - #127
- fix: inheritance hover showing "object" instead of inherited contract name
- update: dependencies (solidity parser / solidity workspace)
- fix: constructor/fallback showing up as 'null' in cockpit
- fix: redecorate editor only if changes were detected (performance)
- fix: abort decoration if content hash not found in cache (keep current decoration if file is unparseable)
- fix: cockpit view for overridden functions (#138)


<sub>
Note: This notification is only shown once per release. Disable future notification? \`settings → solidity-va.whatsNew.disabled : true\`
</sub>
___
<sub>
Thinking about smart contract security? We can provide training, ongoing advice, and smart contract auditing. [Contact us](https://diligence.consensys.net/contact/).
</sub>
`;

class WhatsNewHandler {
  async show(context) {
    let extensionVersion = settings.extension().packageJSON.version;
    let config = settings.extensionConfig();

    let lastSeenVersion = context.globalState.get(
      "solidity-va.whatsNew.lastSeenVersion",
    );
    if (config.whatsNew.disabled) {
      return;
    }

    if (lastSeenVersion) {
      // what's new msg seen before
      if (semver.satisfies(lastSeenVersion, ">=" + extensionVersion)) {
        // msg seen
        console.log(">=" + extensionVersion);
        return;
      }

      //skip if previous version what's new has been seen
      let check_skip_fn = SKIP_VERSIONS[extensionVersion];
      if (check_skip_fn && check_skip_fn(lastSeenVersion)) {
        console.log("Skipping what's new for:" + extensionVersion);
        return;
      }
    }

    await this.showMessage(context);
  }

  async showMessage(context) {
    let doc = {
      uri: "unknown",
    };

    let webview = new InteractiveWebviewGenerator(context, "whats_new");
    webview
      .revealOrCreatePreview(vscode.ViewColumn.Beside, doc)
      .then((webpanel) => {
        webpanel.getPanel().webview.postMessage({
          command: "render",
          value: {
            markdown: MESSAGE,
          },
        });
      });

    context.globalState.update(
      "solidity-va.whatsNew.lastSeenVersion",
      settings.extension().packageJSON.version,
    );
  }
}

module.exports = {
  WhatsNewHandler: WhatsNewHandler,
};
