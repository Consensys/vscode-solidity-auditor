'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
 * 
 * */

const commentRegex = () => new RegExp(`(?:${commentRegex.line().source})|(?:${commentRegex.block().source})`, 'gm');
commentRegex.line = () => /(?:^|\s)\/\/(.+?)$/gm;
commentRegex.block = () => /\/\*([\S\s]*?)\*\//gm;

class CommentMapperRex{

    constructor(input) {
        this.commentIdxs = [];
        this.input = input;
        this.regex = commentRegex();
    }

    isRangeOffsetInComment(start, end) {
        if(typeof this.input!=="undefined" && this.input!==null){
            this.getComments(this.input);
            this.input = null;  //free space
        }
        for (var i = 0; i < this.commentIdxs.length; i += 1) {
            let item = this.commentIdxs[i];
            
            if(start>=item[0] && end<=item[1]){
                return true;
            }
        }
        return false;
    }

    getComments(input) {
        var match;
        do {
            match=this.regex.exec(input);
            if(match){
                this.commentIdxs.push([match.index, match.index+match[0].length]);
            }
            
        } while(match);
    }

}



const createKeccakHash = require('keccak');

// https://github.com/ethereum/eth-abi/blob/b02fc85b01a9674add88483b0d6144029c09e0a0/eth_abi/grammar.py#L402-L408
const TYPE_ALIASES = {
    'int': 'int256',
    'uint': 'uint256',
    'fixed': 'fixed128x18',
    'ufixed': 'ufixed128x18',
    'function': 'bytes24',
};
const evmTypeRegex = new RegExp(`(?<type>(${Object.keys(TYPE_ALIASES).join('|')}))(?<tail>(\\[[^\\]]*\\])?)$`, 'g');

function canonicalizeEvmType(evmArg) {
    function replacer(...groups) {
        const foundings = groups.pop();
        return `${TYPE_ALIASES[foundings.type]}${foundings.tail}`;
    }
    return evmArg.replace(evmTypeRegex, replacer);
}

function functionSignatureExtractor(content) {
    const funcSigRegex = /function\s+(?<name>[^\(\s]+)\s?\((?<args>[^\)]*)\)/g;
    let match;
    let sighashes = {};
    let collisions = [];
    // cleanup newlines, cleanup comment blocks
    while (match = funcSigRegex.exec(content)) {
        let args = match.groups.args.replace(commentRegex(), "").split(",").map(item => canonicalizeEvmType(item.trim().split(" ")[0]));
        let fnsig = `${match.groups.name.trim()}(${args.join(',')})`;
        let sighash = createKeccakHash('keccak256').update(fnsig).digest('hex').toString('hex').slice(0, 8);

        if(sighash in sighashes && sighashes[sighash]!==fnsig){
            collisions.push(sighash);
        }
        sighashes[sighash] = fnsig;
    }
    return {sighashes:sighashes, collisions:collisions};
}

function getCanonicalizedArgumentFromAstNode(node){
    let arraySuffix = '';
    if (typeof node.typeName != "undefined"){
        if (node.typeName.type=="ArrayTypeName") { 
            //is array
            node = node.typeName.baseTypeName ;
            arraySuffix = "[]";
        } else {
            node = node.typeName;
        }
    }
    
    if(node.type=="ElementaryTypeName"){
        return node.name + arraySuffix;
    } else if (node.type=="UserDefinedTypeName"){
        // TODO: assumes address which is not correct. this might as well unwind to an elementary type but that needs more effort to resolve.
        return "address" + arraySuffix; //assume address instead of resolving node.namePath 
    } else {
        return null;
    }
} 

function functionSignatureFromAstNode(item){

    let funcname = item._node.name;

    let argsItem = item._node.parameters.type === "ParameterList" ? item._node.parameters.parameters : item._node.parameters;
    let args = argsItem.map(o => canonicalizeEvmType(getCanonicalizedArgumentFromAstNode(o)));

    let fnsig = `${funcname}(${args.join(',')})`;
    let sighash = createKeccakHash('keccak256').update(fnsig).digest('hex').toString('hex').slice(0, 8);

    let result = {};
    result[sighash] = fnsig;
    return result;
}

module.exports = {
    CommentMapperRex : CommentMapperRex,
    functionSignatureExtractor : functionSignatureExtractor,
    functionSignatureFromAstNode : functionSignatureFromAstNode
};