"use strict";
/**
 * @author github.com/tintinweb
 * @license GPLv3
 *
 *
 * */

const vscode = require("vscode");
const fs = require("fs");
const child_process = require("child_process");
const path = require("path");

const settings = require("../settings");

const mod_templates = require("./templates");
const mod_utils = require("./utils");

const { DrawIoCsvWriter } = require("./writer/drawio");
const { PlantumlWriter } = require("./writer/plantuml");

const surya = require("surya");

const suryaDefaultColorSchemeDark = {
  digraph: {
    bgcolor: "#2e3e56",
    nodeAttribs: {
      style: "filled",
      fillcolor: "#edad56",
      color: "#edad56",
      penwidth: "3",
    },
    edgeAttribs: {
      color: "#fcfcfc",
      penwidth: "2",
      fontname: "helvetica Neue Ultra Light",
    },
  },
  visibility: {
    isFilled: true,
    public: "#FF9797",
    external: "#ffbdb9",
    private: "#edad56",
    internal: "#f2c383",
  },
  nodeType: {
    isFilled: false,
    shape: "doubleoctagon",
    modifier: "#1bc6a6",
    payable: "brown",
  },
  call: {
    default: "white",
    regular: "#1bc6a6",
    this: "#80e097",
  },
  contract: {
    defined: {
      bgcolor: "#445773",
      color: "#445773",
      fontcolor: "#f0f0f0",
      style: "rounded",
    },
    undefined: {
      bgcolor: "#3b4b63",
      color: "#e8726d",
      fontcolor: "#f0f0f0",
      style: "rounded,dashed",
    },
  },
};

function runCommand(cmd, args, env, cwd, stdin) {
  cwd = cwd || vscode.workspace.rootPath;

  return new Promise((resolve, reject) => {
    console.log(`running command: ${cmd} ${args.join(" ")}`);
    let p = child_process.execFile(
      cmd,
      args,
      { env: env, cwd: cwd },
      (err, stdout, stderr) => {
        p.stdout.on("data", function (data) {
          if (stdin) {
            p.stdin.setEncoding("utf-8");
            p.stdin.write(stdin);
            p.stdin.end();
          }
        });
        if (err === null || err.code === 0) {
          console.log("success");
          return resolve(err);
        }
        err.stderr = stderr;
        return reject(err);
      },
    );
  });
}

class Commands {
  constructor(g_workspace) {
    this.g_workspace = g_workspace;
  }

  _checkIsSolidity(document) {
    if (!document || document.languageId != settings.languageId) {
      vscode.window.showErrorMessage(
        `[Solidity VA] not a solidity source file ${vscode.window.activeTextEditor.document.uri.fsPath}`,
      );
      throw new Error("not a solidity file");
    }
  }

  async generateUnittestStubForContract(document, contractName) {
    this._checkIsSolidity(document);

    let content;
    if (settings.extensionConfig().test.defaultUnittestTemplate === "hardhat") {
      content = mod_templates.generateHardhatUnittestStubForContract(
        document,
        this.g_parser,
        contractName,
      );
    } else {
      content = mod_templates.generateUnittestStubForContract(
        document,
        this.g_parser,
        contractName,
      );
    }

    vscode.workspace
      .openTextDocument({ content: content, language: "javascript" })
      .then((doc) =>
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
      );
  }

