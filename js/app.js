var ST = {
  page:'home', prev:'home',
  imageData:null, result:null, selectedInjury:'',
  location:null, injuryGridInit:false,
  knowledgeTab:'all', rescueSubmitted:false
};

// ===== 页面导航 =====
function navTo(page, param){
  ST.prev = page==='back' ? ST.prev : ST.page;
  ST.page = page;
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  var el = document.getElementById('page-' + page);
  if(el) el.classList.add('active');
  window.scrollTo(0,0);

  if(page==='ai'){ ST.imageData=null;ST.result=null;ST.selectedInjury=''; resetAI(); }
  if(page==='rescue'){ initRescuePage(param); }
  if(page==='tracking'){ initTracking(); }
  if(page==='knowledge'){ ST.knowledgeTab = param||'all'; initKnowledge(); }
  if(page==='detail'){ initDetail(param); }
}

function navBack(){
  if(ST.page==='detail'){
    navTo('knowledge',ST.knowledgeTab);
  }else if(ST.page==='tracking'){
    navTo('home');
  }else{
    navTo('home');
  }
}

// ===== AI识别 =====
function resetAI(){
  document.getElementById('ai-step1').style.display='';
  document.getElementById('ai-step2').style.display='none';
  document.getElementById('ai-step3').style.display='none';
  document.getElementById('aiBottomBtns').style.display='none';
  document.getElementById('uploadPlaceholder').style.display='';
  document.getElementById('uploadPreview').style.display='none';
  document.getElementById('retakeBtn').style.display='none';
  document.getElementById('descSection').style.display='none';
  document.getElementById('analyzeBtn').disabled=true;
  document.getElementById('confidenceWarning').style.display='none';
  document.getElementById('dangerAlert').style.display='none';
  document.getElementById('resultSection').style.display='none';
  document.getElementById('descInput').value='';
  document.getElementById('fileInput').value='';
  ST.selectedInjury='';
  updateStepMarks(1);
}

function chooseImage(){
  document.getElementById('fileInput').click();
}

function onFileSelected(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    ST.imageData = ev.target.result;
    document.getElementById('uploadPlaceholder').style.display='none';
    var img = document.getElementById('uploadPreview');
    img.src = ST.imageData;
    img.style.display='';
    document.getElementById('retakeBtn').style.display='';
    document.getElementById('descSection').style.display='';
    document.getElementById('analyzeBtn').disabled=false;
  };
  reader.readAsDataURL(file);
}

function retakePhoto(){
  ST.imageData=null;
  document.getElementById('uploadPlaceholder').style.display='';
  document.getElementById('uploadPreview').style.display='none';
  document.getElementById('retakeBtn').style.display='none';
  document.getElementById('descSection').style.display='none';
  document.getElementById('analyzeBtn').disabled=true;
  document.getElementById('fileInput').value='';
}

function startAnalysis(){
  if(!ST.imageData) return;
  updateStepMarks(2);
  document.getElementById('ai-step1').style.display='none';
  document.getElementById('ai-step2').style.display='';
  document.getElementById('scanImage').src=ST.imageData;
  var fill = document.getElementById('progressFill');
  fill.style.width='0';
  var w=0;
  var timer = setInterval(function(){
    w+=Math.random()*12+4;
    if(w>=95){ w=95; clearInterval(timer); }
    fill.style.width=w+'%';
  },180);
  setTimeout(function(){
    clearInterval(timer);
    fill.style.width='100%';
    setTimeout(function(){ showResult(); },400);
  },2500);
}

function showResult(){
  updateStepMarks(3);
  document.getElementById('ai-step2').style.display='none';
  document.getElementById('ai-step3').style.display='';
  document.getElementById('aiBottomBtns').style.display='flex';

  document.getElementById('confidenceWarning').style.display='none';
  document.getElementById('dangerAlert').style.display='none';
  document.getElementById('resultSection').style.display='none';

  var desc = document.getElementById('descInput').value||'';
  var keyword = desc + ST.imageData;
  var injuryId=null, confidence=0.5;
  var types = KB.getInjuryTypes();
  for(var i=0;i<types.length;i++){
    if(keyword.indexOf(types[i].name)>=0){ injuryId=types[i].id; confidence=0.85; break; }
  }
  if(!injuryId){ injuryId='bleeding'; confidence=0.45; }

  if(confidence<0.7){
    buildManualSelect(types);
    document.getElementById('confidenceWarning').style.display='';
    return;
  }

  displayInjuryResult(injuryId, confidence);
}

