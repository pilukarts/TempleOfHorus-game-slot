const ROWS=9,COLS=7,TYPES=["𓂀","𓆣","𓋹","☀","◆","𓅃"],BONUS_MIN=3,BONUS_MAX=6;
const $=s=>document.querySelector(s),rand=n=>Math.floor(Math.random()*n),wait=ms=>new Promise(r=>setTimeout(r,ms));
let board=Array.from({length:ROWS},()=>Array(COLS).fill(null)),score=0,displayedScore=0,level=1,combos=0,eyes=0,busy=false,inBonus=false,soundOn=true,audioCtx=null,musicTimer=null,musicStep=0;
const randomType=()=>rand(Math.min(TYPES.length,4+Math.floor(level/3))),makeRow=()=>Array.from({length:COLS},randomType);
let nextRow=makeRow(),chosen=randomType(),boardEl=$("#board");

function audio(){if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;audioCtx=new C()}if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx}
function note(freq,d=.3,volume=.015,type="triangle",delay=0){if(!soundOn)return;const c=audio(),at=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(.001,at);g.gain.exponentialRampToValueAtTime(volume,at+.025);g.gain.exponentialRampToValueAtTime(.001,at+d);o.connect(g).connect(c.destination);o.start(at);o.stop(at+d+.03)}
function drum(volume=.025){if(!soundOn)return;const c=audio(),at=c.currentTime,o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.setValueAtTime(95,at);o.frequency.exponentialRampToValueAtTime(42,at+.16);g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.001,at+.18);o.connect(g).connect(c.destination);o.start(at);o.stop(at+.2)}
function tone(freq=440,d=.08,volume=.05){note(freq,d,volume,"sine")}
const MUSIC_SCALE=[146.83,155.56,185,196,220,233.08,277.18],MUSIC_PATTERN=[0,1,2,1,4,3,2,1,0,2,5,4,3,2,1,6];
function musicPulse(){
  if(!soundOn){musicTimer=null;return}
  const intensity=inBonus?2:eyes>=3?1:0,index=MUSIC_PATTERN[musicStep%MUSIC_PATTERN.length],freq=MUSIC_SCALE[index];
  if(musicStep%2===0)note(freq,intensity===2?.34:.5,intensity===2?.018:.011,"triangle");
  if(musicStep%8===0)note(MUSIC_SCALE[0]/2,1.6,.008,"sine");
  if(intensity>0&&musicStep%2===0)drum(intensity===2?.035:.018);
  if(intensity===2&&musicStep%4===2)note(freq*2,.22,.012,"square");
  musicStep++;musicTimer=setTimeout(musicPulse,intensity===2?210:intensity===1?285:390)
}
function startMusic(){if(musicTimer||!soundOn)return;audio();musicPulse()}
function stopMusic(){clearTimeout(musicTimer);musicTimer=null}

