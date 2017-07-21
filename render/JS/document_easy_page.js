/**
 * Created by ext.ming.xiao on 2017/7/13.
 */
"use strict";

window.pagedDoc = function(option){
    this.init(option);
    const pagedDocStyle = document.createElement('style');
    pagedDocStyle.innerHTML = `
    .page-shadow{box-shadow: 0px 0px 20px rgba(0, 0, 0, 0.4);}
    .doc-page{overflow: hidden; font-family: "Segoe UI", "宋体"; font-size: 14pt;}
    .doc-page-body{border-top: 1px dashed #999; border-bottom: 1px dashed #999;}
    .doc-page-header, .doc-page-footer{background: whitesmoke;opacity: 0.5;}
    `;
    document.head.appendChild(pagedDocStyle);
};

pagedDoc.prototype.init = function(option){
    let defaultSetting = {
        container: document.body,
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
      MDFCharts: [],
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
    this.setting.container.appendChild(this.wrapper);
    this.append();
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
  console.log(currentPage);
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
};

pagedDoc.prototype.save = function(){
  this.content.headerFooter = {
    firstHeader: '',
    firstFooter: '',
    header: '',
    footer: '',
  };
  this.content.pageBody = [];
  this.content.MDFCharts = [];

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

    const MDFChartsOnThisPage = pageBody.find('div[name=wrapper-chart]');
    for (let j = 0; j < MDFChartsOnThisPage.length; j++){
      totalChartIndex++;
      const data = MDFChartsOnThisPage[j].parentChart.plot.data;
      const theChartBase64 = exportAllCanvas(MDFChartsOnThisPage[j]).substr(22);
      const dataObj = {
        //base64: theChartBase64,
        chartIndex: totalChartIndex,
        id: MDFChartsOnThisPage[j].id,
        data: {},
      };

      for (const filename in data){
        dataObj.data[filename] = {
          windowTimeDomain: data[filename].windowTimeDomain,
          dataGroup:[],
        };
        for (const group of data[filename].dataGroup){
          let theGroup = {
            bitGroup: group.bitGroup,
            fixedHeight: group.fixedHeight,
            groupValueDomain: group.groupValueDomain,
            channels: [],
          };
          for (const ch of group.channels){
            theGroup.channels.push({
              cursor: ch.cursor,
              name: ch.name,
            });
          }
          dataObj.data[filename].dataGroup.push(theGroup);
        }
      }
      this.content.MDFCharts.push(dataObj);

      pageBodyHTML = pageBodyHTML.replace(MDFChartsOnThisPage[j].outerHTML, '<img src="report_files\/chart'+totalChartIndex+'.png">');
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

    for (let i = 0; i < pages.length  - 1; i++){
      bodyHTML += pages[i].html + '\n' + '<br clear=all style="mso-special-character:line-break;page-break-before:always">' + '\n';
    }
    bodyHTML += pages[pages.length-1].html;

    if (this.setting.hasTitlePage){
      fh1 = '<div style="mso-element:header;" id="fh1">'+ this.content.headerFooter.firstHeader + '</div>';
      ff1 = '<div style="mso-element:footer;" id="ff1">'+ this.content.headerFooter.firstFooter + '</div>';
    }

    h1 = '<div style="mso-element:header;" id="h1">' + this.content.headerFooter.header + '</div>';
    f1 = '<div style="mso-element:footer;" id="f1">' + this.content.headerFooter.footer + '</div>';

    let imageHTML = '';
    const charts = this.content.MDFCharts;
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
                 .replace('{{$images$}}', imageHTML);

    if (saveAs){
      saveAs(new Blob([MHTML], {type:"text/html; charset=utf-8"}), 'Report.doc');
    }
  }
  else if (type === 'json'){
    if(saveAs){
      saveAs(new Blob([JSON.stringify(this.content, null, '\t')], {type: "text/plain; charset=utf-8"}), 'report_template.json')
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
font-family: "Segoe UI", "宋体";
font-size: 12pt;
}
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
