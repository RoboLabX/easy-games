// freecell.js

const suits = ["hearts","diamonds","clubs","spades"];
const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

// Game state
let deck = [];
let piles = [];
let freeCells = [null,null,null,null];
let foundations = [null,null,null,null];
let selectedCard = null; // {type,pileIndex,cardIndex}

// Helpers
function symbol(suit){ switch(suit){ case "hearts": return "♥"; case "diamonds": return "♦"; case "clubs": return "♣"; case "spades": return "♠"; } }
function isPrevRank(top,current){ return values.indexOf(top) === values.indexOf(current)+1; }
function isNextRank(top,current){ return values.indexOf(current) === values.indexOf(top)+1; }
function isOppositeColor(s1,s2){ const red=["hearts","diamonds"], black=["clubs","spades"]; return (red.includes(s1)&&black.includes(s2))||(black.includes(s1)&&red.includes(s2)); }
function countEmptyFreeCells(){ return freeCells.filter(c=>c===null).length; }
function countEmptyPiles(excludeIndex=null){ return piles.filter((p,idx)=>p.length===0 && idx!==excludeIndex).length; }
function canMoveSequence(len, fromPile){ const max=(countEmptyFreeCells()+1)*Math.pow(2,countEmptyPiles(fromPile)); return len <= max; }

// Deck functions
function shuffleDeck(){
    for(let i=deck.length-1;i>0;i--){
        let j=Math.floor(Math.random()*(i+1));
        [deck[i],deck[j]]=[deck[j],deck[i]];
    }
}
function newGame(){
    deck=[];
    for(let suit of suits){
        for(let value of values){
            deck.push({suit,value});
        }
    }
    shuffleDeck();

    // Deal to tableau
    piles = Array.from({length:8},()=>[]);
    deck.forEach((c,i)=>piles[i%8].push(c));

    freeCells = [null,null,null,null];
    foundations = [null,null,null,null];
    selectedCard = null;

    render();
}

// Tableau functions
function getMovableSequence(pileIndex, cardIndex){
    const pile = piles[pileIndex];
    const seq=[pile[cardIndex]];
    for(let i=cardIndex;i<pile.length-1;i++){
        const c1=pile[i], c2=pile[i+1];
        if(isOppositeColor(c1.suit,c2.suit) && isPrevRank(c1.value,c2.value)) seq.push(c2);
        else break;
    }
    return seq;
}

// Foundations
function canMoveToFoundation(card, foundationIndex){
    const top = foundations[foundationIndex];
    if(!top && card.value==="A") return true;
    if(top && top.suit===card.suit && isNextRank(top.value,card.value)) return true;
    return false;
}

// Selection / click
function selectCard(type,pileIndex,cardIndex=0){
    let card = (type==="tableau") ? piles[pileIndex][cardIndex] :
               (type==="free") ? freeCells[pileIndex] : null;

    // Auto-drop to foundation
    if(card){
        for(let i=0;i<4;i++){
            if(canMoveToFoundation(card,i)){
                attemptMove({type,pileIndex,cardIndex},{type:"found",pileIndex:i});
                selectedCard=null;
                render();
                checkCompletion();
                return;
            }
        }
    }

    if(!selectedCard){
        selectedCard={type,pileIndex,cardIndex};
    } else {
        attemptMove(selectedCard,{type,pileIndex});
        selectedCard=null;
    }
    render();
    checkCompletion();
}

// Move logic
function attemptMove(from,to){
    let sequence=[];
    if(from.type==="tableau") sequence = getMovableSequence(from.pileIndex, from.cardIndex);
    else if(from.type==="free") sequence=[freeCells[from.pileIndex]];
    else return;

    if(from.type==="tableau" && sequence.length>1){
        if(!canMoveSequence(sequence.length, from.pileIndex)) return;
    }

    let top=null;
    if(to.type==="tableau") top = piles[to.pileIndex][piles[to.pileIndex].length-1];
    else if(to.type==="free") top = freeCells[to.pileIndex];
    else if(to.type==="found") top = foundations[to.pileIndex];

    if(to.type==="tableau"){
        if(top && !(isOppositeColor(top.suit,sequence[0].suit) && isPrevRank(top.value,sequence[0].value))) return;
    } else if(to.type==="free"){
        if(top || sequence.length>1) return;
    } else if(to.type==="found"){
        if(sequence.length>1 || !canMoveToFoundation(sequence[0], to.pileIndex)) return;
    }

    // Remove from source
    if(from.type==="tableau") piles[from.pileIndex].splice(from.cardIndex);
    else if(from.type==="free") freeCells[from.pileIndex]=null;

    // Add to destination
    if(to.type==="tableau") piles[to.pileIndex] = piles[to.pileIndex].concat(sequence);
    else if(to.type==="free") freeCells[to.pileIndex]=sequence[0];
    else if(to.type==="found") foundations[to.pileIndex]=sequence[0];

    selectedCard=null;
    render();
    checkCompletion();
}

