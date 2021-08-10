import { Message, ServerSecureChannelLayer } from "node-opcua-secure-channel";
import { OPCUABaseServer, OPCUABaseServerOptions } from "node-opcua-server";
import { ApplicationDescription } from "node-opcua-service-endpoints";
export interface OPCUADiscoveryServerOptions extends OPCUABaseServerOptions {
    certificateFile?: string;
    port?: number;
}
export declare class OPCUADiscoveryServer extends OPCUABaseServer {
    private mDnsResponder?;
    private readonly registeredServers;
    private bonjourHolder;
    private _delayInit?;
    constructor(options: OPCUADiscoveryServerOptions);
    start(): Promise<void>;
    start(done: (err?: Error) => void): void;
    shutdown(): Promise<void>;
    shutdown(done: (err?: Error) => void): void;
    /**
     * returns the number of registered servers
     */
    readonly registeredServerCount: number;
    getServers(channel: ServerSecureChannelLayer): ApplicationDescription[];
    protected _on_RegisterServer2Request(message: Message, channel: ServerSecureChannelLayer): void;
    protected _on_RegisterServerRequest(message: Message, channel: ServerSecureChannelLayer): void;
    protected _on_FindServersOnNetworkRequest(message: Message, channel: ServerSecureChannelLayer): void;
    private __internalRegisterServerWithCallback;
    private __internalRegisterServer;
}
