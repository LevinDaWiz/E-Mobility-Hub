import {
  HubOperationalStatus,
  HubType,
  PortKind,
  PortStatus,
  RequestStatus,
  SessionStatus,
  SlotKind,
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
  type PersonalVehicle,
  type Student,
  type Trip,
  type Vehicle,
} from "../types";
import { BATTERY_CAPACITY_KWH, DEFAULT_HUB_THRESHOLDS } from "../config/constants";

// Dữ liệu mẫu cố định (không random) để demo lặp lại được. createSeed() trả về
// đối tượng MỚI mỗi lần gọi nên có thể dùng cho "reset dữ liệu".

export interface SeedData {
  hubs: Hub[];
  parkingSlots: ParkingSlot[];
  chargingPorts: ChargingPort[];
  vehicles: Vehicle[];
  personalVehicles: PersonalVehicle[];
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
  area: string;
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
    area: "Ga Metro",
    slots: 12,
    ports: 3,
    personalParked: 5, // 5 xe dùng chung + 5 cá nhân = 10/12 ≈ 83% (gần ngưỡng quá tải)
  },
  {
    hubId: "HUB-DORM-01",
    name: "KTX Khu A",
    type: HubType.DORM,
    location: "Ký túc xá Khu A, ĐHQG-HCM",
    area: "KTX Khu A",
    slots: 16,
    ports: 4,
    personalParked: 6,
  },
  {
    hubId: "HUB-DORM-02",
    name: "KTX Khu B",
    type: HubType.DORM,
    location: "Ký túc xá Khu B, ĐHQG-HCM",
    area: "KTX Khu B",
    slots: 16,
    ports: 4,
    personalParked: 3,
  },
  {
    hubId: "HUB-CAMPUS-01",
    name: "ĐH Bách Khoa (Cơ sở 2)",
    type: HubType.CAMPUS,
    location: "Trường ĐH Bách Khoa, Dĩ An",
    area: "Bách Khoa",
    slots: 14,
    ports: 3,
    personalParked: 3,
  },
  {
    hubId: "HUB-CAMPUS-02",
    name: "ĐH Khoa học Tự nhiên",
    type: HubType.CAMPUS,
    location: "Trường ĐH Khoa học Tự nhiên, ĐHQG-HCM",
    area: "KHTN",
    slots: 12,
    ports: 3,
    personalParked: 2,
  },
  {
    hubId: "HUB-SERVICE-01",
    name: "Trạm Dịch vụ & Bảo trì",
    type: HubType.SERVICE,
    location: "Khu dịch vụ trung tâm, ĐHQG-HCM",
    area: "Khu dịch vụ",
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

// Cổng sạc xoay vòng: nhanh 7 kW, thường 3,5 kW.
const PORT_SPECS = [
  { kind: PortKind.FAST, powerKw: 7 },
  { kind: PortKind.STANDARD, powerKw: 3.5 },
];

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function createSeed(): SeedData {
  const now = Date.now();
  const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  const hubs: Hub[] = HUB_DEFS.map(({ hubId, name, type, location, area, slots }) => ({
    hubId,
    name,
    type,
    location,
    area,
    parkingCapacity: slots,
    operationalStatus: HubOperationalStatus.AVAILABLE,
    // Trạm dịch vụ chủ yếu để bảo trì nên không yêu cầu số xe khả dụng tối thiểu.
    thresholds: {
      ...DEFAULT_HUB_THRESHOLDS,
      minAvailableVehicles: type === HubType.SERVICE ? 0 : DEFAULT_HUB_THRESHOLDS.minAvailableVehicles,
    },
    version: 1,
    updatedBy: "Admin01",
    updatedAt: iso(-45 * 60_000),
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
    // Xe dùng chung đang đỗ (không tính xe đang đi) chiếm slot SHARED, rồi tới xe cá nhân (slot PERSONAL).
    const parkedShared = atHub.filter((v) => v.status !== VehicleStatus.IN_USE);
    const occupied = Math.min(def.slots, parkedShared.length + def.personalParked);

    for (let i = 0; i < def.slots; i++) {
      const code = `S${pad(i + 1)}`;
      const isShared = i < parkedShared.length;
      const isOccupied = i < occupied;
      parkingSlots.push({
        slotId: `${def.hubId}-${code}`,
        hubId: def.hubId,
        status: isOccupied ? SlotStatus.OCCUPIED : SlotStatus.FREE,
        kind: isOccupied ? (isShared ? SlotKind.SHARED : SlotKind.PERSONAL) : i % 2 === 0 ? SlotKind.SHARED : SlotKind.PERSONAL,
        vehicleId: isShared ? parkedShared[i].vehicleId : null,
        sensorId: `SNS-${def.hubId.replace("HUB-", "")}-${code}`,
        updatedAt: iso(-((i % 7) + 1) * 60_000),
      });
    }

    const charging = atHub.filter((v) => v.status === VehicleStatus.CHARGING);
    for (let i = 0; i < def.ports; i++) {
      const portId = `${def.hubId}-P${i + 1}`;
      const vehicle = charging[i];
      const spec = PORT_SPECS[i % PORT_SPECS.length];
      chargingPorts.push({
        portId,
        hubId: def.hubId,
        powerKw: spec.powerKw,
        kind: spec.kind,
        dockId: `DOCK-${def.hubId.replace("HUB-", "")}-${i + 1}`,
        status: vehicle ? PortStatus.CHARGING : PortStatus.FREE,
        updatedAt: iso(-((i % 5) + 1) * 60_000),
      });

      if (vehicle) {
        const n = chargingSessions.length + 1;
        const requestId = `CR-${pad(n, 3)}`;
        // Thời gian còn lại = phần pin cần sạc (kWh) / công suất cổng.
        const remainingMs =
          (((100 - vehicle.batteryLevel) / 100) * BATTERY_CAPACITY_KWH[vehicle.type] * 3600_000) / spec.powerKw;
        chargingRequests.push({
          requestId,
          vehicleId: vehicle.vehicleId,
          targetBattery: 100,
          desiredStart: iso(-10 * 60_000),
          deadline: iso(2 * 3600_000),
          priority: 70 + n * 5,
          status: RequestStatus.SCHEDULED,
          hubId: def.hubId,
          studentId: null,
          createdAt: iso(-15 * 60_000),
          priorityReason: "Xe dùng chung pin thấp, cần sạc để cho thuê (dữ liệu mẫu).",
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
          requestId,
          targetBattery: 100,
          expectedEnd: iso(Math.round(remainingMs)),
          rescheduledFrom: null,
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

  // Xe cá nhân đã đăng ký (M3: UC05, UC08–UC10). Không đỗ sẵn ở Hub nào để demo đặt chỗ từ đầu.
  // PV-002 có dữ liệu pin cũ (IoT gián đoạn, UC05 E1); 2112348 chưa đăng ký xe nào.
  const personalVehicles: PersonalVehicle[] = [
    {
      vehicleId: "PV-001",
      ownerId: "2112345",
      type: EM,
      plateNumber: "59-X3 123.45",
      model: "Xe máy điện VinFast Evo200",
      batteryLevel: 34,
      batteryCapacityKwh: 3.5,
      portKind: PortKind.FAST,
      batteryUpdatedAt: iso(-2 * 60_000),
    },
    {
      vehicleId: "PV-002",
      ownerId: "2112345",
      type: EB,
      plateNumber: "XĐ-0002",
      model: "Xe đạp điện Yadea i8",
      batteryLevel: 18,
      batteryCapacityKwh: 1.2,
      portKind: PortKind.STANDARD,
      batteryUpdatedAt: iso(-3 * 3600_000),
    },
    {
      vehicleId: "PV-003",
      ownerId: "2112346",
      type: EM,
      plateNumber: "59-Y1 456.78",
      model: "Xe máy điện Yadea Odora",
      batteryLevel: 62,
      batteryCapacityKwh: 3.4,
      portKind: PortKind.FAST,
      batteryUpdatedAt: iso(-1 * 60_000),
    },
    {
      vehicleId: "PV-004",
      ownerId: "2112347",
      type: EB,
      plateNumber: "XĐ-0004",
      model: "Xe đạp điện Giant Momentum",
      batteryLevel: 45,
      batteryCapacityKwh: 1.5,
      portKind: PortKind.STANDARD,
      batteryUpdatedAt: iso(-4 * 60_000),
    },
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
    personalVehicles,
    students,
    operators,
    accounts,
    trips,
    chargingRequests,
    chargingSessions,
    metroData: { arrivals },
  };
}
