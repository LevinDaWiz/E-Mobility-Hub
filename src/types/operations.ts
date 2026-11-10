import type { Vehicle } from "./vehicle";

export enum AlertSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}

export enum DispatchStatus {
  PROPOSED = "PROPOSED",
  APPROVED = "APPROVED",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  CANCELLED = "CANCELLED",
}

export enum TicketStatus {
  OPEN = "OPEN",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  CLOSED = "CLOSED",
}

export enum TicketType {
  VEHICLE_FAULT = "VEHICLE_FAULT",
  PORT_FAULT = "PORT_FAULT",
}

export interface Alert {
  alertId: string;
  hubId: string;
  type: string;
  severity: AlertSeverity;
  createdAt: string;
  resolved: boolean;
}

export interface NetworkSnapshot {
  timestamp: string;
  hubUtilization: Record<string, number>;
  faultyVehicles: number;
  faultyPorts: number;
}

export interface DispatchOrder {
  orderId: string;
  fromHubId: string;
  toHubId: string;
  vehicleIds: string[];
  status: DispatchStatus;
}

export interface IncidentTicket {
  ticketId: string;
  type: TicketType;
  targetId: string;
  hubId: string;
  description: string;
  status: TicketStatus;
}

export interface OverloadHandler {
  threshold: number;
}
