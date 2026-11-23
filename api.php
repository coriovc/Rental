<?php
// api.php - API REST completa para RentFlow

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

// Obtener payload JSON si la petición es POST
$rawInput = file_get_contents('php://input');
$inputData = json_decode($rawInput, true) ?? [];
$action = $_GET['action'] ?? $inputData['action'] ?? '';

// Formatear propiedades
function formatProperty($row) {
    return [
        'id' => (string)$row['id'],
        'name' => $row['name'],
        'address' => $row['address'],
        'type' => $row['type'],
        'price' => (float)$row['price'],
        'isOccupied' => (bool)$row['isOccupied'],
        'description' => $row['description'] ?? '',
        'images' => !empty($row['images']) ? (is_string($row['images']) ? json_decode($row['images'], true) : $row['images']) : [],
        'specs' => !empty($row['specs']) ? (is_string($row['specs']) ? json_decode($row['specs'], true) : $row['specs']) : (object)[]
    ];
}

// Formatear inquilinos
function formatTenant($row) {
    return [
        'id' => (string)$row['id'],
        'name' => $row['name'],
        'idNumber' => $row['idNumber'] ?? '',
        'email' => $row['email'] ?? '',
        'phone' => $row['phone'],
        'propertyId' => (string)$row['propertyId'],
        'monthlyRent' => (float)$row['monthlyRent'],
        'includeInternet' => (bool)($row['includeInternet'] ?? 0),
        'startDate' => $row['startDate'],
        'contractDuration' => (int)($row['contractDuration'] ?? 12),
        'status' => $row['status'],
        'contractUrl' => $row['contractUrl'] ?? null
    ];
}

// Formatear pagos
function formatPayment($row) {
    return [
        'id' => (string)$row['id'],
        'tenantId' => (string)$row['tenantId'],
        'amount' => (float)$row['amount'],
        'amountBs' => (float)($row['amountBs'] ?? 0.00),
        'exchangeRate' => (float)($row['exchangeRate'] ?? 0.00),
        'date' => $row['date'],
        'month' => $row['month'],
        'status' => $row['status']
    ];
}

// Formatear gastos
function formatExpense($row) {
    return [
        'id' => (string)$row['id'],
        'propertyId' => !empty($row['propertyId']) ? (string)$row['propertyId'] : null,
        'title' => $row['title'],
        'category' => $row['category'] ?? 'Mantenimiento',
        'amount' => (float)$row['amount'],
        'amountBs' => (float)($row['amountBs'] ?? 0.00),
        'exchangeRate' => (float)($row['exchangeRate'] ?? 0.00),
        'date' => $row['date'],
        'month' => $row['month'],
        'paymentMethod' => $row['paymentMethod'] ?? 'Transferencia',
        'receiptNumber' => $row['receiptNumber'] ?? '',
        'notes' => $row['notes'] ?? ''
    ];
}

// Función para consultar y actualizar la tasa oficial del BCV automáticamente
function fetchAndUpdateBcvRate($pdo, $maxAgeMinutes = 30) {
    try {
        $savedStmt = $pdo->prepare("SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('bcv_rate', 'bcv_last_updated')");
        $savedStmt->execute();
        $rows = $savedStmt->fetchAll(PDO::FETCH_KEY_PAIR);
        $savedRate = isset($rows['bcv_rate']) ? (float)$rows['bcv_rate'] : null;
        $lastUpdated = $rows['bcv_last_updated'] ?? null;

        $shouldFetch = false;
        if (!$savedRate || !$lastUpdated) {
            $shouldFetch = true;
        } else {
            $diff = time() - strtotime($lastUpdated);
            if ($diff > ($maxAgeMinutes * 60)) {
                $shouldFetch = true;
            }
        }

        if ($shouldFetch) {
            $bcvRate = null;
            $apis = [
                'https://ve.dolarapi.com/v1/dolares/oficial',
                'https://pydolarvenezuela-api.vercel.app/api/v1/dollar?page=bcv'
            ];
            foreach ($apis as $url) {
                $ctx = stream_context_create([
                    'http' => [
                        'timeout' => 2,
                        'header' => "User-Agent: Mozilla/5.0 RentFlow/1.0\r\n"
                    ]
                ]);
                $res = @file_get_contents($url, false, $ctx);
                if ($res) {
                    $data = json_decode($res, true);
                    if (isset($data['promedio']) && (float)$data['promedio'] > 0) {
                        $bcvRate = (float)$data['promedio'];
                        break;
                    } elseif (isset($data['monitors']['bcv']['price']) && (float)$data['monitors']['bcv']['price'] > 0) {
                        $bcvRate = (float)$data['monitors']['bcv']['price'];
                        break;
                    }
                }
            }

            if ($bcvRate && $bcvRate > 0) {
                $now = date('Y-m-d H:i:s');
                $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('bcv_rate', ?) ON DUPLICATE KEY UPDATE setting_value = ?")->execute([(string)$bcvRate, (string)$bcvRate]);
                $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('bcv_last_updated', ?) ON DUPLICATE KEY UPDATE setting_value = ?")->execute([$now, $now]);
                return $bcvRate;
            }
        }

        return $savedRate ?: 52.50;
    } catch (Exception $e) {
        return 52.50;
    }
}

