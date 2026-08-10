import { useEffect, useMemo, useState } from "react";

const formatearFechaHora = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleString("es-EC");
};

export default function ConfiguracionModulo({
  API_URL,
  usuario,
  institucion,
  institucionId,
  onCerrarSesion,
}) {
  const [vistaInterna, setVistaInterna] = useState("general");
  const [resumen, setResumen] = useState(null);
  const [auditoria, setAuditoria] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [cuentasBancarias, setCuentasBancarias] = useState([]);
  const [cuentaForm, setCuentaForm] = useState({
    banco: "",
  });
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);

  const [estadoRespaldos, setEstadoRespaldos] = useState(null);
  const [respaldosHistoricos, setRespaldosHistoricos] = useState([]);
  const [cargandoRespaldos, setCargandoRespaldos] = useState(false);
  const [accionRespaldos, setAccionRespaldos] = useState("");

  const [impresora, setImpresora] = useState(() => {
    const guardada = localStorage.getItem("posnube_impresora");
    return guardada
      ? JSON.parse(guardada)
      : {
          tipo: "IMIN_80",
          ancho: "80",
          impresion_automatica: true,
        };
  });

  const nombreInstitucion =
    institucion?.nombre || "Institución";

  const esAdministrador = ["ADMIN", "SUPER_ADMIN"].includes(
    String(usuario?.rol || "").toUpperCase()
  );

  const ultimoRespaldo = useMemo(() => {
    const clave = `posnube_ultimo_respaldo_${institucionId}`;
    return localStorage.getItem(clave);
  }, [institucionId, descargando]);

  const cargarCuentasBancarias = async () => {
    if (!institucionId) return;
    try {
      const token = localStorage.getItem("token");
      const respuesta = await fetch(
        `${API_URL}/api/configuracion/cuentas-bancarias?institucion_id=${institucionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await respuesta.json();
      setCuentasBancarias(respuesta.ok && Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando cuentas bancarias:", error);
      setCuentasBancarias([]);
    }
  };

  const cargarRespaldos = async () => {
    if (!institucionId) return;

    try {
      setCargandoRespaldos(true);
      const token = localStorage.getItem("token");

      const [respuestaEstado, respuestaLista] = await Promise.all([
        fetch(
          `${API_URL}/api/configuracion/respaldos/estado?institucion_id=${institucionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch(
          `${API_URL}/api/configuracion/respaldos?institucion_id=${institucionId}&limite=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      const dataEstado = await respuestaEstado.json();
      const dataLista = await respuestaLista.json();

      if (!respuestaEstado.ok) {
        throw new Error(
          dataEstado.message || "No se pudo consultar el estado de los respaldos"
        );
      }

      if (!respuestaLista.ok) {
        throw new Error(
          dataLista.message || "No se pudo cargar el historial de respaldos"
        );
      }

      setEstadoRespaldos(dataEstado);
      setRespaldosHistoricos(Array.isArray(dataLista) ? dataLista : []);
    } catch (error) {
      console.error("Error cargando respaldos:", error);
      setEstadoRespaldos(null);
      setRespaldosHistoricos([]);
      setMensaje(error.message || "No se pudieron cargar los respaldos.");
    } finally {
      setCargandoRespaldos(false);
    }
  };

  const ejecutarAccionRespaldos = async (ruta, mensajeExito) => {
    try {
      setAccionRespaldos(ruta);
      setMensaje("");

      const token = localStorage.getItem("token");
      const respuesta = await fetch(
        `${API_URL}/api/configuracion/respaldos/${ruta}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || "No se pudo completar la operación.");
      }

      setMensaje(data.message || mensajeExito);
      await cargarRespaldos();
      return data;
    } catch (error) {
      console.error("Error en acción de respaldos:", error);
      setMensaje(error.message || "No se pudo completar la operación.");
      return null;
    } finally {
      setAccionRespaldos("");
    }
  };

  const generarRespaldoHoy = async () => {
    const data = await ejecutarAccionRespaldos(
      "generar-hoy",
      "Respaldo diario generado correctamente."
    );
    if (data) await cargarDatos();
  };

  const conservarRespaldos = async () => {
    const data = await ejecutarAccionRespaldos(
      "conservar",
      "Los respaldos vencidos se conservarán."
    );
    if (data) await cargarDatos();
  };

  const autorizarEliminacionRespaldos = async () => {
    const vencidos = Number(estadoRespaldos?.estado?.vencidos || 0);

    if (vencidos <= 0) {
      setMensaje("No existen respaldos de 90 días o más pendientes de eliminación.");
      return;
    }

    const primeraConfirmacion = window.confirm(
      `Hay ${vencidos} respaldo(s) con 90 días o más. ¿Deseas autorizar su eliminación?`
    );

    if (!primeraConfirmacion) return;

    const segundaConfirmacion = window.confirm(
      "Esta acción eliminará definitivamente los respaldos vencidos y quedará registrada en Auditoría. ¿Confirmas la eliminación?"
    );

    if (!segundaConfirmacion) return;

    const data = await ejecutarAccionRespaldos(
      "autorizar-eliminacion",
      "Eliminación autorizada y completada."
    );
    if (data) await cargarDatos();
  };

  const descargarRespaldoHistorico = async (respaldo) => {
    try {
      setAccionRespaldos(`descargar-${respaldo.id}`);
      setMensaje("");

      const token = localStorage.getItem("token");
      const respuesta = await fetch(
        `${API_URL}/api/configuracion/respaldos/${respaldo.id}/descargar?institucion_id=${institucionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => ({}));
        throw new Error(data.message || "No se pudo descargar el respaldo.");
      }

      const blob = await respuesta.blob();
      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download =
        respaldo.archivo_nombre ||
        `POSNUBE_RESPALDO_${respaldo.fecha_respaldo || respaldo.id}.json`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(url);

      setMensaje("Respaldo histórico descargado correctamente.");
      await cargarDatos();
    } catch (error) {
      console.error("Error descargando respaldo histórico:", error);
      setMensaje(error.message || "No se pudo descargar el respaldo.");
    } finally {
      setAccionRespaldos("");
    }
  };

  const cargarDatos = async () => {
    if (!institucionId) return;

    try {
      setCargando(true);
      setMensaje("");

      const token = localStorage.getItem("token");

      const [respuestaResumen, respuestaAuditoria] =
        await Promise.all([
          fetch(
            `${API_URL}/api/configuracion/resumen?institucion_id=${institucionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          ),
          fetch(
            `${API_URL}/api/configuracion/auditoria?institucion_id=${institucionId}&limite=100`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          ),
        ]);

      const dataResumen = await respuestaResumen.json();
      const dataAuditoria = await respuestaAuditoria.json();

      if (!respuestaResumen.ok) {
        throw new Error(
          dataResumen.message ||
            "No se pudo cargar la configuración"
        );
      }

      setResumen(dataResumen);
      setAuditoria(
        respuestaAuditoria.ok && Array.isArray(dataAuditoria)
          ? dataAuditoria
          : []
      );
      await cargarCuentasBancarias();
      await cargarRespaldos();
    } catch (error) {
      console.error("Error cargando configuración:", error);
      setMensaje(error.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [institucionId]);

  const descargarRespaldo = async () => {
    try {
      setDescargando(true);
      setMensaje("");

      const token = localStorage.getItem("token");

      const respuesta = await fetch(
        `${API_URL}/api/configuracion/respaldo?institucion_id=${institucionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!respuesta.ok) {
        const data = await respuesta.json();
        throw new Error(
          data.message || "No se pudo generar el respaldo"
        );
      }

      const blob = await respuesta.blob();
      const encabezado =
        respuesta.headers.get("content-disposition") || "";

      const coincidencia = encabezado.match(/filename="([^"]+)"/);
      const nombreArchivo =
        coincidencia?.[1] ||
        `POSNUBE_RESPALDO_${new Date()
          .toISOString()
          .slice(0, 10)}.json`;

      const url = window.URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = nombreArchivo;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      window.URL.revokeObjectURL(url);

      const ahora = new Date().toISOString();
      localStorage.setItem(
        `posnube_ultimo_respaldo_${institucionId}`,
        ahora
      );

      setMensaje(
        "Respaldo descargado correctamente. Guárdalo también en Google Drive, OneDrive o una memoria externa."
      );

      await cargarDatos();
    } catch (error) {
      console.error("Error descargando respaldo:", error);
      setMensaje(error.message);
    } finally {
      setDescargando(false);
    }
  };

  const guardarImpresora = () => {
    localStorage.setItem(
      "posnube_impresora",
      JSON.stringify(impresora)
    );

    setMensaje(
      "Configuración de impresora guardada en este dispositivo."
    );
  };

  const guardarCuentaBancaria = async (e) => {
    e.preventDefault();

    if (!cuentaForm.banco.trim()) {
      setMensaje("Debes ingresar el nombre del banco.");
      return;
    }

    try {
      setGuardandoCuenta(true);
      const token = localStorage.getItem("token");

      const respuesta = await fetch(
        `${API_URL}/api/configuracion/cuentas-bancarias`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
            banco: cuentaForm.banco.trim(),
          }),
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(data.message || "No se pudo registrar el banco");
      }

      setCuentaForm({ banco: "" });
      setMensaje("Banco registrado correctamente.");
      await cargarCuentasBancarias();

      window.dispatchEvent(
        new CustomEvent("posnube:bancos-actualizados")
      );
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setGuardandoCuenta(false);
    }
  };

  const cambiarEstadoCuenta = async (cuenta) => {
    try {
      const token = localStorage.getItem("token");
      const respuesta = await fetch(`${API_URL}/api/configuracion/cuentas-bancarias/${cuenta.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ institucion_id: Number(institucionId), activo: cuenta.activo === false }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(
          data.message || "No se pudo actualizar el banco"
        );
      }

      await cargarCuentasBancarias();

      window.dispatchEvent(
        new CustomEvent("posnube:bancos-actualizados")
      );
    } catch (error) {
      setMensaje(error.message);
    }
  };

  if (!esAdministrador) {
    return (
      <div style={ui.card}>
        <h2>Configuración</h2>
        <div style={ui.error}>
          Este módulo está disponible únicamente para administradores.
        </div>
      </div>
    );
  }

  return (
    <div style={ui.wrapper}>
      <div style={ui.header}>
        <div>
          <h2 style={ui.title}>Configuración</h2>
          <p style={ui.subtitle}>
            Seguridad, respaldos y opciones de {nombreInstitucion}.
          </p>
        </div>

        <button
          type="button"
          style={ui.refreshButton}
          onClick={cargarDatos}
          disabled={cargando}
        >
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div style={ui.tabs}>
        {[
          ["general", "General"],
          ["seguridad", "Seguridad"],
          ["respaldos", "Copias de seguridad"],
          ["auditoria", "Auditoría"],
          ["impresoras", "Impresoras"],
          ["bancos", "Bancos"],
        ].map(([id, texto]) => (
          <button
            key={id}
            type="button"
            style={
              vistaInterna === id
                ? ui.tabActive
                : ui.tab
            }
            onClick={() => setVistaInterna(id)}
          >
            {texto}
          </button>
        ))}
      </div>

      {mensaje && (
        <div
          style={
            mensaje.toLowerCase().includes("no se pudo")
              ? ui.error
              : ui.success
          }
        >
          {mensaje}
        </div>
      )}

      {vistaInterna === "general" && (
        <div>
          <div style={ui.metrics}>
            <div style={ui.metric}>
              <span style={ui.metricLabel}>Institución</span>
              <strong style={ui.metricText}>
                {nombreInstitucion}
              </strong>
            </div>

            <div style={ui.metric}>
              <span style={ui.metricLabel}>Usuario conectado</span>
              <strong style={ui.metricText}>
                {usuario?.correo || usuario?.nombre || "-"}
              </strong>
            </div>

            <div style={ui.metric}>
              <span style={ui.metricLabel}>Rol</span>
              <strong style={ui.metricText}>
                {usuario?.rol || "-"}
              </strong>
            </div>

            <div style={ui.metric}>
              <span style={ui.metricLabel}>Base de datos</span>
              <strong style={ui.metricText}>
                PostgreSQL en Render
              </strong>
            </div>
          </div>

          <div style={ui.card}>
            <h3 style={ui.sectionTitle}>
              Información almacenada
            </h3>

            <div style={ui.countGrid}>
              {Object.entries(resumen?.conteos || {}).map(
                ([nombre, cantidad]) => (
                  <div key={nombre} style={ui.countItem}>
                    <span style={ui.countName}>
                      {nombre.replaceAll("_", " ")}
                    </span>
                    <strong style={ui.countValue}>
                      {Number(cantidad || 0)}
                    </strong>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {vistaInterna === "seguridad" && (
        <div style={ui.grid}>
          <div style={ui.card}>
            <h3 style={ui.sectionTitle}>
              Protecciones activas
            </h3>

            <div style={ui.securityList}>
              <div>✓ Contraseñas protegidas con bcrypt</div>
              <div>✓ Sesiones mediante JWT</div>
              <div>✓ Consultas SQL parametrizadas</div>
              <div>✓ Separación de datos por institución</div>
              <div>✓ Conexión HTTPS mediante Render</div>
              <div>✓ Acceso de respaldos solo para administradores</div>
            </div>
          </div>

          <div style={ui.card}>
            <h3 style={ui.sectionTitle}>
              Sesión actual
            </h3>

            <p style={ui.paragraph}>
              Usuario: <strong>{usuario?.correo}</strong>
            </p>
            <p style={ui.paragraph}>
              Institución: <strong>{nombreInstitucion}</strong>
            </p>
            <p style={ui.paragraph}>
              No compartas la contraseña del administrador con cajeros.
            </p>

            <button
              type="button"
              style={ui.dangerButton}
              onClick={onCerrarSesion}
            >
              Cerrar sesión en este equipo
            </button>
          </div>

          <div style={ui.notice}>
            <strong>Recomendación:</strong> usa una contraseña distinta
            para cada institución, de al menos 10 caracteres, y cambia
            las claves cuando un empleado deje de trabajar.
          </div>
        </div>
      )}

      {vistaInterna === "respaldos" && (
        <div style={ui.backupSection}>
          {estadoRespaldos?.alerta?.mostrar && (
            <div
              style={
                estadoRespaldos?.alerta?.tipo === "REQUIERE_AUTORIZACION"
                  ? ui.backupAlertDanger
                  : ui.backupAlertWarning
              }
            >
              <div>
                <strong>
                  {estadoRespaldos?.alerta?.tipo === "REQUIERE_AUTORIZACION"
                    ? "⚠ Respaldos pendientes de autorización"
                    : "⏳ Respaldos próximos a cumplir 90 días"}
                </strong>
                <p style={ui.alertText}>{estadoRespaldos?.alerta?.mensaje}</p>

                {estadoRespaldos?.estado?.vencido_mas_antiguo && (
                  <p style={ui.alertMeta}>
                    Respaldo vencido más antiguo:{" "}
                    <strong>
                      {formatearFechaHora(
                        estadoRespaldos.estado.vencido_mas_antiguo
                      )}
                    </strong>
                  </p>
                )}
              </div>

              {estadoRespaldos?.alerta?.tipo === "REQUIERE_AUTORIZACION" && (
                <div style={ui.backupActions}>
                  <button
                    type="button"
                    style={ui.keepButton}
                    onClick={conservarRespaldos}
                    disabled={Boolean(accionRespaldos)}
                  >
                    {accionRespaldos === "conservar"
                      ? "Registrando..."
                      : "Conservar respaldos"}
                  </button>

                  <button
                    type="button"
                    style={ui.dangerButton}
                    onClick={autorizarEliminacionRespaldos}
                    disabled={Boolean(accionRespaldos)}
                  >
                    {accionRespaldos === "autorizar-eliminacion"
                      ? "Eliminando..."
                      : "Autorizar eliminación"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={ui.backupMetrics}>
            <div style={ui.metric}>
              <span style={ui.metricLabel}>Respaldos almacenados</span>
              <strong style={ui.metricText}>
                {Number(estadoRespaldos?.estado?.total || 0)}
              </strong>
            </div>

            <div style={ui.metric}>
              <span style={ui.metricLabel}>Próximos a 90 días</span>
              <strong style={ui.metricText}>
                {Number(estadoRespaldos?.estado?.proximos_a_vencer || 0)}
              </strong>
            </div>

            <div style={ui.metric}>
              <span style={ui.metricLabel}>90 días o más</span>
              <strong
                style={{
                  ...ui.metricText,
                  color:
                    Number(estadoRespaldos?.estado?.vencidos || 0) > 0
                      ? "#b91c1c"
                      : "#1726a8",
                }}
              >
                {Number(estadoRespaldos?.estado?.vencidos || 0)}
              </strong>
            </div>

            <div style={ui.metric}>
              <span style={ui.metricLabel}>Último respaldo diario</span>
              <strong style={ui.metricText}>
                {estadoRespaldos?.estado?.respaldo_mas_reciente
                  ? formatearFechaHora(
                      estadoRespaldos.estado.respaldo_mas_reciente
                    )
                  : "Sin respaldos"}
              </strong>
            </div>
          </div>

          <div style={ui.grid}>
            <div style={ui.card}>
              <h3 style={ui.sectionTitle}>Política de copias de seguridad</h3>

              <div style={ui.securityList}>
                <div>✓ Máximo 1 respaldo diario por institución.</div>
                <div>✓ Aviso preventivo desde el día 85.</div>
                <div>✓ Conservación mínima de 90 días.</div>
                <div>✓ No existe eliminación automática.</div>
                <div>✓ Solo ADMIN o SUPER_ADMIN puede autorizar la eliminación.</div>
                <div>✓ Toda decisión queda registrada en Auditoría.</div>
              </div>

              <div style={ui.backupInfo}>
                <span>Respaldo más antiguo</span>
                <strong>
                  {estadoRespaldos?.estado?.respaldo_mas_antiguo
                    ? formatearFechaHora(
                        estadoRespaldos.estado.respaldo_mas_antiguo
                      )
                    : "Todavía no hay respaldos históricos"}
                </strong>
              </div>

              <button
                type="button"
                style={ui.primaryButton}
                onClick={generarRespaldoHoy}
                disabled={Boolean(accionRespaldos)}
              >
                {accionRespaldos === "generar-hoy"
                  ? "Generando..."
                  : "Generar respaldo de hoy"}
              </button>
            </div>

            <div style={ui.card}>
              <h3 style={ui.sectionTitle}>Descarga manual inmediata</h3>

              <p style={ui.paragraph}>
                Esta opción descarga una copia completa a este equipo. No
                reemplaza el respaldo diario almacenado por el sistema.
              </p>

              <div style={ui.backupInfo}>
                <span>Último respaldo descargado en este dispositivo</span>
                <strong>
                  {ultimoRespaldo
                    ? formatearFechaHora(ultimoRespaldo)
                    : "Todavía no se ha descargado"}
                </strong>
              </div>

              <button
                type="button"
                style={ui.primaryButton}
                onClick={descargarRespaldo}
                disabled={descargando}
              >
                {descargando
                  ? "Generando respaldo..."
                  : "Descargar respaldo ahora"}
              </button>

              <div style={ui.warning}>
                Conserva además una copia externa en Google Drive, OneDrive o
                una memoria segura.
              </div>
            </div>
          </div>

          <div style={ui.card}>
            <div style={ui.header}>
              <div>
                <h3 style={ui.sectionTitle}>Historial de respaldos</h3>
                <p style={ui.subtitle}>
                  Puedes revisar antigüedad, estado y descargar cualquier copia.
                </p>
              </div>

              <button
                type="button"
                style={ui.refreshButton}
                onClick={cargarRespaldos}
                disabled={cargandoRespaldos}
              >
                {cargandoRespaldos ? "Actualizando..." : "Actualizar respaldos"}
              </button>
            </div>

            <div style={{ height: 14 }} />

            <div style={ui.tableWrap}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    <th style={ui.th}>Fecha</th>
                    <th style={ui.th}>Antigüedad</th>
                    <th style={ui.th}>Estado</th>
                    <th style={ui.th}>Archivo</th>
                    <th style={ui.th}>Generado por</th>
                    <th style={ui.th}>Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {!respaldosHistoricos.length ? (
                    <tr>
                      <td colSpan="6" style={ui.empty}>
                        {cargandoRespaldos
                          ? "Cargando respaldos..."
                          : "Todavía no existen respaldos históricos."}
                      </td>
                    </tr>
                  ) : (
                    respaldosHistoricos.map((respaldo) => {
                      const estado = String(respaldo.estado || "VIGENTE");

                      return (
                        <tr key={respaldo.id}>
                          <td style={ui.td}>
                            {formatearFechaHora(
                              respaldo.generado_en || respaldo.fecha_respaldo
                            )}
                          </td>
                          <td style={ui.td}>
                            {Number(respaldo.antiguedad_dias || 0)} días
                          </td>
                          <td style={ui.td}>
                            <span
                              style={
                                estado === "VENCIDO"
                                  ? ui.badgeDanger
                                  : estado === "PROXIMO_A_VENCER"
                                  ? ui.badgeWarning
                                  : ui.badgeSuccess
                              }
                            >
                              {estado === "VENCIDO"
                                ? "90 días o más"
                                : estado === "PROXIMO_A_VENCER"
                                ? "Próximo a vencer"
                                : "Vigente"}
                            </span>
                          </td>
                          <td style={ui.td}>
                            {respaldo.archivo_nombre || "-"}
                          </td>
                          <td style={ui.td}>
                            {respaldo.generado_por || "Sistema"}
                          </td>
                          <td style={ui.td}>
                            <button
                              type="button"
                              style={ui.smallButton}
                              onClick={() =>
                                descargarRespaldoHistorico(respaldo)
                              }
                              disabled={Boolean(accionRespaldos)}
                            >
                              {accionRespaldos === `descargar-${respaldo.id}`
                                ? "Descargando..."
                                : "Descargar"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {vistaInterna === "auditoria" && (
        <div style={ui.card}>
          <div style={ui.header}>
            <div>
              <h3 style={ui.sectionTitle}>Historial de auditoría</h3>
              <p style={ui.subtitle}>
                Registra respaldos y acciones administrativas.
              </p>
            </div>
          </div>

          <div style={ui.tableWrap}>
            <table style={ui.table}>
              <thead>
                <tr>
                  <th style={ui.th}>Fecha</th>
                  <th style={ui.th}>Usuario</th>
                  <th style={ui.th}>Acción</th>
                  <th style={ui.th}>Detalle</th>
                  <th style={ui.th}>IP</th>
                </tr>
              </thead>
              <tbody>
                {!auditoria.length ? (
                  <tr>
                    <td colSpan="5" style={ui.empty}>
                      Todavía no hay acciones registradas.
                    </td>
                  </tr>
                ) : (
                  auditoria.map((item) => (
                    <tr key={item.id}>
                      <td style={ui.td}>
                        {formatearFechaHora(item.created_at)}
                      </td>
                      <td style={ui.td}>
                        {item.usuario_correo ||
                          item.usuario_nombre ||
                          "Sistema"}
                      </td>
                      <td style={ui.td}>
                        <span style={ui.badge}>
                          {item.accion}
                        </span>
                      </td>
                      <td style={ui.td}>
                        {item.detalle || "-"}
                      </td>
                      <td style={ui.td}>
                        {item.ip || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vistaInterna === "bancos" && (
        <div style={ui.grid}>
          <div style={ui.card}>
            <h3 style={ui.sectionTitle}>Registrar banco</h3>

            <p style={ui.paragraph}>
              Registra únicamente el nombre del banco. Los números de cuenta se
              compartirán con los padres por un canal privado.
            </p>

            <form onSubmit={guardarCuentaBancaria}>
              <label style={ui.label}>
                Nombre del banco *
                <input
                  style={ui.input}
                  value={cuentaForm.banco}
                  onChange={(e) =>
                    setCuentaForm({
                      banco: e.target.value,
                    })
                  }
                  placeholder="Ej. Banco Pichincha"
                  maxLength={150}
                  required
                />
              </label>

              <div style={{ marginTop: 16 }}>
                <button
                  type="submit"
                  style={ui.primaryButton}
                  disabled={guardandoCuenta}
                >
                  {guardandoCuenta ? "Guardando..." : "Guardar banco"}
                </button>
              </div>
            </form>
          </div>

          <div style={ui.card}>
            <h3 style={ui.sectionTitle}>Bancos registrados</h3>

            <p style={ui.paragraph}>
              Estos nombres aparecerán al registrar una recarga por transferencia.
            </p>

            {!cuentasBancarias.length ? (
              <p style={ui.paragraph}>
                Todavía no existen bancos registrados.
              </p>
            ) : (
              <div style={ui.tableWrap}>
                <table style={ui.table}>
                  <thead>
                    <tr>
                      <th style={ui.th}>Banco</th>
                      <th style={ui.th}>Estado</th>
                      <th style={ui.th}>Acción</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cuentasBancarias.map((cuenta) => (
                      <tr key={cuenta.id}>
                        <td style={ui.td}>{cuenta.banco}</td>
                        <td style={ui.td}>
                          {cuenta.activo === false ? "Inactivo" : "Activo"}
                        </td>
                        <td style={ui.td}>
                          <button
                            type="button"
                            style={
                              cuenta.activo === false
                                ? ui.primaryButton
                                : ui.dangerButton
                            }
                            onClick={() => cambiarEstadoCuenta(cuenta)}
                          >
                            {cuenta.activo === false
                              ? "Activar"
                              : "Desactivar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {vistaInterna === "impresoras" && (
        <div style={ui.card}>
          <h3 style={ui.sectionTitle}>
            Configuración de impresión
          </h3>

          <div style={ui.formGrid}>
            <label style={ui.label}>
              Tipo de dispositivo
              <select
                style={ui.input}
                value={impresora.tipo}
                onChange={(e) =>
                  setImpresora({
                    ...impresora,
                    tipo: e.target.value,
                  })
                }
              >
                <option value="IMIN_80">
                  iMin Falcon 1 integrada
                </option>
                <option value="TERMICA_WINDOWS">
                  Impresora térmica instalada en Windows
                </option>
                <option value="NAVEGADOR">
                  Cualquier impresora del navegador
                </option>
              </select>
            </label>

            <label style={ui.label}>
              Ancho del papel
              <select
                style={ui.input}
                value={impresora.ancho}
                onChange={(e) =>
                  setImpresora({
                    ...impresora,
                    ancho: e.target.value,
                  })
                }
              >
                <option value="80">80 mm</option>
                <option value="58">58 mm</option>
              </select>
            </label>

            <label style={ui.checkRow}>
              <input
                type="checkbox"
                checked={impresora.impresion_automatica}
                onChange={(e) =>
                  setImpresora({
                    ...impresora,
                    impresion_automatica: e.target.checked,
                  })
                }
              />
              Imprimir automáticamente después de guardar una venta
            </label>
          </div>

          <button
            type="button"
            style={ui.primaryButton}
            onClick={guardarImpresora}
          >
            Guardar configuración de impresora
          </button>
        </div>
      )}
    </div>
  );
}

const ui = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    color: "#1726a8",
  },
  subtitle: {
    margin: "5px 0 0",
    color: "#64748b",
  },
  tabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    background: "#ffffff",
    borderRadius: 12,
    padding: 10,
  },
  tab: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  tabActive: {
    border: "1px solid #1726a8",
    background: "#1726a8",
    color: "#ffffff",
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  metric: {
    background: "#ffffff",
    borderRadius: 12,
    padding: 18,
    border: "1px solid #e2e8f0",
  },
  metricLabel: {
    display: "block",
    color: "#64748b",
    marginBottom: 8,
    fontSize: 13,
  },
  metricText: {
    color: "#1726a8",
    overflowWrap: "anywhere",
  },
  card: {
    background: "#ffffff",
    borderRadius: 13,
    padding: 22,
    border: "1px solid #e2e8f0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
  },
  sectionTitle: {
    margin: "0 0 14px",
    color: "#0f172a",
  },
  countGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
  },
  countItem: {
    background: "#eff6ff",
    borderRadius: 10,
    padding: 14,
  },
  countName: {
    display: "block",
    color: "#475569",
    textTransform: "capitalize",
    marginBottom: 5,
  },
  countValue: {
    color: "#1726a8",
    fontSize: 24,
  },
  securityList: {
    display: "flex",
    flexDirection: "column",
    gap: 11,
    color: "#334155",
    lineHeight: 1.45,
  },
  paragraph: {
    color: "#475569",
    lineHeight: 1.5,
  },
  notice: {
    gridColumn: "1 / -1",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e40af",
    borderRadius: 10,
    padding: 16,
  },
  warning: {
    marginTop: 16,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    borderRadius: 9,
    padding: 13,
    lineHeight: 1.45,
  },
  backupInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    margin: "18px 0",
    padding: 14,
    background: "#f8fafc",
    borderRadius: 9,
  },
  primaryButton: {
    border: 0,
    background: "#1726a8",
    color: "#ffffff",
    borderRadius: 8,
    padding: "12px 17px",
    fontWeight: 800,
    cursor: "pointer",
  },
  refreshButton: {
    border: "1px solid #1726a8",
    background: "#ffffff",
    color: "#1726a8",
    borderRadius: 8,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: 0,
    background: "#dc2626",
    color: "#ffffff",
    borderRadius: 8,
    padding: "11px 15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  success: {
    background: "#dcfce7",
    border: "1px solid #86efac",
    color: "#166534",
    borderRadius: 9,
    padding: 13,
  },
  error: {
    background: "#fee2e2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: 9,
    padding: 13,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "12px 10px",
    textAlign: "left",
    background: "#e8efff",
    color: "#1726a8",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px 10px",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "top",
  },
  empty: {
    textAlign: "center",
    padding: 28,
    color: "#64748b",
  },
  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1e40af",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 700,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
    marginBottom: 18,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    fontWeight: 700,
    color: "#334155",
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "11px 12px",
    background: "#ffffff",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#334155",
    fontWeight: 700,
  },
  backupSection: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  backupMetrics: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 14,
  },
  backupAlertWarning: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    background: "#fffbeb",
    border: "1px solid #fbbf24",
    color: "#92400e",
    borderRadius: 12,
    padding: 18,
  },
  backupAlertDanger: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    borderRadius: 12,
    padding: 18,
  },
  alertText: {
    margin: "7px 0 0",
    lineHeight: 1.5,
  },
  alertMeta: {
    margin: "7px 0 0",
    fontSize: 13,
  },
  backupActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  keepButton: {
    border: "1px solid #15803d",
    background: "#ffffff",
    color: "#166534",
    borderRadius: 8,
    padding: "11px 15px",
    fontWeight: 800,
    cursor: "pointer",
  },
  smallButton: {
    border: "1px solid #1726a8",
    background: "#ffffff",
    color: "#1726a8",
    borderRadius: 7,
    padding: "8px 11px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  badgeSuccess: {
    display: "inline-block",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeWarning: {
    display: "inline-block",
    background: "#fef3c7",
    color: "#92400e",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  badgeDanger: {
    display: "inline-block",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 999,
    padding: "4px 8px",
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
};