  async surya(documentOrListItems, command, args) {
    //check if input was document or listItem
    if (!documentOrListItems) {
      throw new Error("not a file or list item");
    }

    let ret;
    let files = [];

    if (documentOrListItems.hasOwnProperty("children")) {
      //hack ;)
      documentOrListItems = [documentOrListItems]; //allow non array calls
    }

    if (Array.isArray(documentOrListItems)) {
      for (let documentOrListItem of documentOrListItems) {
        if (documentOrListItem.hasOwnProperty("children")) {
          // is a list item -> item.resource.fsPath
          if (!!path.extname(documentOrListItem.resource.fsPath)) {
            //file
            files = [...files, documentOrListItem.resource.fsPath];
          } else {
            //folder
            await vscode.workspace
              .findFiles(
                `${documentOrListItem.path}/**/*.sol`,
                settings.DEFAULT_FINDFILES_EXCLUDES,
                500,
              )
              .then((uris) => {
                files = files.concat(
                  uris.map(function (uri) {
                    return uri.fsPath;
                  }),
                );
              });
          }
        }
      }
    } else {
      //single document mode
      this._checkIsSolidity(documentOrListItems); // throws

      if (
        settings.extensionConfig().tools.surya.input.contracts == "workspace"
      ) {
        await vscode.workspace
          .findFiles("**/*.sol", settings.DEFAULT_FINDFILES_EXCLUDES, 500)
          .then((uris) => {
            files = uris.map(function (uri) {
              return uri.fsPath;
            });
          });
      } else {
        //better only add imported files. need to resolve that somehow
        files = [
          documentOrListItems.uri.fsPath,
          ...Object.keys(this.g_workspace.sourceUnits),
        ].filter((p) => fs.existsSync(p)); //only feed existing files into surya or it might die 🥲
      }
    }

    switch (command) {
      case "describe":
        ret = surya.describe(files, {}, true);
        vscode.workspace
          .openTextDocument({ content: ret, language: "markdown" })
          .then((doc) =>
            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
          );
        break;
      case "graphSimple":
      case "graph":
        if (command == "graphSimple") {
          ret = surya.graphSimple(args || files, {
            colorScheme: suryaDefaultColorSchemeDark,
          });
        } else {
          ret = surya.graph(args || files, {
            colorScheme: suryaDefaultColorSchemeDark,
          });
        }
        //solidity-va.preview.render.markdown
        vscode.workspace
          .openTextDocument({ content: ret, language: "dot" })
          .then((doc) => {
            if (settings.extensionConfig().preview.dot) {
              vscode.commands
                .executeCommand("graphviz-interactive-preview.preview.beside", {
                  document: doc,
                  content: ret,
                  callback: null,
                  title: `Call Graph`,
                })
                .catch((error) => {
                  vscode.commands
                    .executeCommand("interactive-graphviz.preview.beside", {
                      document: doc,
                      content: ret,
                      callback: null,
                      title: `Call Graph`,
                    }) //TODO: remove this in future version. only for transition to new command
                    .catch((error) => {
                      vscode.commands
                        .executeCommand("graphviz.previewToSide", doc.uri)
                        .catch((error) => {
                          //command not available. fallback open as text and try graphviz.showPreview
                          vscode.window
                            .showTextDocument(doc, vscode.ViewColumn.Beside)
                            .then((editor) => {
                              vscode.commands
                                .executeCommand("graphviz.showPreview", editor) // creates new pane
                                .catch((error) => {
                                  //command not available - do nothing
                                });
                            });
                        });
                    });
                });
            } else {
              vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            }
          });
        /*
                vscode.env.openExternal(vscode.Uri.file("/Users/tintin/workspace/vscode/solidity-auditor/images/icon.png"))
                    .then(doc => vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside))
                    */
        break;
      case "inheritance":
        ret = surya.inheritance(files, { draggable: false });
        vscode.workspace
          .openTextDocument({ content: ret, language: "dot" })
          .then((doc) => {
            if (settings.extensionConfig().preview.dot) {
              vscode.commands
                .executeCommand("graphviz-interactive-preview.preview.beside", {
                  document: doc,
                  content: ret,
                  callback: null,
                  title: `Inheritance`,
                })
                .catch((error) => {
                  vscode.commands
                    .executeCommand("interactive-graphviz.preview.beside", {
                      document: doc,
                      content: ret,
                      callback: null,
                      title: `Inheritance`,
                    }) //TODO: remove this in future version. only for transition to new command
                    .catch((error) => {
                      vscode.commands
                        .executeCommand("graphviz.previewToSide", doc.uri)
                        .catch((error) => {
                          //command not available. fallback open as text and try graphviz.showPreview
                          vscode.window
                            .showTextDocument(doc, vscode.ViewColumn.Beside)
                            .then((editor) => {
                              vscode.commands
                                .executeCommand("graphviz.showPreview", editor) // creates new pane
                                .catch((error) => {
                                  //command not available - do nothing
                                });
                            });
                        });
                    });
                });
            } else {
              vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            }
          });
        /*
                let draggable = surya.inheritance(files,{draggable:true})
                console.error(draggable)
                createWebViewBesides('imgPreview','imgPreview',draggable)
                */
        break;
      case "parse":
        ret = surya.parse(documentOrListItems.uri.fsPath);
        vscode.workspace
          .openTextDocument({ content: ret, language: "markdown" })
          .then((doc) =>
            vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
          );
        break;
      case "dependencies":
        ret = surya.dependencies(files, args[0]);

        let outTxt = [];

        if (ret) {
          outTxt.push(ret[0]);

          if (ret.length < 2) {
            outTxt = ["No Dependencies Found"];
          } else {
            ret.shift();
            const reducer = (accumulator, currentValue) =>
              `${accumulator}\n  ↖ ${currentValue}`;
            outTxt.push(`  ↖ ${ret.reduce(reducer)}`);
          }

          vscode.workspace
            .openTextDocument({
              content: outTxt.join("\n"),
              language: "markdown",
            })
            .then((doc) =>
              vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
            );
        }
        break;
      case "ftrace":
        //  contract::func, all, files
        if (args[1] === null) {
          args[1] = "<Constructor>";
        } else if (args[1] === "") {
          args[1] = "<Fallback>";
        }
        try {
          ret = surya.ftrace(
            args[0] + "::" + args[1],
            args[2] || "all",
            files,
            {},
            true,
          );
          vscode.workspace
            .openTextDocument({ content: ret, language: "markdown" })
            .then((doc) =>
              vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
            );
        } catch (e) {
          console.error(e);
        }

        break;
      case "mdreport":
        ret = surya.mdreport(files, {
          negModifiers:
            settings.extensionConfig().tools.surya.option.negModifiers,
        });
        if (!ret) {
          return;
        }
        vscode.workspace
          .openTextDocument({ content: ret, language: "markdown" })
          .then((doc) => {
            if (settings.extensionConfig().preview.markdown) {
              vscode.commands
                .executeCommand(
                  "markdown-preview-enhanced.openPreview",
                  doc.uri,
                )
                .catch((error) => {
                  //command does not exist
                  vscode.window
                    .showTextDocument(doc, vscode.ViewColumn.Beside)
                    .then((editor) => {
                      vscode.commands
                        .executeCommand("markdown.extension.togglePreview")
                        .catch((error) => {
                          //command does not exist
                        });
                    });
                });
            } else {
              vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
            }
            //command not available. fallback open as text
          });
        break;
      default:
      // code block
    }
  }

