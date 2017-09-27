/**
 * Created by ext.ming.xiao on 2017/7/13.
 */
"use strict";

window.pagedDoc = function(container, option){
    this.init(container, option);
    const pagedDocStyle = document.createElement('style');
    pagedDocStyle.innerHTML = `
    .page-shadow{box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.4);}
    .doc-page{overflow: hidden; font-family: "Arial", "宋体"; font-size: 10pt;}
    .doc-page ul, .doc-page ol{padding-left:1em;}
    .doc-page-body{border-top: 1px dashed #999; border-bottom: 1px dashed #999;}
    .doc-page-header, .doc-page-footer{background: whitesmoke;opacity: 0.5;}
    `;
    document.head.appendChild(pagedDocStyle);
};

pagedDoc.prototype.init = function(container, option){
  let self = this;
  this.container = container;
  let defaultSetting = {
      pageSize: 'A4',
      hasTitlePage: true,
      margin: '2.54cm 3.17cm 2.54cm 3.17cm',
      marginTop: '2.54cm',
      marginBottom: '2.54cm',
      marginLeft: '1.5cm',
      marginRight: '1.5cm',
      headerMarginTop: '1.5cm',
      footerMarginBottom: '1.5cm',
      defaultFontFamily: 'Segoe UI',
      defaultFontSize: '14pt',
  };
  this.setting = $.extend(defaultSetting, option);

  this.content = {
    headerFooter: {
      firstHeader: '',
      firstFooter: '',
      header: '',
      footer: '',
    },
    pageBody: [],
    charts: [],
    files: [],
    algorithmQuery: {},
  };

  this.wrapper = document.createElement('div');
  this.wrapper.style.display = 'flex';
  this.wrapper.style.flexDirection = 'column';
  this.wrapper.style.alignItems = 'center';
  this.wrapper.style.width = '100%';
  this.wrapper.style.height = '100%';
  this.wrapper.style.overflowY = 'scroll';
  this.container.appendChild(this.wrapper);
  this.append();

  this.wrapper.addEventListener('paste', function(e){
    const autoPaged = $('#menubar-paste-auto-paged').switchbutton().data().switchbutton.options.checked;
    const plain = $('#menubar-paste-text-plain').switchbutton().data().switchbutton.options.checked;
    e.preventDefault();
    let dataType;

    if (plain) dataType = 'text/plain';
    else {
      for (const item of Array.from(e.clipboardData.items)){
        if (item.type === 'text/html') dataType = 'text/html';
        else if (item.type === 'text/plain' && dataType != 'text/html') dataType = 'text/plain';
      }
    }


    for (const [i, item] of Array.from(e.clipboardData.items).entries()){
      if (item.type === dataType){
        item.getAsString(function(d){console.log(d);
          if (autoPaged){
            let height = 0, nodeHeight = 0, scrolledHeight = 0;
            const matchResult = d.match(/\<\!\-\-StartFragment\-\-\>([\s\S]*)\<\!\-\-EndFragment\-\-\>/);
            const temp_box = document.getElementById('tab-fluid-document-container');
            let currentPage = self.getThisPage();
            let currentPageBody = currentPage.querySelector('div[role=page-body]');
            let currentPageBodyHeight = currentPageBody.clientHeight;
            temp_box.innerHTML = '';

            let frag0 = matchResult?matchResult[1]:matchResult;
            let frag = frag0.replace(/\bclass\=.+?\b/g, '');
            frag = frag.replace(/\<\!\-\-\[if gte vml[\s\S]*?\<\!\[endif\]\-\-\>/g, function(a){
              return '';
            });
            frag = frag.replace(/\<\!\[if \!vml\]\>([\s\S]*?)\<\!\[endif\]\>/g, function(a, b){
              let height = 400;
              const m = b.match(/img width\=[\d]+ height\=([\d]+)/);
              if (m) height = m[1];
              return '<span style="line-height:' + height + 'px;display:block;" role="image-place-holder">插图占位符</span>';
            })
            window.docFrag = document.createElement('div');
            temp_box.innerHTML = (frag);
            //document.execCommand('insertHTML', false, frag);console.log(frag);

            for (const node of temp_box.querySelectorAll('*')){
              if ($.trim(node.innerHTML) === '') node.outerHTML = "&nbsp;"
            }

            for (const node of Array.from(temp_box.childNodes)){
              if (node.style){
                $(node).css('marginLeft', '0px');
                if (parseFloat($(node).css('marginRight')) < 0) $(node).css('marginRight', '0px');
                if (parseFloat($(node).css('textIndent')) < 0) $(node).css('textIndent', '0px');
                if ($(node).get(0).tagName === 'P'){$(node).css('marginTop', '13px').css('marginBottom', '13px')}
              }
              if (node.nodeType === 1) {
                nodeHeight = (parseFloat($(node).css('marginTop')) + parseFloat($(node).css('marginBottom')) + node.clientHeight)
                height = (node.offsetTop + node.clientHeight + parseFloat($(node).css('marginBottom'))) - scrolledHeight;
                if (height > currentPageBodyHeight){
                  scrolledHeight = node.offsetTop;
                  currentPageBody = self.append().newPageBody;
                  $(currentPageBody).append(node.outerHTML);
                } else {
                  $(currentPageBody).append(node.outerHTML);
                }
              }
            }

            $(self.wrapper).find('span[role=image-place-holder]').each(function(){
              const width = $(this).width();
              const height= $(this).height();
              this.outerHTML = '<img width="' + width + '" height="' + height + '" />';
              console.log(this);
            });
          }
          else {
            document.execCommand('insertHTML', false, d);
          }
        });
        break;
      }

      if (item.type === dataType){
        item.getAsString(function(d){
          document.execCommand('insertText', false, d)
        });
      }


    }
  });

};

pagedDoc.prototype.pasteFromWord = function (e){

};

pagedDoc.prototype.append = function(where){
  let newPage = document.createElement('div'),
      newPageHeader = document.createElement('div'),
      newPageBody = document.createElement('div'),
      newPageFooter = document.createElement('div');
  let insertwhere = (typeof where === 'string')?((where.match(/start|before|after|end/))?where:'end'):'end';
  let currentPage;
  if ($ && $.globalStorage && $.globalStorage.range){
    const _el = $.globalStorage.range.commonAncestorContainer;
    $(this.wrapper).find('div[role=page]').each(function(){
      if (this.contains(_el)) {
        currentPage = this;
      }
    });
  }

  newPage.id = ('page-' + performance.now()).replace('.', '--');
  newPage.className = 'page-shadow doc-page';
  newPageHeader.className = 'doc-page-header';
  newPageBody.className = 'doc-page-body';
  newPageFooter.className = 'doc-page-footer';

  newPage.style.display = 'flex';
  newPage.style.flexDirection = 'column';
  newPage.style.border = '1px solid #DDD';
  newPage.style.margin = '20px';
  newPage.style.boxSizing = newPageHeader.style.boxSizing = newPageBody.style.boxSizing = newPageFooter.style.boxSizing = 'border-box';
  newPage.setAttribute('role', 'page')
  newPageHeader.setAttribute('role', 'page-header');
  newPageFooter.setAttribute('role', 'page-footer');
  newPageBody.setAttribute('role', 'page-body');
  newPageBody.style.flexGrow = 1;

  newPageHeader.setAttribute('contenteditable', 'true');
  newPageBody.setAttribute('contenteditable', 'true');
  newPageFooter.setAttribute('contenteditable', 'true');

  newPage.appendChild(newPageHeader);
  newPage.appendChild(newPageBody);
  newPage.appendChild(newPageFooter);
  if (insertwhere === 'end') {this.wrapper.appendChild(newPage);}
  else if (insertwhere === 'start') {$(this.wrapper).prepend(newPage);}
  else if (insertwhere === 'after') {$(currentPage).after(newPage);}
  else if (insertwhere === 'before') {$(currentPage).before(newPage);}

  if (this.setting.pageSize === 'A4'){
    newPage.style.width  = newPageHeader.style.width = newPageFooter.style.width = newPageBody.style.width = "210mm";
    newPage.style.minHeight = "297mm";
  }

  newPageHeader.style.minHeight = this.setting.marginTop;
  newPageFooter.style.minHeight = this.setting.marginBottom;

  newPageBody.style.paddingLeft  = newPageHeader.style.paddingLeft  = newPageFooter.style.paddingLeft = this.setting.marginLeft;
  newPageBody.style.paddingRight = newPageHeader.style.paddingRight = newPageFooter.style.paddingRight = this.setting.marginRight;
  newPageHeader.style.paddingTop = this.setting.headerMarginTop;
  newPageFooter.style.paddingBottom = this.setting.footerMarginBottom;

  this.save();
  return {newPage, newPageHeader, newPageBody, newPageFooter};
};

pagedDoc.prototype.getThisPage = function(){
  let currentPage;
  const wrapper = this.wrapper;
  if ($ && $.globalStorage && $.globalStorage.range){
    const _el = $.globalStorage.range.commonAncestorContainer;
    $(wrapper).find('div[role=page]').each(function(){
      if (this.contains(_el)) {
        currentPage = this;
      }
    });
    return currentPage;
  }
};

pagedDoc.prototype.save = function(){
  this.content.headerFooter = {
    firstHeader: '',
    firstFooter: '',
    header: '',
    footer: '',
  };
  this.content.pageBody = [];
  this.content.charts = [];

  const pages = $(this.wrapper).find('div[role=page]');
  let page, pageHeader, pageFooter, pageBody, pageBodyHTML, n = pages.length, totalChartIndex = 0;
  for (let i = 0; i < n; i++){
    page = $(pages[i]);
    // add width for table td to fix the layout
    page.find('table').each(function(){
      $(this).find('td').each(function(){
        $(this).width($(this).width());
      });
    });

    pageBody = page.find('div[role=page-body]:first');
    pageBodyHTML = pageBody.html();

    if ( i === 0 && this.setting.hasTitlePage && n > 1 ){
      this.content.headerFooter.firstHeader = page.find('div[role=page-header]:first').html();
      this.content.headerFooter.firstFooter = page.find('div[role=page-footer]:first').html();
    } else if (( i === 1 && this.setting.hasTitlePage && n > 1 ) || (i===0 && ((!this.setting.hasTitlePage) || n === 1))) {
      this.content.headerFooter.header = page.find('div[role=page-header]:first').html();
      this.content.headerFooter.footer = page.find('div[role=page-footer]:first').html();
    }

    // 统计整个文档中引用了多少测量文件

    const chartsOnThisPage = pageBody.find('div[name=wrapper-chart]');
    const MDFFilenameArray = [];
    let width = 0, height = 0;
    for (let j = 0; j < chartsOnThisPage.length; j++){
      totalChartIndex++;
      width = chartsOnThisPage[j].clientWidth;
      height = chartsOnThisPage[j].clientHeight;
      const data = chartsOnThisPage[j].parentChart.plot.data;
      const theChartBase64 = exportAllCanvas(chartsOnThisPage[j]).substr(22);
      const dataObj = {
        //base64: theChartBase64,
        chartIndex: totalChartIndex,
        id: chartsOnThisPage[j].id,
        data: {
          channels: [],
          windowTimeDomain: [],
        },
        type: chartsOnThisPage[j].parentChart.type,
      };

      let groupId = -1;
      for (const filename in data){
        dataObj.data.windowTimeDomain.push(data[filename].windowTimeDomain)
        for (const group of data[filename].dataGroup){
          groupId++;

          for (const ch of group.channels){
            if (MDFFilenameArray.indexOf(filename) === -1) MDFFilenameArray.push(filename);
            dataObj.data.channels.push({
              groupId: groupId,
              fileId: MDFFilenameArray.indexOf(filename),
              filename: filename,
              isBit: group.bitGroup,
              shortSignalName: ch.name,
            });
          }
        }
      }
      this.content.charts.push(dataObj);

      pageBodyHTML = pageBodyHTML.replace(chartsOnThisPage[j].outerHTML, '<img width='+width+' height='+height+' role="'+dataObj.type+'" data-chartID=' + dataObj.id + ' src="report_files\/chart'+totalChartIndex+'.png">');
    }

    this.content.pageBody.push({
      pageIndex:i,
      pageId: page.attr('id'),
      html: pageBodyHTML,
    });

  }

  if ($.globalStorage){

    if ($.globalStorage.algorithmObjList){
      for (const alID in $.globalStorage.algorithmObjList){
        this.content.algorithmQuery[alID] = $.globalStorage.algorithmObjList[alID];
      }
    }

    $.globalStorage.broadcastUpdatePagedDoc();
  }
};

pagedDoc.prototype.export = function(type='word'){
  if (type === 'word'){
    const boundary = '----=_NextPart_GREEDY.GOBLINS.SHOW.ME.THE.MONEY';

    let MHTML = this.MHTMLTemplate;

    let pageSize = '210mm 297mm';
    if (this.setting.pageSize === 'A4'){
      pageSize = '210mm 297mm';
    }

    let pageMargin = '2.54cm 1cm 2.54cm 1cm';
    pageMargin = this.setting.marginTop + ' ' +
                 this.setting.marginRight + ' ' +
                 this.setting.marginBottom + ' ' +
                 this.setting.marginLeft;

    let pages = this.content.pageBody;
    let bodyHTML, fh1, h1, ff1, f1;
    bodyHTML = fh1 = h1 = ff1 = f1 = '';

    if (this.setting.hasTitlePage){
      fh1 = '<div style="mso-element:header;" id="fh1">'+ this.content.headerFooter.firstHeader + '</div>';
      ff1 = '<div style="mso-element:footer;" id="ff1">'+ this.content.headerFooter.firstFooter + '</div>';
    }

    h1 = '<div style="mso-element:header;" id="h1">' + this.content.headerFooter.header + '</div>';
    f1 = '<div style="mso-element:footer;" id="f1">' + this.content.headerFooter.footer + '</div>';

    for (let i = 0; i < pages.length  - 1; i++){
      bodyHTML += pages[i].html + '\n' + '<br clear=all style="mso-special-character:line-break;page-break-before:always">' + '\n';
    }
    bodyHTML += pages[pages.length-1].html;

    

    let imageHTML = '';
    const charts = this.content.charts;
    for (const chart of charts){
      const base64 = exportAllCanvas(document.getElementById(chart.id)).substr(22);
      imageHTML += '\n--' + boundary + '\n';
      imageHTML += 'Content-Location: file:\/\/\/C:\/report_files\/chart'+ chart.chartIndex + '.png' + '\n';
      imageHTML += 'Content-Transfer-Encoding: base64' + '\n';
      imageHTML += 'Content-Type: image/png' + '\n';
      imageHTML += '\n';
      imageHTML += base64 + '\n';
      imageHTML += '\n';
    }

    MHTML = MHTML.replace(/\{\{\$boundary\$\}\}/g, boundary)
                 .replace('{{$titlePage$}}', (this.setting.hasTitlePage && pages.length > 1)?'yes':'no')
                 .replace('{{$pageSize$}}', pageSize)
                 .replace('{{$pageMargin$}}', pageMargin)
                 .replace('{{$body$}}', bodyHTML)
                 .replace('{{$firstHeader$}}', fh1)
                 .replace('{{$firstFooter$}}', ff1)
                 .replace('{{$generalHeader$}}', h1)
                 .replace('{{$generalFooter$}}', f1)
                 .replace('{{$images$}}', imageHTML)
                 .replace(/{PAGE}/g, `
                  <!--[if supportFields]><span lang=EN-US>
                  <span style='mso-element:field-begin'></span>PAGE<span style='mso-element:field-separator'></span></span><![endif]--><span
                  style='mso-ansi-language:ZH-CN;mso-no-proof:yes'>1</span><!--[if supportFields]><span
                  lang=EN-US><span style='mso-element:field-end'></span></span><![endif]-->
                  `)

    if (saveAs){
      saveAs(new Blob([MHTML], {type:"text/html; charset=utf-8"}), 'report.doc');
    }
  }
  else if (type === 'json'){
    if(saveAs){
      saveAs(new Blob([JSON.stringify({setting:this.setting, content:this.content}, null, '\t')], {type: "text/plain; charset=utf-8"}), 'report_template.json')
    }
  }
};

pagedDoc.prototype.empty = function(){
  $(this.wrapper).empty();
  this.append();
  $.globalStorage.broadcastUpdatePagedDoc();
};

pagedDoc.prototype.load = function(template){
  if (template.setting && template.content){
    $(this.wrapper).empty();
    this.setting = template.setting;
    const charts = template.content.charts;
    const hasTitlePage = template.setting.hasTitlePage;
    const {firstHeader, firstFooter, header, footer} = template.content.headerFooter;

    for (const [i, page] of template.content.pageBody.entries()){
      const {newPage, newPageHeader, newPageBody, newPageFooter} = this.append('end');
      let pageBodyHTML = page.html;

      if (i === 0) {
        newPageHeader.innerHTML = (hasTitlePage)?(firstHeader?firstHeader:header):header;
        newPageFooter.innerHTML = (hasTitlePage)?(firstFooter?firstFooter:footer):footer;
      } else {
        newPageHeader.innerHTML = header;
        newPageFooter.innerHTML = footer;
      }

      newPageBody.innerHTML = pageBodyHTML;

      $(newPageBody).find('img').each(function(){
        const chartId = $(this).attr('data-chartID');console.log(chartId);

        if (chartId){
          for (const theChart of charts){
            if (theChart.id === chartId){
              const container = this.parentNode;
              const templateData = theChart.data;
              if (container){
                // 将img替换为chart对象
                $(container).empty();
                const newChart = new chart(container);
                $.globalStorage.charts.push(newChart);
                console.log(templateData);

                // 如果找到对应索引的测量文件，则绑定数据并画图
                for (const channel of templateData.channels){


                  // 按照fileId作为索引号，读取$.globalStorage.files中的文件
                  const importedFiles = $.globalStorage.files;
                  let importedMDFIndex = -1;
                  for (const filename in importedFiles){
                    const file = importedFiles[filename];

                    if (file && file.fileType === 'DAT'){
                      importedMDFIndex++;
                      if (importedMDFIndex === channel.fileId){
                        newChart.plot.bindMDF(file, [[channel.shortSignalName]], channel.groupId);
                      }
                    }
                  }
                }

                if (newChart.plot.data) newChart.plot.draw2({niceTimeDomain:true, niceValueDomain:true});
              }
            }
          }
        }

      });
      console.log('Page '+ (i+1) + ' loaded...');
    }
  }
};

pagedDoc.prototype.MHTMLTemplate = `
MIME-Version: 1.0
Content-Type: multipart/related; boundary="{{$boundary$}}"

--{{$boundary$}}
Content-Location: file:\/\/\/c:\/report.htm
Content-Type: text/html; charset="utf-8"

<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
<head>
<meta charset="utf-8" content="text/html; charset=utf-8">
<xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml>
<style>
body {
font-family: "Arial", "宋体";
font-size: 10pt;
}
ul{padding-left:1em;}
ol{padding-left:1em;}
@page Section1{
size: {{$pageSize$}};
margin: {{$pageMargin$}};
mso-first-header: url("report_files/headerfooter.htm") fh1;
mso-header: url("report_files/headerfooter.htm") h1;
mso-first-footer: url("report_files/headerfooter.htm") ff1;
mso-footer: url("report_files/headerfooter.htm") f1;
mso-title-page: {{$titlePage$}};
}
div.Section1 {page:Section1;}
</style>
</head>
<body>
<div class=Section1>
{{$body$}}
</div>
</body>
</html>

--{{$boundary$}}
Content-Location: file:\/\/\/c:\/report_files/headerfooter.htm
Content-Type: text/html; charset="utf-8"

<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<meta charset="utf-8" content="text/html; charset=utf-8">
<head>
<style>
body {
font-family: "Segoe UI", "宋体";
}
</style>
</head>
<body>
{{$firstHeader$}}
{{$generalHeader$}}
{{$firstFooter$}}
{{$generalFooter$}}
</body>
</html>

{{$images$}}

--{{$boundary$}}--
`;

(function(){
  $.fn.pluginName = function(option){
    var defaultSetting = {};
    var setting = $.extend(defaultSetting, option);

    // core
    this.css("color", setting.colorStr).css("fontSize", setting.fontSize+"px");

    return this;
  }
}(jQuery));
