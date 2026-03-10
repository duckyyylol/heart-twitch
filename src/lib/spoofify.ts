import { ApiQueueItem, SearchedTrack, SpotifyArtist, SpotifyTrack } from "./types";
import axios from "axios"

export async function getNowPlaying(): Promise<SearchedTrack | null> {
    console.log(`${process.env.SPOOFIFY_WEB_URL}/api/now-playing`)
    try {
        let np: SearchedTrack | null = (await axios.get(`${process.env.SPOOFIFY_WEB_URL}/api/now-playing`, { headers: { "api-key": process.env.SPOOFIFY_API_KEY } })).data as SearchedTrack;
        console.log(np)
        return np;
    } catch (e) {
        console.log(e)
        console.log("CAUGHT")
        return null;
    }
}

export async function getQueue(): Promise<ApiQueueItem[]> {
    console.log(`${process.env.SPOOFIFY_WEB_URL}/api/now-playing`, { headers: { "api-key": process.env.SPOOFIFY_API_KEY } })
    try {
        let np: ApiQueueItem[] | null = (await axios.get(`${process.env.SPOOFIFY_WEB_URL}/api/queue`)).data as ApiQueueItem[] || [];
        console.log(np)
        return np;
    } catch (e) {
        console.log(e)
        console.log("CAUGHT")
        return [];
    }
}

export async function search(query: string): Promise<SpotifyTrack[]> {
    const q = encodeURI(query);
    const res = await axios.get(`${process.env.SPOOFIFY_WEB_URL}/api/spotify/search/${query}`, { headers: { "api-key": process.env.SPOOFIFY_API_KEY } })
    if (!res || !res.data) return null;
    return (res.data as any)?.tracks?.items as SpotifyTrack[] || [];
}

export function formatArtists(artists: SpotifyArtist[]): string {
        return artists.map(a => a.name).join(", ");
}

export async function addToQueue(uri: string): Promise<boolean> {
    const res = await axios.post(`${process.env.SPOOFIFY_WEB_URL}/api/spotify/queue/add-track/${uri}`, null, { headers: { "api-key": process.env.SPOOFIFY_API_KEY } }).catch(e => console.log(e));
    return res ? true : false;
}