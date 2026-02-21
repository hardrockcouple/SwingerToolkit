export async function loadHeader() {
  try {
    const response = await fetch("header.html");
    const headerHTML = await response.text();

    // Inserir o header no início do body
    document.body.insertAdjacentHTML("afterbegin", headerHTML);

    // Ativar link atual automaticamente
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    const links = document.querySelectorAll(".navLinks a");

    links.forEach(link => {
      if (link.getAttribute("href") === currentPage) {
        link.classList.add("active");
      }
    });

    // Inicializar logo (já que agora ele é carregado dinamicamente)
    if (window.initLogo) {
      window.initLogo();
    }

  } catch (error) {
    console.error("Erro ao carregar header:", error);
  }
}