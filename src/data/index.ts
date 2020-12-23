export interface MouserProductOverview{
  Mouser: string,
  Mfr_PN: string,
  Mfr:string,
  Category: Array<string>,
  Description: string,
  Datasheet: string,
  Image_Url: string,
  More_Information: string
}

export interface DigiKeyProductOverview{
  DigiKey_PN: string,
  Mfr_PN: string,
  Mfr:string,
  Category: Array<string>,
  Description: string,
  Datasheet: string,
  Manufacturer_SLT: string,
  Image_Url: string,
  Detailed_Description: string
}

//
export interface ProductData{
  Overview: object,
  Document_Media: object,
  Attributes: object
}

export interface MouserProductData extends ProductData{
  Overview: MouserProductOverview,
  Document_Media: MouserProductAttrData,
  Attributes: MouserProductAttrData
}

export interface DigiKeyProductData extends ProductData{
  Overview: DigiKeyProductOverview,
  Document_Media: DigiKeyProductAttrData,
  Attributes: DigiKeyProductAttrData
}

//
export interface SearchDetailData{
  USI_PN: string,
  Manufacturer_Name: string,
  Manufacturer_PN: string,
  Status: string,
  Detail_Url: string,
}

export interface ProductDetailData{
  Product_Data:ProductData,
  Updated_Date: Date
}

export interface MouserProductRegExpAttrData{
  AttrGrpEngName:string,
  Value: string,
  [propName: string]: any
}
//
export interface MouserProductAttrData{
  [propName: string]: any
}

export interface DigiKeyProductAttrData{
  [propName: string]: any
}
