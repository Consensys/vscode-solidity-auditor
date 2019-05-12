# Solidity language support for Visual Studio Code - `Auditors Edition`

**DISCLAIMER** This is an experimental extension but it should be quite stable - [feedback](https://github.com/tintinweb/vscode-solidity-auditor/issues) highly appreciated ❤

This extension contributes **security centric** syntax and semantic highlighting, a detailed class outline and advanced Solidity code insights to Visual Studio Code ([Marketplace](https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor)).

we suggest using this plugin together with [vscode-solidity](https://github.com/juanfranblanco/vscode-solidity).


Found a bug? -> [file an issue](https://github.com/tintinweb/vscode-solidity-auditor/issues)

![vscode-auditor-surya-graph](https://user-images.githubusercontent.com/2865694/55647206-65decd00-57dd-11e9-856a-1cceed31d18e.gif)

![visual_auditor_new](https://user-images.githubusercontent.com/2865694/55153942-f9682c00-5153-11e9-9e88-b3958c134c88.png)

---------------------

## Features

Semantic highlighting and solidity insights for passive security awareness. Most features are configurable (`preferences -> Settings -> Solidity Visual Auditor`)

##### Themes (`preferences -> Color Theme`):

* Visual Auditor Dark - based on Atom One
* Visual Auditor Light - based on Solarized Light

##### Syntax Highlighting

* **access modifiers** (`external`, `public`, `payable`, ...)
* security relevant built-ins, globals, methods and user/miner-tainted information (`address.call()`,`tx.origin`,`msg.data`, `block.*`, `now`) 
* storage access modifiers (`memory`, `storage`)
* developer notes in comments (`TODO`,`FIXME`,`HACK`, ...)
* custom function modifiers 
* contract creation / event invocations
* easily differentiate between arithmetics vs. logical operations
* make **Constructor** and **Fallback** function more prominent

Code fragments are highlighted to draw your attention to <span style="color:green">*Secure code* (![#c5f015](https://placehold.it/15/c5f015/000000?text=+))</span> and <span style="color:red">*Insecure code* (![#f03c15](https://placehold.it/15/f03c15/000000?text=+))</span>.

##### Semantic Highlighting

* highlights **StateVars** (constant, inherited)
* detects and alerts about StateVar shadowing
* highlights **function arguments** in the function body


##### Audit Features

* audit annotations/bookmarks - `@audit - <msg>` `@audit-ok - <msg>` (see below)
* generic interface for importing external scanner results - cdili json format (see below)
* codelens inline action: graph, report, dependencies, inheritance, parse, ftrace, flatten, generate unittest stub, function signature hashes

##### Code Insights

* populates VS Code outline view with sourceUnit and contract layout
  * contracts, stateVars, methods, inherited names
  * annotates security relevant information (visibility, ...)
  * calculates complexity rating
  * annotations functions with information about whether they are accessing stateVars
* [Sūrya](https://github.com/ConsenSys/surya/) integration
* command: suggest top level contracts / find most derived contracts
* command: flatten most derived contracts
* command: calculate function signature hashes
* command: open Remix-IDE in external browser window
* onHover ASM instruction signatures
* onHover Security Notes for certain keywords
* onHover StateVar declaration information, including the line of declaration

# Installation

**Method 1:** Install by going to [Visual Studio Market Place](https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor#overview) and click  `Install`. 

**Method 2:** Bring up the Extension view in VS Code and search for  `Solidity Visual Auditor` and click `Install`

**Method 3 (Manual)**: 
1. Download the [latest compiled extension as *.vsix](https://github.com/tintinweb/vscode-solidity-auditor/releases)
2. Fire up Terminal and install the extension by running `code --install-extension "solidity-visual-auditor-0.0.x.vsix"`
3. vscode --> preferences --> color scheme --> **Solidity Visual Auditor Dark**

# Tour

Scroll down and take the tour.

![visual_auditor_new](https://user-images.githubusercontent.com/2865694/55153942-f9682c00-5153-11e9-9e88-b3958c134c88.png)
* semantic highlighting for state variables (constant=green, statevar=golden, inherited=blue)
* semantic highlighting for function arguments
* outline view with security annotations and inherited names
* tooltips (asm instruction signatures, security notes)
* `@audit` tags
* generic interface to import issues from external scanners



## semantic function argument highlighting

* arguments are assigned different colors in the scope of the function

<img width="722" alt="semantic-arg-dark" src="https://user-images.githubusercontent.com/2865694/55149233-1bf54780-514a-11e9-827e-d0816a9c2ac8.png">
<img width="722" alt="semantic-arg-light" src="https://user-images.githubusercontent.com/2865694/55149264-257eaf80-514a-11e9-8779-8cdd60b9ab22.png">

## @audit bookmarks

* `@audit - <msg>` ... flag lines for security review or start a security review discussion
* `@audit-ok - <msg>` ... flag that a line was checked for security or a security discussion on that line turned out to be a non-issue 

<img width="722" alt="audit-tags" src="https://user-images.githubusercontent.com/2865694/55152445-b3f62f80-5150-11e9-85df-de84023467c0.png">


## code annotations / hover / tooltip

* additional information for various keywords (including security notes)

<img width="722" alt="code_token_hover" src="https://user-images.githubusercontent.com/2865694/53698880-c34cbc00-3de2-11e9-8356-7fd5427f8469.png">

* asm instruction signatures

<img width="713" alt="code_asm_tooltip" src="https://user-images.githubusercontent.com/2865694/53698881-c34cbc00-3de2-11e9-97ae-3b7145430c27.png">

## stateVar tracing

* highlight contract local stateVars (golden box)

<img width="624" alt="code_statevar" src="https://user-images.githubusercontent.com/2865694/53698888-cfd11480-3de2-11e9-8308-a05fdace95f2.png">

* alert on a shadowed variable (red box)

<img width="767" alt="code_shadowed" src="https://user-images.githubusercontent.com/2865694/53698885-cf387e00-3de2-11e9-9e69-5fb26cd7a3a0.png">

* highlight const stateVar (green box)

<img width="756" alt="code_const" src="https://user-images.githubusercontent.com/2865694/53698886-cf387e00-3de2-11e9-9de6-0ce116e86d20.png">

* highlight inherited stateVar (blue box `Approval`)

<img width="624" alt="code_inherited" src="https://user-images.githubusercontent.com/2865694/53698887-cfd11480-3de2-11e9-8374-a022b4fdaa33.png">


## outline view

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


## Theme: Solidity Visual Auditor Dark

**Simple DAO**
<img width="981" alt="screenshot 2019-02-09 at 12 30 30" src="https://user-images.githubusercontent.com/2865694/52521879-58deab00-2c7e-11e9-9621-1afc73c918d8.png">

**Vulnerable Contract**

![highlight](https://user-images.githubusercontent.com/2865694/52523502-4bcbb700-2c92-11e9-9ef1-085e3a244cda.png)


## Theme: Solidity Visual Auditor Solarized Light

**Simple DAO**

<img width="970" alt="screenshot 2019-02-11 at 21 52 11" src="https://user-images.githubusercontent.com/2865694/52592696-5c715e00-2e47-11e9-99f4-32332e308ec3.png">




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
* `Solidity-va.audit.tags.enable` ... enable/disable audit tags
* `Solidity-va.codelens.enable` ... enable/disable codelens support (inline code actions)
* `solidity-va.preview.dot` ... open dot output in graphviz rendered form
* `solidity-va.preview.markdown` ... open markdown output in rendered form
* `Solidity-va.tools.surya.input.contracts` ... Define whether surya should take cached files or all contracts in the workspace as input


## Known Issues

* changing settings may require a vscode restart.
* outline view does not always refresh. **TempFix**: modify the file to trigger a refresh.
* [github issues](https://github.com/tintinweb/vscode-solidity-auditor/issues)

# Acknowledgements

* Themes: [Atom One Dark Theme](https://github.com/akamud/vscode-theme-onedark) and an adapted version of built-in `Solarized Light`
* Base Grammar for Solidity: [vscode-solidity](https://github.com/juanfranblanco/vscode-solidity)


# Release Notes

## v0.0.14 - aka big surya wedding
- feature: 💒🤵👰 [vscode-solidity-auditor](https://github.com/tintinweb/vscode-solidity-auditor) ⚭ [surya](https://github.com/ConsenSys/surya) by [Gonçalo Sá](https://github.com/gnsps)
- feature: codelens (inline code actions)
  - file
    - surya - graph  
    ![vscode-auditor-surya-graph](https://user-images.githubusercontent.com/2865694/55647206-65decd00-57dd-11e9-856a-1cceed31d18e.gif)
    - surya - generate report
    - surya - inheritance
    - surya - parse file (show AST) 
    ![vscode-auditor-surya-report](https://user-images.githubusercontent.com/2865694/55647025-e5b86780-57dc-11e9-9cc0-b5197eb075b8.gif)  
    - flatten sourceUnit using [flaterra](https://github.com/cleanunicorn/flaterra) 
  - contracts
    - create unittest stub for contract (e.g. for verifying vulnerabilities)  
     ![vscode-auditor-unittest](https://user-images.githubusercontent.com/2865694/55646826-72aef100-57dc-11e9-800b-fc649b41b4a9.gif)

    - surya - dependencies 
  - functions
    - surya - ftrace  
    ![vscode-auditor-ftrace](https://user-images.githubusercontent.com/2865694/55646883-983bfa80-57dc-11e9-8e40-6194d1429dac.gif)
- feature: command - suggest top level contracts aka "entrypoint contracts" (most derived)
- feature: command - flatten current (codelens) or all suggested top level contracts (command)
![vscode-auditor-flaterra](https://user-images.githubusercontent.com/2865694/55907553-5db8d000-5bd7-11e9-8a11-8cef3964e284.gif)
- feature: command - list all function signatures (human readable or json format)  
![vscode-auditor-funcsigs](https://user-images.githubusercontent.com/2865694/55907153-3f9ea000-5bd6-11e9-8a47-e69a762963e9.gif)
- feature: command - open remix in external browser

- Note: to enable graphviz dot previews install one of the following vscode extensions: [graphviz-preview](https://marketplace.visualstudio.com/items?itemName=EFanZh.graphviz-preview) or [vscode-graphviz](https://marketplace.visualstudio.com/items?itemName=joaompinto.vscode-graphviz)
- Note: to enable markdown previews install the following extension [markdown-preview-enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)
- outline - added assembly functions  
  <img width="360" alt="assembly" src="https://user-images.githubusercontent.com/2865694/55646137-b56fc980-57da-11e9-8fab-e24b5ef5e46b.png">


[Changelog](https://github.com/tintinweb/vscode-solidity-auditor/blob/master/CHANGELOG.md)

<!-- 
vsce package
vsce publish
 -->
