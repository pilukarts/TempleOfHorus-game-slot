const COLS=7,TYPES=["𓂀","𓆣","𓋹","☀","◆","𓅃"],BONUS_MIN=3,BONUS_MAX=6;
const $=s=>document.querySelector(s),rand=n=>Math.floor(Math.random()*n),wait=ms=>new Promise(r=>setTimeout(r,ms));
let score=0,displayedScore=0,level=1,combos=0,eyes=0,busy=false,inBonus=false,soundOn=true,audioCtx=null,musicTimer=null,musicStep=0,musicStarted=false,bonusPower=0;
const randomType=()=>rand(Math.min(TYPES.length,4+Math.floor(level/3))),makeRow=()=>Array.from({length:COLS},randomType);
let nextRow=makeRow(),chosen=randomType(),boardEl=$("#board");

function audio(){if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;audioCtx=new C()}if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function note(freq,d=.3,volume=.015,type="triangle",delay=0){if(!soundOn)return;const c=audio(),at=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(.001,at);g.gain.exponentialRampToValueAtTime(volume,at+.025);g.gain.exponentialRampToValueAtTime(.001,at+d);o.connect(g).connect(c.destination);o.start(at);o.stop(at+d+.03)}
function drum(volume=.025){if(!soundOn)return;const c=audio(),at=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.setValueAtTime(95,at);o.frequency.exponentialRampToValueAtTime(42,at+.16);g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.001,at+.18);o.connect(g).connect(c.destination);o.start(at);o.stop(at+.2)}
function tone(freq=440,d=.08,volume=.05){note(freq,d,volume,"sine")}
const MUSIC_SCALE=[146.83,155.56,185,196,220,233.08,277.18],MUSIC_PATTERN=[0,1,2,1,4,3,2,1,0,2,5,4,3,2,1,6];
function musicPulse(){
  if(!soundOn){musicTimer=null;return}
  const intensity=inBonus?(bonusPower===BONUS_MAX?3:2):eyes>=3?1:0,index=MUSIC_PATTERN[musicStep%MUSIC_PATTERN.length],freq=MUSIC_SCALE[index];
  if(musicStep%2===0)note(freq,intensity>=2?.38:.5,intensity===3?.085:intensity===2?.065:.042,"triangle");
  if(musicStep%8===0)note(MUSIC_SCALE[0]/2,1.6,.02,"sine");
  if(intensity>0&&musicStep%2===0)drum(intensity===3?.105:intensity===2?.075:.035);
  if(intensity>=2&&musicStep%4===2)note(freq*2,.22,intensity===3?.038:.024,"square");
  if(intensity===3&&musicStep%4===0){note(freq*1.5,.32,.034,"sawtooth");drum(.065)}
  musicStep++;musicTimer=setTimeout(musicPulse,intensity===3?185:intensity===2?210:intensity===1?285:390)
}
function startMusic(){musicStarted=true;if(musicTimer||!soundOn||document.hidden)return;audio();musicPulse()}
function stopMusic(){clearTimeout(musicTimer);musicTimer=null}

const MAX_BALLS=63;
let balls=[],nextBallId=0,worldWidth=0,worldHeight=0,ballRadius=0,lastFrame=0;

