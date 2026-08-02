import { useMemo, useState } from "react";

const INSTITUCIONES = [
  { id: 1, nombre: "Colegio Marista" },
  { id: 2, nombre: "Colegio Pensionado Universitario" },
  { id: 3, nombre: "FEUE" },
  { id: 4, nombre: "Club Los Cipreses" },
];

const moneda = (valor) => `$${Number(valor || 0).toFixed(2)}`;

const fechaHora = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleString("es-EC");
};

const extraerCodigoAcceso = (valor) => {
  const texto = String(valor || "").toUpperCase();

  // Acepta el código solo: GUJS96JS
  const codigoSolo = texto.trim().match(/^[A-Z2-9]{8}$/);
  if (codigoSolo) return codigoSolo[0];

  // También acepta el texto completo copiado desde la ficha del alumno.
  const candidatos = texto.match(/[A-Z2-9]{8}/g) || [];
  return candidatos.length ? candidatos[candidatos.length - 1] : texto.trim();
};

export default function ConsultaAlumnoPublica({ API_URL }) {
  const [form, setForm] = useState({
    institucion_id: "",
    cedula: "",
    codigo: "",
  });
  const [datos, setDatos] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState("TODOS");

  const movimientos = useMemo(() => {
    const lista = Array.isArray(datos?.movimientos) ? datos.movimientos : [];
    if (filtro === "TODOS") return lista;
    return lista.filter((item) => item.tipo === filtro);
  }, [datos, filtro]);

  const consultar = async (event) => {
    event.preventDefault();
    setMensaje("");
    setCargando(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/consulta-alumno/acceso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institucion_id: Number(form.institucion_id),
          cedula: form.cedula.trim(),
          codigo: extraerCodigoAcceso(form.codigo),
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        setDatos(null);
        setMensaje(data.message || "No fue posible consultar la cuenta.");
        return;
      }

      setDatos(data);
    } catch (error) {
      console.error("Error consultando cuenta:", error);
      setMensaje("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const cerrar = () => {
    setDatos(null);
    setMensaje("");
    setForm((anterior) => ({ ...anterior, codigo: "" }));
  };

  return (
    <div style={ui.page}>
      <div style={ui.topBar}>
        <div>
          <strong style={ui.brand}>POS NUBE</strong>
          <span style={ui.brandSub}>Consulta para familias</span>
        </div>
        <button
          type="button"
          style={ui.adminLink}
          onClick={() => {
            window.location.href = window.location.origin;
          }}
        >
          Ingreso administrativo
        </button>
      </div>

      {!datos ? (
        <div style={ui.loginCard}>
          <div style={ui.iconCircle}>👨‍👩‍👧</div>
          <h1 style={ui.title}>Consulta de saldo y movimientos</h1>
          <p style={ui.subtitle}>
            Ingresa los datos entregados por la institución. Este acceso es solo
            de consulta y no permite realizar compras ni modificar información.
          </p>

          <form onSubmit={consultar} style={ui.form}>
            <label style={ui.label}>Institución</label>
            <select
              required
              value={form.institucion_id}
              onChange={(e) =>
                setForm((anterior) => ({
                  ...anterior,
                  institucion_id: e.target.value,
                }))
              }
              style={ui.input}
            >
              <option value="">Seleccionar institución</option>
              {INSTITUCIONES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>

            <label style={ui.label}>Cédula o código del alumno</label>
            <input
              required
              value={form.cedula}
              onChange={(e) =>
                setForm((anterior) => ({
                  ...anterior,
                  cedula: e.target.value,
                }))
              }
              placeholder="Ejemplo: 1723456789"
              style={ui.input}
              autoComplete="username"
            />

            <label style={ui.label}>Código de acceso</label>
            <input
              required
              value={form.codigo}
              onChange={(e) => {
                const valorPegado = e.target.value;
                const codigoExtraido = extraerCodigoAcceso(valorPegado);

                setForm((anterior) => ({
                  ...anterior,
                  codigo:
                    codigoExtraido.length === 8
                      ? codigoExtraido
                      : valorPegado.toUpperCase(),
                }));
              }}
              placeholder="Ejemplo: GUJS96JS"
              style={{ ...ui.input, letterSpacing: 3, textTransform: "uppercase" }}
              maxLength={80}
              autoComplete="one-time-code"
            />

            {mensaje && <div style={ui.error}>{mensaje}</div>}

            <button type="submit" style={ui.primaryButton} disabled={cargando}>
              {cargando ? "Consultando..." : "Consultar cuenta"}
            </button>
          </form>
        </div>
      ) : (
        <div style={ui.dashboard}>
          <div style={ui.studentHero}>
            <div>
              <span style={ui.heroLabel}>Cuenta del alumno</span>
              <h1 style={ui.heroName}>
                {datos.alumno?.nombres} {datos.alumno?.apellidos}
              </h1>
              <div style={ui.heroMeta}>
                {datos.institucion?.nombre || "Institución"} ·{" "}
                {datos.alumno?.curso || "Sin curso"}{" "}
                {datos.alumno?.paralelo || ""}
              </div>
            </div>
            <button type="button" style={ui.closeButton} onClick={cerrar}>
              Cerrar consulta
            </button>
          </div>

          <div style={ui.summaryGrid}>
            <div style={ui.balanceCard}>
              <span style={ui.summaryLabel}>Saldo disponible</span>
              <strong style={ui.balanceValue}>
                {moneda(datos.alumno?.saldo)}
              </strong>
            </div>
            <div style={ui.summaryCard}>
              <span style={ui.summaryLabel}>Total recargado</span>
              <strong style={ui.summaryValue}>
                {moneda(datos.resumen?.total_recargas)}
              </strong>
            </div>
            <div style={ui.summaryCard}>
              <span style={ui.summaryLabel}>Total consumido</span>
              <strong style={ui.summaryValue}>
                {moneda(datos.resumen?.total_consumos)}
              </strong>
            </div>
            <div style={ui.summaryCard}>
              <span style={ui.summaryLabel}>Movimientos</span>
              <strong style={ui.summaryValue}>
                {Number(datos.resumen?.cantidad_movimientos || 0)}
              </strong>
            </div>
          </div>

          <div style={ui.contentCard}>
            <div style={ui.toolbar}>
              <div>
                <h2 style={ui.sectionTitle}>Movimientos de la cuenta</h2>
                <p style={ui.sectionSub}>
                  Recargas y consumos registrados por la institución.
                </p>
              </div>

              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                style={ui.smallSelect}
              >
                <option value="TODOS">Todos</option>
                <option value="RECARGA">Recargas</option>
                <option value="CONSUMO">Consumos</option>
              </select>
            </div>

            <div style={ui.tableWrap}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    <th style={ui.th}>Fecha</th>
                    <th style={ui.th}>Tipo</th>
                    <th style={ui.th}>Detalle</th>
                    <th style={ui.th}>Método</th>
                    <th style={ui.th}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={ui.empty}>
                        No hay movimientos disponibles.
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((item) => (
                      <tr key={`${item.tipo}-${item.id}`}>
                        <td style={ui.td}>{fechaHora(item.fecha)}</td>
                        <td style={ui.td}>
                          <span
                            style={
                              item.tipo === "RECARGA"
                                ? ui.rechargeBadge
                                : ui.consumptionBadge
                            }
                          >
                            {item.tipo === "RECARGA" ? "Recarga" : "Consumo"}
                          </span>
                        </td>
                        <td style={ui.td}>{item.detalle || "-"}</td>
                        <td style={ui.td}>{item.metodo_pago || "-"}</td>
                        <td
                          style={{
                            ...ui.td,
                            ...(item.tipo === "RECARGA"
                              ? ui.positive
                              : ui.negative),
                          }}
                        >
                          {item.tipo === "RECARGA" ? "+" : "-"}
                          {moneda(item.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={ui.securityNotice}>
            🔒 Por seguridad, no compartas el código fuera de tu familia. La
            institución puede generar uno nuevo y desactivar el anterior.
          </div>
        </div>
      )}
    </div>
  );
}

const ui = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#0f172a",
    fontFamily: "Inter, system-ui, Arial, sans-serif",
  },
  topBar: {
    minHeight: 72,
    background: "#1726a8",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    padding: "0 5%",
    boxShadow: "0 4px 18px rgba(15,23,42,.18)",
  },
  brand: { display: "block", fontSize: 22, letterSpacing: 0.5 },
  brandSub: { display: "block", opacity: 0.82, fontSize: 13, marginTop: 2 },
  adminLink: {
    border: "1px solid rgba(255,255,255,.55)",
    background: "transparent",
    color: "#fff",
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
  },
  loginCard: {
    width: "min(520px, calc(100% - 32px))",
    margin: "54px auto",
    background: "#fff",
    borderRadius: 18,
    padding: "36px",
    boxShadow: "0 18px 50px rgba(15,23,42,.13)",
  },
  iconCircle: {
    width: 66,
    height: 66,
    margin: "0 auto 18px",
    borderRadius: "50%",
    background: "#e8edff",
    display: "grid",
    placeItems: "center",
    fontSize: 30,
  },
  title: { textAlign: "center", margin: "0 0 10px", fontSize: 28 },
  subtitle: {
    textAlign: "center",
    color: "#64748b",
    lineHeight: 1.55,
    margin: "0 0 26px",
  },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  label: { fontWeight: 700, fontSize: 14, marginTop: 5 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    padding: "13px 14px",
    fontSize: 16,
    background: "#fff",
  },
  error: {
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: 8,
    padding: "11px 13px",
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 10,
    border: 0,
    borderRadius: 9,
    padding: "14px 18px",
    background: "#1726a8",
    color: "#fff",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
  },
  dashboard: {
    width: "min(1250px, calc(100% - 30px))",
    margin: "30px auto 55px",
  },
  studentHero: {
    background: "linear-gradient(135deg, #1726a8, #3f51dc)",
    color: "#fff",
    borderRadius: 16,
    padding: "26px 30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
  },
  heroLabel: { opacity: 0.82, fontSize: 13, textTransform: "uppercase" },
  heroName: { margin: "5px 0 5px", fontSize: 30 },
  heroMeta: { opacity: 0.88 },
  closeButton: {
    border: "1px solid rgba(255,255,255,.55)",
    background: "#fff",
    color: "#1726a8",
    borderRadius: 8,
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 700,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 16,
    margin: "20px 0",
  },
  balanceCard: {
    background: "#dff8ec",
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 6px 20px rgba(15,23,42,.08)",
  },
  summaryCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 22,
    boxShadow: "0 6px 20px rgba(15,23,42,.08)",
  },
  summaryLabel: { display: "block", color: "#64748b", marginBottom: 8 },
  balanceValue: { color: "#047857", fontSize: 34 },
  summaryValue: { color: "#1726a8", fontSize: 30 },
  contentCard: {
    background: "#fff",
    borderRadius: 15,
    padding: 24,
    boxShadow: "0 8px 28px rgba(15,23,42,.09)",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  sectionTitle: { margin: 0, fontSize: 22 },
  sectionSub: { margin: "5px 0 0", color: "#64748b" },
  smallSelect: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "10px 12px",
    background: "#fff",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: {
    padding: "13px 12px",
    textAlign: "left",
    background: "#e8efff",
    color: "#1726a8",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 12px",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },
  empty: { padding: 30, textAlign: "center", color: "#64748b" },
  rechargeBadge: {
    background: "#dcfce7",
    color: "#166534",
    borderRadius: 999,
    padding: "5px 9px",
    fontWeight: 700,
    fontSize: 12,
  },
  consumptionBadge: {
    background: "#ffedd5",
    color: "#9a3412",
    borderRadius: 999,
    padding: "5px 9px",
    fontWeight: 700,
    fontSize: 12,
  },
  positive: { color: "#047857", fontWeight: 800 },
  negative: { color: "#dc2626", fontWeight: 800 },
  securityNotice: {
    marginTop: 18,
    border: "1px solid #bfdbfe",
    background: "#eff6ff",
    color: "#1e40af",
    borderRadius: 10,
    padding: "14px 16px",
    lineHeight: 1.45,
  },
};