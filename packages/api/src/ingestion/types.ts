export type RawOffer = {
	store: string;
	categorySlug: string;
	title: string;
	url: string;
	priceCents: number;
	currency?: string;
	externalId?: string;
	imageUrl?: string;
	inStock?: boolean;
	stockText?: string;
	meta?: Record<string, unknown>;
};

export type NormalizedOffer = RawOffer & {
	normalizedName: string;
	brand: string | null;
	model: string | null;
};

export type SyncSummary = {
	source: string;
	category: string;
	totalFetched: number;
	upsertedOffers: number;
	insertedHistoryPoints: number;
	startedAt: string;
	finishedAt: string;
};
