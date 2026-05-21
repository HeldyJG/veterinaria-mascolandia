-- ============================================================
-- veterinaria.sql convertido a PostgreSQL
-- ============================================================

-- Limpiar tablas si existen (en orden inverso por FK)
DROP TABLE IF EXISTS ventas_detalle CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS baños_detalle_productos CASCADE;
DROP TABLE IF EXISTS baños CASCADE;
DROP TABLE IF EXISTS baño_stock CASCADE;
DROP TABLE IF EXISTS examenes_laboratorio CASCADE;
DROP TABLE IF EXISTS historial_clinico CASCADE;
DROP TABLE IF EXISTS citas CASCADE;
DROP TABLE IF EXISTS mascotas CASCADE;
DROP TABLE IF EXISTS razas CASCADE;
DROP TABLE IF EXISTS especies CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS perfil_opcion CASCADE;
DROP TABLE IF EXISTS opciones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS perfiles CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias_productos CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;

-- --------------------------------------------------------
-- baños
-- --------------------------------------------------------
CREATE TABLE baños (
    id BIGSERIAL PRIMARY KEY,
    id_mascota BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,
    id_cita BIGINT DEFAULT NULL,
    fecha DATE NOT NULL,
    tipo_servicio VARCHAR(100) DEFAULT NULL,
    observaciones TEXT DEFAULT NULL,
    peso_mascota DECIMAL(10,2) DEFAULT NULL,
    precio DECIMAL(10,2) DEFAULT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','EN_PROCESO','FINALIZADO','ENTREGADO')),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ml_acondicionador DECIMAL(10,2) DEFAULT NULL,
    ml_shampoo DECIMAL(10,2) DEFAULT NULL,
    tamano_perro VARCHAR(20) DEFAULT NULL
);

INSERT INTO baños (id, id_mascota, id_usuario, id_cita, fecha, tipo_servicio, observaciones, peso_mascota, precio, estado, fecha_registro, ml_acondicionador, ml_shampoo, tamano_perro) VALUES
(1, 1, 3, NULL, '2026-03-18', 'Higiene Completa', NULL, NULL, 100.00, 'FINALIZADO', '2026-03-18 23:09:23', 100.00, 100.00, 'GRANDE');

-- --------------------------------------------------------
-- baños_detalle_productos
-- --------------------------------------------------------
CREATE TABLE baños_detalle_productos (
    id BIGSERIAL PRIMARY KEY,
    id_baño BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    cantidad_ml DECIMAL(10,2) NOT NULL
);

-- --------------------------------------------------------
-- baño_stock
-- --------------------------------------------------------
CREATE TABLE baño_stock (
    id BIGSERIAL PRIMARY KEY,
    acondicionador_actual DECIMAL(10,2) DEFAULT NULL,
    acondicionador_max DECIMAL(10,2) DEFAULT NULL,
    shampoo_actual DECIMAL(10,2) DEFAULT NULL,
    shampoo_max DECIMAL(10,2) DEFAULT NULL
);

INSERT INTO baño_stock (id, acondicionador_actual, acondicionador_max, shampoo_actual, shampoo_max) VALUES
(1, 3685.41, 3785.41, 3685.41, 3785.41);

-- --------------------------------------------------------
-- categorias_productos
-- --------------------------------------------------------
CREATE TABLE categorias_productos (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) DEFAULT NULL,
    estado INT NOT NULL DEFAULT 1
);

INSERT INTO categorias_productos (id, nombre, descripcion, estado) VALUES (1, 'Limpieza', NULL, 1);

-- --------------------------------------------------------
-- perfiles
-- --------------------------------------------------------
CREATE TABLE perfiles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255) DEFAULT NULL,
    estado SMALLINT NOT NULL DEFAULT 1
);

INSERT INTO perfiles (id, nombre, descripcion, estado) VALUES
(1, 'Administrador', 'Acceso total al sistema.', 1),
(2, 'Veterinaria', 'Puede gestionar usuarios pero no perfiles.', 1),
(3, 'Supervisor', 'Solo puede visualizar información.', 1);

-- --------------------------------------------------------
-- usuarios
-- --------------------------------------------------------
CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    clave VARCHAR(255) NOT NULL,
    correo VARCHAR(255) DEFAULT NULL UNIQUE,
    estado INT NOT NULL,
    id_perfil BIGINT NOT NULL
);

