# RentFlow - Sistema de Gestión de Alquileres (Liquid Glass)

Sistema de gestión inmobiliaria y de alquileres moderno con diseño de vidrio líquido (*Liquid Glass / Glassmorphism*), integrado con backend en **PHP** y base de datos **MySQL** local (Laragon).

---

## 🚀 Cómo ejecutar en Laragon (100% Local)

No necesitas ejecutar comandos en terminal para usar la aplicación:

1. **Abre Laragon** y presiona **"Iniciar Todo"** (Start All) para encender Apache y MySQL.
2. Abre tu navegador web favorito e ingresa a:
   👉 **`http://localhost/Rental/`** (o `http://rental.test/` si tienes virtual hosts activados en Laragon).
3. ¡Listo! La base de datos `rental_db` y todas sus tablas se crean y se llenan automáticamente con los datos de ejemplo la primera vez que abres el sitio.

---

## 🛠️ Estructura del Backend PHP y Base de Datos

- **Base de Datos:** MySQL (`rental_db`)
- **[db.php](file:///c:/laragon/www/Rental/db.php):** Conexión mediante PDO. Crea la base de datos `rental_db` si no existe, genera las tablas `properties`, `tenants`, `payments`, `settings` y siembra los datos iniciales.
- **[api.php](file:///c:/laragon/www/Rental/api.php):** API REST ligera en PHP que maneja operaciones CRUD:
  - `get_all`: Obtiene propiedades, inquilinos, pagos pendientes/realizados y configuración.
  - `save_tenant`: Crea o actualiza un inquilino y asigna la propiedad como ocupada.
  - `delete_tenant`: Elimina un inquilino, limpia sus cobros y libera la propiedad.
  - `save_property`: Agrega o actualiza información de inmuebles.
  - `delete_property`: Da de baja la propiedad y sus vínculos.
  - `add_payment`: Registra pagos de renta mensuales.
  - `mark_paid`: Marca pagos de morosos como pagados y actualiza su estado.
  - `save_settings`: Guarda la plantilla de WhatsApp para comprobantes.
  - `reset_data`: Restablece la base de datos a sus valores iniciales.

---

## 💻 Desarrollo Frontend (Opcional)

Si deseas modificar el código de la interfaz:

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo en vivo (Vite)
npm run dev

# Compilar para producción y sincronizar con Apache
npm run build
```

---

## 🎨 Características Visuales
- Diseño **Liquid Glass (Glassmorphism)** con efectos de desenfoque de fondo (`backdrop-blur-3xl`).
- Generación de comprobantes en **PDF** con jsPDF.
- Enlace directo para enviar mensajes y recordatorios por **WhatsApp**.
- Gráficos de ingresos en tiempo real.
