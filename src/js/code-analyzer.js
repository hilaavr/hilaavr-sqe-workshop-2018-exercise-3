import * as esprima from 'esprima';
import * as escodegen from 'escodegen';
//const esgraph = require('esgraph');



export {symbolicSubstitution, index_if_line, eval_lines, graphCode, linksData};

// --- global variables ---//
let listOfRows = [];
var Map = require('es6-map');
var rootMap = new Map();
var globalMap = new Map();
var scope = {rMap: rootMap, gMap: globalMap};
var pcJson;
let arguments_list=[];
let vars_to_present = [];
let eval_lines =[];
let index_if_line = [];
let nodesData = [];
let linksData = [];
let NodeIdx=1;

// --- main function --- //
const graphCode = (codeToParse, args_list) => {
    //nodesData = [];
    symbolicSubstitution(codeToParse, args_list);//TODO
    return nodesData;
};


const symbolicSubstitution = (codeToParse, args_list) => {
    nodesData = [];
    handle_args_list(args_list);
    symbolicSubstitute(codeToParse);
    let output = escodegen.generate(pcJson);
    getIndexLineOfIfStatement(output);
    //console.log(output);
    // graphCode(output);//TODO
    return output;
};


//The function prepares a list in which each object matches a table row
const symbolicSubstitute = (codeToParse) => {
    listOfRows = []; //init the list of objects
    let relevantOutput = [];
    pcJson = esprima.parseScript(codeToParse,{loc:true});
    let parentNodeIdx = 0;
    //let connectionType = 'simple';
    for (var i = 0; i<pcJson.body.length; i++) {
        pcJson.body[i] = parseByType(pcJson.body[i], scope, parentNodeIdx, 'simple');
        relevantOutput.push(pcJson.body[i]);
    }
    pcJson.body = relevantOutput;
    return listOfRows;
};



// --- main parsing by type --- //
function handle_args_list(args_list){
    arguments_list = args_list.split(', ');
}

function parseByType(pcJson,scope,parentNodeIdx, connectionType) {
    return parseHandler[pcJson.type](pcJson, scope, parentNodeIdx, connectionType);
}

const parseHandler=
    {   'FunctionDeclaration': handleFuncDeclaration,
        'BlockStatement': handleBlockStatement,
        'VariableDeclaration': handleVarDeclaration,
        'AssignmentExpression': handleAssignmentExp,
        'WhileStatement': handleWhileStatement,
        'ExpressionStatement': handleExpStatement,
        'IfStatement': handleIfStatement,
        'ReturnStatement': handleRetStatement,
        'ForStatement': handleForStatement,
        'UpdateExpression': handleUpdateExp
    };



// --- handle functions --- //

function handleFuncDeclaration(pcJson, scope, parentNodeIdx, connectionType){
    vars_to_present = [];
    for (var i = 0; i < pcJson.params.length; i++) {
        scope.gMap.set(pcJson.params[i].name, arguments_list[i]);
        vars_to_present.push(escodegen.generate(pcJson.params[i]));
    }
    pcJson.body = parseByType(pcJson.body, scope, parentNodeIdx, connectionType);
    return pcJson;
}

function handleVarDeclaration(pcJson, scope, parentNodeIdx, connectionType) {// Let Statement
    var st;
    for (var i = 0; i < pcJson.declarations.length; i++) {
        let name = pcJson.declarations[i].id.name;
        let value = calculateExpression(pcJson.declarations[i].init, scope, false);
        let subtitValue = calculateExpression(pcJson.declarations[i].init, scope, true);
        scope.rMap.set(name, subtitValue);
        st = name; //TODO
        if ((pcJson.declarations[i].init)!=null)
            st +=' = '+ value;
    }
    //console.log(st);
    nodesData.push({index:NodeIdx, type:'VarDeclaration', string:st, val:''});//check index++
    linksData.push({index:NodeIdx, parentIndx: parentNodeIdx, connType: connectionType});
    return pcJson;
}