INSERT INTO usuarios (id, nombre, usuario, clave, correo, estado, id_perfil) VALUES
(1, 'Daryl', 'admin', '$2a$10$OZuN1MJlw/01gIodlwqaQOKk.d5XhfbWAD8X2adyG9pkKtpDlVN1O', 'luis@ejemplo.com', 1, 1),
(2, 'María Supervisor', 'supervisor', '$2a$10$N9qo8uLOickgx2ZMRZoMye5aZl8ZzO8Fns2h0eCZgP2h7ZWCpU9/y', 'supervisor@ejemplo.com', 1, 3),
(3, 'Carlos Analista', 'analista', '$2a$10$N9qo8uLOickgx2ZMRZoMye5aZl8ZzO8Fns2h0eCZgP2h7ZWCpU9/y', 'analista@ejemplo.com', 1, 2),
(4, 'Luis Antonio', 'luis', '$2a$10$bDRnfg7TQgcBeV.e0cd.ZuNfDUGfPRPhp62tfLVtycqwV/unM0VWm', 'luis5@ejemplo.com', 1, 1),
(5, 'Blanca Rosa', 'blanca', '$2a$10$UTJNtLoen3wHnh1WMF756uBNJo9Gm4Hlmm8XuiFTOrJy5wdnt1d3C', 'blanca@ejemplo.com', 1, 2),
(6, 'Josue', 'vet1', '$2a$10$S5gsxSb/SS63bXXYY4CLOOoDvKaEF4Nu6bLBsCMtjVS2/LDX6l3e6', 'josue.gonzales2205@gmail.com', 1, 2);

-- --------------------------------------------------------
-- clientes
-- --------------------------------------------------------
CREATE TABLE clientes (
    id BIGSERIAL PRIMARY KEY,
    dni VARCHAR(15) DEFAULT NULL UNIQUE,
    nombre_completo VARCHAR(150) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(100) DEFAULT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado INT NOT NULL
);

INSERT INTO clientes (id, dni, nombre_completo, direccion, telefono, correo, fecha_registro, estado) VALUES
(1, '77476589', 'Josue Gonzales Gonzales', 'Los Marinos Manzana 5', '981296974', 'josue.gonzales2205@gmail.com', '2025-12-19 18:13:55', 1),
(2, '789465', 'Yessi', 'S/N', '9121100709', NULL, '2026-03-06 22:25:26', 1),
(11, '776589', 'Yamilet Cornejo', 'S/N', '907471888', NULL, '2026-03-07 04:34:17', 1),
(12, '7894561', 'Victoria Gonzales Azabache', 'Santa Rosa #789', '987654321', 'victoria20@gmail.com', '2026-03-17 23:27:25', 1),
(13, '7984651', 'Ana Lopez', 'Monsefu # 321', '986547321', 'ana20@gmail.com', '2026-03-18 00:04:59', 1);

-- --------------------------------------------------------
-- especies
-- --------------------------------------------------------
CREATE TABLE especies (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    estado INT NOT NULL
);

INSERT INTO especies (id, nombre, estado) VALUES (1, 'Canino', 1), (2, 'Gato', 1);

-- --------------------------------------------------------
-- razas
-- --------------------------------------------------------
CREATE TABLE razas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    id_especie BIGINT NOT NULL,
    estado INT NOT NULL
);

INSERT INTO razas (id, nombre, id_especie, estado) VALUES
(1, 'Pitbull', 1, 1),
(2, 'Chisu', 1, 1),
(3, 'Chusco', 1, 1),
(4, 'Pastor Aleman', 1, 1),
(5, 'Siamés', 2, 1);

-- --------------------------------------------------------
-- mascotas
-- --------------------------------------------------------
CREATE TABLE mascotas (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    id_cliente BIGINT NOT NULL,
    id_raza BIGINT NOT NULL,
    sexo VARCHAR(20) DEFAULT NULL,
    fecha_nacimiento DATE DEFAULT NULL,
    peso_actual DECIMAL(10,2) DEFAULT NULL,
    color VARCHAR(50) DEFAULT NULL,
    foto VARCHAR(255) DEFAULT NULL,
    estado INT NOT NULL
);

