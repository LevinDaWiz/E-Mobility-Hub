import { useState } from "react";
import { Button, Modal } from "../../../components/ui";
import { parseImportText, type ImportRow, type ImportSummary } from "../../../services/hubConfigService";

interface ImportModalProps {
  open: boolean;
  title: string;
  // Ví dụ các cột hợp lệ, hiện cho người dùng.
  columnsHint: string;
  onClose: () => void;
  onImport: (rows: ImportRow[]) => ImportSummary;
}

// Nhập hàng loạt từ tệp CSV / JSON. Dòng hợp lệ được thêm, dòng lỗi được liệt kê.
export function ImportModal({ open, title, columnsHint, onClose, onImport }: ImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [parseError, setParseError] = useState("");

  const reset = () => {
    setFileName("");
    setText("");
    setSummary(null);
    setParseError("");
  };
  const close = () => {
    reset();
    onClose();
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    setText(await file.text());
    setSummary(null);
    setParseError("");
  };

  const run = () => {
    const parsed = parseImportText(text, fileName);
    if (parsed.error) {
      setParseError(parsed.error);
      return;
    }
    setParseError("");
    setSummary(onImport(parsed.rows));
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Đóng
          </Button>
          <Button onClick={run} disabled={text === ""}>
            Nhập dữ liệu
          </Button>
        </>
      }
    >
      <p className="mb-2 text-slate-600">
        Chọn tệp <b>.csv</b> hoặc <b>.json</b>. Các cột: <code className="text-xs">{columnsHint}</code>
      </p>
      <input
        type="file"
        accept=".csv,.json,text/csv,application/json"
        onChange={(e) => void pickFile(e.target.files?.[0])}
        className="block w-full text-sm"
      />
      {parseError && <p className="mt-2 text-red-700">{parseError}</p>}
      {summary && (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-emerald-700">Đã thêm {summary.added} mục.</p>
          {summary.errors.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-red-700">
              {summary.errors.slice(0, 8).map((e) => (
                <li key={e}>{e}</li>
              ))}
              {summary.errors.length > 8 && <li>… và {summary.errors.length - 8} lỗi khác</li>}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
