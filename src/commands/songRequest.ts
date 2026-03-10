import { ChatMessage } from "@twurple/chat";
import { reply } from "..";
import { addToQueue, formatArtists, getQueue, search } from "../lib/spoofify";
import { getChannelByName } from "../lib/db/channels";

const songRequestCommand = async (hasAuthority: boolean, channel: string, user: string, text: string, msg: ChatMessage, args: string[]) => {
    let channelSession = getChannelByName(channel);

    if (!channelSession || !channelSession.useRequestCommand) {
        await reply(channel, `🎈 The song request command is currently disabled in this channel.`, msg.id)
        return;
    }

    console.log("ARGS", args)

    if (args.length <= 0) {
        await reply(channel, `🎈 Correct Usage: !songrequest <search query>`, msg.id)

        return;
    }

    let query = args.join(" ");

    let searchingMsgId = await reply(channel, `Searching for ${query}...`, msg.id)

    search(query).then(async searchResults => {
        let result = searchResults[0];

        let addingMsgId = await reply(channel, `Working on it...`, searchingMsgId);

        let added = await addToQueue(result.uri)

        setTimeout(async () => {
            if (added) {
                await reply(channel, `@${user} Added "${result.name} - ${formatArtists(result.artists)}" to the queue!`, addingMsgId)
            } else {
                await reply(channel, `Failed to add "${result.name} - ${formatArtists(result.artists)}" to the queue`, addingMsgId)
            }
        }, 1e3)
    }).catch(async e => {
        setTimeout(async () => {
            await reply(channel, `Found 0 results for "${query}"`, msg.id)
        },1e3)
    });

}

export default songRequestCommand;