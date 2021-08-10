/**
 * @module node-opcua-client
 */
import { ErrorCallback } from "node-opcua-secure-channel";
import { ClientSubscription } from "../client_subscription";
export declare function callConditionRefresh(subscription: ClientSubscription): Promise<void>;
export declare function callConditionRefresh(subscription: ClientSubscription, callback: ErrorCallback): void;
