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
  const cur=page==='episode'?'podcast':page==='notice'?'notices':page==='update'?'updates':page;
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

  /* ── 公告 ──
     內容存在 data/notices.json，由刊登後台（/admin）編輯。
     公告分「最新」和「一般」：置頂的優先，再由上往下補，合計前 hot_count 則（預設 5）。「放進首頁輪播」關掉可排除。
     「上架」關掉的公告不會出現；網址加上 ?preview 可以先預覽。 */
  const PREVIEW=/[?&]preview\b/.test(location.search);
  /* 讀 data/*.json（刊登後台存的檔案）。加時間參數，避免瀏覽器拿到舊的快取。 */
  const getJSON=f=>fetch(f+'?t='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw r.status;return r.json()});
  function loadNotices(){
    return getJSON('data/notices.json').then(d=>{
      if(d.hot_count)window.NOTICE_HOT_COUNT=d.hot_count;
      return (d.notices||[]).map((n,k)=>({id:String(n.id||'n'+k),date:n.date_text||n.date||'',status:n.status||(n.published===false?'下架':'上架'),type:n.type||'',title:n.title||'',summary:n.summary||'',body:n.body||'',
        images:(n.images||[]).map(i=>typeof i==='string'?{src:i,cap:''}:{src:i.src||'',cap:i.cap||''}).filter(i=>i.src),
        links:(n.links||[]).filter(l=>l&&l.url),pinned:!!n.pinned,published:n.status?n.status==='上架':n.published!==false,hot:n.hot!==false}));
    }).catch(()=>[]);
  }
  const noticeURL=n=>'notice.html'+(PREVIEW?'?preview':'')+'#'+encodeURIComponent(n.id);
  const plain=n=>{if(n.summary)return n.summary;const t=String(n.body||'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/[#*_>`~]+/g,'').replace(/\s+/g,' ').trim();return t.length>80?t.slice(0,80)+'…':t};
  /* 公告內容（後台的 Markdown）轉成網頁：段落、換行、## 小標、**粗體**、*斜體*、條列、編號、> 引言、[連結](網址)、![圖說](圖片) */
  const inline=s=>esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g,(m,a,u)=>`<img src="${u}" alt="${a}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g,(m,t,u)=>`<a href="${u}"${/^https?:/.test(u)?' target="_blank" rel="noopener"':''}>${t}</a>`)
    .replace(/(^|[\s（(])(https?:\/\/[^\s<>"）)]+)/g,(m,p,u)=>`${p}<a href="${u}" target="_blank" rel="noopener">${u.length>48?u.slice(0,46)+'…':u}</a>`)
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g,(m,a,b)=>`<strong>${a||b}</strong>`)
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g,'$1<em>$2</em>')
    .replace(/\\([\\`*_{}\[\]()#+\-.!>])/g,'$1');
  function md(src){
    return String(src||'').replace(/\r/g,'').trim().split(/\n\s*\n/).map(b=>{
      const ls=b.split('\n');
      const h=b.match(/^(#{1,4})\s+(.*)$/);if(h&&ls.length===1){const lv=Math.min(4,h[1].length+1);return `<h${lv}>${inline(h[2])}</h${lv}>`}
      if(ls.every(l=>/^\s*[-*+・•]\s+/.test(l)))return '<ul>'+ls.map(l=>'<li>'+inline(l.replace(/^\s*[-*+・•]\s+/,''))+'</li>').join('')+'</ul>';
      if(ls.every(l=>/^\s*\d+[.)]\s+/.test(l)))return '<ol>'+ls.map(l=>'<li>'+inline(l.replace(/^\s*\d+[.)]\s+/,''))+'</li>').join('')+'</ol>';
      if(ls.every(l=>/^\s*>/.test(l)))return '<blockquote>'+ls.map(l=>inline(l.replace(/^\s*>\s?/,''))).join('<br>')+'</blockquote>';
      return '<p>'+ls.map(l=>inline(l.replace(/\s+$/,'').replace(/\\$/,''))).join('<br>')+'</p>'}).join('');
  }
  const strip=$('#board-strip'),nl=$('#notice-list'),rn=$('#recent-notices'),nd=$('#notice');
  if(strip||nl||rn||nd){
    if(nl)nl.innerHTML='<p class="loading">公告載入中…</p>';
    loadNotices().then(all=>{
      const notices=all.filter(n=>n.published||PREVIEW).map((n,k)=>Object.assign({},n,{_k:k})).sort((a,b)=>((b.pinned?1:0)-(a.pinned?1:0))||a._k-b._k);
      const HOT=+(window.NOTICE_HOT_COUNT||5);
      notices.filter(n=>n.hot&&n.published).slice(0,HOT).forEach(n=>n._hot=true);
      const hot=notices.filter(n=>n._hot);
      const badge=n=>n.published?'':`<b class="off">${n.status==='下架'?'已下架':'草稿'}</b>`;
      /* 首頁公告輪播：只播「最新」公告，每 5 秒自動換下一則 */
      if(strip&&strip.querySelector('.nb-view')&&hot.length){
        const view=strip.querySelector('.nb-view'),count=strip.querySelector('.nb-count');
        view.innerHTML=hot.map((n,k)=>`<a class="nb-slide${k?'':' on'}" href="${noticeURL(n)}" ${k?'tabindex="-1" aria-hidden="true"':''}><time>${esc(n.date)}</time><span class="t">${n.pinned?'<b class="pin">置頂</b>':''}${esc(n.title)}</span></a>`).join('');
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
      if(nl){
        const cats=['全部','最新','一般',...new Set(notices.map(n=>n.type).filter(Boolean))];
        let sel='全部';const fl=$('#notice-filters');
        const match=n=>sel==='全部'||(sel==='最新'&&n._hot)||(sel==='一般'&&!n._hot)||n.type===sel;
        const draw=()=>{const list=notices.filter(match);
          nl.innerHTML=list.length?list.map(n=>`<a class="list-row${n.pinned?' pinned':''}" id="n-${esc(n.id)}" href="${noticeURL(n)}"><time>${esc(n.date)}</time><span class="tag">${esc(n.type||'')}</span>
          <h3>${badge(n)}${n._hot&&!n.pinned?'<b class="new">最新</b>':''}${esc(n.title)}</h3><p>${esc(plain(n))}<span class="more">看完整公告</span></p></a>`).join(''):'<p style="padding:24px 0">目前沒有這類公告。</p>'};
        if(fl){fl.innerHTML=cats.map((c,k)=>`${k===3?'<span class="sep" aria-hidden="true"></span>':''}<button type="button" aria-pressed="${c===sel}">${esc(c)}</button>`).join('');
          fl.onclick=e=>{const b=e.target.closest('button');if(!b)return;sel=b.textContent;fl.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));draw()}}
        draw();
        /* 舊連結 notices.html#n0 轉到詳細頁 */
        const m=location.hash.match(/^#n(\d+)$/);if(m){const t=all.find(n=>n.id==='n'+m[1]);if(t)location.replace(noticeURL(t))}
      }
      if(rn) rn.innerHTML=notices.slice(0,3).map(n=>`<a class="list-row" href="${noticeURL(n)}"><time>${esc(n.date)}</time><h3>${esc(n.title)}</h3></a>`).join('');
      if(nd){
        const draw=()=>{
          const id=decodeURIComponent(location.hash.slice(1));const n=notices.find(x=>x.id===id);
          if(!n){document.title='公告｜出勤之後';nd.innerHTML='<div class="wrap nd-empty"><p>這則公告已經下架，或是網址不完整。</p><a class="btn outline" href="notices.html">看所有公告</a></div>';return}
          document.title=n.title+'｜出勤之後';
          const [hero,...rest]=n.images;
          const others=notices.filter(x=>x!==n).slice(0,4);
          nd.innerHTML=`<article class="nd"><div class="wrap nd-grid">
            <div class="nd-main">
              <a class="nd-back" href="notices.html">← 所有公告</a>
              ${n.published?'':`<p class="nd-preview">這是預覽：這則公告目前是「${esc(n.status)}」，一般訪客看不到。</p>`}
              <p class="nd-meta">${n.type?`<span class="tag">${esc(n.type)}</span>`:''}${n.pinned?'<b class="pin">置頂</b>':''}<time>${esc(n.date)}</time></p>
              <h1>${esc(n.title)}</h1>
              ${n.summary?`<p class="nd-lead">${esc(n.summary)}</p>`:''}
              ${hero?`<figure class="nd-hero"><img src="${esc(hero.src)}" alt="${esc(hero.cap||n.title)}">${hero.cap?`<figcaption>${esc(hero.cap)}</figcaption>`:''}</figure>`:''}
              <div class="nd-text">${md(n.body||n.summary)}</div>
              ${rest.length?`<div class="nd-gallery">${rest.map(i=>`<figure><a href="${esc(i.src)}" target="_blank" rel="noopener"><img src="${esc(i.src)}" alt="${esc(i.cap||'')}" loading="lazy"></a>${i.cap?`<figcaption>${esc(i.cap)}</figcaption>`:''}</figure>`).join('')}</div>`:''}
              ${n.links.length?`<div class="nd-links">${n.links.map((l,k)=>`<a class="btn ${k?'outline':'primary'}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.text||'前往連結')}</a>`).join('')}</div>`:''}
            </div>
            <aside class="nd-side">${others.length?`<h3>其他公告</h3><ul>${others.map(x=>`<li><a href="${noticeURL(x)}"><time>${esc(x.date)}</time><span>${esc(x.title)}</span></a></li>`).join('')}</ul><a class="arrow-link" href="notices.html">全部公告</a>`:''}
              <div class="box"><h3>需要聊聊</h3><p>1925 安心專線 24 小時都有人接。</p></div></aside>
          </div></article>`;
          window.scrollTo(0,0);
        };
        draw();window.addEventListener('hashchange',draw);
      }
    });
  }

  /* ── 最新動態 ──
     列表在 updates.html，每則點進去是 update.html#代號（跟公告一樣）。網址加 ?preview 可以看草稿和下架的。 */
  const ul=$('#update-list'),ru=$('#recent-updates'),ud=$('#update');
  const updateURL=u=>'update.html'+(PREVIEW?'?preview':'')+'#'+encodeURIComponent(u.id);
  if(ul||ru||ud) getJSON('data/updates.json').then(d=>{
    const updates=(d.updates||[]).map((u,k)=>Object.assign({},u,{id:String(u.id||'u'+k),date:u.date_text||u.date||'',
      published:u.status?u.status==='上架':u.published!==false,status:u.status||'上架',
      images:(u.images||[]).filter(i=>i&&i.src),links:(u.links||[]).filter(l=>l&&l.url)})).filter(u=>u.published||PREVIEW);
    const excerpt=u=>{const t=String(u.body||'').replace(/^\s*([-*+・•]|\d+[.)])\s+/gm,'').replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/[#*_>`~]+/g,'').replace(/\s+/g,' ').trim();return t.length>90?t.slice(0,90)+'…':t};
    if(ul) ul.innerHTML=updates.map(u=>`<li><div><p class="when">${esc(u.date)}</p>${u.tag?`<span class="tag">${esc(u.tag)}</span>`:''}</div>
      <a class="u-item" href="${updateURL(u)}">${u.images[0]?`<span class="u-thumb"><img src="${esc(u.images[0].src)}" alt="" loading="lazy"></span>`:''}
        <span class="u-main"><h3>${u.published?'':`<b class="off">${u.status==='下架'?'已下架':'草稿'}</b>`}${esc(u.title)}</h3>${excerpt(u)?`<p>${esc(excerpt(u))}</p>`:''}<span class="more">看完整內容</span></span></a></li>`).join('');
    if(ru) ru.innerHTML=updates.filter(u=>u.published).slice(0,3).map(u=>`<a class="list-row" href="${updateURL(u)}"><time>${esc(u.date)}</time><h3>${esc(u.title)}</h3></a>`).join('');
    if(ud){
      const draw=()=>{
        const id=decodeURIComponent(location.hash.slice(1));const u=updates.find(x=>x.id===id);
        if(!u){document.title='最新動態｜出勤之後';ud.innerHTML='<div class="wrap nd-empty"><p>這則動態已經下架，或是網址不完整。</p><a class="btn outline" href="updates.html">看所有動態</a></div>';return}
        document.title=u.title+'｜出勤之後';
        const [hero,...rest]=u.images;const others=updates.filter(x=>x!==u&&x.published).slice(0,4);
        ud.innerHTML=`<article class="nd"><div class="wrap nd-grid">
          <div class="nd-main">
            <a class="nd-back" href="updates.html">← 所有動態</a>
            ${u.published?'':`<p class="nd-preview">這是預覽：這則動態目前是「${esc(u.status)}」，一般訪客看不到。</p>`}
            <p class="nd-meta">${u.tag?`<span class="tag">${esc(u.tag)}</span>`:''}<time>${esc(u.date)}</time></p>
            <h1>${esc(u.title)}</h1>
            ${hero?`<figure class="nd-hero"><img src="${esc(hero.src)}" alt="${esc(hero.cap||u.title)}">${hero.cap?`<figcaption>${esc(hero.cap)}</figcaption>`:''}</figure>`:''}
            <div class="nd-text">${md(u.body)}</div>
            ${rest.length?`<div class="nd-gallery">${rest.map(i=>`<figure><a href="${esc(i.src)}" target="_blank" rel="noopener"><img src="${esc(i.src)}" alt="${esc(i.cap||'')}" loading="lazy"></a>${i.cap?`<figcaption>${esc(i.cap)}</figcaption>`:''}</figure>`).join('')}</div>`:''}
            ${u.links.length?`<div class="nd-links">${u.links.map((l,k)=>`<a class="btn ${k?'outline':'primary'}" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.text||'前往連結')}</a>`).join('')}</div>`:''}
          </div>
          <aside class="nd-side">${others.length?`<h3>其他動態</h3><ul>${others.map(x=>`<li><a href="${updateURL(x)}"><time>${esc(x.date)}</time><span>${esc(x.title)}</span></a></li>`).join('')}</ul><a class="arrow-link" href="updates.html">全部動態</a>`:''}
            <div class="box"><h3>需要聊聊</h3><p>1925 安心專線 24 小時都有人接。</p></div></aside>
        </div></article>`;
        window.scrollTo(0,0);
      };
      draw();window.addEventListener('hashchange',draw);
    }
  }).catch(()=>{if(ud)ud.innerHTML='<div class="wrap nd-empty"><p>讀取失敗，請重新整理。</p></div>'});

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
  if(podcast.rss&&page!=='notices'&&page!=='notice'&&page!=='update'&&page!=='updates'&&page!=='about'){
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
