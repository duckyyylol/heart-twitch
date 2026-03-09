import { configDotenv } from "dotenv";
import express, { json } from "express";
import { join } from "path";
import cors from "cors"
import { AppTokenAuthProvider, RefreshingAuthProvider } from "@twurple/auth";
import { createSession, getSessionByToken, getSessionByUserId, updateSession } from "./lib/db/sessions";
import { post } from "axios";
import { SessionData, TokenResponse } from "./lib/types";
import { get } from "axios";
import { ApiClient } from "@twurple/api";
import { ChatClient, ChatUser } from "@twurple/chat";
import { addChannel, getAllChannels, getChannelByName, isChannelAdded, leaveChannel, setChannelSessionId } from "./lib/db/channels";
import { EventSubWsListener } from "@twurple/eventsub-ws";
import nowPlaying from "./commands/nowPlaying";
import nowPlayingCommand from "./commands/nowPlaying";
import queueCommand from "./commands/queue";
import setupCommand from "./commands/setup";
import songRequestCommand from "./commands/songRequest";
import { addToQueue, formatArtists, search } from "./lib/spoofify";
import { rewardIsSongRequest } from "./lib/db/rewards";
import toggleSongRequestCommand from "./commands/toggleSongRequest";
import addRewardCommand from "./commands/addReward";
import removeRewardCommand from "./commands/removeReward";

// Enable Environment Variables (and shut dotenv the fuck up)

configDotenv({ path: join(process.cwd(), ".env"), quiet: true })

// Webserver Config

const PORT = process.env.PORT || 3000;

const app = express();
app.use(json());
app.use(cors());

console.log("B", isChannelAdded("hello"))

if (!isChannelAdded(process.env.BOT_USER_ID)) {
    addChannel({ broadcasterId: process.env.BOT_USER_ID, broadcasterName: process.env.BOT_USER_NAME })
}

function channelsToArray(): string[] {
    let ch = getAllChannels();
    return ch.map(c => c.broadcasterName);
}

// Twitch Auth/Api

export let rewardsInQuestion: boolean = false;

export function setRewardsInQuestion(t: boolean): void {
    rewardsInQuestion = t;
}

let scopes = ["user:write:chat", "user:read:chat", "chat:read", "chat:edit", "user:bot", "channel:bot"]

// const authProvider = new AppTokenAuthProvider(process.env.CLIENT_ID, process.env.CLIENT_SECRET)

const authProvider = new RefreshingAuthProvider({ clientId: process.env.CLIENT_ID, clientSecret: process.env.CLIENT_SECRET, appImpliedScopes: scopes })
const apiClient = new ApiClient({ authProvider })
let chat: ChatClient | null = new ChatClient({ authProvider, channels: channelsToArray(), isAlwaysMod: false });
const eventsub = new EventSubWsListener({ apiClient });

export async function say(channel, content, replyId: string | null = null, withRandomizer: boolean = true): Promise<string | null> {
    let channelUser = await apiClient.users.getUserByName(channel);
    console.log("channel", channelUser)
    if (!channelUser) return;
    let clientUser = await apiClient.users.getAuthenticatedUser(process.env.BOT_USER_ID);
    console.log("client", clientUser)
    if (!clientUser) return;

    let botSession = getSessionByUserId(clientUser.id)
    console.log("session", botSession)
    if (!botSession) return;

    if (channelUser.id === clientUser.id) withRandomizer = false;


    let d: any = { broadcaster_id: channelUser.id, sender_id: clientUser.id, message: `${withRandomizer ? `[${Math.floor(Math.random() * 1000)}] ` : ""}${content}` }
    if (replyId) d.reply_parent_message_id = replyId

    try {
        let r: any = await post(`https://api.twitch.tv/helix/chat/messages`, d, { headers: { "Authorization": `Bearer ${botSession.accessToken}`, "Client-Id": process.env.CLIENT_ID } })
        return r.data?.data?.[0]?.message_id
    } catch (e) {
        console.log(e)
        return null;
    }
}

export async function reply(channel, content, replyId, withRandomizer: boolean = true): Promise<string | null> {
    return await say(channel, content, replyId, withRandomizer);
}

export async function permissionMessage(channel, replyId: string | null = null): Promise<string | null> {
    if (replyId) {
        return await reply(channel, `You do not have permission to do that.`, replyId)
    } else {
        return await say(channel, `You do not have permission to do that.`)
    }
}

