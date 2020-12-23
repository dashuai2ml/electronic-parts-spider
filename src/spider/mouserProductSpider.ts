import Redis from "redis"
import {createConnection, Connection} from "typeorm";
import * as superagent from "superagent"
import proxy from "superagent-proxy"
import cheerio from "cheerio"

import { Spider } from ".";
import { MouserProductData, MouserProductOverview, MouserProductRegExpAttrData, ProductDetailData } from "../data";
import { MouserPartDetail } from "../entity/MouserPartDetail";

proxy(superagent)

export class MouserProductSpider implements Spider  {
  private redis;
  private connection: Promise<Connection>;
  private host:string;

  constructor(public redisConf: Redis.ClientOpts,
              public delay: number = 2,
              public checkQueueInterval:number=5,
              public checkQueueMinLength:number=3,
              public loadDataLength:number=13,
              public queueName:string = "mouserProductUrl") {
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
        const res:Array<any> = await (await this.connection).getRepository(MouserPartDetail)
          .query(`select m.USI_PN,m.Detail_Url from mouser_part_detail m \
                  where m.Status='WAIT' \
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
      const headers = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'referer': 'https://www.mouser.com/',
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        'user-agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36 Edg/86.0.622.69',
      }
      const url = data.split("#_#")[1]
      console.log("Request:", url)
      try {
        const now = new Date().getTime()
        const res = await superagent
          .get(url)
          .set(headers)
          // .proxy("http://usishproxy.usish.com.cn:8080")
          .redirects(0)
          .timeout({
            response: 20*1000,
            deadline: 25*1000,
          })
          .ok(res => res.status < 400)
        console.log("请求耗时:", (new Date().getTime() - now)/1000, 's')
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
    // 数据初始化
    let fixedData: MouserProductOverview = {
      Mouser: "",
      Mfr_PN: "",
      Mfr:"",
      Category:[],
      Description: "",
      Datasheet: "",
      Image_Url: "",
      More_Information: ""
    }

    let jsonData: MouserProductData = {
      Overview: fixedData,
      Document_Media: {},
      Attributes: {}
    };

    let result:ProductDetailData = {
      Product_Data: jsonData,
      Updated_Date: new Date()
    }

    // 数据解析 fixedData
    fixedData.Mouser = $("#spnMouserPartNumFormattedForProdInfo").text().trim()
    fixedData.Mfr_PN = $("#spnManufacturerPartNumber").text().trim()
    fixedData.Mfr = $("#lnkManufacturerName").text().trim()
    fixedData.Description = $("#spnDescription").text().trim()
    fixedData.Datasheet = $("#pdp-datasheet_0").attr("href") || ""
    fixedData.Image_Url = $("#imglink > img").attr("src") || ""
    fixedData.More_Information = $("#lnkLearnMore").attr("href") || ""

    if (fixedData.Image_Url !== ""){
      fixedData.Image_Url = this.host + fixedData.Image_Url
    }

    if (fixedData.More_Information !== ""){
      fixedData.More_Information = this.host + fixedData.More_Information
    }

    if (fixedData.Mouser === ""){
      console.log("详情页，检测到反爬机制暂停30分钟再抓取数据...")
      setTimeout(()=>{this.crawl()}, 1000*60*30)
      return
    } else {
      setTimeout(()=>{this.crawl()}, 1000*this.delay)
    }

    // 数据解析 fixedData.Category
    $("nav > ol > li > a").each((i, el)=>{
      fixedData.Category.push($(el).text().trim())
    })

    //数据解析 jsonData.Attributes
    let content = /SpecList":(.*?),"InStock"/g.exec(resp.text)
    if ( content !== null ) {
      let data = content[content.length-1]
      let objData:Array<MouserProductRegExpAttrData> = JSON.parse(data.replace(/"ValueHtml.*?,/g, ""))
      for (let attr of objData){
        let key: string = attr['AttrGrpEngName']
        let value: string = attr['Value']
        if (key === ""){
          continue
        }
        jsonData.Attributes[key] = value
      }
    }
    //数据解析 jsonData.Document_Media
    let docList = $("div.pdp-product-documents-list > div.row")
    docList.each(function(i, el) {
      // this === el
      if (i%2===0){
        let key:string = $(el).find("h3").text().trim()
        jsonData.Document_Media[key] = []
        $(el).next().find("a").each((i, el)=>{
          jsonData.Document_Media[key].push($(el).attr("href"))
        })
      }
    })

    // console.log(result.Product_Data.Document_Media)
    this.store(result, source)
  }

  async store(data: ProductDetailData, source: string) {
    try {
      await (await this.connection)
        .createQueryBuilder()
        .update(MouserPartDetail)
        .set({
          Product_Data: JSON.stringify(data.Product_Data),
          Updated_Date: new Date(),
          Status: 'CATCHED'
        })
        .where("USI_PN = :USI_PN", {USI_PN: source.split("#_#")[0]})
        .execute()

      console.log("Update:", data.Product_Data.Overview)
    } catch (error) {
      console.log(error.message)
    }

  }
}
