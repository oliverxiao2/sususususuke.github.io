'use strict'

$.globalStorage = {
    selectedFileExplorerNode: null,
    selectedFileExplorerFile: null,
    files: {},
    range: null,
    charts: [],
    activeChart: null,
    selectedCursor: null,
    pagedDoc: new pagedDoc($('#tab-document')[0]),
    pagedDocTemplateQuery: [],
    broadcastUpdatePagedDoc: function(){
      const content = $.globalStorage.pagedDoc.content;
      // update the document structure in region west
      let pageTreeData, fileTreeData, chartTreeData;
      pageTreeData = [];
      fileTreeData = [];
      chartTreeData= [];
      for (const [i, page] of content.pageBody.entries()){
        pageTreeData.push({
          text: '<a onclick="$($(\'#tab-document\').children()[0]).scrollTo($(\'#'+page.pageId+'\'), 400)">第'+(i+1)+'页<a>',
        });
      }

      for (const [i, chart] of content.charts.entries()){
        chartTreeData.push({
          text: '<a onclick="$($(\'#tab-document\').children()[0]).scrollTo($(\'#'+chart.id+'\'), 400)">'+(chart.title?chart.title:'插图'+(i+1))+'<a>',
        });
      }
      for (const file of content.files){
        fileTreeData.push({text: file.name});
      }
      $('#tree-document-structure').tree('loadData',
        [{
          text: '页面',
          children: pageTreeData,
        },{
          text: '数据源',
          children: (fileTreeData.length>0)?fileTreeData:[{text: '空'}],
        },{
          text: '插图',
          children: (chartTreeData.length>0)?chartTreeData:[{text: '空'}],
        }]
      );


      // update the chart select in window of algorithm
      $('#w-document-algorithm-bind').empty();
      for (const [i, chart] of content.charts.entries()){
        $('#w-document-algorithm-bind').append('<option value="' + chart.id + '">' + (chart.title?chart.title:'插图'+(i+1))+ '</option>')
      }
    },
    algorithmObjList: {},
    selectedAlgorithm: null,
    testChannel: [],
    broadcastUpdateChartPropPanel: function($pgID){
      if ($ && $.globalStorage && $.globalStorage.activeChart){
        const chart = $.globalStorage.activeChart;
        const data = $.globalStorage.activeChart.plot.data;
        let rows = [], groupIndex = 0;
        for (const filename in data){
          for (const group of data[filename].dataGroup){
            groupIndex++;
            for (const channel of group.channels){
              rows.push({
                name: '通道名称',
                value: channel.name,
                group: 'Group'+groupIndex,
              });
            }
          }
        }

        $('#'+$pgID).propertygrid('loadData', {
          rows: rows,
        });
      }
    },
    broadcastUpdateChartDataTree: function($treeID){
      if ($.globalStorage.activeChart){
        const chart = $.globalStorage.activeChart;
        const data = $.globalStorage.activeChart.plot.data;
        let d=[], groupIndex = 0;
        for (const filename in data){
          for (const group of data[filename].dataGroup){
            groupIndex++;
            const dg = {
              text: 'Group' + groupIndex,
              children: [],
            };
            d.push(dg);
            for (const channel of group.channels){
              dg.children.push({
                text: channel.name,
              });
            }
          }
        }

        $('#'+$treeID).tree({data:d})
      }
    },
};
for (let i=0; i<100; i++){
  $.globalStorage.testChannel.push({
    time: [],
    value: [],
  });

  if (i<10){
    for (let j=1; j<=1000; j++){
      $.globalStorage.testChannel[i].time.push(j);
      $.globalStorage.testChannel[i].value.push(Math.round(Math.random()));
    }
  }


}

/*

*/

$('#ac-file-explorer').contextmenu(function(e){
  e.preventDefault();
  $('#mm').menu('show',{left: e.pageX,top: e.pageY});
});

