function jsonToTreeTable(json, container){

  let tableID = ('table_' + performance.now()).replace('.', '_');
  let tableHTML = `
    <table id='`+ tableID +`'>
      <tbody>
  `;

  let jsonArray = jsonToArray(json);

  for(const [i, row] of jsonArray.entries()){
    let rowHTML = `
    <tr class='jsonTableRow jsonTable-tr-expand' data-row-id='`+i+`' data-json-level='`+row.level+`'>
      <td>
        <table style='margin-left:{$decent$}px;'>
          <tbody>
            <tr>
              <td><div class='arrow-down' onclick='jsonTableExpandToggle(this, "`+ tableID +`")'></div></td>
              <td><span>{$key$}</span></td>
              <td><span>{$children$}</span></td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
    `;
    rowHTML = rowHTML.replace('{$decent$}', row.level*20)
              .replace('{$key$}', row.key)
              .replace('{$children$}', row.children?('{nodes='+row.children+'}'):(': '+row.value));
    tableHTML += rowHTML;
  }
  tableHTML += '</tbody></table>';

  if (container == undefined) return tableHTML;
  else if (typeof container == 'string') $('#'+container).html(tableHTML);
  else if (typeof container.jquery == 'string') container.html(tableHTML);
  else container.innerHTML = tableHTML;
}

function jsonTableExpandToggle(btn, tableID){
  let rows = $('#'+tableID).find('.jsonTableRow');
  let clicked_row = $(btn).parent().parent().parent().parent().parent().parent();
  let clicked_row_hide = $(btn).hasClass('arrow-right');
  let clicked_row_id = parseInt(clicked_row.attr('data-row-id'));
  let clicked_row_level = parseInt(clicked_row.attr('data-json-level'));
  console.log(clicked_row_hide, clicked_row)
  $(btn).toggleClass('arrow-down').toggleClass('arrow-right');

  for(const row of rows){
    let current_row_id = row.getAttribute('data-row-id');
    let current_row_level = row.getAttribute('data-json-level');

    if(current_row_id > clicked_row_id){
      if (current_row_level > clicked_row_level && current_row_level < clicked_row_level + 2){
        if (clicked_row_hide) $(row).removeClass('json-tr-collasped');
        else $(row).addClass('json-tr-collasped');

      } else {break;}
    }
  }
}

function jsonToArray(json){
  let output = [];
  let element = {
    cls: 0,
    key: '',
    datatype: '',
    children: 0
  };

  function p(json, level){

    for (const nodename in json){
      let datatype = typeof json[nodename];

      if ( datatype === 'object'){
        output.push({
          key: nodename,
          datatype: 'object',
          children: Object.keys(json[nodename]).length,
          level: level+1
        });
        p(json[nodename], level+1);
      } else {
        output.push({
          key: nodename,
          datatype: datatype,
          value: json[nodename],
          level: level+1
        });
      }
    }
  };

  p(json, -1);

  return output;
}

function jsonToULDOM(json, container){
  let output = document.createElement('ul');
  output.className = 'json-ul-tree';

  function p(json, node){
    let datatype;
    for (const key in json){
      datatype = typeof json[key];

      if (key != 'parent'){ //avoid dead-lock loop
        let li = document.createElement('li');

        if (datatype == 'object'){
          li.innerHTML = '<div class="toggler icon-expand" onclick="jsonToULDOM_expandToggler(this)"></div><span class="keyname">' + key + '</span>:<span class="childrenCount">(' + Object.keys(json[key]).length + ')</span>';

          let subUL = document.createElement('ul');
          li.append(subUL);
          p(json[key], subUL);
        } else {
          li.innerHTML = '<div class="icon-blank"></div><span class="keyname">' + key + '</span>:<span class="keyvalue-'+datatype+'">' + json[key] + '</span>';
        }

        node.append(li);
      }
    }
  }

  p(json, output);

  if (container == undefined) return output;
  else if (typeof container == 'string') document.querySelector('#'+container).append(output);
  else if (typeof container == 'object') container.append(output);
}

function jsonToULDOM_expandToggler(btn){
  let node = btn.parentNode.lastChild;
  if (node.tagName == 'UL'){
    if (!node.className.match(/\bhide\b/)){
      node.className += ' hide';
    } else {
      node.className = node.className.replace('hide', '');
    }

    if (btn.className.match(/\bicon\-expand\b/)){
      btn.className = btn.className.replace('icon-expand', 'icon-collapse');
    } else{
      btn.className = btn.className.replace('icon-collapse', 'icon-expand');
    }
  }
}

