import{j as t}from"../../../vendor-6J9SHA5K.js";import{u as i}from"../../lib/timeline_state-Dw4tu5kw.js";import{T as v}from"./timelineBlocks-DU0J1eNa.js";import{T as b}from"./timebar-mIkn8hRt.js";import{P as y}from"./playingIndicator-Bpt6tv3h.js";import{d}from"../../lib/data_store-DFUoucx7.js";import{B as S}from"./bpmGridLines-BgluXtg0.js";import{H as w}from"../../logic/hc_tb-CQfLxbuF.js";function R({timelineData:s,scrollRef:r}){const l=i(e=>e.addItem),n=i(e=>e.appSettings.bpmValue),o=i(e=>e.appSettings.snapToBpmActive),x=i(e=>e.audioInformation.durationInMilis),f=i(e=>e.items),a=i(e=>e.appSettings.timelinePixelFactor),h=i(e=>e.appSettings.showHeavyUi),c=[],m=Object.keys(f).length,u=m>12?40:75;for(let e=0;e<m;e++)c.push(t.jsx("div",{title:"Double tap to add a new glyph block",className:"border-b-2 border-dotted border-gray-600 relative select-none",style:{height:`${u}px`},onDoubleClick:p=>{p.preventDefault();const j=d.get("editorScrollX")??0;l(e,(p.clientX+j)/a*1e3)},children:t.jsx(B,{showHeavyUi:h,rowTimelineData:s[e],timelinePixelFactor:a})},e));const g=e=>{d.set("editorScrollX",e.currentTarget.scrollLeft)};return t.jsx("div",{className:"min-h-[50dvh] overflow-auto",ref:r,onScroll:g,children:t.jsxs("div",{className:"flex flex-col flex-grow min-w-max relative",children:[t.jsx(b,{}),t.jsx(y,{editorRows:m}),o&&t.jsx(S,{bpmValue:n,durationInMilis:x,timelinePixelFactor:a}),c]})})}const B=({rowTimelineData:s,timelinePixelFactor:r,showHeavyUi:l})=>{const n=[];for(let o=0;o<s.length;o++)n.push(t.jsx("div",{className:"h-full w-[50px] absolute inset-0 py-[4px]",style:{marginLeft:`${s[o].startTimeMilis/1e3*r}px`},children:l?t.jsx(w,{glyphItem:s[o]}):t.jsx(v,{glyphItem:s[o]})},s[o].id));return t.jsx(t.Fragment,{children:n})};export{R as E};
