import { useState, useEffect, useReducer, useRef, useMemo } from "react";

const SUITS=["♠","♥","♦","♣"],RANKS=["A","2","3","4","5","6","7","8","9","10","J","Q","K"],RED=new Set(["♥","♦"]);
const val=r=>r==="A"?1:["J","Q","K"].includes(r)?10:+r;
const ord=r=>RANKS.indexOf(r)+1;
const mkDeck=()=>{const d=[];for(const s of SUITS)for(const r of RANKS)d.push({rank:r,suit:s,id:r+s});return d;};
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]];}return b;};

function scoreHand(hand,starter,isCrib=false){
  const cards=[...hand,starter];let fifteens=0,pairs=0,runs=0,flush=0,nobs=0;
  for(let m=1;m<32;m++){let s=0;for(let i=0;i<5;i++)if(m&(1<<i))s+=val(cards[i].rank);if(s===15)fifteens+=2;}
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)if(cards[i].rank===cards[j].rank)pairs+=2;
  const freq={};cards.forEach(c=>{const o=ord(c.rank);freq[o]=(freq[o]||0)+1;});
  const ords=Object.keys(freq).map(Number).sort((a,b)=>a-b);let idx=0;
  while(idx<ords.length){let j=idx;while(j<ords.length-1&&ords[j+1]===ords[j]+1)j++;const len=j-idx+1;
    if(len>=3){let mult=1;for(let k=idx;k<=j;k++)mult*=freq[ords[k]];runs+=len*mult;}idx=j+1;}
  const hs=hand.map(c=>c.suit);
  if(hs.every(s=>s===hs[0])){if(starter.suit===hs[0])flush=5;else if(!isCrib)flush=4;}
  hand.forEach(c=>{if(c.rank==="J"&&c.suit===starter.suit)nobs=1;});
  return{total:fifteens+pairs+runs+flush+nobs,fifteens,pairs,runs,flush,nobs};
}
function scorePegging(played,count){
  const n=played.length;if(!n)return{score:0,desc:[]};let score=0;const desc=[];
  if(count===15){score+=2;desc.push("+2 Fifteen!");}if(count===31){score+=2;desc.push("+2 for 31!");}
  if(n>=2){const lr=played[n-1].rank;let pc=1;for(let i=n-2;i>=0;i--){if(played[i].rank===lr)pc++;else break;}
    if(pc===2){score+=2;desc.push("+2 Pair!");}else if(pc===3){score+=6;desc.push("+6 Pair Royal!");}else if(pc===4){score+=12;desc.push("+12 Double Pair Royal!");}}
  if(n>=3){for(let len=Math.min(n,7);len>=3;len--){const last=played.slice(-len).map(c=>ord(c.rank));
    const sorted=[...last].sort((a,b)=>a-b);let isRun=true;for(let i=1;i<sorted.length;i++)if(sorted[i]!==sorted[i-1]+1){isRun=false;break;}
    if(isRun){score+=len;desc.push(`+${len} Run!`);break;}}}
  return{score,desc};
}
function aiPickDiscard(hand,isDealer){let best=null,bestS=-999;
  for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){const keep=hand.filter((_,k)=>k!==i&&k!==j),disc=[hand[i],hand[j]];
    let avg=0;const sts=shuffle(mkDeck().filter(c=>!hand.some(h=>h.id===c.id))).slice(0,10);
    sts.forEach(st=>{avg+=scoreHand(keep,st).total;});avg/=sts.length;
    let adj=0;disc.forEach(c=>{if(c.rank==="5")adj+=isDealer?2:-2;if(val(c.rank)>=10)adj+=isDealer?0.3:-0.3;});
    if(avg+adj>bestS){bestS=avg+adj;best=[i,j];}}return best;}
function aiPickPegCard(hand,played,count){const playable=hand.filter(c=>count+val(c.rank)<=31);if(!playable.length)return null;
  let best=null,bestS=-999;playable.forEach(c=>{const nc=count+val(c.rank);const{score}=scorePegging([...played,c],nc);
    let s=score;if(nc===5||nc===21)s-=1.5;if(nc===31)s+=1;s+=Math.random()*0.3;if(s>bestS){bestS=s;best=c;}});return best;}

const pick=a=>a[Math.random()*a.length|0];
const AI_NAME="Sly Suckling";
const HIST=["Sir John Suckling invented cribbage around 1630 by adding the crib to an older game called Noddy.",
  "Suckling distributed marked cards to English nobles, winning £20,000 — roughly $7M today.",
  "Cribbage is the only card game you can legally play for money in English pubs without a special permit.",
  "In 1943, USS Wahoo's XO was dealt a perfect 29 hand. That night they sank two enemy ships.",
  "The O'Kane cribbage board passes between U.S. Navy submarines — currently aboard USS Scranton.",
  "\"Left in the lurch\" comes from cribbage — originally meaning being skunked at cards.",
  "\"Streets ahead\" is cribbage slang for a commanding lead, named after the 30-hole board sections.",
  "A score of 19 is impossible. Announcing \"nineteen\" is the game's oldest inside joke — it means zero.",
  "Iñupiaq artisans in Alaska have carved walrus-ivory cribbage boards since the 1890s.",
  "President Kennedy collected scrimshaw cribbage boards, sparking a 1960s revival in scrimshaw art.",
  "DeLynn Colvert's Rule of Thirds: a third of games won on cards, a third lost regardless, a third decided by skill.",
  "The first dealer wins ~55-56% of games between equal players. The pone compensates by counting first."];