function buildManualSelect(types){
  var html = '<div class="warning-text">图片无法精准识别，请手动选择伤情类型</div><div class="manual-select">';
  types.forEach(function(t){
    var sel = ST.selectedInjury===t.id ? ' selected' : '';
    html += '<span class="injury-option'+sel+'" data-id="'+t.id+'" onclick="onManualSelect(\''+t.id+'\')">'+t.name+'</span>';
  });
  html += '</div>';
  document.getElementById('confidenceWarning').innerHTML=html;
}

function onManualSelect(id){
  ST.selectedInjury=id;
  var detail = KB.getInjuryDetail(id);
  if(detail){
    displayInjuryResult(id, 0.85);
    document.getElementById('confidenceWarning').style.display='none';
  }
}

function displayInjuryResult(injuryId, confidence){
  var detail = KB.getInjuryDetail(injuryId);
  if(!detail) return;

  if(detail.isCritical){
    document.getElementById('dangerAlert').innerHTML='<div class="danger-header"><div class="danger-title">高风险伤情！</div></div><div class="danger-text">请保持冷静，立即点击下方按钮联系紧急救援！</div>';
    document.getElementById('dangerAlert').style.display='';
  }

  var badge = detail.isCritical ? '<span class="result-badge badge-danger">高危</span>' : '<span class="result-badge badge-normal">一般</span>';
  var confText = '置信度: ' + (confidence>=0.9?'≥90%':confidence<0.7?'<70%':'≥'+(confidence*100)+'%');
  var header = '<div class="result-header">'+badge+'<span class="result-confidence">'+confText+'</span></div>';
  header += '<div class="result-title">'+detail.name+'</div>';

  var steps = '<div class="guide-section"><div class="guide-title">急救指导步骤</div>';
  detail.steps.forEach(function(s,i){
    steps += '<div class="guide-step"><span class="guide-step-num">'+(i+1)+'</span><span class="guide-step-text">'+s+'</span></div>';
  });
  steps += '</div>';

  var prec = '';
  if(detail.precaution){
    prec = '<div class="guide-title" style="margin-top:10px">注意事项</div><div class="precaution-text">'+detail.precaution+'</div>';
  }

  document.getElementById('resultSection').innerHTML = header + steps + prec;
  document.getElementById('resultSection').style.display='';
}

function updateStepMarks(n){
  for(var i=1;i<=3;i++){
    var s = document.getElementById('step'+i+'-mark');
    if(i<=n) s.classList.add('active'); else s.classList.remove('active');
  }
  document.getElementById('step-line1').classList.toggle('active',n>=2);
  document.getElementById('step-line2').classList.toggle('active',n>=3);
}

// ===== 救援上报 =====
function initRescuePage(){
  getBrowserLocation();
  if(!ST.injuryGridInit){ buildInjuryGrid(); ST.injuryGridInit=true; }
}

function buildInjuryGrid(){
  var html = '';
  KB.getInjuryTypes().forEach(function(t){
    html += '<span class="injury-tag" data-id="'+t.id+'" onclick="event.currentTarget.classList.toggle(\'tag-active\');ST.selectedInjury=t.id">'+t.name+'</span>';
  });
  document.getElementById('injuryGrid').innerHTML=html;
}