function measureBoard(){
  const width=boardEl.clientWidth,height=boardEl.clientHeight;
  if(!width||!height)return;
  if(worldWidth){
    for(const ball of balls){ball.x*=width/worldWidth;ball.y*=height/worldHeight;ball.vx*=width/worldWidth;ball.vy*=height/worldHeight}
  }
  worldWidth=width;worldHeight=height;ballRadius=Math.min((width-12)/14.5,(height-12)/18.5);
  for(const ball of balls){ball.el.style.setProperty("--ball-size",`${ballRadius*2}px`);positionBall(ball)}
}
function positionBall(ball){
  ball.el.style.transform=`translate3d(${ball.x-ballRadius}px,${ball.y-ballRadius}px,0) rotate(${ball.angle}deg)`
}
function physicsStep(dt){
  const active=balls.filter(ball=>!ball.removing),radius=ballRadius;
  for(const ball of active){
    ball.vy=Math.min(ball.vy+1350*dt,1100);
    ball.vx*=.997;ball.vy*=.998;
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    ball.angle+=ball.vx*dt*.22;
    if(ball.x<radius){ball.x=radius;ball.vx=Math.abs(ball.vx)*.22}
    if(ball.x>worldWidth-radius){ball.x=worldWidth-radius;ball.vx=-Math.abs(ball.vx)*.22}
    if(ball.y>worldHeight-radius){ball.y=worldHeight-radius;ball.vy=-Math.abs(ball.vy)*.18;ball.vx*=.93}
  }
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++){
    const a=active[i],b=active[j],dx=b.x-a.x,dy=b.y-a.y,dist2=dx*dx+dy*dy,min=radius*2;
    if(dist2>=min*min)continue;
    const dist=Math.max(Math.sqrt(dist2),.001),nx=dx/dist,ny=dy/dist,overlap=(min-dist)*.5;
    a.x-=nx*overlap;b.x+=nx*overlap;a.y-=ny*overlap;b.y+=ny*overlap;
    const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
    if(relative<0){const impulse=-(1.18)*relative*.5;a.vx-=impulse*nx;a.vy-=impulse*ny;b.vx+=impulse*nx;b.vy+=impulse*ny}
  }
  for(const ball of active){
    ball.x=Math.max(radius,Math.min(worldWidth-radius,ball.x));
    ball.y=Math.min(worldHeight-radius,ball.y);
  }
}
function physicsFrame(now){
  if(!lastFrame)lastFrame=now;
  const elapsed=Math.min((now-lastFrame)/1000,.04);lastFrame=now;
  if(!document.hidden&&worldWidth&&balls.length){
    physicsStep(elapsed/2);physicsStep(elapsed/2);
    for(const ball of balls)if(!ball.removing)positionBall(ball)
  }
  requestAnimationFrame(physicsFrame)
}
function spawnBall(type,x){
  if(!worldWidth)measureBoard();
  const el=document.createElement("div");el.className="physics-ball";
  el.style.setProperty("--ball-size",`${ballRadius*2}px`);
  el.innerHTML=relic(type);
  const ball={id:++nextBallId,type,x:Math.max(ballRadius,Math.min(worldWidth-ballRadius,x)),y:-ballRadius*(1+Math.random()*.5),vx:(Math.random()-.5)*125,vy:45+Math.random()*70,angle:(Math.random()-.5)*35,el,removing:false};
  boardEl.append(el);balls.push(ball);positionBall(ball);
  tone(230+type*32,.07,.025);
  return ball
}
function relic(type,extra=""){return type===null?"":`<span class="relic ${extra}" data-type="${type}">${TYPES[type]}</span>`}
function eyeSlots(container,count){container.innerHTML=Array.from({length:count},(_,i)=>`<span class="horus-eye-slot ${i<eyes?"lit":""}">𓂀</span>`).join("")}
function render(){
  $("#nextRow").innerHTML=nextRow.map(type=>relic(type,"preview")).join("");
  $("#chosenRelic").outerHTML=`<span id="chosenRelic" class="relic preview" data-type="${chosen}">${TYPES[chosen]}</span>`;
  eyeSlots($("#eyesLeft"),3);eyeSlots($("#eyesRight"),3);eyeSlots($("#eyesMobile"),6);updateHud()
}
function updateHud(){
  $("#score").textContent=displayedScore.toLocaleString("es");$("#level").textContent=level;$("#combos").textContent=combos;
  $(".temple").classList.toggle("eye-tension",eyes>0);$(".temple").classList.toggle("bonus-max",eyes===BONUS_MAX)
}
async function showScoreReward(amount){
  if(amount<=0){displayedScore=score;updateHud();return}
  const reward=$("#scoreReward"),start=displayedScore,target=score;
  reward.innerHTML=`<strong>${amount.toLocaleString("es")}</strong>`;
  reward.classList.remove("show");void reward.offsetWidth;reward.classList.add("show");tone(880,.18,.07);
  await wait(1450);
  const duration=550,began=performance.now();
  await new Promise(done=>{
    function tick(now){
      const t=Math.min(1,(now-began)/duration),eased=1-Math.pow(1-t,3);
      displayedScore=Math.round(start+(target-start)*eased);updateHud();
      if(t<1)requestAnimationFrame(tick);else done()
    }
    requestAnimationFrame(tick)
  });
  displayedScore=score;updateHud();await wait(80);reward.classList.remove("show")
}
async function settle(maxMs=1700){
  const start=performance.now();let quiet=0;
  while(performance.now()-start<maxMs){
    await wait(100);
    const moving=balls.some(b=>!b.removing&&(b.y<ballRadius||Math.abs(b.vy)>36||Math.abs(b.vx)>32));
    quiet=moving?0:quiet+100;
    if(quiet>=300)return
  }
}
function matchingGroups(){
  const groups=[],seen=new Set(),threshold=ballRadius*2+3;
  for(const first of balls){
    if(first.removing||seen.has(first.id))continue;
    const group=[],stack=[first];seen.add(first.id);
    while(stack.length){
      const a=stack.pop();group.push(a);
      for(const b of balls){
        if(b.removing||seen.has(b.id)||b.type!==a.type)continue;
        const dx=b.x-a.x,dy=b.y-a.y;
        if(dx*dx+dy*dy>threshold*threshold)continue;
        seen.add(b.id);stack.push(b)
      }
    }
    if(group.length>=3)groups.push({type:first.type,items:group})
  }
  return groups
}
async function removeBalls(items){
  for(const ball of items){ball.removing=true;ball.el.classList.add("pop")}
  await wait(380);
  const ids=new Set(items.map(ball=>ball.id));
  for(const ball of items)ball.el.remove();
  balls=balls.filter(ball=>!ids.has(ball.id))
}
function newChosen(){let n=randomType();while(n===chosen)n=randomType();chosen=n}
async function resolve(){
  let chain=0;
  while(true){
    await settle(1150);
    const groups=matchingGroups();if(!groups.length)break;chain++;
    tone(520+chain*90,.14);
    let earnedEyes=0,targetHit=false;
    const matched=groups.flatMap(g=>g.items);
    groups.forEach(g=>{
      const size=g.items.length,base=size*100*chain*level;
      score+=base;if(g.type===chosen){score+=base;targetHit=true}
      if(size>=4)earnedEyes+=Math.min(3,size-3)
    });
    await removeBalls(matched);
    if(earnedEyes){eyes=Math.min(BONUS_MAX,eyes+earnedEyes);$("#message").textContent=`𓂀 ¡${earnedEyes} Ojo${earnedEyes>1?"s":""} despierta${earnedEyes>1?"n":""}!`;tone(640+eyes*55,.28,.07)}
    if(targetHit){$("#message").textContent="¡Reliquia Elegida! Puntuación duplicada.";newChosen()}
    combos+=groups.length;render()
  }
  level=1+Math.floor(score/5000);render();if(eyes>=BONUS_MIN&&!inBonus)await bonusMode(eyes)
}
function availableSpace(count){return balls.length+count<=MAX_BALLS}
async function spin(){
  if(busy)return;if(!availableSpace(COLS)){gameOver();return}
  busy=true;const scoreBefore=score;$("#message").textContent="Siete reliquias libres caen al templo…";
  const incoming=[...nextRow];nextRow=makeRow();render();
  const order=Array.from({length:COLS},(_,col)=>col);
  for(let i=order.length-1;i>0;i--){const j=rand(i+1);[order[i],order[j]]=[order[j],order[i]]}
  for(const col of order){
    const x=worldWidth*(col+.5)/COLS+(Math.random()-.5)*ballRadius*.8;
    spawnBall(incoming[col],x);await wait(90+rand(95))
  }
  await settle(1900);await resolve();await showScoreReward(score-scoreBefore);busy=false;checkEnd()
}
async function bonusDrop(){
  if(!availableSpace(1))return false;
  spawnBall(randomType(),ballRadius+Math.random()*(worldWidth-ballRadius*2));
  await settle(1500);await resolve();return true
}
async function superBonusRain(){
  const incoming=Array.from({length:12},randomType),spiral=$("#superSpiral");
  spiral.querySelector(".spiral-orbs").innerHTML=incoming.map((type,i)=>
    `<span class="relic spiral-orb" data-type="${type}" style="--i:${i}">${TYPES[type]}</span>`).join("");
  spiral.classList.add("active");
  $("#message").textContent="¡SUPER BONUS! Las doce reliquias giran alrededor del Ojo de Horus.";
  tone(740,.28,.07);note(1110,.6,.045,"triangle",.1);
  await wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches?550:2300);
  spiral.classList.remove("active");
  const needed=Math.max(0,balls.length+incoming.length-MAX_BALLS);
  if(needed)await removeBalls([...balls].sort((a,b)=>a.y-b.y).slice(0,needed));
  for(const type of incoming){
    spawnBall(type,ballRadius+Math.random()*(worldWidth-ballRadius*2));
    await wait(110+rand(80))
  }
  await settle(2200);await resolve()
}
async function bonusMode(power){
  inBonus=true;bonusPower=power;eyes=0;$("#bonusChute").classList.add("active");$(".temple").classList.add("bonus-active");
  $("#message").textContent=`¡CANAL DE HORUS! Bonus de ${power} Ojos: ${power*2} reliquias.`;
  tone(760,.38,.08);render();await wait(750);
  if(power===BONUS_MAX)await superBonusRain();
  else for(let i=0;i<power*2;i++){if(!await bonusDrop())break;await wait(140)}
  $("#bonusChute").classList.remove("active");$(".temple").classList.remove("bonus-active");
  score+=power*500*level;inBonus=false;bonusPower=0;render();
  $("#message").textContent=power===BONUS_MAX?"¡BONUS MÁXIMO! El templo ha despertado.":"El Canal se cierra. Continúa la expedición."
}
function gameOver(){busy=true;$("#message").textContent="El templo está sellado. Toca aquí para comenzar de nuevo.";$("#message").onclick=reset}
function checkEnd(){if(!availableSpace(COLS))gameOver()}
function reset(){
  for(const ball of balls)ball.el.remove();balls=[];
  score=0;displayedScore=0;level=1;combos=0;eyes=0;nextRow=makeRow();newChosen();busy=false;inBonus=false;bonusPower=0;
  $("#message").onclick=null;$("#message").textContent="Pulsa SPIN: caerán siete reliquias independientes.";render()
}
measureBoard();
if("ResizeObserver" in window)new ResizeObserver(measureBoard).observe(boardEl);
else window.addEventListener("resize",measureBoard);
requestAnimationFrame(physicsFrame);

