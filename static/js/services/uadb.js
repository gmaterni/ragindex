/** @format */
"use strict";
export const UaDb = {
  read(id) {
    const data = localStorage.getItem(id);
    if (data === null) {
      return "";
    }
    return data;
  },
  delete(id) {
    if (!localStorage.getItem(id)) {
      console.error(`ID ${id} not found.`);
      return;
    }
    localStorage.removeItem(id);
  },
  save(id, data) {
    localStorage.setItem(id, data);
  },
  getAllIds() {
    const ids = [];
    for (let i = 0; i < localStorage.length; i++) {
      ids.push(localStorage.key(i));
    }
    return ids;
  },
  saveArray(id, arr) {
    const str = JSON.stringify(arr);
    UaDb.save(id, str);
  },
  readArray(id) {
    const str = UaDb.read(id);
    if (str.trim().length == 0) return [];
    const arr = JSON.parse(str);
    return arr;
  },
  saveJson(id, js) {
    const str = JSON.stringify(js);
    UaDb.save(id, str);
  },
  readJson(id) {
    const str = UaDb.read(id);
    if (!str) return {};
    const js = JSON.parse(str);
    return js;
  },
  clear() {
    localStorage.clear();
  }
};

