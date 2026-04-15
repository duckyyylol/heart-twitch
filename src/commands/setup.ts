import { ChatClient, ChatMessage } from "@twurple/chat";
import { permissionMessage, reply, say } from "..";
import { addReward, rewardIsSongRequest } from "../lib/db/rewards";
import { getAllChannels, setUseRequestCommand } from "../lib/db/channels";
import { DBPointRewardTriggers } from "../lib/types";
import { getCurrentUser } from "../lib/spoofify";

const setupCommand = async (hasAuthority: boolean, channel: string, user: string, text: string, msg: ChatMessage, args: string[], client: ChatClient) => {
    let step = 0;
    let cancelled = false;
    let completed = true;
    let continues = [null, null];
    let setupUser = null;
    let replies = [];

    let yesNo = ["yes", "no"]

    let stepKeys = [yesNo, null]

    if (!hasAuthority) {
        await permissionMessage(channel, msg.id)
        return;
    }

    let spoofUser = await getCurrentUser();
    if(!spoofUser) return await reply(channel, `The bot isn't authorized yet. Please head to ${process.env.SPOOFIFY_WEB_URL}/auth to log in with Spotify! Please run this command again once you've logged in.`, msg.id);


    setupUser = msg.userInfo.userId;

    async function runStep(s: number) {
        switch (s) {
            case 0: {
                await reply(channel, `Setup begins! First, do you want to enable the free (0 channel points) !songrequest command? Reply "yes" or "no", "cancel" to cancel setup.`, msg.id);
                break;
            }
            case 1: {
                await reply(channel, `Next up, if you'd like to use a channel point redemption for song requests, please redeem it now.`, msg.id);
                break;
            }
            default: {
                await reply(channel, `Setup is complete!`, msg.id);
                completed = true;
                l.unbind();
            }
        }
    }

    async function answerStep(s: number, a: string | boolean) {
        switch (s) {
            case 0: {
                replies[0] = await reply(channel, `Got it! We ${a ? "will use" : "will not use"} the !songrequest command!`, msg.id);
                await setUseRequestCommand(channel, a as boolean)

                break;
            }
            case 1: {
                replies[1] = await reply(channel, `I'll use reward ID ${a} for song requests!`, msg.id);
                let channels = getAllChannels();
                let broadcaster = channels.find(c => c.broadcasterName === channel)
                addReward({channelId: broadcaster.broadcasterId, cost: 0, rewardId: a as string, trigger: DBPointRewardTriggers.SONG_REQUEST})
                break;
            }

        }
    }

    await runStep(0);

    let l = client.onMessage(async (ch, us, ct, ms) => {
        console.log(cancelled)
        if (cancelled) return;
        let content = ct.toLowerCase();
        if (ms.userInfo.userId === setupUser) {
            if (content === "cancel") {
                l.unbind();
                cancelled = true;
                await reply(ch, `Cancelled setup`, ms.id)
                return;
            }

            console.log("KEYS", stepKeys[step])
            console.log("RESPONSE", content)
            console.log("IS YES/NO", stepKeys[step] === yesNo)


            if (continues[step] === null) {
                if (stepKeys[step] === yesNo) {
                    if (stepKeys[step].includes(content)) {
                        continues[step] = content === stepKeys[step][0];
                        await answerStep(step, continues[step]);
                        step++
                        setTimeout(async () => {
                            await runStep(step);
                        }, 2e3)
                    } else {
                        await reply(channel, `"${content}" is not a valid response.`, msg.id)
                        return;
                    }

                } else if (stepKeys[step] !== null && !stepKeys[step].includes(content)) {
                    await reply(channel, `"${content}" is not a valid response.`, msg.id)
                    return;
                }else if (stepKeys[step] === null && !ms.rewardId) {
                    continues[step] = content;
                    await answerStep(step, continues[step]);
                    step++
                    setTimeout(async () => {
                        await runStep(step);
                    }, 2e3)
                }

            }

            if (continues[step] === null && ms.rewardId && stepKeys[step] === null) {
                if(rewardIsSongRequest(ms.rewardId)) {
                    await reply(channel, `Reward ID "${ms.rewardId}" is already associated with song requests.`, msg.id)

                } else {

                    continues[step] = ms.rewardId;
                    console.log(ms.rewardId)
                    await answerStep(step, continues[step])
                    step++
                    setTimeout(async () => {
                        await runStep(step);
                    }, 2e3)
                }

            }
        }
    })

}

export default setupCommand;