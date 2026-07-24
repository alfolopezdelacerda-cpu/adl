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
 *  4. Guarda el dato de autenticación de NSTech con guardarAuthNstech().
 *  5. Revisa la sección CONFIGURACIÓN de abajo (account_id, mapeo de unidades).
 *  6. Ejecuta  probarUnaVez  y revisa el registro (Ver > Registros).
 *  7. Ejecuta  activarAutomatico  para que corra solo cada 5 minutos.
 *
 *  IMPORTANTE: nunca escribas tokens directamente en el código de forma
 *  permanente ni los compartas. Se guardan cifrados con las funciones de abajo.
 * ============================================================================
 */


/* ===========================================================================
 *  1) CONFIGURACIÓN  -- rellena esto
 * ========================================================================= */

// Buzón de NSTech donde ellos RECIBEN las posiciones.
// OJO: "hml" es el ambiente de PRUEBAS (homologación). Cuando NSTech te dé la
// URL de PRODUCCIÓN, cámbiala aquí.
const NSTECH_URL = "https://nsapps-hml.nstech.com.br/zeus/api/integra/v1/positions";

// account_id que te dio NSTech (el mismo del ejemplo de tu cliente).
const ACCOUNT_ID = "d4c2ce7f-10e3-4394-9168-3278db0e07ed";

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

function guardarAuthNstech() {
  // Lo que NSTech pida para autenticar (revisa su documentación). Suele ser un
  // token tipo "Bearer xxxxx" o una API key. Si aún no lo tienes, pídeselo.
  const AUTH = "PEGA_AQUI_LA_AUTENTICACION_DE_NSTECH";
  PropertiesService.getScriptProperties().setProperty("NSTECH_AUTH", AUTH);
  Logger.log("Autenticación de NSTech guardada. Ya puedes borrarla de esta función.");
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

  // --- Paso 3: entregar a NSTech ---
  const authNstech = PropertiesService.getScriptProperties().getProperty("NSTECH_AUTH");
  const envio = UrlFetchApp.fetch(NSTECH_URL, {
    method: "post",
    contentType: "application/json",
    // Si NSTech NO pide autenticación, puedes quitar la línea "headers".
    headers: authNstech ? { "Authorization": authNstech } : {},
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
      "technology_id": "",
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
