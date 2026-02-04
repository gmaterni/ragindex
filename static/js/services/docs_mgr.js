/** @format */
"use strict";

import { UaDb } from "./uadb.js";
import { DATA_KEYS } from "./data_keys.js";

// AAA Dexie - DocsMgr ora è completamente asincrono
export const DocsMgr = {
  _names: [],

  async init() {
    this._names = await UaDb.readArray(DATA_KEYS.KEY_DOCS) || [];
  },

  async add(name, doc) {
    await this.init(); // Assicuriamoci che i nomi siano caricati
    if (!this._names.includes(name)) {
      this._names.push(name);
      await UaDb.saveArray(DATA_KEYS.KEY_DOCS, this._names);
    }
    await UaDb.save(`${DATA_KEYS.KEY_DOC_PRE}${name}`, doc);
  },

  async read(name) {
    return await UaDb.read(`${DATA_KEYS.KEY_DOC_PRE}${name}`);
  },

  async names() {
    await this.init();
    return this._names;
  },

  async name(i) {
    await this.init();
    if (i >= 0 && i < this._names.length) {
      return this._names[i];
    }
    return null;
  },

  async doc(i) {
    const name = await this.name(i);
    if (name) {
      return await this.read(name);
    }
    return null;
  },

  async delete(name) {
    await this.init();
    const index = this._names.indexOf(name);
    if (index > -1) {
      this._names.splice(index, 1);
      await UaDb.saveArray(DATA_KEYS.KEY_DOCS, this._names);
      await UaDb.delete(`${DATA_KEYS.KEY_DOC_PRE}${name}`);
      return true;
    }
    return false;
  },

  async deleteAll() {
    await this.init();
    for (const name of this._names) {
      await UaDb.delete(`${DATA_KEYS.KEY_DOC_PRE}${name}`);
    }
    this._names = [];
    await UaDb.delete(DATA_KEYS.KEY_DOCS);
  },

  async exists(name) {
    await this.init();
    return this._names.includes(name);
  }
};