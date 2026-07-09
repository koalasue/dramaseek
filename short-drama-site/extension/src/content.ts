import type { ExtensionMessage } from "./messages";

type Settings = { mode: "fixed" | "floating"; fontSize: number; opacity: number; offset: number; outline: boolean; shadow: boolean; buttonX: number; buttonY: number; subtitleX: number; subtitleY: number };
const defaults: Settings = { mode: "fixed", fontSize: 22, opacity: .72, offset: 92, outline: true, shadow: true, buttonX: 92, buttonY: 44, subtitleX: 50, subtitleY: 72 };
let settings = defaults, active = false, video: HTMLVideoElement | null = null, host: HTMLDivElement | null = null, root: ShadowRoot | null = null;

async function localTranslate(text: string) {
  const detectorApi = (globalThis as typeof globalThis & { LanguageDetector?: { create(): Promise<{ detect(value: string): Promise<{ detectedLanguage: string }[]> }> } }).LanguageDetector;
  const translatorApi = (globalThis as typeof globalThis & { Translator?: { create(options: object): Promise<{ translate(value: string): Promise<string> }> } }).Translator;
  if (!detectorApi || !translatorApi) throw new Error("请升级到 Chrome 138+ 以使用本地翻译");
  const [detected] = await (await detectorApi.create()).detect(text); const language = detected?.detectedLanguage ?? "en";
  if (language.startsWith("zh")) return text;
  return (await translatorApi.create({ sourceLanguage: language, targetLanguage: "zh-Hans" })).translate(text);
}

function findVideo() {
  return [...document.querySelectorAll("video")].filter((item) => { const box = item.getBoundingClientRect(); return box.width > 240 && box.height > 140; }).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] ?? null;
}

function css() { return `<style>:host{all:initial}.fab{position:fixed;z-index:2147483646;width:48px;height:48px;border-radius:50%;border:1px solid #ffffff44;background:#111;color:#fff;box-shadow:0 8px 24px #0008;cursor:grab;font:600 12px system-ui}.fab[data-on=true]{background:#c84f42}.gear{position:fixed;z-index:2147483647;width:26px;height:26px;border-radius:50%;border:1px solid #ffffff44;background:#111;color:#fff}.cue{position:fixed;z-index:2147483645;transform:translate(-50%,-50%);max-width:82%;padding:8px 14px;border-radius:10px;color:#fff;background:rgba(5,5,5,var(--opacity));font:600 var(--size)/1.45 system-ui;text-align:center;text-shadow:var(--shadow);-webkit-text-stroke:var(--outline);pointer-events:none}.panel{position:fixed;right:16px;bottom:16px;z-index:2147483647;width:min(340px,calc(100vw - 32px));padding:18px;border-radius:16px;background:#fbfaf7;color:#171816;border:1px solid #d8d6ce;box-shadow:0 20px 60px #0005;font:14px system-ui}.panel[hidden]{display:none}.head{display:flex;justify-content:space-between;align-items:center}.close{border:0;background:none;font-size:20px}.row{display:grid;gap:7px;margin-top:15px}.row select,.row input{width:100%}.preview{margin-top:15px;padding:18px;background:#000;color:#fff;text-align:center;border-radius:10px}.error{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483647;background:#171816;color:#fff;padding:10px 14px;border-radius:10px;font:13px system-ui}@media(prefers-reduced-motion:no-preference){.fab{transition:transform .18s ease,opacity .18s ease}.fab:hover{transform:scale(1.05)}}</style>`; }

function position() {
  if (!video || !root) return; const box = video.getBoundingClientRect(), fab = root.querySelector<HTMLElement>(".fab"), gear = root.querySelector<HTMLElement>(".gear"), cue = root.querySelector<HTMLElement>(".cue"); if (!fab || !gear || !cue) return;
  const left = box.left + box.width * settings.buttonX / 100 - 24, top = box.top + box.height * settings.buttonY / 100 - 24;
  Object.assign(fab.style,{left:`${left}px`,top:`${top}px`}); Object.assign(gear.style,{left:`${left+34}px`,top:`${top+34}px`});
  const cueY = settings.mode === "fixed" ? box.bottom - settings.offset : box.top + box.height * settings.subtitleY / 100;
  Object.assign(cue.style,{left:`${box.left + box.width * settings.subtitleX / 100}px`,top:`${cueY}px`,maxWidth:`${box.width*.82}px`,"--size":`${settings.fontSize}px`,"--opacity":String(settings.opacity),"--shadow":settings.shadow?"0 2px 6px #000":"none","--outline":settings.outline?"1px #000":"0"});
}