$('#file-explorer').tree({
    onClick: function (node) {
        $.globalStorage.selectedFileExplorerNode = node;

        if (node.text.match(/\.dat$/)){
            if ($.globalStorage.files[node.text]){
                const file = $.globalStorage.files[node.text];
                $.globalStorage.selectedFileExplorerFile = file;

                const mdf = file.data;
                const channels = mdf.searchChannelsByRegExp(/.*/);
                let data = [];
                for (const channel of channels){
                    data.push({
                        label: channel.shortSignalName,
                        value: channel.shortSignalName,
                        //sampleRate: channel.samplingRate,
                    });

                }
                $('#w-document-chart-data-input-manual').tagbox({
                    data: data,
                })
            }
        }
    },
});

$('#input-file').change(function(){
    const files = this.files;

    for (const file of files){
        const filenames = Object.keys($.globalStorage.files);
        if (filenames.indexOf(file.name) === -1){
            let fileType = '';
            let _m = file.name.match(/\.([\w]+)$/);
            if (_m && (typeof _m[1] === 'string')) fileType = _m[1].toUpperCase();

            if (fileType.match(/DAT|MDF/)){
                const reader = new FileReader;
                reader.readAsArrayBuffer(file);
                reader.onload = function(e){
                    const arraybuffer = e.target.result;
                    const mdf = new MDF(arraybuffer, false);

                    if (mdf){
                        $('#file-explorer').tree('append', {
                            parent: $.globalStorage.selectedFileExplorerNode?$.globalStorage.selectedFileExplorerNode.target:null,
                            data:[{text: file.name}],
                        });

                        file.data = mdf;
                        file.fileType = fileType;
                        $.globalStorage.files[file.name] = file;
                    }
                }
            }
            else if (fileType.match(/JSON/)){
              const reader = new FileReader;
              reader.readAsText(file);
              reader.onload = function(e){
                  const text = e.target.result;
                  const json = JSON.parse(text);

                  if (json){
                      $('#file-explorer').tree('append', {
                          parent: $.globalStorage.selectedFileExplorerNode?$.globalStorage.selectedFileExplorerNode.target:null,
                          data:[{text: file.name}],
                      });

                      file.data = json;
                      $.globalStorage.files[file.name] = json;
                      $.globalStorage.pagedDocTemplateQuery.push(json);
                  }
              }
            }
        } else {
            alert('该文件已存在');
        }

    }
});

$('#tab-document').bind('contextmenu', function(e){
    e.preventDefault();
    $('#mm-document').menu('show', {
        left: e.pageX,
        top: e.pageY
    });
    })
.click(function(){
  if (window.getSelection){
      $.globalStorage.range = window.getSelection().getRangeAt(0);
  }
});

$('#mm-document-create-page-start').click(function(){
  $.globalStorage.pagedDoc.append('start');
});

$('#mm-document-create-page-end').click(function(){
  $.globalStorage.pagedDoc.append('end');
});

$('#mm-document-create-page-before').click(function(){
  $.globalStorage.pagedDoc.append('before');
});

$('#mm-document-create-page-after').click(function(){
  $.globalStorage.pagedDoc.append('after');
});

$('#mm-document-create-table').click(function(){
  const range = $.globalStorage.range;
    if (range){
      let rowCount = prompt('输入行数', '2');
      let columnCount = prompt('输入列数', '5');
      rowCount = parseInt(rowCount); columnCount = parseInt(columnCount);

      let tableInnerHTML = '', trHTML;
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.tableLayout = 'fixed';
      table.style.borderSpacing = 0;
      table.style.borderCollapse = 'collapse';
      table.border = 1;
      for (let i = 1; i <= rowCount; i++) {
        trHTML = '<tr>';
        for (let j = 1; j <= columnCount; j++){
          trHTML += '<td> </td>';
        }
        trHTML += '</tr>';
        tableInnerHTML += trHTML;
      }
      table.innerHTML = tableInnerHTML;
      const before = document.createElement('div');
      before.innerHTML = '<br>';
      const after = document.createElement('div');
      after.innerHTML = '<br>'
      range.insertNode(before);
      range.insertNode(table);
      range.insertNode(after);
      $(table).tableMergeCells().tableresize();
    }
});

