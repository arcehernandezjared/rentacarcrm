CREATE DATABASE IF NOT EXISTS rentacar_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rentacar_crm;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  categoria ENUM('economico', 'sedan', 'suv', 'pickup', 'van', 'lujo') NOT NULL,
  marca VARCHAR(80) NOT NULL,
  modelo VARCHAR(80) NOT NULL,
  anio INT,
  placa VARCHAR(20) UNIQUE,
  transmision ENUM('manual', 'automatico') NOT NULL DEFAULT 'automatico',
  capacidad_pasajeros INT NOT NULL DEFAULT 5,
  tarifa_dia DECIMAL(10,2) NOT NULL,
  tarifa_semana DECIMAL(10,2) NOT NULL,
  tarifa_mes DECIMAL(10,2) NOT NULL,
  disponible TINYINT(1) NOT NULL DEFAULT 1,
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_categoria (categoria)
);

CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  telefono VARCHAR(40),
  empresa VARCHAR(150),
  origen VARCHAR(255),
  estado ENUM('nuevo', 'contactado', 'cotizado', 'reservado', 'perdido') NOT NULL DEFAULT 'nuevo',
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS cotizaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  vehiculo_id INT NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias INT NOT NULL,
  tarifa_aplicada DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  impuestos DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  estado ENUM('enviada', 'aceptada', 'rechazada', 'vencida', 'confirmada', 'cancelada') NOT NULL DEFAULT 'enviada',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id),
  INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS correos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gmail_message_id VARCHAR(64) NOT NULL UNIQUE,
  gmail_thread_id VARCHAR(64),
  cliente_id INT,
  remitente VARCHAR(255) NOT NULL,
  asunto VARCHAR(500),
  resumen TEXT,
  categoria ENUM('venta', 'soporte', 'cobro', 'cotizacion', 'confirmacion', 'cancelacion') NOT NULL DEFAULT 'venta',
  cotizacion_id INT,
  respuesta_ia TEXT,
  respondido TINYINT(1) NOT NULL DEFAULT 0,
  recibido_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE SET NULL,
  INDEX idx_categoria (categoria),
  INDEX idx_created (created_at)
);

CREATE TABLE IF NOT EXISTS seguimientos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  cotizacion_id INT,
  tipo VARCHAR(60) NOT NULL DEFAULT 'seguimiento_cotizacion',
  mensaje TEXT,
  programado_para DATETIME NOT NULL,
  estado ENUM('pendiente', 'enviado', 'cancelado') NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE SET NULL,
  INDEX idx_estado_fecha (estado, programado_para)
);

-- Controla, por categoría, si el workflow de n8n debe responder
-- automáticamente o solo clasificar/registrar sin contestar.
CREATE TABLE IF NOT EXISTS configuracion_categorias (
  categoria ENUM('venta', 'soporte', 'cobro', 'cotizacion', 'confirmacion', 'cancelacion') PRIMARY KEY,
  auto_responder TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuracion_categorias (categoria, auto_responder) VALUES
  ('venta', 1), ('soporte', 1), ('cobro', 1), ('cotizacion', 1), ('confirmacion', 1), ('cancelacion', 1)
ON DUPLICATE KEY UPDATE categoria = categoria;

-- Información libre del negocio (requisitos, pagos, seguro, horarios,
-- políticas, etc.) que la IA usa como contexto para responder cualquier
-- consulta del cliente con datos reales, sin inventar. Fila única (id = 1).
CREATE TABLE IF NOT EXISTS configuracion_negocio (
  id INT PRIMARY KEY DEFAULT 1,
  info_negocio TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO configuracion_negocio (id, info_negocio) VALUES (1, '')
ON DUPLICATE KEY UPDATE id = id;

-- Devolución de un vehículo al cerrar una reserva confirmada. Una cotización
-- confirmada se considera "devuelta" cuando tiene una fila aquí.
CREATE TABLE IF NOT EXISTS devoluciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id INT NOT NULL UNIQUE,
  fecha_devolucion DATETIME NOT NULL,
  kilometraje INT,
  combustible ENUM('lleno', '3/4', '1/2', '1/4', 'vacio'),
  danos TEXT,
  cargo_atraso DECIMAL(10,2) NOT NULL DEFAULT 0,
  cargo_danos DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cargos_extra DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE
);

-- Pagos registrados manualmente contra una cotización/reserva. El estado de
-- cobro (pendiente/parcial/pagado) se calcula sumando estos montos vs. el total.
CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cotizacion_id INT NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  metodo ENUM('efectivo', 'tarjeta', 'sinpe', 'transferencia') NOT NULL DEFAULT 'efectivo',
  fecha DATE NOT NULL,
  notas VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
  INDEX idx_cotizacion (cotizacion_id)
);

-- Conexión OAuth2 de Gmail usada por la sincronización dentro del dashboard
-- (independiente de n8n). Una sola fila: la cuenta de Gmail del negocio.
CREATE TABLE IF NOT EXISTS gmail_conexion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expiry_date BIGINT,
  ultima_sincronizacion TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Catálogo inicial de vehículos (tarifas en colones costarricenses, IVA aparte)
INSERT INTO vehiculos (categoria, marca, modelo, anio, placa, transmision, capacidad_pasajeros, tarifa_dia, tarifa_semana, tarifa_mes, descripcion) VALUES
  ('economico', 'Hyundai', 'Accent', 2023, 'RAC-001', 'automatico', 5, 25000, 150000, 500000, 'Compacto ideal para ciudad, económico en combustible.'),
  ('economico', 'Toyota', 'Yaris', 2023, 'RAC-002', 'manual', 5, 24000, 145000, 480000, 'Compacto confiable, bajo consumo.'),
  ('sedan', 'Toyota', 'Corolla', 2023, 'RAC-003', 'automatico', 5, 32000, 195000, 650000, 'Sedán cómodo para viajes de negocio o familia.'),
  ('sedan', 'Nissan', 'Sentra', 2022, 'RAC-004', 'automatico', 5, 30000, 185000, 620000, 'Sedán espacioso con buen rendimiento.'),
  ('suv', 'Toyota', 'RAV4', 2023, 'RAC-005', 'automatico', 5, 48000, 295000, 980000, 'SUV 4x4 ideal para carretera y zonas rurales.'),
  ('suv', 'Hyundai', 'Tucson', 2023, 'RAC-006', 'automatico', 5, 46000, 280000, 940000, 'SUV cómodo con buen espacio de carga.'),
  ('pickup', 'Toyota', 'Hilux', 2022, 'RAC-007', 'manual', 5, 55000, 335000, 1100000, 'Pickup 4x4 robusta para trabajo o aventura.'),
  ('van', 'Hyundai', 'H1', 2022, 'RAC-008', 'automatico', 12, 65000, 395000, 1300000, 'Van para grupos grandes o traslados de equipo.'),
  ('lujo', 'BMW', 'Serie 3', 2023, 'RAC-009', 'automatico', 5, 85000, 520000, 1700000, 'Sedán ejecutivo de lujo, ideal para clientes corporativos.'),
  ('lujo', 'Mercedes-Benz', 'Clase C', 2023, 'RAC-010', 'automatico', 5, 88000, 540000, 1750000, 'Sedán premium con acabados de alta gama.')
ON DUPLICATE KEY UPDATE marca = marca;
