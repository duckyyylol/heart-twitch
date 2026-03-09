import { ChatMessage } from "@twurple/chat";
import { permissionMessage, reply } from "..";
import { addToQueue, formatArtists, getQueue, search } from "../lib/spoofify";
import { getChannelByName, setUseRequestCommand } from "../lib/db/channels";

const toggleSongRequestCommand = async (hasAuthority: boolean, channel: string, user: string, text: string, msg: ChatMessage, args: string[]) => {
    let channelSession = getChannelByName(channel);

    if (!channelSession) {
        await reply(channel, `🎈 Something went wrong. Oops!`, msg.id)
        return;
    }

    if(!hasAuthority) {
        return await permissionMessage(channel, msg.id);
    }

    let c = await setUseRequestCommand(channel, !channelSession.useRequestCommand)

    let newC = getChannelByName(channel);

    if(c.changes > 0) {
        await reply(channel, `🎈 Toggled !songrequest ${newC.useRequestCommand ? "On" : "Off"}`, msg.id)
    } else {
        await reply(channel, `🎈 Failed to toggle the song request command :(`, msg.id)
    }
}

export default toggleSongRequestCommand;