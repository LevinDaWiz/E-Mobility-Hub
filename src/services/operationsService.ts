import { ChargingScheduler } from "../engine/chargingScheduler";
import { registerTickHandler } from "../engine/tickEngine";
import { useStore } from "../store";
import type { OpsAlert, OpsDispatchOrder, OpsIncidentTicket } from "../store/opsSlice";
import {
  AlertSeverity,
  DispatchStatus,
  PortStatus,
  SessionStatus,
  SlotStatus,
  TicketStatus,
  TicketType,
  VehicleStatus,
  type Hub,
  type NetworkSnapshot,
} from "../types";
import { computeHubStats } from "../utils/hubStats";
import { makeId } from "../utils/id";
import { simNowIso } from "../utils/time";
import { notify } from "./notificationService";

// ===== M4 sở hữu file này: Dịch vụ vận hành mạng lưới Hub, sự cố và điều phối (UC11, UC13-UC15) =====

export const OperationsService = {
  /**
   * UC11: Lấy thông tin tổng quan mạng lưới
   */
  getNetworkOverview(): NetworkSnapshot {
    const s = useStore.getState();
    const hubUtilization: Record<string, number> = {};

    for (const h of s.hubs) {
      const stats = computeHubStats(
        { parkingSlots: s.parkingSlots, chargingPorts: s.chargingPorts, vehicles: s.vehicles },
        h.hubId
      );
      hubUtilization[h.hubId] = stats.utilization;
    }

    const faultyVehicles = s.vehicles.filter((v) => v.status === VehicleStatus.FAULTY).length;
    const faultyPorts = s.chargingPorts.filter((p) => p.status === PortStatus.FAULTY).length;

    return {
      timestamp: simNowIso(),
      hubUtilization,
      faultyVehicles,
      faultyPorts,
    };
  },

  /**
   * UC11: Giám sát chi tiết một Hub cụ thể
   */
  monitorHub(hubId: string): Hub & { stats: ReturnType<typeof computeHubStats> } {
    const s = useStore.getState();
    const hub = s.hubs.find((h) => h.hubId === hubId);
    if (!hub) {
      throw new Error(`Hub ${hubId} not found`);
    }
    const stats = computeHubStats(
      { parkingSlots: s.parkingSlots, chargingPorts: s.chargingPorts, vehicles: s.vehicles },
      hubId
    );
    return { ...hub, stats };
  },

  /**
   * UC11: Quản lý lịch sạc tại Hub (tích hợp M3)
   */
  manageChargingSchedule(hubId: string) {
    const s = useStore.getState();
    const portsAtHub = s.chargingPorts.filter((p) => p.hubId === hubId).map((p) => p.portId);
    return s.chargingSessions.filter((cs) => portsAtHub.includes(cs.portId));
  },

  /**
   * Phát cảnh báo lên hệ thống (chống trùng lặp cảnh báo chưa đóng trên cùng Hub & Type)
   */
  raiseAlert(
    hubId: string,
    type: string,
    severity: AlertSeverity = AlertSeverity.WARNING,
    message?: string
  ): OpsAlert {
    const s = useStore.getState();
    const existing = s.alerts.find((a) => a.hubId === hubId && a.type === type && !a.resolved);

    if (existing) {
      const updated: OpsAlert = {
        ...existing,
        severity,
        message: message ?? existing.message,
        createdAt: simNowIso(),
      };
      s.upsertAlert(updated);
      return updated;
    }

    const alert: OpsAlert = {
      alertId: makeId("ALT"),
      hubId,
      type,
      severity,
      createdAt: simNowIso(),
      resolved: false,
      message,
      acknowledged: false,
    };
    s.upsertAlert(alert);

    // Bắn thông báo chuông cho nhân viên vận hành
    if (severity === AlertSeverity.CRITICAL) {
      notify("role:OPERATOR", `[CẢNH BÁO KHẨN] ${message ?? type} tại trạm ${hubId}`, "error");
    } else if (severity === AlertSeverity.WARNING) {
      notify("role:OPERATOR", `[Cảnh báo] ${message ?? type} tại trạm ${hubId}`, "warning");
    }

    return alert;
  },

  /**
   * Tiếp nhận cảnh báo
   */
  acknowledgeAlert(alertId: string, operatorId = "OP001"): void {
    useStore.getState().acknowledgeAlert(alertId, operatorId);
  },

  /**
   * Đóng cảnh báo
   */
  resolveAlert(alertId: string): void {
    useStore.getState().resolveAlert(alertId);
  },

  /**
   * UC14: Xử lý sự cố kỹ thuật (NIFR-04)
   * Tự động cô lập xe hoặc cổng hỏng, kích hoạt dời lịch sạc nếu là cổng sạc
   */
  handleIncident(ticket: OpsIncidentTicket): OpsIncidentTicket {
    const s = useStore.getState();
    const newTicket: OpsIncidentTicket = {
      ...ticket,
      ticketId: ticket.ticketId || makeId("TCK"),
      status: ticket.status || TicketStatus.OPEN,
      createdAt: ticket.createdAt || simNowIso(),
    };

    s.upsertTicket(newTicket);

    // Tự động chuyển trạng thái tài nguyên đích sang FAULTY
    if (newTicket.type === TicketType.VEHICLE_FAULT) {
      s.updateVehicle(newTicket.targetId, { status: VehicleStatus.FAULTY });
      this.raiseAlert(
        newTicket.hubId,
        "VEHICLE_FAULT",
        AlertSeverity.WARNING,
        `Phương tiện ${newTicket.targetId} gặp sự cố: ${newTicket.description}`
      );
    } else if (newTicket.type === TicketType.PORT_FAULT) {
      s.updateChargingPort(newTicket.targetId, { status: PortStatus.FAULTY });
      this.raiseAlert(
        newTicket.hubId,
        "PORT_FAULT",
        AlertSeverity.CRITICAL,
        `Cổng sạc ${newTicket.targetId} sụt nguồn/lỗi: ${newTicket.description}`
      );

      // Gọi ChargingScheduler của M3 để dời lịch sạc các phiên bị ảnh hưởng
      const activeSession = s.chargingSessions.find(
        (cs) => cs.portId === newTicket.targetId && cs.status === SessionStatus.CHARGING
      );
      if (activeSession) {
        const rescheduled = ChargingScheduler.rescheduleOnConflict(activeSession.sessionId);
        if (rescheduled) {
          notify(
            "role:OPERATOR",
            `Phiên sạc ${activeSession.sessionId} tại cổng ${newTicket.targetId} bị gián đoạn do sự cố, đã xếp lại sang cổng ${rescheduled.portId}.`,
            "warning"
          );
        } else {
          // Chưa xếp lại được (hoặc bộ xếp lịch chưa hoạt động): ghi nhận gián đoạn thật và báo vận hành xử lý thủ công,
          // thay vì thông báo "đang xếp lại" khi chẳng có gì được xếp lại.
          const latest = useStore.getState();
          latest.upsertChargingSession({
            ...activeSession,
            status: SessionStatus.INTERRUPTED,
            endTime: simNowIso(),
          });
          const vehicle = latest.vehicles.find((v) => v.vehicleId === activeSession.vehicleId);
          if (vehicle?.status === VehicleStatus.CHARGING) {
            latest.updateVehicle(vehicle.vehicleId, { status: VehicleStatus.AVAILABLE });
          }
          notify(
            "role:OPERATOR",
            `Phiên sạc ${activeSession.sessionId} (xe ${activeSession.vehicleId}) tại cổng ${newTicket.targetId} bị gián đoạn do sự cố kỹ thuật. Chưa xếp lại lịch sạc được, cần xử lý thủ công.`,
            "warning"
          );
        }
      }
    }

    return newTicket;
  },

  /**
   * Phân công kỹ thuật viên cho sự cố
   */
  assignTicket(ticketId: string, technician: string): void {
    useStore.getState().assignTicket(ticketId, technician);
    notify("role:OPERATOR", `Phiếu sự cố ${ticketId} đã được phân công cho ${technician}`, "info");
  },

  /**
   * Bắt đầu sửa chữa sự cố (chuyển sang IN_PROGRESS)
   */
  startRepairTicket(ticketId: string): void {
    const s = useStore.getState();
    const ticket = s.tickets.find((t) => t.ticketId === ticketId);
    if (!ticket) return;
    s.upsertTicket({
      ...ticket,
      status: TicketStatus.IN_PROGRESS,
    });
    notify("role:OPERATOR", `Phiếu sự cố ${ticketId} đang được tiến hành sửa chữa`, "info");
  },

  /**
   * Hoàn tất khắc phục sự cố, khôi phục thiết bị về hoạt động bình thường
   */
  closeTicket(ticketId: string, resolution: string): void {
    const s = useStore.getState();
    const ticket = s.tickets.find((t) => t.ticketId === ticketId);
    if (!ticket) return;

    s.closeTicket(ticketId, resolution);

    // Khôi phục tài nguyên
    if (ticket.type === TicketType.VEHICLE_FAULT) {
      s.updateVehicle(ticket.targetId, { status: VehicleStatus.AVAILABLE });
    } else if (ticket.type === TicketType.PORT_FAULT) {
      s.updateChargingPort(ticket.targetId, { status: PortStatus.FREE });
    }

    // Đóng các cảnh báo liên quan
    const relatedAlert = s.alerts.find(
      (a) => a.hubId === ticket.hubId && (a.message?.includes(ticket.targetId) || a.type === ticket.type) && !a.resolved
    );
    if (relatedAlert) {
      s.resolveAlert(relatedAlert.alertId);
    }

    notify(
      "role:OPERATOR",
      `Sự cố ${ticket.targetId} đã được khắc phục: ${resolution}. Thiết bị đã trở lại hoạt động.`,
      "success"
    );
  },

  /**
   * UC13: Tạo lệnh điều phối phương tiện
   */
  createDispatchOrder(
    fromHubId: string,
    toHubId: string,
    vehicleIds: string[],
    transportMethod: "TRUCK" | "SELF_DRIVE" = "TRUCK",
    driverName = "Đội xe tải vận chuyển số 01"
  ): OpsDispatchOrder {
    const s = useStore.getState();
    const order: OpsDispatchOrder = {
      orderId: makeId("DO"),
      fromHubId,
      toHubId,
      vehicleIds,
      status: DispatchStatus.PROPOSED,
      transportMethod,
      driverName,
      createdAt: simNowIso(),
      approvedBy: undefined,
    };

    s.upsertDispatchOrder(order);
    notify(
      "role:OPERATOR",
      `Đề xuất lệnh điều phối ${order.orderId}: chuyển ${vehicleIds.length} xe từ ${fromHubId} sang ${toHubId}.`,
      "info"
    );

    return order;
  },

  /**
   * Phê duyệt lệnh điều phối
   */
  approveDispatchOrder(orderId: string, operatorId = "OP001"): void {
    const s = useStore.getState();
    const order = s.dispatchOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    s.upsertDispatchOrder({
      ...order,
      status: DispatchStatus.APPROVED,
      approvedBy: operatorId,
    });
    notify("role:OPERATOR", `Lệnh điều phối ${orderId} đã được phê duyệt. Sẵn sàng vận chuyển.`, "success");
  },

  /**
   * Thực thi vận chuyển lệnh điều phối.
   * Đồng bộ chỗ đỗ: xe rời Hub nguồn thì slot nguồn được giải phóng; Hub đích GIỮ CHỖ (RESERVED) cho từng xe
   * đang trên đường. Nếu Hub đích không đủ chỗ trống thì không vận chuyển và báo cho Vận hành.
   */
  executeDispatchOrder(orderId: string): void {
    const s = useStore.getState();
    const order = s.dispatchOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    // Chỉ chuyển các xe vẫn còn AVAILABLE tại Hub nguồn (có thể đã bị đặt / hỏng từ lúc tạo lệnh).
    const moving = order.vehicleIds.filter((vId) => {
      const v = s.vehicles.find((x) => x.vehicleId === vId);
      return v && v.currentHubId === order.fromHubId && v.status === VehicleStatus.AVAILABLE;
    });
    if (moving.length === 0) {
      notify("role:OPERATOR", `Lệnh ${orderId}: không còn xe nào sẵn sàng tại ${order.fromHubId} để vận chuyển. Hãy hủy và tạo lệnh mới.`, "warning");
      return;
    }
    const freeAtTarget = s.parkingSlots.filter((sl) => sl.hubId === order.toHubId && sl.status === SlotStatus.FREE);
    if (freeAtTarget.length < moving.length) {
      notify(
        "role:OPERATOR",
        `Lệnh ${orderId}: ${order.toHubId} chỉ còn ${freeAtTarget.length} chỗ trống, không đủ cho ${moving.length} xe. Hãy giảm số xe hoặc chọn Hub đích khác.`,
        "warning"
      );
      return;
    }

    moving.forEach((vId, i) => {
      // Giải phóng đúng slot của xe tại Hub nguồn.
      const src = s.parkingSlots.find((sl) => sl.hubId === order.fromHubId && sl.status === SlotStatus.OCCUPIED && sl.vehicleId === vId);
      if (src) s.updateParkingSlot(src.slotId, { status: SlotStatus.FREE, vehicleId: null });
      // Giữ chỗ tại Hub đích.
      s.updateParkingSlot(freeAtTarget[i].slotId, { status: SlotStatus.RESERVED, vehicleId: vId });
      s.updateVehicle(vId, { status: VehicleStatus.IN_USE }); // In-Transit
    });

    s.upsertDispatchOrder({ ...order, vehicleIds: moving, status: DispatchStatus.IN_PROGRESS });

    notify(
      "role:OPERATOR",
      `Đang vận chuyển ${moving.length} xe từ ${order.fromHubId} sang ${order.toHubId}...`,
      "info"
    );
  },

  /**
   * Hoàn tất lệnh điều phối: xe sang Hub đích (slot đã giữ chuyển thành OCCUPIED) và về AVAILABLE.
   */
  completeDispatchOrder(orderId: string): void {
    const s = useStore.getState();
    const order = s.dispatchOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    s.updateDispatchStatus(orderId, DispatchStatus.DONE);

    for (const vId of order.vehicleIds) {
      const reserved = s.parkingSlots.find((sl) => sl.hubId === order.toHubId && sl.status === SlotStatus.RESERVED && sl.vehicleId === vId);
      if (reserved) s.updateParkingSlot(reserved.slotId, { status: SlotStatus.OCCUPIED, vehicleId: vId });
      s.updateVehicle(vId, {
        currentHubId: order.toHubId,
        status: VehicleStatus.AVAILABLE,
      });
    }

    notify(
      "role:OPERATOR",
      `Hoàn tất điều chuyển ${order.vehicleIds.length} xe đến ${order.toHubId}. Các xe đã sẵn sàng cho thuê.`,
      "success"
    );
  },

  /**
   * Hủy lệnh điều phối. Nếu đang vận chuyển: bỏ giữ chỗ ở Hub đích và đưa xe về lại Hub nguồn
   * (cần còn chỗ trống ở nguồn; xe nào không còn chỗ sẽ giữ trạng thái "đang vận chuyển" và có thông báo).
   */
  cancelDispatchOrder(orderId: string): void {
    const s = useStore.getState();
    const order = s.dispatchOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    s.updateDispatchStatus(orderId, DispatchStatus.CANCELLED);

    if (order.status === DispatchStatus.IN_PROGRESS) {
      const stuck: string[] = [];
      for (const vId of order.vehicleIds) {
        const reserved = s.parkingSlots.find((sl) => sl.hubId === order.toHubId && sl.status === SlotStatus.RESERVED && sl.vehicleId === vId);
        if (reserved) s.updateParkingSlot(reserved.slotId, { status: SlotStatus.FREE, vehicleId: null });
        const back = useStore
          .getState()
          .parkingSlots.find((sl) => sl.hubId === order.fromHubId && sl.status === SlotStatus.FREE);
        if (back) {
          s.updateParkingSlot(back.slotId, { status: SlotStatus.OCCUPIED, vehicleId: vId });
          s.updateVehicle(vId, { currentHubId: order.fromHubId, status: VehicleStatus.AVAILABLE });
        } else {
          stuck.push(vId);
        }
      }
      if (stuck.length > 0) {
        notify("role:OPERATOR", `Hủy lệnh ${orderId}: ${order.fromHubId} hết chỗ nên ${stuck.join(", ")} vẫn đang ở trạng thái vận chuyển. Hãy giải phóng chỗ rồi xử lý thủ công.`, "warning");
      }
    }

    notify("role:OPERATOR", `Lệnh điều phối ${orderId} đã bị hủy.`, "warning");
  },

  /**
   * Đăng ký định kỳ vào tickEngine (NIFR-03 & NIFR-04)
   */
  initOperationsWatchdog(): () => void {
    const unregisterOverload = registerTickHandler("m4-overload-detector", () => {
      const s = useStore.getState();
      for (const hub of s.hubs) {
        const stats = computeHubStats(
          { parkingSlots: s.parkingSlots, chargingPorts: s.chargingPorts, vehicles: s.vehicles },
          hub.hubId
        );
        const isOverloaded = stats.utilization > hub.thresholds.overload;
        const activeAlert = s.alerts.find(
          (a) => a.hubId === hub.hubId && a.type === "HUB_CAPACITY_OVERLOAD" && !a.resolved
        );

        if (isOverloaded && !activeAlert) {
          OperationsService.raiseAlert(
            hub.hubId,
            "HUB_CAPACITY_OVERLOAD",
            AlertSeverity.CRITICAL,
            `Hub ${hub.name} đạt tỷ lệ lấp đầy ${Math.round(stats.utilization * 100)}% (vượt ngưỡng ${Math.round(hub.thresholds.overload * 100)}%)`
          );
        } else if (!isOverloaded && activeAlert) {
          OperationsService.resolveAlert(activeAlert.alertId);
        }
      }
    });

    const unregisterIncidents = registerTickHandler("m4-incident-watchdog", () => {
      const s = useStore.getState();
      // Quét xe hỏng chưa có ticket
      for (const vehicle of s.vehicles) {
        if (vehicle.status === VehicleStatus.FAULTY) {
          const hasTicket = s.tickets.some(
            (t) => t.targetId === vehicle.vehicleId && t.status !== TicketStatus.CLOSED
          );
          if (!hasTicket) {
            OperationsService.handleIncident({
              ticketId: makeId("TCK"),
              type: TicketType.VEHICLE_FAULT,
              targetId: vehicle.vehicleId,
              hubId: vehicle.currentHubId,
              description: "Hệ thống tự động phát hiện phương tiện mang trạng thái FAULTY",
              status: TicketStatus.OPEN,
              createdAt: simNowIso(),
            });
          }
        }
      }

      // Quét cổng sạc hỏng chưa có ticket
      for (const port of s.chargingPorts) {
        if (port.status === PortStatus.FAULTY) {
          const hasTicket = s.tickets.some(
            (t) => t.targetId === port.portId && t.status !== TicketStatus.CLOSED
          );
          if (!hasTicket) {
            OperationsService.handleIncident({
              ticketId: makeId("TCK"),
              type: TicketType.PORT_FAULT,
              targetId: port.portId,
              hubId: port.hubId,
              description: "Hệ thống tự động phát hiện cổng sạc ngừng hoạt động (FAULTY)",
              status: TicketStatus.OPEN,
              createdAt: simNowIso(),
            });
          }
        }
      }
    });

    return () => {
      unregisterOverload();
      unregisterIncidents();
    };
  },
};

// Khởi chạy watchdog khi module được nạp
if (typeof window !== "undefined") {
  OperationsService.initOperationsWatchdog();
}
