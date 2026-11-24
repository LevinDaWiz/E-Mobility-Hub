import { adminModule } from "../pages/admin/module";
import { authModule } from "../pages/auth/module";
import { operatorChargingModule } from "../pages/operator/charging/module";
import { operatorModule } from "../pages/operator/module";
import { reportsModule } from "../pages/reports/module";
import { simulationModule } from "../pages/simulation/module";
import { studentHomeModule } from "../pages/student/home/module";
import { studentPersonalModule } from "../pages/student/personal/module";
import { studentSharedModule } from "../pages/student/shared/module";
import { studentSupportModule } from "../pages/student/support/module";
import type { AppModule } from "./types";

// M1 sở hữu. Module mới: tạo module.tsx trong thư mục của mình rồi thêm một dòng vào đây.
// Thứ tự menu sidebar quyết định bởi `order` trong adminNav, không phụ thuộc thứ tự ở đây.
export const appModules: AppModule[] = [
  authModule,
  studentHomeModule,
  studentSharedModule,
  studentPersonalModule,
  studentSupportModule,
  operatorModule,
  operatorChargingModule,
  simulationModule,
  adminModule,
  reportsModule,
];
