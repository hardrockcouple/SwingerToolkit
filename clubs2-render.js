function mapsLink(item){
  if(item.lat && item.lng){
    return `https://www.google.com/maps?q=${item.lat},${item.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name+" "+item.city+" "+item.country)}`;
}

export function buildCard(item,onOpen){
  const card=document.createElement("div");
  card.className="card";

  if(item.visited){
    const stamp=document.createElement("div");
    stamp.className="visited-stamp";
    stamp.innerHTML="<span>VISITED</span>";
    card.appendChild(stamp);
  }

  card.innerHTML+=`
    <div class="name">${item.name}</div>
    <div class="meta">${item.country || ""}</div>
    <div class="meta">${item.city || ""}</div>
  `;

  card.addEventListener("click",()=>onOpen(item));
  return card;
}

export function buildRow(item,onOpen){
  const row=document.createElement("div");
  row.className="listRow";

  row.innerHTML=`
    <div class="rowName">${item.name}</div>
    <div>${item.country || ""}</div>
    <div>${item.city || ""}</div>
    <div>
      <a href="${item.website || mapsLink(item)}" target="_blank">Website</a>
    </div>
  `;

  if(item.visited){
    const stamp=document.createElement("div");
    stamp.className="visited-stamp small";
    stamp.innerHTML="<span>VISITED</span>";
    row.appendChild(stamp);
  }

  row.addEventListener("click",()=>onOpen(item));
  return row;
}

export function renderDrawer(container,item){
  container.innerHTML=`
    <h2>${item.name}</h2>
    <p><b>Country:</b> ${item.country || ""}</p>
    <p><b>City:</b> ${item.city || ""}</p>
    <p><b>Type:</b> ${item.type || ""}</p>
    <p><b>Visited:</b> ${item.visited ? "Yes" : "No"}</p>
    <p><a href="${item.website || mapsLink(item)}" target="_blank">Open</a></p>
  `;
}
