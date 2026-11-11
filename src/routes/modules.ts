import { adminModule } from "../pages/admin/module";
import { authModule } from "../pages/auth/module";
import { operatorChargingModule } from "../pages/operator/charging/module";
import { operatorModule } from "../pages/operator/module";
import { reportsModule } from "../pages/reports/module";
import { simulationModule } from "../pages/simulation/module";
import { studentPersonalModule } from "../pages/student/personal/module";
import { studentSharedModule } from "../pages/student/shared/module";
import type { AppModule } from "./types";

// M1 sở hữu. Thứ tự ở đây quyết định thứ tự menu.
export const appModules: AppModule[] = [
  studentSharedModule,
  studentPersonalModule,
  operatorModule,
  operatorChargingModule,
  simulationModule,
  adminModule,
  reportsModule,
  authModule,
];