function relic(type,extra=""){return type===null?"":`<span class="relic ${extra}" data-type="${type}">${TYPES[type]}</span>`}
function dropRelic(row,col,type,bonus=false){
  board[row][col]=type;
  const cell=boardEl.children[row*COLS+col];
  cell.innerHTML=relic(type,"fall");
  const piece=cell.firstElementChild;
  const travel=(row+1)*cell.getBoundingClientRect().height;
  piece.style.setProperty("--fall-distance",Math.max(90,travel+65)+"px");
  piece.style.setProperty("--drift",((Math.random()-.5)*(bonus?24:15)).toFixed(1)+"px");
  piece.style.setProperty("--turn",((Math.random()-.5)*75).toFixed(1)+"deg");
  piece.style.setProperty("--fall-time",(520+row*32+rand(240))+"ms");
  tone(230+col*28,.07,.025)
}
function eyeSlots(container,count){container.innerHTML=Array.from({length:count},(_,i)=>`<span class="horus-eye-slot ${i<eyes?"lit":""}">𓂀</span>`).join("")}
function render(popSet=new Set(),fallSet=new Set()){
  boardEl.innerHTML="";
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const cell=document.createElement("div");cell.className="cell";cell.setAttribute("role","gridcell");const key=r+","+c;cell.innerHTML=relic(board[r][c],popSet.has(key)?"pop":fallSet.has(key)?"fall fall-"+c:"");boardEl.append(cell)}
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
function lowest(col){for(let r=ROWS-1;r>=0;r--)if(board[r][col]===null)return r;return-1}
function emptyCount(){return board.reduce((n,row)=>n+row.filter(v=>v===null).length,0)}
function connected(r,c,type,seen=new Set()){const key=r+","+c;if(r<0||r>=ROWS||c<0||c>=COLS||seen.has(key)||board[r][c]!==type)return seen;seen.add(key);for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)connected(r+dr,c+dc,type,seen);return seen}
function matchingGroups(){const groups=[],seen=new Set();for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const key=r+","+c;if(board[r][c]===null||seen.has(key))continue;const type=board[r][c],cells=connected(r,c,type);cells.forEach(x=>seen.add(x));if(cells.size>=3)groups.push({type,cells})}return groups}
function gravity(){const vals=[];for(let r=ROWS-1;r>=0;r--)for(let c=0;c<COLS;c++)if(board[r][c]!==null)vals.push(board[r][c]);board=Array.from({length:ROWS},()=>Array(COLS).fill(null));let i=0,row=ROWS-1;while(vals.length-i>=COLS&&row>=0){for(let c=0;c<COLS;c++)board[row][c]=vals[i++];row--}const remaining=vals.length-i;if(remaining>0&&row>=0){const start=Math.floor((COLS-remaining)/2);for(let n=0;n<remaining;n++)board[row][start+n]=vals[i++]}}
function newChosen(){let n=randomType();while(n===chosen)n=randomType();chosen=n}
async function resolve(){
  let chain=0;
  while(true){
    const groups=matchingGroups();if(!groups.length)break;chain++;
    const popSet=new Set();groups.forEach(g=>g.cells.forEach(x=>popSet.add(x)));render(popSet);tone(520+chain*90,.14);await wait(380);
    let earnedEyes=0,targetHit=false;
    groups.forEach(g=>{const size=g.cells.size,base=size*100*chain*level;score+=base;if(g.type===chosen){score+=base;targetHit=true}if(size>=4)earnedEyes+=Math.min(3,size-3);g.cells.forEach(key=>{const [r,c]=key.split(",").map(Number);board[r][c]=null})});
    if(earnedEyes){eyes=Math.min(BONUS_MAX,eyes+earnedEyes);$("#message").textContent=`𓂀 ¡${earnedEyes} Ojo${earnedEyes>1?"s":""} despierta${earnedEyes>1?"n":""}!`;tone(640+eyes*55,.28,.07)}
    if(targetHit){$("#message").textContent="¡Reliquia Elegida! Puntuación duplicada.";newChosen()}
    combos+=groups.length;gravity();render();await wait(250)
  }
  level=1+Math.floor(score/5000);render();if(eyes>=BONUS_MIN&&!inBonus)await bonusMode(eyes)
}
async function spin(){
  if(busy)return;if(emptyCount()<COLS){gameOver();return}
  busy=true;const scoreBefore=score;$("#message").textContent="Siete canicas, siete carriles: cada una busca su hueco…";
  const incoming=[...nextRow];nextRow=makeRow();render();
  const columns=Array.from({length:COLS},(_,col)=>col);
  for(let i=columns.length-1;i>0;i--){const j=rand(i+1);[columns[i],columns[j]]=[columns[j],columns[i]]}
  for(const col of columns){const row=lowest(col);dropRelic(row,col,incoming[col]);await wait(95+rand(85))}
  await wait(1080);await resolve();await showScoreReward(score-scoreBefore);busy=false;checkEnd()
}
async function bonusDrop(){
  const available=Array.from({length:COLS},(_,c)=>c).filter(c=>lowest(c)>=0);if(!available.length)return false;
  const col=available[rand(available.length)],row=lowest(col);dropRelic(row,col,randomType(),true);await wait(1080);await resolve();return true
}
async function bonusMode(power){
  inBonus=true;eyes=0;$("#bonusChute").classList.add("active");$(".temple").classList.add("bonus-active");$("#message").textContent=`¡CANAL DE HORUS! Bonus de ${power} Ojos: ${power*2} reliquias.`;tone(760,.38,.08);render();await wait(750);
  for(let i=0;i<power*2;i++){if(!await bonusDrop())break;await wait(140)}
  $("#bonusChute").classList.remove("active");$(".temple").classList.remove("bonus-active");score+=power*500*level;inBonus=false;render();$("#message").textContent=power===BONUS_MAX?"¡BONUS MÁXIMO! El templo ha despertado.":"El Canal se cierra. Continúa la expedición."
}
function gameOver(){busy=true;$("#message").textContent="El templo está sellado. Toca aquí para comenzar de nuevo.";$("#message").onclick=reset}
function checkEnd(){if(emptyCount()<COLS)gameOver()}
function reset(){board=Array.from({length:ROWS},()=>Array(COLS).fill(null));score=0;displayedScore=0;level=1;combos=0;eyes=0;nextRow=makeRow();newChosen();busy=false;inBonus=false;$("#message").onclick=null;$("#message").textContent="Pulsa SPIN: caerá una fila completa.";render()}
$("#intro").classList.remove("hidden","opening","is-loading");$("#dropButton").onclick=spin;$("#sound").onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?"♫":"×";e.currentTarget.setAttribute("aria-label",soundOn?"Silenciar música y sonido":"Activar música y sonido");if(soundOn)startMusic();else stopMusic()};$("#start").onclick=async e=>{
  const intro=$("#intro"),bar=$("#loadingBar"),label=$("#loadingLabel");
  e.currentTarget.disabled=true;startMusic();
  $("#studioSplash").hidden=true;$("#templeSplash").hidden=false;intro.classList.add("is-loading");
  const stages=[[18,"LOADING RELICS"],[43,"AWAKENING THE EYE"],[69,"LIGHTING THE TORCHES"],[88,"OPENING THE MAP"],[100,"CHOOSE YOUR WORLD"]];
  for(const [progress,text] of stages){bar.style.width=progress+"%";label.textContent=text;tone(300+progress*3,.08,.018);await wait(progress===100?500:330)}
  intro.classList.add("opening");await wait(720);intro.classList.add("hidden");
  $("#worldMap").classList.remove("hidden");
};$("#enterHorus").onclick=()=>{$("#worldMap").classList.add("hidden");$("#message").textContent="Pulsa SPIN: caerá una fila completa.";render()};document.addEventListener("visibilitychange",()=>{if(document.hidden)stopMusic();else if(soundOn&&!$("#intro").classList.contains("hidden"))startMusic()});render();
