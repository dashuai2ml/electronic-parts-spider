import Redis from "redis"
import {createConnection, Connection} from "typeorm";
import * as superagent from "superagent"
import proxy from "superagent-proxy"
import cheerio from "cheerio"
import puppeteer  from 'puppeteer-core'


import { Spider } from ".";
import { SearchDetailData } from "../data";
import { Seed } from "../entity/Seed";
import { DigikeyPartDetail } from "../entity/DigikeyPartDetail";

proxy(superagent)

export class DigiKeySearchSpider implements Spider  {
  private redis;
  private connection: Promise<Connection>;
  private host:string;
  private browser: Promise<puppeteer.Browser>;

  constructor(public redisConf: Redis.ClientOpts,
              public delay: number = 2,
              public checkQueueInterval:number=5,
              public checkQueueMinLength:number=3,
              public loadDataLength:number=13,
              public queueName:string = "digiKeySearchUrl") {
    this.redis = Redis.createClient(redisConf)
    this.connection = createConnection()
    this.host = "https://www.digikey.tw"
    this.browser = puppeteer.launch({executablePath: "D:\\chrome-win\\chrome.exe", headless: true})
  }

  private checkQueueLength():void  {
    this.redis.scard(this.queueName, async (err, num)=>{
      if (err) {
        console.log(err)
        return
      }
      if (num<this.checkQueueMinLength) {
        console.log(`队列长度：${num}, 触发数据加载...`)
        const res:Array<any> = await (await this.connection).getRepository(Seed)
          .query(`select s.USI_PN,s.Manufacturer_Name,s.Manufacturer_PN from seed s \
                  where not exists(select m.Manufacturer_PN from digikey_part_detail m \
                  where m.USI_PN=s.USI_PN) \
                  limit ${this.loadDataLength}`)

        if (res.length > 0){
          console.log(`开始加载数据，共 ${res.length} 条...`)
          const baseUrl = this.host+"/products/en/?keywords="
          this.redis.sadd(this.queueName, ...res.map(v=> {
            return [v.USI_PN, v.Manufacturer_Name, v.Manufacturer_PN, baseUrl+v.Manufacturer_PN].join("#_#")
          }))
        } else {
          console.log(`数据库存量数据已经取完了。`)
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

      const url = data.split("#_#")[3]
      console.log("Request:", url)
      const page = await (await this.browser).newPage()
      try {
        await page.goto(url,{waitUntil: "domcontentloaded"})
        this.prase(await page.content(), data)
      } catch (error) {
        console.log('Request Faild:', error.message)
      } finally {
        await page.close()
        setTimeout(()=>{this.crawl()}, 1000*this.delay)
      }
    })
  }

  prase(content: string, source: string):void {
    const $ = cheerio.load(content)

    let result:SearchDetailData = {
      USI_PN: source.split("#_#")[0],
      Manufacturer_Name: source.split("#_#")[1],
      Manufacturer_PN: source.split("#_#")[2],
      Status: "WAIT",
      Detail_Url: ""
    }

    const title = $("head > title").text().trim()
    if (title.includes("No Results Found")){ // 没搜到结果
      result.Status = "NO_RESULT"
    } else if ($("#matching-records-text").text().trim() !== ''){ // 搜索到多个结果
      const partName = $("#lnkPart > tr:nth-child(1) > td.tr-mfgPartNumber > a > span").text().trim()
      if (partName !== result.Manufacturer_PN) { // 搜索结果不完全匹配
        result.Status = "NO_MATCH"
      }
      const detailUrl = $("#lnkPart > tr:nth-child(1) > td.tr-mfgPartNumber > a").attr("href") || ""
      result.Detail_Url = detailUrl
    } else if (title.includes(source.split("#_#")[2])) { // 唯一结果
      result.Detail_Url = source.split("#_#")[3].replace(this.host, '')
    } else {
      result.Status = "NO_MATCH_ONE"
    }

    this.store(result)
  }

  async store(data: SearchDetailData) {
    const detailData = new DigikeyPartDetail()
    detailData.USI_PN = data.USI_PN
    detailData.Manufacturer_Name = data.Manufacturer_Name
    detailData.Manufacturer_PN = data.Manufacturer_PN
    detailData.Status = data.Status
    detailData.Detail_Url = data.Detail_Url
    // console.log(detailData)
    try {
      await (await this.connection).manager.save(detailData)
      console.log("Store:", detailData)
    } catch (error) {
      console.log(error.message)
    }

  }
}
