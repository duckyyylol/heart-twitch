import { ChatMessage } from "@twurple/chat";
import { reply } from "..";
import {getNowPlaying} from "../lib/spoofify";

const nowPlayingCommand = async (hasAuthority: boolean, channel: string, user: string, text: string, msg: ChatMessage, args: string[]) => {
    let nowPlaying = await getNowPlaying();
    console.log(nowPlaying)

    if(nowPlaying) {
        await reply(channel, `🎵 ${nowPlaying.title} - ${nowPlaying.artist} [${nowPlaying.album}]`, msg.id)
    } else {
        await reply(channel, `🎈 There is currently no song playing.`, msg.id)
    }
}

export default nowPlayingCommand;