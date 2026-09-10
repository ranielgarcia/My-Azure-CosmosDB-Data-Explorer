export interface OpeningHour {
  DayOfWeek: string;
  OpeningTime: string;
  ClosingTime: string;
}

export interface OpeningHoursException {
  OpeningTime: string;
  ClosingTime: string;
  Reason: string;
  EffectiveDate: string;
}

/** Schema of the `Details` document stored in the SiteLocation table. */
export interface StoreDetails {
  StoreId: string;
  StoreName: string;
  StoreStatus: string;
  StoreNaDomain: string;
  StoreRsDomain: string;
  StateCode: string;
  TimeZone: string;
  Longitude: number;
  Latitude: number;
  Address: string;
  Suburb: string;
  PostCode: string;
  IsOpen: boolean;
  OpeningDate: string | null;
  ClosingDate: string | null;
  Phone: string;
  RegionState: string;
  BrandId: number;
  BrandName: string;
  Fax: string;
  AreaRegion: string;
  RegionZone: string;
  DCState: string;
  StoreMobile: string;
  Market: string;
  OpeningHours: OpeningHour[];
  OpeningHoursExceptions: OpeningHoursException[];
  Services: unknown[];
  Id: string;
  Created: string;
  LastModified: string;
  _etag: string;
}

/** Condensed store record returned by the all-stores endpoint. */
export interface StoreSummary {
  StoreId: string;
  StoreName: string;
}
