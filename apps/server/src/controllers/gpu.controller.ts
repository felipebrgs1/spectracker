import type { GpuService } from "../services/gpu.service";

export class GpuController {
	constructor(private gpuService: GpuService) {}

	async getGpuSpecs(search?: string, limit?: string) {
		const items = await this.gpuService.getGpuSpecs(search, limit);
		return {
			items,
			total: items.length,
		};
	}

	async getGpuDetail(id: string) {
		const detail = await this.gpuService.getGpuDetail(id);
		if (!detail) {
			throw new Error("GPU not found");
		}
		return detail;
	}
}
