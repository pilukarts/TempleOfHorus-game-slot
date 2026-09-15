const ROWS=9,COLS=7,TYPES=["𓂀","𓆣","𓋹","☀","◆","𓅃"],BONUS_MIN=3,BONUS_MAX=6;
const $=s=>document.querySelector(s),rand=n=>Math.floor(Math.random()*n),wait=ms=>new Promise(r=>setTimeout(r,ms));
let board=Array.from({length:ROWS},()=>Array(COLS).fill(null)),score=0,level=1,combos=0,eyes=0,busy=false,inBonus=false,soundOn=true;
const randomType=()=>rand(Math.min(TYPES.length,4+Math.floor(level/3))),makeRow=()=>Array.from({length:COLS},randomType);
let nextRow=makeRow(),chosen=randomType(),boardEl=$("#board");

function tone(freq=440,d=.08,volume=.05){if(!soundOn)return;const C=window.AudioContext||window.webkitAudioContext,c=new C(),o=c.createOscillator(),g=c.createGain();o.frequency.value=freq;g.gain.setValueAtTime(volume,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d);o.connect(g).connect(c.destination);o.start();o.stop(c.currentTime+d)}
function relic(type,extra=""){return type===null?"":`<span class="relic ${extra}" data-type="${type}">${TYPES[type]}</span>`}
function eyeSlots(container,count){container.innerHTML=Array.from({length:count},(_,i)=>`<span class="horus-eye-slot ${i<eyes?"lit":""}">𓂀</span>`).join("")}
function render(popSet=new Set(),fallSet=new Set()){
  boardEl.innerHTML="";
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const cell=document.createElement("div");cell.className="cell";cell.setAttribute("role","gridcell");const key=r+","+c;cell.innerHTML=relic(board[r][c],popSet.has(key)?"pop":fallSet.has(key)?"fall fall-"+c:"");boardEl.append(cell)}
  $("#nextRow").innerHTML=nextRow.map(type=>relic(type,"preview")).join("");
  $("#chosenRelic").outerHTML=`<span id="chosenRelic" class="relic preview" data-type="${chosen}">${TYPES[chosen]}</span>`;
  eyeSlots($("#eyesLeft"),3);eyeSlots($("#eyesRight"),3);eyeSlots($("#eyesMobile"),6);updateHud()
}
function updateHud(){
  $("#score").textContent=score.toLocaleString("es");$("#level").textContent=level;$("#combos").textContent=combos;
  $(".temple").classList.toggle("eye-tension",eyes>0);$(".temple").classList.toggle("bonus-max",eyes===BONUS_MAX)
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
  busy=true;$("#message").textContent="Siete canicas, siete carriles: cada una busca su hueco…";
  const incoming=[...nextRow],falling=new Set();nextRow=makeRow();for(let c=0;c<COLS;c++){const row=lowest(c);board[row][c]=incoming[c];falling.add(row+","+c)}render(new Set(),falling);for(let c=0;c<COLS;c++){setTimeout(()=>tone(230+c*18,.07,.028),c*45)}await wait(900);await resolve();busy=false;checkEnd()
}
async function bonusDrop(){
  const available=Array.from({length:COLS},(_,c)=>c).filter(c=>lowest(c)>=0);if(!available.length)return false;
  const col=available[rand(available.length)],row=lowest(col);board[row][col]=randomType();render(new Set(),new Set([row+","+col]));tone(330,.08);await wait(250);await resolve();return true
}
async function bonusMode(power){
  inBonus=true;eyes=0;$("#bonusChute").classList.add("active");$("#message").textContent=`¡CANAL DE HORUS! Bonus de ${power} Ojos: ${power*2} reliquias.`;tone(760,.38,.08);render();await wait(750);
  for(let i=0;i<power*2;i++){if(!await bonusDrop())break;await wait(140)}
  $("#bonusChute").classList.remove("active");score+=power*500*level;inBonus=false;render();$("#message").textContent=power===BONUS_MAX?"¡BONUS MÁXIMO! El templo ha despertado.":"El Canal se cierra. Continúa la expedición."
}
function gameOver(){busy=true;$("#message").textContent="El templo está sellado. Toca aquí para comenzar de nuevo.";$("#message").onclick=reset}
function checkEnd(){if(emptyCount()<COLS)gameOver()}
function reset(){board=Array.from({length:ROWS},()=>Array(COLS).fill(null));score=0;level=1;combos=0;eyes=0;nextRow=makeRow();newChosen();busy=false;inBonus=false;$("#message").onclick=null;$("#message").textContent="Pulsa SPIN: caerá una fila completa.";render()}
$("#dropButton").onclick=spin;$("#sound").onclick=e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?"♫":"×"};$("#start").onclick=()=>{$("#intro").classList.add("hidden");$("#message").textContent="Pulsa SPIN: caerá una fila completa.";render()};render();
