/** Regular weekly trading hours for a single day. */
export interface OpeningHour {
  DayOfWeek: string;
  OpeningTime: string;
  ClosingTime: string;
}

/** An override to the regular hours for a specific date (e.g. a public holiday). */
export interface OpeningHoursException {
  OpeningTime: string;
  ClosingTime: string;
  Reason: string;
  EffectiveDate: string;
}

/**
 * Schema of the JSON document stored in the `Details` column of the
 * `SiteLocation` table. Values that appear as `null` in the source data are
 * typed as nullable.
 */
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
  ColesState: string;
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

/**
 * Raw shape of a `SiteLocation` table entity. `Details` holds the serialized
 * `StoreDetails` JSON document as a string.
 */
export interface SiteLocationEntity {
  partitionKey: string;
  rowKey: string;
  timestamp?: string;
  Created?: string;
  Details: string;
}

/** Condensed store record persisted in `all-stores.json`. */
export interface StoreSummary {
  StoreId: string;
  StoreName: string;
}
