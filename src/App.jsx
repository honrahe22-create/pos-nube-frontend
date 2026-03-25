import { useEffect, useMemo, useState } from "react";

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
  const [ventaItems, setVentaItems] = useState([
    {
      producto_id: "",
      cantidad: "1",
    },
  ]);

  const [vistaVentasInterna, setVistaVentasInterna] = useState("consultar");
const [menuComidasAbierto, setMenuComidasAbierto] = useState(true);
const [menuVentasAbierto, setMenuVentasAbierto] = useState(false);
const [menuReportesAbierto, setMenuReportesAbierto] = useState(false);
const [busquedaProductos, setBusquedaProductos] = useState("");
const [busquedaInventario, setBusquedaInventario] = useState("");

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
  if (!recargasFiltradas.length) {
    alert("No hay recargas para exportar");
    return;
  }

  const encabezados = [
    "Fecha y Hora",
    "Nombre",
    "Dinero entregado",
    "Dinero recargado",
    "Operador",
    "Tipo",
    "Estado",
    "Documento",
    "Observacion",
  ];

  const filas = recargasFiltradas.map((r) => [
    formatearFechaHora(r.fecha_base),
    r.alumno_nombre || "",
    Number(r.dinero_entregado || 0).toFixed(2),
    Number(r.dinero_recargado || 0).toFixed(2),
    r.operador_nombre || "Sistema",
    r.tipo_visual || "",
    r.estado_visual || "Aceptada",
    r.documento_visual || "-",
    r.observacion || "",
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
  enlace.setAttribute("download", "recargas_exportadas.csv");
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  window.URL.revokeObjectURL(url);
};

  const limpiarFormularioVenta = () => {
    setVentaForm({
      alumno_id: "",
      metodo_pago: "EFECTIVO",
      observacion: "",
    });
    setVentaItems([
      {
        producto_id: "",
        cantidad: "1",
      },
    ]);
  };

  const limpiarFiltrosVentas = () => {
  setVentasFiltros({
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
    setVentaItems((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const actualizarItemVenta = (index, campo, valor) => {
    setVentaItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [campo]: valor } : item))
    );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMensaje("");
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMensaje(data.message || "Error al iniciar sesión");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      setUsuario(data.usuario);

      const institucionIdLogin = normalizarInstitucionId(data.usuario?.institucion_id);
      if (institucionIdLogin) {
        localStorage.setItem("institucionSeleccionadaId", String(institucionIdLogin));
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

      if (!token || !institucionId) return;

      const res = await fetch(
        `${API_URL}/api/productos?institucion_id=${institucionId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setProductos(Array.isArray(data) ? data : []);
      } else {
        setProductos([]);
      }
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
        .filter((item) => item.producto_id && item.cantidad > 0);

      if (itemsLimpios.length === 0) {
        alert("Debes agregar al menos un producto válido");
        return;
      }

      if (ventaForm.metodo_pago === "RECARGA" && !ventaForm.alumno_id) {
        alert("Debes seleccionar un alumno para venta por recarga");
        return;
      }

      const payload = {
        institucion_id: Number(institucionId),
        alumno_id:
          ventaForm.metodo_pago === "RECARGA" ? Number(ventaForm.alumno_id) : null,
        metodo_pago: ventaForm.metodo_pago === "RECARGA" ? "SALDO" : ventaForm.metodo_pago,
        items: itemsLimpios,
        observacion: ventaForm.observacion,
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
        alert(data.error || data.message || "Error creando venta");
        return;
      }

      limpiarFormularioVenta();
      setVistaVentasInterna("consultar");
      await cargarVentas();
      await cargarProductos();
      await cargarAlumnos();
      await cargarResumen();
      alert("Venta registrada correctamente");
    } catch (error) {
      console.error("Error creando venta:", error);
      alert("No se pudo registrar la venta");
    }
  };

  const guardarCuentaInstitucion = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Sesión no válida");
        return;
      }

      if (!institucionSeleccionadaId) {
        alert("Debes seleccionar una institución");
        return;
      }

      setGuardandoCuenta(true);

      const payload = {
        correo: cuentaForm.correo,
        password_actual: cuentaForm.password_actual,
        nueva_password: cuentaForm.nueva_password,
        confirmar_password: cuentaForm.confirmar_password,
      };

      const res = await fetch(`${API_URL}/api/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Error actualizando cuenta");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data.usuario));
      localStorage.setItem("institucionSeleccionadaId", String(institucionSeleccionadaId));

      setUsuario(data.usuario);
      setCuentaForm((prev) => ({
        ...prev,
        correo: data.usuario?.correo || "",
        password_actual: "",
        nueva_password: "",
        confirmar_password: "",
      }));

      await cargarResumen();
      await cargarProductos();
      await cargarAlumnos();
      await cargarRecargas();
      await cargarVentas();

      alert("Cuenta e institución actualizadas correctamente");
    } catch (error) {
      console.error("Error actualizando cuenta:", error);
      alert("No se pudo actualizar la cuenta");
    } finally {
      setGuardandoCuenta(false);
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

 if (!usuario) {
  return (
    <div style={styles.page}>
      <div style={styles.loginCard}>
        <h1 style={styles.title}>¡Bienvenido a POSNUBE!</h1>
        <p style={styles.subtitle}>
          Maneja tus ventas y recargas de forma rápida y segura
        </p>

        <form onSubmit={handleLogin} style={styles.form}>
          <label style={styles.label}>Correo electrónico</label>
          <input
            type="email"
            placeholder="Coloca tu correo electrónico"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            style={styles.input}
            required
          />

          <label style={styles.label}>Contraseña</label>
          <input
            type="password"
            placeholder="Coloca tu contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          <div style={styles.loginExtraRow}>
            <button
              type="button"
              style={styles.linkButton}
              onClick={() =>
                alert(
                  "La recuperación de contraseña aún no está implementada."
                )
              }
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button type="submit" style={styles.button} disabled={cargando}>
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        {mensaje && <p style={styles.message}>{mensaje}</p>}
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

          <button
            style={vista === "dashboard" ? styles.menuButtonActive : styles.menuButton}
            onClick={() => setVista("dashboard")}
          >
            Dashboard
          </button>

          <button
  style={
    vista === "productos" || vista === "inventario"
      ? styles.menuButtonActive
      : styles.menuButton
  }
  onClick={() => setMenuComidasAbierto(!menuComidasAbierto)}
>
  Comidas
</button>

{menuComidasAbierto && (
  <div style={styles.subMenu}>
    <button
      style={
        vista === "productos"
          ? styles.subMenuButtonActive
          : styles.subMenuButton
      }
      onClick={() => setVista("productos")}
    >
      Menú Cafetería
    </button>

    <button
      style={
        vista === "inventario"
          ? styles.subMenuButtonActive
          : styles.subMenuButton
      }
      onClick={() => setVista("inventario")}
    >
      Stock
    </button>
  </div>
)}

<button
  style={vista === "alumnos" ? styles.menuButtonActive : styles.menuButton}
  onClick={() => setVista("alumnos")}
>
  Alumnos
</button>

         <button
  style={vista === "recargas" ? styles.menuButtonActive : styles.menuButton}
  onClick={() => setVista("recargas")}
>
  Recargas en efectivo
</button>

          <button
  style={vista === "ventas" ? styles.menuButtonActive : styles.menuButton}
  onClick={() => {
    setVista("ventas");
    setMenuVentasAbierto(!menuVentasAbierto);
  }}
>
  Ventas
</button>

{menuVentasAbierto && (
  <div style={styles.subMenu}>
    <button
      style={
        vista === "ventas" && vistaVentasInterna === "registrar"
          ? styles.subMenuButtonActive
          : styles.subMenuButton
      }
      onClick={() => {
        setVista("ventas");
        setVistaVentasInterna("registrar");
      }}
    >
      Nueva Orden
    </button>

    <button
      style={
        vista === "ventas" && vistaVentasInterna === "consultar"
          ? styles.subMenuButtonActive
          : styles.subMenuButton
      }
      onClick={() => {
        setVista("ventas");
        setVistaVentasInterna("consultar");
      }}
    >
      Consultar ventas
    </button>
  </div>
)}

<button
  style={vista === "egresos_diarios" ? styles.menuButtonActive : styles.menuButton}
  onClick={() => setVista("egresos_diarios")}
>
  Egresos diarios
</button>

<button
  style={
    vista === "reportes" ||
    vista === "reporte_cierre" ||
    vista === "reporte_productos" ||
    vista === "reporte_productos_dia"
      ? styles.menuButtonActive
      : styles.menuButton
  }
  onClick={() => {
    setVista("reportes");
    setMenuReportesAbierto(!menuReportesAbierto);
  }}
>
  Reportes
</button>

{menuReportesAbierto && (
  <div style={styles.subMenu}>
    <button
      style={
        vista === "reporte_cierre"
          ? styles.subMenuButtonActive
          : styles.subMenuButton
      }
      onClick={() => setVista("reporte_cierre")}
    >
      Cierre de caja
    </button>

    <button
      style={
        vista === "reporte_productos"
          ? styles.subMenuButtonActive
          : styles.subMenuButton
      }
      onClick={() => setVista("reporte_productos")}
    >
      Productos vendidos
    </button>

    <button
      style={
        vista === "reporte_productos_dia"
          ? styles.subMenuButtonActive
          : styles.subMenuButton
      }
      onClick={() => setVista("reporte_productos_dia")}
    >
      Productos por día
    </button>
  </div>
)}

<button
  style={vista === "cuenta" ? styles.menuButtonActive : styles.menuButton}
  onClick={() => setVista("cuenta")}
>
  Cuenta Institución
</button>

</div>

<button onClick={cerrarSesion} style={styles.logoutButton}>
  Cerrar sesión
</button>

</aside>

<main style={styles.main}>

{vista === "dashboard" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>
          Bienvenido, {usuario.nombre}
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
          style={styles.secondaryButton}
          onClick={() => {
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
        >
          Crear alimento
        </button>
      </div>
    </div>

    {mostrarFormularioProducto && (
      <div style={{ ...styles.box, marginBottom: 20 }}>
        <div style={styles.pageHeaderSmall}>
          <h2 style={{ margin: 0 }}>
            {productoEditando ? "Editar alimento" : "Crear alimento"}
          </h2>

          <button
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
            style={styles.button}
            onClick={() => {
              const filas = [
                [
                  "Nombre",
                  "Código",
                  "Precio",
                  "% impuestos",
                  "Precio final",
                  "Categoría",
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
                    ];
                  }),
              ];

              const csv = filas
                .map((fila) =>
                  fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(",")
                )
                .join("\n");

              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "menu_cafeteria.csv";
              link.click();
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

                return (
                  <tr key={producto.id}>
                    <td style={styles.td}>
                      <input type="checkbox" />
                    </td>
                    <td style={styles.td}>{producto.nombre}</td>
                    <td style={styles.td}>{producto.codigo || ""}</td>
                    <td style={styles.td}>{precio.toFixed(4)}</td>
                    <td style={styles.td}>{impuesto.toFixed(4)}</td>
                    <td style={styles.td}>{precioFinal.toFixed(2)}</td>
                    <td style={styles.td}>{producto.categoria || ""}</td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          style={styles.smallDarkButton}
                          onClick={() => alert(`Producto: ${producto.nombre}`)}
                        >
                          ◉
                        </button>

                        <button
                          style={styles.editIconButton}
                          onClick={() => {
                            editarProducto(producto);
                            setProductoEditando(producto);
                            setMostrarFormularioProducto(true);
                          }}
                        >
                          ✎
                        </button>

                        <button
                          style={styles.deleteIconButton}
                          onClick={() => desactivarProducto(producto.id)}
                        >
                          🗑
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
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.dashboardTitle}>Alumnos</h1>
                <p style={styles.dashboardSubtitle}>
                  Crear y visualizar alumnos de la institución
                </p>
              </div>

              <div style={styles.headerActions}>
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
              </div>
            </div>

            <div style={styles.twoColumn}>
              <div style={styles.box}>
                <h3>{editandoAlumnoId ? "Editar alumno" : "Nuevo alumno"}</h3>

                <form
                  onSubmit={editandoAlumnoId ? actualizarAlumno : crearAlumno}
                  style={styles.form}
                >
                  <input
                    type="text"
                    placeholder="Cédula"
                    value={alumnoForm.cedula}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, cedula: e.target.value })
                    }
                    style={styles.input}
                    required
                  />

                  <input
                    type="text"
                    placeholder="Nombres"
                    value={alumnoForm.nombres}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, nombres: e.target.value })
                    }
                    style={styles.input}
                    required
                  />

                  <input
                    type="text"
                    placeholder="Apellidos"
                    value={alumnoForm.apellidos}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, apellidos: e.target.value })
                    }
                    style={styles.input}
                    required
                  />

                  <input
                    type="text"
                    placeholder="Curso"
                    value={alumnoForm.curso}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, curso: e.target.value })
                    }
                    style={styles.input}
                  />

                  <input
                    type="text"
                    placeholder="Paralelo"
                    value={alumnoForm.paralelo}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, paralelo: e.target.value })
                    }
                    style={styles.input}
                  />

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Saldo inicial"
                    value={alumnoForm.saldo}
                    onChange={(e) =>
                      setAlumnoForm({ ...alumnoForm, saldo: e.target.value })
                    }
                    style={styles.input}
                  />

                  <button type="submit" style={styles.button}>
                    {editandoAlumnoId ? "Actualizar alumno" : "Guardar alumno"}
                  </button>

                  {editandoAlumnoId && (
                    <button
                      type="button"
                      style={styles.cancelButton}
                      onClick={limpiarFormularioAlumno}
                    >
                      Cancelar edición
                    </button>
                  )}
                </form>
              </div>

              <div style={styles.box}>
                <h3>
                  Lista de alumnos{" "}
                  <span style={styles.filterLabel}>
                    {filtroAlumnos === "activos"
                      ? "(Activos)"
                      : filtroAlumnos === "inactivos"
                      ? "(Inactivos)"
                      : "(Todos)"}
                  </span>
                </h3>

                {alumnosFiltrados.length === 0 ? (
                  <p>No hay alumnos para este filtro.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Cédula</th>
                          <th style={styles.th}>Nombres</th>
                          <th style={styles.th}>Apellidos</th>
                          <th style={styles.th}>Curso</th>
                          <th style={styles.th}>Paralelo</th>
                          <th style={styles.th}>Saldo</th>
                          <th style={styles.th}>Estado</th>
                          <th style={styles.th}>Editar</th>
                          <th style={styles.th}>Eliminar</th>
                          <th style={styles.th}>Restaurar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alumnosFiltrados.map((a) => {
                          const activo = a.activo !== false;

                          return (
                            <tr key={a.id}>
                              <td style={styles.td}>{obtenerCedulaAlumno(a) || "-"}</td>
                              <td style={styles.td}>{a.nombres || "-"}</td>
                              <td style={styles.td}>{a.apellidos || "-"}</td>
                              <td style={styles.td}>{a.curso || "-"}</td>
                              <td style={styles.td}>{a.paralelo || "-"}</td>
                              <td style={styles.td}>{formatearMoneda(a.saldo)}</td>
                              <td style={styles.td}>
                                <span
                                  style={activo ? styles.badgeActive : styles.badgeInactive}
                                >
                                  {activo ? "Activo" : "Inactivo"}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={
                                    activo
                                      ? styles.editIconButton
                                      : styles.disabledIconButton
                                  }
                                  onClick={() => activo && iniciarEdicionAlumno(a)}
                                  disabled={!activo}
                                  title="Editar alumno"
                                >
                                  ✏️
                                </button>
                              </td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={
                                    activo
                                      ? styles.deleteIconButton
                                      : styles.disabledIconButton
                                  }
                                  onClick={() => activo && eliminarAlumno(a)}
                                  disabled={!activo}
                                  title="Eliminar alumno"
                                >
                                  🗑️
                                </button>
                              </td>
                              <td style={styles.td}>
                                <button
                                  type="button"
                                  style={
                                    !activo
                                      ? styles.restoreIconButton
                                      : styles.disabledIconButton
                                  }
                                  onClick={() => !activo && restaurarAlumno(a)}
                                  disabled={activo}
                                  title="Restaurar alumno"
                                >
                                  ↩️
                                </button>
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

        {vista === "inventario" && (
  <>
    <div style={styles.pageHeader}>
      <div>
        <h1 style={styles.dashboardTitle}>Stock</h1>
      </div>

      <div style={styles.headerActions}>
        <button style={styles.outlineButton}>
          Exportar stock
        </button>
        <button style={styles.secondaryButton}>
          Importar stock
        </button>
      </div>
    </div>

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
              <th style={styles.th}>Stock actual</th>
              <th style={styles.th}>Nuevo Stock</th>
              <th style={styles.th}>Actualizar stock</th>
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
                      style={{ ...styles.input, minWidth: 90, padding: "10px" }}
                    />
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button style={styles.saveIconButton}>💾</button>
                      <button style={styles.viewIconButton}>◉</button>
                      <button style={styles.deleteIconButton}>🗑</button>
                      <button style={styles.moveIconButton}>⇄</button>
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
  <div style={styles.box}>
    <div
      style={{
        background: "#2528b8",
        color: "#fff",
        padding: "20px 24px",
        borderRadius: "16px 16px 0 0",
        margin: "-24px -24px 20px -24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <h2 style={{ margin: 0, fontSize: "24px" }}>Nueva Orden</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => setModoNuevaOrden("identificar")}
        >
          Identificar usuario
        </button>

        <button
          type="button"
          style={styles.outlineButton}
          onClick={() => setModoNuevaOrden("consumidor_final")}
        >
          Consumidor Final
        </button>
      </div>
    </div>

    {modoNuevaOrden === "identificar" && (
      <div style={{ ...styles.box, marginBottom: 20, padding: 20 }}>
        <div style={styles.filtersGrid}>
          <div style={styles.filterField}>
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

          <div style={styles.filterFieldWide}>
            <label style={styles.label}>Buscar usuario / código</label>
            <input
              type="text"
              value={busquedaUsuarioNuevaOrden}
              onChange={(e) => setBusquedaUsuarioNuevaOrden(e.target.value)}
              style={styles.input}
              placeholder="Buscar usuario / código"
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          {alumnosActivos.filter((a) => {
            const texto = busquedaUsuarioNuevaOrden.toLowerCase();
            const nombre = `${a.nombres || ""} ${a.apellidos || ""}`.toLowerCase();
            const codigo = String(a.codigo || a.cedula || "").toLowerCase();

            return !texto || nombre.includes(texto) || codigo.includes(texto);
          }).length === 0 ? (
            <p style={{ color: "#6b7280", margin: 0 }}>No se encontraron resultados.</p>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nombre</th>
                    <th style={styles.th}>Código</th>
                    <th style={styles.th}>Saldo</th>
                    <th style={styles.th}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {alumnosActivos
                    .filter((a) => {
                      const texto = busquedaUsuarioNuevaOrden.toLowerCase();
                      const nombre = `${a.nombres || ""} ${a.apellidos || ""}`.toLowerCase();
                      const codigo = String(a.codigo || a.cedula || "").toLowerCase();

                      return !texto || nombre.includes(texto) || codigo.includes(texto);
                    })
                    .slice(0, 10)
                    .map((a) => (
                      <tr key={a.id}>
                        <td style={styles.td}>{`${a.nombres || ""} ${a.apellidos || ""}`}</td>
                        <td style={styles.td}>{a.codigo || a.cedula || "-"}</td>
                        <td style={styles.td}>{formatearMoneda(a.saldo || 0)}</td>
                        <td style={styles.td}>
                          <button
                            type="button"
                            style={styles.button}
                            onClick={() => {
                              setVentaForm({
                                ...ventaForm,
                                alumno_id: a.id,
                              });
                              setModoNuevaOrden("consumidor_final");
                            }}
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    )}

    <div style={styles.twoColumnWide}>
      <div style={styles.box}>
        <label style={styles.label}>Escanea el código de barras</label>
        <input
          type="text"
          placeholder="Código de barras"
          value={codigoBarraNuevaOrden}
          onChange={(e) => setCodigoBarraNuevaOrden(e.target.value)}
          style={styles.input}
        />

        <div style={{ height: 12 }} />

        <input
          type="text"
          placeholder="Busca productos"
          value={busquedaProductoNuevaOrden}
          onChange={(e) => setBusquedaProductoNuevaOrden(e.target.value)}
          style={styles.input}
        />

        <div style={{ height: 20 }} />

        <h3 style={{ marginTop: 0 }}>Categorías</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            style={
              categoriaNuevaOrden === "TODOS"
                ? styles.ventasTabActive
                : styles.ventasTab
            }
            onClick={() => setCategoriaNuevaOrden("TODOS")}
          >
            Más vendidos
          </button>

          {[...new Set(productosActivos.map((p) => p.categoria).filter(Boolean))].map(
            (categoria) => (
              <button
                key={categoria}
                type="button"
                style={
                  categoriaNuevaOrden === categoria
                    ? styles.ventasTabActive
                    : styles.ventasTab
                }
                onClick={() => setCategoriaNuevaOrden(categoria)}
              >
                {categoria}
              </button>
            )
          )}
        </div>
      </div>

      <div style={styles.box}>
        <p
          style={{
            textAlign: "center",
            fontSize: "18px",
            color: "#111827",
            marginTop: 0,
          }}
        >
          Configura la compra, da click en los productos para seleccionarlos o escanéa el código de barras
        </p>

        <div
          style={{
            border: "2px solid #2f3ddb",
            borderRadius: 14,
            padding: 16,
            marginBottom: 20,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div>
            <label style={styles.label}>Local</label>
            <select
              value={localNuevaOrden}
              onChange={(e) => setLocalNuevaOrden(e.target.value)}
              style={styles.input}
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
              style={styles.input}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
          }}
        >
          {productosActivos
            .filter((p) => {
              const coincideTexto = String(p.nombre || "")
                .toLowerCase()
                .includes(busquedaProductoNuevaOrden.toLowerCase());

              const coincideCategoria =
                categoriaNuevaOrden === "TODOS" ||
                !categoriaNuevaOrden ||
                String(p.categoria || "") === categoriaNuevaOrden;

              return coincideTexto && coincideCategoria;
            })
            .map((producto) => (
              <div
                key={producto.id}
                style={{
                  borderRadius: 16,
                  background: "#fff",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", gap: 14 }}>
                 <div
  style={{
    width: 110,
    height: 90,
    borderRadius: 14,
    background: "#eee",
    overflow: "hidden",
  }}
>
  <img
    src={
      producto.imagen ||
      "https://cdn-icons-png.flaticon.com/512/1046/1046784.png"
    }
    alt=""
    style={{
      width: "100%",
      height: "100%",
      objectFit: "cover",
    }}
  />
</div>

                  <div style={{ flex: 1 }}>
                    <strong style={{ display: "block", marginBottom: 6 }}>
                      {producto.nombre}
                    </strong>
                    <div style={{ marginBottom: 6 }}>
                      Costo: {formatearMoneda(producto.precio)}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        padding: "6px 10px",
                        borderRadius: 999,
                        background:
                          Number(producto.stock || 0) > 3 ? "#d1fae5" : "#fee2e2",
                        color:
                          Number(producto.stock || 0) > 3 ? "#065f46" : "#991b1b",
                        fontWeight: "bold",
                        fontSize: "13px",
                      }}
                    >
                      Stock: {Number(producto.stock || 0)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  style={styles.button}
                  onClick={() => {
                    const existe = ventaForm.items.find(
                      (i) => Number(i.producto_id) === Number(producto.id)
                    );

                    if (existe) {
                      setVentaForm({
                        ...ventaForm,
                        items: ventaForm.items.map((i) =>
                          Number(i.producto_id) === Number(producto.id)
                            ? { ...i, cantidad: Number(i.cantidad || 0) + 1 }
                            : i
                        ),
                      });
                    } else {
                      setVentaForm({
                        ...ventaForm,
                        items: [
                          ...ventaForm.items,
                          { producto_id: producto.id, cantidad: 1 },
                        ],
                      });
                    }
                  }}
                >
                  Agregar producto
                </button>
              </div>
            ))}
        </div>

        <div style={{ height: 20 }} />

        <div style={styles.box}>
          <h3 style={{ marginTop: 0 }}>Resumen de orden</h3>

          {ventaItemsCalculados.length === 0 ? (
            <p>No hay productos agregados.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ventaItemsCalculados.map((item, index) => (
                <div key={index} style={styles.itemVentaCard}>
                  <div style={styles.itemVentaResumen}>
                    <span>{item.nombre || "Producto"}</span>
                    <span>Cant: {item.cantidad}</span>
                    <span>Total: {formatearMoneda(item.total)}</span>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      style={styles.outlineButton}
                      onClick={() =>
                        actualizarItemVenta(index, "cantidad", Math.max(1, Number(item.cantidad || 1) - 1))
                      }
                    >
                      -
                    </button>

                    <button
                      type="button"
                      style={styles.outlineButton}
                      onClick={() =>
                        actualizarItemVenta(index, "cantidad", Number(item.cantidad || 0) + 1)
                      }
                    >
                      +
                    </button>

                    <button
                      type="button"
                      style={styles.smallDangerButton}
                      onClick={() => eliminarItemVenta(index)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ height: 16 }} />

          <select
            value={ventaForm.metodo_pago}
            onChange={(e) =>
              setVentaForm({ ...ventaForm, metodo_pago: e.target.value })
            }
            style={styles.input}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="RECARGA">Recarga</option>
          </select>

          <div style={{ height: 12 }} />

          <input
            type="text"
            placeholder="Observación"
            value={ventaForm.observacion}
            onChange={(e) =>
              setVentaForm({ ...ventaForm, observacion: e.target.value })
            }
            style={styles.input}
          />

          {ventaForm.metodo_pago === "RECARGA" && alumnoVentaSeleccionado && (
            <div style={styles.infoBox}>
              <strong>Saldo disponible:</strong>{" "}
              {formatearMoneda(alumnoVentaSeleccionado.saldo)}
            </div>
          )}

          <div style={{ height: 12 }} />

          <div style={styles.totalVentaBox}>
            Total venta: {formatearMoneda(totalVentaCalculado)}
          </div>

          <div style={styles.filterButtons}>
            <button type="submit" style={styles.button} onClick={crearVenta}>
              Generar venta
            </button>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={() =>
                setVentaForm({
                  alumno_id: "",
                  metodo_pago: "EFECTIVO",
                  observacion: "",
                  items: [{ producto_id: "", cantidad: 1 }],
                })
              }
            >
              Cancelar orden
            </button>
          </div>
        </div>
      </div>
    </div>
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

        {vista === "cuenta" && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.dashboardTitle}>Cuenta Institución</h1>
                <p style={styles.dashboardSubtitle}>
                  Selecciona la institución y cambia el acceso del cliente
                </p>
              </div>
            </div>

            <div style={styles.accountLayout}>
              <div style={styles.box}>
                <h3>Institución activa</h3>

                <div style={styles.form}>
                  <label style={styles.label}>Institución</label>
                  <select
                    value={institucionSeleccionadaId || ""}
                    onChange={(e) => {
                      const nuevoId = normalizarInstitucionId(e.target.value);
                      setInstitucionSeleccionadaId(nuevoId);
                      if (nuevoId) {
                        localStorage.setItem("institucionSeleccionadaId", String(nuevoId));
                      } else {
                        localStorage.removeItem("institucionSeleccionadaId");
                      }
                    }}
                    style={styles.input}
                  >
                    <option value="">Seleccione una institución</option>
                    {INSTITUCIONES.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.nombre}
                      </option>
                    ))}
                  </select>

                  <div style={styles.infoBox}>
                    <strong>Institución actual:</strong>{" "}
                    {institucionActiva?.nombre || "Sin seleccionar"}
                  </div>
                </div>
              </div>

              <div style={styles.box}>
                <h3>Acceso del cliente</h3>

                <form onSubmit={guardarCuentaInstitucion} style={styles.form}>
                  <label style={styles.label}>Correo</label>
                  <input
                    type="email"
                    placeholder="Correo"
                    value={cuentaForm.correo}
                    onChange={(e) =>
                      setCuentaForm({ ...cuentaForm, correo: e.target.value })
                    }
                    style={styles.input}
                    required
                  />

                  <label style={styles.label}>Contraseña actual</label>
                  <input
                    type="password"
                    placeholder="Contraseña actual"
                    value={cuentaForm.password_actual}
                    onChange={(e) =>
                      setCuentaForm({
                        ...cuentaForm,
                        password_actual: e.target.value,
                      })
                    }
                    style={styles.input}
                  />

                  <label style={styles.label}>Nueva contraseña</label>
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={cuentaForm.nueva_password}
                    onChange={(e) =>
                      setCuentaForm({
                        ...cuentaForm,
                        nueva_password: e.target.value,
                      })
                    }
                    style={styles.input}
                  />

                  <label style={styles.label}>Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    value={cuentaForm.confirmar_password}
                    onChange={(e) =>
                      setCuentaForm({
                        ...cuentaForm,
                        confirmar_password: e.target.value,
                      })
                    }
                    style={styles.input}
                  />

                  <button type="submit" style={styles.button} disabled={guardandoCuenta}>
                    {guardandoCuenta ? "Guardando..." : "Guardar cambios"}
                  </button>
                </form>
              </div>
            </div>

            <div style={{ height: 20 }} />

            <div style={styles.box}>
              <h3>Instituciones definidas</h3>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Nombre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INSTITUCIONES.map((inst) => (
                      <tr key={inst.id}>
                        <td style={styles.td}>{inst.id}</td>
                        <td style={styles.td}>{inst.nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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