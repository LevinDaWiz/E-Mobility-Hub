export enum TripStatus {
  ONGOING = "ONGOING",
  COMPLETED = "COMPLETED",
}

export interface Trip {
  tripId: string;
  startTime: string;
  endTime: string | null;
  status: TripStatus;

  // IDs biểu diễn các association Student 1--* Trip
  // và Vehicle 1--* Trip trong class diagram.
  studentId: string;
  vehicleId: string;
}
