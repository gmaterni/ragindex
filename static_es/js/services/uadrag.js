/** @format */
"use strict";

const nodrag_tds = ["input", "select", "a"];
const nodrag_cls = "nodrag";

export var UaDrag = function (e) {
  const drag = function (element) {
    let pos1 = 0,
      pos2 = 0,
      pos3 = 0,
      pos4 = 0;

    const dragMouseDown = function (e) {
      e = e || window.event;
      let t = e.target;
      t = t || null;
      if (!t) return;
      if (nodrag_tds.includes(t.tagName.toLowerCase())) return;
      if (t.classList.contains(nodrag_cls)) return;
      e.preventDefault();
      //e.stopImmediatePropagation();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    };

    const elementDrag = function (e) {
      e = e || window.event;
      //e.stopImmediatePropagation();
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = element.offsetTop - pos2 + "px";
      element.style.left = element.offsetLeft - pos1 + "px";
    };

    const closeDragElement = function () {
      document.onmouseup = null;
      document.onmousemove = null;
    };

    element.onmousedown = dragMouseDown;
  };
  return drag(e);
};
