import { useEffect, useMemo, useState } from "react";

const API_URL = "https://pos-nube-backend.onrender.com";

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

  const [productos, setProductos] = useState([]);
  const [productoForm, setProductoForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    stock: "",
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
  const [filtroAlumnos, setFiltroAlumnos] = useState("activos");

  const getAuthData = () => {
    const token = localStorage.getItem("token");
    const usuarioGuardado = JSON.parse(localStorage.getItem("usuario") || "null");
    return { token, usuarioGuardado };
  };

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
      const { token, usuarioGuardado } = getAuthData();

      if (!token || !usuarioGuardado?.institucion_id) return;

      const res = await fetch(
        `${API_URL}/api/reportes/ventas-resumen?institucion_id=${usuarioGuardado.institucion_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setResumen(data);
      }
    } catch (error) {
      console.error("Error cargando resumen:", error);
    }
  };

  const cargarProductos = async () => {
    try {
      const { token, usuarioGuardado } = getAuthData();

      if (!token || !usuarioGuardado?.institucion_id) return;

      const res = await fetch(
        `${API_URL}/api/productos?institucion_id=${usuarioGuardado.institucion_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setProductos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  const crearProducto = async (e) => {
    e.preventDefault();

    try {
      const { token, usuarioGuardado } = getAuthData();

      if (!token || !usuarioGuardado?.institucion_id) {
        alert("Sesión no válida");
        return;
      }

      const res = await fetch(`${API_URL}/api/productos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          institucion_id: usuarioGuardado.institucion_id,
          nombre: productoForm.nombre,
          descripcion: productoForm.descripcion,
          precio: Number(productoForm.precio || 0),
          stock: Number(productoForm.stock || 0),
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
        categoria: "",
      });

      await cargarProductos();
      alert("Producto creado correctamente");
    } catch (error) {
      console.error("Error creando producto:", error);
      alert("No se pudo crear el producto");
    }
  };

  const cargarAlumnos = async () => {
    try {
      const { token, usuarioGuardado } = getAuthData();

      if (!token || !usuarioGuardado?.institucion_id) return;

      const res = await fetch(
        `${API_URL}/api/alumnos?institucion_id=${usuarioGuardado.institucion_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (res.ok) {
        setAlumnos(Array.isArray(data) ? data : []);
      } else {
        console.error("Respuesta alumnos:", data);
      }
    } catch (error) {
      console.error("Error cargando alumnos:", error);
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
      const { token, usuarioGuardado } = getAuthData();

      if (!token || !usuarioGuardado?.institucion_id) {
        alert("Sesión no válida");
        return;
      }

      const payload = {
        institucion_id: usuarioGuardado.institucion_id,
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
      setFiltroAlumnos("activos");
      alert("Alumno creado correctamente");
    } catch (error) {
      console.error("Error creando alumno:", error);
      alert("No se pudo crear el alumno");
    }
  };

  const actualizarAlumno = async (e) => {
    e.preventDefault();

    try {
      const { token, usuarioGuardado } = getAuthData();

      if (!token || !usuarioGuardado?.institucion_id || !editandoAlumnoId) {
        alert("No se puede actualizar el alumno");
        return;
      }

      const payload = {
        institucion_id: usuarioGuardado.institucion_id,
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
      const { token } = getAuthData();

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
      setFiltroAlumnos("activos");
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
      const { token, usuarioGuardado } = getAuthData();

      if (!token || !usuarioGuardado?.institucion_id) {
        alert("Sesión no válida");
        return;
      }

      const payload = {
        institucion_id: usuarioGuardado.institucion_id,
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
      setFiltroAlumnos("activos");
      alert("Alumno restaurado correctamente");
    } catch (error) {
      console.error("Error restaurando alumno:", error);
      alert("No se pudo restaurar el alumno");
    }
  };

  useEffect(() => {
    if (usuario) {
      cargarResumen();
      cargarProductos();
    }
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;

    if (vista === "productos") {
      cargarProductos();
    }

    if (vista === "alumnos") {
      cargarAlumnos();
    }
  }, [vista, usuario]);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    setUsuario(null);
    setResumen(null);
    setProductos([]);
    setAlumnos([]);
    setCorreo("");
    setPassword("");
    setMensaje("");
    setVista("dashboard");
    limpiarFormularioAlumno();
  };

  if (!usuario) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
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
    <div style={styles.dashboardPage}>
      <aside style={styles.sidebar}>
        <h2 style={styles.logo}>POS NUBE</h2>

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

        <button style={styles.menuButtonDisabled}>Inventario</button>
        <button style={styles.menuButtonDisabled}>Recargas</button>
        <button style={styles.menuButtonDisabled}>Ventas</button>
        <button style={styles.menuButtonDisabled}>Reportes</button>

        <button onClick={cerrarSesion} style={styles.logoutButton}>
          Cerrar sesión
        </button>
      </aside>

      <main style={styles.main}>
        {vista === "dashboard" && (
          <>
            <h1 style={styles.dashboardTitle}>Bienvenido, {usuario.nombre}</h1>
            <p style={styles.dashboardSubtitle}>Resumen general del sistema</p>

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
            <div style={styles.sectionHeader}>
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

            <div style={styles.productsLayout}>
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
                    placeholder="Stock"
                    value={productoForm.stock}
                    onChange={(e) =>
                      setProductoForm({ ...productoForm, stock: e.target.value })
                    }
                    style={styles.input}
                    required
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
                          <th style={styles.th}>Categoría</th>
                          <th style={styles.th}>Activo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.map((p) => (
                          <tr key={p.id}>
                            <td style={styles.td}>{p.nombre}</td>
                            <td style={styles.td}>${p.precio}</td>
                            <td style={styles.td}>{p.stock}</td>
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
            <div style={styles.sectionHeader}>
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
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                  <option value="todos">Todos</option>
                </select>

                <button style={styles.refreshButton} onClick={cargarAlumnos}>
                  Refrescar
                </button>
              </div>
            </div>

            <div style={styles.productsLayout}>
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
                                  title="Editar alumno"
                                  disabled={!activo}
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
                                  title="Eliminar alumno"
                                  disabled={!activo}
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
                                  title="Restaurar alumno"
                                  disabled={activo}
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
    background: "#f4f6fb",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    padding: "32px",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
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
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  input: {
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "16px",
  },
  select: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "14px",
    background: "#fff",
    minWidth: "140px",
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
  message: {
    marginTop: "16px",
    textAlign: "center",
  },
  dashboardPage: {
    minHeight: "100vh",
    display: "flex",
    fontFamily: "Arial, sans-serif",
    background: "#f3f4f6",
  },
  sidebar: {
    width: "240px",
    background: "#1e3a8a",
    color: "#fff",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  logo: {
    margin: 0,
    marginBottom: "16px",
  },
  menuButton: {
    background: "transparent",
    color: "#fff",
    border: "none",
    textAlign: "left",
    padding: "12px 10px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
  },
  menuButtonActive: {
    background: "#3b82f6",
    color: "#fff",
    border: "2px solid #93c5fd",
    textAlign: "left",
    padding: "12px 10px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "15px",
  },
  menuButtonDisabled: {
    background: "transparent",
    color: "#cbd5e1",
    border: "none",
    textAlign: "left",
    padding: "12px 10px",
    borderRadius: "10px",
    fontSize: "15px",
  },
  logoutButton: {
    marginTop: "auto",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "#dc2626",
    color: "#fff",
    fontSize: "16px",
    cursor: "pointer",
  },
  main: {
    flex: 1,
    padding: "32px",
  },
  dashboardTitle: {
    marginTop: 0,
    color: "#111827",
  },
  dashboardSubtitle: {
    color: "#6b7280",
    marginBottom: "24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
  },
  box: {
    background: "#fff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  refreshButton: {
    padding: "12px 18px",
    borderRadius: "10px",
    border: "none",
    background: "#0f766e",
    color: "#fff",
    cursor: "pointer",
  },
  productsLayout: {
    display: "grid",
    gridTemplateColumns: "380px 1fr",
    gap: "20px",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
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
  filterLabel: {
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: "normal",
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