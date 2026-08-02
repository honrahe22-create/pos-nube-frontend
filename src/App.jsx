import * as XLSX from "xlsx";
import { useEffect, useMemo, useRef, useState } from "react";
import AlumnosModulo from "./components/AlumnosModulo";
import ConsultaAlumnoPublica from "./components/ConsultaAlumnoPublica";

const API_URL = "https://pos-nube-backend.onrender.com";

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

const formatearSoloFecha = (valor) => {
  if (!valor) return "-";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "-";
  return fecha.toLocaleDateString();
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

  const [vista, setVista] = useState("dashboard");
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

  const [ventas, setVentas] = useState([]);
  const [ventaForm, setVentaForm] = useState({
    alumno_id: "",
    metodo_pago: "EFECTIVO",
    observacion: "",
  });
 const [ventaItems, setVentaItems] = useState([]);

  const [vistaVentasInterna, setVistaVentasInterna] = useState("consultar");
const [menuComidasAbierto, setMenuComidasAbierto] = useState(true);
const [menuVentasAbierto, setMenuVentasAbierto] = useState(false);
const [menuReportesAbierto, setMenuReportesAbierto] = useState(false);
const [busquedaProductos, setBusquedaProductos] = useState("");
const [busquedaInventario, setBusquedaInventario] = useState("");
const [productoDetalle, setProductoDetalle] = useState(null);
const [productosSeleccionados, setProductosSeleccionados] = useState({});
const [stockDetalle, setStockDetalle] = useState(null);
const [stockTransferencia, setStockTransferencia] = useState(null);

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
      operador_nombre: usuario?.nombre || "Sistema",
      estado_visual: "Aceptada",
      documento_visual: recarga.id ? String(recarga.id) : "-",
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
          : venta.metodo_pago || "EFECTIVO";

      return {
        ...venta,
        alumno_nombre: nombreAlumno,
        metodo_visual: metodoVisual,
        fecha_base: venta.created_at || venta.fecha || null,
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
  // tu código actual aquí (no lo toco)
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
  
const guardarStockProducto = async (producto) => {
  const nuevoValor = stockEditado[producto.id];

  if (nuevoValor === undefined || nuevoValor === null || nuevoValor === "") {
    alert("Ingresa un valor en Nuevo stock.");
    return;
  }

  const stockNumero = Number(nuevoValor);

  if (Number.isNaN(stockNumero) || stockNumero < 0) {
    alert("El stock debe ser un número válido mayor o igual a 0.");
    return;
  }

  try {
    const token = localStorage.getItem("token");
    const institucionId = obtenerInstitucionActivaId();

    const res = await fetch(`${API_URL}/api/productos/${producto.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        institucion_id: institucionId,
        nombre: producto.nombre,
        codigo: producto.codigo || "",
        descripcion: producto.descripcion || "",
        precio: Number(producto.precio || 0),
        stock: stockNumero,
        stock_minimo: Number(producto.stock_minimo || 0),
        categoria: producto.categoria || "",
        activo: producto.activo !== false,
      }),
    });

    if (!res.ok) {
      const texto = await res.text();
      throw new Error(texto || "No se pudo actualizar el stock.");
    }

    const productoActualizado = await res.json();

    setProductos((prev) =>
      prev.map((p) =>
        Number(p.id) === Number(producto.id)
          ? productoActualizado
          : p
      )
    );

    setStockEditado((prev) => ({
      ...prev,
      [producto.id]: String(stockNumero),
    }));

    alert(`Stock actualizado correctamente para ${producto.nombre}.`);
  } catch (error) {
    console.error("Error actualizando stock:", error);
    alert("No se pudo actualizar el stock en el servidor.");
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

const verMovimientosStockNuevo = (producto) => {
  setStockTransferencia(null);
  setStockDetalle(producto);
};

const eliminarStockProductoNuevo = async (producto) => {
  const confirmado = window.confirm(
    `¿Deseas desactivar o eliminar ${producto.nombre}?`
  );

  if (!confirmado) return;

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${API_URL}/api/productos/${producto.id}/desactivar`, {
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

  setProductos((prev) =>
    prev.map((p) =>
      Number(p.id) === Number(producto.id)
        ? { ...p, activo: false }
        : p
    )
  );

  setStockDetalle((prev) =>
    prev && Number(prev.id) === Number(producto.id)
      ? { ...prev, activo: false }
      : prev
  );
};

const transferirStockProductoNuevo = (producto) => {
  setStockDetalle(null);
  setStockTransferencia({
    ...producto,
    cantidad: "1",
  });
};

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

      setVista("dashboard");
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

  const consultarProductos = () => {
  let lista = [...ventasEnriquecidas];

  if (productosFiltros.fecha_inicio) {
    lista = lista.filter((venta) => {
      const fecha = formatearFechaInput(venta.fecha_base);
      return fecha && fecha >= productosFiltros.fecha_inicio;
    });
  }

  if (productosFiltros.fecha_fin) {
    lista = lista.filter((venta) => {
      const fecha = formatearFechaInput(venta.fecha_base);
      return fecha && fecha <= productosFiltros.fecha_fin;
    });
  }

  const mapa = {};

  lista.forEach((venta) => {
    const items = Array.isArray(venta.items)
      ? venta.items
      : Array.isArray(venta.detalles)
      ? venta.detalles
      : [];

    items.forEach((item) => {
      const nombre =
        item.producto_nombre ||
        item.nombre ||
        item.descripcion ||
        "Producto";

      const codigo =
        item.producto_id ||
        item.codigo ||
        "-";

      const categoria =
        item.categoria ||
        "-";

      const descripcion =
        item.descripcion ||
        item.producto_nombre ||
        item.nombre ||
        "-";

      if (!mapa[nombre]) {
        mapa[nombre] = {
          id: `${nombre}-${codigo}`,
          nombre,
          codigo,
          categoria,
          descripcion,
          cantidad: 0,
          total: 0,
        };
      }

      mapa[nombre].cantidad += Number(item.cantidad || 0);
      mapa[nombre].total += Number(item.total || 0);
    });
  });

  setProductosVendidos(Object.values(mapa));
};

const consultarProductosPorDia = () => {
  let lista = [...ventasEnriquecidas];

  if (productosPorDiaFiltros.fecha_inicio) {
    lista = lista.filter((venta) => {
      const fecha = formatearFechaInput(venta.fecha_base);
      return fecha && fecha >= productosPorDiaFiltros.fecha_inicio;
    });
  }

  if (productosPorDiaFiltros.fecha_fin) {
    lista = lista.filter((venta) => {
      const fecha = formatearFechaInput(venta.fecha_base);
      return fecha && fecha <= productosPorDiaFiltros.fecha_fin;
    });
  }

  const mapa = {};

  lista.forEach((venta) => {
    const items = Array.isArray(venta.items)
      ? venta.items
      : Array.isArray(venta.detalles)
      ? venta.detalles
      : [];

    items.forEach((item) => {
      const nombre =
        item.producto_nombre ||
        item.nombre ||
        item.descripcion ||
        "Producto";

      const categoria = item.categoria || "-";

      const fecha = venta.fecha_base ? new Date(venta.fecha_base) : null;
      const dia = fecha && !Number.isNaN(fecha.getTime()) ? fecha.getDay() : null;

      if (!mapa[nombre]) {
        mapa[nombre] = {
          producto: nombre,
          categoria,
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

      if (dia === 0) mapa[nombre].domingo += cantidad;
      if (dia === 1) mapa[nombre].lunes += cantidad;
      if (dia === 2) mapa[nombre].martes += cantidad;
      if (dia === 3) mapa[nombre].miercoles += cantidad;
      if (dia === 4) mapa[nombre].jueves += cantidad;
      if (dia === 5) mapa[nombre].viernes += cantidad;
      if (dia === 6) mapa[nombre].sabado += cantidad;
    });
  });

  setProductosVendidosPorDia(Object.values(mapa));
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
          institucion_id: Number(institucionId),
          nombre: productoForm.nombre,
          descripcion: productoForm.descripcion,
          precio: Number(productoForm.precio || 0),
          stock: Number(productoForm.stock || 0),
          stock_minimo: Number(productoForm.stock_minimo || 0),
          categoria: productoForm.categoria,
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
        alert("Debes seleccionar alumno y monto válido");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        alumno_id: Number(recargaForm.alumno_id),
        monto: Number(recargaForm.monto || 0),
        metodo_pago: recargaForm.metodo_pago,
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

  const imprimirTicketVenta = (ticket) => {
    if (!ticket) {
      alert("No existen datos para imprimir el ticket.");
      return;
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

      const stockDisponible = Number(producto.stock || 0);

      if (item.cantidad > stockDisponible) {
        alert(
          `${producto.nombre}: solo hay ${stockDisponible} unidades disponibles`
        );
        return;
      }
    }

    const pagaConSaldo =
      ventaForm.metodo_pago === "RECARGA";

    if (pagaConSaldo && !ventaForm.alumno_id) {
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

    const payload = {
      institucion_id: Number(institucionId),
      alumno_id: pagaConSaldo
        ? Number(ventaForm.alumno_id)
        : null,
      metodo_pago: pagaConSaldo
        ? "SALDO"
        : ventaForm.metodo_pago,
      items: itemsLimpios,
      observacion: ventaForm.observacion?.trim() || "",
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

    // Imprimir únicamente después de que el backend confirmó la venta.
    // En el iMin Falcon 1, el navegador enviará el ticket a la impresora integrada.
    // En otros equipos se usará el servicio de impresión disponible en el navegador.
    if (data.ticket) {
      imprimirTicketVenta(data.ticket);
    }

    // Actualizar datos
    await Promise.all([
      cargarVentas(),
      cargarProductos(),
      cargarAlumnos(),
      cargarResumen(),
    ]);

    // Si la venta fue desde la ficha del alumno
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
        };
      });

      setVista("alumnos");
      setVistaAlumnoDetalle("datos");
    } else {
      setVistaVentasInterna("consultar");
    }

    limpiarFormularioVenta();

    alert("Venta registrada correctamente");
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
    if (usuario) {
      cargarResumen();
      cargarProductos();
      cargarAlumnos();
      cargarProfesores();
      cargarRecargas();
      cargarVentas();
    }
  }, [usuario, institucionSeleccionadaId]);

 useEffect(() => {
  if (!usuario) return;

  if (vista === "productos" || vista === "inventario" || vista === "ventas") {
    cargarProductos();
  }

  if (vista === "alumnos" || vista === "recargas" || vista === "ventas") {
    cargarAlumnos();
  }

  if (vista === "profesores") {
    cargarProfesores();
  }

  if (vista === "dashboard" || vista === "reportes") {
    cargarResumen();
  }

  if (vista === "recargas" || vista === "reportes") {
    cargarRecargas();
  }

  if (vista === "ventas" || vista === "reportes") {
    cargarVentas();
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

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    localStorage.removeItem("institucionSeleccionadaId");
    setUsuario(null);
    setResumen(null);
    setProductos([]);
    setAlumnos([]);
    setProfesores([]);
    setProfesorDetalle(null);
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

  return (
    <div style={styles.appShell}>
      <aside style={styles.sidebar}>
        <div>
          <h2 style={styles.logo}>POS NUBE</h2>

          <div style={styles.institucionBadge}>
            <span style={styles.institucionLabel}>Institución</span>
            <strong style={styles.institucionName}>
              {institucionActiva?.nombre || "Sin seleccionar"}
            </strong>
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
      texto: "Recargas en efectivo",
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
  ].map((opcion) => (
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
      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
        {usuario?.rol || "Administrador"}
      </div>
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
        <p style={styles.dashboardSubtitle}>Resumen por fecha</p>
      </div>

      <button
        style={styles.refreshButton}
        onClick={() => {
          cargarVentas();
          cargarRecargas();
          cargarAlumnos();
        }}
      >
        Refrescar
      </button>
    </div>

    <div style={styles.box}>
      <div style={styles.filtersGridPaymon}>
        <div style={styles.filterField}>
          <label style={styles.filterLabelTop}>Fecha inicial</label>
          <input
            type="date"
            value={cierreCajaFiltros.fecha_inicio}
            onChange={(e) =>
              setCierreCajaFiltros({
                ...cierreCajaFiltros,
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
            value={cierreCajaFiltros.fecha_fin}
            onChange={(e) =>
              setCierreCajaFiltros({
                ...cierreCajaFiltros,
                fecha_fin: e.target.value,
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
          onClick={() => setCierreCajaFiltros({ ...cierreCajaFiltros })}
        >
          Consultar
        </button>

        <button
          type="button"
          style={styles.outlineButton}
          onClick={limpiarFiltrosCierreCaja}
        >
          Borrar filtros
        </button>
      </div>
    </div>

    <div style={{ height: 20 }} />

    <div style={styles.grid}>
      <div style={styles.box}>
        <h3>Ventas en efectivo</h3>
        <p>{formatearMoneda(cierreCajaResumen.ventasEfectivo)}</p>
      </div>

      <div style={styles.box}>
        <h3>Ventas transferencia</h3>
        <p>{formatearMoneda(cierreCajaResumen.ventasTransferencia)}</p>
      </div>

      <div style={styles.box}>
        <h3>Ventas por saldo</h3>
        <p>{formatearMoneda(cierreCajaResumen.ventasSaldo)}</p>
      </div>

      <div style={styles.box}>
        <h3>Recargas efectivo</h3>
        <p>{formatearMoneda(cierreCajaResumen.recargasEfectivo)}</p>
      </div>

      <div style={styles.box}>
        <h3>Recargas transferencia</h3>
        <p>{formatearMoneda(cierreCajaResumen.recargasTransferencia)}</p>
      </div>

      <div style={styles.box}>
        <h3>Total general</h3>
        <p>{formatearMoneda(cierreCajaResumen.totalGeneral)}</p>
      </div>
    </div>

    <div style={{ height: 20 }} />

    <div style={styles.box}>
      <h3>Cierre de caja</h3>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Concepto</th>
              <th style={styles.th}>Total</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={styles.td}>Ventas en efectivo</td>
              <td style={styles.td}>
                {formatearMoneda(cierreCajaResumen.ventasEfectivo)}
              </td>
            </tr>

            <tr>
              <td style={styles.td}>Ventas por transferencia</td>
              <td style={styles.td}>
                {formatearMoneda(cierreCajaResumen.ventasTransferencia)}
              </td>
            </tr>

            <tr>
              <td style={styles.td}>Ventas por saldo</td>
              <td style={styles.td}>
                {formatearMoneda(cierreCajaResumen.ventasSaldo)}
              </td>
            </tr>

            <tr>
              <td style={styles.td}>Recargas en efectivo</td>
              <td style={styles.td}>
                {formatearMoneda(cierreCajaResumen.recargasEfectivo)}
              </td>
            </tr>

            <tr>
              <td style={styles.td}>Recargas por transferencia</td>
              <td style={styles.td}>
                {formatearMoneda(cierreCajaResumen.recargasTransferencia)}
              </td>
            </tr>

            <tr>
              <td style={styles.td}><strong>Total ventas</strong></td>
              <td style={styles.td}>
                <strong>{formatearMoneda(cierreCajaResumen.totalVentas)}</strong>
              </td>
            </tr>

            <tr>
              <td style={styles.td}><strong>Total recargas</strong></td>
              <td style={styles.td}>
                <strong>{formatearMoneda(cierreCajaResumen.totalRecargas)}</strong>
              </td>
            </tr>

            <tr>
              <td style={styles.td}><strong>Total general</strong></td>
              <td style={styles.td}>
                <strong>{formatearMoneda(cierreCajaResumen.totalGeneral)}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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
          <option value="">Seleccionar</option>
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
          <option value="">Seleccionar</option>
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
          <option value="">Seleccionar</option>
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

      <button style={styles.exportButton}>
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
        onClick={() => setMostrarCrearEgreso(!mostrarCrearEgreso)}
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
            onClick={() => {
              const nuevo = {
                ...egresoForm,
                id: Date.now(),
                total: Number(egresoForm.total || 0),
              };

              setEgresosDiarios([nuevo, ...egresosDiarios]);

              setEgresoForm({
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

              setMostrarCrearEgreso(false);
            }}
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
      <button style={styles.button}>Consultar</button>

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
                <td style={styles.td}>{egreso.fecha}</td>
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
                          fecha: egreso.fecha || "",
                          nombre_egreso: egreso.nombre_egreso || "",
                          total: egreso.total || "",
                          descripcion: egreso.descripcion || "",
                          estado: egreso.estado || "ACTIVO",
                          numero_factura: egreso.numero_factura || "",
                          tipo_egreso: egreso.tipo_egreso || "Efectivo",
                        });
                        setMostrarCrearEgreso(true);
                        setEgresosDiarios(
                          egresosDiarios.filter((item) => item.id !== egreso.id)
                        );
                      }}
                    >
                      ✎
                    </button>

                    <button
                      style={styles.deleteIconButton}
                      onClick={() =>
                        setEgresosDiarios(
                          egresosDiarios.filter((item) => item.id !== egreso.id)
                        )
                      }
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
          <option value="">Seleccionar</option>
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
          <option value="">Seleccionar</option>
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

      <button style={styles.exportButton}>
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
    descargarPlantillaAlumnos={descargarPlantillaAlumnos}
    importarAlumnosArchivo={importarAlumnosArchivo}
    inputImportarAlumnosRef={inputImportarAlumnosRef}
  />
)}

{vista === "profesores" && (
  <>
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
              onClick={() => setVistaProfesoresInterna("creditos")}
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

    {vistaProfesoresInterna === "profesores" && profesorDetalle && (
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
              onClick={() => setVistaProfesorDetalle("creditos")}
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
                setVistaVentasInterna("nueva");
                setTipoUsuarioNuevaOrden("PROFESORES");
                setBusquedaUsuarioNuevaOrden(
                  `${profesorDetalle.nombres || ""} ${profesorDetalle.apellidos || ""}`.trim()
                );
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
              <div><strong>Crédito:</strong> {Number(profesorDetalle.credito || profesorDetalle.saldo || 0) > 0 ? "Sí" : "No"}</div>
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
                onClick={() => setVistaProfesorDetalle("recargas")}
              >
                Recargar efectivo
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
                  onClick={() => setVistaProfesorDetalle(clave)}
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
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", gap: 14 }}>
                      <div style={{ padding: "16px 24px", border: "1px solid #e5e7eb", borderRadius: 12 }}>
                        <div>Total pagadas</div>
                        <strong style={{ fontSize: 28 }}>{formatearMoneda(0)}</strong>
                      </div>
                      <div style={{ padding: "16px 24px", border: "1px solid #e5e7eb", borderRadius: 12 }}>
                        <div>Total pendientes</div>
                        <strong style={{ fontSize: 28, color: "#10b981" }}>{formatearMoneda(0)}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 28, textAlign: "center", color: "#64748b", padding: 28 }}>
                    No hay órdenes disponibles para este profesor.
                  </div>
                </>
              )}

              {vistaProfesorDetalle === "recargas" && (
                <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
                  No hay recargas registradas para este profesor.
                </div>
              )}

              {vistaProfesorDetalle === "dispositivos" && (
                <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
                  No hay dispositivos registrados para este profesor.
                </div>
              )}

              {vistaProfesorDetalle === "creditos" && (
                <div style={{ textAlign: "center", color: "#64748b", padding: 40 }}>
                  No hay movimientos de crédito registrados para este profesor.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

    {vistaProfesoresInterna === "creditos" && (
      <div style={styles.box}>
        <div style={styles.pageHeaderSmall}>
          <h3 style={{ margin: 0 }}>Créditos Profesores</h3>

          <div style={styles.headerActions}>
            <button
              type="button"
              style={styles.outlineButton}
              onClick={() => setVistaProfesoresInterna("profesores")}
            >
              Volver a Profesores
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => alert("Exportar créditos aún no implementado.")}
            >
              Exportar
            </button>
          </div>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Fecha inicial</label>
            <input type="date" style={styles.input} />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Fecha final</label>
            <input type="date" style={styles.input} />
          </div>

          <div style={styles.filterFieldWide}>
            <label style={styles.label}>Buscar</label>
            <input
              type="text"
              placeholder="Buscar profesor"
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button type="button" style={styles.button}>
            Filtrar
          </button>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={styles.infoBox}>
            Este módulo mostrará luego los pagos, consumos y movimientos de crédito
            de profesores.
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Profesor</th>
                  <th style={styles.th}>Cédula</th>
                  <th style={styles.th}>Crédito actual</th>
                  <th style={styles.th}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {profesores.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan={4}>
                      No hay profesores registrados.
                    </td>
                  </tr>
                ) : (
                  profesores.map((p) => (
                    <tr key={p.id}>
                      <td style={styles.td}>
                        {`${p.nombres || ""} ${p.apellidos || ""}`}
                      </td>
                      <td style={styles.td}>{p.cedula || "-"}</td>
                      <td style={styles.td}>
                        {formatearMoneda(p.credito || p.saldo || 0)}
                      </td>
                      <td style={styles.td}>
                        {p.activo !== false ? (
                          <span style={styles.badgeActive}>Activo</span>
                        ) : (
                          <span style={styles.badgeInactive}>Inactivo</span>
                        )}
                      </td>
                    </tr>
                  ))
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
        <h1 style={styles.dashboardTitle}>Existencias</h1>
      </div>

      <div style={styles.headerActions}>
        <button
          type="button"
          style={styles.outlineButton}
          onClick={exportarStockExcel}
          title="Exportar existencias"
        >
          Exportar existencias
        </button>

       <button
  type="button"
  style={styles.secondaryButton}
  onClick={abrirImportadorStock}
  title="Importar productos"
>
  Importar productos
</button>

        <input
          ref={inputImportarStockRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          style={{ display: "none" }}
          onChange={importarStockArchivo}
        />
      </div>
    </div>

    {stockDetalle && (
      <div style={{ ...styles.box, marginBottom: 20 }}>
        <div style={styles.pageHeaderSmall}>
          <h2 style={{ margin: 0 }}>Detalle de existencias</h2>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => setStockDetalle(null)}
          >
            Cerrar
          </button>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Nombre</label>
            <input
              type="text"
              value={stockDetalle.nombre || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Código</label>
            <input
              type="text"
              value={stockDetalle.codigo || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Categoría</label>
            <input
              type="text"
              value={stockDetalle.categoria || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Precio</label>
            <input
              type="text"
              value={Number(stockDetalle.precio || 0).toFixed(2)}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Stock actual</label>
            <input
              type="text"
              value={String(stockDetalle.stock ?? 0)}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Nuevo stock ingresado</label>
            <input
              type="text"
              value={
                stockEditado[stockDetalle.id] === undefined ||
                stockEditado[stockDetalle.id] === ""
                  ? "-"
                  : String(stockEditado[stockDetalle.id])
              }
              style={styles.input}
              readOnly
            />
          </div>
        </div>
      </div>
    )}

    {stockTransferencia && (
      <div style={{ ...styles.box, marginBottom: 20 }}>
        <div style={styles.pageHeaderSmall}>
          <h2 style={{ margin: 0 }}>Transferencia de stock</h2>

          <button
            type="button"
            style={styles.outlineButton}
            onClick={() => setStockTransferencia(null)}
          >
            Cerrar
          </button>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
            <label style={styles.label}>Producto</label>
            <input
              type="text"
              value={stockTransferencia.nombre || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Código</label>
            <input
              type="text"
              value={stockTransferencia.codigo || ""}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Stock disponible</label>
            <input
              type="text"
              value={String(stockTransferencia.stock ?? 0)}
              style={styles.input}
              readOnly
            />
          </div>

          <div style={styles.filterField}>
            <label style={styles.label}>Cantidad a transferir</label>
            <input
              type="number"
              min="1"
              value={stockTransferencia.cantidad ?? "1"}
              onChange={(e) =>
                setStockTransferencia((prev) => ({
                  ...prev,
                  cantidad: e.target.value,
                }))
              }
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.filterButtons}>
          <button
            type="button"
            style={styles.button}
            onClick={() => {
              const cantidad = Number(stockTransferencia.cantidad || 0);
              const stockActual = Number(stockTransferencia.stock || 0);

              if (Number.isNaN(cantidad) || cantidad <= 0) {
                alert("Ingresa una cantidad válida mayor a 0.");
                return;
              }

              if (cantidad > stockActual) {
                alert("No puedes transferir más stock del disponible.");
                return;
              }

              const nuevoStock = stockActual - cantidad;

              setProductos((prev) =>
                prev.map((p) =>
                  Number(p.id) === Number(stockTransferencia.id)
                    ? { ...p, stock: nuevoStock }
                    : p
                )
              );

              setStockEditado((prev) => ({
                ...prev,
                [stockTransferencia.id]: String(nuevoStock),
              }));

              setStockDetalle((prev) =>
                prev && Number(prev.id) === Number(stockTransferencia.id)
                  ? { ...prev, stock: nuevoStock }
                  : prev
              );

              setStockTransferencia(null);
            }}
          >
            Confirmar transferencia
          </button>
        </div>
      </div>
    )}

    <div style={styles.box}>
      <div style={styles.pageHeaderSmall}>
        <input
          type="text"
          placeholder="Buscar"
          value={busquedaInventario}
          onChange={(e) => setBusquedaInventario(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Nombre</th>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Precio</th>
              <th style={styles.th}>Categoría</th>
              <th style={styles.th}>Stock real</th>
              <th style={styles.th}>Nuevo stock</th>
              <th style={styles.th}>Acciones de actualización</th>
            </tr>

            <tr>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}>
                <select style={styles.select}>
                  <option value="">Seleccionar</option>
                </select>
              </th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
              <th style={styles.th}></th>
            </tr>
          </thead>

          <tbody>
            {productos
              .filter((p) =>
                String(p.nombre || "")
                  .toLowerCase()
                  .includes(busquedaInventario.toLowerCase())
              )
              .map((producto) => (
                <tr key={producto.id}>
                  <td style={styles.td}>{producto.nombre}</td>
                  <td style={styles.td}>{producto.codigo || ""}</td>
                  <td style={styles.td}>
                    {Number(producto.precio || 0).toFixed(4)}
                  </td>
                  <td style={styles.td}>{producto.categoria}</td>
                  <td style={styles.td}>
                    PRINCIPAL: {Number(producto.stock || 0)}
                  </td>
                  <td style={styles.td}>
                    <input
                      type="number"
                      value={stockEditado[producto.id] ?? ""}
                      onChange={(e) =>
                        setStockEditado((prev) => ({
                          ...prev,
                          [producto.id]: e.target.value,
                        }))
                      }
                      style={{ ...styles.input, minWidth: 90, padding: "10px" }}
                      placeholder="Nuevo stock"
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        style={styles.saveIconButton}
                        onClick={() => guardarStockProducto(producto)}
                        title="Guardar stock"
                      >
                        💾
                      </button>

                      <button
                        type="button"
                        style={styles.viewIconButton}
                        onClick={() => verMovimientosStockNuevo(producto)}
                        title="Ver movimientos"
                      >
                        ◉
                      </button>

                      <button
                        type="button"
                        style={styles.deleteIconButton}
                        onClick={() => eliminarStockProductoNuevo(producto)}
                        title="Eliminar o desactivar"
                      >
                        🗑
                      </button>

                      <button
                        type="button"
                        style={styles.moveIconButton}
                        onClick={() => transferirStockProductoNuevo(producto)}
                        title="Transferir stock"
                      >
                        ⇄
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
        <h1 style={styles.dashboardTitle}>Recargas en efectivo</h1>
        <p style={styles.dashboardSubtitle}>
          Lista de recargas realizadas
        </p>
      </div>

      <button
        style={styles.refreshButton}
        onClick={() => {
          cargarRecargas();
          cargarAlumnos();
        }}
      >
        Refrescar
      </button>
    </div>

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

      </div>

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
                <th style={styles.th}>Documento</th>
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
            {formatearMoneda(alumnoVentaSeleccionado?.saldo || 0)}
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
          {alumnosActivos
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
                    prev.metodo_pago === "RECARGA"
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
              <select
                value={localNuevaOrden}
                onChange={(e) => setLocalNuevaOrden(e.target.value)}
                style={{ ...styles.input, background: "#ffffff" }}
              >
                <option value="PRINCIPAL">PRINCIPAL</option>
              </select>
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

                const sinStock = Number(producto.stock || 0) <= 0;

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
                          Stock: {Number(producto.stock || 0)}
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
                onChange={(e) =>
                  setVentaForm((prev) => ({
                    ...prev,
                    metodo_pago: e.target.value,
                  }))
                }
                style={styles.input}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option
                  value="RECARGA"
                  disabled={!alumnoVentaSeleccionado}
                >
                  Saldo del alumno
                </option>
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