$('#mm-document-create-chart').click(function () {
    if ($.globalStorage.range){
        const range = $.globalStorage.range;

        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.height = prompt('图表高度', '30%');
        wrapper.style.padding = 0;
        wrapper.style.margin = 0;
        wrapper.style.display = 'block';
        wrapper.style.position = 'relative';

        const before = document.createElement('div');
        before.innerHTML = '&nbsp;';
        range.insertNode(before);

        range.insertNode(wrapper);
        $.globalStorage.charts.push(new chart(wrapper));

        const after = document.createElement('div');
        after.innerHTML = '&nbsp;'
        range.insertNode(after);

        $.globalStorage.pagedDoc.save();
    }
});

$('#mm-document-chart-data').click(function(){
    $('#w-document-chart-data').window('open');
    $.globalStorage.broadcastUpdateChartDataTree('w-document-chart-tree');
});

$('#w-document-chart-data-btn-update').click(function(){
    const groups = $('#w-document-chart-tree').data().tree.data;
    let str = '', groupStr;
    if (groups){
        for (const group of groups){
            groupStr = '[';
            for (const channel of group.children){
                groupStr += '"' + channel.text.replace(/\\/, '\\\\') + '",';
            }
            groupStr = groupStr.substr(0, groupStr.length-1);
            groupStr += ']';
            str += groupStr + ',';
        }
        str = str.substr(0, str.length-1);
        console.log(str);
        const activeChart = $.globalStorage.activeChart;
        const file = $.globalStorage.selectedFileExplorerFile;
        const filename = $.globalStorage.selectedFileExplorerNode;
        if (activeChart && file){
          if( eval('activeChart.plot.bindMDF($.globalStorage.selectedFileExplorerFile, [' + str + '] )') ){
            if (activeChart.plot.draw2({niceTimeDomain:true, niceValueDomain: true,})){
              let hasAlready = false;
              for (const datasource of $.globalStorage.pagedDoc.content.files){
                if (file.name == datasource.name) hasAlready = true;
              }
              if (!hasAlready){
                $.globalStorage.pagedDoc.content.files.push({
                  name: file.name,
                  type: file.fileType,
                });
                $.globalStorage.broadcastUpdatePagedDoc();
              }
            }
          }
        }
    }
});

$('#mm-document-chart-clear-shadow').click(function () {
    const chart = $.globalStorage.activeChart;
    if (chart){
        chart.legendTable.getContext('2d').fillText('', 0, 0);
    }
});

$('#w-document-chart-data-btn-add').click(function () {
    const channels = $('#w-document-chart-data-input-manual').val().split(',');
    const tree = $('#w-document-chart-tree');
    const node = tree.tree('getSelected');
    let group, data = [];

    if (channels.length > 0){
        for (const channel of channels){
            data.push({
                text: channel,
            });
        }

        const groupCount = tree.children().length;
        const lastGroupNodeTarget = tree.children()[groupCount-1]?tree.children()[groupCount-1].firstChild:null;

        if ((!node) || (node.text && node.text.match(/^Group/))){
            tree.tree('insert', {
                after: lastGroupNodeTarget,
                data: {
                    text: 'Group ' + (groupCount+1),
                    children: data,
                },
            });
        } else {
            group = tree.tree('getParent', node.target);

            tree.tree('append', {
                parent: group.target,
                data: data,
            });
        }
    }
});

$('#mm-document-save').click(function(){
  $.globalStorage.pagedDoc.save();
});

$('#mm-document-save-as-word').click(function(){
  $.globalStorage.pagedDoc.export('word');
});

$('#mm-document-save-as-json').click(function(){
  $.globalStorage.pagedDoc.export('json');
});

