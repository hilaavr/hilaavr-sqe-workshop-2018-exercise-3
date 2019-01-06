import $ from 'jquery';
//import * as Viz from 'viz.js';
//import * as esgraph from 'esgraph';
import * as flowchart from 'flowchart.js';
import {graphCode, linksData} from './code-analyzer';

$(document).ready(function () {
    $('#codeSubmissionButton').click(() => {
        let codeToParse = $('#codePlaceholder').val();
        let args_list = $('#argsTextArea').val();
        //let parsedCode = symbolicSubstitution(codeToParse, args_list);
        // $('#parsedCode').html(printColorCode(parsedCode,index_if_line,eval_lines));
        // let diagram = flowchart.parse(createGraphString(graphString));
        // $('#parsedCode').html(diagram.drawSVG('diagram'));
        //$('#parsedCode').html(printColorCode(parsedCode,index_if_line,eval_lines));
        let nodesArray =graphCode(codeToParse, args_list);
        let graphString = createGraphString(nodesArray);
        let diagram = flowchart.parse(graphString);
        diagram.drawSVG('parsedCode', get_settings());
    });
});


let graphSt = '';

function createGraphString(nodesArray){

    graphSt +='st=>start: Start\n';
    graphSt+=convertNodes(nodesArray);
    graphSt += 'e=>end: End\n\n';
    graphSt+=convertLinks(nodesArray);
    //console.log(graphSt);

    return graphSt;
}


function convertNodes(nodesArray){
    nodesArray = mergeVarDeclarationNodes(nodesArray);
    nodesArray = createDummyNode(nodesArray);
    let nodesString='';
    var idx;
    var tempStr;

    for (var i=0; i<nodesArray.length;i++) {
        if ((nodesArray[i]).type != 'Ignore') {
            idx = (nodesArray[i]).index;
            if (idx !=1000)
                (nodesArray[i]).string = '#' + idx + '\n' + (nodesArray[i]).string;
            tempStr = 'node' + idx + '=>' + getType(nodesArray, i) + ': ' + (nodesArray[i]).string;
            if (checkNeedRejected(nodesArray, i))
                tempStr += '|rejected';
            nodesString += tempStr + '\n';
        }
    }
    return nodesString;
}

function checkNeedRejected(nodesArray, i) {
    var type, value;
    if (i < 1)
        return;

    type = (nodesArray[i - 1]).type;
    value = (nodesArray[i - 1]).val;
    if (type == 'ifStatement')// && value == false) return true;
        return !value;
    if (type == 'WhileStatement') // && value == false) return true;
        return !value;

    return checkNeedRejectedForElseIf(nodesArray, i); //if (i >= 2)
}

function checkNeedRejectedForElseIf(nodesArray, i) {
    var type, value;
    if (i < 2)
        return;
    type = (nodesArray[i-2]).type;
    value = (nodesArray[i-2]).val;
    if (type == 'ifStatement')// && value == true) return true;
        return value;

}


function getType(nodesArray, i){
    if (nodesArray[i].type==='ifStatement')
        return 'condition';
    if (nodesArray[i].type==='WhileStatement')
        return 'condition';
    return 'operation';
}


function createDummyNode(nodesArray){
    let lastRetNodeIdx = getLastRetIndex(nodesArray);
    let endedNodes = [];
    for (var i=1; i<nodesArray.length;i++) {
        let idx = (nodesArray[i]).index;
        if ( (idx!=lastRetNodeIdx) && (isEndedNode(idx)) )
            endedNodes.push(idx);
    }
    //console.log(endedNodes);
    conectEndedNodes(nodesArray, endedNodes, lastRetNodeIdx);
    return nodesArray;
}


function conectEndedNodes(nodesArray, endedNodes, lastRetNodeIdx){
    if (endedNodes.length>0) {
        nodesArray.push({index:1000, type:'Dummy', string:'o', val:''});
        for (var j=0; j<endedNodes.length;j++) {
            linksData.push({index: 1000, parentIndx: endedNodes[j], connType: 'simple'});
        }
        updateLinkTargetRetToDummy(lastRetNodeIdx);
        linksData.push({index: lastRetNodeIdx, parentIndx: 1000, connType: 'simple'});
    }
}

function mergeVarDeclarationNodes(nodesArray){
    let varDecString='';
    let i= 0;
    for (i=0; i<nodesArray.length;i++) {
        if ((nodesArray[i]).type == 'VarDeclaration') {
            varDecString += (nodesArray[i]).string + '\n';
            (nodesArray[i]).type = 'Ignore';
            (linksData[i]).connType = 'Ignore';
        }
        else
            break;
    }
    (nodesArray[i-1]).type = 'VarDeclaration';
    (nodesArray[i-1]).string = varDecString;
    (linksData[i-1]).connType = 'simple';

    (linksData[i]).parentIndx = 1;
    return nodesArray;
}


function getLastRetIndex(nodesArray){
    for (var i=nodesArray.length-1; i>=0;i--) {
        if ((nodesArray[i]).type=='RetStatement')
            return ((nodesArray[i]).index);
    }
    //console.log('getLastRetIdx before return -1');
    return -1;
}

