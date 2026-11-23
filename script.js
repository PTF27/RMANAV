(() => {
  const snowLayer = document.querySelector(".snow-layer");
  const snowToggle = document.getElementById("snowToggle");
  const snowLabel = document.getElementById("snowLabel");
  const radioToggle = document.getElementById("radioToggle");
  const radioAudio = document.getElementById("radioAudio");
  const radioTrack = document.getElementById("radioTrack");
  const radioArtist = document.getElementById("radioArtist");
  const placeholder = document.getElementById("xatPlaceholder");
  const embed = document.getElementById("xatEmbed");

  /*
   * CONFIGURACIÓN DE TU EMISORA
   * RADIO_STREAM_URL: enlace directo al audio/stream de tu emisora.
   * RADIO_METADATA_URL: endpoint público de metadatos (si tu emisora lo ofrece).
   *
   * Icecast suele ofrecer: http://zeno.fm/22063/status-json.xsl
   * El servidor debe permitir CORS para que el navegador pueda leer los metadatos.
   */
  const RADIO_STREAM_URL = "http://stream.zeno.fm/1spbp8c44d0uv";
  const RADIO_METADATA_URL = "https://play14.tikast.com:22063/status-json.xsl";
  const METADATA_REFRESH_MS = 15000;

  // Nieve.
  for (let i = 0; i < 95; i++) {
    const flake = document.createElement("span");
    flake.className = "flake";
    flake.textContent = Math.random() > 0.78 ? "✦" : "•";
    flake.style.left = `${Math.random() * 100}%`;
    flake.style.fontSize = `${5 + Math.random() * 11}px`;
    flake.style.animationDuration = `${7 + Math.random() * 14}s`;
    flake.style.animationDelay = `${-Math.random() * 20}s`;
    flake.style.setProperty("--drift", `${-70 + Math.random() * 140}px`);
    snowLayer.appendChild(flake);
  }

  let snowPaused = false;
  snowToggle.addEventListener("click", () => {
    snowPaused = !snowPaused;
    snowLayer.style.display = snowPaused ? "none" : "block";
    snowToggle.setAttribute("aria-pressed", String(snowPaused));
    snowLabel.textContent = snowPaused ? "Reanudar nieve" : "Pausar nieve";
  });

  function setNowPlaying(title, artist) {
    radioTrack.textContent = title || "Mi radio";
    radioArtist.textContent = artist || "En directo";
  }

  function splitArtistTitle(raw) {
    const value = String(raw || "").trim();
    if (!value) return { title: "Mi radio", artist: "Esperando información…" };
    const parts = value.split(/\s+-\s+/, 2);
    if (parts.length === 2) return { artist: parts[0].trim(), title: parts[1].trim() };
    return { title: value, artist: "En directo" };
  }

  function findIcecastSource(data) {
    let source = data?.icestats?.source;
    if (Array.isArray(source)) source = source[0];
    return source || data?.source || data?.stream || data;
  }

  async function updateRadioMetadata() {
    if (!RADIO_METADATA_URL || RADIO_METADATA_URL.startsWith("PEGA_AQUI")) return;
    try {
      const response = await fetch(RADIO_METADATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("No se pudieron leer los metadatos");
      const data = await response.json();
      const source = findIcecastSource(data);
      const raw = source?.title || source?.yp_currently_playing ||
                  source?.songtitle || data?.songtitle || data?.title || "";
      const artistValue = source?.artist || data?.artist || "";
      const parsed = splitArtistTitle(raw);
      if (artistValue) {
        setNowPlaying(parsed.title === "Mi radio" ? raw : parsed.title, artistValue);
      } else {
        setNowPlaying(parsed.title, parsed.artist);
      }
    } catch (_) {
      // No se interrumpe la música si el endpoint no responde o bloquea CORS.
      if (!radioAudio.paused) setNowPlaying("Radio en directo", "Metadatos no disponibles");
    }
  }

  let metadataTimer = null;
  function startMetadataPolling() {
    updateRadioMetadata();
    if (metadataTimer) clearInterval(metadataTimer);
    metadataTimer = setInterval(updateRadioMetadata, METADATA_REFRESH_MS);
  }
  function stopMetadataPolling() {
    if (metadataTimer) clearInterval(metadataTimer);
    metadataTimer = null;
  }

  radioToggle.addEventListener("click", async () => {
    if (!radioAudio.paused) {
      radioAudio.pause();
      radioToggle.setAttribute("aria-pressed", "false");
      radioToggle.setAttribute("aria-label", "Reproducir radio");
      stopMetadataPolling();
      radioArtist.textContent = "Pausada";
      return;
    }
    if (!RADIO_STREAM_URL || RADIO_STREAM_URL.startsWith("PEGA_AQUI")) {
      setNowPlaying("Configura tu radio", "Añade la URL en script.js");
      return;
    }
    if (!radioAudio.src) radioAudio.src = RADIO_STREAM_URL;
    try {
      await radioAudio.play();
      radioToggle.setAttribute("aria-pressed", "true");
      radioToggle.setAttribute("aria-label", "Pausar radio");
      startMetadataPolling();
    } catch (_) {
      setNowPlaying("No se pudo reproducir", "Comprueba la URL del stream");
    }
  });

  radioAudio.addEventListener("ended", () => {
    radioToggle.setAttribute("aria-pressed", "false");
    stopMetadataPolling();
  });
  radioAudio.addEventListener("error", () => {
    setNowPlaying("Radio no disponible", "Revisa el enlace de emisión");
  });

  // Oculta el mensaje de ayuda cuando se inserta el iframe de xat.com.
  const checkEmbed = () => {
    placeholder.style.display = embed.querySelector("iframe") ? "none" : "flex";
  };
  checkEmbed();
  new MutationObserver(checkEmbed).observe(embed, { childList: true, subtree: true });
})();
