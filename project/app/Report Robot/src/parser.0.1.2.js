/*
  A2L file
  return value:{
    AXIS_PTS: {},
    CHAR: [],
    COMPU_METHOD: {},
    COMPU_TAB: {},
    COMPU_VTAB: {},
    FUNCTION: [],
    IF_DATA: [],
    MEAS: [],
    RECORD_LAYOUT: {}

  HEX file
    return value:[
    line text,
    line text,
    ...
    ]
  }

*/

function ASAMFileParser(text, fileType){
  let out = {};
  let $FT = fileType.toUpperCase();
  let t1 = performance.now();

  // parsing A2L
  if ($FT == "A2L"){

    out = {
      byte_order: '',
      hexData: null,

      /*
      *
      *
      *
      */
      getNode: function (label = 'DIM'){
        // return RV (as the node of search result)
        // found = false, used to inform other recursion branches
        let self = out, RV = null, found = false, i = 0;

        (function recursion(obj){
          for (const key in obj){
            if (found) return null;
            else {
              i++ ;

              if (i < Infinity){
                if (key == label) {
                  found = true;
                  return RV = obj[key];
                } else if (key != 'parent' && typeof(obj[key]) == 'object') {
                  recursion(obj[key]);
                }
              } else {
                // too many times of recursion! Stop!
                console.log('Warning: Times of recursion too big! Stopped!')
                return null;
              }
            }

          }
        }).call(null, self);

        return RV;
      },

      /*
      get CHARACTERISTIC value from hexData
      ========================================
      @params:
        exp: String || RegExp
      @return:
      */
      getCHARValue: function(exp){
        let $char       = this.getNode('CHARACTERISTIC');
        let $hex        = this.hexData;
        let $mode       = '';
        let $byte_order = this.getNode('BYTE_ORDER');

        if (typeof(exp) === 'object' && str.exec) $mode = 'all';
        else if (typeof(exp) === 'string') $mode = 'single';
        else $mode = '';

        if (exp && $char && $hex && $byte_order){ // Ready? Go!
          // str == RegExp object, fetch all matched CHARACTERISTIC
          if ($mode == 'all'){}

          // str == some string, fetch the first matched element
          else if ($mode == 'single'){
            let $char_names = Object.keys($char);
            for (const char_name of $char_names){
              if (char_name.match(str)){

                break;
              }
            }
          }
        }
      },

      /*
      read CHARACTERISTIC and return the element
      =========================================
      @params:
        theCHAR: object(CHARACTERISTIC)
      @return:
        output: object(CHARACTERISTIC)
      */
      readCHAR: function(theCHAR){
        if (theCHAR){
          let $byte_order = this.byte_order;
          let $address    = theCHAR.address;
          let $charType   = theCHAR.charType;
          let $conversion = theCHAR.conversion;
          let $layout     = theCHAR.recordLayout;
        }
      }
    };
    let lines = text.split('\n');
    let currentNode = out;
    let cls = 0,
        tokens,
        label,
        item,
        isPending = false;

    for (const [i,line] of lines.entries()){
      if (line.length > 1){
        // isPending == true, element name has not been found yet
        if (isPending){
          if (tokens = line.match(/[\w\[\]\.]+/)){
            if (tokens[0] == 'AccPed_trqDes') console.log('1', currentNode);
            let n = 0, k = tokens[0];
            if (currentNode.count) k = tokens[0] + currentNode.count;
            currentNode[k] = {type: isPending};
            currentNode[k].parent = currentNode;
            currentNode = currentNode[k];
            isPending = false;
            if (tokens[0] == 'AccPed_trqDes') console.log('2',currentNode)
          }

        // isPending == false, element name has been found.
      } else if ( (tokens = line.match(/\/begin\s+([\w\[\]\.]+)[\s]+([\w\.\[\]]*)/)) && (!line.match(/\/end/)) ){
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

        } else if ((line.match(/\/end/)) && (!line.match(/\/begin/))){
          cls -= 1;
          if (currentNode.parent) currentNode = currentNode.parent.parent;
          else currentNode = out;
        } else if ( !(line.match(/\/begin/) || line.match(/\/end/) ) ) { // neither of begin, end, blank
          feed(currentNode, currentNode.type, line);
        }
      }

    }
    out.byte_order = out.getNode('BYTE_ORDER');

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
            else if (!node.upperLimit) {node.upperLimit = line;break;}
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
  }
  // parsing DCM
  else if ($FT == 'DCM'){
    out = {count: 0};
    let cls = 0, key = '', keywordType = '',  valArray, currentNode = out, tokens = [], state = 'idle', element;
    let keywords = {
      element:[
        'FUNKTIONEN',                   // funct. definition
        'VARIANTENKODIERUNG KRITERIUM', // variant coding
        'MODULKOPF',                    // module header
        'FESTWERT',                     // parameter
        'FESTWERTEBLOCK'                // function array or matrix
      ],
      value: ['TEXT', 'WERT']
    }

    if (text){
      let lines = text.split(/\n/);
      if (lines){
        for (const [i, _line_] of lines.entries()){
          let line = _line_.replace(/(^\s+)|(\s+$)/g, '');
          if (line){
            // real work starts here!
            tokens = line.split(/\s+/);
            if (tokens && tokens.length >= 1){

              key = tokens[0].toUpperCase();
              keywordType = getKeywordType(key, keywords);

              // case 0: meet a new element, init it!
              if (keywordType == 'element'){
                out.count = out.count + 1;
                if (out[key] == undefined) out[key] = {};
                currentNode = out[key];
                initElement(key, tokens.slice(1), currentNode);
                state = 'read';

              // case 1: leave the element
              } else if (key == 'END'){
                state = 'idle';
                currentNode = out;
              }

              // case 2: entered a new element, read keyword and value
              else if (state == 'read'){
                switch (keywordType) {
                  case 'value':
                    if (currentNode.type == 'FESTWERTEBLOCK'){
                      valArray = [];
                      tokens.slice(1).forEach(function(str){
                        let r = str.match(/^\"([\s\S]*?)\"$/);
                        if (r) valArray.push(r[1]);
                        else valArray.push(str);
                      });
                      if (!currentNode[key]) currentNode[key] = [];
                      currentNode[key] = currentNode[key].concat(valArray);
                    }
                    break;
                  case 'other':
                    currentNode[key] = removeQuotes(tokens[1]);
                    break;
                  default: break;
                }
              }
            }
          }
        }
        return out;
      }
    }
    function initElement(key, tokens, node){
      if (key == 'FESTWERTEBLOCK'){
        currentNode = (node[tokens[0]] = {type:key});
        if (tokens.length == 1) {currentNode.size_x = tokens[1];}
        if (tokens.length == 3) {currentNode.size_x = tokens[1]; currentNode.size_y = tokens[2];}
      }
    }
    function getKeywordType(key, lib){
      if (key && lib){
        let types = Object.keys(lib);
        for (const type of types){
          if (lib[type].indexOf(key) >= 0) return type;
        }

        return 'other';
      }
      return null;
    }
    function removeQuotes(str){
      let r = str.match(/^\"([\s\S]*?)\"$/);
      if (r) return r[1];
      else return str;
    }
  }
  // parsing HEX
  else if ($FT == 'HEX'){
    out.datablock = {};
    let lines = text.split(/\n/);
    let len = 0, datablock = {}, currentBlock, databytes, blockAddr, type, state = 'idle';
    for (const [i, _line_] of lines.entries()){
      line = $.trim(_line_);
      len = line.length;
      dataByteCount = parseInt(line.substr(1, 2), 16);
      blockAddr = line.substr(3, 4);
      type = line.substr(7, 2);
      dataLine = line.substr(9, len - 11);

      if (len == 15 && type == '04'){
        if (out['datablock'][dataLine] == undefined) out['datablock'][dataLine] = '';
        currentBlock = dataLine;
        state = 'push';
      } else if (state == 'push'){
        out.datablock[currentBlock] += dataLine;
      }
    }
  }
  // parsing DAT
  else if ($FT == 'DAT'){

  }

  let t2 = performance.now();
  console.log((t2-t1)/1000);

  return out;
}

function ASAMGetValue({
  a2l,
  hex,
  charRegExp,
  funcRegExp,
  show = false
  }){
  const runtimeStart = performance.now();
  let out       = {};
  const _charAll = a2l["data"]["CHAR"];
  const _recordLayoutAll = a2l["data"]["RECORD_LAYOUT"];
  const _conversionAll= a2l["data"]["COMPU_METHOD"];
  const _tabAll= a2l["data"]["COMPU_TAB"];
  const _vtabAll= a2l["data"]["COMPU_VTAB"];
  const _axisPtsAll = a2l["data"]["AXIS_PTS"];

  if (a2l && hex){
    // search CHARACTERISTIC by charRegExp
    if (true) {
      let _charNeed = [];
      let _addrInfo = [];

      ////////////////////////////////////////////////////////////////////
      if (charRegExp == "*") _charNeed = _charAll;
      else {
        for (let _char of _charAll){
          if (_char.name.match(charRegExp)) _charNeed.push(_char);
        }
      }
      out["CHARFound"] = _charNeed;

      // _charNeed not empty
      if (_charNeed.length > 0){
        for (const [_i, _char] of _charNeed.entries()){
          //out["CHARGroupByExt"] = _addr
          //out["CHARGroupByExt"][0] = {}, members as following:
          //ext: extension address
          //CHARID: the order of CHAR in the out["CHARFound"]

          //get address
          const _addr = _char.address;
          const _valueType = _char.valueType.toUpperCase();
          // 32bit address, 0xAAAABBBB

          if (true){ // if 32bit address, always true
            // ATTENTION! the address may not has 8 numbers!
            // the amount of numbers should between 5 ~ 8
            // such as 0x9061234
            // in 32bit address, the base adress always have 4 digits
            // but the extension address shouldn't have 4 digits
            const _high = parseInt("0x"+_addr.substr(2, _addr.length - 6));
            //_addrInfo empty
            const _len  = _addrInfo.length;
            if (_len == 0){
              _addrInfo.push({ext:_high, CHARID:[_i]})
            }
            else{
              let _flagInGroup = false;
              for(let i=0; i<_len; i++){
                //ext address exist, update baseMax & baseMin
                if ( _high == _addrInfo[i].ext){
                  //add this CHAR's index into the CHARID array
                  _addrInfo[i].CHARID.push(_i);
                  _flagInGroup = true;
                  break;
                }
              }

              if (!_flagInGroup) _addrInfo.push({ext:_high, CHARID:[_i]});
            }

            // ====================== Attach conversionType ============================= //
            // TAB_INTP: table with interpolation
            // TAB_NOINTP: table without interpolation
            // TAB_VERB: verbal conversion table
            // RAT_FUNC: fractional rational function = (axx+bx+c)/(dxx+ex+f)
            // FORM: formula as specified in the Formula property
            addConversionInfo({obj: _char,});

            if (_char["subs"]){
              _char["layoutDetailAxis"] = [];
              for (const [i, sub] of _char["subs"].entries()){
                addConversionInfo({obj:sub});
                if (sub["axis_pts_ref"]){
                  sub["recordLayout"] = _axisPtsAll[sub["axis_pts_ref"]]["recordLayout"];
                  _char["layoutDetailAxis"].push(_recordLayoutAll[sub["recordLayout"]]);
                }
              }
            }
            // ================ End of attach conversionType ============================ //


            // ================ Attach recordLayout information ========================= //
            // KlAxU8SstxU16WU16
            // NO_AXIS_PTS_X 1 SWORD
            // AXIS_PTS_X    2 SWORD INDEX_INCR DIRECT
            // FNC_VALUES    3 SWORD COLUMN_DIR DIRECT
            // =====================================================================
            // Axis_Xs16
            // NO_AXIS_PTS_X     1 SWORD
            // AXIS_PTS_X        2 SWORD INDEX_INCR DIRECT
            // =====================================================================
            // Cur_Xs16Ws16
            // NO_AXIS_PTS_X     1 SWORD
            // AXIS_PTS_X        2 SWORD INDEX_INCR DIRECT
            // FNC_VALUES        3 SWORD COLUMN_DIR DIRECT
            // =====================================================================
            // KfAxSwAySwSstxSwSstySwWSw
            // NO_AXIS_PTS_X     1 SWORD
            // NO_AXIS_PTS_Y     2 SWORD
            // AXIS_PTS_X        3 SWORD INDEX_INCR DIRECT
            // AXIS_PTS_Y        4 SWORD INDEX_INCR DIRECT
            // FNC_VALUES        5 SWORD COLUMN_DIR DIRECT

            const _layout = _recordLayoutAll[_char["recordLayout"]]; // layout in main Block
            let _tempAllLayout = [_layout];

            if (_char["layoutDetailAxis"]){
              _tempAllLayout = _tempAllLayout.concat(_char["layoutDetailAxis"])
            }

            _char["bytes"] = {};
            _char["layoutDetail"] = {};

            for (const i of _tempAllLayout){
              for (const layoutItem in i){
                if (i[layoutItem][2].match("UBYTE")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"UBYTE", bytes:1, signed:false}; //8 bit
                }
                else if (i[layoutItem][2].match("SBYTE")) {
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"SBYTE", bytes:1, signed:true}; // 8 bit
                }
                else if (i[layoutItem][2].match("UWORD")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"UWORD", bytes:2, signed:false}; // 16 bit
                }
                else if (i[layoutItem][2].match("SWORD")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"SWORD", bytes:2, signed:true}; // 16 bit
                }
                else if (i[layoutItem][2].match("ULONG")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"ULONG", bytes:4, signed:false}; // 32 bit
                }
                else if (i[layoutItem][2].match("SLONG")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"SLONG", bytes:4, signed:true}; // 32 bit
                }
                else if (i[layoutItem][2].match("A_UINT64")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"A_UINT64", bytes:8, signed:false}; // 64 bit
                }
                else if (i[layoutItem][2].match("A_INT64")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"A_INT64", bytes:8, signed:true}; // 64 bit
                }
                else if (i[layoutItem][2].match("FLOAT32_IEEE")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"FLOAT32_IEEE", bytes:4, signed:true}; // 32 bit
                }
                else if (i[layoutItem][2].match("FLOAT64_IEEE")){
                  _char["layoutDetail"][i[layoutItem][0]] = {dataType:"FLOAT64_IEEE", bytes:8, signed:true}; // 64 bit
                }
              }
            }
            // ============== End of attach recordLayout information ==================== //
          }
        }

        out["CHARGroupByExt"] = _addrInfo;

        // =========== according to _addrInfo, read the data from hex =============== //
        // =================== CHARID =======================
        // data: "1020040..."
        // ext: 32772 => 0x8004
        // extFromRow: 7688 => row order in hex file
        // extToRow: 9736 => row order in hex file
        for (let _group of _addrInfo){
          const _ext = _group.ext.toString(16);
          const _offset = ":AABBBBCC".length;
          let _extFromRow, _extToRow, _flagFindExt=false, _biter="";

          //scan the hex and get the extension address data
          for (let [_i, _row] of hex["data"].entries()){
            if (_flagFindExt){
              if(_row.substr(7, 2) == "00"){
                _biter += _row.substring(_offset, _row.length-3);}
              else{
                _extToRow = _i-1;
                break;}
            }

            //search for the extention address row
            //have to put at the end in order to work in next loop
            if (_row.match(":02000004"+_ext)){
              _extFromRow = _i;
              _flagFindExt = true;
            }
          }
          _group["data"]       = _biter;
          _group["extFromRow"] = _extFromRow;
          _group["extToRow"]   = _extToRow;
        }
        // =============== End of read the data from hex ============================ //

        // =========== according to the _biter, find the value of the address ======= //
        for (const _group of _addrInfo){
          for (const _CHARID of _group.CHARID){
            sub_readAndAttachChar(_charNeed[_CHARID], _group["data"]);
          }
        }
      }
    }
    else if (funcRegExp){
      let _funcoutArray = [];
      for (const func of a2l["data"]["FUNCTION"]){
        if (func["name"].match(funcRegExp)) _funcoutArray.push(func);
      }
      out = _funcoutArray;
    }
    // ========== Calculate the ruuning time and output out ================== //
    const runtimeEnd = performance.now();
    console.log(runtimeEnd - runtimeStart);
    if (show){
      root.show(out);
    }
    return out;

    // ======================= End of main code ================================= //
  }

  ////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////

  // ============================ subfunction ================================= //
  // === convert value to physical value
  function convert(rawData, char){
    try{
      const type = char["conversionType"];

      let params;
      switch (type) {
        case "RAT_FUNC":
          // raw = (a*phy^2+b*phy+c)/(d*phy^2+e*phy+f)
          params = char["conversionCOEFFS"];
          const aMinusdg = params[0] - params[3]*rawData;
          if (aMinusdg == 0){
            const numerator = params[5]*rawData - params[2];
            const denominator = params[1] - params[4]*rawData;
            return numerator/denominator;
          }
          else return null;
          //const b2Minus4ac = Math.pow(params[1]-params[4]*rawData, 2)-4*(params[0]-params[3]*rawData)*(params[2]-params[5]*rawData);
        case "TAB_VERB":
          params = char["conversionVTabRef"]["data"];
          for (const item of params){
            if (item[0] == rawData) return item[1];
          }
          return null;
        case "TAB_INTP":
          params = char["conversionTabRef"]["data"];
          for (const item of params){
            if (item[0] == rawData){
              return item[1];
            }
          }
          return null;
        case "TAB_NOINTP":
          params = char["conversionTabRef"]["data"];
          for (const item of params){
            if (item[0] == rawData){
              return parseFloat(item[1]);
            }
          }
          return null;
        default:
          return null;
      }
    }
    catch (exception){
      console.log(char, char["conversionType"],  exception);
    }
  }

  // === find conversion info of obj
  // === and add these to obj's properties
  // === conversionDict = COMPU_METHOD
  // === obj can be CHARACTERISTIC or AXIS_DESCR
  function addConversionInfo({
    obj,
    conversionDict = _conversionAll, // COMPU_METHOD
    tabDict        = _tabAll,        // COMPU_TAB
    vtabDict       = _vtabAll        // COMPU_VTAB
  }){
    if (obj["conversion"]){

      const myConversion = conversionDict[obj["conversion"]];
      obj["conversionType"] = myConversion["conversionType"];

      if (myConversion["conversionType"] === "TAB_VERB"){
        obj["conversionVTabRef"] = vtabDict[myConversion["COMPU_TAB_REF"][0]];
      }
      else if (myConversion["conversionType"] === "RAT_FUNC"){
        obj["conversionCOEFFS"] = myConversion["COEFFS"];
        obj["conversionFormat"] = myConversion["format"];
      }
      else if (myConversion["conversionType"] === "TAB_INTP" || myConversion["conversionType"] === "TAB_NOINTP"){
        obj["conversionTabRef"] = tabDict[myConversion["COMPU_TAB_REF"][0]];
      }
    }
  }

  // === littleEndian: true
  // === 0xABCD => 0xCDAB
  // === 0xABCDEFGH => 0x GHEFCDAB
  // === datumLen = 1/2/4
  function hexDatumStrToInt({
    str="",
    signed=false,
    littleEndian=true,
    hexRaw=false
  }){
    if (littleEndian){
      if (str.length % 2 === 0){
        let out = 0;
        let rawStr = "";

        for (let i=0; i<str.length/2; i++){rawStr = str.substr(i*2, 2) + rawStr;}
        rawStr = "0x" + rawStr.toUpperCase();

        // example:raw "0xABCD"
        if (hexRaw) return rawStr;

        for (let i=0; i<str.length/2; i++){out += (parseInt("0x"+str.substr(i*2, 2))) * (0x01 << (i*8));}



        if (signed && (out.toString(2).length == str.length*4)){
          // negative
          return out - (0x01 << (str.length*4));
        }

        return out;
      }
      else return null;
    }
  }

  // === read CHARACTERISTIC-CURVE value ===
  // === char: dealed CHARACTERISTIC Object
  // === hexDB: pure hex data at right extension address
  function sub_readAndAttachChar(char, hexDB){
    let _out_rawDataArray = [];
    let _out_phyDataArray = [];
    let offset, offsetX, offsetY, offsetZ;
    let _strX = "", _strY = "", _strZ = "";
    let _rawX = "", _rawY = "", _rawZ = "";
    let _x = 0, _y = 0, _z;

    const _valueType                 = char["valueType"];
    const _number                    = parseInt(char["number"]);
    const _baseAddr                  = parseInt("0x"+char["address"].substr(char["address"].length-4, 4))*2;
    const _byteNumOfZVal             = char["layoutDetail"]["FNC_VALUES"]["bytes"];
    const _signedZ                   = char["layoutDetail"]["FNC_VALUES"]["signed"];
    const _conversionType            = char["conversionType"];

    // === validate the points quantity, the number of quantity must not be negative
    if(_valueType == "VALUE" || _valueType == "VAL_BLK"){
      const _realNum = (_valueType == "VALUE")? 1 : _number;
      let offset = 0;

      for (let i=0; i<_realNum; i++){
        offset = i * _byteNumOfZVal*2;

        _strZ = hexDB.substr(_baseAddr + offset, _byteNumOfZVal*2);

        _rawZ = hexDatumStrToInt({str:_strZ, signed:false, hexRaw:true});

        _z = hexDatumStrToInt({str:_strZ, signed:_signedZ});

        _z = convert(_z, char);

        _out_rawDataArray.push(_rawZ);
        _out_phyDataArray.push(_z);
      }
    }
    else if (_valueType == "CURVE"){

      const _byteNumOfAxisXPtsQuantity = char["layoutDetail"]["NO_AXIS_PTS_X"] ? char["layoutDetail"]["NO_AXIS_PTS_X"]["bytes"] : _byteNumOfZVal;
      const _byteNumOfAxisXVal         = char["layoutDetail"]["AXIS_PTS_X"] ? char["layoutDetail"]["AXIS_PTS_X"]["bytes"] : _byteNumOfZVal;
      const _realPointsNum = hexDatumStrToInt({str:hexDB.substr(_baseAddr, _byteNumOfAxisXPtsQuantity*2), signed:false});
      const _maxPointsNum  = parseInt(char["subs"][0]["maxPointsQuantity"]);
      const _signedX       = char["layoutDetail"]["AXIS_PTS_X"] ? char["layoutDetail"]["AXIS_PTS_X"]["signed"] : _signedZ;
      if (_realPointsNum <= _maxPointsNum){
        for (let i=0; i<_realPointsNum; i++){
          offsetX = (_byteNumOfAxisXPtsQuantity + i * _byteNumOfAxisXVal)*2;
          offsetZ = (_byteNumOfAxisXPtsQuantity + _realPointsNum * _byteNumOfAxisXVal + i * _byteNumOfZVal)*2;

          _strX = hexDB.substr(_baseAddr + offsetX, _byteNumOfAxisXVal*2);
          _strZ = hexDB.substr(_baseAddr + offsetZ, _byteNumOfZVal*2);

          _rawX = hexDatumStrToInt({str:_strX, signed:false, hexRaw:true});
          _rawZ = hexDatumStrToInt({str:_strZ, signed:false, hexRaw:true});

          _x = hexDatumStrToInt({str:_strX, signed:_signedX});
          _z = hexDatumStrToInt({str:_strZ, signed:_signedZ});

          _x = convert(_x, char["subs"][0]);
          _z = convert(_z, char);

          _out_rawDataArray.push({x:_rawX, z:_rawZ});
          _out_phyDataArray.push({x:_x, z:_z});
        }
      }
    }
    else if (_valueType == "MAP"){
      // the map data structure in hex
      // AAAA BBBB => x axis points number, y axis points number
      // XXXX XXXX .... XXXX => x axis value
      // YYYY YYYY .... YYYY => y axis value
      // ZZZZ ZZZZ .... ZZZZ => z value when x=x0, changing with y
      // ZZZZ ZZZZ .... ZZZZ => z value when x=x1, changing with y
      // ....
      const _byteNumOfAxisXPtsQuantity = char["layoutDetail"]["NO_AXIS_PTS_X"] ? char["layoutDetail"]["NO_AXIS_PTS_X"]["bytes"] : _byteNumOfZVal;
      const _byteNumOfAxisXVal         = char["layoutDetail"]["AXIS_PTS_X"] ? char["layoutDetail"]["AXIS_PTS_X"]["bytes"] : _byteNumOfZVal;
      const _byteNumOfAxisYPtsQuantity = char["layoutDetail"]["NO_AXIS_PTS_Y"] ? char["layoutDetail"]["NO_AXIS_PTS_Y"]["bytes"] : _byteNumOfAxisXPtsQuantity;
      const _byteNumOfAxisYVal         = char["layoutDetail"]["AXIS_PTS_Y"] ? char["layoutDetail"]["AXIS_PTS_Y"]["bytes"] : _byteNumOfAxisXVal;
      const _realNumOfPtsX = hexDatumStrToInt({str:hexDB.substr(_baseAddr, _byteNumOfAxisXPtsQuantity*2), signed:false});
      const _realNumOfPtsY = hexDatumStrToInt({str:hexDB.substr(_baseAddr + _byteNumOfAxisXPtsQuantity*2, _byteNumOfAxisYPtsQuantity*2), signed:false});
      const _maxPtsNumOfX  = parseInt(char["subs"][0]["maxPointsQuantity"]);
      const _maxPtsNumOfY  = parseInt(char["subs"][1]["maxPointsQuantity"]);
      const _signedX       = char["layoutDetail"]["AXIS_PTS_X"] ? char["layoutDetail"]["AXIS_PTS_X"]["signed"] : _signedZ;
      const _signedY       = char["layoutDetail"]["AXIS_PTS_Y"] ? char["layoutDetail"]["AXIS_PTS_Y"]["signed"] : _signedX;

      let _arrayX = [], _arrayY = [], _arrayZ = [], _map = {}, _mapRaw = {};
      let _arrayRawX = [], _arrayRawY = [], _arrayRawZ = [];

      if ((_realNumOfPtsX <= _maxPtsNumOfX) || (_realNumOfPtsY <= _maxPtsNumOfY)){
        offset  = (_byteNumOfAxisXPtsQuantity + _byteNumOfAxisYPtsQuantity)*2;

        for (let i=0; i<_realNumOfPtsX; i++){
          offsetX = offset + (i * _byteNumOfAxisXVal)*2;
          _strX = hexDB.substr(_baseAddr + offsetX, _byteNumOfAxisXVal*2);
          _rawX = hexDatumStrToInt({str:_strX, signed:false, hexRaw:true});
          _x    = hexDatumStrToInt({str:_strX, signed:_signedX});
          _x    = convert(_x, char["subs"][0]);
          _arrayX.push(_x);
          _arrayRawX.push(_rawX);
        }

        for (let i=0; i<_realNumOfPtsY; i++){
          offsetY = offset + (_realNumOfPtsX * _byteNumOfAxisXVal + i * _byteNumOfAxisYVal)*2;
          _strY = hexDB.substr(_baseAddr + offsetY, _byteNumOfAxisYVal*2);
          _rawY = hexDatumStrToInt({str:_strY, signed:false, hexRaw:true});
          _y    = hexDatumStrToInt({str:_strY, signed:_signedY});
          _y    = convert(_y, char["subs"][1]);
          _arrayY.push(_y);
          _arrayRawY.push(_rawY);
        }

        for (let i=0; i<_realNumOfPtsX; i++){

          //let _temp = [], _tempRaw =[];
          //_arrayZ.push([_arrayX[i], _temp]);
          //_arrayRawZ.push([_arrayRawX[i], _tempRaw]);

          if (!_map[_arrayX[i]]){
            _map[_arrayX[i]] = {};
            _mapRaw[_arrayRawX[i]] = {};
          }

          for (let j=0; j<_realNumOfPtsY; j++){
            offsetZ = offset + (_realNumOfPtsX * _byteNumOfAxisXVal + _realNumOfPtsY * _byteNumOfAxisYVal + i*_realNumOfPtsY*_byteNumOfZVal + j)*2;
            _strZ = hexDB.substr(_baseAddr + offsetZ, _byteNumOfZVal*2);
            _rawZ = hexDatumStrToInt({str:_strZ, signed:false, hexRaw:true});
            _z    = hexDatumStrToInt({str:_strZ, signed:_signedZ});
            _z    = convert(_z, char);
            //_temp.push([_arrayY[j], _z]);
            //_tempRaw.push([_arrayRawY[j], _rawZ]);

            _map[_arrayX[i]][_arrayY[j]] = _z;
            _mapRaw[_arrayRawX[i]][_arrayRawY[j]] = _rawZ;
          }
        }
        _out_rawDataArray = _mapRaw;
        _out_phyDataArray = _map;
      }
      else{
        char["rawDataArray"] = null;
        char["phyDataArray"] = null;
        return null;
      }
    }

    char["rawDataArray"] = _out_rawDataArray; // attach out
    char["phyDataArray"] = _out_phyDataArray; // attach out
    // read and attach end
  }
}

function t1(text){
  let array = text.match(/\/begin MEASUREMENT[\s\S]*?\/end MEASUREMENT/g);
  return array;
}
