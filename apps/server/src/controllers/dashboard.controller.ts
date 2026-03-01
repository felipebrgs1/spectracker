import type { DashboardService } from "../services/dashboard.service";

export class DashboardController {
	constructor(private dashboardService: DashboardService) {}

	async getOverview() {
		return await this.dashboardService.getOverview();
	}
}
