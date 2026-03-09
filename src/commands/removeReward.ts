import { ChatClient, ChatMessage } from "@twurple/chat";
import { permissionMessage, reply, rewardsInQuestion, say, setRewardsInQuestion } from "..";
import { addReward, deleteReward, rewardIsSongRequest } from "../lib/db/rewards";
import { getAllChannels, setUseRequestCommand } from "../lib/db/channels";
import { DBPointRewardTriggers } from "../lib/types";

const removeRewardCommand = async (hasAuthority: boolean, channel: string, user: string, text: string, msg: ChatMessage, args: string[], client: ChatClient) => {
    let cancelled = false;
    let completed = true;
    let setupUser = null;


    if (!hasAuthority) {
        await permissionMessage(channel, msg.id)
        return;
    }

    setupUser = msg.userInfo.userId;

    await reply(channel, `Please redeem any rewards you'd like to remove from song request duty. You may redeem as many as you'd like before typing "done" to finish. Type "cancel" to cancel.`, msg.id)

    setRewardsInQuestion(true);

    let l = client.onMessage(async (ch, us, ct, ms) => {
        console.log(cancelled)
        if (cancelled) return;
        let content = ct.toLowerCase();
        if (ms.userInfo.userId === setupUser) {
            if (content === "cancel") {
                l.unbind();
                setRewardsInQuestion(false)
                cancelled = true;
                await reply(ch, `🎈 Cancelled!`, ms.id)
                return;
            }

            if (content === "done") {
                l.unbind();
                setRewardsInQuestion(false)
                completed = true;
                await reply(ch, `🎈 All done!`, ms.id)
                return;
            }

            if (ms.rewardId) {
                if (!rewardIsSongRequest(ms.rewardId)) {
                    await reply(channel, `🎈 Reward ID "${ms.rewardId}" is not associated with song requests.`, msg.id)

                } else {
                    deleteReward(ms.rewardId)
                    await reply(channel, `🎈 Removed listener from reward ID "${ms.rewardId}"`, msg.id)

                }

            }
        }
    })

}

export default removeRewardCommand;