  async _findTopLevelContracts(files, scanfiles, workspaceRelativeBaseDirs) {
    var that = this;
    var dependencies = {};
    var contractToFile = {};
    if (!scanfiles) {
      workspaceRelativeBaseDirs = Array.isArray(workspaceRelativeBaseDirs)
        ? workspaceRelativeBaseDirs
        : [workspaceRelativeBaseDirs];

      let searchFileString =
        "{" +
        workspaceRelativeBaseDirs
          .map((d) =>
            d === undefined ? "**/*.sol" : d + path.sep + "**/*.sol",
          )
          .join(",") +
        "}";

      await vscode.workspace
        .findFiles(searchFileString, settings.DEFAULT_FINDFILES_EXCLUDES, 500)
        .then(async (solfiles) => {
          await solfiles.forEach(async (solfile) => {
            try {
              //let content = fs.readFileSync(solfile.fsPath).toString('utf-8');
              //let sourceUnit = that.g_parser.parseSourceUnit(content);

              let sourceUnit = await that.g_workspace.add(solfile.fsPath);

              for (let contractName in sourceUnit.contracts) {
                if (
                  sourceUnit.contracts[contractName]._node.kind == "interface"
                ) {
                  //ignore interface contracts
                  continue;
                }
                dependencies[contractName] =
                  sourceUnit.contracts[contractName].dependencies;
                contractToFile[contractName] = solfile;
              }
            } catch (e) {}
          });
        });
    } else {
      //files not set: take loaded sourceUnits from this.g_workspace
      //files set: only take these sourceUnits
      await this.g_workspace
        .getAllContracts()
        .filter((c) => c._node.kind != "interface" && c._node.kind != "library")
        .forEach((c) => {
          dependencies[c.name] = c.dependencies;
        });
    }

    var depnames = [].concat.apply([], Object.values(dependencies));

    let topLevelContracts = Object.keys(dependencies).filter(function (i) {
      return depnames.indexOf(i) === -1;
    });

    let ret = {};
    topLevelContracts.forEach((contractName) => {
      ret[contractName] = contractToFile[contractName];
    });
    return ret;
  }

  async findTopLevelContracts(files, scanfiles) {
    let topLevelContracts = await this._findTopLevelContracts(files, scanfiles);

    let topLevelContractsText = Object.keys(topLevelContracts).join("\n");
    /*
        for (var name in topLevelContracts) {
            topLevelContractsText += name + ' (' + topLevelContracts[name]+')\n';
        }
        */

    let content = `
Top Level Contracts
===================

${topLevelContractsText}`;
    vscode.workspace
      .openTextDocument({ content: content, language: "markdown" })
      .then((doc) =>
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
      );
  }

