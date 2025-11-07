/** @format */
"use strict";

export const UaJtfh = () => {
  return {
    rows: [],
    init() {
      this.rows = [];
      return this;
    },
    insert(s) {
      this.rows.unshift(s);
      return this;
    },
    append(s) {
      this.rows.push(s);
      return this;
    },
    text(ln = "") {
      return this.rows.join(ln);
    },
    html(ln = "") {
      const h = this.rows.join(ln).replace(/\s+|\[rn\]/g, " ");
      return h;
    },
  };
};
