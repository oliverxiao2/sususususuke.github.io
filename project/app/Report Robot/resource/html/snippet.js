window.snippet = {
  "toolbar": `
    <style>
      .toolbar-body button{
      border:none;
      background: transparent;
      }
      .toolbar-body button p{
        font-size: 11px;
      }
    </style>
    <div id='fixed-toolbar-wrapper' style='display:block;'>
      <!--head-->
      <div class='toolbar-head'>
        <ul id='list_toolbar_tabs_head' class="myList-flex-row" style="padding-left: 4;">
          <li class="active" data-toolbar-tabs='start'>
            <div class="tab-body">开始</div>
          </li>
          <li class="inactive" data-toolbar-tabs='table'>
            <div class="tab-body">表格</div>
          </li>
          <li class="inactive" data-toolbar-tabs='A2L'>
            <div class="tab-body">A2L &amp; HEX</div>
          </li>
          <li class="inactive" data-toolbar-tabs='DTC'>
            <div class="tab-body">DTC检查</div>
          </li>
          <li class="inactive" data-toolbar-tabs='Other'>
            <div class="tab-body">Other</div>
          </li>
        </ul>
      </div>

      <!--body-->
      <div class="toolbar-body">
        <ul id='list_toolbar_tabs_content' style="padding-left: 0;">
          <!--start-->
          <li class="active" data-toolbar-tabs-content='start'>
            <div class="toolbar-group">
              <i class="fa fa-paper-plane fa-2x" title="导入文件"><p>文件列表</p></i>
            </div>

            <div class="toolbar-group">
              <input type="file" id="btn_toolbar_upload_files" class="hide" multiple/>
              <label for="btn_toolbar_upload_files"><i class="fa fa-folder-open fa-2x" title="导入文件"><p>打开文件</p></i></label>
            </div>

            <div class="toolbar-group" style="border-right: 1px solid #CCC;padding-top: 4px;">
              <p><i class="fa fa-trash fa-lg" title="删除文件"></i></p>
              <p><i class="fa fa-eraser fa-lg" title="清空所有文件"></i></p>
            </div>

            <div class="toolbar-group">
              <i class="fa fa-filter fa-2x disabled" role="function_filter"><p>数据筛选</p></i>
            </div>

            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_new_page"><p>新建页面</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_bindMDF_for_chart"><p>绑定数据</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_insert_table"><p>插入表格</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_insert_ol"><p>插入有序列表</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_insert_ul"><p>插入无序列表</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_insert_chart"><p>插入图表</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_save_as_doc"><p>输出DOC</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_save_as_template"><p>另存为模板</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_merge_cells"><p>合并单元格</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_save_as_template"><p>删除表格</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_change_font_size"><p>字号</p></i>
            </div>
            <div class="toolbar-group">
              <button class="fa fa-clipboard fa-2x" id="btn-justify-left"><p>居左</p></button>
            </div>
            <div class="toolbar-group">
              <button class="fa fa-clipboard fa-2x" id="btn-justify-center"><p>居中</p></button>
            </div>
            <div class="toolbar-group">
              <button class="fa fa-clipboard fa-2x" id="btn-justify-right"><p>居右</p></button>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" id="btn-clear-blank-line"><p>清除空行</p></i>
            </div>
          </li>

          <!--DCM-->
          <li class="inactive" data-toolbar-tabs-content='DCM'>
            <div class="toolbar-group">
                <i id='btn_refresh_DCM_list' class="fa fa-refresh fa-2x" title="更新DCM列表"><p>更新DCM列表</p></i>
            </div>
            <div class="toolbar-group">
                <i id='btn_refresh_DCM_list' class="fa fa-tree fa-2x" title="更新DCM列表"><p>树状图</p></i>
            </div>
            <div class="toolbar-group">
                <i id='btn_refresh_DCM_list' class="fa fa-list fa-2x" title="更新DCM列表"><p>列表显示</p></i>
            </div>
            <div class="toolbar-group" style="display: flex; flex-direction: row;">
              <div style="padding-right: 10px;">
                <i class="fa fa-plus-square fa-2x" title="添加条件"><p>添加条件</p></i>
              </div>
              <div>
                <p><i class="fa fa-trash fa-lg" title="删除条件"></i></p>
                <p><i class="fa fa-eraser fa-lg" title="清空所有条件"></i></p>
              </div>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-search fa-2x"><p>执行搜索</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-save fa-2x"><p>保存结果</p></i>
            </div>
            <div class="toolbar-group">
              <p><i class="fa fa-mail-forward fa-lg" title=""></i><font>重做</font></p>
              <p><i class="fa fa-mail-reply fa-lg" title=""></i><font>撤销</font></p>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-table fa-2x"><p>存为表格</p></i>
            </div>
          </li>

          <!--Document-->
          <li class="inactive" data-toolbar-tabs-content='Document'>

          </li>
        </ul>
      </div>
    </div>
  `,


  "panel_file_list_table_template": `
    <table class="table_style01" width="100%">
      <colgroup>
        <col width="15%" />
        <col width="75%" />
        <col />
      </colgroup>
    </table>
  `,


  "panel_workplace_toolbar_for_A2L": `
    <div class="myPanel-toolbar" style="margin:3px;border-bottom:1px solid rgb(218,218,218);" role="panel-toolbar">
      <!-- data field -->
      <span>
        <select role="category">
          <option value="CHARACTERISTIC">CHARACTERISTIC</option>
          <option value="MEASUREMENT">MEASUREMENT</option>
          <option value="FUNCTION">FUNCTION</option>
          <option value="SYSTEM CONSTANT">SYSTEM CONSTANT</option>
          <option value="Other">Other</option>
        </select>
      </span>
      <!-- count -->
      <span>数量：</span><span role="count">12888</span>
      <!-- divider -->
      <div style="display:inline-block"></div>
      <!-- filter -->
      <div style="display:inline-block"><input type="text" name="" value="" role="filter" placeholder="Filter"></div>
      <!-- btn refresh -->
      <span><i class="fa fa-refresh"></i></span>
      <!-- btn save -->
      <span><i class="fa fa-save" role=save ></i></span>
      <!-- select column -->
      <span>
        <select role="column">
        </select>
      </span>
    </div>
  `,


  "toolbar_FA6A": `
    <div id='fixed-toolbar-wrapper'>
      <!--head-->
      <div class='toolbar-head'>
        <ul id='list_toolbar_tabs_head' class="myList-flex-row" style="padding-left: 4;">
          <li class="active" data-toolbar-tabs='start'>
            <div class="tab-body">开始</div>
          </li>
          <li class="inactive" data-toolbar-tabs='DCM'>
            <div class="tab-body">故障路径交付设置</div>
          </li>
          <li class="inactive" data-toolbar-tabs='A2L'>
            <div class="tab-body">- - -</div>
          </li>
          <li class="inactive" data-toolbar-tabs='DTC'>
            <div class="tab-body">- - -</div>
          </li>
          <li class="inactive" data-toolbar-tabs='Other'>
            <div class="tab-body">- - -</div>
          </li>
        </ul>
      </div>

      <!--body-->
      <div class="toolbar-body">
        <ul id='list_toolbar_tabs_content' style="padding-left: 0;">
          <!--start-->
          <li class="active" data-toolbar-tabs-content='start'>
            <div class="toolbar-group">
              <i class="fa fa-paper-plane fa-2x" title="导入文件"><p>文件列表</p></i>
            </div>

            <div class="toolbar-group">
              <input type="file" id="btn_toolbar_upload_files" class="hide" multiple/>
              <label for="btn_toolbar_upload_files"><i class="fa fa-folder-open fa-2x" title="导入文件"><p>打开文件</p></i></label>
            </div>

            <div class="toolbar-group" style="border-right: 1px solid #CCC;padding-top: 4px;">
              <p><i class="fa fa-trash fa-lg" title="删除文件"></i></p>
              <p><i class="fa fa-eraser fa-lg" title="清空所有文件"></i></p>
            </div>

            <div class="toolbar-group">
              <i class="fa fa-filter fa-2x disabled" role="function_filter"><p>数据筛选</p></i>
            </div>

            <div class="toolbar-group">
              <i class="fa fa-clipboard fa-2x" role="function_bind"><p>绑定A2L&HEX</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-shower fa-2x" role="function_view"><p>查看模块</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-bar-chart fa-2x"><p>输出EXCEL</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-calculator fa-2x"><p>对比数据</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-binoculars fa-2x"><p>全局搜索</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-database fa-2x"><p>算法库</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-clone fa-2x"><p>批量操作</p></i>
            </div>
          </li>

          <!-- 2 -->
          <li class="inactive" data-toolbar-tabs-content='DCM'>
            <div class="toolbar-group">
                <i id='btn_refresh_DCM_list' class="fa fa-refresh fa-2x" title="" role="function_add_dataset"><p>添加</p></i>
            </div>
            <div class="toolbar-group">
                <i id='btn_refresh_DCM_list' class="fa fa-tree fa-2x" title="更新DCM列表"><p>移除</p></i>
            </div>
            <div class="toolbar-group">
                <i id='btn_refresh_DCM_list' class="fa fa-list fa-2x" title="更新DCM列表"><p>列表显示</p></i>
            </div>
            <div class="toolbar-group" style="display: flex; flex-direction: row;">
              <div style="padding-right: 10px;">
                <i class="fa fa-plus-square fa-2x" title="添加条件"><p>添加条件</p></i>
              </div>
              <div>
                <p><i class="fa fa-trash fa-lg" title="删除条件"></i></p>
                <p><i class="fa fa-eraser fa-lg" title="清空所有条件"></i></p>
              </div>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-search fa-2x"><p>执行搜索</p></i>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-save fa-2x"><p>保存结果</p></i>
            </div>
            <div class="toolbar-group">
              <p><i class="fa fa-mail-forward fa-lg" title=""></i><font>重做</font></p>
              <p><i class="fa fa-mail-reply fa-lg" title=""></i><font>撤销</font></p>
            </div>
            <div class="toolbar-group">
              <i class="fa fa-table fa-2x"><p>存为表格</p></i>
            </div>
          </li>

          <!--Document-->
          <li class="inactive" data-toolbar-tabs-content='Document'>

          </li>
        </ul>
      </div>
    </div>
  `,


  "document_page": `<div style="display: flex; flex-direction: column;" role="page">
    <div role="page-head" contenteditable="true">
        <div>&nbsp;</div>
        <div>&nbsp;</div>
    </div>
    <div style="flex-grow: 1;" role="page-body" contenteditable="true"></div>
    <div role="page-foot" contenteditable="true">
        <div>&nbsp;</div>
        <div>&nbsp;</div>
    </div>
  </div>`,


  "MHTML_template": `
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
{{$style_pageSetup$}}
{{$style_headerAndFooter$}}
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
  `,
};
