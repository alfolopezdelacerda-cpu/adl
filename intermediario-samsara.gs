/**
 * ============================================================================
 *  INTERMEDIARIO   SAMSARA  ->  NSTECH (plataforma Zeus)
 * ============================================================================
 *
 *  ¿Qué hace este script?
 *    1. Le pide a Samsara la posición GPS de tus vehículos (con encendido y
 *       odómetro).
 *    2. Lo convierte al formato exacto que pide NSTech.
 *    3. Lo entrega en el buzón de NSTech (endpoint /integra/v1/positions).
 *
 *  Corre solo, cada X minutos, en la nube de Google. No necesitas servidor.
 *
 *  --------------------------------------------------------------------------
 *  CÓMO INSTALARLO (una sola vez)
 *  --------------------------------------------------------------------------
 *  1. Entra a  https://script.google.com  y crea un proyecto nuevo.
 *  2. Borra lo que venga y pega TODO este archivo.
 *  3. Guarda el token de Samsara con la función guardarTokenSamsara().
 *  4. Guarda el ClientSecret de NSTech con la función guardarSecretNstech().
 *  5. Revisa la sección CONFIGURACIÓN de abajo (ya viene con tus IDs).
 *  6. Ejecuta  verJsonParaNstech  para revisar el JSON antes de enviar nada.
 *  7. Ejecuta  probarUnaVez  y revisa el registro (Ver > Registros).
 *  8. Ejecuta  activarAutomatico  para que corra solo cada 5 minutos.
 *
 *  IMPORTANTE: nunca escribas tokens directamente en el código de forma
 *  permanente ni los compartas. Se guardan cifrados con las funciones de abajo.
 * ============================================================================
 */


/* ===========================================================================
 *  1) CONFIGURACIÓN  -- rellena esto
 * ========================================================================= */

// -- URLs de NSTech (ambiente de PRUEBAS / homologación "hml") --
// OJO: cuando NSTech te dé las URLs de PRODUCCIÓN, cámbialas aquí (las dos).
const NSTECH_URL       = "https://nsapps-hml.nstech.com.br/zeus/api/integra/v1/positions";
const NSTECH_TOKEN_URL = "https://nsapps-hml.nstech.com.br/auth/realms/zeus/protocol/openid-connect/token";

// -- Credenciales de NSTech que NO son secretas (las que te dieron por correo) --
const ACCOUNT_ID    = "d4c2ce7f-10e3-4394-9168-3278db0e07ed";
const TECHNOLOGY_ID = "dbab26b4-7a6d-42b4-a557-1e687327dfcc";
const CLIENT_ID     = "dbab26b4-7a6d-42b4-a557-1e687327dfcc";
// El CLIENT_SECRET NO va aquí: se guarda cifrado con guardarSecretNstech().

// Endpoint de Samsara. Pedimos gps + encendido + odómetro en una sola llamada.
const SAMSARA_URL =
  "https://api.samsara.com/fleet/vehicles/stats" +
  "?types=gps,engineStates,obdOdometerMeters";

// -- MAPEO DE UNIDADES (opcional pero recomendado) --
// NSTech identifica cada vehículo con su "device_id". Aquí conviertes el
// nombre de tu vehículo en Samsara -> el device_id registrado en NSTech.
// Ejemplo:  "Camión 01": "THIAGO_TESTANDO_150726F"
// Si dejas el mapeo vacío {}, se usará el nombre del vehículo de Samsara tal cual.
const MAPEO_DEVICE_ID = {
  // "Nombre en Samsara": "device_id en NSTech",
};


/* ===========================================================================
 *  2) GUARDAR CREDENCIALES  (ejecutar UNA sola vez cada una)
 * ---------------------------------------------------------------------------
 *  Pega el valor entre comillas, ejecuta la función una vez, y luego borra el
 *  valor y vuelve a guardar. Quedan almacenados cifrados en el proyecto.
 * ========================================================================= */

function guardarTokenSamsara() {
  const TOKEN = "PEGA_AQUI_TU_TOKEN_DE_SAMSARA";
  PropertiesService.getScriptProperties().setProperty("SAMSARA_TOKEN", TOKEN);
  Logger.log("Token de Samsara guardado. Ya puedes borrarlo de esta función.");
}

function guardarSecretNstech() {
  // Pega aquí el ClientSecret que te dio NSTech por correo. Ejecuta la función
  // una vez, y luego borra el valor. Queda guardado cifrado.
  const SECRET = "PEGA_AQUI_TU_CLIENT_SECRET_DE_NSTECH";
  PropertiesService.getScriptProperties().setProperty("NSTECH_SECRET", SECRET);
  Logger.log("ClientSecret de NSTech guardado. Ya puedes borrarlo de esta función.");
}

/**
 * Pide un token de acceso a NSTech (OAuth2 client_credentials / Keycloak).
 * Devuelve el access_token (texto) o null si algo falla.
 */
