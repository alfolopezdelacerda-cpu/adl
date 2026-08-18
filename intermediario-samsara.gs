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

// -- EVENTOS / ALERTAS --
// Valor de event_type que espera NSTech para el BOTÓN DE PÁNICO.
// OJO: CONFIRMAR con Thiago el valor exacto de su catálogo (aquí va un supuesto).
const EVENT_TYPE_PANICO = "PanicButton";


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
 *  7) EVENTOS / ALERTAS  (botón de pánico)
 * ---------------------------------------------------------------------------
 *  Las alertas son urgentes: Samsara nos AVISA en el momento (webhook) y las
 *  reenviamos de inmediato a NSTech. Este bloque tiene:
 *    - construirEventoNstech(): arma un evento en el formato de NSTech.
 *    - enviarEventosANstech():  lo entrega en el endpoint /events de NSTech.
 *    - probarEventoPanico():    prueba el endpoint de eventos SIN Samsara.
 *    - doPost():                recibe el aviso de Samsara y lo reenvía.
 * ========================================================================= */

// Arma un evento con la estructura exacta que pide NSTech.
// El "payload" es OPCIONAL: para el botón de pánico NSTech no lo exige, así que
// si no se pasan "detalles", el campo payload NO se incluye.
function construirEventoNstech(deviceId, fechaISO, latitud, longitud, eventType, detalles) {
  const evento = {
    "technology_id": N.technologyId,
    "account_id":    N.accountId,
    "date":          fechaISO,                 // ej. 2026-08-13T14:34:32.882Z
    "device_id":     deviceId,
    "event_type":    eventType,
    "latitude":      Number(latitud),          // número, no texto
    "longitude":     Number(longitud)          // número, no texto
  };
  // Solo se agrega payload si hace falta (para eventos que sí lo requieren).
  if (detalles) {
    evento.payload = (typeof detalles === "string") ? detalles : JSON.stringify(detalles);
  }
  return evento;
}

// Entrega uno o varios eventos en el endpoint /events de NSTech.
function enviarEventosANstech(listaEventos) {
  const accessToken = obtenerTokenNstech();
  if (!accessToken) return null;

  const envio = UrlFetchApp.fetch(N.eventsUrl, {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + accessToken },
    payload: JSON.stringify({ "events": listaEventos }),
    muteHttpExceptions: true
  });

  Logger.log("[" + AMBIENTE + "] Eventos: Respuesta " + envio.getResponseCode() +
             ": " + envio.getContentText());
  return envio;
}

// PRUEBA: envía a NSTech un evento de botón de pánico de EJEMPLO (sin Samsara).
// Sirve para validar el endpoint de eventos igual que hicimos con posiciones.
function probarEventoPanico() {
  // Para el botón de pánico NO se envía payload (es opcional según NSTech).
  const evento = construirEventoNstech(
    "TR09",                                     // device_id de prueba
    new Date().toISOString(),                   // fecha/hora actual
    19.432608,                                  // latitud de ejemplo
    -99.133209,                                 // longitud de ejemplo
    EVENT_TYPE_PANICO
  );
  enviarEventosANstech([evento]);
}

// Muestra el JSON de evento de pánico SIN enviarlo (para revisar / mandar a Thiago).
function verJsonEventoPanico() {
  const evento = construirEventoNstech(
    "TR09", new Date().toISOString(), 19.432608, -99.133209, EVENT_TYPE_PANICO
  );
  Logger.log("[" + AMBIENTE + "]\n" + JSON.stringify({ "events": [evento] }, null, 2));
}

/**
 * Recibe el aviso de Samsara cuando se activa una alerta (webhook) y lo reenvía
 * a NSTech. Para que funcione hay que PUBLICAR este script como "Aplicación web"
 * y poner esa URL en la alerta de Samsara. (Fase 2 — ver instrucciones.)
 *
 * NOTA: el formato exacto que manda Samsara lo confirmaremos con un pánico real;
 * por eso guardamos el contenido crudo en el registro para ajustarlo.
 */
function doPost(e) {
  try {
    const crudo = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    Logger.log("Webhook recibido de Samsara: " + crudo);

    const datos = JSON.parse(crudo);

    // Extracción best-effort (se afinará al ver un pánico real de Samsara).
    const d = datos.data || datos;
    const vehiculo = d.vehicle || d.device || {};
    const gps      = d.gps || d.location || {};

    // Si Samsara manda un aviso de PRUEBA/validación (sin datos de vehículo ni
    // ubicación), solo lo registramos y NO lo reenviamos como pánico a NSTech.
    const tieneVehiculo = !!(vehiculo.name || vehiculo.id);
    const tieneGps = (gps.latitude != null && gps.longitude != null);
    if (!tieneVehiculo && !tieneGps) {
      Logger.log("Aviso de prueba/validación de Samsara (sin datos). No se reenvía a NSTech.");
      return ContentService.createTextOutput("OK");
    }

    const nombre   = vehiculo.name || vehiculo.id || "DESCONOCIDO";
    const deviceId = MAPEO_DEVICE_ID[nombre] || nombre;
    const fecha    = datos.eventTime || d.time || gps.time || new Date().toISOString();
    const lat      = gps.latitude != null ? gps.latitude : 0;
    const lng      = gps.longitude != null ? gps.longitude : 0;

    // Botón de pánico: sin payload (opcional). Se agregaría solo para otros
    // tipos de evento que sí lo requieran.
    const evento = construirEventoNstech(
      deviceId, fecha, lat, lng, EVENT_TYPE_PANICO
    );

    enviarEventosANstech([evento]);
    return ContentService.createTextOutput("OK");
  } catch (err) {
    Logger.log("Error en doPost: " + err);
    return ContentService.createTextOutput("ERROR");
  }
}


/* ===========================================================================
 *  8) UTILIDADES
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

// Arma la SOLICITUD COMPLETA (método, URL, headers y cuerpo) para compartirla
// con el equipo técnico de NSTech. NO envía nada: solo la muestra en el registro.
function verSolicitudCompleta() {
  const tokenSamsara = PropertiesService.getScriptProperties().getProperty("SAMSARA_TOKEN");
  const resp = UrlFetchApp.fetch(SAMSARA_URL, {
    method: "get",
    headers: { "Authorization": "Bearer " + tokenSamsara },
    muteHttpExceptions: true
  });
  const cuerpo = transformarANstech(JSON.parse(resp.getContentText()));
  const bodyStr = JSON.stringify(cuerpo);

  const accessToken = obtenerTokenNstech();
  const tokenMostrado = accessToken ? accessToken : "<NO_SE_PUDO_OBTENER_TOKEN>";

  var texto = "";
  texto += "===== SOLICITUD COMPLETA (" + AMBIENTE + ") =====\n\n";
  texto += "MÉTODO:  POST\n";
  texto += "URL:     " + N.positionsUrl + "\n\n";
  texto += "HEADERS:\n";
  texto += "  Content-Type: application/json\n";
  texto += "  Authorization: Bearer " + tokenMostrado + "\n\n";
  texto += "BODY:\n" + JSON.stringify(cuerpo, null, 2) + "\n\n";
  texto += "===== EQUIVALENTE EN cURL =====\n";
  texto += "curl -X POST '" + N.positionsUrl + "' \\\n";
  texto += "  -H 'Content-Type: application/json' \\\n";
  texto += "  -H 'Authorization: Bearer " + tokenMostrado + "' \\\n";
  texto += "  -d '" + bodyStr + "'\n";

  Logger.log(texto);
}
