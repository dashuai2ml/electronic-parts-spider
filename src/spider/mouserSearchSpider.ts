import Redis from "redis"
import {createConnection, Connection} from "typeorm";
import * as superagent from "superagent"
import proxy from "superagent-proxy"
import cheerio from "cheerio"

import { Spider } from ".";
import { SearchDetailData } from "../data";
import { Seed } from "../entity/Seed";
import { MouserPartDetail } from "../entity/MouserPartDetail";

proxy(superagent)

export class MouserSearchSpider implements Spider  {
  private redis;
  private connection: Promise<Connection>;
  private host:string;

  constructor(public redisConf: Redis.ClientOpts,
              public delay: number = 2,
              public checkQueueInterval:number=5,
              public checkQueueMinLength:number=3,
              public loadDataLength:number=13,
              public queueName:string = "mouserSearchUrl") {
    this.redis = Redis.createClient(redisConf)
    this.connection = createConnection()
    this.host = "https://www.mouser.com"
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
                  where not exists(select m.Manufacturer_PN from mouser_part_detail m \
                  where m.USI_PN=s.USI_PN) \
                  limit ${this.loadDataLength}`)

        if (res.length > 0){
          console.log(`开始加载数据，共 ${res.length} 条...`)
          const baseUrl = this.host+"/Search/Refine?Keyword="
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
      const headers = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'referer': 'https://www.mouser.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 Edg/86.0.622.69',
      }
      const url = data.split("#_#")[3]
      console.log("Request:", url)
      try {
        const res = await superagent
          .get(url)
          .redirects(0)
          .timeout({
            response: 10*1000,  // 接收到服务端响应时间不超过 20 秒
            deadline: 15*1000, // 整个请求的超时时间为 40 秒
          })
          .set(headers)
          .ok(res => res.status < 400)
        // .proxy("http://127.0.0.1")
        this.prase(res, data)
      } catch (error) {
        console.log(error.message)
        setTimeout(()=>{this.crawl()}, 1000*this.delay)
      }
    })
  }

  prase(resp: superagent.Response, source: string):void {
    console.log("Status:", resp.status)
    const $ = cheerio.load(resp.text)

    let result:SearchDetailData = {
      USI_PN: source.split("#_#")[0],
      Manufacturer_Name: source.split("#_#")[1],
      Manufacturer_PN: source.split("#_#")[2],
      Status: "WAIT",
      Detail_Url: ""
    }

    if (resp.status === 301) {
      result.Detail_Url = resp.header["location"]
      // console.log("Got detail url:", result.Detail_Url)
    } else if (resp.status===200){
      // 没有搜索到结果
      if ($("div.alert.alert-danger.text-center > div > strong").text().trim().includes("Sorry")){
        result.Status = "NO_RESULT"
        console.log("NO_RESULT")
        this.store(result)
        setTimeout(()=>{this.crawl()}, 1000*this.delay)
        return
      }

      const detailUrl = $("#lnkMfrPartNumber_1").attr("href")||""
      // 正常搜索到结果
      if (detailUrl !== ''){
        if( $("#lnkMfrPartNumber_1").text() !== result.Manufacturer_PN ){ //没有完全匹配的搜索结果
          result.Status = "NO_MATCH"
          console.log("NO_MATCH")
          this.store(result)
          setTimeout(()=>{this.crawl()}, 1000*this.delay)
          return
        }
        result.Detail_Url = detailUrl
        // console.log("Got detail url:", result.Detail_Url)
      } else {
        // result.Status = `BAN`
        console.log("搜索页，检测到反爬虫机制，暂停30分钟再抓取...")
        setTimeout(()=>{this.crawl()}, 1000*60*30)
        return
      }
    } else { //非预期情况
      result.Status = `GET_URL_STATUS_${resp.status}`
    }

    setTimeout(()=>{this.crawl()}, 1000*this.delay)
    this.store(result)
  }

  async store(data: SearchDetailData) {
    const detailData = new MouserPartDetail()
    detailData.USI_PN = data.USI_PN
    detailData.Manufacturer_Name = data.Manufacturer_Name
    detailData.Manufacturer_PN = data.Manufacturer_PN
    detailData.Status = data.Status
    detailData.Detail_Url = data.Detail_Url
    try {
      await (await this.connection).manager.save(detailData)
      console.log("Store:", detailData)
    } catch (error) {
      console.log(error.message)
    }

  }
}
