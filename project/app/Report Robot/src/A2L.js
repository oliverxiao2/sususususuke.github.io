/*
  @params:
    text: the file input read as text;
    fileType: 'A2L' || 'HEX' || 'DCM'
  @return:
    object of node trees according to the original file
*/
function ASAMFileParser(text, fileType){
  function feed(node, type, line){
    line = line.replace(/(^\s*)|(\s*$)/g, '');
    if (line.length > 0){
      switch (type) {
        case 'CHARACTERISTIC':
          if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
          else if (!node.charType) {node.charType = line;break;}
          else if (!node.address) {node.address = line;break;}
          else if (!node.recordLayout) {node.recordLayout = line;break;}
          else if (!node.maxDiff) {node.maxDiff = line;break;}
          else if (!node.conversion) {node.conversion = line;break;}
          else if (!node.lowerLimit) {node.lowerLimit = line;break;}
          else if (!node.upperLimit) {node.upperLimit = line;break;}
          else {extra();break;}
        case 'AXIS_DESCR':
          if (!node.inputQuantity) {node.inputQuantity = line;break;}
          else if (!node.conversion) {node.conversion = line;break;}
          else if (!node.maxAxisPoints) {node.maxAxisPoints = line;break;}
          else if (!node.lowerLimit) {node.lowerLimit = line;break;}
          else if (!node.upperLimit) {node.upperLimit = line;break;}
          else {extra();break;}
        case 'FUNCTION':
          if (node.description == undefined) {node.description = line;break;}
          break;
        case 'MOD_PAR':
          handlerOfSYS_CONST();break;
        case 'MOD_COMMON':
          extra();break;
        case 'MEASUREMENT':
          if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
          else if (!node.dataType) {node.dataType = line;break;}
          else if (!node.conversion) {node.conversion = line;break;}
          else if (!node.resolution) {node.resolution = line;break;}
          else if (!node.accuracy) {node.accuracy = line;break;}
          else if (!node.lowerLimit) {node.lowerLimit = line;break;}
          else if (!node.upperLimit) {node.upperLimit = line;break;}
          else {extra();break;}
        case 'COMPU_METHOD':
          if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
          else if (!node.conversion) {node.conversion = line;break;}
          else if (!node.format) {node.format = line.replace(/\"/g, '');break;}
          else if (!node.unit) {node.unit = line.replace(/\"/g, '');break;}
          else {extra();break;}
        case 'COMPU_TAB':
          if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
          else if (!node.conversion) {node.conversion = line;break;}
          else if (!node.rowCount) {node.rowCount = line;break;}
          else {extra();break;}
        case 'COMPU_VTAB':
          if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
          else if (!node.conversion) {node.conversion = line;break;}
          else if (!node.count) {node.count = line;break;}
          else {extra();break;}
        case 'COMPU_VATBRANGE':
          break;
        case 'RECORD_LAYOUT':
          let tokens = line.split(/\s+/);
          if (tokens && tokens.length > 2) node[tokens[0]] = tokens[2];
          break;
        case 'AXIS_PTS':
          if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
          else if (!node.address) {node.address = line;break;}
          else if (!node.inputQuantity) {node.inputQuantity = line;break;}
          else if (!node.recordLayout) {node.recordLayout = line;break;}
          else if (!node.maxDiff) {node.maxDiff = line;break;}
          else if (!node.conversion) {node.conversion = line;break;}
          else if (!node.maxAxisPoints) {node.maxAxisPoints = line;break;}
          else if (!node.lowerLimit) {node.lowerLimit = line;break;}
          else {extra();break;}
        default:
          break;
      }
    }
    function extra(){
      let spacePos = line.search(/\s/);
      if ( (spacePos == -1) || (spacePos == (line.length-1)) ) node[line] = line;
      else { // have more than one token
        let k = line.substring(0, spacePos);
        let v = line.substring(spacePos+1);
        if (v.substr(0,1) == '"' && v.substr(v.length-1) == '"') node[k] = v.substr(1, v.length-2);
        else node[k] = v;
      }
    }
    function handlerOfSYS_CONST(){
      let tokens = line.match(/\"([\w\_\.]+)\"\s\"([\w\_\.]+)\"/);
      if (tokens && tokens.length > 2) node['SC_' + tokens[1]] = tokens[2];
    }
  }
  if (fileType.toUpperCase() == "A2L"){
    var lines = text.split('\n');
    var out = {
      getNode: // public method of get node
      function (label = 'DIM'){
        var self = out, result = null;

        (function recursion(obj){
          for (const key in obj){
            if (key == label) return result = obj[key];
            else if (key != 'parent' && typeof(obj[key]) == 'object') {recursion(obj[key])};
          }
        }).call(null, self);

        return result;
      }
    };

    var currentNode = out;

    var cls = 0,
        tokens,
        label,
        item,
        isPending = false;

    var t1 = performance.now();
    for (const [i,line] of lines.entries()){
      if (line.length > 1){
        if (isPending){
          if (tokens = line.match(/[\w\_]+/)){
            let n = 0, k = tokens[0];
            if (currentNode.count) k = tokens[0] + currentNode.count;
            currentNode[k] = {type: isPending};
            currentNode[k].parent = currentNode;
            currentNode = currentNode[k];
            isPending = false;
          }
        } else if (tokens = line.match(/\/begin\s+([\w]+)\s+([\w\_\"]*)/)){
          let k1 = tokens[1];
          let k2 = tokens[2];
          cls += 1;

          if (!currentNode[k1]) {
            if (k1 == 'AXIS_DESCR') currentNode[k1] = {count: 1};
            else currentNode[k1] = {};
            currentNode[k1].parent = currentNode;
          } else if (k1 == 'AXIS_DESCR'){ // treat it as pseudo array by add a attribute of count
            currentNode[k1].count += 1;
          }

          if (k2.length == 0) {
            isPending = k1;
            currentNode = currentNode[k1];
          } else {
            if (currentNode[k1].count) k2 += currentNode[k1].count;
            currentNode[k1][k2] = {type:k1};
            currentNode[k1][k2].parent = currentNode[k1];
            currentNode = currentNode[k1][k2];
          }

        } else if (line.match(/\/end/)){
          cls -= 1;
          if (currentNode.parent) currentNode = currentNode.parent.parent;
          else currentNode = out;
        } else { // neither of begin, end, blank
          feed(currentNode, currentNode.type, line);
        }
      }

    }
    var t2 = performance.now();
    console.log((t2-t1)/1000)
  }

  return out;
}
