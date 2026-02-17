let clubs=[];
let map=null;

fetch('clubs.json')
.then(r=>r.json())
.then(data=>{
clubs=data;
renderGrid();
initMap();
});

function renderGrid(){
const wrap=document.getElementById('gridWrap');
wrap.innerHTML='';
clubs.forEach(c=>{
const div=document.createElement('div');
div.className='clubCard';
div.innerHTML=`<h3>${c.name||'No name'}</h3><div>${c.country||''}</div><div>${c.city||''}</div>`;
div.onclick=()=>openModal(c);
wrap.appendChild(div);
});
}

function initMap(){
map=L.map('mapWrap').setView([20,0],2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
clubs.forEach(c=>{
if(c.lat && c.lng){
L.marker([c.lat,c.lng]).addTo(map).on('click',()=>openModal(c));
}
});
}

function setMode(mode){
document.getElementById('gridWrap').style.display=(mode==='grid')?'grid':'none';
document.getElementById('mapWrap').style.display=(mode==='map')?'block':'none';
if(mode==='map'){setTimeout(()=>map.invalidateSize(),200);}
}

function openModal(c){
document.getElementById('clubModalBody').innerHTML=
`<h2>${c.name}</h2>
<div>${c.country||''}</div>
<div>${c.city||''}</div>
${c.website?`<a href="${c.website}" target="_blank">Website</a>`:''}`;
document.getElementById('clubModal').style.display='flex';
}

function closeModal(){
document.getElementById('clubModal').style.display='none';
}
