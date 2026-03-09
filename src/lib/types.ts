export interface SessionData {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    obtainmentTimestamp: number;
}

export interface Channel {
    broadcasterId: string;
    broadcasterName: string;
    beerioSessionId: string | null;
    useRequestCommand: boolean;
}

export interface TokenResponse {
    access_token: string;
    expires_in: number;
    refresh_token: string;
    scope: string[];
    token_type: string[];
}

export enum DBPointRewardTriggers {
    SONG_REQUEST
}

export interface DBPointReward {
    rewardId: string;
    channelId: string;
    cost: number;
    trigger: DBPointRewardTriggers;
}

export interface SearchedTrack {
	id: string;
	title: string;
	artist: string;
	album: string | null;
	href: string;
	uri: string;
	imageUrl: string;
}

export interface ApiQueueItem {
	id: string;
	songId: string;
	title: string;
	artist: string;
	album: string;
	addedTimestamp: number;
}

export interface SpotifyArtist {
	external_urls: {
		spotify: string;
	},
	href: string;
	id: string;
	name: string;
	type: string;
	uri: string;
}

export interface SpotifyTrack {
	album: {
		album_type: string;
		total_tracks: number;
		available_markets: string[];
		external_urls: {
			spotify: string;
		},
		href: string;
		id: string;
		images: {
			url: string;
			height: number;
			width: number;
		}[];
		name: string;
		release_date: string;
		release_date_precision: string;
		restrictions: {
			reason: string;
		},
		type: string;
		uri: string;
		artists: SpotifyArtist[]
	},
	artists: SpotifyArtist[]
	available_markets: string[];
	disc_number: number;
	duration_ms: number;
	explicit: boolean;
	external_ids: {
		isrc: string;
		ean: string;
		upc: string;
	},
	external_urls: {
		spotify: string;
	},
	href: string;
	id: string;
	is_playable: boolean;
	linked_from: {
	},
	restrictions: {
		reason: string;
	},
	name: string;
	popularity: number;
	preview_url: string;
	track_number: number;
	type: string;
	uri: string;
	is_local: boolean;
}