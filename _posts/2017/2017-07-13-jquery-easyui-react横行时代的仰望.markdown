---
layout: "post"
title: "jquery easyui, React横行时代的仰望"
date: "2017-07-13 21:31"
---

# 适合自己的哲学

尺有所短，寸有所长。

Jquery easyui 笔记

* menu的属性
```
// menu property
$("#mm").data().menu.options.duration = 1000;
```

* 开发所见即所得编辑器时，在编辑器中预先渲染成A4尺寸带有box-shadow的div，插入chart控件后，legendTable部分的字体自动带有黑色shadow，奇葩的是，再运行一次fillText，原来文字的shadow会消失。

* ui插件 jquery

(function(){
  $.fn.pluginName = function(option){
    var defaultSetting = {};
    var setting = $.extend(defaultSetting, option);
    
    // core
    this.css("color", setting.colorStr).css("fontSize", setting.fontSize+"px");
    
    return this;
  }
}(jQuery));