$("#intro").classList.remove("hidden","opening","is-loading");$("#dropButton").onclick=spin;$("#sound").onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?"♫":"×";e.currentTarget.setAttribute("aria-label",soundOn?"Silenciar música y sonido":"Activar música y sonido");if(soundOn)startMusic();else stopMusic()};$("#start").onclick=async e=>{
  const intro=$("#intro"),bar=$("#loadingBar"),label=$("#loadingLabel");
  e.currentTarget.disabled=true;startMusic();
  $("#studioSplash").hidden=true;$("#templeSplash").hidden=false;intro.classList.add("is-loading");
  const stages=[[18,"LOADING RELICS"],[43,"AWAKENING THE EYE"],[69,"LIGHTING THE TORCHES"],[88,"OPENING THE MAP"],[100,"CHOOSE YOUR WORLD"]];
  for(const [progress,text] of stages){bar.style.width=progress+"%";label.textContent=text;tone(300+progress*3,.08,.018);await wait(progress===100?500:330)}
  intro.classList.add("opening");await wait(720);intro.classList.add("hidden");
  $("#worldMap").classList.remove("hidden");
};$("#enterHorus").onclick=()=>{$("#worldMap").classList.add("hidden");$("#message").textContent="Pulsa SPIN: caerá una fila completa.";render()};document.addEventListener("visibilitychange",()=>{if(document.hidden)stopMusic();else if(soundOn&&musicStarted)startMusic()});render();
