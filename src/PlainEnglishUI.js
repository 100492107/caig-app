/* Cornerstone — Plain English UI
   Converts internal product jargon into language you can understand at a glance.
   Presentation-only: stored data and AI prompts are unchanged.
*/
const RULES = [
  ['Content Intelligence & Production Engine','Content Builder'],
  ['Business Intelligence','Business'],
  ['Evidence Room','Proof'],
  ['Human Quality Gate','Final check'],
  ['Attention Gate','Attention check'],
  ['Creator Growth','Audience Growth'],
  ['Creator Engine','Content Builder'],
  ['Content Engine','Content Builder'],
  ['Operating system','Your workspace'],
  ['Creator OS','Creator workspace'],
  ['Command centre','Home'],
  ['Command Centre','Home'],
  ['Command','Home'],
  ['Directive','Today’s focus'],
  ['Creator loop','Create & learn'],
  ['Track A — Revenue Recovery','Income work — recover lost sales'],
  ['Track B — Content Intelligence & Production Engine','Creator business — find, make and grow content'],
  ['Track A','Income work'],
  ['Track B','Creator business'],
  ['Revenue Recovery','Recover lost sales'],
  ['Business Capture','Add business information'],
  ['Research Radar','Idea Finder'],
  ['Auto radar','Find ideas automatically'],
  ['Manual research signal','Add something you found'],
  ['research ledger','research list'],
  ['research signal','research finding'],
  ['signals','findings'],
  ['source evidence','source proof'],
  ['source creator','creator'],
  ['baseline views','usual views'],
  ['baseline','usual result'],
  ['observed metric name','what you are measuring'],
  ['observed metric value','result'],
  ['captured at','date found'],
  ['mechanism','why it worked'],
  ['outlier rationale','why it stood out'],
  ['confidence','how sure you are'],
  ['candidate','to review'],
  ['validated','checked'],
  ['outlier','unusually strong result'],
  ['workspace','page'],
  ['reference board','examples'],
  ['references','examples'],
  ['commerce intelligence','selling'],
  ['commerce','money'],
  ['production','make content'],
  ['measurement','results'],
  ['publishing','posting'],
  ['publish','post'],
  ['library','saved work'],
  ['persistent asset','saved work'],
  ['audience intelligence','audience information'],
  ['intelligence','information'],
  ['objective','goal'],
  ['priority','main goal'],
  ['brief','plan'],
  ['package','content plan'],
  ['derivatives','extra versions'],
  ['derivative','extra version'],
  ['pipeline','steps'],
  ['engagement','reactions'],
  ['distribution','reach'],
  ['monetisation','making money'],
  ['monetise','make money from'],
  ['productised','turned into a product'],
  ['productize','turn into a product'],
  ['repeatability','works again'],
  ['replication','doing it again'],
  ['economics','cost and time'],
  ['commercial','money-making'],
  ['canonical','official'],
  ['Canonical DNA locked','Core rules loaded'],
  ['Canonical DNA','Core rules'],
  ['operating model','how it works'],
  ['creator-native','made for creators'],
  ['creator-specific','for this creator'],
  ['public lane','what people see'],
  ['content portfolio','content mix'],
  ['attention mechanism','how it gets attention'],
  ['proof ladder','what needs to be true'],
  ['run-rate','monthly income'],
  ['metric','number'],
  ['KPI','target number'],
  ['CTA','next step'],
  ['USP','main reason to choose it'],
  ['AI disclosure','AI note'],
  ['Human Quality','quality check'],
  ['quality gate','final check'],
  ['persistent','saved'],
  ['operator brief','your plan'],
  ['operator','you'],
  ['context','what is happening now'],
  ['evidence','proof'],
  ['reflection','review'],
  ['commitment','promise'],
  ['constraint','limit'],
  ['constraints','limits'],
  ['obstacle','what gets in the way'],
  ['obstacles','what gets in the way']
];

RULES.sort((a,b)=>b[0].length-a[0].length);

const ATTR_RULES = [
  ['Run auto radar','Find ideas'],
  ['Save signal','Save'],
  ['Technical detail','What went wrong?'],
  ['Open Content Engine','Open Content Builder']
];

function escapeRegExp(value){
  return value.replace(/[\\^$.*+?()[\]{}|]/g,'\\$&');
}
function replaceText(value){
  let out = value;
  for(const [from,to] of RULES){
    out = out.replace(new RegExp(escapeRegExp(from),'gi'), to);
  }
  return out;
}
function clean(root){
  if(!root) return;
  const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      const parent=node.parentElement;
      if(!parent || parent.closest('script,style,pre,code,textarea')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes=[]; let node;
  while((node=walker.nextNode())) nodes.push(node);
  for(const textNode of nodes){
    const next=replaceText(textNode.nodeValue);
    if(next!==textNode.nodeValue) textNode.nodeValue=next;
  }
  root.querySelectorAll?.('input,button,a,select,textarea,[aria-label],[title]').forEach(el=>{
    for(const attr of ['placeholder','title','aria-label']){
      const old=el.getAttribute?.(attr);
      if(!old) continue;
      const next = ATTR_RULES.reduce((s,[from,to])=>s.replace(new RegExp(escapeRegExp(from),'gi'),to),old);
      if(next!==old) el.setAttribute(attr,next);
    }
  });
}

export function installPlainEnglishUI(){
  if(window.__cornerstonePlainEnglishUI) return;
  window.__cornerstonePlainEnglishUI=true;
  let timer=null;
  const schedule=()=>{
    if(timer) cancelAnimationFrame(timer);
    timer=requestAnimationFrame(()=>{timer=null;clean(document.body)});
  };
  const boot=()=>{
    clean(document.body);
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','aria-label']});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
