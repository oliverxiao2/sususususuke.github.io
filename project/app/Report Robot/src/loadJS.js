function loadJS(url, callback, test){
  let node = document.createElement('script');

  node[window.addEventListener ? "onload":"onreadystatechange"] = function(){
    if(window.addEventListener || /loaded|complete/i.test(node.readyState)){
      if (typeof callback === 'function') callback();
      node.onreadystatechange = null;
    }
  }
  node.onerror = function(){};
  node.src = url;
  let head = document.getElementsByTagName("head")[0];
  head.insertBefore(node, head.firstChild);
}
