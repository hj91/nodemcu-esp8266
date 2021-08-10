import { ProxyState } from "./proxy_state";
import { ProxyTransition } from "./proxy_transition";
export declare class ProxyStateMachineType {
    initialState: ProxyState | undefined;
    states: ProxyState[];
    transitions: ProxyTransition[];
    constructor(obj: any);
}
