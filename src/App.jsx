import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AlumnosModulo from "./components/AlumnosModulo";
import ConsultaAlumnoPublica from "./components/ConsultaAlumnoPublica";
import ConfiguracionModulo from "./components/ConfiguracionModulo";
import PadresModulo from "./components/PadresModulo";
import ProductosMasVendidosModulo from "./components/ProductosMasVendidosModulo";
import KardexModulo from "./components/KardexModulo";
import ProductosFormaPagoModulo from "./components/ProductosFormaPagoModulo";
import PortalUsuarioModulo from "./components/PortalUsuarioModulo";

const API_URL = "https://pos-nube-backend.onrender.com";


const ROLES_POS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  ENCARGADO_LOCAL: "ENCARGADO_LOCAL",
  CAJERO: "CAJERO",
  AUDITOR: "AUDITOR",
  PADRE: "PADRE",
  ESTUDIANTE: "ESTUDIANTE",
};

const MENU_POR_ROL = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  ENCARGADO_LOCAL: [
    "dashboard",
    "consultar_ventas",
    "nueva_orden",
    "alumnos",
    "profesores",
    "menu_cafeteria",
    "stock",
    "recargas",
    "egresos",
    "cierre_caja",
    "productos_vendidos",
    "productos_dia",
    "productos_mas_vendidos",
    "kardex_productos",
    "productos_forma_pago",
  ],
  CAJERO: [
    "consultar_ventas",
    "nueva_orden",
    "alumnos",
    "profesores",
    "cierre_caja",
  ],
  PADRE: [],
  ESTUDIANTE: [],
  AUDITOR: [
    "consultar_ventas",
    "stock",
    "recargas",
    "egresos",
    "cierre_caja",
    "productos_vendidos",
    "productos_dia",
    "productos_mas_vendidos",
    "kardex_productos",
    "productos_forma_pago",
  ],
};

const VISTA_INICIAL_POR_ROL = {
  SUPER_ADMIN: { vista: "dashboard" },
  ADMIN: { vista: "dashboard" },
  ENCARGADO_LOCAL: { vista: "dashboard" },
  CAJERO: { vista: "ventas", ventas: "registrar" },
  AUDITOR: { vista: "reporte_cierre" },
  PADRE: { vista: "portal" },
  ESTUDIANTE: { vista: "portal" },
};

const PERMISOS_FRONTEND = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  ENCARGADO_LOCAL: [
    "ventas.ver",
    "ventas.crear",
    "productos.ver",
    "inventario.ver",
    "inventario.gestionar",
    "personas.ver",
    "recargas.ver",
    "egresos.ver",
    "egresos.gestionar",
    "cierres.ver",
    "cierres.crear",
    "reportes.ver",
  ],
  CAJERO: [
    "ventas.ver",
    "ventas.crear",
    "productos.ver",
    "personas.ver",
    "cierres.ver",
    "cierres.crear",
  ],
  PADRE: [],
  ESTUDIANTE: [],
  AUDITOR: [
    "ventas.ver",
    "productos.ver",
    "inventario.ver",
    "recargas.ver",
    "egresos.ver",
    "cierres.ver",
    "reportes.ver",
  ],
};

const normalizarRol = (rol) => String(rol || "").trim().toUpperCase();

const puedeRol = (rol, permiso) => {
  const lista = PERMISOS_FRONTEND[normalizarRol(rol)] || [];
  return lista.includes("*") || lista.includes(permiso);
};


const INSTITUCIONES = [
  { id: 1, nombre: "Colegio Marista" },
  { id: 2, nombre: "Colegio Pensionado Universitario" },
  { id: 3, nombre: "FEUE" },
  { id: 4, nombre: "Club Los Cipreses" },
];

const normalizarInstitucionId = (valor) => {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
};

const formatearMoneda = (valor) => {
  return `$${Number(valor || 0).toFixed(2)}`;
};

const formatearFechaInput = (valor) => {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

const formatearFechaHora = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleString();
};

const obtenerFechaEcuadorISO = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const tomar = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value || "";

  return `${tomar("year")}-${tomar("month")}-${tomar("day")}`;
};

const normalizarFechaISO = (valor) => {
  if (!valor) return "";

  const texto = String(valor).trim();
  const coincidencia = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (coincidencia) {
    return `${coincidencia[1]}-${coincidencia[2]}-${coincidencia[3]}`;
  }

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);

  const tomar = (tipo) =>
    partes.find((parte) => parte.type === tipo)?.value || "";

  return `${tomar("year")}-${tomar("month")}-${tomar("day")}`;
};

const formatearSoloFecha = (valor) => {
  const fechaISO = normalizarFechaISO(valor);
  if (!fechaISO) return "-";

  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
};

const formatearSoloHora = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function App() {
  const [correo, setCorreo] = useState("");
const [password, setPassword] = useState("");
const [mensaje, setMensaje] = useState("");
const [cargando, setCargando] = useState(false);
const [loginInstitucionId, setLoginInstitucionId] = useState("");

const [verPasswordLogin, setVerPasswordLogin] = useState(false);
const [verPasswordActual, setVerPasswordActual] = useState(false);
const [verPasswordNueva, setVerPasswordNueva] = useState(false);
const [verPasswordConfirmar, setVerPasswordConfirmar] = useState(false);

  const [mostrarCambiarAcceso, setMostrarCambiarAcceso] = useState(false);
  const [mostrarCrearCuenta, setMostrarCrearCuenta] = useState(false);

const [crearCuentaForm, setCrearCuentaForm] = useState({
  institucion_id: "",
  nombre: "",
  correo: "",
  password: "",
  confirmar_password: "",
});
const [mensajeCrearCuenta, setMensajeCrearCuenta] = useState("");
const [cargandoCrearCuenta, setCargandoCrearCuenta] = useState(false);

  const [cambiarAccesoForm, setCambiarAccesoForm] = useState({
    institucion_id: "",
    correo_actual: "",
    password_actual: "",
    nuevo_correo: "",
    nueva_password: "",
    confirmar_password: "",
  });

  const [mensajeCambiarAcceso, setMensajeCambiarAcceso] = useState("");
  const [cargandoCambiarAcceso, setCargandoCambiarAcceso] = useState(false);

  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("usuario");
    return guardado ? JSON.parse(guardado) : null;
  });


  const rolActual = normalizarRol(usuario?.rol);
  const esRolPortal = ["PADRE", "ESTUDIANTE"].includes(rolActual);

  const puede = (permiso) => puedeRol(rolActual, permiso);

  const puedeAccederMenu = (menuId) => {
    const permitidos = MENU_POR_ROL[rolActual] || [];
    return permitidos.includes("*") || permitidos.includes(menuId);
  };

  const aplicarVistaInicialRol = (rol, setVistaFn, setVentasFn) => {
    const normalizado = normalizarRol(rol);
    const inicial = VISTA_INICIAL_POR_ROL[normalizado] || { vista: "dashboard" };
    setVistaFn(inicial.vista);
    if (inicial.ventas) setVentasFn(inicial.ventas);
  };

  const [vista, setVista] = useState(() => {
    const guardado = JSON.parse(localStorage.getItem("usuario") || "null");
    const rol = normalizarRol(guardado?.rol);
    return VISTA_INICIAL_POR_ROL[rol]?.vista || "dashboard";
  });
  const [resumen, setResumen] = useState(null);

  const [institucionSeleccionadaId, setInstitucionSeleccionadaId] = useState(() => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario") || "null");
    const institucionUsuario = normalizarInstitucionId(usuarioGuardado?.institucion_id);

    if (institucionUsuario) {
      return institucionUsuario;
    }

    const guardada = localStorage.getItem("institucionSeleccionadaId");
    return normalizarInstitucionId(guardada);
  });

  const [productos, setProductos] = useState([]);
  const [productoForm, setProductoForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
    stock_minimo: "",
    categoria: "",
  });
  const [editandoProductoId, setEditandoProductoId] = useState(null);

  const [alumnos, setAlumnos] = useState([]);
  const [alumnoForm, setAlumnoForm] = useState({
    cedula: "",
    nombres: "",
    apellidos: "",
    curso: "",
    paralelo: "",
    saldo: "",
  });
  const [editandoAlumnoId, setEditandoAlumnoId] = useState(null);
  const [filtroAlumnos, setFiltroAlumnos] = useState("todos");
  const [alumnoDetalle, setAlumnoDetalle] = useState(null);
const [vistaAlumnoDetalle, setVistaAlumnoDetalle] = useState("datos");
const [historialVentasAlumno, setHistorialVentasAlumno] = useState([]);
const [historialRecargasAlumno, setHistorialRecargasAlumno] = useState([]);
const [historialConsumoAlumno, setHistorialConsumoAlumno] = useState([]);
const [ordenDetalleAlumno, setOrdenDetalleAlumno] = useState(null);

  const [inventarioFiltro, setInventarioFiltro] = useState("todos");
  const [inventarioBusqueda, setInventarioBusqueda] = useState("");
  const [inventarioForm, setInventarioForm] = useState({
    producto_id: "",
    tipo: "ENTRADA",
    cantidad: "",
    motivo: "",
  });

  const [recargas, setRecargas] = useState([]);
  const [recargaForm, setRecargaForm] = useState({
    alumno_id: "",
    monto: "",
    metodo_pago: "EFECTIVO",
    numero_comprobante: "",
    banco: "",
    cuenta_bancaria_id: "",
    observacion: "",
  });

  const [vistaRecargasInterna, setVistaRecargasInterna] = useState("lista");

const [recargasFiltros, setRecargasFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  metodo_pago: "todas",
  alumno_id: "",
  texto: "",
});
const [cuentasBancarias, setCuentasBancarias] = useState([]);

  const [ventas, setVentas] = useState([]);
  const [ventaForm, setVentaForm] = useState({
    alumno_id: "",
    profesor_id: "",
    metodo_pago: "EFECTIVO",
    observacion: "",
  });
 const [ventaItems, setVentaItems] = useState([]);

  const [vistaVentasInterna, setVistaVentasInterna] = useState(() => {
    const guardado = JSON.parse(localStorage.getItem("usuario") || "null");
    const rol = normalizarRol(guardado?.rol);
    return VISTA_INICIAL_POR_ROL[rol]?.ventas || "consultar";
  });
const [menuComidasAbierto, setMenuComidasAbierto] = useState(true);
const [menuVentasAbierto, setMenuVentasAbierto] = useState(false);
const [menuReportesAbierto, setMenuReportesAbierto] = useState(false);
const [busquedaProductos, setBusquedaProductos] = useState("");
const [busquedaInventario, setBusquedaInventario] = useState("");
const [productoDetalle, setProductoDetalle] = useState(null);
const [productosSeleccionados, setProductosSeleccionados] = useState({});
const [stockDetalle, setStockDetalle] = useState(null);
const [stockTransferencia, setStockTransferencia] = useState(null);
const [bajaStock, setBajaStock] = useState(null);
const [existenciasInventario, setExistenciasInventario] = useState([]);
const [puntosInventario, setPuntosInventario] = useState(["PRINCIPAL"]);
const [puntoInventarioSeleccionado, setPuntoInventarioSeleccionado] = useState("PRINCIPAL");
const [puntosOperacion,setPuntosOperacion]=useState([]);
const [jornadaActiva,setJornadaActiva]=useState(null);
const [mostrarSelectorJornada,setMostrarSelectorJornada]=useState(false);
const [puntoJornadaSeleccionado,setPuntoJornadaSeleccionado]=useState("");
const [operadorJornadaCorreo,setOperadorJornadaCorreo]=useState("");
const [operadorJornadaPassword,setOperadorJornadaPassword]=useState("");
const [verPasswordOperadorJornada,setVerPasswordOperadorJornada]=useState(false);
const [mostrarEditarAccesoJornada,setMostrarEditarAccesoJornada]=useState(false);
const [editarPuntoStock,setEditarPuntoStock]=useState(null);
const [cargandoJornada,setCargandoJornada]=useState(false);
const [mostrarPuntosStock,setMostrarPuntosStock]=useState(false);
const [nuevoPuntoForm,setNuevoPuntoForm]=useState({nombre:"",codigo:"",descripcion:""});
const [mostrarNuevoProductoStock,setMostrarNuevoProductoStock]=useState(false);
const [nuevoProductoStockForm,setNuevoProductoStockForm]=useState({
  nombre:"",
  codigo:"",
  precio:"",
  categoria:"",
  stock_minimo:"",
  cantidad_inicial:"",
  concepto_inicial:"COMPRA",
  observacion_inicial:"",
  ubicacion_inicial:"",
});
const [movimientoStock,setMovimientoStock]=useState(null);
const [panelMovimientoStock,setPanelMovimientoStock]=useState(null);
const [transferenciaLocales,setTransferenciaLocales]=useState(null);
const [institucionesTransferencia,setInstitucionesTransferencia]=useState([]);
const [puntosDestinoLocal,setPuntosDestinoLocal]=useState([]);
const [filtroCategoriaStock,setFiltroCategoriaStock]=useState("");

const [stockSeccion,setStockSeccion]=useState("");
const [stockTipoIngreso,setStockTipoIngreso]=useState("");
const [stockTipoEgreso,setStockTipoEgreso]=useState("");
const [stockBusquedaOperacion,setStockBusquedaOperacion]=useState("");
const [stockFamiliaOperacion,setStockFamiliaOperacion]=useState("TODAS");
const [stockItemsOperacion,setStockItemsOperacion]=useState({});
const [stockCompraForm,setStockCompraForm]=useState({
  proveedor_id:"",
  proveedor_nuevo:"",
  numero_factura:"",
  observacion:"",
});
const [stockOperacionForm,setStockOperacionForm]=useState({
  observacion:"",
  ubicacion_destino:"",
  institucion_destino_id:"",
  punto_destino_id:"",
  destinatario_cortesia:"",
});
const [proveedoresStock,setProveedoresStock]=useState([]);
const [familiasCatalogoStock,setFamiliasCatalogoStock]=useState([]);
const [importandoProveedoresStock,setImportandoProveedoresStock]=useState(false);
const [importandoFamiliasStock,setImportandoFamiliasStock]=useState(false);
const [stockConfirmacion,setStockConfirmacion]=useState(null);
const [stockResultado,setStockResultado]=useState(null);
const [guardandoStockOperacion,setGuardandoStockOperacion]=useState(false);



const familiasOperacionStock = useMemo(() => {
  const valoresProductos = productos
    .filter((p) => p?.activo !== false)
    .map((p) => String(p?.categoria || "").trim())
    .filter(Boolean);

  const valoresCatalogo = (familiasCatalogoStock || [])
    .filter((f) => f?.activo !== false)
    .map((f) => String(f?.nombre || "").trim())
    .filter(Boolean);

  return [...new Set([...valoresProductos, ...valoresCatalogo])]
    .sort((a,b)=>a.localeCompare(b));
}, [productos, familiasCatalogoStock]);

const productosOperacionStock = useMemo(() => {
  const texto = String(stockBusquedaOperacion || "").trim().toLowerCase();
  const familia = String(stockFamiliaOperacion || "TODAS").trim();

  return productos
    .filter((p) => p?.activo !== false)
    .filter((p) => {
      if (familia === "TODAS") return true;
      return String(p?.categoria || "").trim() === familia;
    })
    .filter((p) => {
      if (!texto) return true;
      return [
        p?.nombre,
        p?.codigo,
        p?.categoria,
        p?.descripcion,
      ]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(texto));
    })
    .sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||"")));
}, [
  productos,
  stockBusquedaOperacion,
  stockFamiliaOperacion,
]);

const [stockEditado, setStockEditado] = useState({});
const inputImportarStockRef = useRef(null);
const inputImportarAlumnosRef = useRef(null);
const inputImportarProfesoresRef = useRef(null);

const [mostrarFormularioProducto, setMostrarFormularioProducto] = useState(false);
const [filtroCategoriaProductos, setFiltroCategoriaProductos] = useState("");
const [productoEditando, setProductoEditando] = useState(null);

const [modoNuevaOrden, setModoNuevaOrden] = useState("consumidor_final");
const [tipoUsuarioNuevaOrden, setTipoUsuarioNuevaOrden] = useState("TODOS");
const [busquedaUsuarioNuevaOrden, setBusquedaUsuarioNuevaOrden] = useState("");
const [codigoBarraNuevaOrden, setCodigoBarraNuevaOrden] = useState("");
const [busquedaProductoNuevaOrden, setBusquedaProductoNuevaOrden] = useState("");
const [categoriaNuevaOrden, setCategoriaNuevaOrden] = useState("TODOS");
const [localNuevaOrden, setLocalNuevaOrden] = useState("PRINCIPAL");
const [fechaNuevaOrden, setFechaNuevaOrden] = useState(
  new Date().toISOString().slice(0, 10)
);

//////////////////////////////
// PROFESORES
//////////////////////////////

const [vistaProfesoresInterna, setVistaProfesoresInterna] = useState("profesores");

const [profesores, setProfesores] = useState([]);

const [filtroProfesores, setFiltroProfesores] = useState("todos");
const [busquedaProfesores, setBusquedaProfesores] = useState("");
const [mostrarFiltroProfesores, setMostrarFiltroProfesores] = useState(false);

const [profesorForm, setProfesorForm] = useState({
  cedula: "",
  nombres: "",
  apellidos: "",
  email: "",
  codigo: "",
  telefono: "",
  saldo: "",
  es_profesor: true,
});

const [editandoProfesorId, setEditandoProfesorId] = useState(null);
const [profesorDetalle, setProfesorDetalle] = useState(null);
const [vistaProfesorDetalle, setVistaProfesorDetalle] = useState("ordenes");
const [mostrarFormularioProfesor, setMostrarFormularioProfesor] = useState(false);

const [creditosProfesores, setCreditosProfesores] = useState([]);
const [cargandoCreditosProfesores, setCargandoCreditosProfesores] = useState(false);
const [creditoProfesorForm, setCreditoProfesorForm] = useState({
  tipo: "AJUSTE_POSITIVO",
  monto: "",
  comercio: "POS NUBE",
  observacion: "",
});
const [creditoProfesorAdminPassword, setCreditoProfesorAdminPassword] = useState("");
const [creditoProfesorLimite, setCreditoProfesorLimite] = useState("");
const [verCreditoProfesorAdminPassword, setVerCreditoProfesorAdminPassword] = useState(false);
const [guardandoAutorizacionCreditoProfesor, setGuardandoAutorizacionCreditoProfesor] = useState(false);

useEffect(() => {
  if (profesorDetalle?.id) {
    setCreditoProfesorLimite(
      String(Number(profesorDetalle.limite_credito || 0))
    );
  }
}, [profesorDetalle?.id, profesorDetalle?.limite_credito]);
const [recargaProfesorForm, setRecargaProfesorForm] = useState({
  monto: "",
  metodo_pago: "EFECTIVO",
  numero_comprobante: "",
  banco: "",
  cuenta_bancaria_id: "",
  observacion: "",
});
const [guardandoRecargaProfesor, setGuardandoRecargaProfesor] = useState(false);
const [mostrarModalRecargaProfesor, setMostrarModalRecargaProfesor] = useState(false);
const [creditosProfesoresFiltros, setCreditosProfesoresFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  texto: "",
});

   const [ventasFiltros, setVentasFiltros] = useState({
  tipo_fecha: "created_at",
  fecha_inicio: "",
  fecha_fin: "",
  tipo_orden: "",
  orden_id: "",
  ubicacion: "",
  operador: "",
  estado: "ENTREGADA",
  metodo_pago: "todos",
  alumno_id: "",
  texto: "",
});

const [productosFiltros, setProductosFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  operador: "",
  ubicacion: "",
  comprado: "",
  texto: "",
});

const [productosVendidos, setProductosVendidos] = useState([]);

  const [cierreCajaFiltros, setCierreCajaFiltros] = useState({
    fecha_inicio: "",
    fecha_fin: "",
  });

  const [productosPorDiaFiltros, setProductosPorDiaFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  ubicacion: "",
  comprado: "",
  texto: "",
});

const [productosVendidosPorDia, setProductosVendidosPorDia] = useState([]);

const [egresosFiltros, setEgresosFiltros] = useState({
  fecha_inicio: "",
  fecha_fin: "",
  texto: "",
});

const [egresosDiarios, setEgresosDiarios] = useState([]);
const [mostrarCrearEgreso, setMostrarCrearEgreso] = useState(false);
const [editandoEgresoId, setEditandoEgresoId] = useState(null);
const [cierresCaja, setCierresCaja] = useState([]);
const [mostrarCrearCierre, setMostrarCrearCierre] = useState(false);
const [cierreDetalle, setCierreDetalle] = useState(null);
const [guardandoCierre, setGuardandoCierre] = useState(false);
const [cargandoCierres, setCargandoCierres] = useState(false);
const [resumenCierreServidor, setResumenCierreServidor] = useState(null);
const [cierreConsolidado, setCierreConsolidado] = useState(null);
const [cargandoConsolidado, setCargandoConsolidado] = useState(false);
const [cierreForm, setCierreForm] = useState({
  fecha: obtenerFechaEcuadorISO(),
  negocio: "POS NUBE",
  tarjeta_manual: "0",
  transferencia_manual: "0",
  observacion: "",
  denominaciones: {
    billete_1: "", billete_2: "", billete_5: "", billete_10: "",
    billete_20: "", billete_50: "", billete_100: "",
    moneda_001: "", moneda_005: "", moneda_010: "",
    moneda_025: "", moneda_050: "", moneda_1: "",
  },
});

const [egresoForm, setEgresoForm] = useState({
  negocio: "",
  usuario: "",
  fecha: "",
  nombre_egreso: "",
  total: "",
  descripcion: "",
  estado: "ACTIVO",
  numero_factura: "",
  tipo_egreso: "Efectivo",
});

  const [cuentaForm, setCuentaForm] = useState({
    correo: "",
    password_actual: "",
    nueva_password: "",
    confirmar_password: "",
  });
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);

  const obtenerInstitucionActivaId = () => {
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario") || "null");

    const desdeUsuario = normalizarInstitucionId(usuario?.institucion_id);
    if (desdeUsuario) return desdeUsuario;

    const desdeUsuarioGuardado = normalizarInstitucionId(usuarioGuardado?.institucion_id);
    if (desdeUsuarioGuardado) return desdeUsuarioGuardado;

    const guardada = localStorage.getItem("institucionSeleccionadaId");
    return normalizarInstitucionId(guardada);
  };

  const institucionActivaId = obtenerInstitucionActivaId();

  const institucionActiva = useMemo(() => {
    return (
      INSTITUCIONES.find((i) => Number(i.id) === Number(institucionActivaId)) || {
        id: institucionActivaId,
        nombre: "Institución asignada",
      }
    );
  }, [institucionActivaId]);

  const obtenerCedulaAlumno = (alumno) => {
    return (
      alumno?.cedula ||
      alumno?.codigo ||
      alumno?.numero_cedula ||
      alumno?.identificacion ||
      alumno?.documento ||
      ""
    );
  };

  const obtenerNombreAlumno = (alumno) => {
    if (!alumno) return "-";
    const nombre = `${alumno.nombres || ""} ${alumno.apellidos || ""}`.trim();
    return nombre || obtenerCedulaAlumno(alumno) || `Alumno #${alumno.id}`;
  };

  const alumnosActivos = useMemo(() => {
    return alumnos.filter((a) => a.activo !== false);
  }, [alumnos]);

  const alumnosFiltrados = useMemo(() => {
    if (filtroAlumnos === "todos") return alumnos;
    if (filtroAlumnos === "inactivos") {
      return alumnos.filter((a) => a.activo === false);
    }
    return alumnos.filter((a) => a.activo !== false);
  }, [alumnos, filtroAlumnos]);

  const productosActivos = useMemo(() => {
    return productos.filter((p) => p.activo !== false);
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    return productos;
  }, [productos]);

  const profesoresFiltrados = useMemo(() => {
    const texto = busquedaProfesores.trim().toLowerCase();

    return profesores.filter((profesor) => {
      const coincideEstado =
        filtroProfesores === "todos"
          ? true
          : filtroProfesores === "inactivos"
          ? profesor.activo === false
          : profesor.activo !== false;

      if (!coincideEstado) return false;
      if (!texto) return true;

      const nombres = String(profesor.nombres || "").toLowerCase();
      const apellidos = String(profesor.apellidos || "").toLowerCase();
      const cedula = String(profesor.cedula || "").toLowerCase();
      const nombreCompleto = `${nombres} ${apellidos}`.trim();

      return (
        nombres.includes(texto) ||
        apellidos.includes(texto) ||
        cedula.includes(texto) ||
        nombreCompleto.includes(texto)
      );
    });
  }, [profesores, filtroProfesores, busquedaProfesores]);

  const productosInventario = useMemo(() => {
    const texto = inventarioBusqueda.trim().toLowerCase();

    let lista = productos.filter((p) => p.activo !== false);

    if (texto) {
      lista = lista.filter((p) => {
        const nombre = (p.nombre || "").toLowerCase();
        const categoria = (p.categoria || "").toLowerCase();
        const identificador = String(p.id || "");

        return (
          nombre.includes(texto) ||
          categoria.includes(texto) ||
          identificador.includes(texto)
        );
      });
    }

    if (inventarioFiltro === "bajo") {
      lista = lista.filter((p) => {
        const stock = Number(p.stock || 0);
        const stockMinimo = Number(p.stock_minimo || 0);
        return stock > 0 && stock <= stockMinimo;
      });
    }

    if (inventarioFiltro === "agotado") {
      lista = lista.filter((p) => Number(p.stock || 0) <= 0);
    }

    if (inventarioFiltro === "normal") {
      lista = lista.filter((p) => {
        const stock = Number(p.stock || 0);
        const stockMinimo = Number(p.stock_minimo || 0);
        return stock > stockMinimo;
      });
    }

    return lista;
  }, [productos, inventarioBusqueda, inventarioFiltro]);

  const inventarioResumen = useMemo(() => {
    const lista = productosActivos;
    const totalProductos = lista.length;

    const agotados = lista.filter((p) => Number(p.stock || 0) <= 0).length;

    const bajos = lista.filter((p) => {
      const stock = Number(p.stock || 0);
      const stockMinimo = Number(p.stock_minimo || 0);
      return stock > 0 && stock <= stockMinimo;
    }).length;

    const valorInventario = lista.reduce((acc, p) => {
      const stock = Number(p.stock || 0);
      const precio = Number(p.precio || 0);
      return acc + stock * precio;
    }, 0);

    return {
      totalProductos,
      agotados,
      bajos,
      valorInventario,
    };
  }, [productosActivos]);

  const reporteResumen = useMemo(() => {
    const totalRecargas = recargas.reduce((acc, r) => acc + Number(r.monto || 0), 0);
    const totalVentas = ventas.reduce((acc, v) => acc + Number(v.total || 0), 0);
    const ventasEfectivo = ventas
      .filter((v) => v.metodo_pago === "EFECTIVO")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
    const ventasTransferencia = ventas
      .filter((v) => v.metodo_pago === "TRANSFERENCIA")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
    const ventasRecarga = ventas
      .filter((v) => v.metodo_pago === "SALDO")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);
    const saldoTotalAlumnos = alumnosActivos.reduce(
      (acc, a) => acc + Number(a.saldo || 0),
      0
    );

    return {
      totalRecargas,
      totalVentas,
      ventasEfectivo,
      ventasTransferencia,
      ventasRecarga,
      saldoTotalAlumnos,
    };
  }, [recargas, ventas, alumnosActivos]);

  const recargasEnriquecidas = useMemo(() => {
  return recargas.map((recarga) => {
    const alumno = alumnos.find((a) => String(a.id) === String(recarga.alumno_id));
    const nombreAlumno = alumno
      ? obtenerNombreAlumno(alumno)
      : `${recarga.nombres || ""} ${recarga.apellidos || ""}`.trim() || "Alumno";

    return {
      ...recarga,
      alumno_nombre: nombreAlumno,
      fecha_base: recarga.created_at || recarga.fecha || null,
      operador_nombre:
        recarga.usuario_nombre ||
        recarga.usuario_correo ||
        usuario?.nombre ||
        usuario?.correo ||
        "Sistema",
      estado_visual: recarga.estado || "ACEPTADA",
      documento_visual:
        recarga.numero_comprobante ||
        (recarga.metodo_pago === "TRANSFERENCIA" ? "Sin comprobante" : "-"),
      dinero_entregado: Number(recarga.monto || 0),
      dinero_recargado: Number(recarga.monto || 0),
      tipo_visual:
        recarga.metodo_pago === "TRANSFERENCIA"
          ? "Transferencia"
          : recarga.metodo_pago === "EFECTIVO"
          ? "Efectivo"
          : recarga.metodo_pago || "-",
    };
  });
}, [recargas, alumnos, usuario]);

const recargasFiltradas = useMemo(() => {
  let lista = [...recargasEnriquecidas];

  if (recargasFiltros.metodo_pago !== "todas") {
    lista = lista.filter(
      (recarga) => recarga.metodo_pago === recargasFiltros.metodo_pago
    );
  }

  if (recargasFiltros.alumno_id) {
    lista = lista.filter(
      (recarga) =>
        String(recarga.alumno_id || "") === String(recargasFiltros.alumno_id)
    );
  }

  if (recargasFiltros.fecha_inicio) {
    lista = lista.filter((recarga) => {
      const fecha = formatearFechaInput(recarga.fecha_base);
      return fecha && fecha >= recargasFiltros.fecha_inicio;
    });
  }

  if (recargasFiltros.fecha_fin) {
    lista = lista.filter((recarga) => {
      const fecha = formatearFechaInput(recarga.fecha_base);
      return fecha && fecha <= recargasFiltros.fecha_fin;
    });
  }

  const texto = recargasFiltros.texto.trim().toLowerCase();
  if (texto) {
    lista = lista.filter((recarga) => {
      const nombre = (recarga.alumno_nombre || "").toLowerCase();
      const tipo = (recarga.tipo_visual || "").toLowerCase();
      const observacion = (recarga.observacion || "").toLowerCase();
      const documento = String(recarga.documento_visual || "").toLowerCase();

      return (
        nombre.includes(texto) ||
        tipo.includes(texto) ||
        observacion.includes(texto) ||
        documento.includes(texto)
      );
    });
  }

  return lista.sort((a, b) => {
    const fechaA = new Date(a.fecha_base || 0).getTime();
    const fechaB = new Date(b.fecha_base || 0).getTime();
    return fechaB - fechaA;
  });
}, [recargasEnriquecidas, recargasFiltros]);

const totalRecargasVista = useMemo(() => {
  return recargasFiltradas.reduce(
    (acc, recarga) => acc + Number(recarga.dinero_recargado || 0),
    0
  );
}, [recargasFiltradas]);

  const ventaItemsCalculados = useMemo(() => {
    return ventaItems.map((item) => {
      const producto = productosActivos.find(
        (p) => String(p.id) === String(item.producto_id)
      );

      const cantidad = Number(item.cantidad || 0);
      const precio = Number(producto?.precio || 0);
      const total = cantidad > 0 ? cantidad * precio : 0;

      return {
        ...item,
        producto,
        cantidad,
        precio,
        total,
      };
    });
  }, [ventaItems, productosActivos]);

  const totalVentaCalculado = useMemo(() => {
    return ventaItemsCalculados.reduce((acc, item) => acc + Number(item.total || 0), 0);
  }, [ventaItemsCalculados]);

  const alumnoVentaSeleccionado = useMemo(() => {
    return alumnosActivos.find((a) => String(a.id) === String(ventaForm.alumno_id)) || null;
  }, [alumnosActivos, ventaForm.alumno_id]);

  const profesorVentaSeleccionado = useMemo(() => {
    return profesores.find(
      (p) =>
        p.activo !== false &&
        String(p.id) === String(ventaForm.profesor_id)
    ) || null;
  }, [profesores, ventaForm.profesor_id]);

  const ventasEnriquecidas = useMemo(() => {
    return ventas.map((venta) => {
      const alumno = alumnos.find((a) => String(a.id) === String(venta.alumno_id));
      const nombreAlumno = alumno
        ? obtenerNombreAlumno(alumno)
        : venta.alumno_id
        ? `Alumno #${venta.alumno_id}`
        : "Consumidor final";

      const metodoVisual =
        venta.metodo_pago === "SALDO"
          ? "RECARGA"
          : venta.metodo_pago === "CREDITO"
          ? "CRÉDITO ALUMNO"
          : venta.metodo_pago === "CREDITO_PROFESOR"
          ? "CRÉDITO PROFESOR"
          : venta.metodo_pago || "EFECTIVO";

      return {
        ...venta,
        alumno_nombre: nombreAlumno,
        metodo_visual: metodoVisual,
        fecha_base: venta.created_at || venta.fecha || null,
        items: Array.isArray(venta.items)
          ? venta.items
          : Array.isArray(venta.detalles)
          ? venta.detalles
          : [],
        operador_visual:
          venta.operador ||
          venta.operador_nombre ||
          venta.operador_correo ||
          "Sistema",
        ubicacion_visual:
          venta.ubicacion_visual ||
          venta.ubicacion ||
          "PRINCIPAL",
      };
    });
  }, [ventas, alumnos]);

  const ventasFiltradas = useMemo(() => {
    let lista = [...ventasEnriquecidas];

    if (ventasFiltros.metodo_pago !== "todos") {
      lista = lista.filter((venta) => {
        if (ventasFiltros.metodo_pago === "RECARGA") {
          return venta.metodo_visual === "RECARGA";
        }
        return venta.metodo_pago === ventasFiltros.metodo_pago;
      });
    }

    if (ventasFiltros.alumno_id) {
      lista = lista.filter(
        (venta) => String(venta.alumno_id || "") === String(ventasFiltros.alumno_id)
      );
    }

    if (ventasFiltros.fecha_inicio) {
      lista = lista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha >= ventasFiltros.fecha_inicio;
      });
    }

    if (ventasFiltros.fecha_fin) {
      lista = lista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha <= ventasFiltros.fecha_fin;
      });
    }

    if (ventasFiltros.orden_id.trim()) {
      lista = lista.filter((venta) =>
        String(venta.id || "").includes(ventasFiltros.orden_id.trim())
      );
    }

    const texto = ventasFiltros.texto.trim().toLowerCase();
    if (texto) {
      lista = lista.filter((venta) => {
        const metodo = (venta.metodo_visual || "").toLowerCase();
        const alumno = (venta.alumno_nombre || "").toLowerCase();
        const observacion = (venta.observacion || "").toLowerCase();
        const id = String(venta.id || "");
        const total = String(venta.total || "");

        return (
          metodo.includes(texto) ||
          alumno.includes(texto) ||
          observacion.includes(texto) ||
          id.includes(texto) ||
          total.includes(texto)
        );
      });
    }

    return lista.sort((a, b) => {
      const fechaA = new Date(a.fecha_base || 0).getTime();
      const fechaB = new Date(b.fecha_base || 0).getTime();
      return fechaB - fechaA;
    });
  }, [ventasEnriquecidas, ventasFiltros]);

    const resumenVentasVista = useMemo(() => {
    const totalVentas = ventasFiltradas.length;
    const montoTotal = ventasFiltradas.reduce(
      (acc, venta) => acc + Number(venta.total || 0),
      0
    );

    const montoEfectivo = ventasFiltradas
      .filter((venta) => venta.metodo_pago === "EFECTIVO")
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    const montoTransferencia = ventasFiltradas
      .filter((venta) => venta.metodo_pago === "TRANSFERENCIA")
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    const montoRecarga = ventasFiltradas
      .filter((venta) => venta.metodo_visual === "RECARGA")
      .reduce((acc, venta) => acc + Number(venta.total || 0), 0);

    return {
      totalVentas,
      montoTotal,
      montoEfectivo,
      montoTransferencia,
      montoRecarga,
    };
  }, [ventasFiltradas]);

  const limpiarFiltrosCierreCaja = () => {
    setCierreCajaFiltros({
      fecha_inicio: "",
      fecha_fin: "",
    });
  };

  const cierreCajaResumen = useMemo(() => {
    let ventasLista = [...ventasEnriquecidas];
    let recargasLista = [...recargasEnriquecidas];

    if (cierreCajaFiltros.fecha_inicio) {
      ventasLista = ventasLista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha >= cierreCajaFiltros.fecha_inicio;
      });

      recargasLista = recargasLista.filter((recarga) => {
        const fecha = formatearFechaInput(recarga.fecha_base);
        return fecha && fecha >= cierreCajaFiltros.fecha_inicio;
      });
    }

    if (cierreCajaFiltros.fecha_fin) {
      ventasLista = ventasLista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha <= cierreCajaFiltros.fecha_fin;
      });

      recargasLista = recargasLista.filter((recarga) => {
        const fecha = formatearFechaInput(recarga.fecha_base);
        return fecha && fecha <= cierreCajaFiltros.fecha_fin;
      });
    }

    const ventasEfectivo = ventasLista
      .filter((v) => v.metodo_pago === "EFECTIVO")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);

    const ventasTransferencia = ventasLista
      .filter((v) => v.metodo_pago === "TRANSFERENCIA")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);

    const ventasSaldo = ventasLista
      .filter((v) => v.metodo_visual === "RECARGA")
      .reduce((acc, v) => acc + Number(v.total || 0), 0);

    const recargasEfectivo = recargasLista
      .filter((r) => r.metodo_pago === "EFECTIVO")
      .reduce((acc, r) => acc + Number(r.monto || 0), 0);

    const recargasTransferencia = recargasLista
      .filter((r) => r.metodo_pago === "TRANSFERENCIA")
      .reduce((acc, r) => acc + Number(r.monto || 0), 0);

    const totalVentas =
      ventasEfectivo + ventasTransferencia + ventasSaldo;

    const totalRecargas =
      recargasEfectivo + recargasTransferencia;

    const totalGeneral = totalVentas + totalRecargas;

    return {
      ventasEfectivo,
      ventasTransferencia,
      ventasSaldo,
      recargasEfectivo,
      recargasTransferencia,
      totalVentas,
      totalRecargas,
      totalGeneral,
    };
  }, [ventasEnriquecidas, recargasEnriquecidas, cierreCajaFiltros]);

  const creditosProfesoresFiltrados = useMemo(() => {
    const texto = String(
      creditosProfesoresFiltros.texto || ""
    )
      .trim()
      .toLowerCase();

    return creditosProfesores.filter((movimiento) => {
      if (!texto) return true;

      const profesor = `${movimiento.nombres || ""} ${
        movimiento.apellidos || ""
      }`.toLowerCase();

      const comercio = String(
        movimiento.comercio || ""
      ).toLowerCase();

      const usuarioMovimiento = String(
        movimiento.usuario_nombre ||
          movimiento.usuario_correo ||
          ""
      ).toLowerCase();

      const tipo = String(
        movimiento.tipo || ""
      ).toLowerCase();

      return (
        profesor.includes(texto) ||
        comercio.includes(texto) ||
        usuarioMovimiento.includes(texto) ||
        tipo.includes(texto)
      );
    });
  }, [creditosProfesores, creditosProfesoresFiltros.texto]);

  const obtenerEstadoStock = (producto) => {
    const stock = Number(producto.stock || 0);
    const stockMinimo = Number(producto.stock_minimo || 0);

    if (stock <= 0) {
      return { texto: "Agotado", estilo: styles.badgeAgotado };
    }

    if (stock <= stockMinimo) {
      return { texto: "Stock bajo", estilo: styles.badgeBajo };
    }

    return { texto: "Normal", estilo: styles.badgeNormal };
  };

  const limpiarFormularioProducto = () => {
    setProductoForm({
  nombre: "",
  codigo: "",
  precio: "",
  categoria: "",
  stock: "",
  imagen: "",
  activo: true,
});
    setEditandoProductoId(null);
  };

  const iniciarEdicionProducto = (producto) => {
    setEditandoProductoId(producto.id);
    setProductoForm({
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      precio: producto.precio ?? "",
      stock: producto.stock ?? "",
      stock_minimo: producto.stock_minimo ?? "",
      categoria: producto.categoria || "",
    });
    setVista("productos");
  };

  const limpiarFormularioAlumno = () => {
    setAlumnoForm({
      cedula: "",
      nombres: "",
      apellidos: "",
      curso: "",
      paralelo: "",
      saldo: "",
    });
    setEditandoAlumnoId(null);
  };

  const limpiarFormularioRecarga = () => {
    setRecargaForm({
      alumno_id: "",
      monto: "",
      metodo_pago: "EFECTIVO",
      numero_comprobante: "",
      banco: "",
      cuenta_bancaria_id: "",
      observacion: "",
    });
  };

  const limpiarFiltrosRecargas = () => {
  setRecargasFiltros({
    fecha_inicio: "",
    fecha_fin: "",
    metodo_pago: "todas",
    alumno_id: "",
    texto: "",
  });
};

const exportarRecargasExcel = () => {
  if (!recargasFiltradas.length) {
    alert("No hay recargas para exportar");
    return;
  }

  try {
    const encabezados = [
      "Fecha y Hora",
      "Alumno",
      "Curso",
      "Paralelo",
      "Monto",
      "Forma de pago",
      "No. comprobante",
      "Banco",
      "Operador",
      "Estado",
      "Observación",
    ];

    const filas = recargasFiltradas.map((r) => [
      formatearFechaHora(r.fecha_base),
      r.alumno_nombre || "",
      r.curso || "",
      r.paralelo || "",
      Number(r.monto || 0).toFixed(2),
      r.tipo_visual || r.metodo_pago || "",
      r.numero_comprobante || "",
      r.banco || "",
      r.operador_nombre || "",
      r.estado_visual || "",
      r.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `recargas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exportando recargas:", error);
    alert("No se pudo exportar el historial de recargas.");
  }
};

// ===== STOCK =====
const exportarStockExcel = () => {
  try {
    const encabezados = ["Nombre", "Código", "Precio", "Categoría", "Stock actual"];
    const filas = productos.map((p) => [
      p.nombre || "",
      p.codigo || "",
      Number(p.precio || 0).toFixed(4),
      p.categoria || "",
      Number(p.stock || 0),
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((valor) => `"${String(valor ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "existencias_stock.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error al exportar stock:", error);
    alert("No se pudo exportar el stock.");
  }
};

const abrirImportadorStock = () => {
  if (inputImportarStockRef.current) {
    inputImportarStockRef.current.click();
  }
};

const importarStockArchivo = (event) => {
  const archivo = event.target.files?.[0];
  if (!archivo) return;

  const extension = archivo.name.split(".").pop()?.toLowerCase();

  const normalizarTexto = (valor) =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  const procesarFilasImportadas = async (filasCrudas) => {
  if (!Array.isArray(filasCrudas) || filasCrudas.length < 2) {
    alert("El archivo no tiene datos para importar.");
    return;
  }

  const encabezados = (filasCrudas[0] || []).map((h) => normalizarTexto(h));

  const idxNombre = encabezados.findIndex((h) => h === "nombre");
  const idxCodigo = encabezados.findIndex(
    (h) => h === "codigo" || h === "código"
  );
  const idxPrecio = encabezados.findIndex((h) => h === "precio");
  const idxCategoria = encabezados.findIndex(
    (h) => h === "categoria" || h === "categoría"
  );
  const idxStock = encabezados.findIndex(
    (h) =>
      h === "stock" ||
      h === "stock actual" ||
      h === "stock real" ||
      h === "nuevo stock"
  );

  if (idxNombre === -1 || idxPrecio === -1 || idxCategoria === -1 || idxStock === -1) {
    alert(
      "El archivo debe tener estas columnas: nombre, precio, categoria y stock. Código es opcional."
    );
    return;
  }

  const filasValidas = filasCrudas
    .slice(1)
    .map((cols) => {
      const nombre = String(cols[idxNombre] || "").trim();
      const codigo = idxCodigo >= 0 ? String(cols[idxCodigo] || "").trim() : "";
      const precio = Number(String(cols[idxPrecio] || "").replace(",", "."));
      const categoria = String(cols[idxCategoria] || "").trim();
      const stock = Number(String(cols[idxStock] || "").replace(",", "."));

      if (!nombre) return null;
      if (Number.isNaN(precio)) return null;
      if (Number.isNaN(stock)) return null;

      return {
        nombre,
        codigo,
        precio,
        categoria,
        stock,
      };
    })
    .filter(Boolean);

  if (!filasValidas.length) {
    alert("No hay filas válidas para importar.");
    return;
  }

  const token = localStorage.getItem("token");
  const institucionId = obtenerInstitucionActivaId();

  if (!token || !institucionId) {
    alert("Tu sesión no es válida. Vuelve a iniciar sesión.");
    return;
  }

  const normalizar = (valor) =>
    String(valor || "")
      .trim()
      .toLowerCase();

  const productosActuales = Array.isArray(productos) ? [...productos] : [];

  let actualizados = 0;
  let nuevos = 0;
  let errores = 0;

  for (const fila of filasValidas) {
    const existente = productosActuales.find((producto) => {
      const mismoCodigo =
        fila.codigo &&
        normalizar(producto.codigo) === normalizar(fila.codigo);

      const mismoNombre =
        normalizar(producto.nombre) === normalizar(fila.nombre);

      return mismoCodigo || mismoNombre;
    });

    try {
      if (existente) {
        const res = await fetch(`${API_URL}/api/productos/${existente.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: institucionId,
            nombre: fila.nombre,
            codigo: fila.codigo || existente.codigo || "",
            descripcion: existente.descripcion || "",
            precio: fila.precio,
            stock: fila.stock,
            stock_minimo: existente.stock_minimo || 0,
            categoria: fila.categoria,
            activo: existente.activo !== false,
          }),
        });

        if (!res.ok) {
          throw new Error(`Error actualizando ${fila.nombre}`);
        }

        const productoActualizado = await res.json();

        const idx = productosActuales.findIndex((p) => Number(p.id) === Number(existente.id));
        if (idx >= 0) {
          productosActuales[idx] = productoActualizado;
        }

        actualizados += 1;
      } else {
        const res = await fetch(`${API_URL}/api/productos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: institucionId,
            nombre: fila.nombre,
            codigo: fila.codigo || "",
            descripcion: "",
            precio: fila.precio,
            stock: fila.stock,
            stock_minimo: 0,
            categoria: fila.categoria,
          }),
        });

        if (!res.ok) {
          throw new Error(`Error creando ${fila.nombre}`);
        }

        const productoNuevo = await res.json();
        productosActuales.push(productoNuevo);
        nuevos += 1;
      }
    } catch (error) {
      console.error("Error importando producto:", fila.nombre, error);
      errores += 1;
    }
  }

  setProductos(productosActuales);
  setStockEditado((prev) => {
    const copia = { ...prev };
    productosActuales.forEach((p) => {
      copia[p.id] = String(p.stock ?? 0);
    });
    return copia;
  });

  alert(
    `Importación completada.\n\nProductos actualizados: ${actualizados}\nProductos nuevos: ${nuevos}\nErrores: ${errores}`
  );
};

  const parsearCSVTexto = (texto) => {
    const lineas = texto
      .split(/\r?\n/)
      .map((linea) => linea.trim())
      .filter(Boolean);

    const separarLineaCSV = (linea) => {
      const resultado = [];
      let actual = "";
      let dentroDeComillas = false;

      for (let i = 0; i < linea.length; i++) {
        const char = linea[i];
        const siguiente = linea[i + 1];

        if (char === '"') {
          if (dentroDeComillas && siguiente === '"') {
            actual += '"';
            i += 1;
          } else {
            dentroDeComillas = !dentroDeComillas;
          }
        } else if (char === "," && !dentroDeComillas) {
          resultado.push(actual.trim());
          actual = "";
        } else {
          actual += char;
        }
      }

      resultado.push(actual.trim());

      return resultado.map((valor) =>
        String(valor || "").replace(/^"|"$/g, "").trim()
      );
    };

    return lineas.map(separarLineaCSV);
  };

  try {
    if (extension === "csv") {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const texto = String(e.target?.result || "");
          const filasCSV = parsearCSVTexto(texto);
          procesarFilasImportadas(filasCSV);
        } catch (error) {
          console.error("Error importando CSV:", error);
          alert("No se pudo importar el archivo CSV.");
        }
        event.target.value = "";
      };

      reader.onerror = () => {
        alert("No se pudo leer el archivo CSV.");
        event.target.value = "";
      };

      reader.readAsText(archivo);
      return;
    }

    if (extension === "xlsx" || extension === "xls") {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const primeraHoja = workbook.SheetNames[0];

          if (!primeraHoja) {
            alert("El archivo Excel no contiene hojas.");
            event.target.value = "";
            return;
          }

          const worksheet = workbook.Sheets[primeraHoja];
          const filasExcel = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          });

          procesarFilasImportadas(filasExcel);
        } catch (error) {
          console.error("Error importando Excel:", error);
          alert("No se pudo importar el archivo Excel.");
        }
        event.target.value = "";
      };

      reader.onerror = () => {
        alert("No se pudo leer el archivo Excel.");
        event.target.value = "";
      };

      reader.readAsArrayBuffer(archivo);
      return;
    }

    alert("Formato no soportado. Usa CSV, XLSX o XLS.");
  } catch (error) {
    console.error("Error importando stock:", error);
    alert("No se pudo importar el archivo.");
  }

  event.target.value = "";
};
  

const registrarMovimientoKardex = async ({
  productoId,
  tipo,
  cantidad,
  motivo,
  stockAnterior,
  stockNuevo,
  ubicacion = "PRINCIPAL",
  referencia = null,
  monto = 0,
}) => {
  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();
    if (!token || !institucionId || !productoId) return;

    const res = await fetch(`${API_URL}/api/kardex/movimientos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id: Number(institucionId),
        producto_id: Number(productoId),
        tipo,
        cantidad: Math.abs(Number(cantidad || 0)),
        motivo,
        ubicacion,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        referencia,
        monto: Number(monto || 0),
      }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.warn("No se pudo registrar movimiento Kardex:", detalle);
    }
  } catch (error) {
    console.warn("Error registrando movimiento Kardex:", error);
  }
};

const cargarExistenciasInventario = async ({ reintento = true } = {}) => {
  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      setExistenciasInventario([]);
      setPuntosInventario(["PRINCIPAL"]);
      return false;
    }

    const controlador = new AbortController();
    const timeout = window.setTimeout(() => controlador.abort(), 15000);

    let res;

    try {
      res = await fetch(
        `${API_URL}/api/inventario/estado?institucion_id=${institucionId}&t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache",
          },
          cache: "no-store",
          signal: controlador.signal,
        }
      );
    } finally {
      window.clearTimeout(timeout);
    }

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      throw new Error(
        data.message ||
          data.error ||
          `No se pudo cargar inventario. Código ${res.status}`
      );
    }

    const listaProductos = Array.isArray(data.productos)
      ? data.productos
      : [];

    const listaExistencias = Array.isArray(data.existencias)
      ? data.existencias
      : [];

    const puntosRecibidos = Array.isArray(data.puntos)
      ? data.puntos
          .map((p) => String(p || "").trim().toUpperCase())
          .filter(Boolean)
      : [];

    if (!puntosRecibidos.includes("PRINCIPAL")) {
      puntosRecibidos.unshift("PRINCIPAL");
    }

    const puntosUnicos = [...new Set(puntosRecibidos)];

    // La pantalla Stock ya no depende de que otra petición de productos
    // termine antes. Todo viene de la misma consulta a PostgreSQL/Render.
    setProductos(listaProductos);
    setExistenciasInventario(listaExistencias);
    setPuntosInventario(puntosUnicos);

    setPuntoInventarioSeleccionado((actual) =>
      puntosUnicos.includes(String(actual || "").toUpperCase())
        ? String(actual).toUpperCase()
        : "PRINCIPAL"
    );

    setLocalNuevaOrden((actual) =>
      puntosUnicos.includes(String(actual || "").toUpperCase())
        ? String(actual).toUpperCase()
        : "PRINCIPAL"
    );

    return true;
  } catch (error) {
    console.error("Error cargando inventario completo:", error);

    // Una iMin puede recuperar conexión unos instantes después de abrir la
    // aplicación. Hacemos un único reintento automático.
    if (reintento) {
      await new Promise((resolve) => window.setTimeout(resolve, 1200));
      return cargarExistenciasInventario({ reintento: false });
    }

    return false;
  }
};

const existenciasDeProducto = (productoId) =>
  existenciasInventario.filter(
    (item) => Number(item.producto_id) === Number(productoId)
  );

const stockProductoEnPunto = (productoId, ubicacion) => {
  const punto = String(ubicacion || "PRINCIPAL").trim().toUpperCase();
  const fila = existenciasInventario.find(
    (item) =>
      Number(item.producto_id) === Number(productoId) &&
      String(item.ubicacion || "PRINCIPAL").trim().toUpperCase() === punto
  );

  if (fila) return Number(fila.stock || 0);

  if (punto === "PRINCIPAL") {
    const producto = productos.find(
      (p) => Number(p.id) === Number(productoId)
    );
    return Number(producto?.stock || 0);
  }

  return 0;
};

const resumenStockPorPuntos = (producto) => {
  const filas = existenciasDeProducto(producto.id);
  if (!filas.length) return `PRINCIPAL: ${Number(producto.stock || 0)}`;

  const detalle = filas
    .filter((fila) => Number(fila.stock || 0) !== 0 || fila.ubicacion === "PRINCIPAL")
    .map((fila) => `${fila.ubicacion}: ${Number(fila.stock || 0)}`)
    .join(" | ");

  return `${detalle || "PRINCIPAL: 0"} | TOTAL: ${Number(producto.stock || 0)}`;
};

const guardarStockProducto = async (producto) => {
  const nuevoValor = stockEditado[producto.id];

  if (nuevoValor === undefined || nuevoValor === null || nuevoValor === "") {
    alert("Ingresa un valor en Nuevo stock.");
    return;
  }

  const stockNumero = Number(nuevoValor);

  if (!Number.isInteger(stockNumero) || stockNumero < 0) {
    alert("El stock debe ser un número entero mayor o igual a 0.");
    return;
  }

  const observacion = window.prompt(
    `Observación del ajuste para ${producto.nombre} en ${puntoInventarioSeleccionado}:`,
    "Conteo físico / ajuste manual"
  );

  if (observacion === null) return;

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const res = await fetch(`${API_URL}/api/inventario/ajuste`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id:Number(institucionId),
        jornada_id:Number(jornadaActiva?.id),
        producto_id:Number(producto.id),
        ubicacion:puntoInventarioSeleccionado,
        stock_nuevo: stockNumero,
        observacion: String(observacion || "").trim() || "Ajuste manual",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "No se pudo ajustar el stock.");
    }

    setStockEditado((prev) => ({
      ...prev,
      [producto.id]: String(stockNumero),
    }));

    await Promise.all([cargarProductos(), cargarExistenciasInventario()]);
    alert(
      `${producto.nombre}: stock de ${puntoInventarioSeleccionado} actualizado a ${stockNumero}.`
    );
  } catch (error) {
    console.error("Error ajustando stock:", error);
    alert(error.message || "No se pudo actualizar el stock.");
  }
};

const desactivarProducto = async (productoId) => {
  setProductos((prev) =>
    prev.map((p) =>
      Number(p.id) === Number(productoId)
        ? { ...p, activo: false }
        : p
    )
  );

  setProductoDetalle((prev) =>
    prev && Number(prev.id) === Number(productoId)
      ? { ...prev, activo: false }
      : prev
  );

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/productos/${productoId}/desactivar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const texto = await res.text();
      console.warn("No se pudo desactivar en backend:", texto);
    }
  } catch (error) {
    console.error("Error desactivando producto:", error);
  }

  return true;
};

const reactivarProducto = async (productoId) => {
  setProductos((prev) =>
    prev.map((p) =>
      Number(p.id) === Number(productoId)
        ? { ...p, activo: true }
        : p
    )
  );

  setProductoDetalle((prev) =>
    prev && Number(prev.id) === Number(productoId)
      ? { ...prev, activo: true }
      : prev
  );

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/productos/${productoId}/reactivar`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const texto = await res.text();
      console.warn("No se pudo reactivar en backend:", texto);
    }
  } catch (error) {
    console.error("Error reactivando producto:", error);
  }

  return true;
};

const limpiarFiltrosVentas = () => {
  setVistaVentasInterna("consultar");
};


const crearPuntoOperacion=async(e)=>{
  e.preventDefault();const nombre=String(nuevoPuntoForm.nombre||"").trim();if(!nombre)return alert("Ingresa el nombre del punto.");
  try{const token=localStorage.getItem("token"),institucionId=obtenerInstitucionActivaId();
    const res=await fetch(`${API_URL}/api/puntos`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({institucion_id:Number(institucionId),...nuevoPuntoForm})});
    const data=await res.json();if(!res.ok)throw new Error(data.message||"Error creando punto");
    setNuevoPuntoForm({nombre:"",codigo:"",descripcion:""});await Promise.all([cargarPuntosOperacion(),cargarExistenciasInventario()]);alert(`Punto ${data.nombre} creado.`);
  }catch(e){alert(e.message||"No se pudo crear el punto")}
};

const comenzarEdicionPunto=(punto)=>{
  setEditarPuntoStock({
    id:punto.id,
    nombre:punto.nombre||"",
    codigo:punto.codigo||"",
    descripcion:punto.descripcion||"",
  });
};

const guardarEdicionPunto=async(e)=>{
  e.preventDefault();

  if(!editarPuntoStock?.id){
    return;
  }

  const nombre=String(editarPuntoStock.nombre||"").trim();

  if(!nombre){
    alert("El nombre del punto es obligatorio.");
    return;
  }

  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(
      `${API_URL}/api/puntos/${editarPuntoStock.id}`,
      {
        method:"PUT",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${token}`,
        },
        body:JSON.stringify({
          institucion_id:Number(institucionId),
          nombre,
          codigo:editarPuntoStock.codigo,
          descripcion:editarPuntoStock.descripcion,
        }),
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||"No se pudo editar el punto");
    }

    setEditarPuntoStock(null);

    await Promise.all([
      cargarPuntosOperacion(),
      cargarExistenciasInventario(),
    ]);

    alert("Punto actualizado correctamente.");
  }catch(error){
    alert(error.message||"No se pudo editar el punto.");
  }
};


const cargarInstitucionesTransferencia=async()=>{
  /*
   * POS NUBE ya tiene el catálogo de instituciones en INSTITUCIONES.
   * No consultamos /api/instituciones porque la base actual no usa
   * una tabla "instituciones".
   */
  const lista=Array.isArray(INSTITUCIONES)?INSTITUCIONES:[];
  setInstitucionesTransferencia(lista);
  return lista;
};

const cargarPuntosDestinoLocal=async(institucionDestinoId)=>{
  try{
    if(!institucionDestinoId){
      setPuntosDestinoLocal([]);
      return;
    }

    const token=localStorage.getItem("token");

    const res=await fetch(
      `${API_URL}/api/inventario/destinos-locales?institucion_destino_id=${Number(institucionDestinoId)}&t=${Date.now()}`,
      {
        headers:{
          Authorization:`Bearer ${token}`,
        },
        cache:"no-store",
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(
        data.message||"No se pudieron cargar los puntos destino"
      );
    }

    setPuntosDestinoLocal(
      Array.isArray(data)
        ? data.filter((p)=>p.activo!==false)
        : []
    );
  }catch(error){
    console.error(error);
    setPuntosDestinoLocal([]);
    alert(
      error.message||
      "No se pudieron cargar los puntos del local destino."
    );
  }
};

const abrirPanelMovimientoStock=async(producto)=>{
  setPanelMovimientoStock(producto);
  setMovimientoStock(null);
  setStockTransferencia(null);
  setBajaStock(null);
  setTransferenciaLocales(null);
};

const seleccionarConceptoStock=async(tipo)=>{
  if(!panelMovimientoStock)return;

  if(tipo==="COMPRA"||tipo==="PRODUCCION"){
    setMovimientoStock({
      ...panelMovimientoStock,
      concepto:tipo,
      cantidad:"1",
      observacion:"",
    });
    return;
  }

  if(tipo==="TRANSFERIR_UBICACIONES"){
    setStockTransferencia({
      ...panelMovimientoStock,
      ubicacion_origen:jornadaActiva?.punto_nombre||"PRINCIPAL",
      ubicacion_destino:"",
      cantidad:"1",
      observacion:"",
    });
    return;
  }

  if(tipo==="TRANSFERIR_LOCALES"){
    await cargarInstitucionesTransferencia();
    setPuntosDestinoLocal([]);
    setTransferenciaLocales({
      ...panelMovimientoStock,
      institucion_destino_id:"",
      punto_destino_id:"",
      cantidad:"1",
      observacion:"",
    });
    return;
  }

  if(tipo==="BAJA"){
    setBajaStock({
      ...panelMovimientoStock,
      ubicacion:jornadaActiva?.punto_nombre||"PRINCIPAL",
      cantidad:"1",
      motivo_baja:"DAÑO",
      observacion:"",
    });
  }
};

const confirmarTransferenciaLocales=async()=>{
  if(!transferenciaLocales)return;

  const institucionDestinoId=Number(
    transferenciaLocales.institucion_destino_id
  );
  const puntoDestinoId=Number(
    transferenciaLocales.punto_destino_id
  );
  const cantidad=Number(transferenciaLocales.cantidad||0);
  const observacion=String(
    transferenciaLocales.observacion||""
  ).trim();

  if(!institucionDestinoId||!puntoDestinoId){
    alert("Selecciona el local y el punto destino.");
    return;
  }

  if(!Number.isInteger(cantidad)||cantidad<=0){
    alert("Ingresa una cantidad válida mayor a 0.");
    return;
  }

  if(!observacion){
    alert("La observación es obligatoria.");
    return;
  }

  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(
      `${API_URL}/api/inventario/transferir-locales`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${token}`,
        },
        body:JSON.stringify({
          institucion_id:Number(institucionId),
          jornada_id:Number(jornadaActiva?.id),
          producto_id:Number(transferenciaLocales.id),
          institucion_destino_id:institucionDestinoId,
          punto_destino_id:puntoDestinoId,
          cantidad,
          observacion,
        }),
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(
        data.message||"No se pudo transferir entre locales"
      );
    }

    setTransferenciaLocales(null);
    setPanelMovimientoStock(null);
    await cargarExistenciasInventario();

    alert(
      `Transferencia realizada.\nReferencia: ${data.referencia||"-"}`
    );
  }catch(error){
    alert(
      error.message||
      "No se pudo realizar la transferencia entre locales."
    );
  }
};


const cargarProveedoresStock=async()=>{
  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    if(!token||!institucionId){
      setProveedoresStock([]);
      return [];
    }

    const res=await fetch(
      `${API_URL}/api/inventario/proveedores?institucion_id=${Number(institucionId)}&t=${Date.now()}`,
      {
        headers:{Authorization:`Bearer ${token}`},
        cache:"no-store",
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||"No se pudieron cargar los proveedores");
    }

    const lista=Array.isArray(data)?data:[];
    setProveedoresStock(lista);
    return lista;
  }catch(error){
    console.error("Error cargando proveedores de Stock:",error);
    setProveedoresStock([]);
    return [];
  }
};


const cargarFamiliasStock=async()=>{
  try{
    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    if(!token||!institucionId){
      setFamiliasCatalogoStock([]);
      return [];
    }

    const res=await fetch(
      `${API_URL}/api/inventario/familias?institucion_id=${Number(institucionId)}&t=${Date.now()}`,
      {
        headers:{Authorization:`Bearer ${token}`},
        cache:"no-store",
      }
    );

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||"No se pudieron cargar las familias");
    }

    const lista=Array.isArray(data)?data:[];
    setFamiliasCatalogoStock(lista);
    return lista;
  }catch(error){
    console.error("Error cargando familias de Stock:",error);
    setFamiliasCatalogoStock([]);
    return [];
  }
};

const normalizarEncabezadoStockExcel=(valor)=>
  String(valor||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim()
    .toUpperCase()
    .replace(/\s+/g,"_");

const leerExcelStockCatalogo=(archivo)=>
  new Promise((resolve,reject)=>{
    const reader=new FileReader();

    reader.onload=(evento)=>{
      try{
        const workbook=XLSX.read(evento.target.result,{type:"array"});
        const hoja=workbook.SheetNames[0];

        if(!hoja){
          throw new Error("El archivo Excel no contiene hojas.");
        }

        const filas=XLSX.utils.sheet_to_json(
          workbook.Sheets[hoja],
          {defval:"",raw:false}
        );

        resolve(Array.isArray(filas)?filas:[]);
      }catch(error){
        reject(error);
      }
    };

    reader.onerror=()=>reject(new Error("No se pudo leer el archivo Excel."));
    reader.readAsArrayBuffer(archivo);
  });

const descargarPlantillaProveedoresStock=()=>{
  const worksheet=XLSX.utils.aoa_to_sheet([
    ["NOMBRE","RUC_CEDULA"],
    ["Distribuidora ABC","1790012345001"],
  ]);
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,"Proveedores");
  XLSX.writeFile(workbook,"plantilla_proveedores.xlsx");
};

const descargarPlantillaFamiliasStock=()=>{
  const worksheet=XLSX.utils.aoa_to_sheet([
    ["NOMBRE","CODIGO","MATERIA_PRIMA","ESTADO"],
    ["Bebidas","BEB","NO","ACTIVO"],
    ["Carnes","CAR","SI","ACTIVO"],
  ]);
  const workbook=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook,worksheet,"Familias");
  XLSX.writeFile(workbook,"plantilla_familias.xlsx");
};

const importarProveedoresStockExcel=async(event)=>{
  const archivo=event.target.files?.[0];
  event.target.value="";

  if(!archivo)return;

  try{
    setImportandoProveedoresStock(true);

    const filas=await leerExcelStockCatalogo(archivo);
    const proveedores=filas
      .map((fila)=>{
        const normalizada={};
        Object.entries(fila||{}).forEach(([clave,valor])=>{
          normalizada[normalizarEncabezadoStockExcel(clave)]=valor;
        });

        return {
          nombre:String(normalizada.NOMBRE||"").trim(),
          ruc_cedula:String(
            normalizada.RUC_CEDULA||
            normalizada.RUC||
            normalizada.CEDULA||
            ""
          ).trim(),
        };
      })
      .filter((p)=>p.nombre&&p.ruc_cedula);

    if(!proveedores.length){
      alert("No se encontraron filas válidas. Usa las columnas NOMBRE y RUC_CEDULA.");
      return;
    }

    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(`${API_URL}/api/inventario/proveedores/importar`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`,
      },
      body:JSON.stringify({
        institucion_id:Number(institucionId),
        proveedores,
      }),
    });

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||data.error||"No se pudieron importar los proveedores.");
    }

    await cargarProveedoresStock();

    alert(
      `Proveedores importados.\n`+
      `Procesados: ${Number(data.procesados||0)}\n`+
      `Nuevos: ${Number(data.nuevos||0)}\n`+
      `Actualizados: ${Number(data.actualizados||0)}`
    );
  }catch(error){
    console.error("Error importando proveedores:",error);
    alert(error.message||"No se pudo importar el Excel de proveedores.");
  }finally{
    setImportandoProveedoresStock(false);
  }
};

const importarFamiliasStockExcel=async(event)=>{
  const archivo=event.target.files?.[0];
  event.target.value="";

  if(!archivo)return;

  try{
    setImportandoFamiliasStock(true);

    const filas=await leerExcelStockCatalogo(archivo);
    const familias=filas
      .map((fila)=>{
        const normalizada={};
        Object.entries(fila||{}).forEach(([clave,valor])=>{
          normalizada[normalizarEncabezadoStockExcel(clave)]=valor;
        });

        return {
          nombre:String(normalizada.NOMBRE||"").trim(),
          codigo:String(normalizada.CODIGO||"").trim(),
          materia_prima:String(normalizada.MATERIA_PRIMA||"NO")
            .trim()
            .toUpperCase(),
          estado:String(normalizada.ESTADO||"ACTIVO")
            .trim()
            .toUpperCase(),
        };
      })
      .filter((f)=>f.nombre);

    if(!familias.length){
      alert(
        "No se encontraron filas válidas. Usa NOMBRE, CODIGO, MATERIA_PRIMA y ESTADO."
      );
      return;
    }

    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();

    const res=await fetch(`${API_URL}/api/inventario/familias/importar`,{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        Authorization:`Bearer ${token}`,
      },
      body:JSON.stringify({
        institucion_id:Number(institucionId),
        familias,
      }),
    });

    const data=await res.json();

    if(!res.ok){
      throw new Error(data.message||data.error||"No se pudieron importar las familias.");
    }

    await cargarFamiliasStock();

    alert(
      `Familias importadas.\n`+
      `Procesadas: ${Number(data.procesadas||0)}\n`+
      `Nuevas: ${Number(data.nuevas||0)}\n`+
      `Actualizadas: ${Number(data.actualizadas||0)}`
    );
  }catch(error){
    console.error("Error importando familias:",error);
    alert(error.message||"No se pudo importar el Excel de familias.");
  }finally{
    setImportandoFamiliasStock(false);
  }
};


const limpiarOperacionStock=()=>{
  setGuardandoStockOperacion(false);
  setStockConfirmacion(null);
  setStockItemsOperacion({});
  setStockBusquedaOperacion("");
  setStockFamiliaOperacion("TODAS");
  setStockCompraForm({
    proveedor_id:"",
    proveedor_nuevo:"",
    numero_factura:"",
    observacion:"",
  });
  setStockOperacionForm({
    observacion:"",
    ubicacion_destino:"",
    institucion_destino_id:"",
    punto_destino_id:"",
    destinatario_cortesia:"",
  });
  setStockConfirmacion(null);
};

const cambiarSeccionStock=(valor)=>{
  setStockSeccion(valor);
  setStockTipoIngreso("");
  setStockTipoEgreso("");
  limpiarOperacionStock();
};

const cambiarTipoIngresoStock=async(valor)=>{
  setStockTipoIngreso(valor);
  setStockTipoEgreso("");
  limpiarOperacionStock();

  if(valor==="COMPRA"){
    await Promise.all([
      cargarProveedoresStock(),
      cargarFamiliasStock(),
    ]);
  }

  if(valor==="TRANSFERENCIA_LOCALES"){
    await cargarInstitucionesTransferencia();
  }
};

const cambiarTipoEgresoStock=(valor)=>{
  setStockTipoEgreso(valor);
  setStockTipoIngreso("");
  limpiarOperacionStock();
};

const toggleProductoOperacionStock=(producto)=>{
  setStockItemsOperacion((prev)=>{
    const copia={...prev};
    const id=String(producto.id);

    if(Object.prototype.hasOwnProperty.call(copia,id)){
      delete copia[id];
    }else{
      // Se deja vacío para que el usuario escriba la cantidad sin un 0 inicial.
      copia[id]="";
    }

    return copia;
  });
};

const cambiarCantidadOperacionStock=(productoId,valor)=>{
  const texto=String(valor??"").trim();

  setStockItemsOperacion((prev)=>({
    ...prev,
    [String(productoId)]:
      texto===""
        ?""
        :String(Math.max(0,Math.trunc(Number(texto)||0))),
  }));
};

const itemsValidosOperacionStock=()=>{
  return Object.entries(stockItemsOperacion)
    .map(([producto_id,cantidad])=>({
      producto_id:Number(producto_id),
      cantidad:Number(cantidad),
    }))
    .filter(
      (item)=>
        item.producto_id &&
        Number.isInteger(item.cantidad) &&
        item.cantidad>0
    );
};

const abrirConfirmacionStock=(confirmacion)=>{
  if(!confirmacion)return;

  setGuardandoStockOperacion(false);
  setStockResultado(null);
  setStockConfirmacion(confirmacion);

  setTimeout(()=>{
    const panel=document.getElementById(
      "stock-confirmacion-panel"
    );

    if(panel&&typeof panel.scrollIntoView==="function"){
      panel.scrollIntoView({
        behavior:"auto",
        block:"start",
      });
    }
  },120);
};

const prepararConfirmacionOperacionStock=()=>{
  if(!jornadaActiva?.id){
    alert("Debes iniciar una jornada antes de operar Stock.");
    return;
  }

  const items=itemsValidosOperacionStock();

  if(!items.length){
    alert("Selecciona al menos un producto e ingresa una cantidad mayor a 0.");
    return;
  }

  if(stockSeccion==="INGRESOS"){
    if(!stockTipoIngreso){
      alert("Selecciona el tipo de ingreso.");
      return;
    }

    if(stockTipoIngreso==="COMPRA"){
      if(
        !stockCompraForm.proveedor_id &&
        !String(stockCompraForm.proveedor_nuevo||"").trim()
      ){
        alert("Selecciona o ingresa un proveedor.");
        return;
      }

      if(!String(stockCompraForm.numero_factura||"").trim()){
        alert("Ingresa el número de factura.");
        return;
      }
    }

    if(stockTipoIngreso==="TRANSFERENCIA_UBICACIONES"){
      if(!String(stockOperacionForm.ubicacion_destino||"").trim()){
        alert("Selecciona la ubicación destino.");
        return;
      }
    }

    if(stockTipoIngreso==="TRANSFERENCIA_LOCALES"){
      if(
        !Number(stockOperacionForm.institucion_destino_id) ||
        !Number(stockOperacionForm.punto_destino_id)
      ){
        alert("Selecciona el local y la ubicación destino.");
        return;
      }
    }

    if(
      ["PRODUCCION_COCINA","OTROS","TRANSFERENCIA_UBICACIONES","TRANSFERENCIA_LOCALES"]
        .includes(stockTipoIngreso) &&
      !String(stockOperacionForm.observacion||"").trim()
    ){
      alert("La observación es obligatoria.");
      return;
    }

    abrirConfirmacionStock({
      grupo:"INGRESOS",
      tipo:stockTipoIngreso,
      items,
    });
    return;
  }

  if(stockSeccion==="EGRESOS"){
    if(!stockTipoEgreso){
      alert("Selecciona BAJA o CORTESÍA.");
      return;
    }

    if(!String(stockOperacionForm.observacion||"").trim()){
      alert("La observación es obligatoria.");
      return;
    }

    if(
      stockTipoEgreso==="CORTESIA" &&
      !String(stockOperacionForm.destinatario_cortesia||"").trim()
    ){
      alert("Indica a quién se entrega la cortesía.");
      return;
    }

    abrirConfirmacionStock({
      grupo:"EGRESOS",
      tipo:stockTipoEgreso,
      items,
    });
  }
};

const fetchStockConTimeout=async(url,opciones={},timeoutMs=20000)=>{
  const controller=new AbortController();
  const timeoutId=setTimeout(()=>controller.abort(),timeoutMs);

  try{
    return await fetch(url,{
      ...opciones,
      signal:controller.signal,
    });
  }catch(error){
    if(error?.name==="AbortError"){
      throw new Error(
        "El servidor tardó demasiado en responder. Verifica la conexión y vuelve a intentar."
      );
    }

    throw error;
  }finally{
    clearTimeout(timeoutId);
  }
};

const confirmarOperacionStockNueva=async(confirmacionForzada=null)=>{
  const confirmacionActual=confirmacionForzada||stockConfirmacion;

  if(!confirmacionActual||guardandoStockOperacion)return;

  try{
    setGuardandoStockOperacion(true);

    const token=localStorage.getItem("token");
    const institucionId=obtenerInstitucionActivaId();
    const items=confirmacionActual.items||[];

    if(confirmacionActual.grupo==="INGRESOS"){
      if(
        ["COMPRA","PRODUCCION_COCINA","OTROS"].includes(
          confirmacionActual.tipo
        )
      ){
        const res=await fetchStockConTimeout(
          `${API_URL}/api/inventario/ingresos/masivo`,
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json",
              Authorization:`Bearer ${token}`,
            },
            body:JSON.stringify({
              institucion_id:Number(institucionId),
              jornada_id:Number(jornadaActiva?.id),
              tipo_ingreso:confirmacionActual.tipo,
              proveedor_id:
                confirmacionActual.tipo==="COMPRA"
                  ? Number(stockCompraForm.proveedor_id||0)||null
                  : null,
              proveedor_nombre:
                confirmacionActual.tipo==="COMPRA"
                  ? String(stockCompraForm.proveedor_nuevo||"").trim()||null
                  : null,
              numero_factura:
                confirmacionActual.tipo==="COMPRA"
                  ? String(stockCompraForm.numero_factura||"").trim()
                  : null,
              observacion:
                confirmacionActual.tipo==="COMPRA"
                  ? String(stockCompraForm.observacion||"").trim()
                  : String(stockOperacionForm.observacion||"").trim(),
              items,
            }),
          }
        );

        const data=await res.json();

        if(!res.ok){
          throw new Error(
            data.message||
            data.error||
            "No se pudo registrar el ingreso"
          );
        }
      }else if(confirmacionActual.tipo==="TRANSFERENCIA_UBICACIONES"){
        for(const item of items){
          const res=await fetchStockConTimeout(
            `${API_URL}/api/inventario/transferir`,
            {
              method:"POST",
              headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`,
              },
              body:JSON.stringify({
                institucion_id:Number(institucionId),
                jornada_id:Number(jornadaActiva?.id),
                producto_id:Number(item.producto_id),
                ubicacion_destino:String(
                  stockOperacionForm.ubicacion_destino||""
                ).trim(),
                cantidad:Number(item.cantidad),
                observacion:String(
                  stockOperacionForm.observacion||""
                ).trim(),
              }),
            }
          );

          const data=await res.json();

          if(!res.ok){
            throw new Error(
              data.message||
              `No se pudo transferir el producto ${item.producto_id}`
            );
          }
        }
      }else if(confirmacionActual.tipo==="TRANSFERENCIA_LOCALES"){
        for(const item of items){
          const res=await fetchStockConTimeout(
            `${API_URL}/api/inventario/transferir-locales`,
            {
              method:"POST",
              headers:{
                "Content-Type":"application/json",
                Authorization:`Bearer ${token}`,
              },
              body:JSON.stringify({
                institucion_id:Number(institucionId),
                jornada_id:Number(jornadaActiva?.id),
                producto_id:Number(item.producto_id),
                institucion_destino_id:Number(
                  stockOperacionForm.institucion_destino_id
                ),
                punto_destino_id:Number(
                  stockOperacionForm.punto_destino_id
                ),
                cantidad:Number(item.cantidad),
                observacion:String(
                  stockOperacionForm.observacion||""
                ).trim(),
              }),
            }
          );

          const data=await res.json();

          if(!res.ok){
            throw new Error(
              data.message||
              `No se pudo transferir el producto ${item.producto_id}`
            );
          }
        }
      }
    }else{
      const res=await fetchStockConTimeout(
        `${API_URL}/api/inventario/egresos/masivo`,
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${token}`,
          },
          body:JSON.stringify({
            institucion_id:Number(institucionId),
            jornada_id:Number(jornadaActiva?.id),
            tipo_egreso:confirmacionActual.tipo,
            destinatario_cortesia:
              confirmacionActual.tipo==="CORTESIA"
                ? String(
                    stockOperacionForm.destinatario_cortesia||""
                  ).trim()
                : null,
            observacion:String(
              stockOperacionForm.observacion||""
            ).trim(),
            items,
          }),
        }
      );

      const data=await res.json();

      if(!res.ok){
        throw new Error(
          data.message||
          data.error||
          "No se pudo registrar el egreso"
        );
      }
    }

    const resultadoItems=(items||[]).map((item)=>{
      const producto=productos.find(
        (p)=>Number(p.id)===Number(item.producto_id)
      );

      const esTransferencia=[
        "TRANSFERENCIA_UBICACIONES",
        "TRANSFERENCIA_LOCALES",
      ].includes(confirmacionActual.tipo);

      const signo=
        confirmacionActual.grupo==="EGRESOS"||esTransferencia
          ? "-"
          : "+";

      const stockAnterior=Number(
        stockProductoEnPunto(
          item.producto_id,
          jornadaActiva?.punto_nombre||"PRINCIPAL"
        )||0
      );

      const cantidadMovimiento=Number(item.cantidad||0);

      const stockFinal=Math.max(
        0,
        signo==="-"
          ? stockAnterior-cantidadMovimiento
          : stockAnterior+cantidadMovimiento
      );

      return{
        producto_id:Number(item.producto_id),
        nombre:
          producto?.nombre||
          `Producto #${item.producto_id}`,
        codigo:producto?.codigo||"-",
        familia:producto?.categoria||"-",
        cantidad:cantidadMovimiento,
        cantidad_texto:
          `${signo}${cantidadMovimiento}`,
        stock_anterior:stockAnterior,
        stock_final:stockFinal,
      };
    });

    setStockConfirmacion(null);

    setStockResultado({
      grupo:confirmacionActual.grupo,
      tipo:confirmacionActual.tipo,
      ubicacion:jornadaActiva?.punto_nombre||"-",
      operador:
        jornadaActiva?.usuario_nombre||
        jornadaActiva?.usuario_correo||
        usuario?.nombre||
        usuario?.correo||
        "-",
      jornada_id:jornadaActiva?.id||null,
      items:resultadoItems,
      total_productos:resultadoItems.length,
      fecha:new Date().toISOString(),
    });

    // Limpiamos los campos de captura, pero NO el resultado que acabamos de mostrar.
    setStockItemsOperacion({});
    setStockBusquedaOperacion("");
    setStockFamiliaOperacion("TODAS");
    setStockCompraForm({
      proveedor_id:"",
      proveedor_nuevo:"",
      numero_factura:"",
      observacion:"",
    });
    setStockOperacionForm({
      observacion:"",
      ubicacion_destino:"",
      institucion_destino_id:"",
      punto_destino_id:"",
      destinatario_cortesia:"",
    });

    setGuardandoStockOperacion(false);

    setTimeout(()=>{
      const panel=document.getElementById(
        "stock-resultado-panel"
      );

      if(panel&&typeof panel.scrollIntoView==="function"){
        panel.scrollIntoView({
          behavior:"smooth",
          block:"center",
        });
      }
    },120);

    Promise.all([
      cargarProductos(),
      cargarExistenciasInventario(),
    ]).catch((error)=>{
      console.error(
        "Error refrescando Stock después de guardar:",
        error
      );
    });
  }catch(error){
    console.error("Error confirmando operación Stock:",error);
    alert(
      error.message||
      "No se pudo confirmar el movimiento de Stock."
    );
  }finally{
    setGuardandoStockOperacion(false);
  }
};

const crearProductoDesdeStock=async(e)=>{
  e.preventDefault();if(!jornadaActiva?.id)return alert("Debes abrir una jornada.");
  const cantidad=Number(nuevoProductoStockForm.cantidad_inicial||0);
  if(!nuevoProductoStockForm.nombre.trim())return alert("Nombre obligatorio.");
  if(!Number.isInteger(cantidad)||cantidad<0)return alert("Cantidad inicial inválida.");
  try{const token=localStorage.getItem("token"),institucionId=obtenerInstitucionActivaId();
    const res=await fetch(`${API_URL}/api/productos`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({
      institucion_id:Number(institucionId),jornada_id:Number(jornadaActiva.id),
      nombre:nuevoProductoStockForm.nombre.trim(),codigo:nuevoProductoStockForm.codigo.trim()||null,
      precio:Number(nuevoProductoStockForm.precio||0),stock:cantidad,stock_minimo:Number(nuevoProductoStockForm.stock_minimo||0),
      categoria:nuevoProductoStockForm.categoria.trim()||null,concepto_inicial:nuevoProductoStockForm.concepto_inicial,
      observacion_inicial:nuevoProductoStockForm.observacion_inicial.trim()||"Ingreso inicial desde Stock",
      ubicacion_inicial:
        nuevoProductoStockForm.ubicacion_inicial ||
        jornadaActiva?.punto_nombre ||
        "PRINCIPAL"
    })});
    const data=await res.json();if(!res.ok)throw new Error(data.message||"Error creando producto");
    setMostrarNuevoProductoStock(false);setNuevoProductoStockForm({
      nombre:"",
      codigo:"",
      precio:"",
      categoria:"",
      stock_minimo:"",
      cantidad_inicial:"",
      concepto_inicial:"COMPRA",
      observacion_inicial:"",
      ubicacion_inicial:"",
    });
    await cargarExistenciasInventario();alert(
      `Producto creado en ${
        nuevoProductoStockForm.ubicacion_inicial ||
        jornadaActiva?.punto_nombre ||
        "PRINCIPAL"
      }.`
    );
  }catch(e){alert(e.message||"No se pudo crear el producto")}
};
const abrirMovimientoStock=(producto)=>setMovimientoStock({...producto,concepto:"COMPRA",cantidad:"1",observacion:""});
const confirmarMovimientoStock=async()=>{
  if(!movimientoStock)return;const cantidad=Number(movimientoStock.cantidad||0);
  if(!Number.isInteger(cantidad)||cantidad<=0)return alert("Cantidad inválida.");
  if(!String(movimientoStock.observacion||"").trim())return alert("Observación obligatoria.");
  try{const token=localStorage.getItem("token"),institucionId=obtenerInstitucionActivaId();
    const res=await fetch(`${API_URL}/api/inventario/movimiento`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({
      institucion_id:Number(institucionId),jornada_id:Number(jornadaActiva?.id),producto_id:Number(movimientoStock.id),
      concepto:movimientoStock.concepto,cantidad,observacion:movimientoStock.observacion.trim()
    })});
    const data=await res.json();if(!res.ok)throw new Error(data.message||"Error registrando movimiento");
    setMovimientoStock(null);await cargarExistenciasInventario();alert(data.message||"Movimiento registrado.");
  }catch(e){alert(e.message||"No se pudo registrar el movimiento")}
};

const verMovimientosStockNuevo = (producto) => {
  setStockTransferencia(null);
  setBajaStock(null);
  setStockDetalle(producto);
};

const eliminarStockProductoNuevo = (producto) => {
  setStockDetalle(null);
  setStockTransferencia(null);
  setBajaStock({
    ...producto,
    ubicacion: puntoInventarioSeleccionado,
    cantidad:"1",
    motivo_baja:"DAÑO",
    observacion:"",
  });
};

const confirmarBajaStock = async () => {
  if (!bajaStock) return;

  const cantidad = Number(bajaStock.cantidad || 0);
  const observacion = String(bajaStock.observacion || "").trim();

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    alert("Ingresa una cantidad válida mayor a 0.");
    return;
  }

  if (!observacion) {
    alert("La observación es obligatoria para dar de baja un producto.");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const res = await fetch(`${API_URL}/api/inventario/baja`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id:Number(institucionId),
        jornada_id:Number(jornadaActiva?.id),
        producto_id:Number(bajaStock.id),
        ubicacion:bajaStock.ubicacion,
        cantidad,
        motivo_baja:bajaStock.motivo_baja||"OTRO",
        observacion,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "No se pudo registrar la baja.");
    }

    setBajaStock(null);
    await Promise.all([cargarProductos(), cargarExistenciasInventario()]);
    alert("Baja registrada correctamente.");
  } catch (error) {
    console.error("Error dando de baja stock:", error);
    alert(error.message || "No se pudo registrar la baja.");
  }
};

const transferirStockProductoNuevo = (producto) => {
  setStockDetalle(null);
  setBajaStock(null);
  setStockTransferencia({
    ...producto,
    ubicacion_origen: puntoInventarioSeleccionado,
    ubicacion_destino: "",
    cantidad: "1",
    observacion: "",
  });
};

const confirmarTransferenciaStock = async () => {
  if (!stockTransferencia) return;

  const cantidad = Number(stockTransferencia.cantidad || 0);
  const origen = String(stockTransferencia.ubicacion_origen || "PRINCIPAL").trim();
  const destino = String(stockTransferencia.ubicacion_destino || "").trim();
  const observacion = String(stockTransferencia.observacion || "").trim();

  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    alert("Ingresa una cantidad válida mayor a 0.");
    return;
  }

  if (!destino) {
    alert("Ingresa el punto destino.");
    return;
  }

  if (origen.toUpperCase() === destino.toUpperCase()) {
    alert("El punto origen y destino deben ser diferentes.");
    return;
  }

  if (!observacion) {
    alert("La observación es obligatoria para realizar la transferencia.");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const res = await fetch(`${API_URL}/api/inventario/transferir`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        institucion_id:Number(institucionId),
        jornada_id:Number(jornadaActiva?.id),
        producto_id:Number(stockTransferencia.id),
        ubicacion_origen:origen,
        ubicacion_destino: destino,
        cantidad,
        observacion,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.error || "No se pudo realizar la transferencia.");
    }

    setStockTransferencia(null);
    await Promise.all([cargarProductos(), cargarExistenciasInventario()]);
    alert(
      `Transferencia realizada: ${cantidad} unidad(es) de ${origen} a ${destino}.`
    );
  } catch (error) {
    console.error("Error transfiriendo stock:", error);
    alert(error.message || "No se pudo realizar la transferencia.");
  }
};

useEffect(()=>{
  // Una jornada nunca se reanuda por confianza local.
  // Al abrir/actualizar, se obliga a validar nuevamente al operador.
  localStorage.removeItem("jornadaActiva");
},[]);

useEffect(()=>{
  if(usuario&&institucionActivaId&&!esRolPortal){
    cargarContextoJornada();
  }
},[usuario?.id,institucionActivaId]);

useEffect(() => {
  if (!usuario || !institucionActivaId || esRolPortal) return;

  // Al iniciar sesión cargamos una vez el inventario compartido.
  // Al entrar a Stock se vuelve a consultar directamente a PostgreSQL.
  if (vista === "inventario" || vista === "ventas") {
    cargarExistenciasInventario();
  }
}, [usuario, institucionActivaId, vista]);

useEffect(() => {
  if (!usuario || esRolPortal) return;

  const refrescarAlVolver = () => {
    if (document.visibilityState !== "visible") return;

    if (vista === "inventario" || vista === "ventas") {
      cargarExistenciasInventario();
    }
  };

  const refrescarAlFoco = () => {
    if (vista === "inventario" || vista === "ventas") {
      cargarExistenciasInventario();
    }
  };

  document.addEventListener("visibilitychange", refrescarAlVolver);
  window.addEventListener("focus", refrescarAlFoco);

  return () => {
    document.removeEventListener("visibilitychange", refrescarAlVolver);
    window.removeEventListener("focus", refrescarAlFoco);
  };
}, [usuario, vista]);

const limpiarFormularioVenta = () => {
  setVentaForm({
    alumno_id: "",
    metodo_pago: "EFECTIVO",
    observacion: "",
  });

  setVentaItems([]);
  setCodigoBarraNuevaOrden("");
  setBusquedaProductoNuevaOrden("");
  setCategoriaNuevaOrden("TODOS");
  setModoNuevaOrden("consumidor_final");
  setTipoUsuarioNuevaOrden("TODOS");
  setBusquedaUsuarioNuevaOrden("");
  setLocalNuevaOrden("PRINCIPAL");
  setFechaNuevaOrden(new Date().toISOString().slice(0, 10));
};

const exportarVentasExcel = () => {
  if (!ventasFiltradas.length) {
    alert("No hay ventas para exportar");
    return;
  }

  const encabezados = [
    "Orden No",
    "Usuario",
    "Ubicación",
    "Fecha de Consumo",
    "Fecha de Pago",
    "Fecha de Creación",
    "Hora compra",
    "Total",
    "Estado",
    "Forma Pago",
    "Tipo orden",
  ];

  const filas = ventasFiltradas.map((v) => [
    `#${v.id}`,
    v.alumno_nombre || "",
    "PRINCIPAL",
    formatearSoloFecha(v.fecha_base),
    formatearSoloFecha(v.fecha_base),
    formatearSoloFecha(v.fecha_base),
    formatearSoloHora(v.fecha_base),
    Number(v.total || 0).toFixed(2),
    "Entregada",
    v.metodo_visual || "",
    "Normal",
  ]);

  const csvContenido = [
    encabezados.join(","),
    ...filas.map((fila) =>
      fila
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContenido], {
    type: "text/csv;charset=utf-8;",
  });

  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.setAttribute("download", "ventas_exportadas.csv");
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.URL.revokeObjectURL(url);
};

  const agregarItemVenta = () => {
    setVentaItems((prev) => [
      ...prev,
      {
        producto_id: "",
        cantidad: "1",
      },
    ]);
  };

  const eliminarItemVenta = (index) => {
  setVentaItems((prev) => prev.filter((_, i) => i !== index));
};

  const actualizarItemVenta = (index, campo, valor) => {
    setVentaItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  };

  const handleCambiarAcceso = async (e) => {
    e.preventDefault();
    setMensajeCambiarAcceso("");
    setCargandoCambiarAcceso(true);

    const institucionId = Number(cambiarAccesoForm.institucion_id);
    const correoActual = String(cambiarAccesoForm.correo_actual || "").trim();
    const passwordActual = String(cambiarAccesoForm.password_actual || "");
    const nuevoCorreo = String(cambiarAccesoForm.nuevo_correo || "").trim();
    const nuevaPassword = String(cambiarAccesoForm.nueva_password || "");
    const confirmarPassword = String(
      cambiarAccesoForm.confirmar_password || ""
    );

    if (!institucionId) {
      setMensajeCambiarAcceso("Debes seleccionar una institución");
      setCargandoCambiarAcceso(false);
      return;
    }

    if (
      !correoActual ||
      !passwordActual ||
      !nuevoCorreo ||
      !nuevaPassword ||
      !confirmarPassword
    ) {
      setMensajeCambiarAcceso("Todos los campos son obligatorios");
      setCargandoCambiarAcceso(false);
      return;
    }

    if (nuevaPassword !== confirmarPassword) {
      setMensajeCambiarAcceso(
        "La confirmación de contraseña no coincide"
      );
      setCargandoCambiarAcceso(false);
      return;
    }

    if (nuevaPassword.length < 6) {
      setMensajeCambiarAcceso(
        "La nueva contraseña debe tener al menos 6 caracteres"
      );
      setCargandoCambiarAcceso(false);
      return;
    }

    try {
      const respuesta = await fetch(`${API_URL}/api/auth/cambiar-acceso`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institucion_id: institucionId,
          correo_actual: correoActual,
          password_actual: passwordActual,
          nuevo_correo: nuevoCorreo,
          nueva_password: nuevaPassword,
          confirmar_password: confirmarPassword,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok) {
        setMensajeCambiarAcceso(
          data.message || data.error || "No se pudo cambiar el acceso"
        );
        return;
      }

      setMensajeCambiarAcceso("Acceso actualizado correctamente");

      setCambiarAccesoForm({
        institucion_id: "",
        correo_actual: "",
        password_actual: "",
        nuevo_correo: "",
        nueva_password: "",
        confirmar_password: "",
      });

      window.setTimeout(() => {
        setMostrarCambiarAcceso(false);
        setMensajeCambiarAcceso("");
      }, 1200);
    } catch (error) {
      console.error("Error cambiando acceso:", error);
      setMensajeCambiarAcceso("No se pudo conectar con el servidor");
    } finally {
      setCargandoCambiarAcceso(false);
    }
  };

  const handleCrearCuenta = async (e) => {
    e.preventDefault();
    setMensajeCrearCuenta("");
    setCargandoCrearCuenta(true);

    if (!crearCuentaForm.institucion_id) {
      setMensajeCrearCuenta("Debes seleccionar una institución");
      setCargandoCrearCuenta(false);
      return;
    }

    if (!crearCuentaForm.nombre.trim()) {
      setMensajeCrearCuenta("Debes ingresar el nombre del usuario");
      setCargandoCrearCuenta(false);
      return;
    }

    if (!crearCuentaForm.correo.trim()) {
      setMensajeCrearCuenta("Debes ingresar el correo");
      setCargandoCrearCuenta(false);
      return;
    }

    if (!crearCuentaForm.password) {
      setMensajeCrearCuenta("Debes ingresar una contraseña");
      setCargandoCrearCuenta(false);
      return;
    }

    if (crearCuentaForm.password !== crearCuentaForm.confirmar_password) {
      setMensajeCrearCuenta("La confirmación de contraseña no coincide");
      setCargandoCrearCuenta(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/auth/crear-cuenta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institucion_id: Number(crearCuentaForm.institucion_id),
          nombre: crearCuentaForm.nombre.trim(),
          correo: crearCuentaForm.correo.trim(),
          password: crearCuentaForm.password,
          confirmar_password: crearCuentaForm.confirmar_password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensajeCrearCuenta(
          data.message || data.error || "No se pudo crear la cuenta"
        );
        return;
      }

      setMensajeCrearCuenta("Cuenta creada correctamente");

      setCrearCuentaForm({
        institucion_id: "",
        nombre: "",
        correo: "",
        password: "",
        confirmar_password: "",
      });

      window.setTimeout(() => {
        setMostrarCrearCuenta(false);
        setMensajeCrearCuenta("");
      }, 1200);
    } catch (error) {
      console.error("Error creando cuenta:", error);
      setMensajeCrearCuenta("No se pudo conectar con el servidor");
    } finally {
      setCargandoCrearCuenta(false);
    }
  };


  const cargarPuntosOperacion=async({tokenForzado=null,institucionForzada=null}={})=>{
    try{
      const token=tokenForzado||localStorage.getItem("token");
      const institucionId=Number(institucionForzada)||obtenerInstitucionActivaId();
      if(!token||!institucionId)return[];
      const res=await fetch(`${API_URL}/api/puntos?institucion_id=${institucionId}&t=${Date.now()}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const data=await res.json(); if(!res.ok)throw new Error(data.message||"Error cargando puntos");
      const lista=Array.isArray(data)?data.filter(p=>p.activo!==false):[];
      setPuntosOperacion(lista);
      const nombres=lista.map(p=>String(p.nombre||"PRINCIPAL").trim().toUpperCase());
      setPuntosInventario(nombres.length?nombres:["PRINCIPAL"]);
      return lista;
    }catch(e){console.error(e);return[]}
  };
  const aplicarJornada=(j)=>{
    if(!j)return;
    const punto=String(j.punto_nombre||"PRINCIPAL").trim().toUpperCase();
    setJornadaActiva(j);localStorage.setItem("jornadaActiva",JSON.stringify(j));
    setPuntoInventarioSeleccionado(punto);setLocalNuevaOrden(punto);setMostrarSelectorJornada(false);
  };
  const cargarContextoJornada=async({tokenForzado=null,institucionForzada=null,usuarioForzado=null}={})=>{
    const u=usuarioForzado||usuario;
    if(!u||["PADRE","ESTUDIANTE"].includes(normalizarRol(u.rol)))return;
    const token=tokenForzado||localStorage.getItem("token");
    const institucionId=Number(institucionForzada)||obtenerInstitucionActivaId();
    if(!token||!institucionId)return;
    const puntos=await cargarPuntosOperacion({tokenForzado:token,institucionForzada:institucionId});
    try{
      const res=await fetch(`${API_URL}/api/jornadas/activa?institucion_id=${institucionId}&t=${Date.now()}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
      const data=await res.json(); if(!res.ok)throw new Error(data.message||"Error consultando jornada");
      if(data?.id){
        // Existe una jornada abierta, pero al volver a abrir/actualizar POS NUBE
        // NO entramos automáticamente. El operador debe autenticarse otra vez.
        localStorage.removeItem("jornadaActiva");
        setJornadaActiva(null);

        const puntoExistente=puntos.find(
          (p)=>Number(p.id)===Number(data.punto_id)
        );

        const puntosInicio=(()=>{
          const activos=(Array.isArray(puntos)?puntos:[])
            .filter((p)=>p?.activo!==false);

          const puntosReales=activos.filter(
            (p)=>String(p?.nombre||"")
              .trim()
              .toUpperCase()!=="PRINCIPAL"
          );

          return puntosReales.length>0
            ? puntosReales
            : activos;
        })();

        const puntoExistentePermitido=
          puntoExistente&&
          puntosInicio.some(
            (p)=>Number(p.id)===Number(puntoExistente.id)
          )
            ? puntoExistente
            : null;

        setPuntoJornadaSeleccionado(
          puntoExistentePermitido?.id
            ? String(puntoExistentePermitido.id)
            : puntosInicio[0]?.id
            ? String(puntosInicio[0].id)
            : ""
        );

        setOperadorJornadaCorreo(
          String(data.usuario_correo||u?.correo||"")
        );
        setOperadorJornadaPassword("");
        setVerPasswordOperadorJornada(false);
        setMostrarSelectorJornada(true);
        return;
      }
    }catch(e){console.error(e)}
    localStorage.removeItem("jornadaActiva");setJornadaActiva(null);

    const puntosInicio=(()=>{
      const activos=(Array.isArray(puntos)?puntos:[])
        .filter((p)=>p?.activo!==false);

      const puntosReales=activos.filter(
        (p)=>String(p?.nombre||"")
          .trim()
          .toUpperCase()!=="PRINCIPAL"
      );

      return puntosReales.length>0
        ? puntosReales
        : activos;
    })();

    setPuntoJornadaSeleccionado(
      puntosInicio[0]?.id
        ? String(puntosInicio[0].id)
        : ""
    );
    setOperadorJornadaCorreo(String(u?.correo||""));
    setOperadorJornadaPassword("");
    setMostrarSelectorJornada(true);
  };
  const obtenerPuntosJornadaDisponibles=(lista=puntosOperacion)=>{
    const activos=(Array.isArray(lista)?lista:[])
      .filter((p)=>p?.activo!==false);

    const puntosReales=activos.filter(
      (p)=>String(p?.nombre||"")
        .trim()
        .toUpperCase()!=="PRINCIPAL"
    );

    // Si la institución ya tiene puntos reales (ej. BAR PRINCIPAL / KIOSKO),
    // PRINCIPAL deja de mostrarse para iniciar jornada.
    // Si una institución solo tiene PRINCIPAL, se conserva como respaldo.
    return puntosReales.length>0
      ? puntosReales
      : activos;
  };

  const abrirJornada=async()=>{
    if(!puntoJornadaSeleccionado){
      alert("Selecciona el punto de trabajo.");
      return;
    }

    const operadorCorreo=String(operadorJornadaCorreo||"").trim();
    const operadorPassword=String(operadorJornadaPassword||"");

    if(!operadorCorreo||!operadorPassword){
      alert("El usuario/correo y la contraseña del operador son obligatorios.");
      return;
    }

    try{
      setCargandoJornada(true);

      const tokenActual=localStorage.getItem("token");
      const institucionId=obtenerInstitucionActivaId();

      const res=await fetch(`${API_URL}/api/jornadas/abrir`,{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          Authorization:`Bearer ${tokenActual}`,
        },
        body:JSON.stringify({
          institucion_id:Number(institucionId),
          punto_id:Number(puntoJornadaSeleccionado),
          operador_correo:operadorCorreo,
          operador_password:operadorPassword,
        }),
      });

      const data=await res.json();

      if(!res.ok){
        throw new Error(data.message||"Error abriendo jornada");
      }

      if(!data.token||!data.usuario||!data.jornada){
        throw new Error("El servidor no devolvió la sesión completa del operador.");
      }

      // A partir de aquí el sistema queda autenticado como el operador real.
      localStorage.setItem("token",data.token);
      localStorage.setItem("usuario",JSON.stringify(data.usuario));
      localStorage.setItem(
        "institucionSeleccionadaId",
        String(data.usuario.institucion_id)
      );

      setUsuario(data.usuario);
      setInstitucionSeleccionadaId(
        normalizarInstitucionId(data.usuario.institucion_id)
      );

      aplicarVistaInicialRol(
        data.usuario.rol,
        setVista,
        setVistaVentasInterna
      );

      setOperadorJornadaCorreo(data.usuario.correo||"");
      setOperadorJornadaPassword("");
      setVerPasswordOperadorJornada(false);

      aplicarJornada(data.jornada);

      await cargarPuntosOperacion({
        tokenForzado:data.token,
        institucionForzada:data.usuario.institucion_id,
      });

      await cargarExistenciasInventario();
    }catch(e){
      alert(e.message||"No se pudo abrir la jornada");
    }finally{
      setCargandoJornada(false);
    }
  };

  const cerrarJornadaOperativa=async()=>{
    if(!jornadaActiva?.id)return;
    if(!window.confirm(`¿Cerrar tu jornada en ${jornadaActiva.punto_nombre}?`))return;
    try{
      const token=localStorage.getItem("token"),institucionId=obtenerInstitucionActivaId();
      const res=await fetch(`${API_URL}/api/jornadas/${jornadaActiva.id}/cerrar`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({institucion_id:Number(institucionId)})});
      const data=await res.json();if(!res.ok)throw new Error(data.message||"Error cerrando jornada");
      localStorage.removeItem("jornadaActiva");
      setJornadaActiva(null);
      setOperadorJornadaPassword("");
      setPuntoJornadaSeleccionado("");
      setMostrarSelectorJornada(true);
    }catch(e){alert(e.message||"No se pudo cerrar la jornada")}
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    if (!loginInstitucionId) {
  setMensaje("Debes seleccionar una institución");
  setCargando(false);
  return;
}
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  correo,
  password,
  institucion_id: Number(loginInstitucionId),
}),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.message || "Error al iniciar sesión");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      setUsuario(data.usuario);

      const institucionIdLogin =
  Number(loginInstitucionId) ||
  normalizarInstitucionId(data.usuario?.institucion_id);

if (institucionIdLogin) {
  localStorage.setItem(
    "institucionSeleccionadaId",
    String(institucionIdLogin)
  );
  setInstitucionSeleccionadaId(institucionIdLogin);
} else {
  localStorage.removeItem("institucionSeleccionadaId");
  setInstitucionSeleccionadaId(null);
}

      setCuentaForm((prev) => ({
        ...prev,
        correo: data.usuario?.correo || "",
      }));

      aplicarVistaInicialRol(data.usuario?.rol,setVista,setVistaVentasInterna);
      await cargarContextoJornada({tokenForzado:data.token,institucionForzada:institucionIdLogin,usuarioForzado:data.usuario});
      setMensaje("");
    } catch (error) {
      console.error("Error login:", error);
      setMensaje("No se pudo conectar con el servidor");
    } finally {
      setCargando(false);
    }
  };

  const cargarResumen = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) return;

      const res = await fetch(
        `${API_URL}/api/reportes/ventas-resumen?institucion_id=${institucionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setResumen(data);
      } else {
        setResumen(null);
      }
    } catch (error) {
      console.error("Error cargando resumen:", error);
      setResumen(null);
    }
  };

  const cargarProductos = async () => {
  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      setProductos([]);
      return;
    }

    const res = await fetch(
      `${API_URL}/api/productos?institucion_id=${institucionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Error backend productos:", data);
      setProductos([]);
      return;
    }

    const listaProductos = Array.isArray(data)
      ? data
      : Array.isArray(data.productos)
      ? data.productos
      : [];

    setProductos(listaProductos);
  } catch (error) {
    console.error("Error cargando productos:", error);
    setProductos([]);
  }
};

  const cargarAlumnos = async () => {
  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) return;

    const res = await fetch(
      `${API_URL}/api/alumnos?institucion_id=${institucionId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();

    // 🔵 DEBUG
    console.log("institucionId:", institucionId);
    console.log("respuesta alumnos:", data);

    if (res.ok) {
      setAlumnos(Array.isArray(data) ? data : []);
    } else {
      setAlumnos([]);
    }
  } catch (error) {
    console.error("Error cargando alumnos:", error);
    setAlumnos([]);
  }
};


  const normalizarEncabezadoImportacion = (valor) =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

  const descargarExcelPlantilla = (nombreArchivo, hoja, encabezados, ejemplo) => {
    const datos = [encabezados, ejemplo];
    const worksheet = XLSX.utils.aoa_to_sheet(datos);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, hoja);
    XLSX.writeFile(workbook, nombreArchivo);
  };

  const descargarPlantillaAlumnos = () => {
    descargarExcelPlantilla(
      "plantilla_alumnos.xlsx",
      "Alumnos",
      ["Cedula", "Codigo", "Nombres", "Apellidos", "Curso", "Paralelo", "Correo", "Estado"],
      ["1723456789", "A001", "Juan", "Perez", "8vo", "A", "juan@correo.com", "ACTIVO"]
    );
  };

  const descargarPlantillaProfesores = () => {
    descargarExcelPlantilla(
      "plantilla_profesores.xlsx",
      "Profesores",
      ["Cedula", "Codigo", "Nombres", "Apellidos", "Correo", "Telefono", "Estado"],
      ["0912345678", "P001", "Maria", "Lopez", "maria@correo.com", "0999999999", "ACTIVO"]
    );
  };

  const leerArchivoImportacion = (archivo) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evento) => {
        try {
          const workbook = XLSX.read(evento.target.result, { type: "array" });
          const nombreHoja = workbook.SheetNames[0];
          if (!nombreHoja) throw new Error("El archivo no contiene hojas");
          const filas = XLSX.utils.sheet_to_json(workbook.Sheets[nombreHoja], {
            defval: "",
            raw: false,
          });
          resolve(filas);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsArrayBuffer(archivo);
    });

  const normalizarFilaImportada = (fila) => {
    const normalizada = {};
    Object.entries(fila || {}).forEach(([clave, valor]) => {
      normalizada[normalizarEncabezadoImportacion(clave)] = String(valor ?? "").trim();
    });
    return normalizada;
  };

  const estadoImportadoActivo = (valor) => {
    const texto = String(valor || "ACTIVO").trim().toUpperCase();
    return !["INACTIVO", "INACTIVA", "FALSE", "0", "NO"].includes(texto);
  };

  const importarAlumnosArchivo = async (event) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const filas = (await leerArchivoImportacion(archivo)).map(normalizarFilaImportada);
      if (!filas.length) {
        alert("El archivo no contiene registros");
        return;
      }

      let creados = 0;
      let actualizados = 0;
      let errores = 0;
      const detalleErrores = [];
      const alumnosActuales = Array.isArray(alumnos) ? [...alumnos] : [];

      for (let indice = 0; indice < filas.length; indice += 1) {
        const fila = filas[indice];
        const cedula = fila.cedula || fila.identificacion || fila.documento || "";
        const codigo = fila.codigo || "";
        const nombres = fila.nombres || fila.nombre || "";
        const apellidos = fila.apellidos || fila.apellido || "";

        if (!cedula || !nombres || !apellidos) {
          errores += 1;
          detalleErrores.push(`Fila ${indice + 2}: faltan cédula, nombres o apellidos`);
          continue;
        }

        const existente = alumnosActuales.find((a) =>
          String(obtenerCedulaAlumno(a) || "").trim() === String(cedula).trim()
        );

        const payload = {
          institucion_id: Number(institucionId),
          cedula,
          codigo,
          nombres,
          apellidos,
          curso: fila.curso || "",
          paralelo: fila.paralelo || "",
          correo: fila.correo || fila.email || "",
          saldo: existente ? Number(existente.saldo || 0) : 0,
          activo: estadoImportadoActivo(fila.estado),
        };

        try {
          const respuesta = await fetch(
            existente ? `${API_URL}/api/alumnos/${existente.id}` : `${API_URL}/api/alumnos`,
            {
              method: existente ? "PUT" : "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            }
          );
          const data = await respuesta.json();
          if (!respuesta.ok) throw new Error(data.message || "Error guardando alumno");
          if (existente) actualizados += 1;
          else {
            creados += 1;
            alumnosActuales.push(data);
          }
        } catch (error) {
          errores += 1;
          detalleErrores.push(`Fila ${indice + 2}: ${error.message}`);
        }
      }

      await cargarAlumnos();
      alert(
        `Importación de alumnos finalizada.\n\nNuevos: ${creados}\nActualizados: ${actualizados}\nErrores: ${errores}` +
          (detalleErrores.length ? `\n\nPrimeros errores:\n${detalleErrores.slice(0, 8).join("\n")}` : "")
      );
    } catch (error) {
      console.error("Error importando alumnos:", error);
      alert(`No se pudo importar alumnos: ${error.message}`);
    }
  };

  const importarProfesoresArchivo = async (event) => {
    const archivo = event.target.files?.[0];
    event.target.value = "";
    if (!archivo) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const filas = (await leerArchivoImportacion(archivo)).map(normalizarFilaImportada);
      if (!filas.length) {
        alert("El archivo no contiene registros");
        return;
      }

      let creados = 0;
      let actualizados = 0;
      let errores = 0;
      const detalleErrores = [];
      const profesoresActuales = Array.isArray(profesores) ? [...profesores] : [];

      for (let indice = 0; indice < filas.length; indice += 1) {
        const fila = filas[indice];
        const cedula = fila.cedula || fila.identificacion || fila.documento || "";
        const nombres = fila.nombres || fila.nombre || "";
        const apellidos = fila.apellidos || fila.apellido || "";

        if (!cedula || !nombres || !apellidos) {
          errores += 1;
          detalleErrores.push(`Fila ${indice + 2}: faltan cédula, nombres o apellidos`);
          continue;
        }

        const existente = profesoresActuales.find((p) =>
          String(p.cedula || "").trim() === String(cedula).trim()
        );

        const payload = {
          institucion_id: Number(institucionId),
          cedula,
          codigo: fila.codigo || "",
          nombres,
          apellidos,
          email: fila.correo || fila.email || "",
          telefono: fila.telefono || fila.celular || "",
          saldo: existente ? Number(existente.saldo || existente.credito || 0) : 0,
          es_profesor: true,
          activo: estadoImportadoActivo(fila.estado),
        };

        try {
          const respuesta = await fetch(
            existente ? `${API_URL}/api/profesores/${existente.id}` : `${API_URL}/api/profesores`,
            {
              method: existente ? "PUT" : "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(payload),
            }
          );
          const data = await respuesta.json();
          if (!respuesta.ok) throw new Error(data.message || "Error guardando profesor");
          if (existente) actualizados += 1;
          else {
            creados += 1;
            profesoresActuales.push(data);
          }
        } catch (error) {
          errores += 1;
          detalleErrores.push(`Fila ${indice + 2}: ${error.message}`);
        }
      }

      await cargarProfesores();
      alert(
        `Importación de profesores finalizada.\n\nNuevos: ${creados}\nActualizados: ${actualizados}\nErrores: ${errores}` +
          (detalleErrores.length ? `\n\nPrimeros errores:\n${detalleErrores.slice(0, 8).join("\n")}` : "")
      );
    } catch (error) {
      console.error("Error importando profesores:", error);
      alert(`No se pudo importar profesores: ${error.message}`);
    }
  };

  const limpiarFormularioProfesor = () => {
    setProfesorForm({
      cedula: "",
      nombres: "",
      apellidos: "",
      email: "",
      codigo: "",
      telefono: "",
      saldo: "",
      es_profesor: true,
    });
    setEditandoProfesorId(null);
  };

  const cargarCreditosProfesores = async (profesorId = "") => {
    try {
      setCargandoCreditosProfesores(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        setCreditosProfesores([]);
        return;
      }

      const params = new URLSearchParams({
        institucion_id: String(institucionId),
      });

      if (profesorId) {
        params.set("profesor_id", String(profesorId));
      }

      if (creditosProfesoresFiltros.fecha_inicio) {
        params.set(
          "fecha_inicio",
          creditosProfesoresFiltros.fecha_inicio
        );
      }

      if (creditosProfesoresFiltros.fecha_fin) {
        params.set(
          "fecha_fin",
          creditosProfesoresFiltros.fecha_fin
        );
      }

      const res = await fetch(
        `${API_URL}/api/profesores/creditos/historial?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "No se pudo cargar el historial"
        );
      }

      setCreditosProfesores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando créditos de profesores:", error);
      setCreditosProfesores([]);
      alert(
        error.message ||
          "No se pudo cargar el historial de créditos del profesor."
      );
    } finally {
      setCargandoCreditosProfesores(false);
    }
  };


  const abrirModalRecargaProfesor = () => {
    if (!profesorDetalle?.id) {
      alert("Selecciona un profesor.");
      return;
    }

    setRecargaProfesorForm({
      monto: "",
      metodo_pago: "EFECTIVO",
      numero_comprobante: "",
      banco: "",
      cuenta_bancaria_id: "",
      observacion: "",
    });
    setMostrarModalRecargaProfesor(true);
  };

  const cerrarModalRecargaProfesor = () => {
    if (guardandoRecargaProfesor) return;
    setMostrarModalRecargaProfesor(false);
    setRecargaProfesorForm({
      monto: "",
      metodo_pago: "EFECTIVO",
      numero_comprobante: "",
      banco: "",
      cuenta_bancaria_id: "",
      observacion: "",
    });
  };

  const recargarEfectivoProfesorRapido = async () => {
    if (!profesorDetalle?.id) {
      alert("Selecciona un profesor.");
      return;
    }

    const valorIngresado = window.prompt(
      `Recarga en efectivo para ${profesorDetalle.nombres || ""} ${
        profesorDetalle.apellidos || ""
      }\n\nIngresa el monto a recargar:`,
      ""
    );

    if (valorIngresado === null) return;

    const monto = Number(
      String(valorIngresado).replace(",", ".").trim()
    );

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingresa un monto válido mayor que cero.");
      return;
    }

    try {
      setGuardandoRecargaProfesor(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida.");
        return;
      }

      // Usamos la ruta estable de movimientos de crédito.
      // El backend actual acepta tipo RECARGA y acredita el saldo.
      const res = await fetch(
        `${API_URL}/api/profesores/${profesorDetalle.id}/creditos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
            tipo: "RECARGA",
            monto,
            comercio: "POS NUBE",
            observacion: "Recarga en efectivo",
          }),
        }
      );

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `No se pudo realizar la recarga. Código ${res.status}`
        );
      }

      if (data.profesor) {
        setProfesorDetalle(data.profesor);

        setProfesores((prev) =>
          prev.map((profesor) =>
            Number(profesor.id) === Number(data.profesor.id)
              ? data.profesor
              : profesor
          )
        );
      } else {
        // Fallback visual si el backend no devuelve profesor completo.
        setProfesorDetalle((prev) =>
          prev
            ? {
                ...prev,
                saldo: Number(prev.saldo || 0) + monto,
                credito: Number(prev.saldo || prev.credito || 0) + monto,
              }
            : prev
        );
      }

      // Actualizar historial sin bloquear el éxito de la recarga.
      try {
        await cargarCreditosProfesores(profesorDetalle.id);
      } catch (errorHistorial) {
        console.warn(
          "La recarga se realizó, pero no se pudo refrescar el historial:",
          errorHistorial
        );
      }

      alert(
        `Recarga en efectivo realizada correctamente.\nMonto: ${formatearMoneda(
          monto
        )}`
      );
    } catch (error) {
      console.error("Error realizando recarga rápida del profesor:", error);
      alert(error.message || "No se pudo realizar la recarga.");
    } finally {
      setGuardandoRecargaProfesor(false);
    }
  };

  const registrarRecargaProfesor = async (e) => {
    e.preventDefault();

    if (!profesorDetalle?.id) {
      alert("Selecciona un profesor.");
      return;
    }

    const monto = Number(recargaProfesorForm.monto || 0);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingresa un monto válido mayor que cero.");
      return;
    }

    if (recargaProfesorForm.metodo_pago === "TRANSFERENCIA") {
      if (!recargaProfesorForm.cuenta_bancaria_id || !recargaProfesorForm.banco) {
        alert("Selecciona el banco receptor.");
        return;
      }

      if (!String(recargaProfesorForm.numero_comprobante || "").trim()) {
        alert("Ingresa el número de comprobante de la transferencia.");
        return;
      }
    }

    try {
      setGuardandoRecargaProfesor(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const esEfectivo =
        recargaProfesorForm.metodo_pago === "EFECTIVO";

      const urlRecargaProfesor = esEfectivo
        ? `${API_URL}/api/profesores/${profesorDetalle.id}/creditos`
        : `${API_URL}/api/profesores/${profesorDetalle.id}/recargas`;

      const payloadRecargaProfesor = esEfectivo
        ? {
            institucion_id: Number(institucionId),
            tipo: "RECARGA",
            monto,
            comercio: "POS NUBE",
            observacion:
              recargaProfesorForm.observacion || "Recarga en efectivo",
          }
        : {
            institucion_id: Number(institucionId),
            monto,
            metodo_pago: recargaProfesorForm.metodo_pago,
            numero_comprobante: String(
              recargaProfesorForm.numero_comprobante
            ).trim(),
            banco: recargaProfesorForm.banco,
            cuenta_bancaria_id: Number(
              recargaProfesorForm.cuenta_bancaria_id
            ),
            comercio: "POS NUBE",
            observacion: recargaProfesorForm.observacion,
          };

      const res = await fetch(urlRecargaProfesor, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payloadRecargaProfesor),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || "No se pudo realizar la recarga"
        );
      }

      if (data.profesor) {
        setProfesorDetalle(data.profesor);
        setProfesores((prev) =>
          prev.map((profesor) =>
            Number(profesor.id) === Number(data.profesor.id)
              ? data.profesor
              : profesor
          )
        );
      }

      setRecargaProfesorForm({
        monto: "",
        metodo_pago: "EFECTIVO",
        numero_comprobante: "",
        banco: "",
        cuenta_bancaria_id: "",
        observacion: "",
      });

      await cargarCreditosProfesores(profesorDetalle.id);
      setMostrarModalRecargaProfesor(false);
      alert("Recarga realizada correctamente. El saldo se actualizó inmediatamente.");
    } catch (error) {
      console.error("Error realizando recarga del profesor:", error);
      alert(error.message || "No se pudo realizar la recarga.");
    } finally {
      setGuardandoRecargaProfesor(false);
    }
  };

  const actualizarCreditoProfesor = async (
    accion = "HABILITAR"
  ) => {
    if (!profesorDetalle?.id) return;

    if (!["ADMIN", "SUPER_ADMIN"].includes(rolActual)) {
      alert(
        "Solo un administrador puede autorizar cambios de crédito."
      );
      return;
    }

    if (!creditoProfesorAdminPassword) {
      alert("Ingresa la contraseña del administrador.");
      return;
    }

    if (accion === "GUARDAR_LIMITE") {
      const limite = Number(creditoProfesorLimite);

      if (!Number.isFinite(limite) || limite <= 0) {
        alert("Ingresa un límite de crédito mayor a 0.");
        return;
      }
    }

    try {
      setGuardandoAutorizacionCreditoProfesor(true);

      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const response = await fetch(
        `${API_URL}/api/profesores/${profesorDetalle.id}/credito-habilitado`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: Number(institucionId),
            accion_credito: accion,
            credito_habilitado:
              accion !== "DESHABILITAR",
            limite_credito:
              accion === "GUARDAR_LIMITE"
                ? Number(creditoProfesorLimite)
                : Number(profesorDetalle?.limite_credito || 0),
            admin_password: creditoProfesorAdminPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "No se pudo actualizar la autorización de crédito"
        );
      }

      setProfesorDetalle(data.profesor);

      setProfesores((prev) =>
        prev.map((p) =>
          Number(p.id) === Number(data.profesor.id)
            ? data.profesor
            : p
        )
      );

      setCreditoProfesorLimite(
        String(Number(data.profesor?.limite_credito || 0))
      );
      setCreditoProfesorAdminPassword("");

      alert(data.message);
    } catch (error) {
      console.error(
        "Error actualizando permiso de crédito:",
        error
      );
      alert(
        error.message ||
        "No se pudo actualizar el permiso de crédito"
      );
    } finally {
      setGuardandoAutorizacionCreditoProfesor(false);
    }
  };

  const registrarCreditoProfesor = async (e) => {
    e.preventDefault();

    if (!profesorDetalle?.id) {
      alert("Selecciona un profesor.");
      return;
    }

    if (profesorDetalle.credito_habilitado !== true) {
      alert(
        "El crédito del profesor está inhabilitado. Un administrador debe autorizarlo con su contraseña."
      );
      return;
    }

    const monto = Number(creditoProfesorForm.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      alert("Ingresa un monto válido mayor que cero.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const res = await fetch(
        `${API_URL}/api/profesores/${profesorDetalle.id}/creditos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: institucionId,
            tipo: creditoProfesorForm.tipo,
            monto,
            comercio:
              creditoProfesorForm.comercio || "POS NUBE",
            observacion: creditoProfesorForm.observacion,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || "No se pudo registrar"
        );
      }

      setProfesorDetalle(data.profesor);
      setProfesores((prev) =>
        prev.map((profesor) =>
          Number(profesor.id) === Number(data.profesor.id)
            ? data.profesor
            : profesor
        )
      );

      setCreditoProfesorForm({
        tipo: "AJUSTE_POSITIVO",
        monto: "",
        comercio: "POS NUBE",
        observacion: "",
      });

      await cargarCreditosProfesores(profesorDetalle.id);
      alert("Movimiento de crédito registrado correctamente.");
    } catch (error) {
      console.error("Error registrando crédito:", error);
      alert(error.message || "No se pudo registrar el movimiento.");
    }
  };

  const anularCreditoProfesor = async (movimiento) => {
    const confirmado = window.confirm(
      "¿Deseas anular este movimiento de crédito?"
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      const res = await fetch(
        `${API_URL}/api/profesores/creditos/${movimiento.id}/anular`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            institucion_id: institucionId,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || "No se pudo anular"
        );
      }

      await cargarProfesores();
      await cargarCreditosProfesores(profesorDetalle?.id || "");
      setProfesorDetalle((prev) =>
        prev
          ? {
              ...prev,
              saldo: data.saldo,
            }
          : prev
      );

      alert("Movimiento anulado correctamente.");
    } catch (error) {
      console.error("Error anulando crédito:", error);
      alert(error.message || "No se pudo anular el movimiento.");
    }
  };

  const exportarCreditosProfesores = () => {
    const lista = creditosProfesoresFiltrados;

    if (!lista.length) {
      alert("No hay movimientos de crédito para exportar.");
      return;
    }

    const encabezados = [
      "Profesor",
      "Cédula",
      "Comercio",
      "Usuario que hizo el pago",
      "Tipo",
      "Monto",
      "Saldo anterior",
      "Saldo nuevo",
      "Fecha",
      "Estado",
      "Observación",
    ];

    const filas = lista.map((movimiento) => [
      `${movimiento.nombres || ""} ${
        movimiento.apellidos || ""
      }`.trim(),
      movimiento.cedula || "",
      movimiento.comercio || "POS NUBE",
      movimiento.usuario_nombre ||
        movimiento.usuario_correo ||
        "Sistema",
      movimiento.tipo || "",
      Number(movimiento.monto || 0).toFixed(2),
      Number(movimiento.saldo_anterior || 0).toFixed(2),
      Number(movimiento.saldo_nuevo || 0).toFixed(2),
      formatearFechaHora(movimiento.created_at),
      movimiento.estado || "",
      movimiento.observacion || "",
    ]);

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((valor) =>
            `"${String(valor ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\\n");

    const blob = new Blob(["\\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `creditos_profesores_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const cargarProfesores = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        setProfesores([]);
        return;
      }

      const res = await fetch(
        `${API_URL}/api/profesores?institucion_id=${institucionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error("Error backend profesores:", data);
        setProfesores([]);
        return;
      }

      const lista = Array.isArray(data)
        ? data
        : Array.isArray(data.profesores)
        ? data.profesores
        : [];

      setProfesores(lista);

      setProfesorDetalle((detalleActual) => {
        if (!detalleActual) return null;

        return (
          lista.find(
            (profesor) =>
              Number(profesor.id) === Number(detalleActual.id)
          ) || null
        );
      });
    } catch (error) {
      console.error("Error cargando profesores:", error);
      setProfesores([]);
    }
  };

  const guardarProfesor = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const saldoNumero = Number(profesorForm.saldo || 0);

      if (Number.isNaN(saldoNumero) || saldoNumero < 0) {
        alert("El crédito debe ser un número válido mayor o igual a 0.");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        cedula: profesorForm.cedula.trim(),
        nombres: profesorForm.nombres.trim(),
        apellidos: profesorForm.apellidos.trim(),
        email: profesorForm.email.trim(),
        codigo: profesorForm.codigo.trim(),
        telefono: profesorForm.telefono.trim(),
        saldo: saldoNumero,
        es_profesor: profesorForm.es_profesor !== false,
      };

      const url = editandoProfesorId
        ? `${API_URL}/api/profesores/${editandoProfesorId}`
        : `${API_URL}/api/profesores`;

      const res = await fetch(url, {
        method: editandoProfesorId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(
          data.message ||
            (editandoProfesorId
              ? "No se pudo actualizar el profesor"
              : "No se pudo crear el profesor")
        );
        return;
      }

      limpiarFormularioProfesor();
      setMostrarFormularioProfesor(false);
      await cargarProfesores();

      alert(
        editandoProfesorId
          ? "Profesor actualizado correctamente"
          : "Profesor creado correctamente"
      );
    } catch (error) {
      console.error("Error guardando profesor:", error);
      alert("No se pudo guardar el profesor");
    }
  };

  const desactivarProfesor = async (profesor) => {
    const confirmado = window.confirm(
      `¿Deseas desactivar al profesor ${profesor.nombres || ""} ${
        profesor.apellidos || ""
      }?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/profesores/${profesor.id}/desactivar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "No se pudo desactivar el profesor");
        return;
      }

      if (
        profesorDetalle &&
        Number(profesorDetalle.id) === Number(profesor.id)
      ) {
        setProfesorDetalle(null);
      }

      await cargarProfesores();
      alert("Profesor desactivado correctamente");
    } catch (error) {
      console.error("Error desactivando profesor:", error);
      alert("No se pudo desactivar el profesor");
    }
  };

  const reactivarProfesor = async (profesor) => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_URL}/api/profesores/${profesor.id}/reactivar`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "No se pudo reactivar el profesor");
        return;
      }

      await cargarProfesores();
      alert("Profesor reactivado correctamente");
    } catch (error) {
      console.error("Error reactivando profesor:", error);
      alert("No se pudo reactivar el profesor");
    }
  };

  const cargarRecargas = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) return;

      const res = await fetch(
        `${API_URL}/api/recargas?institucion_id=${institucionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setRecargas(Array.isArray(data) ? data : []);
      } else {
        setRecargas([]);
      }
    } catch (error) {
      console.error("Error cargando recargas:", error);
      setRecargas([]);
    }
  };

  const cargarCuentasBancarias = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        setCuentasBancarias([]);
        return;
      }

      const res = await fetch(
        `${API_URL}/api/configuracion/cuentas-bancarias?institucion_id=${institucionId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      setCuentasBancarias(
        res.ok && Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error("Error cargando cuentas bancarias:", error);
      setCuentasBancarias([]);
    }
  };

  const cargarVentas = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) return;

      const res = await fetch(
        `${API_URL}/api/ventas?institucion_id=${institucionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setVentas(Array.isArray(data) ? data : []);
      } else {
        setVentas([]);
      }
    } catch (error) {
      console.error("Error cargando ventas:", error);
      setVentas([]);
    }
  };

  const obtenerVentasParaReporteProductos = (filtros) => {
    let lista = [...ventasEnriquecidas];

    if (filtros.fecha_inicio) {
      lista = lista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha >= filtros.fecha_inicio;
      });
    }

    if (filtros.fecha_fin) {
      lista = lista.filter((venta) => {
        const fecha = formatearFechaInput(venta.fecha_base);
        return fecha && fecha <= filtros.fecha_fin;
      });
    }

    if (filtros.operador) {
      lista = lista.filter(
        (venta) =>
          String(venta.operador_visual || "") ===
          String(filtros.operador)
      );
    }

    if (filtros.ubicacion) {
      lista = lista.filter(
        (venta) =>
          String(venta.ubicacion_visual || "PRINCIPAL") ===
          String(filtros.ubicacion)
      );
    }

    return lista;
  };

  const construirResumenProductosVendidos = (listaVentas) => {
    const mapa = {};

    listaVentas.forEach((venta) => {
      const items = Array.isArray(venta.items) ? venta.items : [];

      items.forEach((item) => {
        const productoId =
          item.producto_id ||
          item.id ||
          item.codigo ||
          item.nombre ||
          "producto";

        const clave = String(productoId);
        const nombre =
          item.producto_nombre ||
          item.nombre ||
          item.descripcion ||
          "Producto";

        if (!mapa[clave]) {
          mapa[clave] = {
            id: clave,
            producto_id: item.producto_id || item.id || null,
            nombre,
            codigo:
              item.codigo ||
              item.producto_codigo ||
              item.producto_id ||
              "-",
            categoria: item.categoria || "-",
            descripcion:
              item.descripcion ||
              item.producto_nombre ||
              item.nombre ||
              "-",
            cantidad: 0,
            total: 0,
          };
        }

        mapa[clave].cantidad += Number(item.cantidad || 0);
        mapa[clave].total += Number(
          item.total ||
            Number(item.cantidad || 0) *
              Number(item.precio_unitario || item.precio || 0)
        );
      });
    });

    return Object.values(mapa);
  };

  const consultarProductos = () => {
    const ventasFiltradasReporte =
      obtenerVentasParaReporteProductos(productosFiltros);

    const vendidos =
      construirResumenProductosVendidos(ventasFiltradasReporte);

    if (productosFiltros.comprado === "NO") {
      const idsVendidos = new Set(
        vendidos.map((item) => String(item.producto_id || item.id))
      );

      const noVendidos = productosActivos
        .filter(
          (producto) =>
            !idsVendidos.has(String(producto.id))
        )
        .map((producto) => ({
          id: `no-vendido-${producto.id}`,
          producto_id: producto.id,
          nombre: producto.nombre || "Producto",
          codigo: producto.codigo || producto.id || "-",
          categoria: producto.categoria || "-",
          descripcion: producto.descripcion || "-",
          cantidad: 0,
          total: 0,
        }));

      setProductosVendidos(noVendidos);
      return;
    }

    setProductosVendidos(vendidos);
  };

  const consultarProductosPorDia = () => {
    const ventasFiltradasReporte =
      obtenerVentasParaReporteProductos({
        ...productosPorDiaFiltros,
        operador: "",
      });

    const mapa = {};

    ventasFiltradasReporte.forEach((venta) => {
      const items = Array.isArray(venta.items) ? venta.items : [];
      const fecha = venta.fecha_base
        ? new Date(venta.fecha_base)
        : null;
      const dia =
        fecha && !Number.isNaN(fecha.getTime())
          ? fecha.getDay()
          : null;

      items.forEach((item) => {
        const productoId =
          item.producto_id ||
          item.id ||
          item.nombre ||
          "producto";
        const clave = String(productoId);
        const nombre =
          item.producto_nombre ||
          item.nombre ||
          item.descripcion ||
          "Producto";

        if (!mapa[clave]) {
          mapa[clave] = {
            id: clave,
            producto_id: item.producto_id || item.id || null,
            producto: nombre,
            categoria: item.categoria || "-",
            domingo: 0,
            lunes: 0,
            martes: 0,
            miercoles: 0,
            jueves: 0,
            viernes: 0,
            sabado: 0,
          };
        }

        const cantidad = Number(item.cantidad || 0);

        if (dia === 0) mapa[clave].domingo += cantidad;
        if (dia === 1) mapa[clave].lunes += cantidad;
        if (dia === 2) mapa[clave].martes += cantidad;
        if (dia === 3) mapa[clave].miercoles += cantidad;
        if (dia === 4) mapa[clave].jueves += cantidad;
        if (dia === 5) mapa[clave].viernes += cantidad;
        if (dia === 6) mapa[clave].sabado += cantidad;
      });
    });

    let resultado = Object.values(mapa);

    if (productosPorDiaFiltros.comprado === "NO") {
      const idsVendidos = new Set(
        resultado.map((item) =>
          String(item.producto_id || item.id)
        )
      );

      resultado = productosActivos
        .filter(
          (producto) =>
            !idsVendidos.has(String(producto.id))
        )
        .map((producto) => ({
          id: `no-vendido-${producto.id}`,
          producto_id: producto.id,
          producto: producto.nombre || "Producto",
          categoria: producto.categoria || "-",
          domingo: 0,
          lunes: 0,
          martes: 0,
          miercoles: 0,
          jueves: 0,
          viernes: 0,
          sabado: 0,
        }));
    }

    setProductosVendidosPorDia(resultado);
  };

  const descargarCsv = (nombreArchivo, encabezados, filas) => {
    if (!filas.length) {
      alert("No hay información para exportar.");
      return;
    }

    const contenido = [encabezados, ...filas]
      .map((fila) =>
        fila
          .map((valor) =>
            `"${String(valor ?? "").replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    window.URL.revokeObjectURL(url);
  };

  const exportarProductosVendidos = () => {
    descargarCsv(
      `productos_vendidos_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      [
        "Nombre",
        "Código",
        "Categoría",
        "Descripción",
        "Cantidad",
        "Total de ventas",
      ],
      productosVendidos.map((producto) => [
        producto.nombre || "",
        producto.codigo || "",
        producto.categoria || "",
        producto.descripcion || "",
        Number(producto.cantidad || 0),
        Number(producto.total || 0).toFixed(2),
      ])
    );
  };

  const exportarProductosVendidosPorDia = () => {
    descargarCsv(
      `productos_vendidos_por_dia_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`,
      [
        "Producto",
        "Categoría",
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ],
      productosVendidosPorDia.map((producto) => [
        producto.producto || "",
        producto.categoria || "",
        Number(producto.domingo || 0),
        Number(producto.lunes || 0),
        Number(producto.martes || 0),
        Number(producto.miercoles || 0),
        Number(producto.jueves || 0),
        Number(producto.viernes || 0),
        Number(producto.sabado || 0),
      ])
    );
  };

    const crearProducto = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const res = await fetch(`${API_URL}/api/productos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id:Number(institucionId),
          jornada_id:Number(jornadaActiva?.id),
          nombre:productoForm.nombre,
          codigo:productoForm.codigo||null,
          descripcion:productoForm.descripcion,
          precio: Number(productoForm.precio || 0),
          stock: Number(productoForm.stock || 0),
          stock_minimo:Number(productoForm.stock_minimo||0),
          categoria:productoForm.categoria,
          concepto_inicial:"COMPRA",
          observacion_inicial:"Producto creado desde Menú Cafetería",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error creando producto");
        return;
      }

      limpiarFormularioProducto();
      await cargarProductos();
      alert("Producto creado correctamente");
    } catch (error) {
      console.error("Error creando producto:", error);
      alert("No se pudo crear el producto");
    }
  };

  const actualizarProducto = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId || !editandoProductoId) {
        alert("No se puede actualizar el producto");
        return;
      }

      const productoActual = productos.find((p) => p.id === editandoProductoId);

      const payload = {
        institucion_id: Number(institucionId),
        nombre: productoForm.nombre,
        descripcion: productoForm.descripcion,
        precio: Number(productoForm.precio || 0),
        stock: Number(productoForm.stock || 0),
        stock_minimo: Number(productoForm.stock_minimo || 0),
        categoria: productoForm.categoria,
        activo: productoActual?.activo ?? true,
      };

      const res = await fetch(`${API_URL}/api/productos/${editandoProductoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error actualizando producto");
        return;
      }

      limpiarFormularioProducto();
      await cargarProductos();
      alert("Producto actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando producto:", error);
      alert("No se pudo actualizar el producto");
    }
  };

  const eliminarProducto = async (producto) => {
    const confirmado = window.confirm(
      `¿Deseas eliminar el producto ${producto.nombre || ""}?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no válida");
        return;
      }

      const res = await fetch(`${API_URL}/api/productos/${producto.id}/desactivar`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error eliminando producto");
        return;
      }

      if (editandoProductoId === producto.id) {
        limpiarFormularioProducto();
      }

      await cargarProductos();
      alert("Producto eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando producto:", error);
      alert("No se pudo eliminar el producto");
    }
  };

  const restaurarProducto = async (producto) => {
    const confirmado = window.confirm(
      `¿Deseas restaurar el producto ${producto.nombre || ""}?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión no válida");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: Number(producto.precio || 0),
        stock: Number(producto.stock || 0),
        stock_minimo: Number(producto.stock_minimo || 0),
        categoria: producto.categoria || "",
        activo: true,
      };

      const res = await fetch(`${API_URL}/api/productos/${producto.id}/reactivar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error restaurando producto");
        return;
      }

      await cargarProductos();
      alert("Producto restaurado correctamente");
    } catch (error) {
      console.error("Error restaurando producto:", error);
      alert("No se pudo restaurar el producto");
    }
  };

  const aplicarMovimientoInventario = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no válida");
        return;
      }

      if (!inventarioForm.producto_id || inventarioForm.cantidad === "") {
        alert("Debes seleccionar un producto y una cantidad");
        return;
      }

      const producto = productos.find(
        (p) => String(p.id) === String(inventarioForm.producto_id)
      );

      if (!producto) {
        alert("Producto no encontrado");
        return;
      }

      const cantidad = Number(inventarioForm.cantidad || 0);
      const stockActual = Number(producto.stock || 0);
      const institucionId = obtenerInstitucionActivaId();

      if (!institucionId) {
        alert("Institución no válida");
        return;
      }

      if (Number.isNaN(cantidad) || cantidad < 0) {
        alert("La cantidad no es válida");
        return;
      }

      let nuevoStock = stockActual;

      if (inventarioForm.tipo === "ENTRADA") {
        if (cantidad <= 0) {
          alert("La cantidad debe ser mayor a 0");
          return;
        }
        nuevoStock = stockActual + cantidad;
      }

      if (inventarioForm.tipo === "SALIDA") {
        if (cantidad <= 0) {
          alert("La cantidad debe ser mayor a 0");
          return;
        }
        nuevoStock = stockActual - cantidad;

        if (nuevoStock < 0) {
          alert("No puedes dejar el stock en negativo");
          return;
        }
      }

      if (inventarioForm.tipo === "AJUSTE") {
        nuevoStock = cantidad;
      }

      const payload = {
        institucion_id: Number(institucionId),
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: Number(producto.precio || 0),
        stock: nuevoStock,
        stock_minimo: Number(producto.stock_minimo || 0),
        categoria: producto.categoria || "",
        activo: producto.activo,
      };

      const res = await fetch(`${API_URL}/api/productos/${producto.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error actualizando inventario");
        return;
      }

      const nombreMovimiento = producto.nombre || "Producto";

      await registrarMovimientoKardex({
        productoId: producto.id,
        tipo:
          inventarioForm.tipo === "ENTRADA"
            ? "INGRESO"
            : inventarioForm.tipo === "SALIDA"
            ? "EGRESO"
            : "AJUSTE",
        cantidad:
          inventarioForm.tipo === "AJUSTE"
            ? Math.abs(nuevoStock - stockActual)
            : cantidad,
        motivo:
          inventarioForm.motivo?.trim() ||
          (inventarioForm.tipo === "ENTRADA"
            ? "Ingreso manual"
            : inventarioForm.tipo === "SALIDA"
            ? "Salida manual"
            : "Ajuste de stock"),
        stockAnterior: stockActual,
        stockNuevo: nuevoStock,
        ubicacion: "PRINCIPAL",
      });

      setInventarioForm({
        producto_id: "",
        tipo: "ENTRADA",
        cantidad: "",
        motivo: "",
      });

      await cargarProductos();
      alert(
        `${nombreMovimiento}: stock anterior ${stockActual}, movimiento ${inventarioForm.tipo} ${cantidad}, stock nuevo ${nuevoStock}`
      );
    } catch (error) {
      console.error("Error actualizando inventario:", error);
      alert("No se pudo actualizar el inventario");
    }
  };

  const crearAlumno = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        cedula: alumnoForm.cedula,
        nombres: alumnoForm.nombres,
        apellidos: alumnoForm.apellidos,
        curso: alumnoForm.curso,
        paralelo: alumnoForm.paralelo,
        saldo: Number(alumnoForm.saldo || 0),
      };

      const res = await fetch(`${API_URL}/api/alumnos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error creando alumno");
        return;
      }

      limpiarFormularioAlumno();
      await cargarAlumnos();
      setFiltroAlumnos("todos");
      alert("Alumno creado correctamente");
    } catch (error) {
      console.error("Error creando alumno:", error);
      alert("No se pudo crear el alumno");
    }
  };

  const actualizarAlumno = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId || !editandoAlumnoId) {
        alert("No se puede actualizar el alumno");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        cedula: alumnoForm.cedula,
        nombres: alumnoForm.nombres,
        apellidos: alumnoForm.apellidos,
        curso: alumnoForm.curso,
        paralelo: alumnoForm.paralelo,
        saldo: Number(alumnoForm.saldo || 0),
      };

      const res = await fetch(`${API_URL}/api/alumnos/${editandoAlumnoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error actualizando alumno");
        return;
      }

      limpiarFormularioAlumno();
      await cargarAlumnos();
      alert("Alumno actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando alumno:", error);
      alert("No se pudo actualizar el alumno");
    }
  };

  const iniciarEdicionAlumno = (alumno) => {
    setEditandoAlumnoId(alumno.id);
    setAlumnoForm({
      cedula: obtenerCedulaAlumno(alumno),
      nombres: alumno.nombres || "",
      apellidos: alumno.apellidos || "",
      curso: alumno.curso || "",
      paralelo: alumno.paralelo || "",
      saldo: alumno.saldo ?? "",
    });
    setVista("alumnos");
  };

  const eliminarAlumno = async (alumno) => {
    const confirmado = window.confirm(
      `¿Deseas eliminar al alumno ${alumno.nombres || ""} ${alumno.apellidos || ""}?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no válida");
        return;
      }

      const res = await fetch(`${API_URL}/api/alumnos/${alumno.id}/desactivar`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error eliminando alumno");
        return;
      }

      if (editandoAlumnoId === alumno.id) {
        limpiarFormularioAlumno();
      }

      await cargarAlumnos();
      alert("Alumno eliminado correctamente");
    } catch (error) {
      console.error("Error eliminando alumno:", error);
      alert("No se pudo eliminar el alumno");
    }
  };

  const restaurarAlumno = async (alumno) => {
    const confirmado = window.confirm(
      `¿Deseas restaurar al alumno ${alumno.nombres || ""} ${alumno.apellidos || ""}?`
    );

    if (!confirmado) return;

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión no válida");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        cedula: obtenerCedulaAlumno(alumno),
        nombres: alumno.nombres,
        apellidos: alumno.apellidos,
        curso: alumno.curso,
        paralelo: alumno.paralelo,
        correo: alumno.correo,
        saldo: Number(alumno.saldo || 0),
        activo: true,
      };

      const res = await fetch(`${API_URL}/api/alumnos/${alumno.id}/reactivar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error restaurando alumno");
        return;
      }

      await cargarAlumnos();
      alert("Alumno restaurado correctamente");
    } catch (error) {
      console.error("Error restaurando alumno:", error);
      alert("No se pudo restaurar el alumno");
    }
  };

  const crearRecarga = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();

      if (!token || !institucionId) {
        alert("Sesión o institución no válida");
        return;
      }

      if (!recargaForm.alumno_id || Number(recargaForm.monto || 0) <= 0) {
        alert("Debes seleccionar un alumno y registrar un monto válido.");
        return;
      }

      if (recargaForm.metodo_pago === "TRANSFERENCIA") {
        if (!String(recargaForm.banco || "").trim()) {
          alert("Debes seleccionar el banco donde se realizó la transferencia.");
          return;
        }

        if (!String(recargaForm.numero_comprobante || "").trim()) {
          alert("Debes ingresar el No. de comprobante de la transferencia.");
          return;
        }
      }

      const payload = {
        institucion_id: Number(institucionId),
        alumno_id: Number(recargaForm.alumno_id),
        monto: Number(recargaForm.monto || 0),
        metodo_pago: recargaForm.metodo_pago,
        numero_comprobante:
          recargaForm.metodo_pago === "TRANSFERENCIA"
            ? String(recargaForm.numero_comprobante || "").trim()
            : null,
        banco:
          recargaForm.metodo_pago === "TRANSFERENCIA"
            ? String(recargaForm.banco || "").trim()
            : null,
        cuenta_bancaria_id:
          recargaForm.metodo_pago === "TRANSFERENCIA" &&
          recargaForm.cuenta_bancaria_id
            ? Number(recargaForm.cuenta_bancaria_id)
            : null,
        observacion: recargaForm.observacion,
      };

      const res = await fetch(`${API_URL}/api/recargas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error creando recarga");
        return;
      }

      limpiarFormularioRecarga();
      await cargarRecargas();
      await cargarAlumnos();
      await cargarResumen();
      alert("Recarga registrada correctamente");
    } catch (error) {
      console.error("Error creando recarga:", error);
      alert("No se pudo registrar la recarga");
    }
  };

  const escaparHtmlTicket = (valor) =>
    String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const imprimirCierreCaja = (cierre) => {
    if (!cierre) {
      alert("No existen datos del cierre para imprimir.");
      return;
    }

    try {
      const cierreNativo = {
        tipo_documento: "CIERRE_CAJA",
        institucion:
          institucionActiva?.nombre ||
          cierre.institucion_nombre ||
          "POS NUBE",
        negocio: cierre.negocio || "POS NUBE",
        fecha: cierre.fecha || obtenerFechaEcuadorISO(),
        usuario:
          cierre.usuario_nombre ||
          cierre.usuario_correo ||
          usuario?.correo ||
          usuario?.nombre ||
          "Administrador",

        recargas_efectivo: Number(cierre.recargas_efectivo || 0),
        recargas_transferencia: Number(
          cierre.recargas_transferencia || 0
        ),
        ventas_efectivo: Number(cierre.ventas_efectivo || 0),
        ventas_transferencia: Number(
          cierre.ventas_transferencia || 0
        ),
        ventas_tarjeta: Number(cierre.ventas_tarjeta || 0),
        ventas_saldo: Number(cierre.ventas_saldo || 0),
        ventas_credito: Number(cierre.ventas_credito || 0),
        egresos_total: Number(cierre.egresos_total || 0),

        efectivo_contado: Number(cierre.efectivo_contado || 0),
        tarjeta_manual: Number(cierre.tarjeta_manual || 0),
        transferencia_manual: Number(
          cierre.transferencia_manual || 0
        ),

        diferencia_efectivo: Number(
          cierre.diferencia_efectivo || 0
        ),
        diferencia_tarjeta: Number(
          cierre.diferencia_tarjeta || 0
        ),
        diferencia_transferencia: Number(
          cierre.diferencia_transferencia || 0
        ),
        diferencia_general: Number(
          cierre.diferencia_general || 0
        ),

        observacion:
          cierre.observacion_automatica ||
          cierre.observacion ||
          "",

        denominaciones: Array.isArray(cierre.denominaciones)
          ? cierre.denominaciones.map((d) => ({
              tipo: d.tipo || "",
              denominacion: Number(d.denominacion || 0),
              cantidad: Number(d.cantidad || 0),
              total: Number(d.total || 0),
            }))
          : [],

        egresos: Array.isArray(cierre.egresos)
          ? cierre.egresos.map((e) => ({
              fecha: normalizarFechaISO(e.fecha),
              nombre:
                e.nombre_egreso ||
                e.nombre ||
                "Egreso",
              tipo: e.tipo_egreso || "",
              factura: e.numero_factura || "",
              total: Number(e.total || 0),
            }))
          : [],
      };

      if (
        window.POSNUBEPrinter &&
        typeof window.POSNUBEPrinter.imprimirTicket === "function"
      ) {
        window.POSNUBEPrinter.imprimirTicket(
          JSON.stringify(cierreNativo)
        );

        console.log(
          "Cierre enviado a impresora nativa iMin:",
          cierreNativo
        );
        return;
      }

      if (
        window.AndroidPrinter &&
        typeof window.AndroidPrinter.printTicket === "function"
      ) {
        window.AndroidPrinter.printTicket(
          JSON.stringify(cierreNativo)
        );
        return;
      }
    } catch (error) {
      console.error(
        "Error enviando cierre a impresora iMin:",
        error
      );
    }

    // ============================================================
    // IMPRESIÓN PC / NAVEGADOR
    // ============================================================
    // No usamos window.print() directamente sobre el modal porque el
    // detalle del cierre vive dentro de un contenedor fixed con scroll.
    // Chrome puede repetir la primera página en impresión dúplex.
    // En PC se crea un documento limpio y paginable exclusivamente
    // para impresión.
    try {
      const moneda = (valor) =>
        `$${Number(valor || 0).toFixed(2)}`;

      const filasResumen = [
        ["Fecha de cierre", formatearSoloFecha(cierre.fecha)],
        [
          "Unidad educativa",
          institucionActiva?.nombre ||
            cierre.institucion_nombre ||
            "POS NUBE",
        ],
        ["Negocio", cierre.negocio || "POS NUBE"],
        [
          "Usuario",
          cierre.usuario_nombre ||
            cierre.usuario_correo ||
            usuario?.correo ||
            usuario?.nombre ||
            "Administrador",
        ],
        ["Total recarga efectivo", moneda(cierre.recargas_efectivo)],
        [
          "Total recarga transferencia",
          moneda(cierre.recargas_transferencia),
        ],
        ["Total ventas por efectivo", moneda(cierre.ventas_efectivo)],
        [
          "Total ventas por transferencia",
          moneda(cierre.ventas_transferencia),
        ],
        ["Total ventas por tarjeta", moneda(cierre.ventas_tarjeta)],
        ["Egresos", moneda(cierre.egresos_total)],
        ["Efectivo entregado", moneda(cierre.efectivo_contado)],
        ["Tarjeta manual", moneda(cierre.tarjeta_manual)],
        [
          "Transferencia manual",
          moneda(cierre.transferencia_manual),
        ],
        [
          "Diferencia efectivo",
          moneda(cierre.diferencia_efectivo),
        ],
        ["Diferencia tarjeta", moneda(cierre.diferencia_tarjeta)],
        [
          "Diferencia transferencia",
          moneda(cierre.diferencia_transferencia),
        ],
        ["Diferencia general", moneda(cierre.diferencia_general)],
        [
          "Observación",
          cierre.observacion_automatica ||
            cierre.observacion ||
            "-",
        ],
      ];

      const resumenHtml = filasResumen
        .map(
          ([etiqueta, valor]) => `
            <div class="dato">
              <div class="etiqueta">${escaparHtml(etiqueta)}</div>
              <div class="valor">${escaparHtml(valor)}</div>
            </div>
          `
        )
        .join("");

      const denominacionesHtml = (
        Array.isArray(cierre.denominaciones)
          ? cierre.denominaciones
          : []
      )
        .map(
          (d) => `
            <tr>
              <td>${Number(d.denominacion || 0).toFixed(2)}</td>
              <td>${escaparHtml(d.tipo || "")}</td>
              <td>${Number(d.cantidad || 0)}</td>
              <td>${moneda(d.total)}</td>
            </tr>
          `
        )
        .join("");

      const egresosHtml = (
        Array.isArray(cierre.egresos)
          ? cierre.egresos
          : []
      )
        .map(
          (e) => `
            <tr>
              <td>${escaparHtml(formatearSoloFecha(e.fecha))}</td>
              <td>${escaparHtml(
                e.nombre_egreso || e.nombre || "Egreso"
              )}</td>
              <td>${escaparHtml(e.tipo_egreso || "")}</td>
              <td>${escaparHtml(e.numero_factura || "-")}</td>
              <td>${moneda(e.total)}</td>
              <td>${escaparHtml(
                e.usuario || e.usuario_nombre || "-"
              )}</td>
            </tr>
          `
        )
        .join("");

      const ventanaImpresion = window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

      if (!ventanaImpresion) {
        alert(
          "El navegador bloqueó la ventana de impresión. Permite ventanas emergentes para POS NUBE e intenta nuevamente."
        );
        return;
      }

      ventanaImpresion.document.open();
      ventanaImpresion.document.write(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Cierre de caja - ${escaparHtml(
              formatearSoloFecha(cierre.fecha)
            )}</title>
            <style>
              * {
                box-sizing: border-box;
              }

              html,
              body {
                margin: 0;
                padding: 0;
                background: #fff;
                color: #111827;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 11pt;
              }

              body {
                padding: 16mm 14mm;
              }

              h1 {
                margin: 0 0 18px;
                font-size: 23pt;
              }

              h2 {
                margin: 24px 0 10px;
                font-size: 15pt;
                page-break-after: avoid;
                break-after: avoid-page;
              }

              .resumen {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 8px;
              }

              .dato {
                border: 1px solid #d7dde5;
                border-radius: 6px;
                padding: 8px 9px;
                break-inside: avoid;
                page-break-inside: avoid;
              }

              .etiqueta {
                color: #64748b;
                font-size: 9.5pt;
                margin-bottom: 3px;
              }

              .valor {
                font-weight: 700;
                overflow-wrap: anywhere;
              }

              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: auto;
              }

              thead {
                display: table-header-group;
              }

              tfoot {
                display: table-footer-group;
              }

              tr {
                break-inside: avoid;
                page-break-inside: avoid;
              }

              th,
              td {
                border-bottom: 1px solid #e5e7eb;
                padding: 7px 6px;
                text-align: left;
                vertical-align: top;
                font-size: 10pt;
              }

              th {
                background: #f5f7fa;
                font-weight: 700;
              }

              .sin-registros {
                padding: 12px 6px;
              }

              @page {
                size: auto;
                margin: 12mm;
              }

              @media print {
                html,
                body {
                  width: auto !important;
                  height: auto !important;
                  overflow: visible !important;
                }

                body {
                  padding: 0;
                }

                .resumen,
                table,
                tbody {
                  overflow: visible !important;
                }
              }
            </style>
          </head>

          <body>
            <h1>Detalle de cierre de caja</h1>

            <section class="resumen">
              ${resumenHtml}
            </section>

            <h2>Conteo de billetes y monedas</h2>
            <table>
              <thead>
                <tr>
                  <th>Denominación</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${
                  denominacionesHtml ||
                  `
                    <tr>
                      <td colspan="4" class="sin-registros">
                        No se registraron denominaciones.
                      </td>
                    </tr>
                  `
                }
              </tbody>
            </table>

            <h2>Egresos incluidos en este cierre</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Factura</th>
                  <th>Valor</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                ${
                  egresosHtml ||
                  `
                    <tr>
                      <td colspan="6" class="sin-registros">
                        No hubo egresos activos en este cierre.
                      </td>
                    </tr>
                  `
                }
              </tbody>
            </table>
          </body>
        </html>
      `);
      ventanaImpresion.document.close();

      const ejecutarImpresion = () => {
        ventanaImpresion.focus();
        ventanaImpresion.print();

        ventanaImpresion.onafterprint = () => {
          ventanaImpresion.close();
        };
      };

      if (ventanaImpresion.document.readyState === "complete") {
        setTimeout(ejecutarImpresion, 250);
      } else {
        ventanaImpresion.onload = () => {
          setTimeout(ejecutarImpresion, 250);
        };
      }
    } catch (error) {
      console.error(
        "Error preparando impresión de cierre en PC:",
        error
      );
      alert(
        "No se pudo preparar la impresión del cierre. Intenta nuevamente."
      );
    }
  };

  const imprimirTicketVenta = (ticket) => {
    if (!ticket) {
      alert("No existen datos para imprimir el ticket.");
      return;
    }

    // ============================================================
    // IMPRESIÓN NATIVA iMIN
    // ============================================================
    // La APK POSNUBEPrinter expone el puente JavaScript:
    // window.POSNUBEPrinter.imprimirTicket(json)
    //
    // Si POS NUBE está abierto dentro del iMin, se imprime directamente
    // en la impresora térmica integrada. En PC/navegador normal se conserva
    // la impresión web que ya existía.
    try {
      const detalleNativo = Array.isArray(ticket.detalle)
        ? ticket.detalle
        : Array.isArray(ticket.productos)
        ? ticket.productos
        : Array.isArray(ticket.items)
        ? ticket.items
        : [];

      const ticketNativo = {
        institucion:
          ticket.institucion_nombre ||
          ticket.institucion ||
          institucionActiva?.nombre ||
          "POS NUBE",
        orden:
          ticket.id ||
          ticket.venta_id ||
          ticket.orden ||
          "",
        fecha:
          ticket.created_at ||
          ticket.fecha ||
          new Date().toISOString(),
        cliente:
          ticket.alumno_nombre ||
          ticket.profesor_nombre ||
          ticket.cliente ||
          "Consumidor final",
        cajero:
          ticket.cajero ||
          ticket.usuario_nombre ||
          ticket.usuario_correo ||
          usuario?.correo ||
          usuario?.nombre ||
          "Administrador",
        metodo_pago:
          ticket.metodo_pago ||
          ticket.forma_pago ||
          "EFECTIVO",
        total: Number(ticket.total || 0),
        subtotal: Number(
          ticket.subtotal !== undefined && ticket.subtotal !== null
            ? ticket.subtotal
            : ticket.total || 0
        ),
        observacion: ticket.observacion || "",
        saldo_anterior:
          ticket.saldo_anterior !== undefined
            ? ticket.saldo_anterior
            : null,
        saldo_restante:
          ticket.saldo_restante !== undefined
            ? ticket.saldo_restante
            : null,
        productos: detalleNativo.map((item) => {
          const cantidad = Number(item.cantidad || 0);
          const precio = Number(
            item.precio_unitario !== undefined
              ? item.precio_unitario
              : item.precio || 0
          );

          return {
            nombre:
              item.nombre ||
              item.producto_nombre ||
              item.descripcion ||
              "Producto",
            cantidad,
            precio,
            precio_unitario: precio,
            subtotal: Number(
              item.total !== undefined
                ? item.total
                : item.subtotal !== undefined
                ? item.subtotal
                : cantidad * precio
            ),
          };
        }),
      };

      if (
        window.POSNUBEPrinter &&
        typeof window.POSNUBEPrinter.imprimirTicket === "function"
      ) {
        window.POSNUBEPrinter.imprimirTicket(
          JSON.stringify(ticketNativo)
        );

        console.log(
          "Ticket enviado automáticamente a POSNUBEPrinter:",
          ticketNativo
        );

        return;
      }

      // Compatibilidad con una versión anterior del puente Android,
      // por si algún equipo todavía la tuviera instalada.
      if (
        window.AndroidPrinter &&
        typeof window.AndroidPrinter.printTicket === "function"
      ) {
        window.AndroidPrinter.printTicket(
          JSON.stringify(ticketNativo)
        );

        console.log(
          "Ticket enviado mediante puente Android anterior:",
          ticketNativo
        );

        return;
      }
    } catch (error) {
      console.error(
        "Error enviando ticket a la impresora iMin. Se usará impresión web:",
        error
      );
    }

    const items = Array.isArray(ticket.detalle) ? ticket.detalle : [];
    const institucionNombre =
      ticket.institucion_nombre ||
      institucionActiva?.nombre ||
      "POS NUBE";

    const alumnoNombre =
      ticket.alumno_nombre ||
      "Consumidor final";

    const fechaVenta = ticket.created_at
      ? new Date(ticket.created_at)
      : new Date();

    const filasProductos = items
      .map((item) => {
        const cantidad = Number(item.cantidad || 0);
        const precio = Number(item.precio_unitario || 0);
        const total = Number(item.total || cantidad * precio);

        return `
          <tr>
            <td class="producto">
              ${escaparHtmlTicket(item.nombre || item.producto_nombre || "Producto")}
              <div class="cantidad">${cantidad} x $${precio.toFixed(2)}</div>
            </td>
            <td class="valor">$${total.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    const mostrarSaldo =
      ticket.saldo_anterior !== null &&
      ticket.saldo_anterior !== undefined;

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ticket #${escaparHtmlTicket(ticket.id)}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 2mm;
            }

            html, body {
              width: 76mm;
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #000000;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 12px;
            }

            * {
              box-sizing: border-box;
            }

            .ticket {
              width: 72mm;
              margin: 0 auto;
              padding: 2mm 1mm 8mm;
            }

            .centrado {
              text-align: center;
            }

            .titulo {
              font-size: 18px;
              font-weight: 800;
              margin-bottom: 2px;
            }

            .institucion {
              font-size: 14px;
              font-weight: 700;
            }

            .separador {
              border-top: 1px dashed #000;
              margin: 7px 0;
            }

            .datos {
              line-height: 1.45;
            }

            table {
              width: 100%;
              border-collapse: collapse;
            }

            td {
              vertical-align: top;
              padding: 3px 0;
            }

            .producto {
              width: 74%;
              padding-right: 5px;
            }

            .cantidad {
              font-size: 10px;
            }

            .valor {
              width: 26%;
              text-align: right;
              white-space: nowrap;
            }

            .total {
              font-size: 18px;
              font-weight: 800;
            }

            .pie {
              margin-top: 8px;
              text-align: center;
              line-height: 1.4;
            }

            @media print {
              .ticket {
                page-break-after: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="centrado">
              <div class="titulo">POS NUBE</div>
              <div class="institucion">${escaparHtmlTicket(institucionNombre)}</div>
            </div>

            <div class="separador"></div>

            <div class="datos">
              <div><strong>Orden:</strong> #${escaparHtmlTicket(ticket.id)}</div>
              <div><strong>Fecha:</strong> ${escaparHtmlTicket(
                fechaVenta.toLocaleString("es-EC")
              )}</div>
              <div><strong>Cliente:</strong> ${escaparHtmlTicket(alumnoNombre)}</div>
              ${
                ticket.alumno_codigo
                  ? `<div><strong>Cédula/Código:</strong> ${escaparHtmlTicket(
                      ticket.alumno_codigo
                    )}</div>`
                  : ""
              }
              <div><strong>Cajero:</strong> ${escaparHtmlTicket(
                usuario?.correo || usuario?.nombre || "Administrador"
              )}</div>
            </div>

            <div class="separador"></div>

            <table>
              <tbody>
                ${filasProductos}
              </tbody>
            </table>

            <div class="separador"></div>

            <table>
              <tbody>
                <tr>
                  <td><strong>Subtotal</strong></td>
                  <td class="valor">$${Number(ticket.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td class="total">TOTAL</td>
                  <td class="valor total">$${Number(ticket.total || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td><strong>Forma de pago</strong></td>
                  <td class="valor">${escaparHtmlTicket(
                    ticket.metodo_pago === "SALDO"
                      ? "SALDO DEL ALUMNO"
                      : ticket.metodo_pago || "EFECTIVO"
                  )}</td>
                </tr>
                ${
                  mostrarSaldo
                    ? `
                      <tr>
                        <td><strong>Saldo anterior</strong></td>
                        <td class="valor">$${Number(ticket.saldo_anterior || 0).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td><strong>Saldo restante</strong></td>
                        <td class="valor">$${Number(ticket.saldo_restante || 0).toFixed(2)}</td>
                      </tr>
                    `
                    : ""
                }
              </tbody>
            </table>

            ${
              ticket.observacion
                ? `
                  <div class="separador"></div>
                  <div><strong>Observación:</strong> ${escaparHtmlTicket(
                    ticket.observacion
                  )}</div>
                `
                : ""
            }

            <div class="separador"></div>

            <div class="pie">
              Gracias por su compra
              <br />
              Conserve este comprobante
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Impresión de ticket");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";

    document.body.appendChild(iframe);

    const documento = iframe.contentWindow?.document;

    if (!documento || !iframe.contentWindow) {
      document.body.removeChild(iframe);
      alert("No se pudo abrir el servicio de impresión.");
      return;
    }

    documento.open();
    documento.write(html);
    documento.close();

    const ejecutarImpresion = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (error) {
        console.error("Error imprimiendo ticket:", error);
        alert(
          "La venta quedó guardada, pero no se pudo iniciar la impresión. Puedes reimprimirla desde Consultar ventas."
        );
      } finally {
        window.setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 2500);
      }
    };

    window.setTimeout(ejecutarImpresion, 450);
  };

  const obtenerTicketVenta = async (ventaId) => {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      throw new Error("Sesión o institución no válida");
    }

    const respuesta = await fetch(
      `${API_URL}/api/ventas/${ventaId}/ticket?institucion_id=${institucionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        data.message ||
          data.error ||
          "No se pudo obtener el ticket"
      );
    }

    return data.ticket || data;
  };

  const reimprimirTicketVenta = async (venta) => {
    try {
      const ticket = await obtenerTicketVenta(venta.id);
      imprimirTicketVenta(ticket);
    } catch (error) {
      console.error("Error reimprimiendo ticket:", error);
      alert(error.message || "No se pudo reimprimir el ticket.");
    }
  };

  const crearVenta = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    if (!token || !institucionId) {
      alert("Sesión o institución no válida");
      return;
    }

    const itemsLimpios = ventaItems
      .map((item) => ({
        producto_id: Number(item.producto_id),
        cantidad: Number(item.cantidad || 0),
      }))
      .filter(
        (item) =>
          item.producto_id > 0 &&
          item.cantidad > 0
      );

    if (itemsLimpios.length === 0) {
      alert("Debes agregar al menos un producto válido");
      return;
    }

    // Validar stock
    for (const item of itemsLimpios) {
      const producto = productosActivos.find(
        (p) => Number(p.id) === Number(item.producto_id)
      );

      if (!producto) {
        alert("Uno de los productos ya no existe.");
        return;
      }

      const stockDisponible = stockProductoEnPunto(
        producto.id,
        localNuevaOrden
      );

      if (item.cantidad > stockDisponible) {
        alert(
          `${producto.nombre}: solo hay ${stockDisponible} unidades disponibles`
        );
        return;
      }
    }

    const pagaConSaldo =
      ventaForm.metodo_pago === "RECARGA";
    const pagaConCredito =
      ventaForm.metodo_pago === "CREDITO";
    const pagaConCreditoProfesor =
      ventaForm.metodo_pago === "CREDITO_PROFESOR";
    const requiereAlumno = pagaConSaldo || pagaConCredito;

    if (requiereAlumno && !ventaForm.alumno_id) {
      alert("Debes seleccionar un alumno.");
      return;
    }

    // Validar saldo
    if (pagaConSaldo && alumnoVentaSeleccionado) {
      const saldo = Number(
        alumnoVentaSeleccionado.saldo || 0
      );

      if (totalVentaCalculado > saldo) {
        alert(
          `Saldo insuficiente.\nDisponible: ${formatearMoneda(
            saldo
          )}`
        );
        return;
      }
    }

    if (pagaConCreditoProfesor) {
      if (!ventaForm.profesor_id || !profesorVentaSeleccionado) {
        alert("Debes seleccionar un profesor.");
        return;
      }

      if (profesorVentaSeleccionado.credito_habilitado !== true) {
        alert("El crédito no está habilitado para este profesor. Debe autorizarlo un administrador.");
        return;
      }

      const disponible = Number(
        profesorVentaSeleccionado.saldo || 0
      );

      if (totalVentaCalculado > disponible) {
        alert(
          `Crédito insuficiente.
Disponible: ${formatearMoneda(
            disponible
          )}`
        );
        return;
      }
    }

    if (pagaConCredito && alumnoVentaSeleccionado) {
      const habilitado =
        alumnoVentaSeleccionado.credito_habilitado === true;
      const limite = Number(
        alumnoVentaSeleccionado.limite_credito || 0
      );
      const utilizado = Number(
        alumnoVentaSeleccionado.credito_utilizado || 0
      );
      const disponible = Math.max(0, limite - utilizado);

      if (!habilitado) {
        alert("El crédito no está habilitado para este alumno.");
        return;
      }

      if (totalVentaCalculado > disponible) {
        alert(
          `Crédito insuficiente.
Disponible: ${formatearMoneda(
            disponible
          )}`
        );
        return;
      }
    }

    const payload = {
      institucion_id: Number(institucionId),
      alumno_id: requiereAlumno
        ? Number(ventaForm.alumno_id)
        : null,
      profesor_id: pagaConCreditoProfesor
        ? Number(ventaForm.profesor_id)
        : null,
      metodo_pago: pagaConSaldo
        ? "SALDO"
        : pagaConCredito
        ? "CREDITO"
        : pagaConCreditoProfesor
        ? "CREDITO_PROFESOR"
        : ventaForm.metodo_pago,
      items: itemsLimpios,
      observacion:ventaForm.observacion?.trim()||"",
      ubicacion:localNuevaOrden||"PRINCIPAL",
      jornada_id:Number(jornadaActiva?.id),
    };

    const res = await fetch(`${API_URL}/api/ventas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(
        data.error ||
          data.message ||
          "Error creando venta"
      );
      return;
    }

    // ============================================================
    // IMPRESIÓN AUTOMÁTICA DESPUÉS DE CONFIRMAR LA VENTA
    // ============================================================
    // Nunca se intenta imprimir antes de que el backend confirme la venta.
    // Si el POST ya devuelve ticket, se usa directamente.
    // Si no lo devuelve, se consulta por el ID recién creado.
    let ticketVenta = data.ticket || null;

    if (!ticketVenta) {
      const ventaIdCreada =
        data.venta?.id ||
        data.id ||
        data.venta_id ||
        data.ventaId ||
        null;

      if (ventaIdCreada) {
        try {
          ticketVenta = await obtenerTicketVenta(ventaIdCreada);
        } catch (errorTicket) {
          console.error(
            "Venta guardada, pero no se pudo obtener el ticket para imprimir:",
            errorTicket
          );
        }
      }
    }

    // Si el backend no devuelve un ticket completo, construimos uno aquí
    // usando exactamente los datos de la orden que YA fue confirmada.
    // Así la impresión del iMin no depende del formato de respuesta del backend.
    if (!ticketVenta) {
      const nombreAlumno = alumnoVentaSeleccionado
        ? `${alumnoVentaSeleccionado.nombres || ""} ${
            alumnoVentaSeleccionado.apellidos || ""
          }`.trim()
        : "";

      const nombreProfesor = profesorVentaSeleccionado
        ? `${profesorVentaSeleccionado.nombres || ""} ${
            profesorVentaSeleccionado.apellidos || ""
          }`.trim()
        : "";

      const detalleLocal = itemsLimpios.map((item) => {
        const producto = productosActivos.find(
          (p) => Number(p.id) === Number(item.producto_id)
        );

        const cantidad = Number(item.cantidad || 0);
        const precio = Number(producto?.precio || 0);

        return {
          producto_id: item.producto_id,
          nombre: producto?.nombre || `Producto #${item.producto_id}`,
          producto_nombre: producto?.nombre || `Producto #${item.producto_id}`,
          cantidad,
          precio,
          precio_unitario: precio,
          subtotal: cantidad * precio,
          total: cantidad * precio,
        };
      });

      const saldoAnteriorAlumno = Number(
        alumnoVentaSeleccionado?.saldo || 0
      );

      ticketVenta = {
        id:
          data.venta?.id ||
          data.id ||
          data.venta_id ||
          data.ventaId ||
          "",
        institucion_nombre:
          institucionActiva?.nombre || "POS NUBE",
        fecha: new Date().toISOString(),
        alumno_nombre:
          nombreAlumno ||
          nombreProfesor ||
          "Consumidor final",
        cliente:
          nombreAlumno ||
          nombreProfesor ||
          "Consumidor final",
        metodo_pago: payload.metodo_pago,
        total: Number(totalVentaCalculado || 0),
        subtotal: Number(totalVentaCalculado || 0),
        observacion: payload.observacion || "",
        detalle: detalleLocal,
        productos: detalleLocal,
        saldo_anterior:
          pagaConSaldo && alumnoVentaSeleccionado
            ? saldoAnteriorAlumno
            : undefined,
        saldo_restante:
          pagaConSaldo && alumnoVentaSeleccionado
            ? Math.max(
                0,
                saldoAnteriorAlumno -
                  Number(totalVentaCalculado || 0)
              )
            : undefined,
      };

      console.log(
        "Ticket construido localmente para impresión:",
        ticketVenta
      );
    }

    // La impresión se intenta siempre después de que el backend confirmó la venta.
    imprimirTicketVenta(ticketVenta);

    // Actualizar datos
    await Promise.all([
      cargarVentas(),
      cargarProductos(),
      cargarExistenciasInventario(),
      cargarAlumnos(),
      cargarResumen(),
    ]);

    // Si la venta fue iniciada desde la ficha del alumno,
    // conservamos el comportamiento existente y regresamos a su ficha.
    if (
      alumnoDetalle &&
      Number(alumnoDetalle.id) ===
        Number(ventaForm.alumno_id)
    ) {
      setAlumnoDetalle((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          saldo:
            pagaConSaldo
              ? Math.max(
                  0,
                  Number(prev.saldo || 0) -
                    Number(totalVentaCalculado || 0)
                )
              : Number(prev.saldo || 0),
          credito_utilizado:
            pagaConCredito
              ? Number(prev.credito_utilizado || 0) +
                Number(totalVentaCalculado || 0)
              : Number(prev.credito_utilizado || 0),
        };
      });

      setVista("alumnos");
      setVistaAlumnoDetalle("datos");
      limpiarFormularioVenta();
    } else {
      // FLUJO RÁPIDO DE CAJA:
      // después de guardar/imprimir una orden normal,
      // limpiar todo y dejar inmediatamente otra Nueva Orden lista.
      limpiarFormularioVenta();
      setVista("ventas");
      setVistaVentasInterna("registrar");
      setBusquedaUsuarioNuevaOrden("");
      setBusquedaProductoNuevaOrden("");
      setCodigoBarraNuevaOrden("");
      setCategoriaNuevaOrden("TODOS");
      setModoNuevaOrden("consumidor_final");
      setTipoUsuarioNuevaOrden("TODOS");
    }

    alert("Venta registrada correctamente. Nueva orden lista.");
  } catch (error) {
    console.error("Error creando venta:", error);
    alert("No se pudo registrar la venta");
  }
};

  useEffect(() => {
    if (usuario) {
      setCuentaForm((prev) => ({
        ...prev,
        correo: usuario.correo || "",
      }));
    }
  }, [usuario]);

  useEffect(() => {
    const id = normalizarInstitucionId(usuario?.institucion_id);

    if (id) {
      setInstitucionSeleccionadaId(id);
      localStorage.setItem("institucionSeleccionadaId", String(id));
    }
  }, [usuario]);

  useEffect(() => {
    if (esRolPortal) return;

    const actualizarBancos = () => {
      cargarCuentasBancarias();
    };

    window.addEventListener(
      "posnube:bancos-actualizados",
      actualizarBancos
    );

    return () => {
      window.removeEventListener(
        "posnube:bancos-actualizados",
        actualizarBancos
      );
    };
  }, [usuario, institucionSeleccionadaId]);

  useEffect(() => {
    if (usuario && !esRolPortal) {
      cargarResumen();
      cargarProductos();
      cargarAlumnos();
      cargarProfesores();
      cargarRecargas();
      cargarCuentasBancarias();
      cargarVentas();
    }
  }, [usuario, institucionSeleccionadaId]);

 useEffect(() => {
  if (!usuario || esRolPortal) return;

  if (vista === "productos" || vista === "ventas") {
    cargarProductos();
  }

  if (vista === "inventario") {
    cargarExistenciasInventario();
  }

  if (vista === "alumnos" || vista === "recargas" || vista === "ventas") {
    cargarAlumnos();

    if (vista === "alumnos") {
      cargarCuentasBancarias();
    }
  }

  if (vista === "profesores") {
    cargarProfesores();
  }

  if (vista === "dashboard" || vista === "reportes") {
    cargarResumen();
  }

  if (vista === "recargas" || vista === "reportes") {
    cargarRecargas();
    cargarCuentasBancarias();
  }

  if (
    vista === "ventas" ||
    vista === "reportes" ||
    vista === "reporte_productos" ||
    vista === "reporte_productos_dia"
  ) {
    cargarVentas();
  }

  if (
    vista === "reporte_productos" ||
    vista === "reporte_productos_dia"
  ) {
    cargarProductos();
  }

  // 🔵 abrir menú comidas
  if (vista === "productos" || vista === "inventario") {
    setMenuComidasAbierto(true);
  }

  // 🔵 abrir menú ventas
  if (vista === "ventas") {
    setMenuVentasAbierto(true);
  }

  // 🔵 abrir menú reportes
  if (
    vista === "reportes" ||
    vista === "reporte_cierre" ||
    vista === "reporte_productos" ||
    vista === "reporte_productos_dia"
  ) {
    setMenuReportesAbierto(true);
  }

}, [vista]);

  const cargarEgresos = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      if (!token || !institucionId) return;

      const params = new URLSearchParams({
        institucion_id: String(institucionId),
      });
      if (egresosFiltros.fecha_inicio) params.set("fecha_inicio", egresosFiltros.fecha_inicio);
      if (egresosFiltros.fecha_fin) params.set("fecha_fin", egresosFiltros.fecha_fin);

      const respuesta = await fetch(`${API_URL}/api/egresos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudieron cargar los egresos");
      setEgresosDiarios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando egresos:", error);
      alert(error.message || "No se pudieron cargar los egresos.");
    }
  };

  const guardarEgreso = async () => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const total = Number(egresoForm.total || 0);
      if (!institucionId || !token) throw new Error("Sesión inválida");
      if (!egresoForm.fecha || !egresoForm.nombre_egreso || total <= 0) {
        alert("Fecha, nombre del egreso y total mayor a cero son obligatorios.");
        return;
      }

      const url = editandoEgresoId
        ? `${API_URL}/api/egresos/${editandoEgresoId}`
        : `${API_URL}/api/egresos`;
      const respuesta = await fetch(url, {
        method: editandoEgresoId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...egresoForm,
          institucion_id: Number(institucionId),
          total,
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo guardar el egreso");

      setEgresoForm({
        negocio: "", usuario: "", fecha: "", nombre_egreso: "", total: "",
        descripcion: "", estado: "ACTIVO", numero_factura: "", tipo_egreso: "Efectivo",
      });
      setEditandoEgresoId(null);
      setMostrarCrearEgreso(false);
      await cargarEgresos();
      alert(editandoEgresoId ? "Egreso actualizado correctamente." : "Egreso guardado correctamente.");
    } catch (error) {
      console.error("Error guardando egreso:", error);
      alert(error.message || "No se pudo guardar el egreso.");
    }
  };

  const eliminarEgreso = async (egreso) => {
    if (!window.confirm("¿Deseas eliminar este egreso?")) return;
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(`${API_URL}/api/egresos/${egreso.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ institucion_id: Number(institucionId) }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo eliminar");
      await cargarEgresos();
    } catch (error) {
      alert(error.message || "No se pudo eliminar el egreso.");
    }
  };

  const cargarResumenCierre = async (fecha = cierreForm.fecha) => {
    if (!fecha) return;
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(
        `${API_URL}/api/cierres/resumen?institucion_id=${institucionId}&fecha=${fecha}&jornada_id=${Number(jornadaActiva?.id || 0)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo calcular el cierre");
      setResumenCierreServidor(data);
    } catch (error) {
      console.error("Error cargando resumen de cierre:", error);
      alert(error.message || "No se pudo calcular el cierre.");
    }
  };

  const cargarCierres = async () => {
    try {
      setCargandoCierres(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const params = new URLSearchParams({ institucion_id: String(institucionId) });
      if (cierreCajaFiltros.fecha_inicio) params.set("fecha_inicio", cierreCajaFiltros.fecha_inicio);
      if (cierreCajaFiltros.fecha_fin) params.set("fecha_fin", cierreCajaFiltros.fecha_fin);
      const respuesta = await fetch(`${API_URL}/api/cierres?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudieron cargar los cierres");
      setCierresCaja(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando cierres:", error);
      alert(error.message || "No se pudieron cargar los cierres.");
    } finally {
      setCargandoCierres(false);
    }
  };

  const totalEfectivoContado = useMemo(() => {
    const d = cierreForm.denominaciones || {};
    return (
      Number(d.billete_1 || 0) * 1 + Number(d.billete_2 || 0) * 2 +
      Number(d.billete_5 || 0) * 5 + Number(d.billete_10 || 0) * 10 +
      Number(d.billete_20 || 0) * 20 + Number(d.billete_50 || 0) * 50 +
      Number(d.billete_100 || 0) * 100 + Number(d.moneda_001 || 0) * 0.01 +
      Number(d.moneda_005 || 0) * 0.05 + Number(d.moneda_010 || 0) * 0.10 +
      Number(d.moneda_025 || 0) * 0.25 + Number(d.moneda_050 || 0) * 0.50 +
      Number(d.moneda_1 || 0) * 1
    );
  }, [cierreForm.denominaciones]);

  const guardarCierre = async () => {
    try {
      setGuardandoCierre(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      if (!cierreForm.fecha) return alert("Selecciona la fecha del cierre.");
      const respuesta = await fetch(`${API_URL}/api/cierres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id: Number(institucionId),
          jornada_id: Number(jornadaActiva?.id || 0),
          fecha: cierreForm.fecha,
          negocio: cierreForm.negocio || "POS NUBE",
          efectivo_contado: totalEfectivoContado,
          tarjeta_manual: Number(cierreForm.tarjeta_manual || 0),
          transferencia_manual: Number(cierreForm.transferencia_manual || 0),
          observacion: cierreForm.observacion || "",
          denominaciones: cierreForm.denominaciones,
        }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) {
        throw new Error(
          data.error ||
            data.message ||
            "No se pudo guardar el cierre"
        );
      }
      setMostrarCrearCierre(false);
      setCierreDetalle(data.cierre || null);
      await cargarCierres();
      alert(
        "Cierre de caja guardado correctamente. El próximo cierre comenzará desde este momento."
      );
    } catch (error) {
      console.error("Error guardando cierre:", error);
      alert(error.message || "No se pudo guardar el cierre.");
    } finally {
      setGuardandoCierre(false);
    }
  };

  const verCierreConsolidado = async () => {
    try {
      setCargandoConsolidado(true);
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const fecha = cierreCajaFiltros.fecha_fin || obtenerFechaEcuadorISO();

      const respuesta = await fetch(
        `${API_URL}/api/cierres/consolidado?institucion_id=${institucionId}&fecha=${fecha}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          data.message || data.error || "No se pudo calcular el cierre total"
        );
      }

      setCierreConsolidado(data);
    } catch (error) {
      console.error("Error cargando cierre total:", error);
      alert(error.message || "No se pudo calcular el cierre total.");
    } finally {
      setCargandoConsolidado(false);
    }
  };

  const verCierre = async (cierre) => {
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(
        `${API_URL}/api/cierres/${cierre.id}?institucion_id=${institucionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo abrir el cierre");
      setCierreDetalle(data);
    } catch (error) {
      alert(error.message || "No se pudo abrir el cierre.");
    }
  };

  const eliminarCierre = async (cierre) => {
    if (!window.confirm("¿Deseas eliminar este cierre? Las ventas, recargas y egresos no serán eliminados.")) return;
    try {
      const token = localStorage.getItem("token");
      const institucionId = obtenerInstitucionActivaId();
      const respuesta = await fetch(`${API_URL}/api/cierres/${cierre.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ institucion_id: Number(institucionId) }),
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.message || data.error || "No se pudo eliminar el cierre");
      await cargarCierres();
    } catch (error) {
      alert(error.message || "No se pudo eliminar el cierre.");
    }
  };

  useEffect(() => {
    if (!usuario || !institucionActivaId) return;
    if (vista === "egresos_diarios") cargarEgresos();
    if (vista === "reporte_cierre") cargarCierres();
  }, [vista, institucionActivaId]);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("institucionSeleccionadaId");
    localStorage.removeItem("jornadaActiva");
    setUsuario(null);
    setJornadaActiva(null);setPuntosOperacion([]);setMostrarSelectorJornada(false);
    setResumen(null);
    setProductos([]);
    setAlumnos([]);
    setProfesores([]);
    setProfesorDetalle(null);
    setCreditosProfesores([]);
    setRecargas([]);
    setVentas([]);
    setCorreo("");
    setPassword("");
    setMensaje("");
    setVista("dashboard");
    setInstitucionSeleccionadaId(null);
    setVistaVentasInterna("consultar");
    setVistaRecargasInterna("lista");
    limpiarFormularioAlumno();
    limpiarFormularioProducto();
    limpiarFormularioRecarga();
    limpiarFormularioVenta();
    limpiarFiltrosVentas();
    limpiarFiltrosRecargas();
    limpiarFiltrosCierreCaja();
  };

const esConsultaPublicaAlumno =
  new URLSearchParams(window.location.search).get("consulta") === "alumno";

if (esConsultaPublicaAlumno) {
  return <ConsultaAlumnoPublica API_URL={API_URL} />;
}

if (!usuario) {
  return (
    <div style={styles.page}>
      <div style={styles.loginCard}>
        {!mostrarCambiarAcceso && !mostrarCrearCuenta ? (
          <>
            <h1 style={styles.title}>¡Bienvenido a POSNUBE!</h1>
            <p style={styles.subtitle}>
              Selecciona la institución e inicia sesión.
            </p>

            <form onSubmit={handleLogin} style={styles.form}>
              <label style={styles.label}>Institución</label>
              <select
                value={loginInstitucionId}
                onChange={(e) => setLoginInstitucionId(e.target.value)}
                style={styles.input}
                required
              >
                <option value="">Seleccione una institución</option>
                {INSTITUCIONES.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                style={styles.input}
                required
              />

              <label style={styles.label}>Contraseña</label>
              <div style={styles.passwordWrap}>
                <input
  type={verPasswordLogin ? "text" : "password"}
  placeholder="Contraseña"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  style={styles.inputPassword}
  required
/>
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordLogin(!verPasswordLogin)}
                >
                  {verPasswordLogin ? "Ocultar" : "Ver"}
                </button>
              </div>

              <div style={styles.loginExtraRow}>
                <button
                  type="button"
                  style={styles.linkButton}
                  onClick={() => {
                    setMostrarCambiarAcceso(true);
                    setMostrarCrearCuenta(false);
                  }}
                >
                  Cambiar usuario / contraseña
                </button>

                <button
                  type="button"
                  style={styles.linkButton}
                  onClick={() => {
                    setMostrarCrearCuenta(true);
                    setMostrarCambiarAcceso(false);
                  }}
                >
                  Crear cuenta
                </button>
              </div>

              <button type="submit" style={styles.button} disabled={cargando}>
                {cargando ? "Ingresando..." : "Iniciar sesión"}
              </button>
            </form>

            {mensaje && <p style={styles.message}>{mensaje}</p>}
          </>
        ) : mostrarCambiarAcceso ? (
          <>
            <h1 style={styles.title}>Cambiar acceso</h1>

            <form onSubmit={handleCambiarAcceso} style={styles.form}>
              <select
                value={cambiarAccesoForm.institucion_id}
                onChange={(e) =>
                  setCambiarAccesoForm({
                    ...cambiarAccesoForm,
                    institucion_id: e.target.value,
                  })
                }
                style={styles.input}
                required
              >
                <option value="">Seleccione institución</option>
                {INSTITUCIONES.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre}
                  </option>
                ))}
              </select>

              <input
                type="email"
                placeholder="Correo actual"
                value={cambiarAccesoForm.correo_actual}
                onChange={(e) =>
                  setCambiarAccesoForm({
                    ...cambiarAccesoForm,
                    correo_actual: e.target.value,
                  })
                }
                style={styles.input}
                required
              />

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordActual ? "text" : "password"}
                  placeholder="Contraseña actual"
                  value={cambiarAccesoForm.password_actual}
                  onChange={(e) =>
                    setCambiarAccesoForm({
                      ...cambiarAccesoForm,
                      password_actual: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordActual(!verPasswordActual)}
                >
                  {verPasswordActual ? "Ocultar" : "Ver"}
                </button>
              </div>

              <input
                type="email"
                placeholder="Nuevo correo"
                value={cambiarAccesoForm.nuevo_correo}
                onChange={(e) =>
                  setCambiarAccesoForm({
                    ...cambiarAccesoForm,
                    nuevo_correo: e.target.value,
                  })
                }
                style={styles.input}
                required
              />

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordNueva ? "text" : "password"}
                  placeholder="Nueva contraseña"
                  value={cambiarAccesoForm.nueva_password}
                  onChange={(e) =>
                    setCambiarAccesoForm({
                      ...cambiarAccesoForm,
                      nueva_password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordNueva(!verPasswordNueva)}
                >
                  {verPasswordNueva ? "Ocultar" : "Ver"}
                </button>
              </div>

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordConfirmar ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  value={cambiarAccesoForm.confirmar_password}
                  onChange={(e) =>
                    setCambiarAccesoForm({
                      ...cambiarAccesoForm,
                      confirmar_password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() =>
                    setVerPasswordConfirmar(!verPasswordConfirmar)
                  }
                >
                  {verPasswordConfirmar ? "Ocultar" : "Ver"}
                </button>
              </div>

              <button
                type="submit"
                style={styles.button}
                disabled={cargandoCambiarAcceso}
              >
                {cargandoCambiarAcceso ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={() => {
                  setMostrarCambiarAcceso(false);
                  setMensajeCambiarAcceso("");
                }}
              >
                Volver
              </button>
            </form>

            {mensajeCambiarAcceso && (
              <p style={styles.message}>{mensajeCambiarAcceso}</p>
            )}
          </>
        ) : (
          <>
            <h1 style={styles.title}>Crear cuenta</h1>

            <form onSubmit={handleCrearCuenta} style={styles.form}>
              <select
                value={crearCuentaForm.institucion_id}
                onChange={(e) =>
                  setCrearCuentaForm({
                    ...crearCuentaForm,
                    institucion_id: e.target.value,
                  })
                }
                style={styles.input}
                required
              >
                <option value="">Seleccione institución</option>
                {INSTITUCIONES.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.nombre}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Nombre"
                value={crearCuentaForm.nombre}
                onChange={(e) =>
                  setCrearCuentaForm({
                    ...crearCuentaForm,
                    nombre: e.target.value,
                  })
                }
                style={styles.input}
                required
              />

              <input
                type="email"
                placeholder="Correo"
                value={crearCuentaForm.correo}
                onChange={(e) =>
                  setCrearCuentaForm({
                    ...crearCuentaForm,
                    correo: e.target.value,
                  })
                }
                style={styles.input}
                required
              />

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordNueva ? "text" : "password"}
                  placeholder="Contraseña"
                  value={crearCuentaForm.password}
                  onChange={(e) =>
                    setCrearCuentaForm({
                      ...crearCuentaForm,
                      password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() => setVerPasswordNueva(!verPasswordNueva)}
                >
                  {verPasswordNueva ? "Ocultar" : "Ver"}
                </button>
              </div>

              <div style={styles.passwordWrap}>
                <input
                  type={verPasswordConfirmar ? "text" : "password"}
                  placeholder="Confirmar contraseña"
                  value={crearCuentaForm.confirmar_password}
                  onChange={(e) =>
                    setCrearCuentaForm({
                      ...crearCuentaForm,
                      confirmar_password: e.target.value,
                    })
                  }
                  style={styles.inputPassword}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeButton}
                  onClick={() =>
                    setVerPasswordConfirmar(!verPasswordConfirmar)
                  }
                >
                  {verPasswordConfirmar ? "Ocultar" : "Ver"}
                </button>
              </div>

              <button
                type="submit"
                style={styles.button}
                disabled={cargandoCrearCuenta}
              >
                {cargandoCrearCuenta ? "Creando..." : "Crear cuenta"}
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={() => {
                  setMostrarCrearCuenta(false);
                  setMensajeCrearCuenta("");
                }}
              >
                Volver
              </button>
            </form>

            {mensajeCrearCuenta && (
              <p style={styles.message}>{mensajeCrearCuenta}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

  if (esRolPortal) {
    return (
      <PortalUsuarioModulo
        API_URL={API_URL}
        usuario={usuario}
        onCerrarSesion={cerrarSesion}
      />
    );
  }

  return (
    <div style={styles.appShell}>
      {mostrarSelectorJornada&&<div
        style={{
          position:"fixed",
          inset:0,
          zIndex:200000,
          background:"rgba(15,23,42,.72)",
          display:"flex",
          alignItems:"center",
          justifyContent:"center",
          padding:20,
          overflowY:"auto",
        }}
      >
        <div
          style={{
            width:"min(600px,96vw)",
            background:"#fff",
            borderRadius:18,
            padding:28,
            boxShadow:"0 25px 70px rgba(0,0,0,.35)",
            maxHeight:"94vh",
            overflowY:"auto",
          }}
        >
          <h2 style={{margin:0,fontSize:28}}>Iniciar jornada</h2>

          <p style={{color:"#64748b",lineHeight:1.5}}>
            Selecciona la ubicación e identifica al <strong>operador que
            realmente trabajará en este punto</strong>. Debe ingresar su propio
            usuario/correo y contraseña.
          </p>

          <div
            style={{
              marginTop:12,
              padding:12,
              borderRadius:10,
              background:"#fff7ed",
              color:"#9a3412",
              fontSize:13,
              lineHeight:1.5,
            }}
          >
            Por seguridad, cada vez que POS NUBE se abre o se actualiza,
            el operador debe volver a validar sus credenciales para continuar
            la jornada del punto.
          </div>

          <div style={{...styles.filterField,marginTop:18}}>
            <label style={styles.label}>Punto de trabajo *</label>
            <select
              style={{...styles.input,marginTop:8}}
              value={puntoJornadaSeleccionado}
              onChange={(e)=>setPuntoJornadaSeleccionado(e.target.value)}
            >
              <option value="">Seleccionar punto</option>
              {obtenerPuntosJornadaDisponibles()
                .map((p)=>(
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </select>
          </div>

          <div style={{...styles.filterField,marginTop:14}}>
            <label style={styles.label}>Usuario / correo del operador *</label>
            <input
              type="email"
              style={styles.input}
              value={operadorJornadaCorreo}
              onChange={(e)=>setOperadorJornadaCorreo(e.target.value)}
              placeholder="operador@institucion.com"
              autoComplete="username"
            />
          </div>

          <div style={{...styles.filterField,marginTop:14}}>
            <label style={styles.label}>Contraseña del operador *</label>

            <div style={styles.passwordWrap}>
              <input
                type={verPasswordOperadorJornada?"text":"password"}
                style={styles.inputPassword}
                value={operadorJornadaPassword}
                onChange={(e)=>setOperadorJornadaPassword(e.target.value)}
                placeholder="Contraseña"
                autoComplete="current-password"
                onKeyDown={(e)=>{
                  if(e.key==="Enter"){
                    e.preventDefault();
                    abrirJornada();
                  }
                }}
              />

              <button
                type="button"
                style={styles.eyeButton}
                onClick={()=>setVerPasswordOperadorJornada((v)=>!v)}
              >
                {verPasswordOperadorJornada?"Ocultar":"Ver"}
              </button>
            </div>
          </div>

          <div
            style={{
              display:"flex",
              gap:10,
              marginTop:12,
              flexWrap:"wrap",
            }}
          >
            <button
              type="button"
              style={styles.linkButton}
              onClick={()=>{
                setOperadorJornadaCorreo("");
                setOperadorJornadaPassword("");
              }}
            >
              Cambiar operador
            </button>

            <button
              type="button"
              style={styles.linkButton}
              onClick={()=>{
                setCambiarAccesoForm({
                  institucion_id:String(obtenerInstitucionActivaId()||""),
                  correo_actual:operadorJornadaCorreo||"",
                  password_actual:"",
                  nuevo_correo:operadorJornadaCorreo||"",
                  nueva_password:"",
                  confirmar_password:"",
                });
                setMostrarEditarAccesoJornada((v)=>!v);
              }}
            >
              Cambiar usuario / contraseña
            </button>

            {["SUPER_ADMIN","ADMIN"].includes(rolActual)&&(
              <button
                type="button"
                style={styles.linkButton}
                onClick={()=>{
                  setMostrarSelectorJornada(false);
                  setVista("configuracion");
                }}
              >
                Administrar usuarios
              </button>
            )}
          </div>

          {mostrarEditarAccesoJornada&&(
            <form
              onSubmit={async(e)=>{
                await handleCambiarAcceso(e);
              }}
              style={{
                marginTop:18,
                padding:16,
                border:"1px solid #dbeafe",
                borderRadius:12,
                background:"#f8fbff",
              }}
            >
              <h3 style={{margin:"0 0 12px"}}>Cambiar acceso del operador</h3>

              <input
                type="hidden"
                value={cambiarAccesoForm.institucion_id}
                readOnly
              />

              <div style={styles.filterField}>
                <label style={styles.label}>Correo actual</label>
                <input
                  type="email"
                  style={styles.input}
                  value={cambiarAccesoForm.correo_actual}
                  onChange={(e)=>
                    setCambiarAccesoForm((p)=>({
                      ...p,
                      correo_actual:e.target.value,
                    }))
                  }
                />
              </div>

              <div style={{...styles.filterField,marginTop:10}}>
                <label style={styles.label}>Contraseña actual</label>
                <input
                  type="password"
                  style={styles.input}
                  value={cambiarAccesoForm.password_actual}
                  onChange={(e)=>
                    setCambiarAccesoForm((p)=>({
                      ...p,
                      password_actual:e.target.value,
                    }))
                  }
                />
              </div>

              <div style={{...styles.filterField,marginTop:10}}>
                <label style={styles.label}>Nuevo correo</label>
                <input
                  type="email"
                  style={styles.input}
                  value={cambiarAccesoForm.nuevo_correo}
                  onChange={(e)=>
                    setCambiarAccesoForm((p)=>({
                      ...p,
                      nuevo_correo:e.target.value,
                    }))
                  }
                />
              </div>

              <div style={{...styles.filterField,marginTop:10}}>
                <label style={styles.label}>Nueva contraseña</label>
                <input
                  type="password"
                  style={styles.input}
                  value={cambiarAccesoForm.nueva_password}
                  onChange={(e)=>
                    setCambiarAccesoForm((p)=>({
                      ...p,
                      nueva_password:e.target.value,
                    }))
                  }
                />
              </div>

              <div style={{...styles.filterField,marginTop:10}}>
                <label style={styles.label}>Confirmar nueva contraseña</label>
                <input
                  type="password"
                  style={styles.input}
                  value={cambiarAccesoForm.confirmar_password}
                  onChange={(e)=>
                    setCambiarAccesoForm((p)=>({
                      ...p,
                      confirmar_password:e.target.value,
                    }))
                  }
                />
              </div>

              {mensajeCambiarAcceso&&(
                <div style={{marginTop:10,color:"#334155"}}>
                  {mensajeCambiarAcceso}
                </div>
              )}

              <div style={{display:"flex",gap:10,marginTop:14}}>
                <button
                  type="submit"
                  style={styles.button}
                  disabled={cargandoCambiarAcceso}
                >
                  {cargandoCambiarAcceso?"Guardando...":"Guardar nuevo acceso"}
                </button>

                <button
                  type="button"
                  style={styles.outlineButton}
                  onClick={()=>setMostrarEditarAccesoJornada(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <button
            type="button"
            style={{
              ...styles.button,
              width:"100%",
              marginTop:20,
            }}
            onClick={abrirJornada}
            disabled={
              cargandoJornada||
              !puntoJornadaSeleccionado||
              !String(operadorJornadaCorreo||"").trim()||
              !operadorJornadaPassword
            }
          >
            {cargandoJornada
              ?"Validando operador..."
              :"Validar operador e iniciar jornada"}
          </button>

          <div
            style={{
              marginTop:16,
              padding:12,
              borderRadius:10,
              background:"#f1f5f9",
              color:"#475569",
              fontSize:13,
              lineHeight:1.5,
            }}
          >
            <strong>Importante:</strong> al validar las credenciales, POS NUBE
            cambia la sesión activa al operador indicado. Desde ese instante,
            sus ventas y movimientos quedan registrados con su usuario,
            ubicación y jornada.
          </div>
        </div>
      </div>}

      <aside style={styles.sidebar}>
        <div>
          <h2 style={styles.logo}>POS NUBE</h2>

          <div style={styles.institucionBadge}>
            <span style={styles.institucionLabel}>Institución</span>
            <strong style={styles.institucionName}>
              {institucionActiva?.nombre || "Sin seleccionar"}
            </strong>
            <span
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "4px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {rolActual || "SIN ROL"}
            </span>
          </div>

          <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 16,
  }}
>
  {[
    {
      id: "dashboard",
      icono: "▦",
      texto: "Dashboard",
      activo: vista === "dashboard",
      accion: () => setVista("dashboard"),
    },
    {
      id: "consultar_ventas",
      icono: "▣",
      texto: "Ventas",
      activo:
        vista === "ventas" &&
        vistaVentasInterna === "consultar",
      accion: () => {
        setVista("ventas");
        setVistaVentasInterna("consultar");
      },
    },
    {
      id: "nueva_orden",
      icono: "＋",
      texto: "Nueva Orden",
      activo:
        vista === "ventas" &&
        vistaVentasInterna === "registrar",
      accion: () => {
        setVista("ventas");
        setVistaVentasInterna("registrar");
      },
    },
    {
      id: "alumnos",
      icono: "◎",
      texto: "Alumnos",
      activo: vista === "alumnos",
      accion: () => setVista("alumnos"),
    },
    {
      id: "padres",
      icono: "♙",
      texto: "Padres",
      activo: vista === "padres",
      accion: () => setVista("padres"),
    },
    {
      id: "profesores",
      icono: "◉",
      texto: "Profesores",
      activo:
        vista === "profesores" ||
        vista === "creditos_profesores",
      accion: () => {
        setVista("profesores");
        setVistaProfesoresInterna("profesores");
      },
    },
    {
      id: "menu_cafeteria",
      icono: "▤",
      texto: "Menú Cafetería",
      activo: vista === "productos",
      accion: () => setVista("productos"),
    },
    {
      id: "stock",
      icono: "▥",
      texto: "Stock",
      activo: vista === "inventario",
      accion: () => setVista("inventario"),
    },
    {
      id: "recargas",
      icono: "$",
      texto: "Recargas",
      activo: vista === "recargas",
      accion: () => setVista("recargas"),
    },
    {
      id: "egresos",
      icono: "−",
      texto: "Egresos diarios",
      activo: vista === "egresos_diarios",
      accion: () => setVista("egresos_diarios"),
    },
    {
      id: "cierre_caja",
      icono: "◫",
      texto: "Cierre de caja",
      activo: vista === "reporte_cierre",
      accion: () => setVista("reporte_cierre"),
    },
    {
      id: "productos_vendidos",
      icono: "▧",
      texto: "Productos vendidos",
      activo: vista === "reporte_productos",
      accion: () => setVista("reporte_productos"),
    },
    {
      id: "productos_dia",
      icono: "◷",
      texto: "Productos por día",
      activo: vista === "reporte_productos_dia",
      accion: () => setVista("reporte_productos_dia"),
    },
    {
      id: "productos_mas_vendidos",
      icono: "★",
      texto: "Productos más vendidos",
      activo: vista === "productos_mas_vendidos",
      accion: () => setVista("productos_mas_vendidos"),
    },
    {
      id: "kardex_productos",
      icono: "↕",
      texto: "Kardex de productos",
      activo: vista === "kardex_productos",
      accion: () => setVista("kardex_productos"),
    },
    {
      id: "productos_forma_pago",
      icono: "▦",
      texto: "Productos por forma de pago",
      activo: vista === "productos_forma_pago",
      accion: () => setVista("productos_forma_pago"),
    },
    {
      id: "configuracion",
      icono: "⚙",
      texto: "Configuración",
      activo: vista === "configuracion",
      accion: () => setVista("configuracion"),
    },
  ].filter((opcion) => puedeAccederMenu(opcion.id)).map((opcion) => (
    <button
      key={opcion.id}
      type="button"
      onClick={opcion.accion}
      style={{
        position: "relative",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 13,
        padding: "13px 14px 13px 16px",
        border: "none",
        borderRadius: 10,
        background: opcion.activo
          ? "rgba(255,255,255,0.96)"
          : "transparent",
        color: opcion.activo ? "#2447a6" : "#ffffff",
        fontSize: 16,
        fontWeight: opcion.activo ? 800 : 600,
        textAlign: "left",
        cursor: "pointer",
        transition:
          "background 0.2s ease, color 0.2s ease, transform 0.2s ease",
        boxShadow: opcion.activo
          ? "0 5px 14px rgba(0,0,0,0.10)"
          : "none",
      }}
      onMouseEnter={(e) => {
        if (!opcion.activo) {
          e.currentTarget.style.background =
            "rgba(255,255,255,0.12)";
          e.currentTarget.style.transform = "translateX(3px)";
        }
      }}
      onMouseLeave={(e) => {
        if (!opcion.activo) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.transform = "translateX(0)";
        }
      }}
    >
      {opcion.activo && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 8,
            bottom: 8,
            width: 4,
            borderRadius: "0 6px 6px 0",
            background: "#ff9d3d",
          }}
        />
      )}

      <span
        style={{
          width: 29,
          minWidth: 29,
          height: 29,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          border: opcion.activo
            ? "1px solid #9eb5ef"
            : "1px solid rgba(255,255,255,0.40)",
          background: opcion.activo
            ? "#eef3ff"
            : "rgba(255,255,255,0.08)",
          color: opcion.activo ? "#2447a6" : "#ffffff",
          fontSize: 17,
          fontWeight: 900,
        }}
      >
        {opcion.icono}
      </span>

      <span>{opcion.texto}</span>
    </button>
  ))}
</div>

</div>

<button onClick={cerrarSesion} style={styles.logoutButton}>
  Cerrar sesión
</button>

</aside>

<main style={styles.main}>

{/* ===== BARRA SUPERIOR GLOBAL ===== */}
<div
  style={{
    position: "sticky",
    top: 0,
    zIndex: 100,
    margin: "-34px -36px 28px",
    padding: "14px 36px",
    minHeight: 68,
    background: "#ffffff",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 20,
    flexWrap: "wrap",
    boxSizing: "border-box",
  }}
>
  <div>
    <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
      Institución
    </div>
    <div style={{ fontSize: 21, color: "#111827", fontWeight: 900 }}>
      {institucionActiva?.nombre || "POS NUBE"}
    </div>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div
      style={{
        width: 42,
        height: 42,
        borderRadius: "50%",
        background: "#1e3a8a",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: 17,
      }}
    >
      {(usuario?.correo || correo || "U").charAt(0).toUpperCase()}
    </div>

    <div>
      <div style={{ fontSize: 15, color: "#111827", fontWeight: 800 }}>
        {usuario?.correo || correo || "Usuario sin correo"}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{usuario?.rol || "Administrador"}</div>
      {jornadaActiva?.punto_nombre&&<div style={{fontSize:11,color:"#0f766e",fontWeight:800,marginTop:3}}>Punto: {jornadaActiva.punto_nombre} · Jornada #{jornadaActiva.id}</div>}
    </div>
  </div>
</div>

{vista === "dashboard" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>
          Bienvenido a {institucionActiva?.nombre || "POS NUBE"}
        </h1>
        <p style={styles.dashboardSubtitle}>
          Resumen general del sistema
        </p>
      </div>
    </div>

    <div style={styles.grid}>
      <div style={styles.box}>
        <h3>Total ventas</h3>
        <p>{resumen ? resumen.total_ventas : "0"}</p>
      </div>

      <div style={styles.box}>
        <h3>Total general</h3>
        <p>${resumen ? resumen.total_general : "0.00"}</p>
      </div>

      <div style={styles.box}>
        <h3>Total saldo</h3>
        <p>${resumen ? resumen.total_saldo : "0.00"}</p>
      </div>

      <div style={styles.box}>
        <h3>Total efectivo</h3>
        <p>${resumen ? resumen.total_efectivo : "0.00"}</p>
      </div>

      <div style={styles.box}>
        <h3>Total transferencia</h3>
        <p>${resumen ? resumen.total_transferencia : "0.00"}</p>
      </div>
    </div>
  </>
)}

{vista === "reporte_cierre" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Cierre de caja diario</h1>
        <p style={styles.dashboardSubtitle}>Conteo, diferencias e historial por fecha</p>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button style={styles.refreshButton} onClick={() => { cargarCierres(); cargarVentas(); cargarRecargas(); cargarEgresos(); }}>
          Refrescar
        </button>
        <button
          style={styles.button}
          onClick={async () => {
            const fechaEcuador = obtenerFechaEcuadorISO();

            setCierreForm((actual) => ({
              ...actual,
              fecha: fechaEcuador,
            }));

            setMostrarCrearCierre(true);
            await cargarResumenCierre(fechaEcuador);
          }}
        >
          Crear cierre de caja
        </button>

        {["SUPER_ADMIN","ADMIN","ENCARGADO_LOCAL"].includes(rolActual)&&(
          <button
            type="button"
            style={styles.outlineButton}
            onClick={verCierreConsolidado}
            disabled={cargandoConsolidado}
          >
            {cargandoConsolidado ? "Calculando..." : "Cierre total del local"}
          </button>
        )}
      </div>
    </div>

    <div style={styles.box}>
      <div style={styles.filtersGridPaymon}>
        <div style={styles.filterField}><label style={styles.filterLabelTop}>Fecha inicial</label><input type="date" value={cierreCajaFiltros.fecha_inicio} onChange={(e)=>setCierreCajaFiltros({...cierreCajaFiltros,fecha_inicio:e.target.value})} style={styles.input}/></div>
        <div style={styles.filterField}><label style={styles.filterLabelTop}>Fecha final</label><input type="date" value={cierreCajaFiltros.fecha_fin} onChange={(e)=>setCierreCajaFiltros({...cierreCajaFiltros,fecha_fin:e.target.value})} style={styles.input}/></div>
      </div>
      <div style={styles.filterButtons}>
        <button type="button" style={styles.button} onClick={cargarCierres}>Consultar</button>
        <button type="button" style={styles.outlineButton} onClick={() => { limpiarFiltrosCierreCaja(); setTimeout(cargarCierres, 0); }}>Borrar filtros</button>
      </div>
    </div>

    <div style={{ height: 20 }} />
    <div style={styles.box}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h3 style={{ margin:0 }}>Historial de cierres</h3>
        <span>{cierresCaja.length} registro(s)</span>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead><tr>
            <th style={styles.th}>Operador</th><th style={styles.th}>Ubicación</th><th style={styles.th}>Fecha</th><th style={styles.th}>Efectivo contado</th>
            <th style={styles.th}>Recargas efectivo</th><th style={styles.th}>Transferencia manual</th>
            <th style={styles.th}>Ventas efectivo</th><th style={styles.th}>Ventas transferencia</th>
            <th style={styles.th}>Egresos</th><th style={styles.th}>Diferencia</th><th style={styles.th}>Observación</th><th style={styles.th}>Acciones</th>
          </tr></thead>
          <tbody>
            {cargandoCierres ? <tr><td colSpan={12} style={styles.td}>Cargando cierres...</td></tr> : cierresCaja.length===0 ? <tr><td colSpan={12} style={styles.td}>No hay cierres registrados.</td></tr> : cierresCaja.map((c)=><tr key={c.id}>
              <td style={styles.td}>{c.usuario_nombre || c.usuario_correo || "Sistema"}</td>
              <td style={{...styles.td,fontWeight:800}}>{c.punto_nombre || "HISTÓRICO"}</td>
              <td style={styles.td}>{formatearSoloFecha(c.fecha)}</td>
              <td style={styles.td}>{formatearMoneda(c.efectivo_contado)}</td>
              <td style={styles.td}>{formatearMoneda(c.recargas_efectivo)}</td>
              <td style={styles.td}>{formatearMoneda(c.transferencia_manual)}</td>
              <td style={styles.td}>{formatearMoneda(c.ventas_efectivo)}</td>
              <td style={styles.td}>{formatearMoneda(c.ventas_transferencia)}</td>
              <td style={styles.td}>{formatearMoneda(c.egresos_total)}</td>
              <td style={{...styles.td,fontWeight:900,color:Number(c.diferencia_general||0)<0?"#dc2626":"#b45309"}}>{formatearMoneda(c.diferencia_general)}</td>
              <td style={styles.td}>{c.observacion_automatica || c.observacion || "-"}</td>
              <td style={styles.td}><div style={{display:"flex",gap:8}}>
                <button style={styles.editIconButton} onClick={()=>verCierre(c)}>Ver</button>
                <button style={styles.deleteIconButton} onClick={()=>eliminarCierre(c)}>Eliminar</button>
              </div></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>

    {mostrarCrearCierre && createPortal((
      <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, width:"100vw", height:"100dvh", minHeight:"100vh", background:"rgba(15,23,42,.65)", zIndex:99999, padding:"8px", boxSizing:"border-box", overflow:"hidden", display:"flex", alignItems:"stretch", justifyContent:"center" }}>
        <div style={{ width:"100%", maxWidth:900, minWidth:0, height:"calc(100dvh - 16px)", maxHeight:"calc(100dvh - 16px)", margin:"0 auto", background:"white", borderRadius:14, boxSizing:"border-box", overflow:"hidden", display:"flex", flexDirection:"column" }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"14px",borderBottom:"1px solid #e5e7eb",flex:"0 0 auto",background:"#fff",position:"relative",zIndex:2}}><h2 style={{margin:"0",fontSize:"clamp(22px,4vw,32px)"}}>Nuevo cierre de caja</h2><button style={{...styles.outlineButton,flexShrink:0}} onClick={()=>setMostrarCrearCierre(false)}>Cerrar</button></div>
          <div style={{flex:"1 1 auto",minHeight:0,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",touchAction:"pan-y",overscrollBehaviorY:"contain",padding:"14px",boxSizing:"border-box"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,220px),1fr))",gap:16,marginTop:18,width:"100%",minWidth:0}}>
            <div style={styles.filterField}><label style={styles.label}>Fecha de cierre</label><input type="date" style={styles.input} value={cierreForm.fecha} onChange={async(e)=>{const fecha=e.target.value;setCierreForm({...cierreForm,fecha});await cargarResumenCierre(fecha);}}/></div>
            <div style={styles.filterField}>
              <label style={styles.label}>Operador</label>
              <input
                style={styles.input}
                value={
                  jornadaActiva?.usuario_nombre ||
                  jornadaActiva?.usuario_correo ||
                  usuario?.nombre ||
                  usuario?.correo ||
                  "Operador"
                }
                readOnly
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Ubicación</label>
              <input
                style={{...styles.input,fontWeight:900}}
                value={jornadaActiva?.punto_nombre || "SIN UBICACIÓN"}
                readOnly
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Jornada</label>
              <input
                style={styles.input}
                value={jornadaActiva?.id ? `#${jornadaActiva.id}` : "Sin jornada"}
                readOnly
              />
            </div>
            <div style={styles.filterFieldWide}><label style={styles.label}>Negocio</label><input style={styles.input} value={cierreForm.negocio} onChange={(e)=>setCierreForm({...cierreForm,negocio:e.target.value})}/></div>
          </div>
          <h3 style={{marginTop:24}}>Total de dinero: {formatearMoneda(totalEfectivoContado)}</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,280px),1fr))",gap:"clamp(14px,2vw,24px)",width:"100%",minWidth:0}}>
            <div>
              <h2 style={{ textAlign: "center" }}>Billetes</h2>
              {[
                ["billete_1", 1],
                ["billete_2", 2],
                ["billete_5", 5],
                ["billete_10", 10],
                ["billete_20", 20],
                ["billete_50", 50],
                ["billete_100", 100],
              ].map(([clave, valor]) => (
                <div key={clave} style={{ marginBottom: 10 }}>
                  <label>
                    BILLETE DE {Number(valor).toFixed(2)}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    autoComplete="off"
                    style={styles.input}
                    value={
                      cierreForm.denominaciones[clave] ?? ""
                    }
                    onFocus={(evento) =>
                      evento.currentTarget.select()
                    }
                    onClick={(evento) =>
                      evento.currentTarget.select()
                    }
                    onChange={(evento) => {
                      const cantidad = evento.target.value
                        .replace(/[^0-9]/g, "")
                        .replace(/^0+(?=\d)/, "");

                      setCierreForm((actual) => ({
                        ...actual,
                        denominaciones: {
                          ...actual.denominaciones,
                          [clave]: cantidad,
                        },
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
            <div>
              <h2 style={{ textAlign: "center" }}>Monedas</h2>
              {[
                ["moneda_001", 0.01],
                ["moneda_005", 0.05],
                ["moneda_010", 0.1],
                ["moneda_025", 0.25],
                ["moneda_050", 0.5],
                ["moneda_1", 1],
              ].map(([clave, valor]) => (
                <div key={clave} style={{ marginBottom: 10 }}>
                  <label>
                    MONEDA DE {Number(valor).toFixed(2)}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    autoComplete="off"
                    style={styles.input}
                    value={
                      cierreForm.denominaciones[clave] ?? ""
                    }
                    onFocus={(evento) =>
                      evento.currentTarget.select()
                    }
                    onClick={(evento) =>
                      evento.currentTarget.select()
                    }
                    onChange={(evento) => {
                      const cantidad = evento.target.value
                        .replace(/[^0-9]/g, "")
                        .replace(/^0+(?=\d)/, "");

                      setCierreForm((actual) => ({
                        ...actual,
                        denominaciones: {
                          ...actual.denominaciones,
                          [clave]: cantidad,
                        },
                      }));
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,240px),1fr))",gap:"clamp(14px,2vw,20px)",marginTop:24,width:"100%",minWidth:0}}>
            <div><h2>Tarjeta crédito/débito</h2><label>Tarjetas (suma de pagos)</label><input type="number" step="0.01" style={styles.input} value={cierreForm.tarjeta_manual} onChange={(e)=>setCierreForm({...cierreForm,tarjeta_manual:e.target.value})}/></div>
            <div><h2>Transferencia</h2><label>Transferencias (suma de comprobantes)</label><input type="number" step="0.01" style={styles.input} value={cierreForm.transferencia_manual} onChange={(e)=>setCierreForm({...cierreForm,transferencia_manual:e.target.value})}/></div>
          </div>
          {resumenCierreServidor && (
            <div style={{ ...styles.box, marginTop: 24 }}>
              <h3>Resumen esperado del sistema</h3>
              <div style={{
                display:"grid",
                gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
                gap:10,
                marginBottom:14
              }}>
                <div style={{padding:10,border:"1px solid #dbeafe",borderRadius:10}}>
                  <strong>Ubicación</strong>
                  <div>{resumenCierreServidor.punto_nombre || jornadaActiva?.punto_nombre || "-"}</div>
                </div>
                <div style={{padding:10,border:"1px solid #dbeafe",borderRadius:10}}>
                  <strong>Operador</strong>
                  <div>{resumenCierreServidor.operador_nombre || jornadaActiva?.usuario_nombre || jornadaActiva?.usuario_correo || "-"}</div>
                </div>
                <div style={{padding:10,border:"1px solid #dbeafe",borderRadius:10}}>
                  <strong>Jornada</strong>
                  <div>#{resumenCierreServidor.jornada_id || jornadaActiva?.id || "-"}</div>
                </div>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  marginBottom: 14,
                  background: "#eef6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 10,
                }}
              >
                <strong>Período que se cerrará:</strong>
                <div style={{ marginTop: 5 }}>
                  {resumenCierreServidor.periodo_desde_ecuador || "Inicio"}{" "}
                  →{" "}
                  {resumenCierreServidor.periodo_hasta_ecuador || "Ahora"}
                </div>
                <small style={{ color: "#64748b" }}>
                  Incluye todos los movimientos realizados después del último
                  cierre hasta este momento.
                </small>
              </div>
              <p>Ventas efectivo: {formatearMoneda(resumenCierreServidor.ventas_efectivo)}</p>
              <p>Ventas transferencia: {formatearMoneda(resumenCierreServidor.ventas_transferencia)}</p>
              <p>Ventas tarjeta: {formatearMoneda(resumenCierreServidor.ventas_tarjeta)}</p>
              <p>Recargas efectivo: {formatearMoneda(resumenCierreServidor.recargas_efectivo)}</p>
              <p>Recargas transferencia: {formatearMoneda(resumenCierreServidor.recargas_transferencia)}</p>
              <p>Egresos activos: {formatearMoneda(resumenCierreServidor.egresos_total)}</p>
            </div>
          )}
          <div style={{marginTop:20}}><label>Observación</label><input style={styles.input} value={cierreForm.observacion} onChange={(e)=>setCierreForm({...cierreForm,observacion:e.target.value})}/></div>
          <button
            type="button"
            style={{ ...styles.button, marginTop: 20 }}
            onClick={guardarCierre}
            disabled={guardandoCierre}
          >
            {guardandoCierre
              ? "Guardando cierre..."
              : "Guardar cierre"}
          </button>
          <div style={{height:24,flex:"0 0 auto"}} />
          </div>
        </div>
      </div>
    ), document.body)}


    {cierreConsolidado && createPortal((
      <div style={{
        position:"fixed", inset:0, zIndex:100001,
        background:"rgba(15,23,42,.68)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:12
      }}>
        <div style={{
          width:"min(1000px,96vw)",
          maxHeight:"94vh",
          overflowY:"auto",
          background:"#fff",
          borderRadius:16,
          padding:20
        }}>
          <div style={{
            display:"flex",justifyContent:"space-between",
            alignItems:"center",gap:12,flexWrap:"wrap"
          }}>
            <div>
              <h2 style={{margin:0}}>Cierre total del local</h2>
              <p style={{margin:"6px 0 0",color:"#64748b"}}>
                {institucionActiva?.nombre || INSTITUCIONES.find(i=>Number(i.id)===Number(obtenerInstitucionActivaId()))?.nombre || "Institución"} · {formatearSoloFecha(cierreConsolidado.fecha)}
              </p>
            </div>
            <button
              type="button"
              style={styles.outlineButton}
              onClick={()=>setCierreConsolidado(null)}
            >
              Cerrar
            </button>
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
            gap:10,
            marginTop:18
          }}>
            <div style={styles.statCard}><span>Ventas efectivo</span><strong>{formatearMoneda(cierreConsolidado.ventas_efectivo)}</strong></div>
            <div style={styles.statCard}><span>Ventas transferencia</span><strong>{formatearMoneda(cierreConsolidado.ventas_transferencia)}</strong></div>
            <div style={styles.statCard}><span>Ventas tarjeta</span><strong>{formatearMoneda(cierreConsolidado.ventas_tarjeta)}</strong></div>
            <div style={styles.statCard}><span>Recargas efectivo</span><strong>{formatearMoneda(cierreConsolidado.recargas_efectivo)}</strong></div>
            <div style={styles.statCard}><span>Egresos</span><strong>{formatearMoneda(cierreConsolidado.egresos_total)}</strong></div>
            <div style={styles.statCard}><span>Efectivo contado</span><strong>{formatearMoneda(cierreConsolidado.efectivo_contado)}</strong></div>
            <div style={styles.statCard}><span>Diferencia general</span><strong>{formatearMoneda(cierreConsolidado.diferencia_general)}</strong></div>
          </div>

          <h3 style={{marginTop:24}}>Cierres por ubicación</h3>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Ubicación</th>
                  <th style={styles.th}>Operador</th>
                  <th style={styles.th}>Jornada</th>
                  <th style={styles.th}>Ventas efectivo</th>
                  <th style={styles.th}>Transferencias</th>
                  <th style={styles.th}>Egresos</th>
                  <th style={styles.th}>Efectivo contado</th>
                  <th style={styles.th}>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {(cierreConsolidado.puntos||[]).length===0 ? (
                  <tr>
                    <td colSpan={8} style={styles.td}>
                      Todavía no existen cierres por punto para esta fecha.
                    </td>
                  </tr>
                ) : (
                  (cierreConsolidado.puntos||[]).map((c)=>(
                    <tr key={c.id}>
                      <td style={{...styles.td,fontWeight:900}}>{c.punto_nombre || "-"}</td>
                      <td style={styles.td}>{c.usuario_nombre || c.usuario_correo || "-"}</td>
                      <td style={styles.td}>{c.jornada_id ? `#${c.jornada_id}` : "-"}</td>
                      <td style={styles.td}>{formatearMoneda(c.ventas_efectivo)}</td>
                      <td style={styles.td}>{formatearMoneda(Number(c.ventas_transferencia||0)+Number(c.recargas_transferencia||0))}</td>
                      <td style={styles.td}>{formatearMoneda(c.egresos_total)}</td>
                      <td style={styles.td}>{formatearMoneda(c.efectivo_contado)}</td>
                      <td style={styles.td}>{formatearMoneda(c.diferencia_general)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    ), document.body)}

    {cierreDetalle && createPortal((
      <div style={{ position:"fixed", top:0, left:0, right:0, bottom:0, width:"100vw", height:"100dvh", minHeight:"100vh", background:"rgba(15,23,42,.65)", zIndex:100000, padding:"8px", boxSizing:"border-box", overflow:"hidden", display:"flex", alignItems:"stretch", justifyContent:"center" }}>
        <div style={{width:"100%",maxWidth:900,minWidth:0,height:"calc(100dvh - 16px)",maxHeight:"calc(100dvh - 16px)",margin:"0 auto",background:"white",borderRadius:14,boxSizing:"border-box",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"14px",borderBottom:"1px solid #e5e7eb",flex:"0 0 auto",background:"#fff",position:"relative",zIndex:2}}><h2 style={{margin:"0",fontSize:"clamp(22px,4vw,32px)"}}>Detalle de cierre de caja</h2><button style={{...styles.outlineButton,flexShrink:0}} onClick={()=>setCierreDetalle(null)}>✕</button></div>
          <div style={{flex:"1 1 auto",minHeight:0,overflowY:"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",touchAction:"pan-y",overscrollBehaviorY:"contain",padding:"14px",boxSizing:"border-box"}}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                typeof window !== "undefined" && window.innerWidth <= 1280
                  ? "1fr"
                  : "repeat(3,minmax(0,1fr))",
              gap: 12,
              marginTop: 18,
              minWidth: 0,
            }}
          >
            {[
              ["Fecha de cierre", formatearSoloFecha(cierreDetalle.fecha)],
              ["Ubicación", cierreDetalle.punto_nombre || "HISTÓRICO"],
              ["Operador", cierreDetalle.usuario_nombre || cierreDetalle.usuario_correo || "-"],
              ["Jornada", cierreDetalle.jornada_id ? `#${cierreDetalle.jornada_id}` : "-"],
              ["Unidad educativa", institucionActiva?.nombre],
              ["Negocio", cierreDetalle.negocio],
              ["Usuario", cierreDetalle.usuario_nombre || cierreDetalle.usuario_correo],
              ["Total recarga efectivo", formatearMoneda(cierreDetalle.recargas_efectivo)],
              ["Egreso", formatearMoneda(cierreDetalle.egresos_total)],
              ["Total recarga transferencia", formatearMoneda(cierreDetalle.recargas_transferencia)],
              ["Total ventas por efectivo", formatearMoneda(cierreDetalle.ventas_efectivo)],
              ["Total ventas por transferencia", formatearMoneda(cierreDetalle.ventas_transferencia)],
              ["Total ventas por tarjeta", formatearMoneda(cierreDetalle.ventas_tarjeta)],
              ["Efectivo entregado", formatearMoneda(cierreDetalle.efectivo_contado)],
              ["Tarjeta manual", formatearMoneda(cierreDetalle.tarjeta_manual)],
              ["Transferencia manual", formatearMoneda(cierreDetalle.transferencia_manual)],
              ["Diferencia efectivo", formatearMoneda(cierreDetalle.diferencia_efectivo)],
              ["Diferencia tarjeta", formatearMoneda(cierreDetalle.diferencia_tarjeta)],
              ["Diferencia transferencia", formatearMoneda(cierreDetalle.diferencia_transferencia)],
              ["Diferencia general", formatearMoneda(cierreDetalle.diferencia_general)],
              [
                "Observación",
                cierreDetalle.observacion_automatica ||
                  cierreDetalle.observacion ||
                  "-",
              ],
            ].map(([etiqueta, valor]) => (
              <div
                key={etiqueta}
                style={{
                  minWidth: 0,
                  padding:
                    typeof window !== "undefined" && window.innerWidth <= 1280
                      ? "8px 10px"
                      : "10px 12px",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  {etiqueta}:
                </div>
                <strong
                  style={{
                    display: "block",
                    overflowWrap: "anywhere",
                  }}
                >
                  {valor || "-"}
                </strong>
              </div>
            ))}
          </div>
          <h3 style={{marginTop:24}}>Conteo de billetes y monedas</h3>
          <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Denominación</th><th style={styles.th}>Tipo</th><th style={styles.th}>Cantidad</th><th style={styles.th}>Total</th></tr></thead><tbody>{(cierreDetalle.denominaciones||[]).map((d,i)=><tr key={i}><td style={styles.td}>{Number(d.denominacion).toFixed(2)}</td><td style={styles.td}>{d.tipo}</td><td style={styles.td}>{d.cantidad}</td><td style={styles.td}>{formatearMoneda(d.total)}</td></tr>)}</tbody></table></div>
          <h3 style={{marginTop:24}}>Egresos incluidos en este cierre</h3>
          <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Fecha</th><th style={styles.th}>Nombre</th><th style={styles.th}>Tipo</th><th style={styles.th}>Factura</th><th style={styles.th}>Valor</th><th style={styles.th}>Usuario</th></tr></thead><tbody>{(cierreDetalle.egresos||[]).length===0?<tr><td colSpan={6} style={styles.td}>No hubo egresos activos en este cierre.</td></tr>:(cierreDetalle.egresos||[]).map((e)=><tr key={e.id}><td style={styles.td}>{formatearSoloFecha(e.fecha)}</td><td style={styles.td}>{e.nombre_egreso}</td><td style={styles.td}>{e.tipo_egreso}</td><td style={styles.td}>{e.numero_factura||'-'}</td><td style={styles.td}>{formatearMoneda(e.total)}</td><td style={styles.td}>{e.usuario||e.usuario_nombre||'-'}</td></tr>)}</tbody></table></div>
          <button
            style={{ ...styles.button, marginTop: 20 }}
            onClick={() => imprimirCierreCaja(cierreDetalle)}
          >
            Imprimir
          </button>
          <div style={{height:24,flex:"0 0 auto"}} />
          </div>
        </div>
      </div>
    ), document.body)}
  </>
)}

{vista === "reporte_productos" && (
  <div style={styles.card}>
    <div style={styles.reporteHeader}>
      <div>
        <h2 style={{ margin: 0 }}>Reporte de Productos Vendidos</h2>
      </div>
    </div>

    <div style={styles.filtrosRow}>
      <div style={styles.filterGroup}>
        <label style={styles.label}>Fecha inicial</label>
        <input
          type="date"
          value={productosFiltros.fecha_inicio}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              fecha_inicio: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Fecha final</label>
        <input
          type="date"
          value={productosFiltros.fecha_fin}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              fecha_fin: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Operador</label>
        <select
          value={productosFiltros.operador || ""}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              operador: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todos</option>
          {Array.from(
            new Set(
              ventasEnriquecidas.map(
                (venta) => venta.operador_visual || "Sistema"
              )
            )
          ).map((operador) => (
            <option key={operador} value={operador}>
              {operador}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Ubicación</label>
        <select
          value={productosFiltros.ubicacion || ""}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              ubicacion: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todas</option>
          <option value="PRINCIPAL">PRINCIPAL</option>
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Comprado</label>
        <select
          value={productosFiltros.comprado || ""}
          onChange={(e) =>
            setProductosFiltros({
              ...productosFiltros,
              comprado: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todos</option>
          <option value="SI">Sí</option>
          <option value="NO">No</option>
        </select>
      </div>
    </div>

    <div style={styles.filterActions}>
      <button
        style={styles.primaryButton}
        onClick={() => consultarProductos()}
      >
        Consultar
      </button>

      <button
        style={styles.outlineButton}
        onClick={() =>
          setProductosFiltros({
            fecha_inicio: "",
            fecha_fin: "",
            operador: "",
            ubicacion: "",
            comprado: "",
            texto: "",
          })
        }
      >
        Borrar filtros
      </button>
    </div>

    <div style={styles.reportToolbar}>
      <input
        type="text"
        placeholder="Buscar"
        value={productosFiltros.texto || ""}
        onChange={(e) =>
          setProductosFiltros({
            ...productosFiltros,
            texto: e.target.value,
          })
        }
        style={styles.searchInput}
      />

      <button
        style={styles.exportButton}
        onClick={exportarProductosVendidos}
      >
        EXPORTAR
      </button>
    </div>

    <div style={{ marginTop: 20 }}>
      <div style={styles.tableHeaderProductos}>
        <span>Nombre</span>
        <span>Código</span>
        <span>Categoría</span>
        <span>Descripción</span>
        <span>Cantidad</span>
        <span>Total de Ventas</span>
      </div>

      {productosVendidos.length === 0 ? (
        <div style={styles.emptyState}>
          No hay productos vendidos para mostrar
        </div>
      ) : (
        productosVendidos
          .filter((p) => {
            if (!productosFiltros.texto) return true;
            const texto = productosFiltros.texto.toLowerCase();
            return (
              String(p.nombre || "").toLowerCase().includes(texto) ||
              String(p.codigo || "").toLowerCase().includes(texto) ||
              String(p.categoria || "").toLowerCase().includes(texto) ||
              String(p.descripcion || "").toLowerCase().includes(texto)
            );
          })
          .map((p, index) => (
            <div key={p.id || index} style={styles.rowTablaProductos}>
              <span>{p.nombre || "-"}</span>
              <span>{p.codigo || "-"}</span>
              <span>{p.categoria || "-"}</span>
              <span>{p.descripcion || "-"}</span>
              <span>{p.cantidad || 0}</span>
              <span>${Number(p.total || 0).toFixed(2)}</span>
            </div>
          ))
      )}
    </div>
  </div>
)}

{vista === "egresos_diarios" && (
  <div style={styles.card}>
    <div style={styles.pageHeaderSmall}>
      <div>
        <h2 style={{ margin: 0, fontSize: "28px", color: "#0f172a" }}>
          Egresos diarios
        </h2>
      </div>

      <button
        style={styles.secondaryButton}
        onClick={() => {
          const abrir = !mostrarCrearEgreso;

          if (abrir && !editandoEgresoId) {
            setEgresoForm((actual) => ({
              ...actual,
              fecha: actual.fecha || obtenerFechaEcuadorISO(),
            }));
          }

          setMostrarCrearEgreso(abrir);
        }}
      >
        {mostrarCrearEgreso ? "Cerrar formulario" : "Crear egreso"}
      </button>
    </div>

    {mostrarCrearEgreso && (
      <div style={{ ...styles.box, marginBottom: 20, padding: 20 }}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Negocio</label>
            <input
              type="text"
              value={egresoForm.negocio}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, negocio: e.target.value })
              }
              style={styles.input}
              placeholder="Ej. KIDSFOOD by GRUPO ZAZ"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Usuario</label>
            <input
              type="text"
              value={egresoForm.usuario}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, usuario: e.target.value })
              }
              style={styles.input}
              placeholder="Ej. SAMUEL"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Fecha</label>
            <input
              type="date"
              value={egresoForm.fecha}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, fecha: e.target.value })
              }
              style={styles.input}
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Nombre del egreso</label>
            <input
              type="text"
              value={egresoForm.nombre_egreso}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, nombre_egreso: e.target.value })
              }
              style={styles.input}
              placeholder="Ej. MERCADILLO"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Total</label>
            <input
              type="number"
              step="0.01"
              value={egresoForm.total}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, total: e.target.value })
              }
              style={styles.input}
              placeholder="0.00"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Número de factura</label>
            <input
              type="text"
              value={egresoForm.numero_factura}
              onChange={(e) =>
                setEgresoForm({
                  ...egresoForm,
                  numero_factura: e.target.value,
                })
              }
              style={styles.input}
              placeholder="001-002-000028733"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Tipo de egreso</label>
            <select
              value={egresoForm.tipo_egreso}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, tipo_egreso: e.target.value })
              }
              style={styles.input}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Estado</label>
            <select
              value={egresoForm.estado}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, estado: e.target.value })
              }
              style={styles.input}
            >
              <option value="ACTIVO">ACTIVO</option>
              <option value="ANULADO">ANULADO</option>
            </select>
          </div>

          <div style={styles.filterFieldWide}>
            <label style={styles.label}>Descripción</label>
            <input
              type="text"
              value={egresoForm.descripcion}
              onChange={(e) =>
                setEgresoForm({ ...egresoForm, descripcion: e.target.value })
              }
              style={styles.input}
              placeholder="Detalle del pago o gasto"
            />
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button
            style={styles.button}
onClick={guardarEgreso}
          >
            Guardar egreso
          </button>
        </div>
      </div>
    )}

    <div style={styles.filtersGrid}>
      <div style={styles.filterField}>
        <label style={styles.label}>Fecha inicial</label>
        <input
          type="date"
          value={egresosFiltros.fecha_inicio}
          onChange={(e) =>
            setEgresosFiltros({
              ...egresosFiltros,
              fecha_inicio: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterField}>
        <label style={styles.label}>Fecha final</label>
        <input
          type="date"
          value={egresosFiltros.fecha_fin}
          onChange={(e) =>
            setEgresosFiltros({
              ...egresosFiltros,
              fecha_fin: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterFieldWide}>
        <label style={styles.label}>Buscar</label>
        <input
          type="text"
          value={egresosFiltros.texto}
          onChange={(e) =>
            setEgresosFiltros({
              ...egresosFiltros,
              texto: e.target.value,
            })
          }
          style={styles.searchInput}
          placeholder="Buscar"
        />
      </div>
    </div>

    <div style={styles.filterButtons}>
      <button style={styles.button} onClick={cargarEgresos}>Consultar</button>

      <button
        style={styles.outlineButton}
        onClick={() =>
          setEgresosFiltros({
            fecha_inicio: "",
            fecha_fin: "",
            texto: "",
          })
        }
      >
        Borrar filtros
      </button>

      <button style={styles.exportButton}>EXPORTAR</button>
    </div>

    <div style={{ marginTop: 20, overflowX: "auto" }}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Negocio</th>
            <th style={styles.th}>Usuario</th>
            <th style={styles.th}>Fecha</th>
            <th style={styles.th}>Nombre del egreso</th>
            <th style={styles.th}>Total</th>
            <th style={styles.th}>Descripción</th>
            <th style={styles.th}>Estado</th>
            <th style={styles.th}>Número de factura</th>
            <th style={styles.th}>Tipo de egreso</th>
            <th style={styles.th}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {egresosDiarios
            .filter((egreso) => {
              const cumpleInicio =
                !egresosFiltros.fecha_inicio ||
                (egreso.fecha && egreso.fecha >= egresosFiltros.fecha_inicio);

              const cumpleFin =
                !egresosFiltros.fecha_fin ||
                (egreso.fecha && egreso.fecha <= egresosFiltros.fecha_fin);

              const texto = egresosFiltros.texto.toLowerCase();

              const cumpleTexto =
                !texto ||
                String(egreso.negocio || "").toLowerCase().includes(texto) ||
                String(egreso.usuario || "").toLowerCase().includes(texto) ||
                String(egreso.nombre_egreso || "").toLowerCase().includes(texto) ||
                String(egreso.descripcion || "").toLowerCase().includes(texto) ||
                String(egreso.numero_factura || "").toLowerCase().includes(texto);

              return cumpleInicio && cumpleFin && cumpleTexto;
            })
            .map((egreso) => (
              <tr key={egreso.id}>
                <td style={styles.td}>{egreso.negocio}</td>
                <td style={styles.td}>{egreso.usuario}</td>
                <td style={styles.td}>{formatearSoloFecha(egreso.fecha)}</td>
                <td style={styles.td}>{egreso.nombre_egreso}</td>
                <td style={styles.td}>${Number(egreso.total || 0).toFixed(2)}</td>
                <td style={styles.td}>{egreso.descripcion}</td>
                <td style={styles.td}>{egreso.estado}</td>
                <td style={styles.td}>{egreso.numero_factura}</td>
                <td style={styles.td}>{egreso.tipo_egreso}</td>
                <td style={styles.td}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={styles.editIconButton}
                      onClick={() => {
                        setEgresoForm({
                          negocio: egreso.negocio || "",
                          usuario: egreso.usuario || "",
                          fecha: normalizarFechaISO(egreso.fecha) || "",
                          nombre_egreso: egreso.nombre_egreso || "",
                          total: egreso.total || "",
                          descripcion: egreso.descripcion || "",
                          estado: egreso.estado || "ACTIVO",
                          numero_factura: egreso.numero_factura || "",
                          tipo_egreso: egreso.tipo_egreso || "Efectivo",
                        });
                        setEditandoEgresoId(egreso.id);
                        setMostrarCrearEgreso(true);
                      }}
                    >
                      ✎
                    </button>

                    <button
                      style={styles.deleteIconButton}
onClick={() => eliminarEgreso(egreso)}
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
)}

{vista === "reporte_productos_dia" && (
  <div style={styles.card}>
    <div style={styles.reporteHeader}>
      <div>
        <h2 style={{ margin: 0 }}>Reporte de Productos Vendidos por Día</h2>
      </div>
    </div>

    <div style={styles.filtrosRow}>
      <div style={styles.filterGroup}>
        <label style={styles.label}>Fecha inicial</label>
        <input
          type="date"
          value={productosPorDiaFiltros.fecha_inicio}
          onChange={(e) =>
            setProductosPorDiaFiltros({
              ...productosPorDiaFiltros,
              fecha_inicio: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Fecha final</label>
        <input
          type="date"
          value={productosPorDiaFiltros.fecha_fin}
          onChange={(e) =>
            setProductosPorDiaFiltros({
              ...productosPorDiaFiltros,
              fecha_fin: e.target.value,
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Ubicación</label>
        <select
          value={productosPorDiaFiltros.ubicacion || ""}
          onChange={(e) =>
            setProductosPorDiaFiltros({
              ...productosPorDiaFiltros,
              ubicacion: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todas</option>
          <option value="PRINCIPAL">PRINCIPAL</option>
        </select>
      </div>

      <div style={styles.filterGroup}>
        <label style={styles.label}>Comprado</label>
        <select
          value={productosPorDiaFiltros.comprado || ""}
          onChange={(e) =>
            setProductosPorDiaFiltros({
              ...productosPorDiaFiltros,
              comprado: e.target.value,
            })
          }
          style={styles.input}
        >
          <option value="">Todos</option>
          <option value="SI">Sí</option>
          <option value="NO">No</option>
        </select>
      </div>
    </div>

    <div style={styles.filterActions}>
      <button
        style={styles.outlineButton}
        onClick={() =>
          setProductosPorDiaFiltros({
            fecha_inicio: "",
            fecha_fin: "",
            ubicacion: "",
            comprado: "",
            texto: "",
          })
        }
      >
        Borrar filtros
      </button>

      <button
        style={styles.exportButton}
        onClick={exportarProductosVendidosPorDia}
      >
        EXPORTAR
      </button>

      <button
        style={styles.button}
        onClick={consultarProductosPorDia}
      >
        Filtrar
      </button>
    </div>

    <div style={styles.reportToolbar}>
      <input
        type="text"
        placeholder="Buscar"
        value={productosPorDiaFiltros.texto || ""}
        onChange={(e) =>
          setProductosPorDiaFiltros({
            ...productosPorDiaFiltros,
            texto: e.target.value,
          })
        }
        style={styles.searchInput}
      />
    </div>

    <div style={{ marginTop: 20, overflowX: "auto" }}>
      <div style={styles.tableHeaderProductosDia}>
        <span>Producto</span>
        <span>Categoría</span>
        <span>Domingo</span>
        <span>Lunes</span>
        <span>Martes</span>
        <span>Miércoles</span>
        <span>Jueves</span>
        <span>Viernes</span>
        <span>Sábado</span>
      </div>

      {productosVendidosPorDia.length === 0 ? (
        <div style={styles.emptyState}>
          No hay productos vendidos por día para mostrar
        </div>
      ) : (
        productosVendidosPorDia
          .filter((p) => {
            if (!productosPorDiaFiltros.texto) return true;
            const texto = productosPorDiaFiltros.texto.toLowerCase();
            return (
              String(p.producto || "").toLowerCase().includes(texto) ||
              String(p.categoria || "").toLowerCase().includes(texto)
            );
          })
          .map((p, index) => (
            <div key={index} style={styles.rowTablaProductosDia}>
              <span>{p.producto}</span>
              <span>{p.categoria}</span>
              <span>{p.domingo}</span>
              <span>{p.lunes}</span>
              <span>{p.martes}</span>
              <span>{p.miercoles}</span>
              <span>{p.jueves}</span>
              <span>{p.viernes}</span>
              <span>{p.sabado}</span>
            </div>
          ))
      )}
    </div>
  </div>
)}
       {vista === "productos" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Menu de la Cafetería</h1>
      </div>

      <div style={styles.headerActions}>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => {
            setProductoDetalle(null);
            setProductoEditando(null);
            setProductoForm({
              nombre: "",
              codigo: "",
              precio: "",
              categoria: "",
              stock: "",
              imagen: "",
              activo: true,
            });
            setVista("productos");
            setMostrarFormularioProducto(true);
          }}
          title="Crear alimento"
        >
          Crear alimento
        </button>
      </div>
    </div>

    {productoDetalle && (
      <div style={{ ...styles.box, marginBottom: 20 }}>
        <div style={styles.pageHeaderSmall}>
          <h2 style={{ margin: 0 }}>Detalle del alimento</h2>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              style={styles.outlineButton}
              onClick={() => {
                setProductoEditando(productoDetalle);
                setProductoForm({
                  nombre: productoDetalle.nombre || "",
                  codigo: productoDetalle.codigo || "",
                  precio: productoDetalle.precio ?? "",
                  categoria: productoDetalle.categoria || "",
                  stock: productoDetalle.stock ?? "",
                  imagen: productoDetalle.imagen || "",
                  activo: productoDetalle.activo !== false,
                });
                setMostrarFormularioProducto(true);
                setProductoDetalle(null);
              }}
            >
              Editar
            </button>

            <button
              type="button"
              style={styles.outlineButton}
              onClick={() => setProductoDetalle(null)}
            >
              Cerrar
            </button>
          </div>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Nombre</label>
            <input
              type="text"
              value={productoDetalle.nombre || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Código</label>
            <input
              type="text"
              value={productoDetalle.codigo || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Precio</label>
            <input
              type="text"
              value={Number(productoDetalle.precio || 0).toFixed(2)}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Categoría</label>
            <input
              type="text"
              value={productoDetalle.categoria || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Stock</label>
            <input
              type="text"
              value={String(productoDetalle.stock ?? "")}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Estado</label>
            <input
              type="text"
              value={productoDetalle.activo === false ? "Inactivo" : "Activo"}
              style={styles.input}
              readOnly
            />
          </div>
        </div>

        {!!productoDetalle.imagen && (
          <div style={{ marginTop: 16 }}>
            <label style={styles.label}>Imagen</label>
            <div style={{ marginTop: 8 }}>
              <img
                src={productoDetalle.imagen}
                alt={productoDetalle.nombre || "Producto"}
                style={{
                  width: 140,
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                }}
              />
            </div>
          </div>
        )}
      </div>
    )}

    {mostrarFormularioProducto && (
      <div style={{ ...styles.box, marginBottom: 20 }}>
        <div style={styles.pageHeaderSmall}>
          <h2 style={{ margin: 0 }}>
            {productoEditando ? "Editar alimento" : "Crear alimento"}
          </h2>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              setMostrarFormularioProducto(false);
              setProductoEditando(null);
              setProductoForm({
                nombre: "",
                codigo: "",
                precio: "",
                categoria: "",
                stock: "",
                imagen: "",
                activo: true,
              });
            }}
            title="Cerrar formulario"
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={productoEditando ? actualizarProducto : crearProducto}
          style={styles.form}
        >
          <div style={styles.filtersGrid}>
            <div style={styles.filterField}>
              <label style={styles.label}>Nombre</label>
              <input
                type="text"
                value={productoForm.nombre}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, nombre: e.target.value })
                }
                style={styles.input}
                required
              />
            </div>

            <div style={styles.filterField}>
              <label style={styles.label}>Código</label>
              <input
                type="text"
                value={productoForm.codigo}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, codigo: e.target.value })
                }
                style={styles.input}
              />
            </div>

            <div style={styles.filterField}>
              <label style={styles.label}>Precio</label>
              <input
                type="number"
                step="0.01"
                value={productoForm.precio}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, precio: e.target.value })
                }
                style={styles.input}
                required
              />
            </div>

            <div style={styles.filterField}>
              <label style={styles.label}>Categoría</label>
              <input
                type="text"
                value={productoForm.categoria}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, categoria: e.target.value })
                }
                style={styles.input}
              />
            </div>

            <div style={styles.filterField}>
              <label style={styles.label}>Stock inicial</label>
              <input
                type="number"
                value={productoForm.stock}
                onChange={(e) =>
                  setProductoForm({ ...productoForm, stock: e.target.value })
                }
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Imagen (URL)</label>
            <input
              type="text"
              value={productoForm.imagen || ""}
              onChange={(e) =>
                setProductoForm({
                  ...productoForm,
                  imagen: e.target.value,
                })
              }
              style={styles.input}
              placeholder="https://..."
            />
          </div>

          <div style={styles.filterButtons}>
            <button type="submit" style={styles.button}>
              {productoEditando ? "Actualizar alimento" : "Guardar alimento"}
            </button>
          </div>
        </form>
      </div>
    )}

    <div style={styles.box}>
      <div style={styles.pageHeaderSmall}>
        <input
          type="text"
          placeholder="Buscar"
          value={busquedaProductos}
          onChange={(e) => setBusquedaProductos(e.target.value)}
          style={styles.searchInput}
        />

        <div style={styles.headerActions}>
          <select
            value={filtroCategoriaProductos || ""}
            onChange={(e) => setFiltroCategoriaProductos(e.target.value)}
            style={styles.select}
          >
            <option value="">Todas las categorías</option>
            {[...new Set(productos.map((p) => p.categoria).filter(Boolean))].map(
              (categoria) => (
                <option key={categoria} value={categoria}>
                  {categoria}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            style={styles.button}
            title="Exportar menú cafetería"
            onClick={() => {
              const filas = [
                [
                  "Nombre",
                  "Código",
                  "Precio",
                  "% impuestos",
                  "Precio final",
                  "Categoría",
                  "Estado",
                ],
                ...productos
                  .filter((p) => {
                    const coincideTexto = String(p.nombre || "")
                      .toLowerCase()
                      .includes(busquedaProductos.toLowerCase());

                    const coincideCategoria =
                      !filtroCategoriaProductos ||
                      String(p.categoria || "") === filtroCategoriaProductos;

                    return coincideTexto && coincideCategoria;
                  })
                  .map((p) => {
                    const impuesto = Number(p.impuesto || 0);
                    const precio = Number(p.precio || 0);
                    const precioFinal = precio + precio * (impuesto / 100);

                    return [
                      p.nombre || "",
                      p.codigo || "",
                      precio.toFixed(2),
                      impuesto.toFixed(2),
                      precioFinal.toFixed(2),
                      p.categoria || "",
                      p.activo === false ? "Inactivo" : "Activo",
                    ];
                  }),
              ];

              const csv = filas
                .map((fila) =>
                  fila
                    .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
                    .join(",")
                )
                .join("\n");

              const blob = new Blob([csv], {
                type: "text/csv;charset=utf-8;",
              });

              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "menu_cafeteria.csv";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            Exportar
          </button>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}></th>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Precio</th>
              <th style={styles.th}>% impuestos</th>
              <th style={styles.th}>Precio final</th>
              <th style={styles.th}>Categoría</th>
              <th style={styles.th}>Acciones</th>
            </tr>

            <tr>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}>
                <select
                  value={filtroCategoriaProductos || ""}
                  onChange={(e) => setFiltroCategoriaProductos(e.target.value)}
                  style={styles.select}
                >
                  <option value="">Seleccionar</option>
                  {[...new Set(productos.map((p) => p.categoria).filter(Boolean))].map(
                    (categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    )
                  )}
                </select>
              </th>
              <th style={styles.th}></th>
            </tr>
          </thead>

          <tbody>
            {productos
              .filter((p) => {
                const coincideTexto = String(p.nombre || "")
                  .toLowerCase()
                  .includes(busquedaProductos.toLowerCase());

                const coincideCategoria =
                  !filtroCategoriaProductos ||
                  String(p.categoria || "") === filtroCategoriaProductos;

                return coincideTexto && coincideCategoria;
              })
              .map((producto) => {
                const precio = Number(producto.precio || 0);
                const impuesto = Number(producto.impuesto || 0);
                const precioFinal = precio + precio * (impuesto / 100);
                const estaInactivo = producto.activo === false;

                return (
                  <tr
                    key={producto.id}
                    style={
                      estaInactivo
                        ? {
                            opacity: 0.6,
                            backgroundColor: "#f3f4f6",
                          }
                        : {}
                    }
                  >
                    <td style={styles.td}>
  <input
    type="checkbox"
    checked={!!productosSeleccionados[producto.id]}
    onChange={(e) =>
      setProductosSeleccionados((prev) => ({
        ...prev,
        [producto.id]: e.target.checked,
      }))
    }
    title={`Seleccionar ${producto.nombre}`}
    onClick={(e) => e.stopPropagation()}
  />
</td>

                    <td style={styles.td}>
                      {producto.nombre}
                      {estaInactivo ? " 🔒" : ""}
                    </td>

                    <td style={styles.td}>{producto.codigo || ""}</td>
                    <td style={styles.td}>{precio.toFixed(4)}</td>
                    <td style={styles.td}>{impuesto.toFixed(4)}</td>
                    <td style={styles.td}>{precioFinal.toFixed(2)}</td>
                    <td style={styles.td}>
                      {producto.categoria || ""}
                      {estaInactivo ? " (Inactivo)" : ""}
                    </td>

                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          style={styles.smallDarkButton}
                          title="Ver detalle"
                          onClick={() => {
                            setProductoDetalle(producto);
                            setMostrarFormularioProducto(false);
                          }}
                        >
                          ◉
                        </button>

                        <button
                          type="button"
                          style={styles.editIconButton}
                          title="Editar producto"
                          onClick={() => {
                            setProductoDetalle(null);
                            setProductoEditando(producto);
                            setProductoForm({
                              nombre: producto.nombre || "",
                              codigo: producto.codigo || "",
                              precio: producto.precio ?? "",
                              categoria: producto.categoria || "",
                              stock: producto.stock ?? "",
                              imagen: producto.imagen || "",
                              activo: producto.activo !== false,
                            });
                            setVista("productos");
                            setMostrarFormularioProducto(true);
                          }}
                        >
                          ✎
                        </button>

                      <button
  type="button"
  style={styles.deleteIconButton}
  title={estaInactivo ? "Reactivar producto" : "Desactivar producto"}
  onClick={() => {
    if (estaInactivo) {
      const confirmado = window.confirm(
        `¿Deseas reactivar el producto ${producto.nombre}?`
      );
      if (!confirmado) return;

      reactivarProducto(producto.id);
      return;
    }

    const confirmado = window.confirm(
      `¿Deseas desactivar el producto ${producto.nombre}?`
    );
    if (!confirmado) return;

    desactivarProducto(producto.id);
  }}
>
  {estaInactivo ? "🔓" : "🗑"}
</button>

                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  </>
)}

       {vista === "alumnos" && (
  <AlumnosModulo
    styles={styles}
    filtroAlumnos={filtroAlumnos}
    setFiltroAlumnos={setFiltroAlumnos}
    cargarAlumnos={cargarAlumnos}
    alumnoDetalle={alumnoDetalle}
    obtenerCedulaAlumno={obtenerCedulaAlumno}
    formatearMoneda={formatearMoneda}
    setVista={setVista}
    setVistaVentasInterna={setVistaVentasInterna}
    setModoNuevaOrden={setModoNuevaOrden}
    setVentaItems={setVentaItems}
    setVentaForm={setVentaForm}
    setBusquedaUsuarioNuevaOrden={setBusquedaUsuarioNuevaOrden}
    setBusquedaProductoNuevaOrden={setBusquedaProductoNuevaOrden}
    setCodigoBarraNuevaOrden={setCodigoBarraNuevaOrden}
    setCategoriaNuevaOrden={setCategoriaNuevaOrden}
    setRecargaForm={setRecargaForm}
    iniciarEdicionAlumno={iniciarEdicionAlumno}
    setAlumnoDetalle={setAlumnoDetalle}
    setVistaAlumnoDetalle={setVistaAlumnoDetalle}
    vistaAlumnoDetalle={vistaAlumnoDetalle}
    historialVentasAlumno={historialVentasAlumno}
    historialConsumoAlumno={historialConsumoAlumno}
    setOrdenDetalleAlumno={setOrdenDetalleAlumno}
    ordenDetalleAlumno={ordenDetalleAlumno}
    historialRecargasAlumno={historialRecargasAlumno}
    editandoAlumnoId={editandoAlumnoId}
    actualizarAlumno={actualizarAlumno}
    crearAlumno={crearAlumno}
    alumnoForm={alumnoForm}
    setAlumnoForm={setAlumnoForm}
    limpiarFormularioAlumno={limpiarFormularioAlumno}
    alumnosFiltrados={alumnosFiltrados}
    eliminarAlumno={eliminarAlumno}
    restaurarAlumno={restaurarAlumno}
    API_URL={API_URL}
    obtenerInstitucionActivaId={obtenerInstitucionActivaId}
    setHistorialVentasAlumno={setHistorialVentasAlumno}
    setHistorialRecargasAlumno={setHistorialRecargasAlumno}
    setHistorialConsumoAlumno={setHistorialConsumoAlumno}
    cuentasBancarias={cuentasBancarias}
    cargarCuentasBancarias={cargarCuentasBancarias}
    cargarRecargas={cargarRecargas}
    rolActual={rolActual}
    descargarPlantillaAlumnos={descargarPlantillaAlumnos}
    importarAlumnosArchivo={importarAlumnosArchivo}
    inputImportarAlumnosRef={inputImportarAlumnosRef}
  />
)}


{vista === "padres" && (
  <PadresModulo
    API_URL={API_URL}
    token={localStorage.getItem("token")}
    institucionId={institucionActivaId}
    institucionNombre={institucionActiva?.nombre || "Institución"}
    alumnos={alumnos}
    cargarAlumnos={cargarAlumnos}
  />
)}

{vista === "productos_mas_vendidos" && (
  <ProductosMasVendidosModulo
    API_URL={API_URL}
    token={localStorage.getItem("token")}
    institucionId={institucionActivaId}
    institucionNombre={institucionActiva?.nombre || "Institución"}
  />
)}

{vista === "kardex_productos" && (
  <KardexModulo
    API_URL={API_URL}
    token={localStorage.getItem("token")}
    institucionId={institucionActivaId}
    institucionNombre={institucionActiva?.nombre || "Institución"}
    productos={productos}
  />
)}

{vista === "productos_forma_pago" && (
  <ProductosFormaPagoModulo
    API_URL={API_URL}
    token={localStorage.getItem("token")}
    institucionId={institucionActivaId}
    institucionNombre={institucionActiva?.nombre || "Institución"}
  />
)}

{vista === "profesores" && (
  <>
    {mostrarModalRecargaProfesor && profesorDetalle && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.62)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 18,
        }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            cerrarModalRecargaProfesor();
          }
        }}
      >
        <div
          style={{
            width: "min(780px, 96vw)",
            maxHeight: "92vh",
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: 18,
            padding: "28px 32px",
            boxShadow: "0 24px 70px rgba(15, 23, 42, 0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 25, color: "#172033" }}>
                Recarga de saldo
              </h3>
              <div style={{ marginTop: 8, color: "#334155" }}>
                {`${profesorDetalle.nombres || ""} ${
                  profesorDetalle.apellidos || ""
                }`.trim()}
              </div>
            </div>

            <button
              type="button"
              onClick={cerrarModalRecargaProfesor}
              disabled={guardandoRecargaProfesor}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 34,
                lineHeight: 1,
                color: "#64748b",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <form onSubmit={registrarRecargaProfesor}>
            <label
              style={{
                display: "block",
                fontWeight: 800,
                color: "#334155",
                fontSize: 17,
                marginBottom: 8,
              }}
            >
              Valor a recargar *
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={recargaProfesorForm.monto}
              onChange={(e) =>
                setRecargaProfesorForm((prev) => ({
                  ...prev,
                  monto: e.target.value,
                }))
              }
              placeholder="0.00"
              autoFocus
              required
              style={{
                width: "100%",
                height: 56,
                border: "2px solid #172033",
                borderRadius: 12,
                padding: "0 16px",
                fontSize: 20,
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                marginTop: 24,
                fontWeight: 800,
                color: "#475569",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              <span>¿Es transferencia?</span>
              <input
                type="checkbox"
                checked={
                  recargaProfesorForm.metodo_pago === "TRANSFERENCIA"
                }
                onChange={(e) =>
                  setRecargaProfesorForm((prev) => ({
                    ...prev,
                    metodo_pago: e.target.checked
                      ? "TRANSFERENCIA"
                      : "EFECTIVO",
                    cuenta_bancaria_id: "",
                    banco: "",
                    numero_comprobante: "",
                  }))
                }
                style={{ width: 20, height: 20 }}
              />
            </label>

            {recargaProfesorForm.metodo_pago === "TRANSFERENCIA" && (
              <>
                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#334155",
                    fontSize: 17,
                    marginTop: 22,
                    marginBottom: 8,
                  }}
                >
                  Banco donde realizó la transferencia *
                </label>
                <select
                  value={recargaProfesorForm.cuenta_bancaria_id}
                  onChange={(e) => {
                    const cuenta = cuentasBancarias.find(
                      (c) => String(c.id) === String(e.target.value)
                    );

                    setRecargaProfesorForm((prev) => ({
                      ...prev,
                      cuenta_bancaria_id: e.target.value,
                      banco: cuenta ? cuenta.banco : "",
                    }));
                  }}
                  required
                  style={{
                    width: "100%",
                    height: 54,
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "0 14px",
                    fontSize: 16,
                    background: "#ffffff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Seleccionar banco</option>
                  {cuentasBancarias
                    .filter((cuenta) => cuenta.activo !== false)
                    .map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {cuenta.banco}
                      </option>
                    ))}
                </select>

                {!cuentasBancarias.length && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 10,
                      borderRadius: 8,
                      background: "#fff7ed",
                      color: "#9a3412",
                    }}
                  >
                    No hay bancos configurados. Regístralos en
                    Configuración → Bancos.
                  </div>
                )}

                <label
                  style={{
                    display: "block",
                    fontWeight: 800,
                    color: "#334155",
                    fontSize: 17,
                    marginTop: 20,
                    marginBottom: 8,
                  }}
                >
                  Número de comprobante *
                </label>
                <input
                  type="text"
                  value={recargaProfesorForm.numero_comprobante}
                  onChange={(e) =>
                    setRecargaProfesorForm((prev) => ({
                      ...prev,
                      numero_comprobante: e.target.value,
                    }))
                  }
                  placeholder="Número de documento"
                  required
                  style={{
                    width: "100%",
                    height: 54,
                    border: "1px solid #cbd5e1",
                    borderRadius: 10,
                    padding: "0 14px",
                    fontSize: 16,
                    boxSizing: "border-box",
                  }}
                />
              </>
            )}

            <label
              style={{
                display: "block",
                fontWeight: 800,
                color: "#334155",
                fontSize: 17,
                marginTop: 22,
                marginBottom: 8,
              }}
            >
              Observación
            </label>
            <input
              type="text"
              value={recargaProfesorForm.observacion}
              onChange={(e) =>
                setRecargaProfesorForm((prev) => ({
                  ...prev,
                  observacion: e.target.value,
                }))
              }
              placeholder="Observación opcional"
              style={{
                width: "100%",
                height: 54,
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                padding: "0 14px",
                fontSize: 16,
                boxSizing: "border-box",
              }}
            />

            <div style={{ textAlign: "center", marginTop: 26 }}>
              <button
                type="submit"
                disabled={guardandoRecargaProfesor}
                style={{
                  minWidth: 245,
                  border: "none",
                  borderRadius: 10,
                  padding: "15px 24px",
                  background: "#2929bd",
                  color: "#ffffff",
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: guardandoRecargaProfesor
                    ? "not-allowed"
                    : "pointer",
                  opacity: guardandoRecargaProfesor ? 0.7 : 1,
                }}
              >
                {guardandoRecargaProfesor
                  ? "Procesando..."
                  : "Realizar recarga"}
              </button>
            </div>

            <p
              style={{
                margin: "22px 0 0",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              La recarga se acreditará inmediatamente al saldo del profesor.
            </p>
          </form>
        </div>
      </div>
    )}

    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Profesores</h1>
        <p style={styles.dashboardSubtitle}>
          Gestión de profesores y créditos
        </p>
      </div>

      <div style={styles.headerActions}>
        {profesorDetalle ? (
          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              setProfesorDetalle(null);
              setVistaProfesorDetalle("ordenes");
              setBusquedaProfesores("");
              setMostrarFiltroProfesores(false);
              limpiarFormularioProfesor();
            }}
          >
            ← Regresar al listado de profesores
          </button>
        ) : (
          <>
            <button
              type="button"
              style={
                vistaProfesoresInterna === "profesores"
                  ? styles.ventasTabActive
                  : styles.ventasTab
              }
              onClick={() => setVistaProfesoresInterna("profesores")}
            >
              Profesores
            </button>

            <button
              type="button"
              style={
                vistaProfesoresInterna === "creditos"
                  ? styles.ventasTabActive
                  : styles.ventasTab
              }
              onClick={async () => {
                setVistaProfesoresInterna("creditos");
                await cargarCreditosProfesores();
              }}
            >
              Créditos Profesores
            </button>
          </>
        )}
      </div>
    </div>

    {vistaProfesoresInterna === "profesores" && !profesorDetalle && (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {mostrarFormularioProfesor && (
        <div style={{ ...styles.box, width: "100%" }}>
          <div style={styles.pageHeaderSmall}>
            <h3 style={{ margin: 0 }}>
              {editandoProfesorId ? "Editar profesor" : "Nuevo profesor"}
            </h3>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => {
                limpiarFormularioProfesor();
                setMostrarFormularioProfesor(false);
              }}
            >
              Cerrar ✕
            </button>
          </div>

          <form
            onSubmit={guardarProfesor}
            style={{
              ...styles.form,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
              gap: 14,
            }}
          >
            <input
              type="text"
              placeholder="Cédula / RUC"
              value={profesorForm.cedula}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, cedula: e.target.value })
              }
              style={styles.input}
              required
            />

            <input
              type="text"
              placeholder="Nombres"
              value={profesorForm.nombres}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, nombres: e.target.value })
              }
              style={styles.input}
              required
            />

            <input
              type="text"
              placeholder="Apellidos"
              value={profesorForm.apellidos}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, apellidos: e.target.value })
              }
              style={styles.input}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={profesorForm.email}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, email: e.target.value })
              }
              style={styles.input}
            />

            <input
              type="text"
              placeholder="Código"
              value={profesorForm.codigo}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, codigo: e.target.value })
              }
              style={styles.input}
            />

            <input
              type="text"
              placeholder="Teléfono"
              value={profesorForm.telefono}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, telefono: e.target.value })
              }
              style={styles.input}
            />

            <input
              type="number"
              step="0.01"
              placeholder="Crédito"
              value={profesorForm.saldo}
              onChange={(e) =>
                setProfesorForm({ ...profesorForm, saldo: e.target.value })
              }
              style={styles.input}
            />

            <button type="submit" style={{ ...styles.button, minHeight: 48 }}>
              {editandoProfesorId ? "Actualizar profesor" : "Guardar profesor"}
            </button>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => {
                limpiarFormularioProfesor();
                setMostrarFormularioProfesor(false);
              }}
            >
              Cancelar
            </button>
          </form>
        </div>
        )}

        <div style={{ ...styles.box, width: "100%" }}>
          <div style={styles.pageHeaderSmall}>
            <h3 style={{ margin: 0 }}>Lista de profesores</h3>

            <div style={styles.headerActions}>
              <button
                type="button"
                style={styles.button}
                onClick={() => {
                  limpiarFormularioProfesor();
                  setMostrarFormularioProfesor(true);
                }}
              >
                + Nuevo profesor
              </button>

              <input
                ref={inputImportarProfesoresRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={importarProfesoresArchivo}
                style={{ display: "none" }}
              />

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={descargarPlantillaProfesores}
              >
                Descargar plantilla
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => inputImportarProfesoresRef.current?.click()}
              >
                Importar Excel
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={() => {
                  setMostrarFiltroProfesores((prev) => !prev);
                  if (mostrarFiltroProfesores) {
                    setBusquedaProfesores("");
                  }
                }}
              >
                {mostrarFiltroProfesores ? "Cerrar filtro" : "Filtrar profesor"}
              </button>

              {mostrarFiltroProfesores && (
                <input
                  type="text"
                  value={busquedaProfesores}
                  onChange={(e) => setBusquedaProfesores(e.target.value)}
                  placeholder="Nombres, apellidos o cédula"
                  style={{ ...styles.input, minWidth: 260, margin: 0 }}
                  autoFocus
                />
              )}

              <select
                value={filtroProfesores}
                onChange={(e) => setFiltroProfesores(e.target.value)}
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
                  const filas = [
                    [
                      "ID",
                      "Nombre",
                      "Apellido",
                      "Cedula/Ruc",
                      "Email",
                      "Codigo",
                      "Telefono",
                      "Credito",
                      "Estado",
                    ],
                    ...profesoresFiltrados.map((p) => [
                      p.id || "",
                      p.nombres || "",
                      p.apellidos || "",
                      p.cedula || "",
                      p.email || "",
                      p.codigo || "",
                      p.telefono || "",
                      Number(p.credito || p.saldo || 0).toFixed(2),
                      p.activo !== false ? "Activo" : "Inactivo",
                    ]),
                  ];

                  const csv = filas
                    .map((fila) =>
                      fila
                        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
                        .join(",")
                    )
                    .join("\n");

                  const blob = new Blob([csv], {
                    type: "text/csv;charset=utf-8;",
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "profesores.csv";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Exportar
              </button>
            </div>
          </div>

          {profesoresFiltrados.length === 0 ? (
            <p>No hay profesores para este filtro.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Apellido</th>
                    <th style={styles.th}>Es profesor</th>
                    <th style={styles.th}>Cédula/Ruc</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}>Crédito</th>
                    <th style={styles.th}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {profesoresFiltrados.map((p) => {
                      const activo = p.activo !== false;

                      return (
                        <tr key={p.id}>
                          <td style={styles.td}>{p.id || "-"}</td>
                          <td style={styles.td}>{p.nombres || "-"}</td>
                          <td style={styles.td}>{p.apellidos || "-"}</td>
                          <td style={styles.td}>{p.es_profesor ? "Sí" : "No"}</td>
                          <td style={styles.td}>{p.cedula || "-"}</td>
                          <td style={styles.td}>{p.email || "-"}</td>
                          <td style={styles.td}>{p.codigo || "-"}</td>
                          <td style={styles.td}>
                            {formatearMoneda(p.credito || p.saldo || 0)}
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                style={styles.smallDarkButton}
                                onClick={() => {
                                  setProfesorDetalle(p);
                                  setVistaProfesorDetalle("ordenes");
                                }}
                                title="Ver"
                              >
                                👁
                              </button>

                              <button
                                type="button"
                                style={styles.editIconButton}
                                onClick={() => {
                                  setEditandoProfesorId(p.id);
                                  setMostrarFormularioProfesor(true);
                                  setProfesorForm({
                                    cedula: p.cedula || "",
                                    nombres: p.nombres || "",
                                    apellidos: p.apellidos || "",
                                    email: p.email || "",
                                    codigo: p.codigo || "",
                                    telefono: p.telefono || "",
                                    saldo: p.credito || p.saldo || "",
                                    es_profesor: p.es_profesor !== false,
                                  });
                                }}
                                title="Editar"
                              >
                                ✏️
                              </button>

                              <button
                                type="button"
                                style={styles.moveIconButton}
                                onClick={() =>
                                  alert(
                                    `Notificación de saldo bajo para ${p.nombres || ""} ${p.apellidos || ""} aún no implementada.`
                                  )
                                }
                                title="Saldo bajo"
                              >
                                📨
                              </button>

                              <button
                                type="button"
                                style={styles.outlineButton}
                                onClick={() =>
                                  alert(
                                    `Ver dispositivo de ${p.nombres || ""} ${p.apellidos || ""} aún no implementado.`
                                  )
                                }
                                title="Ver dispositivo"
                              >
                                💳
                              </button>

                              <button
                                type="button"
                                style={
                                  activo
                                    ? styles.deleteIconButton
                                    : styles.disabledIconButton
                                }
                                onClick={() =>
                                  activo && desactivarProfesor(p)
                                }
                                disabled={!activo}
                                title="Eliminar"
                              >
                                🗑️
                              </button>

                              {!activo && (
                                <button
                                  type="button"
                                  style={styles.restoreIconButton}
                                  onClick={() => reactivarProfesor(p)}
                                  title="Restaurar"
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

    {vistaProfesoresInterna === "profesores" && profesorDetalle && (() => {
      const ordenesProfesor = ventasEnriquecidas.filter(
        (venta) =>
          Number(venta.profesor_id) === Number(profesorDetalle.id)
      );
      const totalPagadasProfesor = ordenesProfesor
        .filter(
          (venta) =>
            String(venta.estado || "PAGADA").toUpperCase() !==
            "PENDIENTE"
        )
        .reduce(
          (acumulado, venta) =>
            acumulado + Number(venta.total || 0),
          0
        );
      const totalPendientesProfesor = ordenesProfesor
        .filter(
          (venta) =>
            String(venta.estado || "").toUpperCase() ===
            "PENDIENTE"
        )
        .reduce(
          (acumulado, venta) =>
            acumulado + Number(venta.total || 0),
          0
        );

      return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #1e2bb8 0%, #3036c8 100%)",
            color: "#ffffff",
            padding: "22px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <button
              type="button"
              onClick={() => setProfesorDetalle(null)}
              style={{
                border: "none",
                background: "transparent",
                color: "#ff9a45",
                fontSize: 34,
                fontWeight: 900,
                cursor: "pointer",
                lineHeight: 1,
              }}
              title="Regresar a profesores"
            >
              ‹
            </button>

            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: "50%",
                background: "#ffffff",
                color: "#2435bd",
                border: "3px solid #ff8a45",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              {(profesorDetalle.nombres || "P").charAt(0).toUpperCase()}
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: 28, fontWeight: 900 }}>
                {`${profesorDetalle.nombres || ""} ${profesorDetalle.apellidos || ""}`.trim() || "Profesor"}
              </h2>
              <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: "#dbe7ff",
                    color: "#2435bd",
                    padding: "8px 18px",
                    borderRadius: 14,
                    fontWeight: 700,
                  }}
                >
                  Profesor
                </span>
                <span
                  style={{
                    background: profesorDetalle.activo !== false ? "#dcfce7" : "#fee2e2",
                    color: profesorDetalle.activo !== false ? "#166534" : "#991b1b",
                    padding: "8px 18px",
                    borderRadius: 14,
                    fontWeight: 700,
                  }}
                >
                  {profesorDetalle.activo !== false ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{ ...styles.outlineButton, background: "#ffffff", color: "#2435bd" }}
              onClick={async () => {
                setVistaProfesorDetalle("creditos");
                await cargarCreditosProfesores(profesorDetalle.id);
              }}
            >
              Historial de créditos
            </button>
            <button
              type="button"
              style={{ ...styles.outlineButton, background: "#ffffff", color: "#2435bd" }}
              onClick={() => {
                setEditandoProfesorId(profesorDetalle.id);
                setMostrarFormularioProfesor(true);
                setProfesorForm({
                  cedula: profesorDetalle.cedula || "",
                  nombres: profesorDetalle.nombres || "",
                  apellidos: profesorDetalle.apellidos || "",
                  email: profesorDetalle.email || "",
                  codigo: profesorDetalle.codigo || "",
                  telefono: profesorDetalle.telefono || "",
                  saldo: profesorDetalle.credito || profesorDetalle.saldo || "",
                  es_profesor: profesorDetalle.es_profesor !== false,
                });
                setProfesorDetalle(null);
              }}
            >
              Editar perfil
            </button>
            <button
              type="button"
              style={{
                border: "none",
                background: "#ff8548",
                color: "#ffffff",
                padding: "12px 22px",
                borderRadius: 10,
                fontWeight: 800,
                cursor: "pointer",
              }}
              onClick={() => {
                setVista("ventas");
                setVistaVentasInterna("registrar");
                setModoNuevaOrden("consumidor_final");
                setTipoUsuarioNuevaOrden("PROFESOR");
                setVentaItems([]);
                setVentaForm({
                  alumno_id: "",
                  profesor_id: String(profesorDetalle.id),
                  metodo_pago: profesorDetalle.credito_habilitado === true ? "CREDITO_PROFESOR" : "EFECTIVO",
                  observacion: "",
                });
                setBusquedaUsuarioNuevaOrden(
                  `${profesorDetalle.nombres || ""} ${profesorDetalle.apellidos || ""}`.trim()
                );
                setBusquedaProductoNuevaOrden("");
                setCodigoBarraNuevaOrden("");
                setCategoriaNuevaOrden("TODOS");
              }}
            >
              Crear orden +
            </button>
          </div>
        </div>

        <div style={{ padding: 28 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr) minmax(220px, 0.7fr)",
              gap: 22,
              alignItems: "stretch",
            }}
          >
            <div style={{ padding: 22, lineHeight: 2.05 }}>
              <div><strong>Teléfono:</strong> {profesorDetalle.telefono || "-"}</div>
              <div><strong>Email:</strong> {profesorDetalle.email || "-"}</div>
              <div><strong>Cédula:</strong> {profesorDetalle.cedula || "-"}</div>
              <div><strong>ID:</strong> {profesorDetalle.id || "-"}</div>
            </div>

            <div
              style={{
                padding: 24,
                borderRadius: 14,
                background: "#ffffff",
                boxShadow: "0 5px 18px rgba(15, 23, 42, 0.10)",
                lineHeight: 2.05,
              }}
            >
              <div><strong>Institución:</strong> {institucionActiva?.nombre || "-"}</div>
              <div><strong>Código:</strong> {profesorDetalle.codigo || "-"}</div>
              <div><strong>Es profesor:</strong> {profesorDetalle.es_profesor !== false ? "Sí" : "No"}</div>
              <div>
                <strong>Crédito:</strong>{" "}
                <span style={{ fontWeight: 900, color: profesorDetalle.credito_habilitado === true ? "#166534" : "#991b1b" }}>
                  {profesorDetalle.credito_habilitado === true ? "HABILITADO" : "INHABILITADO"}
                </span>
              </div>
            </div>

            <div
              style={{
                padding: 22,
                borderRadius: 14,
                background: "#ffffff",
                boxShadow: "0 5px 18px rgba(15, 23, 42, 0.10)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  background: "#d9f7ea",
                  borderRadius: 12,
                  padding: 18,
                  fontWeight: 800,
                }}
              >
                <div style={{ fontSize: 17 }}>Crédito actual:</div>
                <div style={{ fontSize: 34, marginTop: 4 }}>
                  {formatearMoneda(profesorDetalle.credito || profesorDetalle.saldo || 0)}
                </div>
              </div>
              <button
                type="button"
                style={{ ...styles.button, width: "100%", marginTop: 18 }}
                onClick={abrirModalRecargaProfesor}
                disabled={guardandoRecargaProfesor}
              >
                Recargar saldo
              </button>
            </div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                ["ordenes", "Órdenes"],
                ["recargas", "Recargas"],
                ["dispositivos", "Dispositivos"],
                ["creditos", "Créditos"],
              ].map(([clave, texto]) => (
                <button
                  key={clave}
                  type="button"
                  onClick={async () => {
                    setVistaProfesorDetalle(clave);

                    if (
                      (clave === "creditos" ||
                        clave === "recargas") &&
                      profesorDetalle?.id
                    ) {
                      await cargarCreditosProfesores(
                        profesorDetalle.id
                      );
                    }
                  }}
                  style={{
                    border: "2px solid #ff8548",
                    background: vistaProfesorDetalle === clave ? "#ff8548" : "#ffffff",
                    color: vistaProfesorDetalle === clave ? "#ffffff" : "#ff5b24",
                    padding: "12px 28px",
                    borderRadius: "10px 10px 0 0",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {texto}
                </button>
              ))}
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0 14px 14px 14px",
                padding: 24,
                minHeight: 220,
                background: "#ffffff",
              }}
            >
              {vistaProfesorDetalle === "ordenes" && (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", gap: 14 }}>
                      <div
                        style={{
                          padding: "16px 24px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                        }}
                      >
                        <div>Total pagadas</div>
                        <strong style={{ fontSize: 28 }}>
                          {formatearMoneda(totalPagadasProfesor)}
                        </strong>
                      </div>
                      <div
                        style={{
                          padding: "16px 24px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 12,
                        }}
                      >
                        <div>Total pendientes</div>
                        <strong
                          style={{ fontSize: 28, color: "#10b981" }}
                        >
                          {formatearMoneda(totalPendientesProfesor)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ ...styles.tableWrap, marginTop: 24 }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Orden</th>
                          <th style={styles.th}>Nombre</th>
                          <th style={styles.th}>Apellido</th>
                          <th style={styles.th}>Detalles</th>
                          <th style={styles.th}>Fecha</th>
                          <th style={styles.th}>Total</th>
                          <th style={styles.th}>Forma de pago</th>
                          <th style={styles.th}>Estado</th>
                          <th style={styles.th}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenesProfesor.length === 0 ? (
                          <tr>
                            <td style={styles.td} colSpan={9}>
                              No hay datos disponibles
                            </td>
                          </tr>
                        ) : (
                          ordenesProfesor.map((venta) => (
                            <tr key={venta.id}>
                              <td style={styles.td}>#{venta.id}</td>
                              <td style={styles.td}>
                                {profesorDetalle.nombres || "-"}
                              </td>
                              <td style={styles.td}>
                                {profesorDetalle.apellidos || "-"}
                              </td>
                              <td style={styles.td}>
                                {Array.isArray(venta.items)
                                  ? `${venta.items.length} producto(s)`
                                  : "Ver orden"}
                              </td>
                              <td style={styles.td}>
                                {venta.created_at
                                  ? new Date(
                                      venta.created_at
                                    ).toLocaleString()
                                  : "-"}
                              </td>
                              <td style={styles.td}>
                                {formatearMoneda(venta.total || 0)}
                              </td>
                              <td style={styles.td}>
                                {venta.metodo_visual ||
                                  venta.metodo_pago ||
                                  "-"}
                              </td>
                              <td style={styles.td}>
                                {venta.estado || "PAGADA"}
                              </td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={styles.smallDarkButton}
                                  onClick={() =>
                                    reimprimirVenta(venta)
                                  }
                                >
                                  Reimprimir
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {vistaProfesorDetalle === "recargas" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                      marginBottom: 18,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>Recargas del profesor</h3>
                      <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                        Saldo disponible: {" "}
                        <strong>
                          {formatearMoneda(
                            profesorDetalle.saldo || profesorDetalle.credito || 0
                          )}
                        </strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => cargarCreditosProfesores(profesorDetalle.id)}
                    >
                      Actualizar
                    </button>
                  </div>

                  <form
                    onSubmit={registrarRecargaProfesor}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 12,
                      marginBottom: 22,
                      padding: 16,
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <div>
                      <label style={styles.filterLabelTop}>Monto *</label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={recargaProfesorForm.monto}
                        onChange={(e) =>
                          setRecargaProfesorForm((prev) => ({
                            ...prev,
                            monto: e.target.value,
                          }))
                        }
                        style={styles.input}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div>
                      <label style={styles.filterLabelTop}>Forma de pago</label>
                      <select
                        value={recargaProfesorForm.metodo_pago}
                        onChange={(e) =>
                          setRecargaProfesorForm((prev) => ({
                            ...prev,
                            metodo_pago: e.target.value,
                            numero_comprobante: "",
                            banco: "",
                            cuenta_bancaria_id: "",
                          }))
                        }
                        style={styles.input}
                      >
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                      </select>
                    </div>

                    {recargaProfesorForm.metodo_pago === "TRANSFERENCIA" && (
                      <>
                        <div>
                          <label style={styles.filterLabelTop}>Banco *</label>
                          <select
                            value={recargaProfesorForm.cuenta_bancaria_id || ""}
                            onChange={(e) => {
                              const cuenta = cuentasBancarias.find(
                                (item) => String(item.id) === String(e.target.value)
                              );

                              setRecargaProfesorForm((prev) => ({
                                ...prev,
                                cuenta_bancaria_id: e.target.value,
                                banco: cuenta ? cuenta.banco : "",
                              }));
                            }}
                            style={styles.input}
                            required
                          >
                            <option value="">Seleccionar banco</option>
                            {cuentasBancarias
                              .filter((cuenta) => cuenta.activo !== false)
                              .map((cuenta) => (
                                <option key={cuenta.id} value={cuenta.id}>
                                  {cuenta.banco}
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label style={styles.filterLabelTop}>No. comprobante *</label>
                          <input
                            type="text"
                            value={recargaProfesorForm.numero_comprobante}
                            onChange={(e) =>
                              setRecargaProfesorForm((prev) => ({
                                ...prev,
                                numero_comprobante: e.target.value,
                              }))
                            }
                            style={styles.input}
                            placeholder="Número de comprobante"
                            maxLength={100}
                            required
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <label style={styles.filterLabelTop}>Observación</label>
                      <input
                        type="text"
                        value={recargaProfesorForm.observacion}
                        onChange={(e) =>
                          setRecargaProfesorForm((prev) => ({
                            ...prev,
                            observacion: e.target.value,
                          }))
                        }
                        style={styles.input}
                        placeholder="Opcional"
                        maxLength={500}
                      />
                    </div>

                    <div style={{ display: "flex", alignItems: "end" }}>
                      <button
                        type="submit"
                        style={styles.button}
                        disabled={guardandoRecargaProfesor}
                      >
                        {guardandoRecargaProfesor
                          ? "Registrando..."
                          : recargaProfesorForm.metodo_pago === "EFECTIVO"
                          ? "Recargar efectivo"
                          : "Registrar transferencia"}
                      </button>
                    </div>
                  </form>

                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Fecha</th>
                          <th style={styles.th}>Monto</th>
                          <th style={styles.th}>Forma</th>
                          <th style={styles.th}>Banco</th>
                          <th style={styles.th}>Comprobante</th>
                          <th style={styles.th}>Usuario</th>
                          <th style={styles.th}>Saldo nuevo</th>
                          <th style={styles.th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditosProfesoresFiltrados.filter(
                          (movimiento) =>
                            Number(movimiento.profesor_id) ===
                              Number(profesorDetalle.id) &&
                            movimiento.tipo === "RECARGA"
                        ).length === 0 ? (
                          <tr>
                            <td style={styles.td} colSpan={8}>
                              No hay recargas registradas.
                            </td>
                          </tr>
                        ) : (
                          creditosProfesoresFiltrados
                            .filter(
                              (movimiento) =>
                                Number(movimiento.profesor_id) ===
                                  Number(profesorDetalle.id) &&
                                movimiento.tipo === "RECARGA"
                            )
                            .map((movimiento) => (
                              <tr key={movimiento.id}>
                                <td style={styles.td}>
                                  {movimiento.created_at
                                    ? new Date(movimiento.created_at).toLocaleString(
                                        "es-EC",
                                        { timeZone: "America/Guayaquil" }
                                      )
                                    : "-"}
                                </td>
                                <td style={styles.td}>
                                  {formatearMoneda(movimiento.monto || 0)}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.metodo_pago || "EFECTIVO"}
                                </td>
                                <td style={styles.td}>{movimiento.banco || "-"}</td>
                                <td style={styles.td}>
                                  {movimiento.numero_comprobante || "-"}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.usuario_nombre ||
                                    movimiento.usuario_correo ||
                                    "Sistema"}
                                </td>
                                <td style={styles.td}>
                                  {formatearMoneda(movimiento.saldo_nuevo || 0)}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.estado || "ACTIVO"}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {vistaProfesorDetalle === "dispositivos" && (
                <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
                  No hay dispositivos registrados para este profesor.
                </div>
              )}

              {vistaProfesorDetalle === "creditos" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                      marginBottom: 20,
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>
                        Historial de créditos,{" "}
                        {`${profesorDetalle.nombres || ""} ${
                          profesorDetalle.apellidos || ""
                        }`.trim()}
                      </h3>

                      <p style={{ margin: "6px 0 0", color: "#64748b" }}>
                        Saldo/Crédito actual:{" "}
                        <strong>
                          {formatearMoneda(
                            profesorDetalle.saldo ||
                              profesorDetalle.credito ||
                              0
                          )}
                        </strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() =>
                        cargarCreditosProfesores(profesorDetalle.id)
                      }
                    >
                      Actualizar
                    </button>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(210px, 1fr))",
                      gap: 14,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        minHeight: 130,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(15,23,42,.06)",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#0f172a",
                            marginBottom: 10,
                          }}
                        >
                          Límite de crédito
                        </div>
                        <strong
                          style={{
                            fontSize: 38,
                            lineHeight: 1,
                            color: "#003b66",
                          }}
                        >
                          {formatearMoneda(
                            profesorDetalle.limite_credito || 0
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        minHeight: 130,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(15,23,42,.06)",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#0f172a",
                            marginBottom: 10,
                          }}
                        >
                          Crédito utilizado
                        </div>
                        <strong
                          style={{
                            fontSize: 38,
                            lineHeight: 1,
                            color: "#28c58b",
                          }}
                        >
                          {formatearMoneda(
                            profesorDetalle.credito_utilizado || 0
                          )}
                        </strong>
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 14,
                        minHeight: 130,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 8px 24px rgba(15,23,42,.06)",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 16,
                            color: "#0f172a",
                            marginBottom: 10,
                          }}
                        >
                          Crédito disponible
                        </div>
                        <strong
                          style={{
                            fontSize: 38,
                            lineHeight: 1,
                            color: "#003b66",
                          }}
                        >
                          {formatearMoneda(
                            profesorDetalle.credito_disponible ??
                              Math.max(
                                0,
                                Number(
                                  profesorDetalle.limite_credito || 0
                                ) -
                                  Number(
                                    profesorDetalle.credito_utilizado ||
                                      0
                                  )
                              )
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {["ADMIN", "SUPER_ADMIN"].includes(rolActual) && (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(180px,.7fr) minmax(180px,.8fr) minmax(280px,1fr) minmax(260px,1fr)",
                        gap: 12,
                        padding: 16,
                        marginBottom: 18,
                        border: "1px solid #e5e7eb",
                        borderRadius: 12,
                        background: "#f8fafc",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <strong>Habilitar crédito</strong>
                        <div
                          style={{
                            marginTop: 5,
                            fontWeight: 800,
                            color:
                              profesorDetalle.credito_habilitado === true
                                ? "#166534"
                                : "#991b1b",
                          }}
                        >
                          {profesorDetalle.credito_habilitado === true
                            ? "HABILITADO"
                            : "INHABILITADO"}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#64748b",
                            lineHeight: 1.35,
                          }}
                        >
                          {profesorDetalle.credito_habilitado === true
                            ? "Ahora puedes definir o modificar el límite. Para guardar o deshabilitar vuelve a ingresar la contraseña del administrador."
                            : "Primero valida la contraseña del administrador. El límite se configura después de habilitar."}
                        </div>
                      </div>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={
                          profesorDetalle.credito_habilitado === true
                            ? "Ingresa el límite de crédito"
                            : "Se habilita después de validar la contraseña"
                        }
                        value={creditoProfesorLimite}
                        onChange={(e) =>
                          setCreditoProfesorLimite(e.target.value)
                        }
                        style={styles.input}
                        disabled={
                          profesorDetalle.credito_habilitado !== true
                        }
                      />

                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type={
                            verCreditoProfesorAdminPassword
                              ? "text"
                              : "password"
                          }
                          placeholder="Contraseña del administrador"
                          value={creditoProfesorAdminPassword}
                          onChange={(e) =>
                            setCreditoProfesorAdminPassword(
                              e.target.value
                            )
                          }
                          style={{
                            ...styles.input,
                            flex: 1,
                          }}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          style={styles.outlineButton}
                          onClick={() =>
                            setVerCreditoProfesorAdminPassword(
                              (actual) => !actual
                            )
                          }
                        >
                          {verCreditoProfesorAdminPassword
                            ? "Ocultar"
                            : "Ver"}
                        </button>
                      </div>

                      {profesorDetalle.credito_habilitado !== true ? (
                        <button
                          type="button"
                          style={styles.button}
                          disabled={
                            guardandoAutorizacionCreditoProfesor
                          }
                          onClick={() =>
                            actualizarCreditoProfesor("HABILITAR")
                          }
                        >
                          {guardandoAutorizacionCreditoProfesor
                            ? "Validando..."
                            : "Autorizar y habilitar crédito"}
                        </button>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            style={styles.button}
                            disabled={
                              guardandoAutorizacionCreditoProfesor
                            }
                            onClick={() =>
                              actualizarCreditoProfesor(
                                "GUARDAR_LIMITE"
                              )
                            }
                          >
                            {guardandoAutorizacionCreditoProfesor
                              ? "Validando..."
                              : "Guardar límite"}
                          </button>

                          <button
                            type="button"
                            style={{
                              ...styles.outlineButton,
                              borderColor: "#dc2626",
                              color: "#dc2626",
                            }}
                            disabled={
                              guardandoAutorizacionCreditoProfesor
                            }
                            onClick={() =>
                              actualizarCreditoProfesor(
                                "DESHABILITAR"
                              )
                            }
                          >
                            Deshabilitar crédito
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <form
                    onSubmit={registrarCreditoProfesor}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 12,
                      marginBottom: 22,
                      padding: 16,
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      background: "#f8fafc",
                    }}
                  >
                    <select
                      value={creditoProfesorForm.tipo}
                      onChange={(e) =>
                        setCreditoProfesorForm({
                          ...creditoProfesorForm,
                          tipo: e.target.value,
                        })
                      }
                      style={styles.input}
                    >
                      <option value="AJUSTE_POSITIVO">
                        Ajuste positivo
                      </option>
                      <option value="CONSUMO">
                        Registrar consumo
                      </option>
                      <option value="AJUSTE_POSITIVO">
                        Ajuste positivo
                      </option>
                      <option value="AJUSTE_NEGATIVO">
                        Ajuste negativo
                      </option>
                    </select>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Monto"
                      value={creditoProfesorForm.monto}
                      onChange={(e) =>
                        setCreditoProfesorForm({
                          ...creditoProfesorForm,
                          monto: e.target.value,
                        })
                      }
                      style={styles.input}
                      required
                    />

                    <input
                      type="text"
                      placeholder="Comercio"
                      value={creditoProfesorForm.comercio}
                      onChange={(e) =>
                        setCreditoProfesorForm({
                          ...creditoProfesorForm,
                          comercio: e.target.value,
                        })
                      }
                      style={styles.input}
                    />

                    <input
                      type="text"
                      placeholder="Observación"
                      value={creditoProfesorForm.observacion}
                      onChange={(e) =>
                        setCreditoProfesorForm({
                          ...creditoProfesorForm,
                          observacion: e.target.value,
                        })
                      }
                      style={styles.input}
                    />

                    <button
                      type="submit"
                      style={styles.button}
                    >
                      Guardar movimiento
                    </button>
                  </form>

                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Comercio</th>
                          <th style={styles.th}>
                            Usuario que hizo el pago
                          </th>
                          <th style={styles.th}>Tipo</th>
                          <th style={styles.th}>Monto</th>
                          <th style={styles.th}>Saldo nuevo</th>
                          <th style={styles.th}>Fecha</th>
                          <th style={styles.th}>Estado</th>
                          <th style={styles.th}>Acciones</th>
                        </tr>
                      </thead>

                      <tbody>
                        {cargandoCreditosProfesores ? (
                          <tr>
                            <td style={styles.td} colSpan={8}>
                              Cargando historial...
                            </td>
                          </tr>
                        ) : creditosProfesoresFiltrados.filter(
                            (movimiento) =>
                              Number(movimiento.profesor_id) ===
                              Number(profesorDetalle.id)
                          ).length === 0 ? (
                          <tr>
                            <td style={styles.td} colSpan={8}>
                              No hay datos disponibles
                            </td>
                          </tr>
                        ) : (
                          creditosProfesoresFiltrados
                            .filter(
                              (movimiento) =>
                                Number(movimiento.profesor_id) ===
                                Number(profesorDetalle.id)
                            )
                            .map((movimiento) => (
                              <tr key={movimiento.id}>
                                <td style={styles.td}>
                                  {movimiento.comercio || "POS NUBE"}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.usuario_nombre ||
                                    movimiento.usuario_correo ||
                                    "Sistema"}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.tipo || "-"}
                                </td>
                                <td style={styles.td}>
                                  {formatearMoneda(
                                    movimiento.monto || 0
                                  )}
                                </td>
                                <td style={styles.td}>
                                  {formatearMoneda(
                                    movimiento.saldo_nuevo || 0
                                  )}
                                </td>
                                <td style={styles.td}>
                                  {formatearFechaHora(
                                    movimiento.created_at
                                  )}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.estado || "ACTIVO"}
                                </td>
                                <td style={styles.td}>
                                  {movimiento.estado !== "ANULADO" ? (
                                    <button
                                      type="button"
                                      style={styles.smallDangerButton}
                                      onClick={() =>
                                        anularCreditoProfesor(
                                          movimiento
                                        )
                                      }
                                    >
                                      Anular
                                    </button>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      );
    })()}

    {vistaProfesoresInterna === "creditos" && (
      <div style={styles.box}>
        <div style={styles.pageHeaderSmall}>
          <h3 style={{ margin: 0 }}>
            Historial de créditos de profesores
          </h3>

          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.outlineButton}
              onClick={() =>
                setVistaProfesoresInterna("profesores")
              }
            >
              Volver a Profesores
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={exportarCreditosProfesores}
            >
              Exportar
            </button>
          </div>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Fecha inicial</label>
            <input
              type="date"
              value={creditosProfesoresFiltros.fecha_inicio}
              onChange={(e) =>
                setCreditosProfesoresFiltros({
                  ...creditosProfesoresFiltros,
                  fecha_inicio: e.target.value,
                })
              }
              style={styles.input}
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Fecha final</label>
            <input
              type="date"
              value={creditosProfesoresFiltros.fecha_fin}
              onChange={(e) =>
                setCreditosProfesoresFiltros({
                  ...creditosProfesoresFiltros,
                  fecha_fin: e.target.value,
                })
              }
              style={styles.input}
            />
          </div>

          <div style={styles.filterFieldWide}>
            <label style={styles.label}>Buscar</label>
            <input
              type="text"
              placeholder="Profesor, comercio, usuario o tipo"
              value={creditosProfesoresFiltros.texto}
              onChange={(e) =>
                setCreditosProfesoresFiltros({
                  ...creditosProfesoresFiltros,
                  texto: e.target.value,
                })
              }
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button
            type="button"
            style={styles.button}
            onClick={() => cargarCreditosProfesores()}
          >
            Filtrar
          </button>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => {
              setCreditosProfesoresFiltros({
                fecha_inicio: "",
                fecha_fin: "",
                texto: "",
              });
              window.setTimeout(
                () => cargarCreditosProfesores(),
                0
              );
            }}
          >
            Borrar filtros
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Profesor</th>
                  <th style={styles.th}>Comercio</th>
                  <th style={styles.th}>
                    Usuario que hizo el pago
                  </th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Monto</th>
                  <th style={styles.th}>Saldo nuevo</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargandoCreditosProfesores ? (
                  <tr>
                    <td style={styles.td} colSpan={9}>
                      Cargando historial...
                    </td>
                  </tr>
                ) : creditosProfesoresFiltrados.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={9}>
                      No hay datos disponibles
                    </td>
                  </tr>
                ) : (
                  creditosProfesoresFiltrados.map(
                    (movimiento) => (
                      <tr key={movimiento.id}>
                        <td style={styles.td}>
                          {`${movimiento.nombres || ""} ${
                            movimiento.apellidos || ""
                          }`.trim()}
                        </td>
                        <td style={styles.td}>
                          {movimiento.comercio || "POS NUBE"}
                        </td>
                        <td style={styles.td}>
                          {movimiento.usuario_nombre ||
                            movimiento.usuario_correo ||
                            "Sistema"}
                        </td>
                        <td style={styles.td}>
                          {movimiento.tipo || "-"}
                        </td>
                        <td style={styles.td}>
                          {formatearMoneda(
                            movimiento.monto || 0
                          )}
                        </td>
                        <td style={styles.td}>
                          {formatearMoneda(
                            movimiento.saldo_nuevo || 0
                          )}
                        </td>
                        <td style={styles.td}>
                          {formatearFechaHora(
                            movimiento.created_at
                          )}
                        </td>
                        <td style={styles.td}>
                          {movimiento.estado || "ACTIVO"}
                        </td>
                        <td style={styles.td}>
                          {movimiento.estado !== "ANULADO" ? (
                            <button
                              type="button"
                              style={styles.smallDangerButton}
                              onClick={() =>
                                anularCreditoProfesor(movimiento)
                              }
                            >
                              Anular
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </>
)}
      {vista === "inventario" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Stock</h1>
        <p style={{margin:"6px 0 0",color:"#64748b"}}>
          Control de ingresos y egresos de inventario por ubicación.
        </p>
      </div>

      <div style={styles.headerActions}>
        <button
          type="button"
          style={styles.refreshButton}
          onClick={() => cargarExistenciasInventario()}
        >
          Refrescar stock
        </button>

        {puede("inventario.gestionar")&&(
          <button
            type="button"
            style={styles.button}
            onClick={()=>{
              setNuevoProductoStockForm((p)=>({
                ...p,
                ubicacion_inicial:
                  p.ubicacion_inicial ||
                  jornadaActiva?.punto_nombre ||
                  puntosOperacion[0]?.nombre ||
                  "PRINCIPAL",
              }));
              setMostrarNuevoProductoStock(true);
            }}
          >
            + Nuevo producto
          </button>
        )}

        {["SUPER_ADMIN","ADMIN"].includes(rolActual)&&(
          <button
            type="button"
            style={styles.outlineButton}
            onClick={()=>setMostrarPuntosStock((v)=>!v)}
          >
            Puntos / ubicaciones
          </button>
        )}

        <button
          type="button"
          style={styles.outlineButton}
          onClick={exportarStockExcel}
        >
          Exportar existencias
        </button>

        {puede("inventario.gestionar")&&(
          <button
            type="button"
            style={styles.button}
            onClick={()=>inputImportarStockRef.current?.click()}
          >
            Importar productos
          </button>
        )}

        <input
          ref={inputImportarStockRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={importarStockArchivo}
          style={{display:"none"}}
        />
      </div>
    </div>

    <div style={{
      ...styles.box,
      marginBottom:20,
      border:"1px solid #bfdbfe",
      background:"#eff6ff"
    }}>
      <div style={{
        display:"flex",
        justifyContent:"space-between",
        gap:16,
        flexWrap:"wrap",
        alignItems:"center"
      }}>
        <div>
          <strong style={{fontSize:18}}>
            Punto de trabajo: {jornadaActiva?.punto_nombre||"SIN JORNADA"}
          </strong>
          <div style={{color:"#64748b",marginTop:6}}>
            Operador:{" "}
            {jornadaActiva?.usuario_nombre||
              jornadaActiva?.usuario_correo||
              usuario?.nombre||
              usuario?.correo||
              "-"}{" "}
            · Jornada #{jornadaActiva?.id||"-"}
          </div>
        </div>

        {jornadaActiva?.id&&(
          <button
            type="button"
            style={styles.outlineButton}
            onClick={cerrarJornadaOperativa}
          >
            Cerrar jornada
          </button>
        )}
      </div>
    </div>

    {mostrarPuntosStock&&(
      <div style={{...styles.box,marginBottom:20}}>
        <div style={styles.pageHeaderSmall}>
          <div>
            <h2 style={{margin:0}}>Puntos / ubicaciones</h2>
            <p style={{color:"#64748b",margin:"6px 0 0"}}>
              Crea o edita BAR PRINCIPAL, KIOSKO y demás ubicaciones.
            </p>
          </div>
          <button
            type="button"
            style={styles.outlineButton}
            onClick={()=>setMostrarPuntosStock(false)}
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={crearPuntoOperacion}
          style={{...styles.filtersGrid,marginTop:18}}
        >
          <div style={styles.filterField}>
            <label style={styles.label}>Nombre *</label>
            <input
              style={styles.input}
              value={nuevoPuntoForm.nombre}
              onChange={(e)=>setNuevoPuntoForm((p)=>({...p,nombre:e.target.value}))}
              placeholder="Ej. KIOSKO"
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Código</label>
            <input
              style={styles.input}
              value={nuevoPuntoForm.codigo}
              onChange={(e)=>setNuevoPuntoForm((p)=>({...p,codigo:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Descripción</label>
            <input
              style={styles.input}
              value={nuevoPuntoForm.descripcion}
              onChange={(e)=>setNuevoPuntoForm((p)=>({...p,descripcion:e.target.value}))}
            />
          </div>
          <div style={{display:"flex",alignItems:"end"}}>
            <button type="submit" style={styles.button}>Crear ubicación</button>
          </div>
        </form>

        <div style={{display:"grid",gap:10,marginTop:18}}>
          {puntosOperacion.map((punto)=>(
            <div
              key={punto.id}
              style={{
                display:"flex",
                justifyContent:"space-between",
                gap:12,
                alignItems:"center",
                padding:12,
                border:"1px solid #e2e8f0",
                borderRadius:10
              }}
            >
              <div>
                <strong>{punto.nombre}</strong>
                <div style={{color:"#64748b",fontSize:14}}>
                  {punto.codigo||"-"} · {punto.descripcion||"Sin descripción"}
                </div>
              </div>
              <button
                type="button"
                style={styles.outlineButton}
                onClick={()=>comenzarEdicionPunto(punto)}
              >
                Editar
              </button>
            </div>
          ))}
        </div>

        {editarPuntoStock&&(
          <form
            onSubmit={guardarEdicionPunto}
            style={{
              ...styles.filtersGrid,
              marginTop:20,
              paddingTop:18,
              borderTop:"1px solid #e2e8f0"
            }}
          >
            <div style={styles.filterField}>
              <label style={styles.label}>Nombre *</label>
              <input
                style={styles.input}
                value={editarPuntoStock.nombre}
                onChange={(e)=>setEditarPuntoStock((p)=>({...p,nombre:e.target.value}))}
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Código</label>
              <input
                style={styles.input}
                value={editarPuntoStock.codigo}
                onChange={(e)=>setEditarPuntoStock((p)=>({...p,codigo:e.target.value}))}
              />
            </div>
            <div style={styles.filterField}>
              <label style={styles.label}>Descripción</label>
              <input
                style={styles.input}
                value={editarPuntoStock.descripcion}
                onChange={(e)=>setEditarPuntoStock((p)=>({...p,descripcion:e.target.value}))}
              />
            </div>
            <div style={{display:"flex",gap:10,alignItems:"end"}}>
              <button type="submit" style={styles.button}>Guardar cambios</button>
              <button
                type="button"
                style={styles.outlineButton}
                onClick={()=>setEditarPuntoStock(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    )}

    {mostrarNuevoProductoStock&&(
      <div style={{...styles.box,marginBottom:20}}>
        <div style={styles.pageHeaderSmall}>
          <div>
            <h2 style={{margin:0}}>Nuevo producto</h2>
            <p style={{color:"#64748b",margin:"6px 0 0"}}>
              Crea el producto dentro de Stock. Después podrás ingresarlo por compra,
              producción u otro ingreso.
            </p>
          </div>
          <button
            type="button"
            style={styles.outlineButton}
            onClick={()=>setMostrarNuevoProductoStock(false)}
          >
            Cerrar
          </button>
        </div>

        <form
          onSubmit={crearProductoDesdeStock}
          style={{...styles.filtersGrid,marginTop:18}}
        >
          <div style={styles.filterField}>
            <label style={styles.label}>Nombre *</label>
            <input
              style={styles.input}
              value={nuevoProductoStockForm.nombre}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,nombre:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Código</label>
            <input
              style={styles.input}
              value={nuevoProductoStockForm.codigo}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,codigo:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Precio</label>
            <input
              type="number"
              step="0.01"
              min="0"
              style={styles.input}
              value={nuevoProductoStockForm.precio}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,precio:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Familia / categoría</label>
            <input
              style={styles.input}
              value={nuevoProductoStockForm.categoria}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,categoria:e.target.value}))}
              placeholder="Bebidas, Brunch, Golosinas, Helados..."
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Stock mínimo</label>
            <input
              type="number"
              min="0"
              step="1"
              style={styles.input}
              value={nuevoProductoStockForm.stock_minimo}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,stock_minimo:e.target.value}))}
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Ubicación inicial</label>
            <select
              style={styles.input}
              value={
                nuevoProductoStockForm.ubicacion_inicial||
                jornadaActiva?.punto_nombre||
                ""
              }
              onChange={(e)=>setNuevoProductoStockForm((p)=>({
                ...p,
                ubicacion_inicial:e.target.value
              }))}
            >
              {puntosOperacion.filter((p)=>p.activo!==false).map((p)=>(
                <option key={p.id} value={p.nombre}>{p.nombre}</option>
              ))}
            </select>
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Cantidad inicial</label>
            <input
              type="number"
              min="0"
              step="1"
              style={styles.input}
              value={nuevoProductoStockForm.cantidad_inicial}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,cantidad_inicial:e.target.value}))}
            />
          </div>
          <div style={{...styles.filterField,gridColumn:"1 / -1"}}>
            <label style={styles.label}>Observación inicial</label>
            <input
              style={styles.input}
              value={nuevoProductoStockForm.observacion_inicial}
              onChange={(e)=>setNuevoProductoStockForm((p)=>({...p,observacion_inicial:e.target.value}))}
            />
          </div>
          <button type="submit" style={styles.button}>Crear producto</button>
        </form>
      </div>
    )}

    <div style={{...styles.box,marginBottom:20}}>
      <div style={styles.pageHeaderSmall}>
        <div>
          <h2 style={{margin:0}}>Movimiento de Stock</h2>
          <p style={{color:"#64748b",margin:"6px 0 0"}}>
            Selecciona primero si registrarás un ingreso o un egreso.
          </p>
        </div>
      </div>

      <div style={{
        display:"grid",
        gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",
        gap:16,
        marginTop:18
      }}>
        <button
          type="button"
          style={{
            ...styles.button,
            minHeight:82,
            fontSize:20,
            opacity:stockSeccion==="INGRESOS"?1:.82
          }}
          onClick={()=>cambiarSeccionStock("INGRESOS")}
        >
          INGRESOS
        </button>

        <button
          type="button"
          style={{
            ...styles.outlineButton,
            minHeight:82,
            fontSize:20,
            border:stockSeccion==="EGRESOS"
              ?"2px solid #dc2626"
              :"1px solid #cbd5e1",
            color:"#b91c1c"
          }}
          onClick={()=>cambiarSeccionStock("EGRESOS")}
        >
          EGRESOS
        </button>
      </div>
    </div>

    {stockSeccion==="INGRESOS"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Tipo de ingreso</h2>

        <div style={styles.filterField}>
          <label style={styles.label}>Seleccionar *</label>
          <select
            style={styles.input}
            value={stockTipoIngreso}
            onChange={(e)=>cambiarTipoIngresoStock(e.target.value)}
          >
            <option value="">Seleccionar tipo de ingreso</option>
            <option value="COMPRA">1. Compras</option>
            <option value="PRODUCCION_COCINA">2. Producción cocina</option>
            <option value="TRANSFERENCIA_UBICACIONES">3. Transferencia entre ubicaciones</option>
            <option value="TRANSFERENCIA_LOCALES">4. Transferencia entre locales</option>
            <option value="OTROS">5. Otros</option>
          </select>
        </div>
      </div>
    )}

    {stockSeccion==="EGRESOS"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Tipo de egreso</h2>
        <p style={{color:"#64748b"}}>
          Estos movimientos son salidas administrativas de inventario.
          <strong> No son ventas.</strong>
        </p>

        <div style={styles.filterField}>
          <label style={styles.label}>Seleccionar *</label>
          <select
            style={styles.input}
            value={stockTipoEgreso}
            onChange={(e)=>cambiarTipoEgresoStock(e.target.value)}
          >
            <option value="">Seleccionar tipo de egreso</option>
            <option value="BAJA">Bajas</option>
            <option value="CORTESIA">Cortesía</option>
          </select>
        </div>
      </div>
    )}

    {stockSeccion==="INGRESOS"&&stockTipoIngreso==="COMPRA"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Compra a proveedor</h2>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Número de factura *</label>
            <input
              style={styles.input}
              value={stockCompraForm.numero_factura}
              onChange={(e)=>setStockCompraForm((p)=>({...p,numero_factura:e.target.value}))}
              placeholder="Ej. 001-001-000123456"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Proveedor *</label>
            <select
              style={styles.input}
              value={stockCompraForm.proveedor_id}
              onChange={(e)=>setStockCompraForm((p)=>({
                ...p,
                proveedor_id:e.target.value,
                proveedor_nuevo:""
              }))}
            >
              <option value="">Seleccionar proveedor</option>
              {proveedoresStock.map((prov)=>(
                <option key={prov.id} value={prov.id}>
                  {prov.nombre}{prov.ruc?` - ${prov.ruc}`:""}
                </option>
              ))}
            </select>

            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
              <button
                type="button"
                style={styles.outlineButton}
                onClick={()=>document.getElementById("importar-proveedores-stock")?.click()}
                disabled={importandoProveedoresStock}
              >
                {importandoProveedoresStock?"Importando...":"Importar Excel proveedores"}
              </button>

              <button
                type="button"
                style={styles.outlineButton}
                onClick={descargarPlantillaProveedoresStock}
              >
                Descargar plantilla
              </button>

              <input
                id="importar-proveedores-stock"
                type="file"
                accept=".xlsx,.xls"
                onChange={importarProveedoresStockExcel}
                style={{display:"none"}}
              />
            </div>

            <div style={{fontSize:12,color:"#64748b",marginTop:6}}>
              Excel: NOMBRE | RUC_CEDULA
            </div>
          </div>

          <div style={{...styles.filterField,gridColumn:"1 / -1"}}>
            <label style={styles.label}>Observación</label>
            <input
              style={styles.input}
              value={stockCompraForm.observacion}
              onChange={(e)=>setStockCompraForm((p)=>({...p,observacion:e.target.value}))}
              placeholder="Observación opcional de la compra"
            />
          </div>
        </div>
      </div>
    )}

    {stockSeccion==="INGRESOS"&&stockTipoIngreso==="TRANSFERENCIA_UBICACIONES"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Transferencia entre ubicaciones</h2>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Origen</label>
            <input
              style={styles.input}
              value={jornadaActiva?.punto_nombre||"PRINCIPAL"}
              readOnly
            />
          </div>
          <div style={styles.filterField}>
            <label style={styles.label}>Ubicación destino *</label>
            <select
              style={styles.input}
              value={stockOperacionForm.ubicacion_destino}
              onChange={(e)=>setStockOperacionForm((p)=>({
                ...p,
                ubicacion_destino:e.target.value
              }))}
            >
              <option value="">Seleccionar ubicación</option>
              {puntosOperacion
                .filter((p)=>p.activo!==false)
                .filter((p)=>String(p.nombre).toUpperCase()!==String(jornadaActiva?.punto_nombre||"").toUpperCase())
                .map((p)=>(
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
            </select>
          </div>
          <div style={{...styles.filterField,gridColumn:"1 / -1"}}>
            <label style={styles.label}>Observación *</label>
            <input
              style={styles.input}
              value={stockOperacionForm.observacion}
              onChange={(e)=>setStockOperacionForm((p)=>({...p,observacion:e.target.value}))}
              placeholder="Motivo de la transferencia"
            />
          </div>
        </div>
      </div>
    )}

    {stockSeccion==="INGRESOS"&&stockTipoIngreso==="TRANSFERENCIA_LOCALES"&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>Transferencia entre locales</h2>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Local / institución destino *</label>
            <select
              style={styles.input}
              value={stockOperacionForm.institucion_destino_id}
              onChange={async(e)=>{
                const valor=e.target.value;
                setStockOperacionForm((p)=>({
                  ...p,
                  institucion_destino_id:valor,
                  punto_destino_id:""
                }));
                await cargarPuntosDestinoLocal(valor);
              }}
            >
              <option value="">Seleccionar local</option>
              {institucionesTransferencia
                .filter((i)=>Number(i.id)!==Number(obtenerInstitucionActivaId()))
                .map((i)=>(
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Ubicación destino *</label>
            <select
              style={styles.input}
              value={stockOperacionForm.punto_destino_id}
              disabled={!stockOperacionForm.institucion_destino_id}
              onChange={(e)=>setStockOperacionForm((p)=>({
                ...p,
                punto_destino_id:e.target.value
              }))}
            >
              <option value="">Seleccionar ubicación</option>
              {puntosDestinoLocal.map((p)=>(
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div style={{...styles.filterField,gridColumn:"1 / -1"}}>
            <label style={styles.label}>Observación *</label>
            <input
              style={styles.input}
              value={stockOperacionForm.observacion}
              onChange={(e)=>setStockOperacionForm((p)=>({...p,observacion:e.target.value}))}
              placeholder="Motivo / referencia de la transferencia"
            />
          </div>
        </div>
      </div>
    )}

    {stockSeccion==="INGRESOS"&&
      ["PRODUCCION_COCINA","OTROS"].includes(stockTipoIngreso)&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>
          {stockTipoIngreso==="PRODUCCION_COCINA"
            ?"Producción cocina"
            :"Otros ingresos"}
        </h2>
        <div style={styles.filterField}>
          <label style={styles.label}>Observación *</label>
          <input
            style={styles.input}
            value={stockOperacionForm.observacion}
            onChange={(e)=>setStockOperacionForm((p)=>({...p,observacion:e.target.value}))}
            placeholder={
              stockTipoIngreso==="PRODUCCION_COCINA"
                ?"Ej. Producción del turno de cocina"
                :"Describe el motivo del ingreso"
            }
          />
        </div>
      </div>
    )}

    {stockSeccion==="EGRESOS"&&stockTipoEgreso&&(
      <div style={{...styles.box,marginBottom:20}}>
        <h2 style={{marginTop:0}}>
          {stockTipoEgreso==="CORTESIA"?"Cortesía":"Baja de inventario"}
        </h2>

        <div style={styles.filtersGrid}>
          {stockTipoEgreso==="CORTESIA"&&(
            <div style={styles.filterField}>
              <label style={styles.label}>¿A quién se entrega? *</label>
              <input
                style={styles.input}
                value={stockOperacionForm.destinatario_cortesia}
                onChange={(e)=>setStockOperacionForm((p)=>({
                  ...p,
                  destinatario_cortesia:e.target.value
                }))}
                placeholder="Nombre de la persona / institución"
              />
            </div>
          )}

          <div style={{
            ...styles.filterField,
            gridColumn:stockTipoEgreso==="CORTESIA"?"auto":"1 / -1"
          }}>
            <label style={styles.label}>
              {stockTipoEgreso==="CORTESIA"
                ?"¿Por qué se entrega? / Observación *"
                :"Motivo / Observación *"}
            </label>
            <input
              style={styles.input}
              value={stockOperacionForm.observacion}
              onChange={(e)=>setStockOperacionForm((p)=>({...p,observacion:e.target.value}))}
              placeholder={
                stockTipoEgreso==="CORTESIA"
                  ?"Ej. Invitado institucional, evento, atención..."
                  :"Describe la razón de la baja"
              }
            />
          </div>
        </div>
      </div>
    )}

    {(
      (stockSeccion==="INGRESOS"&&stockTipoIngreso)||
      (stockSeccion==="EGRESOS"&&stockTipoEgreso)
    )&&(
      <div style={{...styles.box,marginBottom:20}}>
        <div style={styles.pageHeaderSmall}>
          <div>
            <h2 style={{margin:0}}>Seleccionar productos</h2>
            <p style={{color:"#64748b",margin:"6px 0 0"}}>
              Busca por producto o filtra por familia. Puedes seleccionar varios
              productos y escribir cantidades de 100, 500, 1000 o las que necesites.
            </p>
          </div>
          <div style={{
            padding:"8px 12px",
            borderRadius:999,
            background:"#dcfce7",
            fontWeight:800
          }}>
            Seleccionados: {itemsValidosOperacionStock().length}
          </div>
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"minmax(240px,1fr) minmax(220px,320px)",
          gap:12,
          marginTop:18
        }}>
          <div style={styles.filterField}>
            <label style={styles.label}>Buscar producto</label>
            <input
              style={styles.input}
              value={stockBusquedaOperacion}
              onChange={(e)=>setStockBusquedaOperacion(e.target.value)}
              placeholder="Nombre, código o familia"
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Familia de producto</label>
            <select
              style={styles.input}
              value={stockFamiliaOperacion}
              onChange={(e)=>setStockFamiliaOperacion(e.target.value)}
            >
              <option value="TODAS">Todas las familias</option>
              {familiasOperacionStock.map((familia)=>(
                <option key={familia} value={familia}>{familia}</option>
              ))}
            </select>

            {stockSeccion==="INGRESOS"&&stockTipoIngreso==="COMPRA"&&(
              <>
                <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
                  <button
                    type="button"
                    style={styles.outlineButton}
                    onClick={()=>document.getElementById("importar-familias-stock")?.click()}
                    disabled={importandoFamiliasStock}
                  >
                    {importandoFamiliasStock?"Importando...":"Importar Excel familias"}
                  </button>

                  <button
                    type="button"
                    style={styles.outlineButton}
                    onClick={descargarPlantillaFamiliasStock}
                  >
                    Descargar plantilla
                  </button>

                  <input
                    id="importar-familias-stock"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={importarFamiliasStockExcel}
                    style={{display:"none"}}
                  />
                </div>

                <div style={{fontSize:12,color:"#64748b",marginTop:6}}>
                  Excel: NOMBRE | CODIGO | MATERIA_PRIMA (SI/NO) | ESTADO
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{
          ...styles.tableWrap,
          marginTop:16,
          maxHeight:520,
          overflowY:"auto",
          overflowX:"hidden"
        }}>
          <table style={{
            ...styles.table,
            width:"100%",
            tableLayout:"fixed",
            minWidth:0
          }}>
            <thead>
              <tr>
                <th style={{...styles.th,width:56,textAlign:"center"}}>
                  Sel.
                </th>
                <th style={{...styles.th,width:"28%"}}>
                  Producto
                </th>
                <th style={{...styles.th,width:82}}>
                  Código
                </th>
                <th style={{...styles.th,width:90}}>
                  Familia
                </th>
                <th style={{
                  ...styles.th,
                  width:94,
                  whiteSpace:"normal",
                  lineHeight:1.15
                }}>
                  <div>Stock</div>
                  <div style={{fontSize:10,fontWeight:700}}>
                    {jornadaActiva?.punto_nombre||"punto"}
                  </div>
                </th>
                <th style={{...styles.th,width:82}}>
                  Cant.
                </th>
              </tr>
            </thead>
            <tbody>
              {productosOperacionStock.length===0?(
                <tr>
                  <td colSpan={6} style={styles.td}>
                    No hay productos para este filtro.
                  </td>
                </tr>
              ):(
                productosOperacionStock.map((producto)=>{
                  const id=String(producto.id);
                  const seleccionado=Object.prototype.hasOwnProperty.call(
                    stockItemsOperacion,id
                  );

                  return (
                    <tr key={producto.id}>
                      <td style={{
                        ...styles.td,
                        width:56,
                        textAlign:"center",
                        padding:"8px 4px"
                      }}>
                        <input
                          type="checkbox"
                          checked={seleccionado}
                          onChange={()=>toggleProductoOperacionStock(producto)}
                        />
                      </td>
                      <td style={{
                        ...styles.td,
                        fontWeight:800,
                        padding:"8px 6px",
                        overflow:"hidden",
                        textOverflow:"ellipsis"
                      }}>
                        {producto.nombre}
                      </td>
                      <td style={{
                        ...styles.td,
                        padding:"8px 5px",
                        overflow:"hidden",
                        textOverflow:"ellipsis"
                      }}>
                        {producto.codigo||"-"}
                      </td>
                      <td style={{
                        ...styles.td,
                        padding:"8px 5px",
                        overflow:"hidden",
                        textOverflow:"ellipsis"
                      }}>
                        {producto.categoria||"Sin familia"}
                      </td>
                      <td style={{
                        ...styles.td,
                        padding:"8px 5px",
                        textAlign:"center",
                        fontWeight:800
                      }}>
                        {stockProductoEnPunto(
                          producto.id,
                          jornadaActiva?.punto_nombre||"PRINCIPAL"
                        )}
                      </td>
                      <td style={{
                        ...styles.td,
                        width:82,
                        padding:"8px 4px",
                        textAlign:"center"
                      }}>
                        <input
                          type="number"
                          min="0"
                          max="9999"
                          step="1"
                          disabled={!seleccionado}
                          value={seleccionado?stockItemsOperacion[id]:""}
                          onChange={(e)=>{
                            const valor=String(e.target.value||"")
                              .replace(/[^0-9]/g,"")
                              .slice(0,4);

                            cambiarCantidadOperacionStock(
                              producto.id,
                              valor
                            );
                          }}
                          style={{
                            ...styles.input,
                            width:68,
                            minWidth:68,
                            maxWidth:68,
                            padding:"8px 6px",
                            textAlign:"center",
                            opacity:seleccionado?1:.5
                          }}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          display:"flex",
          justifyContent:"flex-end",
          gap:12,
          marginTop:18
        }}>
          <button
            type="button"
            style={styles.outlineButton}
            onClick={limpiarOperacionStock}
          >
            Limpiar
          </button>
          <button
            type="button"
            style={styles.button}
            onClick={prepararConfirmacionOperacionStock}
          >
            Guardar y revisar
          </button>
        </div>
      </div>
    )}

    {stockConfirmacion&&(
      <div
        id="stock-confirmacion-panel"
        style={{
          position:"absolute",
          top:0,
          left:0,
          width:"100%",
          minHeight:"100%",
          zIndex:100005,
          background:"rgba(15,23,42,.68)",
          display:"flex",
          alignItems:"flex-start",
          justifyContent:"center",
          padding:"28px 16px",
          boxSizing:"border-box"
        }}
      >
        <div style={{
          width:"min(950px,96vw)",
          maxHeight:"88vh",
          overflowY:"auto",
          background:"#fff",
          borderRadius:18,
          padding:24,
          boxShadow:"0 22px 60px rgba(15,23,42,.30)"
        }}>
          <div style={{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"flex-start",
            gap:12,
            flexWrap:"wrap"
          }}>
            <div>
              <h2 style={{margin:"0 0 6px"}}>
                Confirmar movimiento de Stock
              </h2>
              <p style={{color:"#64748b",margin:0}}>
                Revisa el detalle antes de afectar las existencias.
              </p>
            </div>
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
            gap:10,
            margin:"18px 0"
          }}>
            <div style={styles.statCard}>
              <span>Movimiento</span>
              <strong>{stockConfirmacion.grupo}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Tipo</span>
              <strong>
                {String(stockConfirmacion.tipo)
                  .split("_")
                  .join(" ")}
              </strong>
            </div>

            <div style={styles.statCard}>
              <span>Ubicación</span>
              <strong>{jornadaActiva?.punto_nombre||"-"}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Operador</span>
              <strong>
                {jornadaActiva?.usuario_nombre||
                 jornadaActiva?.usuario_correo||
                 usuario?.nombre||
                 usuario?.correo||
                 "-"}
              </strong>
            </div>

            <div style={styles.statCard}>
              <span>Jornada</span>
              <strong>#{jornadaActiva?.id||"-"}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Productos</span>
              <strong>{stockConfirmacion.items?.length||0}</strong>
            </div>
          </div>

          {stockConfirmacion.tipo==="COMPRA"&&(
            <div style={{
              marginBottom:16,
              padding:12,
              background:"#f8fafc",
              borderRadius:10
            }}>
              <strong>Factura:</strong>{" "}
              {stockCompraForm.numero_factura||"-"}
              <br/>
              <strong>Proveedor:</strong>{" "}
              {proveedoresStock.find(
                (p)=>Number(p.id)===Number(stockCompraForm.proveedor_id)
              )?.nombre||
                stockCompraForm.proveedor_nuevo||
                "-"}
            </div>
          )}

          {stockConfirmacion.tipo==="CORTESIA"&&(
            <div style={{
              marginBottom:16,
              padding:12,
              background:"#fff7ed",
              borderRadius:10
            }}>
              <strong>Destinatario:</strong>{" "}
              {stockOperacionForm.destinatario_cortesia||"-"}
            </div>
          )}

          {String(
            stockConfirmacion.tipo==="COMPRA"
              ? stockCompraForm.observacion||""
              : stockOperacionForm.observacion||""
          ).trim()&&(
            <div style={{
              marginBottom:16,
              padding:12,
              border:"1px solid #e2e8f0",
              borderRadius:10,
              background:"#f8fafc"
            }}>
              <strong>Observación:</strong>{" "}
              {stockConfirmacion.tipo==="COMPRA"
                ? stockCompraForm.observacion
                : stockOperacionForm.observacion}
            </div>
          )}

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Familia</th>
                  <th style={styles.th}>Cantidad</th>
                </tr>
              </thead>

              <tbody>
                {(stockConfirmacion.items||[]).map((item)=>{
                  const producto=productos.find(
                    (p)=>Number(p.id)===Number(item.producto_id)
                  );

                  return(
                    <tr key={item.producto_id}>
                      <td style={{
                        ...styles.td,
                        fontWeight:800
                      }}>
                        {producto?.nombre||
                          `Producto #${item.producto_id}`}
                      </td>

                      <td style={styles.td}>
                        {producto?.codigo||"-"}
                      </td>

                      <td style={styles.td}>
                        {producto?.categoria||"-"}
                      </td>

                      <td style={{
                        ...styles.td,
                        fontWeight:900,
                        fontSize:18
                      }}>
                        {item.cantidad}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{
            display:"flex",
            justifyContent:"flex-end",
            gap:12,
            marginTop:20,
            flexWrap:"wrap"
          }}>
            <button
              type="button"
              style={styles.outlineButton}
              disabled={guardandoStockOperacion}
              onClick={()=>{
                setGuardandoStockOperacion(false);
                setStockConfirmacion(null);
              }}
            >
              Volver
            </button>

            <button
              type="button"
              style={{
                ...styles.button,
                background:"#2563eb",
                minWidth:210
              }}
              disabled={guardandoStockOperacion}
              onClick={()=>confirmarOperacionStockNueva()}
            >
              {guardandoStockOperacion
                ?"Guardando..."
                :"Confirmar movimiento"}
            </button>
          </div>
        </div>
      </div>
    )}

    {stockResultado&&(
      <div
        id="stock-resultado-panel"
        style={{
          position:"absolute",
          top:0,
          left:0,
          width:"100%",
          minHeight:"100%",
          zIndex:100006,
          background:"rgba(15,23,42,.68)",
          display:"flex",
          alignItems:"flex-start",
          justifyContent:"center",
          padding:"28px 16px",
          boxSizing:"border-box"
        }}
      >
        <div style={{
          width:"min(1050px,96vw)",
          maxHeight:"90vh",
          overflowY:"auto",
          background:"#fff",
          borderRadius:18,
          padding:24,
          boxShadow:"0 22px 60px rgba(15,23,42,.30)"
        }}>
          <div style={{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"flex-start",
            gap:12,
            flexWrap:"wrap",
            marginBottom:12
          }}>
            <div>
              <h2 style={{margin:"0 0 6px"}}>
                Stock actualizado correctamente
              </h2>
              <p style={{margin:0,color:"#64748b"}}>
                Estos son los productos que fueron actualizados.
              </p>
            </div>

            <div style={{
              padding:"8px 12px",
              borderRadius:999,
              background:"#dcfce7",
              color:"#166534",
              fontWeight:900
            }}>
              ✓ GUARDADO
            </div>
          </div>

          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
            gap:10,
            margin:"18px 0"
          }}>
            <div style={styles.statCard}>
              <span>Tipo</span>
              <strong>
                {String(stockResultado.tipo||"")
                  .split("_")
                  .join(" ")}
              </strong>
            </div>

            <div style={styles.statCard}>
              <span>Ubicación</span>
              <strong>{stockResultado.ubicacion||"-"}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Operador</span>
              <strong>{stockResultado.operador||"-"}</strong>
            </div>

            <div style={styles.statCard}>
              <span>Productos actualizados</span>
              <strong>
                {Number(stockResultado.total_productos||0)}
              </strong>
            </div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Producto</th>
                  <th style={styles.th}>Código</th>
                  <th style={styles.th}>Familia</th>
                  <th style={styles.th}>
                    Cantidad actualizada
                  </th>
                  <th style={styles.th}>
                    Stock final
                  </th>
                </tr>
              </thead>

              <tbody>
                {(stockResultado.items||[]).map(
                  (item,index)=>(
                    <tr key={`${item.producto_id}-${index}`}>
                      <td style={{
                        ...styles.td,
                        fontWeight:800
                      }}>
                        {item.nombre}
                      </td>

                      <td style={styles.td}>
                        {item.codigo||"-"}
                      </td>

                      <td style={styles.td}>
                        {item.familia||"-"}
                      </td>

                      <td style={{
                        ...styles.td,
                        fontWeight:900,
                        fontSize:18
                      }}>
                        {item.cantidad_texto}
                      </td>

                      <td style={{
                        ...styles.td,
                        fontWeight:900,
                        fontSize:18,
                        color:"#166534"
                      }}>
                        {Number(item.stock_final||0)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop:18,
            display:"flex",
            justifyContent:"flex-end"
          }}>
            <button
              type="button"
              style={{
                ...styles.button,
                background:"#2563eb",
                minWidth:180
              }}
              onClick={()=>setStockResultado(null)}
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    )}

    <div style={styles.box}>
      <div style={styles.pageHeaderSmall}>
        <div>
          <h2 style={{margin:0}}>Existencias actuales</h2>
          <p style={{color:"#64748b",margin:"6px 0 0"}}>
            Consulta del stock disponible por punto. Las ventas siguen su flujo
            independiente y no se registran como egresos manuales de Stock.
          </p>
        </div>
      </div>

      <div style={{...styles.tableWrap,marginTop:16}}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Producto</th>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Familia</th>
              <th style={styles.th}>Stock por puntos</th>
              <th style={styles.th}>Total</th>
            </tr>
          </thead>
          <tbody>
            {productos
              .filter((p)=>p?.activo!==false)
              .map((producto)=>{
                const existencias=existenciasInventario.filter(
                  (e)=>Number(e.producto_id)===Number(producto.id)
                );
                const total=existencias.reduce(
                  (s,e)=>s+Number(e.stock||0),
                  0
                );

                return (
                  <tr key={producto.id}>
                    <td style={{...styles.td,fontWeight:800}}>
                      {producto.nombre}
                    </td>
                    <td style={styles.td}>{producto.codigo||"-"}</td>
                    <td style={styles.td}>{producto.categoria||"-"}</td>
                    <td style={styles.td}>
                      {existencias.length
                        ? existencias
                            .map(
                              (e)=>`${e.ubicacion}: ${Number(e.stock||0)}`
                            )
                            .join(" | ")
                        : "Sin existencias"}
                    </td>
                    <td style={{...styles.td,fontWeight:900}}>
                      {total}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  </>
)}
       {vista === "recargas" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Recargas</h1>
        <p style={styles.dashboardSubtitle}>
          Acredita saldo al alumno mediante efectivo o transferencia
        </p>
      </div>

      <button
        style={styles.refreshButton}
        onClick={async () => {
          await cargarRecargas();
          await cargarAlumnos();
          await cargarCuentasBancarias();
        }}
      >
        Actualizar
      </button>
    </div>

    {/* NUEVA RECARGA */}

    <div style={styles.box}>
      <div style={styles.pageHeaderSmall}>
        <div>
          <h3 style={{ margin: 0 }}>Realizar recarga</h3>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            El valor se acredita inmediatamente. En transferencia selecciona la cuenta receptora y registra el comprobante.
          </p>
        </div>
      </div>

      <form onSubmit={crearRecarga}>
        <div style={styles.filtersGridPaymon}>
          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Alumno *</label>
            <select
              value={recargaForm.alumno_id}
              onChange={(e) =>
                setRecargaForm({
                  ...recargaForm,
                  alumno_id: e.target.value,
                })
              }
              style={styles.input}
              required
            >
              <option value="">Seleccionar alumno</option>
              {alumnosActivos.map((alumno) => (
                <option key={alumno.id} value={alumno.id}>
                  {obtenerNombreAlumno(alumno)}
                  {alumno.curso ? ` - ${alumno.curso}` : ""}
                  {alumno.paralelo ? ` ${alumno.paralelo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Valor a recargar *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={recargaForm.monto}
              onChange={(e) =>
                setRecargaForm({
                  ...recargaForm,
                  monto: e.target.value,
                })
              }
              style={styles.input}
              placeholder="0.00"
              required
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Método de recarga</label>
            <select
              value={recargaForm.metodo_pago}
              onChange={(e) =>
                setRecargaForm({
                  ...recargaForm,
                  metodo_pago: e.target.value,
                  numero_comprobante: "",
                  banco: "",
                  cuenta_bancaria_id: "",
                })
              }
              style={styles.input}
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>

          {recargaForm.metodo_pago === "TRANSFERENCIA" && (
            <>
              <div style={styles.filterField}>
                <label style={styles.filterLabelTop}>
                  No. comprobante *
                </label>
                <input
                  type="text"
                  value={recargaForm.numero_comprobante}
                  onChange={(e) =>
                    setRecargaForm({
                      ...recargaForm,
                      numero_comprobante: e.target.value,
                    })
                  }
                  style={styles.input}
                  placeholder="Ej. 458963214"
                  maxLength={100}
                  required
                />
              </div>

              <div style={styles.filterField}>
                <label style={styles.filterLabelTop}>
                  Banco donde realizó la transferencia *
                </label>

                <select
                  value={recargaForm.cuenta_bancaria_id || ""}
                  onChange={(e) => {
                    const cuenta = cuentasBancarias.find(
                      (item) =>
                        String(item.id) === String(e.target.value)
                    );

                    setRecargaForm({
                      ...recargaForm,
                      cuenta_bancaria_id: e.target.value,
                      banco: cuenta
                        ? cuenta.banco
                        : "",
                      // Solo se guarda el nombre del banco
                      // El número de cuenta se comparte de forma privada
                    });
                  }}
                  style={styles.input}
                  required
                >
                  <option value="">Seleccionar banco</option>

                  {cuentasBancarias
                    .filter((cuenta) => cuenta.activo !== false)
                    .map((cuenta) => (
                      <option key={cuenta.id} value={cuenta.id}>
                        {cuenta.banco}
                        {/* Solo nombre del banco */}
                        {null}
                      </option>
                    ))}
                </select>

                {!cuentasBancarias.length && (
                  <small style={{ color: "#b45309" }}>
                    Registra primero un banco en Configuración →
                    Bancos.
                  </small>
                )}
              </div>
            </>
          )}

          <div style={styles.filterField}>
            <label style={styles.filterLabelTop}>Observación</label>
            <input
              type="text"
              value={recargaForm.observacion}
              onChange={(e) =>
                setRecargaForm({
                  ...recargaForm,
                  observacion: e.target.value,
                })
              }
              style={styles.input}
              placeholder="Observación opcional"
              maxLength={500}
            />
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button type="submit" style={styles.button}>
            Registrar recarga
          </button>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={limpiarFormularioRecarga}
          >
            Limpiar
          </button>
        </div>
      </form>

      <div
        style={{
          marginTop: 18,
          padding: 14,
          borderRadius: 9,
          background: "#eff6ff",
          color: "#1e3a8a",
        }}
      >
        <strong>Detalle:</strong> en efectivo se acredita el valor
        directamente. En transferencia, selecciona el banco donde se hizo el pago
        del colegio y registra el número de comprobante.
      </div>
    </div>

    <div style={{ height: 20 }} />

    {/* FILTROS */}

    <div style={styles.box}>
      <div style={styles.filtersGridPaymon}>

        <div style={styles.filterField}>
          <label style={styles.filterLabelTop}>Fecha inicial</label>
          <input
            type="date"
            value={recargasFiltros.fecha_inicio}
            onChange={(e) =>
              setRecargasFiltros({
                ...recargasFiltros,
                fecha_inicio: e.target.value,
              })
            }
            style={styles.input}
          />
        </div>

        {false && (
        <div style={styles.filterField}>
          <label style={styles.filterLabelTop}>Fecha final</label>
          <input
            type="date"
            value={recargasFiltros.fecha_fin}
            onChange={(e) =>
              setRecargasFiltros({
                ...recargasFiltros,
                fecha_fin: e.target.value,
              })
            }
            style={styles.input}
          />
        </div>
        )}

        {false && (
        <div style={styles.filterField}>
          <label style={styles.filterLabelTop}>Forma de pago</label>
          <select
            value={recargasFiltros.metodo_pago}
            onChange={(e) =>
              setRecargasFiltros({
                ...recargasFiltros,
                metodo_pago: e.target.value,
              })
            }
            style={styles.input}
          >
            <option value="todas">Todas</option>
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
        </div>
        )}

      </div>

      {false && (
      <div style={styles.filterButtons}>
        <button
          type="button"
          style={styles.button}
          onClick={() => setRecargasFiltros({ ...recargasFiltros })}
        >
          Consultar
        </button>

        <button
          type="button"
          style={styles.outlineButton}
          onClick={limpiarFiltrosRecargas}
        >
          Borrar filtros
        </button>
      </div>
      )}
    </div>

    <div style={{ height: 20 }} />

    {/* TOTAL */}

    <div style={styles.paymonTotalWrap}>
      <span style={styles.paymonTotalLabel}>
        Total recargas: {formatearMoneda(totalRecargasVista)}
      </span>
    </div>

    <div style={{ height: 20 }} />

    {/* TABLA */}

    <div style={styles.box}>

      <div style={styles.pageHeaderSmall}>

        <div>
          <h3 style={{ margin: 0 }}>
            Historial de recargas
          </h3>
        </div>

        <div style={styles.headerActions}>

          <span style={styles.recordsBadge}>
            {recargasFiltradas.length} registros
          </span>

          <button
            type="button"
            style={styles.exportButton}
            onClick={exportarRecargasExcel}
          >
            Exportar
          </button>

        </div>

      </div>

      {recargasFiltradas.length === 0 ? (
        <p>No hay recargas para los filtros seleccionados.</p>
      ) : (

        <div style={styles.tableWrap}>

          <table style={styles.table}>

            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Entregado</th>
                <th style={styles.th}>Recargado</th>
                <th style={styles.th}>Operador</th>
                <th style={styles.th}>Tipo</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>No. comprobante</th>
                <th style={styles.th}>Banco</th>
                <th style={styles.th}>Observación</th>
              </tr>
            </thead>

            <tbody>

              {recargasFiltradas.map((r) => (

                <tr key={r.id}>

                  <td style={styles.td}>
                    {formatearFechaHora(r.fecha_base)}
                  </td>

                  <td style={styles.td}>
                    {r.alumno_nombre}
                  </td>

                  <td style={styles.td}>
                    {formatearMoneda(r.dinero_entregado)}
                  </td>

                  <td style={styles.td}>
                    {formatearMoneda(r.dinero_recargado)}
                  </td>

                  <td style={styles.td}>
                    {r.operador_nombre}
                  </td>

                  <td style={styles.td}>
                    {r.tipo_visual}
                  </td>

                  <td style={styles.td}>
                    {r.estado_visual}
                  </td>

                  <td style={styles.td}>
                    {r.documento_visual}
                  </td>

                  <td style={styles.td}>
                    {r.banco || "-"}
                  </td>

                  <td style={styles.td}>
                    {r.observacion || "-"}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  </>
)}

        {vista === "ventas" && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.dashboardTitle}>Ventas</h1>
                <p style={styles.dashboardSubtitle}>Consulta el historial de ventas</p>
              </div>

              <button
                style={styles.refreshButton}
                onClick={() => {
                  cargarVentas();
                  cargarProductos();
                  cargarAlumnos();
                }}
              >
                Refrescar
              </button>
            </div>

            <div style={styles.ventasTabs}>
  <button
    type="button"
    style={
      vistaVentasInterna === "registrar"
        ? styles.ventasTabActive
        : styles.ventasTab
    }
    onClick={() => setVistaVentasInterna("registrar")}
  >
    Nueva Orden
  </button>

  <button
    type="button"
    style={
      vistaVentasInterna === "consultar"
        ? styles.ventasTabActive
        : styles.ventasTab
    }
    onClick={() => setVistaVentasInterna("consultar")}
  >
    Consultar ventas
  </button>
</div>

          {vistaVentasInterna === "registrar" && (
  <div
    style={{
      background: "#ffffff",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.10)",
      border: "1px solid #e5e7eb",
    }}
  >
    {/* CABECERA AZUL */}
    <div
      style={{
        background: "#2528b8",
        color: "#ffffff",
        padding: "18px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>
          Nueva Orden
        </h2>

        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.95 }}>
          {alumnoVentaSeleccionado ? (
            <>
              Compra para{" "}
              <strong>{obtenerNombreAlumno(alumnoVentaSeleccionado)}</strong>
            </>
          ) : (
            <>Selecciona un alumno o continúa como consumidor final</>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {alumnoDetalle &&
          Number(ventaForm.alumno_id) === Number(alumnoDetalle.id) && (
            <button
              type="button"
              onClick={() => {
                const confirmar =
                  (Array.isArray(ventaItems) ? ventaItems : []).length === 0 ||
                  window.confirm(
                    "¿Deseas regresar a la ficha del alumno? Los productos agregados se eliminarán."
                  );

                if (!confirmar) return;

                limpiarFormularioVenta();
                setVistaAlumnoDetalle("datos");
                setVista("alumnos");
              }}
              style={{
                border: "1px solid rgba(255,255,255,0.7)",
                background: "#ffffff",
                color: "#2528b8",
                borderRadius: 10,
                padding: "11px 16px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ← Regresar al alumno
            </button>
          )}

        <div
          style={{
            minWidth: 145,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#dbe7ff",
            color: "#111827",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Usuario</div>
          <div style={{ fontSize: 14, fontWeight: 800 }}>
            {alumnoVentaSeleccionado
              ? obtenerNombreAlumno(alumnoVentaSeleccionado)
              : profesorVentaSeleccionado
              ? `${profesorVentaSeleccionado.nombres || ""} ${
                  profesorVentaSeleccionado.apellidos || ""
                }`.trim()
              : "Consumidor final"}
          </div>
        </div>

        <div
          style={{
            minWidth: 125,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#ffe0a3",
            color: "#111827",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Total</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {formatearMoneda(totalVentaCalculado)}
          </div>
        </div>

        <div
          style={{
            minWidth: 125,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#d9f4df",
            color: "#111827",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700 }}>Saldo</div>
          <div style={{ fontSize: 24, fontWeight: 900 }}>
            {formatearMoneda(
              alumnoVentaSeleccionado?.saldo ||
                profesorVentaSeleccionado?.saldo ||
                0
            )}
          </div>
        </div>
      </div>
    </div>

    {/* SELECCIÓN DE USUARIO */}
    {modoNuevaOrden === "identificar" && (
      <div
        style={{
          padding: 18,
          borderBottom: "1px solid #e5e7eb",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, 240px) minmax(240px, 1fr)",
            gap: 14,
          }}
        >
          <div>
            <label style={styles.label}>Tipo de usuario</label>
            <select
              value={tipoUsuarioNuevaOrden}
              onChange={(e) => setTipoUsuarioNuevaOrden(e.target.value)}
              style={styles.input}
            >
              <option value="TODOS">Todos</option>
              <option value="ESTUDIANTE">Estudiante</option>
              <option value="PADRE">Padre</option>
              <option value="PROFESOR">Profesor</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Buscar usuario o código</label>
            <input
              type="text"
              value={busquedaUsuarioNuevaOrden}
              onChange={(e) => setBusquedaUsuarioNuevaOrden(e.target.value)}
              style={styles.input}
              placeholder="Escribe nombre, cédula o código"
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
          }}
        >
          {(tipoUsuarioNuevaOrden === "TODOS" ||
            tipoUsuarioNuevaOrden === "ESTUDIANTE") &&
            alumnosActivos
            .filter((a) => {
              const texto = busquedaUsuarioNuevaOrden.trim().toLowerCase();
              const nombre = obtenerNombreAlumno(a).toLowerCase();
              const codigo = String(
                a.codigo || obtenerCedulaAlumno(a) || ""
              ).toLowerCase();

              return !texto || nombre.includes(texto) || codigo.includes(texto);
            })
            .slice(0, 12)
            .map((a) => (
              <button
                type="button"
                key={a.id}
                onClick={() => {
                  setVentaForm((prev) => ({
                    ...prev,
                    alumno_id: String(a.id),
                    metodo_pago:
                      prev.metodo_pago === "RECARGA"
                        ? "RECARGA"
                        : prev.metodo_pago === "CREDITO"
                        ? "CREDITO"
                        : prev.metodo_pago,
                  }));
                  setModoNuevaOrden("consumidor_final");
                  setBusquedaUsuarioNuevaOrden("");
                }}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800, color: "#111827" }}>
                  {obtenerNombreAlumno(a)}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {obtenerCedulaAlumno(a) || "Sin cédula"} · Saldo{" "}
                  {formatearMoneda(a.saldo)}
                </div>
              </button>
            ))}

          {(tipoUsuarioNuevaOrden === "TODOS" ||
            tipoUsuarioNuevaOrden === "PROFESOR") &&
            profesores
              .filter((p) => {
                if (p.activo === false) return false;
                const texto =
                  busquedaUsuarioNuevaOrden.trim().toLowerCase();
                const nombre = `${p.nombres || ""} ${
                  p.apellidos || ""
                }`.toLowerCase();
                const codigo = String(
                  p.codigo || p.cedula || ""
                ).toLowerCase();

                return (
                  !texto ||
                  nombre.includes(texto) ||
                  codigo.includes(texto)
                );
              })
              .slice(0, 12)
              .map((p) => (
                <button
                  type="button"
                  key={`profesor-${p.id}`}
                  onClick={() => {
                    setVentaForm((prev) => ({
                      ...prev,
                      alumno_id: "",
                      profesor_id: String(p.id),
                      metodo_pago: "CREDITO_PROFESOR",
                    }));
                    setModoNuevaOrden("consumidor_final");
                    setBusquedaUsuarioNuevaOrden("");
                  }}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    borderRadius: 10,
                    padding: 12,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 800, color: "#111827" }}>
                    {`${p.nombres || ""} ${p.apellidos || ""}`.trim()}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      marginTop: 4,
                    }}
                  >
                    Profesor · {p.cedula || p.codigo || "Sin código"} ·
                    Crédito {formatearMoneda(p.saldo || 0)}
                  </div>
                </button>
              ))}
        </div>
      </div>
    )}

    {/* CONTENIDO PRINCIPAL */}
    <form onSubmit={crearVenta}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
          minHeight: 650,
        }}
      >
        {/* LATERAL */}
        <aside
          style={{
            background: "#eef4ff",
            borderRight: "1px solid #dbe3f0",
            padding: 16,
          }}
        >
          <label style={{ ...styles.label, fontSize: 13 }}>
            Escanea el código de barras
          </label>
          <input
            type="text"
            value={codigoBarraNuevaOrden}
            onChange={(e) => setCodigoBarraNuevaOrden(e.target.value)}
            placeholder="Código de barras"
            style={{
              ...styles.input,
              background: "#ffffff",
              marginBottom: 14,
            }}
          />

          <input
            type="text"
            value={busquedaProductoNuevaOrden}
            onChange={(e) => setBusquedaProductoNuevaOrden(e.target.value)}
            placeholder="Buscar productos"
            style={{
              ...styles.input,
              background: "#ffffff",
              marginBottom: 18,
            }}
          />

          <div
            style={{
              textAlign: "center",
              fontSize: 20,
              fontWeight: 900,
              color: "#1623a7",
              marginBottom: 12,
            }}
          >
            Categorías
          </div>

          <button
            type="button"
            onClick={() => setCategoriaNuevaOrden("TODOS")}
            style={{
              width: "100%",
              border:
                categoriaNuevaOrden === "TODOS"
                  ? "2px solid #2536db"
                  : "1px solid #d1d5db",
              background:
                categoriaNuevaOrden === "TODOS" ? "#dbe7ff" : "#ffffff",
              color: "#1726a4",
              borderRadius: 8,
              padding: "14px 12px",
              marginBottom: 8,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            TODOS
          </button>

          {[
            ...new Set(
              productosActivos
                .map((p) => String(p.categoria || "").trim())
                .filter(Boolean)
            ),
          ].map((categoria) => (
            <button
              type="button"
              key={categoria}
              onClick={() => setCategoriaNuevaOrden(categoria)}
              style={{
                width: "100%",
                border:
                  categoriaNuevaOrden === categoria
                    ? "2px solid #2536db"
                    : "1px solid #d1d5db",
                background:
                  categoriaNuevaOrden === categoria ? "#dbe7ff" : "#ffffff",
                color: "#1726a4",
                borderRadius: 8,
                padding: "14px 12px",
                marginBottom: 8,
                fontWeight: 800,
                cursor: "pointer",
                textTransform: "uppercase",
              }}
            >
              {categoria}
            </button>
          ))}

          <div style={{ marginTop: 22 }}>
            <button
              type="button"
              onClick={() => setModoNuevaOrden("identificar")}
              style={{
                width: "100%",
                border: "1px solid #2536db",
                background: "#ffffff",
                color: "#2536db",
                borderRadius: 8,
                padding: "12px 10px",
                fontWeight: 800,
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              Identificar usuario
            </button>

            <button
              type="button"
              onClick={() => {
                setModoNuevaOrden("consumidor_final");
                setVentaForm((prev) => ({
                  ...prev,
                  alumno_id: "",
                  metodo_pago:
                    prev.metodo_pago === "RECARGA" ||
                    prev.metodo_pago === "CREDITO"
                      ? "EFECTIVO"
                      : prev.metodo_pago,
                }));
              }}
              style={{
                width: "100%",
                border: "1px solid #94a3b8",
                background: "#ffffff",
                color: "#334155",
                borderRadius: 8,
                padding: "12px 10px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Consumidor final
            </button>
          </div>
        </aside>

        {/* ÁREA DE PRODUCTOS */}
        <section style={{ padding: 20, minWidth: 0 }}>
          <div
            style={{
              textAlign: "center",
              fontSize: 18,
              marginBottom: 16,
              color: "#111827",
            }}
          >
            Configura la compra y selecciona los productos
          </div>

          <div
            style={{
              border: "2px solid #2637d9",
              borderRadius: 10,
              padding: 14,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              maxWidth: 1100,
              margin: "0 auto 22px auto",
              background: "#eef4ff",
            }}
          >
            <div>
              <label style={styles.label}>Local</label>
              <input value={jornadaActiva?.punto_nombre||localNuevaOrden} style={styles.input} readOnly />
            </div>

            <div>
              <label style={styles.label}>Fecha de la orden</label>
              <input
                type="date"
                value={fechaNuevaOrden}
                onChange={(e) => setFechaNuevaOrden(e.target.value)}
                style={{ ...styles.input, background: "#ffffff" }}
              />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(245px, 1fr))",
              gap: 16,
            }}
          >
            {productosActivos
              .filter((p) => {
                const texto = busquedaProductoNuevaOrden
                  .trim()
                  .toLowerCase();

                const coincideTexto =
                  !texto ||
                  String(p.nombre || "")
                    .toLowerCase()
                    .includes(texto) ||
                  String(p.codigo || "")
                    .toLowerCase()
                    .includes(texto);

                const coincideCategoria =
                  categoriaNuevaOrden === "TODOS" ||
                  String(p.categoria || "") === categoriaNuevaOrden;

                return coincideTexto && coincideCategoria;
              })
              .map((producto) => {
                const itemExistente = (
                  Array.isArray(ventaItems) ? ventaItems : []
                ).find(
                  (item) =>
                    String(item.producto_id) === String(producto.id)
                );

                const sinStock =
                  stockProductoEnPunto(producto.id, localNuevaOrden) <= 0;

                return (
                  <article
                    key={producto.id}
                    style={{
                      border: itemExistente
                        ? "2px solid #2536db"
                        : "1px solid #e5e7eb",
                      borderRadius: 14,
                      background: "#ffffff",
                      padding: 14,
                      boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "105px 1fr",
                        gap: 14,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          height: 95,
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#dbe7ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 42,
                        }}
                      >
                        {producto.imagen ? (
                          <img
                            src={producto.imagen}
                            alt={producto.nombre || "Producto"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          "🍽️"
                        )}
                      </div>

                      <div>
                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 900,
                            color: "#111827",
                            textTransform: "uppercase",
                          }}
                        >
                          {producto.nombre}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 15,
                            fontWeight: 700,
                          }}
                        >
                          Costo: {formatearMoneda(producto.precio)}
                        </div>

                        <div
                          style={{
                            display: "inline-block",
                            marginTop: 8,
                            padding: "4px 12px",
                            borderRadius: 999,
                            background: sinStock ? "#fee2e2" : "#dcfce7",
                            color: sinStock ? "#b91c1c" : "#166534",
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          Stock {localNuevaOrden}: {stockProductoEnPunto(producto.id, localNuevaOrden)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={sinStock}
                      onClick={() => {
                        if (itemExistente) {
                          const indice = ventaItems.findIndex(
                            (item) =>
                              String(item.producto_id) ===
                              String(producto.id)
                          );

                          const nuevaCantidad =
                            Number(itemExistente.cantidad || 0) + 1;

                          if (
                            nuevaCantidad > Number(producto.stock || 0)
                          ) {
                            alert(
                              `No puedes superar el stock disponible: ${producto.stock}`
                            );
                            return;
                          }

                          actualizarItemVenta(
                            indice,
                            "cantidad",
                            String(nuevaCantidad)
                          );
                          return;
                        }

                        setVentaItems((prev) => [
                          ...(Array.isArray(prev) ? prev : []),
                          {
                            producto_id: String(producto.id),
                            cantidad: "1",
                          },
                        ]);
                      }}
                      style={{
                        width: "100%",
                        marginTop: 14,
                        border: "none",
                        borderRadius: 8,
                        padding: "12px 10px",
                        background: sinStock ? "#cbd5e1" : "#bcd0ff",
                        color: sinStock ? "#64748b" : "#1726a4",
                        fontWeight: 900,
                        cursor: sinStock ? "not-allowed" : "pointer",
                      }}
                    >
                      {sinStock ? "Sin stock" : "Agregar producto"}
                    </button>
                  </article>
                );
              })}
          </div>

          {/* RESUMEN DE LA ORDEN */}
          <div
            style={{
              marginTop: 24,
              borderTop: "1px solid #e5e7eb",
              paddingTop: 20,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
              gap: 20,
            }}
          >
            <div>
              <h3 style={{ marginTop: 0 }}>Productos agregados</h3>

              {(Array.isArray(ventaItemsCalculados)
                ? ventaItemsCalculados
                : []
              ).length === 0 ? (
                <div
                  style={{
                    border: "1px dashed #cbd5e1",
                    borderRadius: 10,
                    padding: 24,
                    color: "#64748b",
                    textAlign: "center",
                  }}
                >
                  Todavía no has agregado productos.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {ventaItemsCalculados.map((item, index) => (
                    <div
                      key={`${item.producto_id}-${index}`}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 12,
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800 }}>
                          {item.producto?.nombre || "Producto"}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b" }}>
                          {formatearMoneda(item.precio)} cada uno ·{" "}
                          {formatearMoneda(item.total)}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const cantidad =
                              Number(item.cantidad || 0) - 1;

                            if (cantidad <= 0) {
                              eliminarItemVenta(index);
                              return;
                            }

                            actualizarItemVenta(
                              index,
                              "cantidad",
                              String(cantidad)
                            );
                          }}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          −
                        </button>

                        <strong>{Number(item.cantidad || 0)}</strong>

                        <button
                          type="button"
                          onClick={() => {
                            const disponible = Number(
                              item.producto?.stock || 0
                            );
                            const cantidad =
                              Number(item.cantidad || 0) + 1;

                            if (cantidad > disponible) {
                              alert(
                                `No puedes superar el stock disponible: ${disponible}`
                              );
                              return;
                            }

                            actualizarItemVenta(
                              index,
                              "cantidad",
                              String(cantidad)
                            );
                          }}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            border: "1px solid #cbd5e1",
                            background: "#ffffff",
                            cursor: "pointer",
                            fontWeight: 900,
                          }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => eliminarItemVenta(index)}
                        style={{
                          border: "none",
                          background: "#fee2e2",
                          color: "#b91c1c",
                          borderRadius: 8,
                          padding: "9px 11px",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                border: "1px solid #dbe3f0",
                borderRadius: 12,
                padding: 16,
                background: "#f8fafc",
              }}
            >
              <label style={styles.label}>Método de pago</label>
              <select
                value={ventaForm.metodo_pago}
                onChange={(e) => {
                  const nuevoMetodo = e.target.value;

                  // Efectivo y transferencia funcionan inmediatamente.
                  if (
                    nuevoMetodo === "EFECTIVO" ||
                    nuevoMetodo === "TRANSFERENCIA"
                  ) {
                    setVentaForm((prev) => ({
                      ...prev,
                      metodo_pago: nuevoMetodo,
                    }));
                    return;
                  }

                  // Saldo y crédito del alumno:
                  // si todavía no hay alumno identificado, abrimos
                  // automáticamente el buscador de estudiantes.
                  if (
                    nuevoMetodo === "RECARGA" ||
                    nuevoMetodo === "CREDITO"
                  ) {
                    setVentaForm((prev) => ({
                      ...prev,
                      profesor_id: "",
                      metodo_pago: nuevoMetodo,
                    }));

                    if (!alumnoVentaSeleccionado) {
                      setModoNuevaOrden("identificar");
                      setTipoUsuarioNuevaOrden("ESTUDIANTE");
                      setBusquedaUsuarioNuevaOrden("");
                    }
                    return;
                  }

                  // Crédito profesor:
                  // si todavía no hay profesor, abrimos directamente
                  // la identificación filtrada por profesores.
                  if (nuevoMetodo === "CREDITO_PROFESOR") {
                    setVentaForm((prev) => ({
                      ...prev,
                      alumno_id: "",
                      metodo_pago: nuevoMetodo,
                    }));

                    if (!profesorVentaSeleccionado) {
                      setModoNuevaOrden("identificar");
                      setTipoUsuarioNuevaOrden("PROFESOR");
                      setBusquedaUsuarioNuevaOrden("");
                    }
                  }
                }}
                style={styles.input}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="RECARGA">Saldo del alumno</option>
                <option value="CREDITO">Crédito del alumno</option>
                <option value="CREDITO_PROFESOR">Crédito del profesor</option>
              </select>

              <div style={{ height: 12 }} />

              <label style={styles.label}>Observación</label>
              <input
                type="text"
                value={ventaForm.observacion}
                onChange={(e) =>
                  setVentaForm((prev) => ({
                    ...prev,
                    observacion: e.target.value,
                  }))
                }
                placeholder="Observación"
                style={styles.input}
              />

              {ventaForm.metodo_pago === "RECARGA" &&
                alumnoVentaSeleccionado && (
                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 8,
                      background: "#dcfce7",
                      color: "#166534",
                      padding: 10,
                      fontWeight: 800,
                    }}
                  >
                    Saldo disponible:{" "}
                    {formatearMoneda(
                      alumnoVentaSeleccionado.saldo || 0
                    )}
                  </div>
                )}

              {ventaForm.metodo_pago === "CREDITO" &&
                alumnoVentaSeleccionado && (
                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 8,
                      background: "#fff7ed",
                      color: "#9a3412",
                      padding: 10,
                      fontWeight: 800,
                    }}
                  >
                    Crédito disponible:{" "}
                    {formatearMoneda(
                      Math.max(
                        0,
                        Number(
                          alumnoVentaSeleccionado.limite_credito ||
                            0
                        ) -
                          Number(
                            alumnoVentaSeleccionado.credito_utilizado ||
                              0
                          )
                      )
                    )}
                  </div>
                )}

              {ventaForm.metodo_pago === "CREDITO_PROFESOR" &&
                profesorVentaSeleccionado && (
                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 8,
                      background: "#eef2ff",
                      color: "#2435bd",
                      padding: 10,
                      fontWeight: 800,
                    }}
                  >
                    Crédito disponible del profesor:{" "}
                    {formatearMoneda(
                      profesorVentaSeleccionado.saldo || 0
                    )}
                  </div>
                )}


              <div
                style={{
                  marginTop: 16,
                  borderRadius: 10,
                  background: "#2528b8",
                  color: "#ffffff",
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 13 }}>Total de la orden</div>
                <div style={{ fontSize: 30, fontWeight: 900 }}>
                  {formatearMoneda(totalVentaCalculado)}
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  (Array.isArray(ventaItemsCalculados)
                    ? ventaItemsCalculados
                    : []
                  ).length === 0
                }
                style={{
                  width: "100%",
                  marginTop: 14,
                  border: "none",
                  borderRadius: 9,
                  padding: "13px 12px",
                  background:
                    (Array.isArray(ventaItemsCalculados)
                      ? ventaItemsCalculados
                      : []
                    ).length === 0
                      ? "#94a3b8"
                      : "#ff8748",
                  color: "#ffffff",
                  fontWeight: 900,
                  cursor:
                    (Array.isArray(ventaItemsCalculados)
                      ? ventaItemsCalculados
                      : []
                    ).length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                Crear orden
              </button>

              <button
                type="button"
                onClick={() => {
                  const confirmar =
                    (Array.isArray(ventaItems) ? ventaItems : []).length ===
                      0 ||
                    window.confirm(
                      "¿Deseas cancelar esta orden y eliminar los productos agregados?"
                    );

                  if (!confirmar) return;
                  limpiarFormularioVenta();
                }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  border: "1px solid #dc2626",
                  borderRadius: 9,
                  padding: "12px 12px",
                  background: "#ffffff",
                  color: "#b91c1c",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Cancelar orden
              </button>
            </div>
          </div>
        </section>
      </div>
    </form>
  </div>
)}

            {vistaVentasInterna === "consultar" && (
              <>
                <div style={styles.box}>
                  <div style={styles.filtersGridPaymon}>
                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Tipo de fecha</label>
                      <select
                        value={ventasFiltros.tipo_fecha}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            tipo_fecha: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="created_at">Compras</option>
                      </select>
                    </div>

                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Fecha inicial</label>
                      <input
                        type="date"
                        value={ventasFiltros.fecha_inicio}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            fecha_inicio: e.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Fecha final</label>
                      <input
                        type="date"
                        value={ventasFiltros.fecha_fin}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            fecha_fin: e.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Tipo de orden</label>
                      <select
                        value={ventasFiltros.tipo_orden}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            tipo_orden: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="">Selecciona</option>
                        <option value="NORMAL">Normal</option>
                      </select>
                    </div>

                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Orden ID</label>
                      <input
                        type="text"
                        placeholder="Ej: 2043"
                        value={ventasFiltros.orden_id}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            orden_id: e.target.value,
                          })
                        }
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Ubicación</label>
                      <select
                        value={ventasFiltros.ubicacion}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            ubicacion: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="">Selecciona</option>
                        <option value="PRINCIPAL">Principal</option>
                      </select>
                    </div>

                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Operador</label>
                      <select
                        value={ventasFiltros.operador}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            operador: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="">Selecciona</option>
                      </select>
                    </div>

                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Estado</label>
                      <select
                        value={ventasFiltros.estado}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            estado: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="ENTREGADA">Entregada</option>
                      </select>
                    </div>

                    <div style={styles.filterField}>
                      <label style={styles.filterLabelTop}>Forma de pago</label>
                      <select
                        value={ventasFiltros.metodo_pago}
                        onChange={(e) =>
                          setVentasFiltros({
                            ...ventasFiltros,
                            metodo_pago: e.target.value,
                          })
                        }
                        style={styles.input}
                      >
                        <option value="todos">Selecciona</option>
                        <option value="EFECTIVO">Efectivo</option>
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="RECARGA">Recarga</option>
                      </select>
                    </div>
                  </div>

                  <div style={styles.filterButtons}>
                    <button
                      type="button"
                      style={styles.button}
                      onClick={() => setVentasFiltros({ ...ventasFiltros })}
                    >
                      Consultar
                    </button>

                    <button
                      type="button"
                      style={styles.outlineButton}
                      onClick={limpiarFiltrosVentas}
                    >
                      Borrar Filtros
                    </button>
                  </div>
                </div>

                <div style={{ height: 20 }} />

                <div style={styles.paymonTotalWrap}>
                  <span style={styles.paymonTotalLabel}>
                    Total de ventas: {formatearMoneda(resumenVentasVista.montoTotal)}
                  </span>
                </div>

                <div style={{ height: 20 }} />

                <div style={styles.box}>
  <div style={styles.pageHeaderSmall}>
    <div>
      <h3 style={{ margin: 0 }}>Historial de ventas</h3>
    </div>

    <div style={styles.headerActions}>
      <span style={styles.recordsBadge}>
        {ventasFiltradas.length} registros
      </span>

      <button
        type="button"
        style={styles.exportButton}
        onClick={exportarVentasExcel}
      >
        Exportar
      </button>
    </div>
  </div>

                  {ventasFiltradas.length === 0 ? (
                    <p>No hay ventas para los filtros seleccionados.</p>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Orden No</th>
                            <th style={styles.th}>Usuario</th>
                            <th style={styles.th}>Ubicación</th>
                            <th style={styles.th}>Fecha de Consumo</th>
                            <th style={styles.th}>Fecha de Pago</th>
                            <th style={styles.th}>Fecha de Creación</th>
                            <th style={styles.th}>Hora compra</th>
                            <th style={styles.th}>Total</th>
                            <th style={styles.th}>Estado</th>
                            <th style={styles.th}>Forma Pago</th>
                            <th style={styles.th}>Tipo orden</th>
                            <th style={styles.th}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventasFiltradas.map((v) => (
                            <tr key={v.id}>
                              <td style={styles.td}>#{v.id}</td>
                              <td style={styles.td}>{v.alumno_nombre}</td>
                              <td style={styles.td}>PRINCIPAL</td>
                              <td style={styles.td}>{formatearSoloFecha(v.fecha_base)}</td>
                              <td style={styles.td}>{formatearSoloFecha(v.fecha_base)}</td>
                              <td style={styles.td}>{formatearSoloFecha(v.fecha_base)}</td>
                              <td style={styles.td}>{formatearSoloHora(v.fecha_base)}</td>
                              <td style={styles.td}>{formatearMoneda(v.total)}</td>
                              <td style={styles.td}>
                                <span style={styles.badgeDelivered}>Entregada</span>
                              </td>
                              <td style={styles.td}>{v.metodo_visual}</td>
                              <td style={styles.td}>Normal</td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={{
                                    border: "1px solid #1d4ed8",
                                    background: "#eff6ff",
                                    color: "#1d4ed8",
                                    borderRadius: 7,
                                    padding: "8px 11px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                  onClick={() => reimprimirTicketVenta(v)}
                                  title={`Reimprimir ticket de la orden #${v.id}`}
                                >
                                  🖨 Reimprimir
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {vista === "reportes" && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.dashboardTitle}>Reportes</h1>
                <p style={styles.dashboardSubtitle}>
                  Resumen de recargas, ventas, saldo y comportamiento del sistema
                </p>
              </div>

              <button
                style={styles.refreshButton}
                onClick={() => {
                  cargarResumen();
                  cargarRecargas();
                  cargarVentas();
                  cargarAlumnos();
                  cargarProductos();
                }}
              >
                Refrescar
              </button>
            </div>

            <div style={styles.grid}>
              <div style={styles.box}>
                <h3>Total recargas</h3>
                <p>{formatearMoneda(reporteResumen.totalRecargas)}</p>
              </div>

              <div style={styles.box}>
                <h3>Total ventas</h3>
                <p>{formatearMoneda(reporteResumen.totalVentas)}</p>
              </div>

              <div style={styles.box}>
                <h3>Ventas efectivo</h3>
                <p>{formatearMoneda(reporteResumen.ventasEfectivo)}</p>
              </div>

              <div style={styles.box}>
                <h3>Ventas transferencia</h3>
                <p>{formatearMoneda(reporteResumen.ventasTransferencia)}</p>
              </div>

              <div style={styles.box}>
                <h3>Ventas por recarga</h3>
                <p>{formatearMoneda(reporteResumen.ventasRecarga)}</p>
              </div>

              <div style={styles.box}>
                <h3>Saldo total alumnos</h3>
                <p>{formatearMoneda(reporteResumen.saldoTotalAlumnos)}</p>
              </div>
            </div>

            <div style={{ height: 20 }} />

            <div style={styles.twoColumn}>
              <div style={styles.box}>
                <h3>Últimas recargas</h3>

                {recargas.length === 0 ? (
                  <p>No hay recargas registradas.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Alumno</th>
                          <th style={styles.th}>Monto</th>
                          <th style={styles.th}>Método</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recargas.slice(0, 10).map((r) => (
                          <tr key={r.id}>
                            <td style={styles.td}>
                              {`${r.nombres || ""} ${r.apellidos || ""}`.trim() || "-"}
                            </td>
                            <td style={styles.td}>{formatearMoneda(r.monto)}</td>
                            <td style={styles.td}>{r.metodo_pago || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={styles.box}>
                <h3>Últimas ventas</h3>

                {ventas.length === 0 ? (
                  <p>No hay ventas registradas.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Método</th>
                          <th style={styles.th}>Total</th>
                          <th style={styles.th}>Alumno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.slice(0, 10).map((v) => {
                          const alumno = alumnos.find(
                            (a) => String(a.id) === String(v.alumno_id)
                          );
                          return (
                            <tr key={v.id}>
                              <td style={styles.td}>
                                {v.metodo_pago === "SALDO" ? "RECARGA" : v.metodo_pago}
                              </td>
                              <td style={styles.td}>{formatearMoneda(v.total)}</td>
                              <td style={styles.td}>
                                {alumno ? obtenerNombreAlumno(alumno) : v.alumno_id || "-"}
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
          </>
        )}


        {vista === "configuracion" &&
          ["ADMIN", "SUPER_ADMIN"].includes(rolActual) && (
          <ConfiguracionModulo
            API_URL={API_URL}
            usuario={usuario}
            institucion={institucionActiva}
            institucionId={institucionActivaId}
            onCerrarSesion={cerrarSesion}
            puede={puede}
          />
        )}

              </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef2f7",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    boxSizing: "border-box",
  },
  loginCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    padding: "32px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    boxSizing: "border-box",
  },
  title: {
    margin: 0,
    marginBottom: "8px",
    fontSize: "32px",
    textAlign: "center",
    color: "#1d4ed8",
  },
  subtitle: {
    marginTop: 0,
    marginBottom: "24px",
    textAlign: "center",
    color: "#555",
  },
  appShell: {
    minHeight: "100vh",
    width: "100%",
    display: "grid",
    gridTemplateColumns: "270px minmax(0, 1fr)",
    background: "#f3f4f6",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    background: "#1e3a8a",
    color: "#fff",
    padding: "22px 20px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "20px",
    minHeight: "100vh",
    boxSizing: "border-box",
    position: "sticky",
    top: 0,
  },
  logo: {
    margin: 0,
    marginBottom: "16px",
    fontSize: "22px",
  },
  institucionBadge: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "12px",
    padding: "12px",
    marginBottom: "18px",
  },
  institucionLabel: {
    display: "block",
    fontSize: "12px",
    color: "#cbd5e1",
    marginBottom: "6px",
  },
  institucionName: {
    display: "block",
    fontSize: "14px",
    lineHeight: 1.35,
  },
  menuButton: {
    width: "100%",
    background: "transparent",
    color: "#fff",
    border: "none",
    textAlign: "left",
    padding: "13px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "17px",
    marginBottom: "8px",
  },
  menuButtonActive: {
    width: "100%",
    background: "#3b82f6",
    color: "#fff",
    border: "2px solid #93c5fd",
    textAlign: "left",
    padding: "13px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    fontSize: "17px",
    marginBottom: "8px",
  },
  logoutButton: {
    width: "100%",
    padding: "15px",
    borderRadius: "12px",
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: "17px",
    cursor: "pointer",
  },
  main: {
    width: "100%",
    minWidth: 0,
    padding: "34px 36px",
    boxSizing: "border-box",
  },
  pageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
    marginBottom: "24px",
    flexWrap: "wrap",
  },
  pageHeaderSmall: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  dashboardTitle: {
    marginTop: 0,
    marginBottom: "10px",
    color: "#111827",
    fontSize: "52px",
    lineHeight: 1.05,
  },
  dashboardSubtitle: {
    color: "#6b7280",
    margin: 0,
    fontSize: "18px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    width: "100%",
  },
  gridMini: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "14px",
    width: "100%",
  },
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
    gap: "20px",
    width: "100%",
    alignItems: "start",
  },
  twoColumnWide: {
    display: "grid",
    gridTemplateColumns: "minmax(360px, 520px) minmax(0, 1fr)",
    gap: "20px",
    width: "100%",
    alignItems: "start",
  },
  accountLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) minmax(320px, 1fr)",
    gap: "20px",
    width: "100%",
    alignItems: "start",
  },
  box: {
    background: "#fff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
    minWidth: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  label: {
    fontSize: "14px",
    color: "#374151",
    fontWeight: "bold",
    marginBottom: "-4px",
  },
  input: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
    background: "#fff",
    boxSizing: "border-box",
  },
  searchInput: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "#fff",
    minWidth: "200px",
    boxSizing: "border-box",
  },
  select: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "#fff",
    minWidth: "150px",
    boxSizing: "border-box",
  },
  button: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  outlineButton: {
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #2563eb",
    background: "#fff",
    color: "#1d4ed8",
    fontSize: "16px",
    cursor: "pointer",
  },
  secondaryButton: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#0f766e",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  smallDangerButton: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: "14px",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#6b7280",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  refreshButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "none",
    background: "#0f766e",
    color: "#fff",
    cursor: "pointer",
    fontSize: "16px",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "980px",
  },
  th: {
    textAlign: "left",
    borderBottom: "1px solid #e5e7eb",
    padding: "12px",
    fontSize: "14px",
    background: "#f8fafc",
    whiteSpace: "nowrap",
  },
  td: {
    borderBottom: "1px solid #f1f5f9",
    padding: "12px",
    fontSize: "14px",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  message: {
    marginTop: "16px",
    textAlign: "center",
    color: "#b91c1c",
  },
  filterLabel: {
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: "normal",
  },
  infoBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
  },
  itemVentaCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: "#f8fafc",
  },
  itemVentaResumen: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: "14px",
    color: "#374151",
    flexWrap: "wrap",
  },
  totalVentaBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    borderRadius: "12px",
    padding: "14px",
    fontSize: "18px",
    fontWeight: "bold",
  },
  badgeActive: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dcfce7",
    color: "#166534",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeInactive: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeNormal: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeBajo: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fef3c7",
    color: "#92400e",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeAgotado: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#fee2e2",
    color: "#991b1b",
    fontSize: "12px",
    fontWeight: "bold",
  },
  badgeDelivered: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#d1fae5",
    color: "#065f46",
    fontSize: "12px",
    fontWeight: "bold",
  },
  editIconButton: {
    border: "none",
    background: "#2563eb",
    color: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
  },
  deleteIconButton: {
    border: "none",
    background: "#dc2626",
    color: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
  },
  restoreIconButton: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
  },
  disabledIconButton: {
    border: "none",
    background: "#cbd5e1",
    color: "#fff",
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    cursor: "not-allowed",
    fontSize: "16px",
  },
  ventasTabs: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  ventasTab: {
    padding: "12px 18px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#334155",
    fontSize: "15px",
    cursor: "pointer",
  },
  ventasTabActive: {
    padding: "12px 18px",
    borderRadius: "12px",
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    fontSize: "15px",
    cursor: "pointer",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    width: "100%",
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  filterFieldWide: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gridColumn: "span 2",
  },
  filterLabelTop: {
    fontSize: "14px",
    color: "#334155",
    fontWeight: "bold",
  },
  filterButtons: {
    display: "flex",
    gap: "12px",
    marginTop: "18px",
    flexWrap: "wrap",
  },
  summaryCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  summaryLabel: {
    fontSize: "13px",
    color: "#64748b",
  },
  summaryValue: {
    fontSize: "24px",
    color: "#0f172a",
  },
  summaryPaymonBox: {
    background: "#fff",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
    minWidth: 0,
    border: "1px solid #e5e7eb",
  },
  summaryPaymonLabel: {
    display: "block",
    fontSize: "14px",
    color: "#64748b",
    marginBottom: "8px",
  },
  summaryPaymonValue: {
    display: "block",
    fontSize: "28px",
    color: "#1e3a8a",
    fontWeight: "bold",
  },
  recordsBadge: {
    display: "inline-block",
    padding: "8px 12px",
    borderRadius: "999px",
    background: "#e0e7ff",
    color: "#3730a3",
    fontSize: "13px",
    fontWeight: "bold",
  },
  filtersGridPaymon: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: "16px",
    width: "100%",
  },
  paymonTotalWrap: {
    marginBottom: "8px",
  },
  paymonTotalLabel: {
  display: "inline-block",
  fontSize: "18px",
  color: "#1d4ed8",
  fontWeight: "500",
},

subMenu: {
  marginLeft: 10,
  display: "flex",
  flexDirection: "column",
  gap: 6,
},

subMenuButton: {
  padding: "8px 10px",
  border: "none",
  background: "#e5e7eb",
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14,
},

card: {
  background: "#fff",
  borderRadius: "18px",
  padding: "24px",
  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  boxSizing: "border-box",
  minWidth: 0,
},

reporteHeader: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 20,
  flexWrap: "wrap",
  gap: 12,
},

filtrosRow: {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  width: "100%",
  alignItems: "end",
},

filterGroup: {
  display: "flex",
  flexDirection: "column",
  gap: 6,
},

filterActions: {
  display: "flex",
  alignItems: "flex-end",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
},

reportToolbar: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 16,
  flexWrap: "wrap",
},

exportButton: {
  padding: "12px 18px",
  borderRadius: "10px",
  border: "1px solid #166534",
  background: "#fff",
  color: "#166534",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: "bold",
},

emptyState: {
  padding: "18px",
  textAlign: "center",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  color: "#64748b",
},

tableHeaderProductos: {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.2fr 2fr 1fr 1.2fr",
  gap: 12,
  padding: "12px 14px",
  background: "#dbe7ff",
  borderRadius: 10,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 10,
},

rowTablaProductos: {
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1.2fr 2fr 1fr 1.2fr",
  gap: 12,
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
  alignItems: "center",
},

tableHeaderProductosDia: {
  display: "grid",
  gridTemplateColumns: "2fr 1.2fr repeat(7, 1fr)",
  gap: 12,
  padding: "12px 14px",
  background: "#dbe7ff",
  borderRadius: 10,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 10,
  minWidth: "1100px",
},

rowTablaProductosDia: {
  display: "grid",
  gridTemplateColumns: "2fr 1.2fr repeat(7, 1fr)",
  gap: 12,
  padding: "12px 14px",
  borderBottom: "1px solid #e2e8f0",
  alignItems: "center",
  minWidth: "1100px",
},

moveIconButton: {
  border: "none",
  background: "#d97706",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
},

smallDarkButton: {
  border: "none",
  background: "#7f1d1d",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
},

saveIconButton: {
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
},

viewIconButton: {
  border: "none",
  background: "#059669",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  cursor: "pointer",
  fontSize: "16px",
},

subMenuButtonActive: {
  padding: "8px 10px",
  border: "none",
  background: "#3b82f6",
  color: "#fff",
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
  fontSize: 14,
},
};