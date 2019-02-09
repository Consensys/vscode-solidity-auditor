# Solidity language support for Visual Studio Code - Auditors Edition

This extension provides **security conscious** syntax highlighting support for Visual Studio Code.

<img width="796" alt="screenshot 2019-02-09 at 00 30 20" src="https://user-images.githubusercontent.com/2865694/52511785-f8118d00-2c01-11e9-8b23-f94542ef4a80.png">


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


## Requirements

* this extension can be used together with `vscode-solidity`
* code --> preferences --> color scheme --> Solidity Visual Auditor Dark

## Extension Settings

None

## Known Issues

None

## Acknowledgements

* Theme: `Atom One Dark Theme`
* Base Grammar for Solidity: `vscode-solidity`

## Release Notes

None

### 0.0.5

minor style fixes

### 0.0.4

first alpha

<!-- 
vsce package
vsce publish
 -->
