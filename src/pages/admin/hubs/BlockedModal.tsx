import { Button, Modal } from "../../../components/ui";

export interface BlockedInfo {
  resource: string;
  reason: string;
  // Nhiều lý do (xóa Hub có thể bị chặn vì nhiều việc cùng lúc); không có thì chỉ hiện `reason`.
  reasons?: string[];
  // Mặc định: "Không thể vô hiệu hóa tài nguyên".
  title?: string;
}

// "Không thể vô hiệu hóa / xóa tài nguyên": thao tác bị huỷ, cấu hình giữ nguyên.
export function BlockedModal({ info, onClose }: { info: BlockedInfo | null; onClose: () => void }) {
  const reasons = info?.reasons && info.reasons.length > 0 ? info.reasons : info ? [info.reason] : [];
  return (
    <Modal
      open={info !== null}
      title={info?.title ?? "Không thể vô hiệu hóa tài nguyên"}
      onClose={onClose}
      footer={<Button onClick={onClose}>Đã hiểu</Button>}
    >
      <p className="text-slate-700">
        Không thể xóa hoặc vô hiệu hóa tài nguyên đang có xe hoạt động hoặc có lịch đặt trước. Vui lòng giải tỏa tài nguyên
        trước khi thao tác.
      </p>
      <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
        <p className="font-semibold text-slate-900">Tài nguyên: {info?.resource}</p>
        {reasons.length === 1 ? (
          <p className="mt-1 text-red-700">Lý do: {reasons[0]}</p>
        ) : (
          <>
            <p className="mt-1 text-red-700">Lý do:</p>
            <ul className="list-disc pl-5 text-red-700">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <p className="mt-3 text-slate-500">Giao dịch đã được hủy. Cấu hình giữ nguyên trạng thái cũ.</p>
    </Modal>
  );
}
