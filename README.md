# Solidity language support for Visual Studio Code - Auditors Edition

This extension provides **security conscious** syntax highlighting support for Visual Studio Code.

**Simple DAO**
<img width="981" alt="screenshot 2019-02-09 at 12 30 30" src="https://user-images.githubusercontent.com/2865694/52521879-58deab00-2c7e-11e9-9621-1afc73c918d8.png">

**Vulnerable Contract**

![highlight](https://user-images.githubusercontent.com/2865694/52523502-4bcbb700-2c92-11e9-9ef1-085e3a244cda.png)


## Features

Syntax highlighting for security auditors.

Highlights:

* constructor and fallback function
* insecure visibility modifiers (public, payable, ...)
* insecure built-ins, globals, methods and user/miner-tainted information (`address.call()`,`tx.origin`,`msg.data`, `block.*`, `now`) 
* storage modifiers (`memory`, `storage`)
* hacky notes in comments (`TODO`,`FIXME`,`HACK`, ...)
* arithmetics vs. logical operations
* events

secure and 'insecure' code fragments are either highlighted red or green. 

## Installation

1. download the [latest compiled extesion as *.vsix](https://github.com/tintinweb/vscode-solidity-auditor/releases)
2. install the extension `#> code --install-extension "solidity-visual-auditor-0.0.x.vsix"`
3. vscode --> preferences --> color scheme --> **Solidity Visual Auditor Dark**

//[Found a bug -> file an issue](https://github.com/tintinweb/vscode-solidity-auditor/issues)

## Requirements

* this extension can be used together with `vscode-solidity`

## Limitations

* We can only highlight what is there. There's no way to highlight the absence of certain language constructs.
* This is a regex based based approach (not even a real lexer). We do not know anything about the semantics of the code. 

## Extension Settings

None

## Known Issues

None

## Acknowledgements

* Themes: [Atom One Dark Theme](https://github.com/akamud/vscode-theme-onedark) and an adapted version of built-in `Solarized Light`
* Base Grammar for Solidity: [vscode-solidity](https://github.com/juanfranblanco/vscode-solidity)

## Release Notes

None

### 0.0.7

added light theme

### 0.0.6

added support for inline comments in method heads (e.g. modifier calls). for all the crazy devs out there.

### 0.0.5

minor style fixes

### 0.0.1 - 0.0.4

first alpha

<!-- 
vsce package
vsce publish
 -->