function handleAssignmentExp(pcJson, scope, parentNodeIdx, connectionType) {
    var st;
    let name = pcJson.left.name;
    let value = calculateExpression(pcJson.right, scope, false);
    let subtitValue = calculateExpression(pcJson.right, scope, true);
    scope.rMap.set(name, value);subtitValue;
    pcJson.right = (esprima.parse(value)).body[0].expression;
    st = name + ' = ' + value;
    if (canMergeExp()) {
        (nodesData[nodesData.length - 1]).string += st +'\n';
        (nodesData[nodesData.length - 1]).val--;
    } else {
        nodesData.push({index: ++NodeIdx, type: 'AssignmentExp', string: st, val: '', body: ''});
        if (connectionType != 'yesWhile') // no need for link to ends
            linksData.push({index: NodeIdx, parentIndx: parentNodeIdx, connType: connectionType});
    }
    return pcJson;
}

function handleBlockStatement(pcJson, scope, parentNodeIdx, connectionType){//todo count varDec

    var count = countExpressionBlock(pcJson);
    if (count>1) {
        nodesData.push({index: ++NodeIdx, type: 'ExpBlockStatement', string: '', val:count, body: 'block'});
    }

    for (var i = 0; i < pcJson.body.length; i++) {
        pcJson.body[i] = parseByType(pcJson.body[i], scope, parentNodeIdx, connectionType);
    }
    return pcJson;

}

function countExpressionBlock(pcJson){

    var count = 0;
    for (var i = 0; i < pcJson.body.length; i++) {
        if ( (pcJson.body[i]).type == 'ExpressionStatement')
            count++;
    }
    if (count==pcJson.body.length)
        return count;
    else return 0;

}

// eslint-disable-next-line no-unused-vars
function handleWhileStatement(pcJson, scope, parentNodeIdx, connectionType){
    let bodyData = [];
    let actualEval = false;
    let clonedScope = cloneScope(scope);
    let condition = calculateExpression(pcJson.test, clonedScope, false);
    let subtituteCondition = calculateExpression(pcJson.test, clonedScope, true);
    if (evaluateExpression(subtituteCondition, clonedScope))
        actualEval = true;
    pcJson.test = (esprima.parse(condition)).body[0].expression;
    var st = escodegen.generate(pcJson.test);
    nodesData.push({index: ++NodeIdx, type:'While', string:'Null', val:'', body:''}); //2
    linksData.push({index:NodeIdx, parentIndx: NodeIdx-1, connType: 'simple'});//1->2
    nodesData.push({index: ++NodeIdx, type:'WhileStatement', string:st, val: actualEval, body:bodyData});//cond=3
    linksData.push({index:NodeIdx, parentIndx: NodeIdx-1, connType: 'simple'});//2->}3
    var tempNodeIndex = NodeIdx+1; //4
    pcJson.body = parseByType(pcJson.body, cloneScope(scope), NodeIdx, 'whileYes');//for body parent=3
    linksData.push({index:tempNodeIndex-2, parentIndx: tempNodeIndex, connType: 'loopWhile'}); //block of while operation to null 4->2
    linksData.push({index:tempNodeIndex, parentIndx: tempNodeIndex-1, connType: 'whileYes'});//3->4
    return pcJson;
}

function handleExpStatement(pcJson, scope, parentNodeIdx, connectionType){

    if (pcJson.expression.type == 'AssignmentExpression')
        pcJson.expression = handleAssignmentExp(pcJson.expression, scope, parentNodeIdx, connectionType);
    else if (pcJson.expression.type == 'UpdateExpression')
        pcJson.expression = handleUpdateExp(pcJson.expression, scope, parentNodeIdx, connectionType);
    return pcJson;
}

function handleIfStatement(pcJson, scope, parentNodeIdx, connectionType){//TODO insert bodyArray to the object push
    let actualEval = false;//TODO eval if expr
    let clonedScope = cloneScope(scope);
    let condition = calculateExpression(pcJson.test, clonedScope, false);
    let subtituteCondition = calculateExpression(pcJson.test, clonedScope, true);
    var st = escodegen.generate(pcJson.test);//'c<z+2'
    if (evaluateExpression(subtituteCondition, clonedScope))
        actualEval = true;
    nodesData.push({index: ++NodeIdx, type:'ifStatement', string:st, val: actualEval, body:''});
    linksData.push({index:NodeIdx, parentIndx: parentNodeIdx, connType: connectionType});
    pcJson.test = (esprima.parse(condition)).body[0].expression;
    pcJson.consequent = parseByType(pcJson.consequent, clonedScope, NodeIdx, 'yes');
    if (pcJson.alternate == null)
        return pcJson;
    else if (pcJson.alternate.type == 'IfStatement'){//else if
        pcJson.alternate = handleIfStatement(pcJson.alternate, scope, NodeIdx-1, 'no'); return pcJson;
    } else {//else
        pcJson.alternate = parseByType(pcJson.alternate, scope, NodeIdx-1, 'no'); return pcJson;
    }
}

