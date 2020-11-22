const fs = require("fs");
const parser = require("fast-xml-parser");
//const he = require('he');
const util = require("util");
const xmlData = fs.readFileSync("dev/UserRequestResetPassword.bpmn").toString();

const options = {
    attributeNamePrefix : "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName : "#text",
    ignoreAttributes : false,
    ignoreNameSpace : false,
    allowBooleanAttributes : true,
    parseNodeValue : true,
    parseAttributeValue : true,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: "strict", // false, //"strict"
//    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
//    tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
    stopNodes: ["bpmndi:BPMNDiagram"]
};

const jsonObj = parser.parse(xmlData, options);

console.log(util.inspect(jsonObj, {showHidden: false, depth: null}));