function obtenerTokenNstech() {
  const secret = PropertiesService.getScriptProperties().getProperty("NSTECH_SECRET");
  if (!secret) {
    Logger.log("ERROR: falta el ClientSecret de NSTech. Ejecuta guardarSecretNstech().");
    return null;
  }

  const cuerpo =
    "grant_type=client_credentials" +
    "&client_id="     + encodeURIComponent(CLIENT_ID) +
    "&client_secret=" + encodeURIComponent(secret);

  const resp = UrlFetchApp.fetch(NSTECH_TOKEN_URL, {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: cuerpo,
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() !== 200) {
    Logger.log("No se pudo obtener token de NSTech. Error " + resp.getResponseCode() +
               ": " + resp.getContentText());
    return null;
  }

  return JSON.parse(resp.getContentText()).access_token;
}


/* ===========================================================================
 *  3) FUNCIÓN PRINCIPAL
 * ========================================================================= */
function enviarPosicionesANstech() {
  const tokenSamsara = PropertiesService.getScriptProperties().getProperty("SAMSARA_TOKEN");
  if (!tokenSamsara) {
    Logger.log("ERROR: falta el token de Samsara. Ejecuta guardarTokenSamsara().");
    return;
  }

  // --- Paso 1: pedir datos a Samsara ---
  const resp = UrlFetchApp.fetch(SAMSARA_URL, {
    method: "get",
    headers: { "Authorization": "Bearer " + tokenSamsara },
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() !== 200) {
    Logger.log("Samsara respondió error " + resp.getResponseCode() + ": " + resp.getContentText());
    return;
  }

  const datosSamsara = JSON.parse(resp.getContentText());

  // --- Paso 2: convertir al formato de NSTech ---
  const cuerpo = transformarANstech(datosSamsara);

  if (cuerpo.positions.length === 0) {
    Logger.log("No hay posiciones para enviar en este momento.");
    return;
  }

  // --- Paso 3: pedir el token de acceso a NSTech (OAuth2) ---
  const accessToken = obtenerTokenNstech();
  if (!accessToken) return; // el error ya quedó en el registro

  // --- Paso 4: entregar las posiciones a NSTech ---
  const envio = UrlFetchApp.fetch(NSTECH_URL, {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + accessToken },
    payload: JSON.stringify(cuerpo),
    muteHttpExceptions: true
  });

  Logger.log("Enviado a NSTech (" + cuerpo.positions.length + " posiciones). " +
             "Respuesta " + envio.getResponseCode() + ": " + envio.getContentText());
}


/* ===========================================================================
 *  4) TRANSFORMACIÓN  Samsara  ->  formato NSTech
 * ---------------------------------------------------------------------------
 *  Construye exactamente el JSON que pide tu cliente:
 *  { "positions": [ { position_type, technology_id, account_id, date,
 *                     device_id, latitude, longitude, ignition, speed,
 *                     odometer } ] }
 * ========================================================================= */
function transformarANstech(datosSamsara) {
  const lista = datosSamsara.data || [];
  const positions = [];

  lista.forEach(function (v) {
    const gps = v.gps;
    if (!gps) return; // sin GPS no hay posición que enviar

    // device_id: usa el mapeo si existe, si no, el nombre del vehículo.
    const deviceId = MAPEO_DEVICE_ID[v.name] || v.name;

    // encendido: Samsara devuelve "On" / "Off" / "Idle".
    var ignition = "Off";
    if (v.engineStates && v.engineStates.value) {
      ignition = (v.engineStates.value === "Off") ? "Off" : "On";
    }

    // velocidad: Samsara la da en millas/hora. Se convierte a km/h.
    var speedKmh = 0;
    if (typeof gps.speedMilesPerHour === "number") {
      speedKmh = Math.round(gps.speedMilesPerHour * 1.60934);
    }

    // odómetro: Samsara lo da en metros. Se convierte a kilómetros.
    var odometroKm = "";
    if (v.obdOdometerMeters && typeof v.obdOdometerMeters.value === "number") {
      odometroKm = String(Math.round(v.obdOdometerMeters.value / 1000));
    }

    positions.push({
      "position_type": "GPRS",
      "technology_id": TECHNOLOGY_ID,
      "account_id":    ACCOUNT_ID,
      "date":          gps.time,                 // ya viene en formato ISO
      "device_id":     deviceId,
      "latitude":      String(gps.latitude),
      "longitude":     String(gps.longitude),
      "ignition":      ignition,
      "speed":         String(speedKmh),
      "odometer":      odometroKm
    });
  });

  return { "positions": positions };
}


/* ===========================================================================
 *  5) UTILIDADES
 * ========================================================================= */

// Prueba el flujo completo una vez (revisa Ver > Registros).
function probarUnaVez() {
  enviarPosicionesANstech();
}

// Activa el envío automático cada 5 minutos.
function activarAutomatico() {
  desactivarAutomatico();
  ScriptApp.newTrigger("enviarPosicionesANstech")
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log("Automático activado: se enviará cada 5 minutos.");
}

// Detiene el envío automático.
function desactivarAutomatico() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "enviarPosicionesANstech") {
      ScriptApp.deleteTrigger(t);
    }
  });
  Logger.log("Automático desactivado.");
}

// Muestra lo que devuelve Samsara (útil para revisar nombres de unidades).
function verJsonDeSamsara() {
  const token = PropertiesService.getScriptProperties().getProperty("SAMSARA_TOKEN");
  const resp = UrlFetchApp.fetch(SAMSARA_URL, {
    method: "get",
    headers: { "Authorization": "Bearer " + token },
    muteHttpExceptions: true
  });
  Logger.log(resp.getContentText());
}

// Muestra el JSON YA convertido al formato NSTech, SIN enviarlo (para revisar).
function verJsonParaNstech() {
  const token = PropertiesService.getScriptProperties().getProperty("SAMSARA_TOKEN");
  const resp = UrlFetchApp.fetch(SAMSARA_URL, {
    method: "get",
    headers: { "Authorization": "Bearer " + token },
    muteHttpExceptions: true
  });
  const cuerpo = transformarANstech(JSON.parse(resp.getContentText()));
  Logger.log(JSON.stringify(cuerpo, null, 2));
}