  async solidityFlattener(files, callback, showErrors) {
    switch (settings.extensionConfig().flatten.mode) {
      case "truffle":
        vscode.extensions
          .getExtension("tintinweb.vscode-solidity-flattener")
          .activate()
          .then(
            (active) => {
              vscode.commands
                .executeCommand("vscode-solidity-flattener.flatten", {
                  files: files,
                  callback: callback,
                  showErrors: showErrors,
                })
                .catch((error) => {
                  // command not available
                  vscode.window.showWarningMessage(
                    "Error running `tintinweb.vscode-solidity-flattener`. Please make sure the extension is installed.\n" +
                      error,
                  );
                });
            },
            (err) => {
              throw new Error(
                `Solidity Auditor: Failed to activate "tintinweb.vscode-solidity-flattener". Make sure the extension is installed from the marketplace. Details: ${err}`,
              );
            },
          );
        break;
      default:
        this.flattenInternal(files, callback, showErrors);
        break;
    }
  }

  flattenInternal(files, callback, showErrors) {
    files.forEach(async (uri) => {
      let sourceUnit = this.g_workspace.sourceUnits[uri.fsPath]; //get sourceUnit object
      sourceUnit = sourceUnit || (await this.g_workspace.add(uri.fsPath)); //retry & force analysis
      if (!sourceUnit) {
        return;
      }
      try {
        let flat = sourceUnit.flatten();
        if (callback) {
          callback(uri.fsPath, undefined, flat);
        } else {
          vscode.workspace
            .openTextDocument({ content: flat, language: "solidity" })
            .then((doc) =>
              vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
            );
        }
      } catch (e) {
        console.warn(`ERROR - flattening file: ${uri}`);
        console.error(e);
      }
    });
  }

  async flaterra(documentOrUri, noTryInstall) {
    let docUri = documentOrUri;
    if (documentOrUri.hasOwnProperty("uri")) {
      this._checkIsSolidity(documentOrUri);
      docUri = documentOrUri.uri;
    }

    let cmd = "python3";
    let args = [
      "-m",
      "flaterra",
      "--contract",
      vscode.workspace.asRelativePath(docUri),
    ];

    runCommand(cmd, args)
      .then(
        (success) => {
          vscode.window.showInformationMessage(
            `Contract flattened: ${path.basename(
              docUri.fsPath,
              ".sol",
            )}_flat.sol`,
          );
        },
        (err) => {
          if (err.code === "ENOENT") {
            vscode.window.showErrorMessage(
              "'`flaterra` failed with error: unable to execute python3",
            );
          } else if (err.stderr.indexOf(": No module named flaterra") >= 0) {
            if (!noTryInstall) {
              vscode.window
                .showWarningMessage(
                  "Contract Flattener `flaterra` is not installed.\n run `pip3 install flaterra --user` to install? ",
                  "Install",
                )
                .then((selection) => {
                  if (selection == "Install") {
                    runCommand(
                      "pip3",
                      ["install", "flaterra", "--user"],
                      undefined,
                      undefined,
                      "y\n",
                    )
                      .then(
                        (success) => {
                          vscode.window.showInformationMessage(
                            "Successfully installed flaterra.",
                          );
                          this.flaterra(documentOrUri, true);
                        },
                        (error) => {
                          vscode.window.showErrorMessage(
                            "Failed to install flaterra.",
                          );
                        },
                      )
                      .catch((err) => {
                        vscode.window.showErrorMessage(
                          "Failed to install flaterra. " + err,
                        );
                      });
                  } else {
                    // do not retry
                  }
                });
            }
          } else {
            vscode.window
              .showErrorMessage("`flaterra` failed with: " + err)
              .then((selection) => {
                console.log(selection);
              });
          }
        },
      )
      .catch((err) => {
        console.log("runcommand threw exception: " + err);
      });
  }

  async flattenCandidates(candidates) {
    // takes object key=contractName value=fsPath
    let topLevelContracts = candidates || (await this._findTopLevelContracts());
    let content = "";

    this.solidityFlattener(
      Object.values(topLevelContracts),
      (filepath, trufflepath, content) => {
        let outpath = path.parse(filepath);

        fs.writeFile(
          path.join(outpath.dir, "flat_" + outpath.base),
          content,
          function (err) {
            if (err) {
              return console.log(err);
            }
          },
        );
      },
    );

    for (let name in topLevelContracts) {
      //this.flaterra(new vscode.Uri(topLevelContracts[name]))
      let outpath = path.parse(topLevelContracts[name].fsPath);
      let outpath_flat = vscode.Uri.file(
        path.join(outpath.dir, "flat_" + outpath.base),
      );
      content += `${
        !fs.existsSync(outpath_flat.fsPath) ? "[ERR]   " : ""
      }${name}  =>  ${outpath_flat} \n`;
    }
    vscode.workspace
      .openTextDocument({ content: content, language: "markdown" })
      .then((doc) =>
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
      );
  }

