'use strict';
/**
 * @author github.com/tintinweb
 * @license GPLv3
 *
 *
 * */

const commentRegex = () =>
  new RegExp(
    `(?:${commentRegex.line().source})|(?:${commentRegex.block().source})`,
    'gm'
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
    if (typeof this.input !== 'undefined' && this.input !== null) {
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

const createKeccakHash = require('keccak');

// https://github.com/ethereum/eth-abi/blob/b02fc85b01a9674add88483b0d6144029c09e0a0/eth_abi/grammar.py#L402-L408
const TYPE_ALIASES = {
  int: 'int256',
  uint: 'uint256',
  fixed: 'fixed128x18',
  ufixed: 'ufixed128x18',
  function: 'bytes24',
};
const evmTypeRegex = new RegExp(
  `(?<type>(${Object.keys(TYPE_ALIASES).join('|')}))(?<tail>(\\[[^\\]]*\\])?)$`,
  'g'
);

function canonicalizeEvmType(evmArg) {
  function replacer(...groups) {
    const foundings = groups.pop();
    return `${TYPE_ALIASES[foundings.type]}${foundings.tail}`;
  }
  return evmArg.replace(evmTypeRegex, replacer);
}

function getCanonicalizedArgumentFromAstNode(
  node,
  _parent,
  array = false,
  isStruct = false
) {
  if (!array && !node.typeName) {
    console.log(node);
    throw new Error('Failed to unpack function argument type');
  }
  const argStorageLocation = node.storageLocation;
  const argTypeNode = !array ? node.typeName : node;
  switch (argTypeNode.type) {
    case 'ElementaryTypeName':
      return argTypeNode.name;
    case 'ArrayTypeName':
      const repr =
        getCanonicalizedArgumentFromAstNode(
          argTypeNode.baseTypeName,
          _parent,
          true
        ) + '[]';
      return repr;
    case 'UserDefinedTypeName':
      if (!argStorageLocation && !isStruct) {
        return 'address';
      }
      const contract = _parent.parent;
      const sourceUnit = contract._parent;
      const struct =
        contract.structs[argTypeNode.namePath] ||
        contract.inherited_structs[argTypeNode.namePath] ||
        sourceUnit.structs[argTypeNode.namePath];
      if (!struct) {
        throw new Error(
          `Failed to resolve struct ${node.namePath} in current scope.`
        );
      }
      const structTypes = struct.members.map((m) =>
        getCanonicalizedArgumentFromAstNode(m, _parent, false, true)
      );
      const structSig = '(' + structTypes.join(',') + ')';
      return structSig;
    default:
      console.log(argTypeNode);
      throw new Error('wrong argument type: ' + argTypeNode.name);
  }
}

function signatureFromFunctionASTNode(item) {
  let funcname = item._node.name;

  let argsItem =
    item._node.parameters.type === 'ParameterList'
      ? item._node.parameters.parameters
      : item._node.parameters;
  let args = argsItem.map((o) =>
    canonicalizeEvmType(getCanonicalizedArgumentFromAstNode(o, item))
  );

  let fnsig = `${funcname}(${args.join(',')})`;
  let sighash = createKeccakHash('keccak256')
    .update(fnsig)
    .digest('hex')
    .toString('hex')
    .slice(0, 8);

  return {
    name: funcname,
    signature: fnsig,
    sighash: sighash,
  };
}

function functionSignatureForASTItem(item) {
  switch (item._node?.type) {
    case 'FunctionDefinition':
      const res = signatureFromFunctionASTNode(item);
      return [res];
    case 'ContractDefinition':
      return Object.values(item.functions)
        .filter((fn) => ['external', 'public'].includes(fn.visibility))
        .map((fn) => signatureFromFunctionASTNode(fn));
    default:
      throw new Error('Unsupported node type');
  }
}

module.exports = {
  CommentMapperRex: CommentMapperRex,
  functionSignatureForASTItem: functionSignatureForASTItem,
};