function getBrowserLocation(){
  var info = document.getElementById('locationInfo');
  var detail = document.getElementById('locationDetail');
  var refresh = document.getElementById('refreshLocBtn');
  var getBtn = document.getElementById('getLocBtn');

  info.style.display='';
  detail.style.display='none';
  refresh.style.display='none';
  getBtn.style.display='none';

  if(!navigator.geolocation){
    detail.innerHTML='<div style="text-align:center;padding:20px;color:#E53935;font-size:14px">您的浏览器不支持定位功能</div>';
    detail.style.display='';
    info.style.display='none';
    return;
  }

  navigator.geolocation.getCurrentPosition(function(pos){
    ST.location = { lat:pos.coords.latitude, lng:pos.coords.longitude, alt:pos.coords.altitude||null };
    var h = '<div class="loc-item"><span class="loc-label">经度</span><span class="loc-value">'+ST.location.lng.toFixed(6)+'</span></div>';
    h += '<div class="loc-item"><span class="loc-label">纬度</span><span class="loc-value">'+ST.location.lat.toFixed(6)+'</span></div>';
    h += '<div class="loc-item"><span class="loc-label">海拔</span><span class="loc-value">'+(ST.location.alt!==null?ST.location.alt.toFixed(1)+'米':'未知')+'</span></div>';
    detail.innerHTML=h;
    info.style.display='none';
    detail.style.display='';
    refresh.style.display='';
  },function(){
    detail.innerHTML='<div style="text-align:center;padding:20px;color:#F57F17;font-size:14px">无法获取位置，请授权位置权限后重试</div>';
    detail.style.display='';
    info.style.display='none';
    getBtn.style.display='';
  },{enableHighAccuracy:true,timeout:10000});
}

function refreshLocation(){
  ST.location=null;
  document.getElementById('locationInfo').style.display='';
  document.getElementById('locationInfo').innerHTML='<div class="loc-loading"><div class="loc-spin"></div><span>正在获取位置...</span></div>';
  document.getElementById('locationDetail').style.display='none';
  document.getElementById('refreshLocBtn').style.display='none';
  document.getElementById('getLocBtn').style.display='none';
  getBrowserLocation();
}

function submitRescue(){
  if(!ST.selectedInjury){
    var tags = document.querySelectorAll('#injuryGrid .injury-tag.tag-active');
    if(tags.length>0) ST.selectedInjury = tags[0].dataset.id;
  }
  if(!ST.selectedInjury){ alert('请选择伤情类型'); return; }
  if(!ST.location){ alert('请先获取位置信息'); return; }

  var btn = document.getElementById('submitRescueBtn');
  btn.disabled=true;
  btn.textContent='提交中...';

  setTimeout(function(){
    btn.disabled=false;
    btn.textContent='提交救援请求';
    ST.rescueSubmitted=true;
    ST.rescueInjury = ST.selectedInjury;
    ST.rescueTime = new Date();
    ST.rescueCaseId = 'WEB' + Date.now().toString(36).toUpperCase();
    navTo('tracking');
  },1500);
}

// ===== 救援追踪 =====
function initTracking(){
  if(!ST.rescueSubmitted){
    ST.rescueCaseId='DEMO001';
    ST.rescueInjury='bleeding';
    ST.rescueTime=new Date();
  }

  var injuryName='---';
  var types=KB.getInjuryTypes();
  for(var i=0;i<types.length;i++){ if(types[i].id===ST.rescueInjury){ injuryName=types[i].name;break; } }

  var t=ST.rescueTime;
  var ts=(t.getMonth()+1)+'/'+t.getDate()+' '+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');
  document.getElementById('trackingCase').textContent='案件编号：'+ST.rescueCaseId;
  document.getElementById('infoInjury').textContent=injuryName;
  document.getElementById('infoTime').textContent=ts;
  var locStr = ST.location ? ST.location.lat.toFixed(6)+', '+ST.location.lng.toFixed(6) : '---';
  document.getElementById('infoLoc').textContent=locStr;

  buildTimeline(ts);
  simulateTracking();
}

function buildTimeline(startTime){
  var items=[
    {text:'救援请求已提交', time:startTime},
    {text:'救援团队已接收', time:''},
    {text:'救援人员已出发', time:''},
    {text:'救援人员正在赶往现场', time:''},
    {text:'救援到达', time:''}
  ];
  var html='';
  items.forEach(function(it,i){
    var cls = i===0 ? ' tl-active tl-current' : '';
    var dot = i===0 ? '<div class="tl-dot-pulse"></div>' : '';
    html += '<div class="tl-item'+cls+'"><div class="tl-dot">'+dot+'</div><div class="tl-time">'+it.time+'</div><div class="tl-text">'+it.text+'</div></div>';
  });
  document.getElementById('timelineContainer').innerHTML=html;
  document.getElementById('trackingTitle').textContent='救援请求已提交';
}