async function beerioGet(endpoint: string, requesterId: string): Promise<any | null> {
    let botSession = getSessionByUserId(process.env.BOT_USER_ID);
    if (!botSession) return null;
    let res: any = await get(`${process.env.BEERIO_WEB_URL}/api${endpoint}`, { headers: { 'x-requester-id': requesterId, 'Cookie': `token-0=${botSession.accessToken}` } })
    return res.data?.data || null;
}

function userHasAuthority(user: ChatUser): boolean {
    return [user.isMod, user.isLeadMod, user.isBroadcaster].includes(true);
}

// async function initEventSub(): Promise<void> {
//     eventsub.on
// }

async function initChat(c: ChatClient): Promise<void> {
    // await initEventSub();

    c.onConnect(() => {
        console.log(`Chat Client Connected`)
    })

    c.onJoin(async (c, u) => {
        console.log(`[${u}] Joined #${c}`)
    })

    c.onPart(async (c, u) => {
        console.log(`[${u}] Left #${c}`)
    })

    c.onMessageFailed((c, r) => {
        console.log(`[fail - ${c}] ${r}`)
    })

    c.onMessage(async (channel, user, text, msg) => {
        console.log("question", rewardsInQuestion)
        if (msg.rewardId && channel !== process.env.BOT_USER_NAME && !rewardsInQuestion) {
            console.log('reward', msg.rewardId)
            if (rewardIsSongRequest(msg.rewardId)) {
                    let query = text;

                    let searchingMsgId = await reply(channel, `Searching for ${query}...`, msg.id)

                    search(query).then(async searchResults => {
                        let result = searchResults[0];
                        let addingMsgId = await reply(channel, `Adding "${result.name} - ${formatArtists(result.artists)}" to the queue...`, searchingMsgId);

                        let added = await addToQueue(result.uri);

                        setTimeout(async () => {
                            if (added) {
                                await reply(channel, `Added "${result.name} - ${formatArtists(result.artists)}" to the queue!`, addingMsgId)
                            } else {
                                await reply(channel, `Failed to add "${result.name} - ${formatArtists(result.artists)}" to the queue`, addingMsgId)
                            }
                        }, 1e3)
                    }).catch(async e => {
                        await reply(channel, `Found 0 results for "${query}"`, msg.id)
                    });
                }
            return;
        }

        if (channel === process.env.BOT_USER_NAME) {
            if (text.toLowerCase().trim() === "!join") {
                if (isChannelAdded(msg.userInfo.userId)) {
                    await reply(channel, `🎈 The bot is already added to your channel!`, msg.id)
                } else {
                    addChannel({ broadcasterId: msg.userInfo.userId, broadcasterName: msg.userInfo.userName })
                    await c.join(msg.userInfo.userName)

                    await reply(channel, `🎈 The bot has been added to your channel!`, msg.id)
                    await say(user, `🎈 2d Balloon Dog floated in! 💎 The bot may get caught by spam filters. Add VIP or Mod to the bot to bypass this. ❗ @${user} or a moderator must run !setup to begin using song request features.`, null, false)
                }

            } else if (text.toLowerCase().trim() === "!leave") {
                if (!isChannelAdded(msg.userInfo.userId)) {
                    await reply(channel, `🎈 The bot is not added to your channel.`, msg.id)
                } else {
                    leaveChannel(msg.userInfo.userId)
                    await c.part(msg.userInfo.userName)
                    await reply(channel, `🎈 The bot has been removed from your channel.`, msg.id)
                }
            }
        } else {

            //external commands (not in bot's chat)
            let prefix = "!";
            if (text.startsWith(prefix)) {
                let dbChannel = getChannelByName(channel);

                let args = text.slice(prefix.length).trim().split(/ +/g);
                let command = args.shift().toLowerCase();

                if (["nowplaying", "song", "np", "currentsong", "whatsplaying"].includes(command)) await nowPlayingCommand(userHasAuthority(msg.userInfo), channel, user, text, msg, args);
                if (["queue", "q", "songlist", "tracklist"].includes(command)) await queueCommand(userHasAuthority(msg.userInfo), channel, user, text, msg, args);
                if (["setup"].includes(command)) await setupCommand(userHasAuthority(msg.userInfo), channel, user, text, msg, args, c);

                if (["songrequest", "sr", "request", "addsong", "play"].includes(command)) await songRequestCommand(userHasAuthority(msg.userInfo), channel, user, text, msg, args);
                if(["togglesr", "togglecommand"].includes(command)) await toggleSongRequestCommand(userHasAuthority(msg.userInfo), channel, user, text, msg, args)
                if(["addreward"].includes(command)) await addRewardCommand(userHasAuthority(msg.userInfo), channel, user, text, msg, args, c)
                if(["delreward", "removereward", "remreward"].includes(command)) await removeRewardCommand(userHasAuthority(msg.userInfo), channel, user, text, msg, args, c)

            }
        }
    })
}



