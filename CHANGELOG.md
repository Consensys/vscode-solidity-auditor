# Change Log
All notable changes to the "solidity-visual-auditor" extension will be documented in this file.

## v0.0.19
- new: constant values that are not symbols are now shown in hover message

<img width="360" alt="Screenshot 2019-11-12 at 15 41 48" src="https://user-images.githubusercontent.com/2865694/68681269-699cb400-0563-11ea-9ba3-1605c3a5e8c6.png">

- fix: hover message - jump to declaration now works on MacOS
- fix: function signature output shows 🔥 even though there are no collisions

## v0.0.18
- new: UML diagrams just arrived 🎉! auto-generate uml for source-units or contracts.

<img width="360" alt="sva_light_vscode" src="https://user-images.githubusercontent.com/2865694/64821850-08cd1b80-d5b4-11e9-9917-4275fc54f56a.png">

- new: codelense next to functions to generate sighash.
- fix: function signature hashes are now generated for all functions (even internal ones, just ignore them for now :)). Canonicalization of types before calculating hashes #27. 
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