$.fn.tableMergeCells = function () {
    //***请保留原作者相关信息
    //***power by showbo,http://www.w3dev.cn
    return this.each(function () {
        var tb = $(this), startTD, endTD, MMRC = { startRowIndex: -1, endRowIndex: -1, startCellIndex: -1, endCellIndex: -1 };
        //初始化所有单元格的行列下标内容并存储到dom对象中
        tb.find('tr').each(function (r) { $('td', this).each(function (c) { $(this).data('rc', { r: r, c: c }); }) });
        //添加表格禁止选择样式和事件
        //tb.addClass('cannotselect').bind('selectstart', function () { return false });
        //选中单元格处理函数
        function addSelectedClass() {
            var selected = false,  rc,t;
            tb.find('td').each(function () {
                rc = $(this).data('rc');
                //判断单元格左上坐标是否在鼠标按下和移动到的单元格行列区间内
                selected = rc.r >= MMRC.startRowIndex && rc.r <= MMRC.endRowIndex && rc.c >= MMRC.startCellIndex && rc.c <= MMRC.endCellIndex;
                if (!selected && rc.maxc) {//合并过的单元格，判断另外3（左下，右上，右下）个角的行列是否在区域内
                    selected =
                        (rc.maxr >= MMRC.startRowIndex && rc.maxr <= MMRC.endRowIndex && rc.c >= MMRC.startCellIndex && rc.c <= MMRC.endCellIndex) ||//左下
                        (rc.r >= MMRC.startRowIndex && rc.r <= MMRC.endRowIndex && rc.maxc >= MMRC.startCellIndex && rc.maxc <= MMRC.endCellIndex) ||//右上
                        (rc.maxr >= MMRC.startRowIndex && rc.maxr <= MMRC.endRowIndex && rc.maxc >= MMRC.startCellIndex && rc.maxc <= MMRC.endCellIndex);//右下

                }
                if (selected)  this.className = 'selected';
            });
            var rangeChange = false;
            tb.find('td.selected').each(function () { //从已选中单元格中更新行列的开始结束下标
                rc = $(this).data('rc');
                t = MMRC.startRowIndex;
                MMRC.startRowIndex = Math.min(MMRC.startRowIndex, rc.r);
                rangeChange = rangeChange || MMRC.startRowIndex != t;

                t = MMRC.endRowIndex;
                MMRC.endRowIndex = Math.max(MMRC.endRowIndex, rc.maxr || rc.r);
                rangeChange = rangeChange || MMRC.endRowIndex != t;

                t = MMRC.startCellIndex;
                MMRC.startCellIndex = Math.min(MMRC.startCellIndex, rc.c);
                rangeChange = rangeChange || MMRC.startCellIndex != t;

                t = MMRC.endCellIndex;
                MMRC.endCellIndex = Math.max(MMRC.endCellIndex, rc.maxc || rc.c);
                rangeChange = rangeChange || MMRC.endCellIndex != t;
            });
            //注意这里如果用代码选中过合并的单元格需要重新执行选中操作
            if (rangeChange) addSelectedClass();
        }
        function onMousemove(e) {//鼠标在表格单元格内移动事件
            e = e || window.event;
            var o = e.srcElement || e.target;
            if (o.tagName == 'TD') {
                endTD = o;
                var sRC = $(startTD).data('rc'), eRC = $(endTD).data('rc'), rc;
                MMRC.startRowIndex = Math.min(sRC.r, eRC.r);
                MMRC.startCellIndex = Math.min(sRC.c, eRC.c);
                MMRC.endRowIndex = Math.max(sRC.r, eRC.r);
                MMRC.endCellIndex = Math.max(sRC.c, eRC.c);
                tb.find('td').removeClass('selected');
                addSelectedClass();
            }
        }
        function onMouseup(e) {//鼠标弹起事件
            tb.unbind({ mouseup: onMouseup, mousemove: onMousemove});

            if (startTD && endTD && startTD != endTD && confirm('确认合并？！')) {//开始结束td不相同确认合并
                var tds = tb.find('td.selected'), firstTD = tds.eq(0), index = -1, t, addBR
                    , html = tds.filter(':gt(0)').map(function () {
                    t = this.parentNode.rowIndex;
                    addBR = index != -1 && index != t;
                    index = t;
                    return (addBR ? '<br>' : '') + this.innerHTML
                }).get().join(' ');
                tds.filter(':gt(0)').remove(); firstTD.append(' ' + html.replace(/ (<br>)/g, '$1'));

                //更新合并的第一个单元格的缓存rc数据为所跨列和行
                var rc = firstTD.attr({ colspan: MMRC.endCellIndex - MMRC.startCellIndex + 1, rowspan: MMRC.endRowIndex - MMRC.startRowIndex + 1 }).data('rc');
                rc.maxc = rc.c + MMRC.endCellIndex - MMRC.startCellIndex; rc.maxr = rc.r + MMRC.endRowIndex - MMRC.startRowIndex;

                firstTD.data('rc', rc);

            }
            tb.find('td').removeClass('selected');
            startTD = endTD = null;
        };
        function onContextmenu(e){
          e.originalEvent.stopPropagation();
          e.originalEvent.preventDefault();
          console.log(e, this);
        };
        function onMousedown(e) {
            var o = e.target;
            if (o.tagName == 'TD') {
                startTD = o;
                tb.bind({ mouseup: onMouseup, mousemove: onMousemove});
            }
        }
        tb.mousedown(onMousedown);
        tb.contextmenu(onContextmenu);
    });
};


