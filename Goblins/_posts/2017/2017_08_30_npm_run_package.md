# npm打包注意事项

```
{
  "name": "DTCListGenerator(EAO)",
  "version": "2.0.0",
  "description": "DTC List Generator (EAO) 2.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "watch": "watchify app/appEntry.js -t babelify -o public/js/bundle.js --debug --verbose",
    "package": "electron-packager ./ FA6AToolForPA --overwrite --app-version=2.0.0 --platform=win32 --arch=ia32 --ignore=node_modules/electron-*"
  },
  "repository": "",
  "keywords": [
    "OBD"
  ],
  "author": "SUKE",
  "license": "CC0-1.0",
  "devDependencies": {
    "browserify": "^14.4.0",
    "electron": "~1.6.2",
    "electron-packager": "^8.7.2",
    "electron-prebuilt": "^1.4.13",
    "electron-reload": "^1.2.1",
    "watchify": "^3.9.0"
  },
  "dependencies": {
  }
}
```
- version 版本号不可用X.X的格式，例如使用2.0，就会报错

- asar 压缩resources
packge完成后，进入[packageAPP]/resources目录，运行asar pack ./app app.asar 命令即可

- 在asar中的图片引用失效的问题
文件名要严格一致，大小写敏感
引用路径，同一目录下要加上./

