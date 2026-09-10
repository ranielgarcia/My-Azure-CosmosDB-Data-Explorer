export interface StockroomZone {
  partitionKey: string;
  rowKey: string;
  timestamp?: string;
  IsDeleted: boolean;
  Id: string;
  LastReset: string;
  ResetBy: string;
  ResetDeviceId: string;
  ResetStatus: string;
  Sequence: number;
  TpcGroup: string;
  ZoneName: string;
}
