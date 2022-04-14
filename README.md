[<img width="200" alt="get in touch with Consensys Diligence" src="https://user-images.githubusercontent.com/2865694/56826101-91dcf380-685b-11e9-937c-af49c2510aa0.png">](https://diligence.consensys.net)<br/>
<sup>
[[  🌐  ](https://diligence.consensys.net)  [  📩  ](mailto:diligence@consensys.net)  [  🔥  ](https://consensys.github.io/diligence/)]
</sup><br/><br/>


# Solidity Visual Developer

* Advanced Solidity Language Support
* Code Augmentation
* Source Exploration
* Visual Security Linting

> An extension that supports developers in writing secure and well understood code

This extension contributes **security centric** syntax and semantic highlighting, a detailed class outline, specialized views, advanced Solidity code insights and augmentation to Visual Studio Code.

____

**⚠️ Note**: Customize this extension to fit your needs! Show/Hide/Enable/Disable features in `Preference → Settings → Solidity Visual Developer: solidity-va.*`, select one of the customized security-aware color themes in `Preferences → Color Themes`.


We ❤ feedback → [get in touch!](https://github.com/tintinweb/vscode-solidity-auditor/issues)

____


[Marketplace](https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor): `ext tintinweb.solidity-visual-auditor`

____ 

<img width="1364" alt="theme_light_vs" src="https://user-images.githubusercontent.com/2865694/61187576-6b1ca500-a673-11e9-8770-ff8b47d716ee.png">

![vscode-solidity-auditor-interactive-graph](https://user-images.githubusercontent.com/2865694/57710279-e27e8a00-766c-11e9-9ca9-8cde50aa31fc.gif)

<img width="1024" alt="visual-auditor-new" src="https://user-images.githubusercontent.com/2865694/55153942-f9682c00-5153-11e9-9e88-b3958c134c88.png">

<img width="733" alt="vscode-solidity-auditor-uml" src="https://user-images.githubusercontent.com/2865694/64823226-2bacff00-d5b7-11e9-99e0-6790921a9f20.png">

---------------------

## Features

Semantic highlighting and solidity insights for passive security awareness. Most features are configurable (`preferences -> Settings -> Solidity Visual Developer`)

##### Themes (`preferences -> Color Theme`):

![dark_small](https://user-images.githubusercontent.com/2865694/61187950-85a54d00-a678-11e9-8b68-e015ab2c498c.png)
![light_small](https://user-images.githubusercontent.com/2865694/61187967-d452e700-a678-11e9-8661-7cd7839f88a6.png)
![solarized_small](https://user-images.githubusercontent.com/2865694/61187948-850cb680-a678-11e9-8b16-9616dfc09046.png)

* Visual Auditor Dark - based on the "Atom One" theme
* Visual Auditor Light (Visual Studio) - based on the standard "light (VSCode)" theme
* Visual Auditor Solarized Light - based on the standard "Solarized Light" theme

##### Syntax Highlighting

* **access modifiers** (`external`, `public`, `payable`, ...)
* security relevant built-ins, globals, methods and user/miner-tainted information (`address.call()`, `tx.origin`, `msg.data`, `block.*`, `now`) 
* storage access modifiers (`memory`, `storage`)
* developer notes in comments (`TODO`, `FIXME`, `HACK`, ...)
* custom function modifiers 
* contract creation / event invocations
* easily differentiate between arithmetics vs. logical operations
* make **Constructor** and **Fallback** function more prominent

Code fragments passively draw your attention to statements that typically <span style="color:#c5f015">*reduce risk* ![#c5f015](https://via.placeholder.com/15/ccff00/000000?text=+)</span> or <span style="color:#f03c15">*need your attention* ![#f03c15](https://via.placeholder.com/15/f03c15/000000?text=+)</span>.

##### Semantic Highlighting

* highlights **StateVars** (constant, inherited)
* detects and alerts about StateVar shadowing
* highlights **function arguments** in the function body


##### Review Features

* audit annotations/bookmarks - `@audit - <msg>` `@audit-ok - <msg>` (see below)
* generic interface for importing external scanner results - cdili json format (see below)
* codelens inline action: graph, report, dependencies, inheritance, parse, ftrace, flatten, generate unittest stub, function signature hashes, uml

##### Graph- and Reporting Features

* 💒🤵👰 [vscode-solidity-auditor](https://github.com/tintinweb/vscode-solidity-auditor) ⚭ [Sūrya](https://github.com/ConsenSys/surya)
  * access your favorite Sūrya features from within vscode!
  * interactive call graphs with call flow highlighting and more!
* 📈🎉 auto-generate UML diagrams from code to support your threat modelling exercises or documentation!

##### Code Augmentation
* Hover over Ethereum Account addresses to download the byte-code, source-code or open it in the browser
* Hover over ASM instructions to show their signatures
* Hover over keywords to show basic Security Notes
* Hover over StateVar's to show declaration information

##### Views

* Cockpit View
  * Explore and focus on solidity files in your workspace
  * Generate report/graphs for any files/folders selected in the explorer views
  * Selectively flatten files
  * Search for contracts that are likely to be deployed in the system
  * Context-sensitive views: click into a contract in the editor to list public state-changing method
  * Get quick access to extension settings
* Outline View
  * populates VS Code outline view with sourceUnit and contract layout
  * contracts, stateVars, methods, inherited names
  * annotates security relevant information (visibility, ...)
  * calculates complexity rating
  * annotations functions with information about whether they are accessing stateVars


# Installation


**Method 1:** Install by going to [Visual Studio Market Place](https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor#overview) and click  `Install`. 

**Method 2:** Bring up the Extension view in VS Code and search for  `Solidity Visual Developer` and click `Install`

**Method 3 (Manual)**: 
1. Download the [latest compiled extension as *.vsix](https://github.com/tintinweb/vscode-solidity-auditor/releases)
2. Fire up Terminal and install the extension by running `code --install-extension "solidity-visual-auditor-0.0.x.vsix"`
3. vscode --> preferences --> color scheme --> **Solidity Visual Developer Dark**


# Tour

Scroll down and take the tour.

![visual_auditor_new](https://user-images.githubusercontent.com/2865694/55153942-f9682c00-5153-11e9-9e88-b3958c134c88.png)
* semantic highlighting for state variables (constant=green, statevar=golden, inherited=blue)
* semantic highlighting for function arguments
* outline view with security annotations and inherited names
* tooltips (asm instruction signatures, security notes)
* `@audit` tags
* graph's and uml
* generic interface to import issues from external scanners
* Cockpit View


<details>
  <summary style='font-size:14pt'><b>Feature:</b> Ethereum Account Address Actions</summary>

## Ethereum Account Address Actions

-  `open` the account on etherscan.io
- show the contract `code`
- show the `VerifiedContract` source code
- `decompile` the byte-code. requires [vscode-decompiler](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-decompiler)
  
<img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/85524701-af951c80-b608-11ea-803c-c2587e7732b7.gif">

</details>

<details>
  <summary style='font-size:14pt'><b>Feature:</b> Semantic function argument highlighting</summary>

## Semantic function argument highlighting

* arguments are assigned different colors in the scope of the function

<img width="722" alt="semantic-arg-dark" src="https://user-images.githubusercontent.com/2865694/55149233-1bf54780-514a-11e9-827e-d0816a9c2ac8.png">
<img width="722" alt="semantic-arg-light" src="https://user-images.githubusercontent.com/2865694/55149264-257eaf80-514a-11e9-8779-8cdd60b9ab22.png">

</details>

<details>
  <summary style='font-size:14pt'><b>Feature:</b> Inline Bookmarks</summary>

## Inline Bookmarks: @audit tags

This feature is provided by [Inline Bookmarks](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-inline-bookmarks).

* `@audit - <msg>` ... flag lines for security review or start a security review discussion
* `@audit-ok - <msg>` ... flag that a line was checked for security or a security discussion on that line turned out to be a non-issue 

<img width="722" alt="audit-tags" src="https://user-images.githubusercontent.com/2865694/55152445-b3f62f80-5150-11e9-85df-de84023467c0.png">

</details>

<details>
  <summary style='font-size:14pt'><b>Feature:</b> Code Augmentation / Annotations / Hover / Tooltip</summary>

## Code Augmentation / Annotations / Hover / Tooltip

* additional information for various keywords (including security notes)

<img width="722" alt="code_token_hover" src="https://user-images.githubusercontent.com/2865694/53698880-c34cbc00-3de2-11e9-8356-7fd5427f8469.png">

* asm instruction signatures

<img width="713" alt="code_asm_tooltip" src="https://user-images.githubusercontent.com/2865694/53698881-c34cbc00-3de2-11e9-97ae-3b7145430c27.png">

* Address hover integration via [tintinweb.vscode-ethover](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-ethover)
  * Open it in etherscan (or whatever you configure)
  * Show address balance in hover (mainnet) (note: might be rate-limited, configure your API key in settings)
  * Download the bytecode and disassemble it. 
    * With hover info on instructions
    * Representation of data as ASCII and resolving 4bytes to funcsigs, Color code reflects the type of instruction: stack, memory, storage, arithm., logic, system, environment, …
  * Download the bytecode and show it. 
    * With hover info
    * Click to see instruction boundaries
    * Color coded bytes to reflect type of instruction)
  * Show verified contract source (etherscan.io)
  * Show reconstructed contract source from eveem.org
  * Show reconstructed contract source from [evm.js](https://www.npmjs.com/package/evm)
  * run [vscode-decompiler](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-decompiler) to decompile it manually using panoramix (eveem.org) locally

<img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/86650152-bd707780-bfe2-11ea-819d-a9e3dacb2034.gif">

</details>


<details>
  <summary style='font-size:14pt'><b>Feature:</b> State Variable Highlighting</summary>


## State Variable Highlighting

* highlight contract local stateVars (golden box)

<img width="624" alt="code_statevar" src="https://user-images.githubusercontent.com/2865694/53698888-cfd11480-3de2-11e9-8308-a05fdace95f2.png">

* alert on a shadowed variable (red box)

<img width="767" alt="code_shadowed" src="https://user-images.githubusercontent.com/2865694/53698885-cf387e00-3de2-11e9-9e69-5fb26cd7a3a0.png">

* highlight const stateVar (green box)

<img width="756" alt="code_const" src="https://user-images.githubusercontent.com/2865694/53698886-cf387e00-3de2-11e9-9de6-0ce116e86d20.png">

* highlight inherited stateVar (blue box `Approval`)

<img width="624" alt="code_inherited" src="https://user-images.githubusercontent.com/2865694/53698887-cfd11480-3de2-11e9-8374-a022b4fdaa33.png">

</details>


<details>
  <summary style='font-size:14pt'><b>Feature:</b> CodeLenses</summary>

## CodeLenses

* surya - interactive graph

![vscode-solidity-auditor-interactive-graph](https://user-images.githubusercontent.com/2865694/57710279-e27e8a00-766c-11e9-9ca9-8cde50aa31fc.gif)

* surya - generate report, show inheritance, show AST

![vscode-auditor-surya-report](https://user-images.githubusercontent.com/2865694/55647025-e5b86780-57dc-11e9-9cc0-b5197eb075b8.gif)  

* flatten source file with [tintinweb.vscode-solidity-flattener](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-solidity-flattener) (using [truffle-flattener](https://www.npmjs.com/package/truffle-flattener))

![vscode-auditor-unittest](https://user-images.githubusercontent.com/2865694/55646826-72aef100-57dc-11e9-800b-fc649b41b4a9.gif)

* surya - ftrace

![vscode-auditor-ftrace](https://user-images.githubusercontent.com/2865694/55646883-983bfa80-57dc-11e9-8e40-6194d1429dac.gif)

* UML - auto-generate UML for source-units or specific contracts

<img width="733" alt="vscode-solidity-auditor-uml" src="https://user-images.githubusercontent.com/2865694/64823226-2bacff00-d5b7-11e9-99e0-6790921a9f20.png">

* Function Signature Hashes

<img width="360" alt="sva_light_vscode" src="https://user-images.githubusercontent.com/2865694/64822139-a3c5f580-d5b4-11e9-8ecd-6554f79265d8.png">  

</details>

<details>
  <summary style='font-size:14pt'><b>Feature:</b> Outline View</summary>

## Outline View

* library with function parameters `T` and declarations

<img width="360" alt="outline_lib" src="https://user-images.githubusercontent.com/2865694/53698893-d1024180-3de2-11e9-8c93-a1ee0076a992.png">

* class and events, functions annotated (stateMutability, visibility)

<img width="360" alt="outline_class_event" src="https://user-images.githubusercontent.com/2865694/53698892-d1024180-3de2-11e9-89d0-300a1c57376e.png">

* class and events, functions annotated (stateMutability, visibility)

<img width="360" alt="outline_class_2" src="https://user-images.githubusercontent.com/2865694/53698891-d069ab00-3de2-11e9-8155-5f5aa568852c.png">

* inheritance browser - resolves inheritance, only shows inherited names

<img width="360" alt="outline_inherit" src="https://user-images.githubusercontent.com/2865694/53698890-d069ab00-3de2-11e9-8dde-fb524794d1df.png">

* extra information (subjective function complexity; accesses stateVar?)

<img width="360" alt="outline_extra" src="https://user-images.githubusercontent.com/2865694/53698889-d069ab00-3de2-11e9-88bd-65598a39140c.png">

</details>

<details>
  <summary style='font-size:14pt'><b>Feature:</b> Cockpit View</summary>

## Cockpit View

We've been working on a new cockpit view that allows you to navigate large codebases more efficiently. Check out the new &nbsp;<img width="32" alt="sidebar-logo" src="https://user-images.githubusercontent.com/2865694/78054647-acc8b980-7382-11ea-9542-ee8bcfaae175.png">&nbsp; icon in the activity bar to your left.

So, what can you do with it?

- Explore .sol files with the new workspace explorer
- Generate report/graphs for any files/folders selected in the explorer views
  <br><img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/83885864-34e28b00-a747-11ea-990d-74410f062153.png"><img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/83886949-0f09b600-a748-11ea-8cf2-878773e3f0b0.png">
- Conveniently flatten selected files (selected folders or all files in the top-level view) (Note: `truffle-flattener` may require an `npm install` of the project for flattening to work)
- Search for contracts that are likely to be deployed in the system (complete workspace or selected folders)
    <br><img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/78017640-d666ee00-734c-11ea-8d16-fbf393ad4804.png">  
- Context-sensitive views: click into a contract in the editor to list public state-changing methods
    <br><img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/78017716-fc8c8e00-734c-11ea-8e04-0e9ed0a71471.png">
- Get quick access to extension settings
    <br><img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/78018038-7ae93000-734d-11ea-8303-a4366e231217.png">

And there is more to come 🙌 stay tuned!

**Note**: The cockpit view is fully customizable. You can hide both the sidebar menu or any view in the cockpit that you do not need (right-click → hide).

</details>

<details>
  <summary style='font-size:14pt'><b>BuiltIn:</b> Commands</summary>

## Commands

* suggest top level contracts aka "entrypoint contracts" (most derived)
* flatten current (codelens) or all suggested top level contracts (command)
![vscode-auditor-flaterra](https://user-images.githubusercontent.com/2865694/55907553-5db8d000-5bd7-11e9-8a11-8cef3964e284.gif)
* list all function signatures (human readable or json format)  
![vscode-auditor-funcsigs](https://user-images.githubusercontent.com/2865694/55907153-3f9ea000-5bd6-11e9-8a47-e69a762963e9.gif)
* open remix in external browser

Please refer to the extension's contribution section to show an up-to-date list of commands.

</details>

<details>
  <summary style='font-size:14pt'><b>Theme:</b> Solidity Visual Developer Light (VSCode)</summary>

## Theme: Solidity Visual Developer Light (VSCode)

<img width="1364" alt="theme_light_vs" src="https://user-images.githubusercontent.com/2865694/61187576-6b1ca500-a673-11e9-8770-ff8b47d716ee.png">

</details>

<details>
  <summary style='font-size:14pt'><b>Theme:</b> Solidity Visual Developer Dark</summary>

## Theme: Solidity Visual Developer Dark

**Simple DAO**

<img width="981" alt="screenshot 2019-02-09 at 12 30 30" src="https://user-images.githubusercontent.com/2865694/52521879-58deab00-2c7e-11e9-9621-1afc73c918d8.png">

**Vulnerable Contract**

![highlight](https://user-images.githubusercontent.com/2865694/52523502-4bcbb700-2c92-11e9-9ef1-085e3a244cda.png)

</details>

<details>
  <summary style='font-size:14pt'><b>Theme:</b> Solidity Visual Developer Solarized Light</summary>

## Theme: Solidity Visual Developer Solarized Light

**Simple DAO**

<img width="970" alt="screenshot 2019-02-11 at 21 52 11" src="https://user-images.githubusercontent.com/2865694/52592696-5c715e00-2e47-11e9-99f4-32332e308ec3.png">

</details>


<details>
  <summary style='font-size:14pt'><b>Configuration:</b> Settings & Customizations</summary>

## Extension Settings

* `solidity-va.mode.active` .. Enable/Disable all active components of this extension (emergency master-switch).
* `Solidity-va.parser.parseImports` ... Whether to recursively parse imports or not
* `Solidity-va.hover` ... Enable or Disable generic onHover information (asm instruction signatures, security notes)
* `Solidity-va.deco.statevars` ... decorate statevars in code view (golden, green, blue boxes)
* `Solidity-va.deco.arguments` ... whether to enable/disable semantic highlighting for function arguments
* `Solidity-va.outline.enable` ... enable/disable outline and symbolprovider
* `Solidity-va.outline.decorations` ... decorate functions according to state mutability function visibility
* `Solidity-va.outline.inheritance.show` ... add inherited functions to outline view
* `Solidity-va.outline.extras` ... annotate functions with extra information (complexity, statevar access)
* `Solidity-va.outline.var.storage_annotations` ... Whether to show/hide storage annotations for variables in the outline view
* `Solidity-va.outline.pragmas.show` ... Whether to show/hide pragmas in the outline view
* `Solidity-va.outline.imports.show` ... Whether to show/hide imports in the outline view
* `Solidity-va.diagnostics.import.cdili-json` ... Automatically import diagnostic issues from external scanners using the `cdili-issue.json` format:
    ```json
    {
        "onInputFile": "contracts/BountiesMetaTxRelayer.sol", 
        "atLineNr": "10", 
        "ruleType": "code_smell", 
        "severity": "major", 
        "linterVersion": "0.1", 
        "linterName": "maru", 
        "message": "State Variable  Default Visibility - It is best practice to set the visibility of state variables explicitly. The default           visibility for \"bountiesContract\" is internal. Other possible visibility values are public and private.",         
        "forRule": "State_Variable_Default_Visibility"
    }
    ```
* `Solidity-va.codelens.enable` ... enable/disable codelens support (inline code actions)
* `solidity-va.preview.dot` ... open dot output in graphviz rendered form
* `solidity-va.preview.markdown` ... open markdown output in rendered form
* `Solidity-va.tools.surya.input.contracts` ... Define whether surya should take cached files or all contracts in the workspace as input

Please refer to the extension's contribution section to show an up-to-date list of settings.

</details>

## FAQ

* **Q:** The `uml` feature does not seem to work. How can I set it up?
* **A:** We are relying on a properly set-up [plantuml](https://plantuml.com/) installation. Please follow the set-up guide at [jebbs-plantuml vscode extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml).
 
## Known Issues

* outline view does not always refresh. **TempFix**: modify and save the file to trigger a refresh.
* codelenses do not appear. **TempFix**: modify and save the file to trigger a refresh.
* [github issues](https://github.com/tintinweb/vscode-solidity-auditor/issues)

# Acknowledgements

* Themes: [Atom One Dark Theme](https://github.com/akamud/vscode-theme-onedark) and an adapted version of built-in `Solarized Light`
* Base Grammar for Solidity: [vscode-solidity](https://github.com/juanfranblanco/vscode-solidity)


# Release Notes

[Changelog](https://github.com/tintinweb/vscode-solidity-auditor/blob/master/CHANGELOG.md)

<!-- 
vsce package
vsce publish
 -->
