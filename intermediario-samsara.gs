/**
 * ============================================================================
 *  INTERMEDIARIO   SAMSARA  ->  NSTECH (plataforma Zeus)
 * ============================================================================
 *
 *  ¿Qué hace este script?
 *    1. Le pide a Samsara la posición GPS de tus vehículos (con encendido y
 *       odómetro).
 *    2. Pide un token de acceso a NSTech (OAuth2 / Keycloak).
 *    3. Convierte los datos al formato exacto que pide NSTech.
 *    4. Entrega las posiciones en el buzón de NSTech.
 *
 *  Corre solo, cada X minutos, en la nube de Google. No necesitas servidor.
 *
 *  --------------------------------------------------------------------------
 *  CAMBIAR ENTRE PRUEBAS Y PRODUCCIÓN
 *  --------------------------------------------------------------------------
 *  Solo cambia la palabra de la constante AMBIENTE (más abajo):
 *      "HOMOLOGACION" = ambiente de PRUEBAS
 *      "PRODUCCION"   = ambiente REAL
 *  El script ajusta solo las URLs y las credenciales correspondientes.
 *
 *  --------------------------------------------------------------------------
 *  CÓMO INSTALARLO (una sola vez)
 *  --------------------------------------------------------------------------
 *  1. Entra a  https://script.google.com  y crea un proyecto nuevo.
 *  2. Borra lo que venga y pega TODO este archivo.
 *  3. Guarda el token de Samsara con la función guardarTokenSamsara().
 *  4. Elige el AMBIENTE y guarda su ClientSecret con guardarSecretNstech().
 *  5. Ejecuta  verJsonParaNstech  para revisar el JSON antes de enviar nada.
 *  6. Ejecuta  probarUnaVez  y revisa el registro (Ver > Registros).
 *  7. Ejecuta  activarAutomatico  para que corra solo cada 5 minutos.
 *
 *  IMPORTANTE: los ClientSecret NO se escriben en el código de forma
 *  permanente. Se guardan cifrados con guardarSecretNstech().
 * ============================================================================
 */


/* ===========================================================================
 *  1) INTERRUPTOR DE AMBIENTE  -- cambia solo esta palabra
 * ---------------------------------------------------------------------------
 *      "HOMOLOGACION"  -> pruebas
 *      "PRODUCCION"    -> real
 * ========================================================================= */
const AMBIENTE = "PRODUCCION";


/* ===========================================================================
 *  2) DATOS DE CADA AMBIENTE  (ya vienen cargados con lo que te dio NSTech)
 * ---------------------------------------------------------------------------
 *  Los ClientSecret NO van aquí: se guardan cifrados con guardarSecretNstech().
 * ========================================================================= */
const NSTECH = {
  HOMOLOGACION: {
    tokenUrl:     "https://nsapps-hml.nstech.com.br/auth/realms/zeus/protocol/openid-connect/token",
    positionsUrl: "https://nsapps-hml.nstech.com.br/zeus/api/integra/v1/positions",
    eventsUrl:    "https://nsapps-hml.nstech.com.br/zeus/api/integra/v2/events",
    accountId:    "d4c2ce7f-10e3-4394-9168-3278db0e07ed",
    technologyId: "dbab26b4-7a6d-42b4-a557-1e687327dfcc",
    clientId:     "dbab26b4-7a6d-42b4-a557-1e687327dfcc",
    secretKey:    "NSTECH_SECRET_HML"   // dónde se guarda el ClientSecret de pruebas
  },
  PRODUCCION: {
    tokenUrl:     "https://iam.nstech.com.br/realms/zeus/protocol/openid-connect/token",
    positionsUrl: "https://nsapps.nstech.com.br/zeus/api/integra/v1/positions",
    eventsUrl:    "https://nsapps.nstech.com.br/zeus/api/integra/v2/events",
    accountId:    "52a4b1da-8e17-49c5-b490-d98ff1b390e0",
    technologyId: "e84b9d5d-06c7-4d11-9c1d-bd09fd262580",
    clientId:     "e84b9d5d-06c7-4d11-9c1d-bd09fd262580",
    secretKey:    "NSTECH_SECRET_PROD"  // dónde se guarda el ClientSecret real
  }
};

// Atajo: la configuración del ambiente elegido arriba.
const N = NSTECH[AMBIENTE];

// Endpoint de Samsara. Pedimos gps + encendido + odómetro en una sola llamada.
const SAMSARA_URL =
  "https://api.samsara.com/fleet/vehicles/stats" +
  "?types=gps,engineStates,obdOdometerMeters";

