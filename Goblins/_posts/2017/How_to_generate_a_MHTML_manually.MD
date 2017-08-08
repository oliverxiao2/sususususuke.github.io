# 通过MHTML，利用前端就能生成word，这太棒了
## 先让我们看下主要格式

```
MIME-Version: 1.0
Content-Type: multipart/related; boundary="{{$boundary$}}"

--{{$boundary$}}
Content-Location: file:///c:/report.htm
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
Content-Location: file:///c:/report_files/headerfooter.htm
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

```
## 缩进问题
不能有缩进。
是的，你需要巧妙地设置好字符串的拼接，确保带有关键字的行的行首是没有缩进的。为了方便起见，可以每行都顶格写，事实上，MSWord生成的MHTML文档就是不带缩进的。

## 分隔符 boundary
分隔符是一个自定义的字符串，理论上你可以使用任意字符串，只要确保在其他字符区域不会意外出现同样的字符串。推荐的分隔符格式如下
```
const boundary = '----=_NextPart_GREEDY.GOBLINS.SHOW.ME.THE.MONEY';
```
分隔符中最好带有字符`.`，因为base64编码中没有`.`,我们可以确保冗长的base64编码中绝对不会意外赏我们个bug。
定义好分隔符，在使用时，以双短划线开头：
```
--boundary
```
而在文件结尾处的分隔符，开头和结尾都必须有双短划线：
```
--boundary--
```
请注意到其中的区别，并仔细地检查，确保无误。

## 文件名的定义
用绝对路径比相对路径好使多了，而且你没必要真的把文件放在你写的绝对路径上。
另外注意定义附件时的文件夹（report => /report_files）的名称。
- body
```
Content-Location: file:///c:/report.htm
Content-Type: text/html; charset="utf-8"
```

- headerfooter
```
Content-Location: file:///c:/report_files/headerfooter.htm
Content-Type: text/html; charset="utf-8"
```

- images
```
Content-Location: file:///c:/report_files/chart1.png
Content-Transfer-Encoding: base64
Content-Type: image/png
```

## 页面样式
如果缺少css定义，页面里的html是显示不出来的。
```
<head>
...
<style>
div.Section1 {page:Section1;}
...
</head>
<body>
<div class="Section1">
// Core page html here
</div>
</body>
```

## 页眉页脚
注意页眉页脚的css和id（定义在body的html中）就好

- file:///c:/report.htm
```

<head>
...
<style>
mso-first-header: url("report_files/headerfooter.htm") fh1;
mso-header: url("report_files/headerfooter.htm") h1;
mso-first-footer: url("report_files/headerfooter.htm") ff1;
mso-footer: url("report_files/headerfooter.htm") f1;
mso-title-page: {{$titlePage$}};
...
</head>
<body>
<div class="Section1">
// Core page html here
</div>
</body>
```

file:///c:/report_files/headerfooter.htm
```
<div style="mso-element:header;" id="fh1"></div>
<div style="mso-element:header;" id="h1"></div>
<div style="mso-element:footer;" id="ff1"></div>
<div style="mso-element:footer;" id="f1"></div>
```
