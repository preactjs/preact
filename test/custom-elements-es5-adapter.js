/* eslint-disable */

(function () {
'use strict';

(()=>{'use strict';if(!window.customElements)return;const a=window.HTMLElement,b=window.customElements.define,c=window.customElements.get,d=new Map,e=new Map;let f=!1,g=!1;window.HTMLElement=function(){if(!f){const j=d.get(this.constructor),k=c.call(window.customElements,j);g=!0;const l=new k;return l}f=!1;},window.HTMLElement.prototype=a.prototype;Object.defineProperty(window,'customElements',{value:window.customElements,configurable:!0,writable:!0}),Object.defineProperty(window.customElements,'define',{value:(j,k)=>{const l=k.prototype,m=class extends a{constructor(){super(),Object.setPrototypeOf(this,l),g||(f=!0,k.call(this)),g=!1;}},n=m.prototype;m.observedAttributes=k.observedAttributes,n.connectedCallback=l.connectedCallback,n.disconnectedCallback=l.disconnectedCallback,n.attributeChangedCallback=l.attributeChangedCallback,n.adoptedCallback=l.adoptedCallback,d.set(k,j),e.set(j,k),b.call(window.customElements,j,m);},configurable:!0,writable:!0}),Object.defineProperty(window.customElements,'get',{value:(j)=>e.get(j),configurable:!0,writable:!0});})();

/**
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

}());
