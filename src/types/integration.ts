export interface StateUpdate {
  sourceId: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface MetroData {
  // Key là thời điểm đến (ISO 8601), value là số lượt/người đến.
  arrivals: Record<string, number>;
}

export interface StateListener {
  onStateUpdate(update: StateUpdate): void;
}

export interface AuthAdapter {
  authenticate(token: string): Promise<import("./user").Student>;
}

export interface MetroAdapter {
  fetchMetroData(): Promise<MetroData>;
}

export interface IoTDataAdapter {
  fetchLatestState(): Promise<StateUpdate[]>;
  subscribe(listener: StateListener): void;
}
