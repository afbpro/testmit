<?php
declare(strict_types=1);

require_once __DIR__ . '/http.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

require_once __DIR__ . '/users.php';
require_once __DIR__ . '/companies.php';
require_once __DIR__ . '/property.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() !== PHP_SESSION_ACTIVE) {
    $sessionIdFromHeader = resolveSessionIdFromHeader();
    if ($sessionIdFromHeader !== '') {
        session_id($sessionIdFromHeader);
    }

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'None',
    ]);

    session_start();
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (!isAllowedOrigin($origin)) {
    jsonResponse(403, [
        'ok' => false,
        'message' => 'Origen no permitido.'
    ]);
}

applyCorsHeaders($origin);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, [
        'ok' => false,
        'message' => 'Metodo no permitido. Usa POST.'
    ]);
}

$dbConfig = loadDatabaseConfig();

try {
    $pdo = createPdo($dbConfig);
} catch (Throwable $e) {
    jsonResponse(500, [
        'ok' => false,
        'message' => 'No se pudo conectar a la base de datos.'
    ]);
}

$action = resolveAction();

switch ($action) {
    case 'login':
        handleLogin($pdo);
        break;

    case 'logout':
        handleLogout();
        break;

    case 'users-list':
        handleUsersList($pdo);
        break;

    case 'roles-list':
        handleRolesList($pdo);
        break;

    case 'users-create':
        handleUsersCreate($pdo);
        break;

    case 'users-update':
        handleUsersUpdate($pdo);
        break;


    case 'companies-list':
        handleCompaniesList($pdo);
        break;

    case 'properties-list':
        handlePropertyList($pdo);
        break;

    default:
        jsonResponse(400, [
            'ok' => false,
            'message' => 'Accion invalida.'
        ]);
}