const TT={aiBig:["Read 'em and weep, pone. Get PEGGED! 📌","That's what a proper hand looks like. Suckling approves.","My cards, your lurch.","The spilikins don't lie, friend.","Streets ahead. Literally.","Sir John would be proud of that count."],
  aiZero:["Nineteen! …the oldest joke in cribbage, and it's on me.","That hand was building character since 1630.","Delete the footage. Burn the scorecard.","Four centuries of history, and THIS is my hand."],
  pBig:["A fine count, pone. Don't let it go to your nob.","Even Suckling lost to a lucky cut now and then.","That starter was a real gut shot. Well played."],
  pZero:["Nineteen! The score that means zero since 1630. 😬","Not even nobs could save that hand.","I'd offer advice but Sir John taught me to show no mercy."],
  aiLead:["New leader. Streets ahead, as we say.","I can see Fourth Street from here.","The pegs tell the tale."],
  pLead:["Temporary. I've come back from worse lurches.","Suckling himself blew bigger leads.","Enjoy the view from First Street."],
  levelPeg:["Level pegging! Just like the expression we gave English.","Dead even. May the better pone prevail."],
  skunk:["🦨 Smelling a lurch coming…","Skunk territory! Sir John sends his regards.","Below 91 with my peg this high? Sir John grins."],
  stinkhole:["THE STINKHOLE! Hole 120 — one peg from glory!","Stinkhole! Some pubs won't let you win from here."],
  stinkholeAi:["I'm in the stinkhole. One peg from pegging out. Poetic."],
  heels:["His Heels! Two for the turn — named for the Jack's portrait on old cards.","Two for his heels! Free points since 1630."],
  nobs:["One for his nobs! A Jack has one head, one nob, one point."],
  aiWin:["GG. Pegged out! Sir John raises a glass. 🎩","Get Pegged! …the name AND the outcome.","Another win for the Suckling legacy."],
  pWin:["Well played, pone. I'll deny this happened.","Rematch. Sir John demands satisfaction.","…I let you win. Suckling played the long con."],
  aiWinSkunk:["Left in the lurch! That's where the expression comes from. 🦨","Skunked! Sir John's favourite aroma."],
  pWinSkunk:["Skunked… by a pone. Sir John is spinning."],
  retort:["Brave words for Second Street.","Talk to my spilikins, pone.","Muggins on your trash talk. Scores nothing.","🥱","The cards will answer.","Four centuries of wit, and THAT'S your best?"],
  dealerCrib:["My deal, my crib. Sir John's favourite position.","The crib is mine. Discard wisely, pone."],
  poneLead:["Your lead, pone. First card sets the tone.","Pone's privilege — you count first in the show."]};
const TAUNTS=["Get Pegged!","Muggins!","Skunk City 🦨","Read the board!","Stinkhole incoming!","Is that all you got?","Salting your crib!","My nobs now!","121 incoming!","Left in the lurch! 🎩"];

/* ═══ CRIBBAGE BOARD (SVG) ═══ */
const BW=220,BH=290,BTOP=18,HR=2.2,PR=3.8;
function holeY(h){const g=Math.floor(h/5),ig=h%5;return BTOP+g*38+ig*7;}
const BBOT=holeY(29);
function buildTrack(isP){
  const pos=[];
  const base=isP?14:144;
  const cw=11,pg=7;
  const cs=isP?[base+cw+pg+cw,base+cw+pg,base+cw,base]:[base,base+cw,base+cw+pg,base+cw+pg+cw];
  for(let h=0;h<30;h++)pos.push({x:cs[0],y:BTOP+BBOT-holeY(h)});
  for(let h=0;h<30;h++)pos.push({x:cs[1],y:holeY(h)});
  for(let h=0;h<30;h++)pos.push({x:cs[2],y:BTOP+BBOT-holeY(h)});
  for(let h=0;h<30;h++)pos.push({x:cs[3],y:holeY(h)});
  pos.push({x:isP?base+cw+pg/2:base+cw+pg/2+cw,y:BBOT+14});
  return{pos,cs};
}

