import { ChatClient, ChatMessage } from "@twurple/chat";
import { permissionMessage, reply, say } from "..";
import { addReward, rewardIsSongRequest } from "../lib/db/rewards";
import { getAllChannels, setUseRequestCommand } from "../lib/db/channels";
import { DBPointRewardTriggers } from "../lib/types";

const addRewardCommand = async (hasAuthority: boolean, channel: string, user: string, text: string, msg: ChatMessage, args: string[], client: ChatClient) => {
    let cancelled = false;
    let completed = true;
    let setupUser = null;


    if (!hasAuthority) {
        await permissionMessage(channel, msg.id)
        return;
    }

    setupUser = msg.userInfo.userId;

    await reply(channel, `Please redeem any rewards you'd like to use for song requests. Rewards must have a text input. You may redeem as many as you'd like before typing "done" to finish. Type "cancel" to cancel.`, msg.id)

    let l = client.onMessage(async (ch, us, ct, ms) => {
        console.log(cancelled)
        if (cancelled) return;
        let content = ct.toLowerCase();
        if (ms.userInfo.userId === setupUser) {
            if (content === "cancel") {
                l.unbind();
                cancelled = true;
                await reply(ch, `🎈 Cancelled!`, ms.id)
                return;
            }

            if (content === "done") {
                l.unbind();
                completed = true;
                await reply(ch, `🎈 All done!`, ms.id)
                return;
            }

            if (ms.rewardId) {
                if (rewardIsSongRequest(ms.rewardId)) {
                    await reply(channel, `🎈 Reward ID "${ms.rewardId}" is already associated with song requests.`, msg.id)

                } else {
                    let channels = getAllChannels();
                    let broadcaster = channels.find(c => c.broadcasterName === channel)
                    addReward({ channelId: broadcaster.broadcasterId, cost: 0, rewardId: ms.rewardId, trigger: DBPointRewardTriggers.SONG_REQUEST })
                    await reply(channel, `🎈 Now listening for reward ID "${ms.rewardId}" for song requests!`, msg.id)

                }

            }
        }
    })

}

export default addRewardCommand;