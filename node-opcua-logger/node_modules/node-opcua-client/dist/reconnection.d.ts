/**
 * @module node-opcua-client-private
 */
import { ClientSessionImpl } from "./private/client_session_impl";
import { OPCUAClientImpl } from "./private/opcua_client_impl";
export declare function repair_client_session(client: OPCUAClientImpl, session: ClientSessionImpl, callback: (err?: Error) => void): void;
export declare function repair_client_sessions(client: OPCUAClientImpl, callback: (err?: Error) => void): void;