function CribBoard({pS,aS,pP,aP}){
  const pT=useMemo(()=>buildTrack(true),[]);
  const aT=useMemo(()=>buildTrack(false),[]);
  const hole=(x,y,key)=><circle key={key} cx={x} cy={y} r={HR} fill="#1a1408" stroke="#0a0a04" strokeWidth={0.5} opacity={0.7}/>;
  const peg=(track,score,color,glow,key)=>{
    if(score<=0||score>121)return null;
    const p=track.pos[Math.min(score,121)-1];
    return <circle key={key} cx={p.x} cy={p.y} r={PR} fill={color} stroke="#fff" strokeWidth={1.2}
      style={{transition:"cx 0.5s ease-in-out, cy 0.5s ease-in-out",filter:`drop-shadow(0 0 3px ${glow})`}}/>;
  };
  const arc=(x1,x2,y,up,key)=>{
    const r=(Math.abs(x2-x1))/2;const sweep=up?1:0;
    return <path key={key} d={`M${x1} ${y} A${r} ${6} 0 0 ${sweep} ${x2} ${y}`} fill="none" stroke="#0a0a0466" strokeWidth={1}/>;
  };
  const skunkLine=(track,hole91,label,side)=>{
    const p=track.pos[90];
    return <line key={label} x1={p.x-5} y1={p.y} x2={p.x+5} y2={p.y} stroke="#c44" strokeWidth={1} opacity={0.5}/>;
  };
  return(
    <svg viewBox={`0 0 ${BW} ${BH}`} style={{width:"100%",maxWidth:300,display:"block",margin:"0 auto"}}>
      <defs>
        <pattern id="wd" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#b08840"/><line x1="0" y1="0" x2="6" y2="6" stroke="#a07830" strokeWidth="0.5" opacity="0.3"/>
          <line x1="0" y1="3" x2="6" y2="9" stroke="#c09850" strokeWidth="0.3" opacity="0.2"/>
        </pattern>
      </defs>
      <rect x={2} y={2} width={BW-4} height={BH-4} rx={10} fill="url(#wd)" stroke="#6b4a20" strokeWidth={2}/>
      <rect x={4} y={4} width={BW-8} height={BH-8} rx={9} fill="none" stroke="#d4a84333" strokeWidth={0.5}/>
      {/* Track backgrounds */}
      <rect x={pT.cs[3]-5} y={BTOP-6} width={pT.cs[0]-pT.cs[3]+10} height={BBOT-BTOP+24} rx={5} fill="#3a7bdb18" stroke="#3a7bdb22" strokeWidth={0.5}/>
      <rect x={aT.cs[0]-5} y={BTOP-6} width={aT.cs[3]-aT.cs[0]+10} height={BBOT-BTOP+24} rx={5} fill="#db3a3a18" stroke="#db3a3a22" strokeWidth={0.5}/>
      {/* U-turn arcs */}
      {arc(pT.cs[0],pT.cs[1],BTOP-2,true,"pa1")}{arc(pT.cs[2],pT.cs[3],BTOP-2,true,"pa2")}
      {arc(pT.cs[1],pT.cs[2],BBOT+2,false,"pa3")}
      {arc(aT.cs[0],aT.cs[1],BTOP-2,true,"aa1")}{arc(aT.cs[2],aT.cs[3],BTOP-2,true,"aa2")}
      {arc(aT.cs[1],aT.cs[2],BBOT+2,false,"aa3")}
      {/* Holes */}
      {pT.pos.map((p,i)=>hole(p.x,p.y,`ph${i}`))}
      {aT.pos.map((p,i)=>hole(p.x,p.y,`ah${i}`))}
      {/* Skunk lines at hole 91 */}
      {skunkLine(pT,90,"ps")}
      {skunkLine(aT,90,"as")}
      {/* Stinkhole marker at hole 120 */}
      {[pT,aT].map((t,i)=>{const p=t.pos[119];return <circle key={`sh${i}`} cx={p.x} cy={p.y} r={3.5} fill="none" stroke="#ff666688" strokeWidth={0.8} strokeDasharray="2 1"/>;})}
      {/* Labels */}
      <text x={BW/2} y={BTOP-4} textAnchor="middle" fill="#6b4a20" fontSize={7} fontWeight={700} fontFamily="serif">CRIBBAGE</text>
      <text x={pT.cs[0]-12} y={BBOT+18} textAnchor="middle" fill="#3a7bdb" fontSize={6} fontWeight={700}>YOU</text>
      <text x={aT.cs[3]+12} y={BBOT+18} textAnchor="middle" fill="#db3a3a" fontSize={6} fontWeight={700}>SLY</text>
      {/* Street numbers */}
      {[[pT.cs[0],pT.cs[3]],[aT.cs[0],aT.cs[3]]].map(([c1,c4],ti)=>(
        [1,2,3,4].map(st=>{
          const cx=ti===0?[pT.cs[0],pT.cs[1],pT.cs[2],pT.cs[3]]:[aT.cs[0],aT.cs[1],aT.cs[2],aT.cs[3]];
          return <text key={`st${ti}${st}`} x={cx[st-1]} y={BH-8} textAnchor="middle" fill="#6b4a2066" fontSize={4.5}>{st}</text>;
        })
      ))}
      {/* Game holes (121) */}
      <circle cx={pT.pos[120].x} cy={pT.pos[120].y} r={3} fill="#1a1408" stroke="#3a7bdb55" strokeWidth={1}/>
      <circle cx={aT.pos[120].x} cy={aT.pos[120].y} r={3} fill="#1a1408" stroke="#db3a3a55" strokeWidth={1}/>
      <text x={pT.pos[120].x} y={pT.pos[120].y+8} textAnchor="middle" fill="#3a7bdb66" fontSize={4}>121</text>
      <text x={aT.pos[120].x} y={aT.pos[120].y+8} textAnchor="middle" fill="#db3a3a66" fontSize={4}>121</text>
      {/* Score labels in center */}
      <text x={BW/2} y={BH/2-8} textAnchor="middle" fill="#3a7bdb" fontSize={11} fontWeight={900} fontFamily="'Playfair Display',serif">{pS}</text>
      <text x={BW/2} y={BH/2+4} textAnchor="middle" fill="#8a7a6a" fontSize={5}>—</text>
      <text x={BW/2} y={BH/2+16} textAnchor="middle" fill="#db3a3a" fontSize={11} fontWeight={900} fontFamily="'Playfair Display',serif">{aS}</text>
      {/* Pegs — back pegs (dimmer) then front pegs */}
      {peg(pT,pP,"#3a7bdb88","#3a7bdb44","ppb")}
      {peg(aT,aP,"#db3a3a88","#db3a3a44","apb")}
      {peg(pT,pS,"#4a9bff","#4a9bff","ppf")}
      {peg(aT,aS,"#ff4a4a","#ff4a4a","apf")}
    </svg>);
}

/* ═══ REDUCER ═══ */
const PH={MENU:0,DISCARD:2,CUT:3,PEG:4,SHOW_ND:5,SHOW_D:6,SHOW_CRIB:7,OVER:8};
let bId=0,pId=0;
function init(){return{phase:PH.MENU,deck:[],pHand:[],aHand:[],crib:[],starter:null,
  pScore:0,aScore:0,prevP:0,prevA:0,dealer:0,handNum:0,winner:null,sel:[],
  pegPlayed:[],pegCount:0,pegPCards:[],pegACards:[],pegTurn:0,pegLast:-1,
  showInfo:null,bubble:null,scorePop:null,stats:{hands:0,bestP:0,bestA:0},
  showBoard:true,showTaunts:false,aiPegSeq:0,hFact:0};}