function getNodeId(nodesArray, nodeIdx){
    for (var i=0; i<nodesArray.length; i++) {
        if ((nodesArray[i]).index==nodeIdx)
            return i;
    }
    //console.log('getNodeId before return -1');
    return -1;
}


function updateLinkTargetRetToDummy(lastRetNodeIdx){
    for (var i=0; i<linksData.length; i++) {
        if ( (linksData[i]).parentIndx!=1000 && (linksData[i]).index == lastRetNodeIdx ){
            (linksData[i]).index = 1000;
        }
    }
}


function isEndedNode(idx){
    for (var i=0; i<linksData.length; i++) {
        if ((linksData[i]).parentIndx == idx)
            return false;
    }
    return true;
}


function convertLinks(nodesArray){//graphSt +='st=>start: Start\n';
    let linksString='';
    for (var i=0; i<linksData.length;i++) {
        if ((linksData[i]).connType != 'Ignore')
            linksString += getleftNodeStr(i, nodesArray) + '->' + getRightNodeStr(i) + '\n';
    }
    return linksString;
}

function getleftNodeStr(i, nodesArray){
    let tempStr = '';
    if ((linksData[i]).parentIndx==0)
        return 'st';
    tempStr = getleftNodeStrByConnType(i, nodesArray);
    if (tempStr !='')
        return tempStr;
    return 'node'+(linksData[i]).parentIndx+'(' + (linksData[i]).connType+ ')';

}

function getleftNodeStrByConnType(i, nodesArray){
    if ((linksData[i]).connType=='simple')
        return 'node'+(linksData[i]).parentIndx;
    if ((linksData[i]).connType=='loopWhile')
        return 'node'+(linksData[i]).parentIndx + '(right)';
    if ((linksData[i]).connType=='whileYes')
        return 'node'+(linksData[i]).parentIndx+'(yes, right)';
    if ((linksData[i]).connType=='whileNo')
        return 'node'+(linksData[i]).parentIndx+'(no)';
    return getleftNodeStrForYesNo(i, nodesArray);

}

function getleftNodeStrForYesNo(i, nodesArray){
    var j;
    if ((linksData[i]).connType=='yes') {
        j=getNodeId(nodesArray, (linksData[i]).parentIndx);
        //console.log('node j: ' +j + ' index: '+(linksData[i]).parentIndx)
        if ((nodesArray[j]).val==true)
            return 'node'+(linksData[i]).parentIndx+'(yes, bottom)';
        else return 'node'+(linksData[i]).parentIndx+'(yes)';
    }
    if ((linksData[i]).connType=='no') {
        j=getNodeId(nodesArray, (linksData[i]).parentIndx);
        //console.log('node j: ' +j + ' index: '+(linksData[i]).parentIndx);
        if ((nodesArray[j]).val==false)
            return 'node'+(linksData[i]).parentIndx+'(no, bottom)';
        else return 'node'+(linksData[i]).parentIndx+'(no)';
    }
    return '';
}



function getRightNodeStr(i){
    if ((linksData[i]).index==-1)
        return 'e';
    return 'node'+(linksData[i]).index;
}


const get_settings=()=>({
    'x': 20,
    'y': 0,
    'line-width': 3,
    'line-length': 50,
    'text-margin': 10,
    'font-size': 14,
    'font-color': 'black',
    'line-color': 'black',
    'element-color': 'black',
    'fill': 'white',
    'yes-text': 'True',
    'no-text': 'False',
    'flowstate' : {
        'future' : { 'fill' : '#99ff99'},
        'approved' : { 'fill' : '#58C4A3', 'font-size' : 12, 'yes-text' : 'APPROVED', 'no-text' : 'n/a' },
        'rejected' : { 'fill' : 'white', 'font-size' : 12, 'yes-text' : 'n/a', 'no-text' : 'REJECTED' }
    }
});


/*
function printColorCode(parsedCode,index_if_line,eval_lines){
 let output_arrayLines = parsedCode.split('\n');
 let output_index = 0;
 let output = '';
 for(var i = 0;i<output_arrayLines.length;i++){
     if(index_if_line.indexOf(i)<0) {//no color needed
         output += output_arrayLines[i] + '</br\n>';
     }
     else{
         if(!eval_lines[output_index]){
             output += '<p>' + '<redMark>' + output_arrayLines[i] + '</redMark>' + '</p>';
         }
         if(eval_lines[output_index]){
             output += '<p>' + '<greenMark>' + output_arrayLines[i] + '</greenMark>' + '</p>';
         }
         output_index++;
     }
 }
 return output;
}


let tempText = 'st=>start: Start:>http://www.google.com[blank]\n' +
 'e=>end:>http://www.google.com\n' +
 'op1=>operation: My Operation\n' +
 'sub1=>subroutine: My Subroutine\n' +
 'cond=>condition: Yes\n' +
 'or No?:>http://www.google.com\n' +
 'io=>inputoutput: catch something...\n' +
 'para=>parallel: parallel tasks\n' +
 '\n' +
 'st->op1->cond\n' +
 'cond(yes)->io->e\n' +
 'cond(no)->para\n' +
 'para(path1, bottom)->sub1(right)->op1\n' +
 'para(path2, top)->op1';

*/