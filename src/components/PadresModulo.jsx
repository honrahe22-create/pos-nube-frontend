import { useEffect, useMemo, useState } from "react";

const VACIO = {
  cedula: "",
  nombres: "",
  apellidos: "",
  correo: "",
  telefono: "",
  pais: "Ecuador",
  ciudad: "",
};

const nombreCompleto = (persona) =>
  `${persona?.nombres || ""} ${persona?.apellidos || ""}`.trim();

export default function PadresModulo({
  API_URL,
  token,
  institucionId,
  institucionNombre,
  alumnos = [],
  cargarAlumnos,
}) {
  const [padres, setPadres] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [padreDetalle, setPadreDetalle] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [busquedaHijo, setBusquedaHijo] = useState("");
  const [mostrarAgregarHijo, setMostrarAgregarHijo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const cargarPadres = async () => {
    if (!token || !institucionId) return;
    try {
      setCargando(true);
      const res = await fetch(
        `${API_URL}/api/padres?institucion_id=${encodeURIComponent(
          institucionId
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudieron cargar los padres");
      setPadres(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudieron cargar los padres.");
      setPadres([]);
    } finally {
      setCargando(false);
    }
  };

  const cargarPadreDetalle = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/padres/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo cargar el padre");
      setPadreDetalle(data);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo cargar la ficha del padre.");
    }
  };

  useEffect(() => {
    cargarPadres();
    setPadreDetalle(null);
  }, [token, institucionId]);

  const padresFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return padres;
    return padres.filter((p) => {
      const texto = [
        p.cedula,
        p.nombres,
        p.apellidos,
        p.correo,
        p.telefono,
        p.ciudad,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return texto.includes(q);
    });
  }, [padres, busqueda]);

  const hijosVinculadosIds = useMemo(
    () =>
      new Set(
        (padreDetalle?.hijos || []).map((h) => String(h.id))
      ),
    [padreDetalle]
  );

  const alumnosDisponibles = useMemo(() => {
    const q = busquedaHijo.trim().toLowerCase();
    return alumnos
      .filter((a) => a.activo !== false)
      .filter((a) => !hijosVinculadosIds.has(String(a.id)))
      .filter((a) => {
        if (!q) return true;
        const texto = [
          a.cedula,
          a.codigo,
          a.nombres,
          a.apellidos,
          a.curso,
          a.paralelo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return texto.includes(q);
      })
      .slice(0, 30);
  }, [alumnos, busquedaHijo, hijosVinculadosIds]);

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm(VACIO);
    setMostrarForm(true);
  };

  const abrirEditar = (p) => {
    setEditandoId(p.id);
    setForm({
      cedula: p.cedula || "",
      nombres: p.nombres || "",
      apellidos: p.apellidos || "",
      correo: p.correo || "",
      telefono: p.telefono || "",
      pais: p.pais || "Ecuador",
      ciudad: p.ciudad || "",
    });
    setMostrarForm(true);
  };

  const guardarPadre = async (e) => {
    e.preventDefault();
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      alert("Nombres y apellidos son obligatorios.");
      return;
    }

    try {
      setGuardando(true);
      const url = editandoId
        ? `${API_URL}/api/padres/${editandoId}`
        : `${API_URL}/api/padres`;
      const res = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          ...form,
          institucion_id: Number(institucionId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo guardar");

      setMostrarForm(false);
      setEditandoId(null);
      setForm(VACIO);
      await cargarPadres();

      if (padreDetalle && Number(padreDetalle.id) === Number(data.id)) {
        await cargarPadreDetalle(data.id);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo guardar el padre.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarPadre = async (p) => {
    if (
      !window.confirm(
        `¿Eliminar a ${nombreCompleto(p)}? Los alumnos NO serán eliminados.`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/padres/${p.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo eliminar");
      if (padreDetalle?.id === p.id) setPadreDetalle(null);
      await cargarPadres();
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo eliminar el padre.");
    }
  };

  const vincularHijo = async (alumno) => {
    if (!padreDetalle) return;
    try {
      const res = await fetch(
        `${API_URL}/api/padres/${padreDetalle.id}/hijos`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ alumno_id: alumno.id }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo vincular");
      await cargarPadreDetalle(padreDetalle.id);
      await cargarPadres();
      setBusquedaHijo("");
      setMostrarAgregarHijo(false);
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo vincular el alumno.");
    }
  };

  const desvincularHijo = async (alumno) => {
    if (!padreDetalle) return;
    if (
      !window.confirm(
        `¿Desvincular a ${nombreCompleto(alumno)} de este padre?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/api/padres/${padreDetalle.id}/hijos/${alumno.id}`,
        {
          method: "DELETE",
          headers,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo desvincular");
      await cargarPadreDetalle(padreDetalle.id);
      await cargarPadres();
    } catch (error) {
      console.error(error);
      alert(error.message || "No se pudo desvincular el alumno.");
    }
  };

  if (padreDetalle) {
    return (
      <section style={s.page}>
        <div style={s.headerRow}>
          <div>
            <button style={s.back} onClick={() => setPadreDetalle(null)}>
              ← Volver a Padres
            </button>
            <h1 style={s.title}>Información Personal del padre</h1>
            <p style={s.subtitle}>{institucionNombre}</p>
          </div>
          <button style={s.primary} onClick={() => abrirEditar(padreDetalle)}>
            Editar padre
          </button>
        </div>

        <div style={s.card}>
          <div style={s.profileGrid}>
            <div style={s.avatar}>
              {(padreDetalle.nombres?.[0] || "P").toUpperCase()}
            </div>
            <div style={s.infoGrid}>
              <Dato label="Nombres" value={padreDetalle.nombres} />
              <Dato label="Apellidos" value={padreDetalle.apellidos} />
              <Dato label="Tipo de usuario" value="PADRE / REPRESENTANTE" />
              <Dato label="Cédula" value={padreDetalle.cedula || "-"} />
              <Dato label="Correo electrónico" value={padreDetalle.correo || "-"} />
              <Dato label="Teléfono" value={padreDetalle.telefono || "-"} />
              <Dato label="País" value={padreDetalle.pais || "Ecuador"} />
              <Dato label="Ciudad" value={padreDetalle.ciudad || "-"} />
            </div>
          </div>
        </div>

        <div style={s.sectionHeader}>
          <div>
            <h2 style={s.sectionTitle}>Información Hijos</h2>
            <p style={s.subtitle}>
              Alumnos vinculados a este padre o representante.
            </p>
          </div>
          <button
            style={s.primary}
            onClick={async () => {
              if (typeof cargarAlumnos === "function") await cargarAlumnos();
              setMostrarAgregarHijo(true);
            }}
          >
            + Agregar hijo
          </button>
        </div>

        {(padreDetalle.hijos || []).length === 0 ? (
          <div style={s.empty}>Este padre todavía no tiene hijos vinculados.</div>
        ) : (
          <div style={s.childrenGrid}>
            {(padreDetalle.hijos || []).map((hijo) => (
              <div key={hijo.id} style={s.childCard}>
                <div style={s.childAvatar}>
                  {(hijo.nombres?.[0] || "A").toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 17 }}>
                    {nombreCompleto(hijo)}
                  </strong>
                  <div style={s.muted}>
                    {hijo.curso || "Sin curso"}
                    {hijo.paralelo ? ` · ${hijo.paralelo}` : ""}
                  </div>
                  <div style={s.muted}>
                    Código: {hijo.codigo || hijo.cedula || "-"}
                  </div>
                </div>
                <button
                  style={s.dangerOutline}
                  onClick={() => desvincularHijo(hijo)}
                >
                  Desvincular
                </button>
              </div>
            ))}
          </div>
        )}

        {mostrarAgregarHijo && (
          <div style={s.overlay} onMouseDown={() => setMostrarAgregarHijo(false)}>
            <div style={s.modal} onMouseDown={(e) => e.stopPropagation()}>
              <div style={s.modalHeader}>
                <div>
                  <h2 style={{ margin: 0 }}>Agregar hijo</h2>
                  <p style={s.subtitle}>
                    Busca un alumno existente y vincúlalo al padre.
                  </p>
                </div>
                <button style={s.close} onClick={() => setMostrarAgregarHijo(false)}>
                  ×
                </button>
              </div>

              <input
                style={s.input}
                value={busquedaHijo}
                onChange={(e) => setBusquedaHijo(e.target.value)}
                placeholder="Buscar por nombre, apellido, código, curso..."
                autoFocus
              />

              <div style={s.studentList}>
                {alumnosDisponibles.length === 0 ? (
                  <div style={s.emptySmall}>
                    No hay alumnos disponibles con esa búsqueda.
                  </div>
                ) : (
                  alumnosDisponibles.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      style={s.studentRow}
                      onClick={() => vincularHijo(a)}
                    >
                      <span>
                        <strong>{nombreCompleto(a)}</strong>
                        <small style={s.studentMeta}>
                          {a.curso || "Sin curso"}
                          {a.paralelo ? ` · ${a.paralelo}` : ""} ·{" "}
                          {a.codigo || a.cedula || `#${a.id}`}
                        </small>
                      </span>
                      <span style={s.addBadge}>Vincular</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {mostrarForm && (
          <FormularioPadre
            form={form}
            setForm={setForm}
            editando={Boolean(editandoId)}
            guardando={guardando}
            onSubmit={guardarPadre}
            onClose={() => setMostrarForm(false)}
          />
        )}
      </section>
    );
  }

  return (
    <section style={s.page}>
      <div style={s.headerRow}>
        <div>
          <h1 style={s.title}>Padres</h1>
          <p style={s.subtitle}>
            Administra padres y representantes de {institucionNombre}.
          </p>
        </div>
        <button style={s.primary} onClick={abrirNuevo}>
          + Agregar padre
        </button>
      </div>

      <div style={s.toolbar}>
        <input
          style={{ ...s.input, maxWidth: 520 }}
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar padre por nombre, cédula, correo o teléfono..."
        />
        <div style={s.counter}>
          {padresFiltrados.length} padre{padresFiltrados.length === 1 ? "" : "s"}
        </div>
      </div>

      {cargando ? (
        <div style={s.empty}>Cargando padres...</div>
      ) : padresFiltrados.length === 0 ? (
        <div style={s.empty}>
          No hay padres registrados. Usa “Agregar padre” para crear el primero.
        </div>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Padre / representante</th>
                <th style={s.th}>Cédula</th>
                <th style={s.th}>Correo</th>
                <th style={s.th}>Teléfono</th>
                <th style={s.th}>Hijos</th>
                <th style={s.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {padresFiltrados.map((p) => (
                <tr key={p.id}>
                  <td style={s.td}>
                    <button
                      style={s.nameButton}
                      onClick={() => cargarPadreDetalle(p.id)}
                    >
                      {nombreCompleto(p)}
                    </button>
                  </td>
                  <td style={s.td}>{p.cedula || "-"}</td>
                  <td style={s.td}>{p.correo || "-"}</td>
                  <td style={s.td}>{p.telefono || "-"}</td>
                  <td style={s.td}>
                    <span style={s.badge}>{Number(p.total_hijos || 0)}</span>
                  </td>
                  <td style={s.td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        style={s.smallButton}
                        onClick={() => cargarPadreDetalle(p.id)}
                      >
                        Ver
                      </button>
                      <button
                        style={s.smallButton}
                        onClick={() => abrirEditar(p)}
                      >
                        Editar
                      </button>
                      <button
                        style={s.dangerOutline}
                        onClick={() => eliminarPadre(p)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {mostrarForm && (
        <FormularioPadre
          form={form}
          setForm={setForm}
          editando={Boolean(editandoId)}
          guardando={guardando}
          onSubmit={guardarPadre}
          onClose={() => setMostrarForm(false)}
        />
      )}
    </section>
  );
}

function Dato({ label, value }) {
  return (
    <div>
      <div style={s.label}>{label}</div>
      <div style={s.value}>{value || "-"}</div>
    </div>
  );
}

function FormularioPadre({
  form,
  setForm,
  editando,
  guardando,
  onSubmit,
  onClose,
}) {
  const cambiar = (campo) => (e) =>
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));

  return (
    <div style={s.overlay} onMouseDown={onClose}>
      <form style={s.modal} onSubmit={onSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <h2 style={{ margin: 0 }}>
              {editando ? "Editar padre" : "Agregar padre"}
            </h2>
            <p style={s.subtitle}>Información personal del padre o representante.</p>
          </div>
          <button type="button" style={s.close} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={s.formGrid}>
          <Campo label="Nombres *" value={form.nombres} onChange={cambiar("nombres")} />
          <Campo label="Apellidos *" value={form.apellidos} onChange={cambiar("apellidos")} />
          <Campo label="Cédula" value={form.cedula} onChange={cambiar("cedula")} />
          <Campo label="Correo electrónico" type="email" value={form.correo} onChange={cambiar("correo")} />
          <Campo label="Teléfono" value={form.telefono} onChange={cambiar("telefono")} />
          <Campo label="País" value={form.pais} onChange={cambiar("pais")} />
          <Campo label="Ciudad" value={form.ciudad} onChange={cambiar("ciudad")} />
        </div>

        <div style={s.modalActions}>
          <button type="button" style={s.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" style={s.primary} disabled={guardando}>
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear padre"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Campo({ label, ...props }) {
  return (
    <label style={{ display: "grid", gap: 7 }}>
      <span style={s.label}>{label}</span>
      <input style={s.input} {...props} />
    </label>
  );
}

const s = {
  page: {
    padding: "28px",
    minHeight: "100%",
    background: "#f5f7fb",
    color: "#1d2433",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
    marginBottom: 22,
    flexWrap: "wrap",
  },
  title: { margin: 0, fontSize: 34, fontWeight: 800 },
  subtitle: { margin: "6px 0 0", color: "#6f7787", lineHeight: 1.45 },
  primary: {
    border: 0,
    borderRadius: 10,
    background: "#3154c6",
    color: "white",
    padding: "12px 18px",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondary: {
    border: "1px solid #d6dbe6",
    borderRadius: 10,
    background: "white",
    color: "#293247",
    padding: "12px 18px",
    fontWeight: 700,
    cursor: "pointer",
  },
  toolbar: {
    background: "white",
    border: "1px solid #e6e9ef",
    borderRadius: 14,
    padding: 16,
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 18,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 13px",
    border: "1px solid #d7dce8",
    borderRadius: 9,
    outline: "none",
    fontSize: 15,
    background: "white",
  },
  counter: {
    color: "#566078",
    fontWeight: 700,
  },
  tableWrap: {
    background: "white",
    border: "1px solid #e6e9ef",
    borderRadius: 14,
    overflowX: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 850 },
  th: {
    padding: "14px 16px",
    textAlign: "left",
    fontSize: 13,
    color: "#6c7485",
    background: "#f8f9fc",
    borderBottom: "1px solid #e9ecf2",
  },
  td: {
    padding: "14px 16px",
    borderBottom: "1px solid #edf0f5",
    verticalAlign: "middle",
  },
  nameButton: {
    border: 0,
    background: "transparent",
    padding: 0,
    color: "#294fc4",
    fontWeight: 800,
    fontSize: 15,
    cursor: "pointer",
    textAlign: "left",
  },
  badge: {
    display: "inline-flex",
    minWidth: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    background: "#e9efff",
    color: "#294fc4",
    fontWeight: 800,
  },
  smallButton: {
    border: "1px solid #d8deeb",
    background: "white",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
    color: "#34405a",
  },
  dangerOutline: {
    border: "1px solid #f0c4c8",
    background: "#fff7f7",
    color: "#b32e3a",
    borderRadius: 8,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  empty: {
    background: "white",
    border: "1px dashed #ccd3e1",
    borderRadius: 14,
    padding: 34,
    textAlign: "center",
    color: "#6d7584",
  },
  emptySmall: {
    padding: 22,
    textAlign: "center",
    color: "#747c8c",
  },
  card: {
    background: "white",
    border: "1px solid #e4e8f0",
    borderRadius: 16,
    padding: 24,
    marginBottom: 26,
  },
  profileGrid: {
    display: "grid",
    gridTemplateColumns: "110px minmax(0, 1fr)",
    gap: 24,
    alignItems: "start",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#e6edff",
    color: "#2d50c2",
    fontSize: 38,
    fontWeight: 900,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "20px 26px",
  },
  label: { color: "#7a8292", fontSize: 13, fontWeight: 700 },
  value: { marginTop: 5, fontWeight: 750, color: "#232b3b" },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "center",
    flexWrap: "wrap",
    margin: "6px 0 16px",
  },
  sectionTitle: { margin: 0, fontSize: 24 },
  childrenGrid: { display: "grid", gap: 12 },
  childCard: {
    display: "flex",
    gap: 15,
    alignItems: "center",
    padding: 16,
    background: "white",
    border: "1px solid #e3e7ef",
    borderRadius: 13,
  },
  childAvatar: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#edf2ff",
    color: "#3154c6",
    fontWeight: 900,
  },
  muted: { color: "#747c8d", marginTop: 3, fontSize: 14 },
  back: {
    border: 0,
    background: "transparent",
    color: "#3154c6",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 0 10px",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(22, 29, 45, .46)",
    display: "grid",
    placeItems: "center",
    padding: 20,
    zIndex: 2000,
  },
  modal: {
    width: "min(760px, 96vw)",
    maxHeight: "90vh",
    overflowY: "auto",
    background: "white",
    borderRadius: 16,
    boxShadow: "0 24px 80px rgba(20,28,50,.28)",
    padding: 24,
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 20,
  },
  close: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "1px solid #dde1ea",
    background: "white",
    fontSize: 24,
    cursor: "pointer",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: 16,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 24,
  },
  studentList: {
    marginTop: 14,
    border: "1px solid #e2e6ee",
    borderRadius: 10,
    overflow: "hidden",
    maxHeight: 380,
    overflowY: "auto",
  },
  studentRow: {
    width: "100%",
    border: 0,
    borderBottom: "1px solid #edf0f4",
    background: "white",
    padding: "13px 14px",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
    textAlign: "left",
  },
  studentMeta: {
    display: "block",
    color: "#747c8d",
    marginTop: 4,
  },
  addBadge: {
    color: "#2c52c4",
    background: "#edf2ff",
    borderRadius: 999,
    padding: "6px 10px",
    fontWeight: 800,
    fontSize: 12,
  },
};
