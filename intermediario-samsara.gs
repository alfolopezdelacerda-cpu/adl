/**
 * ============================================================================
 *  INTERMEDIARIO SAMSARA  ->  PLATAFORMA DEL CLIENTE
 * ============================================================================
 *
 *  ¿Qué hace este script?
 *    1. Le pide a Samsara las ubicaciones GPS de tus vehículos.
 *    2. Le entrega ese JSON a la plataforma de tu cliente.
 *
 *  Corre solo, cada X minutos, en la nube de Google. No necesitas servidor.
 *
 *  --------------------------------------------------------------------------
 *  CÓMO INSTALARLO (una sola vez)
 *  --------------------------------------------------------------------------
 *  1. Entra a  https://script.google.com  y crea un proyecto nuevo.
 *  2. Borra lo que venga y pega TODO este archivo.
 *  3. Guarda el token de Samsara de forma segura (ver función guardarToken).
 *  4. Rellena la constante CLIENTE_URL con la URL que te dé tu cliente.
 *  5. Ejecuta la función  probarUnaVez  para verificar que funciona.
 *  6. Ejecuta la función  activarAutomatico  para que corra solo cada 5 min.
 *
 *  IMPORTANTE: nunca escribas tu token de Samsara directamente en el código
 *  ni lo compartas. Usa la función guardarToken (lo deja cifrado en Google).
 * ============================================================================
 */


/* ===========================================================================
 *  1) CONFIGURACIÓN  -- rellena esto
 * ========================================================================= */

// URL del buzón de tu cliente (donde ellos RECIBEN los datos).
// Te la tiene que dar tu cliente. Ejemplo: "https://api.cliente.com/gps"
const CLIENTE_URL = "PEGA_AQUI_LA_URL_DE_TU_CLIENTE";

// Endpoint de Samsara del que sacamos las ubicaciones. Normalmente no se cambia.
const SAMSARA_URL = "https://api.samsara.com/fleet/vehicles/locations";


/* ===========================================================================
 *  2) GUARDAR EL TOKEN DE SAMSARA  (ejecutar UNA sola vez)
 * ---------------------------------------------------------------------------
 *  Pega tu token entre las comillas, ejecuta esta función una vez, y luego
 *  BORRA el token de aquí y vuelve a guardar. Queda almacenado cifrado.
 * ========================================================================= */
function guardarToken() {
  const MI_TOKEN = "PEGA_AQUI_TU_TOKEN_DE_SAMSARA";
  PropertiesService.getScriptProperties().setProperty("SAMSARA_TOKEN", MI_TOKEN);
  Logger.log("Token guardado correctamente. Ya puedes borrarlo de esta función.");
}


/* ===========================================================================
 *  3) FUNCIÓN PRINCIPAL  -- pide a Samsara y entrega al cliente
 * ========================================================================= */
function enviarUbicacionesAlCliente() {
  const token = PropertiesService.getScriptProperties().getProperty("SAMSARA_TOKEN");
  if (!token) {
    Logger.log("ERROR: no hay token guardado. Ejecuta primero guardarToken().");
    return;
  }

  // --- Paso 1: pedir los datos a Samsara ---
  const respuesta = UrlFetchApp.fetch(SAMSARA_URL, {
    method: "get",
    headers: { "Authorization": "Bearer " + token },
    muteHttpExceptions: true
  });

  if (respuesta.getResponseCode() !== 200) {
    Logger.log("Samsara respondió con error " + respuesta.getResponseCode() +
               ": " + respuesta.getContentText());
    return;
  }

  const datosSamsara = JSON.parse(respuesta.getContentText());

  // --- Paso 2 (opcional): adaptar al formato que pide el cliente ---
  // Si tu cliente quiere los datos tal cual salen de Samsara, deja esta línea.
  // Si quiere otro formato, cámbialo en la función transformar() más abajo.
  const paraElCliente = transformar(datosSamsara);

  // --- Paso 3: entregar al cliente ---
  const envio = UrlFetchApp.fetch(CLIENTE_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(paraElCliente),
    muteHttpExceptions: true
  });

  Logger.log("Enviado al cliente. Código de respuesta: " + envio.getResponseCode());
}


/* ===========================================================================
 *  4) TRANSFORMACIÓN AL FORMATO DEL CLIENTE
 * ---------------------------------------------------------------------------
 *  Por defecto reenvía el JSON de Samsara sin cambios. Si tu cliente pide
 *  campos con otros nombres, aquí es donde se ajusta.
 * ========================================================================= */
function transformar(datosSamsara) {
  // --- Opción 1: reenviar tal cual (por defecto) ---
  return datosSamsara;

  // --- Opción 2 (ejemplo): quedarte solo con lo esencial ---
  // Descomenta y ajusta si el cliente pide un formato propio:
  /*
  const vehiculos = (datosSamsara.data || []).map(function (v) {
    return {
      unidad:     v.name,
      idVehiculo: v.id,
      fecha:      v.location ? v.location.time      : null,
      latitud:    v.location ? v.location.latitude  : null,
      longitud:   v.location ? v.location.longitude : null,
      rumbo:      v.location ? v.location.heading    : null,
      velocidad:  v.location ? v.location.speed      : null
    };
  });
  return { vehiculos: vehiculos };
  */
}


/* ===========================================================================
 *  5) UTILIDADES
 * ========================================================================= */

// Ejecuta esto para probar el flujo completo una vez (revisa el registro).
function probarUnaVez() {
  enviarUbicacionesAlCliente();
}

// Activa el envío automático cada 5 minutos.
function activarAutomatico() {
  desactivarAutomatico(); // evita duplicar temporizadores
  ScriptApp.newTrigger("enviarUbicacionesAlCliente")
    .timeBased()
    .everyMinutes(5)
    .create();
  Logger.log("Automático activado: se enviará cada 5 minutos.");
}

// Detiene el envío automático.
function desactivarAutomatico() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "enviarUbicacionesAlCliente") {
      ScriptApp.deleteTrigger(t);
    }
  });
  Logger.log("Automático desactivado.");
}

// Solo para ver qué te devuelve Samsara (útil para enseñárselo al cliente).
function verJsonDeSamsara() {
  const token = PropertiesService.getScriptProperties().getProperty("SAMSARA_TOKEN");
  const respuesta = UrlFetchApp.fetch(SAMSARA_URL, {
    method: "get",
    headers: { "Authorization": "Bearer " + token },
    muteHttpExceptions: true
  });
  Logger.log(respuesta.getContentText());
}
