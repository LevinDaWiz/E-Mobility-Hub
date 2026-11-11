import { useStore } from "../store";
import { AlertSeverity, type Alert, type IncidentTicket } from "../types";
import { makeId } from "../utils/id";
import { simNowIso } from "../utils/time";

// ===== M4 sở hữu file này. STUB để M1/M3 gọi sớm; M4 mở rộng đầy đủ (UC11, UC13-UC15). =====

export const OperationsService = {
  raiseAlert(hubId: string, type: string, severity: AlertSeverity = AlertSeverity.WARNING): Alert {
    const alert: Alert = {
      alertId: makeId("AL"),
      hubId,
      type,
      severity,
      createdAt: simNowIso(),
      resolved: false,
    };
    useStore.getState().upsertAlert(alert);
    return alert;
  },

  // TODO(M4): xử lý ticket (assign/close), cập nhật trạng thái xe/cổng, gọi rescheduleOnConflict.
  handleIncident(ticket: IncidentTicket): IncidentTicket {
    useStore.getState().upsertTicket(ticket);
    return ticket;
  },
};
