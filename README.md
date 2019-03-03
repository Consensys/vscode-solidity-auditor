# Solidity language support for Visual Studio Code - Auditors Edition

**DISCLAIMER** this is an experimental extension but it should be quite stable - [feedback](https://github.com/tintinweb/vscode-solidity-auditor/issues) highly appreciated ❤

This extension contributes **security conscious** syntax highlighting, a detailed class outline and advanced Solidity code insights to Visual Studio Code ([Marketplace](https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor)).

Scroll down and take the tour.

![vscode-auditor](https://user-images.githubusercontent.com/2865694/53627822-c0e33a00-3c09-11e9-8d58-bbb2ca247bea.png)
* outline view with security annotations and inherited names
* state var highlighting (constant=green, statevar=golden, inherited=blue)
* various tooltips (asm instruction signatures, security notes)

we suggest using this plugin together with `vscode-solidity`.

## Features

Advanced syntax highlighting and solidity insights for security auditors and passive security awarenes developers.

Themes (preferences -> Color Theme):

* Dark - based on Atom One
* Light - based on Solarized Light

Insights:

* onHover ASM instruction signatures
* onHover Security Notes for certain keywords
* onHover StateVar declaration information, including line of declaration

Visually highlights:

* the sourceUnit layout (contracts, statevars, methods, inherited names, ...)
* annotates methods with security information, complexity rating and whether a method is accessing state variables
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

# Tour

## code annotations / hover / tooltip

additional information for various keywords (including security notes)

<img width="722" alt="code_token_hover" src="https://user-images.githubusercontent.com/2865694/53698880-c34cbc00-3de2-11e9-8356-7fd5427f8469.png">

asm instruction signatures

<img width="713" alt="code_asm_tooltip" src="https://user-images.githubusercontent.com/2865694/53698881-c34cbc00-3de2-11e9-97ae-3b7145430c27.png">

## statevar tracing

highlight contract local statevars (golden box)

<img width="624" alt="code_statevar" src="https://user-images.githubusercontent.com/2865694/53698888-cfd11480-3de2-11e9-8308-a05fdace95f2.png">

alert on shadowed variable (red box)

<img width="767" alt="code_shadowed" src="https://user-images.githubusercontent.com/2865694/53698885-cf387e00-3de2-11e9-9e69-5fb26cd7a3a0.png">

highlight const statevar (green box)

<img width="756" alt="code_const" src="https://user-images.githubusercontent.com/2865694/53698886-cf387e00-3de2-11e9-9de6-0ce116e86d20.png">

highlight inherited statevar (blue box `Approval`)

<img width="624" alt="code_inherited" src="https://user-images.githubusercontent.com/2865694/53698887-cfd11480-3de2-11e9-8374-a022b4fdaa33.png">


## outline view

library with function paramters `T` and declarations

<img width="360" alt="outline_lib" src="https://user-images.githubusercontent.com/2865694/53698893-d1024180-3de2-11e9-8c93-a1ee0076a992.png">

class and events, functions annotated (statemutability, visibility)

<img width="360" alt="outline_class_event" src="https://user-images.githubusercontent.com/2865694/53698892-d1024180-3de2-11e9-89d0-300a1c57376e.png">

class and events, functions annotated (statemutability, visibility)

<img width="360" alt="outline_class_2" src="https://user-images.githubusercontent.com/2865694/53698891-d069ab00-3de2-11e9-8155-5f5aa568852c.png">

inheritance browser - resolves inheritance, only shows inherited names

<img width="360" alt="outline_inherit" src="https://user-images.githubusercontent.com/2865694/53698890-d069ab00-3de2-11e9-8dde-fb524794d1df.png">

extra information (subjective function complexity; accesses statevar?)

<img width="360" alt="outline_extra" src="https://user-images.githubusercontent.com/2865694/53698889-d069ab00-3de2-11e9-88bd-65598a39140c.png">


## Theme: Solidity Visual Auditor Dark

**Simple DAO**
<img width="981" alt="screenshot 2019-02-09 at 12 30 30" src="https://user-images.githubusercontent.com/2865694/52521879-58deab00-2c7e-11e9-9621-1afc73c918d8.png">

**Vulnerable Contract**

![highlight](https://user-images.githubusercontent.com/2865694/52523502-4bcbb700-2c92-11e9-9ef1-085e3a244cda.png)


## Theme: Solidity Visual Auditor Solarized Light

**Simple DAO**

<img width="970" alt="screenshot 2019-02-11 at 21 52 11" src="https://user-images.githubusercontent.com/2865694/52592696-5c715e00-2e47-11e9-99f4-32332e308ec3.png">


## Installation

1. download the [latest compiled extesion as *.vsix](https://github.com/tintinweb/vscode-solidity-auditor/releases)
2. install the extension `#> code --install-extension "solidity-visual-auditor-0.0.x.vsix"`
3. vscode --> preferences --> color scheme --> **Solidity Visual Auditor Dark**

[Found a bug -> file an issue](https://github.com/tintinweb/vscode-solidity-auditor/issues)

## Requirements

* this extension can be used together with `vscode-solidity`

## Extension Settings

* `Solidity-va.hover` ... Enable or Disable generic onHover information (asm instruction signatures, security notes)
* `Solidity-va.deco.statevars` ... decorate statevars in code view (golden, green, blue boxes)
* `Solidity-va.outline.decorations` ... decorate functions according to state mutability function visibility
* `Solidity-va.outline.inheritance.show` ... add inherited functions to outline view
* `Solidity-va.outline.extras` ... annotate functions with extra information (complexity, statevar access)

## Known Issues

None

## Acknowledgements

* Themes: [Atom One Dark Theme](https://github.com/akamud/vscode-theme-onedark) and an adapted version of built-in `Solarized Light`
* Base Grammar for Solidity: [vscode-solidity](https://github.com/juanfranblanco/vscode-solidity)

## Release Notes

## v0.0.10

- proper parsing of imports
- linearization of inheritance
- highlighting of inherited statevars/methods with location
- outline view now shows pragmas/imports and inheritance
- more annotations for outline view

[Changelog](CHANGELOG.md)

<!-- 
vsce package
vsce publish
 -->
