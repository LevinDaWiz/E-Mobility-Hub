import {
  HubType,
  PortStatus,
  RequestStatus,
  SessionStatus,
  SlotStatus,
  TripStatus,
  VehicleStatus,
  VehicleType,
  type ChargingPort,
  type ChargingRequest,
  type ChargingSession,
  type CurrentUser,
  type Hub,
  type MetroData,
  type Operator,
  type ParkingSlot,
  type Student,
  type Trip,
  type Vehicle,
} from "../types";

// Dữ liệu mẫu cố định (không random) để demo lặp lại được. createSeed() trả về
// đối tượng MỚI mỗi lần gọi nên có thể dùng cho "reset dữ liệu".

export interface SeedData {
  hubs: Hub[];
  parkingSlots: ParkingSlot[];
  chargingPorts: ChargingPort[];
  vehicles: Vehicle[];
  students: Student[];
  operators: Operator[];
  accounts: CurrentUser[];
  trips: Trip[];
  chargingRequests: ChargingRequest[];
  chargingSessions: ChargingSession[];
  metroData: MetroData;
}

interface HubDef {
  hubId: string;
  name: string;
  type: HubType;
  location: string;
  slots: number;
  ports: number;
  // Số xe cá nhân đang đỗ sẵn (chiếm slot nhưng không phải xe dùng chung).
  personalParked: number;
}

const HUB_DEFS: HubDef[] = [
  {
    hubId: "HUB-METRO-01",
    name: "Ga Metro Làng Đại học",
    type: HubType.METRO,
    location: "Ga Metro Đại học Quốc gia, TP. Thủ Đức",
    slots: 12,
    ports: 3,
    personalParked: 5, // 5 xe dùng chung + 5 cá nhân = 10/12 ≈ 83% (gần ngưỡng quá tải)
  },
  {
    hubId: "HUB-DORM-01",
    name: "KTX Khu A",
    type: HubType.DORM,
    location: "Ký túc xá Khu A, ĐHQG-HCM",
    slots: 16,
    ports: 4,
    personalParked: 6,
  },
  {
    hubId: "HUB-DORM-02",
    name: "KTX Khu B",
    type: HubType.DORM,
    location: "Ký túc xá Khu B, ĐHQG-HCM",
    slots: 16,
    ports: 4,
    personalParked: 3,
  },
  {
    hubId: "HUB-CAMPUS-01",
    name: "ĐH Bách Khoa (Cơ sở 2)",
    type: HubType.CAMPUS,
    location: "Trường ĐH Bách Khoa, Dĩ An",
    slots: 14,
    ports: 3,
    personalParked: 3,
  },
  {
    hubId: "HUB-CAMPUS-02",
    name: "ĐH Khoa học Tự nhiên",
    type: HubType.CAMPUS,
    location: "Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM",
    slots: 12,
    ports: 3,
    personalParked: 2,
  },
  {
    hubId: "HUB-SERVICE-01",
    name: "Trạm Dịch vụ & Bảo trì",
    type: HubType.SERVICE,
    location: "Khu dịch vụ trung tâm, ĐHQG-HCM",
    slots: 10,
    ports: 2,
    personalParked: 0,
  },
];

const EB = VehicleType.E_BIKE;
const EM = VehicleType.E_MOTORBIKE;
const AV = VehicleStatus.AVAILABLE;
const IU = VehicleStatus.IN_USE;
const CH = VehicleStatus.CHARGING;
const FA = VehicleStatus.FAULTY;

type VehicleSeed = [hubId: string, type: VehicleType, battery: number, status: VehicleStatus];

// 28 xe dùng chung.
const VEHICLE_SEEDS: VehicleSeed[] = [
  // METRO-01 (6)
  ["HUB-METRO-01", EB, 85, AV],
  ["HUB-METRO-01", EB, 72, AV],
  ["HUB-METRO-01", EM, 90, AV],
  ["HUB-METRO-01", EB, 64, AV],
  ["HUB-METRO-01", EM, 55, AV],
  ["HUB-METRO-01", EB, 40, IU],
  // DORM-01 (6)
  ["HUB-DORM-01", EB, 92, AV],
  ["HUB-DORM-01", EB, 80, AV],
  ["HUB-DORM-01", EM, 66, AV],
  ["HUB-DORM-01", EB, 25, CH],
  ["HUB-DORM-01", EM, 18, CH],
  ["HUB-DORM-01", EM, 77, AV],
  // DORM-02 (5)
  ["HUB-DORM-02", EB, 88, AV],
  ["HUB-DORM-02", EM, 95, AV],
  ["HUB-DORM-02", EB, 47, AV],
  ["HUB-DORM-02", EB, 100, AV],
  ["HUB-DORM-02", EM, 33, IU],
  // CAMPUS-01 (5)
  ["HUB-CAMPUS-01", EB, 60, AV],
  ["HUB-CAMPUS-01", EM, 82, AV],
  ["HUB-CAMPUS-01", EB, 15, AV], // pin thấp: dùng demo gợi ý sạc
  ["HUB-CAMPUS-01", EB, 70, AV],
  ["HUB-CAMPUS-01", EM, 58, AV],
  // CAMPUS-02 (4)
  ["HUB-CAMPUS-02", EB, 91, AV],
  ["HUB-CAMPUS-02", EM, 49, AV],
  ["HUB-CAMPUS-02", EB, 76, AV],
  ["HUB-CAMPUS-02", EM, 22, AV],
  // SERVICE-01 (2)
  ["HUB-SERVICE-01", EM, 12, FA],
  ["HUB-SERVICE-01", EB, 30, AV],
];

