/* 出勤之後｜共用程式：開場動畫、頁首頁尾、公告、動態、Podcast 列表與單集頁、播放器 */
(function(){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmt=sec=>{sec=Math.max(0,Math.round(sec||0));const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),s=sec%60;return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(s).padStart(2,'0')};
  const mins=sec=>Math.round((sec||0)/60)+' 分鐘';
  const draft=()=>'';
  const page=document.body.dataset.page||'home';
  const HOME=document.body.dataset.home||'index.html';

  /* ── 首頁開場動畫：每次來訪只在第一次進首頁時播放，點一下可略過 ── */
  (function(){
    if(page!=='home')return;
    let seen=false;try{seen=sessionStorage.getItem('atc-intro')==='1';sessionStorage.setItem('atc-intro','1')}catch(e){}
    if(seen)return;
    const el=document.createElement('div');el.className='intro';el.setAttribute('aria-hidden','true');
    el.innerHTML=`<div class="intro-box"><svg viewBox="0 0 140 130">
      <circle class="i-glow" cx="70" cy="86" r="44" fill="#F5B85C"/>
      <g class="i-house">
        <path d="M8 114c30-4 92-4 124 0" stroke="#C9BFB0" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M37 64h66v48H37z" fill="#26333F"/>
        <path d="M27 67 70 31l43 36" fill="#1D2834"/>
        <rect class="i-win" x="59" y="80" width="22" height="18" rx="3"/>
        <circle cx="115" cy="30" r="8" fill="#D2622A"/>
      </g></svg><div class="i-name">出勤之後</div><div class="i-sub">收隊了，回來坐一下</div></div>`;
    document.body.append(el);document.body.style.overflow='hidden';
    let done=false;
    const finish=()=>{if(done)return;done=true;el.classList.add('out');document.body.style.overflow='';setTimeout(()=>el.remove(),450)};
    el.addEventListener('click',finish);setTimeout(finish,1600);
  })();

  /* 照片載入失敗時只留底色，不顯示破圖 */
  document.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.classList.add('broken')},true);
  document.querySelectorAll('img').forEach(i=>{if(i.complete&&i.getAttribute('src')&&!i.naturalWidth)i.classList.add('broken')});

  /* ── 頁首與頁尾 ── */
  const logo='<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 33c10-1.5 22-1.5 32 0" stroke="#C9BFB0" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M10 19h20v13H10z" fill="#26333F"/><path d="M7 20 20 9l13 11" fill="#1D2834"/><rect x="17" y="23" width="6" height="5" rx="1" fill="#F5B85C"/><circle cx="33" cy="9" r="3" fill="#D2622A"/></svg>';
  const links=[['home',HOME,'首頁'],['notices','notices.html','公告'],['podcast','podcast.html','Podcast'],['updates','updates.html','最新動態'],['about','about.html','關於計畫']];
  const cur=page==='episode'?'podcast':page;
  const head=document.createElement('header');head.className='site-head';
  head.innerHTML=`<div class="wrap"><a class="brand" href="${HOME}">${logo}<span><b>出勤之後</b><small>After the Call</small></span></a>
    <nav class="site-nav" aria-label="主選單"><ul>${links.map(([k,h,t])=>`<li><a href="${h}"${k===cur?' aria-current="page"':''}>${t}</a></li>`).join('')}</ul><a class="btn primary" href="podcast.html">收聽 Podcast</a></nav></div>`;
  document.body.prepend(head);
  const foot=document.createElement('footer');foot.className='site-foot';
  foot.innerHTML=`<div class="wrap">
    <div><b>出勤之後</b><p>警察、消防與救護人員的心理健康計畫。謝謝你今天也出勤了。</p></div>
    <div><h4>網站導覽</h4><ul>${links.map(([k,h,t])=>`<li><a href="${h}">${t}</a></li>`).join('')}</ul></div>
    <div><h4>需要聊聊</h4><ul><li>1925 安心專線（24 小時）</li><li>1995 生命線</li><li>1980 張老師專線</li></ul></div>
    <div class="base"><span>© ${new Date().getFullYear()} 出勤之後 After the Call</span><span>部分照片來自 Unsplash</span></div></div>`;
  document.body.append(foot);

  /* ── 公告 ── */
  /* 公告分「最新」和「一般」：置頂的優先，再由上往下補，合計前 NOTICE_HOT_COUNT 則（預設 5）。加 hot:false 可排除。 */
  const notices=(window.NOTICES||[]).map((n,k)=>Object.assign({},n,{_k:k})).sort((a,b)=>((b.pinned?1:0)-(a.pinned?1:0))||a._k-b._k);
  const HOT=+(window.NOTICE_HOT_COUNT||5);
  notices.filter(n=>n.hot!==false).slice(0,HOT).forEach(n=>n._hot=true);
  const hot=notices.filter(n=>n._hot);
  const strip=$('#board-strip');
  /* 首頁公告輪播：只播「最新」公告，每 5 秒自動換下一則 */
  if(strip&&strip.querySelector('.nb-view')&&hot.length){
    const view=strip.querySelector('.nb-view'),count=strip.querySelector('.nb-count');
    view.innerHTML=hot.map((n,k)=>`<a class="nb-slide${k?'':' on'}" href="notices.html#n${n._k}" ${k?'tabindex="-1" aria-hidden="true"':''}><time>${esc(n.date)}</time><span class="t">${n.pinned?'<b class="pin">置頂</b>':''}${esc(n.title)}</span></a>`).join('');
    const slides=[...view.children];let at=0,timer=null;
    const show=k=>{const old=slides[at];at=(k+slides.length)%slides.length;if(old===slides[at])return;
      old.classList.remove('on');old.classList.add('up');old.setAttribute('aria-hidden','true');old.tabIndex=-1;
      const nw=slides[at];nw.classList.remove('up');nw.style.transition='none';nw.getBoundingClientRect();nw.style.transition='';nw.classList.add('on');nw.removeAttribute('aria-hidden');nw.removeAttribute('tabindex');
      setTimeout(()=>old.classList.remove('up'),550);count.textContent=(at+1)+' / '+slides.length};
    count.textContent='1 / '+slides.length;
    const run=()=>{clearInterval(timer);if(slides.length>1)timer=setInterval(()=>show(at+1),5000)};
    strip.querySelector('.nb-prev').onclick=()=>{show(at-1);run()};
    strip.querySelector('.nb-next').onclick=()=>{show(at+1);run()};
    if(slides.length<2)strip.querySelector('.nb-ctrl').hidden=true;
    run();
  }
  const nl=$('#notice-list');
  if(nl){
    const cats=['全部','最新','一般',...new Set(notices.map(n=>n.type).filter(Boolean))];
    let sel='全部';const fl=$('#notice-filters');
    const match=n=>sel==='全部'||(sel==='最新'&&n._hot)||(sel==='一般'&&!n._hot)||n.type===sel;
    const draw=()=>{const list=notices.filter(match);
      nl.innerHTML=list.length?list.map(n=>`<article class="list-row${n.pinned?' pinned':''}" id="n${n._k}"><time>${esc(n.date)}</time><span class="tag">${esc(n.type||'')}</span>
      <h3>${n._hot&&!n.pinned?'<b class="new">最新</b>':''}${esc(n.title)}</h3><p>${esc(n.body)}${n.link?` <a href="${esc(n.link)}" target="_blank" rel="noopener">了解更多</a>`:''}</p></article>`).join(''):'<p style="padding:24px 0">目前沒有這類公告。</p>'};
    if(fl){fl.innerHTML=cats.map((c,k)=>`${k===3?'<span class="sep" aria-hidden="true"></span>':''}<button type="button" aria-pressed="${c===sel}">${esc(c)}</button>`).join('');
      fl.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=b.textContent;fl.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));draw()})}
    draw();
    const h=location.hash&&document.getElementById(location.hash.slice(1));if(h){h.classList.add('flash');setTimeout(()=>h.scrollIntoView({block:'center'}),50)}
  }
  const rn=$('#recent-notices');
  if(rn) rn.innerHTML=notices.slice(0,3).map(n=>`<a class="list-row" href="notices.html"><time>${esc(n.date)}</time><h3>${esc(n.title)}</h3></a>`).join('');

  /* ── 最新動態 ── */
  const updates=window.UPDATES||[];
  const ul=$('#update-list');
  if(ul) ul.innerHTML=updates.map(u=>`<li><div><p class="when">${esc(u.date)}</p>${u.tag?`<span class="tag">${esc(u.tag)}</span>`:''}</div><div><h3>${esc(u.title)}</h3><p>${esc(u.body)}</p></div></li>`).join('');
  const ru=$('#recent-updates');
  if(ru) ru.innerHTML=updates.slice(0,3).map(u=>`<a class="list-row" href="updates.html"><time>${esc(u.date)}</time><h3>${esc(u.title)}</h3></a>`).join('');

  /* ── Podcast 資料 ── */
  const podcast=window.PODCAST||{episodes:[]};
  let episodes=podcast.episodes.slice();
  const imgOf=e=>e.image||podcast.cover||'';
  const epURL=e=>'episode.html#'+e.id;
  function coverFallback(root){(root||document).querySelectorAll('img[data-cover]').forEach(img=>{
    if(!img.getAttribute('src')){img.src=podcast.cover||''}
    img.addEventListener('error',()=>{img.style.visibility='hidden'},{once:true})})}
  document.querySelectorAll('[data-show-name]').forEach(el=>el.textContent=podcast.show||'Podcast');
  document.querySelectorAll('[data-platforms]').forEach(el=>el.innerHTML=(podcast.platforms||[]).map(([n,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join(''));

  /* ── 播放器 ── */
  const audio=document.createElement('audio');audio.preload='none';document.body.append(audio);
  let current=-1;
  const icon=on=>on?'<span class="pause" aria-hidden="true"><i></i><i></i></span>':'<span class="tri" aria-hidden="true"></span>';
  const rates=[1,1.25,1.5,2];let r=0;
  let mini=null;
  function buildMini(){
    if(mini||page==='episode')return;
    mini=document.createElement('div');mini.className='player';mini.setAttribute('role','region');mini.setAttribute('aria-label','播放器');
    mini.innerHTML=`<div class="player-in"><button class="pp" type="button" data-toggle aria-label="播放">${icon(false)}</button>
      <div style="min-width:0"><div class="t"><a data-title href="#"></a></div><div class="seek"><span data-cur>0:00</span><input data-seek type="range" min="0" max="100" value="0" aria-label="播放進度"><span data-dur>0:00</span></div></div>
      <div class="ctrls"><button type="button" data-back>倒退 15 秒</button><button type="button" data-rate>1 倍速</button></div><p class="pl-msg" data-msg hidden></p></div>`;
    document.body.append(mini);document.body.classList.add('has-player');bindControls(mini);
  }
  function bindControls(root){
    const seek=root.querySelector('[data-seek]');
    seek.addEventListener('input',()=>{audio.currentTime=+seek.value});
    root.querySelector('[data-toggle]').addEventListener('click',()=>{if(current<0&&root.dataset.ep){load(episodes.findIndex(e=>e.id===root.dataset.ep),0,true);return}audio.paused?audio.play().catch(fail):audio.pause()});
    root.querySelector('[data-back]').addEventListener('click',()=>{audio.currentTime=Math.max(0,audio.currentTime-15)});
    const fwd=root.querySelector('[data-fwd]');if(fwd)fwd.addEventListener('click',()=>{audio.currentTime=Math.min(audio.duration||1e9,audio.currentTime+15)});
    root.querySelector('[data-rate]').addEventListener('click',()=>{r=(r+1)%rates.length;audio.playbackRate=rates[r];document.querySelectorAll('[data-rate]').forEach(b=>b.textContent=rates[r]+' 倍速')});
  }
  const all=sel=>document.querySelectorAll(sel);
  function msg(t,link){all('[data-msg]').forEach(m=>{m.innerHTML=t?esc(t)+(link?` <a href="${esc(link)}" target="_blank" rel="noopener">到 Firstory 收聽</a>`:''):'';m.hidden=!t})}
  function fail(){const e=episodes[current];msg('這裡無法直接播放音檔（預覽環境會擋外部音檔），請開啟資料夾裡的網站。',e&&e.link);sync()}
  function load(i,at,autoplay){
    const e=episodes[i];if(!e)return;
    buildMini();current=i;msg('');
    all('[data-title]').forEach(t=>{t.textContent=e.title;if(t.tagName==='A')t.href=epURL(e)});
    all('[data-dur]').forEach(d=>d.textContent=fmt(e.duration));all('[data-seek]').forEach(s=>{s.max=e.duration||100;s.value=at||0});
    all('[data-cur]').forEach(c=>c.textContent=fmt(at||0));
    audio.src=e.audio;audio.playbackRate=rates[r];
    if(at){audio.preload='metadata';audio.addEventListener('loadedmetadata',()=>{audio.currentTime=at},{once:true})}
    if(autoplay)audio.play().catch(fail);
    sync();
  }
  function sync(){
    all('[data-toggle]').forEach(t=>{t.innerHTML=icon(!audio.paused);t.setAttribute('aria-label',audio.paused?'播放':'暫停')});
    all('.qp').forEach(b=>{const on=episodes[current]&&b.dataset.id===episodes[current].id&&!audio.paused;b.innerHTML=icon(on);b.setAttribute('aria-label',(on?'暫停':'播放'))});
  }
  audio.addEventListener('play',sync);audio.addEventListener('pause',()=>{sync();save()});
  audio.addEventListener('error',()=>{if(current>=0&&audio.getAttribute('src'))fail()});
  audio.addEventListener('loadedmetadata',()=>{if(isFinite(audio.duration)){all('[data-seek]').forEach(s=>s.max=Math.round(audio.duration));all('[data-dur]').forEach(d=>d.textContent=fmt(audio.duration))}});
  let lastSave=0;
  audio.addEventListener('timeupdate',()=>{all('[data-seek]').forEach(s=>{if(!s.matches(':active'))s.value=Math.round(audio.currentTime)});all('[data-cur]').forEach(c=>c.textContent=fmt(audio.currentTime));if(Date.now()-lastSave>5000)save()});
  function save(){lastSave=Date.now();try{if(current>=0)localStorage.setItem('atc-listen',JSON.stringify({id:episodes[current].id,t:Math.floor(audio.currentTime)}))}catch(e){}}
  window.addEventListener('pagehide',save);
  function saved(){try{return JSON.parse(localStorage.getItem('atc-listen')||'null')}catch(e){return null}}
  function toggleById(id){const i=episodes.findIndex(e=>e.id===id);if(i<0)return;if(i===current){audio.paused?audio.play().catch(fail):audio.pause()}else load(i,0,true)}
  document.addEventListener('click',ev=>{
    const q=ev.target.closest('.qp');if(q){ev.preventDefault();toggleById(q.dataset.id);return}
    if(ev.target.closest('[data-play-latest]')&&episodes[0])toggleById(episodes[0].id);
  });

  /* ── 首頁：最新一集 ── */
  function renderHome(){
    const l=episodes[0];if(!l)return;
    all('[data-latest-title]').forEach(x=>x.textContent=l.title);
    all('[data-latest-meta]').forEach(x=>x.textContent=l.date+' · '+mins(l.duration));
    all('[data-latest-link]').forEach(a=>a.href=epURL(l));
    all('[data-latest-sum]').forEach(x=>x.textContent=l.summary||'');
    document.querySelectorAll('.feature img[data-cover]').forEach(img=>img.src=imgOf(l));
    const re=$('#recent-eps');
    if(re){re.innerHTML=episodes.slice(1,4).map(e=>`<a class="pod-card" href="${epURL(e)}"><span class="img ratio-169"><img data-cover src="${esc(imgOf(e))}" alt=""></span><span><span class="no">${esc(e.no)} · ${esc(e.date)}</span><span class="t">${esc(e.name||e.title)}</span></span></a>`).join('');coverFallback(re)}
  }

  /* ── Podcast 列表頁 ── */
  let shown=+(document.body.dataset.show||9);
  function renderList(){
    const el=$('#ep-grid');if(!el)return;
    el.innerHTML=episodes.slice(0,shown).map(e=>`<li><a href="${epURL(e)}"><span class="img"><img data-cover src="${esc(imgOf(e))}" alt="${esc(e.no)} 封面" loading="lazy"></span>
      <span class="no">${esc(e.no||'單集')}</span><span class="t">${esc(e.name||e.title)}</span><span class="m">${esc(e.date)} · ${mins(e.duration)}</span></a>
      <span class="zone"><button class="qp" type="button" data-id="${esc(e.id)}" aria-label="播放">${icon(false)}</button></span></li>`).join('');
    coverFallback(el);
    const m=$('#ep-more');if(m)m.hidden=shown>=episodes.length;
    sync();
  }
  const more=$('#ep-more');if(more)more.addEventListener('click',()=>{shown=episodes.length;renderList()});

  /* ── 單集頁 ── */
  function renderEpisode(){
    const root=$('#episode');if(!root)return;
    const id=decodeURIComponent(location.hash.slice(1));
    let i=episodes.findIndex(e=>e.id===id);if(i<0)i=0;
    const e=episodes[i];if(!e){root.innerHTML='<div class="wrap"><p style="padding:60px 0">找不到這一集。<a href="podcast.html">回到所有單集</a></p></div>';return}
    document.title=(e.no?e.no+'｜':'')+(e.name||e.title)+'｜出勤之後';
    const prev=episodes[i+1],next=episodes[i-1];
    const body=(e.body||e.summary||'').trim();
    root.innerHTML=`<section class="ep-hero"><div class="wrap">
      <div class="img ratio-169"><img data-cover src="${esc(imgOf(e))}" alt="${esc(e.no)} 封面"></div>
      <div style="min-width:0"><a class="back" href="podcast.html">← 所有單集</a><span class="no">${esc(e.no||'')}</span><h1>${esc(e.name||e.title)}</h1><p class="show" data-show-name>${esc(podcast.show||'')}</p>
        <div class="big-player" data-ep="${esc(e.id)}">
          <div class="bp-bar"><span data-cur>0:00</span><input data-seek type="range" min="0" max="${e.duration||100}" value="0" aria-label="播放進度"><span data-dur>${fmt(e.duration)}</span></div>
          <div class="bp-ctrls"><button type="button" data-rate>${rates[r]} 倍速</button><button type="button" data-back aria-label="倒退 15 秒">−15</button>
            <button class="bp-play" type="button" data-toggle aria-label="播放">${icon(false)}</button>
            <button type="button" data-fwd aria-label="快轉 15 秒">+15</button></div>
          <p class="bp-msg" data-msg hidden></p>
        </div></div></div></section>
      <div class="wrap"><div class="ep-body">
        <div style="min-width:0"><p class="meta">${esc(podcast.show||'')} · ${esc(e.date)} · ${mins(e.duration)}</p><div class="text">${esc(body)}</div>
          <nav class="ep-nav" aria-label="上下集">${prev?`<a href="${epURL(prev)}"><p class="k">← 上一集</p><p class="t">${esc(prev.title)}</p></a>`:'<span></span>'}${next?`<a class="next" href="${epURL(next)}"><p class="k">下一集 →</p><p class="t">${esc(next.title)}</p></a>`:''}</nav></div>
        <aside class="ep-side"><div class="box"><h3>也可以在這些地方收聽</h3><div class="platforms">${(podcast.platforms||[]).map(([n,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join('')}<a href="${esc(e.link)}" target="_blank" rel="noopener">這一集的 Firstory 頁面</a></div></div>
          <div class="box"><h3>聽完想聊聊？</h3><p style="font-size:.95rem">1925 安心專線 24 小時都有人接。</p></div></aside>
      </div></div>`;
    coverFallback(root);
    const bp=root.querySelector('.big-player');bindControls(bp);
    if(current!==i){current=-1;audio.pause();audio.removeAttribute('src')}
    const s=saved();if(s&&s.id===e.id&&s.t>5){load(i,s.t,false);msg('上次聽到 '+fmt(s.t)+'，按播放就能接著聽。')}
    sync();window.scrollTo(0,0);
  }
  window.addEventListener('hashchange',()=>{if(page==='episode')renderEpisode()});

  function renderAll(){renderHome();renderList();if(page==='episode')renderEpisode()}
  renderAll();
  coverFallback();
  if(page==='podcast'||page==='home'){const s=saved();const i=s?episodes.findIndex(e=>e.id===s.id):-1;if(i>=0&&s.t>5){load(i,s.t,false);msg('上次聽到 '+fmt(s.t)+'，按播放鍵就能接著聽。')}}

  /* ── 自動同步 Firstory（免費版最多回傳 10 集，較舊的從快照補上） ── */
  const st=$('#feed-status');
  if(st) st.textContent='單集清單：備用快照（'+episodes.length+' 集）';
  if(podcast.rss&&page!=='notices'&&page!=='updates'&&page!=='about'){
    fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(podcast.rss)).then(r=>r.json()).then(d=>{
      if(d.status!=='ok'||!d.items||!d.items.length)return;
      const toText=h=>{const t=document.createElement('div');t.innerHTML=(h||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p>/gi,'\n\n');return (t.textContent||'').replace(/ /g,' ').split(/\n?📍/)[0].replace(/\n{3,}/g,'\n\n').trim()};
      const fresh=d.items.filter(it=>it.enclosure&&it.enclosure.link).map(it=>{
        const id=(it.link||'').split('/').pop();const old=episodes.find(e=>e.id===id)||{};
        const m=(it.title||'').match(/【\s*(EP\d+)\s*】/);const text=toText(it.description);
        return {id,title:it.title,no:m?m[1]:'',name:(it.title||'').replace(/【\s*EP\d+\s*】\s*/,''),date:(it.pubDate||'').slice(0,10),duration:+(it.enclosure.duration||old.duration||0),
          audio:it.enclosure.link,link:it.link,image:old.image||(it.thumbnail&&it.thumbnail!==podcast.cover?it.thumbnail:''),summary:old.summary||text.slice(0,90),body:old.body||text}});
      if(!fresh.length)return;
      episodes.forEach(e=>{if(!fresh.some(f=>f.id===e.id))fresh.push(e)});
      fresh.sort((a,b)=>b.date.localeCompare(a.date));
      const playing=current>=0?episodes[current].id:null;
      const before=episodes.map(e=>e.id).join();episodes=fresh;current=playing?episodes.findIndex(e=>e.id===playing):-1;
      if(st)st.textContent='單集清單：已自動同步 Firstory（'+episodes.length+' 集）';
      if(episodes.map(e=>e.id).join()!==before){renderHome();renderList();if(page==='episode'&&current<0)renderEpisode()}
    }).catch(()=>{});
  }
})();
