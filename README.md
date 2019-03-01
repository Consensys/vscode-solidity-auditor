# Solidity language support for Visual Studio Code - Auditors Edition

This extension provides advanced **security conscious** syntax highlighting and code insights support for Visual Studio Code.

![vscode-auditor](https://user-images.githubusercontent.com/2865694/53627822-c0e33a00-3c09-11e9-8d58-bbb2ca247bea.png)
* outline view with security annotations
* state var highlighting (constant=green)
* tooltips



## Theme: Solidity Visual Auditor Dark

**Simple DAO**
<img width="981" alt="screenshot 2019-02-09 at 12 30 30" src="https://user-images.githubusercontent.com/2865694/52521879-58deab00-2c7e-11e9-9621-1afc73c918d8.png">

**Vulnerable Contract**

![highlight](https://user-images.githubusercontent.com/2865694/52523502-4bcbb700-2c92-11e9-9ef1-085e3a244cda.png)


## Theme: Solidity Visual Auditor Solarized Light

**Simple DAO**

<img width="970" alt="screenshot 2019-02-11 at 21 52 11" src="https://user-images.githubusercontent.com/2865694/52592696-5c715e00-2e47-11e9-99f4-32332e308ec3.png">


## Features

Advanced syntax highlighting and solidity insights for security auditors.

Themes:

* Dark - based on Atom One
* Light - based on Solarized Light

Insights:

* onHover ASM instruction signatures
* onHover Security Notes for certain keywords
* onHover StateVar declaration information, including line of declaration

Visually highlights:

* **StateVars** (constant, inherited)
  * Detects StateVar shadowing
* **Constructor** and **Fallback** function
* insecure **access modifiers** (`external`, `public`, `payable`, ...)
* insecure built-ins, globals, methods and user/miner-tainted information (`address.call()`,`tx.origin`,`msg.data`, `block.*`, `now`) 
* storage access modifiers (`memory`, `storage`)
* development notes in comments (`TODO`,`FIXME`,`HACK`, ...)
* custom function modifiers
* arithmetics vs. logical operations
* event invocations
* contract creation

secure and 'insecure' code fragments are either highlighted red or green. 

## Installation

1. download the [latest compiled extesion as *.vsix](https://github.com/tintinweb/vscode-solidity-auditor/releases)
2. install the extension `#> code --install-extension "solidity-visual-auditor-0.0.x.vsix"`
3. vscode --> preferences --> color scheme --> **Solidity Visual Auditor Dark**

//[Found a bug -> file an issue](https://github.com/tintinweb/vscode-solidity-auditor/issues)

## Requirements

* this extension can be used together with `vscode-solidity`

## Extension Settings

* `Solidity-va.hover` ... Enable or Disable generic onHover information (asm instruction signatures, security notes)
* 

## Known Issues

None

## Acknowledgements

* Themes: [Atom One Dark Theme](https://github.com/akamud/vscode-theme-onedark) and an adapted version of built-in `Solarized Light`
* Base Grammar for Solidity: [vscode-solidity](https://github.com/juanfranblanco/vscode-solidity)

## Release Notes

### v0.0.9

* added solidity parser
* added support for stateVar tracking

### v0.0.4 - 0.0.8

* minor style fixes
* added support for inline comments in method heads (e.g. modifier calls). for all the crazy devs out there.
* added light theme

### v0.0.1 - 0.0.4

first alpha

<!-- 
vsce package
vsce publish
 -->