  async listFunctionSignatures(document, asJson) {
    this.g_workspace.add(document.fileName).then(async (sourceUnit) => {
      const signatures = await this._signatureForAstItem(
        Object.values(sourceUnit.contracts),
      );
      await this.revealSignatures(signatures, asJson ? "json" : undefined);
    });
  }

  async listFunctionSignaturesForWorkspace(asJson) {
    // 1) find all solidity files
    // 2) parse
    // 3) wait for parser to finish
    // 4) get all function signatures
    // -- this is kinda resource intensive 🤷‍♂️
    await vscode.workspace
      .findFiles("**/*.sol", settings.DEFAULT_FINDFILES_EXCLUDES, 500)
      .then((uris) => {
        uris.forEach((uri) => {
          this.g_workspace.add(uri.fsPath);
        });
      });
    await this.g_workspace.withParserReady(undefined, true);
    console.log("done");
    const signatures = await this._signatureForAstItem(
      this.g_workspace.getAllContracts(),
    );
    await this.revealSignatures(signatures, asJson ? "json" : undefined);
  }

  async signatureForAstItem(items) {
    const signatures = await this._signatureForAstItem(items);
    await this.revealSignatures(signatures);
  }

  async _signatureForAstItem(items) {
    let results = [];

    if (!Array.isArray(items)) {
      items = [items]; //arrayify
    }
    for (let item of items) {
      try {
        results.push(...mod_utils.functionSignatureForASTItem(item));
      } catch (e) {
        console.log(e.message);
      }
    }
    return results;
  }

  async revealSignatures(signatures, format) {
    format = format || "markdown";
    let errs = [];

    const res = {};

    for (const sig of signatures) {
      if (sig.hasOwnProperty("err")) {
        errs.push(sig.err);
        continue; //skip errors
      }
      if (!res.hasOwnProperty(sig.sighash)) {
        res[sig.sighash] = new Set([sig.signature]);
      } else {
        res[sig.sighash].add(sig.signature);
      }
    }

    let content;

    switch (format) {
      case "json":
        content = JSON.stringify(
          {
            signatures: res,
            errors: [...new Set(errs)],
            collisions: Object.values(res).filter((v) => v.size > 1),
          },
          (_key, value) => (value instanceof Set ? [...value] : value),
        );
        break;

      default:
        // markdown

        const header =
          "| Function Name | Sighash    | Function Signature | \n| ------------- | ---------- | ------------------ | \n";
        content =
          header +
          signatures
            .map((r) => `| ${r.name} | ${r.sighash} | ${r.signature} |`)
            .join("\n");

        const collisions = Object.values(res).filter((v) => v.size > 1);
        if (collisions.length) {
          content += "\n\n";
          content +=
            "🔥 Collisions                  \n========================\n";
          content += collisions.map((s) => [...s]).join("\n");
        }

        if (errs.length) {
          content += "\n\n";
          content += "🐞 Errors                 \n========================\n";
          content += [...new Set(errs)].join("\n");
        }
    }

    vscode.workspace
      .openTextDocument({ content: content, language: format })
      .then((doc) =>
        vscode.window.showTextDocument(doc, {
          viewColumn: vscode.ViewColumn.Beside,
          preview: true,
        }),
      );
  }

  async drawioContractsOutlineAsCSV(contractObj) {
    const writer = new DrawIoCsvWriter();
    const content = writer.export(contractObj);

    vscode.workspace
      .openTextDocument({ content: content, language: "csv" })
      .then((doc) =>
        vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside),
      );
  }

  async umlContractsOutline(contractObjects) {
    let writer = new PlantumlWriter();
    const content = writer.export(contractObjects);

    vscode.workspace
      .openTextDocument({ content: content, language: "plantuml" })
      .then((doc) =>
        vscode.window
          .showTextDocument(doc, vscode.ViewColumn.Beside)
          .then((editor) => {
            vscode.extensions
              .getExtension("jebbs.plantuml")
              .activate()
              .then(
                (active) => {
                  vscode.commands
                    .executeCommand("plantuml.preview")
                    .catch((error) => {
                      //command does not exist
                    });
                },
                (err) => {
                  console.warn(
                    `Solidity Auditor: Failed to activate "jebbs.plantuml". Make sure the extension is installed from the marketplace. Details: ${err}`,
                  );
                },
              );
          }),
      );
  }
}

module.exports = {
  Commands: Commands,
};
