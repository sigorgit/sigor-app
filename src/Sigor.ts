import { Fullscreen, Store, WebSocketClient } from "skydapp-browser";
import Config from "./Config";
import AvatarImage from "./datamodel/AvatarImage";
import UserInfo from "./datamodel/UserInfo";
import World from "./gamenode/World";
import FirstConnectingPopup from "./popup/FirstConnectingPopup";
import ReconnectingPopup from "./popup/ReconnectingPopup";

class Sigor {
    private codeStore = new Store("codeStore");

    private screen: Fullscreen = new Fullscreen();
    private client = new WebSocketClient(`wss://${Config.backendHost}`);

    private firstConnectingPopup: FirstConnectingPopup | undefined = new FirstConnectingPopup().appendTo(this.screen.root);
    private world: World | undefined;
    private reconnectingPopup: ReconnectingPopup | undefined;

    public currentChannel = "yard";
    public currentUserInfo: UserInfo | undefined;

    public start() {

        this.client.on("connect", () => {
            console.log("connected to server.");
            this.firstConnectingPopup?.delete();
            this.firstConnectingPopup = undefined;
            this.reconnectingPopup?.delete();
            this.world?.delete();
            this.world = new World().appendTo(this.screen.root);
            this.world.on("delete", () => this.world = undefined);
        });

        this.client.on("disconnect", () => {
            console.log("disconnected from server.");
            this.world?.delete();
            if (this.firstConnectingPopup === undefined) {
                this.reconnectingPopup?.delete();
                this.reconnectingPopup = new ReconnectingPopup().appendTo(this.screen.root);
                this.reconnectingPopup.on("delete", () => this.reconnectingPopup = undefined);
            }
            setTimeout(() => {
                // 접속이 끊어지면 자동으로 재접속
                this.client.reconnect();
            }, 1000);
        });

        this.client.on("enter-channel", (channelName) => this.enterChannel(channelName));
    }

    public async checkDiscordLogin() {

        let code: string | undefined = this.codeStore.get("code");
        if (code === undefined) {
            code = new URLSearchParams(window.location.search).get("code")!;
            if (code !== null) {
                try {
                    await this.client.send("load-discord-token", code, `${window.location.protocol}//${window.location.host}`);
                    this.codeStore.set("code", code, true);
                } catch (error) {
                    console.error(error);
                    code = undefined;
                }
            } else {
                code = undefined;
            }
        }

        if (code !== undefined) {
            try {
                this.currentUserInfo = await this.client.send("discord-login", code);
                return true;
            } catch (error) {
                console.error(error);
                this.codeStore.delete("code");
                return false;
            }
        }

        else {
            this.codeStore.delete("code");
            return false;
        }
    }

    public async enterChannel(channelName: string) {
        await this.exitChannel();
        this.currentChannel = channelName;
        const channelInfo = await this.client.send("enter-channel", channelName);
        this.client.on(`${this.currentChannel}/createAvatar`, this.createAvatarHandler);
        this.client.on(`${this.currentChannel}/chat`, this.chatHandler);
        this.client.on(`${this.currentChannel}/moveTo`, this.moveToHandler);
        this.world?.createMap(channelInfo);
    }

    public async exitChannel() {
        this.client.off(`${this.currentChannel}/createAvatar`, this.createAvatarHandler);
        this.client.off(`${this.currentChannel}/chat`, this.chatHandler);
        this.client.off(`${this.currentChannel}/moveTo`, this.moveToHandler);
        await this.client.send("exit-channel");
    }

    private createAvatarHandler = (info: {
        userPlatform: string,
        userId: string,
        username: string,
        x: number,
        y: number,
        toX: number | undefined,
        toY: number | undefined,
        avatarImage: AvatarImage,
    }) => {
        console.log("createAvatar", info);
    };

    private chatHandler = (who: string, message: string) => {
        console.log(who, message);
    };

    private moveToHandler = (who: string, x: number, y: number) => {
        console.log(who, x, y);
    };

    public async chat(message: string) {
        this.client.send(`${this.currentChannel}/chat`, message);
    }

    public async moveTo(x: number, y: number) {
        this.client.send(`${this.currentChannel}/moveTo`, x, y);
    }
}

export default new Sigor();
