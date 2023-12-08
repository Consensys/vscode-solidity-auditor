"use strict";
/**
 * @author github.com/tintinweb
 * @license GPLv3
 *
 *
 * */
const vscode = require("vscode");
const settings = require("../settings.js");

/*
await window.showInputBox({prompt: 'prompt for something',})
*/

function elemLocToRange(elem) {
  let name = elem.name ? elem.name : Object(elem.name).toString();
  return new vscode.Range(
    new vscode.Position(elem.loc.start.line - 1, elem.loc.start.column),
    new vscode.Position(
      elem.loc.start.line - 1,
      elem.loc.start.column + name.length,
    ),
  );
}

class StaticLensProvider {
  constructor(g_workspace) {
    this.g_workspace = g_workspace;
    this.codeLenses = [];
  }

  init(document, item) {
    const codeLens = [];
    const firstLine = new vscode.Range(0, 0, 0, 0);
    const config = settings.extensionConfig().codelens;

    /** top level lenses */
    config.report.enable &&
      codeLens.push(
        new vscode.CodeLens(firstLine, {
          command: "solidity-va.surya.mdreport",
          title: "report",
        }),
      );
    /*  does not yet return values but writes to console
        codeLens.push(
            new vscode.CodeLens(
                firstLine, {
                    command: 'solidity-va.surya.describe',
                    title: 'describe',
                    arguments: [document.uri.fsPath]
                }
            )
        )
        */
    config.graphThis.enable &&
      codeLens.push(
        new vscode.CodeLens(firstLine, {
          command: "solidity-va.surya.graph",
          title: "graph (this)",
          arguments: [document, [document.uri.fsPath]],
        }),
      );
    config.graph.enable &&
      codeLens.push(
        new vscode.CodeLens(firstLine, {
          command: "solidity-va.surya.graph",
          title: "graph",
          arguments: [document], //auto-loads all parsed files
        }),
      );
    config.inheritance.enable &&
      codeLens.push(
        new vscode.CodeLens(firstLine, {
          command: "solidity-va.surya.inheritance",
          title: "inheritance",
          arguments: [document],
        }),
      );
    config.parse.enable &&
      codeLens.push(
        new vscode.CodeLens(firstLine, {
          command: "solidity-va.surya.parse",
          title: "parse",
          arguments: [document],
        }),
      );

    config.flatten.enable &&
      codeLens.push(
        new vscode.CodeLens(firstLine, {
          command: "solidity-va.tools.flaterra",
          title: "flatten",
          arguments: [document],
        }),
      );
    return codeLens;
  }

  async provideCodeLenses(document, token) {
    if (this.codeLenses.length == 0) {
      this.codeLenses = this.init(document, token);
    }
    return this.codeLenses;
  }
}

class ParserLensProvider {
  constructor(g_workspace) {
    this.g_workspace = g_workspace;
  }
  provideCodeLenses(document, token) {
    let firstLine = new vscode.Range(0, 0, 0, 0);
    let config = settings.extensionConfig().codelens;
    return this.g_workspace
      .add(document.fileName, { content: document.getText() })
      .then((parser) => {
        let codeLens = [];
        config.uml.enable &&
          codeLens.push(
            new vscode.CodeLens(firstLine, {
              command: "solidity-va.uml.contract.outline",
              title: "uml",
              arguments: [document, Object.values(parser.contracts)],
            }),
          );

        config.drawio.enable &&
          codeLens.push(
            new vscode.CodeLens(firstLine, {
              command: "solidity-va.uml.contract.export.drawio.csv",
              title: "draw.io",
              arguments: [document, Object.values(parser.contracts)],
            }),
          );

        config.funcSigs.enable &&
          codeLens.push(
            new vscode.CodeLens(firstLine, {
              command: "solidity-va.tools.function.signatureForAstItem",
              title: "funcSigs",
              arguments: [Object.values(parser.contracts)],
            }),
          );

        let annotateContractTypes = ["contract", "library", "abstract"];
        /** all contract decls */
        for (let contractObj of Object.values(parser.contracts)) {
          if (token.isCancellationRequested) {
            return [];
          }

          if (annotateContractTypes.indexOf(contractObj._node.kind) >= 0) {
            codeLens = codeLens.concat(
              this.onContractDecl(document, contractObj),
            );

            /** all function decls */
            for (let funcObj of contractObj.functions) {
              codeLens = codeLens.concat(
                this.onFunctionDecl(document, contractObj.name, funcObj),
              );
            }
          } else if (contractObj._node.kind == "interface") {
            // add uml to interface
            let item = contractObj;
            config.uml.enable &&
              codeLens.push(
                new vscode.CodeLens(elemLocToRange(item._node), {
                  command: "solidity-va.uml.contract.outline",
                  title: "uml",
                  arguments: [document, [item]],
                }),
              );
          }
        }
        return codeLens;
      })
      .catch((e) => {
        console.warn(
          `Error parsing file ${document.fileName}`,
        );
        if (settings.extensionConfig().debug.parser.showExceptions) {
          console.error(e);
        }
        return undefined;
      });
  }

  onContractDecl(document, item) {
    let lenses = [];
    let range = elemLocToRange(item._node);

    let config = settings.extensionConfig().codelens;

    config.unittestStub.enable &&
      lenses.push(
        new vscode.CodeLens(range, {
          command: "solidity-va.test.createTemplate",
          title: "UnitTest stub",
          arguments: [document, item],
        }),
      );

    config.dependencies.enable &&
      lenses.push(
        new vscode.CodeLens(range, {
          command: "solidity-va.surya.dependencies",
          title: "dependencies",
          arguments: [document, item.name, []],
        }),
      );

    config.uml.enable &&
      lenses.push(
        new vscode.CodeLens(range, {
          command: "solidity-va.uml.contract.outline",
          title: "uml",
          arguments: [document, [item]],
        }),
      );

    config.funcSigs.enable &&
      lenses.push(
        new vscode.CodeLens(range, {
          command: "solidity-va.tools.function.signatureForAstItem",
          title: "funcSigs",
          arguments: [item],
        }),
      );

    config.drawio.enable &&
      lenses.push(
        new vscode.CodeLens(range, {
          command: "solidity-va.uml.contract.export.drawio.csv",
          title: "draw.io",
          arguments: [document, [item]],
        }),
      );

    return lenses;
  }

  onFunctionDecl(document, contractName, item) {
    let lenses = [];
    let range = elemLocToRange(item._node);

    let config = settings.extensionConfig().codelens;

    config.ftrace.enable &&
      lenses.push(
        new vscode.CodeLens(range, {
          command: "solidity-va.surya.ftrace",
          title: "ftrace",
          arguments: [document, contractName, item._node.name, "all"],
        }),
      );
    //exclude constructor (item._node.name == null)
    config.funcSigs.enable &&
      item._node.name &&
      lenses.push(
        new vscode.CodeLens(range, {
          command: "solidity-va.tools.function.signatureForAstItem",
          title: "funcSig",
          arguments: [item],
        }),
      );

    return lenses;
  }
}

module.exports = {
  StaticLensProvider,
  ParserLensProvider,
};
