export interface Spider {
  crawl(): void;
  prase(content: any, source:string): void;
  store(data: object, source?:string): void;
}
