目前手上的关于MDF文件处理的库有以下几个：

1. MDF4Reader/MDF4Writer (C++, COM)
- 在C#中调用时，有safearray的转换问题
- API不多，且比较低级
- dll文件大小在2.3MB左右，过大

2. MDFLibrary　(C#)
- 体积小，只有不到40kB
- API比较高级
- 有bug，在测试中发现，读取某个通道会报错，无法取回数据

3. mdfreader (python)
- 主页上宣称可读写，写入没测试过

4. MDF (javasript)
- 原始版本有bug，在读取布尔型通道时可能会出现浮点数。在0.9版本已修复。
