;(function DCM_workplace_init(){
  // bind event for add btn
  $('#btn_add_condition').click(function(){
    let key1 = $('#select_condition').val();
    let key2 = $('#inputtext_condition_regexp').val();

    if (key1 && key2){
      let list = $('#list_condition_added');
      let liHTML = `<li style='opacity: 0;'><strong>`+key1+`:</strong> <code>`+key2+`</code></li>`;
      list.prepend(liHTML);
      list.children().first().animate({
        opacity: 1
      }, 200);
    }
  });

  // bind event for refresh DCM list btn
  $('#btn_refresh_DCM_list').click(function(){
    updateDCMList();
  })

})();

function updateDCMList(container="DCM_list"){
  let files;
  if ($global_file_manager) files = $global_file_manager.files;

  if (files){
    for (const filename in files){
      if (files[filename].filetype == 'DCM'){
        $('#'+container).prepend(`<li><code>`+filename+`</code></li>`);
        $('#'+container).children().first().dblclick(function(){
          $('#DCM_json_viewer').fadeOut();
          jsonToDetailTree($global_file_manager.files[filename], 'DCM_json_viewer');
          $('#DCM_json_viewer').fadeIn();
        });
      }
    }
  }
}
