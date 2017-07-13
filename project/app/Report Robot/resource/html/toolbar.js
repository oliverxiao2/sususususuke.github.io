
// ===================================== init UI <start> ===================================
$(document).ready(function(){

  $('#wrapper_document div[role=body]').click(function(){
    $global.range = window.getSelection().getRangeAt(0);
  });
  document.body.addEventListener('keydown', function(){
    $global.range = window.getSelection().getRangeAt(0);
  });
  //========================================================================================
  let toolbar_head = $('#list_toolbar_tabs_head');
  toolbar_head.children().click(function(){
    // toggle tabs head of toolbar
    $('#list_toolbar_tabs_head').children().removeClass('active').addClass('inactive');
    $(this).removeClass('inactive').addClass('active');

    const v_head = $(this).attr('data-toolbar-tabs');
    // toggle tabs content of toolbar
    $('#list_toolbar_tabs_content').children().each(function(){
      $(this).removeClass('active').addClass('inactive'); // hide all
      if (v_head == $(this).attr('data-toolbar-tabs-content')){
        $(this).removeClass('inactive').addClass('active');
        return null;
      }
    });

    // toggle workplace
    $('#workplace-list').children().each(function(){
      $(this).removeClass('active').addClass('inactive'); // hide all
      if (v_head == $(this).attr('data-tabs-workplace')){
        $(this).removeClass('inactive').addClass('active');
        return null;
      }
    });
  });
  //========================================================================================
  let toolbar_content = $('#list_toolbar_tabs_content');

  // import
  $('#btn_toolbar_upload_files').change(function (){
    let self = $(this);
    let files = self[0].files;
    for (const file of files){
      let inputType = '';

      let _m = file.name.match(/\.([\w]+)$/);
      if (_m && (typeof _m[1] === 'string')) inputType = _m[1].toUpperCase();

      if (inputType.match(/A2L|HEX|DCM|XML/)){
        // readAsText
        let reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function(e){
          let data = e.target.result;
          parseAndSaveResultToGlobalFileManager(
            $global_file_manager, file, data, inputType, inputType, ASAMFileParser
          );



        }
      } else if (inputType.match(/XLSX|XLS/)){
        loadJS('../src/xlsx.full.min.js', function(){
          loadJS('../src/excelToTable.js', function(){
            // readAsBinaryString
            let reader = new FileReader();
            reader.readAsBinaryString(file);
            reader.onload = function(e){
              let data = e.target.result;
              const parseResult = parseAndSaveResultToGlobalFileManager(
                $global_file_manager, file, data, inputType, {type: 'binary', cellStyles: false}, XLSX.read
              );
              console.log(parseResult);
            }
          });
        });
      } else if (inputType.match(/DAT|MDF/)) {
        let reader = new FileReader;
        reader.readAsArrayBuffer(file);
        reader.onload = function(e){
          let arraybuffer = e.target.result;
          parseAndSaveResultToGlobalFileManager(
            $global_file_manager, file, null, inputType, null, (new MDF(arraybuffer, false))
          );
        }
      }

    }

    // clear file input
    self.val('');
    return false;

    function parseAndSaveResultToGlobalFileManager($global, file, data, inputType, params, parser){
      //let order = Object.keys($global.files).length + 1;
      let parseResult = ( (typeof parser === 'function')?parser(data, params):parser );
      if (parseResult) {
        file.filetype = inputType;
        file.data = parseResult;
        $global_file_manager.files[file.name] = file;

        let date = (new Date(file.lastModified)).toLocaleString();

        let itemHTML = `
          <tr draggable="true" selectable="true" style="opacity:1;">
            <td style="font-style:italic;padding-left:6px;">.`+inputType+`</td>
            <td>
              <span role="title">`+ file.name +`</span>
              <span role="subtitle">`+ (file.size / 1000000).toFixed(1) + ` MB | ` + date +`</span>
            </td>
            <td class="td-align-right"><i class="fa fa-trash" title="删除"></i></td>
          </tr>
        `;

        let container = $('#panel_file_list').find('table');
        container.prepend($(itemHTML));
        //container.focus(); // change the cursor style of busy
        //container.find('tr:first').animate({'opacity':1}, 200, 'linear');
        container.find('tr:first').find('.fa-trash').click(function(){
          console.log("remove");
          let tr = $(this).parent().parent();
          if (tr.hasClass('selected')) {
            const filename = tr.find('span:first').text();
            delete $global_file_manager.selected[filename];
          }

          let filter = $('#list_toolbar_tabs_content i[role=function_filter]');
          if (Object.keys($global_file_manager.selected).length == 0) filter.addClass('disabled');

          tr.remove();
          return false;
        });

        container.find('tr:first').click(function(){
          $(this).toggleClass('selected');
          let filename = $(this).find('span:first').text();
          let file = $global_file_manager.files[filename];
          if (file) {

            if ($(this).hasClass('selected')){
              $global_file_manager.selected[filename] = true;
            } else {
              delete $global_file_manager.selected[filename];
            }

            let previewBody = $('#panel_file_preview div[role=body]');
            if (file.filetype === 'DCM'){
              previewBody.append(jsonToDetailTree(file.data, undefined, file.name));
            }
          }

          let filter = $('#list_toolbar_tabs_content i[role=function_filter]');
          if (Object.keys($global_file_manager.selected).length == 0) filter.addClass('disabled');
          else filter.removeClass('disabled');
          return false;
        });
        container.find('tr:first')[0].addEventListener('dragstart', function(evt){
          let filename = $(this).find('span:first').text();
          evt.dataTransfer.setData('filename', filename);
        });

      }
      console.log(file, parseResult);
      return parseResult;
    }
  });

  // filter
  toolbar_content.find('i[role=function_filter]').click(function(){
    let workplaceBody = $('#panel_workplace').find('div[role=body]'), toolbar;
    let selected = Object.keys($global_file_manager.selected);
    if (selected.length == 1){
      let file = $global_file_manager.files[selected[0]];
      if (file.filetype == 'A2L'){
        workplaceBody
          .empty()
          .append(snippet["panel_workplace_toolbar_for_A2L"])
          .append(myDataTable('A2L', file.data.getNode('CHARACTERISTIC')));
        toolbar = workplaceBody.find('div[role=panel-toolbar]');
        toolbar.find('i[role=save]').click(function(){
          let table = workplaceBody.find('table');
          if (table.length == 2){
            tableToExcel('<table><colgroup><col></colgroup><tr><td>ABC</td><td>123</td></tr></table>', file.name);
          }
        });
      } else if (file.filetype === 'DCM') {
        workplaceBody
          .empty()
          .append(myDataTable('DCM', file.data["FESTWERTEBLOCK"]));
        toolbar = workplaceBody.find('div[role=panel-toolbar]');
      }
    }
  });

  // bind A2L & HEX
  toolbar_content.find('i[role=function_bind]').click(function(){
    const selected = $global_file_manager.selected;
    const files = $global_file_manager.files;
    let a2l, hex;
    if (selected){
      const filenames = Object.keys($global_file_manager.selected);

      if (filenames.length === 2){
        for (filename of filenames){
          if (files[filename].filetype === 'A2L') a2l = files[filename].data;
          if (files[filename].filetype === 'HEX') hex = files[filename].data;
        }

        if (a2l && hex){
          a2l.hexData = hex;
          alert('绑定成功');
          return;
        }
      }
    }

    console.log('error');
  });

  // view the function of A2L
  toolbar_content.find('i[role=function_view]').click(function(){
    const selected = $global_file_manager.selected;
    const filenames = Object.keys(selected);
    let a2l;

    for (const filename of filenames){
      if ($global_file_manager.files[filename].filetype === 'A2L') {
        a2l = $global_file_manager.files[filename].data;
        break;
      }
    }

    if (a2l && a2l.hexData){
      let func = prompt("输出Function名称", "DFC");
      const defAndRef = a2l.getFuncDefAndRef(func);

      // show the data in the right panel
    }



  });

  // TAB2 - new page
  function document_add_new_page(pageSetup='A4Compact'){
    const page = $(snippet["document_page"]);
    let setup = $global.document.pageSetup?$global.document.pageSetup.type:pageSetup;

    if (setup == 'A4Compact'){
      page.find('div[role=page-head]').css('padding', '42.5pt 28pt 0pt 28pt');
      page.find('div[role=page-body]').css('padding', '0 28pt 0 28pt');
      page.find('div[role=page-foot]').css('padding', '0pt 28pt 49.6pt 28pt');
    }
    $('#wrapper_document div[role=body]').append(page);
  };

  toolbar_content.find('i[role=function_new_page]').click(function(){
    document_add_new_page();
  });

  // TAB2 bindMDF for chart
  toolbar_content.find('i[role=function_bindMDF_for_chart]').click(function(){
    let file;
    for (const filename in $global_file_manager.selected){
      if ($global_file_manager.files[filename].filetype === 'DAT'){
        file = $global_file_manager.files[filename];
        break;
      }
    }

    let str = prompt('输入信道...', '["nmot_w"], ["gangi"]');
    if (file && $global.activeChart){
      eval('$global.activeChart.plot.bindMDF(file, '+ str +')');
      $global.activeChart.plot.draw2(true);
    }
  });

  // TAB2 - add dataset
  toolbar_content.find('i[role=function_add_dataset]').click(function(){
    const selected = Object.keys($global_file_manager.selected);
    let a2l, tableHTML;



    for (const filename of selected){
      const file = $global_file_manager.files[filename];
      if (file.filetype === 'A2L' && file.data.hexData) a2l = file.data;
    }

    console.log(a2l);
    a2l.readCHAR();
    const DTCOArray = a2l.getCHAR(/DFES_DTCO/);
    let fullname, DFCname, DTCOValue, ClassValue, DisblMsk, CtrlMsk, FaultType;
    if (DTCOArray.length > 0){

      tableHTML = `
      <table id="table_01" class="display" cellspacing="0" width="100%">
        <thead> <tr> <th>#</th> <th>DFC</th> <th>DTCO</th> </thead>
      `;

      for (const [i, char] of DTCOArray.entries()){
        fullname = char.name;
        DFCname = fullname.substring(14, fullname.length-2);
        DTCOValue = '';

        const rawDTCO = char.rawHex.substr(2);
        const initialDTCO = parseInt(rawDTCO.substr(0, 1), 16);

        if (initialDTCO <= 0x3 && initialDTCO >= 0x0){
          DTCOValue = 'P' + rawDTCO;
        } else if (initialDTCO <= 0x7 && initialDTCO >= 0x4) {

        } else if (initialDTCO <= 0xB && initialDTCO>= 0x8) {

        } else if (initialDTCO <= 0xF && initialDTCO >= 0xC) {

        }

        tableHTML += '<tr><td>'+(i+1)+'</td><td>'+DFCname+'</td><td>'+DTCOValue+'</td></tr>';
      }

      tableHTML += '</table>';

      const container = $('#panel_workplace div[role=body]');
      container.empty();
      container.html(tableHTML);
      $('#table_01').DataTable({
          dom: 'Bfrtip',
          buttons: [
              'colvis', 'excel'
          ],
          lengthMenu: [[-1], ['All']],
      });
    }
  });

  // insert - table
  toolbar_content.find('i[role=function_insert_table]').click(function(){
    const range = $global.range;
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
      $(table).tableMergeCells();
      $(table).tableresize();
    }
  });

  // insert - ol
  toolbar_content.find('i[role=function_insert_ol]').click(function(){
    const range = $global.range;
    const ol = document.createElement('ol');
    const li = document.createElement('li');
    li.innerText = '有序列表项1';
    ol.appendChild(li);
    range.insertNode(ol);
  });

  // insert - ul
  toolbar_content.find('i[role=function_insert_ul]').click(function(){
    const range = $global.range;
    const ul = document.createElement('ul');
    const li = document.createElement('li');
    li.innerText = '无序列表项1';
    ul.appendChild(li);
    range.insertNode(ul);
  });

  // insert - chart
  toolbar_content.find('i[role=function_insert_chart]').click(function(){
    const range = $global.range;
    const div = document.createElement('figure');
    div.id = 'figure_' + parseInt(performance.now()) +'_'+ parseInt(Math.random()*1000);
    div.style.width = '100%';
    div.style.height = prompt('图表高度', '100%');
    div.setAttribute('contenteditable', 'false');
    const before = document.createElement('div');
    before.innerHTML = '&nbsp;';
    range.insertNode(before);
    range.insertNode(div);
    const after = document.createElement('div');
    after.innerHTML = '&nbsp;'
    range.insertNode(after);
    if ($global.charts == undefined) $global.charts = [];
    $global.charts.push(new chart(div));
  });

  // export MS WORD document
  toolbar_content.find('i[role=function_save_as_doc]').click(function(){
    let config = {
      A4Style: 'size:21cm 29.7cm; margin:2.54cm 3.18cm 2.54cm 3.18cm;',
      A4CompactStyle: 'size:21cm 29.7cm; margin:2.54cm 1cm 2.54cm 1cm;',
      firstHeaderIsDiff: true,
      css_fh1: `mso-first-header: url("report_files/headerfooter.htm") fh1;`,
      css_h1: `mso-header: url("report_files/headerfooter.htm") h1;`,
      css_ff1: `mso-first-footer: url("report_files/headerfooter.htm") ff1;`,
      css_f1: `mso-footer: url("report_files/headerfooter.htm") f1;`,
      pageOrientation: 'portrait',
      boundary: '----=_NextPart_GREEDY.GOBLINS.SHOW.ME.THE.MONEY',
    };
    let pageSetup = config.A4CompactStyle;

    let MHTML = snippet["MHTML_template"];

    const pages = $('#wrapper_document div[role=page]');
    let page, pageHead, pageBody, pageFoot, charts, theChart, theChartIndex = 0;
    let pageHeadHTML, pageBodyHTML, pageFootHTML;
    let pagesMHTML='', chartsMHTML='', fh1MHTML = h1MHTML = ff1MHTML = f1MHTML = '';
    for (let n = 0; n < pages.length; n++ ){
      page = pages[n];
      pageHead = $(page).find('div[role=page-head]:first');
      pageBody = $(page).find('div[role=page-body]:first');
      pageFoot = $(page).find('div[role=page-foot]:first');

      pageHeadHTML = pageHead.html();
      pageFootHTML = pageFoot.html();
      pageBodyHTML = pageBody.html();
      // create header
      if (config.firstHeaderIsDiff && pages.length > 1) {
        if (n === 0){
          fh1MHTML = '<div style="mso-element:header;" id="fh1">' + pageHeadHTML + '</div>';
          ff1MHTML = '<div style="mso-element:footer;" id="ff1">' + pageFootHTML + '</div>';
        } else if (n === 1){
          h1MHTML =  '<div style="mso-element:header;" id="h1">'  + pageHeadHTML + '</div>';
          f1MHTML =  '<div style="mso-element:footer;" id="f1">'  + pageFootHTML + '</div>';
        }
      } else {
        if (n === 0){
          h1MHTML =  '<div style="mso-element:header;" id="h1">'  + pageHeadHTML + '</div>';
          f1MHTML =  '<div style="mso-element:footer;" id="f1">'  + pageFootHTML + '</div>';
        }
      }
      // search charts in current page
      charts = $(page).find('div[name=wrapper-chart]');
      for (let i = 0; i < charts.length; i++){
        theChart = charts[i];
        theChartIndex++;
        const base64 = exportAllCanvas(theChart).replace('data:image/png;base64,', '')
        chartsMHTML += '\n--' + config.boundary + '\n';
        chartsMHTML += 'Content-Location: file:\/\/\/C:\/report_files\/chart'+ theChartIndex + '.png' + '\n';
        chartsMHTML += 'Content-Transfer-Encoding: base64' + '\n';
        chartsMHTML += 'Content-Type: image/png' + '\n';
        chartsMHTML += '\n';
        chartsMHTML += base64 + '\n';
        chartsMHTML += '\n';
        pageBodyHTML = pageBodyHTML.replace(theChart.outerHTML, '<img src="report_files\/chart'+theChartIndex+'.png">');
      }

      //
      pagesMHTML += pageBodyHTML + '\n' + ((n == (pages.length - 1))?'':'<br clear=all style="mso-special-character:line-break;page-break-before:always">') ;
    }
    MHTML = MHTML.replace('{{$titlePage$}}', (config.firstHeaderIsDiff && pages.length > 1)?'yes':'no');
    MHTML = MHTML.replace('{{$style_headerAndFooter$}}', (config.firstHeaderIsDiff && pages.length > 1)?(config.css_fh1+'\n'+config.css_h1+'\n'+config.css_ff1+'\n'+config.css_f1):(config.css_h1+'\n'+config.css_f1));
    MHTML = MHTML.replace('{{$firstHeader$}}', fh1MHTML)
                  .replace('{{$generalHeader$}}', h1MHTML)
                  .replace('{{$firstFooter$}}', ff1MHTML)
                  .replace('{{$generalFooter$}}', f1MHTML);
    MHTML = MHTML.replace(/\{\{\$boundary\$\}\}/g, config.boundary);
    MHTML = MHTML.replace(/\{\{\$style_pageSetup\$\}\}/, pageSetup);
    MHTML = MHTML.replace('{{$body$}}', pagesMHTML);
    MHTML = MHTML.replace('{{$images$}}', chartsMHTML);

    /*const charts = body.querySelectorAll('figure');
    for (const chart of charts){
      const id = chart.id;
      html = html.replace(chart.outerHTML, exportAllCanvas(chart).outerHTML);
    }*/
    if(saveAs){
      saveAs(new Blob([MHTML], {type:"text/html; charset=utf-8"}), 'Report.doc');
    }
  });

  // save as template
  toolbar_content.find('i[role=function_save_as_template]').click(function(){
    if (!$global.documentObj){
      $global.documentObj = {
        pageSize: 'A4',                 // size:21cm 29.7cm;
        pageMargin: 'compact',          // margin:2.54cm 1cmcm 2.54cm 1cm;
        hasTitlePage: true,             // if the first page has diffrent header and footer
        headerMargin: 'normal',         // just margin-top, default value 1.5cm
        footerMargin: 'normal',         // just margin-bottom, default value 1.54cm
        content: {
          headerFooter: {
            firstHeader: '',
            firstFooter: '',
            header: '',
            footer: '',
          },
          pageBody: [],
          MDFFigures: [],
        },
      };
    }
    const doc = $global.documentObj;
    const pages = $('#wrapper_document div[role=page]');
    let page, MDFFiguresOnThisPage, theChartIndex = 0, theChartElement, theChartInstance, theChartBase64, theChartConfig, thePageHTML;
    for (let i = 0; i < pages.length; i++){
      page = pages[i];
      thePageHTML = $(page).find('div[role=page-body]:first').html();

      if (doc.hasTitlePage && pages.length > 1 && i === 0){
        doc.content.headerFooter.firstHeader = $(page).find('div[role=page-head]:first').html();
        doc.content.headerFooter.firstFooter = $(page).find('div[role=page-foot]:first').html();
      }
      else if ((doc.hasTitlePage && pages.length > 1 && i === 1) || ((!doc.hasTitlePage) && i === 0)){
        doc.content.headerFooter.header = $(page).find('div[role=page-head]:first').html();
        doc.content.headerFooter.footer = $(page).find('div[role=page-foot]:first').html();
      }

      MDFFiguresOnThisPage = $(page).find('div[name=wrapper-chart]');
      for (let j = 0; j < MDFFiguresOnThisPage.length; j++){
        theChartIndex++;
        theChartElement = MDFFiguresOnThisPage[j];
        theChartInstance = theChartElement.parentChart;
        theChartBase64 = exportAllCanvas(theChartElement).substr(22);
        theChartConfig = {
        };
        doc.content.MDFFigures.push({chartNumber:theChartIndex, base64:theChartBase64});
        thePageHTML = thePageHTML.replace(theChartElement.outerHTML, '<img src="report_files\/chart'+theChartIndex+'.png">');
      }
      doc.content.pageBody.push({pageIndex:i, html:thePageHTML});
    }

    console.log(doc);
  });

  //
  toolbar_content.find('i[role=function_change_font_size]').click(function()  {
    $global.range.commonAncestorContainer.parentNode.style.fontSize = prompt("字体大小", 14);

  });

  document.getElementById("btn-justify-left").addEventListener('click', function(){
    document.execCommand("justifyleft");
  });

  document.getElementById('btn-justify-center').addEventListener('click', function(){
    document.execCommand("justifycenter");
  });

  document.getElementById('btn-justify-right').addEventListener('click', function(){
    document.execCommand("justifyright");
  });

  document.getElementById('btn-clear-blank-line').addEventListener('click', function(){
    if ($global.range){
      const range = $global.range;
      const box = range.commonAncestorContainer;
      if (box.tagName === 'DIV' && box.getAttribute('role')!= 'page-body'){
        box.parentNode.removeChild(box);
      }
    }

  });

  // merge cells of table
  toolbar_content.find('i[role=function_merge_cells]').click(function(){
    if ($global.range){
      console.log($global.range);
      const range = $global.range;
      const tr = range.commonAncestorContainer;
      const startTd = range.startContainer.parentNode;
      const endTd = range.endContainer.parentNode;
    }

  });
});
// ===================================== init UI <end> =====================================