authProvider.onRefresh(async (userId, newTokenData) => {
    console.log(`Updated session for user id ${userId}`)
    await updateSession(userId, { ...newTokenData as any, userId: userId })
})

// Webserver Routes

app.get("/auth", async (req, res) => {
    if (req.query.code) {
        let params = new URLSearchParams();
        params.append("grant_type", "authorization_code")
        params.append("redirect_uri", `http://localhost:${PORT}/auth`)
        params.append("code", req.query.code as string);
        params.append("client_id", process.env.CLIENT_ID)
        params.append("client_secret", process.env.CLIENT_SECRET)

        try {
            let tokenRes = await post(`https://id.twitch.tv/oauth2/token`, params);


            if (tokenRes.data) {
                let tokenData: TokenResponse = tokenRes.data as TokenResponse;
                try {

                    let currentUser: { data: any } = await get(`https://api.twitch.tv/helix/users`, { headers: { "Authorization": `Bearer ${tokenData.access_token}`, "Client-Id": process.env.CLIENT_ID } }) || null


                    if (currentUser && currentUser.data?.data?.[0]?.id) {
                        let sessionData: SessionData = {
                            accessToken: tokenData.access_token,
                            refreshToken: tokenData.refresh_token,
                            expiresIn: tokenData.expires_in,
                            obtainmentTimestamp: Date.now(),
                            userId: currentUser.data.data[0].id
                        }
                        let session = getSessionByUserId(sessionData.userId)
                        if (!session) {
                            createSession(sessionData)
                        } else {
                            await updateSession(session.userId, sessionData)
                        }
                        // await authProvider.addUserForToken(sessionData, ['chat'])




                        res.send(sessionData || null)
                    }
                } catch (e) {
                    console.log(e)
                }
            }
        } catch (e) {

            console.log(e)
        }
    } else {

        res.redirect(`https://id.twitch.tv/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=http://localhost:${PORT}/auth&scope=${scopes.join(" ")}&response_type=code`)
    }
})


setInterval(async () => {
    if (!chat) {
        console.log(``)
        return;
    }
    if (!chat.isConnected) {
        let botSession = getSessionByUserId(process.env.BOT_USER_ID);
        if (botSession) {
            try {

                let clientAuthDetail: Axios.AxiosXHR<{ data: any[] }> = await get(`https://api.twitch.tv/helix/users`, { headers: { "Authorization": `Bearer ${botSession.accessToken}`, "Client-Id": process.env.CLIENT_ID } })
                if (clientAuthDetail.data?.data?.[0]) {
                    let ud = clientAuthDetail.data?.data?.[0];
                    if (!authProvider.hasUser(ud.id)) {
                        if (botSession.userId === ud.id) authProvider.addUser(ud.id, botSession, ['chat'])
                    } else {
                        if (!chat.isConnected) {
                            chat.connect();
                            await initChat(chat);
                            console.log(`Connecting to Chat`)
                        }
                    }
                }
            } catch (e) {
                await authProvider.addUserForToken(botSession)
                await authProvider.refreshAccessTokenForUser(botSession.userId)
            }
            // console.log(authProvider.getCurrentScopesForUser(ud.id))
            // if (authProvider.getCurrentScopesForUser(ud.id) !== ud.scopes) {
            //     console.log(`Re-Authorize Client - Scopes do not match`)
            // } else {
            // }
        } else {
            console.log(`Re-Authorize Client - Session not found`)
        }
    } else {
        // console.log(`Re-Authorize Client - Could not fetch authorization details`)
    }
}, 1e3)



// Initialize Webserver

app.listen(PORT, async (err) => {
    if (!err) {
        console.log(`Webserver started at http://localhost:${PORT}`)
        // chat.connect()
        // await initChat(chat)

    } else {
        console.log("Failed to start webserver", err)
    }
})