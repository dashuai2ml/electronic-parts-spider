# electronic-parts-spider
抓取元器件详细信息的爬虫程序，使用 TypeScript 实现。

目标网站：
* Digikey
* Mouser

使用 ORM 框架对接 MYSQL, 实现了`种子数据->抓取->解析->入库`全流程，并且屏蔽了一些反爬虫手段。