function drag(element: HTMLElement, kind: "button" | "subtitle") {
  element.addEventListener("pointerdown", (start) => { if (start.button !== 0 || !video) return; const box = video.getBoundingClientRect(); element.setPointerCapture(start.pointerId); let moved=false;
    const move=(event:PointerEvent)=>{moved=true; const x=Math.max(3,Math.min(97,(event.clientX-box.left)/box.width*100)),y=Math.max(5,Math.min(95,(event.clientY-box.top)/box.height*100)); if(kind==="button"){settings.buttonX=x;settings.buttonY=y}else{settings.subtitleX=x;settings.subtitleY=y} position()};
    const up=()=>{element.removeEventListener("pointermove",move);void chrome.storage.local.set({subtitleSettings:settings});if(!moved&&kind==="button")void toggle()}; element.addEventListener("pointermove",move);element.addEventListener("pointerup",up,{once:true});
  });
}

function render() {
  if (host) return; host=document.createElement("div");host.id="short-drama-live-subtitles";root=host.attachShadow({mode:"open"});
  root.innerHTML=`${css()}<button class="fab" aria-label="开启实时中文字幕">字幕</button><button class="gear" aria-label="字幕设置">⚙</button><div class="cue" hidden></div><section class="panel" hidden><div class="head"><strong>中文字幕设置</strong><button class="close" aria-label="关闭">×</button></div><div class="preview">实时中文字幕预览</div><label class="row">显示方式<select data-key="mode"><option value="fixed">固定在原字幕上方</option><option value="floating">自由悬浮</option></select></label><label class="row">字号<input data-key="fontSize" type="range" min="14" max="42"></label><label class="row">字幕高度<input data-key="offset" type="range" min="24" max="220"></label><label class="row">背景透明度<input data-key="opacity" type="range" min="0" max="1" step=".05"></label></section>`;
  (document.fullscreenElement??document.documentElement).append(host); const fab=root.querySelector<HTMLElement>(".fab")!,cue=root.querySelector<HTMLElement>(".cue")!,panel=root.querySelector<HTMLElement>(".panel")!;drag(fab,"button");drag(cue,"subtitle");
  root.querySelector(".gear")?.addEventListener("click",()=>panel.hidden=false);root.querySelector(".close")?.addEventListener("click",()=>panel.hidden=true);
  root.querySelectorAll<HTMLInputElement|HTMLSelectElement>("[data-key]").forEach((input)=>{const key=input.dataset.key as keyof Settings;input.value=String(settings[key]);input.addEventListener("input",()=>{(settings as unknown as Record<string,string|number>)[key]=input.type==="range"?Number(input.value):input.value;position();void chrome.storage.local.set({subtitleSettings:settings})})}); position();
}

async function toggle(){if(active){await chrome.runtime.sendMessage({type:"STOP_CAPTURE"});active=false}else{const response=await chrome.runtime.sendMessage({type:"START_CAPTURE"});if(!response?.ok){showError(response?.error??"无法开启实时字幕");return}active=true}root?.querySelector(".fab")?.setAttribute("data-on",String(active))}
function showError(message:string){if(!root)return;const item=document.createElement("div");item.className="error";item.textContent=message;root.append(item);setTimeout(()=>item.remove(),6000)}

chrome.runtime.onMessage.addListener((message:ExtensionMessage)=>{if(message.type==="CAPTURE_ERROR")showError(message.error);if(message.type==="TRANSCRIPT")void localTranslate(message.text).then((text)=>{const cue=root?.querySelector<HTMLElement>(".cue");if(cue){cue.textContent=text;cue.hidden=false}}).catch((error)=>showError(error instanceof Error?error.message:"翻译失败"))});
void chrome.storage.local.get("subtitleSettings").then((value)=>{settings={...defaults,...value.subtitleSettings};const scan=()=>{video=findVideo();if(video)render();else if(host){host.remove();host=null;root=null}position()};scan();new MutationObserver(scan).observe(document.documentElement,{subtree:true,childList:true});setInterval(scan,1200);addEventListener("resize",position);document.addEventListener("fullscreenchange",()=>{if(host)(document.fullscreenElement??document.documentElement).append(host);position()})});