$(document).ready(function(){

  //$('#mm-document').data().menu.options.duration = 1000;
  // ********* menubar ***************************//
  const menuBarPasteFromWordBtn = $('#menubar-paste-auto-paged');

  $('#menubar-font-name').children().each(function(){
    const fontName = this.innerText;
    $(this).css('fontFamily', fontName);
  //  this.addEventListener('selectstart', function(){return false;}, false);
    $(this).click(function(){
      console.log('clicked');
      document.execCommand('fontName', false, fontName);
    });
  });
  $('#mm-fontSize').click(function(e){
    document.execCommand('fontSize', false, prompt('字号', 4));
    /*const fontSize = e.target.innerText;
    const el = $.globalStorage.range.commonAncestorContainer;

    if (el){
      el.parentNode.style.fontSize = fontSize + 'pt';
    }*/
  });

  $('#mm-font-line-height').click(function(){
    configFont({
      name: 'lineHeight',
      value: (prompt("行高", 20))+'px',
    });
  });

  function configFont(options){
    if (options){
      if ($ && $.globalStorage && $.globalStorage.range){
        const el = $.globalStorage.range.commonAncestorContainer;

        if (el.nodeType === 3){
          if (el.parentNode.getAttribute && el.parentNode.getAttribute('role') === 'page-body'){
            const newEl = document.createElement('p');
            newEl.innerText = el.textContent;
            el.parentNode.replaceChild(newEl, el);
          } else {
            $(el.parentNode).css(options.name, options.value);
          }
        } else if (el.nodeType === 1) {

          if (el.getAttribute && el.getAttribute('role') === 'page-body'){
            const newEl = document.createElement('p');
            newEl.innerText = el.innerText;

            el.innerText = '';
            el.appendChild(newEl);
            $(newEl).css(options.name, options.value);
          }

        }


      }
    }
  }

  $('#menubar-edit-insert-html').click(function(){
    document.execCommand('insertHTML', false, prompt("插入HTML", ""));
  });

  $('#mm-align-left').bind('click', function(){
    document.execCommand('justifyleft');
  });

  $('#mm-align-center').bind('click', function(){
    document.execCommand('justifycenter');
  });

  $('#mm-align-right').bind('click', function(){
    document.execCommand('justifyright');
  });

  $('#mm-indent').click(function(){
    document.execCommand('indent');
  });

  $('#mm-outdent').click(function(){
    document.execCommand('outdent');
  });

  $('#menubar-edit-insert-horizontal-rule').click(function(){
    document.execCommand('insertHorizontalRule');
  });

  $('#menubar-edit-empty-pagedDoc').click(function(){
    if ($.globalStorage){
      $.globalStorage.pagedDoc.empty();
    }
  });

  $('#mm-table-valign-top').click(function(){
    tableValign('top');
  });

  $('#mm-table-valign-middle').click(function(){
    tableValign('middle');
  });

  $('#mm-table-valign-bottom').click(function(){
    tableValign('bottom');
  });

  function tableValign(where='top'){
    if ($ && $.globalStorage && $.globalStorage.range){
      let container = $.globalStorage.range.commonAncestorContainer;
      let i = 0;
      while (container.tagName != 'TD' && i < 10) {
        i++;
        container = container.parentNode;
        if (container.tagName === 'TD'){
          container.setAttribute('valign', where);
          break;
        }
      }
    }
  };
  // *********************************************** //

  // *************** region west ********************** //
  $('#fm-contextmenu-import').click(function(){
      const fileExplorer = $('#file-explorer');
      let node = fileExplorer.tree('getSelected');
      fileExplorer.tree('expand',node?node.target:null);

      $.globalStorage.selectedFileExplorerNode = node;
      let input = $('#input-file');
      input.click();
  });

  $('#fm-contextmenu-append').click(function(){
      "use strict";
      const t = $('#file-explorer');
      const node = t.tree('getSelected');
      t.tree('append', {
          parent: (node?node.target:null),
          data: [{
              text: 'new item1'
          },{
              text: 'new item2'
          }]
      });
  });

  $('#fm-contextmenu-remove').click(function(){
    removeTreeNode($('#file-explorer'));
  });

  $('#fm-contextmenu-load-template').click(function(){
    const $tree = $('#file-explorer');
    if ($tree.jquery && $tree[0]){
      const node = $tree.tree('getSelected');
      if (node) loadTemplate(node.text);
    }

  });
  // ************************************************** //

  // ************** region center ******************** //
  $('#mm-document-create-ol').bind({
    selectstart: function(){return false;},
    click: function(){document.execCommand('insertOrderedList');},
  });

  $('#mm-document-create-ul').bind({
    selectstart: function(){return false;},
    click: function(){document.execCommand('insertUnorderedList');},
  });

  // ****************** chart data panel ************** //
  $('#mm-chart-data-remove-tree-node').click(function(){
    removeTreeNode($('#w-document-chart-tree'));
  });

  $('#mm-document-chart-axis-autoscale-y').click(function(){
    chart_autoscale();
  });
  // **************************************************//


  const mergeTableStyle = document.createElement('style');
  mergeTableStyle.innerHTML = '.cannotselect{-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;-khtml-user-select:none;user-select:none;}td.selected{background:#0094ff;color:#fff}';
  document.head.appendChild(mergeTableStyle);

  let kkk1 = new algorithmObj();
  kkk1.name = '算法示例1-首次上升沿';
  kkk1.id = ('algorithm-id-' + performance.now() + ('-'+Math.random()).substr(3)).replace('.', '--');
  kkk1.code.data = U_getStartSE.toString();
  kkk1.input.data[0] = {filename:'', channels:['B_st']};


  $.globalStorage.algorithmObjList[kkk1.id] = kkk1;
  $.globalStorage.selectedAlgorithm = kkk1;


  $('#mm-document-show-algorithm').click(function(){
    showAlgorithmPanel($.globalStorage.selectedAlgorithm);
  });

  $('#w-document-algorithm-btn-run').click(function(){
    setAlgorithmObj();
  });

  function removeTreeNode($tree){
    if ($tree.jquery && $tree[0]){
      const node = $tree.tree('getSelected');
      $tree.tree('remove', node.target);
    }
  };

  function loadTemplate(name){
    if ($.globalStorage){
      if ($.globalStorage.files[name]){
        const template = $.globalStorage.files[name];
        console.log(template);
        $.globalStorage.pagedDoc.load(template);
      }
    }
  };

  function chart_autoscale(chart){
    chart = chart?chart:$.globalStorage.activeChart;
    if (chart){
      for (const filename in chart.plot.data){

        let groupMaxValue = -Infinity, groupMinValue = Infinity;
        for (const group of chart.plot.data[filename].dataGroup){
          for (const channel of group.channels){
            if (channel.windowMaxValue > groupMaxValue) groupMaxValue = channel.windowMaxValue;
            if (channel.windowMinValue < groupMinValue) groupMinValue = channel.windowMinValue;
          }
          group.groupValueDomain = [groupMinValue, groupMaxValue];
        }
      }
    }

    chart.plot.draw2({
      niceValueDomain: true,
    });
  }

  function showAlgorithmPanel(al){
    $('#w-document-algorithm-name').val(al.name);
    $('#w-document-algorithm-id').val(al.id);
    $('#w-document-algorithm-type').val(al.code.type);
    $('#w-document-algorithm-code-data').val(al.code.data);

    $('#w-document-algorithm-inputFile').empty();
    for (const filename in $.globalStorage.files){
      $('#w-document-algorithm-inputFile').append('<option value="'+filename+'">'+filename+'</option>');
    }

    $('#w-document-algorithm-inputChannel').val(al.input.data[0].channels.toString());
    $('#w-document-algorithm-outputType').val(al.output.type)
    $('#w-document-algorithm').window('open');
  }

  function setAlgorithmObj(){
    const id = $('#w-document-algorithm-id').val();
    const al = $.globalStorage.algorithmObjList[id];

    if (al){

      al.name = $('#w-document-algorithm-name').val();
      al.code.type = $('#w-document-algorithm-type').val();
      al.code.data = $('#w-document-algorithm-code-data').val();
      al.input.data[0] = {
        filename: $('#w-document-algorithm-inputFile').val(),
        channels: $('#w-document-algorithm-inputChannel').val().split(','),
      };
      const file = $.globalStorage.files[al.input.data[0].filename];
      al.output.type = $('#w-document-algorithm-outputType').val();
      if (al.output.type.match(/timeDomain|valueDomain|t\-vDomain/)){
        al.bind.type = 'chart';
        al.bind.target = $('#w-document-algorithm-bind').val()?$('#w-document-algorithm-bind').val():'';
      }
      let returnValue, codeStr, argStr='';
      let channels = al.input.data[0].channels;
      for (let i = 0; i < channels.length; i++){
        if (channels[i][0] != '"') channels[i] = '"' + channels[i] + '"';
      }
      argStr = channels.join(',');
      codeStr = '('+al.code.data+').call(null, $.globalStorage.files["' + al.input.data[0].filename + '"].data, '+ argStr +')';
      try {
        returnValue = eval(codeStr);
      } catch (e) {
        console.log(e);
      } finally {
        let formattedResult;
        if (returnValue){
          if (al.output.type === 'timeDomain'){
            formattedResult = returnValue.map(x=>x.toFixed(2)).join(', ');
            if (al.bind.target){

              const chart = $('#'+al.bind.target)[0].parentChart;
              let chartFile = chart.plot.data[al.input.data[0].filename];
              if (chartFile){
                chartFile.windowTimeDomain = returnValue;
                chart.plot.draw2({
                  niceTimeDomain: true,
                  niceValueDomain: true,
                });
                chart_autoscale();
              }
            }
          }
        }
        $('#w-document-algorithm-result').val(formattedResult);
      }
    }
  }
});

