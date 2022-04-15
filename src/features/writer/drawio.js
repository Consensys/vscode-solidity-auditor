'use strict';
/** 
 * @author github.com/tintinweb
 * @license GPLv3
 * 
 * 
 * */


const settings = require('../../settings');

const HEADER = `######################
## draw.io compatible CSV.
##    to import, visit draw.io and goto: Arrange -> Insert -> Advanced -> CSV ... 
##
##
## GENERATOR: https://marketplace.visualstudio.com/items?itemName=tintinweb.solidity-visual-auditor
######################
# label: %label%
# parentstyle: swimlane;html=1;fontStyle=0;childLayout=stackLayout;horizontal=1;startSize=26;fillColor=%fill%;horizontalStack=0;resizeParent=1;resizeLast=0;collapsible=1;marginBottom=0;swimlaneFillColor=#ffffff;align=center;rounded=1;shadow=0;comic=0;labelBackgroundColor=none;strokeColor=#000000;strokeWidth=1;fontFamily=Verdana;fontSize=12;fontColor=#000000;arcSize=20;
# style: shape=%type%;html=1;fillColor=%fill%;spacingLeft=4;spacingRight=4;whiteSpace=wrap;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;fontFamily=Courier New;fontSize=10;align=left;%override%
# namespace: sva-%%uniquekey%%
# width: auto
# height: auto
# ignore: id,shape,fill,stroke,refs
# identity: id
# parent: rparent
## padding: 40
## nodespacing: 40
## levelspacing: 40
## edgespacing: 40
## layout: horizontalflow
# connect: {"from": "refs", "to": "id", "style": "curved=1;fontSize=11;noEdgeStyle=1;strokeColor=#6666FF;dashed=1;dashPattern=1 4;"}
# connect: {"from": "calls", "to": "id", "style": "curved=1;fontSize=11;noEdgeStyle=1;strokeColor=#6666FF;dashed=0;dashPattern=1 4;"}
## CSV data starts below this line
## id,rparent,label, type, fill, override, refs
`;

const columns = ["id", "rparent", "label", "type", "fill", "override", "refs"];

const methodFilterOnlyPublic = ["public", "external", "default"];

const stateMutabilityToIcon = {
    view: "🔍 ",
    pure: "🔍 ",
    constant: "🔍 ",
    payable: "💰 "
};

const contractNameColorMapping = {
    "contract": "#e0e0e0", //strokeColor=#000000
    "interface": "#e0e0e0",
    "library": "#d5e8d4" //strokeColor=#82b366
};

function _mapAstFunctionName(name) {
    switch (name) {
        case null:
            return "<b>__constr__<b>";
        case "":
            return "<b>__fallback__<b>";
        default:
            return name;
    }
}

function serializeCsv(o) {
    let ret = [];
    for (const k of columns) {
        ret.push(o[k] || "");
    }
    return ret.join(',');
}

class DrawioContract {

    constructor(contractObj, id) {
        this.id = id;
        this.name = contractObj.name;
        this.kind = contractObj._node.kind;
        this.inherits = contractObj.dependencies; //usingFor?
        this.usingFor = Object.values(contractObj.usingFor);
        this.methods = contractObj.functions
            .filter(funcObj => methodFilterOnlyPublic.includes(funcObj._node.visibility));
        this.actors = this._getActors(contractObj);

    }

    _getActors(contractObj) {
        if (!settings.extensionConfig().uml.actors.enable) {
            return [];
        }
        let actors = [];
        //update actors

        actors = actors.concat(Object.values(contractObj.stateVars).filter(astNode => !astNode.isDeclaredConst && astNode.typeName.name == "address").map(astNode => astNode.name));
        for (let functionObj of contractObj.functions) {
            actors = actors.concat(Object.values(functionObj.arguments).filter(astNode => astNode.typeName.name == "address").map(astNode => astNode.name));
        }

        actors = [...new Set(actors)]
            .filter(item => {
                if (item === null) {
                    return false;
                }  // no nulls
                if (item.startsWith("_") && actors.indexOf(item.slice(1))) {
                    return false;
                }  // no _<name> dupes
                return true;
            });
        return actors;

    }

    toString() {
        if (this.methods.length == 0) {
            return ""; //no methods, nothing to do.
        }
        let content = [];
        // add contract
        content.push(serializeCsv({
            "id": `${this.id}`,
            "rparent": "-",
            "label": this.name,
            "type": "",
            "fill": `${contractNameColorMapping[this.kind]}`,
            "override": "",
            "refs": "",
        }));
        // add inheritance / usingFor
        this.inherits.forEach((contract, i) => content.push(serializeCsv({
            "id": `${this.id}_i${i}`,
            "rparent": `${this.id}`,
            "label": contract,
            "type": "mxgraph.bootstrap.rrect;strokeColor=none",
            "fill": "#fff2cc;strokeColor=#d6b656;dashed=1",
            "override": "fontSize=6",
            "refs": "",
        })
        ), this);
        this.usingFor.forEach((astNode, i) => content.push(serializeCsv({
            "id": `${this.id}_u${i}`,
            "rparent": `${this.id}`,
            "label": astNode.libraryName,
            "type": "mxgraph.bootstrap.rrect",
            "fill": "#E3F7E2;strokeColor=#82b366;dashed=1",
            "override": "fontSize=6",
            "refs": "",
        })
        ), this);
        // add methods: 2,test,1, 
        this.methods.forEach((funcObj, i) => {
            let method = `${stateMutabilityToIcon[funcObj._node.stateMutability] || ""}${_mapAstFunctionName(funcObj._node.name)}`;
            content.push(serializeCsv({
                "id": `${this.id}_f${i}`,
                "rparent": `${this.id}`,
                "label": method,
                "type": "text;strokeColor=none",
                "fill": "none",
                "override": "",
                "refs": "",
            })); //push method name
            /*
            html=1;shadow=0;dashed=1;shape=mxgraph.bootstrap.rrect;;
            */
            Object.keys(funcObj.modifiers).forEach((mod, j) => content.push(serializeCsv({
                "id": `${this.id}_mod${i}_${j}`,
                "rparent": "-",
                "label": mod,
                "type": "mxgraph.bootstrap.rrect",
                "fill": "#fff2cc",
                "override": "strokeColor=#d79b00;dashed=1;align=center;rSize=10;fontStyle=0;whiteSpace=wrap;dashPattern=1 1;strokeColor=#d6b656;fontSize=8;fontFamily=Helvetica",
                "refs": `"${this.id}_f${i}"`,
            })));

        }, this);
        this.actors.forEach((actor, i) => content.push(serializeCsv({
            "id": `${this.id}_a${i}`,
            "rparent": "-",
            "label": actor,
            "type": "umlActor;strokeColor=#000000",
            "fill": "none",
            "override": "verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;align=left",
            "refs": `"${this.id}"`,
        })), this);
        return content.join(`\n`);
    }
}

class DrawIoCsvWriter {

    constructor() {
        this.id = 1; //count ids
    }

    export(contractObjects) {
        let contracts = contractObjects
            .filter(contractObject => contractObject._node.kind != "interface") //ignore interfaces
            .map((contractObject, i) => new DrawioContract(contractObject, i).toString());
        return HEADER.replace("%%uniquekey%%", Date.now()) + columns.join(`,`) + `\n` + contracts.join(`\n`);
    }
}

module.exports = {
    DrawIoCsvWriter: DrawIoCsvWriter
};
