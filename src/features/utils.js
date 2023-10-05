"use strict";
/**
 * @author github.com/tintinweb
 * @license GPLv3
 *
 *
 * */

const commentRegex = () =>
  new RegExp(
    `(?:${commentRegex.line().source})|(?:${commentRegex.block().source})`,
    "gm",
  );
commentRegex.line = () => /(?:^|\s)\/\/(.+?)$/gm;
commentRegex.block = () => /\/\*([\S\s]*?)\*\//gm;

class CommentMapperRex {
  constructor(input) {
    this.commentIdxs = [];
    this.input = input;
    this.regex = commentRegex();
  }

  isRangeOffsetInComment(start, end) {
    if (typeof this.input !== "undefined" && this.input !== null) {
      this.getComments(this.input);
      this.input = null; //free space
    }
    for (var i = 0; i < this.commentIdxs.length; i += 1) {
      let item = this.commentIdxs[i];

      if (start >= item[0] && end <= item[1]) {
        return true;
      }
    }
    return false;
  }

  getComments(input) {
    var match;
    do {
      match = this.regex.exec(input);
      if (match) {
        this.commentIdxs.push([match.index, match.index + match[0].length]);
      }
    } while (match);
  }
}

function functionSignatureForASTItem(item) {
  switch (item._node?.type) {
    case "FunctionDefinition":
      const res = item.getFunctionSignature(); //call getFunctionSignature from Workspace on function node
      return [res];
    case "ContractDefinition":
      return Object.values(item.functions)
        .filter(
          (fn) => fn.name && ["external", "public"].includes(fn.visibility),
        )
        .map((fn) => fn.getFunctionSignature());
    default:
      throw new Error("Unsupported node type");
  }
}

module.exports = {
  CommentMapperRex: CommentMapperRex,
  functionSignatureForASTItem: functionSignatureForASTItem,
};
