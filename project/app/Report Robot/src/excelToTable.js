function sheetToTable(sheet){
  if (typeof sheet['!ref'] === 'string'){
    let ref = sheet['!ref'].split(':');

    if (ref.length == 2){
      let from = ref[0].match(/^([A-Z]+)([0-9]+)$/),
          to   = ref[1].match(/^([A-Z]+)([0-9]+)$/),
          colMin, colMAX, rowMin, rowMax, rowCount,
          tableHTML = '', thHTML = '', trHTML = '', tbodyHTML = '',
          currentCell;

      if (from && to){
        colMin = from[1]; colMin_num = convertColumnMark(colMin);
        colMax = to[1]; colMax_num = convertColumnMark(colMax);
        colCount = colMax_num - colMin_num;

        rowMin = parseInt(from[2]);
        rowMax = parseInt(to[2]);
        rowCount = rowMax -rowMin;

        for (let i = rowMin; i <= rowMax; i++){
          trHTML = '<tr>';

          for (let j = colMin_num; j<= colMax_num; j++){
            currentCell = sheet[convertColumnMark(j)+i];

            if (i == rowMin) thHTML += '<td>' + currentCell?currentCell.v:''  + '</td>';
            else trHTML += '<td>' + currentCell?currentCell.v:''  + '</td>';
          }

          trHTML += '</tr>';
          tbodyHTML += trHTML;
        }


        tableHTML = '<table>' + thHTML + tbodyHTML + '</table>';
        return tableHTML;
      }
    }
  }
}

function convertColumnMark(mark){
  let output;

  if (mark && typeof(mark) === 'string'){
    output = 0,
    len = mark.length,
    v = 0,
    s = mark.toUpperCase();
    for (const i in s){
      v = s[i].charCodeAt() - 64;
      output += Math.pow(26, len - 1 - i) * v;
    }
  } else if (mark && typeof(mark) === 'number'){
    output = '';
    let d26 = mark.toString(26);
    for (const i of d26){
      let i_dec10 = parseInt(i, 26);
      output += String.fromCharCode(i_dec10 + 64);
    }
  } else {output = null;}

  return output;
}