function handleRetStatement(pcJson, scope, parentNodeIdx, connectionType) {
    var st;
    //var lastIfNodeIdx;//TODO why never used
    let value = calculateExpression(pcJson.argument, scope, false);
    if (pcJson.argument != null)
        pcJson.argument = (esprima.parse(value).body[0].expression);
    st = escodegen.generate(pcJson);//st = value
    st = st.substring(0, st.length - 1);
    nodesData.push({index: ++NodeIdx, type: 'RetStatement', string: st, val: ''});
    if ((linksData[linksData.length - 1]).connType == 'whileYes') // no need for link to ends
        linksData.push({index: NodeIdx, parentIndx: NodeIdx - 2, connType: 'whileNo'});
    else if (connectionType == 'no') {
        //lastIfNodeIdx = getLastIfNodeId();
        linksData.push({index: NodeIdx, parentIndx: NodeIdx - 2, connType: 'whileNo'});
    } else
        linksData.push({index:NodeIdx, parentIndx: NodeIdx-1, connType: connectionType});
    linksData.push({index:-1, parentIndx: NodeIdx, connType: 'simple'}); //end
    return pcJson;
}

function handleForStatement(pcJson, scope, parentNodeIdx, connectionType){//TODO handle for node
    if (pcJson.init != null)
        pcJson.init = parseByType(pcJson.init, scope, parentNodeIdx, connectionType);
    if (pcJson.update != null)
        pcJson.update = parseByType(pcJson.update, scope, parentNodeIdx, connectionType); // TODO - check if clone is needed
    pcJson.body = parseByType(pcJson.body, scope, parentNodeIdx, connectionType);
    return pcJson;
}

function handleUpdateExp(pcJson, scope, parentNodeIdx, connectionType) {// TODO - looks that the method do nothing
    var st;
    let name = calculateExpression(pcJson.argument, scope, false);
    //let value = calculateExpression(pcJson.argument, scope, false)+ pcJson.operator;
    let subtitValue = calculateExpression(pcJson.argument, scope, true)+ pcJson.operator;
    scope.rMap.set(name, subtitValue);
    //st = name+value;
    st = escodegen.generate(pcJson);
    if (canMergeExp()) {
        (nodesData[nodesData.length - 1]).string += st + '\n';
        (nodesData[nodesData.length - 1]).val--;
    }
    else {
        nodesData.push({index: ++NodeIdx, type: 'AssignmentExp', string: st, val: '', body: ''});
        if (connectionType != 'yesWhile') // no need for link to ends
            linksData.push({index: NodeIdx, parentIndx: parentNodeIdx, connType: connectionType});
    }
    return pcJson;
}

function canMergeExp() {
    var i = nodesData.length - 1;
    var type = (nodesData[i]).type;
    var val = (nodesData[i]).val;
    if (type == 'ExpBlockStatement' && val>0) {
        return true;
    }
    return false;
}



// --- calculate expressions --- //

function calculateExpression(pcJson, scope, substitute){
    if (pcJson==null)
        return null;
    else {
        return calculateExpressionByType(pcJson, scope, substitute);
    }
}

function calculateExpressionByType(pcJson, scope, subtitute){
    switch (pcJson.type) {
    case 'BinaryExpression':
        return calculateBinaryExp(pcJson, scope, subtitute);
    case 'MemberExpression':
        return calculateMemberExp(pcJson, scope, subtitute);
    case 'UnaryExpression':
        return calculateUnaryExp(pcJson, scope, subtitute);
    case 'ArrayExpression':
        return calculateArrayExp(pcJson, scope, subtitute);
    default:
        return calculateSimpleExp(pcJson, scope, subtitute);
    }
}

