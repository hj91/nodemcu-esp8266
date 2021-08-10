"use strict";
/**
 * @module node-opcua-client-private
 */
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:only-arrow-functions
const async = require("async");
const chalk_1 = require("chalk");
const node_opcua_assert_1 = require("node-opcua-assert");
const node_opcua_debug_1 = require("node-opcua-debug");
const node_opcua_service_subscription_1 = require("node-opcua-service-subscription");
const node_opcua_status_code_1 = require("node-opcua-status-code");
const debugLog = node_opcua_debug_1.make_debugLog(__filename);
const doDebug = node_opcua_debug_1.checkDebugFlag(__filename);
const errorLog = node_opcua_debug_1.make_errorLog(__filename);
//
// a new secure channel has be created, we need to reactivate the corresponding session,
// and reestablish the subscription and restart the publish engine.
//
//
// see OPC UA part 4 ( version 1.03 ) figure 34 page 106
// 6.5 Reestablishing subscription....
//
//
//
//                      +---------------------+
//                      | CreateSecureChannel |
//                      | CreateSession       |
//                      | ActivateSession     |
//                      +---------------------+
//                                |
//                                |
//                                v
//                      +---------------------+
//                      | CreateSubscription  |<-------------------------------------------------------------+
//                      +---------------------+                                                              |
//                                |                                                                         (1)
//                                |
//                                v
//                      +---------------------+
//     (2)------------->| StartPublishEngine  |
//                      +---------------------+
//                                |
//                                V
//                      +---------------------+
//             +------->| Monitor Connection  |
//             |        +---------------------+
//             |                    |
//             |                    v
//             |          Good    /   \
//             +-----------------/ SR? \______Broken_____+
//                               \     /                 |
//                                \   /                  |
//                                                       |
//                                                       v
//                                                 +---------------------+
//                                                 |                     |
//                                                 | CreateSecureChannel |<-----+
//                                                 |                     |      |
//                                                 +---------------------+      |
//                                                         |                    |
//                                                         v                    |
//                                                       /   \                  |
//                                                      / SR? \______Bad________+
//                                                      \     /
//                                                       \   /
//                                                         |
//                                                         |Good
//                                                         v
//                                                 +---------------------+
//                                                 |                     |
//                                                 | ActivateSession     |
//                                                 |                     |
//                                                 +---------------------+
//                                                         |
//                                  +----------------------+
//                                  |
//                                  v                    +-------------------+       +----------------------+
//                                /   \                  | CreateSession     |       |                      |
//                               / SR? \______Bad_______>| ActivateSession   |-----> | TransferSubscription |
//                               \     /                 |                   |       |                      |       (1)
//                                \   /                  +-------------------+       +----------------------+        ^
//                                  | Good                                                      |                    |
//                                  v   (for each subscription)                                 |                    |
//                          +--------------------+                                            /   \                  |
//                          |                    |                                     OK    / OK? \______Bad________+
//                          | RePublish          |<----------------------------------------- \     /
//                      +-->|                    |                                            \   /
//                      |   +--------------------+
//                      |           |
//                      |           v
//                      | GOOD    /   \
//                      +------  / SR? \______Bad SubscriptionInvalidId______>(1)
// (2)                           \     /
//  ^                             \   /
//  |                               |
//  |                               |
//  |      BadMessageNotAvailable   |
//  +-------------------------------+
function _ask_for_subscription_republish(session, callback) {
    if (session.hasBeenClosed()) {
        debugLog("_ask_for_subscription_republish :  session is closed");
        return callback(new Error("askForSubscriptionRepublish => canceled because session is closed"));
    }
    debugLog(chalk_1.default.bgCyan.yellow.bold("_ask_for_subscription_republish "));
    // assert(session.getPublishEngine().nbPendingPublishRequests === 0,
    //   "at this time, publish request queue shall still be empty");
    session.getPublishEngine().republish((err) => {
        debugLog("_ask_for_subscription_republish :  republish sent");
        if (session.hasBeenClosed()) {
            return callback(new Error("Cannot complete subscription republish due to session termination"));
        }
        debugLog(chalk_1.default.bgCyan.green.bold("_ask_for_subscription_republish done "), err ? err.message : "OK");
        // xx assert(session.getPublishEngine().nbPendingPublishRequests === 0); 
        session.resumePublishEngine();
        callback(err);
    });
}
function repair_client_session_by_recreating_a_new_session(client, session, callback) {
    if (doDebug) {
        debugLog(" repairing client session by_recreating a new session ", session.sessionId.toString());
    }
    if (session.hasBeenClosed()) {
        debugLog(chalk_1.default.bgWhite.red("Aborting reactivation of old session because user requested session to be closed"));
        return callback(new Error("reconnection cancelled due to session termination"));
    }
    let newSession;
    const listenerCountBefore = session.listenerCount("");
    async.series([
        function suspend_old_session_publish_engine(innerCallback) {
            if (session.hasBeenClosed()) {
                return innerCallback(new Error("Cannot complete subscription republish due to session termination"));
            }
            debugLog(chalk_1.default.bgWhite.red("    => suspend old session publish engine...."));
            session.getPublishEngine().suspend(true);
            innerCallback();
        },
        function create_new_session(innerCallback) {
            if (session.hasBeenClosed()) {
                return innerCallback(new Error("Cannot complete subscription republish due to session termination"));
            }
            debugLog(chalk_1.default.bgWhite.red("    => creating a new session ...."));
            // create new session, based on old session,
            // so we can reuse subscriptions data
            client.__createSession_step2(session, (err, session1) => {
                debugLog(chalk_1.default.bgWhite.cyan("    => creating a new session (based on old session data).... Done"));
                if (!err && session1) {
                    newSession = session1;
                    node_opcua_assert_1.assert(session === session1, "session should have been recycled");
                }
                innerCallback(err ? err : undefined);
            });
        },
        function activate_new_session(innerCallback) {
            if (session.hasBeenClosed()) {
                return innerCallback(new Error("Cannot complete subscription republish due to session termination"));
            }
            debugLog(chalk_1.default.bgWhite.red("    => activating a new session ...."));
            client._activateSession(newSession, (err, session1) => {
                debugLog(chalk_1.default.bgWhite.cyan("    =>  activating a new session .... Done"));
                innerCallback(err ? err : undefined);
            });
        },
        function attempt_subscription_transfer(innerCallback) {
            if (session.hasBeenClosed()) {
                return innerCallback(new Error("Cannot complete subscription republish due to session termination"));
            }
            // get the old subscriptions id from the old session
            const subscriptionsIds = session.getPublishEngine().getSubscriptionIds();
            debugLog("  session subscriptionCount = ", newSession.getPublishEngine().subscriptionCount);
            if (subscriptionsIds.length === 0) {
                debugLog(" No subscriptions => skipping transfer subscriptions");
                return innerCallback(); // no need to transfer subscriptions
            }
            debugLog("    => asking server to transfer subscriptions = [", subscriptionsIds.join(", "), "]");
            // Transfer subscriptions
            const subscriptionsToTransfer = new node_opcua_service_subscription_1.TransferSubscriptionsRequest({
                sendInitialValues: false,
                subscriptionIds: subscriptionsIds
            });
            if (newSession.getPublishEngine().nbPendingPublishRequests !== 0) {
                errorLog("Warning : we should not be publishing here");
            }
            newSession.transferSubscriptions(subscriptionsToTransfer, (err, transferSubscriptionsResponse) => {
                if (err) {
                    debugLog(chalk_1.default.bgCyan("Warning TransferSubscription has failed " + err.message));
                    debugLog(chalk_1.default.bgCyan("May be the server is not supporting this feature"));
                    // when transfer subscription has failed, we have no other choice but
                    // recreate the subscriptions on the server side
                    return innerCallback();
                }
                if (!transferSubscriptionsResponse) {
                    return innerCallback(new Error("Internal Error"));
                }
                const results = transferSubscriptionsResponse.results || [];
                // istanbul ignore next
                if (doDebug) {
                    debugLog(chalk_1.default.cyan("    =>  transfer subscriptions  done"), results.map((x) => x.statusCode.toString()).join(" "));
                }
                const subscriptionsToRecreate = [];
                // some subscriptions may be marked as invalid on the server side ...
                // those one need to be recreated and repaired ....
                for (let i = 0; i < results.length; i++) {
                    const statusCode = results[i].statusCode;
                    if (statusCode === node_opcua_status_code_1.StatusCodes.BadSubscriptionIdInvalid) {
                        // repair subscription
                        debugLog(chalk_1.default.red("         WARNING SUBSCRIPTION  "), subscriptionsIds[i], chalk_1.default.red(" SHOULD BE RECREATED"));
                        subscriptionsToRecreate.push(subscriptionsIds[i]);
                    }
                    else {
                        const availableSequenceNumbers = results[i].availableSequenceNumbers;
                        debugLog(chalk_1.default.green("         SUBSCRIPTION "), subscriptionsIds[i], chalk_1.default.green(" CAN BE REPAIRED AND AVAILABLE "), availableSequenceNumbers);
                        // should be Good.
                    }
                }
                debugLog("  new session subscriptionCount = ", newSession.getPublishEngine().subscriptionCount);
                async.forEach(subscriptionsToRecreate, (subscriptionId, next) => {
                    if (!session.getPublishEngine().hasSubscription(subscriptionId)) {
                        debugLog(chalk_1.default.red("          => CANNOT RECREATE SUBSCRIPTION  "), subscriptionId);
                        return next();
                    }
                    const subscription = session.getPublishEngine().getSubscription(subscriptionId);
                    node_opcua_assert_1.assert(subscription.constructor.name === "ClientSubscriptionImpl");
                    debugLog(chalk_1.default.red("          => RECREATING SUBSCRIPTION  "), subscriptionId);
                    node_opcua_assert_1.assert(subscription.session === newSession, "must have the session");
                    subscription.recreateSubscriptionAndMonitoredItem((err1) => {
                        if (err1) {
                            debugLog("_recreateSubscription failed !");
                        }
                        debugLog(chalk_1.default.cyan("          => RECREATING SUBSCRIPTION  AND MONITORED ITEM DONE "), subscriptionId);
                        next();
                    });
                }, (err1) => {
                    innerCallback(err1);
                });
            });
        },
        function ask_for_subscription_republish(innerCallback) {
            if (session.hasBeenClosed()) {
                return innerCallback(new Error("Cannot complete subscription republish due to session termination"));
            }
            //  assert(newSession.getPublishEngine().nbPendingPublishRequests === 0, "we should not be publishing here");
            //      call Republish
            return _ask_for_subscription_republish(newSession, innerCallback);
        },
        function start_publishing_as_normal(innerCallback) {
            if (session.hasBeenClosed()) {
                return innerCallback(new Error("Cannot complete subscription republish due to session termination"));
            }
            newSession.getPublishEngine().suspend(false);
            const listenerCountAfter = session.listenerCount("");
            node_opcua_assert_1.assert(newSession === session);
            debugLog("listenerCountBefore =", listenerCountBefore, "listenerCountAfter = ", listenerCountAfter);
            innerCallback();
        }
    ], (err) => {
        callback(err);
    });
}
function repair_client_session(client, session, callback) {
    const self = client;
    if (doDebug) {
        debugLog("  TRYING TO REACTIVATE EXISTING SESSION ", session.sessionId.toString());
        debugLog("     SubscriptionIds :", session.getPublishEngine().getSubscriptionIds());
    }
    self._activateSession(session, (err, session2) => {
        //
        // Note: current limitation :
        //  - The reconnection doesn't work yet, if connection break is caused by a server that crashes and restarts.
        //
        debugLog("    ActivateSession : ", err ? err.message : " SUCCESS !!! ");
        if (err) {
            //  activate old session has failed => let's  recreate a new Channel and transfer the subscription
            return repair_client_session_by_recreating_a_new_session(client, session, callback);
        }
        else {
            // activate old session has succeeded => let's call Republish
            return _ask_for_subscription_republish(session, callback);
        }
    });
}
exports.repair_client_session = repair_client_session;
function repair_client_sessions(client, callback) {
    const self = client;
    debugLog(chalk_1.default.red.bgWhite(" Starting sessions reactivation"));
    // repair session
    const sessions = self._sessions;
    async.map(sessions, (session, next) => {
        repair_client_session(client, session, next);
    }, (err) => {
        return callback(err);
    });
}
exports.repair_client_sessions = repair_client_sessions;
//# sourceMappingURL=reconnection.js.map