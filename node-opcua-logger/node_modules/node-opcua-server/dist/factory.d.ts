import { ExtensionObject } from "node-opcua-extension-object";
import { ExpandedNodeId } from "node-opcua-nodeid";
export declare class Factory {
    engine: any;
    constructor(engine: any);
    constructObject(id: ExpandedNodeId): ExtensionObject;
}
