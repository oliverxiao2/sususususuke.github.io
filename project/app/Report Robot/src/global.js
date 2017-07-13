// define the global file manager;
window.$global_file_manager = {
  files:{},
  selected:{}
};

window.$global = {
};

document.addEventListener('click', function(evt){
  // when focus or blur on figures, update the box shadow status
  if ($global.blurSubscribers != undefined){
    const target = evt.target;
    let box;
    for (const subscriber of $global.blurSubscribers){
      box = subscriber.contains?subscriber:(subscriber.wrapper?subscriber.wrapper:null);
      if (box.contains){
        if (box.contains(target)) subscriber.focused = true;
        else subscriber.focused = false;
      }
    }
  }
  //
});
