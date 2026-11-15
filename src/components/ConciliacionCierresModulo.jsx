import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const dinero = n => `$${Number(n || 0).toFixed(2)}`;
const cercanoCero = n => Math.abs(Number(n || 0)) < 0.005;
const fechaArchivo = () => new Date().toISOString().slice(0,10);
const estiloCampo = {border:"1px solid #cbd5e1",borderRadius:8,padding:"9px 10px",maxWidth:"100%",background:"white"};
const columnas = ["Fecha", "Código", "Punto", "Operador", "Ventas efectivo", "Recargas efectivo", "Egresos", "Esperado efectivo", "Contado efectivo", "Diferencia efectivo", "Esperado transferencia", "Declarado transferencia", "Diferencia transferencia", "Diferencia tarjeta", "Diferencia general", "Estado", "Conciliaciones documentadas"];

export default function ConciliacionCierresModulo({ API_URL, institucionId }) {
  const [filtros, setFiltros] = useState({desde:"",hasta:"",punto_id:"",operador_id:"",codigo:"",estado:"TODOS"});
  const [datos, setDatos] = useState({cierres:[],auditorias:[]});
  const [cargando, setCargando] = useState(false);
  const [error,setError] = useState("");
  const [seleccionado,setSeleccionado] = useState(null);
  const cambiar = (k,v) => setFiltros(a=>({...a,[k]:v}));
  const consultar = async () => {
    if (!institucionId) return;
    setCargando(true); setError("");
    try {
      const p = new URLSearchParams({institucion_id:String(institucionId)});
      for (const k of ["desde","hasta","punto_id","operador_id","codigo"]) if (filtros[k]) p.set(k, filtros[k]);
      const respuesta = await fetch(`${API_URL}/api/conciliacion-cierres/resumen?${p.toString()}`, {headers:{Authorization:`Bearer ${localStorage.getItem("token") || ""}`}});
      const json = await respuesta.json();
      if (!respuesta.ok) throw new Error(json.message || "No se pudo consultar");
      setDatos({cierres:Array.isArray(json.cierres)?json.cierres:[],auditorias:Array.isArray(json.auditorias)?json.auditorias:[]});
      setSeleccionado(null);
    } catch(e) {setError(e.message || "No se pudo consultar"); setDatos({cierres:[],auditorias:[]});}
    finally {setCargando(false);}
  };
  useEffect(()=>{setDatos({cierres:[],auditorias:[]}); setSeleccionado(null); setFiltros({desde:"",hasta:"",punto_id:"",operador_id:"",codigo:"",estado:"TODOS"});},[institucionId]);
  const auditoriasPorCierre = useMemo(()=>{
    const mapa = new Map();
    for (const a of datos.auditorias) mapa.set(Number(a.cierre_id),(mapa.get(Number(a.cierre_id))||[]).concat(a));
    return mapa;
  },[datos.auditorias]);
  const estado = c => {
    const tieneAjuste = Boolean(auditoriasPorCierre.get(Number(c.id))?.length);
    if (!cercanoCero(c.diferencia_general) || !cercanoCero(c.diferencia_efectivo) || !cercanoCero(c.diferencia_transferencia) || !cercanoCero(c.diferencia_tarjeta)) return tieneAjuste?"CONCILIACIÓN PARCIAL":"CON DIFERENCIAS";
    return tieneAjuste?"CONCILIADO / REVISAR":"SIN DIFERENCIAS REGISTRADAS";
  };
  const visibles = datos.cierres.filter(c=>filtros.estado==="TODOS" || (filtros.estado==="DIFERENCIAS" ? (!cercanoCero(c.diferencia_general)||!cercanoCero(c.diferencia_efectivo)||!cercanoCero(c.diferencia_transferencia)||!cercanoCero(c.diferencia_tarjeta)) : filtros.estado==="CONCILIADOS" ? Boolean(auditoriasPorCierre.get(Number(c.id))?.length) : (cercanoCero(c.diferencia_general)&&cercanoCero(c.diferencia_efectivo)&&cercanoCero(c.diferencia_transferencia)&&cercanoCero(c.diferencia_tarjeta))));
  const filas = visibles.map(c=>[c.fecha,c.codigo_cierre || String(c.id),c.punto_nombre || "-",c.usuario_nombre || "-",Number(c.ventas_efectivo||0),Number(c.recargas_efectivo||0),Number(c.egresos_total||0),Number(c.efectivo_esperado||0),Number(c.efectivo_contado||0),Number(c.diferencia_efectivo||0),Number(c.transferencia_esperada||0),Number(c.transferencia_manual||0),Number(c.diferencia_transferencia||0),Number(c.diferencia_tarjeta||0),Number(c.diferencia_general||0),estado(c),(auditoriasPorCierre.get(Number(c.id))||[]).length]);
  const exportarExcel = () => {
    const hoja=XLSX.utils.aoa_to_sheet([columnas,...filas]);
    hoja['!cols']=columnas.map((v,i)=>({wch:i===1?28:i===15?30:20}));
    const libro=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(libro,hoja,"Auditoría cierres");
    XLSX.writeFile(libro,`POS_NUBE_AUDITORIA_CIERRES_${fechaArchivo()}.xlsx`);
  };
  const exportarPdf = () => {
    const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a3"});
    pdf.setFontSize(15);pdf.text("POS NUBE - Auditoría de cierres (solo lectura)",12,15);
    pdf.setFontSize(9);pdf.text(`Institución ID: ${institucionId} | Exportado: ${fechaArchivo()} | Registros: ${visibles.length}`,12,22);
    autoTable(pdf,{startY:28,head:[columnas],body:filas.map(f=>f.map((v,i)=>typeof v==="number"&&i>=4&&i<=14?dinero(v):String(v))),styles:{fontSize:6,cellPadding:1.6},headStyles:{fillColor:[31,41,55]},margin:{left:8,right:8}});
    pdf.save(`POS_NUBE_AUDITORIA_CIERRES_${fechaArchivo()}.pdf`);
  };
  return <div style={{border:"1px solid #e2e8f0",borderRadius:14,padding:18,background:"white"}}>
    <h3 style={{margin:"0 0 5px"}}>Conciliación y auditoría de cierres</h3>
    <p style={{color:"#475569",margin:"0 0 16px"}}>Fase 1: consulta contable. No modifica ningún cierre, venta, recarga o saldo. Una diferencia registrada no demuestra por sí sola dinero faltante.</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"end"}}>
      <label>Desde <input type="date" style={estiloCampo} value={filtros.desde} onChange={e=>cambiar("desde",e.target.value)}/></label>
      <label>Hasta <input type="date" style={estiloCampo} value={filtros.hasta} onChange={e=>cambiar("hasta",e.target.value)}/></label>
      <label>Punto ID <input type="number" min="1" placeholder="Todos" style={{...estiloCampo,width:94}} value={filtros.punto_id} onChange={e=>cambiar("punto_id",e.target.value)}/></label>
      <label>Operador ID <input type="number" min="1" placeholder="Todos" style={{...estiloCampo,width:105}} value={filtros.operador_id} onChange={e=>cambiar("operador_id",e.target.value)}/></label>
      <label>Código <input type="text" style={{...estiloCampo,width:190}} placeholder="Código del cierre" value={filtros.codigo} onChange={e=>cambiar("codigo",e.target.value)}/></label>
      <button type="button" disabled={cargando} onClick={consultar} style={{...estiloCampo,background:"#0f766e",color:"white",cursor:"pointer"}}>{cargando?"Consultando...":"Buscar cierres"}</button>
    </div>
    {error && <p style={{color:"#b91c1c"}}>{error}</p>}
    <div style={{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center",marginTop:16}}>
      <label>Mostrar: <select value={filtros.estado} onChange={e=>cambiar("estado",e.target.value)} style={estiloCampo}><option value="TODOS">Todos</option><option value="DIFERENCIAS">Con diferencias</option><option value="SIN">Sin diferencias</option><option value="CONCILIADOS">Con auditoría de conciliación</option></select></label>
      <span style={{fontWeight:700}}>{visibles.length} de {datos.cierres.length} cierres</span>
      <button type="button" disabled={!visibles.length} onClick={exportarExcel} style={estiloCampo}>Exportar Excel</button>
      <button type="button" disabled={!visibles.length} onClick={exportarPdf} style={estiloCampo}>Exportar PDF</button>
    </div>
    {datos.cierres.length>=150 && <p style={{color:"#92400e"}}>Se muestran como máximo 150 cierres por consulta. Ajusta las fechas para consultar períodos anteriores.</p>}
    <div style={{overflowX:"auto",marginTop:16}}><table style={{borderCollapse:"collapse",width:"100%",minWidth:970,fontSize:13}}>
      <thead><tr>{["Fecha","Código","Punto","Operador","Efectivo esperado","Contado","Dif. efectivo","Dif. transferencia","Dif. general","Estado","Acción"].map(h=><th key={h} style={{padding:9,textAlign:"left",background:"#f1f5f9",borderBottom:"1px solid #cbd5e1"}}>{h}</th>)}</tr></thead>
      <tbody>{visibles.map(c=><tr key={c.id} style={{borderBottom:"1px solid #e2e8f0"}}><td>{c.fecha}</td><td>{c.codigo_cierre||c.id}</td><td>{c.punto_nombre||"-"}</td><td>{c.usuario_nombre||"-"}</td><td>{dinero(c.efectivo_esperado)}</td><td>{dinero(c.efectivo_contado)}</td><td>{dinero(c.diferencia_efectivo)}</td><td>{dinero(c.diferencia_transferencia)}</td><td>{dinero(c.diferencia_general)}</td><td>{estado(c)}</td><td><button type="button" onClick={()=>setSeleccionado(c)} style={estiloCampo}>Ver</button></td></tr>)}</tbody>
    </table>{!visibles.length && <p style={{padding:10}}>No hay cierres en los filtros consultados. Pulsa “Buscar cierres” para cargar información.</p>}</div>
    {seleccionado && <div style={{background:"#f8fafc",padding:16,borderRadius:10,marginTop:16}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:12}}><h4 style={{margin:0}}>Detalle {seleccionado.codigo_cierre||seleccionado.id}</h4><button type="button" onClick={()=>setSeleccionado(null)}>Cerrar detalle</button></div>
      <p>Operador: {seleccionado.usuario_nombre||"-"} · Punto: {seleccionado.punto_nombre||"-"} · Fecha: {seleccionado.fecha}</p>
      <p>Ventas efectivo {dinero(seleccionado.ventas_efectivo)} · Recargas efectivo {dinero(seleccionado.recargas_efectivo)} · Egresos {dinero(seleccionado.egresos_total)}</p>
      <p>Efectivo esperado {dinero(seleccionado.efectivo_esperado)} · Contado {dinero(seleccionado.efectivo_contado)} · Diferencia {dinero(seleccionado.diferencia_efectivo)}</p>
      <p>Transferencias esperadas {dinero(seleccionado.transferencia_esperada)} · Declaradas {dinero(seleccionado.transferencia_manual)} · Diferencia {dinero(seleccionado.diferencia_transferencia)}</p>
      <p>Diferencia tarjeta {dinero(seleccionado.diferencia_tarjeta)} · Diferencia general {dinero(seleccionado.diferencia_general)}</p>
      <p><strong>Observación:</strong> {seleccionado.observacion||"Sin observación"}</p>
      <p><strong>Observación automática:</strong> {seleccionado.observacion_automatica||"-"}</p>
      <h4>Conciliaciones documentadas</h4>
      {!(auditoriasPorCierre.get(Number(seleccionado.id))||[]).length ? <p>Sin conciliaciones registradas en la tabla de auditoría específica.</p> : (auditoriasPorCierre.get(Number(seleccionado.id))||[]).map(a=><p key={a.id}>Auditoría #{a.id} · Movimiento #{a.movimiento_id} · {a.motivo} · {String(a.registrado_at||"").slice(0,19)}</p>)}
      <p style={{color:"#475569",fontSize:12}}>El módulo no verifica acreditaciones bancarias y no altera datos históricos. “Sin diferencias” significa únicamente que el cierre registró importes coincidentes.</p>
    </div>}
  </div>;
}
