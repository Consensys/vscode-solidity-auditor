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
