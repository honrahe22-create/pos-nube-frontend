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

export default function ProductosFormaPagoModulo({ API_URL, token, institucionId, institucionNombre }) {
  const [filtros, setFiltros] = useState({ fecha_inicio: fechaHace30(), fecha_fin: fechaHoy(), texto: "" });
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
        texto: filtros.texto || "",
      });
      const res = await fetch(`${API_URL}/api/productos-forma-pago?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "No se pudo consultar");
      setDatos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e); alert(e.message || "No se pudo cargar el reporte.");
    } finally { setCargando(false); }
  };
  useEffect(()=>{ consultar(); }, [institucionId]);

  const limpiar = () => setFiltros({ fecha_inicio: "", fecha_fin: "", texto: "" });

  const totales = useMemo(() => datos.reduce((a,r)=>{
    for (const k of ["tarjeta_unidades","tarjeta_monto","efectivo_unidades","efectivo_monto","saldo_unidades","saldo_monto","transferencia_unidades","transferencia_monto","credito_unidades","credito_monto","total_unidades","total_monto"])
      a[k]=(a[k]||0)+Number(r[k]||0);
    return a;
  },{}),[datos]);

  const exportar = () => {
    if (!datos.length) return alert("No hay datos para exportar.");
    const ws = XLSX.utils.json_to_sheet(datos.map(r=>({
      Producto:r.nombre,
      "Tarjeta unidades":Number(r.tarjeta_unidades||0),"Tarjeta monto":Number(r.tarjeta_monto||0),
      "Efectivo unidades":Number(r.efectivo_unidades||0),"Efectivo monto":Number(r.efectivo_monto||0),
      "Monedero unidades":Number(r.saldo_unidades||0),"Monedero monto":Number(r.saldo_monto||0),
      "Transferencia unidades":Number(r.transferencia_unidades||0),"Transferencia monto":Number(r.transferencia_monto||0),
      "Crédito unidades":Number(r.credito_unidades||0),"Crédito monto":Number(r.credito_monto||0),
      "Total unidades":Number(r.total_unidades||0),"Total monto":Number(r.total_monto||0),
    })));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Forma de pago");
    XLSX.writeFile(wb,`productos_forma_pago_${filtros.fecha_inicio}_${filtros.fecha_fin}.xlsx`);
  };

  const Par = ({u,m}) => <><td style={ui.td}>{Number(u||0)}</td><td style={ui.td}>{dinero(m)}</td></>;

  return <section style={ui.page}>
    <div style={ui.top}><div><h1 style={ui.title}>Productos por forma de pago</h1>
      <p style={ui.sub}>Unidades y montos por método de pago · {institucionNombre}</p></div>
      <button style={ui.export} onClick={exportar}>Exportar Excel</button></div>
    <div style={ui.box}><div style={ui.filters}>
      <label style={ui.field}><span style={ui.label}>Fecha inicial</span><input type="date" style={ui.input} value={filtros.fecha_inicio} onChange={e=>setFiltros({...filtros,fecha_inicio:e.target.value})}/></label>
      <label style={ui.field}><span style={ui.label}>Fecha final</span><input type="date" style={ui.input} value={filtros.fecha_fin} onChange={e=>setFiltros({...filtros,fecha_fin:e.target.value})}/></label>
      <label style={ui.field}><span style={ui.label}>Buscar producto</span><input style={ui.input} value={filtros.texto} onChange={e=>setFiltros({...filtros,texto:e.target.value})}/></label>
      <button style={ui.btn} onClick={consultar}>{cargando?"Filtrando...":"Filtrar"}</button>
      <button style={ui.btn2} onClick={limpiar}>Borrar filtros</button>
    </div></div>
    <div style={ui.tableWrap}><table style={{...ui.table,minWidth:1250}}>
      <thead>
        <tr><th style={ui.th} rowSpan="2">Producto</th>
          <th style={ui.th} colSpan="2">TARJETA</th><th style={ui.th} colSpan="2">EFECTIVO</th>
          <th style={ui.th} colSpan="2">MONEDERO</th><th style={ui.th} colSpan="2">TRANSFERENCIA</th>
          <th style={ui.th} colSpan="2">CRÉDITO</th><th style={ui.th} colSpan="2">TOTAL</th></tr>
        <tr>{Array.from({length:6}).flatMap((_,i)=>[
          <th key={`u${i}`} style={ui.th}>Unidades</th>,<th key={`m${i}`} style={ui.th}>Monto</th>
        ])}</tr>
      </thead>
      <tbody>{!datos.length?<tr><td colSpan="13" style={ui.empty}>No hay datos disponibles.</td></tr>:
        datos.map(r=><tr key={r.producto_id}><td style={ui.td}><strong>{r.nombre}</strong></td>
          <Par u={r.tarjeta_unidades} m={r.tarjeta_monto}/><Par u={r.efectivo_unidades} m={r.efectivo_monto}/>
          <Par u={r.saldo_unidades} m={r.saldo_monto}/><Par u={r.transferencia_unidades} m={r.transferencia_monto}/>
          <Par u={r.credito_unidades} m={r.credito_monto}/><Par u={r.total_unidades} m={r.total_monto}/>
        </tr>)}</tbody>
      {!!datos.length&&<tfoot><tr><td style={{...ui.td,...ui.total}}>TOTAL</td>
        <Par u={totales.tarjeta_unidades} m={totales.tarjeta_monto}/><Par u={totales.efectivo_unidades} m={totales.efectivo_monto}/>
        <Par u={totales.saldo_unidades} m={totales.saldo_monto}/><Par u={totales.transferencia_unidades} m={totales.transferencia_monto}/>
        <Par u={totales.credito_unidades} m={totales.credito_monto}/><Par u={totales.total_unidades} m={totales.total_monto}/>
      </tr></tfoot>}
    </table></div>
  </section>;
}
