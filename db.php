<?php
// db.php - Conexión y configuración de la base de datos MySQL para RentFlow

if (php_sapi_name() !== 'cli' && !headers_sent()) {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

if (file_exists(__DIR__ . '/config.php')) {
    require_once __DIR__ . '/config.php';
}

$db_host = defined('DB_HOST') ? DB_HOST : '127.0.0.1';
$db_user = defined('DB_USER') ? DB_USER : 'root';
$db_pass = defined('DB_PASS') ? DB_PASS : '';
$db_name = defined('DB_NAME') ? DB_NAME : 'rental_db';

$pdoOptions = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    // 1. Conectar directamente a la base de datos configurada (compatible con Spaceship/cPanel)
    try {
        $pdo = new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4", $db_user, $db_pass, $pdoOptions);
    } catch (PDOException $e) {
        // En entorno local (Laragon), crear la BD automáticamente si aún no existe (código 1049)
        if ((int)$e->getCode() === 1049 && $db_user === 'root') {
            $pdo = new PDO("mysql:host={$db_host};charset=utf8mb4", $db_user, $db_pass, $pdoOptions);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `{$db_name}`");
        } else {
            throw $e;
        }
    }

    // 3. Crear las tablas principales si no existen
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS properties (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            address VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            isOccupied TINYINT(1) NOT NULL DEFAULT 0,
            description TEXT NULL,
            images JSON NULL,
            specs JSON NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tenants (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            idNumber VARCHAR(50) NULL,
            email VARCHAR(255) NULL,
            phone VARCHAR(100) NOT NULL,
            propertyId VARCHAR(50) NOT NULL,
            monthlyRent DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            includeInternet TINYINT(1) NOT NULL DEFAULT 0,
            startDate DATE NOT NULL,
            contractDuration INT NOT NULL DEFAULT 12,
            status VARCHAR(30) NOT NULL DEFAULT 'active',
            contractUrl LONGTEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_propertyId (propertyId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS payments (
            id VARCHAR(50) PRIMARY KEY,
            tenantId VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            amountBs DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            exchangeRate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            date DATE NOT NULL,
            month VARCHAR(50) NOT NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tenantId (tenantId)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            setting_key VARCHAR(100) PRIMARY KEY,
            setting_value LONGTEXT NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS expenses (
            id VARCHAR(50) PRIMARY KEY,
            propertyId VARCHAR(50) NULL,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) NOT NULL DEFAULT 'Mantenimiento',
            amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            amountBs DECIMAL(14,2) NOT NULL DEFAULT 0.00,
            exchangeRate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            date DATE NOT NULL,
            month VARCHAR(50) NOT NULL,
            paymentMethod VARCHAR(100) NULL DEFAULT 'Transferencia',
            receiptNumber VARCHAR(100) NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_expense_prop (propertyId),
            INDEX idx_expense_month (month)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // 4. Migraciones dinámicas: comprobar y añadir columnas que puedan faltar
    $tenantCols = $pdo->query("SHOW COLUMNS FROM tenants")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('idNumber', $tenantCols)) {
        $pdo->exec("ALTER TABLE tenants ADD COLUMN idNumber VARCHAR(50) NULL AFTER name");
    }
    if (!in_array('includeInternet', $tenantCols)) {
        $pdo->exec("ALTER TABLE tenants ADD COLUMN includeInternet TINYINT(1) NOT NULL DEFAULT 0 AFTER monthlyRent");
    }
    if (!in_array('contractDuration', $tenantCols)) {
        $pdo->exec("ALTER TABLE tenants ADD COLUMN contractDuration INT NOT NULL DEFAULT 12 AFTER startDate");
    }
    // Modificar email para que sea opcional (nullable)
    $pdo->exec("ALTER TABLE tenants MODIFY COLUMN email VARCHAR(255) NULL");
    // Modificar contractUrl para soportar base64 grande
    $pdo->exec("ALTER TABLE tenants MODIFY COLUMN contractUrl LONGTEXT NULL");

    $paymentCols = $pdo->query("SHOW COLUMNS FROM payments")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('amountBs', $paymentCols)) {
        $pdo->exec("ALTER TABLE payments ADD COLUMN amountBs DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER amount");
    }
    if (!in_array('exchangeRate', $paymentCols)) {
        $pdo->exec("ALTER TABLE payments ADD COLUMN exchangeRate DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER amountBs");
    }

    // Actualizar propiedades existentes de tipo "Office" a "Warehouse"
    $pdo->exec("UPDATE properties SET type = 'Warehouse' WHERE type = 'Office'");

    // 5. Sembrar datos iniciales si las tablas están vacías
    function seedInitialData($pdo) {
        $checkProperties = $pdo->query("SELECT COUNT(*) FROM properties")->fetchColumn();
        if ($checkProperties == 0) {
            $properties = [
                [
                    'id' => 'p1',
                    'name' => 'Loft Palermo',
                    'address' => 'Av. Santa Fe 1234',
                    'type' => 'Apartment',
                    'price' => 1200,
                    'isOccupied' => 1,
                    'description' => 'Hermoso loft moderno en el corazón de Palermo. Techos altos y mucha luz natural.',
                    'images' => json_encode(['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=800']),
                    'specs' => json_encode(['sqft' => 65, 'bedrooms' => 1, 'bathrooms' => 1, 'parking' => true])
                ],
                [
                    'id' => 'p2',
                    'name' => 'Nordelta House',
                    'address' => 'Los Alisos 45',
                    'type' => 'House',
                    'price' => 2500,
                    'isOccupied' => 1,
                    'description' => 'Espaciosa casa familiar con jardín y piscina. Seguridad 24hs.',
                    'images' => json_encode(['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800']),
                    'specs' => json_encode(['sqft' => 220, 'bedrooms' => 4, 'bathrooms' => 3, 'parking' => true])
                ],
                [
                    'id' => 'p3',
                    'name' => 'Galpón Industrial Central',
                    'address' => 'Zona Industrial II, Parcela 14',
                    'type' => 'Warehouse',
                    'price' => 1800,
                    'isOccupied' => 1,
                    'description' => 'Galpón de almacenamiento de 500m² con portón para gandolas y oficinas administrativas.',
                    'images' => json_encode(['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800']),
                    'specs' => json_encode(['sqft' => 500, 'bathrooms' => 2, 'parking' => true])
                ],
                [
                    'id' => 'p4',
                    'name' => 'Anexo Residencial Las Mercedes',
                    'address' => 'Calle Los Naranjos, Qta. Villa',
                    'type' => 'Annex',
                    'price' => 650,
                    'isOccupied' => 0,
                    'description' => 'Anexo independiente completamente amoblado, con entrada privada y todos los servicios.',
                    'images' => json_encode(['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800']),
                    'specs' => json_encode(['sqft' => 45, 'bedrooms' => 1, 'bathrooms' => 1, 'parking' => true])
                ]
            ];

            $stmtProp = $pdo->prepare("INSERT INTO properties (id, name, address, type, price, isOccupied, description, images, specs) VALUES (:id, :name, :address, :type, :price, :isOccupied, :description, :images, :specs)");
            foreach ($properties as $p) {
                $stmtProp->execute($p);
            }
        }

        $checkTenants = $pdo->query("SELECT COUNT(*) FROM tenants")->fetchColumn();
        if ($checkTenants == 0) {
            $tenants = [
                [
                    'id' => '1',
                    'name' => 'Julian Alvarez',
                    'idNumber' => 'V-19.824.512',
                    'email' => 'julian@example.com',
                    'phone' => '+584121234567',
                    'propertyId' => 'p1',
                    'monthlyRent' => 1210,
                    'includeInternet' => 1,
                    'startDate' => '2023-01-15',
                    'contractDuration' => 12,
                    'status' => 'active'
                ],
                [
                    'id' => '2',
                    'name' => 'Marta Gomez',
                    'idNumber' => 'V-15.632.140',
                    'email' => 'marta@example.com',
                    'phone' => '+584149876543',
                    'propertyId' => 'p2',
                    'monthlyRent' => 2500,
                    'includeInternet' => 0,
                    'startDate' => '2023-05-10',
                    'contractDuration' => 24,
                    'status' => 'late'
                ],
                [
                    'id' => '3',
                    'name' => 'Sofia Vergara',
                    'idNumber' => 'V-22.109.845',
                    'email' => 'sofia@example.com',
                    'phone' => '+584245551234',
                    'propertyId' => 'p3',
                    'monthlyRent' => 1810,
                    'includeInternet' => 1,
                    'startDate' => '2024-02-01',
                    'contractDuration' => 18,
                    'status' => 'active'
                ]
            ];

            $stmtTen = $pdo->prepare("INSERT INTO tenants (id, name, idNumber, email, phone, propertyId, monthlyRent, includeInternet, startDate, contractDuration, status) VALUES (:id, :name, :idNumber, :email, :phone, :propertyId, :monthlyRent, :includeInternet, :startDate, :contractDuration, :status)");
            foreach ($tenants as $t) {
                $stmtTen->execute($t);
            }
        }

        $checkPayments = $pdo->query("SELECT COUNT(*) FROM payments")->fetchColumn();
        if ($checkPayments == 0) {
            $payments = [
                ['id' => 'pay1', 'tenantId' => '1', 'amount' => 1210, 'amountBs' => 63525.00, 'exchangeRate' => 52.50, 'date' => '2026-03-01', 'month' => 'Marzo', 'status' => 'paid'],
                ['id' => 'pay2', 'tenantId' => '2', 'amount' => 2500, 'amountBs' => 131250.00, 'exchangeRate' => 52.50, 'date' => '2026-03-05', 'month' => 'Marzo', 'status' => 'pending']
            ];

            $stmtPay = $pdo->prepare("INSERT INTO payments (id, tenantId, amount, amountBs, exchangeRate, date, month, status) VALUES (:id, :tenantId, :amount, :amountBs, :exchangeRate, :date, :month, :status)");
            foreach ($payments as $pay) {
                $stmtPay->execute($pay);
            }
        }

        $checkExpenses = $pdo->query("SELECT COUNT(*) FROM expenses")->fetchColumn();
        if ($checkExpenses == 0) {
            $expenses = [
                [
                    'id' => 'exp1',
                    'propertyId' => 'p1',
                    'title' => 'Reparación de filtración y pintura baño',
                    'category' => 'Reparaciones',
                    'amount' => 140.00,
                    'amountBs' => 7350.00,
                    'exchangeRate' => 52.50,
                    'date' => '2026-11-04',
                    'month' => 'Noviembre',
                    'paymentMethod' => 'Pago Móvil',
                    'receiptNumber' => 'REC-084',
                    'notes' => 'Cambio de tubería flexible y sellado con silicón'
                ],
                [
                    'id' => 'exp2',
                    'propertyId' => 'p2',
                    'title' => 'Mantenimiento preventivo bomba de agua y jardín',
                    'category' => 'Mantenimiento',
                    'amount' => 90.00,
                    'amountBs' => 4725.00,
                    'exchangeRate' => 52.50,
                    'date' => '2026-11-08',
                    'month' => 'Noviembre',
                    'paymentMethod' => 'Transferencia',
                    'receiptNumber' => 'FAC-1029',
                    'notes' => 'Revisión técnica semestral y poda preventiva'
                ]
            ];

            $stmtExp = $pdo->prepare("INSERT INTO expenses (id, propertyId, title, category, amount, amountBs, exchangeRate, date, month, paymentMethod, receiptNumber, notes) VALUES (:id, :propertyId, :title, :category, :amount, :amountBs, :exchangeRate, :date, :month, :paymentMethod, :receiptNumber, :notes)");
            foreach ($expenses as $exp) {
                $stmtExp->execute($exp);
            }
        }

        // Configuración inicial de plantillas WhatsApp y sistema
        $defaultReminder = "📅 *Recordatorio de Pago de Alquiler* 🏠\n\nEstimado(a) *{nombre}*, le recordamos cordialmente que dispone de *5 días* para realizar el pago correspondiente al mes de *{mes}*.\n\n💵 *Canon de Alquiler:* \${monto} USD\n🇻🇪 *Monto en Bolívares (Tasa BCV {tasa}):* Bs. {montoBs}\n\nPor favor, envíe el comprobante una vez realizada la transferencia. ¡Muchas gracias por su puntualidad! ✨";
        
        $defaultConfirmation = "✅ *Confirmación de Pago Recibido* 🎉\n\nEstimado(a) *{nombre}*, hemos recibido conforme su pago de alquiler.\n\n🗓 *Mes:* {mes}\n💵 *Monto:* \${monto} USD\n🇻🇪 *Equivalente en Bs:* Bs. {montoBs}\n📅 *Fecha de Pago:* {fecha}\n\n¡Gracias por su puntualidad! Su comprobante digital ya ha sido emitido. 📄✨";

        $defaultPdfConfig = json_encode([
            'companyName' => 'RentFlow Inversiones Inmobiliarias C.A.',
            'companyRif' => 'J-40582914-8',
            'companyPhone' => '+58 (412) 123-4567',
            'companyEmail' => 'administracion@rentflow.com',
            'companyAddress' => 'Av. Francisco de Miranda, Torre Empresarial, Piso 8, Caracas',
            'notes' => 'Este documento es un comprobante válido del pago del canon de arrendamiento y servicios estipulados en el contrato vigente.'
        ], JSON_UNESCAPED_UNICODE);

        $defaultSettings = [
            'ws_reminder_template' => $defaultReminder,
            'ws_confirmation_template' => $defaultConfirmation,
            'bcv_rate' => '52.50',
            'pdf_config' => $defaultPdfConfig,
            'theme' => 'light'
        ];

        // Solo insertar configuración inicial si no existe previamente
        $stmtSet = $pdo->prepare("INSERT IGNORE INTO settings (setting_key, setting_value) VALUES (:key, :val)");
        foreach ($defaultSettings as $key => $val) {
            $stmtSet->execute(['key' => $key, 'val' => $val]);
        }
    }

    seedInitialData($pdo);

} catch (PDOException $e) {
    if (php_sapi_name() === 'cli') {
        echo "Database error: " . $e->getMessage() . "\n";
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}
