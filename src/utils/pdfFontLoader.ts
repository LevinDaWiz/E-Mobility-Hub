import regularUrl from "../assets/fonts/RobotoMono-Regular.ttf?url";
import boldUrl from "../assets/fonts/RobotoMono-Bold.ttf?url";
import { setPdfFonts } from "./fileExport";

// ===== M1 sở hữu (UC17): tải font Roboto Mono (giấy phép OFL, xem assets/fonts/OFL.txt) cho PDF có dấu tiếng Việt =====
// Gọi await loadPdfFonts() trước khi buildPdf. Chỉ tải một lần; tải lỗi thì trả false và PDF tự quay về bản không dấu
// (lần xuất sau sẽ thử tải lại).

let loading: Promise<boolean> | null = null;

export function loadPdfFonts(): Promise<boolean> {
  loading ??= (async () => {
    try {
      const [regular, bold] = await Promise.all(
        [regularUrl, boldUrl].map(async (url) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Không tải được font (${res.status})`);
          return new Uint8Array(await res.arrayBuffer());
        }),
      );
      setPdfFonts(regular, bold);
      return true;
    } catch (error) {
      console.warn("[pdf] Không nạp được font, PDF sẽ không có dấu tiếng Việt:", error);
      loading = null;
      return false;
    }
  })();
  return loading;
}
