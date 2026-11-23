-- database_schema.sql - Estructura de tablas MySQL para RentFlow
-- Nota: db.php también crea estas tablas automáticamente al abrir la app,
-- pero puedes importar este archivo manualmente en phpMyAdmin si lo prefieres.

SET NAMES utf8mb4;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value LONGTEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