function R(state,action){
  const s={...state};
  const bub=(f,t)=>{s.bubble={from:f,text:t,id:++bId};};
  const pop=t=>{s.scorePop={text:t,id:++pId};};
  const add=(w,p)=>{if(p<=0)return false;if(w==="p"){s.prevP=s.pScore;s.pScore=Math.min(s.pScore+p,121);if(s.pScore>=121){s.winner="p";s.phase=PH.OVER;return true;}}
    else{s.prevA=s.aScore;s.aScore=Math.min(s.aScore+p,121);if(s.aScore>=121){s.winner="a";s.phase=PH.OVER;return true;}}return false;};
  switch(action.type){
  case "START":{const ns=init();ns.phase=PH.DISCARD;ns.dealer=Math.random()<0.5?0:1;ns.hFact=Math.random()*HIST.length|0;ns.showBoard=true;
    const dk=shuffle(mkDeck()),ph=[],ah=[];for(let i=0;i<12;i++){if(i%2===(ns.dealer===0?1:0))ph.push(dk[i]);else ah.push(dk[i]);}
    ns.deck=dk.slice(12);ns.pHand=ph;ns.aHand=ah;ns.bubble={from:"ai",text:ns.dealer===1?pick(TT.dealerCrib):pick(TT.poneLead),id:++bId};return ns;}
  case "SEL":{if(s.phase!==PH.DISCARD)return s;const i=action.i;s.sel=s.sel.includes(i)?s.sel.filter(x=>x!==i):s.sel.length<2?[...s.sel,i]:s.sel;return s;}
  case "DISCARD":{if(s.sel.length!==2)return s;const keep=s.pHand.filter((_,i)=>!s.sel.includes(i)),disc=s.sel.map(i=>s.pHand[i]);
    const aI=aiPickDiscard(s.aHand,s.dealer===1),aK=s.aHand.filter((_,i)=>!aI.includes(i)),aD=aI.map(i=>s.aHand[i]);
    s.pHand=keep;s.aHand=aK;s.crib=[...disc,...aD];s.sel=[];s.starter=s.deck[0];s.deck=s.deck.slice(1);s.phase=PH.CUT;
    if(s.starter.rank==="J"){bub("ai",pick(TT.heels));pop(s.dealer===0?"His Heels! You +2":"His Heels! Suckling +2");if(add(s.dealer===0?"p":"a",2))return s;}
    s.phase=PH.PEG;s.pegPlayed=[];s.pegCount=0;s.pegPCards=[...s.pHand];s.pegACards=[...s.aHand];s.pegLast=-1;
    const f=s.dealer===0?1:0;s.pegTurn=f;if(f===1)s.aiPegSeq++;return s;}
  case "PLAY":{if(s.phase!==PH.PEG||s.pegTurn!==0)return s;const c=action.card,nc=s.pegCount+val(c.rank);if(nc>31)return s;
    s.pegPlayed=[...s.pegPlayed,c];s.pegCount=nc;s.pegPCards=s.pegPCards.filter(x=>x.id!==c.id);s.pegLast=0;
    const{score,desc}=scorePegging(s.pegPlayed,nc);if(score>0){pop(desc.join(" "));if(add("p",score))return s;}return pegA(s,0,bub,pop,add);}
  case "GO":{if(s.phase!==PH.PEG||s.pegTurn!==0)return s;s.pegTurn=1;s.aiPegSeq++;return s;}
  case "AI_PEG":{if(s.phase!==PH.PEG||s.pegTurn!==1)return s;
    const c=aiPickPegCard(s.pegACards,s.pegPlayed,s.pegCount);
    if(!c){const pCan=s.pegPCards.some(x=>s.pegCount+val(x.rank)<=31);
      if(!pCan){if(s.pegCount>0&&s.pegCount<31){const w=s.pegLast===0?"p":"a";pop(`${w==="p"?"You":AI_NAME} +1 Last Card`);if(add(w,1))return s;}return pegRE(s,bub,pop,add);}
      bub("ai","Go!");s.pegTurn=0;return s;}
    const nc=s.pegCount+val(c.rank);s.pegPlayed=[...s.pegPlayed,c];s.pegCount=nc;s.pegACards=s.pegACards.filter(x=>x.id!==c.id);s.pegLast=1;
    const{score,desc}=scorePegging(s.pegPlayed,nc);if(score>0){pop(AI_NAME+": "+desc.join(" "));if(add("a",score))return s;}return pegA(s,1,bub,pop,add);}
  case "ADV":{if(s.winner)return s;
    if(s.phase===PH.SHOW_ND){s.phase=PH.SHOW_D;const w=s.dealer===0?"p":"a",h=w==="p"?s.pHand:s.aHand,sc=scoreHand(h,s.starter);
      s.showInfo={who:w,hand:h,score:sc};if(sc.total>=12)bub("ai",pick(w==="a"?TT.aiBig:TT.pBig));else if(sc.total===0)bub("ai",pick(w==="a"?TT.aiZero:TT.pZero));
      else if(sc.nobs>0)bub("ai",pick(TT.nobs));if(w==="p")s.stats={...s.stats,bestP:Math.max(s.stats.bestP,sc.total)};else s.stats={...s.stats,bestA:Math.max(s.stats.bestA,sc.total)};
      if(add(w,sc.total))return s;}
    else if(s.phase===PH.SHOW_D){s.phase=PH.SHOW_CRIB;const w=s.dealer===0?"p":"a",sc=scoreHand(s.crib.slice(0,4),s.starter,true);
      s.showInfo={who:w,hand:s.crib.slice(0,4),score:sc,isCrib:true};if(sc.total>=8)bub("ai",w==="a"?"My crib pays. Sir John's trick.":"A fat crib for the pone.");if(add(w,sc.total))return s;}
    else if(s.phase===PH.SHOW_CRIB){
      if(s.aScore>s.pScore&&s.prevP>=s.prevA)bub("ai",pick(TT.aiLead));else if(s.pScore>s.aScore&&s.prevA>=s.prevP)bub("ai",pick(TT.pLead));
      else if(s.pScore===s.aScore&&s.pScore>0)bub("ai",pick(TT.levelPeg));
      if(s.aScore>=100&&s.pScore<91)bub("ai",pick(TT.skunk));if(s.aScore===120)bub("ai",pick(TT.stinkholeAi));else if(s.pScore===120)bub("ai",pick(TT.stinkhole));
      s.stats={...s.stats,hands:s.stats.hands+1};s.handNum++;s.dealer=s.dealer===0?1:0;s.sel=[];s.crib=[];s.starter=null;s.showInfo=null;
      const dk=shuffle(mkDeck()),ph=[],ah=[];for(let i=0;i<12;i++){if(i%2===(s.dealer===0?1:0))ph.push(dk[i]);else ah.push(dk[i]);}
      s.deck=dk.slice(12);s.pHand=ph;s.aHand=ah;s.phase=PH.DISCARD;bub("ai",s.dealer===1?pick(TT.dealerCrib):pick(TT.poneLead));}
    return s;}
  case "TAUNT":{s.bubble={from:"player",text:action.text,id:++bId};s.showTaunts=false;return s;}
  case "RETORT":{bub("ai",pick(TT.retort));return s;}
  case "TB":{s.showBoard=!s.showBoard;return s;}
  case "TT":{s.showTaunts=!s.showTaunts;return s;}
  case "CB":{if(s.bubble?.id===action.id)s.bubble=null;return s;}
  case "CP":{if(s.scorePop?.id===action.id)s.scorePop=null;return s;}
  default:return s;}
}
function pegA(s,who,bub,pop,add){const o=who===0?1:0;
  if(s.pegCount===31)return pegRE(s,bub,pop,add);
  if(s.pegPCards.length===0&&s.pegACards.length===0){if(s.pegCount>0&&s.pegCount<31){pop(`${who===0?"You":AI_NAME} +1 Last Card`);if(add(who===0?"p":"a",1))return s;}return startSh(s,bub,pop,add);}
  const oC=o===0?s.pegPCards:s.pegACards;if(oC.some(c=>s.pegCount+val(c.rank)<=31)){s.pegTurn=o;if(o===1)s.aiPegSeq++;return s;}
  const mC=who===0?s.pegPCards:s.pegACards;if(mC.some(c=>s.pegCount+val(c.rank)<=31)){if(o===1)bub("ai","Go!");s.pegTurn=who;if(who===1)s.aiPegSeq++;return s;}
  if(s.pegCount>0&&s.pegCount<31){pop(`${who===0?"You":AI_NAME} +1 Last Card`);if(add(who===0?"p":"a",1))return s;}return pegRE(s,bub,pop,add);}
