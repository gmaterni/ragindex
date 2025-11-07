/** @format */
"use strict";

import { UaDb } from "./uadb.js";
import { DATA_KEYS } from "./data_keys.js";

export const DocsMgr = {
  _names: [],

  init() {
    this._names = UaDb.readArray(DATA_KEYS.KEY_DOCS) || [];
  },

  add(name, doc) {
    if (!this._names.includes(name)) {
      this._names.push(name);
      UaDb.saveArray(DATA_KEYS.KEY_DOCS, this._names);
    }
    UaDb.save(`idoc_${name}`, doc);
  },

  read(name) {
    return UaDb.read(`idoc_${name}`);
  },

  names() {
    this.init();
    return this._names;
  },

  name(i) {
    if (i >= 0 && i < this._names.length) {
      return this._names[i];
    }
    return null;
  },

  doc(i) {
    const name = this.name(i);
    if (name) {
      return this.read(name);
    }
    return null;
  },

  delete(name) {
    const index = this._names.indexOf(name);
    if (index > -1) {
      this._names.splice(index, 1);
      UaDb.saveArray(DATA_KEYS.KEY_DOCS, this._names);
      UaDb.delete(`idoc_${name}`);
      return true;
    }
    return false;
  },

  deleteAll() {
    this._names.forEach(name => {
      UaDb.delete(`idoc_${name}`);
    });
    this._names = [];
    UaDb.delete(DATA_KEYS.KEY_DOCS);
  },

  exists(name) {
    return this._names.includes(name);
  }
};

DocsMgr.init();