function jsonToDetailTree(json, container, title){
  let output = document.createElement('details');
  let flatableJSON = {};
  let rootSummary = document.createElement('summary');
  rootSummary.innerHTML = title?title:'查看文件详细信息';
  output.append(rootSummary);

  function p(json, node, flatableJSONNode){
    let datatype, newNode, newFlatableNode;
    for (const key in json){
      datatype = typeof json[key];
      if (key != 'parent'){
        if (key == 'lastModifiedDate'){ //datatype=='object', treat it as an attribute
          newNode = document.createElement('p');
          newNode.innerHTML = key + ': &quot;' + json[key] + '&quot;';
        }
        else if (datatype == 'object' && json[key] != null){ // maybe {} or []
          if ((typeof json[key].toString == 'function') && (json[key].toString() == '[object Object]')){ // {}
            newFlatableNode = {};
          } else if (typeof json[key].entries == 'function'){ // []
            newFlatableNode = [];
          }
          newNode = document.createElement('details');
          subSummary = document.createElement('summary');
          subSummary.onclick = function(){console.log(this);}
          subSummary.innerHTML = key;
          newNode.append(subSummary);
          p(json[key], newNode, newFlatableNode);
        } else {
          newNode = document.createElement('p');
          newFlatableNode = json[key];

          if (datatype == 'string') newNode.innerHTML = key + ': &quot;' + json[key] + "&quot;";
          else newNode.innerHTML = key + ': ' + json[key];
        }
        newNode.setAttribute('draggable', true);
        node.append(newNode);
        flatableJSONNode[key] = newFlatableNode;
      }
    }
  }

  p(json, output, flatableJSON);

  if (container == undefined) return [output, flatableJSON];
  else if (typeof container == 'string') {
    $('#'+container).empty();
    document.querySelector('#'+container).append(output);
    console.log(flatableJSON);
    return flatableJSON;
  }
}

function myDataTable(datatype, data, container, opt){
  let c;
  if (datatype === 'DCM') {
    c = [
      'name', 'TEXT'
    ];
  } else if (datatype === 'A2L'){
    c = [
      'name', 'description'
    ];
  }
  const w = [
    'width:20%;', 'width:80%;'
  ];
  let root_wrapper = document.createElement('div');
  // head <start>
  let head_wrapper = document.createElement('div');
  head_wrapper.setAttribute("role", "table-head")
  let head_table = document.createElement('table');
  head_table.className = 'table-head'
  head_table.style = 'table-layout:fixed;width:100%;'
  let head_tr = document.createElement('tr');
  var colgroup = document.createElement('colgroup');
  let tbody, col, th, tr, td, value;
  for (const [i, attr] of c.entries()){
    col = document.createElement('col');
    col.style=w[i];
    colgroup.append(col);

    th = document.createElement('th');
    th.innerHTML = attr;
    $(th).addClass((i==0)?'key-column':'value-column');

    head_tr.append(th);
  }
  let corner = document.createElement('th');
  corner.className = 'corner';
  head_tr.append(corner);
  head_table.append(colgroup);

  tbody = document.createElement('tbody');
  tbody.append(head_tr);
  head_table.append(tbody);
  head_wrapper.append(head_table);
  // head <end>
  // data <start>
  let data_wrapper = document.createElement('div');
  data_wrapper.setAttribute("role", "table-data");
  data_wrapper.style = 'flex:1;overflow-y:scroll;'
  let data_table = document.createElement('table');
  cg2 = colgroup.cloneNode(true);
  data_table.style = 'table-layout:fixed;width:100%;'
  data_table.append(cg2);
  tbody = document.createElement('tbody')
  let i = 0;
  for (const name in data){
    if (name != 'parent'){
      tr = document.createElement('tr');
      tr.setAttribute('data-stripe', ((i++)%2==0)?'even':'odd');
      const fields = Object.keys(data[name]);

      for (const [j, attr] of c.entries()){
        value = data[name][attr]?data[name][attr]:name;
        td = document.createElement('td');
        td.innerHTML = value;
        td.setAttribute('title', value);
        td.setAttribute('data-field', attr);
        td.className = 'single-row-height';
        td.addEventListener('dblclick', function(){$(this).addClass('editing');});
        td.addEventListener('blur', function(){
          $global.modifiedCell = $(this);
          console.log($(this).css('display'));
          let text = $(this).text();
          $(this).empty();
          $(this).removeClass('editing');
          $(this).html(text);
          $(this).css('display', 'table');
          setTimeout("fixCell()", 0)
          console.log($(this));
          //$(this)[0].style = 'display: block;'
        });
        $(td).addClass((j==0)?'key-column':'value-column');
        tr.append(td);
      }

      tbody.append(tr);
    }
  }
  data_table.append(tbody);
  data_wrapper.append(data_table);
  // data <end>
  root_wrapper.append(head_wrapper);
  root_wrapper.append(data_wrapper);
  root_wrapper.className = 'table-wrapper';
  if (container) container.append(root_wrapper);
  else return root_wrapper;
}

function table(data, column, container){
  const datatype = data.constructor.name;
  if (datatype === 'Array'){
    for (const item of data){

    }
  } else if (datatype === 'Object') {

  }

  function row(data){
    const datatype = data.constructor.name;
    if (datatype === 'Array'){
      for (const item of Array){

      }
    }
  }
}

function fixCell(){
  $global.modifiedCell.css('display', 'table-cell');
}
