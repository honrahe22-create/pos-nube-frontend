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

export default function KardexModulo({ API_URL, token, institucionId, institucionNombre, productos=[] }) {
  const [filtros,setFiltros]=useState({
    fecha_inicio:fechaHace30(), fecha_fin:fechaHoy(), ubicacion:"",
    tipo:"", motivo:"", producto_id:"", texto:""
  });
  const [datos,setDatos]=useState([]);
  const [cargando,setCargando]=useState(false);

  const consultar=async()=>{
    if(!token||!institucionId)return;
    setCargando(true);
    try{
      const q=new URLSearchParams({institucion_id:String(institucionId)});
      Object.entries(filtros).forEach(([k,v])=>{if(v)q.set(k,String(v));});
      const res=await fetch(`${API_URL}/api/kardex?${q.toString()}`,{headers:{Authorization:`Bearer ${token}`}});
      const data=await res.json(); if(!res.ok)throw new Error(data.message||"No se pudo consultar");
      setDatos(Array.isArray(data)?data:[]);
    }catch(e){console.error(e);alert(e.message||"No se pudo cargar Kardex");}
    finally{setCargando(false);}
  };
  useEffect(()=>{consultar();},[institucionId]);

  const motivos=useMemo(()=>Array.from(new Set(datos.map(r=>r.movimiento).filter(Boolean))).sort(),[datos]);

  const exportar=()=>{
    if(!datos.length)return alert("No hay movimientos para exportar.");
    const ws=XLSX.utils.json_to_sheet(datos.map(r=>({
      Fecha:r.fecha,Usuario:r.usuario_nombre||"Sistema",Producto:r.producto_nombre,
      Ubicación:r.ubicacion||"PRINCIPAL",Cantidad:Number(r.cantidad||0),Monto:Number(r.monto||0),
      Tipo:r.tipo,Movimiento:r.movimiento,"No. orden":r.numero_orden||"",Origen:r.origen||""
    })));
    ws["!cols"]=[
      {wch:22},{wch:30},{wch:28},{wch:20},{wch:12},
      {wch:14},{wch:18},{wch:28},{wch:16},{wch:14}
    ];
    const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Kardex");
    XLSX.writeFile(wb,`kardex_${filtros.fecha_inicio}_${filtros.fecha_fin}.xlsx`);
  };

  const exportarPdf=()=>{
    if(!datos.length)return alert("No hay movimientos para exportar.");

    const limpiarPdf=(valor)=>
      String(valor??"")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g,"")
        .replace(/[^\x20-\x7E]/g,"")
        .replace(/[()\\]/g,(m)=>`\\${m}`);

    const cortar=(valor,maximo)=>
      String(valor??"")
        .replace(/\s+/g," ")
        .trim()
        .slice(0,maximo);

    const lineas=[
      "POS NUBE - KARDEX DE PRODUCTOS",
      `Institucion: ${institucionNombre||"POS NUBE"}`,
      `Fecha inicial: ${filtros.fecha_inicio||"-"}`,
      `Fecha final: ${filtros.fecha_fin||"-"}`,
      `Ubicacion: ${filtros.ubicacion||"Todas"}`,
      `Tipo: ${filtros.tipo||"Todos"} | Movimiento: ${filtros.motivo||"Todos"}`,
      `Producto: ${filtros.producto_id||"Todos"} | Buscar: ${filtros.texto||"Sin filtro"}`,
      "--------------------------------------------------------------------------------------------------------------",
      "Fecha/hora           Usuario                 Producto              Ubicacion        Cant   Monto     Tipo",
      "--------------------------------------------------------------------------------------------------------------",
    ];

    datos.forEach((r)=>{
      const fecha=new Date(r.fecha);
      const fechaTexto=Number.isNaN(fecha.getTime())
        ? String(r.fecha||"-")
        : fecha.toLocaleString("es-EC");

      lineas.push(
        [
          cortar(fechaTexto,19).padEnd(19," "),
          cortar(r.usuario_nombre||"Sistema",22).padEnd(22," "),
          cortar(r.producto_nombre||"Producto",21).padEnd(21," "),
          cortar(r.ubicacion||"-",16).padEnd(16," "),
          String(Number(r.cantidad||0)).padStart(5," "),
          dinero(r.monto).padStart(9," "),
          cortar(r.tipo||"-",10).padStart(10," "),
        ].join(" ")
      );

      lineas.push(
        `  Movimiento: ${cortar(r.movimiento||"-",55)} | Orden: ${cortar(r.numero_orden||"-",16)}`
      );
    });

    lineas.push("--------------------------------------------------------------------------------------------------------------");
    lineas.push(`TOTAL MOVIMIENTOS: ${datos.length}`);

    const pageWidth=792;
    const pageHeight=612;
    const marginLeft=24;
    const startY=575;
    const lineHeight=11;
    const linesPerPage=46;
    const paginas=[];

    for(let i=0;i<lineas.length;i+=linesPerPage){
      paginas.push(lineas.slice(i,i+linesPerPage));
    }

    const objetos=[];
    const agregarObjeto=(contenido)=>{
      objetos.push(contenido);
      return objetos.length;
    };

    const fontObj=agregarObjeto(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>"
    );

    const pageRefs=[];

    paginas.forEach((lineasPagina)=>{
      let stream="BT\n/F1 7 Tf\n";
      let y=startY;

      lineasPagina.forEach((linea)=>{
        stream+=`1 0 0 1 ${marginLeft} ${y} Tm (${limpiarPdf(linea)}) Tj\n`;
        y-=lineHeight;
      });

      stream+="ET";

      const streamObj=agregarObjeto(
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
      );

      const pageObj=agregarObjeto(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] `+
        `/Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${streamObj} 0 R >>`
      );

      pageRefs.push(pageObj);
    });

    const pagesObj=agregarObjeto(
      `<< /Type /Pages /Kids [${pageRefs.map((n)=>`${n} 0 R`).join(" ")}] /Count ${pageRefs.length} >>`
    );

    pageRefs.forEach((pageObj)=>{
      objetos[pageObj-1]=objetos[pageObj-1].replace(
        "/Parent 0 0 R",
        `/Parent ${pagesObj} 0 R`
      );
    });

    const catalogObj=agregarObjeto(
      `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`
    );

    let pdf="%PDF-1.4\n";
    const offsets=[0];

    objetos.forEach((objeto,index)=>{
      offsets.push(pdf.length);
      pdf+=`${index+1} 0 obj\n${objeto}\nendobj\n`;
    });

    const xrefOffset=pdf.length;
    pdf+=`xref\n0 ${objetos.length+1}\n`;
    pdf+="0000000000 65535 f \n";

    offsets.slice(1).forEach((offset)=>{
      pdf+=`${String(offset).padStart(10,"0")} 00000 n \n`;
    });

    pdf+=
      `trailer\n<< /Size ${objetos.length+1} /Root ${catalogObj} 0 R >>\n`+
      `startxref\n${xrefOffset}\n%%EOF`;

    const blob=new Blob([pdf],{type:"application/pdf"});
    const url=window.URL.createObjectURL(blob);
    const enlace=document.createElement("a");
    enlace.href=url;
    enlace.download=`kardex_${filtros.fecha_inicio}_${filtros.fecha_fin}.pdf`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  };

  return <section style={ui.page}>
    <div style={ui.top}><div><h1 style={ui.title}>Kardex de productos</h1>
      <p style={ui.sub}>Entradas, egresos, ajustes y ventas · {institucionNombre}</p></div>
      <button style={ui.btn2} onClick={()=>setFiltros({fecha_inicio:"",fecha_fin:"",ubicacion:"",tipo:"",motivo:"",producto_id:"",texto:""})}>Borrar filtros</button>
    </div>
    <div style={ui.box}><div style={ui.filters}>
      <label style={ui.field}><span style={ui.label}>Fecha inicial</span><input type="date" style={ui.input} value={filtros.fecha_inicio} onChange={e=>setFiltros({...filtros,fecha_inicio:e.target.value})}/></label>
      <label style={ui.field}><span style={ui.label}>Fecha final</span><input type="date" style={ui.input} value={filtros.fecha_fin} onChange={e=>setFiltros({...filtros,fecha_fin:e.target.value})}/></label>
      <label style={ui.field}><span style={ui.label}>Ubicación</span><select style={ui.input} value={filtros.ubicacion} onChange={e=>setFiltros({...filtros,ubicacion:e.target.value})}><option value="">Todas</option><option value="BAR PRINCIPAL">BAR PRINCIPAL</option><option value="KIOSKO">KIOSKO</option></select></label>
      <label style={ui.field}><span style={ui.label}>Tipo</span><select style={ui.input} value={filtros.tipo} onChange={e=>setFiltros({...filtros,tipo:e.target.value})}><option value="">Todos</option><option value="INGRESO">Ingreso</option><option value="EGRESO">Egreso</option><option value="AJUSTE">Ajuste</option></select></label>
      <label style={ui.field}><span style={ui.label}>Tipo de movimiento</span><select style={ui.input} value={filtros.motivo} onChange={e=>setFiltros({...filtros,motivo:e.target.value})}><option value="">Todos</option><option>Venta en Aplicación</option><option>Ajuste de stock</option><option>Ingreso manual</option><option>Salida manual</option>{motivos.filter(x=>!["Venta en Aplicación","Ajuste de stock","Ingreso manual","Salida manual"].includes(x)).map(x=><option key={x}>{x}</option>)}</select></label>
      <label style={ui.field}><span style={ui.label}>Producto</span><select style={ui.input} value={filtros.producto_id} onChange={e=>setFiltros({...filtros,producto_id:e.target.value})}><option value="">Todos</option>{productos.filter(p=>p.activo!==false).sort((a,b)=>String(a.nombre).localeCompare(String(b.nombre))).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
      <label style={ui.field}><span style={ui.label}>Buscar</span><input style={ui.input} placeholder="Producto, usuario, movimiento..." value={filtros.texto} onChange={e=>setFiltros({...filtros,texto:e.target.value})}/></label>
      <button style={ui.btn} onClick={consultar}>{cargando?"Consultando...":"Consultar"}</button>
      <button style={ui.export} onClick={exportar}>Exportar Excel</button>
      <button
        style={{...ui.export,borderColor:"#ef4444",background:"#fff7f7",color:"#b91c1c"}}
        onClick={exportarPdf}
      >
        Exportar PDF
      </button>
    </div></div>
    <div style={ui.tableWrap}><table style={{...ui.table,minWidth:1100}}>
      <thead><tr><th style={ui.th}>Fecha</th><th style={ui.th}>Nombre de usuario</th><th style={ui.th}>Nombre</th><th style={ui.th}>Ubicación</th><th style={ui.th}>Cantidad</th><th style={ui.th}>Monto</th><th style={ui.th}>Tipo</th><th style={ui.th}>Movimiento</th><th style={ui.th}>No. de orden</th></tr></thead>
      <tbody>{!datos.length?<tr><td colSpan="9" style={ui.empty}>No hay datos disponibles.</td></tr>:datos.map((r,i)=><tr key={`${r.origen}-${r.id}-${i}`}>
        <td style={ui.td}>{new Date(r.fecha).toLocaleString("es-EC")}</td><td style={ui.td}>{r.usuario_nombre||"Sistema"}</td>
        <td style={ui.td}><strong>{r.producto_nombre}</strong></td><td style={ui.td}>{r.ubicacion||"-"}</td>
        <td style={ui.td}>{Number(r.cantidad||0)}</td><td style={ui.td}>{dinero(r.monto)}</td><td style={ui.td}>{r.tipo}</td>
        <td style={ui.td}>{r.movimiento||"-"}</td><td style={ui.td}>{r.numero_orden||"-"}</td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}
