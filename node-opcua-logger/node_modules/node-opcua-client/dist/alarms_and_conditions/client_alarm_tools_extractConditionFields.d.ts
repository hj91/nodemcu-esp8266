import { NodeIdLike } from "node-opcua-nodeid";
import { IBasicSession } from "node-opcua-pseudo-session";
/**
 *
 * @param session
 * @param conditionNodeId
 */
export declare function extractConditionFields(session: IBasicSession, conditionNodeId: NodeIdLike): Promise<string[]>;