try {
    switch ($action) {
        case 'get_all':
            $propsRows = $pdo->query("SELECT * FROM properties ORDER BY created_at DESC")->fetchAll();
            $tenantsRows = $pdo->query("SELECT * FROM tenants ORDER BY created_at DESC")->fetchAll();
            $paymentsRows = $pdo->query("SELECT * FROM payments ORDER BY date DESC, created_at DESC")->fetchAll();
            $expensesRows = $pdo->query("SELECT * FROM expenses ORDER BY date DESC, created_at DESC")->fetchAll();
            $settingsRows = $pdo->query("SELECT * FROM settings")->fetchAll();

            $properties = array_map('formatProperty', $propsRows);
            $tenants = array_map('formatTenant', $tenantsRows);
            $payments = array_map('formatPayment', $paymentsRows);
            $expenses = array_map('formatExpense', $expensesRows);

            $settings = [];
            foreach ($settingsRows as $s) {
                $settings[$s['setting_key']] = $s['setting_value'];
            }

            // Actualización automática de la tasa BCV si requiere refresco
            $liveBcv = fetchAndUpdateBcvRate($pdo, 30);
            $settings['bcv_rate'] = (string)$liveBcv;

            echo json_encode([
                'success' => true,
                'properties' => $properties,
                'tenants' => $tenants,
                'payments' => $payments,
                'expenses' => $expenses,
                'settings' => $settings
            ]);
            break;

        case 'save_tenant':
            $id = $inputData['id'] ?? ('tenant-' . round(microtime(true) * 1000));
            $name = $inputData['name'] ?? '';
            $idNumber = $inputData['idNumber'] ?? '';
            $email = !empty($inputData['email']) ? $inputData['email'] : null;
            $phone = $inputData['phone'] ?? '';
            $propertyId = $inputData['propertyId'] ?? '';
            $monthlyRent = (float)($inputData['monthlyRent'] ?? 0);
            $includeInternet = !empty($inputData['includeInternet']) ? 1 : 0;
            $startDate = $inputData['startDate'] ?? date('Y-m-d');
            $contractDuration = (int)($inputData['contractDuration'] ?? 12);
            $status = $inputData['status'] ?? 'active';
            $contractUrl = $inputData['contractUrl'] ?? null;

            $exists = $pdo->prepare("SELECT COUNT(*) FROM tenants WHERE id = ?");
            $exists->execute([$id]);
            if ($exists->fetchColumn() > 0) {
                $stmt = $pdo->prepare("
                    UPDATE tenants 
                    SET name = ?, idNumber = ?, email = ?, phone = ?, propertyId = ?, monthlyRent = ?, includeInternet = ?, startDate = ?, contractDuration = ?, status = ?, contractUrl = ?
                    WHERE id = ?
                ");
                $stmt->execute([$name, $idNumber, $email, $phone, $propertyId, $monthlyRent, $includeInternet, $startDate, $contractDuration, $status, $contractUrl, $id]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO tenants (id, name, idNumber, email, phone, propertyId, monthlyRent, includeInternet, startDate, contractDuration, status, contractUrl)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$id, $name, $idNumber, $email, $phone, $propertyId, $monthlyRent, $includeInternet, $startDate, $contractDuration, $status, $contractUrl]);
            }

            // Marcar la propiedad asignada como ocupada
            if (!empty($propertyId)) {
                $pdo->prepare("UPDATE properties SET isOccupied = 1 WHERE id = ?")->execute([$propertyId]);
            }

            echo json_encode([
                'success' => true,
                'tenant' => [
                    'id' => $id,
                    'name' => $name,
                    'idNumber' => $idNumber,
                    'email' => $email ?? '',
                    'phone' => $phone,
                    'propertyId' => $propertyId,
                    'monthlyRent' => $monthlyRent,
                    'includeInternet' => (bool)$includeInternet,
                    'startDate' => $startDate,
                    'contractDuration' => $contractDuration,
                    'status' => $status,
                    'contractUrl' => $contractUrl
                ]
            ]);
            break;

        case 'delete_tenant':
            $id = $inputData['id'] ?? $_GET['id'] ?? '';
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'ID requerido']);
                exit;
            }

            $stmt = $pdo->prepare("SELECT propertyId FROM tenants WHERE id = ?");
            $stmt->execute([$id]);
            $propertyId = $stmt->fetchColumn();

            // Eliminar inquilino y sus pagos
            $pdo->prepare("DELETE FROM tenants WHERE id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM payments WHERE tenantId = ?")->execute([$id]);

            // Si no quedan inquilinos en esa propiedad, marcar como desocupada
            if ($propertyId) {
                $checkOther = $pdo->prepare("SELECT COUNT(*) FROM tenants WHERE propertyId = ?");
                $checkOther->execute([$propertyId]);
                if ($checkOther->fetchColumn() == 0) {
                    $pdo->prepare("UPDATE properties SET isOccupied = 0 WHERE id = ?")->execute([$propertyId]);
                }
            }

            echo json_encode(['success' => true]);
            break;

        case 'save_property':
            $id = $inputData['id'] ?? ('p-' . round(microtime(true) * 1000));
            $name = $inputData['name'] ?? '';
            $address = $inputData['address'] ?? '';
            $type = $inputData['type'] ?? 'Apartment';
            $price = (float)($inputData['price'] ?? 0);
            $isOccupied = !empty($inputData['isOccupied']) ? 1 : 0;
            $description = $inputData['description'] ?? '';
            $images = json_encode($inputData['images'] ?? []);
            $specs = json_encode($inputData['specs'] ?? []);

            $exists = $pdo->prepare("SELECT COUNT(*) FROM properties WHERE id = ?");
            $exists->execute([$id]);
            if ($exists->fetchColumn() > 0) {
                $stmt = $pdo->prepare("
                    UPDATE properties 
                    SET name = ?, address = ?, type = ?, price = ?, isOccupied = ?, description = ?, images = ?, specs = ?
                    WHERE id = ?
                ");
                $stmt->execute([$name, $address, $type, $price, $isOccupied, $description, $images, $specs, $id]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO properties (id, name, address, type, price, isOccupied, description, images, specs)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$id, $name, $address, $type, $price, $isOccupied, $description, $images, $specs]);
            }

            echo json_encode([
                'success' => true,
                'property' => [
                    'id' => $id,
                    'name' => $name,
                    'address' => $address,
                    'type' => $type,
                    'price' => $price,
                    'isOccupied' => (bool)$isOccupied,
                    'description' => $description,
                    'images' => $inputData['images'] ?? [],
                    'specs' => $inputData['specs'] ?? []
                ]
            ]);
            break;

        case 'delete_property':
            $id = $inputData['id'] ?? $_GET['id'] ?? '';
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'ID requerido']);
                exit;
            }

            // Obtener inquilinos vinculados
            $tenantsStmt = $pdo->prepare("SELECT id FROM tenants WHERE propertyId = ?");
            $tenantsStmt->execute([$id]);
            $tenantIds = $tenantsStmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($tenantIds as $tId) {
                $pdo->prepare("DELETE FROM payments WHERE tenantId = ?")->execute([$tId]);
            }
            $pdo->prepare("DELETE FROM tenants WHERE propertyId = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM properties WHERE id = ?")->execute([$id]);

            echo json_encode(['success' => true]);
            break;

        case 'save_payment':
        case 'add_payment':
            $id = $inputData['id'] ?? ('pay-' . round(microtime(true) * 1000));
            $tenantId = $inputData['tenantId'] ?? '';
            $amount = (float)($inputData['amount'] ?? 0);
            $amountBs = (float)($inputData['amountBs'] ?? 0);
            $exchangeRate = (float)($inputData['exchangeRate'] ?? 0);
            $month = $inputData['month'] ?? '';
            $status = $inputData['status'] ?? 'paid';
            $date = $inputData['date'] ?? date('Y-m-d');

            $exists = $pdo->prepare("SELECT COUNT(*) FROM payments WHERE id = ?");
            $exists->execute([$id]);
            if ($exists->fetchColumn() > 0) {
                $stmt = $pdo->prepare("
                    UPDATE payments 
                    SET tenantId = ?, amount = ?, amountBs = ?, exchangeRate = ?, date = ?, month = ?, status = ?
                    WHERE id = ?
                ");
                $stmt->execute([$tenantId, $amount, $amountBs, $exchangeRate, $date, $month, $status, $id]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO payments (id, tenantId, amount, amountBs, exchangeRate, date, month, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$id, $tenantId, $amount, $amountBs, $exchangeRate, $date, $month, $status]);
            }

            if ($status === 'paid' && !empty($tenantId)) {
                $pdo->prepare("UPDATE tenants SET status = 'active' WHERE id = ?")->execute([$tenantId]);
            }

            echo json_encode([
                'success' => true,
                'payment' => [
                    'id' => $id,
                    'tenantId' => $tenantId,
                    'amount' => $amount,
                    'amountBs' => $amountBs,
                    'exchangeRate' => $exchangeRate,
                    'date' => $date,
                    'month' => $month,
                    'status' => $status
                ]
            ]);
            break;

        case 'mark_paid':
            $id = $inputData['id'] ?? $_GET['id'] ?? '';
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'ID requerido']);
                exit;
            }

            $date = date('Y-m-d');
            $stmt = $pdo->prepare("UPDATE payments SET status = 'paid', date = ? WHERE id = ?");
            $stmt->execute([$date, $id]);

            $payStmt = $pdo->prepare("SELECT tenantId FROM payments WHERE id = ?");
            $payStmt->execute([$id]);
            $tenantId = $payStmt->fetchColumn();

            if ($tenantId) {
                $pdo->prepare("UPDATE tenants SET status = 'active' WHERE id = ?")->execute([$tenantId]);
            }

            echo json_encode(['success' => true, 'date' => $date]);
            break;

        case 'delete_payment':
            $id = $inputData['id'] ?? $_GET['id'] ?? '';
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'ID requerido']);
                exit;
            }
            $pdo->prepare("DELETE FROM payments WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        case 'save_expense':
        case 'add_expense':
            $id = $inputData['id'] ?? ('exp-' . round(microtime(true) * 1000));
            $propertyId = !empty($inputData['propertyId']) ? $inputData['propertyId'] : null;
            $title = $inputData['title'] ?? '';
            $category = $inputData['category'] ?? 'Mantenimiento';
            $amount = (float)($inputData['amount'] ?? 0);
            $amountBs = (float)($inputData['amountBs'] ?? 0);
            $exchangeRate = (float)($inputData['exchangeRate'] ?? 0);
            $date = $inputData['date'] ?? date('Y-m-d');
            $month = $inputData['month'] ?? '';
            $paymentMethod = $inputData['paymentMethod'] ?? 'Transferencia';
            $receiptNumber = $inputData['receiptNumber'] ?? '';
            $notes = $inputData['notes'] ?? '';

            $exists = $pdo->prepare("SELECT COUNT(*) FROM expenses WHERE id = ?");
            $exists->execute([$id]);
            if ($exists->fetchColumn() > 0) {
                $stmt = $pdo->prepare("
                    UPDATE expenses 
                    SET propertyId = ?, title = ?, category = ?, amount = ?, amountBs = ?, exchangeRate = ?, date = ?, month = ?, paymentMethod = ?, receiptNumber = ?, notes = ?
                    WHERE id = ?
                ");
                $stmt->execute([$propertyId, $title, $category, $amount, $amountBs, $exchangeRate, $date, $month, $paymentMethod, $receiptNumber, $notes, $id]);
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO expenses (id, propertyId, title, category, amount, amountBs, exchangeRate, date, month, paymentMethod, receiptNumber, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$id, $propertyId, $title, $category, $amount, $amountBs, $exchangeRate, $date, $month, $paymentMethod, $receiptNumber, $notes]);
            }

            echo json_encode([
                'success' => true,
                'expense' => [
                    'id' => $id,
                    'propertyId' => $propertyId,
                    'title' => $title,
                    'category' => $category,
                    'amount' => $amount,
                    'amountBs' => $amountBs,
                    'exchangeRate' => $exchangeRate,
                    'date' => $date,
                    'month' => $month,
                    'paymentMethod' => $paymentMethod,
                    'receiptNumber' => $receiptNumber,
                    'notes' => $notes
                ]
            ]);
            break;

        case 'delete_expense':
            $id = $inputData['id'] ?? $_GET['id'] ?? '';
            if (empty($id)) {
                echo json_encode(['success' => false, 'error' => 'ID requerido']);
                exit;
            }
            $pdo->prepare("DELETE FROM expenses WHERE id = ?")->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        case 'save_settings':
            $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
            
            // Si nos pasan un diccionario de ajustes
            if (isset($inputData['settings']) && is_array($inputData['settings'])) {
                foreach ($inputData['settings'] as $key => $val) {
                    $valStr = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : (string)$val;
                    $stmt->execute([$key, $valStr, $valStr]);
                }
            } else {
                // Caso individual
                foreach ($inputData as $key => $val) {
                    if ($key === 'action') continue;
                    $valStr = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : (string)$val;
                    $stmt->execute([$key, $valStr, $valStr]);
                }
            }

            echo json_encode(['success' => true]);
            break;

        case 'get_bcv':
            $force = isset($_GET['force']) ? (bool)$_GET['force'] : false;
            $bcvRate = fetchAndUpdateBcvRate($pdo, $force ? 0 : 30);
            echo json_encode([
                'success' => true,
                'rate' => $bcvRate,
                'date' => date('Y-m-d')
            ]);
            break;

        case 'reset_data':
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
            $pdo->exec("TRUNCATE TABLE payments;");
            $pdo->exec("TRUNCATE TABLE expenses;");
            $pdo->exec("TRUNCATE TABLE tenants;");
            $pdo->exec("TRUNCATE TABLE properties;");
            $pdo->exec("TRUNCATE TABLE settings;");
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

            seedInitialData($pdo);

            echo json_encode(['success' => true, 'message' => 'Datos reiniciados con éxito']);
            break;

        case 'import_data':
            $hasValidSection = isset($inputData['properties']) && is_array($inputData['properties'])
                || isset($inputData['tenants']) && is_array($inputData['tenants'])
                || isset($inputData['payments']) && is_array($inputData['payments'])
                || isset($inputData['expenses']) && is_array($inputData['expenses']);

            if (!$hasValidSection) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'El archivo JSON no tiene un formato de respaldo válido de RentFlow']);
                break;
            }

            $pdo->beginTransaction();
            try {
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
                $pdo->exec("DELETE FROM payments;");
                $pdo->exec("DELETE FROM expenses;");
                $pdo->exec("DELETE FROM tenants;");
                $pdo->exec("DELETE FROM properties;");

                if (!empty($inputData['properties']) && is_array($inputData['properties'])) {
                    $stmtProp = $pdo->prepare("
                        INSERT INTO properties (id, name, address, type, price, isOccupied, description, images, specs)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    foreach ($inputData['properties'] as $p) {
                        $stmtProp->execute([
                            (string)($p['id'] ?? uniqid('p_')),
                            $p['name'] ?? '',
                            $p['address'] ?? '',
                            $p['type'] ?? 'Apartment',
                            (float)($p['price'] ?? 0),
                            !empty($p['isOccupied']) ? 1 : 0,
                            $p['description'] ?? '',
                            json_encode($p['images'] ?? [], JSON_UNESCAPED_UNICODE),
                            json_encode($p['specs'] ?? (object)[], JSON_UNESCAPED_UNICODE),
                        ]);
                    }
                }

                if (!empty($inputData['tenants']) && is_array($inputData['tenants'])) {
                    $stmtTen = $pdo->prepare("
                        INSERT INTO tenants (id, name, idNumber, email, phone, propertyId, monthlyRent, includeInternet, startDate, contractDuration, status, contractUrl)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    foreach ($inputData['tenants'] as $t) {
                        $stmtTen->execute([
                            (string)($t['id'] ?? uniqid('t_')),
                            $t['name'] ?? '',
                            $t['idNumber'] ?? '',
                            $t['email'] ?? '',
                            $t['phone'] ?? '',
                            (string)($t['propertyId'] ?? ''),
                            (float)($t['monthlyRent'] ?? 0),
                            !empty($t['includeInternet']) ? 1 : 0,
                            $t['startDate'] ?? date('Y-m-d'),
                            (int)($t['contractDuration'] ?? 12),
                            $t['status'] ?? 'active',
                            $t['contractUrl'] ?? null,
                        ]);
                    }
                }

                if (!empty($inputData['payments']) && is_array($inputData['payments'])) {
                    $stmtPay = $pdo->prepare("
                        INSERT INTO payments (id, tenantId, amount, amountBs, exchangeRate, date, month, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    foreach ($inputData['payments'] as $pay) {
                        $stmtPay->execute([
                            (string)($pay['id'] ?? uniqid('pay_')),
                            (string)($pay['tenantId'] ?? ''),
                            (float)($pay['amount'] ?? 0),
                            (float)($pay['amountBs'] ?? 0),
                            (float)($pay['exchangeRate'] ?? 0),
                            $pay['date'] ?? date('Y-m-d'),
                            $pay['month'] ?? '',
                            $pay['status'] ?? 'pending',
                        ]);
                    }
                }

                if (!empty($inputData['expenses']) && is_array($inputData['expenses'])) {
                    $stmtExp = $pdo->prepare("
                        INSERT INTO expenses (id, propertyId, title, category, amount, amountBs, exchangeRate, date, month, paymentMethod, receiptNumber, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    foreach ($inputData['expenses'] as $exp) {
                        $stmtExp->execute([
                            (string)($exp['id'] ?? uniqid('exp_')),
                            !empty($exp['propertyId']) ? (string)$exp['propertyId'] : null,
                            $exp['title'] ?? '',
                            $exp['category'] ?? 'Mantenimiento',
                            (float)($exp['amount'] ?? 0),
                            (float)($exp['amountBs'] ?? 0),
                            (float)($exp['exchangeRate'] ?? 0),
                            $exp['date'] ?? date('Y-m-d'),
                            $exp['month'] ?? '',
                            $exp['paymentMethod'] ?? 'Transferencia',
                            $exp['receiptNumber'] ?? '',
                            $exp['notes'] ?? '',
                        ]);
                    }
                }

                $configData = $inputData['config'] ?? $inputData['settings'] ?? null;
                if (is_array($configData)) {
                    $stmtSet = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
                    foreach ($configData as $key => $val) {
                        $valStr = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : (string)$val;
                        $stmtSet->execute([$key, $valStr, $valStr]);
                    }
                }

                $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
                $pdo->commit();
                echo json_encode(['success' => true, 'message' => 'Copia de seguridad restaurada con éxito']);
            } catch (Exception $importEx) {
                $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $importEx;
            }
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Acción no válida']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
