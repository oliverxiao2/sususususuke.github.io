var tableToExcel = (function() {
  var uri = 'data:application/vnd.ms-excel;base64,'
    , template = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>{worksheet}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>{$table$}</body></html>'
    , base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) }
    , format = function(s, c) { return s.replace(/{\$(\w+)\$}/g, function(m, p) { return c[p]; }) }
  return function(html, name) {
    var ctx = {worksheet: name || 'Worksheet', table: html};
    window.location.href = uri + base64(format(template, ctx));
  }
})();

const tableToEXCEL = function (name, ...tables){
  let sheetout = {[name]:{"!merges": [{
    "s": {
      "c": 0,
      "r": 0
    },
    "e": {
      "c": 2,
      "r": 0
    }
  }], "!ref": "A1:C10000"}};
  let workbook = {
    "SheetNames": [name],
    "Sheets": sheetout,
  };
  let workbook2 = {
    "SheetNames": [
      "Main"
    ],
    "Sheets": {
      "Main": {
        "!merges": [
          {
            "s": {
              "c": 0,
              "r": 0
            },
            "e": {
              "c": 2,
              "r": 0
            }
          }
        ],
        "A1": {
          "v": "This is a submerged cell",
          "s": {
            "border": {
              "left": {
                "style": "thick",
                "color": {
                  "auto": 1
                }
              },
              "top": {
                "style": "thick",
                "color": {
                  "auto": 1
                }
              },
              "bottom": {
                "style": "thick",
                "color": {
                  "auto": 1
                }
              }
            }
          },
          "t": "s"
        },
        "B1": {
          "v": "Pirate ship",
          "s": {
            "border": {
              "top": {
                "style": "thick",
                "color": {
                  "auto": 1
                }
              },
              "bottom": {
                "style": "thick",
                "color": {
                  "auto": 1
                }
              }
            }
          },
          "t": "s"
        },
        "C1": {
          "v": "Sunken treasure",
          "s": {
            "border": {
              "right": {
                "style": "thick",
                "color": {
                  "auto": 1
                }
              },
              "top": {
                "style": "thick",
                "color": {
                  "auto": 1
                }
              },
              "bottom": {
                "style": "thick",
                "color": {
                  "auto": 1
                }
              }
            }
          },
          "t": "s"
        },
        "A2": {
          "v": "Blank",
          "t": "s"
        },
        "B2": {
          "v": "Red",
          "s": {
            "fill": {
              "fgColor": {
                "rgb": "FFFF0000"
              }
            }
          },
          "t": "s"
        },
        "C2": {
          "v": "Green",
          "s": {
            "fill": {
              "fgColor": {
                "rgb": "FF00FF00"
              }
            }
          },
          "t": "s"
        },
        "D2": {
          "v": "Blue",
          "s": {
            "fill": {
              "fgColor": {
                "rgb": "FF0000FF"
              }
            }
          },
          "t": "s"
        },
        "E2": {
          "v": "Theme 5",
          "s": {
            "fill": {
              "fgColor": {
                "theme": 5
              }
            }
          },
          "t": "s"
        },
        "F2": {
          "v": "Theme 5 Tint -0.5",
          "s": {
            "fill": {
              "fgColor": {
                "theme": 5,
                "tint": -0.5
              }
            }
          },
          "t": "s"
        },
        "A3": {
          "v": "Default",
          "t": "s"
        },
        "B3": {
          "v": "Arial",
          "s": {
            "font": {
              "name": "Arial",
              "sz": 24,
              "color": {
                "theme": "5"
              }
            }
          },
          "t": "s"
        },
        "C3": {
          "v": "Times New Roman",
          "s": {
            "font": {
              "name": "Times New Roman",
              bold: true,
              underline: true,
              italic: true,
              strike: true,
              outline: true,
              shadow: true,
              vertAlign: "superscript",
              "sz": 16,
              "color": {
                "rgb": "FF2222FF"
              }
            }
          },
          "t": "s"
        },
        "D3": {
          "v": "Courier New",
          "s": {
            "font": {
              "name": "Courier New",
              "sz": 14
            }
          },
          "t": "s"
        },
        "A4": {
          "v": 0.618033989,
          "t": "n"
        },
        "B4": {
          "v": 0.618033989,
          "t": "n"
        },
        "C4": {
          "v": 0.618033989,
          "t": "n"
        },
        "D4": {
          "v": 0.618033989,
          "t": "n",
          "s": {
            "numFmt": "0.00%"
          }
        },
        "E4": {
          "v": 0.618033989,
          "t": "n",
          "s": {
            "numFmt": "0.00%",
            "fill": {
              "fgColor": {
                "rgb": "FFFFCC00"
              }
            }
          }
        },
        "A5": {
          "v": 0.618033989,
          "t": "n",
          "s": {
            "numFmt": "0%"
          }
        },
        "B5": {
          "v": 0.618033989,
          "t": "n",
          "s": {
            "numFmt": "0.0%"
          }
        },
        "C5": {
          "v": 0.618033989,
          "t": "n",
          "s": {
            "numFmt": "0.00%"
          }
        },
        "D5": {
          "v": 0.618033989,
          "t": "n",
          "s": {
            "numFmt": "0.000%"
          }
        },
        "E5": {
          "v": 0.618033989,
          "t": "n",
          "s": {
            "numFmt": "0.0000%"
          }
        },
        "F5": {
          "v": 0,
          "t": "n",
          "s": {
            "numFmt": "0.00%;\\(0.00%\\);\\-;@",
            "fill": {
              "fgColor": {
                "rgb": "FFFFCC00"
              }
            }
          }
        },
        "A6": {
          "v": "Sat Mar 21 2015 23:47:34 GMT-0400 (EDT)",
          "t": "s"
        },
        "B6": {
          "v": 42084.99137416667,
          "t": "n"
        },
        "C6": {
          "v": 42084.99137416667,
          "s": {
            "numFmt": "d-mmm-yy"
          },
          "t": "n"
        },
        "A7": {
          "v": "left",
          "s": {
            "alignment": {
              "horizontal": "left"
            }
          },
          "t": "s"
        },
        "B7": {
          "v": "center",
          "s": {
            "alignment": {
              "horizontal": "center"
            }
          },
          "t": "s"
        },
        "C7": {
          "v": "right",
          "s": {
            "alignment": {
              "horizontal": "right"
            }
          },
          "t": "s"
        },
        "A8": {
          "v": "vertical",
          "s": {
            "alignment": {
              "vertical": "top"
            }
          },
          "t": "s"
        },
        "B8": {
          "v": "vertical",
          "s": {
            "alignment": {
              "vertical": "center"
            }
          },
          "t": "s"
        },
        "C8": {
          "v": "vertical",
          "s": {
            "alignment": {
              "vertical": "bottom"
            }
          },
          "t": "s"
        },
        "A9": {
          "v": "indent",
          "s": {
            "alignment": {
              "indent": "1"
            }
          },
          "t": "s"
        },
        "B9": {
          "v": "indent",
          "s": {
            "alignment": {
              "indent": "2"
            }
          },
          "t": "s"
        },
        "C9": {
          "v": "indent",
          "s": {
            "alignment": {
              "indent": "3"
            }
          },
          "t": "s"
        },
        "A10": {
          "v": "In publishing and graphic design, lorem ipsum is a filler text commonly used to demonstrate the graphic elements of a document or visual presentation. ",
          "s": {
            "alignment": {
              "wrapText": 1,
              "horizontal": "right",
              "vertical": "center",
              "indent": 1
            }
          },
          "t": "s"
        },
        "A11": {
          "v": 41684.35264774306,
          "s": {
            "numFmt": "m/d/yy"
          },
          "t": "n"
        },
        "B11": {
          "v": 41684.35264774306,
          "s": {
            "numFmt": "d-mmm-yy"
          },
          "t": "n"
        },
        "C11": {
          "v": 41684.35264774306,
          "s": {
            "numFmt": "h:mm:ss AM/PM"
          },
          "t": "n"
        },
        "D11": {
          "v": 42084.99137416667,
          "s": {
            "numFmt": "m/d/yy"
          },
          "t": "n"
        },
        "E11": {
          "v": 42065.02247239584,
          "s": {
            "numFmt": "m/d/yy"
          },
          "t": "n"
        },
        "F11": {
          "v": 42084.99137416667,
          "s": {
            "numFmt": "m/d/yy h:mm:ss AM/PM"
          },
          "t": "n"
        },
        "A12": {
          "v": "Apple",
          "s": {
            "border": {
              "top": {
                "style": "thin"
              },
              "left": {
                "style": "thin"
              },
              "right": {
                "style": "thin"
              },
              "bottom": {
                "style": "thin"
              }
            }
          },
          "t": "s"
        },
        "C12": {
          "v": "Apple",
          "s": {
            "border": {
              "diagonalUp": 1,
              "diagonalDown": 1,
              "top": {
                "style": "dashed",
                "color": {
                  "auto": 1
                }
              },
              "right": {
                "style": "medium",
                "color": {
                  "theme": "5"
                }
              },
              "bottom": {
                "style": "hair",
                "color": {
                  "theme": 5,
                  "tint": "-0.3"
                }
              },
              "left": {
                "style": "thin",
                "color": {
                  "rgb": "FFFFAA00"
                }
              },
              "diagonal": {
                "style": "dotted",
                "color": {
                  "auto": 1
                }
              }
            }
          },
          "t": "s"
        },
        "E12": {
          "v": "Pear",
          "s": {
            "border": {
              "diagonalUp": 1,
              "diagonalDown": 1,
              "top": {
                "style": "dashed",
                "color": {
                  "auto": 1
                }
              },
              "right": {
                "style": "dotted",
                "color": {
                  "theme": "5"
                }
              },
              "bottom": {
                "style": "mediumDashed",
                "color": {
                  "theme": 5,
                  "tint": "-0.3"
                }
              },
              "left": {
                "style": "double",
                "color": {
                  "rgb": "FFFFAA00"
                }
              },
              "diagonal": {
                "style": "hair",
                "color": {
                  "auto": 1
                }
              }
            }
          },
          "t": "s"
        },
        "A13": {
          "v": "Up 90",
          "s": {
            "alignment": {
              "textRotation": 90
            }
          },
          "t": "s"
        },
        "B13": {
          "v": "Up 45",
          "s": {
            "alignment": {
              "textRotation": 45
            }
          },
          "t": "s"
        },
        "C13": {
          "v": "Horizontal",
          "s": {
            "alignment": {
              "textRotation": 0
            }
          },
          "t": "s"
        },
        "D13": {
          "v": "Down 45",
          "s": {
            "alignment": {
              "textRotation": 135
            }
          },
          "t": "s"
        },
        "E13": {
          "v": "Down 90",
          "s": {
            "alignment": {
              "textRotation": 180
            }
          },
          "t": "s"
        },
        "F13": {
          "v": "Vertical",
          "s": {
            "alignment": {
              "textRotation": 255
            }
          },
          "t": "s"
        },
        "A14": {
          "v": "Font color test",
          "s": {
            "font": {
              "color": {
                "rgb": "FFC6EFCE"
              }
            }
          },
          "t": "s"
        },
        "!ref": "A1:F14"
      }
    }
  }
  const defaultCellStyle = { font: { name: "Verdana", sz: 11, color: "FF00FF88"}, fill: {fgColor: {rgb: "FFFFAA00"}}};

  let currentRow = 0;
  for (const table of tables){
    let rows = $(table).find('tr');
    let rowCount = rows.length;

    for (let i=0; i<rowCount; i++){
      currentRow++;
      let cells = $(rows[i]).find('td, th');

      for (let j=0; j < cells.length; j++){

        currentCOL = columnIndexConverter(j+1);
        /*
          v: raw value
          w: formatted text (if applicable)
          t: cell type: b=Boolean, n=Number, e=error, s=String, d=date
          f: cell formula encoded as an A1-style string(if applicable)
          F: range of enclosing array if formula is array formula(if applicable)
          r: rich text encoding (if applicable)
          h: HTML rendering of the rich text (if applicable)
          c: comments assocaited with the cell
          z: number format string associated with the cell (if requested)
          l: cell hyperlink object (.Target holds link, .Tooltip is tooltip)
          s: the style/theme of the cell (if applicable)
        */
        sheetout[name][currentCOL+currentRow] = {
          "v": cells[j].innerText,
          "s": defaultCellStyle,
          "t": "s",
        }

      }
    }

  }

  const wopts = { bookType:'xlsx', bookSST:true, type:'binary', cellStyles: true, defaultCellStyle: defaultCellStyle};
  console.log(workbook, workbook2);
  wbout = XLSX.write(workbook, wopts);
  function s2ab(s) {
    var buf = new ArrayBuffer(s.length);
    var view = new Uint8Array(buf);
    for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }
  saveAs(new Blob([s2ab(wbout)],{type:"application/octet-stream"}), "test.xlsx");

  return workbook;
};

