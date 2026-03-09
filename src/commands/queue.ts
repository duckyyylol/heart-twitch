import { ChatMessage } from "@twurple/chat";
import { reply } from "..";
import {getQueue} from "../lib/spoofify";

const queueCommand = async (hasAuthority: boolean, channel: string, user: string, text: string, msg: ChatMessage, args: string[]) => {
    let queue = await getQueue();
    console.log(queue)

    if(queue && queue.length > 0) {
        await reply(channel, `🎈 The queue currently has ${queue.length} upcoming track${queue.length === 1 ? "" : "s"}`, msg.id)
    } else {
        await reply(channel, `🎈 The creator's queue is currently playing.`, msg.id)
    }
}

export default queueCommand;