(function ($){
  $.fn.tableresize = function () {
    var _document = $("body");
    $(this).each(function () {
      if (!$.tableresize) {
        $.tableresize = {};
      }
      var _table = $(this);
      //设定ID
      var id = _table.attr("id") || "tableresize_" + (Math.random() * 100000).toFixed(0).toString();
      var tr = _table.find("tr").first(), ths = tr.children(), _firstth = ths.first();
      //设定临时变量存放对象
      var cobjs = $.tableresize[id] = {};
      cobjs._currentObj = null, cobjs._currentLeft = null;
      ths.mousemove(function (e) {
        var _this = $(this);
        var left = _this.offset().left,
            top = _this.offset().top,
            width = _this.width(),
            height = _this.height(),
            right = left + width,
            bottom = top + height,
            clientX = e.clientX,
            clientY = e.clientY;
        var leftside = !_firstth.is(_this) && Math.abs(left - clientX) <= 5,
            rightside = Math.abs(right - clientX) <= 5;
        if (cobjs._currentLeft||clientY>top&&clientY<bottom&&(leftside||rightside)){
          _document.css("cursor", "e-resize");
          if (!cobjs._currentLeft) {
            if (leftside) {
              cobjs._currentObj = _this.prev();
            }
            else {
              cobjs._currentObj = _this;
            }
          }
        }
        else {
          cobjs._currentObj = null;
        }
      });
      ths.mouseout(function (e) {
        if (!cobjs._currentLeft) {
          cobjs._currentObj = null;
          _document.css("cursor", "auto");
        }
      });
      _document.mousedown(function (e) {
        if (cobjs._currentObj) {
          cobjs._currentLeft = e.clientX;
        }
        else {
          cobjs._currentLeft = null;
        }
      });
      _document.mouseup(function (e) {
        if (cobjs._currentLeft) {
          cobjs._currentObj.width(cobjs._currentObj.width() + (e.clientX - cobjs._currentLeft));
        }
        cobjs._currentObj = null;
        cobjs._currentLeft = null;
        _document.css("cursor", "auto");
      });
    });
  };
})(jQuery);

