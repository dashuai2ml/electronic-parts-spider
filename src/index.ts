import "reflect-metadata";
import {createConnection} from "typeorm";
import fs from "fs"
import path from "path"

import {Seed} from "./entity/Seed"
import config from "./config"
import { MouserProductSpider } from "./spider/mouserProductSpider";
import { MouserSearchSpider } from "./spider/mouserSearchSpider";
import { DigiKeySearchSpider } from "./spider/digiKeySearchSpider";
import { DigiKeyProductSpider } from "./spider/digiKeyProductSpider";


function createTables(): void {
  createConnection().then(() =>{
    console.log("Connected database.")
  })
}

function loadJsonData():void {
  const fileName = path.resolve(__dirname, '..', 'other', 'mpn.json')
  fs.readFile(fileName, "utf-8", (err, data)=>{
    if (err) throw err;
    const res:Array<any> = JSON.parse(data)
    console.log("Start to load data.")
    createConnection().then(async connection =>{
      for (const line of res) {
        let seed = new Seed()
        seed.USI_PN = line.usiPN
        seed.Manufacturer_Name = line.mfr
        seed.Manufacturer_PN = line.mpn
        try {
          await connection.manager.save(seed)
        } catch (error) {
          console.log(error.message)
        }
      }
      console.log("Load data done.")
    })
  })
}

function loadCsvData(label:string): void {
  const fileName = path.resolve(__dirname, '..', 'other', 'RLC_01.csv')
  fs.readFile(fileName, "utf-8", (err, data)=>{
    if (err) throw err;
    createConnection().then(async connection =>{
    for( let line of data.split('\n').slice(1, -1)) {
      let res = line.trim().split(",")
      let seed = new Seed()
      let one = await connection
        .createQueryBuilder(Seed, 'seed')
        .where("seed.USI_PN = :pn", { pn: res[0] })
        .getOne()
      if (one === undefined){ // 元件不存在，新增
        seed.USI_PN = res[0]
        seed.Manufacturer_Name = res[1]
        seed.Manufacturer_PN = res[2]
        seed.Label = label
        try {
          await connection.manager.save(seed)
          console.log(res)
        } catch (error) {
          console.log(error.message);
        }
      } else { // 元件已存在，更新Label
        console.log(one.Label, '<=' ,label)
        let labelStr = ''
        let pool:string[] = one.Label.split("/")
        pool.push(...label.split("/"))
        for(let item of new Set(pool)) {
          if (item !== '')
            labelStr = labelStr + item + '/'
        }
        labelStr = labelStr.slice(0, -1)
        console.log('L==>', labelStr, '\n');
        await connection
          .createQueryBuilder()
          .update(Seed)
          .set({ Label: labelStr, Updated_Date: new Date()})
          .where("USI_PN = :USI_PN", { USI_PN: res[0] })
          .execute();
        console.log("Update:", res[0]);
      }
    }
    console.log("Load data done.")
    process.exit()
    })
  })
}

function init():void {
  // createTables()
  loadCsvData("RF/SI")
}

function main(): void {
  // const mouserSearchSpider = new MouserSearchSpider({url: config.redisUrl})
  // mouserSearchSpider.dispatch()
  // mouserSearchSpider.crawl()

  const mouserProductSpider = new MouserProductSpider({url: config.redisUrl}, 5)
  mouserProductSpider.dispatch()
  mouserProductSpider.crawl()

  // const digiKeySearchSpider = new DigiKeySearchSpider({url: config.redisUrl})
  // digiKeySearchSpider.dispatch()
  // digiKeySearchSpider.crawl()

  // const digiKeyProductSpider = new DigiKeyProductSpider({url: config.redisUrl}, 0)
  // digiKeyProductSpider.dispatch()
  // digiKeyProductSpider.crawl()

}

init()
// main()
