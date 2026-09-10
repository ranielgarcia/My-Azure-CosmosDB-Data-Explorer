/** Raw shape of a StockroomZones Azure Table entity. */
export interface StockroomZoneEntity {
  partitionKey: string;
  rowKey: string;
  timestamp?: string;
  IsDeleted: boolean;
  Id: string;
  LastReset: Date;
  ResetBy: string;
  ResetDeviceId: string;
  ResetStatus: string;
  Sequence: number;
  TpcGroup: string;
  ZoneName: string;
}
