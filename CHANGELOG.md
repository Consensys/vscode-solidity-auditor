# Change Log

Note: Don't forget to check out `preferences → Settings → Solidity Visual Developer` to customize features, look and feel.

## v0.1.2

- new: decorate/highlight immutable state vars (<span style="color:#9932cc">![#9932cc](https://via.placeholder.com/15/9932cc/000000?text=+)</span>) - #97 (thanks @RomiRand)
<img width="381" alt="image" src="https://user-images.githubusercontent.com/2865694/163415669-7d45d698-2be1-49a3-80b4-c6e2ed861d11.png">

- update: dependencies (surya@0.4.6)
- new: configuration option to enable the `surya.mdreport` "negative Modifiers" feature, see [surya#162](https://github.com/ConsenSys/surya/pull/162)
  - enabling `solidity-va.tools.surya.option.negModifiers` will list all modifiers observed in the file with the ones that are not being used with the listed method being  ~~striked-through~~

![image](https://user-images.githubusercontent.com/2998191/155733325-7a6187b8-e63e-4410-a312-aa2a1c940e31.png)

  Note that the report can be generated either via the `report` codelense or by selecting files in the `Solidity Visual Developer View → right-click → Surya: generate report`.

<img width="401" alt="image" src="https://user-images.githubusercontent.com/2865694/163411802-49e91a8d-df9e-44ca-8c62-23510d7c9a4a.png">

<img width="398" alt="image" src="https://user-images.githubusercontent.com/2865694/163412288-20e621df-b715-4074-b8f8-033a4b758002.png">


- fix: typos & links to placeholder[.]com - #93 #91 (thanks @almndbtr)

## v0.1.1 - ❄️🎄🏂🎄❄️

- fix: type resolving and declaration link for inherited statevars
- update: move language specific logic to a web compatible extension
  - https://github.com/tintinweb/vscode-solidity-language (https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-solidity-language)
  - The language ships with three security centered Color Themes that can be selected from the **Solidity Language & Themes (only)** extension page or `Code → Preferences → Color Themes` 
  
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
- new: unit-test stub/template for Hardhat/Ethers #70 (`preferences → Settings → Solidity Visual Developer: solidity-va.test.defaultUnittestTemplate`)
- new: (debug) option to enable/disable stacktraces for parser errors (`preferences → Settings → Solidity Visual Developer: solidity-va.debug`)
- new: show codelenses (inline actions) for abstract contracts
- new: customize which codelenses to show or hide (`preferences → Settings → Solidity Visual Developer: solidity-va.codelens.*`) #76
- new: expose new command `solidity-va.surya.graphThis` #76
- new: use internal ("dumb" lexical) flattener by default. Optionally allow to select `truffle-flattener` (`preferences → Settings → Solidity Visual Developer: solidity-va.flatten.mode`)
- update: enable `draw.io csv export` codelens by default
- fix: misplaced decoration when document changes
- fix: function selector is incorrect if there's a comment in the function signature definition #68
- update: code cleanup; refactored decoration logic and moved it to its own submodule


## v0.0.32 - v0.0.33

Maintenance release until v0.1.0 is ready.

- new: graphviz view titles were adjusted
- fix: vscode API adjustments ("crippled" events): "Cannot read property length of 'undefined'"
- fix: check if statevar highlighting is enabled - #73
- update: solidity parser to 0.12.2

## v0.0.31

Happy new year 👪🌃🥂🎇!

- new: allow to disable the "find references" provider 
  - `preferences → Settings → Solidity Visual Developer: solidity-va.findAllReferences.enable`
  - in case another extension implements a better provider someday :)
- new: experimental draw.io uml export to support your threat modelling needs (you're going to ❤ this!)
  - disabled by default
  - `preferences → Settings → Solidity Visual Developer: solidity-va.codelens.drawio.enable`
- fix: function signature generation for `AbiEncoderV2` functions that declare custom types
  - for now this falls back to assume every custom type is an `address`. needs some love if this feature is actually being used.
- refactor: modular uml export
- refactor: improved syntax highlighting / decoration performance
  - only decorates when needed, avoid double decoration
  - should fix or make it unlikely that decorations are being applied to the wrong editor - fixes #12
- update: dependencies
  - surya
  - solidity parser
  - keccak

## v0.0.30
- new: We've finally implemented support for `Right Click → Find All References` for solidity source files!
  - Please note that this currently performs a lexical search of all source-code files containing the word under the cursor (including comments). This may be subject to change to return more specific results in the future.
  <br><img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/94445596-eb132a00-01a7-11eb-9098-32958d58ebd6.gif">
    
- update: dependencies surya / solidity parser


## v0.0.29
- sort top level contracts list by filename
- fix: VSCode-Error: Proposed API is only available when running out of dev or with the following command line switch... #59

## v0.0.28
- new: integration with [tintinweb.vscode-ethover](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-ethover)
  - ethereum address hover
  - open address in etherscan, fetch bytecode, verified contract
  - disassemble or decompile bytecode
  - registers `.evmtrace` and `.evm` language handlers to decorate disassemblies or bytecode
  - customizations/ApiKey: see settings

  <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/86650152-bd707780-bfe2-11ea-819d-a9e3dacb2034.gif">
- update: `surya` to `0.4.1-dev.2`

## v0.0.27
- rebirth: `Solidity Visual Auditor` is now `Solidity Visual Developer` 🎉
- new: Ethereum Address hover commands. Hover over an ethereum account address to:
  -  `open` the account on etherscan.io
  - show the contract `code`
  - show the `VerifiedContract` source code
  - `decompile` the byte-code. requires [vscode-decompiler](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-decompiler)<br>
    <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/85524701-af951c80-b608-11ea-803c-c2587e7732b7.gif">

## v0.0.26
- new: support for solidity `0.6.x` via #53
- new: `cockpit → Workspace: Explorer → Surya: Contract interaction graph` aka `surya.graphSimple` #49</br>
    <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/83885864-34e28b00-a747-11ea-990d-74410f062153.png"></br>
    <img width="360" alt="image" src="https://user-images.githubusercontent.com/2865694/83886949-0f09b600-a748-11ea-8cf2-878773e3f0b0.png">
- updated: surya to 0.4.0 #49
- updated: `solidity-parser-diligence` to community maintained `@solidity-parser/parser` #53

## v0.0.25
- updated: breaking interface with `vscode-interactive-graphviz@v0.0.8`: the render command was renamed from `interactive-graphviz.preview.beside` to `graphviz-interactive-preview.preview.beside`

## v0.0.24
- new: Solidity Visual Auditor Cockpit panel additions
    - Context: show function call trace when clicking into a contract method in the editor
    - Flatfiles: List flat files produced by the extension (matches: `**/flat_*.sol`)
- updated: surya (fixed multiple issues when parsing certain smart contracts with `usingFor` statements)
  
## v0.0.23
- new: Update notifications have arrived!
- updated: solidity parser and surya
- new: 🔥 Solidity Visual Auditor Cockpit panel
    - Workspace Explorer
    - Quick-access to extension settings
    - Find Top Level Contracts
    - Keep track of flattened files
    - List public state-changing methods from the current contract
    - Show the function call trace for the current method

## v0.0.22
- update: solidity parser, surya (#41 [#42](https://github.com/tintinweb/vscode-solidity-auditor/issues/42))
- fix: linter warnings (#40)
- fix: configuration changes now take effect immediately (#43)

## v0.0.21
- fix: Support VSCode for Windows (#38, [#35](https://github.com/tintinweb/vscode-solidity-auditor/issues/35))
- fix: UML arrows (#34)
- code cleanup (#39)
- allow extension to run on unsaved files/editors (some functionality will not work on unsaved files, e.g. `surya` calls)

## v0.0.20
- new: released `@audit-tags` as a general purpose extension named [Inline Bookmarks](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-inline-bookmarks).
  - obsoletes: `Solidity-va.audit.tags.enable` ... enable/disable audit tags
- split up extension dependencies in hard and soft requirements
  - new: extensionPack - this extension now automatically installs soft dependencies. You can uninstall them at any point in time.
    - (optional) [Solidity Flattener](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-solidity-flattener)
    - (optional) [PlantUML](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)
    - (optional) [Inline Bookmarks](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-inline-bookmarks)
  - updated: extensionDependencies
    - (required) [Interactive Graphviz](https://marketplace.visualstudio.com/items?itemName=tintinweb.graphviz-interactive-preview)

## v0.0.19
- new: constant values that are not symbols are now shown in hover message

<img width="360" alt="Screenshot 2019-11-12 at 15 41 48" src="https://user-images.githubusercontent.com/2865694/68681269-699cb400-0563-11ea-9ba3-1605c3a5e8c6.png">

- fix: hover message - jump to declaration now works on MacOS
- fix: function signature output shows 🔥 even though there are no collisions

## v0.0.18
- new: UML diagrams just arrived 🎉! auto-generate uml for source-units or contracts.

<img width="360" alt="sva_light_vscode" src="https://user-images.githubusercontent.com/2865694/64821850-08cd1b80-d5b4-11e9-9917-4275fc54f56a.png">

- new: codelense next to functions to generate sighash.
- fix: function signature hashes are now generated for all functions (even internal ones, just ignore them for now :)). Canonicalization of types before calculating hashes [#27](https://github.com/tintinweb/vscode-solidity-auditor/issues/27). 
- new: alert on function sighash collision within the same contract.

<img width="360" alt="sva_light_vscode" src="https://user-images.githubusercontent.com/2865694/64822139-a3c5f580-d5b4-11e9-8ecd-6554f79265d8.png">  

- new: AST parser now keeps track of `usingFor`'s 

## v0.0.17
- new: audit-tags: new `@audit-issue` and `@audit-info` to add informational notes or references to files issues (#23)
- update: contract flattener changed from `flaterra` to `truffle-flattener` ([vscode-solidity-flattener](https://marketplace.visualstudio.com/items?itemName=tintinweb.vscode-solidity-flattener))
- new: theme - Solidity Visual auditor light  - the vscode standard light theme with visual auditor highlighting (#25)  

<img width="722" alt="sva_light_vscode" src="https://user-images.githubusercontent.com/2865694/61187446-71aa1d00-a671-11e9-9303-6f3169669b17.png">  
<img width="1364" alt="theme_light_vs" src="https://user-images.githubusercontent.com/2865694/61187576-6b1ca500-a673-11e9-8770-ff8b47d716ee.png">
- update: updated theme `solarized-light`, split up color-scheme definitions into multiple files. Changed 'light-theme' natspec color highlighting to be less dramatic (black->greyish). (#24)

## v0.0.16
- fix: enable graph rendering by default
- fix: codelenses are sometimes missing (graph)

## v0.0.15 - aka fancy graphs

- update to latest surya release. (known issue: ftrace might fail right now and will be fixed with a subsequent release)
- awesome dark themed call graph.
- awesome interactive graphs [vscode-interactive-graphviz](https://github.com/tintinweb/vscode-interactive-graphviz)
  - ![vscode-solidity-auditor-interactive-graph](https://user-images.githubusercontent.com/2865694/57710279-e27e8a00-766c-11e9-9ca9-8cde50aa31fc.gif)

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


## v0.0.13

- feature: vscode.command to generate a unittest stub for the current contract (`cmd`+`shift`+`p` -> `Solidity Visual Auditor: create Unittest stub for current Contract`)  
  ![vscode-auditor-cmd-unittest-stub](https://user-images.githubusercontent.com/2865694/55644906-7db35280-57d7-11e9-8802-f35bed28028f.gif)

- feature: functions in outline now show modifier decorations  
  <img width="360" alt="outline_lib" src="https://user-images.githubusercontent.com/2865694/55644739-10072680-57d7-11e9-9b88-822ae2288278.png">

- feature: alert when using [reserved names](https://solidity.readthedocs.io/en/latest/miscellaneous.html#reserved-keywords) as identifiers  
  ![vscode-auditor-shadow-reserved](https://user-images.githubusercontent.com/2865694/55644488-62941300-57d6-11e9-839f-437aaf5fe6c1.gif)

- handle cancellationRequests (avoid piling up analysis runs or having them run in parallel)
- fix error for functions with anonymous arguments
- fix highlighting of statevars in modifiers (and detect shadowing)  
  <img width="360" alt="outline_lib" src="https://user-images.githubusercontent.com/2865694/55644609-bd2d6f00-57d6-11e9-96d6-c8a5b5295149.png">

- fix class inheritance in outline missing dependencies of dependencies  
  <img width="360" alt="outline_lib" src="https://user-images.githubusercontent.com/2865694/55644655-dafad400-57d6-11e9-8671-0ce2cbe7f0b8.png">

- fix hover being applied to comments
- rework cdili issue import handling (performance improvements)
- fix cdili issue import only importing one issue per file
- async functions

## v0.0.12
- refactored folder structure
- bug: check if source-file is actually a solidity file on-change
- feature: semantic function argument highlighting
- feature: audit tags (`//@audit - potential overflow`, `//@audit-ok - potential overflow - false positive`)
- feature: automatically import diagnostic issues from external scanners using `cdili-issue.json` format

## v0.0.10

- proper parsing of imports
- linearization of inheritance
- highlighting of inherited statevars/methods with location
- outline view now shows pragmas/imports and inheritance
- more annotations for outline view

## v0.0.9

- added solidity parser
- added support for stateVar tracking
- added SymbolProvider to populate outline

## v0.0.4 - 0.0.8

- minor style fixes
- added support for inline comments in method heads (e.g. modifier calls). for all the crazy devs out there.
- added light theme

## v0.0.1 - 0.0.4

- first alpha