const sheetToJSON = function(sheet){
  if (sheet){
    if (sheet['!ref']){
      const D = getRowAndColumn(sheet['!ref']);
      const ColumnFrom = D.ColumnFrom,
            ColumnTo = D.ColumnTo,
            RowFrom =  D.RowFrom,
            RowTo = D.RowTo;

      if (ColumnFrom && ColumnTo && RowFrom && RowTo){
        let returnValue = {};

        for (let i = RowFrom; i <= RowTo; i++){

          if (i === RowFrom){

          } else {
            returnValue[sheet["B"+i].v] = {
              'index': sheet["A"+i].v,
              'DFC': sheet["B"+i].v,
              'Pcode': sheet["C"+i]?sheet["C"+i].v:'',
              'DTC': sheet['D'+i]?sheet['D'+i].v:'',
              'descriptionOfDTC_EN': sheet['E'+i]?sheet['E'+i].v:'',
              'description_CN': sheet['F'+i]?sheet['F'+i].v:'',
              'ctlMsk': sheet['G'+i]?sheet['G'+i].v:'',
              'disblMsk': sheet['H'+i]?sheet['H'+i].v:'',
              'responsible': sheet['I'+i]?sheet['I'+i].v:'',
              'class': sheet['J'+i]?sheet['J'+i].v:'',
            }

          }
        }

        return returnValue;
      }
    }
  }
};