function simulateTracking(){
  var steps=[{d:3000,i:1,t:'救援请求已提交 → 救援团队已接收'},{d:8000,i:2,t:'救援人员已出发'},{d:15000,i:3,t:'救援人员正在赶往现场'},{d:25000,i:4,t:'救援已到达'}];
  steps.forEach(function(s){
    setTimeout(function(){
      var items=document.querySelectorAll('.tl-item');
      var now=new Date();
      var ts=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
      for(var j=0;j<=s.i;j++){
        items[j].classList.add('tl-active');
        var timeEl=items[j].querySelector('.tl-time');
        if(!timeEl.textContent) timeEl.textContent=ts;
      }
      if(s.i>0){ items[s.i-1].classList.remove('tl-current'); items[s.i-1].querySelector('.tl-dot').querySelector('.tl-dot-pulse')?.remove(); }
      items[s.i].classList.add('tl-current');
      if(s.i<4){
        var dot=items[s.i].querySelector('.tl-dot');
        if(!dot.querySelector('.tl-dot-pulse')){ var pulse=document.createElement('div'); pulse.className='tl-dot-pulse'; dot.appendChild(pulse); }
      }
      document.getElementById('trackingTitle').textContent=s.t;
    },s.d);
  });
}

function callRescue(){ window.location.href='tel:120'; }
function cancelRescue(){
  if(confirm('确定要取消本次救援请求吗？')){ alert('救援请求已取消'); navTo('home'); }
}

// ===== 知识库 =====
function initKnowledge(){
  var tabs = document.querySelectorAll('#page-knowledge .tab');
  tabs.forEach(function(t){ t.classList.toggle('active', t.getAttribute('onclick').indexOf("'"+ST.knowledgeTab+"'")>=0); });
  var articles = ST.knowledgeTab==='all' ? KB.getAll() : KB.getByCat(ST.knowledgeTab);
  if(articles.length===0){
    document.getElementById('articleList').innerHTML='';
    document.getElementById('emptyTip').style.display='';
    return;
  }
  document.getElementById('emptyTip').style.display='none';
  var html='';
  articles.forEach(function(a){
    var tag = KB.getCatName(a.category);
    var tc = 'meta-tag-' + KB.getTagClass(a.category);
    html += '<div class="article-card" onclick="navTo(\'detail\',\''+a.id+'\')"><span class="article-icon">'+a.icon+'</span><div class="article-info"><div class="article-title">'+a.title+'</div><div class="article-summary">'+a.summary+'</div><div class="article-meta"><span class="meta-tag '+tc+'">'+tag+'</span><span class="meta-read">点击查看详情 →</span></div></div></div>';
  });
  document.getElementById('articleList').innerHTML=html;
}

function switchKnowledgeTab(tab){
  ST.knowledgeTab=tab;
  initKnowledge();
}

function initDetail(id){
  var a = KB.getById(id);
  if(!a) return;
  var tag = KB.getCatName(a.category);
  var tc = 'meta-tag-' + KB.getTagClass(a.category);
  var html = '<div class="article-header"><div class="article-icon">'+a.icon+'</div><div class="article-title">'+a.title+'</div><span class="article-tag '+tc+'">'+tag+'</span></div>';
  if(a.overview) html += '<div class="section"><div class="section-title">概述</div><div class="section-text">'+a.overview+'</div></div>';
  if(a.symptoms&&a.symptoms.length>0){
    html += '<div class="section"><div class="section-title">识别特征</div>';
    a.symptoms.forEach(function(s){ html += '<div class="list-item">'+s+'</div>'; });
    html += '</div>';
  }
  html += '<div class="section"><div class="section-title">急救步骤</div>';
  a.steps.forEach(function(s,i){ html += '<div class="step-card"><div class="step-num">'+(i+1)+'</div><div class="step-text">'+s+'</div></div>'; });
  html += '</div>';
  if(a.precaution&&a.precaution.length>0){
    html += '<div class="section"><div class="section-title">注意事项</div><div class="precaution-box">';
    a.precaution.forEach(function(p){ html += '<div class="precaution-item">'+p+'</div>'; });
    html += '</div></div>';
  }
  document.getElementById('detailContent').innerHTML=html;
}