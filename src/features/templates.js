'use strict';
/**
 * @author github.com/tintinweb
 * @license GPLv3
 *
 *
 * */

const vscode = require('vscode');
const { generateForgeTemplate } = require('./templates/forge');
const { generateTruffleTemplate } = require('./templates/truffle');
const { generateHardhatTemplate } = require('./templates/hardhat');

function generateTruffleUnittestStubForContract(document, g_workspace, contractObj) {
  let contract = {
    name: contractObj?.name,
    path: document.uri.fsPath,
  };

  if (!contractObj) {
    //take first
    let sourceUnit = g_workspace.get(document.uri.fsPath);
    if (!sourceUnit || Object.keys(sourceUnit.contracts).length <= 0) {
      vscode.window.showErrorMessage(
        `[Solidity VA] unable to create unittest stub for current contract. missing analysis for source-unit: ${document.uri.fsPath}`
      );
      return;
    }

    contract.name = Object.keys(sourceUnit.contracts)[0];
  }
  
  return generateTruffleTemplate(contract);
}

function generateHardhatUnittestStubForContract(
  document,
  g_parser,
  contractObj
) {
  let contract = {
    name: contractObj?.name,
    path: document.uri.fsPath,
  };

  if (!contractObj) {
    //take first
    let sourceUnit = g_parser.sourceUnits[document.uri.fsPath];
    if (!sourceUnit || Object.keys(sourceUnit.contracts).length <= 0) {
      vscode.window.showErrorMessage(
        `[Solidity VA] unable to create hardhat-unittest stub for current contract. missing analysis for source-unit: ${document.uri.fsPath}`
      );
      return;
    }

    contract.name = Object.keys(sourceUnit.contracts)[0];
  }

  return generateHardhatTemplate(contract);
}

function generateForgeUnittestStubForContract(document, g_parser, contractObj, generateForkStub) {
  let contract = {
    name: contractObj?.name,
    path: document.uri.fsPath,
    pragma: contractObj?._parent.pragmas[0]?.value || '^0.8.17',
  };

  if (!contractObj) {
    //take first
    let sourceUnit = g_parser.sourceUnits[document.uri.fsPath];
    if (!sourceUnit || Object.keys(sourceUnit.contracts).length <= 0) {
      vscode.window.showErrorMessage(
        `[Solidity VA] unable to create forge unittest stub for current contract. missing analysis for source-unit: ${document.uri.fsPath}`
      );
      return;
    }

    contract.name = Object.keys(sourceUnit.contracts)[0];
    contract.pragma = sourceUnit.pragmas[0].value || contract.pragma;
  }

  return generateForgeTemplate(contract, generateForkStub);
}

module.exports = {
  generateTruffleUnittestStubForContract,
  generateHardhatUnittestStubForContract,
  generateForgeUnittestStubForContract,
};
