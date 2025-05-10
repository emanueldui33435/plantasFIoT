async function obtenerPlantas() {
  const res = await fetch("http://192.168.206.1:1880/plantas");
  const plantas = await res.json();

  const contenedor = document.getElementById("plantas");
  contenedor.innerHTML = "";

  plantas.forEach(planta => {
    const div = document.createElement("div");
    div.className = "planta";
    div.innerHTML = `
    <img src="${planta.imagen_url}" alt="${planta.nombre_comun}">
    <h3>${planta.nombre_comun}</h3>
    <button class="btn-seleccionar">Seleccionar</button>`;
    const btn = div.querySelector(".btn-seleccionar");
    btn.addEventListener("click", () => seleccionarPlanta(planta));

    contenedor.appendChild(div);
  });
}

function seleccionarPlanta(planta) {
  fetch("http://192.168.206.1:1880/planta-seleccionada", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre_comun: planta.nombre_comun })
  }).then(() => {
    alert(`Planta seleccionada: ${planta.nombre_comun}`);
  });
}

obtenerPlantas();

//Sniffer software para ver trafico de red