function ASAMFileParser(text, fileType){
  let out = {};
  let $FT = fileType.toUpperCase();
  let t1 = performance.now();

  // parsing A2L
  if ($FT == "A2L"){

    out = {
      byte_order: '',
      hexData: null,
      hexFile: null,
      /*
      get the node object or value
      ============================
      @params:
        label: String
      @return:
        Object || String
      */
      getNode: function (label = 'DIM'){
        // return RV (as the node of search result)
        // found = false, used to inform other recursion branches
        let self = this, RV = null, found = false, i = 0;

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
      getCHAR: function(exp){
        let $char       = this.getNode('CHARACTERISTIC');
        let $mode       = '';

        if (typeof(exp) === 'object' && exp.exec) $mode = 'all';
        else if (typeof(exp) === 'string') $mode = 'single';
        else $mode = '';

        if (exp && $char){ // Ready? Go!
          let $char_names = Object.keys($char);

          // str == RegExp object, fetch all matched CHARACTERISTIC
          if ($mode == 'all'){
            let output = [];
            for (const char_name of $char_names){
              if (char_name.match(exp)) output.push($char[char_name]);
            }
            return output;
          }

          // str == some string, fetch the first matched element
          else if ($mode == 'single'){
            for (const char_name of $char_names){
              if (char_name.match(exp)){
                return $char[char_name];
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
        let t1 = performance.now();
        let returnValue = null;
        const $hex           = this.hexData;
        const $byte_order    = this.byte_order;
        const $COMPU_METHOD  = this.getNode('COMPU_METHOD');
        const $RECORD_LAYOUT = this.getNode('RECORD_LAYOUT');
        const $VTabs         = this.getNode('COMPU_VTAB');
        const $Tabs          = this.getNode('COMPU_TAB');

        if ($hex && $byte_order){
          if (theCHAR == undefined){ // read all
            let CHARs = this.getNode('CHARACTERISTIC');

            if (CHARs){
              for (const name in CHARs){
                if (CHARs[name].type === 'CHARACTERISTIC' && CHARs[name].phyDec === undefined) read(CHARs[name], this);
              }
              returnValue =  CHARs;
            }
          }
          else{ // read the specific CHARACTERISTIC
            if (theCHAR.constructor.name === 'String') theCHAR = this.getCHAR(theCHAR);
            read(theCHAR, this);
            returnValue =  theCHAR;
          }

          console.log((performance.now() - t1)/1000);
          return returnValue;
        }
        return null;

        // sub functions begin
        function splitAddress(address = ''){
          if (address && typeof address === 'string'){
            let len = address.length;
            if (len >= 7 && len <= 10){
              let blockAddr = address.substr(2, len - 6),
                  dataAddr  = parseInt('0x' + address.substr(len - 4));

              while (blockAddr.length < 4) {
                blockAddr  = '0' + blockAddr;
              }

              return [blockAddr, dataAddr];
            } else return ['', NaN];
          }
        }

        function getBytes(str){
          if (str == 'UBYTE') return [1, false];
          else if (str == 'SBYTE') return [1, true];
          else if (str == 'UWORD') return [2, false];
          else if (str == 'SWORD') return [2, true];
          else if (str == 'ULONG') return [4, false];
          else if (str == 'SLONG') return [4, true];
          else if (str == 'A_UINT64') return [8, false];
          else if (str == 'A_INT64') return [8, true];
          else if (str == 'FLOAT32_IEEE') return [4, true];
          else if (str == 'FLOAT64_IEEE') return [8, true];
        }

        function convertRaw2Phy(rawHex, convObj, format){
          let rawDec   = parseInt(rawHex),
              convType = convObj.conversion,
              coeffs   = '',
              tabRef   = '',
              n;  // 格式化数字时的小数位数
          if (format) {
            const tokens = format.split('.');
            if (tokens.length > 1) n = parseInt(tokens[1]);
          }
          switch (convType) {
            case 'RAT_FUNC':
              coeffs = convObj.COEFFS.split(/\s/);
              if ((coeffs[0] - coeffs[3] * rawDec) === 0){
                return ( (coeffs[5]*rawDec - coeffs[2]) / (coeffs[1] - coeffs[4]*rawDec) ).toFixed(n);
              }
              break;
            case "TAB_VERB":
              tabRef = convObj['COMPU_TAB_REF'];
              if (tabRef){
                return $VTabs[tabRef]['' + rawDec];
              }
              break;
            default: //"TAB_INTP", "TAB_NOINTP"
              tabRef = convObj['COMPU_TAB_REF'];
              if (tabRef){
                return $Tabs[tabRef]['' + rawDec];
              }
              break;
          }

          return NaN;
        }

        // rawHex = "07A3", not "0x073"
        function adjustByteOrder(rawHex, byte_order, signed){
          if (rawHex){
            if (rawHex.length % 2 === 0){
              let bytes = rawHex.length / 2,
                  newRawHex = '',
                  newRawDec = 0;

              if (byte_order === 'MSB_LAST'){
                for (let i=0; i<bytes; i++){
                  newRawHex = rawHex.substr(i*2, 2) + newRawHex;
                }
              }

              if (byte_order === 'MSB_FIRST') newRawHex = rawHex;

              newRawDec = parseInt('0x' + newRawHex);

              if (signed && newRawDec.toString(2).length == newRawHex.length*4){
                return newRawDec - (0x01 << (newRawHex.length*4));
              }

              return newRawDec;
            }
          }
        }

        function read(theCHAR, A2L){
          const address    = theCHAR.address;
          const charType   = theCHAR.charType;
          const format     = theCHAR.FORMAT; // 格式化数字
          const conversion = $COMPU_METHOD[theCHAR.conversion];
          const unit       = conversion.unit;
          const layout     = $RECORD_LAYOUT[theCHAR.recordLayout];


          let [blockAddr, dataAddr] = splitAddress(address);

          if (blockAddr && dataAddr){
            let theDataBlock = $hex.dataBlock[blockAddr],
                offset       = 0,
                rawHex       = '',
                rawHex2      = '',
                rawHex3      = '',

                bytesOfValue = 0,
                ptsOfValue   = 0,
                valueSigned  = false,

                bytesOfXPts  = 0,
                XPtsSigned   = false,
                bytesOfXAxis = 0,
                ptsOfXAxis   = 0,
                XAxisSigned  = false,

                bytesOfYPts  = 0,
                YPtsSigned   = false,
                bytesOfYAxis = 0,
                ptsOfYAxis   = 0,
                YAxisSigned  = false,

                adjustedRawDec  = NaN,
                adjustedRawDec2 = NaN,
                adjustedRawDec3 = NaN;

            switch (charType) {
              case 'VALUE':
                offset = dataAddr * 2;
                [bytesOfValue, valueSigned] = getBytes(layout.FNC_VALUES);
                rawHex = theDataBlock.substr(offset, bytesOfValue * 2);
                adjustedRawDec = adjustByteOrder(rawHex, $byte_order, valueSigned);
                theCHAR.rawHex = '0x' + rawHex;
                theCHAR.cvtDec = adjustedRawDec;
                theCHAR.phyDec = convertRaw2Phy(adjustedRawDec, conversion, format);
                theCHAR.byteOffset = dataAddr; // 为写入HEX方便地址查找
                break;
              case "VAL_BLK":
                ptsOfValue = theCHAR.NUMBER;
                offset = dataAddr * 2;
                [bytesOfValue, valueSigned] = getBytes(layout.FNC_VALUES);
                if (ptsOfValue > 0){
                  theCHAR.rawHex = [];
                  theCHAR.cvtDec = [];
                  theCHAR.phyDec = [];
                  theCHAR.byteOffset = [];

                  for (let i = 0; i<ptsOfValue; i++){
                    rawHex = theDataBlock.substr(offset + i * bytesOfValue * 2, bytesOfValue * 2);
                    adjustedRawDec = adjustByteOrder(rawHex, $byte_order, valueSigned);
                    theCHAR.rawHex.push('0x' + rawHex);
                    theCHAR.cvtDec.push(adjustedRawDec);
                    theCHAR.phyDec.push(convertRaw2Phy(adjustedRawDec, conversion, format));
                    theCHAR.byteOffset.push(dataAddr + i * bytesOfValue);
                  }
                }
                break;
              case "CURVE":
                const AXIS_DESCR = theCHAR.AXIS_DESCR;
                const axisCount = AXIS_DESCR?AXIS_DESCR.count:NaN;
                const axisObj = AXIS_DESCR?AXIS_DESCR.STD_AXIS1:null;
                if (axisObj){
                  theCHAR.rawHex = {x:[], value:[]};
                  theCHAR.cvtDec = {x:[], value:[]};
                  theCHAR.phyDec = {x:[], value:[]};
                  theCHAR.byteOffset = {x:[], value:[]};

                  const formatAxis = axisObj.FORMAT;
                  const conversionAxis = $COMPU_METHOD[axisObj.conversion];

                  offset = dataAddr * 2;

                  ptsOfValue = parseInt(axisObj.maxAxisPoints);
                  [bytesOfValue, valueSigned] = getBytes(layout.FNC_VALUES);
                  [bytesOfXPts,  XPtsSigned ] = getBytes(layout.NO_AXIS_PTS_X);
                  [bytesOfXAxis, XAxisSigned] = getBytes(layout.AXIS_PTS_X);

                  for (var i = 0; i < ptsOfValue; i++) {
                    // rawHex : X Axis
                    // rawHex2: Value
                    rawHex = theDataBlock.substr(offset + (i * bytesOfXAxis + bytesOfXPts) * 2, bytesOfXAxis * 2);
                    adjustedRawDec = adjustByteOrder(rawHex, $byte_order, XAxisSigned);

                    rawHex2= theDataBlock.substr(offset + (i * bytesOfValue + bytesOfXPts + ptsOfValue * bytesOfXAxis) * 2, bytesOfValue * 2);
                    adjustedRawDec2 = adjustByteOrder(rawHex2, $byte_order, valueSigned);

                    theCHAR.rawHex.x.push('0x' + rawHex);
                    theCHAR.rawHex.value.push('0x' + rawHex2);

                    theCHAR.cvtDec.x.push(adjustedRawDec);
                    theCHAR.cvtDec.value.push(adjustedRawDec2);

                    theCHAR.phyDec.x.push(convertRaw2Phy(adjustedRawDec, conversionAxis, formatAxis));
                    theCHAR.phyDec.value.push(convertRaw2Phy(adjustedRawDec2, conversion, format));

                    theCHAR.byteOffset.x.push(dataAddr + bytesOfXPts + i * bytesOfXAxis);
                    theCHAR.byteOffset.value.push(dataAddr + bytesOfXPts + ptsOfValue * bytesOfXAxis + i * bytesOfValue);
                  }
                }
                break;
              case "MAP":
                break;
              default:
            }

            theCHAR.unit = unit;
          }
        }
        // sub functions end
      },

      writeDCM: function(func, defIncluded = true, refIncluded = true){
        let DCMstr =
            '* encoding="UTF-8"' + '\r\n'
          + '* DAMOS format'     + '\r\n'
          + '* Creation date: '  + new Date() + '\r\n'
          + 'KONSERVIERUNG_FORMAT 2.0' + '\r\n'
          ;

        const DIM = this.getNode();
        const FUNCs = DIM.FUNCTION;
        const CHARs = DIM.CHARACTERISTIC;
        this.readCHAR();

        let items = [];
        let theCHAR;

        if (FUNCs[func]){
          if (defIncluded && FUNCs[func].DEF_CHARACTERISTIC) items = items.concat(FUNCs[func].DEF_CHARACTERISTIC.children);

          if (refIncluded && FUNCs[func].REF_CHARACTERISTIC) items = items.concat(FUNCs[func].REF_CHARACTERISTIC.children);
        }

        for (const item of items) {
          theCHAR = CHARs[item];
          if (theCHAR.charType === 'VALUE'){
            const MATCH = theCHAR.phyDec.match(/^[0-9\.]+$/);
            const v = MATCH ? ('WERT ' + theCHAR.phyDec):('TEXT \"' + theCHAR.phyDec + '\"');

            DCMstr += (
              '\r\n'
              + 'FESTWERT ' + item + '\r\n'
              + ' ' + 'LANGNAME \"'  + theCHAR.description +  '\"\r\n'
              + ' ' + 'FUNKTION '  + func + '\r\n'
              + ' ' + 'EINHEIT_W \"' + theCHAR.unit + '\"\r\n'
              + ' ' + v + '\r\n'
              + 'END' + '\r\n'
              + '\r\n'
              );
          }
        }

        // ...... 写入DCM文本文件
        if (saveAs){
          saveAs(new Blob([DCMstr], {type: "text/plain;charset=utf-8"}), func+'.DCM');
        }
        return DCMstr;
      },

      getFuncDefAndRef: function(func){
        const DIM = this.getNode();
        const FUNCs = DIM.FUNCTION;
        const CHARs = DIM.CHARACTERISTIC;
        this.readCHAR();

        let items = [];
        let theCHAR;

        if (FUNCs[func]){
          if (FUNCs[func].DEF_CHARACTERISTIC) items = items.concat(FUNCs[func].DEF_CHARACTERISTIC.children);

          if (FUNCs[func].REF_CHARACTERISTIC) items = items.concat(FUNCs[func].REF_CHARACTERISTIC.children);
        }

        return items;
      },

      updateHEX: function(CHARname, value, overwrite=true){
        const CHARs = this.getNode('CHARACTERISTIC');
        let theCHAR = CHARs[CHARname];
        if (theCHAR && this.hexFile){
          if (theCHAR.phyDec === undefined) this.readCHAR(); //读取全部标定量和只读取一个，花费时间差不多
          if (theCHAR.byteOffset){
            switch (theCHAR.charType) {
              case 'VALUE':
                // ...... 前台更新hexData

                // ...... 后台更新HEX数据
                break;
              default:

            }
          }
        }
      },
      //
    };
    let lines = text.split('\n');
    let currentNode = out;
    let cls = 0,
        tokens,
        label,
        item,
        isPending = false;

    for (const [i,line] of lines.entries()){
      if (line.length > 0){
        // isPending == true, element name has not been found yet
        if (isPending){
          if (tokens = line.match(/[\w\[\]\.]+/)){
            let n = 0, k = tokens[0];
            if (currentNode.count) k = tokens[0] + currentNode.count;
            currentNode[k] = {type: isPending, name: k};
            currentNode[k].parent = currentNode;
            currentNode = currentNode[k];
            isPending = false;
          }

        // isPending == false, element name has been found.
        } else if ( (tokens = line.match(/\/begin\s+([\w\[\]\.]+)\s+([\w\.\[\]\"]*)/)) && (!line.match(/\/end/)) ){
          let k1 = tokens[1];
          let k2 = tokens[2];
          cls += 1;

          // AXIS_DESCR 特例，会在一个CHARACTERISTIC中出现多个AXIS_DESCR的子节点
          if (!currentNode[k1]) {
            if (k1 == 'AXIS_DESCR') currentNode[k1] = {count: 1};
            else currentNode[k1] = {};
            currentNode[k1].parent = currentNode;
          } else if (k1 == 'AXIS_DESCR'){ // treat it as pseudo array by add a attribute of count
            currentNode[k1].count += 1;
          }

          // 出现新节点，但没有名字
          if (k2.length == 0) {
            if (currentNode.type === 'FUNCTION'){
              currentNode[k1].children = [];
              currentNode[k1].type = k1;
              currentNode = currentNode[k1];
            }
            else {
              isPending = k1;
              currentNode = currentNode[k1];
            }
          }
          // 出现新节点，且有名字
          else {
            if (currentNode[k1].count) k2 += currentNode[k1].count;
            currentNode[k1][k2] = {type:k1, name:k2};
            currentNode[k1][k2].parent = currentNode[k1];
            currentNode = currentNode[k1][k2];
          }

        } else if ((line.match(/\/end/)) && (!line.match(/\/begin/))){
          cls -= 1;
          if (currentNode.parent) {
            if (currentNode.parent.type === 'FUNCTION') currentNode = currentNode.parent;
            else if (currentNode.parent.parent){
              currentNode = currentNode.parent.parent;
            }
          }
          else currentNode = out;
        } else if ( !(line.match(/\/begin/) || line.match(/\/end/) ) ) { // neither of begin, end, blank
          if (currentNode) feed(currentNode, currentNode.type, line);
          else console.log(i, line, line.length);

        }
      }

    }

    out.byte_order = out.getNode('BYTE_ORDER');


    function feed(node, type, line){
      line = line.replace(/(^\s*)|(\s*$)/g, ''); // remove blank at beginning and ending
      if (line.length > 0){
        switch (type) {
          case 'CHARACTERISTIC':
            if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
            else if (node.charType == undefined) {node.charType = line;break;}
            else if (node.address == undefined) {node.address = line;break;}
            else if (node.recordLayout == undefined) {node.recordLayout = line;break;}
            else if (node.maxDiff == undefined) {node.maxDiff = line;break;}
            else if (node.conversion == undefined) {node.conversion = line;break;}
            else if (node.lowerLimit == undefined) {node.lowerLimit = line;break;}
            else if (node.upperLimit == undefined) {node.upperLimit = line;break;}
            else {extra();break;}
          case 'AXIS_DESCR':
            if (node.inputQuantity == undefined) {node.inputQuantity = line;break;}
            else if (node.conversion == undefined) {node.conversion = line;break;}
            else if (node.maxAxisPoints == undefined) {node.maxAxisPoints = line;break;}
            else if (node.lowerLimit == undefined) {node.lowerLimit = line;break;}
            else if (node.upperLimit == undefined) {node.upperLimit = line;break;}
            else {extra();break;}
          case 'FUNCTION':
            if (node.description == undefined) {node.description = line;break;}
            else {extra();break;}
          // FUNCTION中的子节点使用相同的处理方法
          case 'DEF_CHARACTERISTIC':
          case 'IN_MEASUREMENT':
          case 'LOC_MEASUREMENT':
          case 'OUT_MEASUREMENT':
            const _temp = line.split(/\s/);
            if (_temp.length > 0){
              node.children?null:(node.children = []);
              _temp.map(function(value){
                (value.length > 0)?(node.children.push(value)):null;
              })
            }
            break;
          // FUNCTION 处理方法结束
          case 'MOD_PAR':
            handlerOfSYS_CONST();break;
          case 'MOD_COMMON':
            extra();break;
          case 'MEASUREMENT':
            if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
            else if (node.dataType == undefined) {node.dataType = line;break;}
            else if (node.conversion == undefined) {node.conversion = line;break;}
            else if (node.resolution == undefined) {node.resolution = line;break;}
            else if (node.accuracy == undefined) {node.accuracy = line;break;}
            else if (node.lowerLimit == undefined) {node.lowerLimit = line;break;}
            else if (node.upperLimit == undefined) {node.upperLimit = line;break;}
            else {extra();break;}
          case 'COMPU_METHOD':
            if (node.description == undefined)      {node.description = line.replace(/\"/g, '');break;}
            else if (node.conversion == undefined)  {node.conversion = line;break;}
            else if (node.format == undefined)      {node.format = line.replace(/\"/g, '');break;}
            else if (node.unit == undefined)        {node.unit = line.replace(/\"/g, '');break;}
            else {extra();break;}
          case 'COMPU_TAB':
            if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
            else if (node.conversion == undefined) {node.conversion = line;break;}
            else if (node.rowCount == undefined) {node.rowCount = line;break;}
            else {extra();break;}
          case 'COMPU_VTAB':
            if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
            else if (node.conversion == undefined) {node.conversion = line;break;}
            else if (node.count == undefined) {node.count = line;break;}
            else {extra();break;}
          case 'COMPU_VATBRANGE':
            break;
          case 'RECORD_LAYOUT':
            let tokens = line.split(/\s+/);
            if (tokens && tokens.length > 2) node[tokens[0]] = tokens[2];
            break;
          case 'AXIS_PTS':
            if (node.description == undefined) {node.description = line.replace(/\"/g, '');break;}
            else if (node.address == undefined) {node.address = line;break;}
            else if (node.inputQuantity == undefined) {node.inputQuantity = line;break;}
            else if (node.recordLayout == undefined) {node.recordLayout = line;break;}
            else if (node.maxDiff == undefined) {node.maxDiff = line;break;}
            else if (node.conversion == undefined) {node.conversion = line;break;}
            else if (node.maxAxisPoints == undefined) {node.maxAxisPoints = line;break;}
            else if (node.lowerLimit == undefined) {node.lowerLimit = line;break;}
            else if (node.upperLimit == undefined) {node.upperLimit = line;break;}
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
                    } else if (currentNode.type === 'FESTWERT') {
                      currentNode[key] = tokens[1];
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
      currentNode = (node[tokens[0]] = {type:key});

      if (key == 'FESTWERTEBLOCK'){
        if (tokens.length == 1) {currentNode.size_x = tokens[1];}
        if (tokens.length == 3) {currentNode.size_x = tokens[1]; currentNode.size_y = tokens[2];}
      } else if (key == 'FESTWERT'){
        // ==================
      } else if (key == 'FUNKTIONEN'){
        // ==================
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
    out.dataBlock = {};
    let lines = text.split(/\n/);
    let len = 0, dataBlock = {}, currentBlock, databytes, blockAddr, type, state = 'idle';
    for (const [i, _line_] of lines.entries()){
      line = $.trim(_line_);
      len = line.length;
      dataByteCount = parseInt(line.substr(1, 2), 16);
      blockAddr = line.substr(3, 4);
      type = line.substr(7, 2);
      dataLine = line.substr(9, len - 11);

      if (len == 15 && type == '04'){
        if (out['dataBlock'][dataLine] == undefined) out['dataBlock'][dataLine] = '';
        currentBlock = dataLine;
        state = 'push';
      } else if (state == 'push'){
        out.dataBlock[currentBlock] += dataLine;
      }
    }
  }
  else if ($FT == 'XML'){
    let $DOMParser = new DOMParser;
    out = $DOMParser.parseFromString(text, 'application/xml');
  }


  let t2 = performance.now();
  console.log((t2-t1)/1000);
  console.log(out);
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