function pegRE(s,bub,pop,add){s.pegPlayed=[];s.pegCount=0;
  if(s.pegPCards.length===0&&s.pegACards.length===0)return startSh(s,bub,pop,add);
  const n=s.pegLast===0?1:0;const nC=n===0?s.pegPCards:s.pegACards;
  if(nC.length===0){s.pegTurn=s.pegLast;if(s.pegLast===1)s.aiPegSeq++;}else{s.pegTurn=n;if(n===1)s.aiPegSeq++;}return s;}
function startSh(s,bub,pop,add){const ndP=s.dealer!==0,w=ndP?"p":"a",h=w==="p"?s.pHand:s.aHand,sc=scoreHand(h,s.starter);
  s.phase=PH.SHOW_ND;s.showInfo={who:w,hand:h,score:sc};
  if(sc.total>=12)s.bubble={from:"ai",text:pick(w==="a"?TT.aiBig:TT.pBig),id:++bId};else if(sc.total===0)s.bubble={from:"ai",text:pick(w==="a"?TT.aiZero:TT.pZero),id:++bId};
  else if(sc.nobs>0)s.bubble={from:"ai",text:pick(TT.nobs),id:++bId};
  if(w==="p")s.stats={...s.stats,bestP:Math.max(s.stats.bestP,sc.total)};else s.stats={...s.stats,bestA:Math.max(s.stats.bestA,sc.total)};add(w,sc.total);return s;}

