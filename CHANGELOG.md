# Change Log
All notable changes to the "solidity-visual-auditor" extension will be documented in this file.

## v0.0.12
- refactored folder structure
- bug: check if source-file is actually a solidity file on-change
- new feature: semantic function argument highlighting
- new feature: audit tags (`//@audit - potential overflow`, `//@audit-ok - potential overflow - false positive`)
- new feature: automatically import diagnostic issues from external scanners using `cdili-issue.json` format

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
