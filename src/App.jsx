import { useEffect, useMemo, useState } from "react";

const API_URL = "https://pos-nube-backend.onrender.com";

const INSTITUCIONES = [
  { id: 1, nombre: "Colegio Marista" },
  { id: 2, nombre: "Colegio Pensionado Universitario" },
  { id: 3, nombre: "FEUE" },
  { id: 4, nombre: "Club Los Cipreses" },
];

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
    const guardada = localStorage.getItem("institucionSeleccionadaId");
    return guardada ? Number(guardada) : null;
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

  const [cuentaForm, setCuentaForm] = useState({
    correo: "",
    password_actual: "",
    nueva_password: "",
    confirmar_password: "",
  });
  const [guardandoCuenta, setGuardandoCuenta] = useState(false);

  const getAuthData = () => {
    const token = localStorage.getItem("token");
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario") || "null");
    return { token, usuarioGuardado };
  };

  const obtenerInstitucionActivaId = () => {
    if (institucionSeleccionadaId) return Number(institucionSeleccionadaId);
    const { usuarioGuardado } = getAuthData();
    return usuarioGuardado?.institucion_id ? Number(usuarioGuardado.institucion_id) : null;
  };

  const institucionActivaId = obtenerInstitucionActivaId();

  const institucionActiva = useMemo(() => {
    return (
      INSTITUCIONES.find((i) => Number(i.id) === Number(institucionActivaId)) || null
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

  const alumnosFiltrados = useMemo(() => {
    if (filtroAlumnos === "todos") return alumnos;
    if (filtroAlumnos === "inactivos") {
      return alumnos.filter((a) => a.activo === false);
    }
    return alumnos.filter((a) => a.activo !== false);
  }, [alumnos, filtroAlumnos]);

  const productosInventario = useMemo(() => {
    const texto = inventarioBusqueda.trim().toLowerCase();
    let lista = [...productos];

    if (texto) {
      lista = lista.filter((p) => {
        const nombre = (p.nombre || "").toLowerCase();
        const categoria = (p.categoria || "").toLowerCase();
        return nombre.includes(texto) || categoria.includes(texto);
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
    const totalProductos = productos.length;

    const agotados = productos.filter((p) => Number(p.stock || 0) <= 0).length;

    const bajos = productos.filter((p) => {
      const stock = Number(p.stock || 0);
      const stockMinimo = Number(p.stock_minimo || 0);
      return stock > 0 && stock <= stockMinimo;
    }).length;

    const valorInventario = productos.reduce((acc, p) => {
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
  }, [productos]);

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

      if (!localStorage.getItem("institucionSeleccionadaId")) {
        const institucionIdLogin = Number(data.usuario?.institucion_id || 0);
        if (institucionIdLogin) {
          localStorage.setItem("institucionSeleccionadaId", String(institucionIdLogin));
          setInstitucionSeleccionadaId(institucionIdLogin);
        }
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
          institucion_id: institucionId,
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

      setProductoForm({
        nombre: "",
        descripcion: "",
        precio: "",
        stock: "",
        stock_minimo: "",
        categoria: "",
      });

      await cargarProductos();
      alert("Producto creado correctamente");
    } catch (error) {
      console.error("Error creando producto:", error);
      alert("No se pudo crear el producto");
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

      setInventarioForm({
        producto_id: "",
        tipo: "ENTRADA",
        cantidad: "",
        motivo: "",
      });

      await cargarProductos();
      alert("Inventario actualizado correctamente");
    } catch (error) {
      console.error("Error actualizando inventario:", error);
      alert("No se pudo actualizar el inventario");
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
        institucion_id: institucionId,
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
        institucion_id: institucionId,
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
        institucion_id: institucionId,
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
    if (usuario && !institucionSeleccionadaId && usuario.institucion_id) {
      const id = Number(usuario.institucion_id);
      setInstitucionSeleccionadaId(id);
      localStorage.setItem("institucionSeleccionadaId", String(id));
    }
  }, [usuario, institucionSeleccionadaId]);

  useEffect(() => {
    if (usuario) {
      cargarResumen();
      cargarProductos();
      cargarAlumnos();
    }
  }, [usuario, institucionSeleccionadaId]);

  useEffect(() => {
    if (!usuario) return;

    if (vista === "productos" || vista === "inventario") {
      cargarProductos();
    }

    if (vista === "alumnos") {
      cargarAlumnos();
    }

    if (vista === "dashboard") {
      cargarResumen();
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
    setCorreo("");
    setPassword("");
    setMensaje("");
    setVista("dashboard");
    setInstitucionSeleccionadaId(null);
    limpiarFormularioAlumno();
  };

  if (!usuario) {
    return (
      <div style={styles.page}>
        <div style={styles.loginCard}>
          <h1 style={styles.title}>POS NUBE</h1>
          <p style={styles.subtitle}>Iniciar sesión</p>

          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="Correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              style={styles.input}
              required
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />

            <button type="submit" style={styles.button} disabled={cargando}>
              {cargando ? "Ingresando..." : "Ingresar"}
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
            style={vista === "productos" ? styles.menuButtonActive : styles.menuButton}
            onClick={() => setVista("productos")}
          >
            Productos
          </button>

          <button
            style={vista === "alumnos" ? styles.menuButtonActive : styles.menuButton}
            onClick={() => setVista("alumnos")}
          >
            Alumnos
          </button>

          <button
            style={vista === "inventario" ? styles.menuButtonActive : styles.menuButton}
            onClick={() => setVista("inventario")}
          >
            Inventario
          </button>

          <button style={styles.menuButtonDisabled}>Recargas</button>
          <button style={styles.menuButtonDisabled}>Ventas</button>
          <button style={styles.menuButtonDisabled}>Reportes</button>

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
                <h1 style={styles.dashboardTitle}>Bienvenido, {usuario.nombre}</h1>
                <p style={styles.dashboardSubtitle}>Resumen general del sistema</p>
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

        {vista === "productos" && (
          <>
            <div style={styles.pageHeader}>
              <div>
                <h1 style={styles.dashboardTitle}>Productos</h1>
                <p style={styles.dashboardSubtitle}>
                  Crear y visualizar productos de la institución
                </p>
              </div>

              <button style={styles.refreshButton} onClick={cargarProductos}>
                Refrescar
              </button>
            </div>

            <div style={styles.twoColumn}>
              <div style={styles.box}>
                <h3>Nuevo producto</h3>

                <form onSubmit={crearProducto} style={styles.form}>
                  <input
                    type="text"
                    placeholder="Nombre"
                    value={productoForm.nombre}
                    onChange={(e) =>
                      setProductoForm({ ...productoForm, nombre: e.target.value })
                    }
                    style={styles.input}
                    required
                  />

                  <input
                    type="text"
                    placeholder="Descripción"
                    value={productoForm.descripcion}
                    onChange={(e) =>
                      setProductoForm({
                        ...productoForm,
                        descripcion: e.target.value,
                      })
                    }
                    style={styles.input}
                  />

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio"
                    value={productoForm.precio}
                    onChange={(e) =>
                      setProductoForm({ ...productoForm, precio: e.target.value })
                    }
                    style={styles.input}
                    required
                  />

                  <input
                    type="number"
                    placeholder="Stock inicial"
                    value={productoForm.stock}
                    onChange={(e) =>
                      setProductoForm({ ...productoForm, stock: e.target.value })
                    }
                    style={styles.input}
                    required
                  />

                  <input
                    type="number"
                    placeholder="Stock mínimo"
                    value={productoForm.stock_minimo}
                    onChange={(e) =>
                      setProductoForm({
                        ...productoForm,
                        stock_minimo: e.target.value,
                      })
                    }
                    style={styles.input}
                  />

                  <input
                    type="text"
                    placeholder="Categoría"
                    value={productoForm.categoria}
                    onChange={(e) =>
                      setProductoForm({ ...productoForm, categoria: e.target.value })
                    }
                    style={styles.input}
                  />

                  <button type="submit" style={styles.button}>
                    Guardar producto
                  </button>
                </form>
              </div>

              <div style={styles.box}>
                <h3>Lista de productos</h3>

                {productos.length === 0 ? (
                  <p>No hay productos registrados.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Nombre</th>
                          <th style={styles.th}>Precio</th>
                          <th style={styles.th}>Stock</th>
                          <th style={styles.th}>Stock mínimo</th>
                          <th style={styles.th}>Categoría</th>
                          <th style={styles.th}>Activo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((p) => (
                          <tr key={p.id}>
                            <td style={styles.td}>{p.nombre}</td>
                            <td style={styles.td}>${Number(p.precio || 0).toFixed(2)}</td>
                            <td style={styles.td}>{Number(p.stock || 0)}</td>
                            <td style={styles.td}>{Number(p.stock_minimo || 0)}</td>
                            <td style={styles.td}>{p.categoria || "-"}</td>
                            <td style={styles.td}>{p.activo ? "Sí" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                              <td style={styles.td}>${Number(a.saldo || 0).toFixed(2)}</td>
                              <td style={styles.td}>
                                <span
                                  style={
                                    activo ? styles.badgeActive : styles.badgeInactive
                                  }
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
                <h1 style={styles.dashboardTitle}>Inventario</h1>
                <p style={styles.dashboardSubtitle}>
                  Control diario de stock de productos
                </p>
              </div>

              <button style={styles.refreshButton} onClick={cargarProductos}>
                Refrescar
              </button>
            </div>

            <div style={styles.grid}>
              <div style={styles.box}>
                <h3>Total productos</h3>
                <p>{inventarioResumen.totalProductos}</p>
              </div>

              <div style={styles.box}>
                <h3>Stock bajo</h3>
                <p>{inventarioResumen.bajos}</p>
              </div>

              <div style={styles.box}>
                <h3>Agotados</h3>
                <p>{inventarioResumen.agotados}</p>
              </div>

              <div style={styles.box}>
                <h3>Valor inventario</h3>
                <p>${inventarioResumen.valorInventario.toFixed(2)}</p>
              </div>
            </div>

            <div style={{ height: 20 }} />

            <div style={styles.twoColumn}>
              <div style={styles.box}>
                <h3>Movimiento de inventario</h3>

                <form onSubmit={aplicarMovimientoInventario} style={styles.form}>
                  <select
                    value={inventarioForm.producto_id}
                    onChange={(e) =>
                      setInventarioForm({
                        ...inventarioForm,
                        producto_id: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  >
                    <option value="">Seleccione un producto</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>

                  <select
                    value={inventarioForm.tipo}
                    onChange={(e) =>
                      setInventarioForm({
                        ...inventarioForm,
                        tipo: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SALIDA">Salida</option>
                    <option value="AJUSTE">Ajuste</option>
                  </select>

                  <input
                    type="number"
                    placeholder={
                      inventarioForm.tipo === "AJUSTE"
                        ? "Nuevo stock total"
                        : "Cantidad"
                    }
                    value={inventarioForm.cantidad}
                    onChange={(e) =>
                      setInventarioForm({
                        ...inventarioForm,
                        cantidad: e.target.value,
                      })
                    }
                    style={styles.input}
                    required
                  />

                  <input
                    type="text"
                    placeholder="Motivo"
                    value={inventarioForm.motivo}
                    onChange={(e) =>
                      setInventarioForm({
                        ...inventarioForm,
                        motivo: e.target.value,
                      })
                    }
                    style={styles.input}
                  />

                  <button type="submit" style={styles.button}>
                    Aplicar movimiento
                  </button>
                </form>
              </div>

              <div style={styles.box}>
                <div style={styles.pageHeaderSmall}>
                  <div>
                    <h3 style={{ margin: 0 }}>Stock actual</h3>
                  </div>

                  <div style={styles.headerActions}>
                    <input
                      type="text"
                      placeholder="Buscar producto"
                      value={inventarioBusqueda}
                      onChange={(e) => setInventarioBusqueda(e.target.value)}
                      style={styles.searchInput}
                    />

                    <select
                      value={inventarioFiltro}
                      onChange={(e) => setInventarioFiltro(e.target.value)}
                      style={styles.select}
                    >
                      <option value="todos">Todos</option>
                      <option value="normal">Normal</option>
                      <option value="bajo">Stock bajo</option>
                      <option value="agotado">Agotado</option>
                    </select>
                  </div>
                </div>

                {productosInventario.length === 0 ? (
                  <p>No hay productos para este filtro.</p>
                ) : (
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Producto</th>
                          <th style={styles.th}>Categoría</th>
                          <th style={styles.th}>Precio</th>
                          <th style={styles.th}>Stock</th>
                          <th style={styles.th}>Stock mínimo</th>
                          <th style={styles.th}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productosInventario.map((p) => {
                          const estado = obtenerEstadoStock(p);

                          return (
                            <tr key={p.id}>
                              <td style={styles.td}>{p.nombre}</td>
                              <td style={styles.td}>{p.categoria || "-"}</td>
                              <td style={styles.td}>
                                ${Number(p.precio || 0).toFixed(2)}
                              </td>
                              <td style={styles.td}>{Number(p.stock || 0)}</td>
                              <td style={styles.td}>{Number(p.stock_minimo || 0)}</td>
                              <td style={styles.td}>
                                <span style={estado.estilo}>{estado.texto}</span>
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
                      const nuevoId = Number(e.target.value);
                      setInstitucionSeleccionadaId(nuevoId);
                      localStorage.setItem("institucionSeleccionadaId", String(nuevoId));
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
  menuButtonDisabled: {
    width: "100%",
    background: "transparent",
    color: "#cbd5e1",
    border: "none",
    textAlign: "left",
    padding: "13px 12px",
    borderRadius: "12px",
    fontSize: "17px",
    marginBottom: "8px",
    opacity: 0.9,
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
  twoColumn: {
    display: "grid",
    gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
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
    minWidth: "720px",
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
};