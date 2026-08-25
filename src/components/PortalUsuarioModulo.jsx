import { useEffect, useMemo, useState } from "react";

const moneda = (valor) => `$${Number(valor || 0).toFixed(2)}`;

const fechaHora = (valor) => {
  if (!valor) return "-";
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("es-EC");
};

export default function PortalUsuarioModulo({
  API_URL,
  usuario,
  onCerrarSesion,
}) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [mostrarMiCuenta, setMostrarMiCuenta] = useState(false);
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);
  const [cuentaCorreo, setCuentaCorreo] = useState(usuario?.correo || "");
  const [cuentaPasswordActual, setCuentaPasswordActual] = useState("");
  const [cuentaPasswordNueva, setCuentaPasswordNueva] = useState("");
  const [cuentaPasswordConfirmar, setCuentaPasswordConfirmar] = useState("");
  const [mensajeCuenta, setMensajeCuenta] = useState("");

  const [mostrarVincularHijo, setMostrarVincularHijo] = useState(false);
  const [buscandoHijo, setBuscandoHijo] = useState(false);
  const [vinculandoHijo, setVinculandoHijo] = useState(false);
  const [hijoEncontrado, setHijoEncontrado] = useState(null);
  const [vinculoForm, setVinculoForm] = useState({
    cedula: "",
    nombres: "",
    apellidos: "",
  });
  const [mensajeVinculo, setMensajeVinculo] = useState("");

  const [mostrarRecarga, setMostrarRecarga] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [recarga, setRecarga] = useState({
    monto: "",
    fecha_transferencia: "",
    numero_comprobante: "",
    observacion: "",
  });

  const token = localStorage.getItem("token");

  const cargar = async (alumnoId = "") => {
    try {
      setCargando(true);
      setMensaje("");
      const query = alumnoId
        ? `?alumno_id=${encodeURIComponent(alumnoId)}`
        : "";

      const res = await fetch(`${API_URL}/api/portal/me${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo cargar el portal");

      setDatos(data);

      if (data.tipo_portal === "PADRE" && data.alumno?.id) {
        setAlumnoSeleccionadoId(String(data.alumno.id));
      }
    } catch (error) {
      setMensaje(error.message || "No se pudo cargar la información.");
      setDatos(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const movimientos = useMemo(() => {
    const lista = Array.isArray(datos?.movimientos) ? datos.movimientos : [];
    if (filtro === "TODOS") return lista;
    return lista.filter((x) => x.tipo === filtro);
  }, [datos, filtro]);

  const guardarCorreoCuenta = async (e) => {
    e.preventDefault();
    setMensajeCuenta("");

    const nuevoCorreo = String(cuentaCorreo || "").trim().toLowerCase();
    if (!nuevoCorreo) {
      setMensajeCuenta("Ingresa el nuevo correo.");
      return;
    }
    if (!cuentaPasswordActual) {
      setMensajeCuenta("Ingresa tu contraseña actual para cambiar el correo.");
      return;
    }

    try {
      setGuardandoCuenta(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/usuarios/me/correo`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nuevoCorreo,
          password: cuentaPasswordActual,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "No se pudo cambiar el correo.");
      }

      const usuarioActual = JSON.parse(localStorage.getItem("usuario") || "{}");
      const usuarioNuevo = { ...usuarioActual, correo: nuevoCorreo };
      localStorage.setItem("usuario", JSON.stringify(usuarioNuevo));

      setCuentaPasswordActual("");
      setMensajeCuenta("Correo actualizado correctamente.");
    } catch (error) {
      setMensajeCuenta(error.message || "No se pudo cambiar el correo.");
    } finally {
      setGuardandoCuenta(false);
    }
  };

  const guardarPasswordCuenta = async (e) => {
    e.preventDefault();
    setMensajeCuenta("");

    if (!cuentaPasswordActual || !cuentaPasswordNueva) {
      setMensajeCuenta("Completa la contraseña actual y la nueva contraseña.");
      return;
    }

    if (cuentaPasswordNueva.length < 8) {
      setMensajeCuenta("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (cuentaPasswordNueva !== cuentaPasswordConfirmar) {
      setMensajeCuenta("La confirmación de contraseña no coincide.");
      return;
    }

    try {
      setGuardandoCuenta(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/usuarios/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actualPassword: cuentaPasswordActual,
          nuevaPassword: cuentaPasswordNueva,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "No se pudo cambiar la contraseña.");
      }

      setCuentaPasswordActual("");
      setCuentaPasswordNueva("");
      setCuentaPasswordConfirmar("");
      setMensajeCuenta("Contraseña actualizada correctamente.");
    } catch (error) {
      setMensajeCuenta(error.message || "No se pudo cambiar la contraseña.");
    } finally {
      setGuardandoCuenta(false);
    }
  };

  const limpiarVinculo = () => {
    setVinculoForm({ cedula: "", nombres: "", apellidos: "" });
    setHijoEncontrado(null);
    setMensajeVinculo("");
  };

  const buscarHijoParaVincular = async (e) => {
    e.preventDefault();
    setMensajeVinculo("");
    setHijoEncontrado(null);

    if (
      !String(vinculoForm.cedula || "").trim() ||
      !String(vinculoForm.nombres || "").trim() ||
      !String(vinculoForm.apellidos || "").trim()
    ) {
      setMensajeVinculo("Completa cédula, nombres y apellidos.");
      return;
    }

    try {
      setBuscandoHijo(true);

      const res = await fetch(`${API_URL}/api/portal/buscar-hijo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(vinculoForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "No se encontró al estudiante.");
      }

      setHijoEncontrado(data.alumno || null);

      if (data.ya_vinculado) {
        setMensajeVinculo("Este estudiante ya está vinculado a tu cuenta.");
      } else {
        setMensajeVinculo(
          "Estudiante encontrado. Confirma que los datos sean correctos antes de vincularlo."
        );
      }
    } catch (error) {
      setMensajeVinculo(
        error.message ||
          "No se encontró un estudiante con los datos ingresados."
      );
    } finally {
      setBuscandoHijo(false);
    }
  };

  const confirmarVinculoHijo = async () => {
    if (!hijoEncontrado) return;

    const nombre = `${hijoEncontrado.nombres || ""} ${
      hijoEncontrado.apellidos || ""
    }`.trim();

    if (
      !window.confirm(
        `¿Deseas vincular a ${nombre} a tu cuenta de padre/representante?`
      )
    ) {
      return;
    }

    try {
      setVinculandoHijo(true);
      setMensajeVinculo("");

      const res = await fetch(`${API_URL}/api/portal/vincular-hijo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(vinculoForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "No se pudo vincular al estudiante.");
      }

      setMensajeVinculo(data.message || "Estudiante vinculado correctamente.");
      setMostrarVincularHijo(false);
      limpiarVinculo();
      await cargar(String(data.alumno?.id || ""));
    } catch (error) {
      setMensajeVinculo(
        error.message || "No se pudo vincular al estudiante."
      );
    } finally {
      setVinculandoHijo(false);
    }
  };

  const cambiarHijo = async (id) => {
    setAlumnoSeleccionadoId(id);
    await cargar(id);
  };

  const enviarSolicitud = async (e) => {
    e.preventDefault();

    if (Number(recarga.monto) <= 0) {
      setMensaje("Ingresa un monto válido.");
      return;
    }

    try {
      setEnviando(true);
      setMensaje("");

      const res = await fetch(`${API_URL}/api/portal/solicitudes-recarga`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          alumno_id:
            datos?.tipo_portal === "PADRE"
              ? Number(alumnoSeleccionadoId)
              : undefined,
          monto: Number(recarga.monto),
          metodo_pago: "TRANSFERENCIA",
          fecha_transferencia: recarga.fecha_transferencia,
          numero_comprobante: recarga.numero_comprobante,
          observacion: recarga.observacion,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo enviar la solicitud");

      setMensaje(data.message);
      setRecarga({
        monto: "",
        fecha_transferencia: "",
        numero_comprobante: "",
        observacion: "",
      });
      setMostrarRecarga(false);
      await cargar(alumnoSeleccionadoId);
    } catch (error) {
      setMensaje(error.message || "No se pudo enviar la solicitud.");
    } finally {
      setEnviando(false);
    }
  };

  if (cargando && !datos) {
    return (
      <div style={s.loading}>
        <strong>Cargando tu cuenta POS NUBE...</strong>
      </div>
    );
  }

  const alumno = datos?.alumno;
  const esPadre = datos?.tipo_portal === "PADRE";

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div>
          <div style={s.brand}>POS NUBE</div>
          <div style={s.subBrand}>
            {esPadre ? "Portal para padres / representantes" : "Portal del estudiante"}
          </div>
        </div>

        <div style={s.headerRight}>
          <div>
            <strong>{usuario?.nombre || usuario?.correo}</strong>
            <div style={s.role}>{datos?.tipo_portal}</div>
          </div>
          <button
              type="button"
              style={s.secondaryButton}
              onClick={() => {
                setMostrarMiCuenta((v) => !v);
                setMensajeCuenta("");
                setCuentaCorreo(usuario?.correo || "");
                setCuentaPasswordActual("");
                setCuentaPasswordNueva("");
                setCuentaPasswordConfirmar("");
              }}
            >
              Mi cuenta
            </button>
            <button style={s.logout} onClick={onCerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </header>

            {mostrarMiCuenta && (
        <section style={s.accountCard}>
          <div style={s.accountHeader}>
            <div>
              <h2 style={{ margin: 0 }}>Mi cuenta</h2>
              <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                Puedes cambiar tu correo o contraseña cuando lo necesites.
              </p>
            </div>
            <button
              type="button"
              style={s.smallButton}
              onClick={() => setMostrarMiCuenta(false)}
            >
              Cerrar
            </button>
          </div>

          <div style={s.accountGrid}>
            <form onSubmit={guardarCorreoCuenta} style={s.accountBox}>
              <h3 style={{ marginTop: 0 }}>Cambiar correo</h3>
              <label style={s.field}>
                Nuevo correo
                <input
                  type="email"
                  style={s.input}
                  value={cuentaCorreo}
                  onChange={(e) => setCuentaCorreo(e.target.value)}
                  required
                />
              </label>
              <label style={s.field}>
                Contraseña actual
                <input
                  type="password"
                  style={s.input}
                  value={cuentaPasswordActual}
                  onChange={(e) => setCuentaPasswordActual(e.target.value)}
                  required
                />
              </label>
              <button
                type="submit"
                style={s.primaryButton}
                disabled={guardandoCuenta}
              >
                Guardar nuevo correo
              </button>
            </form>

            <form onSubmit={guardarPasswordCuenta} style={s.accountBox}>
              <h3 style={{ marginTop: 0 }}>Cambiar contraseña</h3>
              <label style={s.field}>
                Contraseña actual
                <input
                  type="password"
                  style={s.input}
                  value={cuentaPasswordActual}
                  onChange={(e) => setCuentaPasswordActual(e.target.value)}
                  required
                />
              </label>
              <label style={s.field}>
                Nueva contraseña
                <input
                  type="password"
                  style={s.input}
                  value={cuentaPasswordNueva}
                  onChange={(e) => setCuentaPasswordNueva(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <label style={s.field}>
                Confirmar nueva contraseña
                <input
                  type="password"
                  style={s.input}
                  value={cuentaPasswordConfirmar}
                  onChange={(e) => setCuentaPasswordConfirmar(e.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <button
                type="submit"
                style={s.primaryButton}
                disabled={guardandoCuenta}
              >
                Guardar nueva contraseña
              </button>
            </form>
          </div>

          {mensajeCuenta && (
            <div style={s.accountMessage}>{mensajeCuenta}</div>
          )}
        </section>
      )}

<main style={s.main}>
        <div style={s.welcome}>
          <div>
            <div style={s.muted}>Institución</div>
            <h1 style={s.title}>{datos?.institucion?.nombre || "POS NUBE"}</h1>
            {esPadre && (
              <p style={s.subtitle}>
                Representante: {datos?.padre?.nombres} {datos?.padre?.apellidos}
              </p>
            )}
          </div>

                  {esPadre && (
          <section style={s.linkChildCard}>
            <div style={s.linkChildHeader}>
              <div>
                <h3 style={{ margin: 0 }}>Hijos vinculados</h3>
                <p style={{ ...s.muted, margin: "5px 0 0" }}>
                  Puedes vincular a otro hijo verificando cédula, nombres y apellidos.
                </p>
              </div>

              <button
                type="button"
                style={s.primary}
                onClick={() => {
                  setMostrarVincularHijo((v) => !v);
                  limpiarVinculo();
                }}
              >
                {mostrarVincularHijo ? "Cancelar" : "Vincular hijo"}
              </button>
            </div>

            {mostrarVincularHijo && (
              <form onSubmit={buscarHijoParaVincular} style={s.linkChildForm}>
                <label style={s.field}>
                  Cédula del estudiante *
                  <input
                    style={s.input}
                    value={vinculoForm.cedula}
                    onChange={(e) =>
                      setVinculoForm({
                        ...vinculoForm,
                        cedula: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label style={s.field}>
                  Nombres del estudiante *
                  <input
                    style={s.input}
                    value={vinculoForm.nombres}
                    onChange={(e) =>
                      setVinculoForm({
                        ...vinculoForm,
                        nombres: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label style={s.field}>
                  Apellidos del estudiante *
                  <input
                    style={s.input}
                    value={vinculoForm.apellidos}
                    onChange={(e) =>
                      setVinculoForm({
                        ...vinculoForm,
                        apellidos: e.target.value,
                      })
                    }
                    required
                  />
                </label>

                <div style={s.linkChildActions}>
                  <button
                    type="submit"
                    style={s.primaryButton}
                    disabled={buscandoHijo}
                  >
                    {buscandoHijo ? "Buscando..." : "Buscar estudiante"}
                  </button>
                </div>
              </form>
            )}

            {mostrarVincularHijo && mensajeVinculo && (
              <div style={s.accountMessage}>{mensajeVinculo}</div>
            )}

            {mostrarVincularHijo && hijoEncontrado && (
              <div style={s.foundStudentCard}>
                <div>
                  <strong style={{ fontSize: 17 }}>
                    {hijoEncontrado.nombres} {hijoEncontrado.apellidos}
                  </strong>
                  <div style={s.muted}>
                    Cédula: {hijoEncontrado.cedula || "-"}
                  </div>
                  <div style={s.muted}>
                    Curso: {hijoEncontrado.curso || "-"}{" "}
                    {hijoEncontrado.paralelo || ""}
                  </div>
                </div>

                <button
                  type="button"
                  style={s.primaryButton}
                  disabled={vinculandoHijo}
                  onClick={confirmarVinculoHijo}
                >
                  {vinculandoHijo ? "Vinculando..." : "Confirmar vínculo"}
                </button>
              </div>
            )}
          </section>
        )}

{esPadre && (datos?.hijos || []).length > 1 && (
            <label style={s.selectLabel}>
              Ver estudiante
              <select
                style={s.select}
                value={alumnoSeleccionadoId}
                onChange={(e) => cambiarHijo(e.target.value)}
              >
                {(datos.hijos || []).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.nombres} {h.apellidos}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {mensaje && <div style={s.notice}>{mensaje}</div>}

        {!alumno ? (
          <div style={s.card}>
            <strong>No existen estudiantes vinculados a esta cuenta.</strong>
            <p style={s.muted}>
              Usa el botón “Vincular hijo” de arriba e ingresa la cédula,
              nombres y apellidos exactamente como constan en la institución.
            </p>
          </div>
        ) : (
          <>
            <section style={s.hero}>
              <div>
                <div style={s.muted}>Cuenta del estudiante</div>
                <h2 style={s.studentName}>
                  {alumno.nombres} {alumno.apellidos}
                </h2>
                <div style={s.meta}>
                  {alumno.curso || "Sin curso"} {alumno.paralelo || ""}
                </div>
              </div>

              <div style={s.codeBox}>
                <span style={s.muted}>Código / identificación</span>
                <strong style={s.code}>
                  {alumno.codigo || alumno.cedula || `ALUMNO-${alumno.id}`}
                </strong>
                <small>
                  Este código identifica al estudiante en el punto de venta.
                </small>
              </div>
            </section>

            <section style={s.summary}>
              <Card label="Saldo disponible" value={moneda(alumno.saldo)} principal />
              <Card
                label="Total recargado"
                value={moneda(datos?.resumen?.total_recargas)}
              />
              <Card
                label="Total consumido"
                value={moneda(datos?.resumen?.total_consumos)}
              />
              <Card
                label="Movimientos"
                value={Number(datos?.resumen?.cantidad_movimientos || 0)}
              />
            </section>

            <section style={s.card}>
              <div style={s.toolbar}>
                <div>
                  <h3 style={s.sectionTitle}>Movimientos e historial</h3>
                  <p style={s.muted}>
                    Consulta de recargas y consumos. Este portal no permite
                    modificar ventas, productos, inventario ni cierres.
                  </p>
                </div>

                <div style={s.actions}>
                  <select
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    style={s.smallSelect}
                  >
                    <option value="TODOS">Todos</option>
                    <option value="RECARGA">Recargas</option>
                    <option value="CONSUMO">Consumos</option>
                  </select>

                  <button
                    style={s.primary}
                    onClick={() => setMostrarRecarga((v) => !v)}
                  >
                    Solicitar recarga
                  </button>
                </div>
              </div>

              {mostrarRecarga && (
                <form onSubmit={enviarSolicitud} style={s.rechargeForm}>
                  <label style={s.field}>
                    Monto solicitado
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      style={s.input}
                      value={recarga.monto}
                      onChange={(e) =>
                        setRecarga({ ...recarga, monto: e.target.value })
                      }
                    />
                  </label>

                  <label style={s.field}>
                    Fecha de transferencia *
                    <input
                      type="date"
                      required
                      style={s.input}
                      value={recarga.fecha_transferencia}
                      onChange={(e) =>
                        setRecarga({ ...recarga, fecha_transferencia: e.target.value })
                      }
                    />
                  </label>

                  <label style={s.field}>
                    No. comprobante
                    <input
                      style={s.input}
                      required
                      value={recarga.numero_comprobante}
                      onChange={(e) =>
                        setRecarga({
                          ...recarga,
                          numero_comprobante: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label style={{ ...s.field, gridColumn: "1 / -1" }}>
                    Observación
                    <input
                      style={s.input}
                      value={recarga.observacion}
                      onChange={(e) =>
                        setRecarga({ ...recarga, observacion: e.target.value })
                      }
                    />
                  </label>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <button style={s.primary} disabled={enviando}>
                      {enviando ? "Enviando..." : "Enviar solicitud"}
                    </button>
                    <p style={s.help}>
                      La solicitud queda PENDIENTE. El saldo no cambia hasta
                      que la institución verifique el pago.
                    </p>
                  </div>
                </form>
              )}

              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Fecha</th>
                      <th style={s.th}>Tipo</th>
                      <th style={s.th}>Detalle</th>
                      <th style={s.th}>Método</th>
                      <th style={s.th}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!movimientos.length ? (
                      <tr>
                        <td colSpan="5" style={s.empty}>
                          No existen movimientos para mostrar.
                        </td>
                      </tr>
                    ) : (
                      movimientos.map((m) => (
                        <tr key={`${m.tipo}-${m.id}`}>
                          <td style={s.td}>{fechaHora(m.fecha)}</td>
                          <td style={s.td}>
                            <span
                              style={
                                m.tipo === "RECARGA"
                                  ? s.badgeRecarga
                                  : s.badgeConsumo
                              }
                            >
                              {m.tipo}
                            </span>
                          </td>
                          <td style={s.td}>{m.detalle || "-"}</td>
                          <td style={s.td}>{m.metodo || "-"}</td>
                          <td style={s.td}>
                            {m.tipo === "CONSUMO" ? "-" : "+"}
                            {moneda(m.valor)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section style={s.card}>
              <h3 style={s.sectionTitle}>Solicitudes de recarga</h3>
              <div style={s.requestGrid}>
                {(datos?.solicitudes_recarga || []).length === 0 ? (
                  <div style={s.muted}>No existen solicitudes registradas.</div>
                ) : (
                  datos.solicitudes_recarga.map((x) => (
                    <div key={x.id} style={s.requestCard}>
                      <strong>{moneda(x.monto)}</strong>
                      <span style={
                        x.estado === "APROBADA"
                          ? s.requestApproved
                          : x.estado === "RECHAZADA"
                          ? s.requestRejected
                          : s.requestPending
                      }>
                        {x.estado || "PENDIENTE"}
                      </span>
                      <small>{fechaHora(x.created_at)}</small>
                      {x.procesado_at && (
                        <small>Procesada: {fechaHora(x.procesado_at)}</small>
                      )}
                      {x.motivo_rechazo && (
                        <small style={{ color: "#b91c1c" }}>
                          Motivo: {x.motivo_rechazo}
                        </small>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function Card({ label, value, principal }) {
  return (
    <div style={principal ? s.balanceCard : s.summaryCard}>
      <span style={s.muted}>{label}</span>
      <strong style={principal ? s.balanceValue : s.summaryValue}>{value}</strong>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f2f5f9",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    minHeight: 74,
    padding: "14px clamp(18px,4vw,52px)",
    background: "#244493",
    color: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },
  brand: { fontSize: 24, fontWeight: 900 },
  subBrand: { opacity: 0.82, fontSize: 13, marginTop: 3 },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    textAlign: "right",
  },
  role: { fontSize: 12, opacity: 0.8, marginTop: 3 },
  logout: {
    background: "#fff",
    color: "#244493",
    border: "none",
    borderRadius: 9,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  main: {
    width: "min(1180px,94vw)",
    margin: "0 auto",
    padding: "28px 0 50px",
  },
  welcome: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "end",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  title: { margin: "4px 0", fontSize: 32 },
  subtitle: { margin: 0, color: "#64748b" },
  muted: { color: "#64748b", fontSize: 14 },
  selectLabel: {
    display: "grid",
    gap: 6,
    fontWeight: 700,
    color: "#475569",
  },
  select: {
    minWidth: 280,
    padding: "11px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    background: "#fff",
  },
  notice: {
    background: "#ecfdf5",
    border: "1px solid #86efac",
    color: "#166534",
    borderRadius: 10,
    padding: 13,
    marginBottom: 16,
  },
  hero: {
    background: "#fff",
    borderRadius: 18,
    padding: 22,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    boxShadow: "0 7px 22px rgba(15,23,42,.06)",
  },
  studentName: { margin: "5px 0", fontSize: 27 },
  meta: { color: "#64748b" },
  codeBox: {
    minWidth: 260,
    border: "1px solid #dbe4f0",
    background: "#f8fafc",
    borderRadius: 13,
    padding: 16,
    display: "grid",
    gap: 6,
  },
  code: {
    fontSize: 21,
    letterSpacing: 2,
    color: "#244493",
    overflowWrap: "anywhere",
  },
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
    gap: 14,
    margin: "16px 0",
  },
  summaryCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 18,
    display: "grid",
    gap: 8,
    border: "1px solid #e2e8f0",
  },
  balanceCard: {
    background: "#244493",
    color: "#fff",
    borderRadius: 14,
    padding: 18,
    display: "grid",
    gap: 8,
  },
  balanceValue: { fontSize: 28 },
  summaryValue: { fontSize: 24, color: "#244493" },
  card: {
    background: "#fff",
    borderRadius: 18,
    padding: 22,
    marginTop: 16,
    boxShadow: "0 7px 22px rgba(15,23,42,.05)",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "center",
  },
  sectionTitle: { margin: "0 0 6px" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  smallSelect: {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
  },
  primary: {
    background: "#147d73",
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  rechargeForm: {
    marginTop: 18,
    padding: 16,
    background: "#f8fafc",
    borderRadius: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: 12,
  },
  field: { display: "grid", gap: 6, fontWeight: 700, color: "#475569" },
  input: {
    padding: "11px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    background: "#fff",
  },
  help: { color: "#64748b", fontSize: 12, marginBottom: 0 },
  tableWrap: { overflowX: "auto", marginTop: 18 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: {
    background: "#f8fafc",
    textAlign: "left",
    padding: 12,
    borderBottom: "1px solid #e2e8f0",
  },
  td: { padding: 12, borderBottom: "1px solid #eef2f7", verticalAlign: "top" },
  empty: { textAlign: "center", padding: 28, color: "#64748b" },
  badgeRecarga: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 800,
  },
  badgeConsumo: {
    background: "#ffedd5",
    color: "#9a3412",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 12,
    fontWeight: 800,
  },
  requestGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
    gap: 10,
  },
  requestCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    display: "grid",
    gap: 5,
  },
  requestPending: {
    color: "#92400e",
    background: "#fef3c7",
    borderRadius: 999,
    padding: "4px 8px",
    width: "fit-content",
    fontSize: 12,
    fontWeight: 800,
  },
  requestApproved: {
    color: "#166534",
    background: "#dcfce7",
    borderRadius: 999,
    padding: "4px 8px",
    width: "fit-content",
    fontSize: 12,
    fontWeight: 800,
  },
  requestRejected: {
    color: "#991b1b",
    background: "#fee2e2",
    borderRadius: 999,
    padding: "4px 8px",
    width: "fit-content",
    fontSize: 12,
    fontWeight: 800,
  },
  linkChildCard: {
    background: "#ffffff",
    border: "1px solid #dbeafe",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  linkChildHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  linkChildForm: {
    marginTop: 16,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    alignItems: "end",
  },
  linkChildActions: {
    display: "flex",
    alignItems: "end",
  },
  foundStudentCard: {
    marginTop: 14,
    border: "1px solid #86efac",
    background: "#f0fdf4",
    borderRadius: 12,
    padding: 14,
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
    flexWrap: "wrap",
  },
  secondaryButton: {
    background: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  smallButton: {
    background: "#ffffff",
    color: "#334155",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    background: "#147d73",
    color: "#ffffff",
    border: "none",
    borderRadius: 9,
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  },
  accountCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
  },
  accountHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  accountGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
  },
  accountBox: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
    display: "grid",
    gap: 12,
  },
  accountMessage: {
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    background: "#eff6ff",
    color: "#1e40af",
    fontWeight: 700,
  },
};