function columnIndexConverter(n){
  if (typeof(n) === 'string'){
    let output = 0,
        len = n.length,
        v = 0,
        s = n.toUpperCase();
    for (const i in s){
      v = s[i].charCodeAt() - 64;
      output += Math.pow(26, len - 1 - i) * v;
    }
    return output;
  } else if (n && typeof(n) === 'number'){
    let output = '';
    let _str = n.toString(26).split('');

    for (let i = _str.length-1; i>=0; i--){
      _str[i] = parseInt(_str[i], 26);
      // Excel的列表示法中，没有0的概念，必须通过降位将0替换掉
      if (_str[i] === 0) {
        if (i === 0){
          _str.shift();
        } else {
          _str[i]   = 26;
          _str[i-1] -= 1;
        }
      }
    }

    for (let i = 0; i < _str.length; i++){
      output += String.fromCharCode(_str[i] + 64);
    }
    return output;
  }
  return null;
}

function getRowAndColumn(refStr){
  if (refStr.length > 0){
    const M = refStr.match(/^([A-Z]+)([0-9]+)\:([A-Z]+)([0-9]+)$/);
    if (M){
      return {
        ColumnFrom: M[1],
        ColumnTo: M[3],
        RowFrom: parseInt(M[2]),
        RowTo: parseInt(M[4]),
      };
    }
  }

  return {};
}
