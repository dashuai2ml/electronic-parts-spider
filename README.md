# Electronic Parts Spider
<div align=center>
  <img src="https://github.com/dashuai2ml/electronic-parts-spider/blob/main/other/Spider.png"></img>
</div>

![](https://img.shields.io/badge/Language-TypeScript-brightgreen) ![](https://img.shields.io/badge/License-MIT-orange)

[中文](https://github.com/dashuai2ml/electronic-parts-spider/blob/main/other/README-zh.md)

This is a web spider program written in TypeScript, aimed at extracting detailed information about electronic components from the Digikey and Mouser websites. The program utilizes an ORM framework to integrate with MYSQL database, implementing a seed data -> crawling -> parsing -> storage process, while also taking measures to counteract anti-spider measures.

## Features

- Support crawling of electronic component information from Digikey and Mouser websites.
- Utilize TypeScript to ensure type-safe and error-free development.
- Integration with an ORM framework for data persistence in MYSQL database.
- Employ anti-anti-spider techniques to combat anti-spider measures.
- Clean and filter data after crawling to ensure accuracy and usefulness.

## Getting Started

Before running the program, the following steps need to be taken:

1. Install Node.js and NPM
2. Install MYSQL database and create a schema for storing data.
3. Set up the database connection parameters in ```ormconfig.json``` file.
4. Run ```npm install``` command to install dependencies.


After completing these steps, the program can be run using the following command:

```
npm run start
```

## How It Works

The program starts by retrieving seed data, which contains URLs to electronic component details pages on the Digikey and Mouser websites. This is the starting point for the crawling process.

The program then emulates web browsing by using a headless browser (Puppeteer) to request web pages, which are subsequently parsed for relevant data. To avoid detection by anti-spider measures, the program employs a variety of techniques such as user agent spoofing, IP rotation, and page request delays.

Once the crawling process finishes, the program cleans and filters the retrieved data, and then stores it in the MYSQL database.

## Conclusion

The Electronic Parts Spider Project is a powerful and effective tool for extracting electronic component information from the Digikey and Mouser websites. The program utilizes TypeScript and an ORM framework to ensure type safety and data persistence, while also employing anti-anti-spider techniques to counteract anti-spider measures. With this tool, users can quickly and easily gather the electronic component data they need for their projects.


## License (MIT)
Copyright © 2020 dashuai

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
