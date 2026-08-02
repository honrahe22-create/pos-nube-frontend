import { useState } from "react";

export default function AlumnosModulo({
  styles,
  filtroAlumnos,
  setFiltroAlumnos,
  cargarAlumnos,
  alumnoDetalle,
  obtenerCedulaAlumno,
  formatearMoneda,
  setVista,
  setVistaVentasInterna,
  setModoNuevaOrden,
  setVentaItems,
  setVentaForm,
  setBusquedaUsuarioNuevaOrden,
  setBusquedaProductoNuevaOrden,
  setCodigoBarraNuevaOrden,
  setCategoriaNuevaOrden,
  setRecargaForm,
  iniciarEdicionAlumno,
  setAlumnoDetalle,
  setVistaAlumnoDetalle,
  vistaAlumnoDetalle,
  historialVentasAlumno,
  historialConsumoAlumno,
  setOrdenDetalleAlumno,
  ordenDetalleAlumno,
  historialRecargasAlumno,
  editandoAlumnoId,
  actualizarAlumno,
  crearAlumno,
  alumnoForm,
  setAlumnoForm,
  limpiarFormularioAlumno,
  alumnosFiltrados,
  eliminarAlumno,
  restaurarAlumno,
  API_URL,
  obtenerInstitucionActivaId,
  setHistorialVentasAlumno,
  setHistorialRecargasAlumno,
  setHistorialConsumoAlumno
}) {
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [mostrarFiltroAlumnos, setMostrarFiltroAlumnos] = useState(false);
  const [busquedaAlumnos, setBusquedaAlumnos] = useState("");
  const [codigoAccesoGenerado, setCodigoAccesoGenerado] = useState(null);
  const [generandoCodigoAcceso, setGenerandoCodigoAcceso] = useState(false);

  const alumnosFiltradosBusqueda = alumnosFiltrados.filter((alumno) => {
    const texto = busquedaAlumnos.trim().toLowerCase();

    if (!texto) return true;

    const nombres = String(alumno?.nombres || "").toLowerCase();
    const apellidos = String(alumno?.apellidos || "").toLowerCase();
    const cedula = String(obtenerCedulaAlumno(alumno) || "").toLowerCase();

    return (
      nombres.includes(texto) ||
      apellidos.includes(texto) ||
      cedula.includes(texto)
    );
  });

  const regresarListado = () => {
    setAlumnoDetalle(null);
    setVistaAlumnoDetalle("datos");
    setOrdenDetalleAlumno(null);
    setHistorialVentasAlumno([]);
    setHistorialRecargasAlumno([]);
    setHistorialConsumoAlumno([]);
    setBusquedaHistorial("");
    setCodigoAccesoGenerado(null);
    limpiarFormularioAlumno();
  };

  const generarAccesoFamilia = async () => {
    if (!alumnoDetalle?.id) {
      alert("Selecciona un alumno válido.");
      return;
    }

    try {
      setGenerandoCodigoAcceso(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida.");
        return;
      }

      const respuesta = await fetch(
        `${API_URL}/api/consulta-alumno/alumnos/${alumnoDetalle.id}/generar-codigo`,
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
        alert(data.message || "No se pudo generar el acceso para la familia.");
        return;
      }

      setCodigoAccesoGenerado(data);

      const enlace = `${window.location.origin}/?consulta=alumno`;

      try {
        await navigator.clipboard.writeText(
          `Consulta de saldo: ${enlace}\nInstitución: ${institucionId}\nCédula: ${obtenerCedulaAlumno(alumnoDetalle)}\nCódigo: ${data.codigo}`
        );
        alert("Acceso generado. Los datos también se copiaron al portapapeles.");
      } catch {
        alert(`Acceso generado correctamente. Código: ${data.codigo}`);
      }
    } catch (error) {
      console.error("Error generando acceso familiar:", error);
      alert("No se pudo generar el acceso para la familia.");
    } finally {
      setGenerandoCodigoAcceso(false);
    }
  };

  const copiarTextoSeguro = async (texto, mensajeExito) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        alert(mensajeExito);
        return true;
      }

      const areaTemporal = document.createElement("textarea");
      areaTemporal.value = texto;
      areaTemporal.setAttribute("readonly", "");
      areaTemporal.style.position = "fixed";
      areaTemporal.style.opacity = "0";
      document.body.appendChild(areaTemporal);
      areaTemporal.select();

      const copiado = document.execCommand("copy");
      document.body.removeChild(areaTemporal);

      if (copiado) {
        alert(mensajeExito);
        return true;
      }

      window.prompt("Copia manualmente este texto:", texto);
      return false;
    } catch (error) {
      console.error("No se pudo copiar:", error);
      window.prompt("Copia manualmente este texto:", texto);
      return false;
    }
  };

  const obtenerTextoAccesoCompleto = () => {
    if (!codigoAccesoGenerado?.codigo || !alumnoDetalle) return "";

    const enlace = `${window.location.origin}/?consulta=alumno`;
    const institucionId = obtenerInstitucionActivaId();
    const cedula = obtenerCedulaAlumno(alumnoDetalle) || "-";
    const nombre = `${alumnoDetalle.nombres || ""} ${alumnoDetalle.apellidos || ""}`.trim();

    return [
      "ACCESO DE CONSULTA POS NUBE",
      `Alumno: ${nombre || "Alumno"}`,
      `Enlace: ${enlace}`,
      `Institución: ${institucionId}`,
      `Cédula o código: ${cedula}`,
      `Código de acceso: ${codigoAccesoGenerado.codigo}`,
      "",
      "Este acceso es únicamente para consultar saldo, recargas y movimientos.",
    ].join("\n");
  };

  const exportarOrdenesAlumno = (ordenes) => {
    const filas = [["Orden", "Nombre", "Apellido", "Fecha", "Total", "Forma de pago", "Estado"], ...ordenes.map((v) => [v.id || "", alumnoDetalle?.nombres || "", alumnoDetalle?.apellidos || "", v.created_at || "", Number(v.total || 0).toFixed(2), v.metodo_pago || "", v.estado || "Pagada"])];
    const csv = filas.map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `ordenes_alumno_${alumnoDetalle?.id || ""}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  };

  return (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Alumnos</h1>
        <p style={styles.dashboardSubtitle}>
          Ficha central del alumno, saldo, órdenes y recargas
        </p>
      </div>

      <div style={styles.headerActions}>
        {alumnoDetalle ? (
          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              setAlumnoDetalle(null);
              setVistaAlumnoDetalle("datos");
              setOrdenDetalleAlumno(null);
              setHistorialVentasAlumno([]);
              setHistorialRecargasAlumno([]);
              setHistorialConsumoAlumno([]);
              limpiarFormularioAlumno();
            }}
          >
            ← Regresar al listado de alumnos
          </button>
        ) : (
          <>
            <select
              value={filtroAlumnos}
              onChange={(e) => setFiltroAlumnos(e.target.value)}
              style={styles.select}
            >
              <option value="todos">Todos</option>
              <option value="activos">Activos</option>
              <option value="inactivos">Inactivos</option>
            </select>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setMostrarFiltroAlumnos((valorActual) => !valorActual);

                if (mostrarFiltroAlumnos) {
                  setBusquedaAlumnos("");
                }
              }}
            >
              {mostrarFiltroAlumnos ? "Cerrar filtro" : "Filtrar alumno"}
            </button>

            {mostrarFiltroAlumnos && (
              <input
                type="text"
                value={busquedaAlumnos}
                onChange={(e) => setBusquedaAlumnos(e.target.value)}
                placeholder="Nombre, apellido o cédula"
                style={{
                  ...styles.input,
                  width: 260,
                  margin: 0,
                }}
              />
            )}

            <button
              type="button"
              style={styles.refreshButton}
              onClick={cargarAlumnos}
            >
              Refrescar
            </button>
          </>
        )}
      </div>
    </div>

    {alumnoDetalle && (() => {
      const activo = alumnoDetalle.activo !== false;
      const nombreCompleto = `${alumnoDetalle.nombres || ""} ${alumnoDetalle.apellidos || ""}`.trim() || "Alumno";
      const totalPagadas = historialVentasAlumno
        .filter((v) => String(v.estado || "").toUpperCase() !== "PENDIENTE")
        .reduce((acc, v) => acc + Number(v.total || 0), 0);
      const totalPendientes = historialVentasAlumno
        .filter((v) => String(v.estado || "").toUpperCase() === "PENDIENTE")
        .reduce((acc, v) => acc + Number(v.total || 0), 0);
      const ordenesVisibles = historialVentasAlumno.filter((v) => {
        const texto = busquedaHistorial.trim().toLowerCase();
        if (!texto) return true;
        return [v.id, v.metodo_pago, v.estado, v.total, v.created_at]
          .some((valor) => String(valor || "").toLowerCase().includes(texto));
      });

      const irACrearOrden = () => {
        setVista("ventas");
        setVistaVentasInterna("registrar");
        setModoNuevaOrden("consumidor_final");
        setVentaItems([]);
        setVentaForm({ alumno_id: alumnoDetalle.id, metodo_pago: "RECARGA", observacion: "" });
        setBusquedaUsuarioNuevaOrden(nombreCompleto);
        setBusquedaProductoNuevaOrden("");
        setCodigoBarraNuevaOrden("");
        setCategoriaNuevaOrden("TODOS");
      };

      return (
        <div style={paymon.fichaShell}>
          <div style={paymon.hero}>
            <button
              type="button"
              style={paymon.backButton}
              title="Regresar al listado"
              onClick={regresarListado}
            >
              ←
            </button>

            <div style={paymon.avatar}>
              {String(alumnoDetalle.nombres || "A").charAt(0).toUpperCase()}
            </div>

            <div style={paymon.heroIdentity}>
              <h2 style={paymon.heroName}>{nombreCompleto}</h2>
              <div style={paymon.badgeRow}>
                <span style={paymon.studentBadge}>Estudiante</span>
                <span style={activo ? paymon.activeBadge : paymon.inactiveBadge}>
                  {activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>

            <div style={paymon.heroActions}>
              <button
                type="button"
                style={paymon.whiteButton}
                onClick={() => {
                  iniciarEdicionAlumno(alumnoDetalle);
                  setAlumnoDetalle(null);
                }}
              >
                Editar perfil ✎
              </button>
              <button
                type="button"
                style={paymon.familyButton}
                onClick={generarAccesoFamilia}
                disabled={generandoCodigoAcceso}
              >
                {generandoCodigoAcceso ? "Generando..." : "Acceso familias 🔐"}
              </button>
              <button
                type="button"
                style={paymon.monthButton}
                onClick={() => alert("La compra mensual se habilitará en el siguiente ajuste.")}
              >
                Compra mensual ◫
              </button>
              <button type="button" style={paymon.orangeButton} onClick={irACrearOrden}>
                Crear orden ＋
              </button>
            </div>
          </div>

          {codigoAccesoGenerado && (
            <div style={paymon.familyAccessPanel}>
              <div>
                <strong style={paymon.familyAccessTitle}>
                  Acceso de consulta para padres o representantes
                </strong>
                <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 8,
  }}
>
  <span style={{ color: "#047857", fontWeight: 700 }}>
    Enlace:
  </span>

  <button
    type="button"
    title="Haz clic para copiar el enlace"
    onClick={async () => {
      const enlace =
        `${window.location.origin}/?consulta=alumno`;

      try {
        await navigator.clipboard.writeText(enlace);

        alert(
          "Enlace copiado correctamente. Ya puedes pegarlo en WhatsApp."
        );
      } catch (error) {
        const campoTemporal =
          document.createElement("textarea");

        campoTemporal.value = enlace;
        campoTemporal.style.position = "fixed";
        campoTemporal.style.opacity = "0";

        document.body.appendChild(campoTemporal);
        campoTemporal.select();
        document.execCommand("copy");
        document.body.removeChild(campoTemporal);

        alert(
          "Enlace copiado correctamente. Ya puedes pegarlo en WhatsApp."
        );
      }
    }}
    style={{
      border: "none",
      background: "transparent",
      color: "#0563c1",
      textDecoration: "underline",
      padding: 0,
      fontSize: 15,
      cursor: "pointer",
      overflowWrap: "anywhere",
      textAlign: "left",
    }}
  >
    {window.location.origin}/?consulta=alumno
  </button>

  <button
    type="button"
    onClick={async () => {
      const enlace =
        `${window.location.origin}/?consulta=alumno`;

      try {
        await navigator.clipboard.writeText(enlace);

        alert(
          "Enlace copiado correctamente. Ya puedes enviarlo."
        );
      } catch (error) {
        const campoTemporal =
          document.createElement("textarea");

        campoTemporal.value = enlace;
        campoTemporal.style.position = "fixed";
        campoTemporal.style.opacity = "0";

        document.body.appendChild(campoTemporal);
        campoTemporal.select();
        document.execCommand("copy");
        document.body.removeChild(campoTemporal);

        alert(
          "Enlace copiado correctamente. Ya puedes enviarlo."
        );
      }
    }}
    style={{
      border: "none",
      background: "#047857",
      color: "#ffffff",
      borderRadius: 7,
      padding: "8px 13px",
      fontWeight: 700,
      cursor: "pointer",
    }}
  >
    Copiar enlace
  </button>
</div>
                <div style={paymon.familyAccessText}>
                  Cédula: {obtenerCedulaAlumno(alumnoDetalle) || "-"}
                </div>
              </div>

              <div style={paymon.familyCodeBox}>
                <span style={paymon.familyCodeLabel}>Código temporal</span>
                <strong style={paymon.familyCodeValue}>
                  {codigoAccesoGenerado.codigo}
                </strong>
              </div>

              <div style={paymon.familyButtons}>
                <button
                  type="button"
                  style={paymon.copyButton}
                  onClick={() =>
                    copiarTextoSeguro(
                      codigoAccesoGenerado.codigo,
                      `Código copiado: ${codigoAccesoGenerado.codigo}`
                    )
                  }
                >
                  Copiar código
                </button>

                <button
                  type="button"
                  style={paymon.copyFullButton}
                  onClick={() =>
                    copiarTextoSeguro(
                      obtenerTextoAccesoCompleto(),
                      "Acceso completo copiado. Ya puedes pegarlo en WhatsApp o correo."
                    )
                  }
                >
                  Copiar acceso completo
                </button>

                <button
                  type="button"
                  style={paymon.whatsappButton}
                  onClick={() => {
                    const texto = obtenerTextoAccesoCompleto();
                    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                >
                  Compartir por WhatsApp
                </button>
              </div>
            </div>
          )}

          <div style={paymon.profileGrid}>
            <div style={paymon.dataCardPlain}>
              <DataRow label="Teléfono" value={alumnoDetalle.telefono || alumnoDetalle.celular || "-"} />
              <DataRow label="Email" value={alumnoDetalle.email || alumnoDetalle.correo || "-"} />
              <DataRow label="Cédula" value={obtenerCedulaAlumno(alumnoDetalle) || "-"} />
              <DataRow label="País" value={alumnoDetalle.pais || "Ecuador"} />
              <DataRow label="Ciudad" value={alumnoDetalle.ciudad || "-"} />
              <DataRow label="ID" value={alumnoDetalle.id || "-"} />
            </div>

            <div style={paymon.dataCard}>
              <DataRow label="Institución" value={alumnoDetalle.institucion_nombre || "Colegio Marista"} />
              <DataRow label="Curso" value={alumnoDetalle.curso || "-"} />
              <DataRow label="Paralelo" value={alumnoDetalle.paralelo || "-"} />
              <DataRow label="Código" value={alumnoDetalle.codigo || obtenerCedulaAlumno(alumnoDetalle) || "-"} />
              <DataRow label="Profesor" value={alumnoDetalle.es_profesor ? "Sí" : "No"} />
              <DataRow label="Crédito" value={alumnoDetalle.credito ? "Sí" : "No"} />
            </div>

            <div style={paymon.balanceCard}>
              <div style={paymon.balanceBox}>
                <span style={paymon.balanceLabel}>Saldo actual:</span>
                <strong style={paymon.balanceValue}>{formatearMoneda(alumnoDetalle.saldo)}</strong>
              </div>
              <button
                type="button"
                style={paymon.rechargeButton}
                onClick={() => {
                  setVista("recargas");
                  setRecargaForm((prev) => ({ ...prev, alumno_id: alumnoDetalle.id }));
                }}
              >
                Recargar efectivo
              </button>
            </div>
          </div>

          <div style={paymon.faceNotice}>
            <div>
              <strong>☺ &nbsp; Registrar reconocimiento facial para {alumnoDetalle.nombres || "el alumno"}</strong>
              <div style={paymon.faceSubtext}>Permite identificarlo de forma segura y rápida.</div>
            </div>
            <button type="button" style={paymon.faceButton}>Registrar rostro</button>
          </div>

          <div style={paymon.tabs}>
            <button type="button" style={vistaAlumnoDetalle === "ordenes" || vistaAlumnoDetalle === "datos" ? paymon.tabActive : paymon.tab} onClick={() => setVistaAlumnoDetalle("ordenes")}>Órdenes</button>
            <button type="button" style={vistaAlumnoDetalle === "recargas" ? paymon.tabActive : paymon.tab} onClick={() => setVistaAlumnoDetalle("recargas")}>Recargas</button>
            <button type="button" style={vistaAlumnoDetalle === "dispositivo" ? paymon.tabActive : paymon.tab} onClick={() => setVistaAlumnoDetalle("dispositivo")}>Dispositivos</button>
            <button type="button" style={vistaAlumnoDetalle === "consumo" ? paymon.tabActive : paymon.tab} onClick={() => setVistaAlumnoDetalle("consumo")}>Consumo</button>
          </div>

          {(vistaAlumnoDetalle === "ordenes" || vistaAlumnoDetalle === "datos") && (
            <div style={paymon.historyPanel}>
              <div style={paymon.summaryRow}>
                <div style={paymon.summaryCard}>
                  <div style={paymon.summaryCell}>
                    <span>Total pagadas</span>
                    <strong style={paymon.paidValue}>{formatearMoneda(totalPagadas)}</strong>
                    <small>Total de órdenes pagadas</small>
                  </div>
                  <div style={paymon.summaryCell}>
                    <span>Total pendientes</span>
                    <strong style={paymon.pendingValue}>{formatearMoneda(totalPendientes)}</strong>
                    <small>Total de órdenes por pagar</small>
                  </div>
                </div>
                <button type="button" style={paymon.orangeButton} onClick={irACrearOrden}>Crear orden</button>
              </div>

              <div style={paymon.tableCard}>
                <div style={paymon.tableToolbar}>
                  <input
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    placeholder="⌕  Buscar"
                    style={paymon.searchInput}
                  />
                  <button type="button" style={paymon.exportButton} onClick={() => exportarOrdenesAlumno(ordenesVisibles)}>
                    EXPORTAR ⤓
                  </button>
                </div>

                <div style={paymon.tableWrap}>
                  <table style={paymon.table}>
                    <thead>
                      <tr>
                        <th style={paymon.th}>Orden</th>
                        <th style={paymon.th}>Nombre</th>
                        <th style={paymon.th}>Apellido</th>
                        <th style={paymon.th}>Detalles</th>
                        <th style={paymon.th}>Fecha</th>
                        <th style={paymon.th}>Total</th>
                        <th style={paymon.th}>Forma de pago</th>
                        <th style={paymon.th}>Estado</th>
                        <th style={paymon.th}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordenesVisibles.length === 0 ? (
                        <tr><td colSpan="9" style={paymon.emptyCell}>No hay datos disponibles</td></tr>
                      ) : ordenesVisibles.map((v) => (
                        <tr key={v.id}>
                          <td style={paymon.td}>#{v.id}</td>
                          <td style={paymon.td}>{alumnoDetalle.nombres || "-"}</td>
                          <td style={paymon.td}>{alumnoDetalle.apellidos || "-"}</td>
                          <td style={paymon.td}>{Array.isArray(v.items) ? `${v.items.length} producto(s)` : "Ver orden"}</td>
                          <td style={paymon.td}>{v.created_at ? new Date(v.created_at).toLocaleString() : "-"}</td>
                          <td style={paymon.td}>{formatearMoneda(v.total)}</td>
                          <td style={paymon.td}>{v.metodo_pago || "-"}</td>
                          <td style={paymon.td}><span style={paymon.statusPill}>{v.estado || "Pagada"}</span></td>
                          <td style={paymon.td}>
                            <button
                              type="button"
                              style={paymon.viewButton}
                              onClick={() => {
                                const detalleOrden = historialConsumoAlumno.filter((c) => Number(c.venta_id) === Number(v.id));
                                setOrdenDetalleAlumno({ ...v, detalle: detalleOrden });
                              }}
                            >
                              Ver
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {ordenDetalleAlumno && (
                <div style={paymon.orderDetail}>
                  <div style={paymon.detailHeader}>
                    <h4 style={{ margin: 0 }}>Detalle de orden #{ordenDetalleAlumno.id}</h4>
                    <button type="button" style={paymon.exportButton} onClick={() => setOrdenDetalleAlumno(null)}>Cerrar</button>
                  </div>
                  {ordenDetalleAlumno.detalle?.length ? (
                    <div style={paymon.tableWrap}>
                      <table style={paymon.table}>
                        <thead><tr><th style={paymon.th}>Producto</th><th style={paymon.th}>Cantidad</th><th style={paymon.th}>Precio</th><th style={paymon.th}>Total</th></tr></thead>
                        <tbody>{ordenDetalleAlumno.detalle.map((d, index) => <tr key={`${d.producto_id}-${index}`}><td style={paymon.td}>{d.producto_nombre}</td><td style={paymon.td}>{d.cantidad}</td><td style={paymon.td}>{formatearMoneda(d.precio_unitario)}</td><td style={paymon.td}>{formatearMoneda(d.total)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  ) : <p>No hay detalle de productos para esta orden.</p>}
                </div>
              )}
            </div>
          )}

          {vistaAlumnoDetalle === "recargas" && <HistorialSimple titulo="Historial de recargas" columnas={["Fecha", "Monto", "Método"]} filas={historialRecargasAlumno.map((r) => [r.created_at ? new Date(r.created_at).toLocaleString() : "-", formatearMoneda(r.monto), r.metodo_pago || "-"])} />}
          {vistaAlumnoDetalle === "consumo" && <HistorialSimple titulo="Consumo detallado" columnas={["Fecha", "Orden", "Producto", "Cantidad", "Precio", "Total"]} filas={historialConsumoAlumno.map((c) => [c.created_at ? new Date(c.created_at).toLocaleString() : "-", `#${c.venta_id}`, c.producto_nombre || "-", c.cantidad || 0, formatearMoneda(c.precio_unitario), formatearMoneda(c.total)])} />}
          {vistaAlumnoDetalle === "dispositivo" && <div style={paymon.historyPanel}><h3>Dispositivos</h3><p>No hay dispositivos vinculados todavía.</p><button type="button" style={paymon.orangeButton}>Enlazar dispositivo</button></div>}
        </div>
      );
    })()}

    {!alumnoDetalle && (
    <div style={styles.twoColumn}>
      <div style={styles.box}>
        <h3>{editandoAlumnoId ? "Editar alumno" : "Nuevo alumno"}</h3>

        <form onSubmit={editandoAlumnoId ? actualizarAlumno : crearAlumno} style={styles.form}>
          <input type="text" placeholder="Cédula" value={alumnoForm.cedula} onChange={(e) => setAlumnoForm({ ...alumnoForm, cedula: e.target.value })} style={styles.input} required />
          <input type="text" placeholder="Nombres" value={alumnoForm.nombres} onChange={(e) => setAlumnoForm({ ...alumnoForm, nombres: e.target.value })} style={styles.input} required />
          <input type="text" placeholder="Apellidos" value={alumnoForm.apellidos} onChange={(e) => setAlumnoForm({ ...alumnoForm, apellidos: e.target.value })} style={styles.input} required />
          <input type="text" placeholder="Curso" value={alumnoForm.curso} onChange={(e) => setAlumnoForm({ ...alumnoForm, curso: e.target.value })} style={styles.input} />
          <input type="text" placeholder="Paralelo" value={alumnoForm.paralelo} onChange={(e) => setAlumnoForm({ ...alumnoForm, paralelo: e.target.value })} style={styles.input} />
          <input type="number" step="0.01" placeholder="Saldo inicial" value={alumnoForm.saldo} onChange={(e) => setAlumnoForm({ ...alumnoForm, saldo: e.target.value })} style={styles.input} />

          <button type="submit" style={styles.button}>
            {editandoAlumnoId ? "Actualizar alumno" : "Guardar alumno"}
          </button>

          {editandoAlumnoId && (
            <button type="button" style={styles.cancelButton} onClick={limpiarFormularioAlumno}>
              Cancelar edición
            </button>
          )}
        </form>
      </div>

      <div style={styles.box}>
        <div style={styles.pageHeaderSmall}>
          <h3 style={{ margin: 0 }}>
            Lista de alumnos{" "}
            <span style={styles.filterLabel}>
              {filtroAlumnos === "activos"
                ? "(Activos)"
                : filtroAlumnos === "inactivos"
                ? "(Inactivos)"
                : "(Todos)"}
            </span>
          </h3>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              const filas = [
                ["ID", "Nombres", "Apellidos", "Cédula", "Curso", "Paralelo", "Saldo", "Estado"],
                ...alumnosFiltradosBusqueda.map((a) => [
                  a.id || "",
                  a.nombres || "",
                  a.apellidos || "",
                  obtenerCedulaAlumno(a) || "",
                  a.curso || "",
                  a.paralelo || "",
                  Number(a.saldo || 0).toFixed(2),
                  a.activo !== false ? "Activo" : "Inactivo",
                ]),
              ];

              const csv = filas
                .map((fila) => fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(","))
                .join("\n");

              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "alumnos.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exportar
          </button>
        </div>

        {alumnosFiltradosBusqueda.length === 0 ? (
          <p>No hay alumnos para este filtro.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.th}>Apellido</th>
                  <th style={styles.th}>Cédula</th>
                  <th style={styles.th}>Curso</th>
                  <th style={styles.th}>Paralelo</th>
                  <th style={styles.th}>Saldo</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {alumnosFiltradosBusqueda.map((a) => {
                  const activo = a.activo !== false;

                  return (
                    <tr key={a.id}>
                      <td style={styles.td}>{a.id || "-"}</td>
                      <td style={styles.td}>{a.nombres || "-"}</td>
                      <td style={styles.td}>{a.apellidos || "-"}</td>
                      <td style={styles.td}>{obtenerCedulaAlumno(a) || "-"}</td>
                      <td style={styles.td}>{a.curso || "-"}</td>
                      <td style={styles.td}>{a.paralelo || "-"}</td>
                      <td style={styles.td}>{formatearMoneda(a.saldo)}</td>
                      <td style={styles.td}>
                        <span style={activo ? styles.badgeActive : styles.badgeInactive}>
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>

                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            style={styles.smallDarkButton}
                            onClick={async () => {
  setAlumnoDetalle(a);
  setVistaAlumnoDetalle("datos");

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

   const [ventasRes, recargasRes, consumoRes] = await Promise.all([
  fetch(
    `${API_URL}/api/ventas?institucion_id=${institucionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  ),
  fetch(
    `${API_URL}/api/recargas?institucion_id=${institucionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  ),
  fetch(
    `${API_URL}/api/ventas/alumno/${a.id}/detalle?institucion_id=${institucionId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  ),
]);

const ventas = await ventasRes.json();
const recargas = await recargasRes.json();
const consumo = await consumoRes.json();

setHistorialVentasAlumno(
  (ventas || []).filter(
    (v) => Number(v.alumno_id) === Number(a.id)
  )
);

setHistorialRecargasAlumno(
  (recargas || []).filter(
    (r) => Number(r.alumno_id) === Number(a.id)
  )
);

setHistorialConsumoAlumno(
  Array.isArray(consumo) ? consumo : []
);
  } catch (error) {
    console.error(error);
  }
}}
                            title="Ver alumno"
                          >
                            👁
                          </button>

                          <button
                            type="button"
                            style={styles.saveIconButton}
                            onClick={() => {
                              setAlumnoDetalle(a);
                              setVistaAlumnoDetalle("recargas");
                            }}
                            title="Recargas mensuales"
                          >
                            📄
                          </button>

                          <button
                            type="button"
                            style={activo ? styles.editIconButton : styles.disabledIconButton}
                            onClick={() => activo && iniciarEdicionAlumno(a)}
                            disabled={!activo}
                            title="Editar alumno"
                          >
                            ✏️
                          </button>

                          <button
                            type="button"
                            style={styles.moveIconButton}
                            onClick={() => {
                              setAlumnoDetalle(a);
                              setVistaAlumnoDetalle("datos");
                            }}
                            title="Enviar notificación saldo bajo"
                          >
                            📨
                          </button>

<button
  type="button"
  style={styles.outlineButton}
  onClick={() => setVistaAlumnoDetalle("consumo")}
>
  Consumo
</button>

                          <button
                            type="button"
                            style={styles.outlineButton}
                            onClick={() => {
                              setAlumnoDetalle(a);
                              setVistaAlumnoDetalle("dispositivo");
                            }}
                            title="Ver dispositivo"
                          >
                            💳
                          </button>

                          <button
                            type="button"
                            style={activo ? styles.deleteIconButton : styles.disabledIconButton}
                            onClick={() => activo && eliminarAlumno(a)}
                            disabled={!activo}
                            title="Eliminar alumno"
                          >
                            🗑️
                          </button>

                          {!activo && (
                            <button
                              type="button"
                              style={styles.restoreIconButton}
                              onClick={() => restaurarAlumno(a)}
                              title="Restaurar alumno"
                            >
                              ↩️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    )}
  </>
  );
}


function DataRow({ label, value }) {
  return <div style={paymon.dataRow}><span style={paymon.dataLabel}>{label}:</span><strong style={paymon.dataValue}>{value}</strong></div>;
}

function HistorialSimple({ titulo, columnas, filas }) {
  return (
    <div style={paymon.historyPanel}>
      <h3>{titulo}</h3>
      <div style={paymon.tableWrap}>
        <table style={paymon.table}>
          <thead><tr>{columnas.map((c) => <th key={c} style={paymon.th}>{c}</th>)}</tr></thead>
          <tbody>{filas.length ? filas.map((fila, i) => <tr key={i}>{fila.map((v, j) => <td key={j} style={paymon.td}>{v}</td>)}</tr>) : <tr><td colSpan={columnas.length} style={paymon.emptyCell}>No hay datos disponibles</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

const paymon = {
  fichaShell: { background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 14px 40px rgba(15,23,42,.10)", marginBottom: 24 },
  hero: { background: "#2428b8", color: "#fff", padding: "22px 28px", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" },
  backButton: { border: 0, background: "transparent", color: "#ff8b45", fontSize: 34, cursor: "pointer", padding: 0 },
  avatar: { width: 72, height: 72, borderRadius: "50%", background: "#fff", color: "#2428b8", border: "3px solid #ff8b45", display: "grid", placeItems: "center", fontSize: 30, fontWeight: 800 },
  heroIdentity: { minWidth: 220, flex: 1 }, heroName: { margin: "0 0 10px", fontSize: 26 }, badgeRow: { display: "flex", gap: 10 },
  studentBadge: { background: "#eef2ff", color: "#3137d8", padding: "8px 18px", borderRadius: 12 }, activeBadge: { background: "#dff7e8", color: "#166534", padding: "8px 18px", borderRadius: 12 }, inactiveBadge: { background: "#fee2e2", color: "#991b1b", padding: "8px 18px", borderRadius: 12 },
  heroActions: { display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  whiteButton: { border: 0, background: "#fff", color: "#2428b8", borderRadius: 7, padding: "14px 20px", fontWeight: 700, cursor: "pointer" },
  familyButton: { border: 0, background: "#10b981", color: "#fff", borderRadius: 7, padding: "14px 20px", fontWeight: 700, cursor: "pointer" },
  monthButton: { border: 0, background: "#6d88ef", color: "#fff", borderRadius: 7, padding: "14px 20px", fontWeight: 700, cursor: "pointer" },
  familyAccessPanel: { margin: "20px 5% 4px", padding: "18px 22px", border: "1px solid #a7f3d0", background: "#ecfdf5", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" },
  familyAccessTitle: { color: "#065f46", display: "block", marginBottom: 6 },
  familyAccessText: { color: "#047857", fontSize: 14, overflowWrap: "anywhere" },
  familyCodeBox: { background: "#fff", border: "1px dashed #10b981", borderRadius: 10, padding: "10px 18px", textAlign: "center" },
  familyCodeLabel: { display: "block", color: "#64748b", fontSize: 12, marginBottom: 4 },
  familyCodeValue: { color: "#065f46", fontSize: 24, letterSpacing: 3 },
  familyButtons: { display: "flex", gap: 10, flexWrap: "wrap" },
  copyButton: { border: 0, background: "#047857", color: "#fff", borderRadius: 8, padding: "11px 17px", fontWeight: 700, cursor: "pointer" },
  copyFullButton: { border: "1px solid #047857", background: "#fff", color: "#047857", borderRadius: 8, padding: "11px 17px", fontWeight: 700, cursor: "pointer" },
  whatsappButton: { border: 0, background: "#25D366", color: "#fff", borderRadius: 8, padding: "11px 17px", fontWeight: 700, cursor: "pointer" },
  orangeButton: { border: 0, background: "#ff8548", color: "#fff", borderRadius: 9, padding: "14px 24px", fontWeight: 700, cursor: "pointer" },
  profileGrid: { padding: "34px 6% 22px", display: "grid", gridTemplateColumns: "minmax(230px,1fr) minmax(260px,1fr) minmax(230px,.75fr)", gap: 30, alignItems: "stretch" },
  dataCardPlain: { padding: "8px 12px" }, dataCard: { padding: "24px 28px", borderRadius: 12, boxShadow: "0 6px 18px rgba(15,23,42,.12)" },
  dataRow: { display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, marginBottom: 14, alignItems: "baseline" }, dataLabel: { color: "#64748b", fontSize: 16 }, dataValue: { color: "#111827", overflowWrap: "anywhere" },
  balanceCard: { padding: 20, borderRadius: 12, boxShadow: "0 6px 18px rgba(15,23,42,.12)", display: "flex", flexDirection: "column", gap: 18, justifyContent: "center" },
  balanceBox: { background: "#dff7ef", borderRadius: 10, padding: 18, textAlign: "center" }, balanceLabel: { display: "block", fontWeight: 700 }, balanceValue: { display: "block", fontSize: 38, marginTop: 6 }, rechargeButton: { border: 0, background: "#2428b8", color: "#fff", padding: 14, borderRadius: 6, fontWeight: 700, cursor: "pointer" },
  faceNotice: { margin: "8px 5% 34px", border: "1px solid #c9d7ff", background: "#f3f6ff", borderRadius: 13, padding: "18px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, color: "#3f46ce", flexWrap: "wrap" }, faceSubtext: { fontSize: 13, marginTop: 4 }, faceButton: { border: 0, background: "#5b50e8", color: "#fff", borderRadius: 8, padding: "10px 16px", fontWeight: 700, cursor: "pointer" },
  tabs: { margin: "0 5%", display: "flex", gap: 4, flexWrap: "wrap" }, tab: { minWidth: 170, padding: "14px 28px", border: "2px solid #ff8548", color: "#ff5f2b", background: "#fff", cursor: "pointer", fontWeight: 700 }, tabActive: { minWidth: 170, padding: "14px 28px", border: "2px solid #ff8548", color: "#fff", background: "#ff8548", cursor: "pointer", fontWeight: 700 },
  historyPanel: { margin: "0 5% 40px", padding: "28px 0" }, summaryRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }, summaryCard: { display: "grid", gridTemplateColumns: "1fr 1fr", borderRadius: 10, boxShadow: "0 5px 16px rgba(15,23,42,.12)", overflow: "hidden", minWidth: 420 }, summaryCell: { padding: "20px 30px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, borderRight: "1px solid #e5e7eb" }, paidValue: { fontSize: 36, color: "#062c4c" }, pendingValue: { fontSize: 36, color: "#2fc48d" },
  tableCard: { marginTop: 34, padding: 28, borderRadius: 12, boxShadow: "0 8px 22px rgba(15,23,42,.12)" }, tableToolbar: { display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }, searchInput: { width: 270, maxWidth: "100%", padding: "14px 16px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 16 }, exportButton: { border: "1px solid #10b981", color: "#059669", background: "#fff", borderRadius: 8, padding: "12px 20px", cursor: "pointer", fontWeight: 700 },
  tableWrap: { overflowX: "auto" }, table: { width: "100%", borderCollapse: "collapse", minWidth: 880 }, th: { background: "#dceafe", color: "#10167d", padding: "16px 12px", textAlign: "left", whiteSpace: "nowrap" }, td: { padding: "14px 12px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }, emptyCell: { textAlign: "center", padding: 26, fontSize: 18 }, statusPill: { background: "#dcfce7", color: "#166534", padding: "6px 10px", borderRadius: 999, fontWeight: 700 }, viewButton: { border: 0, background: "#2428b8", color: "#fff", padding: "8px 12px", borderRadius: 6, cursor: "pointer" }, orderDetail: { marginTop: 22, padding: 20, border: "1px solid #e5e7eb", borderRadius: 10 }, detailHeader: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
};