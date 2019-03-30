'use strict';

const commentRegex = () => new RegExp(`(?:${commentRegex.line().source})|(?:${commentRegex.block().source})`, 'gm');
commentRegex.line = () => /(?:^|\s)\/\/(.+?)$/gm;
commentRegex.block = () => /\/\*([\S\s]*?)\*\//gm;

class CommentMapperRex{

    constructor(input){
        this.commentIdxs = []
        this.input = input
        this.regex = commentRegex()
    }

    isRangeOffsetInComment(start, end){
        if(typeof this.input!=="undefined" && this.input!==null){
            this.getComments(this.input)
            this.input = null  //free space
        }
        for (var i = 0; i < this.commentIdxs.length; i++) {
            let item = this.commentIdxs[i]
            
            if(start>=item[0] && end<=item[1]){
                return true
            }
        }
        return false
    }

    getComments(input){
        var match
        do {
            match=this.regex.exec(input)
            if(match){
                this.commentIdxs.push([match.index, match.index+match[0].length])
            }
            
        } while(match)
    }

}

module.exports = {
    CommentMapperRex : CommentMapperRex
}