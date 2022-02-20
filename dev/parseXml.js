const fs = require("fs");
const { XMLParser } = require("fast-xml-parser");
//const he = require('he');
const util = require("util");
const path = require("path");
const xmlData = fs.readFileSync(path.join(__dirname, '../assets') + "/UserRequestResetPassword.bpmn").toString();

const options = {
    attributeNamePrefix : "_",
    removeNSPrefix: true,
    // textNodeName : "#text",         // ? not in latest version
    ignoreAttributes : false,
    ignoreNameSpace : false,
    allowBooleanAttributes : true,
    parseNodeValue : true,
    parseAttributeValue : true,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPropName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    // arrayMode: "strict", // false, //"strict"   // ? not in latest version
//    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),//default is a=>a
//    tagValueProcessor : (val, tagName) => he.decode(val), //default is a=>a
    // stopNodes: ["*.bpmndi:BPMNDiagram"]
};
const Parser = new XMLParser(options);

const jsonObj = Parser.parse(xmlData, options);

console.log(util.inspect(jsonObj, {showHidden: false, depth: null}));