function calculateSimpleExp(pcJson, scope, substitute){
    if (pcJson.type == 'Literal')
        return pcJson.raw;
    else if (pcJson.type == 'Identifier')
        return calculateIdentifier(pcJson, scope, substitute);
}

function calculateIdentifier(pcJson, scope, substitute){
    if (substitute){
        if ((scope.rMap.has(pcJson.name)) && !vars_to_present.includes(pcJson.name))
            return scope.rMap.get((pcJson.name));
    }
    return pcJson.name;
}


function calculateArrayExp(pcJson, scope, substitute) {
    let i = 0;
    let ans = '[';
    for(i = 0;i < pcJson.elements.length-1;i++){
        ans = ans + calculateExpression(pcJson.elements[i], scope, substitute) + ',';
    }
    return ans + calculateExpression(pcJson.elements[i], scope, substitute) + ']';
}

function calculateBinaryExp(pcJson, scope, substitute){
    return (calculateExpression(pcJson.left, scope, substitute) +' '+ pcJson.operator + ' '+ calculateExpression(pcJson.right, scope, substitute));
}

function calculateMemberExp(pcJson, scope, substitute){
    let index = calculateExpression(pcJson.property,scope, substitute);
    let name = pcJson.object.name;//'a'
    if (!vars_to_present.includes(name))
        index = evaluateExpression(index, scope);

    let attribute;
    if (scope.rMap.has(name)) {
        attribute = scope.rMap.get((name));//2
    } else if (scope.gMap.has(name)) {
        attribute = scope.gMap.get((name));
    }
    let subAttribute = attribute.substr(1, attribute.length-2);
    let exp_array = subAttribute.split(',');
    return exp_array[index];
}

function calculateUnaryExp(pcJson, scope, substitute){
    return (pcJson.operator + calculateExpression(pcJson.argument, scope, substitute));
}



// --- Evaluate --- //

function evaluateExpression (expr, scope){

    for (var i=0; i<vars_to_present.length; i++)
    {
        let arg_value;
        if (expr.includes(vars_to_present[i]))
        {
            arg_value = scope.gMap.get(vars_to_present[i]);
            expr = replace_args_with_value(expr, vars_to_present[i], arg_value);
        }
    }
    return eval(expr);
}





// --- helpers functions --- //

function replace_args_with_value(expr_to_value, arg_name, arg_value){
    let expr_array = expr_to_value.split(' ');
    for(var i = 0; i< expr_array.length; i++){
        if(expr_array[i] === arg_name){
            expr_array[i] = arg_value;
        }
    }
    return expr_array.join(' ');
}

/*
function checkExpressionVariablesToPresent(pcJson){
    let bool = true;
    if (pcJson.type === 'ExpressionStatement') {//assignment or vardeclaration
        bool = checkExpressionVariablesToPresent(pcJson.expression);
    }
    else bool = checkVariablesToPresent(pcJson);
    return bool;
}

function checkVariablesToPresent(pcJson) {
    let bool = true;
    if (pcJson.type === 'VariableDeclaration'){
        if(!vars_to_present.includes(escodegen.generate(pcJson.declarations[0])))
            bool = false;
    }
    if (pcJson.type === 'AssignmentExpression') {
        if (!vars_to_present.includes(escodegen.generate(pcJson.left))) {
            bool = false;
        }
    }
    return bool;
}
*/

function getIndexLineOfIfStatement(pcJson){
    let output = pcJson.split('\n');
    for(var i = 0;i < output.length;i++){
        if(output[i].indexOf('if')>=0){
            index_if_line.push(i);
        }
    }
}

function cloneScope(scope) {
    var clonedRMap = new Map(scope.rMap);
    var clonedGMap = new Map(scope.gMap);
    var clonedScope = {rMap: clonedRMap, gMap: clonedGMap};
    return clonedScope;
}

//TODO not nessesary
/*
function getLastIfNodeId(){
    for (var i=nodesData.length-1; i>0; i--) {
        if ((nodesData[i]).type == 'ifStatement')
            return i;
    }
    //return -1;
}
*/