// Game completion
function checkCompletion(){
    const allFoundationsFull = foundations.every(f => f && f.value==="K");
    const allTableauEmpty = piles.every(p => p.length===0);

    if(allFoundationsFull && allTableauEmpty){
        setTimeout(()=>{
            if(confirm("Congratulations! Puzzle completed! Start a new game?")){
                newGame();
            }
        },50);
        return true;
    }

    // Auto-move top cards to foundations if legal
    for(let p=0;p<8;p++){
        let pile = piles[p];
        if(pile.length===0) continue;
        let moved;
        do {
            moved=false;
            let c = pile[pile.length-1]; // top card
            for(let f=0;f<4;f++){
                if(canMoveToFoundation(c,f)){
                    foundations[f]=c;
                    pile.pop(); // remove from tableau
                    moved=true;
                    break;
                }
            }
        } while(moved && pile.length>0);
    }

    render();
    return false;
}

// Rendering
function render(){
    for(let p=0;p<8;p++){
        const pileDiv=document.getElementById("pile"+(p+1));
        pileDiv.innerHTML="";
        piles[p].forEach((c,idx)=>{
            const cardDiv=document.createElement("div");
            cardDiv.className="card "+c.suit;
            cardDiv.textContent=c.value+" "+symbol(c.suit);
            cardDiv.style.top = (idx*25)+"px";
            cardDiv.addEventListener("click",(e)=>{
                e.stopPropagation();
                selectCard("tableau",p,idx);
            });
            if(selectedCard && selectedCard.type==="tableau" && selectedCard.pileIndex===p && selectedCard.cardIndex===idx)
                cardDiv.classList.add("selected");
            pileDiv.appendChild(cardDiv);
        });
        pileDiv.onclick = ()=>{
            if(selectedCard){
                attemptMove(selectedCard,{type:"tableau",pileIndex:p});
                selectedCard=null;
                render();
            }
        }
    }

    // Free cells
    for(let i=0;i<4;i++){
        const cellDiv=document.getElementById("free"+(i+1));
        cellDiv.innerHTML="";
        const newDiv=cellDiv.cloneNode(false);
        cellDiv.parentNode.replaceChild(newDiv,cellDiv);

        if(freeCells[i]){
            const c = freeCells[i];
            const cardDiv=document.createElement("div");
            cardDiv.className="card "+c.suit;
            cardDiv.textContent=c.value+" "+symbol(c.suit);
            cardDiv.addEventListener("click",(e)=>{
                e.stopPropagation();
                selectCard("free",i,0);
            });
            if(selectedCard && selectedCard.type==="free" && selectedCard.pileIndex===i)
                cardDiv.classList.add("selected");
            newDiv.appendChild(cardDiv);
        } else {
            newDiv.onclick = ()=>{
                if(selectedCard){
                    attemptMove(selectedCard,{type:"free",pileIndex:i});
                    selectedCard=null;
                    render();
                }
            }
        }
    }

    // Foundations
    for(let i=0;i<4;i++){
        const cellDiv=document.getElementById("found"+(i+1));
        cellDiv.innerHTML="";
        const newDiv=cellDiv.cloneNode(false);
        cellDiv.parentNode.replaceChild(newDiv,cellDiv);

        if(foundations[i]){
            const c = foundations[i];
            const cardDiv=document.createElement("div");
            cardDiv.className="card "+c.suit;
            cardDiv.textContent=c.value+" "+symbol(c.suit);
            cardDiv.addEventListener("click",(e)=>{
                e.stopPropagation();
                selectCard("found",i,0);
            });
            if(selectedCard && selectedCard.type==="found" && selectedCard.pileIndex===i)
                cardDiv.classList.add("selected");
            newDiv.appendChild(cardDiv);
        } else {
            newDiv.onclick = ()=>{
                if(selectedCard){
                    attemptMove(selectedCard,{type:"found",pileIndex:i});
                    selectedCard=null;
                    render();
                }
            }
        }
    }
}

// Start first game
newGame();
