import Redis from "redis"
import {createConnection, Connection} from "typeorm";
import * as superagent from "superagent"
import proxy from "superagent-proxy"
import cheerio from "cheerio"
import puppeteer  from 'puppeteer-core'

import { Spider } from ".";
import { DigikeyPartDetail } from "../entity/DigikeyPartDetail";
import { DigiKeyProductData, DigiKeyProductOverview, ProductDetailData } from "../data";

proxy(superagent)

export class DigiKeyProductSpider implements Spider  {
  private redis;
  private connection: Promise<Connection>;
  private host:string;
  private browser: Promise<puppeteer.Browser>

  constructor(public redisConf: Redis.ClientOpts,
              public delay: number = 2,
              public checkQueueInterval:number=5,
              public checkQueueMinLength:number=3,
              public loadDataLength:number=13,
              public queueName:string = "digiKeyProductUrl") {
    this.redis = Redis.createClient(redisConf)
    this.connection = createConnection()
    this.host = "https://www.digikey.tw"
    this.browser = puppeteer.launch({executablePath: "D:\\chrome-win\\chrome.exe",headless: true})
  }

  private checkQueueLength():void  {
    this.redis.scard(this.queueName, async (err, num)=>{
      if (err) {
        console.log(err)
        return
      }
      if (num<this.checkQueueMinLength) {
        console.log(`队列长度：${num}, 触发数据加载...`)
        const res:Array<any> = await (await this.connection).getRepository(DigikeyPartDetail)
          .query(`select m.USI_PN,m.Detail_Url from digikey_part_detail m \
                  where m.Status='WAIT'\
                  limit ${this.loadDataLength}`)

        if (res.length > 0){
          console.log(`开始加载数据，共 ${res.length} 条...`)
          this.redis.sadd(this.queueName, ...res.map(v=> [v.USI_PN, this.host+v.Detail_Url].join("#_#")))
        } else {
          console.log(`数据库存量链接已经取完了。`)
        }
      }
    })
  }

  dispatch():void {
    setInterval(()=>this.checkQueueLength(), 1000*this.checkQueueInterval)
  }

  crawl(): void {
    this.redis.spop(this.queueName, async (err, data)=>{
      if (err){
        console.log(err)
        return
      }
      if (data===null) {
        setTimeout(()=>{this.crawl()}, 1000*this.delay)
        return
      }

      const url = data.split("#_#")[1]
      console.log("Request:", url)
      const page = await (await this.browser).newPage()
      try {
        await page.goto(url,{waitUntil: "domcontentloaded"})
        await this.prase(page, data)
        await page.close()
      } catch (error) {
        console.log('Request Faild:', error.message)
        // await page.close()
      } finally {
        setTimeout(()=>{this.crawl()}, 1000*this.delay)
      }
    })
  }

  async prase(page: puppeteer.Page, source: string) {
    const $ = cheerio.load(await page.content())
    // 数据初始化
    let fixedData: DigiKeyProductOverview = {
      DigiKey_PN: '',
      Mfr_PN: '',
      Mfr:'',
      Category: [],
      Description: '',
      Datasheet: '',
      Manufacturer_SLT: '',
      Image_Url: '',
      Detailed_Description: ''
    }

    let jsonData: DigiKeyProductData = {
      Overview: fixedData,
      Document_Media: {},
      Attributes: {}
    };

    let result:ProductDetailData = {
      Product_Data: jsonData,
      Updated_Date: new Date()
    }

    // 解析 fixedData
    $("#content > div.breadcrumbs > a").each((i, el)=>{
      fixedData.Category.push($(el).text().trim())
    })
    fixedData.Datasheet = $("a.lnkDatasheetDownload").attr("href") || ""
    fixedData.Description = $("#product-overview > tbody > tr:nth-child(4) > td:nth-child(2)").text().trim()
    fixedData.Detailed_Description = $("td > h3").text().trim()
    fixedData.DigiKey_PN = $("#reportPartNumber").text().trim()
    fixedData.Image_Url = $("#product-photo > div.product-photo-wrapper > a").attr("href") || ""
    fixedData.Manufacturer_SLT = $("#product-overview > tbody > tr:nth-child(5) > td:nth-child(2) > span").text().trim()
    fixedData.Mfr = $("#product-overview > tbody > tr:nth-child(2) > td:nth-child(2) > h2 > span > a > span").text().trim()
    fixedData.Mfr_PN = $("#product-overview > tbody > tr:nth-child(3) > td:nth-child(2)").text().trim()

    if (fixedData.DigiKey_PN === ''){
      const cookieList = await page.cookies()
      if (cookieList.length > 5){
        console.log("Restart browser...");
        (await this.browser).close()
        this.browser = puppeteer.launch({executablePath: "D:\\chrome-win\\chrome.exe",headless: true})
        return
      }
      console.log("Waring:", "检测到反爬虫策略，被迫暂停30秒")
      await new Promise(resolve => setTimeout(resolve, 1000*30))
      return
    }

    if (fixedData.Image_Url !== ''){
      fixedData.Image_Url = 'https:' + fixedData.Image_Url
    }

    // 解析Document_Media
    let docList = $("div.product-details-documents-media.product-details-section > table > tbody > tr")
    docList.each(function(i, el) {
      // this === el
      let key:string = $(el).find("th").text().trim()
      jsonData.Document_Media[key] = []
      $(el).find("td > span > a").each((i, el)=>{
        jsonData.Document_Media[key].push($(el).attr("href"))
      })
    })

    // 解析Attributes
    let attrList = $("#product-attribute-table > tbody > tr")
    attrList.each(function(i, el) {
      if (i===0){
        return
      } else if (i===2) {
        jsonData.Attributes['Sub Categories'] = $(el).find("td:nth-child(1) > a").text().trim()
        return
      }
      // this === el
      let key:string = $(el).find("th").text().trim()
      jsonData.Attributes[key] = $(el).find("td:nth-child(2)").text().trim()
    })
    // console.log(result.Product_Data)
    this.store(result, source)
  }

  async store(data: ProductDetailData, source: string) {
    try {
      await (await this.connection)
        .createQueryBuilder()
        .update(DigikeyPartDetail)
        .set({
          Product_Data: JSON.stringify(data.Product_Data),
          Updated_Date: new Date(),
          Status: 'CATCHED'
        })
        .where("USI_PN = :USI_PN", {USI_PN: source.split("#_#")[0]})
        .execute()

      console.log("Update:", data.Product_Data.Overview)
      // console.log("Update:", data.Product_Data)
    } catch (error) {
      console.log(error.message)
    }

  }
}
