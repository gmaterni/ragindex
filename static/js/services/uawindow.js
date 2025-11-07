/** @format */

"use strict";
import { UaDrag } from "./uadrag.js";

export var UaWindowAdm = {
  ws: {},
  create(id, parent_id = null) {
    let w = document.getElementById(id);
    if (!w) {
      w = document.createElement("div");
      if (!parent_id) document.body.appendChild(w);
      else document.getElementById(parent_id).appendChild(w);
      w.id = id;
      w.setAttribute("data-name", "ua-window");
      const uaw = this.newUaWindow(w);
      this.ws[id] = uaw;
    }
    const uaw = this.ws[id];
    w.style.display = "none";
    return uaw;
  },
  get(id) {
    if (!this.ws[id]) return null;
    return this.ws[id];
  },
  show(id) {
    if (!!this.ws[id]) this.ws[id].show();
  },
  close(id) {
    if (!!this.ws[id]) this.ws[id].close();
  },
  toggle(id) {
    if (!!this.ws[id]) this.ws[id].toggle();
  },
  hide(id) {
    if (!!this.ws[id]) this.ws[id].hide();
  },
  closeThis(e) {
    const ancestor = e.closest('[data-name="ua-window"]');
    const id = ancestor.id;
    this.ws[id].close();
  },
  showAll() {
    for (let k in this.ws) this.ws[k].show();
  },
  hideAll() {
    for (let k in this.ws) this.ws[k].hide();
  },
  closeAll() {
    for (let k in this.ws) this.ws[k].close();
  },
  remove(id) {
    if (!this.ws[id]) return;
    document.getElementById(id).remove();
    this.ws[id] = null;
    delete this.ws[id];
  },
  removeAll() {
    for (let k in this.ws) this.remove(k);
    this.ws = {};
  },
  newUaWindow(jqw) {
    let wnd = {
      initialize(w) {
        this.w = w;
        this.wx = "0px";
        this.wy = "0px";
        this.isOpen = false;
        this.isVisible = false;
        this.firstShow = true;
        this.pos = 0;
        this.wz = 0;
        this.vw = "px";
        this.vh = "px";
      },
      vw_vh() {
        // setta coe unità di misura vw e vh al posto di px;
        this.vw = "vw";
        this.vh = "vh";
        return this;
      },
      addClassStyle(className) {
        if (!this.w.classList.contains(className)) this.w.classList.add(className);
        return this;
      },
      removeClassStyle(className) {
        if (this.w.classList.contains(className)) this.w.classList.remove(className);
        return this;
      },
      getWindow() {
        alert("getWindow => ??");
        return this.w;
      },
      getElement() {
        return this.w;
      },
      getId() {
        return this.w.id;
      },
      setStyle(styles) {
        for (const prop in styles) this.w.style[prop] = styles[prop];
        return this;
      },
      setHtml(html) {
        this.w.innerHTML = html;
        return this;
      },
      getHtml() {
        return this.w.innerHTML;
      },
      /*
            pos==1) => si posiziona ad ogni chiamata di show
            pos==0) => si posiziona ad ogni chiamata di show
                        sucessiva ad uno status hide (default)
            pos==-1)=> si posiziona solo alla prima chiamata di show

            x => 0      left=x
            x < 0       right=abs(x)
            */
      setXY(x, y, pos = 0) {
        this.wx = x;
        this.wy = y;
        this.pos = pos;
        return this;
      },
      setCenterY(y, pos) {
        let xd = window.innerWidth;
        const wd = this.w.clientWidth;
        let x = (xd - wd) / 2;
        this.setXY(x, y, pos);
        return this;
      },
      setCenter(pos) {
        let xd = window.innerWidth;
        let yd = window.innerHeight;
        const wd = this.w.clientWidth;
        const wh = this.w.clientHeight;
        let x = (xd - wd) / 2;
        let y = (yd - wh) / 2;
        this.setXY(x, y, pos);
        return this;
      },
      linkToId(linked_id, dx, dy, pos) {
        let lk = document.getElementById(linked_id);
        this.linkToElement(lk, dx, dy, pos);
        return this;
      },
      linkToElement(elm, dx, dy, pos) {
        let x = elm.offsetLeft + elm.offsetWidth + dx;
        let y = elm.offsetTop + dy;
        if (y < 0) y = 0;
        this.setXY(x, y, pos);
        return this;
      },
      setZ(z) {
        this.wz = z;
        return this;
      },
      reset() {
        this.firstShow = true;
        return this;
      },
      toggle() {
        if (!this.isVisible) this.show();
        else this.hide();
        return this;
      },
      show() {
        if (this.firstShow || this.pos == 1 || (this.pos === 0 && this.isVisible === false)) {
          this.w.style.position = "absolute";
          this.w.style.marginLeft = 0;
          this.w.style.marginTop = 0;
          this.w.style.top = `${this.wy}${this.vh}`;
          if (this.wx >= 0) this.w.style.left = `${this.wx}${this.vw}`;
          else this.w.style.right = -`${this.wx}${this.vw}`;
          if (this.wz > 0) this.w.style.zIndex = this.wz;
        }
        this.w.style.display = "";
        this.firstShow = false;
        this.isVisible = true;
        this.isOpen = true;
        return this;
      },
      hide() {
        this.w.style.display = "none";
        this.isVisible = false;
        return this;
      },
      close() {
        this.w.style.display = "none";
        this.w.innerHTML = "";
        // this.w.innerHTML = "block";
        this.isOpen = false;
        return this;
      },
      remove() {
        const id = this.w.id;
        UaWindowAdm.remove(id);
        return null;
      },
      drag() {
        UaDrag(this.w);
        return this;
      },
    };
    wnd.initialize(jqw);
    return wnd;
  },
};