INSERT INTO mascotas (id, nombre, id_cliente, id_raza, sexo, fecha_nacimiento, peso_actual, color, foto, estado) VALUES
(1, 'Kira', 1, 1, 'Hembra', '2024-11-06', 20.00, 'Negro con Blanco', NULL, 1),
(2, 'Dogo', 2, 2, 'Macho', '2026-03-03', 10.00, 'Negro', NULL, 1),
(3, 'Dogo', 1, 1, 'Hembra', '2026-03-02', 10.00, 'blanco', NULL, 1),
(4, 'Pluto', 11, 3, 'Macho', '2026-03-02', 12.00, 'blanco', NULL, 1),
(5, 'Rex', 12, 4, 'Macho', '2026-02-01', 10.00, 'Marrón con Negro', NULL, 1),
(6, 'Misha', 13, 5, 'Hembra', '2025-05-11', 10.00, 'Beige con marrón', NULL, 1);

-- --------------------------------------------------------
-- servicios
-- --------------------------------------------------------
CREATE TABLE servicios (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado INT NOT NULL
);

INSERT INTO servicios (id, nombre, descripcion, precio, estado) VALUES
(1, 'Desparacitacion', NULL, 20.00, 1),
(2, 'Vacunacion', 'Vacunacion para Cachorros', 14.00, 1);

