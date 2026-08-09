import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

const dinero = (v) => `$${Number(v || 0).toFixed(2)}`;

const fechaHoy = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fechaHace30 = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const ui = {
  page: { padding: 28, background: "#f5f7fb", minHeight: "100%", color: "#1f2937" },
  top: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 },
  title: { margin: 0, fontSize: 32, fontWeight: 800 },
  sub: { margin: "6px 0 0", color: "#697386" },
  box: { background: "#fff", border: "1px solid #e6e9ef", borderRadius: 14, padding: 18, marginBottom: 18 },
  filters: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, alignItems: "end" },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, fontWeight: 800, color: "#626c7f" },
  input: { width: "100%", boxSizing: "border-box", border: "1px solid #d7dce8", borderRadius: 9, padding: "11px 12px", background: "#fff" },
  btn: { border: 0, borderRadius: 9, padding: "11px 16px", background: "#3154c6", color: "#fff", fontWeight: 800, cursor: "pointer" },
  btn2: { border: "1px solid #d6dce8", borderRadius: 9, padding: "10px 14px", background: "#fff", color: "#334155", fontWeight: 700, cursor: "pointer" },
  export: { border: "1px solid #9dd8b2", borderRadius: 9, padding: "10px 14px", background: "#f3fff7", color: "#16713b", fontWeight: 800, cursor: "pointer" },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #e6e9ef", borderRadius: 14 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 850 },
  th: { textAlign: "left", padding: "12px 14px", fontSize: 12, color: "#64748b", background: "#f3f6ff", borderBottom: "1px solid #e6e9ef", whiteSpace: "nowrap" },
  td: { padding: "12px 14px", borderBottom: "1px solid #edf0f4", verticalAlign: "top" },
  empty: { padding: 30, textAlign: "center", color: "#7b8495" },
  total: { fontWeight: 900 }
};

export default function ProductosMasVendidosModulo({ API_URL, token, institucionId, institucionNombre }) {
  const [filtros, setFiltros] = useState({
    fecha_inicio: fechaHace30(),
    fecha_fin: fechaHoy(),
    ubicacion: "",
    texto: "",
  });
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const consultar = async () => {
    if (!token || !institucionId) return;
    setCargando(true);
    try {
      const q = new URLSearchParams({
        institucion_id: String(institucionId),
        fecha_inicio: filtros.fecha_inicio || "",
        fecha_fin: filtros.fecha_fin || "",
        ubicacion: filtros.ubicacion || "",
        texto: filtros.texto || "",
      });
      const res = await fetch(`${API_URL}/api/productos-mas-vendidos?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo consultar");
      setDatos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert(e.message || "No se pudo cargar Productos más vendidos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { consultar(); }, [institucionId]);

  const totalUnidades = useMemo(
    () => datos.reduce((a, r) => a + Number(r.total_unidades || 0), 0),
    [datos]
  );

  const exportar = () => {
    if (!datos.length) return alert("No hay datos para exportar.");
    const filas = datos.map((r, i) => ({
      Ranking: i + 1,
      Nombre: r.nombre,
      Descripción: r.descripcion || "",
      Precio: Number(r.precio || 0),
      "Total ventas (unidades)": Number(r.total_unidades || 0),
      "Monto vendido": Number(r.monto_vendido || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(filas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos más vendidos");
    XLSX.writeFile(wb, `productos_mas_vendidos_${filtros.fecha_inicio}_${filtros.fecha_fin}.xlsx`);
  };

  return (
    <section style={ui.page}>
      <div style={ui.top}>
        <div>
          <h1 style={ui.title}>Productos más vendidos</h1>
          <p style={ui.sub}>Ranking real de productos vendidos · {institucionNombre}</p>
        </div>
        <button style={ui.export} onClick={exportar}>Exportar Excel</button>
      </div>

      <div style={ui.box}>
        <div style={ui.filters}>
          <label style={ui.field}><span style={ui.label}>Fecha inicial</span>
            <input type="date" style={ui.input} value={filtros.fecha_inicio}
              onChange={(e)=>setFiltros({...filtros,fecha_inicio:e.target.value})}/>
          </label>
          <label style={ui.field}><span style={ui.label}>Fecha final</span>
            <input type="date" style={ui.input} value={filtros.fecha_fin}
              onChange={(e)=>setFiltros({...filtros,fecha_fin:e.target.value})}/>
          </label>
          <label style={ui.field}><span style={ui.label}>Ubicación</span>
            <select style={ui.input} value={filtros.ubicacion}
              onChange={(e)=>setFiltros({...filtros,ubicacion:e.target.value})}>
              <option value="">Todas</option><option value="PRINCIPAL">PRINCIPAL</option>
            </select>
          </label>
          <label style={ui.field}><span style={ui.label}>Buscar</span>
            <input style={ui.input} placeholder="Nombre, código o descripción"
              value={filtros.texto} onChange={(e)=>setFiltros({...filtros,texto:e.target.value})}/>
          </label>
          <button style={ui.btn} onClick={consultar}>{cargando ? "Consultando..." : "Consultar"}</button>
        </div>
      </div>

      <div style={ui.tableWrap}>
        <table style={ui.table}>
          <thead><tr>
            <th style={ui.th}>#</th><th style={ui.th}>Nombre</th><th style={ui.th}>Descripción</th>
            <th style={ui.th}>Precio</th><th style={ui.th}>Total ventas</th><th style={ui.th}>Monto vendido</th>
          </tr></thead>
          <tbody>
            {!datos.length ? <tr><td colSpan="6" style={ui.empty}>No hay datos disponibles.</td></tr> :
            datos.map((r,i)=><tr key={r.producto_id}>
              <td style={ui.td}>{i+1}</td><td style={ui.td}><strong>{r.nombre}</strong></td>
              <td style={ui.td}>{r.descripcion || "-"}</td><td style={ui.td}>{dinero(r.precio)}</td>
              <td style={{...ui.td,...ui.total}}>{r.total_unidades}</td><td style={ui.td}>{dinero(r.monto_vendido)}</td>
            </tr>)}
          </tbody>
          {!!datos.length && <tfoot><tr>
            <td style={ui.td} colSpan="4"><strong>TOTAL UNIDADES</strong></td>
            <td style={{...ui.td,...ui.total}}>{totalUnidades}</td><td style={ui.td}></td>
          </tr></tfoot>}
        </table>
      </div>
    </section>
  );
}