// -- MAPEO DE UNIDADES (opcional) --
// Convierte el nombre del vehículo en Samsara -> el device_id que espera NSTech.
// Si lo dejas vacío {}, se usa el nombre del vehículo de Samsara tal cual.
const MAPEO_DEVICE_ID = {
  // "Nombre en Samsara": "device_id en NSTech",
};


/* ===========================================================================
 *  3) GUARDAR CREDENCIALES  (ejecutar UNA sola vez cada una)
 * ---------------------------------------------------------------------------
 *  Pega el valor, ejecuta la función una vez, y luego borra el valor.
 *  Quedan almacenados cifrados en el proyecto.
 * ========================================================================= */

function guardarTokenSamsara() {
  const TOKEN = "PEGA_AQUI_TU_TOKEN_DE_SAMSARA";
  PropertiesService.getScriptProperties().setProperty("SAMSARA_TOKEN", TOKEN);
  Logger.log("Token de Samsara guardado. Ya puedes borrarlo de esta función.");
}

// Guarda el ClientSecret del ambiente elegido arriba (AMBIENTE).
// Cambia AMBIENTE y ejecútala una vez por cada ambiente que uses.
function guardarSecretNstech() {
  const SECRET = "PEGA_AQUI_EL_CLIENT_SECRET_DE_NSTECH";
  PropertiesService.getScriptProperties().setProperty(N.secretKey, SECRET);
  Logger.log("ClientSecret guardado para el ambiente " + AMBIENTE +
             ". Ya puedes borrarlo de esta función.");
}


/* ===========================================================================
 *  4) OBTENER TOKEN DE ACCESO A NSTECH  (OAuth2 client_credentials)
 * ========================================================================= */
function obtenerTokenNstech() {
  const secret = PropertiesService.getScriptProperties().getProperty(N.secretKey);
  if (!secret) {
    Logger.log("ERROR: falta el ClientSecret para " + AMBIENTE +
               ". Ejecuta guardarSecretNstech() con ese ambiente seleccionado.");
    return null;
  }

  const cuerpo =
    "grant_type=client_credentials" +
    "&client_id="     + encodeURIComponent(N.clientId) +
    "&client_secret=" + encodeURIComponent(secret);

  const resp = UrlFetchApp.fetch(N.tokenUrl, {
    method: "post",
    contentType: "application/x-www-form-urlencoded",
    payload: cuerpo,
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() !== 200) {
    Logger.log("No se pudo obtener token de NSTech (" + AMBIENTE + "). Error " +
               resp.getResponseCode() + ": " + resp.getContentText());
    return null;
  }

  return JSON.parse(resp.getContentText()).access_token;
}


/* ===========================================================================
 *  5) FUNCIÓN PRINCIPAL  -- pide a Samsara y entrega a NSTech
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

  // --- Paso 3: pedir el token de acceso a NSTech ---
  const accessToken = obtenerTokenNstech();
  if (!accessToken) return;

  // --- Paso 4: entregar las posiciones a NSTech ---
  const envio = UrlFetchApp.fetch(N.positionsUrl, {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + accessToken },
    payload: JSON.stringify(cuerpo),
    muteHttpExceptions: true
  });

  Logger.log("[" + AMBIENTE + "] Enviadas " + cuerpo.positions.length +
             " posiciones. Respuesta " + envio.getResponseCode() + ": " +
             envio.getContentText());
}


/* ===========================================================================
 *  6) TRANSFORMACIÓN  Samsara  ->  formato NSTech
 * ========================================================================= */
function transformarANstech(datosSamsara) {
  const lista = datosSamsara.data || [];
  const positions = [];

  lista.forEach(function (v) {
    const gps = v.gps;
    if (!gps) return; // sin GPS no hay posición que enviar

    const deviceId = MAPEO_DEVICE_ID[v.name] || v.name;

    var ignition = "Off";
    if (v.engineStates && v.engineStates.value) {
      ignition = (v.engineStates.value === "Off") ? "Off" : "On";
    }

    // velocidad: Samsara la da en millas/hora -> se convierte a km/h.
    var speedKmh = 0;
    if (typeof gps.speedMilesPerHour === "number") {
      speedKmh = Math.round(gps.speedMilesPerHour * 1.60934);
    }

    // odómetro: Samsara lo da en metros -> se convierte a kilómetros.
    var odometroKm = "";
    if (v.obdOdometerMeters && typeof v.obdOdometerMeters.value === "number") {
      odometroKm = String(Math.round(v.obdOdometerMeters.value / 1000));
    }

    positions.push({
      "position_type": "GPRS",
      "technology_id": N.technologyId,
      "account_id":    N.accountId,
      "date":          gps.time,          // ya viene en formato ISO
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
 *  7) UTILIDADES
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
  Logger.log("[" + AMBIENTE + "]\n" + JSON.stringify(cuerpo, null, 2));
}
