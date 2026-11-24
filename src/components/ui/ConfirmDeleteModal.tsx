import { useState } from "react";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDeleteModalProps {
  title: string; // "Xóa chỗ đỗ"
  label: string; // "Chỗ đỗ S01 · Hub KTX Khu A"
  confirmCode: string; // người dùng phải nhập đúng chuỗi này ở bước 2
  consequences: string[];
  retained?: string[];
  onConfirm: () => void;
  onClose: () => void;
}

// Xóa vĩnh viễn cần HAI bước để tránh bấm nhầm:
//   Bước 1: cảnh báo nêu rõ hậu quả (không hoàn tác được);
//   Bước 2: nhập lại mã tài nguyên mới bật nút "Xóa vĩnh viễn".
// Render có điều kiện ({target && <ConfirmDeleteModal />}) để mỗi lần mở đều bắt đầu lại từ bước 1.
export function ConfirmDeleteModal({ title, label, confirmCode, consequences, retained = [], onConfirm, onClose }: ConfirmDeleteModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === confirmCode.trim().toLowerCase();

  if (step === 1) {
    return (
      <Modal
        open
        title={`${title} (bước 1/2: cảnh báo)`}
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="danger" onClick={() => setStep(2)}>
              Tôi hiểu, tiếp tục
            </Button>
          </>
        }
      >
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <p className="font-semibold text-red-800">⚠ Hành động này không thể hoàn tác.</p>
          <p className="mt-1 text-slate-900">{label}</p>
        </div>
        <p className="mt-3 font-medium text-slate-800">Điều sẽ xảy ra:</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">
          {consequences.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {retained.length > 0 && (
          <>
            <p className="mt-3 font-medium text-slate-800">Vẫn được giữ lại:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">
              {retained.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      open
      title={`${title} (bước 2/2: xác nhận lại)`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={() => setStep(1)}>
            Quay lại
          </Button>
          <Button variant="danger" disabled={!matches} onClick={onConfirm}>
            Xóa vĩnh viễn
          </Button>
        </>
      }
    >
      <p className="text-slate-700">
        Bạn sắp xóa vĩnh viễn <strong>{label}</strong>. Để chắc chắn, hãy nhập lại mã{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-red-700">{confirmCode}</code> vào ô bên dưới.
      </p>
      <input
        autoFocus
        aria-label="Nhập lại mã để xác nhận xóa"
        className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
        placeholder={confirmCode}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches) onConfirm();
        }}
      />
      {typed !== "" && !matches && <p className="mt-1 text-xs text-red-600">Mã chưa khớp.</p>}
    </Modal>
  );
}
