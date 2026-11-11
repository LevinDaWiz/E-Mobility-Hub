import { Badge } from "./Badge";
import { Card } from "./Card";

interface PlaceholderPageProps {
  owner: string;
  title: string;
  ucs: { code: string; name: string }[];
  // Đường dẫn file cần thay nội dung.
  file: string;
}

// Trang tạm cho từng route. Chủ sở hữu thay bằng trang thật.
export function PlaceholderPage({ owner, title, ucs, file }: PlaceholderPageProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <Card
        title={
          <span className="flex items-center gap-2">
            Chưa triển khai <Badge value="PENDING" label={`Phụ trách: ${owner}`} />
          </span>
        }
      >
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {ucs.map((uc) => (
            <li key={uc.code}>
              <span className="font-semibold">{uc.code}</span> – {uc.name}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Thay trang này bằng giao diện thật. Khai báo route/menu trong <code>{file}</code>.
        </p>
      </Card>
    </div>
  );
}
