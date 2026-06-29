"use strict";

import { dbInstance as _db } from "./db_instance.js";

const _logErr = function(op, err) { 
    console.error(`UaDb.${op}:`, err); 
    return false; 
};

export const UaDb = {
  async read(id) {
    let result = "";

    try {
      const record = await _db.settings.get(id);

      if (record) {
        result = record.value;
      }
    } catch (error) {
      _logErr(`read ${id}`, error);
      result = "";
    }

    return result;
  },

  async delete(id) {
    try {
      await _db.settings.delete(id);
    } catch (error) {
      _logErr(`delete ${id}`, error);
    }
  },

  async save(id, data) {
    try {
      await _db.settings.put({ id: id, value: data });
    } catch (error) {
      _logErr(`save ${id}`, error);
    }
  },

  async getAllIds() {
    let result = [];

    try {
      result = await _db.settings.toCollection().primaryKeys();
    } catch (error) {
      _logErr("getAllIds", error);
      result = [];
    }

    return result;
  },

  async saveArray(id, arr) {
    const str = JSON.stringify(arr);
    await this.save(id, str);
  },

  async readArray(id) {
    const str = await this.read(id);

    if (!str || str.trim().length === 0) {
      return [];
    }

    let result = [];

    try {
      result = JSON.parse(str);
    } catch (e) {
      _logErr("readArray", e);
      result = [];
    }

    return result;
  },

  async saveJson(id, js) {
    const str = JSON.stringify(js);
    await this.save(id, str);
  },

  async readJson(id) {
    const str = await this.read(id);

    if (!str) {
      return {};
    }

    let result = {};

    try {
      result = JSON.parse(str);
    } catch (e) {
      _logErr("readJson", e);
      result = {};
    }

    return result;
  },

  async clear() {
    try {
      await _db.settings.clear();
    } catch (e) {
      _logErr("clear", e);
    }
  }
};
