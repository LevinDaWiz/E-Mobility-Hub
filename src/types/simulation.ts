export enum ScenarioType {
  METRO_SURGE = "METRO_SURGE",
  HUB_FULL = "HUB_FULL",
  CHARGING_SURGE = "CHARGING_SURGE",
  PORT_FAILURE = "PORT_FAILURE",
  VEHICLE_IMBALANCE = "VEHICLE_IMBALANCE",
}

export enum RunStatus {
  CREATED = "CREATED",
  RUNNING = "RUNNING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum RecommendationType {
  REDISTRIBUTE = "REDISTRIBUTE",
  RESCHEDULE = "RESCHEDULE",
  REDIRECT = "REDIRECT",
}

export interface Scenario {
  scenarioId: string;
  type: ScenarioType;
  parameters: Record<string, unknown>;
}

export interface SimulationRun {
  runId: string;
  status: RunStatus;
  startTime: string;
  endTime: string | null;
  scenarioId: string;
}

export interface SimulationResult {
  predictedUtilization: Record<string, number>;
  overloadedHubs: string[];
  runId: string;
}

export interface Recommendation {
  type: RecommendationType;
  description: string;
  targetHubId: string;
}