-- --------------------------------------------------------
-- citas
-- --------------------------------------------------------
CREATE TABLE citas (
    id BIGSERIAL PRIMARY KEY,
    id_mascota BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL,
    id_servicio BIGINT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    turno VARCHAR(10) NOT NULL CHECK (turno IN ('MANANA','TARDE')),
    motivo_detalle TEXT DEFAULT NULL,
    estado VARCHAR(20) DEFAULT NULL CHECK (estado IN ('ATENDIDA','CANCELADA','CONFIRMADA','EN_ESPERA','PENDIENTE')),
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO citas (id, id_mascota, id_usuario, id_servicio, fecha, hora, turno, motivo_detalle, estado, fecha_registro) VALUES
(1, 1, 5, 2, '2026-01-16', '06:20:00', 'TARDE', 'Perro en estado de Obcervacion', 'CONFIRMADA', '2025-12-30 07:10:00'),
(2, 2, 5, 2, '2026-03-09', '09:30:00', 'MANANA', 'vacuna Control', 'CONFIRMADA', '2026-03-06 22:26:05'),
(3, 1, 5, 1, '2026-03-13', '10:30:00', 'MANANA', NULL, 'CONFIRMADA', '2026-03-07 04:23:07'),
(4, 4, 5, 2, '2026-03-12', '06:30:00', 'TARDE', 'Espera', 'CONFIRMADA', '2026-03-07 04:34:44');

-- --------------------------------------------------------
-- historial_clinico
-- --------------------------------------------------------
CREATE TABLE historial_clinico (
    id BIGSERIAL PRIMARY KEY,
    diagnostico TEXT DEFAULT NULL,
    estado INT NOT NULL,
    fecha_registro TIMESTAMP NOT NULL,
    motivo_consulta VARCHAR(255) DEFAULT NULL,
    observaciones TEXT DEFAULT NULL,
    peso DECIMAL(10,2) DEFAULT NULL,
    sintomas TEXT DEFAULT NULL,
    temperatura DECIMAL(5,2) DEFAULT NULL,
    tratamiento TEXT DEFAULT NULL,
    id_cita BIGINT DEFAULT NULL,
    id_mascota BIGINT NOT NULL,
    id_usuario BIGINT NOT NULL
);

INSERT INTO historial_clinico (id, diagnostico, estado, fecha_registro, motivo_consulta, observaciones, peso, sintomas, temperatura, tratamiento, id_cita, id_mascota, id_usuario) VALUES
(1, 'Posible Infección viral', 1, '2026-03-17 02:49:38', 'Mascota sin Apetito', 'Se espera que la Mascota mejore en los siguientes 3 dias', 20.00, 'No quiere comer, encías pálidas, decaimiento.', 40.50, 'Se le Colocara 3 inyecciones (NN, NN,NN), para la infección.', 3, 1, 3),
(2, 'aefaf', 1, '2026-03-17 03:06:48', 'Mascota sin Apetito', 'aefaf', 40.00, 'afeaefa', 40.50, 'afea', 1, 1, 5),
(3, 'Diarrea severa', 1, '2026-03-17 04:31:14', 'Diarrea', 'Se espera que se mejore en 2 dias', 20.00, 'Diarrea y sintomas de decaimiento', 38.50, 'Pastillas y una Inyeccion', 4, 4, 5),
(4, 'Gripe severa', 1, '2026-03-17 19:18:20', 'Gripe', 'Se recomienda que no esté en lugares fríos', 10.00, 'resfriado, congestión nasal', 35.50, 'Antibioticos(NN)', NULL, 6, 6),
(5, 'Posible Infeccion', 1, '2026-03-17 20:02:14', 'Sin ganas de Comer', 'El perro tiene que estar en descanso sin hacer esfuerzo como correr o algún ejercicio.', 30.00, 'Decaimiento, poco apetito, fiebre severa', 38.50, 'Se le colocara algunos antibióticos (nombres) y inyecciones (nombres).', NULL, 5, 3);

-- --------------------------------------------------------
-- examenes_laboratorio
-- --------------------------------------------------------
CREATE TABLE examenes_laboratorio (
    id BIGSERIAL PRIMARY KEY,
    id_historial BIGINT NOT NULL,
    tipo_examen VARCHAR(100) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    archivo VARCHAR(500) DEFAULT NULL,
    resultado TEXT DEFAULT NULL,
    fecha_examen DATE DEFAULT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nombre_archivo VARCHAR(255) DEFAULT NULL
);

INSERT INTO examenes_laboratorio (id, id_historial, tipo_examen, descripcion, archivo, resultado, fecha_examen, fecha_registro, nombre_archivo) VALUES
(1, 1, 'Hemograma', 'Hemograma de Kira', 'examenes/14c68746-565c-472a-8857-da3c7d0956ff.pdf', 'Posible anemia', '2026-03-17', '2026-03-17 09:35:39', 'HEMOGRAMA_MASCOLANDIA MOLLY.pdf');

-- --------------------------------------------------------
-- opciones
-- --------------------------------------------------------
CREATE TABLE opciones (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ruta VARCHAR(100) NOT NULL UNIQUE,
    icono VARCHAR(50) DEFAULT NULL,
    id_padre BIGINT DEFAULT NULL,
    orden INT DEFAULT 0
);

INSERT INTO opciones (id, nombre, ruta, icono, id_padre, orden) VALUES
(1, 'Dashboard', '/', 'home', NULL, 1),
(2, 'Gestión de Usuarios', '/usuarios', 'users', 4, 1),
(3, 'Gestión de Perfiles', '/perfiles/listar', 'shield', 4, 2),
(4, 'Administración del Personal', '#Admin', 'settings', NULL, 2),
(5, 'Gestión de Agenda', '#Agenda', 'heart', NULL, 3),
(6, 'Clientes y Mascotas', '#Dueños', 'bar-chart', NULL, 4),
(7, 'Mascotas', '/mascotas', 'list', 6, 2),
(9, 'Razas', '/razas', 'tag', 6, 3),
(10, 'Registro de Citas', '/citas', 'calendar', 5, 1),
(11, 'Reporte de Ventas', '/reportes/listar', 'dollar-sign', 23, 3),
(12, 'Clientes', '/clientes', NULL, 6, 1),
(13, 'Área Medica', '#Medica', NULL, NULL, 5),
(14, 'Historias Clínicas', '/historial-clinico', NULL, 13, 2),
(15, 'Consulta y Tratamientos', '/consulta/listar', NULL, 13, 3),
(16, 'Vacunación y Desparasitación', '/vacunacion/listar', NULL, 13, 4),
(17, 'Exámenes y Laboratorio', '/historial-clinico', NULL, 13, 5),
(18, 'Estética', '#estetica', NULL, NULL, 6),
(19, 'Baños y Peluquería', '/baños/listar', NULL, 18, 1),
(20, 'Inventario y Compras', '#Inventario', NULL, NULL, 7),
(21, 'Productos', '/productos', NULL, 20, 1),
(22, 'Proveedores', '/proveedores', NULL, 20, 3),
(23, 'Modulo Ventas', '#Ventas', NULL, NULL, 7),
(24, 'Ventas', '/ventas', NULL, 23, 1),
(25, 'Caja Chica', '/caja/listar', NULL, 23, 2),
(26, 'Especies', '/especies', NULL, 6, 4),
(27, 'Categoria Productos', '/categorias-productos/listar', NULL, 20, 2),
(28, 'Servicios', '/servicios', NULL, 13, 1);

-- --------------------------------------------------------
-- perfil_opcion
-- --------------------------------------------------------
CREATE TABLE perfil_opcion (
    id_perfil BIGINT NOT NULL,
    id_opcion BIGINT NOT NULL,
    PRIMARY KEY (id_perfil, id_opcion)
);

INSERT INTO perfil_opcion (id_perfil, id_opcion) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,9),(1,10),(1,11),(1,12),
(1,13),(1,14),(1,15),(1,16),(1,17),(1,18),(1,19),(1,20),(1,21),(1,22),
(1,23),(1,24),(1,25),(3,2),(3,3),(3,4);

