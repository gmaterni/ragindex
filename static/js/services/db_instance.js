/** @format */
"use strict";

import Dexie from "./vendor/dexie.js";
import { WebId } from "./webuser_id.js";

/** 
 * Il nome del database include l'ID utente per garantire l'isolamento dei dati
 * tra account diversi sullo stesso browser.
 */
const userId = WebId.get();
const dbInstance = new Dexie(`RagIndexDB_${userId}`);

dbInstance.version(2).stores({
    kvStore: "id",
    settings: "id"
});

export { dbInstance };
