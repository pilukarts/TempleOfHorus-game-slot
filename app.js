const ROWS=9,COLS=7,TYPES=["𓂀","𓆣","𓋹","☀","◆","𓃭"],BONUS_MIN=3,BONUS_MAX=6;
const $=s=>document.querySelector(s),rand=n=>Math.floor(Math.random()*n),wait=ms=>new Promise(r=>setTimeout(r,ms));
let board=Array.from({length:ROWS},()=>Array(COLS).fill(null)),score=0,level=1,combos=0,eyes=0,busy=false,inBonus=false,selected=3,soundOn=true;
const randomType=()=>rand(Math.min(TYPES.length,4+Math.floor(level/3)));
let next=randomType(),chosen=randomType(),boardEl=$("#board"),buttonsEl=$("#columnButtons");

function tone(freq=440,d=.08,volume=.05){if(!soundOn)return;const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d)}
function relic(type,extra=""){return type===null?"":`<span class="relic ${extra}" data-type="${type}">${TYPES[type]}</span>`}
function eyeSlots(container,count){container.innerHTML=Array.from({length:count},(_,i)=>`<span class="horus-eye-slot ${i<eyes?"lit":""}">𓂀</span>`).join("")}
function render(popSet=new Set()){
  boardEl.innerHTML="";
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const cell=document.createElement("div");cell.className="cell";cell.setAttribute("role","gridcell");cell.innerHTML=relic(board[r][c],popSet.has(r+","+c)?"pop":"");boardEl.append(cell)}
  $("#nextBall").outerHTML=`<span id="nextBall" class="relic preview" data-type="${next}">${TYPES[next]}</span>`;
  $("#chosenRelic").outerHTML=`<span id="chosenRelic" class="relic preview" data-type="${chosen}">${TYPES[chosen]}</span>`;
  eyeSlots($("#eyesLeft"),3);eyeSlots($("#eyesRight"),3);eyeSlots($("#eyesMobile"),6);updateHud()
}
function updateHud(){
  $("#score").textContent=score.toLocaleString("es");$("#level").textContent=level;$("#combos").textContent=combos;
  document.querySelector(".temple").classList.toggle("eye-tension",eyes>0);document.querySelector(".temple").classList.toggle("bonus-max",eyes===BONUS_MAX)
}
function lowest(col){for(let r=ROWS-1;r>=0;r--)if(board[r][col]===null)return r;return-1}
function connected(r,c,type,seen=new Set()){const key=r+","+c;if(r<0||r>=ROWS||c<0||c>=COLS||seen.has(key)||board[r][c]!==type)return seen;seen.add(key);connected(r+1,c,type,seen);connected(r-1,c,type,seen);connected(r,c+1,type,seen);connected(r,c-1,type,seen);return seen}
function matchingGroups(){
  const groups=[],seen=new Set();
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const key=r+","+c;if(board[r][c]===null||seen.has(key))continue;const type=board[r][c],cells=connected(r,c,type);cells.forEach(x=>seen.add(x));if(cells.size>=3)groups.push({type,cells})}
  return groups
}
function gravity(){for(let c=0;c<COLS;c++){const vals=[];for(let r=ROWS-1;r>=0;r--)if(board[r][c]!==null)vals.push(board[r][c]);for(let r=ROWS-1;r>=0;r--)board[r][c]=vals[ROWS-1-r]??null}}
function newChosen(){let n=randomType();if(TYPES.length>1)while(n===chosen)n=randomType();chosen=n}
async function resolve(){
  let chain=0;
  while(true){
    const groups=matchingGroups();if(!groups.length)break;chain++;
    const popSet=new Set();groups.forEach(g=>g.cells.forEach(x=>popSet.add(x)));render(popSet);tone(520+chain*90,.14);await wait(380);
    let earnedEyes=0,targetHit=false;
    groups.forEach(g=>{
      const size=g.cells.size,base=size*100*chain*level;score+=base;
      if(g.type===chosen){score+=size*100*chain*level;targetHit=true}
      if(size>=4)earnedEyes+=Math.min(3,size-3);
      g.cells.forEach(key=>{const [r,c]=key.split(",").map(Number);board[r][c]=null})
    });
    if(earnedEyes){eyes=Math.min(BONUS_MAX,eyes+earnedEyes);$("#message").textContent=`𓂀 ¡${earnedEyes} Ojo${earnedEyes>1?"s":""} de Horus despierta${earnedEyes>1?"n":""}!`;tone(640+eyes*55,.28,.07)}
    if(targetHit){$("#message").textContent="¡Reliquia Elegida! Puntuación duplicada.";newChosen()}
    combos+=groups.length;gravity();render();await wait(260)
  }
  level=1+Math.floor(score/5000);render();
  if(eyes>=BONUS_MIN&&!inBonus)await bonusMode(eyes)
}
async function drop(col,type=next,automatic=false){
  if(busy&&!automatic)return false;const row=lowest(col);
  if(row<0){if(!automatic){$("#message").textContent="Esa columna está llena. Busca otro camino.";tone(120,.18)}return false}
  if(!automatic)busy=true;board[row][col]=type;if(!automatic)next=randomType();render();tone(260,.08);await wait(330);await resolve();
  if(!automatic){busy=false;checkEnd()}return true
}
async function bonusMode(power){
  inBonus=true;eyes=0;$("#bonusChute").classList.add("active");$("#message").textContent=`¡CANAL DE HORUS! Bonus de ${power} Ojos: ${power*2} reliquias.`;tone(760,.38,.08);render();await wait(750);
  for(let i=0;i<power*2;i++){const available=Array.from({length:COLS},(_,c)=>c).filter(c=>lowest(c)>=0);if(!available.length)break;await drop(available[rand(available.length)],randomType(),true);await wait(170)}
  $("#bonusChute").classList.remove("active");score+=power*500*level;inBonus=false;render();$("#message").textContent=power===BONUS_MAX?"¡BONUS MÁXIMO! El templo entero ha despertado.":"El Canal se cierra. Continúa la expedición."
}
function checkEnd(){if(Array.from({length:COLS},(_,c)=>lowest(c)).every(r=>r<0)){busy=true;$("#message").textContent="El templo está sellado. Toca aquí para comenzar de nuevo.";$("#message").onclick=reset}}
function choose(c){selected=c;[...buttonsEl.children].forEach((b,i)=>b.classList.toggle("active",i===c))}
function reset(){board=Array.from({length:ROWS},()=>Array(COLS).fill(null));score=0;level=1;combos=0;eyes=0;next=randomType();newChosen();busy=false;inBonus=false;$("#message").onclick=null;$("#message").textContent="Elige una columna y pulsa SPIN.";render()}
for(let c=0;c<COLS;c++){const b=document.createElement("button");b.textContent="▼";b.setAttribute("aria-label","Elegir columna "+(c+1));b.onclick=()=>choose(c);buttonsEl.append(b)}
$("#dropButton").onclick=()=>drop(selected);$("#sound").onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?"♫":"×"};$("#start").onclick=()=>{$("#intro").classList.add("hidden");$("#message").textContent="Elige una columna y pulsa SPIN.";render()};choose(selected);render();
