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

            <button style={styles.refreshButton} onClick={cargarAlumnos}>
              Refrescar
            </button>
          </>
        )}
      </div>
    </div>

    {alumnoDetalle && (
      <div style={{ ...styles.box, marginBottom: 20 }}>
        <div style={styles.pageHeaderSmall}>
          <div>
            <h2 style={{ margin: 0 }}>
              {alumnoDetalle.nombres || ""} {alumnoDetalle.apellidos || ""}
            </h2>
            <p style={{ margin: "6px 0 0", color: "#6b7280" }}>
              Cédula: {obtenerCedulaAlumno(alumnoDetalle) || "-"} | Saldo:{" "}
              {formatearMoneda(alumnoDetalle.saldo)}
            </p>
          </div>

          <button
  type="button"
  style={styles.button}
  onClick={() => {
    setVista("ventas");
    setVistaVentasInterna("registrar");
    setModoNuevaOrden("consumidor_final");

    // Vaciar carrito anterior
    setVentaItems([]);

    // Preparar nueva venta
    setVentaForm({
      alumno_id: alumnoDetalle.id,
      metodo_pago: "RECARGA",
      observacion: "",
    });

    // Mostrar el alumno seleccionado
    setBusquedaUsuarioNuevaOrden(
      `${alumnoDetalle.nombres || ""} ${alumnoDetalle.apellidos || ""}`.trim()
    );

    // Limpiar búsqueda de productos
    setBusquedaProductoNuevaOrden("");
    setCodigoBarraNuevaOrden("");
    setCategoriaNuevaOrden("TODOS");
  }}
>
  Crear orden
</button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => {
              setVista("recargas");
              setRecargaForm((prev) => ({
                ...prev,
                alumno_id: alumnoDetalle.id,
              }));
            }}
          >
            Recargar efectivo
          </button>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              iniciarEdicionAlumno(alumnoDetalle);
              setAlumnoDetalle(null);
            }}
          >
            Editar perfil
          </button>

          <button type="button" style={styles.outlineButton} onClick={() => setVistaAlumnoDetalle("ordenes")}>
            Órdenes
          </button>

          <button type="button" style={styles.outlineButton} onClick={() => setVistaAlumnoDetalle("recargas")}>
            Recargas
          </button>

          <button type="button" style={styles.outlineButton} onClick={() => setVistaAlumnoDetalle("dispositivo")}>
            Dispositivo
          </button>
        </div>

        <div style={{ marginTop: 18 }}>
          {vistaAlumnoDetalle === "datos" && (
            <div style={styles.infoBox}>
              <strong>Datos del alumno:</strong> saldo, curso, código, estado y acciones principales.
            </div>
          )}

          {vistaAlumnoDetalle === "ordenes" && (
  <div style={styles.infoBox}>
    <h4>Historial de Órdenes</h4>

    {historialVentasAlumno.length === 0 ? (
      <p>No existen órdenes registradas.</p>
    ) : (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Fecha</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Método</th>
          </tr>
        </thead>

        <tbody>
          {historialVentasAlumno.map((v) => (
            <tr
  key={v.id}
  style={{ cursor: "pointer" }}
  onClick={() => {
    const detalleOrden = historialConsumoAlumno.filter(
      (c) => Number(c.venta_id) === Number(v.id)
    );

    setOrdenDetalleAlumno({
      ...v,
      detalle: detalleOrden,
    });
  }}
>
              <td style={styles.td}>{v.id}</td>
              <td style={styles.td}>
                {new Date(v.created_at).toLocaleString()}
              </td>
              <td style={styles.td}>
                {formatearMoneda(v.total)}
              </td>
              <td style={styles.td}>{v.metodo_pago}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}
{ordenDetalleAlumno && (
  <div style={{ ...styles.box, marginTop: 16 }}>
    <div style={styles.pageHeaderSmall}>
      <h4 style={{ margin: 0 }}>Detalle de orden #{ordenDetalleAlumno.id}</h4>

      <button
        type="button"
        style={styles.outlineButton}
        onClick={() => setOrdenDetalleAlumno(null)}
      >
        Cerrar detalle
      </button>
    </div>

    <p>
      <strong>Fecha:</strong>{" "}
      {new Date(ordenDetalleAlumno.created_at).toLocaleString()} |{" "}
      <strong>Método:</strong> {ordenDetalleAlumno.metodo_pago} |{" "}
      <strong>Total:</strong> {formatearMoneda(ordenDetalleAlumno.total)}
    </p>

    {ordenDetalleAlumno.detalle?.length ? (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Producto</th>
            <th style={styles.th}>Cantidad</th>
            <th style={styles.th}>Precio</th>
            <th style={styles.th}>Total</th>
          </tr>
        </thead>

        <tbody>
          {ordenDetalleAlumno.detalle.map((d, index) => (
            <tr key={`${d.producto_id}-${index}`}>
              <td style={styles.td}>{d.producto_nombre}</td>
              <td style={styles.td}>{d.cantidad}</td>
              <td style={styles.td}>{formatearMoneda(d.precio_unitario)}</td>
              <td style={styles.td}>{formatearMoneda(d.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p>No hay detalle de productos para esta orden.</p>
    )}
  </div>
)}

          {vistaAlumnoDetalle === "recargas" && (
  <div style={styles.infoBox}>
    <h4>Historial de Recargas</h4>

    {historialRecargasAlumno.length === 0 ? (
      <p>No existen recargas registradas.</p>
    ) : (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Fecha</th>
            <th style={styles.th}>Monto</th>
            <th style={styles.th}>Método</th>
          </tr>
        </thead>

        <tbody>
          {historialRecargasAlumno.map((r) => (
            <tr key={r.id}>
              <td style={styles.td}>
                {new Date(r.created_at).toLocaleString()}
              </td>
              <td style={styles.td}>
                {formatearMoneda(r.monto)}
              </td>
              <td style={styles.td}>{r.metodo_pago}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}

{vistaAlumnoDetalle === "consumo" && (
  <div style={styles.infoBox}>
    <h4 style={{ marginTop: 0 }}>Consumo detallado</h4>

    {historialConsumoAlumno.length === 0 ? (
      <p>No existen consumos registrados.</p>
    ) : (
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Fecha</th>
            <th style={styles.th}>Orden</th>
            <th style={styles.th}>Producto</th>
            <th style={styles.th}>Cantidad</th>
            <th style={styles.th}>Precio</th>
            <th style={styles.th}>Total</th>
          </tr>
        </thead>

        <tbody>
          {historialConsumoAlumno.map((c, index) => (
            <tr key={`${c.venta_id}-${c.producto_id}-${index}`}>
              <td style={styles.td}>
                {new Date(c.created_at).toLocaleString()}
              </td>

              <td style={styles.td}>
                #{c.venta_id}
              </td>

              <td style={styles.td}>
                {c.producto_nombre}
              </td>

              <td style={styles.td}>
                {c.cantidad}
              </td>

              <td style={styles.td}>
                {formatearMoneda(c.precio_unitario)}
              </td>

              <td style={styles.td}>
                {formatearMoneda(c.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)}

          {vistaAlumnoDetalle === "dispositivo" && (
            <div style={styles.infoBox}>
              Dispositivo / tarjeta / código asignado al alumno.
            </div>
          )}
        </div>
      </div>
    )}

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
                ...alumnosFiltrados.map((a) => [
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

        {alumnosFiltrados.length === 0 ? (
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
                {alumnosFiltrados.map((a) => {
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