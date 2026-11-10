export enum HubType {
  METRO = "METRO",
  DORM = "DORM",
  CAMPUS = "CAMPUS",
  SERVICE = "SERVICE",
}

export interface Hub {
  hubId: string;
  name: string;
  type: HubType;
  location: string;
  parkingCapacity: number;
}
