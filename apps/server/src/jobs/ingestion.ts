import { syncCoreComponentOffersFromKabum } from "@spectracker/db/ingestion";

const DEFAULT_INTERVAL_MINUTES = 120;

function toBoolean(value: string | undefined): boolean {
	return value === "1" || value === "true" || value === "yes";
}

export function startIngestionScheduler() {
	const enabled = toBoolean(process.env.INGESTION_SCHEDULE_ENABLED);
	if (!enabled) {
		return;
	}

	const intervalMinutesRaw = Number.parseInt(process.env.INGESTION_INTERVAL_MINUTES || "", 10);
	const intervalMinutes = Number.isFinite(intervalMinutesRaw)
		? intervalMinutesRaw
		: DEFAULT_INTERVAL_MINUTES;
	const intervalMs = intervalMinutes * 60 * 1000;

	const runSync = async () => {
		try {
			const result = await syncCoreComponentOffersFromKabum();
			console.log("[ingestion] core/kabum sync completed", result);
		} catch (error) {
			console.error("[ingestion] core/kabum sync failed", error);
		}
	};

	void runSync();
	setInterval(() => {
		void runSync();
	}, intervalMs);

	console.log(`[ingestion] scheduler enabled, interval ${intervalMinutes} minutes.`);
}
