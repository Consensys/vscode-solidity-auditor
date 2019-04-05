# Change Log
All notable changes to the "solidity-visual-auditor" extension will be documented in this file.

## v0.0.14
- 💒🤵👰 [vscode-solidity-auditor](https://github.com/tintinweb/vscode-solidity-auditor) ⚭ [surya](https://github.com/ConsenSys/surya) by [Gonçalo Sá](https://github.com/gnsps)
- added codelens (inline code actions)
  - file
    - surya - report
    - surya - graph
    - surya - inheritance
    - surya - parse
  - contracts
    - create unittest stub for contract (e.g. for verifying vulnerabilities)
    - surya - dependencies 
  - functions
    - surya - ftrace
- to enable graphviz dot previews install one of the following vscode extensions: [graphviz-preview](https://marketplace.visualstudio.com/items?itemName=EFanZh.graphviz-preview) or [vscode-graphviz](https://marketplace.visualstudio.com/items?itemName=joaompinto.vscode-graphviz)
- to enable markdown previews install the following extension [markdown-preview-enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced)
- outline - added assembly functions

## v0.0.13

- new feature: vscode.command to generate a unittest stub for the current contract (`cmd`+`shift`+`p` -> `Solidity Visual Auditor: create Unittest stub for current Contract`)  
  ![vscode-auditor-cmd-unittest-stub](https://user-images.githubusercontent.com/2865694/55644906-7db35280-57d7-11e9-8802-f35bed28028f.gif)

- new feature: functions in outline now show modifier decorations  
  <img width="360" alt="outline_lib" src="https://user-images.githubusercontent.com/2865694/55644739-10072680-57d7-11e9-9b88-822ae2288278.png">

- new feature: alert when using [reserved names](https://solidity.readthedocs.io/en/latest/miscellaneous.html#reserved-keywords) as identifiers  
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
- new feature: semantic function argument highlighting
- new feature: audit tags (`//@audit - potential overflow`, `//@audit-ok - potential overflow - false positive`)
- new feature: automatically import diagnostic issues from external scanners using `cdili-issue.json` format

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
