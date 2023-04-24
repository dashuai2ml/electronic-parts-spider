# Electronic Parts Spider
<div align=center>
  <img src="https://github.com/dashuai2ml/electronic-parts-spider/blob/main/other/Spider.png"></img>
</div>

![](https://img.shields.io/badge/Language-TypeScript-brightgreen) ![](https://img.shields.io/badge/License-MIT-orange)

这是一个使用TypeScript编写的网络爬虫程序，旨在从Digikey和Mouser网站中提取有关电子元器件详细信息。该程序利用ORM框架与MYSQL数据库进行集成，实现种子数据->抓取->解析->存储的过程，同时采取措施对抗反爬虫手段。

## 特点

- 支持从Digikey和Mouser网站爬取电子元器件信息。
- 采用TypeScript确保类型安全及减少出错概率。
- 与ORM框架集成，实现数据持久化至MYSQL数据库。
- 采用反反爬虫技术抗击反爬虫手段。
- 抓取数据后进行数据清洗和过滤，确保准确性和可用性。

## 开始使用

在运行该程序前，需要进行以下步骤：

1. 安装Node.js和NPM
2. 安装MYSQL数据库并创建存储数据的模式。
3. 在```ormconfig.json```文件中设置数据库连接参数。
4. 运行```npm install```命令，安装依赖项。

完成上述步骤后，可使用以下命令运行程序：

```
npm run start
```

## 工作原理

程序首先获取种子数据，其中包含Digikey和Mouser网站上电子元器件详情页面的URL。这是爬取过程的起点。

程序通过使用一个无头浏览器（Puppeteer）来模拟浏览网页的行为，请求网页并解析获取相关数据。为避免被反爬虫技术检测，程序采用多种技术，如伪造用户代理、IP轮换、页面请求延迟等。

爬取过程完成后，程序会清洗和过滤获取的数据，并将其存储到MYSQL数据库中。

## 总结

电子元器件爬虫项目是一个有效而强大的工具，可从Digikey和Mouser网站中提取电子元器件信息。该程序采用TypeScript和ORM框架以确保类型安全和数据持久性，并采用反反爬虫技术对抗反爬虫措施。使用该工具，用户可以快速轻松地获取其项目所需的电子元器件数据。

## License (MIT)
Copyright © 2020 dashuai

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
