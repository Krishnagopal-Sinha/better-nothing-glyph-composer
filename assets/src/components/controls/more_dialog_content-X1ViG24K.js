import{a as de,r as i,j as e}from"../../../vendor-6J9SHA5K.js";import{b as E,e as T,f as D,g as w,c as N}from"../ui/dialog-TuTEWVuU.js";import{L as a}from"../ui/label-DRcJgP84.js";import{B as h}from"../ui/button-DBlz7T_2.js";import{I as o}from"../ui/input-BNe9iBRB.js";import{S as x,a as f,b as p,c as j,d as b,e as G,f as m}from"../ui/select-hvwO_C73.js";import{e as g}from"../../lib/consts-Cj2W_VlV.js";import{s as r}from"../../lib/helpers-CGQdiVDq.js";import{u}from"../../lib/timeline_state-Dw4tu5kw.js";function ve({dialogContentIdx:F}){const v=u(n=>n.items),{getPosition:k}=de(),s=u(n=>n.audioInformation),V=u(n=>n.updateSelectedItemAbsolutely),d=u(n=>n.setIsSettingsDialogOpen),[A,O]=i.useState(),[P,Z]=i.useState(),[c,$]=i.useState(),[L,H]=i.useState(),[I,R]=i.useState(+(k()*1e3).toFixed(2)),[y,_]=i.useState(+(k()*1e3+5e3).toFixed(2)),[S,q]=i.useState(500),[B,z]=i.useState(100),[J,K]=i.useState(0),[M,Q]=i.useState(500),[U,C]=i.useState(0),W=u(n=>n.generateGlyphs);switch(F){case 1:return e.jsxs(E,{className:"sm:max-w-[425px] dontClose ",children:[e.jsxs(T,{children:[e.jsx(D,{children:"Generate Glyph Blocks"}),e.jsx(w,{children:"Generate Glyphs with following parameters. Default values will produce 1 sec interval metronome for 5 secs; i.e. In each second there would be a 500ms Duration Glyph Block followed by 500ms gap with no block; this will repeat till specified end time."})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4 py-4 items-center overflow-y-auto pr-1 max-h-[50dvh]",children:[e.jsxs(a,{htmlFor:"blockGenerationStartTime",className:"text-lg font-light",children:["Start From (ms)",e.jsx("br",{})]}),e.jsx(o,{id:"blockGenerationStartTime",type:"number",max:s.durationInMilis,min:0,step:1,defaultValue:I,onChange:Y}),e.jsxs(a,{htmlFor:"blockGenerationEndTime",className:"text-lg font-light",children:["Generate Till (ms)",e.jsx("br",{})]}),e.jsx(o,{id:"blockGenerationEndTime",type:"number",max:s.durationInMilis,min:0,step:1,defaultValue:y,onChange:ee}),e.jsxs(a,{htmlFor:"blocksDurationMilis",className:"text-lg font-light",children:["Glyph Duration (ms)",e.jsx("br",{})]}),e.jsx(o,{id:"blocksDurationMilis",type:"number",max:1e4,min:50,step:1,defaultValue:S,onChange:te}),e.jsxs(a,{htmlFor:"blocksBrightness",className:"text-lg font-light",children:["Glyph Brightness (%)",e.jsx("br",{})]}),e.jsx(o,{id:"blocksBrightness",type:"number",max:100,min:1,step:1,defaultValue:B,onChange:se}),e.jsxs(a,{htmlFor:"audioBPM",className:"text-lg font-light",children:["Glyph Gap (ms)",e.jsx("br",{})]}),e.jsx(o,{id:"audioBPM",type:"number",min:1,step:1,defaultValue:M,onChange:ne}),e.jsxs(a,{className:"text-lg font-light",children:["Glyph Zone",e.jsx("br",{})]}),e.jsx("div",{children:e.jsxs(x,{onValueChange:ie,defaultValue:"0",children:[e.jsx(f,{children:e.jsx(p,{})}),e.jsx(j,{children:e.jsxs(b,{children:[e.jsx(G,{children:"Choose Glyph Zone"}),e.jsx(m,{value:"101",children:"All"}),Object.values(v).map((n,t)=>e.jsx(m,{value:t.toString(),children:t+1},t))]})})]})}),e.jsxs(a,{className:"text-lg font-light",children:["Glyph Effect",e.jsx("br",{})]}),e.jsx("div",{children:e.jsxs(x,{onValueChange:ae,defaultValue:"0",children:[e.jsx(f,{children:e.jsx(p,{})}),e.jsx(j,{children:e.jsxs(b,{children:[e.jsx(G,{children:"Choose Effects"}),Object.values(g).map((n,t)=>e.jsx(m,{value:t.toString(),children:n},t))]})})]})})]}),e.jsxs(N,{className:"flex-grow justify-between",children:[e.jsx(h,{variant:"destructive",onClick:()=>d(!1),children:"Cancel"}),e.jsx(h,{onClick:X,children:"Generate"})]})]});default:return e.jsxs(E,{className:"sm:max-w-[425px] dontClose",children:[e.jsxs(T,{children:[e.jsx(D,{children:"Edit Selected Glyph Block(s)"}),e.jsx(w,{children:"Make advance granular changes to Glyphs here. Click save when you're done."})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4 py-4 items-center",children:[e.jsxs(a,{htmlFor:"blocksStartTimeMilis",className:"text-lg font-light",children:["Glyph Start Time (ms)",e.jsx("br",{})]}),e.jsx(o,{id:"blocksStartTimeMilis",type:"number",max:s.durationInMilis,min:0,step:1,onChange:ce}),e.jsxs(a,{htmlFor:"blocksDurationMilis",className:"text-lg font-light",children:["Glyph Duration (ms)",e.jsx("br",{})]}),e.jsx(o,{id:"blocksDurationMilis",type:"number",max:1e4,min:50,step:1,onChange:oe}),e.jsxs(a,{htmlFor:"blocksBrightness",className:"text-lg font-light",children:["Glyph Brightness (%)",e.jsx("br",{})]}),e.jsx(o,{id:"blocksBrightness",type:"number",max:100,min:1,step:1,onChange:le}),e.jsxs(a,{className:"text-lg font-light",children:["Glyph Effect",e.jsx("br",{})]}),e.jsx("div",{children:e.jsxs(x,{onValueChange:ue,children:[e.jsx(f,{children:e.jsx(p,{})}),e.jsx(j,{children:e.jsxs(b,{children:[e.jsx(G,{children:"Choose Effects"}),Object.values(g).map((n,t)=>e.jsx(m,{value:t.toString(),children:n},t))]})})]})})]}),e.jsxs(N,{className:"flex-grow justify-between",children:[e.jsx(h,{variant:"destructive",onClick:()=>d(!1),children:"Cancel"}),e.jsx(h,{onClick:re,children:"Apply"})]})]})}function X(){d(!1),W({generationStartTimeMilis:I,generationEndTimeMilis:y,generationDurationMilis:S,generationGapMilis:M,generationBlockBrightnessPercentage:B,generationBlockEffectId:J,generationGlyphZone:U})}function Y(n){const t=parseInt(n.currentTarget.value);if(t<0||t>s.durationInMilis){r("Error - Invalid Start Time",`Generation Start Time must be between 0ms and ${(s.durationInMilis/1e3).toFixed(2)}s (current audio duration)`,1500);return}R(t)}function ee(n){const t=parseInt(n.currentTarget.value);if(t<0||t>s.durationInMilis){r("Error - Invalid End Time",`Generation End Time must be between 0ms and ${(s.durationInMilis/1e3).toFixed(2)}s (current audio duration)`,1500);return}_(t)}function te(n){const t=parseInt(n.currentTarget.value);if(t<20||t>(c??0)+s.durationInMilis){r("Error - Invalid Duration",`Block Duration must be between 20ms and ${(((c??0)+s.durationInMilis)/1e3).toFixed(2)}s (current audio duration)`,1500);return}q(t)}function ne(n){const t=parseInt(n.currentTarget.value);if(t<20){r("Error - Invalid Glyph Gap","Generation Gap should be atleast of 20ms",1500);return}Q(t)}function se(n){const t=parseInt(n.currentTarget.value),l=Math.round(t/100*4095);t>=1&&t<=100?z(l):r("Invalid Value - Glyph Brightness","Brightness should be between 1% to 100%")}function ie(n){const t=parseInt(n),l=Object.keys(v).length;if(t===101){C(t);return}else if(t>l-1||t<0){r("Error - Invalid Glyph Zone","An invalid Glyph Zone was selected.");return}C(t)}function ae(n){const t=parseInt(n),l=Object.keys(g).length;if(t>l-1||t<0){r("Error - Invalid Effect","An invalid effect was selected.");return}K(t)}function re(){d(!1),V({startTimeMilis:c,durationMilis:A,effectId:L,startingBrightness:P})}function le(n){const t=parseInt(n.currentTarget.value),l=Math.round(t/100*4095);t>=1&&t<=100?Z(l):r("Invalid Value - Glyph Brightness","Should be between 1% to 100%")}function oe(n){const t=parseInt(n.currentTarget.value);if(t<20||t>(c??0)+s.durationInMilis){r("Error - Invalid Duration",`Block Duration must be between 20ms and ${(((c??0)+s.durationInMilis)/1e3).toFixed(2)}s (current audio duration)`,1500);return}O(t)}function ce(n){const t=parseInt(n.currentTarget.value);if(t<0||t>s.durationInMilis){r("Error - Invalid Start Time",`Block start time must be between 0ms and ${(s.durationInMilis/1e3).toFixed(2)}s (current audio duration)`,1500);return}$(t)}function ue(n){const t=parseInt(n),l=Object.keys(g).length;if(t>l-1||t<0){r("Error - Invalid Effect Option","An invalid effect was selected.");return}H(t)}}export{ve as S};