-- --------------------------------------------------------
-- proveedores
-- --------------------------------------------------------
CREATE TABLE proveedores (
    id BIGSERIAL PRIMARY KEY,
    ruc VARCHAR(20) DEFAULT NULL UNIQUE,
    nombre_empresa VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(100) DEFAULT NULL,
    direccion VARCHAR(255) DEFAULT NULL,
    estado INT NOT NULL
);

INSERT INTO proveedores (id, ruc, nombre_empresa, telefono, correo, direccion, estado) VALUES
(1, '20467534026', 'Totus', '98766545', 'josue.gonzales2205@gmail.com', 'AV. VENEZUELA S/N', 1);

-- --------------------------------------------------------
-- productos
-- --------------------------------------------------------
CREATE TABLE productos (
    id BIGSERIAL PRIMARY KEY,
    codigo_barras VARCHAR(50) DEFAULT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    id_categoria BIGINT DEFAULT NULL,
    id_proveedor BIGINT NOT NULL,
    precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock_actual INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 5,
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado INT NOT NULL
);

INSERT INTO productos (id, codigo_barras, nombre, descripcion, id_categoria, id_proveedor, precio_compra, precio_venta, stock_actual, stock_minimo, fecha_registro, estado) VALUES
(1, NULL, 'Peinilla', 'Para Cachorros de 6 Meses', 1, 1, 5.00, 8.00, 10, 5, '2025-12-19 16:06:35', 1);

-- --------------------------------------------------------
-- ventas
-- --------------------------------------------------------
CREATE TABLE ventas (
    id BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT DEFAULT NULL,
    id_usuario BIGINT NOT NULL,
    tipo_comprobante VARCHAR(10) NOT NULL DEFAULT 'TICKET' CHECK (tipo_comprobante IN ('BOLETA','FACTURA','TICKET')),
    numero_comprobante VARCHAR(50) DEFAULT NULL,
    metodo_pago VARCHAR(10) NOT NULL CHECK (metodo_pago IN ('EFECTIVO','YAPE','PLIN','TARJETA')),
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estado VARCHAR(15) NOT NULL DEFAULT 'COMPLETADA' CHECK (estado IN ('COMPLETADA','ANULADA')),
    fecha_venta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- ventas_detalle
-- --------------------------------------------------------
CREATE TABLE ventas_detalle (
    id BIGSERIAL PRIMARY KEY,
    id_venta BIGINT NOT NULL,
    id_producto BIGINT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- FOREIGN KEYS
-- ============================================================
ALTER TABLE usuarios ADD CONSTRAINT fk_usuario_perfil FOREIGN KEY (id_perfil) REFERENCES perfiles(id) ON UPDATE CASCADE;

ALTER TABLE razas ADD CONSTRAINT fk_raza_especie FOREIGN KEY (id_especie) REFERENCES especies(id) ON DELETE CASCADE;

ALTER TABLE mascotas ADD CONSTRAINT fk_mascota_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id) ON DELETE CASCADE;
ALTER TABLE mascotas ADD CONSTRAINT fk_mascota_raza FOREIGN KEY (id_raza) REFERENCES razas(id);

ALTER TABLE citas ADD CONSTRAINT fk_cita_mascota FOREIGN KEY (id_mascota) REFERENCES mascotas(id) ON DELETE CASCADE;
ALTER TABLE citas ADD CONSTRAINT fk_cita_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id);
ALTER TABLE citas ADD CONSTRAINT fk_cita_servicio FOREIGN KEY (id_servicio) REFERENCES servicios(id);

