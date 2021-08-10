import { ServerOnNetwork } from "node-opcua-service-discovery";
export declare class MDNSResponder {
    /**
     * the list of servers that have been activated as mDNS service
     */
    registeredServers: ServerOnNetwork[];
    private multicastDNS;
    private recordId;
    private responder;
    private lastUpdateDate;
    constructor();
    dispose(): void;
}