// Công suất cổng sạc xoay vòng (kW).
const PORT_POWER_KW = [2, 2, 3.5, 3.5];

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function createSeed(): SeedData {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  const hubs: Hub[] = HUB_DEFS.map(({ hubId, name, type, location, slots }) => ({
    hubId,
    name,
    type,
    location,
    parkingCapacity: slots,
  }));

  const vehicles: Vehicle[] = VEHICLE_SEEDS.map(([hubId, type, batteryLevel, status], i) => ({
    vehicleId: `VH-${pad(i + 1, 3)}`,
    type,
    batteryLevel,
    status,
    currentHubId: hubId,
  }));

  const parkingSlots: ParkingSlot[] = [];
  const chargingPorts: ChargingPort[] = [];
  const chargingRequests: ChargingRequest[] = [];
  const chargingSessions: ChargingSession[] = [];

  for (const def of HUB_DEFS) {
    const atHub = vehicles.filter((v) => v.currentHubId === def.hubId);
    const occupied = Math.min(
      def.slots,
      atHub.filter((v) => v.status !== VehicleStatus.IN_USE).length + def.personalParked,
    );

    for (let i = 0; i < def.slots; i++) {
      parkingSlots.push({
        slotId: `${def.hubId}-S${pad(i + 1)}`,
        hubId: def.hubId,
        status: i < occupied ? SlotStatus.OCCUPIED : SlotStatus.FREE,
      });
    }

    const charging = atHub.filter((v) => v.status === VehicleStatus.CHARGING);
    for (let i = 0; i < def.ports; i++) {
      const portId = `${def.hubId}-P${i + 1}`;
      const vehicle = charging[i];
      chargingPorts.push({
        portId,
        hubId: def.hubId,
        powerKw: PORT_POWER_KW[i % PORT_POWER_KW.length],
        status: vehicle ? PortStatus.CHARGING : PortStatus.FREE,
      });

      if (vehicle) {
        const n = chargingSessions.length + 1;
        chargingRequests.push({
          requestId: `CR-${pad(n, 3)}`,
          vehicleId: vehicle.vehicleId,
          targetBattery: 100,
          desiredStart: iso(-10 * 60_000),
          deadline: iso(2 * 3600_000),
          priority: 70 + n * 5,
          status: RequestStatus.SCHEDULED,
        });
        chargingSessions.push({
          sessionId: `CS-${pad(n, 3)}`,
          startTime: iso(-10 * 60_000),
          endTime: null,
          startBattery: Math.max(5, vehicle.batteryLevel - 15),
          currentBattery: vehicle.batteryLevel,
          status: SessionStatus.CHARGING,
          portId,
          vehicleId: vehicle.vehicleId,
        });
      }
    }
  }

  const students: Student[] = [
    { studentId: "2112345", name: "Nguyễn Văn An", email: "an.nguyen@hcmut.edu.vn" },
    { studentId: "2112346", name: "Trần Thị Bình", email: "binh.tran@hcmut.edu.vn" },
    { studentId: "2112347", name: "Lê Minh Châu", email: "chau.le@hcmut.edu.vn" },
    { studentId: "2112348", name: "Phạm Quốc Duy", email: "duy.pham@hcmut.edu.vn" },
  ];

  const operators: Operator[] = [
    { operatorId: "OP001", name: "Hoàng Gia Huy", role: "OPERATIONAL" },
    { operatorId: "OP002", name: "Võ Thanh Tâm", role: "TECHNICAL" },
  ];

  const accounts: CurrentUser[] = [
    ...students.map<CurrentUser>((s) => ({
      userId: s.studentId,
      name: s.name,
      email: s.email,
      role: "STUDENT",
    })),
    ...operators.map<CurrentUser>((o) => ({ userId: o.operatorId, name: o.name, role: "OPERATOR" })),
    { userId: "AD001", name: "Quản trị viên", role: "ADMIN" },
    { userId: "MG001", name: "Ban quản lý", role: "MANAGEMENT" },
  ];

  // Mỗi xe IN_USE có một chuyến ONGOING (giao cho 2112347, 2112348; 2112345, 2112346 rảnh để demo).
  const borrowers = ["2112347", "2112348"];
  const trips: Trip[] = vehicles
    .filter((v) => v.status === VehicleStatus.IN_USE)
    .map((v, i) => ({
      tripId: `TR-${pad(i + 1, 3)}`,
      startTime: iso(-20 * 60_000),
      endTime: null,
      status: TripStatus.ONGOING,
      studentId: borrowers[i % borrowers.length],
      vehicleId: v.vehicleId,
    }));

  // Lượng khách Metro theo giờ (6 giờ tới), dùng cho UC21 / What-if.
  const hour = new Date(now);
  hour.setMinutes(0, 0, 0);
  const arrivalCounts = [120, 180, 260, 200, 150, 100];
  const arrivals: Record<string, number> = {};
  arrivalCounts.forEach((count, i) => {
    arrivals[new Date(hour.getTime() + i * 3600_000).toISOString()] = count;
  });

  return {
    hubs,
    parkingSlots,
    chargingPorts,
    vehicles,
    students,
    operators,
    accounts,
    trips,
    chargingRequests,
    chargingSessions,
    metroData: { arrivals },
  };
}
