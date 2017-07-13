function addPanel(containerID, append=true, opt={}){
  let htmlTemplate = `
    <div class="myPanel" style="{$style$}">
      <div role="head">
        <div role="title">{$title$}</div>
        <div role="minimize"><i class="fa fa-eye-slash"></i></div>
      </div>
      <div role="body" style="{$bodyStyle$}">
        <div>
          {$body$}
        </div>
      </div>
      <div role="foot">
        {$foot$}
      </div>
    </div>
  `;
  let params = {};
  params.style = opt.style?opt.style:'width:100%;';
  params.bodyStyle = opt.bodyStyle?opt.bodyStyle:'height:200px;overflow-y:scroll;';
  params.title = opt.title?opt.title:'Panel Title';
  params.head = opt.head?opt.head:'';
  params.body = opt.body?opt.body:'';
  params.foot = opt.foot?opt.foot:'';

  let html = htmlTemplate
    .replace('{$style$}', params.style)
    .replace('{$bodyStyle$}', params.bodyStyle)
    .replace('{$title$}', params.title)
    .replace('{$body$}', params.body)
    .replace('{$foot$}', params.foot);

  let container = $('#'+containerID);
  if (container){
    if ( typeof(container[0]) === 'object' ){
      if (append) container.append(html);
      else container.prepend(html);
    }
  }
}
