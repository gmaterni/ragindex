/** @format */
"use strict";

import { idbMgr } from "./idb_mgr.js";

// AAA Dexie - UaDb ora è un wrapper asincrono su Dexie (tabella settings)
export const UaDb = {
  async read(id) {
    try {
      const db = idbMgr.db();
      const record = await db.settings.get(id);
      return record ? record.value : "";
    } catch (error) {
      console.error(`Dexie UaDb: Errore lettura ${id}:`, error);
      return "";
    }
  },

  async delete(id) {
    try {
      const db = idbMgr.db();
      await db.settings.delete(id);
    } catch (error) {
      console.error(`Dexie UaDb: Errore eliminazione ${id}:`, error);
    }
  },

  async save(id, data) {
    try {
      const db = idbMgr.db();
      await db.settings.put({ id: id, value: data });
    } catch (error) {
      console.error(`Dexie UaDb: Errore salvataggio ${id}:`, error);
    }
  },

  async getAllIds() {
    try {
      const db = idbMgr.db();
      return await db.settings.toCollection().primaryKeys();
    } catch (error) {
      return [];
    }
  },

  async saveArray(id, arr) {
    const str = JSON.stringify(arr);
    await this.save(id, str);
  },

  async readArray(id) {
    const str = await this.read(id);
    if (!str || str.trim().length === 0) return [];
    try {
      return JSON.parse(str);
    } catch (e) {
      return [];
    }
  },

  async saveJson(id, js) {
    const str = JSON.stringify(js);
    await this.save(id, str);
  },

  async readJson(id) {
    const str = await this.read(id);
    if (!str) return {};
    try {
      return JSON.parse(str);
    } catch (e) {
      return {};
    }
  },

  async clear() {
    const db = idbMgr.db();
    await db.settings.clear();
  }
};