ALTER TABLE historial_clinico ADD CONSTRAINT fk_historial_cita FOREIGN KEY (id_cita) REFERENCES citas(id);
ALTER TABLE historial_clinico ADD CONSTRAINT fk_historial_mascota FOREIGN KEY (id_mascota) REFERENCES mascotas(id);
ALTER TABLE historial_clinico ADD CONSTRAINT fk_historial_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id);

ALTER TABLE examenes_laboratorio ADD CONSTRAINT fk_examen_historial FOREIGN KEY (id_historial) REFERENCES historial_clinico(id) ON DELETE CASCADE;

ALTER TABLE baños ADD CONSTRAINT banos_ibfk_1 FOREIGN KEY (id_mascota) REFERENCES mascotas(id);
ALTER TABLE baños ADD CONSTRAINT banos_ibfk_2 FOREIGN KEY (id_usuario) REFERENCES usuarios(id);
ALTER TABLE baños ADD CONSTRAINT banos_ibfk_3 FOREIGN KEY (id_cita) REFERENCES citas(id);

ALTER TABLE baños_detalle_productos ADD CONSTRAINT banos_det_ibfk_1 FOREIGN KEY (id_baño) REFERENCES baños(id) ON DELETE CASCADE;
ALTER TABLE baños_detalle_productos ADD CONSTRAINT banos_det_ibfk_2 FOREIGN KEY (id_producto) REFERENCES productos(id);

ALTER TABLE opciones ADD CONSTRAINT fk_opcion_padre FOREIGN KEY (id_padre) REFERENCES opciones(id) ON DELETE CASCADE;

ALTER TABLE perfil_opcion ADD CONSTRAINT fk_po_perfil FOREIGN KEY (id_perfil) REFERENCES perfiles(id) ON DELETE CASCADE;
ALTER TABLE perfil_opcion ADD CONSTRAINT fk_po_opcion FOREIGN KEY (id_opcion) REFERENCES opciones(id) ON DELETE CASCADE;

ALTER TABLE productos ADD CONSTRAINT fk_producto_proveedor FOREIGN KEY (id_proveedor) REFERENCES proveedores(id);
ALTER TABLE productos ADD CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria) REFERENCES categorias_productos(id);

ALTER TABLE ventas ADD CONSTRAINT fk_venta_cliente FOREIGN KEY (id_cliente) REFERENCES clientes(id) ON DELETE SET NULL;
ALTER TABLE ventas ADD CONSTRAINT fk_venta_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id);

ALTER TABLE ventas_detalle ADD CONSTRAINT fk_detalle_venta FOREIGN KEY (id_venta) REFERENCES ventas(id) ON DELETE CASCADE;
ALTER TABLE ventas_detalle ADD CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos(id);

-- ============================================================
-- Ajustar secuencias SERIAL para que no colisionen con datos insertados
-- ============================================================
SELECT setval('baños_id_seq', (SELECT MAX(id) FROM baños));
SELECT setval('baño_stock_id_seq', (SELECT MAX(id) FROM baño_stock));
SELECT setval('categorias_productos_id_seq', (SELECT MAX(id) FROM categorias_productos));
SELECT setval('perfiles_id_seq', (SELECT MAX(id) FROM perfiles));
SELECT setval('usuarios_id_seq', (SELECT MAX(id) FROM usuarios));
SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));
SELECT setval('especies_id_seq', (SELECT MAX(id) FROM especies));
SELECT setval('razas_id_seq', (SELECT MAX(id) FROM razas));
SELECT setval('mascotas_id_seq', (SELECT MAX(id) FROM mascotas));
SELECT setval('servicios_id_seq', (SELECT MAX(id) FROM servicios));
SELECT setval('citas_id_seq', (SELECT MAX(id) FROM citas));
SELECT setval('historial_clinico_id_seq', (SELECT MAX(id) FROM historial_clinico));
SELECT setval('examenes_laboratorio_id_seq', (SELECT MAX(id) FROM examenes_laboratorio));
SELECT setval('opciones_id_seq', (SELECT MAX(id) FROM opciones));
SELECT setval('proveedores_id_seq', (SELECT MAX(id) FROM proveedores));
SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));
