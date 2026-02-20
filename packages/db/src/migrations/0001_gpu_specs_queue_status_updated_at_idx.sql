CREATE INDEX IF NOT EXISTS `techpowerup_gpu_specs_queue_status_updated_at_idx`
	ON `techpowerup_gpu_specs_queue` (`status`, `updated_at`);