(function ($){
  $.fn.tablefilter = function(){
    var _document = $('body');
    $(this).each(function(){
      var _table = $(this);
      var trs = _table.find('tr');
      var ths = trs.first().children();
      var select = document.createElement('select');
      var fb = document.createElement('div');
      var submitBtn = document.createElement('button');
      var cancelBtn = document.createElement('button');

      select.setAttribute('multiple', 'true');
      $(select).css('display', 'block').css('width', '100%').css('height', '100%');

      $(fb).css('display', 'none')
           .css('position', 'absolute')
           .css('border', '1px solid black')
           .css('backgroundColor', 'white')
           .appendTo(_document);
      submitBtn.innerText = '确认';
      cancelBtn.innerText = '取消';

      fb.appendChild(submitBtn);
      fb.appendChild(cancelBtn);
      fb.appendChild(select);

      $(select)
           .css('margin', 0)
           .css('padding', 0);

      ths.contextmenu(function(e){
        e.preventDefault();
        const thCellIndex = this.cellIndex;
        submitBtn.columnIndex = thCellIndex;
        const valueArray = [];
        let selectInnerHTML = '';
        let selected = '';
        const left = e.clientX, top = e.clientY;
        trs.each(function(i){
          if (i > 0){
            const $tr = $(this);
            const tds = $tr.children();
            tds.each(function(){
              if (this.cellIndex == thCellIndex){
                if (valueArray.indexOf(this.innerText) === -1) {
                  valueArray.push(this.innerText);

                  selected = ($tr.css('display') === 'none')?'':'selected';
                  selectInnerHTML += '<option value="'+ this.innerText+'" '+ selected +'>'+this.innerText+'</option>';
                }
              }
            });
          }
        });

        select.innerHTML = selectInnerHTML;

        $(fb).css('display', 'block')
             .css('left', left)
            .css('top', top);

        $(select).focus();
      });

      $(submitBtn).click(function(){
        $(fb).css('display', 'none');
        const showThese = [];
        const columnIndex = this.columnIndex;
        $(select).children().each(function(){
          const selected = this.selected;
          const value = this.value;
          if (selected) showThese.push(value);
        });

        trs.each(function(i, tr){
          const $tr = $(tr);
          const tds = $(this).children();
          if (i > 0){
            const thisValue = tds.get(columnIndex).innerText;
            if (showThese.indexOf(thisValue) != -1) $tr.css('display', 'table-row');
            else $tr.css('display', 'none');
          }
        });
      });

      $(cancelBtn).click(function(){
        $(fb).css('display', 'none');
      });

    });
  };
})(jQuery);