/* ═══ CARD ═══ */
function Card({card,faceDown,sel,dim,onClick,sm,style:ex}){
  const isR=card&&RED.has(card.suit);const w=sm?46:58,h=sm?68:86;
  const b={width:w,height:h,borderRadius:7,position:"relative",cursor:onClick?"pointer":"default",transition:"all 0.2s",userSelect:"none",flexShrink:0,
    transform:sel?"translateY(-10px)":"none",boxShadow:sel?"0 4px 14px rgba(212,168,67,0.5)":"0 2px 6px rgba(0,0,0,0.35)",
    border:sel?"2px solid #d4a843":"2px solid rgba(255,255,255,0.08)",opacity:dim?0.35:1,...ex};
  if(faceDown)return(<div style={{...b,background:"linear-gradient(135deg,#8b1a1a,#5c1111)",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div style={{width:"78%",height:"78%",border:"1px solid #d4a84366",borderRadius:3,background:"repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(212,168,67,0.1) 3px,rgba(212,168,67,0.1) 6px)"}}/></div>);
  return(<div onClick={onClick} style={{...b,background:"linear-gradient(150deg,#f5f0e8,#e8e0d0)",display:"flex",flexDirection:"column",padding:"3px 5px"}}>
    <div style={{fontSize:sm?11:13,fontWeight:800,color:isR?"#c41e3a":"#1a1a1a",lineHeight:1,fontFamily:"Georgia,serif"}}>{card.rank}</div>
    <div style={{fontSize:sm?13:16,color:isR?"#c41e3a":"#1a1a1a",lineHeight:1}}>{card.suit}</div>
    <div style={{position:"absolute",bottom:2,right:4,fontSize:sm?8:9,fontWeight:800,color:isR?"#c41e3a":"#1a1a1a",transform:"rotate(180deg)"}}>{card.rank}</div>
    <div style={{position:"absolute",bottom:12,right:4,fontSize:sm?13:16,color:isR?"#c41e3a":"#1a1a1a",transform:"rotate(180deg)"}}>{card.suit}</div></div>);}

/* ═══ MAIN ═══ */
export default function App(){
  const[g,d]=useReducer(R,null,init);const refs=useRef([]);
  const clr=()=>{refs.current.forEach(clearTimeout);refs.current=[];};
  const dly=(fn,ms)=>{const t=setTimeout(fn,ms);refs.current.push(t);};
  useEffect(()=>()=>clr(),[]);
  useEffect(()=>{if(g.bubble){const id=g.bubble.id;dly(()=>d({type:"CB",id}),3500);}},[g.bubble?.id]);
  useEffect(()=>{if(g.scorePop){const id=g.scorePop.id;dly(()=>d({type:"CP",id}),2200);}},[g.scorePop?.id]);
  useEffect(()=>{if(g.aiPegSeq>0&&g.phase===PH.PEG&&g.pegTurn===1)dly(()=>d({type:"AI_PEG"}),650);},[g.aiPegSeq]);
  useEffect(()=>{if(g.bubble?.from==="player")dly(()=>d({type:"RETORT"}),1200);},[g.bubble?.from==="player"&&g.bubble?.id]);

  const act=![PH.MENU,PH.OVER].includes(g.phase);
  const canP=g.phase===PH.PEG&&g.pegTurn===0&&g.pegPCards.some(c=>g.pegCount+val(c.rank)<=31);
  const mustGo=g.phase===PH.PEG&&g.pegTurn===0&&!canP&&g.pegPCards.length>0;
  const sk=g.winner?(g.winner==="p"?(g.aScore<61?"DOUBLE SKUNK 🦨🦨":g.aScore<91?"SKUNK 🦨":null):(g.pScore<61?"DOUBLE SKUNK 🦨🦨":g.pScore<91?"SKUNK 🦨":null)):null;

  if(g.phase===PH.MENU)return(
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#0d3318,#1a5c2a,#0d3318)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
      <div style={{fontSize:11,color:"#5a8a5a",letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Est. 1630</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:38,color:"#d4a843",margin:0,textShadow:"0 2px 12px rgba(0,0,0,0.5)"}}>CRIBBAGE</h1>
      <p style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#f5f0e8",margin:"4px 0 0",fontWeight:700}}>Get Pegged!</p>
      <div style={{width:50,height:2,background:"#d4a843",margin:"14px auto",borderRadius:1}}/>
      <p style={{color:"#b8956a",fontSize:13,margin:"0 0 6px"}}>vs. {AI_NAME} 🎩</p>
      <p style={{color:"#6a9a6a",fontSize:11,fontStyle:"italic",margin:"0 0 24px",maxWidth:280,textAlign:"center",lineHeight:1.5}}>
        "The ghost of Sir John Suckling — poet, cavalier,<br/>and history's most infamous card cheat."</p>
      <button onClick={()=>d({type:"START"})} style={{background:"linear-gradient(145deg,#d4a843,#b8862e)",color:"#1a1a1a",border:"none",borderRadius:12,
        padding:"14px 44px",fontSize:17,fontWeight:700,fontFamily:"'Playfair Display',serif",cursor:"pointer",boxShadow:"0 4px 20px rgba(212,168,67,0.4)",letterSpacing:1}}>DEAL ME IN</button>
      <div style={{marginTop:28,background:"rgba(0,0,0,0.2)",borderRadius:10,padding:"10px 14px",maxWidth:300}}>
        <div style={{color:"#d4a843",fontSize:9,fontWeight:700,letterSpacing:1,marginBottom:3}}>📜 DID YOU KNOW?</div>
        <p style={{color:"#a0c0a0",fontSize:11,margin:0,lineHeight:1.5,fontStyle:"italic"}}>{HIST[g.hFact||0]}</p></div>
      <p style={{marginTop:16,color:"#4a7a4a",fontSize:10}}>Tap to select · Two-player to 121</p></div>);

  if(g.phase===PH.OVER){const wT=g.winner==="p"?(sk?pick(TT.pWinSkunk):pick(TT.pWin)):(sk?pick(TT.aiWinSkunk):pick(TT.aiWin));
    return(<div style={{minHeight:"100vh",background:"linear-gradient(180deg,#0d3318,#1a5c2a,#0d3318)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
      <div style={{fontSize:44,marginBottom:8}}>{g.winner==="p"?"🏆":"🎩"}</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:g.winner==="p"?"#d4a843":"#c44",margin:0}}>{g.winner==="p"?"YOU PEGGED OUT!":AI_NAME+" PEGGED OUT!"}</h1>
      {sk&&<p style={{color:"#d4a843",fontSize:16,fontWeight:700,margin:"6px 0"}}>{sk}</p>}
      <div style={{background:"rgba(0,0,0,0.3)",borderRadius:12,padding:14,margin:"16px 0",color:"#f5f0e8",fontSize:13,lineHeight:2,textAlign:"center"}}>
        <div>Final: You {g.pScore} — {AI_NAME} {g.aScore}</div>
        <div>Hands: {g.stats.hands} · Best: You {g.stats.bestP} / Sly {g.stats.bestA}</div></div>
      <CribBoard pS={g.pScore} aS={g.aScore} pP={g.prevP} aP={g.prevA}/>
      <div style={{background:"rgba(139,26,26,0.2)",borderRadius:8,padding:10,margin:"12px 0",maxWidth:280}}>
        <p style={{color:"#f5f0e8",fontSize:13,margin:0,fontStyle:"italic"}}>"{wT}"</p>
        <p style={{color:"#b8956a",fontSize:11,margin:"3px 0 0"}}>— {AI_NAME} 🎩</p></div>
      <button onClick={()=>d({type:"START"})} style={{background:"linear-gradient(145deg,#d4a843,#b8862e)",color:"#1a1a1a",border:"none",borderRadius:12,padding:"12px 36px",fontSize:15,fontWeight:700,fontFamily:"'Playfair Display',serif",cursor:"pointer"}}>REMATCH</button></div>);}

  const phL={[PH.DISCARD]:"Discard 2 to Crib",[PH.CUT]:"Cutting…",[PH.PEG]:"The Play",
    [PH.SHOW_ND]:`${g.dealer!==0?"Pone's":"Dealer's"} Hand`,[PH.SHOW_D]:`${g.dealer===0?"Pone's":"Dealer's"} Hand`,
    [PH.SHOW_CRIB]:`${g.dealer===0?"Your":"Suckling's"} Crib`}[g.phase]||"";

  return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",background:"#0d3318",fontFamily:"'DM Sans',sans-serif",position:"relative"}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
      {/* Score + Board Toggle */}
      <div style={{background:"linear-gradient(180deg,#2a1f14,#1e1610)",padding:"7px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"2px solid #3a2a1a"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:5,background:"#4a9bff",boxShadow:"0 0 5px #4a9bff"}}/>
          <span style={{color:"#f5f0e8",fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700}}>You: {g.pScore}</span></div>
        <div onClick={()=>d({type:"TB"})} style={{color:"#b8956a",fontSize:11,cursor:"pointer",padding:"2px 8px",borderRadius:4,background:"rgba(255,255,255,0.05)"}}>{g.showBoard?"▾ Board":"▸ Board"}</div>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{color:"#f5f0e8",fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700}}>Sly: {g.aScore}</span>
          <div style={{width:10,height:10,borderRadius:5,background:"#ff4a4a",boxShadow:"0 0 5px #ff4a4a"}}/></div></div>
      {/* Board */}
      {g.showBoard&&<div style={{background:"linear-gradient(180deg,#3a2a1a,#2a1f14)",padding:"6px 8px",borderBottom:"1px solid #4a3a2a",overflowX:"auto"}}>
        <CribBoard pS={g.pScore} aS={g.aScore} pP={g.prevP} aP={g.prevA}/></div>}
      {/* Phase */}
      <div style={{background:"rgba(0,0,0,0.2)",padding:"4px 12px",display:"flex",justifyContent:"space-between"}}>
        <span style={{color:"#d4a843",fontSize:12,fontWeight:600}}>{phL}</span>
        <span style={{color:"#7a6a5a",fontSize:10}}>{g.dealer===0?"You deal":"Sly deals"} · Hand #{g.handNum+1}</span></div>
      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"linear-gradient(180deg,#1a5c2a,#145224,#0d3318)",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,opacity:0.4,background:"repeating-conic-gradient(rgba(255,255,255,0.015) 0% 25%, transparent 0% 50%) 0 0 / 4px 4px",pointerEvents:"none"}}/>
        {/* AI */}
        <div style={{padding:"6px 12px",position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <div style={{width:28,height:28,borderRadius:14,background:"linear-gradient(135deg,#8b1a1a,#5c1111)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🎩</div>
            <span style={{color:"#f5f0e8",fontSize:12,fontWeight:600}}>{AI_NAME}</span>
            {g.dealer===1&&<span style={{background:"#d4a843",color:"#1a1a1a",fontSize:8,padding:"1px 5px",borderRadius:3,fontWeight:700}}>DEALER</span>}</div>
          {g.bubble?.from==="ai"&&<div style={{background:"rgba(139,26,26,0.88)",color:"#f5f0e8",padding:"6px 10px",borderRadius:"10px 10px 10px 2px",fontSize:12,maxWidth:"85%",marginBottom:3,fontStyle:"italic"}}>{g.bubble.text}</div>}
          <div style={{display:"flex",gap:3,justifyContent:"center"}}>
            {g.phase===PH.PEG?g.pegACards.map((_,i)=><Card key={i} faceDown sm/>):
             [PH.SHOW_ND,PH.SHOW_D,PH.SHOW_CRIB].includes(g.phase)&&g.showInfo?.who==="a"?g.showInfo.hand.map(c=><Card key={c.id} card={c} sm/>):
             g.phase===PH.DISCARD?Array(4).fill(0).map((_,i)=><Card key={i} faceDown sm/>):null}</div></div>
        {/* Center */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2px 12px",position:"relative",zIndex:1,minHeight:90}}>
          {g.scorePop&&<div style={{position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",background:"rgba(212,168,67,0.95)",color:"#1a1a1a",padding:"4px 12px",borderRadius:14,fontSize:12,fontWeight:700,zIndex:10,whiteSpace:"nowrap"}}>{g.scorePop.text}</div>}
          {g.starter&&g.phase!==PH.DISCARD&&<div style={{marginBottom:4,textAlign:"center"}}><div style={{color:"#b8956a",fontSize:9,marginBottom:1}}>Starter</div><Card card={g.starter} sm/></div>}
          {g.phase===PH.PEG&&<div style={{width:"100%",textAlign:"center"}}>
            <span style={{fontFamily:"'Playfair Display',serif",fontSize:32,color:"#d4a843",fontWeight:900,textShadow:"0 2px 8px rgba(0,0,0,0.4)"}}>{g.pegCount}</span>
            <span style={{color:"#7a6a5a",fontSize:9,display:"block",marginBottom:4}}>of 31</span>
            <div style={{display:"flex",gap:3,justifyContent:"center",flexWrap:"wrap",minHeight:36}}>{g.pegPlayed.map((c,i)=><Card key={c.id+i} card={c} sm/>)}</div></div>}
          {[PH.SHOW_ND,PH.SHOW_D,PH.SHOW_CRIB].includes(g.phase)&&g.showInfo&&<div style={{textAlign:"center"}}>
            <div style={{color:"#b8956a",fontSize:10,marginBottom:3}}>{g.showInfo.isCrib?"Crib":g.showInfo.who==="p"?"Your Hand (Pone)":"Sly's Hand"} + Starter</div>
            <div style={{display:"flex",gap:3,justifyContent:"center",marginBottom:5}}>
              {g.showInfo.hand.map(c=><Card key={c.id} card={c} sm/>)}
              <div style={{width:2,background:"#d4a843",margin:"0 1px",borderRadius:1,alignSelf:"stretch"}}/>
              <Card card={g.starter} sm/></div>
            <div style={{background:"rgba(0,0,0,0.3)",borderRadius:10,padding:"5px 12px",display:"inline-block"}}>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:"#d4a843",fontWeight:900}}>{g.showInfo.score.total}</span>
              <span style={{color:"#b8956a",fontSize:10,marginLeft:3}}>pts</span>
              <div style={{color:"#7a6a5a",fontSize:9,marginTop:1}}>
                {g.showInfo.score.fifteens>0&&`15s:${g.showInfo.score.fifteens} `}{g.showInfo.score.pairs>0&&`Pairs:${g.showInfo.score.pairs} `}
                {g.showInfo.score.runs>0&&`Runs:${g.showInfo.score.runs} `}{g.showInfo.score.flush>0&&`Flush:${g.showInfo.score.flush} `}{g.showInfo.score.nobs>0&&`Nobs:1`}</div></div></div>}</div>
        {/* Player bubble */}
        {g.bubble?.from==="player"&&<div style={{padding:"0 12px 3px",zIndex:1}}>
          <div style={{background:"rgba(212,168,67,0.88)",color:"#1a1a1a",padding:"6px 10px",borderRadius:"10px 10px 2px 10px",fontSize:12,maxWidth:"85%",marginLeft:"auto",fontWeight:600}}>{g.bubble.text}</div></div>}
        {/* Player hand */}
        <div style={{padding:"4px 12px 2px",position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <div style={{width:24,height:24,borderRadius:12,background:"linear-gradient(135deg,#d4a843,#b8862e)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>👤</div>
            <span style={{color:"#f5f0e8",fontSize:12,fontWeight:600}}>You</span>
            {g.dealer===0&&<span style={{background:"#d4a843",color:"#1a1a1a",fontSize:8,padding:"1px 5px",borderRadius:3,fontWeight:700}}>DEALER</span>}</div>
          <div style={{display:"flex",gap:5,justifyContent:"center",paddingBottom:2}}>
            {g.phase===PH.DISCARD&&g.pHand.map((c,i)=><Card key={c.id} card={c} sel={g.sel.includes(i)} onClick={()=>d({type:"SEL",i})}/>)}
            {g.phase===PH.PEG&&g.pegPCards.map(c=>{const cp=g.pegCount+val(c.rank)<=31&&g.pegTurn===0;
              return <Card key={c.id} card={c} dim={!cp&&g.pegTurn===0} onClick={cp?()=>d({type:"PLAY",card:c}):undefined}/>;})}
            {[PH.SHOW_ND,PH.SHOW_D,PH.SHOW_CRIB].includes(g.phase)&&g.showInfo?.who==="p"&&g.showInfo.hand.map(c=><Card key={c.id} card={c}/>)}
            {[PH.SHOW_ND,PH.SHOW_D,PH.SHOW_CRIB].includes(g.phase)&&g.showInfo?.who==="a"&&g.pHand.map(c=><Card key={c.id} card={c}/>)}
            {g.phase===PH.CUT&&g.pHand.map(c=><Card key={c.id} card={c}/>)}</div></div></div>
      {/* Actions */}
      <div style={{background:"linear-gradient(180deg,#2a1f14,#1e1610)",padding:"8px 12px",display:"flex",alignItems:"center",borderTop:"2px solid #3a2a1a",gap:8}}>
        <div style={{flex:1}}>
          {g.phase===PH.DISCARD&&g.sel.length===2&&<button onClick={()=>d({type:"DISCARD"})} style={{width:"100%",background:"linear-gradient(145deg,#d4a843,#b8862e)",color:"#1a1a1a",border:"none",borderRadius:10,padding:"11px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Send to Crib →</button>}
          {g.phase===PH.DISCARD&&g.sel.length<2&&<div style={{color:"#7a6a5a",fontSize:12,textAlign:"center",padding:11}}>Select {2-g.sel.length} card{g.sel.length===1?"":"s"} for the crib</div>}
          {g.phase===PH.PEG&&g.pegTurn===0&&mustGo&&<button onClick={()=>d({type:"GO"})} style={{width:"100%",background:"linear-gradient(145deg,#8b1a1a,#6b1212)",color:"#f5f0e8",border:"none",borderRadius:10,padding:"11px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Go!</button>}
          {g.phase===PH.PEG&&g.pegTurn===0&&canP&&<div style={{color:"#d4a843",fontSize:12,textAlign:"center",padding:11}}>Your lead, pone — tap a card</div>}
          {g.phase===PH.PEG&&g.pegTurn===1&&<div style={{color:"#7a6a5a",fontSize:12,textAlign:"center",padding:11}}>{AI_NAME} is thinking…</div>}
          {[PH.SHOW_ND,PH.SHOW_D,PH.SHOW_CRIB].includes(g.phase)&&<button onClick={()=>d({type:"ADV"})} style={{width:"100%",background:"linear-gradient(145deg,#d4a843,#b8862e)",color:"#1a1a1a",border:"none",borderRadius:10,padding:"11px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{g.phase===PH.SHOW_CRIB?"Next Hand →":"Continue →"}</button>}
          {g.phase===PH.CUT&&<div style={{color:"#7a6a5a",fontSize:12,textAlign:"center",padding:11}}>Cutting the deck…</div>}</div>
        {act&&<button onClick={()=>d({type:"TT"})} style={{width:42,height:42,borderRadius:21,background:g.showTaunts?"#d4a843":"rgba(255,255,255,0.08)",border:"none",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>😏</button>}</div>
      {/* Taunts */}
      {g.showTaunts&&<div style={{position:"absolute",bottom:60,left:0,right:0,background:"linear-gradient(180deg,#2a1f14ee,#1e1610fa)",borderTop:"2px solid #d4a843",padding:10,zIndex:20,maxHeight:200,overflowY:"auto"}}>
        <div style={{color:"#d4a843",fontSize:12,fontWeight:700,marginBottom:5}}>🗯️ Send a Taunt</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
          {TAUNTS.map((t,i)=><button key={i} onClick={()=>d({type:"TAUNT",text:t})} style={{background:"rgba(212,168,67,0.1)",border:"1px solid #d4a84344",borderRadius:7,color:"#f5f0e8",padding:"6px 10px",fontSize:11,cursor:"pointer"}}>{t}</button>)}</div></div>}
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`}</style></div>);}
