import { useStore } from "../store";
import { VehicleStatus, type Hub, type SearchCriteria, type Vehicle } from "../types";

// M2 – UC01: Tìm Hub có phương tiện phù hợp (bao gồm cả xe không AVAILABLE để UC02 xem trạng thái).
// hubId/nearLocation để chuỗi rỗng nếu không muốn lọc theo tiêu chí đó.
// type và minBattery là bắt buộc theo SearchCriteria hiện tại của M1.
export const VehicleService = {
  searchHubsAndVehicles(criteria: SearchCriteria): Hub[] {
    const { hubs, vehicles } = useStore.getState();
    const requestedHub = criteria.hubId.trim();
    const locationQuery = criteria.nearLocation.trim().toLocaleLowerCase("vi");

    const matchedVehicles = vehicles.filter(
      (vehicle) =>
        vehicle.type === criteria.type &&
        vehicle.batteryLevel >= criteria.minBattery &&
        (!requestedHub || vehicle.currentHubId === requestedHub),
    );

    const hubIdsWithVehicles = new Set(
      matchedVehicles.map((vehicle) => vehicle.currentHubId),
    );

    return hubs.filter(
      (hub) =>
        hubIdsWithVehicles.has(hub.hubId) &&
        (!locationQuery ||
          hub.name.toLocaleLowerCase("vi").includes(locationQuery) ||
          hub.location.toLocaleLowerCase("vi").includes(locationQuery)),
    );
  },

  // M2 – UC02: Trả về thông tin xe, hoặc undefined khi không có xe đó.
  getVehicleStatus(vehicleId: string): Vehicle | undefined {
    return useStore.getState().vehicles.find(
      (vehicle) => vehicle.vehicleId === vehicleId,
    );
  },

  // Dùng cho trang hiển thị danh sách xe của một Hub.
  // Nếu gọi từ một component, cần subscribe Store để giao diện cập nhật khi state đổi.
  getVehiclesAtHub(hubId: string): Vehicle[] {
    return useStore.getState().vehicles.filter(
      (vehicle) => vehicle.currentHubId === hubId,
    );
  },

  // Kiểm tra điều kiện tối thiểu để bật nút Đặt xe.
  isAvailable(vehicleId: string, minBattery = 0): boolean {
    const vehicle = this.getVehicleStatus(vehicleId);
    return (
      vehicle !== undefined &&
      vehicle.status === VehicleStatus.AVAILABLE &&
      vehicle.batteryLevel >= minBattery
    );
  },
};
