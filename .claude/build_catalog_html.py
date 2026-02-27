"""Build capabilities-catalog.html from capabilities-catalog.json."""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_PATH = os.path.join(SCRIPT_DIR, "capabilities-catalog.json")
HTML_PATH = os.path.join(SCRIPT_DIR, "capabilities-catalog.html")

with open(JSON_PATH, "r", encoding="utf-8") as f:
    catalog = json.load(f)

caps_json = json.dumps(catalog["capabilities"])
summary = catalog["session_summary"]
total = summary["total"]

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Capabilities Catalog ({total})</title>
<style>
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
html,body{{height:100%;overflow:hidden;background:#0a0a0a;color:#ccc;font-family:'JetBrains Mono','Fira Code',monospace}}
::-webkit-scrollbar{{width:6px;height:6px}}
::-webkit-scrollbar-track{{background:#111}}
::-webkit-scrollbar-thumb{{background:#333;border-radius:3px}}
::-webkit-scrollbar-thumb:hover{{background:#555}}

#header{{position:fixed;top:0;left:0;right:0;z-index:100;background:#0a0a0a;border-bottom:1px solid #222;padding:8px 20px 10px}}
#status-bar{{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#555;margin-bottom:8px;letter-spacing:0.5px}}
#status-bar .title{{text-transform:uppercase;font-weight:bold}}
#status-bar .sel-count{{color:#a855f7}}

#search{{width:100%;background:#111;border:1px solid #222;border-radius:4px;padding:8px 12px;color:#ccc;font-family:inherit;font-size:12px;outline:none;margin-bottom:8px;transition:border-color 0.12s}}
#search:focus{{border-color:#444}}
#search::placeholder{{color:#444}}

.pill-row{{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}}
.pill{{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:10px;cursor:pointer;border:1px solid #222;background:#111;color:#888;transition:all 0.12s;user-select:none;white-space:nowrap}}
.pill:hover{{border-color:#444}}
.pill.active{{color:#fff}}
.pill .count{{opacity:0.6;font-size:9px}}

#clear-filters{{display:none;padding:2px 10px;border-radius:10px;font-size:10px;cursor:pointer;border:1px solid #333;background:#1a1a1a;color:#888;transition:all 0.12s;font-family:inherit}}
#clear-filters:hover{{color:#ccc;border-color:#555}}

#grid-wrap{{position:fixed;top:0;left:0;right:0;bottom:0;overflow-y:auto;padding:12px 20px;background:#0a0a0a}}
#grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px}}

.card{{background:#111;border:1px solid #222;border-radius:6px;padding:10px 12px;cursor:pointer;transition:all 0.12s;display:flex;flex-direction:column;gap:4px}}
.card:hover{{border-color:#333}}
.card.selected{{background:rgba(255,255,255,0.05)}}
.card-top{{display:flex;align-items:center;gap:6px;font-size:10px}}
.badge{{padding:1px 6px;border-radius:8px;font-size:9px;font-weight:bold;text-transform:uppercase;letter-spacing:0.3px}}
.hint{{color:#555;font-size:9px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.check{{color:#22c55e;font-size:11px;font-weight:bold;display:none}}
.card.selected .check{{display:inline}}
.card-name{{font-size:12px;font-weight:bold;color:#e8e8e8;word-break:break-all;line-height:1.3}}
.card-desc{{font-size:11px;color:#888;line-height:1.4}}
.card-bottom{{display:flex;align-items:center;gap:6px;margin-top:auto;padding-top:4px}}
.copy-preview{{flex:1;font-size:10px;color:#555;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.copy-btn{{padding:2px 8px;border-radius:4px;font-size:9px;cursor:pointer;border:1px solid #333;background:#1a1a1a;color:#888;transition:all 0.12s;font-family:inherit;white-space:nowrap}}
.copy-btn:hover{{color:#ccc;border-color:#555}}
.copy-btn.copied{{color:#22c55e;border-color:#22c55e}}

#tray{{position:fixed;bottom:0;left:0;right:0;z-index:100;background:#0f0f0f;border-top:1px solid #222;padding:10px 20px;display:none;align-items:center;gap:12px}}
#tray.visible{{display:flex}}
#tray-badges{{display:flex;gap:4px;overflow-x:auto;flex:1;padding:2px 0}}
.tray-badge{{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:10px;font-size:10px;border:1px solid #333;background:#1a1a1a;color:#ccc;white-space:nowrap}}
.tray-badge .dismiss{{cursor:pointer;color:#555;font-size:12px}}
.tray-badge .dismiss:hover{{color:#ccc}}
#tray-actions{{display:flex;gap:8px;flex-shrink:0}}
#tray-actions button{{padding:4px 12px;border-radius:4px;font-size:10px;cursor:pointer;border:1px solid #333;background:#1a1a1a;color:#ccc;transition:all 0.12s;font-family:inherit}}
#tray-actions button:hover{{border-color:#555}}
#tray-actions .copy-all.copied{{color:#22c55e;border-color:#22c55e}}

.cat-tool{{color:#3b82f6}}.cat-tool.active,.pill-cat-tool.active{{background:rgba(59,130,246,0.15);border-color:#3b82f6;color:#3b82f6}}
.cat-skill{{color:#22c55e}}.cat-skill.active,.pill-cat-skill.active{{background:rgba(34,197,94,0.15);border-color:#22c55e;color:#22c55e}}
.cat-command{{color:#a855f7}}.cat-command.active,.pill-cat-command.active{{background:rgba(168,85,247,0.15);border-color:#a855f7;color:#a855f7}}
.cat-mcp_tool{{color:#f97316}}.cat-mcp_tool.active,.pill-cat-mcp_tool.active{{background:rgba(249,115,22,0.15);border-color:#f97316;color:#f97316}}
.cat-subagent{{color:#ec4899}}.cat-subagent.active,.pill-cat-subagent.active{{background:rgba(236,72,153,0.15);border-color:#ec4899;color:#ec4899}}

.badge-tool{{background:rgba(59,130,246,0.15);color:#3b82f6}}
.badge-skill{{background:rgba(34,197,94,0.15);color:#22c55e}}
.badge-command{{background:rgba(168,85,247,0.15);color:#a855f7}}
.badge-mcp_tool{{background:rgba(249,115,22,0.15);color:#f97316}}
.badge-subagent{{background:rgba(236,72,153,0.15);color:#ec4899}}

.card.selected-tool{{border-color:#3b82f6;box-shadow:0 0 8px rgba(59,130,246,0.15)}}
.card.selected-skill{{border-color:#22c55e;box-shadow:0 0 8px rgba(34,197,94,0.15)}}
.card.selected-command{{border-color:#a855f7;box-shadow:0 0 8px rgba(168,85,247,0.15)}}
.card.selected-mcp_tool{{border-color:#f97316;box-shadow:0 0 8px rgba(249,115,22,0.15)}}
.card.selected-subagent{{border-color:#ec4899;box-shadow:0 0 8px rgba(236,72,153,0.15)}}

.pill-server.active{{background:rgba(249,115,22,0.15);border-color:#f97316;color:#f97316}}
.pill-ns.active{{background:rgba(168,85,247,0.15);border-color:#a855f7;color:#a855f7}}
</style>
</head>
<body>
<div id="header">
  <div id="status-bar"><span class="title">CAPABILITIES CATALOG — <span id="filtered-count">0</span> / <span id="total-count">0</span></span><span id="sel-info" class="sel-count"></span></div>
  <input id="search" type="text" placeholder="Search name, description, server, namespace..." autocomplete="off" spellcheck="false">
  <div class="pill-row" id="cat-pills"></div>
  <div class="pill-row" id="server-pills"></div>
  <div class="pill-row" id="ns-pills"></div>
</div>
<div id="grid-wrap"><div id="grid"></div></div>
<div id="tray"><div id="tray-badges"></div><div id="tray-actions"><button id="tray-clear">clear</button><button id="tray-copy" class="copy-all">copy 0 to clipboard</button></div></div>

<script>
const RAW_CAPS={caps_json};

const COLORS={{tool:'#3b82f6',skill:'#22c55e',command:'#a855f7',mcp_tool:'#f97316',subagent:'#ec4899'}};
const CAT_LABELS={{tool:'tool',skill:'skill',command:'cmd',mcp_tool:'mcp',subagent:'agent'}};
const CATEGORIES=['tool','skill','command','mcp_tool','subagent'];

let searchQuery='';
let activeCategories=new Set();
let activeServers=new Set();
let activeNamespaces=new Set();
let selectedKeys=new Set();
let debounceTimer=null;

const allServers=[...new Set(RAW_CAPS.filter(c=>c.server).map(c=>c.server))].sort();
const allNamespaces=[...new Set(RAW_CAPS.filter(c=>c.namespace).map(c=>c.namespace))].sort();

function getKey(c){{return c.name+'|'+c.category}}

function getCopyString(c){{
  if(c.category==='command')return c.name;
  if(c.category==='tool')return c.name;
  if(c.category==='skill'){{
    const i=c.name.indexOf(':');
    return '/'+(i>=0?c.name.slice(i+1):c.name);
  }}
  if(c.category==='subagent'){{
    const i=c.name.indexOf(':');
    if(i>=0){{
      const ns=c.name.slice(0,i);
      const short=c.name.slice(i+1);
      return '@.claude/agents/'+ns+'/'+short;
    }}
    return '@.claude/agents/'+c.name;
  }}
  if(c.category==='mcp_tool'){{
    return '/mcp__'+c.server+'__'+c.name;
  }}
  return c.name;
}}

function getHint(c){{
  if(c.server)return c.server;
  if(c.namespace)return c.namespace;
  return '';
}}

function matchesSearch(c,q){{
  if(!q)return true;
  const lq=q.toLowerCase();
  return (c.name.toLowerCase().includes(lq)||c.description.toLowerCase().includes(lq)||(c.server||'').toLowerCase().includes(lq)||(c.namespace||'').toLowerCase().includes(lq));
}}

function getFiltered(){{
  return RAW_CAPS.filter(c=>{{
    if(activeCategories.size>0&&!activeCategories.has(c.category))return false;
    if(activeServers.size>0&&!activeServers.has(c.server))return false;
    if(activeNamespaces.size>0&&!activeNamespaces.has(c.namespace))return false;
    if(!matchesSearch(c,searchQuery))return false;
    return true;
  }});
}}

function render(){{
  const filtered=getFiltered();
  document.getElementById('filtered-count').textContent=filtered.length;
  document.getElementById('total-count').textContent=RAW_CAPS.length;

  const selCount=selectedKeys.size;
  const selInfo=document.getElementById('sel-info');
  selInfo.textContent=selCount>0?selCount+' selected':'';

  // Category pills
  const catPills=document.getElementById('cat-pills');
  let catHtml='';
  CATEGORIES.forEach(cat=>{{
    const count=filtered.filter(c=>c.category===cat).length;
    const active=activeCategories.has(cat)?'active':'';
    catHtml+=`<span class="pill pill-cat-${{cat}} cat-${{cat}} ${{active}}" data-cat="${{cat}}"><span>${{CAT_LABELS[cat]}}</span><span class="count">${{count}}</span></span>`;
  }});
  const hasFilters=activeCategories.size>0||activeServers.size>0||activeNamespaces.size>0||searchQuery.length>0;
  catHtml+=`<button id="clear-filters" style="display:${{hasFilters?'inline-block':'none'}}">clear filters</button>`;
  catPills.innerHTML=catHtml;

  // Server pills
  const serverPills=document.getElementById('server-pills');
  let sHtml='';
  allServers.forEach(s=>{{
    const active=activeServers.has(s)?'active':'';
    sHtml+=`<span class="pill pill-server ${{active}}" data-server="${{s}}">${{s}}</span>`;
  }});
  serverPills.innerHTML=sHtml;

  // Namespace pills
  const nsPills=document.getElementById('ns-pills');
  let nsHtml='';
  allNamespaces.forEach(ns=>{{
    const active=activeNamespaces.has(ns)?'active':'';
    nsHtml+=`<span class="pill pill-ns ${{active}}" data-ns="${{ns}}">${{ns}}</span>`;
  }});
  nsPills.innerHTML=nsHtml;

  // Grid
  const grid=document.getElementById('grid');
  let gHtml='';
  filtered.forEach(c=>{{
    const key=getKey(c);
    const sel=selectedKeys.has(key);
    const selClass=sel?'selected selected-'+c.category:'';
    const copyStr=getCopyString(c);
    const hint=getHint(c);
    gHtml+=`<div class="card ${{selClass}}" data-key="${{key.replace(/"/g,'&quot;')}}">
      <div class="card-top">
        <span class="badge badge-${{c.category}}">${{CAT_LABELS[c.category]}}</span>
        ${{hint?`<span class="hint">${{hint}}</span>`:''}}
        <span class="check">&#10003;</span>
      </div>
      <div class="card-name">${{c.name}}</div>
      <div class="card-desc">${{c.description}}</div>
      <div class="card-bottom">
        <span class="copy-preview">${{copyStr}}</span>
        <button class="copy-btn" data-copy="${{copyStr.replace(/"/g,'&quot;')}}">copy</button>
      </div>
    </div>`;
  }});
  grid.innerHTML=gHtml;

  // Adjust grid top padding for header height
  const headerH=document.getElementById('header').offsetHeight;
  document.getElementById('grid-wrap').style.paddingTop=headerH+'px';

  // Tray
  const tray=document.getElementById('tray');
  if(selCount>0){{
    tray.classList.add('visible');
    const trayBadges=document.getElementById('tray-badges');
    let tbHtml='';
    selectedKeys.forEach(key=>{{
      const c=RAW_CAPS.find(x=>getKey(x)===key);
      if(c)tbHtml+=`<span class="tray-badge"><span>${{c.name}}</span><span class="dismiss" data-key="${{key.replace(/"/g,'&quot;')}}">&times;</span></span>`;
    }});
    trayBadges.innerHTML=tbHtml;
    document.getElementById('tray-copy').textContent='copy '+selCount+' to clipboard';
    document.getElementById('grid-wrap').style.paddingBottom=(tray.offsetHeight+8)+'px';
  }} else {{
    tray.classList.remove('visible');
    document.getElementById('grid-wrap').style.paddingBottom='12px';
  }}
}}

// Event delegation
document.addEventListener('click',function(e){{
  // Category pill
  const catPill=e.target.closest('[data-cat]');
  if(catPill){{
    const cat=catPill.dataset.cat;
    if(activeCategories.has(cat))activeCategories.delete(cat);
    else activeCategories.add(cat);
    render();return;
  }}
  // Server pill
  const sPill=e.target.closest('[data-server]');
  if(sPill){{
    const s=sPill.dataset.server;
    if(activeServers.has(s))activeServers.delete(s);
    else activeServers.add(s);
    render();return;
  }}
  // Namespace pill
  const nsPill=e.target.closest('[data-ns]');
  if(nsPill){{
    const ns=nsPill.dataset.ns;
    if(activeNamespaces.has(ns))activeNamespaces.delete(ns);
    else activeNamespaces.add(ns);
    render();return;
  }}
  // Clear filters
  if(e.target.id==='clear-filters'){{
    activeCategories.clear();activeServers.clear();activeNamespaces.clear();
    searchQuery='';document.getElementById('search').value='';
    render();return;
  }}
  // Copy button on card
  const copyBtn=e.target.closest('.copy-btn');
  if(copyBtn){{
    e.stopPropagation();
    const text=copyBtn.dataset.copy;
    navigator.clipboard.writeText(text).then(()=>{{
      copyBtn.textContent='\\u2713 copied';copyBtn.classList.add('copied');
      setTimeout(()=>{{copyBtn.textContent='copy';copyBtn.classList.remove('copied')}},1500);
    }});
    return;
  }}
  // Card click
  const card=e.target.closest('.card');
  if(card){{
    const key=card.dataset.key;
    if(selectedKeys.has(key))selectedKeys.delete(key);
    else selectedKeys.add(key);
    render();return;
  }}
  // Tray dismiss
  const dismiss=e.target.closest('.dismiss');
  if(dismiss){{
    selectedKeys.delete(dismiss.dataset.key);
    render();return;
  }}
  // Tray clear
  if(e.target.id==='tray-clear'){{
    selectedKeys.clear();render();return;
  }}
  // Tray copy all
  if(e.target.id==='tray-copy'||e.target.closest('#tray-copy')){{
    const btn=document.getElementById('tray-copy');
    const lines=[];
    selectedKeys.forEach(key=>{{
      const c=RAW_CAPS.find(x=>getKey(x)===key);
      if(c)lines.push(getCopyString(c));
    }});
    navigator.clipboard.writeText(lines.join(' ')).then(()=>{{
      const n=lines.length;
      btn.textContent='\\u2713 copied '+n;btn.classList.add('copied');
      setTimeout(()=>{{btn.textContent='copy '+n+' to clipboard';btn.classList.remove('copied')}},2000);
    }});
    return;
  }}
}});

// Search with debounce
document.getElementById('search').addEventListener('input',function(e){{
  clearTimeout(debounceTimer);
  debounceTimer=setTimeout(()=>{{
    searchQuery=e.target.value.trim();
    render();
  }},150);
}});

// Initial render
render();
</script>
</body>
</html>"""

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Written: {HTML_PATH}")
print(f"Total capabilities: {total}")
print(f"Size: {os.path.getsize(HTML_PATH):,} bytes")
